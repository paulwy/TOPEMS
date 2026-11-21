//! 公司（法人主体）请求上下文解析与 GUC 注入。
//!
//! 请求头契约：
//! - `x-company-id`：当前公司 UUID。缺省时按「唯一成员自动推断」处理：用户在当前租户
//!   只有一条 `core_user_company_scopes` 记录则直接采用它（等价于显式声明）；多条或
//!   无记录则维持无上下文（数据库侧 fail-closed 返回 0 行），不猜。
//!   非法/nil → 400；不属于当前租户或当前用户无 `core_user_company_scopes` 记录 → 403。
//! - `x-company-scope`：`company`（默认）或 `group`。`group` 仅当当前公司处于集团根位置
//!   （有活跃子关系、无活跃上级）时生效：可见范围 = 全部活跃后代，不与用户主体范围求交；
//!   否则按 `company` 处理（单公司 + warn）。
//!
//! 解析必须在**已设置 `app.tenant_id` 的事务**内执行：`core_user_company_scopes` 的 RLS
//! 依赖该 GUC；母公司视角的递归推导需要临时打开系统读通道。

use crate::company_context::CompanyContext;
use axum::http::HeaderMap;
use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

pub const X_COMPANY_ID: &str = "x-company-id";
pub const X_COMPANY_SCOPE: &str = "x-company-scope";

const SCOPE_COMPANY: &str = "company";
const SCOPE_GROUP: &str = "group";

/// 递归收集活跃子公司（同租户、未删除、在有效期内）。
///
/// 关系表本身按公司维度收窄，这里需要跨层遍历，调用前临时打开系统读通道。
const ACTIVE_DESCENDANTS_SQL: &str = r#"
WITH RECURSIVE descendants(company_id) AS (
    SELECT child_company_id
      FROM erp.company_relations
     WHERE tenant_id = $1
       AND parent_company_id = $2
       AND status = 'active'
       AND deleted_at IS NULL
       AND effective_date <= CURRENT_DATE
       AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    UNION
    SELECT r.child_company_id
      FROM erp.company_relations r
      JOIN descendants d ON r.parent_company_id = d.company_id
     WHERE r.tenant_id = $1
       AND r.status = 'active'
       AND r.deleted_at IS NULL
       AND r.effective_date <= CURRENT_DATE
       AND (r.expiry_date IS NULL OR r.expiry_date >= CURRENT_DATE)
)
SELECT company_id FROM descendants
"#;

/// 当前公司是否存在活跃上级（用于判定集团根位置）。
const HAS_ACTIVE_PARENT_SQL: &str = r#"
SELECT EXISTS (
    SELECT 1
      FROM erp.company_relations
     WHERE tenant_id = $1
       AND child_company_id = $2
       AND status = 'active'
       AND deleted_at IS NULL
       AND effective_date <= CURRENT_DATE
       AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
)
"#;

/// 集团视角判定：无活跃后代或存在活跃上级时，声明不生效。
fn decide_group_view(mut descendants: Vec<Uuid>, has_parent: bool) -> Option<Vec<Uuid>> {
    if descendants.is_empty() || has_parent {
        return None;
    }
    descendants.sort();
    descendants.dedup();
    Some(descendants)
}

/// 显式公司头缺失时的隐式推断：仅当用户在当前租户只有一条成员记录时采用它。
///
/// 多条或无记录一律返回 `None`（维持 fail-closed），不做任何猜测。
fn decide_single_member(members: &[Uuid]) -> Option<Uuid> {
    match members {
        [only] => Some(*only),
        _ => None,
    }
}

/// 校验「公司属于当前租户且当前用户持有该公司数据范围」。
async fn ensure_member(
    conn: &mut PgConnection,
    tenant_id: Uuid,
    user_id: Uuid,
    company_id: Uuid,
) -> Result<(), (u16, String)> {
    let member: Option<Uuid> = sqlx::query_scalar(
        "SELECT company_id FROM public.core_user_company_scopes \
         WHERE tenant_id = $1 AND user_id = $2 AND company_id = $3",
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(company_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "公司上下文校验查询失败");
        (500, "公司上下文校验失败".to_string())
    })?;

    if member.is_none() {
        return Err((
            403,
            "公司主体不属于当前租户或当前用户无数据范围".to_string(),
        ));
    }
    Ok(())
}

/// 读取用户在当前租户的全部成员记录，供唯一成员推断。
///
/// 查询失败按无上下文处理（保持改造前的 fail-closed 行为），不把无头请求变成 500。
async fn load_members(conn: &mut PgConnection, tenant_id: Uuid, user_id: Uuid) -> Vec<Uuid> {
    match sqlx::query_scalar::<_, Uuid>(
        "SELECT company_id FROM public.core_user_company_scopes \
         WHERE tenant_id = $1 AND user_id = $2",
    )
    .bind(tenant_id)
    .bind(user_id)
    .fetch_all(&mut *conn)
    .await
    {
        Ok(members) => members,
        Err(e) => {
            tracing::error!(error = %e, "公司上下文隐式推断查询失败，按无上下文处理");
            Vec::new()
        }
    }
}

async fn set_system_flag(conn: &mut PgConnection, on: bool) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.rls_system', $1, true)")
        .bind(if on { "on" } else { "off" })
        .execute(&mut *conn)
        .await?;
    Ok(())
}

/// 解析请求头中的公司上下文并校验归属。
///
/// 解析优先级：显式 `x-company-id` > 唯一成员推断 > 无上下文（fail-closed）。
///
/// `conn` 必须位于事务内且已设置 `app.tenant_id`；`system` 是调用方原本的系统通道标志，
/// 母公司视角推导结束后会原样恢复，避免扩大系统通道。
pub async fn resolve_company_context(
    conn: &mut PgConnection,
    tenant_id: Uuid,
    user_id: Uuid,
    system: bool,
    headers: &HeaderMap,
) -> Result<Option<CompanyContext>, (u16, String)> {
    let explicit_id = match headers
        .get(X_COMPANY_ID)
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
    {
        Some(s) if !s.is_empty() => Some(
            Uuid::parse_str(s)
                .ok()
                .filter(|c| !c.is_nil())
                .ok_or_else(|| (400, "无效的公司ID格式".to_string()))?,
        ),
        _ => None,
    };

    let company_id = match explicit_id {
        Some(company_id) => {
            if user_id.is_nil() {
                return Err((400, "公司上下文仅适用于用户身份".to_string()));
            }
            ensure_member(conn, tenant_id, user_id, company_id).await?;
            company_id
        }
        None => {
            // 无显式公司头：仅当用户在当前租户只有一条成员记录时自动采用。
            if user_id.is_nil() {
                return Ok(None);
            }
            let members = load_members(conn, tenant_id, user_id).await;
            match decide_single_member(&members) {
                Some(company_id) => company_id,
                None => {
                    if members.len() > 1 {
                        tracing::debug!(
                            candidates = members.len(),
                            "用户存在多条公司范围记录且未声明 x-company-id，按无上下文处理"
                        );
                    }
                    return Ok(None);
                }
            }
        }
    };

    let scope_header = headers
        .get(X_COMPANY_SCOPE)
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let wants_group = match scope_header.map(|s| s.to_ascii_lowercase()) {
        None => false,
        Some(s) if s == SCOPE_COMPANY => false,
        Some(s) if s == SCOPE_GROUP => true,
        Some(_) => return Err((400, "无效的公司视角（仅支持 company / group）".to_string())),
    };

    if !wants_group {
        return Ok(Some(CompanyContext::single(company_id)));
    }

    let (descendants, has_parent) = match set_system_flag(conn, true).await {
        Ok(()) => {
            let rows = sqlx::query_scalar::<_, Uuid>(ACTIVE_DESCENDANTS_SQL)
                .bind(tenant_id)
                .bind(company_id)
                .fetch_all(&mut *conn)
                .await;
            let parent = if rows.is_ok() {
                sqlx::query_scalar::<_, bool>(HAS_ACTIVE_PARENT_SQL)
                    .bind(tenant_id)
                    .bind(company_id)
                    .fetch_one(&mut *conn)
                    .await
            } else {
                // 子关系查询已失败，无需再判上级；占位值不会进入结果。
                Ok(true)
            };
            let restore = set_system_flag(conn, system).await;
            match (rows, parent, restore) {
                (Ok(rows), Ok(parent), Ok(())) => Ok((rows, parent)),
                (_, _, Err(e)) => Err(e),
                (Err(e), _, _) => Err(e),
                (_, Err(e), _) => Err(e),
            }
        }
        Err(e) => Err(e),
    }
    .map_err(|e| {
        tracing::error!(error = %e, "母公司视角子公司推导失败");
        (500, "母公司视角解析失败".to_string())
    })?;

    let Some(visible) = decide_group_view(descendants, has_parent) else {
        tracing::warn!(
            %company_id,
            has_parent,
            "请求声明 x-company-scope: group，但当前公司不处于集团根位置（需有活跃子关系且无活跃上级），按单公司处理"
        );
        return Ok(Some(CompanyContext::single(company_id)));
    };

    Ok(Some(CompanyContext {
        company_id,
        actor_is_parent: true,
        visible_company_ids: visible,
    }))
}

/// 把公司上下文写入事务级 GUC；`None` 写空值（fail-closed）。
pub async fn set_company_gucs(
    conn: &mut PgConnection,
    ctx: Option<&CompanyContext>,
) -> Result<(), sqlx::Error> {
    let (company_id, is_parent, visible) = match ctx {
        Some(c) => (
            c.company_id.to_string(),
            if c.actor_is_parent { "on" } else { "off" },
            c.visible_ids_csv(),
        ),
        None => (String::new(), "off", String::new()),
    };
    sqlx::query(
        "SELECT set_config('app.company_id', $1, true), \
                set_config('app.actor_is_parent', $2, true), \
                set_config('app.visible_company_ids', $3, true)",
    )
    .bind(company_id)
    .bind(is_parent)
    .bind(visible)
    .execute(&mut *conn)
    .await?;
    Ok(())
}

/// 无请求事务的中间件使用：在一次性事务内解析公司上下文（不在请求链上留连接）。
pub async fn resolve_company_context_isolated(
    pool: &PgPool,
    tenant_id: Uuid,
    user_id: Uuid,
    system: bool,
    headers: &HeaderMap,
) -> Result<Option<CompanyContext>, (u16, String)> {
    let mut tx = pool.begin().await.map_err(|e| {
        tracing::error!(error = %e, "公司上下文解析事务开启失败");
        (500, "公司上下文解析失败".to_string())
    })?;
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), \
                set_config('app.rls_system', $2, true)",
    )
    .bind(tenant_id.to_string())
    .bind(if system { "on" } else { "off" })
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "公司上下文解析事务初始化失败");
        (500, "公司上下文解析失败".to_string())
    })?;

    let resolved = resolve_company_context(&mut *tx, tenant_id, user_id, system, headers).await;
    // 只读解析，事务一律回滚，不留任何写入。
    let _ = tx.rollback().await;
    resolved
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    const CHILD_A: Uuid = Uuid::from_u128(11);
    const CHILD_B: Uuid = Uuid::from_u128(12);

    #[test]
    fn group_view_effective_only_for_group_root() {
        let ids = decide_group_view(vec![CHILD_B, CHILD_A], false).unwrap();
        assert_eq!(
            ids,
            vec![CHILD_A, CHILD_B],
            "集团根：全部活跃后代且稳定排序"
        );
    }

    #[test]
    fn group_view_rejected_when_company_has_parent() {
        assert_eq!(
            decide_group_view(vec![CHILD_A], true),
            None,
            "有活跃上级 = 非集团根，声明不生效"
        );
    }

    #[test]
    fn group_view_rejected_without_descendants() {
        assert_eq!(
            decide_group_view(Vec::new(), false),
            None,
            "无活跃子关系，声明不生效"
        );
    }

    #[test]
    fn group_view_deduplicates_children() {
        let ids = decide_group_view(vec![CHILD_A, CHILD_A, CHILD_B], false).unwrap();
        assert_eq!(ids, vec![CHILD_A, CHILD_B]);
    }

    const COMPANY: Uuid = Uuid::from_u128(1);

    #[test]
    fn single_member_is_inferred() {
        assert_eq!(
            decide_single_member(&[COMPANY]),
            Some(COMPANY),
            "只有一条成员记录时自动采用它"
        );
    }

    #[test]
    fn multiple_members_are_not_inferred() {
        assert_eq!(
            decide_single_member(&[COMPANY, CHILD_A]),
            None,
            "多成员不带头时必须维持无上下文（fail-closed），不猜"
        );
    }

    #[test]
    fn no_member_is_not_inferred() {
        assert_eq!(decide_single_member(&[]), None, "无成员记录时维持无上下文");
    }
}

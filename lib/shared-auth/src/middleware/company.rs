//! 公司（法人主体）请求上下文解析与 GUC 注入。
//!
//! 请求头契约：
//! - `x-company-id`：当前公司 UUID。缺省 = 不声明公司（数据库侧 fail-closed 返回 0 行）；
//!   非法/nil → 400；不属于当前租户或当前用户无 `core_user_company_scopes` 记录 → 403。
//! - `x-company-scope`：`company`（默认）或 `group`。`group` 仅在当前公司确有活跃子关系时
//!   生效（由 `erp.company_relations` 递归推导，并与用户主体范围求交）；否则按 `company` 处理。
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

/// 用户在当前租户下持有主体范围的公司（用于与子公司集合求交）。
const USER_SCOPED_COMPANIES_SQL: &str = r#"
SELECT company_id
  FROM public.core_user_company_scopes
 WHERE tenant_id = $1
   AND user_id = $2
   AND company_id = ANY ($3)
"#;

async fn set_system_flag(conn: &mut PgConnection, on: bool) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.rls_system', $1, true)")
        .bind(if on { "on" } else { "off" })
        .execute(&mut *conn)
        .await?;
    Ok(())
}

/// 解析请求头中的公司上下文并校验归属。
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
    let raw = match headers
        .get(X_COMPANY_ID)
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
    {
        Some(s) if !s.is_empty() => s,
        _ => return Ok(None),
    };

    let company_id = Uuid::parse_str(raw)
        .ok()
        .filter(|c| !c.is_nil())
        .ok_or_else(|| (400, "无效的公司ID格式".to_string()))?;

    if user_id.is_nil() {
        return Err((400, "公司上下文仅适用于用户身份".to_string()));
    }

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

    let descendants = match set_system_flag(conn, true).await {
        Ok(()) => {
            let rows = sqlx::query_scalar::<_, Uuid>(ACTIVE_DESCENDANTS_SQL)
                .bind(tenant_id)
                .bind(company_id)
                .fetch_all(&mut *conn)
                .await;
            let restore = set_system_flag(conn, system).await;
            match (rows, restore) {
                (_, Err(e)) => Err(sqlx::Error::from(e)),
                (Err(e), _) => Err(e),
                (Ok(rows), Ok(())) => Ok(rows),
            }
        }
        Err(e) => Err(e),
    }
    .map_err(|e| {
        tracing::error!(error = %e, "母公司视角子公司推导失败");
        (500, "母公司视角解析失败".to_string())
    })?;

    if descendants.is_empty() {
        tracing::warn!(
            %company_id,
            "请求声明 x-company-scope: group，但当前公司没有活跃子关系，按单公司处理"
        );
        return Ok(Some(CompanyContext::single(company_id)));
    }

    let visible = sqlx::query_scalar::<_, Uuid>(USER_SCOPED_COMPANIES_SQL)
        .bind(tenant_id)
        .bind(user_id)
        .bind(&descendants)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "子公司可见范围求交失败");
            (500, "母公司视角解析失败".to_string())
        })?;

    if visible.is_empty() {
        tracing::warn!(
            %company_id,
            candidates = descendants.len(),
            "母公司视角候选子公司均不在用户主体范围内，降级为单公司"
        );
        return Ok(Some(CompanyContext::single(company_id)));
    }

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

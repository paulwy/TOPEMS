//! 公司（法人主体）请求上下文。
//!
//! 集团 = 同一 `tenant_id` 下的多家 `hrm.companies`。租户仍是最外层隔离边界，
//! 公司维度只在其内部进一步收窄：公司由请求显式声明（`x-company-id`），或在该头缺失时
//! 按「用户在当前租户只有一条 `public.core_user_company_scopes` 记录」自动推断；
//! 该公司须属于当前租户且当前用户持有对应范围记录。
//!
//! 无法确定公司上下文时本 task-local 为 `None`，下游 GUC（`app.company_id` 等）
//! 一律写空值，数据库侧 fail-closed 返回 0 行——多成员用户不声明公司时不猜。

use uuid::Uuid;

/// 当前请求声明的公司主体与母公司视角。
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CompanyContext {
    /// 当前公司；写路径只能落这家公司。
    pub company_id: Uuid,
    /// 是否显式声明母公司视角（`x-company-scope: group` 且关系数据成立）。
    pub actor_is_parent: bool,
    /// 母公司视角下可见的子公司（全部活跃后代，不与用户主体范围求交）。
    pub visible_company_ids: Vec<Uuid>,
}

impl CompanyContext {
    /// 单公司上下文（不声明母公司视角）。
    pub fn single(company_id: Uuid) -> Self {
        Self {
            company_id,
            actor_is_parent: false,
            visible_company_ids: Vec::new(),
        }
    }

    /// `app.visible_company_ids` 的 GUC 文本形态（逗号分隔 UUID）。
    pub fn visible_ids_csv(&self) -> String {
        let mut ids: Vec<String> = self
            .visible_company_ids
            .iter()
            .map(|id| id.to_string())
            .collect();
        ids.sort();
        ids.dedup();
        ids.join(",")
    }
}

tokio::task_local! {
    static COMPANY_CONTEXT: CompanyContext;
}

/// 当前请求的公司上下文；无请求上下文或未声明公司时返回 `None`。
pub fn current() -> Option<CompanyContext> {
    COMPANY_CONTEXT.try_with(CompanyContext::clone).ok()
}

/// 当前请求声明的公司 ID；未声明时 `None`。
pub fn current_company_id() -> Option<Uuid> {
    current().map(|ctx| ctx.company_id)
}

/// 在请求作用域内携带公司上下文执行后续链路。
pub async fn scope<F, T>(ctx: CompanyContext, fut: F) -> T
where
    F: std::future::Future<Output = T>,
{
    COMPANY_CONTEXT.scope(ctx, fut).await
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    const COMPANY: Uuid = Uuid::from_u128(1);
    const CHILD_A: Uuid = Uuid::from_u128(2);
    const CHILD_B: Uuid = Uuid::from_u128(3);

    #[test]
    fn no_request_scope_returns_none() {
        assert!(current().is_none());
        assert!(current_company_id().is_none());
    }

    #[tokio::test]
    async fn scope_exposes_context_only_inside() {
        let ctx = CompanyContext::single(COMPANY);
        scope(ctx.clone(), async {
            assert_eq!(current(), Some(ctx.clone()));
            assert_eq!(current_company_id(), Some(COMPANY));
        })
        .await;
        assert!(current().is_none(), "作用域结束后不得残留");
    }

    #[test]
    fn visible_ids_csv_is_sorted_and_deduplicated() {
        let ctx = CompanyContext {
            company_id: COMPANY,
            actor_is_parent: true,
            visible_company_ids: vec![CHILD_B, CHILD_A, CHILD_B],
        };
        let csv = ctx.visible_ids_csv();
        let parts: Vec<&str> = csv.split(',').collect();
        assert_eq!(parts.len(), 2, "重复子公司必须去重");
        assert!(parts[0] < parts[1], "输出必须稳定排序");
    }

    #[test]
    fn single_has_no_parent_view() {
        let ctx = CompanyContext::single(COMPANY);
        assert!(!ctx.actor_is_parent);
        assert!(ctx.visible_company_ids.is_empty());
        assert_eq!(ctx.visible_ids_csv(), "");
    }
}

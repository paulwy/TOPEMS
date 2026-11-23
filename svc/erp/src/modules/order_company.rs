//! W13：订单创建的公司上下文解析（fail-closed）。
//!
//! 销售订单 / 采购订单新增 `company_id` 后，创建路径必须写入请求公司上下文。
//! 上下文来源：请求头 `x-company-id` → 用户默认公司 → 唯一成员推断（见
//! `topems_shared_auth::company_context`）。三者都取不到时 **拒绝创建**，
//! 不允许静默写 NULL——否则新行永久逃逸公司隔离，且掩盖上下文配置缺失。
//!
//! 历史行保持 NULL，由业务清单回填脚本补齐，回填完成后再单独收紧 NOT NULL。

use topems_shared_core::error::TopemsError;
use uuid::Uuid;

/// 解析创建主单所需的公司上下文；缺失即返回 `ValidationFailed`（fail-closed）。
///
/// `entity` 用于错误信息（如「销售订单」）；`tenant_id`/`user_id` 只用于错误日志，
/// 便于运维按请求追查是缺请求头还是用户未配置默认公司。
pub(crate) fn require_order_company(
    entity: &str,
    tenant_id: Option<&str>,
    user_id: &str,
) -> Result<Uuid, TopemsError> {
    match topems_shared_auth::company_context::current_company_id() {
        Some(id) if !id.is_nil() => Ok(id),
        _ => {
            tracing::error!(
                "[erp] 创建{}缺少公司上下文，拒绝创建 tenant={:?} user={}",
                entity,
                tenant_id,
                user_id
            );
            Err(TopemsError::ValidationFailed(format!(
                "创建{entity}需要公司上下文：请显式声明 x-company-id，或为用户配置默认公司"
            )))
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    use topems_shared_auth::company_context::{scope, CompanyContext};

    #[test]
    fn missing_context_is_rejected() {
        let err = require_order_company("销售订单", Some("t"), "u").unwrap_err();
        assert!(matches!(err, TopemsError::ValidationFailed(_)));
    }

    #[tokio::test]
    async fn present_context_returns_company() {
        let company = Uuid::from_u128(42);
        let got = scope(CompanyContext::single(company), async {
            require_order_company("销售订单", Some("t"), "u").unwrap()
        })
        .await;
        assert_eq!(got, company);
    }
}

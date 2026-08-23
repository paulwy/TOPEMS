//! MES 审批流公共辅助模块
//!
//! V281: 核心三件套（发起/通过/驳回）+ 验证 + 响应构造已提升到
//! `topems_shared_db::approval`，本模块仅保留 MES 专有的审计日志
//! 辅助方法（依赖 `crate::modules::audit::log_approval_event`），
//! 并 re-export 共享方法供 MES 内部模块无缝使用。

pub use topems_shared_db::approval::{
    build_approve_response, build_reject_response, build_start_response, create_approval_and_log,
    execute_transition_and_log, reject_and_log, validate_approval_decision,
    validate_start_approval, ApprovalResult,
};

use sqlx::postgres::PgPool;
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

use crate::modules::audit::log_approval_event;

/// 记录审批事件审计日志（便捷包装）
///
/// 从 Claims 中提取 user_id 和 tenant_id，调用 `log_approval_event`。
/// 此方法依赖 MES 专有的 `audit::log_approval_event`，不适用于其他服务。
pub async fn write_approval_audit(
    pool: &PgPool,
    claims: &Claims,
    entity_type: &str,
    entity_id: Uuid,
    approval_id: Uuid,
    action: &str,
    comment: &str,
) {
    let approver_id = match claims.user_id() {
        Ok(id) => id,
        Err(_) => return,
    };

    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok());

    if let Err(e) = log_approval_event(
        pool,
        entity_type,
        entity_id,
        approval_id,
        action,
        approver_id,
        comment,
        tenant_id,
    )
    .await
    {
        tracing::error!(
            "记录审批审计日志失败: entity_type={}, entity_id={}, action={}, error={}",
            entity_type,
            entity_id,
            action,
            e
        );
    }
}

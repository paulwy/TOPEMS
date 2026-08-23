//! 共享审批流辅助模块
//!
//! 封装审批流三件套（发起/通过/驳回）的公共逻辑，
//! 包括 FSM 状态校验、审批响应构造、审计日志记录等。
//!
//! 各服务模块仍负责自己的数据库操作（表结构不同），但通过本模块
//! 的辅助函数消除重复的校验、响应构造、审计日志等样板代码。
//!
//! V281: 从 svc/mes/src/modules/approval_common.rs 提升到 shared-db，
//! 使 finance/erp/pm 等服务也可复用。

use serde_json::json;
use sqlx::postgres::PgPool;
use topems_shared_core::fsm::{FsmDef, FsmError};
use uuid::Uuid;

use crate::AuditLogService;

/// 审批操作结果
#[derive(Debug, Clone)]
pub struct ApprovalResult {
    pub approval_id: Uuid,
    pub approval_status: String, // "pending_approval" | "approved" | "rejected"
    pub entity_status: Option<String>,
}

/// 校验审批发起的前置条件
///
/// - 当前状态必须合法
/// - `from → to` 必须是该 FSM 的有效迁移
/// - `from → to` 必须是需要审批的迁移
/// - 当前未处于审批中（approval_id 为 None）
pub fn validate_start_approval(
    fsm: &FsmDef,
    current_status: &str,
    target_status: &str,
    existing_approval_id: Option<Uuid>,
) -> Result<(), String> {
    // 校验状态合法性
    if !fsm.is_valid_status(current_status) {
        return Err(format!("无效的当前状态: {}", current_status));
    }
    if !fsm.is_valid_status(target_status) {
        return Err(format!("无效的目标状态: {}", target_status));
    }

    // 校验迁移合法性
    if let Err(e) = fsm.can_transition(current_status, target_status) {
        return Err(match e {
            FsmError::TerminalState(s) => format!("状态 {} 为终态，无法发起审批", s),
            FsmError::InvalidTransition { from, to } => {
                format!("不允许的状态迁移: {} → {}", from, to)
            }
            FsmError::UnknownStatus(s) => format!("未知状态: {}", s),
        });
    }

    // 校验是否需要审批
    if !fsm.requires_approval(current_status, target_status) {
        return Err(format!(
            "状态迁移 {} → {} 不需要审批",
            current_status, target_status
        ));
    }

    // 校验是否已有进行中的审批
    if existing_approval_id.is_some() {
        return Err("当前已有进行中的审批，请先处理".to_string());
    }

    Ok(())
}

/// 校验审批决策（通过/驳回）的前置条件
///
/// - approval_id 必须匹配
/// - 当前状态必须是审批发起前的状态（from 状态）
pub fn validate_approval_decision(
    fsm: &FsmDef,
    current_status: &str,
    from_status: &str,
    to_status: &str,
    stored_approval_id: Option<Uuid>,
    request_approval_id: Uuid,
) -> Result<(), String> {
    // 校验状态合法性
    if !fsm.is_valid_status(current_status) {
        return Err(format!("无效的当前状态: {}", current_status));
    }

    // 当前状态必须等于 from 状态（审批通过前状态未变）
    if current_status != from_status {
        return Err(format!(
            "当前状态 {} 不匹配审批前置状态 {}",
            current_status, from_status
        ));
    }

    // 校验迁移是否需要审批（防御性检查）
    if !fsm.requires_approval(from_status, to_status) {
        return Err(format!(
            "状态迁移 {} → {} 不需要审批",
            from_status, to_status
        ));
    }

    // 校验 approval_id 匹配
    match stored_approval_id {
        None => return Err("当前没有进行中的审批".to_string()),
        Some(stored_id) if stored_id != request_approval_id => {
            return Err("审批ID不匹配".to_string());
        }
        _ => {}
    }

    Ok(())
}

/// 构造审批发起响应
pub fn build_start_response(approval_id: Uuid) -> serde_json::Value {
    json!({
        "approval_id": approval_id,
        "status": "pending_approval"
    })
}

/// 构造审批通过响应
pub fn build_approve_response(approval_id: Uuid) -> serde_json::Value {
    json!({
        "approval_id": approval_id,
        "status": "approved"
    })
}

/// 构造审批驳回响应
pub fn build_reject_response(approval_id: Uuid) -> serde_json::Value {
    json!({
        "approval_id": approval_id,
        "status": "rejected"
    })
}

/// 创建审批记录并写入审计日志（审批发起）
///
/// 生成 approval_id，通过 shared-db `AuditLogService::log_operation` 记录
/// 审批发起事件到 `public.audit_logs`。
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `entity_type`: 实体类型（如 "production_order"、"anomaly_alert"）
/// - `record_id`: 实体记录 ID
/// - `from_status`: 审批前状态（如 "pending"）
/// - `to_status`: 审批通过后目标状态（如 "released"）
/// - `approver_id`: 审批人 ID
pub async fn create_approval_and_log(
    pool: &PgPool,
    entity_type: &str,
    record_id: Uuid,
    from_status: &str,
    to_status: &str,
    approver_id: Uuid,
) -> Result<Uuid, sqlx::Error> {
    let approval_id = Uuid::new_v4();
    let approver_str = approver_id.to_string();
    let svc = AuditLogService::new(pool.clone());
    svc.log_operation(
        "approval_start",
        entity_type,
        Some(record_id),
        Some(&approver_str),
        Some(json!({
            "approval_id": approval_id,
            "from_status": from_status,
            "to_status": to_status,
        })),
        "success",
        None,
    )
    .await?;
    Ok(approval_id)
}

/// 执行状态转换并写入审计日志（审批通过）
///
/// 当 `table` 为 `Some(table_name)` 时，执行
/// `UPDATE {table} SET status = to_status WHERE id = record_id AND status = from_status`。
/// 然后记录审批通过事件。对于无持久化表的虚拟实体（如 anomaly_alert）传入 `None` 跳过 UPDATE。
pub async fn execute_transition_and_log(
    pool: &PgPool,
    table: Option<&str>,
    entity_type: &str,
    record_id: Uuid,
    approval_id: Uuid,
    from_status: &str,
    to_status: &str,
) -> Result<(), sqlx::Error> {
    // 执行状态转换（仅对有持久化表的实体）
    if let Some(table) = table {
        let sql = format!(
            "UPDATE {} SET status = $1, updated_at = NOW() \
             WHERE id = $2 AND status = $3 AND deleted_at IS NULL",
            table
        );
        sqlx::query(&sql)
            .bind(to_status)
            .bind(record_id)
            .bind(from_status)
            .execute(pool)
            .await?;
    }

    // 写入审计日志
    let svc = AuditLogService::new(pool.clone());
    svc.log_operation(
        "approval_approve",
        entity_type,
        Some(record_id),
        None,
        Some(json!({
            "approval_id": approval_id,
            "from_status": from_status,
            "to_status": to_status,
        })),
        "success",
        None,
    )
    .await?;
    Ok(())
}

/// 记录驳回并写入审计日志（审批驳回）
///
/// 通过 shared-db `AuditLogService::log_operation` 记录审批驳回事件。
pub async fn reject_and_log(
    pool: &PgPool,
    entity_type: &str,
    record_id: Uuid,
    approval_id: Uuid,
    reason: &str,
) -> Result<(), sqlx::Error> {
    let svc = AuditLogService::new(pool.clone());
    svc.log_operation(
        "approval_reject",
        entity_type,
        Some(record_id),
        None,
        Some(json!({
            "approval_id": approval_id,
            "reason": reason,
        })),
        "success",
        None,
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_core::fsm::FsmDef;

    fn test_fsm() -> FsmDef {
        FsmDef {
            states: &["pending", "approved", "rejected", "reworking", "archived"],
            terminal: &["approved", "archived"],
            transitions: &[
                ("pending", "approved"),
                ("pending", "rejected"),
                ("rejected", "reworking"),
                ("reworking", "archived"),
            ],
            approval_transitions: &[("rejected", "reworking")],
        }
    }

    #[test]
    fn validate_start_approval_ok() {
        let fsm = test_fsm();
        assert!(validate_start_approval(&fsm, "rejected", "reworking", None).is_ok());
    }

    #[test]
    fn validate_start_approval_invalid_from_status() {
        let fsm = test_fsm();
        assert!(validate_start_approval(&fsm, "unknown", "reworking", None).is_err());
    }

    #[test]
    fn validate_start_approval_not_approval_transition() {
        let fsm = test_fsm();
        assert!(validate_start_approval(&fsm, "pending", "approved", None).is_err());
    }

    #[test]
    fn validate_start_approval_already_in_progress() {
        let fsm = test_fsm();
        let approval_id = Uuid::new_v4();
        assert!(
            validate_start_approval(&fsm, "rejected", "reworking", Some(approval_id)).is_err()
        );
    }

    #[test]
    fn validate_start_approval_invalid_transition() {
        let fsm = test_fsm();
        assert!(validate_start_approval(&fsm, "rejected", "archived", None).is_err());
    }

    #[test]
    fn validate_approval_decision_ok() {
        let fsm = test_fsm();
        let approval_id = Uuid::new_v4();
        assert!(
            validate_approval_decision(
                &fsm,
                "rejected",
                "rejected",
                "reworking",
                Some(approval_id),
                approval_id,
            )
            .is_ok()
        );
    }

    #[test]
    fn validate_approval_decision_wrong_current_status() {
        let fsm = test_fsm();
        let approval_id = Uuid::new_v4();
        assert!(
            validate_approval_decision(
                &fsm,
                "approved",
                "rejected",
                "reworking",
                Some(approval_id),
                approval_id,
            )
            .is_err()
        );
    }

    #[test]
    fn validate_approval_decision_id_mismatch() {
        let fsm = test_fsm();
        let stored_id = Uuid::new_v4();
        let request_id = Uuid::new_v4();
        assert!(
            validate_approval_decision(
                &fsm,
                "rejected",
                "rejected",
                "reworking",
                Some(stored_id),
                request_id,
            )
            .is_err()
        );
    }

    #[test]
    fn validate_approval_decision_no_approval_in_progress() {
        let fsm = test_fsm();
        let request_id = Uuid::new_v4();
        assert!(
            validate_approval_decision(
                &fsm,
                "rejected",
                "rejected",
                "reworking",
                None,
                request_id,
            )
            .is_err()
        );
    }

    #[test]
    fn build_responses_contain_correct_fields() {
        let id = Uuid::new_v4();

        let start = build_start_response(id);
        assert_eq!(start["approval_id"], json!(id));
        assert_eq!(start["status"], "pending_approval");

        let approve = build_approve_response(id);
        assert_eq!(approve["approval_id"], json!(id));
        assert_eq!(approve["status"], "approved");

        let reject = build_reject_response(id);
        assert_eq!(reject["approval_id"], json!(id));
        assert_eq!(reject["status"], "rejected");
    }
}

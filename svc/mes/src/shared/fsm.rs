//! MES 状态机定义
//!
//! 使用 `topems_shared_core::fsm::FsmDef` 声明式定义 MES 各业务模块的状态机。
//! 替代各模块中散存的 `validate_state_transition` 函数和硬编码迁移对，
//! 统一提供 `can_transition`、`requires_approval`、`is_valid_status` 等能力。
//!
//! 各模块审批流三件套（start/approve/reject）通过本模块 FSM 定义进行状态合法性校验。

use topems_shared_core::fsm::FsmDef;

// ============================================================================
// 生产订单（Production Order）
// ============================================================================

/// 生产订单状态机
///
/// 状态流转：pending → released → in_progress ⇄ paused → completed → closed
/// 终态：cancelled、closed
pub const PRODUCTION_ORDER_FSM: FsmDef = FsmDef {
    states: &[
        "pending",
        "released",
        "in_progress",
        "paused",
        "completed",
        "cancelled",
        "closed",
    ],
    terminal: &["cancelled", "closed"],
    transitions: &[
        ("pending", "released"),
        ("pending", "cancelled"),
        ("released", "in_progress"),
        ("released", "cancelled"),
        ("in_progress", "completed"),
        ("in_progress", "paused"),
        ("paused", "in_progress"),
        ("paused", "cancelled"),
        ("completed", "closed"),
    ],
    // 生产订单下达审批：pending → released 需审批
    approval_transitions: &[("pending", "released")],
};

// ============================================================================
// 生产报工（Work Report）
// ============================================================================

/// 生产报工状态机
///
/// 状态流转：pending → approved / rejected → reworking → completed → archived
/// 终态：approved、archived
pub const WORK_REPORT_FSM: FsmDef = FsmDef {
    states: &[
        "pending",
        "approved",
        "rejected",
        "reworking",
        "completed",
        "archived",
    ],
    terminal: &["approved", "archived"],
    transitions: &[
        ("pending", "approved"),
        ("pending", "rejected"),
        ("rejected", "reworking"),
        ("reworking", "completed"),
        ("completed", "archived"),
    ],
    // 返工审批：rejected → reworking 需审批
    approval_transitions: &[("rejected", "reworking")],
};

// ============================================================================
// 异常告警（Anomaly Alert）
// ============================================================================

/// 异常告警状态机
///
/// 状态流转：detected → acknowledged → handling → resolved → closed
/// 终态：closed
pub const ANOMALY_ALERT_FSM: FsmDef = FsmDef {
    states: &["detected", "acknowledged", "handling", "resolved", "closed"],
    terminal: &["closed"],
    transitions: &[
        ("detected", "acknowledged"),
        ("acknowledged", "handling"),
        ("handling", "resolved"),
        ("resolved", "closed"),
    ],
    // 异常处置审批：acknowledged → handling 需审批
    approval_transitions: &[("acknowledged", "handling")],
};

// ============================================================================
// 质量检验（Quality Inspection）
// ============================================================================

/// 质量检验状态机
///
/// 状态流转：pending → in_progress → passed / failed
/// failed → concession_received（让步接收审批通过）
/// 终态：passed、concession_received、rejected
pub const QUALITY_INSPECTION_FSM: FsmDef = FsmDef {
    states: &[
        "pending",
        "in_progress",
        "passed",
        "failed",
        "concession_received",
        "rejected",
    ],
    terminal: &["passed", "concession_received", "rejected"],
    transitions: &[
        ("pending", "in_progress"),
        ("in_progress", "passed"),
        ("in_progress", "failed"),
        ("failed", "concession_received"),
        ("failed", "rejected"),
    ],
    // 让步审批：failed → concession_received 需审批
    approval_transitions: &[("failed", "concession_received")],
};

#[cfg(test)]
mod tests {
    use super::*;

    // ===== Production Order FSM =====

    #[test]
    fn production_order_valid_transitions() {
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("pending", "released")
            .is_ok());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("pending", "cancelled")
            .is_ok());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("released", "in_progress")
            .is_ok());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("in_progress", "completed")
            .is_ok());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("in_progress", "paused")
            .is_ok());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("paused", "in_progress")
            .is_ok());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("completed", "closed")
            .is_ok());
    }

    #[test]
    fn production_order_invalid_transitions() {
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("pending", "completed")
            .is_err());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("released", "completed")
            .is_err());
    }

    #[test]
    fn production_order_terminal_blocks() {
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("cancelled", "pending")
            .is_err());
        assert!(PRODUCTION_ORDER_FSM
            .can_transition("closed", "pending")
            .is_err());
    }

    #[test]
    fn production_order_approval_required() {
        assert!(PRODUCTION_ORDER_FSM.requires_approval("pending", "released"));
        assert!(!PRODUCTION_ORDER_FSM.requires_approval("released", "in_progress"));
    }

    // ===== Work Report FSM =====

    #[test]
    fn work_report_valid_transitions() {
        assert!(WORK_REPORT_FSM
            .can_transition("pending", "approved")
            .is_ok());
        assert!(WORK_REPORT_FSM
            .can_transition("pending", "rejected")
            .is_ok());
        assert!(WORK_REPORT_FSM
            .can_transition("rejected", "reworking")
            .is_ok());
        assert!(WORK_REPORT_FSM
            .can_transition("reworking", "completed")
            .is_ok());
        assert!(WORK_REPORT_FSM
            .can_transition("completed", "archived")
            .is_ok());
    }

    #[test]
    fn work_report_approval_required() {
        assert!(WORK_REPORT_FSM.requires_approval("rejected", "reworking"));
        assert!(!WORK_REPORT_FSM.requires_approval("pending", "approved"));
    }

    // ===== Anomaly Alert FSM =====

    #[test]
    fn anomaly_alert_valid_transitions() {
        assert!(ANOMALY_ALERT_FSM
            .can_transition("detected", "acknowledged")
            .is_ok());
        assert!(ANOMALY_ALERT_FSM
            .can_transition("acknowledged", "handling")
            .is_ok());
        assert!(ANOMALY_ALERT_FSM
            .can_transition("handling", "resolved")
            .is_ok());
        assert!(ANOMALY_ALERT_FSM
            .can_transition("resolved", "closed")
            .is_ok());
    }

    #[test]
    fn anomaly_alert_approval_required() {
        assert!(ANOMALY_ALERT_FSM.requires_approval("acknowledged", "handling"));
        assert!(!ANOMALY_ALERT_FSM.requires_approval("detected", "acknowledged"));
    }

    // ===== Quality Inspection FSM =====

    #[test]
    fn quality_inspection_valid_transitions() {
        assert!(QUALITY_INSPECTION_FSM
            .can_transition("pending", "in_progress")
            .is_ok());
        assert!(QUALITY_INSPECTION_FSM
            .can_transition("in_progress", "passed")
            .is_ok());
        assert!(QUALITY_INSPECTION_FSM
            .can_transition("in_progress", "failed")
            .is_ok());
        assert!(QUALITY_INSPECTION_FSM
            .can_transition("failed", "concession_received")
            .is_ok());
        assert!(QUALITY_INSPECTION_FSM
            .can_transition("failed", "rejected")
            .is_ok());
    }

    #[test]
    fn quality_inspection_approval_required() {
        assert!(QUALITY_INSPECTION_FSM.requires_approval("failed", "concession_received"));
        assert!(!QUALITY_INSPECTION_FSM.requires_approval("in_progress", "passed"));
    }
}

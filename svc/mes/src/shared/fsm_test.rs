use crate::shared::fsm::{
    anomaly_can_transition, anomaly_requires_approval, equipment_can_transition,
    equipment_requires_approval, production_order_can_transition,
    production_order_requires_approval, quality_inspection_can_transition,
    quality_inspection_requires_approval, traceability_can_transition,
    traceability_requires_approval, wip_can_transition, work_order_can_transition,
    work_report_can_transition, work_report_requires_approval, FsmError,
};

#[test]
fn production_order_release_from_draft_ok() {
    assert!(production_order_can_transition("draft", "pending").is_ok());
}

#[test]
fn production_order_start_from_pending_ok() {
    assert!(production_order_can_transition("pending", "in_progress").is_ok());
    // 兼容 released 旧值
    assert!(production_order_can_transition("pending", "released").is_ok());
}

#[test]
fn production_order_complete_from_in_progress_ok() {
    assert!(production_order_can_transition("in_progress", "completed").is_ok());
    assert!(production_order_can_transition("released", "completed").is_ok());
}

#[test]
fn production_order_cancel_from_any_non_terminal_ok() {
    assert!(production_order_can_transition("draft", "cancelled").is_ok());
    assert!(production_order_can_transition("pending", "cancelled").is_ok());
    assert!(production_order_can_transition("in_progress", "cancelled").is_ok());
    assert!(production_order_can_transition("released", "cancelled").is_ok());
}

#[test]
fn production_order_terminal_states_reject_all() {
    // completed 已不再视为终态（允许审批撤单到 cancelled），仅 cancelled 为终态
    assert!(matches!(
        production_order_can_transition("cancelled", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        production_order_can_transition("cancelled", "completed"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn production_order_invalid_path_rejected() {
    assert!(matches!(
        production_order_can_transition("draft", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        production_order_can_transition("in_progress", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn work_order_lifecycle_ok() {
    assert!(work_order_can_transition("pending", "in_progress").is_ok());
    assert!(work_order_can_transition("in_progress", "paused").is_ok());
    assert!(work_order_can_transition("paused", "in_progress").is_ok());
    assert!(work_order_can_transition("in_progress", "completed").is_ok());
    assert!(work_order_can_transition("pending", "cancelled").is_ok());
    assert!(work_order_can_transition("in_progress", "cancelled").is_ok());
    assert!(work_order_can_transition("paused", "cancelled").is_ok());
}

#[test]
fn work_order_terminal_rejected() {
    assert!(matches!(
        work_order_can_transition("completed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        work_order_can_transition("cancelled", "pending"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn wip_lifecycle_ok() {
    assert!(wip_can_transition("in_progress", "transferred").is_ok());
    assert!(wip_can_transition("transferred", "completed").is_ok());
}

#[test]
fn wip_terminal_rejected() {
    assert!(matches!(
        wip_can_transition("completed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        wip_can_transition("in_progress", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn unknown_status_rejected() {
    assert!(matches!(
        production_order_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
}

// ==================== FSM-3: WorkReport Tests ====================
#[test]
fn work_report_submit_from_draft_ok() {
    assert!(work_report_can_transition("draft", "submitted").is_ok());
}

#[test]
fn work_report_qc_pass_from_submitted_ok() {
    assert!(work_report_can_transition("submitted", "archived").is_ok());
}

#[test]
fn work_report_qc_fail_from_submitted_ok() {
    assert!(work_report_can_transition("submitted", "rejected").is_ok());
}

#[test]
fn work_report_rework_requires_approval() {
    // rejected→reworking 已补入 allowed_pairs，需审批但转换合法
    assert!(work_report_requires_approval("rejected", "reworking"));
    assert!(work_report_can_transition("rejected", "reworking").is_ok());
}

#[test]
fn work_report_invalid_path_rejected() {
    assert!(work_report_can_transition("draft", "archived").is_err());
    assert!(work_report_can_transition("archived", "submitted").is_err());
}

#[test]
fn work_report_resubmit_from_reworking_ok() {
    assert!(work_report_can_transition("reworking", "submitted").is_ok());
}

#[test]
fn work_report_terminal_state_rejected() {
    // archived 是终态
    assert!(matches!(
        work_report_can_transition("archived", "draft"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        work_report_can_transition("archived", "rejected"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn work_report_unknown_status_rejected() {
    assert!(matches!(
        work_report_can_transition("draft", "unknown_state"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(!work_report_requires_approval("draft", "submitted"));
}

// ==================== FSM-4: QualityInspection Tests ====================
#[test]
fn qi_start_inspect_from_pending_ok() {
    assert!(quality_inspection_can_transition("pending", "inspecting").is_ok());
}

#[test]
fn qi_pass_from_inspecting_ok() {
    assert!(quality_inspection_can_transition("inspecting", "passed").is_ok());
}

#[test]
fn qi_fail_from_inspecting_ok() {
    assert!(quality_inspection_can_transition("inspecting", "failed").is_ok());
}

#[test]
fn qi_concession_requires_approval() {
    assert!(quality_inspection_requires_approval(
        "failed",
        "concession_received"
    ));
    assert!(quality_inspection_can_transition("failed", "concession_received").is_ok());
}

#[test]
fn qi_invalid_path_rejected() {
    assert!(quality_inspection_can_transition("pending", "passed").is_err());
    assert!(quality_inspection_can_transition("passed", "failed").is_err());
}

#[test]
fn qi_scrap_from_failed_ok() {
    assert!(quality_inspection_can_transition("failed", "scrapped").is_ok());
    assert!(!quality_inspection_requires_approval("failed", "scrapped"));
}

#[test]
fn qi_rework_assigned_from_failed_ok() {
    assert!(quality_inspection_can_transition("failed", "rework_assigned").is_ok());
    assert!(!quality_inspection_requires_approval(
        "failed",
        "rework_assigned"
    ));
}

#[test]
fn qi_terminal_states_rejected() {
    // passed / scrapped / concession_received / rework_assigned 均为终态
    assert!(matches!(
        quality_inspection_can_transition("passed", "failed"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        quality_inspection_can_transition("scrapped", "failed"),
        Err(FsmError::TerminalState(_))
    ));
}

// ==================== FSM-5: Traceability Tests ====================
#[test]
fn trace_freeze_from_active_ok() {
    assert!(traceability_can_transition("active", "frozen").is_ok());
}

#[test]
fn trace_lock_from_frozen_ok() {
    assert!(traceability_can_transition("frozen", "locked").is_ok());
}

#[test]
fn trace_investigate_from_locked_ok() {
    assert!(traceability_can_transition("locked", "investigating").is_ok());
}

#[test]
fn trace_resolve_from_investigating_ok() {
    assert!(traceability_can_transition("investigating", "resolved").is_ok());
}

#[test]
fn trace_unfreeze_requires_approval() {
    assert!(traceability_requires_approval("frozen", "active"));
    assert!(traceability_can_transition("frozen", "active").is_ok());
}

#[test]
fn trace_invalid_path_rejected() {
    assert!(traceability_can_transition("active", "locked").is_err());
    assert!(traceability_can_transition("resolved", "active").is_err());
}

#[test]
fn trace_lock_to_active_requires_approval() {
    assert!(traceability_requires_approval("locked", "active"));
    assert!(traceability_can_transition("locked", "active").is_ok());
    assert!(traceability_requires_approval("investigating", "active"));
    assert!(traceability_can_transition("investigating", "active").is_ok());
}

#[test]
fn trace_terminal_state_rejected() {
    // resolved 是终态
    assert!(matches!(
        traceability_can_transition("resolved", "active"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        traceability_can_transition("resolved", "frozen"),
        Err(FsmError::TerminalState(_))
    ));
}

// ==================== FSM-6: Equipment Tests ====================
#[test]
fn equip_idle_from_running_ok() {
    assert!(equipment_can_transition("running", "idle").is_ok());
}

#[test]
fn equip_fault_from_running_ok() {
    assert!(equipment_can_transition("running", "down").is_ok());
}

#[test]
fn equip_maintenance_from_down_ok() {
    assert!(equipment_can_transition("down", "maintenance").is_ok());
    assert!(equipment_can_transition("maintenance", "running").is_ok());
}

#[test]
fn equip_scrap_requires_approval() {
    assert!(equipment_requires_approval("running", "scrapped"));
    assert!(equipment_can_transition("running", "scrapped").is_ok());
}

#[test]
fn equip_invalid_path_rejected() {
    assert!(equipment_can_transition("idle", "down").is_err());
    assert!(equipment_can_transition("scrapped", "running").is_err());
}

#[test]
fn equip_calibrate_cycle_ok() {
    assert!(equipment_can_transition("running", "calibrating").is_ok());
    assert!(equipment_can_transition("calibrating", "running").is_ok());
}

#[test]
fn equip_idle_to_scrapped_requires_approval() {
    assert!(equipment_requires_approval("idle", "scrapped"));
    assert!(equipment_can_transition("idle", "scrapped").is_ok());
    // running→scrapped 也需要审批（已在上文验证 requires_approval）
    assert!(!equipment_requires_approval("running", "down"));
}

#[test]
fn equip_terminal_state_rejected() {
    // scrapped 是终态
    assert!(matches!(
        equipment_can_transition("scrapped", "running"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        equipment_can_transition("scrapped", "idle"),
        Err(FsmError::TerminalState(_))
    ));
}

// ==================== FSM-7: Anomaly Tests ====================
#[test]
fn anomaly_trigger_from_monitoring_ok() {
    assert!(anomaly_can_transition("monitoring", "triggered").is_ok());
}

#[test]
fn anomaly_acknowledge_from_triggered_ok() {
    assert!(anomaly_can_transition("triggered", "acknowledged").is_ok());
}

#[test]
fn anomaly_handling_requires_approval() {
    assert!(anomaly_requires_approval("acknowledged", "handling"));
    assert!(anomaly_can_transition("acknowledged", "handling").is_ok());
}

#[test]
fn anomaly_close_from_handling_ok() {
    assert!(anomaly_can_transition("handling", "closed").is_ok());
}

#[test]
fn anomaly_false_alarm_ok() {
    assert!(anomaly_can_transition("triggered", "false_alarm_verified").is_ok());
    assert!(!anomaly_requires_approval(
        "triggered",
        "false_alarm_verified"
    ));
}

#[test]
fn anomaly_invalid_path_rejected() {
    assert!(anomaly_can_transition("monitoring", "handling").is_err());
    assert!(anomaly_can_transition("closed", "handling").is_err());
}

#[test]
fn anomaly_terminal_states_rejected() {
    // closed / false_alarm_verified 均为终态
    assert!(matches!(
        anomaly_can_transition("closed", "handling"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        anomaly_can_transition("false_alarm_verified", "triggered"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn anomaly_unknown_status_rejected() {
    assert!(matches!(
        anomaly_can_transition("monitoring", "unknown_state"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(!anomaly_requires_approval("monitoring", "triggered"));
}

// ==================== 审批阻断测试（补充到已有 FSM-1） ====================
#[test]
fn production_order_cancel_from_in_progress_requires_approval() {
    assert!(production_order_requires_approval(
        "in_progress",
        "cancelled"
    ));
    assert!(production_order_can_transition("in_progress", "cancelled").is_ok());
    // released 等价于 in_progress，同样需要审批
    assert!(production_order_requires_approval("released", "cancelled"));
}

#[test]
fn production_order_revoke_from_completed_requires_approval() {
    // completed→cancelled 撤单需审批，且转换已合法（completed 不再是终态）
    assert!(production_order_requires_approval("completed", "cancelled"));
    assert!(production_order_can_transition("completed", "cancelled").is_ok());
    // 普通转换不需要审批
    assert!(!production_order_requires_approval("draft", "pending"));
    assert!(!production_order_requires_approval(
        "pending",
        "in_progress"
    ));
}

// ==================== 审批端点单测（APV-1 ~ APV-4） ====================

#[test]
fn apv1_production_order_cancel_from_in_progress_needs_approval() {
    assert!(production_order_requires_approval(
        "in_progress",
        "cancelled"
    ));
    assert!(production_order_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn apv1_production_order_cancel_from_completed_needs_approval() {
    assert!(production_order_requires_approval("completed", "cancelled"));
    assert!(production_order_can_transition("completed", "cancelled").is_ok());
}

#[test]
fn apv2_rework_transition_needs_approval() {
    assert!(work_report_requires_approval("rejected", "reworking"));
    assert!(work_report_can_transition("rejected", "reworking").is_ok());
}

#[test]
fn apv3_concession_transition_needs_approval() {
    assert!(quality_inspection_requires_approval(
        "failed",
        "concession_received"
    ));
    assert!(quality_inspection_can_transition("failed", "concession_received").is_ok());
}

#[test]
fn apv4_anomaly_handling_needs_approval() {
    assert!(anomaly_requires_approval("acknowledged", "handling"));
    assert!(anomaly_can_transition("acknowledged", "handling").is_ok());
}

#[test]
fn non_approval_transitions_do_not_require_approval() {
    assert!(!production_order_requires_approval("draft", "cancelled"));
    assert!(!work_report_requires_approval("draft", "submitted"));
    assert!(!quality_inspection_requires_approval("failed", "scrapped"));
    assert!(!anomaly_requires_approval("triggered", "acknowledged"));
}

#[test]
fn equipment_scrap_needs_approval() {
    assert!(equipment_requires_approval("running", "scrapped"));
    assert!(!equipment_requires_approval("running", "down"));
}

#[test]
fn traceability_unfreeze_needs_approval() {
    assert!(traceability_requires_approval("frozen", "active"));
    assert!(!traceability_requires_approval("active", "frozen"));
}

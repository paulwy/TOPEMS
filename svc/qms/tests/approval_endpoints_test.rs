//! Task 5: Approval endpoints FSM validation tests
//!
//! 4 类审批 × 2 = 8 单测，测试 FSM 校验逻辑（不需要 DB）。
//! 覆盖 Inspection / Issue / EightD / Apqp 的审批与取消流转。

use topems_qms::shared::fsm::*;

// ==================== APV-1: Inspection ====================

#[test]
fn test_inspection_approval_flow() {
    // pending_audit → completed requires approval
    assert!(inspection_requires_approval("pending_audit", "completed"));
    assert!(inspection_can_transition("pending_audit", "completed").is_ok());
    // pending_audit → rejected requires approval
    assert!(inspection_requires_approval("pending_audit", "rejected"));
    assert!(inspection_can_transition("pending_audit", "rejected").is_ok());
}

#[test]
fn test_inspection_rework_no_approval() {
    // rejected → in_progress does NOT require approval
    assert!(!inspection_requires_approval("rejected", "in_progress"));
    assert!(inspection_can_transition("rejected", "in_progress").is_ok());
}

#[test]
fn test_inspection_terminal_state_blocked() {
    // completed is terminal — cannot transition
    assert!(inspection_can_transition("completed", "in_progress").is_err());
}

// ==================== APV-2: Issue ====================

#[test]
fn test_issue_approval_flow() {
    assert!(issue_requires_approval("resolved", "closed"));
    assert!(issue_can_transition("resolved", "closed").is_ok());
}

#[test]
fn test_issue_cancel_no_approval() {
    assert!(!issue_requires_approval("open", "cancelled"));
    assert!(issue_can_transition("open", "cancelled").is_ok());
    assert!(issue_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_issue_reject_to_in_progress() {
    // resolved → in_progress (reject) does NOT require approval
    assert!(!issue_requires_approval("resolved", "in_progress"));
    assert!(issue_can_transition("resolved", "in_progress").is_ok());
}

// ==================== APV-3: EightD ====================

#[test]
fn test_eight_d_approval_flow() {
    assert!(eight_d_requires_approval("permanent_action", "verified"));
    assert!(eight_d_can_transition("permanent_action", "verified").is_ok());
}

#[test]
fn test_eight_d_close_approval() {
    assert!(eight_d_requires_approval("verified", "closed"));
    assert!(eight_d_can_transition("verified", "closed").is_ok());
}

#[test]
fn test_eight_d_cancel_no_approval() {
    assert!(!eight_d_requires_approval("in_progress", "cancelled"));
    assert!(eight_d_can_transition("in_progress", "cancelled").is_ok());
    assert!(eight_d_can_transition("root_cause", "cancelled").is_ok());
}

// ==================== APV-4: Apqp ====================

#[test]
fn test_apqp_approval_flow() {
    assert!(apqp_requires_approval("in_pilot", "in_production"));
    assert!(apqp_can_transition("in_pilot", "in_production").is_ok());
}

#[test]
fn test_apqp_complete_approval() {
    assert!(apqp_requires_approval("in_production", "completed"));
    assert!(apqp_can_transition("in_production", "completed").is_ok());
}

#[test]
fn test_apqp_cancel_no_approval() {
    assert!(!apqp_requires_approval("planning", "cancelled"));
    assert!(apqp_can_transition("planning", "cancelled").is_ok());
    assert!(apqp_can_transition("in_design", "cancelled").is_ok());
    assert!(apqp_can_transition("in_pilot", "cancelled").is_ok());
}

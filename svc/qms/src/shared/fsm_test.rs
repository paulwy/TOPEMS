use super::fsm::*;

// ==================== FSM-1: Inspection ====================

#[test]
fn test_inspection_valid_transitions() {
    assert!(inspection_can_transition("pending", "in_progress").is_ok());
    assert!(inspection_can_transition("in_progress", "pending_audit").is_ok());
    assert!(inspection_can_transition("pending_audit", "completed").is_ok());
    assert!(inspection_can_transition("pending_audit", "rejected").is_ok());
    assert!(inspection_can_transition("rejected", "in_progress").is_ok());
}

#[test]
fn test_inspection_invalid_transitions() {
    assert!(matches!(
        inspection_can_transition("pending", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inspection_can_transition("pending", "pending_audit"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inspection_can_transition("in_progress", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_inspection_terminal_state() {
    assert!(matches!(
        inspection_can_transition("completed", "pending"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        inspection_can_transition("completed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_inspection_unknown_status() {
    assert!(matches!(
        inspection_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        inspection_can_transition("pending", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_inspection_requires_approval() {
    assert!(inspection_requires_approval("pending_audit", "completed"));
    assert!(inspection_requires_approval("pending_audit", "rejected"));
    assert!(!inspection_requires_approval("pending", "in_progress"));
    assert!(!inspection_requires_approval(
        "in_progress",
        "pending_audit"
    ));
}

#[test]
fn test_inspection_self_transition_rejected() {
    assert!(matches!(
        inspection_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inspection_can_transition("in_progress", "in_progress"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-2: Issue ====================

#[test]
fn test_issue_valid_transitions() {
    assert!(issue_can_transition("open", "in_progress").is_ok());
    assert!(issue_can_transition("in_progress", "resolved").is_ok());
    assert!(issue_can_transition("in_progress", "open").is_ok());
    assert!(issue_can_transition("resolved", "closed").is_ok());
    assert!(issue_can_transition("resolved", "in_progress").is_ok());
    assert!(issue_can_transition("open", "cancelled").is_ok());
    assert!(issue_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_issue_invalid_transitions() {
    assert!(matches!(
        issue_can_transition("open", "closed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        issue_can_transition("open", "resolved"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_issue_terminal_state() {
    assert!(matches!(
        issue_can_transition("closed", "open"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        issue_can_transition("cancelled", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_issue_unknown_status() {
    assert!(matches!(
        issue_can_transition("unknown", "open"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        issue_can_transition("open", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_issue_requires_approval() {
    assert!(issue_requires_approval("resolved", "closed"));
    assert!(!issue_requires_approval("open", "in_progress"));
    assert!(!issue_requires_approval("in_progress", "resolved"));
}

#[test]
fn test_issue_self_transition_rejected() {
    assert!(matches!(
        issue_can_transition("open", "open"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        issue_can_transition("in_progress", "in_progress"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-3: Action ====================

#[test]
fn test_action_valid_transitions() {
    assert!(action_can_transition("pending", "in_progress").is_ok());
    assert!(action_can_transition("in_progress", "completed").is_ok());
    assert!(action_can_transition("in_progress", "pending").is_ok());
    assert!(action_can_transition("completed", "verified").is_ok());
    assert!(action_can_transition("completed", "in_progress").is_ok());
    assert!(action_can_transition("pending", "cancelled").is_ok());
    assert!(action_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_action_invalid_transitions() {
    assert!(matches!(
        action_can_transition("pending", "verified"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        action_can_transition("pending", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_action_terminal_state() {
    assert!(matches!(
        action_can_transition("verified", "pending"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        action_can_transition("cancelled", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_action_unknown_status() {
    assert!(matches!(
        action_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        action_can_transition("pending", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_action_requires_approval() {
    assert!(action_requires_approval("completed", "verified"));
    assert!(!action_requires_approval("pending", "in_progress"));
    assert!(!action_requires_approval("in_progress", "completed"));
}

#[test]
fn test_action_self_transition_rejected() {
    assert!(matches!(
        action_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        action_can_transition("completed", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-4: AuditPlan ====================

#[test]
fn test_audit_plan_valid_transitions() {
    assert!(audit_plan_can_transition("draft", "scheduled").is_ok());
    assert!(audit_plan_can_transition("draft", "cancelled").is_ok());
    assert!(audit_plan_can_transition("scheduled", "in_progress").is_ok());
    assert!(audit_plan_can_transition("scheduled", "cancelled").is_ok());
    assert!(audit_plan_can_transition("in_progress", "completed").is_ok());
    assert!(audit_plan_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_audit_plan_invalid_transitions() {
    assert!(matches!(
        audit_plan_can_transition("draft", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        audit_plan_can_transition("draft", "in_progress"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_audit_plan_terminal_state() {
    assert!(matches!(
        audit_plan_can_transition("completed", "draft"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        audit_plan_can_transition("cancelled", "scheduled"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_audit_plan_unknown_status() {
    assert!(matches!(
        audit_plan_can_transition("unknown", "draft"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        audit_plan_can_transition("draft", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_audit_plan_requires_approval() {
    assert!(audit_plan_requires_approval("in_progress", "completed"));
    assert!(!audit_plan_requires_approval("draft", "scheduled"));
    assert!(!audit_plan_requires_approval("scheduled", "in_progress"));
}

#[test]
fn test_audit_plan_self_transition_rejected() {
    assert!(matches!(
        audit_plan_can_transition("draft", "draft"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        audit_plan_can_transition("scheduled", "scheduled"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-5: AuditFinding ====================

#[test]
fn test_audit_finding_valid_transitions() {
    assert!(audit_finding_can_transition("open", "in_progress").is_ok());
    assert!(audit_finding_can_transition("in_progress", "verified").is_ok());
    assert!(audit_finding_can_transition("in_progress", "open").is_ok());
    assert!(audit_finding_can_transition("verified", "closed").is_ok());
    assert!(audit_finding_can_transition("verified", "in_progress").is_ok());
}

#[test]
fn test_audit_finding_invalid_transitions() {
    assert!(matches!(
        audit_finding_can_transition("open", "closed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        audit_finding_can_transition("open", "verified"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_audit_finding_terminal_state() {
    assert!(matches!(
        audit_finding_can_transition("closed", "open"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        audit_finding_can_transition("closed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_audit_finding_unknown_status() {
    assert!(matches!(
        audit_finding_can_transition("unknown", "open"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        audit_finding_can_transition("open", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_audit_finding_requires_approval() {
    assert!(audit_finding_requires_approval("verified", "closed"));
    assert!(!audit_finding_requires_approval("open", "in_progress"));
    assert!(!audit_finding_requires_approval("in_progress", "verified"));
}

#[test]
fn test_audit_finding_self_transition_rejected() {
    assert!(matches!(
        audit_finding_can_transition("open", "open"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        audit_finding_can_transition("verified", "verified"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-6: EightD ====================

#[test]
fn test_eight_d_valid_transitions() {
    assert!(eight_d_can_transition("initiated", "in_progress").is_ok());
    assert!(eight_d_can_transition("in_progress", "containment").is_ok());
    assert!(eight_d_can_transition("containment", "root_cause").is_ok());
    assert!(eight_d_can_transition("root_cause", "permanent_action").is_ok());
    assert!(eight_d_can_transition("permanent_action", "verified").is_ok());
    assert!(eight_d_can_transition("verified", "closed").is_ok());
    assert!(eight_d_can_transition("initiated", "cancelled").is_ok());
    assert!(eight_d_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_eight_d_invalid_transitions() {
    assert!(matches!(
        eight_d_can_transition("initiated", "closed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        eight_d_can_transition("initiated", "verified"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        eight_d_can_transition("containment", "verified"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_eight_d_terminal_state() {
    assert!(matches!(
        eight_d_can_transition("closed", "initiated"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        eight_d_can_transition("cancelled", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_eight_d_unknown_status() {
    assert!(matches!(
        eight_d_can_transition("unknown", "initiated"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        eight_d_can_transition("initiated", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_eight_d_requires_approval() {
    assert!(eight_d_requires_approval("permanent_action", "verified"));
    assert!(eight_d_requires_approval("verified", "closed"));
    assert!(!eight_d_requires_approval("initiated", "in_progress"));
    assert!(!eight_d_requires_approval("in_progress", "containment"));
}

#[test]
fn test_eight_d_self_transition_rejected() {
    assert!(matches!(
        eight_d_can_transition("initiated", "initiated"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        eight_d_can_transition("verified", "verified"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-7: Apqp ====================

#[test]
fn test_apqp_valid_transitions() {
    assert!(apqp_can_transition("planning", "in_design").is_ok());
    assert!(apqp_can_transition("in_design", "in_pilot").is_ok());
    assert!(apqp_can_transition("in_pilot", "in_production").is_ok());
    assert!(apqp_can_transition("in_production", "completed").is_ok());
    assert!(apqp_can_transition("planning", "cancelled").is_ok());
    assert!(apqp_can_transition("in_design", "cancelled").is_ok());
    assert!(apqp_can_transition("in_pilot", "cancelled").is_ok());
    assert!(apqp_can_transition("in_production", "cancelled").is_ok());
}

#[test]
fn test_apqp_invalid_transitions() {
    assert!(matches!(
        apqp_can_transition("planning", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        apqp_can_transition("planning", "in_production"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        apqp_can_transition("in_design", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_apqp_terminal_state() {
    assert!(matches!(
        apqp_can_transition("completed", "planning"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        apqp_can_transition("cancelled", "in_design"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_apqp_unknown_status() {
    assert!(matches!(
        apqp_can_transition("unknown", "planning"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        apqp_can_transition("planning", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_apqp_requires_approval() {
    assert!(apqp_requires_approval("in_pilot", "in_production"));
    assert!(apqp_requires_approval("in_production", "completed"));
    assert!(!apqp_requires_approval("planning", "in_design"));
    assert!(!apqp_requires_approval("in_design", "in_pilot"));
}

#[test]
fn test_apqp_self_transition_rejected() {
    assert!(matches!(
        apqp_can_transition("planning", "planning"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        apqp_can_transition("in_pilot", "in_pilot"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

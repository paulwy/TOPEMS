//! QMS 7 状态机定义
//!
//! FSM-1 Inspection:  pending → in_progress → pending_audit → completed/rejected
//! FSM-2 Issue:       open → in_progress → resolved → closed/cancelled
//! FSM-3 Action:      pending → in_progress → completed → verified/cancelled
//! FSM-4 AuditPlan:   draft → scheduled → in_progress → completed/cancelled
//! FSM-5 AuditFinding: open → in_progress → verified → closed
//! FSM-6 EightD:      initiated → in_progress → containment → root_cause → permanent_action → verified → closed/cancelled
//! FSM-7 Apqp:        planning → in_design → in_pilot → in_production → completed/cancelled
//!
//! `FsmError` / `validate_status` / `check_pair` 已提取至 `topems_shared_core::fsm`。

// 重导出公共 FSM 基础类型，保持 `use crate::shared::fsm::{...}` 调用方无需改动
pub use topems_shared_core::fsm::{check_pair, FsmError};

// ==================== FSM-1: QualityInspection ====================
const INSPECTION_STATES: &[&str] = &[
    "pending",
    "in_progress",
    "pending_audit",
    "completed",
    "rejected",
];
const INSPECTION_TERMINAL: &[&str] = &["completed"];
const INSPECTION_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[
    ("pending_audit", "completed"),
    ("pending_audit", "rejected"),
];

pub fn inspection_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "in_progress"),
        ("in_progress", "pending_audit"),
        ("pending_audit", "completed"),
        ("pending_audit", "rejected"),
        ("rejected", "in_progress"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        INSPECTION_TERMINAL,
        INSPECTION_STATES,
    )
}

pub fn inspection_requires_approval(from: &str, to: &str) -> bool {
    INSPECTION_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_inspection_status(s: &str) -> bool {
    INSPECTION_STATES.contains(&s)
}

// ==================== FSM-2: QualityIssue ====================
const ISSUE_STATES: &[&str] = &["open", "in_progress", "resolved", "closed", "cancelled"];
const ISSUE_TERMINAL: &[&str] = &["closed", "cancelled"];
const ISSUE_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("resolved", "closed")];

pub fn issue_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("open", "in_progress"),
        ("in_progress", "resolved"),
        ("in_progress", "open"),
        ("resolved", "closed"),
        ("resolved", "in_progress"),
        ("open", "cancelled"),
        ("in_progress", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, ISSUE_TERMINAL, ISSUE_STATES)
}

pub fn issue_requires_approval(from: &str, to: &str) -> bool {
    ISSUE_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_issue_status(s: &str) -> bool {
    ISSUE_STATES.contains(&s)
}

// ==================== FSM-3: CorrectiveAction ====================
const ACTION_STATES: &[&str] = &[
    "pending",
    "in_progress",
    "completed",
    "verified",
    "cancelled",
];
const ACTION_TERMINAL: &[&str] = &["verified", "cancelled"];
const ACTION_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("completed", "verified")];

pub fn action_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "in_progress"),
        ("in_progress", "completed"),
        ("in_progress", "pending"),
        ("completed", "verified"),
        ("completed", "in_progress"),
        ("pending", "cancelled"),
        ("in_progress", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, ACTION_TERMINAL, ACTION_STATES)
}

pub fn action_requires_approval(from: &str, to: &str) -> bool {
    ACTION_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_action_status(s: &str) -> bool {
    ACTION_STATES.contains(&s)
}

// ==================== FSM-4: AuditPlan ====================
const AUDIT_PLAN_STATES: &[&str] = &[
    "draft",
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
];
const AUDIT_PLAN_TERMINAL: &[&str] = &["completed", "cancelled"];
const AUDIT_PLAN_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("in_progress", "completed")];

pub fn audit_plan_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "scheduled"),
        ("draft", "cancelled"),
        ("scheduled", "in_progress"),
        ("scheduled", "cancelled"),
        ("in_progress", "completed"),
        ("in_progress", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        AUDIT_PLAN_TERMINAL,
        AUDIT_PLAN_STATES,
    )
}

pub fn audit_plan_requires_approval(from: &str, to: &str) -> bool {
    AUDIT_PLAN_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_audit_plan_status(s: &str) -> bool {
    AUDIT_PLAN_STATES.contains(&s)
}

// ==================== FSM-5: AuditFinding ====================
const AUDIT_FINDING_STATES: &[&str] = &["open", "in_progress", "verified", "closed"];
const AUDIT_FINDING_TERMINAL: &[&str] = &["closed"];
const AUDIT_FINDING_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("verified", "closed")];

pub fn audit_finding_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("open", "in_progress"),
        ("in_progress", "verified"),
        ("in_progress", "open"),
        ("verified", "closed"),
        ("verified", "in_progress"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        AUDIT_FINDING_TERMINAL,
        AUDIT_FINDING_STATES,
    )
}

pub fn audit_finding_requires_approval(from: &str, to: &str) -> bool {
    AUDIT_FINDING_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_audit_finding_status(s: &str) -> bool {
    AUDIT_FINDING_STATES.contains(&s)
}

// ==================== FSM-6: EightDReport ====================
const EIGHT_D_STATES: &[&str] = &[
    "initiated",
    "in_progress",
    "containment",
    "root_cause",
    "permanent_action",
    "verified",
    "closed",
    "cancelled",
];
const EIGHT_D_TERMINAL: &[&str] = &["closed", "cancelled"];
const EIGHT_D_APPROVAL_TRANSITIONS: &[(&str, &str)] =
    &[("verified", "closed"), ("permanent_action", "verified")];

pub fn eight_d_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("initiated", "in_progress"),
        ("in_progress", "containment"),
        ("containment", "root_cause"),
        ("root_cause", "permanent_action"),
        ("permanent_action", "verified"),
        ("verified", "closed"),
        ("initiated", "cancelled"),
        ("in_progress", "cancelled"),
        ("containment", "cancelled"),
        ("root_cause", "cancelled"),
        ("permanent_action", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, EIGHT_D_TERMINAL, EIGHT_D_STATES)
}

pub fn eight_d_requires_approval(from: &str, to: &str) -> bool {
    EIGHT_D_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_eight_d_status(s: &str) -> bool {
    EIGHT_D_STATES.contains(&s)
}

// ==================== FSM-7: ApqpProject ====================
const APQP_STATES: &[&str] = &[
    "planning",
    "in_design",
    "in_pilot",
    "in_production",
    "completed",
    "cancelled",
];
const APQP_TERMINAL: &[&str] = &["completed", "cancelled"];
const APQP_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[
    ("in_pilot", "in_production"),
    ("in_production", "completed"),
];

pub fn apqp_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("planning", "in_design"),
        ("in_design", "in_pilot"),
        ("in_pilot", "in_production"),
        ("in_production", "completed"),
        ("planning", "cancelled"),
        ("in_design", "cancelled"),
        ("in_pilot", "cancelled"),
        ("in_production", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, APQP_TERMINAL, APQP_STATES)
}

pub fn apqp_requires_approval(from: &str, to: &str) -> bool {
    APQP_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_apqp_status(s: &str) -> bool {
    APQP_STATES.contains(&s)
}

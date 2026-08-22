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
//! 使用 `FsmDef` 声明式定义，消除重复的 `check_pair` 调用模板。
//! `FsmError` / `validate_status` / `check_pair` 已提取至 `topems_shared_core::fsm`。

// 重导出公共 FSM 基础类型，保持 `use crate::shared::fsm::{...}` 调用方无需改动
pub use topems_shared_core::fsm::{FsmDef, FsmError};

// ==================== FSM-1: QualityInspection ====================
pub const INSPECTION: FsmDef = FsmDef {
    states: &[
        "pending",
        "in_progress",
        "pending_audit",
        "completed",
        "rejected",
    ],
    terminal: &["completed"],
    transitions: &[
        ("pending", "in_progress"),
        ("in_progress", "pending_audit"),
        ("pending_audit", "completed"),
        ("pending_audit", "rejected"),
        ("rejected", "in_progress"),
    ],
    approval_transitions: &[
        ("pending_audit", "completed"),
        ("pending_audit", "rejected"),
    ],
};

pub fn inspection_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    INSPECTION.can_transition(from, to)
}

pub fn inspection_requires_approval(from: &str, to: &str) -> bool {
    INSPECTION.requires_approval(from, to)
}

pub fn is_valid_inspection_status(s: &str) -> bool {
    INSPECTION.is_valid_status(s)
}

// ==================== FSM-2: QualityIssue ====================
pub const ISSUE: FsmDef = FsmDef {
    states: &["open", "in_progress", "resolved", "closed", "cancelled"],
    terminal: &["closed", "cancelled"],
    transitions: &[
        ("open", "in_progress"),
        ("in_progress", "resolved"),
        ("in_progress", "open"),
        ("resolved", "closed"),
        ("resolved", "in_progress"),
        ("open", "cancelled"),
        ("in_progress", "cancelled"),
    ],
    approval_transitions: &[("resolved", "closed")],
};

pub fn issue_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    ISSUE.can_transition(from, to)
}

pub fn issue_requires_approval(from: &str, to: &str) -> bool {
    ISSUE.requires_approval(from, to)
}

pub fn is_valid_issue_status(s: &str) -> bool {
    ISSUE.is_valid_status(s)
}

// ==================== FSM-3: CorrectiveAction ====================
pub const ACTION: FsmDef = FsmDef {
    states: &[
        "pending",
        "in_progress",
        "completed",
        "verified",
        "cancelled",
    ],
    terminal: &["verified", "cancelled"],
    transitions: &[
        ("pending", "in_progress"),
        ("in_progress", "completed"),
        ("in_progress", "pending"),
        ("completed", "verified"),
        ("completed", "in_progress"),
        ("pending", "cancelled"),
        ("in_progress", "cancelled"),
    ],
    approval_transitions: &[("completed", "verified")],
};

pub fn action_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    ACTION.can_transition(from, to)
}

pub fn action_requires_approval(from: &str, to: &str) -> bool {
    ACTION.requires_approval(from, to)
}

pub fn is_valid_action_status(s: &str) -> bool {
    ACTION.is_valid_status(s)
}

// ==================== FSM-4: AuditPlan ====================
pub const AUDIT_PLAN: FsmDef = FsmDef {
    states: &[
        "draft",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
    ],
    terminal: &["completed", "cancelled"],
    transitions: &[
        ("draft", "scheduled"),
        ("draft", "cancelled"),
        ("scheduled", "in_progress"),
        ("scheduled", "cancelled"),
        ("in_progress", "completed"),
        ("in_progress", "cancelled"),
    ],
    approval_transitions: &[("in_progress", "completed")],
};

pub fn audit_plan_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    AUDIT_PLAN.can_transition(from, to)
}

pub fn audit_plan_requires_approval(from: &str, to: &str) -> bool {
    AUDIT_PLAN.requires_approval(from, to)
}

pub fn is_valid_audit_plan_status(s: &str) -> bool {
    AUDIT_PLAN.is_valid_status(s)
}

// ==================== FSM-5: AuditFinding ====================
pub const AUDIT_FINDING: FsmDef = FsmDef {
    states: &["open", "in_progress", "verified", "closed"],
    terminal: &["closed"],
    transitions: &[
        ("open", "in_progress"),
        ("in_progress", "verified"),
        ("in_progress", "open"),
        ("verified", "closed"),
        ("verified", "in_progress"),
    ],
    approval_transitions: &[("verified", "closed")],
};

pub fn audit_finding_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    AUDIT_FINDING.can_transition(from, to)
}

pub fn audit_finding_requires_approval(from: &str, to: &str) -> bool {
    AUDIT_FINDING.requires_approval(from, to)
}

pub fn is_valid_audit_finding_status(s: &str) -> bool {
    AUDIT_FINDING.is_valid_status(s)
}

// ==================== FSM-6: EightDReport ====================
pub const EIGHT_D: FsmDef = FsmDef {
    states: &[
        "initiated",
        "in_progress",
        "containment",
        "root_cause",
        "permanent_action",
        "verified",
        "closed",
        "cancelled",
    ],
    terminal: &["closed", "cancelled"],
    transitions: &[
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
    ],
    approval_transitions: &[("verified", "closed"), ("permanent_action", "verified")],
};

pub fn eight_d_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    EIGHT_D.can_transition(from, to)
}

pub fn eight_d_requires_approval(from: &str, to: &str) -> bool {
    EIGHT_D.requires_approval(from, to)
}

pub fn is_valid_eight_d_status(s: &str) -> bool {
    EIGHT_D.is_valid_status(s)
}

// ==================== FSM-7: ApqpProject ====================
pub const APQP: FsmDef = FsmDef {
    states: &[
        "planning",
        "in_design",
        "in_pilot",
        "in_production",
        "completed",
        "cancelled",
    ],
    terminal: &["completed", "cancelled"],
    transitions: &[
        ("planning", "in_design"),
        ("in_design", "in_pilot"),
        ("in_pilot", "in_production"),
        ("in_production", "completed"),
        ("planning", "cancelled"),
        ("in_design", "cancelled"),
        ("in_pilot", "cancelled"),
        ("in_production", "cancelled"),
    ],
    approval_transitions: &[
        ("in_pilot", "in_production"),
        ("in_production", "completed"),
    ],
};

pub fn apqp_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    APQP.can_transition(from, to)
}

pub fn apqp_requires_approval(from: &str, to: &str) -> bool {
    APQP.requires_approval(from, to)
}

pub fn is_valid_apqp_status(s: &str) -> bool {
    APQP.is_valid_status(s)
}

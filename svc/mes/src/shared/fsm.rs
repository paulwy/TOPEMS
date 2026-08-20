//! MES 三状态机定义
//!
//! ProductionOrder: draft → pending → in_progress → completed/cancelled
//! WorkOrder:       pending → in_progress ⇄ paused → completed/cancelled
//! WIP:             in_progress → transferred → completed
//!
//! `released` 是历史遗留值（与 in_progress 等价），保留兼容。
//!
//! `FsmError` / `validate_status` / `check_pair` 已提取至 `topems_shared_core::fsm`。

// 重导出公共 FSM 基础类型，保持 `use crate::shared::fsm::{...}` 调用方无需改动
pub use topems_shared_core::fsm::{check_pair, FsmError};

const PRODUCTION_ORDER_STATES: &[&str] = &[
    "draft",
    "pending",
    "in_progress",
    "released",
    "completed",
    "cancelled",
];
// completed 不再视为终态：允许经审批回滚到 cancelled（撤单）
const PRODUCTION_ORDER_TERMINAL: &[&str] = &["cancelled"];

const WORK_ORDER_STATES: &[&str] = &["pending", "in_progress", "paused", "completed", "cancelled"];
const WORK_ORDER_TERMINAL: &[&str] = &["completed", "cancelled"];

const WIP_STATES: &[&str] = &["in_progress", "transferred", "completed"];
const WIP_TERMINAL: &[&str] = &["completed"];

pub fn production_order_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    // released 等价于 in_progress（历史值兼容）
    let from_norm = if from == "released" {
        "in_progress"
    } else {
        from
    };
    let to_norm = if to == "released" { "in_progress" } else { to };
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "pending"),
        ("pending", "in_progress"),
        ("draft", "cancelled"),
        ("pending", "cancelled"),
        ("in_progress", "cancelled"),
        ("in_progress", "completed"),
        ("completed", "cancelled"),
    ];
    check_pair(
        from_norm,
        to_norm,
        allowed_pairs,
        PRODUCTION_ORDER_TERMINAL,
        PRODUCTION_ORDER_STATES,
    )
}

const PRODUCTION_ORDER_APPROVAL_TRANSITIONS: &[(&str, &str)] =
    &[("in_progress", "cancelled"), ("completed", "cancelled")];

pub fn production_order_requires_approval(from: &str, to: &str) -> bool {
    let from_norm = if from == "released" {
        "in_progress"
    } else {
        from
    };
    let to_norm = if to == "released" { "in_progress" } else { to };
    PRODUCTION_ORDER_APPROVAL_TRANSITIONS.contains(&(from_norm, to_norm))
}

pub fn work_order_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "in_progress"),
        ("in_progress", "paused"),
        ("paused", "in_progress"),
        ("in_progress", "completed"),
        ("pending", "cancelled"),
        ("in_progress", "cancelled"),
        ("paused", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        WORK_ORDER_TERMINAL,
        WORK_ORDER_STATES,
    )
}

pub fn wip_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] =
        &[("in_progress", "transferred"), ("transferred", "completed")];
    check_pair(from, to, allowed_pairs, WIP_TERMINAL, WIP_STATES)
}

// 用于在测试 / 调试时检查 status 是否合法（无需 transition）
pub fn is_valid_production_order_status(s: &str) -> bool {
    PRODUCTION_ORDER_STATES.contains(&s)
}

pub fn is_valid_work_order_status(s: &str) -> bool {
    WORK_ORDER_STATES.contains(&s)
}

pub fn is_valid_wip_status(s: &str) -> bool {
    WIP_STATES.contains(&s)
}

// ==================== FSM-3: WorkReport ====================
const WORK_REPORT_STATES: &[&str] = &["draft", "submitted", "archived", "rejected", "reworking"];
const WORK_REPORT_TERMINAL: &[&str] = &["archived"];
const WORK_REPORT_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("rejected", "reworking")];

pub fn work_report_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "submitted"),
        ("submitted", "archived"),
        ("submitted", "rejected"),
        ("rejected", "reworking"),
        ("reworking", "submitted"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        WORK_REPORT_TERMINAL,
        WORK_REPORT_STATES,
    )
}

pub fn work_report_requires_approval(from: &str, to: &str) -> bool {
    WORK_REPORT_APPROVAL_TRANSITIONS.contains(&(from, to))
}

// ==================== FSM-4: QualityInspection ====================
const QI_STATES: &[&str] = &[
    "pending",
    "inspecting",
    "passed",
    "failed",
    "concession_received",
    "rework_assigned",
    "scrapped",
];
const QI_TERMINAL: &[&str] = &[
    "passed",
    "concession_received",
    "rework_assigned",
    "scrapped",
];
const QI_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("failed", "concession_received")];

pub fn quality_inspection_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "inspecting"),
        ("inspecting", "passed"),
        ("inspecting", "failed"),
        ("failed", "concession_received"),
        ("failed", "rework_assigned"),
        ("failed", "scrapped"),
    ];
    check_pair(from, to, allowed_pairs, QI_TERMINAL, QI_STATES)
}

pub fn quality_inspection_requires_approval(from: &str, to: &str) -> bool {
    QI_APPROVAL_TRANSITIONS.contains(&(from, to))
}

// ==================== FSM-5: TraceabilityRecord ====================
const TRACE_STATES: &[&str] = &["active", "frozen", "locked", "investigating", "resolved"];
const TRACE_TERMINAL: &[&str] = &["resolved"];
const TRACE_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[
    ("frozen", "active"),
    ("locked", "active"),
    ("investigating", "active"),
];

pub fn traceability_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("active", "frozen"),
        ("frozen", "locked"),
        ("locked", "investigating"),
        ("investigating", "resolved"),
        ("frozen", "active"),
        ("locked", "active"),
        ("investigating", "active"),
    ];
    check_pair(from, to, allowed_pairs, TRACE_TERMINAL, TRACE_STATES)
}

pub fn traceability_requires_approval(from: &str, to: &str) -> bool {
    TRACE_APPROVAL_TRANSITIONS.contains(&(from, to))
}

// ==================== FSM-6: Equipment ====================
const EQUIP_STATES: &[&str] = &[
    "running",
    "idle",
    "calibrating",
    "down",
    "maintenance",
    "scrapped",
];
const EQUIP_TERMINAL: &[&str] = &["scrapped"];
const EQUIP_APPROVAL_TRANSITIONS: &[(&str, &str)] =
    &[("running", "scrapped"), ("idle", "scrapped")];

pub fn equipment_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("running", "idle"),
        ("idle", "running"),
        ("running", "calibrating"),
        ("calibrating", "running"),
        ("running", "down"),
        ("down", "maintenance"),
        ("maintenance", "running"),
        ("running", "scrapped"),
        ("idle", "scrapped"),
    ];
    check_pair(from, to, allowed_pairs, EQUIP_TERMINAL, EQUIP_STATES)
}

pub fn equipment_requires_approval(from: &str, to: &str) -> bool {
    EQUIP_APPROVAL_TRANSITIONS.contains(&(from, to))
}

// ==================== FSM-7: AnomalyRecord ====================
const ANOMALY_STATES: &[&str] = &[
    "monitoring",
    "triggered",
    "acknowledged",
    "handling",
    "closed",
    "false_alarm_verified",
];
const ANOMALY_TERMINAL: &[&str] = &["closed", "false_alarm_verified"];
const ANOMALY_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("acknowledged", "handling")];

pub fn anomaly_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("monitoring", "triggered"),
        ("triggered", "false_alarm_verified"),
        ("triggered", "acknowledged"),
        ("acknowledged", "handling"),
        ("handling", "closed"),
    ];
    check_pair(from, to, allowed_pairs, ANOMALY_TERMINAL, ANOMALY_STATES)
}

pub fn anomaly_requires_approval(from: &str, to: &str) -> bool {
    ANOMALY_APPROVAL_TRANSITIONS.contains(&(from, to))
}

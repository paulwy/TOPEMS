//! APS 5 状态机定义
//!
//! FSM-1 ProductionPlan:  draft → pending_approval → approved → in_progress → completed
//! FSM-2 Schedule:        pending → released → running → completed
//! FSM-3 Capacity:         available → allocated → consumed
//! FSM-4 MaterialPlan:     pending → requisitioned → sourced → satisfied
//! FSM-5 DemandForecast:   draft → calculated → validated → adopted
//!
//! `FsmError` / `validate_status` / `check_pair` 已提取至 `topems_shared_core::fsm`。

// 重导出公共 FSM 基础类型，保持 `use crate::shared::fsm::{...}` 调用方无需改动
pub use topems_shared_core::fsm::{check_pair, FsmError};

// ==================== FSM-1: ProductionPlan ====================
const PRODUCTION_PLAN_STATES: &[&str] = &[
    "draft",
    "pending_approval",
    "approved",
    "in_progress",
    "completed",
    "cancelled",
];
const PRODUCTION_PLAN_TERMINAL: &[&str] = &["completed", "cancelled"];
const PRODUCTION_PLAN_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("pending_approval", "approved")];

pub fn production_plan_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "pending_approval"),
        ("pending_approval", "approved"),
        ("pending_approval", "draft"),
        ("approved", "in_progress"),
        ("in_progress", "completed"),
        ("draft", "cancelled"),
        ("pending_approval", "cancelled"),
        ("approved", "cancelled"),
        ("in_progress", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        PRODUCTION_PLAN_TERMINAL,
        PRODUCTION_PLAN_STATES,
    )
}

pub fn production_plan_requires_approval(from: &str, to: &str) -> bool {
    PRODUCTION_PLAN_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_production_plan_status(s: &str) -> bool {
    PRODUCTION_PLAN_STATES.contains(&s)
}

// ==================== FSM-2: Schedule ====================
const SCHEDULE_STATES: &[&str] = &["pending", "released", "running", "completed", "cancelled"];
const SCHEDULE_TERMINAL: &[&str] = &["completed", "cancelled"];
const SCHEDULE_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("pending", "released")];

pub fn schedule_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "released"),
        ("released", "running"),
        ("running", "completed"),
        ("pending", "cancelled"),
        ("released", "cancelled"),
        ("running", "cancelled"),
        ("released", "pending"),
    ];
    check_pair(from, to, allowed_pairs, SCHEDULE_TERMINAL, SCHEDULE_STATES)
}

pub fn schedule_requires_approval(from: &str, to: &str) -> bool {
    SCHEDULE_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_schedule_status(s: &str) -> bool {
    SCHEDULE_STATES.contains(&s)
}

// ==================== FSM-3: Capacity ====================
const CAPACITY_STATES: &[&str] = &[
    "available",
    "allocated",
    "consumed",
    "maintenance",
    "released",
];
const CAPACITY_TERMINAL: &[&str] = &["consumed"];
const CAPACITY_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("available", "allocated")];

pub fn capacity_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("available", "allocated"),
        ("allocated", "consumed"),
        ("allocated", "released"),
        ("available", "maintenance"),
        ("maintenance", "available"),
        ("released", "available"),
    ];
    check_pair(from, to, allowed_pairs, CAPACITY_TERMINAL, CAPACITY_STATES)
}

pub fn capacity_requires_approval(from: &str, to: &str) -> bool {
    CAPACITY_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_capacity_status(s: &str) -> bool {
    CAPACITY_STATES.contains(&s)
}

// ==================== FSM-4: MaterialPlan ====================
const MATERIAL_PLAN_STATES: &[&str] = &[
    "pending",
    "requisitioned",
    "sourced",
    "satisfied",
    "shortage",
    "cancelled",
];
const MATERIAL_PLAN_TERMINAL: &[&str] = &["satisfied", "cancelled"];
const MATERIAL_PLAN_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("pending", "requisitioned")];

pub fn material_plan_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "requisitioned"),
        ("requisitioned", "sourced"),
        ("sourced", "satisfied"),
        ("pending", "shortage"),
        ("shortage", "requisitioned"),
        ("requisitioned", "cancelled"),
        ("pending", "cancelled"),
        ("sourced", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        MATERIAL_PLAN_TERMINAL,
        MATERIAL_PLAN_STATES,
    )
}

pub fn material_plan_requires_approval(from: &str, to: &str) -> bool {
    MATERIAL_PLAN_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_material_plan_status(s: &str) -> bool {
    MATERIAL_PLAN_STATES.contains(&s)
}

// ==================== FSM-5: DemandForecast ====================
const DEMAND_FORECAST_STATES: &[&str] = &[
    "draft",
    "calculated",
    "validated",
    "adopted",
    "superseded",
    "cancelled",
];
const DEMAND_FORECAST_TERMINAL: &[&str] = &["superseded", "cancelled"];
const DEMAND_FORECAST_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("validated", "adopted")];

pub fn demand_forecast_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "calculated"),
        ("calculated", "validated"),
        ("validated", "adopted"),
        ("calculated", "draft"),
        ("adopted", "superseded"),
        ("draft", "cancelled"),
        ("calculated", "cancelled"),
        ("validated", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        DEMAND_FORECAST_TERMINAL,
        DEMAND_FORECAST_STATES,
    )
}

pub fn demand_forecast_requires_approval(from: &str, to: &str) -> bool {
    DEMAND_FORECAST_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_demand_forecast_status(s: &str) -> bool {
    DEMAND_FORECAST_STATES.contains(&s)
}

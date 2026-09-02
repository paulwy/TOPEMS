//! APS 5 状态机定义
//!
//! FSM-1 ProductionPlan:  draft → pending_approval → approved → in_progress → completed
//! FSM-2 Schedule:        pending → released → running → completed
//! FSM-3 Capacity:         available → allocated → consumed
//! FSM-4 MaterialPlan:     pending → requisitioned → sourced → satisfied
//! FSM-5 DemandForecast:   draft → calculated → validated → adopted
//!
//! 使用 `FsmDef` 声明式定义，消除重复的 `check_pair` 调用模板。
//! `FsmError` / `validate_status` / `check_pair` 已提取至 `topems_shared_core::fsm`。

// 重导出公共 FSM 基础类型，保持 `use crate::shared::fsm::{...}` 调用方无需改动
pub use topems_shared_core::fsm::{FsmDef, FsmError};

// ==================== FSM-1: ProductionPlan ====================
pub const PRODUCTION_PLAN: FsmDef = FsmDef {
    states: &[
        "draft",
        "pending_approval",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
    ],
    terminal: &["completed", "cancelled"],
    transitions: &[
        ("draft", "pending_approval"),
        ("pending_approval", "approved"),
        ("pending_approval", "draft"),
        ("approved", "in_progress"),
        ("in_progress", "completed"),
        ("draft", "cancelled"),
        ("pending_approval", "cancelled"),
        ("approved", "cancelled"),
        ("in_progress", "cancelled"),
    ],
    approval_transitions: &[("pending_approval", "approved")],
};

pub fn production_plan_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    PRODUCTION_PLAN.can_transition(from, to)
}

pub fn production_plan_requires_approval(from: &str, to: &str) -> bool {
    PRODUCTION_PLAN.requires_approval(from, to)
}

pub fn is_valid_production_plan_status(s: &str) -> bool {
    PRODUCTION_PLAN.is_valid_status(s)
}

// ==================== FSM-2: Schedule ====================
pub const SCHEDULE: FsmDef = FsmDef {
    states: &["pending", "released", "running", "completed", "cancelled"],
    terminal: &["completed", "cancelled"],
    transitions: &[
        ("pending", "released"),
        ("released", "running"),
        ("running", "completed"),
        ("pending", "cancelled"),
        ("released", "cancelled"),
        ("running", "cancelled"),
        ("released", "pending"),
    ],
    approval_transitions: &[("pending", "released")],
};

pub fn schedule_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    SCHEDULE.can_transition(from, to)
}

pub fn schedule_requires_approval(from: &str, to: &str) -> bool {
    SCHEDULE.requires_approval(from, to)
}

pub fn is_valid_schedule_status(s: &str) -> bool {
    SCHEDULE.is_valid_status(s)
}

// ==================== FSM-3: Capacity ====================
pub const CAPACITY: FsmDef = FsmDef {
    states: &[
        "available",
        "allocated",
        "consumed",
        "maintenance",
        "released",
    ],
    terminal: &["consumed"],
    transitions: &[
        ("available", "allocated"),
        ("allocated", "consumed"),
        ("allocated", "released"),
        ("available", "maintenance"),
        ("maintenance", "available"),
        ("released", "available"),
    ],
    approval_transitions: &[("available", "allocated")],
};

pub fn capacity_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    CAPACITY.can_transition(from, to)
}

pub fn capacity_requires_approval(from: &str, to: &str) -> bool {
    CAPACITY.requires_approval(from, to)
}

pub fn is_valid_capacity_status(s: &str) -> bool {
    CAPACITY.is_valid_status(s)
}

// ==================== FSM-4: MaterialPlan ====================
pub const MATERIAL_PLAN: FsmDef = FsmDef {
    states: &[
        "pending",
        "requisitioned",
        "sourced",
        "satisfied",
        "shortage",
        "cancelled",
    ],
    terminal: &["satisfied", "cancelled"],
    transitions: &[
        ("pending", "requisitioned"),
        ("requisitioned", "sourced"),
        ("sourced", "satisfied"),
        ("pending", "shortage"),
        ("shortage", "requisitioned"),
        ("requisitioned", "cancelled"),
        ("pending", "cancelled"),
        ("sourced", "cancelled"),
    ],
    approval_transitions: &[("pending", "requisitioned")],
};

pub fn material_plan_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    MATERIAL_PLAN.can_transition(from, to)
}

pub fn material_plan_requires_approval(from: &str, to: &str) -> bool {
    MATERIAL_PLAN.requires_approval(from, to)
}

pub fn is_valid_material_plan_status(s: &str) -> bool {
    MATERIAL_PLAN.is_valid_status(s)
}

// ==================== FSM-5: DemandForecast ====================
pub const DEMAND_FORECAST: FsmDef = FsmDef {
    states: &[
        "draft",
        "calculated",
        "validated",
        "adopted",
        "superseded",
        "cancelled",
    ],
    terminal: &["superseded", "cancelled"],
    transitions: &[
        ("draft", "calculated"),
        ("calculated", "validated"),
        ("validated", "adopted"),
        ("calculated", "draft"),
        ("adopted", "superseded"),
        ("draft", "cancelled"),
        ("calculated", "cancelled"),
        ("validated", "cancelled"),
    ],
    approval_transitions: &[("validated", "adopted")],
};

pub fn demand_forecast_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    DEMAND_FORECAST.can_transition(from, to)
}

pub fn demand_forecast_requires_approval(from: &str, to: &str) -> bool {
    DEMAND_FORECAST.requires_approval(from, to)
}

pub fn is_valid_demand_forecast_status(s: &str) -> bool {
    DEMAND_FORECAST.is_valid_status(s)
}

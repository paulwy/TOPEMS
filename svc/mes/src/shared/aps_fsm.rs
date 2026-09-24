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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== FSM-1: ProductionPlan ====================
    #[test]
    fn production_plan_valid_transitions() {
        assert!(production_plan_can_transition("draft", "pending_approval").is_ok());
        assert!(production_plan_can_transition("pending_approval", "approved").is_ok());
        assert!(production_plan_can_transition("pending_approval", "draft").is_ok());
        assert!(production_plan_can_transition("approved", "in_progress").is_ok());
        assert!(production_plan_can_transition("in_progress", "completed").is_ok());
    }

    #[test]
    fn production_plan_cancel_from_any_active() {
        assert!(production_plan_can_transition("draft", "cancelled").is_ok());
        assert!(production_plan_can_transition("pending_approval", "cancelled").is_ok());
        assert!(production_plan_can_transition("approved", "cancelled").is_ok());
        assert!(production_plan_can_transition("in_progress", "cancelled").is_ok());
    }

    #[test]
    fn production_plan_invalid_transitions() {
        assert!(production_plan_can_transition("draft", "approved").is_err());
        assert!(production_plan_can_transition("approved", "completed").is_err());
        assert!(production_plan_can_transition("completed", "in_progress").is_err());
        assert!(production_plan_can_transition("cancelled", "draft").is_err());
        assert!(production_plan_can_transition("in_progress", "approved").is_err());
    }

    #[test]
    fn production_plan_same_status_rejected() {
        // FsmDef 不隐式允许同状态转换，需显式声明
        assert!(production_plan_can_transition("draft", "draft").is_err());
        assert!(production_plan_can_transition("completed", "completed").is_err());
    }

    #[test]
    fn test_production_plan_requires_approval() {
        assert!(production_plan_requires_approval(
            "pending_approval",
            "approved"
        ));
        assert!(!production_plan_requires_approval(
            "draft",
            "pending_approval"
        ));
        assert!(!production_plan_requires_approval(
            "approved",
            "in_progress"
        ));
    }

    #[test]
    fn production_plan_valid_status() {
        assert!(is_valid_production_plan_status("draft"));
        assert!(is_valid_production_plan_status("completed"));
        assert!(!is_valid_production_plan_status("unknown"));
        assert!(!is_valid_production_plan_status(""));
    }

    // ==================== FSM-2: Schedule ====================
    #[test]
    fn schedule_valid_transitions() {
        assert!(schedule_can_transition("pending", "released").is_ok());
        assert!(schedule_can_transition("released", "running").is_ok());
        assert!(schedule_can_transition("running", "completed").is_ok());
        assert!(schedule_can_transition("released", "pending").is_ok());
    }

    #[test]
    fn schedule_cancel_transitions() {
        assert!(schedule_can_transition("pending", "cancelled").is_ok());
        assert!(schedule_can_transition("released", "cancelled").is_ok());
        assert!(schedule_can_transition("running", "cancelled").is_ok());
    }

    #[test]
    fn schedule_invalid_transitions() {
        assert!(schedule_can_transition("pending", "running").is_err());
        assert!(schedule_can_transition("running", "released").is_err());
        assert!(schedule_can_transition("completed", "running").is_err());
        assert!(schedule_can_transition("cancelled", "pending").is_err());
    }

    #[test]
    fn test_schedule_requires_approval() {
        assert!(schedule_requires_approval("pending", "released"));
        assert!(!schedule_requires_approval("released", "running"));
        assert!(!schedule_requires_approval("running", "completed"));
    }

    #[test]
    fn schedule_valid_status() {
        assert!(is_valid_schedule_status("pending"));
        assert!(is_valid_schedule_status("completed"));
        assert!(!is_valid_schedule_status("draft"));
        assert!(!is_valid_schedule_status("invalid"));
    }

    // ==================== FSM-3: Capacity ====================
    #[test]
    fn capacity_valid_transitions() {
        assert!(capacity_can_transition("available", "allocated").is_ok());
        assert!(capacity_can_transition("allocated", "consumed").is_ok());
        assert!(capacity_can_transition("allocated", "released").is_ok());
        assert!(capacity_can_transition("available", "maintenance").is_ok());
        assert!(capacity_can_transition("maintenance", "available").is_ok());
        assert!(capacity_can_transition("released", "available").is_ok());
    }

    #[test]
    fn capacity_invalid_transitions() {
        assert!(capacity_can_transition("available", "consumed").is_err());
        assert!(capacity_can_transition("allocated", "available").is_err());
        assert!(capacity_can_transition("consumed", "available").is_err());
        assert!(capacity_can_transition("maintenance", "allocated").is_err());
        assert!(capacity_can_transition("released", "allocated").is_err());
    }

    #[test]
    fn test_capacity_requires_approval() {
        assert!(capacity_requires_approval("available", "allocated"));
        assert!(!capacity_requires_approval("allocated", "consumed"));
        assert!(!capacity_requires_approval("available", "maintenance"));
    }

    #[test]
    fn capacity_valid_status() {
        assert!(is_valid_capacity_status("available"));
        assert!(is_valid_capacity_status("consumed"));
        assert!(is_valid_capacity_status("maintenance"));
        assert!(!is_valid_capacity_status("pending"));
    }

    // ==================== FSM-4: MaterialPlan ====================
    #[test]
    fn material_plan_valid_transitions() {
        assert!(material_plan_can_transition("pending", "requisitioned").is_ok());
        assert!(material_plan_can_transition("requisitioned", "sourced").is_ok());
        assert!(material_plan_can_transition("sourced", "satisfied").is_ok());
        assert!(material_plan_can_transition("pending", "shortage").is_ok());
        assert!(material_plan_can_transition("shortage", "requisitioned").is_ok());
    }

    #[test]
    fn material_plan_cancel_transitions() {
        assert!(material_plan_can_transition("pending", "cancelled").is_ok());
        assert!(material_plan_can_transition("requisitioned", "cancelled").is_ok());
        assert!(material_plan_can_transition("sourced", "cancelled").is_ok());
    }

    #[test]
    fn material_plan_invalid_transitions() {
        assert!(material_plan_can_transition("pending", "sourced").is_err());
        assert!(material_plan_can_transition("requisitioned", "satisfied").is_err());
        assert!(material_plan_can_transition("satisfied", "sourced").is_err());
        assert!(material_plan_can_transition("shortage", "sourced").is_err());
        assert!(material_plan_can_transition("cancelled", "pending").is_err());
    }

    #[test]
    fn test_material_plan_requires_approval() {
        assert!(material_plan_requires_approval("pending", "requisitioned"));
        assert!(!material_plan_requires_approval("requisitioned", "sourced"));
        assert!(!material_plan_requires_approval("sourced", "satisfied"));
    }

    #[test]
    fn material_plan_valid_status() {
        assert!(is_valid_material_plan_status("pending"));
        assert!(is_valid_material_plan_status("shortage"));
        assert!(is_valid_material_plan_status("satisfied"));
        assert!(!is_valid_material_plan_status("approved"));
    }

    // ==================== FSM-5: DemandForecast ====================
    #[test]
    fn demand_forecast_valid_transitions() {
        assert!(demand_forecast_can_transition("draft", "calculated").is_ok());
        assert!(demand_forecast_can_transition("calculated", "validated").is_ok());
        assert!(demand_forecast_can_transition("validated", "adopted").is_ok());
        assert!(demand_forecast_can_transition("calculated", "draft").is_ok());
        assert!(demand_forecast_can_transition("adopted", "superseded").is_ok());
    }

    #[test]
    fn demand_forecast_cancel_transitions() {
        assert!(demand_forecast_can_transition("draft", "cancelled").is_ok());
        assert!(demand_forecast_can_transition("calculated", "cancelled").is_ok());
        assert!(demand_forecast_can_transition("validated", "cancelled").is_ok());
    }

    #[test]
    fn demand_forecast_invalid_transitions() {
        assert!(demand_forecast_can_transition("draft", "validated").is_err());
        assert!(demand_forecast_can_transition("calculated", "adopted").is_err());
        assert!(demand_forecast_can_transition("adopted", "validated").is_err());
        assert!(demand_forecast_can_transition("superseded", "draft").is_err());
        assert!(demand_forecast_can_transition("cancelled", "draft").is_err());
    }

    #[test]
    fn test_demand_forecast_requires_approval() {
        assert!(demand_forecast_requires_approval("validated", "adopted"));
        assert!(!demand_forecast_requires_approval("draft", "calculated"));
        assert!(!demand_forecast_requires_approval(
            "calculated",
            "validated"
        ));
    }

    #[test]
    fn demand_forecast_valid_status() {
        assert!(is_valid_demand_forecast_status("draft"));
        assert!(is_valid_demand_forecast_status("superseded"));
        assert!(is_valid_demand_forecast_status("adopted"));
        assert!(!is_valid_demand_forecast_status("approved"));
        assert!(!is_valid_demand_forecast_status(""));
    }
}

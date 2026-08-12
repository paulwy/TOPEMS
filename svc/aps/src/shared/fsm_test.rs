use super::fsm::*;

// ==================== FSM-1: ProductionPlan ====================

#[test]
fn test_production_plan_valid_transitions() {
    assert!(production_plan_can_transition("draft", "pending_approval").is_ok());
    assert!(production_plan_can_transition("pending_approval", "approved").is_ok());
    assert!(production_plan_can_transition("pending_approval", "draft").is_ok());
    assert!(production_plan_can_transition("approved", "in_progress").is_ok());
    assert!(production_plan_can_transition("in_progress", "completed").is_ok());
    assert!(production_plan_can_transition("draft", "cancelled").is_ok());
    assert!(production_plan_can_transition("pending_approval", "cancelled").is_ok());
    assert!(production_plan_can_transition("approved", "cancelled").is_ok());
    assert!(production_plan_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_production_plan_invalid_transitions() {
    assert!(matches!(
        production_plan_can_transition("draft", "approved"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        production_plan_can_transition("draft", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        production_plan_can_transition("approved", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_production_plan_terminal_state() {
    assert!(matches!(
        production_plan_can_transition("completed", "draft"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        production_plan_can_transition("cancelled", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_production_plan_unknown_status() {
    assert!(matches!(
        production_plan_can_transition("unknown", "draft"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        production_plan_can_transition("draft", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
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
fn test_production_plan_self_transition_rejected() {
    assert!(matches!(
        production_plan_can_transition("draft", "draft"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        production_plan_can_transition("approved", "approved"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-2: Schedule ====================

#[test]
fn test_schedule_valid_transitions() {
    assert!(schedule_can_transition("pending", "released").is_ok());
    assert!(schedule_can_transition("released", "running").is_ok());
    assert!(schedule_can_transition("running", "completed").is_ok());
    assert!(schedule_can_transition("pending", "cancelled").is_ok());
    assert!(schedule_can_transition("released", "cancelled").is_ok());
    assert!(schedule_can_transition("running", "cancelled").is_ok());
    assert!(schedule_can_transition("released", "pending").is_ok());
}

#[test]
fn test_schedule_invalid_transitions() {
    assert!(matches!(
        schedule_can_transition("pending", "running"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        schedule_can_transition("pending", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        schedule_can_transition("running", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_schedule_terminal_state() {
    assert!(matches!(
        schedule_can_transition("completed", "pending"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        schedule_can_transition("cancelled", "running"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_schedule_unknown_status() {
    assert!(matches!(
        schedule_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        schedule_can_transition("pending", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_schedule_requires_approval() {
    assert!(schedule_requires_approval("pending", "released"));
    assert!(!schedule_requires_approval("released", "running"));
    assert!(!schedule_requires_approval("running", "completed"));
}

#[test]
fn test_schedule_self_transition_rejected() {
    assert!(matches!(
        schedule_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        schedule_can_transition("released", "released"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-3: Capacity ====================

#[test]
fn test_capacity_valid_transitions() {
    assert!(capacity_can_transition("available", "allocated").is_ok());
    assert!(capacity_can_transition("allocated", "consumed").is_ok());
    assert!(capacity_can_transition("allocated", "released").is_ok());
    assert!(capacity_can_transition("available", "maintenance").is_ok());
    assert!(capacity_can_transition("maintenance", "available").is_ok());
    assert!(capacity_can_transition("released", "available").is_ok());
}

#[test]
fn test_capacity_invalid_transitions() {
    assert!(matches!(
        capacity_can_transition("available", "consumed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        capacity_can_transition("maintenance", "allocated"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        capacity_can_transition("released", "consumed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_capacity_terminal_state() {
    assert!(matches!(
        capacity_can_transition("consumed", "available"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        capacity_can_transition("consumed", "released"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_capacity_unknown_status() {
    assert!(matches!(
        capacity_can_transition("unknown", "available"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        capacity_can_transition("available", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_capacity_requires_approval() {
    assert!(capacity_requires_approval("available", "allocated"));
    assert!(!capacity_requires_approval("allocated", "consumed"));
    assert!(!capacity_requires_approval("available", "maintenance"));
}

#[test]
fn test_capacity_self_transition_rejected() {
    assert!(matches!(
        capacity_can_transition("available", "available"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        capacity_can_transition("allocated", "allocated"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-4: MaterialPlan ====================

#[test]
fn test_material_plan_valid_transitions() {
    assert!(material_plan_can_transition("pending", "requisitioned").is_ok());
    assert!(material_plan_can_transition("requisitioned", "sourced").is_ok());
    assert!(material_plan_can_transition("sourced", "satisfied").is_ok());
    assert!(material_plan_can_transition("pending", "shortage").is_ok());
    assert!(material_plan_can_transition("shortage", "requisitioned").is_ok());
    assert!(material_plan_can_transition("requisitioned", "cancelled").is_ok());
    assert!(material_plan_can_transition("pending", "cancelled").is_ok());
    assert!(material_plan_can_transition("sourced", "cancelled").is_ok());
}

#[test]
fn test_material_plan_invalid_transitions() {
    assert!(matches!(
        material_plan_can_transition("pending", "satisfied"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        material_plan_can_transition("pending", "sourced"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        material_plan_can_transition("shortage", "satisfied"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_material_plan_terminal_state() {
    assert!(matches!(
        material_plan_can_transition("satisfied", "pending"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        material_plan_can_transition("cancelled", "requisitioned"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_material_plan_unknown_status() {
    assert!(matches!(
        material_plan_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        material_plan_can_transition("pending", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_material_plan_requires_approval() {
    assert!(material_plan_requires_approval("pending", "requisitioned"));
    assert!(!material_plan_requires_approval("requisitioned", "sourced"));
    assert!(!material_plan_requires_approval("sourced", "satisfied"));
}

#[test]
fn test_material_plan_self_transition_rejected() {
    assert!(matches!(
        material_plan_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        material_plan_can_transition("sourced", "sourced"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-5: DemandForecast ====================

#[test]
fn test_demand_forecast_valid_transitions() {
    assert!(demand_forecast_can_transition("draft", "calculated").is_ok());
    assert!(demand_forecast_can_transition("calculated", "validated").is_ok());
    assert!(demand_forecast_can_transition("validated", "adopted").is_ok());
    assert!(demand_forecast_can_transition("calculated", "draft").is_ok());
    assert!(demand_forecast_can_transition("adopted", "superseded").is_ok());
    assert!(demand_forecast_can_transition("draft", "cancelled").is_ok());
    assert!(demand_forecast_can_transition("calculated", "cancelled").is_ok());
    assert!(demand_forecast_can_transition("validated", "cancelled").is_ok());
}

#[test]
fn test_demand_forecast_invalid_transitions() {
    assert!(matches!(
        demand_forecast_can_transition("draft", "adopted"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        demand_forecast_can_transition("draft", "validated"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        demand_forecast_can_transition("calculated", "adopted"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_demand_forecast_terminal_state() {
    assert!(matches!(
        demand_forecast_can_transition("superseded", "draft"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        demand_forecast_can_transition("cancelled", "validated"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_demand_forecast_unknown_status() {
    assert!(matches!(
        demand_forecast_can_transition("unknown", "draft"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        demand_forecast_can_transition("draft", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
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
fn test_demand_forecast_self_transition_rejected() {
    assert!(matches!(
        demand_forecast_can_transition("draft", "draft"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        demand_forecast_can_transition("validated", "validated"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

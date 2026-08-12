use super::fsm::*;

// ==================== FSM-1: Vehicle ====================

#[test]
fn test_vehicle_valid_transitions() {
    assert!(vehicle_can_transition("active", "maintenance").is_ok());
    assert!(vehicle_can_transition("maintenance", "active").is_ok());
    assert!(vehicle_can_transition("maintenance", "inactive").is_ok());
    assert!(vehicle_can_transition("inactive", "active").is_ok());
    assert!(vehicle_can_transition("inactive", "retired").is_ok());
    assert!(vehicle_can_transition("active", "retired").is_ok());
}

#[test]
fn test_vehicle_terminal_state() {
    assert!(matches!(
        vehicle_can_transition("retired", "active"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        vehicle_can_transition("retired", "maintenance"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_vehicle_invalid_transitions() {
    assert!(matches!(
        vehicle_can_transition("active", "inactive"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        vehicle_can_transition("maintenance", "retired"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_vehicle_unknown_status() {
    assert!(matches!(
        vehicle_can_transition("unknown", "active"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        vehicle_can_transition("active", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_vehicle_requires_approval() {
    assert!(vehicle_requires_approval("inactive", "retired"));
    assert!(!vehicle_requires_approval("active", "maintenance"));
    assert!(!vehicle_requires_approval("maintenance", "active"));
}

#[test]
fn test_vehicle_self_transition_rejected() {
    assert!(matches!(
        vehicle_can_transition("active", "active"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        vehicle_can_transition("maintenance", "maintenance"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-2: Driver ====================

#[test]
fn test_driver_valid_transitions() {
    assert!(driver_can_transition("active", "on_leave").is_ok());
    assert!(driver_can_transition("on_leave", "active").is_ok());
    assert!(driver_can_transition("active", "suspended").is_ok());
    assert!(driver_can_transition("suspended", "active").is_ok());
    assert!(driver_can_transition("suspended", "inactive").is_ok());
    assert!(driver_can_transition("on_leave", "inactive").is_ok());
}

#[test]
fn test_driver_terminal_state() {
    assert!(matches!(
        driver_can_transition("inactive", "active"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        driver_can_transition("inactive", "on_leave"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_driver_invalid_transitions() {
    assert!(matches!(
        driver_can_transition("active", "inactive"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        driver_can_transition("on_leave", "suspended"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_driver_unknown_status() {
    assert!(matches!(
        driver_can_transition("unknown", "active"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        driver_can_transition("active", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_driver_requires_approval() {
    assert!(driver_requires_approval("suspended", "inactive"));
    assert!(!driver_requires_approval("active", "on_leave"));
    assert!(!driver_requires_approval("suspended", "active"));
}

#[test]
fn test_driver_self_transition_rejected() {
    assert!(matches!(
        driver_can_transition("active", "active"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        driver_can_transition("suspended", "suspended"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-3: Carrier ====================

#[test]
fn test_carrier_valid_transitions() {
    assert!(carrier_can_transition("pending_review", "active").is_ok());
    assert!(carrier_can_transition("active", "suspended").is_ok());
    assert!(carrier_can_transition("suspended", "active").is_ok());
    assert!(carrier_can_transition("suspended", "blacklisted").is_ok());
    assert!(carrier_can_transition("pending_review", "rejected").is_ok());
}

#[test]
fn test_carrier_terminal_state() {
    assert!(matches!(
        carrier_can_transition("blacklisted", "active"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        carrier_can_transition("rejected", "pending_review"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_carrier_invalid_transitions() {
    assert!(matches!(
        carrier_can_transition("pending_review", "suspended"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        carrier_can_transition("active", "blacklisted"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_carrier_unknown_status() {
    assert!(matches!(
        carrier_can_transition("unknown", "active"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        carrier_can_transition("active", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_carrier_requires_approval() {
    assert!(carrier_requires_approval("pending_review", "active"));
    assert!(!carrier_requires_approval("active", "suspended"));
    assert!(!carrier_requires_approval("suspended", "active"));
}

#[test]
fn test_carrier_self_transition_rejected() {
    assert!(matches!(
        carrier_can_transition("active", "active"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        carrier_can_transition("suspended", "suspended"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-4: Route ====================

#[test]
fn test_route_valid_transitions() {
    assert!(route_can_transition("planning", "active").is_ok());
    assert!(route_can_transition("active", "closed").is_ok());
    assert!(route_can_transition("closed", "active").is_ok());
    assert!(route_can_transition("closed", "deprecated").is_ok());
    assert!(route_can_transition("planning", "cancelled").is_ok());
}

#[test]
fn test_route_terminal_state() {
    assert!(matches!(
        route_can_transition("deprecated", "active"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        route_can_transition("cancelled", "planning"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_route_invalid_transitions() {
    assert!(matches!(
        route_can_transition("planning", "closed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        route_can_transition("active", "deprecated"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_route_unknown_status() {
    assert!(matches!(
        route_can_transition("unknown", "planning"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        route_can_transition("planning", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_route_requires_approval() {
    assert!(route_requires_approval("planning", "active"));
    assert!(!route_requires_approval("active", "closed"));
    assert!(!route_requires_approval("closed", "active"));
}

#[test]
fn test_route_self_transition_rejected() {
    assert!(matches!(
        route_can_transition("planning", "planning"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        route_can_transition("active", "active"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-5: Shipment ====================

#[test]
fn test_shipment_valid_transitions() {
    assert!(shipment_can_transition("draft", "pending").is_ok());
    assert!(shipment_can_transition("pending", "in_transit").is_ok());
    assert!(shipment_can_transition("in_transit", "delivered").is_ok());
    assert!(shipment_can_transition("draft", "cancelled").is_ok());
    assert!(shipment_can_transition("pending", "cancelled").is_ok());
    assert!(shipment_can_transition("in_transit", "cancelled").is_ok());
}

#[test]
fn test_shipment_terminal_state() {
    assert!(matches!(
        shipment_can_transition("delivered", "pending"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        shipment_can_transition("cancelled", "in_transit"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_shipment_invalid_transitions() {
    assert!(matches!(
        shipment_can_transition("draft", "in_transit"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        shipment_can_transition("pending", "delivered"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_shipment_unknown_status() {
    assert!(matches!(
        shipment_can_transition("unknown", "draft"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        shipment_can_transition("draft", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_shipment_requires_approval() {
    assert!(shipment_requires_approval("pending", "in_transit"));
    assert!(!shipment_requires_approval("draft", "pending"));
    assert!(!shipment_requires_approval("in_transit", "delivered"));
}

#[test]
fn test_shipment_self_transition_rejected() {
    assert!(matches!(
        shipment_can_transition("draft", "draft"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        shipment_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

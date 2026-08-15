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

// ==================== is_valid_status tests ====================

#[test]
fn test_is_valid_vehicle_status() {
    assert!(is_valid_vehicle_status("active"));
    assert!(is_valid_vehicle_status("maintenance"));
    assert!(is_valid_vehicle_status("inactive"));
    assert!(is_valid_vehicle_status("retired"));
    assert!(!is_valid_vehicle_status("suspended"));
    assert!(!is_valid_vehicle_status(""));
    assert!(!is_valid_vehicle_status("ACTIVE"));
}

#[test]
fn test_is_valid_driver_status() {
    assert!(is_valid_driver_status("active"));
    assert!(is_valid_driver_status("on_leave"));
    assert!(is_valid_driver_status("suspended"));
    assert!(is_valid_driver_status("inactive"));
    assert!(!is_valid_driver_status("retired"));
    assert!(!is_valid_driver_status(""));
}

#[test]
fn test_is_valid_carrier_status() {
    assert!(is_valid_carrier_status("pending_review"));
    assert!(is_valid_carrier_status("active"));
    assert!(is_valid_carrier_status("suspended"));
    assert!(is_valid_carrier_status("blacklisted"));
    assert!(is_valid_carrier_status("rejected"));
    assert!(!is_valid_carrier_status("inactive"));
    assert!(!is_valid_carrier_status(""));
}

#[test]
fn test_is_valid_route_status() {
    assert!(is_valid_route_status("planning"));
    assert!(is_valid_route_status("active"));
    assert!(is_valid_route_status("closed"));
    assert!(is_valid_route_status("deprecated"));
    assert!(is_valid_route_status("cancelled"));
    assert!(!is_valid_route_status("in_transit"));
    assert!(!is_valid_route_status(""));
}

#[test]
fn test_is_valid_shipment_status() {
    assert!(is_valid_shipment_status("draft"));
    assert!(is_valid_shipment_status("pending"));
    assert!(is_valid_shipment_status("in_transit"));
    assert!(is_valid_shipment_status("delivered"));
    assert!(is_valid_shipment_status("cancelled"));
    assert!(!is_valid_shipment_status("completed"));
    assert!(!is_valid_shipment_status(""));
}

// ==================== FsmError tests ====================

#[test]
fn test_fsm_error_terminal_display() {
    let err = FsmError::TerminalState("retired".to_string());
    let msg = format!("{}", err);
    assert!(msg.contains("retired"));
    assert!(msg.contains("terminal"));
}

#[test]
fn test_fsm_error_invalid_transition_display() {
    let err = FsmError::InvalidTransition {
        from: "active".to_string(),
        to: "retired".to_string(),
    };
    let msg = format!("{}", err);
    assert!(msg.contains("active"));
    assert!(msg.contains("retired"));
    assert!(msg.contains("invalid"));
}

#[test]
fn test_fsm_error_unknown_status_display() {
    let err = FsmError::UnknownStatus("bogus_state".to_string());
    let msg = format!("{}", err);
    assert!(msg.contains("bogus_state"));
    assert!(msg.contains("unknown"));
}

#[test]
fn test_fsm_error_partial_eq() {
    let e1 = FsmError::TerminalState("x".into());
    let e2 = FsmError::TerminalState("x".into());
    let e3 = FsmError::TerminalState("y".into());
    assert_eq!(e1, e2);
    assert_ne!(e1, e3);
    assert_ne!(e1, FsmError::UnknownStatus("x".into()));
}

#[test]
fn test_fsm_error_debug_format() {
    let err = FsmError::InvalidTransition {
        from: "a".into(),
        to: "b".into(),
    };
    let debug = format!("{:?}", err);
    assert!(debug.contains("InvalidTransition"));
    assert!(debug.contains("a"));
    assert!(debug.contains("b"));
}

// ==================== Additional transition edge cases ====================

#[test]
fn test_vehicle_active_to_retired_direct() {
    assert!(vehicle_can_transition("active", "retired").is_ok());
}

#[test]
fn test_vehicle_inactive_to_active_reactivate() {
    assert!(vehicle_can_transition("inactive", "active").is_ok());
}

#[test]
fn test_driver_on_leave_to_inactive() {
    assert!(driver_can_transition("on_leave", "inactive").is_ok());
}

#[test]
fn test_driver_suspended_to_active_reinstate() {
    assert!(driver_can_transition("suspended", "active").is_ok());
}

#[test]
fn test_carrier_pending_review_to_rejected() {
    assert!(carrier_can_transition("pending_review", "rejected").is_ok());
}

#[test]
fn test_carrier_suspended_blacklisted() {
    assert!(carrier_can_transition("suspended", "blacklisted").is_ok());
}

#[test]
fn test_route_closed_to_active_reopen() {
    assert!(route_can_transition("closed", "active").is_ok());
}

#[test]
fn test_route_closed_to_deprecated() {
    assert!(route_can_transition("closed", "deprecated").is_ok());
}

// ==================== Additional terminal & edge case tests ====================

#[test]
fn test_vehicle_retired_terminal_all_targets() {
    for target in &["active", "maintenance", "inactive", "retired"] {
        assert!(
            matches!(
                vehicle_can_transition("retired", target),
                Err(FsmError::TerminalState(_))
            ),
            "retired -> {} should be terminal",
            target
        );
    }
}

#[test]
fn test_driver_inactive_terminal_all_targets() {
    for target in &["active", "on_leave", "suspended", "inactive"] {
        assert!(matches!(
            driver_can_transition("inactive", target),
            Err(FsmError::TerminalState(_))
        ));
    }
}

#[test]
fn test_carrier_blacklisted_terminal_all_targets() {
    for target in &[
        "pending_review",
        "active",
        "suspended",
        "blacklisted",
        "rejected",
    ] {
        assert!(matches!(
            carrier_can_transition("blacklisted", target),
            Err(FsmError::TerminalState(_))
        ));
    }
}

#[test]
fn test_carrier_rejected_terminal_all_targets() {
    for target in &[
        "pending_review",
        "active",
        "suspended",
        "blacklisted",
        "rejected",
    ] {
        assert!(matches!(
            carrier_can_transition("rejected", target),
            Err(FsmError::TerminalState(_))
        ));
    }
}

#[test]
fn test_route_deprecated_terminal_all_targets() {
    for target in &["planning", "active", "closed", "deprecated", "cancelled"] {
        assert!(matches!(
            route_can_transition("deprecated", target),
            Err(FsmError::TerminalState(_))
        ));
    }
}

#[test]
fn test_route_cancelled_terminal_all_targets() {
    for target in &["planning", "active", "closed", "deprecated", "cancelled"] {
        assert!(matches!(
            route_can_transition("cancelled", target),
            Err(FsmError::TerminalState(_))
        ));
    }
}

#[test]
fn test_shipment_delivered_terminal_all_targets() {
    for target in &["draft", "pending", "in_transit", "delivered", "cancelled"] {
        assert!(matches!(
            shipment_can_transition("delivered", target),
            Err(FsmError::TerminalState(_))
        ));
    }
}

#[test]
fn test_shipment_cancelled_terminal_all_targets() {
    for target in &["draft", "pending", "in_transit", "delivered", "cancelled"] {
        assert!(matches!(
            shipment_can_transition("cancelled", target),
            Err(FsmError::TerminalState(_))
        ));
    }
}

#[test]
fn test_vehicle_approval_false_for_random_pairs() {
    assert!(!vehicle_requires_approval("active", "maintenance"));
    assert!(!vehicle_requires_approval("maintenance", "active"));
    assert!(!vehicle_requires_approval("maintenance", "inactive"));
    assert!(!vehicle_requires_approval("active", "retired"));
}

#[test]
fn test_driver_approval_false_for_random_pairs() {
    assert!(!driver_requires_approval("active", "on_leave"));
    assert!(!driver_requires_approval("on_leave", "active"));
    assert!(!driver_requires_approval("active", "suspended"));
    assert!(!driver_requires_approval("on_leave", "inactive"));
}

#[test]
fn test_carrier_approval_false_for_random_pairs() {
    assert!(!carrier_requires_approval("active", "suspended"));
    assert!(!carrier_requires_approval("suspended", "active"));
    assert!(!carrier_requires_approval("suspended", "blacklisted"));
    assert!(!carrier_requires_approval("pending_review", "rejected"));
}

#[test]
fn test_route_approval_false_for_random_pairs() {
    assert!(!route_requires_approval("active", "closed"));
    assert!(!route_requires_approval("closed", "active"));
    assert!(!route_requires_approval("closed", "deprecated"));
    assert!(!route_requires_approval("planning", "cancelled"));
}

#[test]
fn test_shipment_approval_false_for_random_pairs() {
    assert!(!shipment_requires_approval("draft", "pending"));
    assert!(!shipment_requires_approval("in_transit", "delivered"));
    assert!(!shipment_requires_approval("draft", "cancelled"));
    assert!(!shipment_requires_approval("pending", "cancelled"));
}

#[test]
fn test_fsm_error_clone_and_eq_variants() {
    let e1 = FsmError::InvalidTransition {
        from: "x".into(),
        to: "y".into(),
    };
    let e2 = e1.clone();
    assert_eq!(e1, e2);
    let e3 = FsmError::UnknownStatus("test".into());
    assert_ne!(e1, e3);
    assert_ne!(e2, FsmError::TerminalState("x".into()));
}

#[test]
fn test_all_status_validators_mutual_exclusivity() {
    // Vehicle states are not valid driver/carrier/route/shipment states
    assert!(!is_valid_driver_status("retired"));
    assert!(!is_valid_carrier_status("retired"));
    assert!(!is_valid_route_status("retired"));
    assert!(!is_valid_shipment_status("retired"));
    // Shipment states are not valid vehicle/driver/carrier/route states
    assert!(!is_valid_vehicle_status("delivered"));
    assert!(!is_valid_driver_status("delivered"));
    assert!(!is_valid_carrier_status("delivered"));
    assert!(!is_valid_route_status("delivered"));
}

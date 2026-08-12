//! TMS 5 状态机定义
//!
//! FSM-1 Vehicle:   active → maintenance → inactive → retired
//! FSM-2 Driver:    active → on_leave → suspended → inactive
//! FSM-3 Carrier:   pending_review → active → suspended → blacklisted/rejected
//! FSM-4 Route:     planning → active → closed → deprecated/cancelled
//! FSM-5 Shipment:  draft → pending → in_transit → delivered/cancelled

#[derive(Debug, thiserror::Error, PartialEq)]
pub enum FsmError {
    #[error("state '{0}' is terminal and cannot transition")]
    TerminalState(String),
    #[error("invalid transition: {from} -> {to}")]
    InvalidTransition { from: String, to: String },
    #[error("unknown status: {0}")]
    UnknownStatus(String),
}

fn validate_status(status: &str, allowed: &[&str]) -> Result<(), FsmError> {
    if allowed.contains(&status) {
        Ok(())
    } else {
        Err(FsmError::UnknownStatus(status.to_string()))
    }
}

fn check_pair(
    from: &str,
    to: &str,
    allowed_pairs: &[(&str, &str)],
    terminal: &[&str],
    all_states: &[&str],
) -> Result<(), FsmError> {
    validate_status(from, all_states)?;
    validate_status(to, all_states)?;
    if terminal.contains(&from) {
        return Err(FsmError::TerminalState(from.to_string()));
    }
    if allowed_pairs.contains(&(from, to)) {
        Ok(())
    } else {
        Err(FsmError::InvalidTransition {
            from: from.to_string(),
            to: to.to_string(),
        })
    }
}

// ==================== FSM-1: Vehicle ====================
const VEHICLE_STATES: &[&str] = &["active", "maintenance", "inactive", "retired"];
const VEHICLE_TERMINAL: &[&str] = &["retired"];
const VEHICLE_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("inactive", "retired")];

pub fn vehicle_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("active", "maintenance"),
        ("maintenance", "active"),
        ("maintenance", "inactive"),
        ("inactive", "active"),
        ("inactive", "retired"),
        ("active", "retired"),
    ];
    check_pair(from, to, allowed_pairs, VEHICLE_TERMINAL, VEHICLE_STATES)
}

pub fn vehicle_requires_approval(from: &str, to: &str) -> bool {
    VEHICLE_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_vehicle_status(s: &str) -> bool {
    VEHICLE_STATES.contains(&s)
}

// ==================== FSM-2: Driver ====================
const DRIVER_STATES: &[&str] = &["active", "on_leave", "suspended", "inactive"];
const DRIVER_TERMINAL: &[&str] = &["inactive"];
const DRIVER_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("suspended", "inactive")];

pub fn driver_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("active", "on_leave"),
        ("on_leave", "active"),
        ("active", "suspended"),
        ("suspended", "active"),
        ("suspended", "inactive"),
        ("on_leave", "inactive"),
    ];
    check_pair(from, to, allowed_pairs, DRIVER_TERMINAL, DRIVER_STATES)
}

pub fn driver_requires_approval(from: &str, to: &str) -> bool {
    DRIVER_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_driver_status(s: &str) -> bool {
    DRIVER_STATES.contains(&s)
}

// ==================== FSM-3: Carrier ====================
const CARRIER_STATES: &[&str] = &[
    "pending_review",
    "active",
    "suspended",
    "blacklisted",
    "rejected",
];
const CARRIER_TERMINAL: &[&str] = &["blacklisted", "rejected"];
const CARRIER_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("pending_review", "active")];

pub fn carrier_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending_review", "active"),
        ("active", "suspended"),
        ("suspended", "active"),
        ("suspended", "blacklisted"),
        ("pending_review", "rejected"),
    ];
    check_pair(from, to, allowed_pairs, CARRIER_TERMINAL, CARRIER_STATES)
}

pub fn carrier_requires_approval(from: &str, to: &str) -> bool {
    CARRIER_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_carrier_status(s: &str) -> bool {
    CARRIER_STATES.contains(&s)
}

// ==================== FSM-4: Route ====================
const ROUTE_STATES: &[&str] = &["planning", "active", "closed", "deprecated", "cancelled"];
const ROUTE_TERMINAL: &[&str] = &["deprecated", "cancelled"];
const ROUTE_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("planning", "active")];

pub fn route_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("planning", "active"),
        ("active", "closed"),
        ("closed", "active"),
        ("closed", "deprecated"),
        ("planning", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, ROUTE_TERMINAL, ROUTE_STATES)
}

pub fn route_requires_approval(from: &str, to: &str) -> bool {
    ROUTE_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_route_status(s: &str) -> bool {
    ROUTE_STATES.contains(&s)
}

// ==================== FSM-5: Shipment ====================
const SHIPMENT_STATES: &[&str] = &["draft", "pending", "in_transit", "delivered", "cancelled"];
const SHIPMENT_TERMINAL: &[&str] = &["delivered", "cancelled"];
const SHIPMENT_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("pending", "in_transit")];

pub fn shipment_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "pending"),
        ("pending", "in_transit"),
        ("in_transit", "delivered"),
        ("draft", "cancelled"),
        ("pending", "cancelled"),
        ("in_transit", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, SHIPMENT_TERMINAL, SHIPMENT_STATES)
}

pub fn shipment_requires_approval(from: &str, to: &str) -> bool {
    SHIPMENT_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_shipment_status(s: &str) -> bool {
    SHIPMENT_STATES.contains(&s)
}

//! TMS 5 状态机定义
//!
//! FSM-1 Vehicle:   active → maintenance → inactive → retired
//! FSM-2 Driver:    active → on_leave → suspended → inactive
//! FSM-3 Carrier:   pending_review → active → suspended → blacklisted/rejected
//! FSM-4 Route:     planning → active → closed → deprecated/cancelled
//! FSM-5 Shipment:  draft → pending → in_transit → delivered/cancelled
//!
//! 使用 `FsmDef` 声明式定义，消除重复的 `check_pair` 调用模板。
//! `FsmError` / `validate_status` / `check_pair` 已提取至 `topems_shared_core::fsm`。

// 重导出公共 FSM 基础类型，保持 `use crate::shared::fsm::{...}` 调用方无需改动
pub use topems_shared_core::fsm::{FsmDef, FsmError};

// ==================== FSM-1: Vehicle ====================
pub const VEHICLE: FsmDef = FsmDef {
    states: &["active", "maintenance", "inactive", "retired"],
    terminal: &["retired"],
    transitions: &[
        ("active", "maintenance"),
        ("maintenance", "active"),
        ("maintenance", "inactive"),
        ("inactive", "active"),
        ("inactive", "retired"),
        ("active", "retired"),
    ],
    approval_transitions: &[("inactive", "retired")],
};

pub fn vehicle_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    VEHICLE.can_transition(from, to)
}

pub fn vehicle_requires_approval(from: &str, to: &str) -> bool {
    VEHICLE.requires_approval(from, to)
}

pub fn is_valid_vehicle_status(s: &str) -> bool {
    VEHICLE.is_valid_status(s)
}

// ==================== FSM-2: Driver ====================
pub const DRIVER: FsmDef = FsmDef {
    states: &["active", "on_leave", "suspended", "inactive"],
    terminal: &["inactive"],
    transitions: &[
        ("active", "on_leave"),
        ("on_leave", "active"),
        ("active", "suspended"),
        ("suspended", "active"),
        ("suspended", "inactive"),
        ("on_leave", "inactive"),
    ],
    approval_transitions: &[("suspended", "inactive")],
};

pub fn driver_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    DRIVER.can_transition(from, to)
}

pub fn driver_requires_approval(from: &str, to: &str) -> bool {
    DRIVER.requires_approval(from, to)
}

pub fn is_valid_driver_status(s: &str) -> bool {
    DRIVER.is_valid_status(s)
}

// ==================== FSM-3: Carrier ====================
pub const CARRIER: FsmDef = FsmDef {
    states: &[
        "pending_review",
        "active",
        "suspended",
        "blacklisted",
        "rejected",
    ],
    terminal: &["blacklisted", "rejected"],
    transitions: &[
        ("pending_review", "active"),
        ("active", "suspended"),
        ("suspended", "active"),
        ("suspended", "blacklisted"),
        ("pending_review", "rejected"),
    ],
    approval_transitions: &[("pending_review", "active")],
};

pub fn carrier_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    CARRIER.can_transition(from, to)
}

pub fn carrier_requires_approval(from: &str, to: &str) -> bool {
    CARRIER.requires_approval(from, to)
}

pub fn is_valid_carrier_status(s: &str) -> bool {
    CARRIER.is_valid_status(s)
}

// ==================== FSM-4: Route ====================
pub const ROUTE: FsmDef = FsmDef {
    states: &["planning", "active", "closed", "deprecated", "cancelled"],
    terminal: &["deprecated", "cancelled"],
    transitions: &[
        ("planning", "active"),
        ("active", "closed"),
        ("closed", "active"),
        ("closed", "deprecated"),
        ("planning", "cancelled"),
    ],
    approval_transitions: &[("planning", "active")],
};

pub fn route_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    ROUTE.can_transition(from, to)
}

pub fn route_requires_approval(from: &str, to: &str) -> bool {
    ROUTE.requires_approval(from, to)
}

pub fn is_valid_route_status(s: &str) -> bool {
    ROUTE.is_valid_status(s)
}

// ==================== FSM-5: Shipment ====================
pub const SHIPMENT: FsmDef = FsmDef {
    states: &["draft", "pending", "in_transit", "delivered", "cancelled"],
    terminal: &["delivered", "cancelled"],
    transitions: &[
        ("draft", "pending"),
        ("pending", "in_transit"),
        ("in_transit", "delivered"),
        ("draft", "cancelled"),
        ("pending", "cancelled"),
        ("in_transit", "cancelled"),
    ],
    approval_transitions: &[("pending", "in_transit")],
};

pub fn shipment_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    SHIPMENT.can_transition(from, to)
}

pub fn shipment_requires_approval(from: &str, to: &str) -> bool {
    SHIPMENT.requires_approval(from, to)
}

pub fn is_valid_shipment_status(s: &str) -> bool {
    SHIPMENT.is_valid_status(s)
}

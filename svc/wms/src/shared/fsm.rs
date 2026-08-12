//! WMS 7 状态机定义
//!
//! FSM-1 InboundOrder:     created↔confirmed↔received→completed, created|confirmed→cancelled, received→confirmed(reject回流)
//! FSM-2 OutboundOrder:    created→confirmed→picking→packing→shipping→completed, packing→picking(reject回流), created|confirmed|picking|packing→cancelled
//! FSM-3 StockTake:        planned→in_progress→completed, planned|in_progress→cancelled
//! FSM-4 TransferOrder:    pending↔confirmed→shipped→received→completed, confirmed→pending(reject回流), pending|confirmed|shipped|received→cancelled
//! FSM-5 WavePick:         created→assigned→picking→completed, created|assigned|picking→cancelled
//! FSM-6 InventoryMovement:draft→posted→completed, draft|posted→cancelled
//! FSM-7 SerialNumber:     pending→assigned→used→archived

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

// ==================== FSM-1: InboundOrder ====================
const INBOUND_ORDER_STATES: &[&str] =
    &["created", "confirmed", "received", "completed", "cancelled"];
const INBOUND_ORDER_TERMINAL: &[&str] = &["completed", "cancelled"];
const INBOUND_ORDER_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("received", "completed")];

pub fn inbound_order_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("created", "confirmed"),
        ("confirmed", "created"),
        ("confirmed", "received"),
        ("received", "confirmed"),
        ("received", "completed"),
        ("created", "cancelled"),
        ("confirmed", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        INBOUND_ORDER_TERMINAL,
        INBOUND_ORDER_STATES,
    )
}

pub fn inbound_order_requires_approval(from: &str, to: &str) -> bool {
    INBOUND_ORDER_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_inbound_order_status(s: &str) -> bool {
    INBOUND_ORDER_STATES.contains(&s)
}

// ==================== FSM-2: OutboundOrder ====================
const OUTBOUND_ORDER_STATES: &[&str] = &[
    "created",
    "confirmed",
    "picking",
    "packing",
    "shipping",
    "completed",
    "cancelled",
];
const OUTBOUND_ORDER_TERMINAL: &[&str] = &["completed", "cancelled"];
const OUTBOUND_ORDER_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("packing", "shipping")];

pub fn outbound_order_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("created", "confirmed"),
        ("confirmed", "picking"),
        ("picking", "packing"),
        ("packing", "picking"),
        ("packing", "shipping"),
        ("shipping", "completed"),
        ("created", "cancelled"),
        ("confirmed", "cancelled"),
        ("picking", "cancelled"),
        ("packing", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        OUTBOUND_ORDER_TERMINAL,
        OUTBOUND_ORDER_STATES,
    )
}

pub fn outbound_order_requires_approval(from: &str, to: &str) -> bool {
    OUTBOUND_ORDER_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_outbound_order_status(s: &str) -> bool {
    OUTBOUND_ORDER_STATES.contains(&s)
}

// ==================== FSM-3: StockTake ====================
const STOCK_TAKE_STATES: &[&str] = &["planned", "in_progress", "completed", "cancelled"];
const STOCK_TAKE_TERMINAL: &[&str] = &["completed", "cancelled"];
const STOCK_TAKE_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("in_progress", "completed")];

pub fn stock_take_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("planned", "in_progress"),
        ("in_progress", "completed"),
        ("planned", "cancelled"),
        ("in_progress", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        STOCK_TAKE_TERMINAL,
        STOCK_TAKE_STATES,
    )
}

pub fn stock_take_requires_approval(from: &str, to: &str) -> bool {
    STOCK_TAKE_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_stock_take_status(s: &str) -> bool {
    STOCK_TAKE_STATES.contains(&s)
}

// ==================== FSM-4: TransferOrder ====================
const TRANSFER_ORDER_STATES: &[&str] = &[
    "pending",
    "confirmed",
    "shipped",
    "received",
    "completed",
    "cancelled",
];
const TRANSFER_ORDER_TERMINAL: &[&str] = &["completed", "cancelled"];
const TRANSFER_ORDER_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("confirmed", "shipped")];

pub fn transfer_order_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "confirmed"),
        ("confirmed", "pending"),
        ("confirmed", "shipped"),
        ("shipped", "received"),
        ("received", "completed"),
        ("pending", "cancelled"),
        ("confirmed", "cancelled"),
        ("shipped", "cancelled"),
        ("received", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        TRANSFER_ORDER_TERMINAL,
        TRANSFER_ORDER_STATES,
    )
}

pub fn transfer_order_requires_approval(from: &str, to: &str) -> bool {
    TRANSFER_ORDER_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_transfer_order_status(s: &str) -> bool {
    TRANSFER_ORDER_STATES.contains(&s)
}

// ==================== FSM-5: WavePick ====================
const WAVE_PICK_STATES: &[&str] = &["created", "assigned", "picking", "completed", "cancelled"];
const WAVE_PICK_TERMINAL: &[&str] = &["completed", "cancelled"];
const WAVE_PICK_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[];

pub fn wave_pick_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("created", "assigned"),
        ("assigned", "picking"),
        ("picking", "completed"),
        ("created", "cancelled"),
        ("assigned", "cancelled"),
        ("picking", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        WAVE_PICK_TERMINAL,
        WAVE_PICK_STATES,
    )
}

pub fn wave_pick_requires_approval(from: &str, to: &str) -> bool {
    WAVE_PICK_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_wave_pick_status(s: &str) -> bool {
    WAVE_PICK_STATES.contains(&s)
}

// ==================== FSM-6: InventoryMovement ====================
const INVENTORY_MOVEMENT_STATES: &[&str] = &["draft", "posted", "completed", "cancelled"];
const INVENTORY_MOVEMENT_TERMINAL: &[&str] = &["completed", "cancelled"];
const INVENTORY_MOVEMENT_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("posted", "completed")];

pub fn inventory_movement_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "posted"),
        ("posted", "completed"),
        ("draft", "cancelled"),
        ("posted", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        INVENTORY_MOVEMENT_TERMINAL,
        INVENTORY_MOVEMENT_STATES,
    )
}

pub fn inventory_movement_requires_approval(from: &str, to: &str) -> bool {
    INVENTORY_MOVEMENT_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_inventory_movement_status(s: &str) -> bool {
    INVENTORY_MOVEMENT_STATES.contains(&s)
}

// ==================== FSM-7: SerialNumber ====================
const SERIAL_NUMBER_STATES: &[&str] = &["pending", "assigned", "used", "archived"];
const SERIAL_NUMBER_TERMINAL: &[&str] = &["archived"];
const SERIAL_NUMBER_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[];

pub fn serial_number_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "assigned"),
        ("assigned", "used"),
        ("used", "archived"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        SERIAL_NUMBER_TERMINAL,
        SERIAL_NUMBER_STATES,
    )
}

pub fn serial_number_requires_approval(from: &str, to: &str) -> bool {
    SERIAL_NUMBER_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_serial_number_status(s: &str) -> bool {
    SERIAL_NUMBER_STATES.contains(&s)
}

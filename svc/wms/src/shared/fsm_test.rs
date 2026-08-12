use super::fsm::*;

// ==================== FSM-1: InboundOrder ====================

#[test]
fn test_inbound_order_valid_transitions() {
    assert!(inbound_order_can_transition("created", "confirmed").is_ok());
    assert!(inbound_order_can_transition("confirmed", "created").is_ok());
    assert!(inbound_order_can_transition("confirmed", "received").is_ok());
    assert!(inbound_order_can_transition("received", "confirmed").is_ok());
    assert!(inbound_order_can_transition("received", "completed").is_ok());
    assert!(inbound_order_can_transition("created", "cancelled").is_ok());
    assert!(inbound_order_can_transition("confirmed", "cancelled").is_ok());
}

#[test]
fn test_inbound_order_invalid_transitions() {
    assert!(matches!(
        inbound_order_can_transition("created", "received"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inbound_order_can_transition("created", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inbound_order_can_transition("confirmed", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_inbound_order_terminal_state() {
    assert!(matches!(
        inbound_order_can_transition("completed", "received"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        inbound_order_can_transition("cancelled", "created"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_inbound_order_unknown_status() {
    assert!(matches!(
        inbound_order_can_transition("unknown", "created"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        inbound_order_can_transition("created", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_inbound_order_requires_approval() {
    assert!(inbound_order_requires_approval("received", "completed"));
    assert!(!inbound_order_requires_approval("created", "confirmed"));
    assert!(!inbound_order_requires_approval("confirmed", "received"));
    assert!(!inbound_order_requires_approval("received", "confirmed"));
}

#[test]
fn test_inbound_order_self_transition_rejected() {
    assert!(matches!(
        inbound_order_can_transition("created", "created"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inbound_order_can_transition("confirmed", "confirmed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-2: OutboundOrder ====================

#[test]
fn test_outbound_order_valid_transitions() {
    assert!(outbound_order_can_transition("created", "confirmed").is_ok());
    assert!(outbound_order_can_transition("confirmed", "picking").is_ok());
    assert!(outbound_order_can_transition("picking", "packing").is_ok());
    assert!(outbound_order_can_transition("packing", "picking").is_ok());
    assert!(outbound_order_can_transition("packing", "shipping").is_ok());
    assert!(outbound_order_can_transition("shipping", "completed").is_ok());
    assert!(outbound_order_can_transition("created", "cancelled").is_ok());
    assert!(outbound_order_can_transition("confirmed", "cancelled").is_ok());
    assert!(outbound_order_can_transition("picking", "cancelled").is_ok());
    assert!(outbound_order_can_transition("packing", "cancelled").is_ok());
}

#[test]
fn test_outbound_order_invalid_transitions() {
    assert!(matches!(
        outbound_order_can_transition("created", "picking"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        outbound_order_can_transition("confirmed", "packing"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        outbound_order_can_transition("picking", "shipping"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        outbound_order_can_transition("packing", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_outbound_order_terminal_state() {
    assert!(matches!(
        outbound_order_can_transition("completed", "shipping"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        outbound_order_can_transition("cancelled", "created"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_outbound_order_unknown_status() {
    assert!(matches!(
        outbound_order_can_transition("unknown", "created"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        outbound_order_can_transition("created", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_outbound_order_requires_approval() {
    assert!(outbound_order_requires_approval("packing", "shipping"));
    assert!(!outbound_order_requires_approval("created", "confirmed"));
    assert!(!outbound_order_requires_approval("picking", "packing"));
    assert!(!outbound_order_requires_approval("shipping", "completed"));
}

#[test]
fn test_outbound_order_self_transition_rejected() {
    assert!(matches!(
        outbound_order_can_transition("created", "created"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        outbound_order_can_transition("picking", "picking"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-3: StockTake ====================

#[test]
fn test_stock_take_valid_transitions() {
    assert!(stock_take_can_transition("planned", "in_progress").is_ok());
    assert!(stock_take_can_transition("in_progress", "completed").is_ok());
    assert!(stock_take_can_transition("planned", "cancelled").is_ok());
    assert!(stock_take_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_stock_take_invalid_transitions() {
    assert!(matches!(
        stock_take_can_transition("planned", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        stock_take_can_transition("in_progress", "planned"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        stock_take_can_transition("completed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_stock_take_terminal_state() {
    assert!(matches!(
        stock_take_can_transition("completed", "planned"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        stock_take_can_transition("cancelled", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_stock_take_unknown_status() {
    assert!(matches!(
        stock_take_can_transition("unknown", "planned"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        stock_take_can_transition("planned", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_stock_take_requires_approval() {
    assert!(stock_take_requires_approval("in_progress", "completed"));
    assert!(!stock_take_requires_approval("planned", "in_progress"));
    assert!(!stock_take_requires_approval("planned", "cancelled"));
}

#[test]
fn test_stock_take_self_transition_rejected() {
    assert!(matches!(
        stock_take_can_transition("planned", "planned"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        stock_take_can_transition("in_progress", "in_progress"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-4: TransferOrder ====================

#[test]
fn test_transfer_order_valid_transitions() {
    assert!(transfer_order_can_transition("pending", "confirmed").is_ok());
    assert!(transfer_order_can_transition("confirmed", "pending").is_ok());
    assert!(transfer_order_can_transition("confirmed", "shipped").is_ok());
    assert!(transfer_order_can_transition("shipped", "received").is_ok());
    assert!(transfer_order_can_transition("received", "completed").is_ok());
    assert!(transfer_order_can_transition("pending", "cancelled").is_ok());
    assert!(transfer_order_can_transition("confirmed", "cancelled").is_ok());
    assert!(transfer_order_can_transition("shipped", "cancelled").is_ok());
    assert!(transfer_order_can_transition("received", "cancelled").is_ok());
}

#[test]
fn test_transfer_order_invalid_transitions() {
    assert!(matches!(
        transfer_order_can_transition("pending", "shipped"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        transfer_order_can_transition("confirmed", "received"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        transfer_order_can_transition("shipped", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        transfer_order_can_transition("pending", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_transfer_order_terminal_state() {
    assert!(matches!(
        transfer_order_can_transition("completed", "received"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        transfer_order_can_transition("cancelled", "pending"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_transfer_order_unknown_status() {
    assert!(matches!(
        transfer_order_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        transfer_order_can_transition("pending", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_transfer_order_requires_approval() {
    assert!(transfer_order_requires_approval("confirmed", "shipped"));
    assert!(!transfer_order_requires_approval("pending", "confirmed"));
    assert!(!transfer_order_requires_approval("shipped", "received"));
    assert!(!transfer_order_requires_approval("received", "completed"));
}

#[test]
fn test_transfer_order_self_transition_rejected() {
    assert!(matches!(
        transfer_order_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        transfer_order_can_transition("confirmed", "confirmed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-5: WavePick ====================

#[test]
fn test_wave_pick_valid_transitions() {
    assert!(wave_pick_can_transition("created", "assigned").is_ok());
    assert!(wave_pick_can_transition("assigned", "picking").is_ok());
    assert!(wave_pick_can_transition("picking", "completed").is_ok());
    assert!(wave_pick_can_transition("created", "cancelled").is_ok());
    assert!(wave_pick_can_transition("assigned", "cancelled").is_ok());
    assert!(wave_pick_can_transition("picking", "cancelled").is_ok());
}

#[test]
fn test_wave_pick_invalid_transitions() {
    assert!(matches!(
        wave_pick_can_transition("created", "picking"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        wave_pick_can_transition("assigned", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        wave_pick_can_transition("created", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_wave_pick_terminal_state() {
    assert!(matches!(
        wave_pick_can_transition("completed", "picking"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        wave_pick_can_transition("cancelled", "created"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_wave_pick_unknown_status() {
    assert!(matches!(
        wave_pick_can_transition("unknown", "created"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        wave_pick_can_transition("created", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_wave_pick_requires_approval() {
    assert!(!wave_pick_requires_approval("created", "assigned"));
    assert!(!wave_pick_requires_approval("assigned", "picking"));
    assert!(!wave_pick_requires_approval("picking", "completed"));
}

#[test]
fn test_wave_pick_self_transition_rejected() {
    assert!(matches!(
        wave_pick_can_transition("created", "created"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        wave_pick_can_transition("assigned", "assigned"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-6: InventoryMovement ====================

#[test]
fn test_inventory_movement_valid_transitions() {
    assert!(inventory_movement_can_transition("draft", "posted").is_ok());
    assert!(inventory_movement_can_transition("posted", "completed").is_ok());
    assert!(inventory_movement_can_transition("draft", "cancelled").is_ok());
    assert!(inventory_movement_can_transition("posted", "cancelled").is_ok());
}

#[test]
fn test_inventory_movement_invalid_transitions() {
    assert!(matches!(
        inventory_movement_can_transition("draft", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inventory_movement_can_transition("posted", "draft"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inventory_movement_can_transition("completed", "posted"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_inventory_movement_terminal_state() {
    assert!(matches!(
        inventory_movement_can_transition("completed", "draft"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        inventory_movement_can_transition("cancelled", "posted"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_inventory_movement_unknown_status() {
    assert!(matches!(
        inventory_movement_can_transition("unknown", "draft"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        inventory_movement_can_transition("draft", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_inventory_movement_requires_approval() {
    assert!(inventory_movement_requires_approval("posted", "completed"));
    assert!(!inventory_movement_requires_approval("draft", "posted"));
    assert!(!inventory_movement_requires_approval("draft", "cancelled"));
}

#[test]
fn test_inventory_movement_self_transition_rejected() {
    assert!(matches!(
        inventory_movement_can_transition("draft", "draft"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inventory_movement_can_transition("posted", "posted"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// ==================== FSM-7: SerialNumber ====================

#[test]
fn test_serial_number_valid_transitions() {
    assert!(serial_number_can_transition("pending", "assigned").is_ok());
    assert!(serial_number_can_transition("assigned", "used").is_ok());
    assert!(serial_number_can_transition("used", "archived").is_ok());
}

#[test]
fn test_serial_number_invalid_transitions() {
    assert!(matches!(
        serial_number_can_transition("pending", "used"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        serial_number_can_transition("pending", "archived"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        serial_number_can_transition("assigned", "archived"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_serial_number_terminal_state() {
    assert!(matches!(
        serial_number_can_transition("archived", "used"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        serial_number_can_transition("archived", "pending"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_serial_number_unknown_status() {
    assert!(matches!(
        serial_number_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        serial_number_can_transition("pending", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_serial_number_requires_approval() {
    assert!(!serial_number_requires_approval("pending", "assigned"));
    assert!(!serial_number_requires_approval("assigned", "used"));
    assert!(!serial_number_requires_approval("used", "archived"));
}

#[test]
fn test_serial_number_self_transition_rejected() {
    assert!(matches!(
        serial_number_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        serial_number_can_transition("assigned", "assigned"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

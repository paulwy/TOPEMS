//! Task 5: Approval endpoints FSM validation tests
//!
//! 4 类审批 × 3 = 12 单测，测试 FSM 校验逻辑（不需要 DB）。
//! 覆盖 Inbound / Outbound / StockTake / Transfer 的审批与驳回流转。

use topems_wms::shared::fsm::*;

// ==================== APV-1: InboundOrder ====================

#[test]
fn test_inbound_approval_flow() {
    // received → completed requires approval
    assert!(inbound_order_requires_approval("received", "completed"));
    assert!(inbound_order_can_transition("received", "completed").is_ok());
}

#[test]
fn test_inbound_reject_flow() {
    // reject: received → confirmed (回流), does NOT require approval
    assert!(!inbound_order_requires_approval("received", "confirmed"));
    assert!(inbound_order_can_transition("received", "confirmed").is_ok());
}

#[test]
fn test_inbound_cancel_no_approval() {
    // created/confirmed → cancelled does NOT require approval
    assert!(!inbound_order_requires_approval("created", "cancelled"));
    assert!(!inbound_order_requires_approval("confirmed", "cancelled"));
    assert!(inbound_order_can_transition("created", "cancelled").is_ok());
    assert!(inbound_order_can_transition("confirmed", "cancelled").is_ok());
}

// ==================== APV-2: OutboundOrder ====================

#[test]
fn test_outbound_approval_flow() {
    // packing → shipping requires approval
    assert!(outbound_order_requires_approval("packing", "shipping"));
    assert!(outbound_order_can_transition("packing", "shipping").is_ok());
}

#[test]
fn test_outbound_reject_flow() {
    // reject: packing → picking (回流), does NOT require approval
    assert!(!outbound_order_requires_approval("packing", "picking"));
    assert!(outbound_order_can_transition("packing", "picking").is_ok());
}

#[test]
fn test_outbound_cancel_no_approval() {
    // created/confirmed/picking/packing → cancelled does NOT require approval
    assert!(!outbound_order_requires_approval("created", "cancelled"));
    assert!(!outbound_order_requires_approval("picking", "cancelled"));
    assert!(outbound_order_can_transition("created", "cancelled").is_ok());
    assert!(outbound_order_can_transition("picking", "cancelled").is_ok());
    assert!(outbound_order_can_transition("packing", "cancelled").is_ok());
}

// ==================== APV-3: StockTake ====================

#[test]
fn test_stock_take_approval_flow() {
    // in_progress → completed requires approval (差异>阈值)
    assert!(stock_take_requires_approval("in_progress", "completed"));
    assert!(stock_take_can_transition("in_progress", "completed").is_ok());
}

#[test]
fn test_stock_take_rework_no_state_change() {
    // reject (rework): in_progress 不改态，只是记录；FSM 必须允许 in_progress 仍存活（非终止）
    // 合法的状态必须是已知态且非终止
    assert!(is_valid_stock_take_status("in_progress"));
    assert!(!stock_take_can_transition("completed", "in_progress").is_ok());
    // in_progress → cancelled 不需要审批
    assert!(!stock_take_requires_approval("in_progress", "cancelled"));
    assert!(stock_take_can_transition("in_progress", "cancelled").is_ok());
}

#[test]
fn test_stock_take_cancel_no_approval() {
    // planned → cancelled does NOT require approval
    assert!(!stock_take_requires_approval("planned", "cancelled"));
    assert!(stock_take_can_transition("planned", "cancelled").is_ok());
    // planned → in_progress no approval
    assert!(!stock_take_requires_approval("planned", "in_progress"));
    assert!(stock_take_can_transition("planned", "in_progress").is_ok());
}

// ==================== APV-4: TransferOrder ====================

#[test]
fn test_transfer_approval_flow() {
    // confirmed → shipped requires approval
    assert!(transfer_order_requires_approval("confirmed", "shipped"));
    assert!(transfer_order_can_transition("confirmed", "shipped").is_ok());
}

#[test]
fn test_transfer_reject_flow() {
    // reject: confirmed → pending (回流), does NOT require approval
    assert!(!transfer_order_requires_approval("confirmed", "pending"));
    assert!(transfer_order_can_transition("confirmed", "pending").is_ok());
}

#[test]
fn test_transfer_cancel_no_approval() {
    // pending/confirmed/shipped/received → cancelled does NOT require approval
    assert!(!transfer_order_requires_approval("pending", "cancelled"));
    assert!(!transfer_order_requires_approval("confirmed", "cancelled"));
    assert!(!transfer_order_requires_approval("shipped", "cancelled"));
    assert!(transfer_order_can_transition("pending", "cancelled").is_ok());
    assert!(transfer_order_can_transition("confirmed", "cancelled").is_ok());
    assert!(transfer_order_can_transition("shipped", "cancelled").is_ok());
    assert!(transfer_order_can_transition("received", "cancelled").is_ok());
    // shipped → received no approval
    assert!(!transfer_order_requires_approval("shipped", "received"));
    assert!(transfer_order_can_transition("shipped", "received").is_ok());
}

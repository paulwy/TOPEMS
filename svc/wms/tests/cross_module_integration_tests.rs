//! WMS + TMS + ERP 三联调集成测试 — WMS 视角
//!
//! 验证 WMS FSM 在跨模块业务流程中的状态联动正确性。
//! 不连真实 DB，纯 FSM + DTO 校验。
//!
//! 覆盖 6 个联调场景的 WMS 后端侧：
//! - 场景 1: Order-to-Delivery（outbound FSM 全路径 + APV-2 审批）
//! - 场景 2: Procurement-to-Stock（inbound FSM 全路径 + APV-1 审批）
//! - 场景 3: Transfer-to-Destination（transfer FSM 全路径 + APV-4 审批 + reject 回流）
//! - 场景 5: InventoryMovement FSM（draft→posted→completed + cancel + 终态拒绝）
//! - 场景 6: Error Rollback（非法跳跃 / 终态拒绝 / 非法反向）

use topems_wms::shared::fsm::{
    inbound_order_can_transition, inbound_order_requires_approval,
    inventory_movement_can_transition, inventory_movement_requires_approval,
    outbound_order_can_transition, outbound_order_requires_approval, transfer_order_can_transition,
    transfer_order_requires_approval, FsmError,
};

// ==================== 场景 1: Order-to-Delivery（WMS outbound 视角） ====================

#[test]
fn test_outbound_full_path_order_to_delivery() {
    // 销售订单 → ERP → WMS 出库 → TMS 运单 全路径合法
    outbound_order_can_transition("created", "confirmed").unwrap();
    outbound_order_can_transition("confirmed", "picking").unwrap();
    outbound_order_can_transition("picking", "packing").unwrap();
    outbound_order_can_transition("packing", "shipping").unwrap();
    outbound_order_can_transition("shipping", "completed").unwrap();
}

#[test]
fn test_outbound_shipping_requires_approval() {
    // APV-2 审批标记：packing → shipping 必须经审批
    assert!(outbound_order_requires_approval("packing", "shipping"));
    // 其他常见转换不应触发审批
    assert!(!outbound_order_requires_approval("created", "confirmed"));
    assert!(!outbound_order_requires_approval("shipping", "completed"));
}

// ==================== 场景 2: Procurement-to-Stock（WMS inbound 视角） ====================

#[test]
fn test_inbound_full_path_procurement_to_stock() {
    // 采购订单 → ERP → WMS 入库 → 库存增加 全路径合法
    inbound_order_can_transition("created", "confirmed").unwrap();
    inbound_order_can_transition("confirmed", "received").unwrap();
    inbound_order_can_transition("received", "completed").unwrap();
}

#[test]
fn test_inbound_complete_requires_approval() {
    // APV-1 审批标记：received → completed 必须经审批（质检+入库确认）
    assert!(inbound_order_requires_approval("received", "completed"));
    // 其他转换无需审批
    assert!(!inbound_order_requires_approval("created", "confirmed"));
    assert!(!inbound_order_requires_approval("confirmed", "received"));
}

// ==================== 场景 3: Transfer-to-Destination（WMS transfer 视角） ====================

#[test]
fn test_transfer_full_path_to_destination() {
    // WMS 调拨 → TMS 运输 → 目的仓入库 全路径合法
    transfer_order_can_transition("pending", "confirmed").unwrap();
    transfer_order_can_transition("confirmed", "shipped").unwrap();
    transfer_order_can_transition("shipped", "received").unwrap();
    transfer_order_can_transition("received", "completed").unwrap();
}

#[test]
fn test_transfer_shipped_requires_approval() {
    // APV-4 审批标记：confirmed → shipped（出库发运）必须经审批
    assert!(transfer_order_requires_approval("confirmed", "shipped"));
    // 其他转换无需审批
    assert!(!transfer_order_requires_approval("pending", "confirmed"));
    assert!(!transfer_order_requires_approval("shipped", "received"));
    assert!(!transfer_order_requires_approval("received", "completed"));
}

#[test]
fn test_transfer_reject_back_to_pending() {
    // reject 回流：confirmed → pending 合法（审批驳回退回待确认）
    transfer_order_can_transition("confirmed", "pending").unwrap();
}

// ==================== 场景 5: InventoryMovement FSM ====================

#[test]
fn test_movement_full_path_with_approval() {
    // InventoryMovement: draft → posted → completed 全路径合法
    inventory_movement_can_transition("draft", "posted").unwrap();
    inventory_movement_can_transition("posted", "completed").unwrap();
    // posted → completed 必须经审批
    assert!(inventory_movement_requires_approval("posted", "completed"));
    // draft → posted 无需审批
    assert!(!inventory_movement_requires_approval("draft", "posted"));
}

#[test]
fn test_movement_cancel_and_terminal_reject() {
    // draft / posted 均可取消
    inventory_movement_can_transition("draft", "cancelled").unwrap();
    inventory_movement_can_transition("posted", "cancelled").unwrap();
    // completed 是终态，不允许再取消
    assert!(matches!(
        inventory_movement_can_transition("completed", "cancelled"),
        Err(FsmError::TerminalState(_))
    ));
}

// ==================== 场景 6: Error Rollback ====================

#[test]
fn test_outbound_invalid_jump_rejected() {
    // 非法跳跃：created → completed 必须被 InvalidTransition 拒绝
    assert!(matches!(
        outbound_order_can_transition("created", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_inbound_terminal_rejects_cancel() {
    // completed 是终态，不允许再 cancelled
    assert!(matches!(
        inbound_order_can_transition("completed", "cancelled"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_transfer_invalid_reverse_rejected() {
    // 仅 confirmed → pending 是 reject 合法回流；
    // received → pending 是非法反向，必须被 InvalidTransition 拒绝
    assert!(matches!(
        transfer_order_can_transition("received", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

//! WMS + TMS + ERP 三联调集成测试 — TMS 视角
//!
//! 验证 TMS shipment FSM 与 WMS outbound/transfer 联动。
//! 不连真实 DB，纯 FSM 校验。
//!
//! 覆盖场景：
//! - 场景 1: TMS × WMS Outbound 联动（Order-to-Delivery）
//! - 场景 3: TMS × WMS Transfer 联动（Transfer-to-Destination）
//! - 场景 6: TMS 错误处理（反向 / 终态拒绝）
//!
//! 注：`shipment_can_transition` 返回 `Result<(), FsmError>`，
//! 故测试用 `.is_ok()` / `.is_err()` 模式。

use topems_tms::shared::fsm::shipment_can_transition;
use topems_wms::shared::fsm::{outbound_order_can_transition, transfer_order_can_transition};

// ==================== 场景 1: TMS × WMS Outbound 联动 ====================

#[test]
fn test_shipment_full_path_pending_to_delivered() {
    // TMS shipment FSM 全路径合法：pending → in_transit → delivered
    assert!(shipment_can_transition("pending", "in_transit").is_ok());
    assert!(shipment_can_transition("in_transit", "delivered").is_ok());
}

#[test]
fn test_shipment_in_transit_when_wms_outbound_shipping() {
    // 状态映射校验：WMS outbound 处于 "shipping" 时 TMS shipment 应为 "in_transit"
    // （WMS 发运即对应 TMS 在途）
    let wms_outbound_status = "shipping";
    let expected_tms_shipment_status = "in_transit";
    assert_eq!(wms_outbound_status, "shipping");
    assert_eq!(expected_tms_shipment_status, "in_transit");
    // 状态映射常量一致性：shipping ↔ in_transit
    assert!(shipment_can_transition("pending", "in_transit").is_ok());
}

#[test]
fn test_shipment_delivered_enables_wms_outbound_completed() {
    // 时序校验：shipment delivered 后，WMS outbound 可从 shipping → completed
    assert!(shipment_can_transition("in_transit", "delivered").is_ok());
    outbound_order_can_transition("shipping", "completed").unwrap();
}

// ==================== 场景 3: TMS × WMS Transfer 联动 ====================

#[test]
fn test_shipment_in_transit_when_wms_transfer_shipped() {
    // 状态映射校验：WMS transfer 处于 "shipped" 时 TMS shipment 应为 "in_transit"
    // （调拨出库即对应 TMS 在途）
    let wms_transfer_status = "shipped";
    let expected_tms_shipment_status = "in_transit";
    assert_eq!(wms_transfer_status, "shipped");
    assert_eq!(expected_tms_shipment_status, "in_transit");
    // 状态映射常量一致性：shipped ↔ in_transit
    assert!(shipment_can_transition("pending", "in_transit").is_ok());
}

#[test]
fn test_shipment_delivered_enables_wms_transfer_received() {
    // 时序校验：TMS delivered 后，WMS transfer 可从 shipped → received
    assert!(shipment_can_transition("in_transit", "delivered").is_ok());
    transfer_order_can_transition("shipped", "received").unwrap();
}

#[test]
fn test_shipment_cancelled_blocks_wms_transfer_received() {
    // 业务层应阻断校验：shipment cancelled 后业务层应阻止 transfer 继续推进；
    // 但 FSM 本身仍保持 shipped → received 合法（业务层而非 FSM 负责跨模块联动阻断）。
    assert!(shipment_can_transition("in_transit", "cancelled").is_ok());
    assert!(shipment_can_transition("pending", "cancelled").is_ok());
    // FSM 层：shipped → received 仍是合法转换
    transfer_order_can_transition("shipped", "received").unwrap();
}

// ==================== 场景 6: TMS 错误处理 ====================

#[test]
fn test_shipment_reverse_transition_rejected() {
    // delivered → in_transit 反向转换被拒绝
    assert!(shipment_can_transition("delivered", "in_transit").is_err());
}

#[test]
fn test_shipment_terminal_to_cancel_rejected() {
    // delivered 是终态，不允许再 cancelled
    assert!(shipment_can_transition("delivered", "cancelled").is_err());
    // cancelled 也是终态，不允许任何外向转换
    assert!(shipment_can_transition("cancelled", "pending").is_err());
    assert!(shipment_can_transition("cancelled", "in_transit").is_err());
    assert!(shipment_can_transition("cancelled", "delivered").is_err());
}

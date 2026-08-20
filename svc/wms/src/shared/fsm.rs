//! WMS 7 状态机定义
//!
//! FSM-1 InboundOrder:     created↔confirmed↔received→completed, created|confirmed→cancelled, received→confirmed(reject回流)
//! FSM-2 OutboundOrder:    created→confirmed→picking→packing→shipping→completed, packing→picking(reject回流), created|confirmed|picking|packing→cancelled
//! FSM-3 StockTake:        planned→in_progress→completed, planned|in_progress→cancelled
//! FSM-4 TransferOrder:    pending↔confirmed→shipped→received→completed, confirmed→pending(reject回流), pending|confirmed|shipped|received→cancelled
//! FSM-5 WavePick:         created→assigned→picking→completed, created|assigned|picking→cancelled
//! FSM-6 InventoryMovement:draft→posted→completed, draft|posted→cancelled
//! FSM-7 SerialNumber:     pending→assigned→used→archived
//!
//! `FsmError` / `validate_status` / `check_pair` 已提取至 `topems_shared_core::fsm`。

// 重导出公共 FSM 基础类型，保持 `use crate::shared::fsm::{...}` 调用方无需改动
pub use topems_shared_core::fsm::{check_pair, FsmError};

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

#[cfg(test)]
mod tests {
    use super::*;

    // Generic helpers for the pattern: every FSM shares the same error semantics.
    fn assert_ok(r: Result<(), FsmError>) {
        assert!(r.is_ok(), "expected Ok, got {:?}", r);
    }

    fn assert_invalid_transition(r: Result<(), FsmError>, from: &str, to: &str) {
        match r {
            Err(FsmError::InvalidTransition { from: f, to: t }) => {
                assert_eq!(f, from);
                assert_eq!(t, to);
            }
            other => panic!(
                "expected InvalidTransition {}->{}, got {:?}",
                from, to, other
            ),
        }
    }

    fn assert_terminal(r: Result<(), FsmError>, state: &str) {
        match r {
            Err(FsmError::TerminalState(s)) => assert_eq!(s, state),
            other => panic!("expected TerminalState({}), got {:?}", state, other),
        }
    }

    fn assert_unknown(r: Result<(), FsmError>, bad: &str) {
        match r {
            Err(FsmError::UnknownStatus(s)) => assert_eq!(s, bad),
            other => panic!("expected UnknownStatus({}), got {:?}", bad, other),
        }
    }

    // =====================================================================
    // FSM-1: InboundOrder
    // =====================================================================
    mod inbound_order {
        use super::*;

        #[test]
        fn valid_forward_transitions() {
            assert_ok(inbound_order_can_transition("created", "confirmed"));
            assert_ok(inbound_order_can_transition("confirmed", "received"));
            assert_ok(inbound_order_can_transition("received", "completed"));
        }

        #[test]
        fn valid_bidirectional_and_reject() {
            assert_ok(inbound_order_can_transition("confirmed", "created"));
            assert_ok(inbound_order_can_transition("received", "confirmed")); // reject
        }

        #[test]
        fn cancellations() {
            assert_ok(inbound_order_can_transition("created", "cancelled"));
            assert_ok(inbound_order_can_transition("confirmed", "cancelled"));
        }

        #[test]
        fn terminal_states_block() {
            assert_terminal(
                inbound_order_can_transition("completed", "received"),
                "completed",
            );
            assert_terminal(
                inbound_order_can_transition("cancelled", "created"),
                "cancelled",
            );
        }

        #[test]
        fn invalid_skips() {
            assert_invalid_transition(
                inbound_order_can_transition("created", "received"),
                "created",
                "received",
            );
            assert_invalid_transition(
                inbound_order_can_transition("created", "completed"),
                "created",
                "completed",
            );
        }

        #[test]
        fn unknown_status() {
            assert_unknown(inbound_order_can_transition("bogus", "created"), "bogus");
            assert_unknown(
                inbound_order_can_transition("created", "unknown_state"),
                "unknown_state",
            );
        }

        #[test]
        fn requires_approval_and_valid_status() {
            // Only received -> completed requires approval
            assert!(inbound_order_requires_approval("received", "completed"));
            assert!(!inbound_order_requires_approval("confirmed", "received"));
            assert!(!inbound_order_requires_approval("created", "cancelled"));

            assert!(is_valid_inbound_order_status("received"));
            assert!(!is_valid_inbound_order_status("draft"));
        }
    }

    // =====================================================================
    // FSM-2: OutboundOrder
    // =====================================================================
    mod outbound_order {
        use super::*;

        #[test]
        fn valid_forward_path() {
            assert_ok(outbound_order_can_transition("created", "confirmed"));
            assert_ok(outbound_order_can_transition("confirmed", "picking"));
            assert_ok(outbound_order_can_transition("picking", "packing"));
            assert_ok(outbound_order_can_transition("packing", "shipping"));
            assert_ok(outbound_order_can_transition("shipping", "completed"));
        }

        #[test]
        fn valid_reject_and_cancellations() {
            assert_ok(outbound_order_can_transition("packing", "picking")); // reject
            assert_ok(outbound_order_can_transition("created", "cancelled"));
            assert_ok(outbound_order_can_transition("confirmed", "cancelled"));
            assert_ok(outbound_order_can_transition("picking", "cancelled"));
            assert_ok(outbound_order_can_transition("packing", "cancelled"));
        }

        #[test]
        fn cannot_cancel_after_packing() {
            // shipping is not a valid cancel source
            assert_invalid_transition(
                outbound_order_can_transition("shipping", "cancelled"),
                "shipping",
                "cancelled",
            );
        }

        #[test]
        fn terminal_blocked_and_invalid_skip() {
            assert_terminal(
                outbound_order_can_transition("completed", "shipping"),
                "completed",
            );
            assert_terminal(
                outbound_order_can_transition("cancelled", "created"),
                "cancelled",
            );
            // created cannot jump to picking
            assert_invalid_transition(
                outbound_order_can_transition("created", "picking"),
                "created",
                "picking",
            );
        }

        #[test]
        fn approval_and_valid_status() {
            // Only packing -> shipping requires approval
            assert!(outbound_order_requires_approval("packing", "shipping"));
            assert!(!outbound_order_requires_approval("picking", "packing"));
            assert!(!outbound_order_requires_approval("packing", "picking"));

            assert!(is_valid_outbound_order_status("shipping"));
            assert!(!is_valid_outbound_order_status("received"));
        }
    }

    // =====================================================================
    // FSM-3: StockTake
    // =====================================================================
    mod stock_take {
        use super::*;

        #[test]
        fn valid_path_and_cancel() {
            assert_ok(stock_take_can_transition("planned", "in_progress"));
            assert_ok(stock_take_can_transition("in_progress", "completed"));
            assert_ok(stock_take_can_transition("planned", "cancelled"));
            assert_ok(stock_take_can_transition("in_progress", "cancelled"));
        }

        #[test]
        fn invalid_transitions() {
            // cannot go directly planned -> completed
            assert_invalid_transition(
                stock_take_can_transition("planned", "completed"),
                "planned",
                "completed",
            );
            // cannot go back in_progress -> planned
            assert_invalid_transition(
                stock_take_can_transition("in_progress", "planned"),
                "in_progress",
                "planned",
            );
        }

        #[test]
        fn terminal_and_approval() {
            assert_terminal(
                stock_take_can_transition("completed", "in_progress"),
                "completed",
            );
            assert_terminal(
                stock_take_can_transition("cancelled", "planned"),
                "cancelled",
            );

            // Only in_progress -> completed
            assert!(stock_take_requires_approval("in_progress", "completed"));
            assert!(!stock_take_requires_approval("planned", "in_progress"));

            assert!(is_valid_stock_take_status("planned"));
            assert!(!is_valid_stock_take_status("received"));
        }
    }

    // =====================================================================
    // FSM-4: TransferOrder
    // =====================================================================
    mod transfer_order {
        use super::*;

        #[test]
        fn valid_forward_and_bidi() {
            assert_ok(transfer_order_can_transition("pending", "confirmed"));
            assert_ok(transfer_order_can_transition("confirmed", "pending")); // reject
            assert_ok(transfer_order_can_transition("confirmed", "shipped"));
            assert_ok(transfer_order_can_transition("shipped", "received"));
            assert_ok(transfer_order_can_transition("received", "completed"));
        }

        #[test]
        fn all_cancel_points() {
            assert_ok(transfer_order_can_transition("pending", "cancelled"));
            assert_ok(transfer_order_can_transition("confirmed", "cancelled"));
            assert_ok(transfer_order_can_transition("shipped", "cancelled"));
            assert_ok(transfer_order_can_transition("received", "cancelled"));
        }

        #[test]
        fn cannot_skip_shipped() {
            assert_invalid_transition(
                transfer_order_can_transition("confirmed", "received"),
                "confirmed",
                "received",
            );
        }

        #[test]
        fn terminal_approval_and_status() {
            assert_terminal(
                transfer_order_can_transition("completed", "received"),
                "completed",
            );
            assert!(transfer_order_requires_approval("confirmed", "shipped"));
            assert!(!transfer_order_requires_approval("pending", "confirmed"));

            assert!(is_valid_transfer_order_status("shipped"));
            assert!(!is_valid_transfer_order_status("in_progress"));
        }
    }

    // =====================================================================
    // FSM-5: WavePick
    // =====================================================================
    mod wave_pick {
        use super::*;

        #[test]
        fn valid_linear_path_and_cancel() {
            assert_ok(wave_pick_can_transition("created", "assigned"));
            assert_ok(wave_pick_can_transition("assigned", "picking"));
            assert_ok(wave_pick_can_transition("picking", "completed"));
            assert_ok(wave_pick_can_transition("created", "cancelled"));
            assert_ok(wave_pick_can_transition("assigned", "cancelled"));
            assert_ok(wave_pick_can_transition("picking", "cancelled"));
        }

        #[test]
        fn invalid_jump() {
            // created -> picking is not allowed
            assert_invalid_transition(
                wave_pick_can_transition("created", "picking"),
                "created",
                "picking",
            );
            // cannot go back picking->assigned
            assert_invalid_transition(
                wave_pick_can_transition("picking", "assigned"),
                "picking",
                "assigned",
            );
        }

        #[test]
        fn terminal_no_approval_and_status() {
            assert_terminal(
                wave_pick_can_transition("completed", "picking"),
                "completed",
            );
            // WavePick has no approval transitions (empty array)
            assert!(!wave_pick_requires_approval("anything", "something"));
            assert!(!wave_pick_requires_approval("created", "assigned"));

            assert!(is_valid_wave_pick_status("assigned"));
            assert!(!is_valid_wave_pick_status("posted"));
        }
    }

    // =====================================================================
    // FSM-6: InventoryMovement
    // =====================================================================
    mod inventory_movement {
        use super::*;

        #[test]
        fn valid_and_cancel() {
            assert_ok(inventory_movement_can_transition("draft", "posted"));
            assert_ok(inventory_movement_can_transition("posted", "completed"));
            assert_ok(inventory_movement_can_transition("draft", "cancelled"));
            assert_ok(inventory_movement_can_transition("posted", "cancelled"));
        }

        #[test]
        fn invalid_transitions() {
            // draft -> completed (skip posted)
            assert_invalid_transition(
                inventory_movement_can_transition("draft", "completed"),
                "draft",
                "completed",
            );
            // no backflow posted -> draft
            assert_invalid_transition(
                inventory_movement_can_transition("posted", "draft"),
                "posted",
                "draft",
            );
        }

        #[test]
        fn terminal_approval_and_status() {
            assert_terminal(
                inventory_movement_can_transition("completed", "posted"),
                "completed",
            );
            assert_terminal(
                inventory_movement_can_transition("cancelled", "draft"),
                "cancelled",
            );

            assert!(inventory_movement_requires_approval("posted", "completed"));
            assert!(!inventory_movement_requires_approval("draft", "posted"));

            assert!(is_valid_inventory_movement_status("posted"));
            assert!(!is_valid_inventory_movement_status("assigned"));
        }
    }

    // =====================================================================
    // FSM-7: SerialNumber
    // =====================================================================
    mod serial_number {
        use super::*;

        #[test]
        fn valid_linear_path() {
            assert_ok(serial_number_can_transition("pending", "assigned"));
            assert_ok(serial_number_can_transition("assigned", "used"));
            assert_ok(serial_number_can_transition("used", "archived"));
        }

        #[test]
        fn invalid_backflows_and_skips() {
            assert_invalid_transition(
                serial_number_can_transition("assigned", "pending"),
                "assigned",
                "pending",
            );
            assert_invalid_transition(
                serial_number_can_transition("pending", "used"),
                "pending",
                "used",
            );
            assert_invalid_transition(
                serial_number_can_transition("pending", "archived"),
                "pending",
                "archived",
            );
        }

        #[test]
        fn unique_terminal_only_archived() {
            // SerialNumber has NO cancelled; only "archived" is terminal
            assert_terminal(serial_number_can_transition("archived", "used"), "archived");
            // pending/assigned/used are non-terminal transitions themselves but can be left;
            // "used" can't go back to "assigned" but can go to "archived" (ok)
            // Unknown states → UnknownStatus
            assert_unknown(
                serial_number_can_transition("assigned", "cancelled"),
                "cancelled",
            );
        }

        #[test]
        fn no_approval_ever_and_status() {
            // Empty approval array
            assert!(!serial_number_requires_approval("used", "archived"));
            assert!(!serial_number_requires_approval("pending", "assigned"));

            assert!(is_valid_serial_number_status("assigned"));
            assert!(is_valid_serial_number_status("archived"));
            assert!(!is_valid_serial_number_status("completed"));
            assert!(!is_valid_serial_number_status("cancelled"));
        }
    }

    // =====================================================================
    // Cross-cutting: internal helper coverage
    // =====================================================================
    mod internals {
        use super::*;

        #[test]
        fn check_pair_unknown_from_or_to() {
            // use inbound_order as a convenient public wrapper
            assert_unknown(
                inbound_order_can_transition("NOT_A_STATE", "created"),
                "NOT_A_STATE",
            );
            assert_unknown(
                inbound_order_can_transition("created", "MADE_UP"),
                "MADE_UP",
            );
        }

        #[test]
        fn error_messages_display_correctly() {
            // Just ensure Debug/Display works without panics
            let term_err = FsmError::TerminalState("done".to_string());
            let msg = format!("{}", term_err);
            assert!(msg.contains("done"));

            let inv_err = FsmError::InvalidTransition {
                from: "a".into(),
                to: "b".into(),
            };
            let msg = format!("{}", inv_err);
            assert!(msg.contains("a") && msg.contains("b"));

            let unk_err = FsmError::UnknownStatus("weird".into());
            let msg = format!("{}", unk_err);
            assert!(msg.contains("weird"));
        }

        #[test]
        fn validation_helper_through_public_apis() {
            // Case-sensitive status check: "PLANNED" ≠ "planned" → unknown
            // check_pair validates `from` first so UnknownStatus("PLANNED") wins
            assert_unknown(
                stock_take_can_transition("PLANNED", "in_progress"),
                "PLANNED",
            );
            assert_unknown(
                stock_take_can_transition("planned", "IN_PROGRESS"),
                "IN_PROGRESS",
            );
        }
    }

    // =====================================================================
    // 扩展矩阵覆盖（status transition matrix + 重复输入 + 边界字符串）
    // =====================================================================
    mod extended_matrix {
        use super::*;

        // ---- FSM-1 InboundOrder 完整矩阵 ----
        #[test]
        fn inbound_order_all_terminal_to_any_state_blocked() {
            // completed / cancelled 都是终态
            for target in &["created", "confirmed", "received", "completed", "cancelled"] {
                assert_terminal(
                    inbound_order_can_transition("completed", target),
                    "completed",
                );
            }
            for target in &["created", "confirmed", "received", "completed", "cancelled"] {
                assert_terminal(
                    inbound_order_can_transition("cancelled", target),
                    "cancelled",
                );
            }
        }

        #[test]
        fn inbound_order_self_transitions_all_invalid() {
            for s in &["created", "confirmed", "received"] {
                assert_invalid_transition(inbound_order_can_transition(s, s), s, s);
            }
        }

        // ---- FSM-2 OutboundOrder 反向流 ----
        #[test]
        fn outbound_order_no_backflow_after_picking() {
            // picking → confirmed 不允许
            assert_invalid_transition(
                outbound_order_can_transition("picking", "confirmed"),
                "picking",
                "confirmed",
            );
            // confirmed → created 不允许
            assert_invalid_transition(
                outbound_order_can_transition("confirmed", "created"),
                "confirmed",
                "created",
            );
        }

        #[test]
        fn outbound_order_shipping_only_to_completed_or_blocked() {
            // shipping 只能去 completed；去其它状态全部 InvalidTransition
            assert_ok(outbound_order_can_transition("shipping", "completed"));
            assert_invalid_transition(
                outbound_order_can_transition("shipping", "picking"),
                "shipping",
                "picking",
            );
        }

        // ---- FSM-3 StockTake 反向与跳跃 ----
        #[test]
        fn stock_take_completed_to_cancelled_blocked_by_terminal() {
            // completed 已是终态，无法再 cancelled
            assert_terminal(
                stock_take_can_transition("completed", "cancelled"),
                "completed",
            );
        }

        // ---- FSM-4 TransferOrder 邻接矩阵 ----
        #[test]
        fn transfer_order_shipped_back_to_confirmed_invalid() {
            assert_invalid_transition(
                transfer_order_can_transition("shipped", "confirmed"),
                "shipped",
                "confirmed",
            );
        }

        #[test]
        fn transfer_order_received_to_shipped_invalid() {
            assert_invalid_transition(
                transfer_order_can_transition("received", "shipped"),
                "received",
                "shipped",
            );
        }

        // ---- FSM-5 WavePick 边界 ----
        #[test]
        fn wave_pick_assigned_back_to_created_invalid() {
            assert_invalid_transition(
                wave_pick_can_transition("assigned", "created"),
                "assigned",
                "created",
            );
        }

        #[test]
        fn wave_pick_completed_to_cancelled_terminal() {
            assert_terminal(
                wave_pick_can_transition("completed", "cancelled"),
                "completed",
            );
        }

        // ---- FSM-6 InventoryMovement 边界 ----
        #[test]
        fn inventory_movement_cancelled_to_completed_terminal() {
            assert_terminal(
                inventory_movement_can_transition("cancelled", "completed"),
                "cancelled",
            );
        }

        // ---- FSM-7 SerialNumber 终态唯一 ----
        #[test]
        fn serial_number_archived_blocks_every_target() {
            for target in &["pending", "assigned", "used", "archived"] {
                assert_terminal(serial_number_can_transition("archived", target), "archived");
            }
        }

        #[test]
        fn empty_string_status_is_unknown_for_every_fsm() {
            // 空串不是任何 FSM 的合法状态
            assert_unknown(inbound_order_can_transition("", "created"), "");
            assert_unknown(outbound_order_can_transition("", "created"), "");
            assert_unknown(stock_take_can_transition("", "planned"), "");
            assert_unknown(transfer_order_can_transition("", "pending"), "");
            assert_unknown(wave_pick_can_transition("", "created"), "");
            assert_unknown(inventory_movement_can_transition("", "draft"), "");
            assert_unknown(serial_number_can_transition("", "pending"), "");
        }

        #[test]
        fn is_valid_status_helpers_consistent_with_state_lists() {
            // 校验 is_valid_*_status 与各 FSM STATES 常量一致
            for s in INBOUND_ORDER_STATES {
                assert!(is_valid_inbound_order_status(s));
            }
            for s in OUTBOUND_ORDER_STATES {
                assert!(is_valid_outbound_order_status(s));
            }
            for s in STOCK_TAKE_STATES {
                assert!(is_valid_stock_take_status(s));
            }
            for s in TRANSFER_ORDER_STATES {
                assert!(is_valid_transfer_order_status(s));
            }
            for s in WAVE_PICK_STATES {
                assert!(is_valid_wave_pick_status(s));
            }
            for s in INVENTORY_MOVEMENT_STATES {
                assert!(is_valid_inventory_movement_status(s));
            }
            for s in SERIAL_NUMBER_STATES {
                assert!(is_valid_serial_number_status(s));
            }
        }

        #[test]
        fn approval_helpers_return_false_for_unknown_inputs() {
            // 未知状态的输入不会触发 panic，仅返回 false
            assert!(!inbound_order_requires_approval("unknown", "completed"));
            assert!(!outbound_order_requires_approval("unknown", "shipping"));
            assert!(!transfer_order_requires_approval("unknown", "shipped"));
            assert!(!stock_take_requires_approval("unknown", "completed"));
            assert!(!inventory_movement_requires_approval(
                "unknown",
                "completed"
            ));
            assert!(!serial_number_requires_approval("unknown", "archived"));
            assert!(!wave_pick_requires_approval("unknown", "completed"));
        }

        #[test]
        fn fsm_error_partial_eq_with_reconstruction() {
            // FsmError 未派生 Clone，用相同参数重建后比较相等性
            let e1 = FsmError::TerminalState("done".into());
            let e1_clone = FsmError::TerminalState("done".into());
            assert_eq!(e1, e1_clone);

            let e2 = FsmError::InvalidTransition {
                from: "a".into(),
                to: "b".into(),
            };
            let e2_clone = FsmError::InvalidTransition {
                from: "a".into(),
                to: "b".into(),
            };
            assert_eq!(e2, e2_clone);

            let e3 = FsmError::UnknownStatus("x".into());
            let e3_clone = FsmError::UnknownStatus("x".into());
            assert_eq!(e3, e3_clone);

            // 不同变体不相等
            assert_ne!(e1, e2);
            assert_ne!(e2, e3);
        }
    }
}

//! WMS 纯函数工具集 —— 校验、归一化、容量与效率计算
//!
//! 本模块仅包含无副作用、无 IO 的纯函数，便于单元测试覆盖。
//! 与 `modules/replenishment_logic.rs`、`modules/discrepancy_logic.rs`
//! 以及 `shared/fsm.rs` 风格保持一致。

use chrono::{DateTime, Duration, Utc};

/// 合法的库存移动类型（与 `models/inventory_movement.rs` 注释一致）
pub const VALID_STOCK_MOVE_TYPES: &[&str] =
    &["inbound", "outbound", "transfer", "return", "adjustment"];

/// 库存移动状态转移表中合法的 (from, to) 组合（与 FSM-6 一致）
pub const VALID_MOVEMENT_TRANSITIONS: &[(&str, &str)] = &[
    ("draft", "posted"),
    ("posted", "completed"),
    ("draft", "cancelled"),
    ("posted", "cancelled"),
];

/// 仓库编码上限（不含）
pub const WAREHOUSE_CODE_MAX_LEN: usize = 32;

/// WMS 通用错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum WmsError {
    #[error("stock move type '{0}' is not recognized")]
    InvalidStockMoveType(String),
    #[error("warehouse code is empty")]
    EmptyWarehouseCode,
    #[error("warehouse code exceeds {0} characters")]
    WarehouseCodeTooLong(usize),
    #[error("warehouse code contains invalid character '{0}'")]
    InvalidWarehouseCodeChar(char),
}

/// 容量校验错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum CapacityError {
    #[error("weight {weight} exceeds capacity {max_capacity}")]
    Exceeded { weight: f64, max_capacity: f64 },
    #[error("weight cannot be negative: {0}")]
    NegativeWeight(f64),
    #[error("max capacity must be positive: {0}")]
    InvalidCapacity(f64),
}

/// 校验库存移动类型字符串
///
/// 接受的取值：`inbound` / `outbound` / `transfer` / `return` / `adjustment`
/// 大小写敏感（与现有 FSM 保持一致）。
pub fn validate_stock_move_type(movement_type: &str) -> Result<(), WmsError> {
    if VALID_STOCK_MOVE_TYPES.contains(&movement_type) {
        Ok(())
    } else {
        Err(WmsError::InvalidStockMoveType(movement_type.to_string()))
    }
}

/// 归一化 SKU 编码：去首尾空白、内部连续空白压缩为单个空格、转大写
///
/// 空字符串返回空字符串（不抛错，由上层决定是否必填）。
pub fn normalize_sku_code(input: &str) -> String {
    input
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
        .to_uppercase()
}

/// 计算可用库存量 = max(0, on_hand - allocated - reserved)
///
/// 任意一项为负时按 0 处理，避免出现"负可用"的语义错乱。
pub fn calc_available_qty(on_hand: f64, allocated: f64, reserved: f64) -> f64 {
    let on_hand = if on_hand < 0.0 { 0.0 } else { on_hand };
    let allocated = if allocated < 0.0 { 0.0 } else { allocated };
    let reserved = if reserved < 0.0 { 0.0 } else { reserved };
    let available = on_hand - allocated - reserved;
    if available < 0.0 {
        0.0
    } else {
        available
    }
}

/// 判断库存移动状态 (from -> to) 是否为合法转移（FSM-6 的 bool 版本）
///
/// 仅识别 `draft` / `posted` / `completed` / `cancelled` 四种状态；
/// 未知状态、终态外推、跳跃式转移一律返回 `false`。
pub fn is_valid_movement_status_transition(from: &str, to: &str) -> bool {
    VALID_MOVEMENT_TRANSITIONS.contains(&(from, to))
}

/// 校验重量是否在容量范围内
///
/// 返回值语义：
/// - `Ok(true)`：恰好等于上限（"满载"），可作告警用
/// - `Ok(false)`：未达到上限（"安全"）
/// - `Err`：超限、负重量或上限非正
pub fn check_weight_capacity(weight: f64, max_capacity: f64) -> Result<bool, CapacityError> {
    if max_capacity <= 0.0 {
        return Err(CapacityError::InvalidCapacity(max_capacity));
    }
    if weight < 0.0 {
        return Err(CapacityError::NegativeWeight(weight));
    }
    if weight > max_capacity {
        return Err(CapacityError::Exceeded {
            weight,
            max_capacity,
        });
    }
    Ok((weight - max_capacity).abs() < f64::EPSILON)
}

/// 计算拣货效率 = picked_qty / time_minutes
///
/// - 时间为 0 或负 → 返回 0.0（避免除零）
/// - 数量为负 → 返回 0.0（无意义）
pub fn calc_picking_efficiency(picked_qty: f64, time_minutes: f64) -> f64 {
    if time_minutes <= 0.0 || picked_qty < 0.0 {
        return 0.0;
    }
    picked_qty / time_minutes
}

/// 校验仓库编码：非空、长度 <= 32、仅允许大写字母/数字/连字符
///
/// 小写字母会被拒绝（与现有 `Warehouse.code` 使用大写约定一致）。
pub fn validate_warehouse_code(code: &str) -> Result<(), WmsError> {
    if code.is_empty() {
        return Err(WmsError::EmptyWarehouseCode);
    }
    if code.len() > WAREHOUSE_CODE_MAX_LEN {
        return Err(WmsError::WarehouseCodeTooLong(WAREHOUSE_CODE_MAX_LEN));
    }
    for ch in code.chars() {
        if !ch.is_ascii_uppercase() && !ch.is_ascii_digit() && ch != '-' {
            return Err(WmsError::InvalidWarehouseCodeChar(ch));
        }
    }
    Ok(())
}

/// 归一化库位编码（zone-aisle-bay-level 格式）
///
/// - 去除每段首尾空白
/// - 转大写
/// - 以 `-` 连接非空段；空段被忽略
/// - 全部为空时返回空字符串
pub fn normalize_location_code(input: &str) -> String {
    input
        .split('-')
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty())
        .collect::<Vec<String>>()
        .join("-")
}

/// 计算库存周转率 = cogs / avg_inventory
///
/// - `avg_inventory <= 0.0` → 返回 0.0（避免除零与负库存语义）
/// - 其他情况返回真实比值（不取绝对值，保留方向）
pub fn calc_inventory_turnover(cogs: f64, avg_inventory: f64) -> f64 {
    if avg_inventory <= 0.0 {
        return 0.0;
    }
    cogs / avg_inventory
}

/// 判断循环盘点是否到期
///
/// - `frequency_days <= 0` 视为禁用 → 永不到期
/// - `last_count_date` 为 `None` 视为从未盘点 → 立即到期
/// - 否则：`now >= last_count_date + frequency_days` 即到期
pub fn is_cycle_count_due(
    last_count_date: Option<DateTime<Utc>>,
    frequency_days: i64,
    now: DateTime<Utc>,
) -> bool {
    if frequency_days <= 0 {
        return false;
    }
    let last = match last_count_date {
        Some(d) => d,
        None => return true,
    };
    let due_at = last + Duration::days(frequency_days);
    now >= due_at
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    // ===================== validate_stock_move_type =====================

    #[test]
    fn validate_stock_move_type_accepts_inbound() {
        assert!(validate_stock_move_type("inbound").is_ok());
    }

    #[test]
    fn validate_stock_move_type_accepts_outbound() {
        assert!(validate_stock_move_type("outbound").is_ok());
    }

    #[test]
    fn validate_stock_move_type_accepts_transfer() {
        assert!(validate_stock_move_type("transfer").is_ok());
    }

    #[test]
    fn validate_stock_move_type_accepts_return() {
        assert!(validate_stock_move_type("return").is_ok());
    }

    #[test]
    fn validate_stock_move_type_accepts_adjustment() {
        assert!(validate_stock_move_type("adjustment").is_ok());
    }

    #[test]
    fn validate_stock_move_type_rejects_unknown() {
        let err = validate_stock_move_type("replenish").unwrap_err();
        assert_eq!(err, WmsError::InvalidStockMoveType("replenish".to_string()));
    }

    #[test]
    fn validate_stock_move_type_rejects_empty() {
        let err = validate_stock_move_type("").unwrap_err();
        assert_eq!(err, WmsError::InvalidStockMoveType("".to_string()));
    }

    #[test]
    fn validate_stock_move_type_rejects_whitespace_only() {
        let err = validate_stock_move_type("   ").unwrap_err();
        assert_eq!(err, WmsError::InvalidStockMoveType("   ".to_string()));
    }

    #[test]
    fn validate_stock_move_type_rejects_uppercase_variant() {
        // 大小写敏感，与 FSM 行为一致
        assert!(validate_stock_move_type("INBOUND").is_err());
        assert!(validate_stock_move_type("Inbound").is_err());
    }

    #[test]
    fn validate_stock_move_type_rejects_padded_valid() {
        // 不做 trim，前后空格的合法值也算非法
        assert!(validate_stock_move_type(" inbound").is_err());
        assert!(validate_stock_move_type("inbound ").is_err());
    }

    // ===================== normalize_sku_code =====================

    #[test]
    fn normalize_sku_code_trims_leading_trailing_whitespace() {
        assert_eq!(normalize_sku_code("  SKU-001  "), "SKU-001");
    }

    #[test]
    fn normalize_sku_code_uppercases_lowercase() {
        assert_eq!(normalize_sku_code("sku-abc"), "SKU-ABC");
    }

    #[test]
    fn normalize_sku_code_collapses_internal_whitespace() {
        assert_eq!(normalize_sku_code("SKU   001\tX"), "SKU 001 X");
    }

    #[test]
    fn normalize_sku_code_empty_input_returns_empty() {
        assert_eq!(normalize_sku_code(""), "");
        assert_eq!(normalize_sku_code("   "), "");
    }

    #[test]
    fn normalize_sku_code_preserves_alphanumeric_and_symbols() {
        assert_eq!(normalize_sku_code("a-b_1.2"), "A-B_1.2");
    }

    #[test]
    fn normalize_sku_code_handles_unicode_digits() {
        // 全角空格不是 ASCII whitespace，但 split_whitespace 会识别 Unicode 空白
        assert_eq!(normalize_sku_code("ＳＫＵ"), "ＳＫＵ");
    }

    // ===================== calc_available_qty =====================

    #[test]
    fn calc_available_qty_normal_subtraction() {
        assert!(approx_eq(calc_available_qty(100.0, 30.0, 20.0), 50.0));
    }

    #[test]
    fn calc_available_qty_zero_allocations_returns_on_hand() {
        assert!(approx_eq(calc_available_qty(80.0, 0.0, 0.0), 80.0));
    }

    #[test]
    fn calc_available_qty_clamps_negative_result_to_zero() {
        // 100 - 60 - 50 = -10 → 0
        assert_eq!(calc_available_qty(100.0, 60.0, 50.0), 0.0);
    }

    #[test]
    fn calc_available_qty_all_zero_returns_zero() {
        assert_eq!(calc_available_qty(0.0, 0.0, 0.0), 0.0);
    }

    #[test]
    fn calc_available_qty_large_numbers() {
        let on_hand = 1_000_000.0;
        let allocated = 600_000.0;
        let reserved = 100_000.0;
        assert!(approx_eq(
            calc_available_qty(on_hand, allocated, reserved),
            300_000.0
        ));
    }

    #[test]
    fn calc_available_qty_treats_negative_inputs_as_zero() {
        // on_hand 负 → 0；allocated/reserved 负 → 0
        assert_eq!(calc_available_qty(-50.0, -10.0, -5.0), 0.0);
        assert!(approx_eq(calc_available_qty(100.0, -20.0, -10.0), 100.0));
    }

    #[test]
    fn calc_available_qty_reserved_exceeds_on_hand() {
        assert_eq!(calc_available_qty(10.0, 0.0, 50.0), 0.0);
    }

    #[test]
    fn calc_available_qty_fractional_values() {
        assert!(approx_eq(calc_available_qty(33.5, 10.25, 5.0), 18.25));
    }

    // ===================== is_valid_movement_status_transition =====================

    #[test]
    fn movement_transition_draft_to_posted_is_valid() {
        assert!(is_valid_movement_status_transition("draft", "posted"));
    }

    #[test]
    fn movement_transition_posted_to_completed_is_valid() {
        assert!(is_valid_movement_status_transition("posted", "completed"));
    }

    #[test]
    fn movement_transition_posted_to_cancelled_is_valid() {
        assert!(is_valid_movement_status_transition("posted", "cancelled"));
    }

    #[test]
    fn movement_transition_draft_to_cancelled_is_valid() {
        assert!(is_valid_movement_status_transition("draft", "cancelled"));
    }

    #[test]
    fn movement_transition_skip_posted_is_invalid() {
        assert!(!is_valid_movement_status_transition("draft", "completed"));
    }

    #[test]
    fn movement_transition_backflow_posted_to_draft_is_invalid() {
        assert!(!is_valid_movement_status_transition("posted", "draft"));
    }

    #[test]
    fn movement_transition_terminal_state_outward_is_invalid() {
        assert!(!is_valid_movement_status_transition("completed", "posted"));
        assert!(!is_valid_movement_status_transition("cancelled", "draft"));
    }

    #[test]
    fn movement_transition_unknown_status_is_invalid() {
        assert!(!is_valid_movement_status_transition("unknown", "posted"));
        assert!(!is_valid_movement_status_transition("draft", "unknown"));
    }

    #[test]
    fn movement_transition_self_transition_is_invalid() {
        assert!(!is_valid_movement_status_transition("draft", "draft"));
        assert!(!is_valid_movement_status_transition("posted", "posted"));
    }

    #[test]
    fn movement_transition_empty_string_is_invalid() {
        assert!(!is_valid_movement_status_transition("", "posted"));
        assert!(!is_valid_movement_status_transition("draft", ""));
    }

    // ===================== check_weight_capacity =====================

    #[test]
    fn check_weight_capacity_under_max_returns_ok_false() {
        assert_eq!(check_weight_capacity(50.0, 100.0), Ok(false));
    }

    #[test]
    fn check_weight_capacity_exact_max_returns_ok_true() {
        assert_eq!(check_weight_capacity(100.0, 100.0), Ok(true));
    }

    #[test]
    fn check_weight_capacity_over_max_returns_exceeded_error() {
        let err = check_weight_capacity(150.0, 100.0).unwrap_err();
        assert_eq!(
            err,
            CapacityError::Exceeded {
                weight: 150.0,
                max_capacity: 100.0
            }
        );
    }

    #[test]
    fn check_weight_capacity_zero_weight_returns_ok_false() {
        assert_eq!(check_weight_capacity(0.0, 100.0), Ok(false));
    }

    #[test]
    fn check_weight_capacity_zero_capacity_returns_invalid_capacity() {
        let err = check_weight_capacity(50.0, 0.0).unwrap_err();
        assert_eq!(err, CapacityError::InvalidCapacity(0.0));
    }

    #[test]
    fn check_weight_capacity_negative_capacity_returns_invalid() {
        let err = check_weight_capacity(50.0, -10.0).unwrap_err();
        assert_eq!(err, CapacityError::InvalidCapacity(-10.0));
    }

    #[test]
    fn check_weight_capacity_negative_weight_returns_negative_weight() {
        let err = check_weight_capacity(-5.0, 100.0).unwrap_err();
        assert_eq!(err, CapacityError::NegativeWeight(-5.0));
    }

    #[test]
    fn check_weight_capacity_tiny_positive_capacity_ok() {
        assert_eq!(check_weight_capacity(0.001, 0.001), Ok(true));
    }

    #[test]
    fn check_weight_capacity_fractional_within_range() {
        assert_eq!(check_weight_capacity(12.345, 99.999), Ok(false));
    }

    // ===================== calc_picking_efficiency =====================

    #[test]
    fn calc_picking_efficiency_normal_division() {
        assert!(approx_eq(calc_picking_efficiency(100.0, 50.0), 2.0));
    }

    #[test]
    fn calc_picking_efficiency_zero_time_returns_zero() {
        assert_eq!(calc_picking_efficiency(100.0, 0.0), 0.0);
    }

    #[test]
    fn calc_picking_efficiency_negative_time_returns_zero() {
        assert_eq!(calc_picking_efficiency(100.0, -10.0), 0.0);
    }

    #[test]
    fn calc_picking_efficiency_zero_qty_returns_zero() {
        assert_eq!(calc_picking_efficiency(0.0, 10.0), 0.0);
    }

    #[test]
    fn calc_picking_efficiency_negative_qty_returns_zero() {
        assert_eq!(calc_picking_efficiency(-5.0, 10.0), 0.0);
    }

    #[test]
    fn calc_picking_efficiency_large_values() {
        let r = calc_picking_efficiency(1_000_000.0, 60.0);
        assert!(approx_eq(r, 16_666.666_666_666_668));
    }

    #[test]
    fn calc_picking_efficiency_fractional_result() {
        assert!(approx_eq(
            calc_picking_efficiency(7.0, 3.0),
            2.333_333_333_333_333_5
        ));
    }

    // ===================== validate_warehouse_code =====================

    #[test]
    fn validate_warehouse_code_accepts_simple_uppercase() {
        assert!(validate_warehouse_code("WH001").is_ok());
    }

    #[test]
    fn validate_warehouse_code_accepts_with_dash() {
        assert!(validate_warehouse_code("WH-001").is_ok());
    }

    #[test]
    fn validate_warehouse_code_accepts_digits_only() {
        assert!(validate_warehouse_code("001").is_ok());
    }

    #[test]
    fn validate_warehouse_code_rejects_empty() {
        assert_eq!(
            validate_warehouse_code("").unwrap_err(),
            WmsError::EmptyWarehouseCode
        );
    }

    #[test]
    fn validate_warehouse_code_rejects_too_long() {
        let long = "A".repeat(WAREHOUSE_CODE_MAX_LEN + 1);
        let err = validate_warehouse_code(&long).unwrap_err();
        assert_eq!(err, WmsError::WarehouseCodeTooLong(WAREHOUSE_CODE_MAX_LEN));
    }

    #[test]
    fn validate_warehouse_code_rejects_lowercase() {
        let err = validate_warehouse_code("wh001").unwrap_err();
        assert_eq!(err, WmsError::InvalidWarehouseCodeChar('w'));
    }

    #[test]
    fn validate_warehouse_code_rejects_special_chars() {
        let err = validate_warehouse_code("WH_001").unwrap_err();
        assert_eq!(err, WmsError::InvalidWarehouseCodeChar('_'));
    }

    #[test]
    fn validate_warehouse_code_rejects_whitespace() {
        let err = validate_warehouse_code("WH 001").unwrap_err();
        assert_eq!(err, WmsError::InvalidWarehouseCodeChar(' '));
    }

    #[test]
    fn validate_warehouse_code_accepts_max_length_boundary() {
        let exact = "A".repeat(WAREHOUSE_CODE_MAX_LEN);
        assert!(validate_warehouse_code(&exact).is_ok());
    }

    // ===================== normalize_location_code =====================

    #[test]
    fn normalize_location_code_basic_four_parts() {
        assert_eq!(normalize_location_code("A-01-02-03"), "A-01-02-03");
    }

    #[test]
    fn normalize_location_code_uppercases_lowercase() {
        assert_eq!(normalize_location_code("a-b-c"), "A-B-C");
    }

    #[test]
    fn normalize_location_code_trims_each_segment() {
        assert_eq!(normalize_location_code(" A - 01 - B2 - 3 "), "A-01-B2-3");
    }

    #[test]
    fn normalize_location_code_drops_empty_segments() {
        assert_eq!(normalize_location_code("A--01---B"), "A-01-B");
    }

    #[test]
    fn normalize_location_code_empty_input_returns_empty() {
        assert_eq!(normalize_location_code(""), "");
        assert_eq!(normalize_location_code("---"), "");
    }

    #[test]
    fn normalize_location_code_single_segment() {
        assert_eq!(normalize_location_code("zoneA"), "ZONEA");
    }

    #[test]
    fn normalize_location_code_collapses_whitespace_only_segments() {
        assert_eq!(normalize_location_code("A-   -B"), "A-B");
    }

    // ===================== calc_inventory_turnover =====================

    #[test]
    fn calc_inventory_turnover_normal_ratio() {
        assert!(approx_eq(calc_inventory_turnover(1200.0, 300.0), 4.0));
    }

    #[test]
    fn calc_inventory_turnover_zero_inventory_returns_zero() {
        assert_eq!(calc_inventory_turnover(1200.0, 0.0), 0.0);
    }

    #[test]
    fn calc_inventory_turnover_negative_inventory_returns_zero() {
        assert_eq!(calc_inventory_turnover(1200.0, -50.0), 0.0);
    }

    #[test]
    fn calc_inventory_turnover_zero_cogs_returns_zero() {
        assert_eq!(calc_inventory_turnover(0.0, 300.0), 0.0);
    }

    #[test]
    fn calc_inventory_turnover_fractional_result() {
        assert!(approx_eq(
            calc_inventory_turnover(100.0, 300.0),
            0.333_333_333_333_333_3
        ));
    }

    #[test]
    fn calc_inventory_turnover_large_numbers() {
        let r = calc_inventory_turnover(12_000_000.0, 1_500_000.0);
        assert!(approx_eq(r, 8.0));
    }

    #[test]
    fn calc_inventory_turnover_preserves_sign_of_cogs() {
        // 负的 COGS（退货场景）保留方向
        assert!(approx_eq(calc_inventory_turnover(-100.0, 200.0), -0.5));
    }

    // ===================== is_cycle_count_due =====================

    #[test]
    fn is_cycle_count_due_now_equals_due_at_is_due() {
        let last = Utc::now();
        // 恰好经过 frequency_days → 视为到期（>=）
        let now = last + Duration::days(7);
        assert!(is_cycle_count_due(Some(last), 7, now));
    }

    #[test]
    fn is_cycle_count_due_past_due_at_is_due() {
        let last = Utc::now();
        let now = last + Duration::days(30);
        assert!(is_cycle_count_due(Some(last), 7, now));
    }

    #[test]
    fn is_cycle_count_due_before_due_at_is_not_due() {
        let last = Utc::now();
        let now = last + Duration::days(3);
        assert!(!is_cycle_count_due(Some(last), 7, now));
    }

    #[test]
    fn is_cycle_count_due_zero_frequency_is_never_due() {
        let last = Utc::now();
        let now = last + Duration::days(365);
        assert!(!is_cycle_count_due(Some(last), 0, now));
    }

    #[test]
    fn is_cycle_count_due_negative_frequency_is_never_due() {
        let last = Utc::now();
        let now = last + Duration::days(365);
        assert!(!is_cycle_count_due(Some(last), -7, now));
    }

    #[test]
    fn is_cycle_count_due_no_last_count_is_due() {
        // 从未盘点过 → 立即到期
        assert!(is_cycle_count_due(None, 30, Utc::now()));
    }

    #[test]
    fn is_cycle_count_due_no_last_count_with_zero_frequency_not_due() {
        // 禁用的优先级高于"从未盘点"
        assert!(!is_cycle_count_due(None, 0, Utc::now()));
    }

    #[test]
    fn is_cycle_count_due_one_day_boundary() {
        let last = Utc::now();
        let now = last + Duration::days(1);
        assert!(is_cycle_count_due(Some(last), 1, now));
    }

    // ===================== error display & equality =====================

    #[test]
    fn wms_error_display_does_not_panic_and_contains_payload() {
        let e1 = WmsError::InvalidStockMoveType("foo".into());
        let s1 = format!("{}", e1);
        assert!(s1.contains("foo"));

        let e2 = WmsError::EmptyWarehouseCode;
        let s2 = format!("{}", e2);
        assert!(s2.contains("empty"));

        let e3 = WmsError::WarehouseCodeTooLong(32);
        let s3 = format!("{}", e3);
        assert!(s3.contains("32"));

        let e4 = WmsError::InvalidWarehouseCodeChar('@');
        let s4 = format!("{}", e4);
        assert!(s4.contains('@'));
    }

    #[test]
    fn wms_error_equality_for_clone_roundtrip() {
        let e = WmsError::InvalidStockMoveType("xyz".into());
        assert_eq!(e, e.clone());
        assert_ne!(
            WmsError::InvalidStockMoveType("a".into()),
            WmsError::InvalidStockMoveType("b".into())
        );
    }

    #[test]
    fn capacity_error_display_does_not_panic_and_contains_payload() {
        let e1 = CapacityError::Exceeded {
            weight: 200.0,
            max_capacity: 100.0,
        };
        let s1 = format!("{}", e1);
        assert!(s1.contains('2') && s1.contains("200"));
        assert!(s1.contains("100"));

        let e2 = CapacityError::NegativeWeight(-3.5);
        let s2 = format!("{}", e2);
        assert!(s2.contains("3.5"));

        let e3 = CapacityError::InvalidCapacity(0.0);
        let s3 = format!("{}", e3);
        assert!(!s3.is_empty());
    }

    #[test]
    fn capacity_error_equality_for_clone_roundtrip() {
        let e = CapacityError::NegativeWeight(-1.0);
        assert_eq!(e, e.clone());
        assert_ne!(
            CapacityError::NegativeWeight(-1.0),
            CapacityError::NegativeWeight(-2.0)
        );
    }

    #[test]
    fn valid_stock_move_types_constant_complete() {
        // 确保常量与文档一致
        assert_eq!(VALID_STOCK_MOVE_TYPES.len(), 5);
        assert!(VALID_STOCK_MOVE_TYPES.contains(&"inbound"));
        assert!(VALID_STOCK_MOVE_TYPES.contains(&"outbound"));
        assert!(VALID_STOCK_MOVE_TYPES.contains(&"transfer"));
        assert!(VALID_STOCK_MOVE_TYPES.contains(&"return"));
        assert!(VALID_STOCK_MOVE_TYPES.contains(&"adjustment"));
    }

    #[test]
    fn valid_movement_transitions_constant_complete() {
        // FSM-6 一共 4 条合法转移
        assert_eq!(VALID_MOVEMENT_TRANSITIONS.len(), 4);
        assert!(VALID_MOVEMENT_TRANSITIONS.contains(&("draft", "posted")));
        assert!(VALID_MOVEMENT_TRANSITIONS.contains(&("posted", "completed")));
    }
}

//! SCM 供应链管理纯函数工具集：供应商编号校验、税号校验、采购单号校验、
//! 再订货点计算、库存阈值/周转率/在库天数/断货风险等辅助计算。
//!
//! 所有函数均为纯函数，不依赖数据库或异步运行时，便于内联单元测试。

use chrono::NaiveDate;

/// 校验供应商编号：非空、长度 ≤ 32、仅允许字母数字与 `-`/`_`。
pub fn validate_supplier_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 32 {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// 归一化供应商编号：去首尾空白、转大写、移除内部空白字符。
pub fn normalize_supplier_code(code: &str) -> String {
    topems_shared_core::normalize_code(code)
}

/// 校验统一社会信用代码/税号：长度为 18、仅字母数字。
pub fn validate_tax_number(tax: &str) -> bool {
    if tax.len() != 18 {
        return false;
    }
    tax.chars().all(|c| c.is_ascii_alphanumeric())
}

/// 校验采购订单号：非空、长度 ≤ 32、仅字母数字与 `-`/`_`。
pub fn validate_purchase_order_no(po: &str) -> bool {
    if po.is_empty() || po.len() > 32 {
        return false;
    }
    po.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// 计算再订货点 ROP = 日均需求 × 提前期 + 安全库存。
/// 任意输入为负时返回 0.0，避免异常库存策略。
pub fn calc_reorder_point(avg_daily_demand: f64, lead_time_days: i64, safety_stock: f64) -> f64 {
    if avg_daily_demand < 0.0 || lead_time_days < 0 || safety_stock < 0.0 {
        return 0.0;
    }
    avg_daily_demand * (lead_time_days as f64) + safety_stock
}

/// 判断库存是否低于阈值（on_hand < threshold）。
pub fn is_inventory_below_threshold(on_hand: f64, threshold: f64) -> bool {
    on_hand < threshold
}

/// 计算库存周转率 = COGS / 平均库存。平均库存 ≤ 0 时返回 None。
pub fn calc_inventory_turnover_rate(cogs: f64, avg_inventory: f64) -> Option<f64> {
    if avg_inventory <= 0.0 {
        return None;
    }
    let rate = cogs / avg_inventory;
    if rate < 0.0 {
        None
    } else {
        Some(rate)
    }
}

/// 计算在库供应天数 = 当前库存 / 日均需求。日均需求 ≤ 0 时返回 None。
pub fn calc_days_of_supply(on_hand: f64, avg_daily_demand: f64) -> Option<i64> {
    if avg_daily_demand <= 0.0 {
        return None;
    }
    if on_hand < 0.0 {
        return Some(0);
    }
    Some((on_hand / avg_daily_demand).floor() as i64)
}

/// 计算交货日期 = 订单日期 + 提前期天数。
pub fn calc_delivery_date(order_date: NaiveDate, lead_time_days: i64) -> NaiveDate {
    order_date + chrono::Duration::days(lead_time_days)
}

/// 根据当前库存、日均需求与提前期判定断货风险等级。
/// - `safe`：可覆盖提前期需求且有富余
/// - `warning`：可覆盖但无富余（≤ 提前期需求 × 1.2）
/// - `critical`：无法覆盖提前期需求
pub fn calc_stockout_risk_level(
    on_hand: f64,
    avg_daily_demand: f64,
    lead_time_days: i64,
) -> &'static str {
    if avg_daily_demand <= 0.0 || lead_time_days <= 0 {
        return "safe";
    }
    let lead_time_demand = avg_daily_demand * (lead_time_days as f64);
    if on_hand < lead_time_demand {
        "critical"
    } else if on_hand <= lead_time_demand * 1.2 {
        "warning"
    } else {
        "safe"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== validate_supplier_code =====

    #[test]
    fn test_validate_supplier_code_valid() {
        assert!(validate_supplier_code("SUP-001"));
        assert!(validate_supplier_code("supplier_2024"));
        assert!(validate_supplier_code("ABC123"));
    }

    #[test]
    fn test_validate_supplier_code_invalid() {
        assert!(!validate_supplier_code(""));
        assert!(!validate_supplier_code("SUP 001"));
        assert!(!validate_supplier_code("SUP@001"));
        assert!(!validate_supplier_code(&"a".repeat(33)));
    }

    #[test]
    fn test_validate_supplier_code_boundary() {
        assert!(validate_supplier_code(&"a".repeat(32)));
        assert!(!validate_supplier_code(&"a".repeat(33)));
        assert!(validate_supplier_code("a"));
    }

    // ===== normalize_supplier_code =====

    #[test]
    fn test_normalize_supplier_code_basic() {
        assert_eq!(normalize_supplier_code("  sup-001  "), "SUP-001");
        assert_eq!(normalize_supplier_code("sup 001"), "SUP001");
        assert_eq!(normalize_supplier_code("\tabc\n"), "ABC");
    }

    #[test]
    fn test_normalize_supplier_code_empty_and_upper() {
        assert_eq!(normalize_supplier_code(""), "");
        assert_eq!(normalize_supplier_code("   "), "");
        assert_eq!(normalize_supplier_code("SUP-001"), "SUP-001");
    }

    // ===== validate_tax_number =====

    #[test]
    fn test_validate_tax_number_valid() {
        assert!(validate_tax_number("91110000600037341R"));
        assert!(validate_tax_number("91310000710929XXX9"));
    }

    #[test]
    fn test_validate_tax_number_invalid_length() {
        assert!(!validate_tax_number("9111000060003734"));
        assert!(!validate_tax_number("91110000600037341RR"));
        assert!(!validate_tax_number(""));
    }

    #[test]
    fn test_validate_tax_number_invalid_chars() {
        assert!(!validate_tax_number("9111000060003734_9"));
        assert!(!validate_tax_number("91110000 0037341R"));
    }

    // ===== validate_purchase_order_no =====

    #[test]
    fn test_validate_purchase_order_no_valid() {
        assert!(validate_purchase_order_no("PO-2024-001"));
        assert!(validate_purchase_order_no("PO_001"));
        assert!(validate_purchase_order_no("PO20240101"));
    }

    #[test]
    fn test_validate_purchase_order_no_invalid() {
        assert!(!validate_purchase_order_no(""));
        assert!(!validate_purchase_order_no("PO 001"));
        assert!(!validate_purchase_order_no("PO@001"));
        assert!(!validate_purchase_order_no(&"a".repeat(33)));
    }

    #[test]
    fn test_validate_purchase_order_no_boundary() {
        assert!(validate_purchase_order_no(&"a".repeat(32)));
        assert!(!validate_purchase_order_no(&"a".repeat(33)));
    }

    // ===== calc_reorder_point =====

    #[test]
    fn test_calc_reorder_point_basic() {
        // 10/天 × 7天 + 50 = 120
        assert_eq!(calc_reorder_point(10.0, 7, 50.0), 120.0);
        // 0 日均需求 + 安全库存 50 = 50
        assert_eq!(calc_reorder_point(0.0, 7, 50.0), 50.0);
    }

    #[test]
    fn test_calc_reorder_point_zero_safety_stock() {
        assert_eq!(calc_reorder_point(10.0, 7, 0.0), 70.0);
        assert_eq!(calc_reorder_point(0.0, 0, 0.0), 0.0);
    }

    #[test]
    fn test_calc_reorder_point_negative_returns_zero() {
        assert_eq!(calc_reorder_point(-1.0, 7, 50.0), 0.0);
        assert_eq!(calc_reorder_point(10.0, -1, 50.0), 0.0);
        assert_eq!(calc_reorder_point(10.0, 7, -5.0), 0.0);
    }

    // ===== is_inventory_below_threshold =====

    #[test]
    fn test_is_inventory_below_threshold_basic() {
        assert!(is_inventory_below_threshold(5.0, 10.0));
        assert!(!is_inventory_below_threshold(15.0, 10.0));
        assert!(!is_inventory_below_threshold(10.0, 10.0));
    }

    #[test]
    fn test_is_inventory_below_threshold_zero_and_negative() {
        assert!(is_inventory_below_threshold(0.0, 1.0));
        assert!(!is_inventory_below_threshold(0.0, 0.0));
        assert!(is_inventory_below_threshold(-5.0, 0.0));
    }

    // ===== calc_inventory_turnover_rate =====

    #[test]
    fn test_calc_inventory_turnover_rate_basic() {
        assert_eq!(calc_inventory_turnover_rate(1000.0, 500.0), Some(2.0));
        assert_eq!(calc_inventory_turnover_rate(0.0, 500.0), Some(0.0));
    }

    #[test]
    fn test_calc_inventory_turnover_rate_zero_inventory() {
        assert_eq!(calc_inventory_turnover_rate(1000.0, 0.0), None);
        assert_eq!(calc_inventory_turnover_rate(1000.0, -10.0), None);
    }

    #[test]
    fn test_calc_inventory_turnover_rate_negative_cogs() {
        assert_eq!(calc_inventory_turnover_rate(-100.0, 500.0), None);
    }

    // ===== calc_days_of_supply =====

    #[test]
    fn test_calc_days_of_supply_basic() {
        assert_eq!(calc_days_of_supply(100.0, 10.0), Some(10));
        assert_eq!(calc_days_of_supply(95.0, 10.0), Some(9));
        assert_eq!(calc_days_of_supply(0.0, 10.0), Some(0));
    }

    #[test]
    fn test_calc_days_of_supply_zero_demand() {
        assert_eq!(calc_days_of_supply(100.0, 0.0), None);
        assert_eq!(calc_days_of_supply(100.0, -5.0), None);
    }

    #[test]
    fn test_calc_days_of_supply_negative_stock() {
        assert_eq!(calc_days_of_supply(-50.0, 10.0), Some(0));
    }

    // ===== calc_delivery_date =====

    #[test]
    fn test_calc_delivery_date_basic() {
        let order = NaiveDate::from_ymd_opt(2026, 9, 1).unwrap();
        assert_eq!(
            calc_delivery_date(order, 7),
            NaiveDate::from_ymd_opt(2026, 9, 8).unwrap()
        );
        assert_eq!(
            calc_delivery_date(order, 30),
            NaiveDate::from_ymd_opt(2026, 10, 1).unwrap()
        );
    }

    #[test]
    fn test_calc_delivery_date_zero_and_negative_lead_time() {
        let order = NaiveDate::from_ymd_opt(2026, 9, 1).unwrap();
        assert_eq!(calc_delivery_date(order, 0), order);
        assert_eq!(
            calc_delivery_date(order, -5),
            NaiveDate::from_ymd_opt(2026, 8, 27).unwrap()
        );
    }

    #[test]
    fn test_calc_delivery_date_cross_year() {
        let order = NaiveDate::from_ymd_opt(2026, 12, 28).unwrap();
        assert_eq!(
            calc_delivery_date(order, 7),
            NaiveDate::from_ymd_opt(2027, 1, 4).unwrap()
        );
    }

    // ===== calc_stockout_risk_level =====

    #[test]
    fn test_calc_stockout_risk_level_critical() {
        // 提前期需求 = 10 × 7 = 70，库存 50 < 70
        assert_eq!(calc_stockout_risk_level(50.0, 10.0, 7), "critical");
        // 库存为 0
        assert_eq!(calc_stockout_risk_level(0.0, 10.0, 7), "critical");
    }

    #[test]
    fn test_calc_stockout_risk_level_warning() {
        // 提前期需求 70，70 ≤ 库存 ≤ 84 (70×1.2) → warning
        assert_eq!(calc_stockout_risk_level(70.0, 10.0, 7), "warning");
        assert_eq!(calc_stockout_risk_level(84.0, 10.0, 7), "warning");
    }

    #[test]
    fn test_calc_stockout_risk_level_safe() {
        // 库存 > 84 → safe
        assert_eq!(calc_stockout_risk_level(85.0, 10.0, 7), "safe");
        assert_eq!(calc_stockout_risk_level(1000.0, 10.0, 7), "safe");
    }

    #[test]
    fn test_calc_stockout_risk_level_zero_demand_or_lead_time() {
        assert_eq!(calc_stockout_risk_level(10.0, 0.0, 7), "safe");
        assert_eq!(calc_stockout_risk_level(10.0, 10.0, 0), "safe");
        assert_eq!(calc_stockout_risk_level(0.0, 0.0, 0), "safe");
    }
}

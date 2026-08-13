//! 物料/订单模块纯计算函数
//!
//! 从 `modules/material.rs` / `modules/purchase_order.rs` / `modules/sales_order.rs` 提取。

use crate::models::material::PurchaseOrderItem;

// ── 物料价格相关 ───────────────────────────────────────

/// 物料含税价倒推：含税价 / (1 + 税率)
///
/// 税率非法（<0, >1 除外）钳制到合法区间；负值或 NaN 结果钳制为 0。
pub fn calculate_exclusive_tax_price(tax_inclusive_price: f64, tax_rate: f64) -> f64 {
    if !tax_inclusive_price.is_finite() || tax_inclusive_price <= 0.0 {
        return 0.0;
    }
    let rate = tax_rate.clamp(0.0, 1.0);
    let base = tax_inclusive_price / (1.0 + rate);
    if base.is_finite() && base > 0.0 {
        base
    } else {
        0.0
    }
}

/// 物料含税价计算：不含税价 × (1 + 税率)
pub fn calculate_inclusive_tax_price(exclusive_tax_price: f64, tax_rate: f64) -> f64 {
    if !exclusive_tax_price.is_finite() || exclusive_tax_price <= 0.0 {
        return 0.0;
    }
    let rate = tax_rate.clamp(0.0, 1.0);
    let result = exclusive_tax_price * (1.0 + rate);
    if result.is_finite() {
        result
    } else {
        0.0
    }
}

// ── 采购订单金额计算 ───────────────────────────────────

pub struct OrderAmounts {
    pub total_amount: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub payable_amount: f64,
}

/// 从 items、tax_rate、discount_rate 计算采购订单 4 项金额
///
/// - total_amount = Σ(quantity × unit_price)，负值钳制
/// - tax_rate 默认 0.13，钳制 [0,1]
/// - discount_rate 默认 0，钳制 [0,1]
/// - payable = total + tax - discount，负值钳制为 0
pub fn calculate_purchase_order_amounts(
    items: &[PurchaseOrderItem],
    tax_rate: Option<f64>,
    discount_rate: Option<f64>,
) -> OrderAmounts {
    let total = items
        .iter()
        .map(|i| {
            let q = i.quantity.max(0.0);
            let p = i.unit_price.max(0.0);
            q * p
        })
        .sum::<f64>();
    let total_amount = if total > 0.0 { total } else { 0.0 };

    let t_rate = tax_rate.unwrap_or(0.13).clamp(0.0, 1.0);
    let d_rate = discount_rate.unwrap_or(0.0).clamp(0.0, 1.0);

    let tax_amount = total_amount * t_rate;
    let discount_amount = total_amount * d_rate;

    let payable_raw = total_amount + tax_amount - discount_amount;
    let payable_amount = if payable_raw > 0.0 { payable_raw } else { 0.0 };

    OrderAmounts {
        total_amount,
        tax_amount,
        discount_amount,
        payable_amount,
    }
}

// ── 销售订单金额计算 ───────────────────────────────────

/// 计算销售订单金额：当 body 字段为 None 时的默认回退
///
/// - total_amount: None → 0.0
/// - tax_amount / discount_amount: None → 0.0
/// - payable_amount: None → total + tax - discount，负值钳制为 0
pub fn calculate_sales_order_amounts(
    total_amount: Option<f64>,
    tax_amount: Option<f64>,
    discount_amount: Option<f64>,
    payable_amount: Option<f64>,
) -> OrderAmounts {
    let total_amount = total_amount.unwrap_or(0.0).max(0.0);
    let tax_amount = tax_amount.unwrap_or(0.0).max(0.0);
    let discount_amount = discount_amount.unwrap_or(0.0).max(0.0);
    let payable_amount = match payable_amount {
        Some(p) => p.max(0.0),
        None => {
            let raw = total_amount + tax_amount - discount_amount;
            if raw > 0.0 {
                raw
            } else {
                0.0
            }
        }
    };
    OrderAmounts {
        total_amount,
        tax_amount,
        discount_amount,
        payable_amount,
    }
}

// ── 采购订单单行金额 ───────────────────────────────────

/// 单个采购明细 amount = quantity × unit_price，负值均钳制
pub fn calculate_purchase_item_amount(quantity: f64, unit_price: f64) -> f64 {
    let q = quantity.max(0.0);
    let p = unit_price.max(0.0);
    q * p
}

// ── 校验 ───────────────────────────────────────────────

/// 编码校验：非空 + 仅 [A-Za-z0-9_-]
pub fn validate_code(code: &str) -> bool {
    if code.is_empty() {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/// 税率校验：必须是有限的、且在 [0.0, 1.0] 区间
pub fn validate_tax_rate(rate: f64) -> bool {
    rate.is_finite() && (0.0..=1.0).contains(&rate)
}

/// 数量校验：非负有限数
pub fn validate_quantity(quantity: f64) -> bool {
    quantity.is_finite() && quantity >= 0.0
}

// ── 安全库存判断（同 inventory_calc，但复用性强，保留独立实现）─

/// 当前库存 vs 安全库存：是否触发预警（inventory 模块可能已覆盖，此处补充）
pub fn is_safety_stock_alert(quantity: f64, safety_stock: f64) -> bool {
    quantity < safety_stock && safety_stock > 0.0
}

/// 安全库存补充建议量：低于安全库存时返回差值
pub fn safety_stock_replenish_suggest(quantity: f64, safety_stock: f64) -> f64 {
    if safety_stock <= 0.0 || quantity >= safety_stock {
        return 0.0;
    }
    (safety_stock - quantity).max(0.0)
}

// ── 订单状态缺省 ───────────────────────────────────────

pub fn default_sales_order_status(status: Option<String>) -> String {
    status.unwrap_or_else(|| "draft".to_string())
}

pub fn default_purchase_order_status() -> &'static str {
    "pending"
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn mk_item(q: f64, p: f64) -> PurchaseOrderItem {
        PurchaseOrderItem {
            material_id: Uuid::new_v4(),
            material_name: "M".into(),
            quantity: q,
            unit_price: p,
            amount: q * p,
        }
    }

    // ── 含税价 / 不含税价 ───────────────────────────────

    #[test]
    fn test_exclusive_tax_normal_13pct() {
        let r = calculate_exclusive_tax_price(113.0, 0.13);
        assert!((r - 100.0).abs() < 1e-6);
    }

    #[test]
    fn test_exclusive_tax_zero_price_returns_zero() {
        assert_eq!(calculate_exclusive_tax_price(0.0, 0.13), 0.0);
    }

    #[test]
    fn test_exclusive_tax_negative_price_returns_zero() {
        assert_eq!(calculate_exclusive_tax_price(-50.0, 0.13), 0.0);
    }

    #[test]
    fn test_exclusive_tax_nan_price_returns_zero() {
        assert_eq!(calculate_exclusive_tax_price(f64::NAN, 0.13), 0.0);
    }

    #[test]
    fn test_exclusive_tax_rate_above_1_clamped() {
        // 2.0 → 钳到 1.0；200 / 2 = 100
        let r = calculate_exclusive_tax_price(200.0, 2.0);
        assert!((r - 100.0).abs() < 1e-6);
    }

    #[test]
    fn test_exclusive_tax_rate_negative_clamped() {
        // -0.1 → 钳 0；100 / 1 = 100
        let r = calculate_exclusive_tax_price(100.0, -0.1);
        assert!((r - 100.0).abs() < 1e-6);
    }

    #[test]
    fn test_inclusive_tax_normal_13pct() {
        let r = calculate_inclusive_tax_price(100.0, 0.13);
        assert!((r - 113.0).abs() < 1e-6);
    }

    #[test]
    fn test_inclusive_tax_zero_price() {
        assert_eq!(calculate_inclusive_tax_price(0.0, 0.13), 0.0);
    }

    #[test]
    fn test_inclusive_tax_rate_above_1_clamped() {
        // 100 * (1 + 1.0) = 200
        let r = calculate_inclusive_tax_price(100.0, 2.0);
        assert!((r - 200.0).abs() < 1e-6);
    }

    // ── calculate_purchase_order_amounts ─────────────

    #[test]
    fn test_purchase_amounts_basic_3_items() {
        let items = vec![mk_item(10.0, 5.0), mk_item(2.0, 20.0), mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, None, None);
        // total = 50 + 40 + 100 = 190
        // tax 0.13 → 24.7, discount 0, payable 214.7
        assert!((r.total_amount - 190.0).abs() < 1e-9);
        assert!((r.tax_amount - 24.7).abs() < 1e-9);
        assert!((r.discount_amount - 0.0).abs() < 1e-9);
        assert!((r.payable_amount - 214.7).abs() < 1e-9);
    }

    #[test]
    fn test_purchase_amounts_empty_items() {
        let r = calculate_purchase_order_amounts(&[], None, None);
        assert_eq!(r.total_amount, 0.0);
        assert_eq!(r.tax_amount, 0.0);
        assert_eq!(r.payable_amount, 0.0);
    }

    #[test]
    fn test_purchase_amounts_discount_5pct() {
        let items = vec![mk_item(100.0, 10.0)];
        let r = calculate_purchase_order_amounts(&items, Some(0.13), Some(0.05));
        // total 1000, tax 130, discount 50, payable 1080
        assert_eq!(r.total_amount, 1000.0);
        assert_eq!(r.tax_amount, 130.0);
        assert_eq!(r.discount_amount, 50.0);
        assert_eq!(r.payable_amount, 1080.0);
    }

    #[test]
    fn test_purchase_amounts_negative_item_qty_clamped() {
        let items = vec![mk_item(-5.0, 10.0), mk_item(10.0, 10.0)];
        let r = calculate_purchase_order_amounts(&items, None, None);
        // 负 qty 钳到 0：有效 10×10=100
        assert_eq!(r.total_amount, 100.0);
    }

    #[test]
    fn test_purchase_amounts_tax_rate_above_1_clamped() {
        let items = vec![mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, Some(2.0), None);
        assert_eq!(r.tax_amount, 100.0); // 100 × 1.0
    }

    #[test]
    fn test_purchase_amounts_negative_discount_rate_clamped() {
        let items = vec![mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, None, Some(-0.5));
        assert_eq!(r.discount_amount, 0.0);
    }

    #[test]
    fn test_purchase_amounts_payable_never_negative() {
        // 高折扣率：discount 1.0（100%）+ 无税 → total=100, payable=0
        let items = vec![mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, Some(0.0), Some(1.0));
        assert_eq!(r.payable_amount, 0.0);
    }

    // ── calculate_sales_order_amounts ────────────────

    #[test]
    fn test_sales_amounts_all_none() {
        let r = calculate_sales_order_amounts(None, None, None, None);
        assert_eq!(r.total_amount, 0.0);
        assert_eq!(r.tax_amount, 0.0);
        assert_eq!(r.discount_amount, 0.0);
        assert_eq!(r.payable_amount, 0.0);
    }

    #[test]
    fn test_sales_amounts_provided_payable() {
        let r = calculate_sales_order_amounts(Some(100.0), Some(13.0), Some(5.0), Some(110.0));
        assert_eq!(r.payable_amount, 110.0); // 传入的优先
    }

    #[test]
    fn test_sales_amounts_computed_payable() {
        let r = calculate_sales_order_amounts(Some(100.0), Some(13.0), Some(5.0), None);
        assert_eq!(r.payable_amount, 108.0); // 100+13-5
    }

    #[test]
    fn test_sales_amounts_computed_payable_never_negative() {
        // total 50, tax 0, discount 200 → payable = 50-200 钳 0
        let r = calculate_sales_order_amounts(Some(50.0), None, Some(200.0), None);
        assert_eq!(r.payable_amount, 0.0);
    }

    #[test]
    fn test_sales_amounts_negative_inputs_clamped() {
        let r = calculate_sales_order_amounts(Some(-50.0), Some(-10.0), Some(-20.0), None);
        assert_eq!(r.total_amount, 0.0);
        assert_eq!(r.tax_amount, 0.0);
        assert_eq!(r.discount_amount, 0.0);
        assert_eq!(r.payable_amount, 0.0);
    }

    // ── calculate_purchase_item_amount ─────────────

    #[test]
    fn test_item_amount_normal() {
        assert_eq!(calculate_purchase_item_amount(10.0, 12.5), 125.0);
    }

    #[test]
    fn test_item_amount_negative_both_clamped() {
        assert_eq!(calculate_purchase_item_amount(-10.0, -5.0), 0.0);
    }

    // ── validate_code ───────────────────────────────

    #[test]
    fn test_code_valid_alphanum_dash_underscore() {
        assert!(validate_code("M-001_a"));
    }

    #[test]
    fn test_code_empty_invalid() {
        assert!(!validate_code(""));
    }

    #[test]
    fn test_code_space_invalid() {
        assert!(!validate_code("M 001"));
    }

    #[test]
    fn test_code_special_char_invalid() {
        assert!(!validate_code("M@001"));
    }

    // ── validate_tax_rate ─────────────────────────

    #[test]
    fn test_tax_rate_valid_0_13() {
        assert!(validate_tax_rate(0.13));
    }

    #[test]
    fn test_tax_rate_valid_boundary_0_and_1() {
        assert!(validate_tax_rate(0.0));
        assert!(validate_tax_rate(1.0));
    }

    #[test]
    fn test_tax_rate_invalid_above_1() {
        assert!(!validate_tax_rate(1.01));
    }

    #[test]
    fn test_tax_rate_invalid_negative() {
        assert!(!validate_tax_rate(-0.01));
    }

    #[test]
    fn test_tax_rate_invalid_nan() {
        assert!(!validate_tax_rate(f64::NAN));
    }

    // ── validate_quantity ──────────────────────────

    #[test]
    fn test_quantity_valid_positive_and_zero() {
        assert!(validate_quantity(0.0));
        assert!(validate_quantity(100.0));
    }

    #[test]
    fn test_quantity_invalid_negative() {
        assert!(!validate_quantity(-0.01));
    }

    #[test]
    fn test_quantity_invalid_nan_infinity() {
        assert!(!validate_quantity(f64::NAN));
        assert!(!validate_quantity(f64::INFINITY));
    }

    // ── safety_stock ──────────────────────────────

    #[test]
    fn test_safety_alert_triggered() {
        assert!(is_safety_stock_alert(5.0, 10.0));
    }

    #[test]
    fn test_safety_alert_not_triggered_equal() {
        assert!(!is_safety_stock_alert(10.0, 10.0));
    }

    #[test]
    fn test_safety_alert_zero_safety_stock_never() {
        assert!(!is_safety_stock_alert(0.0, 0.0));
    }

    #[test]
    fn test_safety_alert_negative_safety_stock_never() {
        assert!(!is_safety_stock_alert(5.0, -1.0));
    }

    #[test]
    fn test_replenish_suggest_basic() {
        assert_eq!(safety_stock_replenish_suggest(20.0, 50.0), 30.0);
    }

    #[test]
    fn test_replenish_suggest_not_needed() {
        assert_eq!(safety_stock_replenish_suggest(100.0, 50.0), 0.0);
    }

    #[test]
    fn test_replenish_suggest_zero_safety() {
        assert_eq!(safety_stock_replenish_suggest(0.0, 0.0), 0.0);
    }

    // ── 默认状态 ───────────────────────────────────

    #[test]
    fn test_sales_default_status_none_is_draft() {
        assert_eq!(default_sales_order_status(None), "draft");
    }

    #[test]
    fn test_sales_default_status_some() {
        assert_eq!(
            default_sales_order_status(Some("approved".into())),
            "approved"
        );
    }

    #[test]
    fn test_purchase_default_status_pending() {
        assert_eq!(default_purchase_order_status(), "pending");
    }
}

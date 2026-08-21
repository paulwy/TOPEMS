//! 物料/订单模块纯计算函数
//!
//! 从 `modules/material.rs` / `modules/purchase_order.rs` / `modules/sales_order.rs` 提取。

use crate::models::material::PurchaseOrderItem;

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

    #[test]
    fn test_purchase_amounts_basic_3_items() {
        let items = vec![mk_item(10.0, 5.0), mk_item(2.0, 20.0), mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, None, None);
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
        assert_eq!(r.total_amount, 1000.0);
        assert_eq!(r.tax_amount, 130.0);
        assert_eq!(r.discount_amount, 50.0);
        assert_eq!(r.payable_amount, 1080.0);
    }

    #[test]
    fn test_purchase_amounts_negative_item_qty_clamped() {
        let items = vec![mk_item(-5.0, 10.0), mk_item(10.0, 10.0)];
        let r = calculate_purchase_order_amounts(&items, None, None);
        assert_eq!(r.total_amount, 100.0);
    }

    #[test]
    fn test_purchase_amounts_tax_rate_above_1_clamped() {
        let items = vec![mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, Some(2.0), None);
        assert_eq!(r.tax_amount, 100.0);
    }

    #[test]
    fn test_purchase_amounts_negative_discount_rate_clamped() {
        let items = vec![mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, None, Some(-0.5));
        assert_eq!(r.discount_amount, 0.0);
    }

    #[test]
    fn test_purchase_amounts_payable_never_negative() {
        let items = vec![mk_item(1.0, 100.0)];
        let r = calculate_purchase_order_amounts(&items, Some(0.0), Some(1.0));
        assert_eq!(r.payable_amount, 0.0);
    }

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
        assert_eq!(r.payable_amount, 110.0);
    }

    #[test]
    fn test_sales_amounts_computed_payable() {
        let r = calculate_sales_order_amounts(Some(100.0), Some(13.0), Some(5.0), None);
        assert_eq!(r.payable_amount, 108.0);
    }

    #[test]
    fn test_sales_amounts_computed_payable_never_negative() {
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

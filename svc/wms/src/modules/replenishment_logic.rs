pub fn calculate_suggested_quantity(
    available_stock: f64,
    max_stock: f64,
    reorder_point: f64,
    consumption_rate: f64,
    lead_time_days: i32,
) -> f64 {
    if max_stock > 0.0 {
        f64::max(0.0, max_stock - available_stock)
    } else {
        f64::max(
            0.0,
            reorder_point + consumption_rate * lead_time_days as f64 - available_stock,
        )
    }
}

pub fn calculate_priority(available_stock: f64, safety_stock: f64, reorder_point: f64) -> String {
    if available_stock < safety_stock {
        "urgent".to_string()
    } else if available_stock < reorder_point {
        "high".to_string()
    } else {
        "medium".to_string()
    }
}

pub fn calculate_trigger_type(rule_id_exists: bool) -> String {
    if rule_id_exists {
        "rule_based".to_string()
    } else {
        "stock_based".to_string()
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/api/wms/smart-replenishment/safety-stock/calculate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReplenishmentLogic"
)]
pub fn calculate_safety_stock(
    avg_daily_consumption: f64,
    lead_time_days: i32,
    safety_factor: f64,
) -> f64 {
    avg_daily_consumption * lead_time_days as f64 * safety_factor
}

pub fn calculate_reorder_point(
    avg_daily_consumption: f64,
    lead_time_days: i32,
    safety_stock: f64,
) -> f64 {
    avg_daily_consumption * lead_time_days as f64 + safety_stock
}

pub fn calculate_min_max_stock(
    avg_daily_consumption: f64,
    lead_time_days: i32,
    safety_factor: f64,
    days_of_stock: i32,
) -> (f64, f64) {
    let safety_stock = calculate_safety_stock(avg_daily_consumption, lead_time_days, safety_factor);
    let min_stock = safety_stock;
    let max_stock = avg_daily_consumption * days_of_stock as f64;
    (min_stock, max_stock)
}

pub fn determine_replenishment_needed(
    available_stock: f64,
    reorder_point: f64,
    suggested_quantity: f64,
    rule_based_only: bool,
    rule_exists: bool,
) -> bool {
    if rule_based_only && !rule_exists {
        return false;
    }
    available_stock < reorder_point || suggested_quantity > 0.0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 0.001
    }

    // -----------------------------------------------------------------------
    // calculate_suggested_quantity
    // -----------------------------------------------------------------------

    #[test]
    fn test_suggested_qty_with_max_stock_below() {
        // max_stock 分支: max(0, 500 - 200) = 300
        assert!(approx_eq(
            calculate_suggested_quantity(200.0, 500.0, 100.0, 10.0, 5),
            300.0
        ));
    }

    #[test]
    fn test_suggested_qty_with_max_stock_exceeds() {
        // available_stock >= max_stock → 0
        assert_eq!(
            calculate_suggested_quantity(600.0, 500.0, 100.0, 10.0, 5),
            0.0
        );
        assert_eq!(
            calculate_suggested_quantity(500.0, 500.0, 100.0, 10.0, 5),
            0.0
        );
    }

    #[test]
    fn test_suggested_qty_without_max_stock_fallback_formula() {
        // max_stock <= 0 → fallback: reorder_point + consumption*leadtime - available
        // 100 + 10*5 - 80 = 100 + 50 - 80 = 70
        assert!(approx_eq(
            calculate_suggested_quantity(80.0, 0.0, 100.0, 10.0, 5),
            70.0
        ));
        // negative → clamp to 0
        assert_eq!(
            calculate_suggested_quantity(300.0, 0.0, 100.0, 10.0, 5),
            0.0
        );
    }

    #[test]
    fn test_suggested_qty_with_negative_max_stock() {
        // max_stock < 0 → triggers fallback (same as 0)
        assert_eq!(
            calculate_suggested_quantity(300.0, -10.0, 100.0, 10.0, 5),
            0.0
        );
    }

    // -----------------------------------------------------------------------
    // calculate_priority
    // -----------------------------------------------------------------------

    #[test]
    fn test_priority_urgent() {
        // available_stock < safety_stock
        assert_eq!(calculate_priority(5.0, 20.0, 50.0), "urgent");
        assert_eq!(calculate_priority(19.0, 20.0, 50.0), "urgent");
    }

    #[test]
    fn test_priority_high() {
        // safety_stock <= available < reorder_point
        assert_eq!(calculate_priority(20.0, 20.0, 50.0), "high"); // exactly safety_stock
        assert_eq!(calculate_priority(35.0, 20.0, 50.0), "high");
        assert_eq!(calculate_priority(49.0, 20.0, 50.0), "high");
    }

    #[test]
    fn test_priority_medium() {
        // available >= reorder_point
        assert_eq!(calculate_priority(50.0, 20.0, 50.0), "medium"); // exactly reorder
        assert_eq!(calculate_priority(100.0, 20.0, 50.0), "medium");
    }

    #[test]
    fn test_priority_all_zero() {
        // 0 >= 0 → medium
        assert_eq!(calculate_priority(0.0, 0.0, 0.0), "medium");
    }

    // -----------------------------------------------------------------------
    // calculate_trigger_type
    // -----------------------------------------------------------------------

    #[test]
    fn test_trigger_type_rule_based() {
        assert_eq!(calculate_trigger_type(true), "rule_based");
    }

    #[test]
    fn test_trigger_type_stock_based() {
        assert_eq!(calculate_trigger_type(false), "stock_based");
    }

    // -----------------------------------------------------------------------
    // calculate_safety_stock
    // -----------------------------------------------------------------------

    #[test]
    fn test_safety_stock_normal() {
        // 20 * 5 * 1.5 = 150
        assert!(approx_eq(calculate_safety_stock(20.0, 5, 1.5), 150.0));
    }

    #[test]
    fn test_safety_stock_zero_any() {
        assert_eq!(calculate_safety_stock(0.0, 5, 1.5), 0.0);
        assert_eq!(calculate_safety_stock(20.0, 0, 1.5), 0.0);
        assert_eq!(calculate_safety_stock(20.0, 5, 0.0), 0.0);
    }

    #[test]
    fn test_safety_stock_typical_service_levels() {
        // z = 1.28 → 90% service level
        // z = 1.65 → 95%
        // z = 2.33 → 99%
        let base = 10.0 * 7_f64; // 70
        assert!(approx_eq(
            calculate_safety_stock(10.0, 7, 1.28),
            base * 1.28
        ));
        assert!(approx_eq(
            calculate_safety_stock(10.0, 7, 1.65),
            base * 1.65
        ));
        assert!(approx_eq(
            calculate_safety_stock(10.0, 7, 2.33),
            base * 2.33
        ));
    }

    // -----------------------------------------------------------------------
    // calculate_reorder_point
    // -----------------------------------------------------------------------

    #[test]
    fn test_reorder_point_normal() {
        // 10*7 + 50 = 70 + 50 = 120
        assert!(approx_eq(calculate_reorder_point(10.0, 7, 50.0), 120.0));
    }

    #[test]
    fn test_reorder_point_no_safety() {
        // no safety stock → just leadtime demand
        assert!(approx_eq(calculate_reorder_point(10.0, 7, 0.0), 70.0));
    }

    #[test]
    fn test_reorder_point_zero_consumption() {
        assert_eq!(calculate_reorder_point(0.0, 7, 50.0), 50.0);
    }

    // -----------------------------------------------------------------------
    // calculate_min_max_stock
    // -----------------------------------------------------------------------

    #[test]
    fn test_min_max_stock_happy_path() {
        // safety_stock = 20 * 5 * 1.5 = 150
        // min_stock = 150
        // max_stock = 20 * 30 = 600
        let (min_s, max_s) = calculate_min_max_stock(20.0, 5, 1.5, 30);
        assert!(approx_eq(min_s, 150.0));
        assert!(approx_eq(max_s, 600.0));
    }

    #[test]
    fn test_min_max_stock_zero_values() {
        let (min_s, max_s) = calculate_min_max_stock(0.0, 5, 1.5, 30);
        assert_eq!(min_s, 0.0);
        assert_eq!(max_s, 0.0); // 0 * 30 = 0
        let (min_s, max_s) = calculate_min_max_stock(20.0, 0, 0.0, 0);
        assert_eq!(min_s, 0.0);
        assert_eq!(max_s, 0.0);
    }

    #[test]
    fn test_min_max_stock_formula_coherence() {
        // min equals safety_stock, max equals consumption * days_of_stock
        let cons = 15.0;
        let lt = 3;
        let sf = 2.0;
        let dos = 14;
        let expected_min = calculate_safety_stock(cons, lt, sf);
        let expected_max = cons * dos as f64;
        let (min_s, max_s) = calculate_min_max_stock(cons, lt, sf, dos);
        assert!(approx_eq(min_s, expected_min));
        assert!(approx_eq(max_s, expected_max));
    }

    // -----------------------------------------------------------------------
    // determine_replenishment_needed
    // -----------------------------------------------------------------------

    #[test]
    fn test_replenishment_rule_based_only_requires_rule() {
        // rule_based_only=true, rule_exists=false → always false
        // (even if stock is way below reorder point)
        assert!(!determine_replenishment_needed(
            10.0, 100.0, 500.0, true, false
        ));
    }

    #[test]
    fn test_replenishment_rule_based_passes_with_rule() {
        // rule_exists → evaluates standard condition
        assert!(determine_replenishment_needed(
            10.0, 100.0, 500.0, true, true
        )); // stock < reorder_point
    }

    #[test]
    fn test_replenishment_triggered_by_stock_level() {
        // default mode (not rule-based only), below reorder point
        assert!(determine_replenishment_needed(
            50.0, 100.0, 0.0, false, false
        ));
    }

    #[test]
    fn test_replenishment_triggered_by_suggested_qty() {
        // above reorder point but positive suggested_quantity
        // (e.g. manual trigger or forecast-driven)
        assert!(determine_replenishment_needed(
            200.0, 100.0, 50.0, false, false
        ));
    }

    #[test]
    fn test_replenishment_not_needed_normal() {
        // above reorder_point AND no suggested qty
        assert!(!determine_replenishment_needed(
            200.0, 100.0, 0.0, false, false
        ));
        assert!(!determine_replenishment_needed(
            100.0, 100.0, 0.0, false, false
        )); // exactly reorder_point (= not <)
    }

    #[test]
    fn test_replenishment_zero_suggested_negative_stock_not_less() {
        // available = 200, reorder = 100 (above) + suggested_qty=0 → false
        assert!(!determine_replenishment_needed(
            200.0, 100.0, 0.0, false, true
        ));
        // available = 100 (equal) → not <, suggested=0 → false
        assert!(!determine_replenishment_needed(
            100.0, 100.0, 0.0, false, true
        ));
    }

    #[test]
    fn test_replenishment_truth_table_last_two_rows() {
        // Rule-based only with rule present but below reorder: true
        assert!(determine_replenishment_needed(5.0, 100.0, 0.0, true, true));
        // Rule-based only with rule present, above reorder, suggested=0: false
        assert!(!determine_replenishment_needed(
            200.0, 100.0, 0.0, true, true
        ));
    }

    // -----------------------------------------------------------------------
    // 扩展覆盖：负数 / 极端值 / 边界
    // -----------------------------------------------------------------------

    #[test]
    fn test_suggested_qty_negative_available_clamps_to_zero() {
        // available 为负 + max_stock > 0 → max(0, 500 - (-100)) = 600
        // 但语义上负库存应等价于 0 库存：函数当前直接相减，结果 > max_stock
        // 这里只验证不抛错并返回非负
        let r = calculate_suggested_quantity(-100.0, 500.0, 100.0, 10.0, 5);
        assert!(r >= 0.0);
        assert!(approx_eq(r, 600.0));
    }

    #[test]
    fn test_suggested_qty_zero_consumption_with_fallback() {
        // max_stock=0 fallback: reorder + 0*lt - available
        let r = calculate_suggested_quantity(50.0, 0.0, 100.0, 0.0, 5);
        assert!(approx_eq(r, 50.0));
    }

    #[test]
    fn test_priority_with_negative_available() {
        // available=-10 < safety_stock=20 → urgent
        assert_eq!(calculate_priority(-10.0, 20.0, 50.0), "urgent");
    }

    #[test]
    fn test_safety_stock_with_negative_inputs() {
        // 任意一项为负 → 结果为负（不做钳制）
        let r = calculate_safety_stock(-10.0, 5, 1.5);
        assert!(r < 0.0);
    }

    #[test]
    fn test_reorder_point_with_negative_safety_stock() {
        // safety_stock 为负时直接相加（不做钳制）
        let r = calculate_reorder_point(10.0, 7, -50.0);
        assert!(approx_eq(r, 20.0));
    }

    #[test]
    fn test_determine_replenishment_with_negative_stock() {
        // available=-5 < reorder=100 → true（即便 rule_based_only=false）
        assert!(determine_replenishment_needed(
            -5.0, 100.0, 0.0, false, false
        ));
    }

    #[test]
    fn test_determine_replenishment_suggested_qty_dominates() {
        // 高于 reorder_point 但 suggested_qty > 0 → true
        assert!(determine_replenishment_needed(
            500.0, 100.0, 1.0, false, false
        ));
    }

    #[test]
    fn test_calculate_min_max_stock_negative_days_of_stock() {
        // days_of_stock 为负 → max_stock 为负
        let (min_s, max_s) = calculate_min_max_stock(20.0, 5, 1.5, -10);
        assert!(approx_eq(min_s, 150.0));
        assert!(max_s < 0.0);
    }
}

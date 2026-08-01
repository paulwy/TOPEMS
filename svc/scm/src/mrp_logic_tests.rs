#![cfg(test)]

use crate::modules::mrp::*;

#[test]
fn test_net_requirement_basic() {
    // 100 + 10 − 30 + 5 − 20 = 65
    assert_eq!(
        calculate_net_requirement(100.0, 30.0, 5.0, 20.0, 10.0),
        65.0
    );
}

#[test]
fn test_net_requirement_negative_returns_zero() {
    assert_eq!(
        calculate_net_requirement(50.0, 100.0, 10.0, 20.0, 10.0),
        0.0
    );
}

#[test]
fn test_net_requirement_zero_demand_with_safety_stock() {
    assert_eq!(calculate_net_requirement(0.0, 30.0, 0.0, 0.0, 10.0), 0.0);
}

#[test]
fn test_net_requirement_all_zero() {
    assert_eq!(calculate_net_requirement(0.0, 0.0, 0.0, 0.0, 0.0), 0.0);
}

#[test]
fn test_net_requirement_only_in_transit() {
    // 在途库存充足时净需求为 0
    assert_eq!(calculate_net_requirement(100.0, 50.0, 0.0, 80.0, 10.0), 0.0);
}

#[test]
fn test_safety_stock_classic() {
    // 10/天 × 7天 × 1.65 = 115.5
    assert_eq!(calculate_safety_stock(10.0, 7.0, 1.65), 115.5);
}

#[test]
fn test_safety_stock_zero_demand() {
    assert_eq!(calculate_safety_stock(0.0, 7.0, 1.65), 0.0);
}

#[test]
fn test_safety_stock_negative_inputs() {
    assert_eq!(calculate_safety_stock(-10.0, 7.0, 1.65), 0.0);
}

#[test]
fn test_eoq_classic_formula() {
    // sqrt(2 × 1000 × 50 / 4) ≈ 158.1138
    let r = calculate_eoq(1000.0, 50.0, 4.0).unwrap();
    assert!((r - 158.1138).abs() < 0.01);
}

#[test]
fn test_eoq_zero_holding_cost_returns_error() {
    assert!(calculate_eoq(1000.0, 50.0, 0.0).is_err());
}

#[test]
fn test_eoq_negative_demand_returns_error() {
    assert!(calculate_eoq(-100.0, 50.0, 4.0).is_err());
}

#[test]
fn test_eoq_zero_demand() {
    let r = calculate_eoq(0.0, 50.0, 4.0).unwrap();
    assert_eq!(r, 0.0);
}

#[test]
fn test_lot_sizing_lfl() {
    assert_eq!(apply_lot_sizing(75.0, LotSizingRule::LFL, 0.0, 1.0), 75.0);
}

#[test]
fn test_lot_sizing_foq_rounds_up() {
    // 75 / 50 = 1.5 → 2 批 → 100
    assert_eq!(
        apply_lot_sizing(75.0, LotSizingRule::FOQ(50.0), 0.0, 1.0),
        100.0
    );
}

#[test]
fn test_lot_sizing_applies_moq() {
    assert_eq!(apply_lot_sizing(10.0, LotSizingRule::LFL, 50.0, 1.0), 50.0);
}

#[test]
fn test_lot_sizing_applies_pack_multiple() {
    // 75 → ceil(75/12)=7 → 84
    assert_eq!(apply_lot_sizing(75.0, LotSizingRule::LFL, 0.0, 12.0), 84.0);
}

#[test]
fn test_lot_sizing_zero_requirement() {
    assert_eq!(
        apply_lot_sizing(0.0, LotSizingRule::FOQ(50.0), 100.0, 1.0),
        0.0
    );
}

#[test]
fn test_lot_sizing_foq_exact_multiple() {
    // 100 / 50 = 2 → 100
    assert_eq!(
        apply_lot_sizing(100.0, LotSizingRule::FOQ(50.0), 0.0, 1.0),
        100.0
    );
}

#[test]
fn test_order_date_with_lead_time() {
    let required = chrono::NaiveDate::from_ymd_opt(2026, 9, 1).unwrap();
    assert_eq!(
        calculate_order_date(required, 7),
        chrono::NaiveDate::from_ymd_opt(2026, 8, 25).unwrap()
    );
}

#[test]
fn test_order_date_zero_lead_time() {
    let required = chrono::NaiveDate::from_ymd_opt(2026, 9, 1).unwrap();
    assert_eq!(calculate_order_date(required, 0), required);
}

#[test]
fn test_order_date_negative_lead_time() {
    // 负提前期（异常但函数应不 panic）
    let required = chrono::NaiveDate::from_ymd_opt(2026, 9, 1).unwrap();
    assert_eq!(
        calculate_order_date(required, -5),
        chrono::NaiveDate::from_ymd_opt(2026, 9, 6).unwrap()
    );
}

// ============ compute_mrp_suggestion 组合函数测试 ============

#[test]
fn test_compute_mrp_suggestion_basic_with_safety_stock() {
    // 毛需求 300，库存 100，无分配/在途，提前期 7 天，预测 30 天，服务水平 1.65
    // avg_daily = 300/30 = 10
    // safety_stock = 10 × 7 × 1.65 = 115.5
    // net = 300 + 115.5 - 100 + 0 - 0 = 315.5
    // LFL → suggested = 315.5
    let (suggested, safety_stock, net) =
        compute_mrp_suggestion(300.0, 100.0, 0.0, 0.0, 7, 30, 1.65);
    assert!((safety_stock - 115.5).abs() < 0.001);
    assert!((net - 315.5).abs() < 0.001);
    assert!((suggested - 315.5).abs() < 0.001);
}

#[test]
fn test_compute_mrp_suggestion_zero_gross_returns_zero() {
    // 毛需求为 0 时，安全库存为 0，净需求为 0，建议量 0
    let (suggested, safety_stock, net) = compute_mrp_suggestion(0.0, 50.0, 0.0, 0.0, 7, 30, 1.65);
    assert_eq!(safety_stock, 0.0);
    assert_eq!(net, 0.0);
    assert_eq!(suggested, 0.0);
}

#[test]
fn test_compute_mrp_suggestion_in_transit_offsets_demand() {
    // 在途库存可抵消毛需求：300 - 200 + SS 仍 > 0
    // avg_daily = 300/30 = 10, SS = 10×7×1.65 = 115.5
    // net = 300 + 115.5 - 50 + 0 - 200 = 165.5
    let (suggested, _, net) = compute_mrp_suggestion(300.0, 50.0, 0.0, 200.0, 7, 30, 1.65);
    assert!((net - 165.5).abs() < 0.001);
    assert!((suggested - 165.5).abs() < 0.001);
}

#[test]
fn test_compute_mrp_suggestion_allocated_increases_demand() {
    // 已分配库存会增加净需求：销售占用的库存不能用于新需求
    // avg_daily = 300/30 = 10, SS = 10×7×1.65 = 115.5
    // net = 300 + 115.5 - 80 + 30 - 0 = 365.5
    let (suggested, _, net) = compute_mrp_suggestion(300.0, 80.0, 30.0, 0.0, 7, 30, 1.65);
    assert!((net - 365.5).abs() < 0.001);
    assert!((suggested - 365.5).abs() < 0.001);
}

#[test]
fn test_compute_mrp_suggestion_zero_lead_time_no_safety_stock() {
    // 提前期为 0 时安全库存为 0，净需求 = 毛需求 - 库存
    let (suggested, safety_stock, net) = compute_mrp_suggestion(200.0, 50.0, 0.0, 0.0, 0, 30, 1.65);
    assert_eq!(safety_stock, 0.0);
    assert_eq!(net, 150.0);
    assert_eq!(suggested, 150.0);
}

#[test]
fn test_compute_mrp_suggestion_zero_forecast_days_avoids_div_by_zero() {
    // forecast_days = 0 时退化为 avg_daily=0，安全库存=0，不应 panic
    let (suggested, safety_stock, net) = compute_mrp_suggestion(200.0, 50.0, 0.0, 0.0, 7, 0, 1.65);
    assert_eq!(safety_stock, 0.0);
    assert_eq!(net, 150.0);
    assert_eq!(suggested, 150.0);
}

#[test]
fn test_compute_mrp_suggestion_high_service_level_factor() {
    // 服务水平因子越大，安全库存越大，建议量越大
    let (_, ss_low, _) = compute_mrp_suggestion(300.0, 100.0, 0.0, 0.0, 7, 30, 1.65);
    let (_, ss_high, _) = compute_mrp_suggestion(300.0, 100.0, 0.0, 0.0, 7, 30, 2.33);
    assert!(ss_high > ss_low);
}

#[test]
fn test_compute_mrp_suggestion_surplus_stock_returns_zero() {
    // 库存远大于毛需求 + 安全库存时，净需求为 0（max(0, ...) 保护）
    let (suggested, _, net) = compute_mrp_suggestion(100.0, 1000.0, 0.0, 0.0, 7, 30, 1.65);
    assert_eq!(net, 0.0);
    assert_eq!(suggested, 0.0);
}

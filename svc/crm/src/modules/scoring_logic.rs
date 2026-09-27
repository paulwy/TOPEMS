use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;

pub fn calculate_score_level(score: i32) -> String {
    if score >= 80 {
        "A".to_string()
    } else if score >= 60 {
        "B".to_string()
    } else if score >= 40 {
        "C".to_string()
    } else {
        "D".to_string()
    }
}

pub fn calculate_trend(last_score: Option<i32>, current_score: i32) -> String {
    match last_score {
        Some(last) if current_score > last => "up".to_string(),
        Some(last) if current_score < last => "down".to_string(),
        _ => "stable".to_string(),
    }
}

pub fn calculate_revenue_score(
    revenue: Option<Decimal>,
    total_opportunity_value: Option<Decimal>,
) -> i32 {
    let total_value =
        revenue.unwrap_or(Decimal::ZERO) + total_opportunity_value.unwrap_or(Decimal::ZERO);

    let value_f64: f64 = total_value.to_f64().unwrap_or(0.0);

    if value_f64 >= 1_000_000.0 {
        100
    } else if value_f64 >= 500_000.0 {
        80
    } else if value_f64 >= 100_000.0 {
        60
    } else if value_f64 >= 50_000.0 {
        40
    } else if value_f64 >= 10_000.0 {
        20
    } else {
        10
    }
}

pub fn calculate_opportunity_score(opportunity_count: i64, won_count: i64) -> i32 {
    if opportunity_count == 0 {
        return 10;
    }

    let win_rate = if opportunity_count > 0 {
        (won_count as f64 / opportunity_count as f64) * 100.0
    } else {
        0.0
    };

    let volume_score = if opportunity_count >= 10 {
        60
    } else if opportunity_count >= 5 {
        45
    } else if opportunity_count >= 3 {
        30
    } else if opportunity_count >= 1 {
        15
    } else {
        10
    };

    let win_rate_score = if win_rate >= 70.0 {
        40
    } else if win_rate >= 50.0 {
        30
    } else if win_rate >= 30.0 {
        20
    } else {
        10
    };

    volume_score + win_rate_score
}

pub fn calculate_interaction_score(interaction_count: i64) -> i32 {
    if interaction_count >= 20 {
        100
    } else if interaction_count >= 10 {
        80
    } else if interaction_count >= 5 {
        60
    } else if interaction_count >= 3 {
        40
    } else if interaction_count >= 1 {
        20
    } else {
        10
    }
}

pub fn calculate_loyalty_score(years_since_created: i64, status: Option<&str>) -> i32 {
    let base_score = if years_since_created >= 5 {
        60
    } else if years_since_created >= 3 {
        45
    } else if years_since_created >= 1 {
        30
    } else {
        15
    };

    let status_bonus = if status == Some("active") {
        40
    } else if status == Some("inactive") {
        20
    } else {
        10
    };

    base_score + status_bonus
}

pub fn calculate_total_score(
    revenue_score: i32,
    opportunity_score: i32,
    interaction_score: i32,
    loyalty_score: i32,
) -> i32 {
    let total_score =
        (revenue_score * 35 + opportunity_score * 30 + interaction_score * 20 + loyalty_score * 15)
            / 100;

    total_score.clamp(10, 100)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;

    // -----------------------------------------------------------------------
    // calculate_score_level
    // -----------------------------------------------------------------------

    #[test]
    fn test_score_level_a_boundary() {
        assert_eq!(calculate_score_level(100), "A");
        assert_eq!(calculate_score_level(80), "A");
        assert_eq!(calculate_score_level(95), "A");
    }

    #[test]
    fn test_score_level_b_boundary() {
        assert_eq!(calculate_score_level(79), "B");
        assert_eq!(calculate_score_level(60), "B");
        assert_eq!(calculate_score_level(70), "B");
    }

    #[test]
    fn test_score_level_c_boundary() {
        assert_eq!(calculate_score_level(59), "C");
        assert_eq!(calculate_score_level(40), "C");
        assert_eq!(calculate_score_level(50), "C");
    }

    #[test]
    fn test_score_level_d_boundary() {
        assert_eq!(calculate_score_level(39), "D");
        assert_eq!(calculate_score_level(10), "D");
        assert_eq!(calculate_score_level(0), "D");
    }

    // -----------------------------------------------------------------------
    // calculate_trend
    // -----------------------------------------------------------------------

    #[test]
    fn test_trend_up_various() {
        assert_eq!(calculate_trend(Some(70), 80), "up");
        assert_eq!(calculate_trend(Some(0), 1), "up");
        assert_eq!(calculate_trend(Some(99), 100), "up");
    }

    #[test]
    fn test_trend_down_various() {
        assert_eq!(calculate_trend(Some(80), 70), "down");
        assert_eq!(calculate_trend(Some(1), 0), "down");
        assert_eq!(calculate_trend(Some(100), 99), "down");
    }

    #[test]
    fn test_trend_stable_cases() {
        // equal
        assert_eq!(calculate_trend(Some(80), 80), "stable");
        assert_eq!(calculate_trend(Some(0), 0), "stable");
        // None last_score → stable
        assert_eq!(calculate_trend(None, 80), "stable");
        assert_eq!(calculate_trend(None, 0), "stable");
    }

    // -----------------------------------------------------------------------
    // calculate_revenue_score
    // -----------------------------------------------------------------------

    #[test]
    fn test_revenue_score_both_none() {
        assert_eq!(calculate_revenue_score(None, None), 10);
    }

    #[test]
    fn test_revenue_score_zero_values() {
        assert_eq!(
            calculate_revenue_score(Some(Decimal::ZERO), Some(Decimal::ZERO)),
            10
        );
    }

    #[test]
    fn test_revenue_score_tiers_revenue_only() {
        // tier 100: >= 1_000_000
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(1_000_000)), None),
            100
        );
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(2_000_000)), None),
            100
        );
        // tier 80: >= 500_000
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(500_000)), None),
            80
        );
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(750_000)), None),
            80
        );
        // tier 60: >= 100_000
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(100_000)), None),
            60
        );
        // tier 40: >= 50_000
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(50_000)), None),
            40
        );
        // tier 20: >= 10_000
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(10_000)), None),
            20
        );
        // tier 10: < 10_000
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(9_999)), None),
            10
        );
        assert_eq!(calculate_revenue_score(Some(Decimal::from(0)), None), 10);
    }

    #[test]
    fn test_revenue_score_combined_sum() {
        // 500k revenue + 500k opportunity = 1M total → tier 100
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(500_000)), Some(Decimal::from(500_000))),
            100
        );
        // 60k revenue + 50k opportunity = 110k total → tier 60
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(60_000)), Some(Decimal::from(50_000))),
            60
        );
        // 5k revenue + 5k opportunity = 10k total → tier 20
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(5_000)), Some(Decimal::from(5_000))),
            20
        );
    }

    #[test]
    fn test_revenue_score_opportunity_only() {
        assert_eq!(
            calculate_revenue_score(None, Some(Decimal::from(1_000_000))),
            100
        );
        assert_eq!(
            calculate_revenue_score(None, Some(Decimal::from(500_000))),
            80
        );
        assert_eq!(
            calculate_revenue_score(None, Some(Decimal::from(9_999))),
            10
        );
    }

    #[test]
    fn test_revenue_score_tier_lower_bounds() {
        // just below threshold for each tier
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(999_999)), None),
            80
        ); // below 1M → 80
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(499_999)), None),
            60
        ); // below 500k → 60
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(99_999)), None),
            40
        ); // below 100k → 40
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(49_999)), None),
            20
        ); // below 50k → 20
    }

    // -----------------------------------------------------------------------
    // calculate_opportunity_score
    // -----------------------------------------------------------------------

    #[test]
    fn test_opportunity_score_zero_count() {
        assert_eq!(calculate_opportunity_score(0, 0), 10);
        assert_eq!(calculate_opportunity_score(0, 10), 10); // won_count ignored when count=0
    }

    #[test]
    fn test_opportunity_score_volume_only() {
        // All won_count=0 → win_rate_score=10, volume_score varies
        // count=1 → volume 15 + win_rate 10 = 25
        assert_eq!(calculate_opportunity_score(1, 0), 25);
        // count=2 → volume 15 + win_rate 10 = 25
        assert_eq!(calculate_opportunity_score(2, 0), 25);
        // count=3 → volume 30 + 10 = 40
        assert_eq!(calculate_opportunity_score(3, 0), 40);
        // count=5 → volume 45 + 10 = 55
        assert_eq!(calculate_opportunity_score(5, 0), 55);
        // count=10 → volume 60 + 10 = 70
        assert_eq!(calculate_opportunity_score(10, 0), 70);
    }

    #[test]
    fn test_opportunity_score_win_rate_tiers() {
        // volume=10 (count >=10 → 60), vary win_rate
        // 100% win rate → 60 + 40 = 100
        assert_eq!(calculate_opportunity_score(10, 10), 100);
        // 70% → 60 + 40 = 100
        assert_eq!(calculate_opportunity_score(10, 7), 100);
        // 69% → 60 + 30 = 90
        assert_eq!(calculate_opportunity_score(100, 69), 90);
        // 50% → 60 + 30 = 90
        assert_eq!(calculate_opportunity_score(10, 5), 90);
        // 49% → 60 + 20 = 80
        assert_eq!(calculate_opportunity_score(100, 49), 80);
        // 30% → 60 + 20 = 80
        assert_eq!(calculate_opportunity_score(10, 3), 80);
        // 29% → 60 + 10 = 70
        assert_eq!(calculate_opportunity_score(100, 29), 70);
    }

    #[test]
    fn test_opportunity_score_happy_typical() {
        // 5 opportunities, 3 won → 60% win rate
        // volume: count>=5 → 45; win_rate 60% in [50,70) → 30; total = 75
        assert_eq!(calculate_opportunity_score(5, 3), 75);
        // 3 opportunities, 1 won → 33% win rate
        // volume: count>=3 → 30; win_rate 33% in [30,50) → 20; total = 50
        assert_eq!(calculate_opportunity_score(3, 1), 50);
    }

    // -----------------------------------------------------------------------
    // calculate_interaction_score
    // -----------------------------------------------------------------------

    #[test]
    fn test_interaction_score_tiers() {
        assert_eq!(calculate_interaction_score(0), 10);
        assert_eq!(calculate_interaction_score(1), 20);
        assert_eq!(calculate_interaction_score(2), 20);
        assert_eq!(calculate_interaction_score(3), 40);
        assert_eq!(calculate_interaction_score(4), 40);
        assert_eq!(calculate_interaction_score(5), 60);
        assert_eq!(calculate_interaction_score(9), 60);
        assert_eq!(calculate_interaction_score(10), 80);
        assert_eq!(calculate_interaction_score(19), 80);
        assert_eq!(calculate_interaction_score(20), 100);
        assert_eq!(calculate_interaction_score(100), 100);
    }

    // -----------------------------------------------------------------------
    // calculate_loyalty_score
    // -----------------------------------------------------------------------

    #[test]
    fn test_loyalty_score_years_base() {
        // status=None → status_bonus=10
        assert_eq!(calculate_loyalty_score(0, None), 15 + 10); // <1yr → 15 + 10
        assert_eq!(calculate_loyalty_score(1, None), 30 + 10); // >=1yr → 30 + 10
        assert_eq!(calculate_loyalty_score(3, None), 45 + 10); // >=3yr → 45 + 10
        assert_eq!(calculate_loyalty_score(5, None), 60 + 10); // >=5yr → 60 + 10
        assert_eq!(calculate_loyalty_score(10, None), 60 + 10);
    }

    #[test]
    fn test_loyalty_score_status_bonus() {
        // active → +40, inactive → +20, other/None → +10
        assert_eq!(calculate_loyalty_score(5, Some("active")), 60 + 40); // 100
        assert_eq!(calculate_loyalty_score(5, Some("inactive")), 60 + 20); // 80
        assert_eq!(calculate_loyalty_score(5, Some("suspended")), 60 + 10); // 70
        assert_eq!(calculate_loyalty_score(0, Some("active")), 15 + 40); // 55
        assert_eq!(calculate_loyalty_score(1, Some("active")), 30 + 40); // 70
        assert_eq!(calculate_loyalty_score(3, Some("inactive")), 45 + 20); // 65
    }

    #[test]
    fn test_loyalty_score_boundary_years() {
        // exactly at thresholds
        assert_eq!(calculate_loyalty_score(0, Some("active")), 55);
        assert_eq!(calculate_loyalty_score(1, Some("active")), 70);
        assert_eq!(calculate_loyalty_score(3, Some("active")), 85);
        assert_eq!(calculate_loyalty_score(5, Some("active")), 100);
        // just below thresholds (0 vs <1, 2 vs <3, 4 vs <5)
        assert_eq!(calculate_loyalty_score(2, Some("active")), 70); // <3yr: base 30 + 40
        assert_eq!(calculate_loyalty_score(4, Some("active")), 85); // <5yr: base 45 + 40
    }

    // -----------------------------------------------------------------------
    // calculate_total_score
    // -----------------------------------------------------------------------

    #[test]
    fn test_total_score_max() {
        // (100*35 + 100*30 + 100*20 + 100*15) / 100 = 10000/100 = 100
        assert_eq!(calculate_total_score(100, 100, 100, 100), 100);
    }

    #[test]
    fn test_total_score_clamped() {
        // even with 0, minimum clamp is 10
        // (0*35 + 0*30 + 0*20 + 0*15) / 100 = 0 → clamp to 10
        assert_eq!(calculate_total_score(0, 0, 0, 0), 10);
        // very low values that result in <10
        // 10,10,10,10 → (350+300+200+150)/100 = 1000/100 = 10
        assert_eq!(calculate_total_score(10, 10, 10, 10), 10);
        // 5,5,5,5 → (175+150+100+75)/100 = 500/100 = 5 → clamp to 10
        assert_eq!(calculate_total_score(5, 5, 5, 5), 10);
    }

    #[test]
    fn test_total_score_happy_path() {
        // Typical "good" customer: revenue=80, opp=70, interaction=60, loyalty=50
        // 80*35=2800, 70*30=2100, 60*20=1200, 50*15=750
        // sum = 6850 → 6850/100 = 68
        assert_eq!(calculate_total_score(80, 70, 60, 50), 68);

        // Typical "mid" customer: all 50
        // (1750 + 1500 + 1000 + 750)/100 = 5000/100 = 50
        assert_eq!(calculate_total_score(50, 50, 50, 50), 50);

        // Individual high revenue only: 100, 10, 10, 10
        // 3500 + 300 + 200 + 150 = 4150 → 41
        assert_eq!(calculate_total_score(100, 10, 10, 10), 41);
    }

    #[test]
    fn test_total_score_high_values_not_over_100() {
        // 200 all around would give 200 → clamp to 100
        assert_eq!(calculate_total_score(200, 200, 200, 200), 100);
        // 150 → weighted 150 → clamp to 100
        assert_eq!(calculate_total_score(150, 150, 150, 150), 100);
    }

    #[test]
    fn test_total_score_weighting_weights() {
        // revenue weight 35%: 100, others 10 → 41 (as above)
        // opportunity weight 30%: others 10, opp 100
        // 350 + 3000 + 200 + 150 = 3700 → 37
        assert_eq!(calculate_total_score(10, 100, 10, 10), 37);
        // interaction weight 20%:
        // 350 + 300 + 2000 + 150 = 2800 → 28
        assert_eq!(calculate_total_score(10, 10, 100, 10), 28);
        // loyalty weight 15%:
        // 350 + 300 + 200 + 1500 = 2350 → 23
        assert_eq!(calculate_total_score(10, 10, 10, 100), 23);
        // Verifying: revenue (35) > opp (30) > interaction (20) > loyalty (15)
    }
}

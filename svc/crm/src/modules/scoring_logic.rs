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

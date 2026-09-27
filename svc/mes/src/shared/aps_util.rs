use chrono::{DateTime, NaiveDate, Utc};

pub fn validate_resource_id(id: &str) -> bool {
    if id.is_empty() || id.len() > 64 {
        return false;
    }
    id.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == ':')
}

pub fn normalize_code(code: &str) -> String {
    topems_shared_core::normalize_code(code)
}

pub fn calc_duration_minutes(start: DateTime<Utc>, end: DateTime<Utc>) -> Option<i64> {
    if end < start {
        return None;
    }
    let dur = end - start;
    Some(dur.num_minutes())
}

pub fn check_capacity_overload(used_hours: f64, available_hours: f64) -> bool {
    if available_hours <= 0.0 {
        return used_hours > 0.0;
    }
    used_hours > available_hours
}

pub fn calc_utilization_rate(used_hours: f64, available_hours: f64) -> Option<f64> {
    if available_hours <= 0.0 {
        return None;
    }
    let rate = used_hours / available_hours;
    if rate < 0.0 {
        None
    } else {
        Some(rate.min(1.0))
    }
}

pub fn calc_shortfall_quantity(required: f64, available: f64) -> f64 {
    let shortfall = required - available;
    if shortfall < 0.0 {
        0.0
    } else {
        shortfall
    }
}

pub fn calc_forecast_accuracy(forecast: f64, actual: f64) -> Option<f64> {
    if forecast <= 0.0 {
        return None;
    }
    let diff = (forecast - actual).abs();
    let rate = 1.0 - (diff / forecast);
    Some(rate.max(0.0).min(1.0))
}

pub fn is_valid_plan_no(plan_no: &str) -> bool {
    if plan_no.is_empty() || plan_no.len() > 64 {
        return false;
    }
    plan_no
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn normalize_date_range(
    start: Option<NaiveDate>,
    end: Option<NaiveDate>,
) -> Option<(NaiveDate, NaiveDate)> {
    match (start, end) {
        (Some(s), Some(e)) => {
            if e >= s {
                Some((s, e))
            } else {
                Some((e, s))
            }
        }
        _ => None,
    }
}

pub fn days_between(start: NaiveDate, end: NaiveDate) -> i64 {
    let dur = end - start;
    dur.num_days().abs()
}

pub fn is_valid_forecast_period(period: &str) -> bool {
    matches!(
        period,
        "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
    )
}

pub fn is_valid_supply_type(supply_type: &str) -> bool {
    matches!(
        supply_type,
        "purchase" | "production" | "transfer" | "consignment"
    )
}

pub fn calc_remaining_hours(available: f64, used: f64) -> f64 {
    let remaining = available - used;
    if remaining < 0.0 {
        0.0
    } else {
        remaining
    }
}

pub fn is_priority_valid(priority: i32) -> bool {
    (-10..=10).contains(&priority)
}

/// Calculate capacity utilization rate (clamped to [0.0, 1.0]).
pub fn calc_capacity_utilization(planned_hours: f64, available_hours: f64) -> f64 {
    if available_hours <= 0.0 {
        return 0.0;
    }
    let rate = planned_hours / available_hours;
    if rate < 0.0 {
        0.0
    } else {
        rate.min(1.0)
    }
}

/// Error type for APS validation helpers.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum ApsError {
    #[error("invalid production order number: {0}")]
    InvalidProductionOrderNo(String),
}

/// Validate a production order number (non-empty, ≤64 chars, alphanumeric/-/_).
pub fn validate_production_order_no(order_no: &str) -> Result<(), ApsError> {
    if order_no.is_empty() || order_no.len() > 64 {
        return Err(ApsError::InvalidProductionOrderNo(order_no.to_string()));
    }
    if !order_no
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(ApsError::InvalidProductionOrderNo(order_no.to_string()));
    }
    Ok(())
}

/// Check that routing step sequence is strictly increasing with no duplicates.
pub fn is_valid_routing_step(step_sequence: &[u32]) -> bool {
    if step_sequence.is_empty() {
        return false;
    }
    let mut seen = std::collections::HashSet::new();
    for &step in step_sequence {
        if !seen.insert(step) {
            return false;
        }
    }
    step_sequence.windows(2).all(|w| w[0] < w[1])
}

/// Calculate throughput rate (units per hour). Returns 0.0 for non-positive time.
pub fn calc_throughput_rate(units_produced: f64, time_hours: f64) -> f64 {
    if time_hours <= 0.0 {
        return 0.0;
    }
    let rate = units_produced / time_hours;
    if rate < 0.0 {
        0.0
    } else {
        rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, TimeZone, Utc};

    #[test]
    fn test_validate_resource_id_valid() {
        assert!(validate_resource_id("abc123"));
        assert!(validate_resource_id("res-001:part"));
        assert!(validate_resource_id("A_B-C:123"));
    }

    #[test]
    fn test_validate_resource_id_invalid() {
        assert!(!validate_resource_id(""));
        assert!(!validate_resource_id("a".repeat(65).as_str()));
        assert!(!validate_resource_id("abc 123"));
        assert!(!validate_resource_id("abc@123"));
    }

    #[test]
    fn test_normalize_code() {
        assert_eq!(normalize_code("  abc  "), "ABC");
        assert_eq!(normalize_code("PlAn-0 01"), "PLAN-001");
        assert_eq!(normalize_code("\tcode\n123\t"), "CODE123");
    }

    #[test]
    fn test_calc_duration_minutes() {
        let start = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(8, 0, 0)
                .unwrap(),
        );
        let end = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(9, 30, 0)
                .unwrap(),
        );
        assert_eq!(calc_duration_minutes(start, end), Some(90));

        let end2 = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(7, 0, 0)
                .unwrap(),
        );
        assert_eq!(calc_duration_minutes(start, end2), None);
    }

    #[test]
    fn test_calc_duration_minutes_same_time() {
        let t = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(8, 0, 0)
                .unwrap(),
        );
        assert_eq!(calc_duration_minutes(t, t), Some(0));
    }

    #[test]
    fn test_check_capacity_overload() {
        assert!(!check_capacity_overload(5.0, 10.0));
        assert!(check_capacity_overload(15.0, 10.0));
        assert!(!check_capacity_overload(10.0, 10.0));
        assert!(check_capacity_overload(1.0, 0.0));
        assert!(!check_capacity_overload(0.0, 0.0));
    }

    #[test]
    fn test_calc_utilization_rate() {
        assert_eq!(calc_utilization_rate(5.0, 10.0), Some(0.5));
        assert_eq!(calc_utilization_rate(10.0, 10.0), Some(1.0));
        assert_eq!(calc_utilization_rate(15.0, 10.0), Some(1.0));
        assert_eq!(calc_utilization_rate(5.0, 0.0), None);
        assert_eq!(calc_utilization_rate(-1.0, 10.0), None);
    }

    #[test]
    fn test_calc_shortfall_quantity() {
        assert_eq!(calc_shortfall_quantity(100.0, 80.0), 20.0);
        assert_eq!(calc_shortfall_quantity(80.0, 100.0), 0.0);
        assert_eq!(calc_shortfall_quantity(100.0, 100.0), 0.0);
        assert_eq!(calc_shortfall_quantity(0.0, 0.0), 0.0);
    }

    #[test]
    fn test_calc_forecast_accuracy() {
        assert_eq!(calc_forecast_accuracy(100.0, 100.0), Some(1.0));
        assert_eq!(calc_forecast_accuracy(100.0, 90.0), Some(0.9));
        assert_eq!(calc_forecast_accuracy(100.0, 110.0), Some(0.9));
        assert_eq!(calc_forecast_accuracy(100.0, 0.0), Some(0.0));
        assert_eq!(calc_forecast_accuracy(0.0, 100.0), None);
        assert_eq!(calc_forecast_accuracy(100.0, 200.0), Some(0.0));
    }

    #[test]
    fn test_is_valid_plan_no() {
        assert!(is_valid_plan_no("PLAN-001"));
        assert!(is_valid_plan_no("plan_2024_01"));
        assert!(is_valid_plan_no("A1"));
        assert!(!is_valid_plan_no(""));
        assert!(!is_valid_plan_no("a".repeat(65).as_str()));
        assert!(!is_valid_plan_no("PLAN 001"));
    }

    #[test]
    fn test_normalize_date_range() {
        let d1 = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let d2 = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();
        assert_eq!(normalize_date_range(Some(d1), Some(d2)), Some((d1, d2)));
        assert_eq!(normalize_date_range(Some(d2), Some(d1)), Some((d1, d2)));
        assert_eq!(normalize_date_range(None, Some(d1)), None);
        assert_eq!(normalize_date_range(Some(d1), None), None);
    }

    #[test]
    fn test_days_between() {
        let d1 = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let d2 = NaiveDate::from_ymd_opt(2024, 1, 11).unwrap();
        assert_eq!(days_between(d1, d2), 10);
        assert_eq!(days_between(d2, d1), 10);
        assert_eq!(days_between(d1, d1), 0);
    }

    #[test]
    fn test_is_valid_forecast_period() {
        assert!(is_valid_forecast_period("daily"));
        assert!(is_valid_forecast_period("weekly"));
        assert!(is_valid_forecast_period("monthly"));
        assert!(is_valid_forecast_period("quarterly"));
        assert!(is_valid_forecast_period("yearly"));
        assert!(!is_valid_forecast_period("hourly"));
        assert!(!is_valid_forecast_period(""));
    }

    #[test]
    fn test_is_valid_supply_type() {
        assert!(is_valid_supply_type("purchase"));
        assert!(is_valid_supply_type("production"));
        assert!(is_valid_supply_type("transfer"));
        assert!(is_valid_supply_type("consignment"));
        assert!(!is_valid_supply_type("rental"));
        assert!(!is_valid_supply_type(""));
    }

    #[test]
    fn test_calc_remaining_hours() {
        assert_eq!(calc_remaining_hours(10.0, 3.0), 7.0);
        assert_eq!(calc_remaining_hours(10.0, 10.0), 0.0);
        assert_eq!(calc_remaining_hours(10.0, 15.0), 0.0);
        assert_eq!(calc_remaining_hours(0.0, 0.0), 0.0);
    }

    #[test]
    fn test_is_priority_valid() {
        assert!(is_priority_valid(0));
        assert!(is_priority_valid(-10));
        assert!(is_priority_valid(10));
        assert!(is_priority_valid(5));
        assert!(!is_priority_valid(-11));
        assert!(!is_priority_valid(11));
    }

    // ===== Edge case tests for existing functions =====

    #[test]
    fn test_validate_resource_id_boundary_64() {
        assert!(validate_resource_id(&"a".repeat(64)));
        assert!(!validate_resource_id(&"a".repeat(65)));
    }

    #[test]
    fn test_validate_resource_id_single_char() {
        assert!(validate_resource_id("a"));
        assert!(validate_resource_id("_"));
        assert!(validate_resource_id("-"));
        assert!(validate_resource_id(":"));
    }

    #[test]
    fn test_validate_resource_id_special_chars_rejected() {
        assert!(!validate_resource_id("res@001"));
        assert!(!validate_resource_id("res#1"));
        assert!(!validate_resource_id("res.1"));
        assert!(!validate_resource_id("res/1"));
    }

    #[test]
    fn test_normalize_code_empty() {
        assert_eq!(normalize_code(""), "");
        assert_eq!(normalize_code("   "), "");
    }

    #[test]
    fn test_normalize_code_already_upper() {
        assert_eq!(normalize_code("ABC"), "ABC");
        assert_eq!(normalize_code("ABC-001"), "ABC-001");
    }

    #[test]
    fn test_normalize_code_mixed_case() {
        assert_eq!(normalize_code("AbC"), "ABC");
        assert_eq!(normalize_code("xYz_123"), "XYZ_123");
    }

    #[test]
    fn test_calc_duration_minutes_cross_day() {
        let start = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(22, 0, 0)
                .unwrap(),
        );
        let end = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 1, 2)
                .unwrap()
                .and_hms_opt(2, 0, 0)
                .unwrap(),
        );
        assert_eq!(calc_duration_minutes(start, end), Some(240));
    }

    #[test]
    fn test_calc_duration_minutes_multi_hour() {
        let start = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 3, 1)
                .unwrap()
                .and_hms_opt(6, 0, 0)
                .unwrap(),
        );
        let end = Utc.from_utc_datetime(
            &NaiveDate::from_ymd_opt(2024, 3, 1)
                .unwrap()
                .and_hms_opt(18, 30, 0)
                .unwrap(),
        );
        assert_eq!(calc_duration_minutes(start, end), Some(750));
    }

    #[test]
    fn test_check_capacity_overload_equal_boundary() {
        assert!(!check_capacity_overload(10.0, 10.0));
        assert!(check_capacity_overload(10.01, 10.0));
    }

    #[test]
    fn test_check_capacity_overload_negative_available() {
        assert!(check_capacity_overload(1.0, -5.0));
        assert!(!check_capacity_overload(0.0, -5.0));
    }

    #[test]
    fn test_calc_utilization_rate_zero_used() {
        assert_eq!(calc_utilization_rate(0.0, 10.0), Some(0.0));
    }

    #[test]
    fn test_calc_utilization_rate_small_fraction() {
        assert_eq!(calc_utilization_rate(1.0, 3.0), Some(1.0 / 3.0));
    }

    #[test]
    fn test_calc_shortfall_quantity_large_gap() {
        assert_eq!(calc_shortfall_quantity(10000.0, 1.0), 9999.0);
    }

    #[test]
    fn test_calc_forecast_accuracy_negative_actual() {
        assert_eq!(calc_forecast_accuracy(100.0, -50.0), Some(0.0));
    }

    #[test]
    fn test_is_valid_plan_no_numeric_only() {
        assert!(is_valid_plan_no("123456"));
        assert!(is_valid_plan_no("0001"));
    }

    #[test]
    fn test_normalize_date_range_same_date() {
        let d = NaiveDate::from_ymd_opt(2024, 6, 15).unwrap();
        assert_eq!(normalize_date_range(Some(d), Some(d)), Some((d, d)));
    }

    #[test]
    fn test_days_between_year_boundary() {
        let d1 = NaiveDate::from_ymd_opt(2023, 12, 31).unwrap();
        let d2 = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        assert_eq!(days_between(d1, d2), 1);
    }

    #[test]
    fn test_is_valid_forecast_period_case_sensitive() {
        assert!(!is_valid_forecast_period("Daily"));
        assert!(!is_valid_forecast_period("WEEKLY"));
        assert!(!is_valid_forecast_period("MONTH"));
    }

    #[test]
    fn test_calc_remaining_hours_negative_available() {
        assert_eq!(calc_remaining_hours(-5.0, 0.0), 0.0);
        assert_eq!(calc_remaining_hours(-5.0, 10.0), 0.0);
    }

    #[test]
    fn test_is_priority_valid_mid_range() {
        assert!(is_priority_valid(-5));
        assert!(is_priority_valid(7));
        assert!(is_priority_valid(-1));
    }

    // ===== Tests for new helper functions =====

    #[test]
    fn test_calc_capacity_utilization_normal() {
        assert!((calc_capacity_utilization(5.0, 10.0) - 0.5).abs() < 1e-9);
        assert!((calc_capacity_utilization(8.0, 10.0) - 0.8).abs() < 1e-9);
    }

    #[test]
    fn test_calc_capacity_utilization_zero_available() {
        assert_eq!(calc_capacity_utilization(5.0, 0.0), 0.0);
        assert_eq!(calc_capacity_utilization(5.0, -10.0), 0.0);
    }

    #[test]
    fn test_calc_capacity_utilization_over_capacity() {
        assert_eq!(calc_capacity_utilization(15.0, 10.0), 1.0);
        assert_eq!(calc_capacity_utilization(100.0, 10.0), 1.0);
    }

    #[test]
    fn test_calc_capacity_utilization_zero_planned() {
        assert_eq!(calc_capacity_utilization(0.0, 10.0), 0.0);
    }

    #[test]
    fn test_validate_production_order_no_valid() {
        assert!(validate_production_order_no("PO-2024-001").is_ok());
        assert!(validate_production_order_no("ORDER_001").is_ok());
        assert!(validate_production_order_no("ABC123").is_ok());
    }

    #[test]
    fn test_validate_production_order_no_empty() {
        assert!(validate_production_order_no("").is_err());
    }

    #[test]
    fn test_validate_production_order_no_too_long() {
        assert!(validate_production_order_no(&"a".repeat(65)).is_err());
    }

    #[test]
    fn test_validate_production_order_no_invalid_chars() {
        assert!(validate_production_order_no("PO 001").is_err());
        assert!(validate_production_order_no("PO@001").is_err());
        assert!(validate_production_order_no("PO.001").is_err());
    }

    #[test]
    fn test_validate_production_order_no_error_message() {
        let err = validate_production_order_no("").unwrap_err();
        assert!(matches!(err, ApsError::InvalidProductionOrderNo(_)));
        let msg = format!("{}", err);
        assert!(msg.contains("invalid production order number"));
    }

    #[test]
    fn test_is_valid_routing_step_valid() {
        assert!(is_valid_routing_step(&[1, 2, 3]));
        assert!(is_valid_routing_step(&[10, 20, 30, 40]));
        assert!(is_valid_routing_step(&[1]));
    }

    #[test]
    fn test_is_valid_routing_step_empty() {
        assert!(!is_valid_routing_step(&[]));
    }

    #[test]
    fn test_is_valid_routing_step_not_increasing() {
        assert!(!is_valid_routing_step(&[3, 2, 1]));
        assert!(!is_valid_routing_step(&[1, 3, 2]));
        assert!(!is_valid_routing_step(&[5, 5]));
    }

    #[test]
    fn test_is_valid_routing_step_duplicates() {
        assert!(!is_valid_routing_step(&[1, 2, 2]));
        assert!(!is_valid_routing_step(&[5, 5, 6]));
    }

    #[test]
    fn test_calc_throughput_rate_normal() {
        assert!((calc_throughput_rate(100.0, 5.0) - 20.0).abs() < 1e-9);
        assert!((calc_throughput_rate(50.0, 2.5) - 20.0).abs() < 1e-9);
    }

    #[test]
    fn test_calc_throughput_rate_zero_time() {
        assert_eq!(calc_throughput_rate(100.0, 0.0), 0.0);
        assert_eq!(calc_throughput_rate(100.0, -1.0), 0.0);
    }

    #[test]
    fn test_calc_throughput_rate_zero_units() {
        assert_eq!(calc_throughput_rate(0.0, 5.0), 0.0);
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;
    use chrono::Duration;

    #[test]
    fn test_validate_resource_id_valid() {
        assert!(validate_resource_id("resource_001"));
        assert!(validate_resource_id("MACHINE-001:LINE-1"));
        assert!(validate_resource_id("abc123"));
    }

    #[test]
    fn test_validate_resource_id_invalid() {
        assert!(!validate_resource_id(""));
        assert!(!validate_resource_id("a".repeat(65).as_str()));
        assert!(!validate_resource_id("resource@001"));
        assert!(!validate_resource_id("resource 001"));
    }

    #[test]
    fn test_calc_duration_minutes_normal() {
        let start = Utc::now();
        let end = start + Duration::minutes(30);
        assert_eq!(calc_duration_minutes(start, end), Some(30));
    }

    #[test]
    fn test_calc_duration_minutes_negative() {
        let start = Utc::now();
        let end = start - Duration::minutes(30);
        assert_eq!(calc_duration_minutes(start, end), None);
    }

    #[test]
    fn test_check_capacity_overload() {
        assert!(check_capacity_overload(10.0, 8.0));
        assert!(!check_capacity_overload(8.0, 10.0));
        assert!(check_capacity_overload(1.0, 0.0));
        assert!(!check_capacity_overload(0.0, 0.0));
    }

    #[test]
    fn test_calc_utilization_rate() {
        assert!((calc_utilization_rate(8.0, 10.0).unwrap() - 0.8).abs() < 1e-9);
        assert!((calc_utilization_rate(12.0, 10.0).unwrap() - 1.0).abs() < 1e-9);
        assert_eq!(calc_utilization_rate(8.0, 0.0), None);
        assert_eq!(calc_utilization_rate(-1.0, 10.0), None);
    }

    #[test]
    fn test_calc_shortfall_quantity() {
        assert!((calc_shortfall_quantity(100.0, 80.0) - 20.0).abs() < 1e-9);
        assert!((calc_shortfall_quantity(80.0, 100.0) - 0.0).abs() < 1e-9);
        assert!((calc_shortfall_quantity(100.0, 100.0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_calc_forecast_accuracy() {
        assert!((calc_forecast_accuracy(100.0, 90.0).unwrap() - 0.9).abs() < 1e-9);
        assert!((calc_forecast_accuracy(100.0, 110.0).unwrap() - 0.9).abs() < 1e-9);
        assert_eq!(calc_forecast_accuracy(0.0, 90.0), None);
        assert!((calc_forecast_accuracy(100.0, 200.0).unwrap() - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_is_valid_plan_no() {
        assert!(is_valid_plan_no("PO-2024-001"));
        assert!(is_valid_plan_no("PLAN_001"));
        assert!(!is_valid_plan_no(""));
        assert!(!is_valid_plan_no("PO@2024"));
    }

    #[test]
    fn test_is_valid_forecast_period() {
        assert!(is_valid_forecast_period("daily"));
        assert!(is_valid_forecast_period("weekly"));
        assert!(is_valid_forecast_period("monthly"));
        assert!(is_valid_forecast_period("quarterly"));
        assert!(is_valid_forecast_period("yearly"));
        assert!(!is_valid_forecast_period("hourly"));
    }
}

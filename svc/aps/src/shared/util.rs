use chrono::{Duration, NaiveDate, NaiveDateTime};

pub fn validate_resource_id(id: &str) -> bool {
    if id.is_empty() || id.len() > 64 {
        return false;
    }
    id.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == ':')
}

pub fn normalize_code(code: &str) -> String {
    code.trim().to_uppercase().replace([' ', '\t', '\n'], "")
}

pub fn calc_duration_minutes(start: NaiveDateTime, end: NaiveDateTime) -> Option<i64> {
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
    priority >= -10 && priority <= 10
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

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
        let start = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(8, 0, 0)
            .unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(9, 30, 0)
            .unwrap();
        assert_eq!(calc_duration_minutes(start, end), Some(90));

        let end2 = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(7, 0, 0)
            .unwrap();
        assert_eq!(calc_duration_minutes(start, end2), None);
    }

    #[test]
    fn test_calc_duration_minutes_same_time() {
        let t = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(8, 0, 0)
            .unwrap();
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
}

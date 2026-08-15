//! Pure domain helpers for the analytics service.
//!
//! All functions are pure (no I/O, no async) and safe to unit-test in
//! isolation. Helpers cover report-name validation, chart-type / filter-
//! operator validation, data-source validation, refresh-interval checks,
//! metric-name normalization, aggregation calculation, percentage-change and
//! growth-rate arithmetic, and date-range validation.

use thiserror::Error;

/// Analytics domain error returned by validation helpers.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum AnalyticsError {
    #[error("invalid report name: {0}")]
    InvalidReportName(String),
    #[error("invalid data source: {0}")]
    InvalidDataSource(String),
    #[error("invalid aggregation: {0}")]
    InvalidAggregation(String),
    #[error("invalid date range: {0}")]
    InvalidDateRange(String),
}

/// Validate a report name.
///
/// A valid report name is 1-100 characters long after trimming and contains
/// at least one non-whitespace character.
pub fn validate_report_name(name: &str) -> Result<(), AnalyticsError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AnalyticsError::InvalidReportName(
            "empty report name".to_string(),
        ));
    }
    let len = trimmed.chars().count();
    if len > 100 {
        return Err(AnalyticsError::InvalidReportName(
            "report name must be at most 100 characters".to_string(),
        ));
    }
    Ok(())
}

/// Return `true` if `chart_type` is one of the recognized chart types.
pub fn is_valid_chart_type(chart_type: &str) -> bool {
    matches!(
        chart_type,
        "line" | "bar" | "pie" | "scatter" | "area" | "histogram" | "gauge" | "table"
    )
}

/// Calculate an aggregation over a slice of values.
///
/// Supported `agg_type` values: `sum`, `avg`, `min`, `max`, `count`.
/// Returns `Err` for unknown aggregation types or empty slices (except
/// `count` which returns `0.0` for empty slices).
pub fn calc_aggregation(values: &[f64], agg_type: &str) -> Result<f64, AnalyticsError> {
    match agg_type {
        "sum" => {
            if values.is_empty() {
                return Err(AnalyticsError::InvalidAggregation(
                    "cannot sum empty slice".to_string(),
                ));
            }
            Ok(values.iter().sum())
        }
        "avg" => {
            if values.is_empty() {
                return Err(AnalyticsError::InvalidAggregation(
                    "cannot average empty slice".to_string(),
                ));
            }
            let sum: f64 = values.iter().sum();
            Ok(sum / values.len() as f64)
        }
        "min" => {
            if values.is_empty() {
                return Err(AnalyticsError::InvalidAggregation(
                    "cannot find min of empty slice".to_string(),
                ));
            }
            Ok(values.iter().cloned().fold(f64::INFINITY, f64::min))
        }
        "max" => {
            if values.is_empty() {
                return Err(AnalyticsError::InvalidAggregation(
                    "cannot find max of empty slice".to_string(),
                ));
            }
            Ok(values.iter().cloned().fold(f64::NEG_INFINITY, f64::max))
        }
        "count" => Ok(values.len() as f64),
        other => Err(AnalyticsError::InvalidAggregation(format!(
            "unknown aggregation type: {other}"
        ))),
    }
}

/// Validate a data source identifier.
///
/// A valid data source starts with a letter or underscore and contains only
/// alphanumeric characters, underscores, and dots.
pub fn validate_data_source(source: &str) -> Result<(), AnalyticsError> {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return Err(AnalyticsError::InvalidDataSource(
            "empty data source".to_string(),
        ));
    }
    let mut chars = trimmed.chars();
    let first = chars.next().expect("checked non-empty");
    if !(first.is_ascii_alphabetic() || first == '_') {
        return Err(AnalyticsError::InvalidDataSource(format!(
            "data source must start with a letter or underscore: {trimmed}"
        )));
    }
    if !chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.') {
        return Err(AnalyticsError::InvalidDataSource(format!(
            "data source contains invalid characters: {trimmed}"
        )));
    }
    Ok(())
}

/// Return `true` if `seconds` is a valid refresh interval (5–86400 seconds).
pub fn is_valid_refresh_interval(seconds: u32) -> bool {
    (5..=86400).contains(&seconds)
}

/// Normalize a metric name: trim, lowercase, replace whitespace runs with
/// underscores.
pub fn normalize_metric_name(name: &str) -> String {
    name.trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join("_")
}

/// Calculate the percentage change from `old` to `new`.
///
/// Returns `0.0` when `old` is `0.0` to avoid division by zero.
pub fn calc_percentage_change(old: f64, new: f64) -> f64 {
    if old == 0.0 {
        return 0.0;
    }
    ((new - old) / old) * 100.0
}

/// Return `true` if `operator` is one of the recognized filter operators.
pub fn is_valid_filter_operator(operator: &str) -> bool {
    matches!(
        operator,
        "eq" | "ne"
            | "gt"
            | "gte"
            | "lt"
            | "lte"
            | "in"
            | "not_in"
            | "like"
            | "is_null"
            | "is_not_null"
    )
}

/// Validate that a date range is well-formed: `start` must be strictly before
/// `end`.
pub fn validate_date_range(start: i64, end: i64) -> Result<(), AnalyticsError> {
    if start >= end {
        return Err(AnalyticsError::InvalidDateRange(format!(
            "start ({start}) must be before end ({end})"
        )));
    }
    Ok(())
}

/// Calculate the growth rate from `previous` to `current`.
///
/// Returns `None` when `previous` is `0.0` (growth rate is undefined).
/// Otherwise returns `(current - previous) / previous`.
pub fn calc_growth_rate(previous: f64, current: f64) -> Option<f64> {
    if previous == 0.0 {
        return None;
    }
    Some((current - previous) / previous)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== validate_report_name ==========

    #[test]
    fn test_validate_report_name_valid() {
        assert!(validate_report_name("Q3 Sales Report").is_ok());
    }

    #[test]
    fn test_validate_report_name_single_char() {
        assert!(validate_report_name("X").is_ok());
    }

    #[test]
    fn test_validate_report_name_max_length() {
        let name = "a".repeat(100);
        assert!(validate_report_name(&name).is_ok());
    }

    #[test]
    fn test_validate_report_name_trims_whitespace() {
        assert!(validate_report_name("  Report  ").is_ok());
    }

    #[test]
    fn test_validate_report_name_empty() {
        assert!(validate_report_name("").is_err());
    }

    #[test]
    fn test_validate_report_name_only_whitespace() {
        assert!(validate_report_name("   ").is_err());
    }

    #[test]
    fn test_validate_report_name_too_long() {
        let name = "a".repeat(101);
        assert!(validate_report_name(&name).is_err());
    }

    #[test]
    fn test_validate_report_name_unicode() {
        assert!(validate_report_name("销售报表").is_ok());
    }

    #[test]
    fn test_validate_report_name_error_type() {
        let err = validate_report_name("").unwrap_err();
        assert_eq!(
            err,
            AnalyticsError::InvalidReportName("empty report name".to_string())
        );
    }

    // ========== is_valid_chart_type ==========

    #[test]
    fn test_chart_type_valid_all() {
        for t in [
            "line",
            "bar",
            "pie",
            "scatter",
            "area",
            "histogram",
            "gauge",
            "table",
        ] {
            assert!(is_valid_chart_type(t), "chart type {t} should be valid");
        }
    }

    #[test]
    fn test_chart_type_invalid_values() {
        assert!(!is_valid_chart_type("radar"));
        assert!(!is_valid_chart_type(""));
        assert!(!is_valid_chart_type("LINE"));
        assert!(!is_valid_chart_type("line "));
    }

    // ========== calc_aggregation ==========

    #[test]
    fn test_aggregation_sum() {
        assert!((calc_aggregation(&[1.0, 2.0, 3.0], "sum").unwrap() - 6.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_sum_single() {
        assert!((calc_aggregation(&[42.0], "sum").unwrap() - 42.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_avg() {
        assert!((calc_aggregation(&[1.0, 2.0, 3.0], "avg").unwrap() - 2.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_min() {
        assert!((calc_aggregation(&[3.0, 1.0, 2.0], "min").unwrap() - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_max() {
        assert!((calc_aggregation(&[1.0, 3.0, 2.0], "max").unwrap() - 3.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_count() {
        assert!((calc_aggregation(&[1.0, 2.0, 3.0], "count").unwrap() - 3.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_count_empty() {
        assert!((calc_aggregation(&[], "count").unwrap() - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_sum_empty_err() {
        assert!(calc_aggregation(&[], "sum").is_err());
    }

    #[test]
    fn test_aggregation_avg_empty_err() {
        assert!(calc_aggregation(&[], "avg").is_err());
    }

    #[test]
    fn test_aggregation_min_empty_err() {
        assert!(calc_aggregation(&[], "min").is_err());
    }

    #[test]
    fn test_aggregation_max_empty_err() {
        assert!(calc_aggregation(&[], "max").is_err());
    }

    #[test]
    fn test_aggregation_unknown_type() {
        assert!(calc_aggregation(&[1.0], "median").is_err());
    }

    #[test]
    fn test_aggregation_with_negatives() {
        assert!((calc_aggregation(&[-1.0, 1.0], "sum").unwrap() - 0.0).abs() < 1e-9);
        assert!((calc_aggregation(&[-1.0, 1.0], "avg").unwrap() - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_min_negative() {
        assert!((calc_aggregation(&[-5.0, 0.0, 5.0], "min").unwrap() - (-5.0)).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_max_negative() {
        assert!((calc_aggregation(&[-5.0, 0.0, 5.0], "max").unwrap() - 5.0).abs() < 1e-9);
    }

    #[test]
    fn test_aggregation_sum_empty_error_type() {
        let err = calc_aggregation(&[], "sum").unwrap_err();
        assert!(matches!(err, AnalyticsError::InvalidAggregation(_)));
    }

    #[test]
    fn test_aggregation_unknown_error_message() {
        let err = calc_aggregation(&[1.0], "median").unwrap_err();
        let msg = format!("{}", err);
        assert!(msg.contains("median"));
    }

    // ========== validate_data_source ==========

    #[test]
    fn test_validate_data_source_valid_simple() {
        assert!(validate_data_source("orders").is_ok());
    }

    #[test]
    fn test_validate_data_source_valid_underscore() {
        assert!(validate_data_source("_private_table").is_ok());
    }

    #[test]
    fn test_validate_data_source_valid_with_dot() {
        assert!(validate_data_source("schema.table").is_ok());
    }

    #[test]
    fn test_validate_data_source_valid_alphanumeric() {
        assert!(validate_data_source("table_123").is_ok());
    }

    #[test]
    fn test_validate_data_source_trims_whitespace() {
        assert!(validate_data_source("  orders  ").is_ok());
    }

    #[test]
    fn test_validate_data_source_empty() {
        assert!(validate_data_source("").is_err());
    }

    #[test]
    fn test_validate_data_source_only_whitespace() {
        assert!(validate_data_source("   ").is_err());
    }

    #[test]
    fn test_validate_data_source_starts_with_digit() {
        assert!(validate_data_source("1table").is_err());
    }

    #[test]
    fn test_validate_data_source_starts_with_hyphen() {
        assert!(validate_data_source("-table").is_err());
    }

    #[test]
    fn test_validate_data_source_contains_space() {
        assert!(validate_data_source("my table").is_err());
    }

    #[test]
    fn test_validate_data_source_contains_hyphen() {
        assert!(validate_data_source("my-table").is_err());
    }

    #[test]
    fn test_validate_data_source_sql_injection_attempt() {
        assert!(validate_data_source("orders; DROP TABLE users").is_err());
    }

    #[test]
    fn test_validate_data_source_error_type() {
        let err = validate_data_source("").unwrap_err();
        assert_eq!(
            err,
            AnalyticsError::InvalidDataSource("empty data source".to_string())
        );
    }

    // ========== is_valid_refresh_interval ==========

    #[test]
    fn test_refresh_interval_valid() {
        assert!(is_valid_refresh_interval(5));
        assert!(is_valid_refresh_interval(30));
        assert!(is_valid_refresh_interval(3600));
        assert!(is_valid_refresh_interval(86400));
    }

    #[test]
    fn test_refresh_interval_too_low() {
        assert!(!is_valid_refresh_interval(0));
        assert!(!is_valid_refresh_interval(4));
    }

    #[test]
    fn test_refresh_interval_too_high() {
        assert!(!is_valid_refresh_interval(86401));
        assert!(!is_valid_refresh_interval(u32::MAX));
    }

    #[test]
    fn test_refresh_interval_boundaries() {
        assert!(is_valid_refresh_interval(5));
        assert!(is_valid_refresh_interval(86400));
        assert!(!is_valid_refresh_interval(4));
        assert!(!is_valid_refresh_interval(86401));
    }

    // ========== normalize_metric_name ==========

    #[test]
    fn test_normalize_metric_name_basic() {
        assert_eq!(normalize_metric_name("  Total Revenue  "), "total_revenue");
    }

    #[test]
    fn test_normalize_metric_name_lowercase() {
        assert_eq!(normalize_metric_name("AvgOrderValue"), "avgordervalue");
    }

    #[test]
    fn test_normalize_metric_name_multiple_spaces() {
        assert_eq!(
            normalize_metric_name("daily  active  users"),
            "daily_active_users"
        );
    }

    #[test]
    fn test_normalize_metric_name_empty() {
        assert_eq!(normalize_metric_name(""), "");
    }

    #[test]
    fn test_normalize_metric_name_only_whitespace() {
        assert_eq!(normalize_metric_name("   "), "");
    }

    #[test]
    fn test_normalize_metric_name_no_change() {
        assert_eq!(normalize_metric_name("revenue"), "revenue");
    }

    #[test]
    fn test_normalize_metric_name_tabs_newlines() {
        assert_eq!(
            normalize_metric_name("daily\tactive\nusers"),
            "daily_active_users"
        );
    }

    #[test]
    fn test_normalize_metric_name_unicode() {
        assert_eq!(normalize_metric_name("日活 用户"), "日活_用户");
    }

    // ========== calc_percentage_change ==========

    #[test]
    fn test_percentage_change_increase() {
        assert!((calc_percentage_change(100.0, 150.0) - 50.0).abs() < 1e-9);
    }

    #[test]
    fn test_percentage_change_decrease() {
        assert!((calc_percentage_change(100.0, 50.0) - (-50.0)).abs() < 1e-9);
    }

    #[test]
    fn test_percentage_change_no_change() {
        assert!((calc_percentage_change(100.0, 100.0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_percentage_change_zero_old() {
        assert!((calc_percentage_change(0.0, 100.0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_percentage_change_both_zero() {
        assert!((calc_percentage_change(0.0, 0.0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_percentage_change_negative_old() {
        // ((-50) - (-100)) / (-100) * 100 = 50 / -100 * 100 = -50.0
        assert!((calc_percentage_change(-100.0, -50.0) - (-50.0)).abs() < 1e-9);
    }

    #[test]
    fn test_percentage_change_doubling() {
        assert!((calc_percentage_change(50.0, 100.0) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn test_percentage_change_halving() {
        assert!((calc_percentage_change(200.0, 100.0) - (-50.0)).abs() < 1e-9);
    }

    // ========== is_valid_filter_operator ==========

    #[test]
    fn test_filter_operator_valid_all() {
        for op in [
            "eq",
            "ne",
            "gt",
            "gte",
            "lt",
            "lte",
            "in",
            "not_in",
            "like",
            "is_null",
            "is_not_null",
        ] {
            assert!(
                is_valid_filter_operator(op),
                "operator {op} should be valid"
            );
        }
    }

    #[test]
    fn test_filter_operator_invalid_values() {
        assert!(!is_valid_filter_operator("between"));
        assert!(!is_valid_filter_operator(""));
        assert!(!is_valid_filter_operator("EQ"));
        assert!(!is_valid_filter_operator("eq "));
    }

    // ========== validate_date_range ==========

    #[test]
    fn test_validate_date_range_valid() {
        assert!(validate_date_range(1000, 2000).is_ok());
    }

    #[test]
    fn test_validate_date_range_equal_rejected() {
        assert!(validate_date_range(1000, 1000).is_err());
    }

    #[test]
    fn test_validate_date_range_inverted_rejected() {
        assert!(validate_date_range(2000, 1000).is_err());
    }

    #[test]
    fn test_validate_date_range_zero_start() {
        assert!(validate_date_range(0, 1).is_ok());
    }

    #[test]
    fn test_validate_date_range_negative() {
        assert!(validate_date_range(-100, -50).is_ok());
        assert!(validate_date_range(-50, -100).is_err());
    }

    #[test]
    fn test_validate_date_range_large_values() {
        assert!(validate_date_range(1_700_000_000, 1_700_000_001).is_ok());
        assert!(validate_date_range(1_700_000_001, 1_700_000_000).is_err());
    }

    #[test]
    fn test_validate_date_range_error_type() {
        let err = validate_date_range(100, 50).unwrap_err();
        assert!(matches!(err, AnalyticsError::InvalidDateRange(_)));
    }

    #[test]
    fn test_validate_date_range_error_message() {
        let err = validate_date_range(100, 50).unwrap_err();
        let msg = format!("{}", err);
        assert!(msg.contains("100"));
        assert!(msg.contains("50"));
    }

    // ========== calc_growth_rate ==========

    #[test]
    fn test_growth_rate_positive() {
        let rate = calc_growth_rate(100.0, 150.0).unwrap();
        assert!((rate - 0.5).abs() < 1e-9);
    }

    #[test]
    fn test_growth_rate_negative() {
        let rate = calc_growth_rate(100.0, 50.0).unwrap();
        assert!((rate - (-0.5)).abs() < 1e-9);
    }

    #[test]
    fn test_growth_rate_no_change() {
        let rate = calc_growth_rate(100.0, 100.0).unwrap();
        assert!((rate - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_growth_rate_zero_previous_none() {
        assert!(calc_growth_rate(0.0, 100.0).is_none());
    }

    #[test]
    fn test_growth_rate_both_zero_none() {
        assert!(calc_growth_rate(0.0, 0.0).is_none());
    }

    #[test]
    fn test_growth_rate_negative_previous() {
        // (-50 - (-100)) / (-100) = 50 / -100 = -0.5
        let rate = calc_growth_rate(-100.0, -50.0).unwrap();
        assert!((rate - (-0.5)).abs() < 1e-9);
    }

    #[test]
    fn test_growth_rate_doubling() {
        let rate = calc_growth_rate(50.0, 100.0).unwrap();
        assert!((rate - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_growth_rate_halving() {
        let rate = calc_growth_rate(200.0, 100.0).unwrap();
        assert!((rate - (-0.5)).abs() < 1e-9);
    }

    #[test]
    fn test_growth_rate_previous_to_current_zero() {
        let rate = calc_growth_rate(100.0, 0.0).unwrap();
        assert!((rate - (-1.0)).abs() < 1e-9);
    }

    // ========== AnalyticsError structural / Display ==========

    #[test]
    fn test_analytics_error_debug_clone() {
        let err = AnalyticsError::InvalidReportName("bad".to_string());
        let cloned = err.clone();
        assert_eq!(err, cloned);
        let debug = format!("{:?}", err);
        assert!(debug.contains("InvalidReportName"));
    }

    #[test]
    fn test_analytics_error_display_invalid_report_name() {
        let err = AnalyticsError::InvalidReportName("bad".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid report name"));
        assert!(msg.contains("bad"));
    }

    #[test]
    fn test_analytics_error_display_invalid_data_source() {
        let err = AnalyticsError::InvalidDataSource("bad".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid data source"));
        assert!(msg.contains("bad"));
    }

    #[test]
    fn test_analytics_error_display_invalid_aggregation() {
        let err = AnalyticsError::InvalidAggregation("bad".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid aggregation"));
        assert!(msg.contains("bad"));
    }

    #[test]
    fn test_analytics_error_display_invalid_date_range() {
        let err = AnalyticsError::InvalidDateRange("bad".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid date range"));
        assert!(msg.contains("bad"));
    }

    #[test]
    fn test_analytics_error_eq_variants() {
        let a = AnalyticsError::InvalidReportName("x".to_string());
        let b = AnalyticsError::InvalidDataSource("x".to_string());
        assert_ne!(a, b);
        assert_eq!(a, AnalyticsError::InvalidReportName("x".to_string()));
    }

    #[test]
    fn test_analytics_error_is_std_error() {
        fn assert_error<T: std::error::Error>(_: T) {}
        assert_error(AnalyticsError::InvalidReportName("e".to_string()));
        assert_error(AnalyticsError::InvalidDataSource("e".to_string()));
        assert_error(AnalyticsError::InvalidAggregation("e".to_string()));
        assert_error(AnalyticsError::InvalidDateRange("e".to_string()));
    }
}

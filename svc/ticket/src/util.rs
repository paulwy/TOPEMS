//! Pure domain helpers for the ticket service.
//!
//! All functions are pure (no I/O, no async) and safe to unit-test in
//! isolation. Helpers cover ticket-number validation, title normalization,
//! status-transition FSM checks, priority/category/channel validation, SLA
//! breach arithmetic, and resolution-rate calculation.

use thiserror::Error;

/// Ticket domain error returned by validation helpers.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum TicketError {
    #[error("invalid ticket number: {0}")]
    InvalidTicketNo(String),
    #[error("invalid ticket category: {0}")]
    InvalidCategory(String),
    #[error("invalid ticket title: {0}")]
    InvalidTitle(String),
    #[error("invalid ticket channel: {0}")]
    InvalidChannel(String),
}

/// Validate a ticket number.
///
/// A valid ticket number starts with an uppercase alphabetic prefix of at
/// least 2 characters followed by at least 6 digits. Example: `TK000001`.
pub fn validate_ticket_no(ticket_no: &str) -> Result<(), TicketError> {
    let trimmed = ticket_no.trim();
    if trimmed.is_empty() {
        return Err(TicketError::InvalidTicketNo(
            "empty ticket number".to_string(),
        ));
    }
    let mut digits_start = 0usize;
    let mut found_prefix = false;
    for (i, c) in trimmed.chars().enumerate() {
        if c.is_ascii_digit() {
            digits_start = i;
            break;
        }
        if !c.is_ascii_uppercase() {
            return Err(TicketError::InvalidTicketNo(format!(
                "invalid character '{c}' in ticket number prefix"
            )));
        }
        found_prefix = true;
    }
    if !found_prefix || digits_start < 2 {
        return Err(TicketError::InvalidTicketNo(
            "prefix must be at least 2 uppercase letters".to_string(),
        ));
    }
    let digits = &trimmed[digits_start..];
    if digits.len() < 6 {
        return Err(TicketError::InvalidTicketNo(
            "must have at least 6 digits".to_string(),
        ));
    }
    if !digits.chars().all(|c| c.is_ascii_digit()) {
        return Err(TicketError::InvalidTicketNo(
            "suffix must be all digits".to_string(),
        ));
    }
    Ok(())
}

/// Normalize a ticket title: trim leading/trailing whitespace and collapse
/// internal whitespace runs into single spaces.
pub fn normalize_ticket_title(title: &str) -> String {
    title.split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// Check whether a ticket status transition is allowed.
///
/// Valid statuses: `open`, `in_progress`, `pending`, `resolved`, `closed`,
/// `cancelled`. Same-status transitions are always allowed.
pub fn is_valid_ticket_status_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "open" => matches!(to, "in_progress" | "pending" | "resolved" | "cancelled"),
        "in_progress" => matches!(to, "pending" | "resolved" | "open" | "cancelled"),
        "pending" => matches!(to, "in_progress" | "open" | "resolved" | "cancelled"),
        "resolved" => matches!(to, "closed" | "in_progress" | "open"),
        "closed" => matches!(to, "open" | "in_progress"),
        "cancelled" => matches!(to, "open" | "in_progress"),
        _ => false,
    }
}

/// Return `true` if `priority` is one of the recognized priority levels.
pub fn is_valid_priority(priority: &str) -> bool {
    matches!(priority, "low" | "medium" | "high" | "critical")
}

/// Calculate the SLA breach timestamp (Unix seconds) from `created_at` and
/// `sla_hours`. Returns `created_at` when `sla_hours` is non-positive.
pub fn calc_sla_breach_time(created_at: i64, sla_hours: i64) -> i64 {
    if sla_hours <= 0 {
        return created_at;
    }
    let sla_seconds = sla_hours.saturating_mul(3600);
    created_at.saturating_add(sla_seconds)
}

/// Return `true` when `now` is strictly past `due_date`.
pub fn is_overdue(due_date: i64, now: i64) -> bool {
    now > due_date
}

/// Validate a ticket category against the known category set.
pub fn validate_ticket_category(category: &str) -> Result<(), TicketError> {
    let trimmed = category.trim();
    if trimmed.is_empty() {
        return Err(TicketError::InvalidCategory("empty category".to_string()));
    }
    if !matches!(
        trimmed,
        "incident" | "service_request" | "change" | "problem" | "bug"
    ) {
        return Err(TicketError::InvalidCategory(format!(
            "unknown category: {trimmed}"
        )));
    }
    Ok(())
}

/// Normalize a tag: trim, lowercase, replace whitespace runs with underscores.
pub fn normalize_tag(tag: &str) -> String {
    tag.trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join("_")
}

/// Calculate the resolution rate in the range `0.0..=1.0`. Returns `0.0`
/// when `total` is zero.
pub fn calc_resolution_rate(resolved: u32, total: u32) -> f64 {
    if total == 0 {
        return 0.0;
    }
    let resolved = resolved.min(total);
    resolved as f64 / total as f64
}

/// Return `true` if `channel` is one of the recognized intake channels.
pub fn is_valid_channel(channel: &str) -> bool {
    matches!(channel, "web" | "mobile" | "email" | "api" | "phone")
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== validate_ticket_no ==========

    #[test]
    fn test_validate_ticket_no_basic() {
        assert!(validate_ticket_no("TK000001").is_ok());
    }

    #[test]
    fn test_validate_ticket_no_long_suffix() {
        assert!(validate_ticket_no("TK20260101000001").is_ok());
    }

    #[test]
    fn test_validate_ticket_no_different_prefix() {
        assert!(validate_ticket_no("INC123456").is_ok());
        assert!(validate_ticket_no("SRQ000999").is_ok());
    }

    #[test]
    fn test_validate_ticket_no_trims_whitespace() {
        assert!(validate_ticket_no("  TK000001  ").is_ok());
    }

    #[test]
    fn test_validate_ticket_no_empty() {
        assert!(validate_ticket_no("").is_err());
    }

    #[test]
    fn test_validate_ticket_no_only_whitespace() {
        assert!(validate_ticket_no("   ").is_err());
    }

    #[test]
    fn test_validate_ticket_no_prefix_too_short() {
        assert!(validate_ticket_no("T000001").is_err());
    }

    #[test]
    fn test_validate_ticket_no_no_digits() {
        assert!(validate_ticket_no("TKTICKET").is_err());
    }

    #[test]
    fn test_validate_ticket_no_too_few_digits() {
        assert!(validate_ticket_no("TK001").is_err());
    }

    #[test]
    fn test_validate_ticket_no_lowercase_prefix() {
        assert!(validate_ticket_no("tk000001").is_err());
    }

    #[test]
    fn test_validate_ticket_no_special_char_in_prefix() {
        assert!(validate_ticket_no("T-000001").is_err());
    }

    #[test]
    fn test_validate_ticket_no_space_in_prefix() {
        assert!(validate_ticket_no("T 000001").is_err());
    }

    #[test]
    fn test_validate_ticket_no_non_digit_in_suffix() {
        assert!(validate_ticket_no("TK00000A").is_err());
    }

    #[test]
    fn test_validate_ticket_no_error_is_invalid_ticket_no() {
        let err = validate_ticket_no("").unwrap_err();
        assert_eq!(
            err,
            TicketError::InvalidTicketNo("empty ticket number".to_string())
        );
    }

    #[test]
    fn test_validate_ticket_no_exactly_six_digits() {
        assert!(validate_ticket_no("TK123456").is_ok());
    }

    // ========== normalize_ticket_title ==========

    #[test]
    fn test_normalize_title_basic_trim() {
        assert_eq!(normalize_ticket_title("  Bug report  "), "Bug report");
    }

    #[test]
    fn test_normalize_title_collapse_spaces() {
        assert_eq!(normalize_ticket_title("Bug    report"), "Bug report");
    }

    #[test]
    fn test_normalize_title_tabs_and_newlines() {
        assert_eq!(normalize_ticket_title("Bug\treport\nnow"), "Bug report now");
    }

    #[test]
    fn test_normalize_title_empty() {
        assert_eq!(normalize_ticket_title(""), "");
    }

    #[test]
    fn test_normalize_title_only_whitespace() {
        assert_eq!(normalize_ticket_title("   "), "");
    }

    #[test]
    fn test_normalize_title_single_word() {
        assert_eq!(normalize_ticket_title("Bug"), "Bug");
    }

    #[test]
    fn test_normalize_title_preserves_case() {
        assert_eq!(normalize_ticket_title("BUG Report"), "BUG Report");
    }

    #[test]
    fn test_normalize_title_unicode() {
        assert_eq!(normalize_ticket_title("  工单 标题  "), "工单 标题");
    }

    // ========== is_valid_ticket_status_transition ==========

    #[test]
    fn test_transition_same_status_allowed() {
        for s in [
            "open",
            "in_progress",
            "pending",
            "resolved",
            "closed",
            "cancelled",
        ] {
            assert!(
                is_valid_ticket_status_transition(s, s),
                "same-status {s} should be allowed"
            );
        }
    }

    #[test]
    fn test_transition_open_to_others() {
        assert!(is_valid_ticket_status_transition("open", "in_progress"));
        assert!(is_valid_ticket_status_transition("open", "pending"));
        assert!(is_valid_ticket_status_transition("open", "resolved"));
        assert!(is_valid_ticket_status_transition("open", "cancelled"));
    }

    #[test]
    fn test_transition_open_to_closed_rejected() {
        assert!(!is_valid_ticket_status_transition("open", "closed"));
    }

    #[test]
    fn test_transition_in_progress_to_others() {
        assert!(is_valid_ticket_status_transition("in_progress", "pending"));
        assert!(is_valid_ticket_status_transition("in_progress", "resolved"));
        assert!(is_valid_ticket_status_transition("in_progress", "open"));
        assert!(is_valid_ticket_status_transition(
            "in_progress",
            "cancelled"
        ));
    }

    #[test]
    fn test_transition_in_progress_to_closed_rejected() {
        assert!(!is_valid_ticket_status_transition("in_progress", "closed"));
    }

    #[test]
    fn test_transition_pending_to_others() {
        assert!(is_valid_ticket_status_transition("pending", "in_progress"));
        assert!(is_valid_ticket_status_transition("pending", "open"));
        assert!(is_valid_ticket_status_transition("pending", "resolved"));
        assert!(is_valid_ticket_status_transition("pending", "cancelled"));
    }

    #[test]
    fn test_transition_resolved_to_closed() {
        assert!(is_valid_ticket_status_transition("resolved", "closed"));
    }

    #[test]
    fn test_transition_resolved_reopen() {
        assert!(is_valid_ticket_status_transition("resolved", "in_progress"));
        assert!(is_valid_ticket_status_transition("resolved", "open"));
    }

    #[test]
    fn test_transition_resolved_to_cancelled_rejected() {
        assert!(!is_valid_ticket_status_transition("resolved", "cancelled"));
    }

    #[test]
    fn test_transition_closed_reopen() {
        assert!(is_valid_ticket_status_transition("closed", "open"));
        assert!(is_valid_ticket_status_transition("closed", "in_progress"));
    }

    #[test]
    fn test_transition_closed_to_resolved_rejected() {
        assert!(!is_valid_ticket_status_transition("closed", "resolved"));
    }

    #[test]
    fn test_transition_closed_to_cancelled_rejected() {
        assert!(!is_valid_ticket_status_transition("closed", "cancelled"));
    }

    #[test]
    fn test_transition_cancelled_reopen() {
        assert!(is_valid_ticket_status_transition("cancelled", "open"));
        assert!(is_valid_ticket_status_transition(
            "cancelled",
            "in_progress"
        ));
    }

    #[test]
    fn test_transition_cancelled_to_resolved_rejected() {
        assert!(!is_valid_ticket_status_transition("cancelled", "resolved"));
    }

    #[test]
    fn test_transition_unknown_status_rejected() {
        assert!(!is_valid_ticket_status_transition("unknown", "open"));
        assert!(!is_valid_ticket_status_transition("open", "unknown"));
    }

    #[test]
    fn test_transition_empty_status_rejected() {
        assert!(!is_valid_ticket_status_transition("", "open"));
        assert!(!is_valid_ticket_status_transition("open", ""));
    }

    // ========== is_valid_priority ==========

    #[test]
    fn test_priority_valid_all() {
        assert!(is_valid_priority("low"));
        assert!(is_valid_priority("medium"));
        assert!(is_valid_priority("high"));
        assert!(is_valid_priority("critical"));
    }

    #[test]
    fn test_priority_invalid_values() {
        assert!(!is_valid_priority("urgent"));
        assert!(!is_valid_priority(""));
        assert!(!is_valid_priority("CRITICAL"));
        assert!(!is_valid_priority("critical "));
    }

    // ========== calc_sla_breach_time ==========

    #[test]
    fn test_calc_sla_breach_time_basic() {
        assert_eq!(calc_sla_breach_time(0, 1), 3600);
    }

    #[test]
    fn test_calc_sla_breach_time_with_offset() {
        assert_eq!(calc_sla_breach_time(1000, 2), 1000 + 7200);
    }

    #[test]
    fn test_calc_sla_breach_time_zero_sla() {
        assert_eq!(calc_sla_breach_time(500, 0), 500);
    }

    #[test]
    fn test_calc_sla_breach_time_negative_sla() {
        assert_eq!(calc_sla_breach_time(500, -5), 500);
    }

    #[test]
    fn test_calc_sla_breach_time_large_hours() {
        assert_eq!(calc_sla_breach_time(0, 24), 86400);
    }

    #[test]
    fn test_calc_sla_breach_time_saturates_on_overflow() {
        let result = calc_sla_breach_time(i64::MAX, 1);
        assert_eq!(result, i64::MAX);
    }

    #[test]
    fn test_calc_sla_breach_time_created_at_zero() {
        assert_eq!(calc_sla_breach_time(0, 72), 259200);
    }

    // ========== is_overdue ==========

    #[test]
    fn test_is_overdue_true() {
        assert!(is_overdue(1000, 1001));
    }

    #[test]
    fn test_is_overdue_false_equal() {
        assert!(!is_overdue(1000, 1000));
    }

    #[test]
    fn test_is_overdue_false_before() {
        assert!(!is_overdue(1000, 999));
    }

    #[test]
    fn test_is_overdue_zero_values() {
        assert!(!is_overdue(0, 0));
    }

    #[test]
    fn test_is_overdue_large_values() {
        assert!(is_overdue(1_700_000_000, 1_700_000_001));
        assert!(!is_overdue(1_700_000_001, 1_700_000_000));
    }

    #[test]
    fn test_is_overdue_negative_due_date() {
        assert!(is_overdue(-1, 0));
    }

    // ========== validate_ticket_category ==========

    #[test]
    fn test_validate_category_valid_all() {
        for c in ["incident", "service_request", "change", "problem", "bug"] {
            assert!(
                validate_ticket_category(c).is_ok(),
                "category {c} should be valid"
            );
        }
    }

    #[test]
    fn test_validate_category_trims_whitespace() {
        assert!(validate_ticket_category("  bug  ").is_ok());
    }

    #[test]
    fn test_validate_category_empty() {
        assert!(validate_ticket_category("").is_err());
    }

    #[test]
    fn test_validate_category_only_whitespace() {
        assert!(validate_ticket_category("   ").is_err());
    }

    #[test]
    fn test_validate_category_unknown() {
        assert!(validate_ticket_category("feature").is_err());
        assert!(validate_ticket_category("task").is_err());
    }

    #[test]
    fn test_validate_category_case_sensitive() {
        assert!(validate_ticket_category("Bug").is_err());
        assert!(validate_ticket_category("BUG").is_err());
    }

    #[test]
    fn test_validate_category_error_type() {
        let err = validate_ticket_category("feature").unwrap_err();
        assert_eq!(
            err,
            TicketError::InvalidCategory("unknown category: feature".to_string())
        );
    }

    // ========== normalize_tag ==========

    #[test]
    fn test_normalize_tag_basic() {
        assert_eq!(normalize_tag("  Bug Report  "), "bug_report");
    }

    #[test]
    fn test_normalize_tag_lowercase() {
        assert_eq!(normalize_tag("FeatureRequest"), "featurerequest");
    }

    #[test]
    fn test_normalize_tag_multiple_spaces() {
        assert_eq!(normalize_tag("very  important  bug"), "very_important_bug");
    }

    #[test]
    fn test_normalize_tag_empty() {
        assert_eq!(normalize_tag(""), "");
    }

    #[test]
    fn test_normalize_tag_only_whitespace() {
        assert_eq!(normalize_tag("   "), "");
    }

    #[test]
    fn test_normalize_tag_no_change() {
        assert_eq!(normalize_tag("bug"), "bug");
    }

    #[test]
    fn test_normalize_tag_unicode() {
        assert_eq!(normalize_tag("紧急 工单"), "紧急_工单");
    }

    #[test]
    fn test_normalize_tag_tabs_newlines() {
        assert_eq!(normalize_tag("bug\treport\nnow"), "bug_report_now");
    }

    // ========== calc_resolution_rate ==========

    #[test]
    fn test_resolution_rate_all_resolved() {
        assert!((calc_resolution_rate(10, 10) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_resolution_rate_none_resolved() {
        assert!((calc_resolution_rate(0, 10) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_resolution_rate_half() {
        assert!((calc_resolution_rate(5, 10) - 0.5).abs() < 1e-9);
    }

    #[test]
    fn test_resolution_rate_zero_total() {
        assert!((calc_resolution_rate(0, 0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_resolution_rate_resolved_exceeds_total_clamped() {
        assert!((calc_resolution_rate(15, 10) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_resolution_rate_one_third() {
        assert!((calc_resolution_rate(3, 9) - (3.0 / 9.0)).abs() < 1e-9);
    }

    #[test]
    fn test_resolution_rate_single() {
        assert!((calc_resolution_rate(1, 1) - 1.0).abs() < 1e-9);
    }

    // ========== is_valid_channel ==========

    #[test]
    fn test_channel_valid_all() {
        for ch in ["web", "mobile", "email", "api", "phone"] {
            assert!(is_valid_channel(ch), "channel {ch} should be valid");
        }
    }

    #[test]
    fn test_channel_invalid_values() {
        assert!(!is_valid_channel("chat"));
        assert!(!is_valid_channel(""));
        assert!(!is_valid_channel("WEB"));
        assert!(!is_valid_channel("web "));
    }

    // ========== TicketError structural / Display ==========

    #[test]
    fn test_ticket_error_debug_clone() {
        let err = TicketError::InvalidTicketNo("bad".to_string());
        let cloned = err.clone();
        assert_eq!(err, cloned);
        let debug = format!("{:?}", err);
        assert!(debug.contains("InvalidTicketNo"));
    }

    #[test]
    fn test_ticket_error_display_invalid_ticket_no() {
        let err = TicketError::InvalidTicketNo("bad number".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid ticket number"));
        assert!(msg.contains("bad number"));
    }

    #[test]
    fn test_ticket_error_display_invalid_category() {
        let err = TicketError::InvalidCategory("foo".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid ticket category"));
        assert!(msg.contains("foo"));
    }

    #[test]
    fn test_ticket_error_display_invalid_title() {
        let err = TicketError::InvalidTitle("x".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid ticket title"));
    }

    #[test]
    fn test_ticket_error_display_invalid_channel() {
        let err = TicketError::InvalidChannel("fax".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid ticket channel"));
        assert!(msg.contains("fax"));
    }

    #[test]
    fn test_ticket_error_eq_variants() {
        let a = TicketError::InvalidTicketNo("x".to_string());
        let b = TicketError::InvalidCategory("x".to_string());
        assert_ne!(a, b);
        assert_eq!(a, TicketError::InvalidTicketNo("x".to_string()));
    }

    #[test]
    fn test_ticket_error_is_std_error() {
        fn assert_error<T: std::error::Error>(_: T) {}
        assert_error(TicketError::InvalidTicketNo("e".to_string()));
        assert_error(TicketError::InvalidCategory("e".to_string()));
        assert_error(TicketError::InvalidTitle("e".to_string()));
        assert_error(TicketError::InvalidChannel("e".to_string()));
    }
}

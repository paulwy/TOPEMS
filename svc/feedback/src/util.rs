//! Pure domain helpers for the feedback service.
//!
//! All functions are pure (no I/O, no async) and safe to unit-test in
//! isolation. Helpers cover feedback-id validation, title/sentiment
//! normalization, status-transition FSM checks, rating/satisfaction
//! calculation, urgency detection, and response-time averaging.

use thiserror::Error;

/// Feedback domain error returned by validation helpers.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum FeedbackError {
    #[error("invalid feedback id: {0}")]
    InvalidFeedbackId(String),
    #[error("invalid feedback category: {0}")]
    InvalidCategory(String),
    #[error("invalid feedback title: {0}")]
    InvalidTitle(String),
}

/// Validate a feedback id.
///
/// A valid feedback id is a UUID v4 string (hyphenated, lowercase or
/// uppercase hex digits).
pub fn validate_feedback_id(id: &str) -> Result<(), FeedbackError> {
    let trimmed = id.trim();
    if trimmed.is_empty() {
        return Err(FeedbackError::InvalidFeedbackId(
            "empty feedback id".to_string(),
        ));
    }
    let groups: Vec<&str> = trimmed.split('-').collect();
    if groups.len() != 5 {
        return Err(FeedbackError::InvalidFeedbackId(
            "id must have 5 hyphen-separated groups".to_string(),
        ));
    }
    let expected_lengths = [8usize, 4, 4, 4, 12];
    for (i, (g, len)) in groups.iter().zip(expected_lengths.iter()).enumerate() {
        if g.len() != *len {
            return Err(FeedbackError::InvalidFeedbackId(format!(
                "group {} must be {} chars long",
                i + 1,
                len
            )));
        }
        if !g.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(FeedbackError::InvalidFeedbackId(format!(
                "group {} contains non-hex characters",
                i + 1
            )));
        }
    }
    Ok(())
}

/// Normalize a feedback title: trim leading/trailing whitespace and collapse
/// internal whitespace runs into single spaces.
pub fn normalize_feedback_title(title: &str) -> String {
    title.split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// Check whether a feedback status transition is allowed.
///
/// Valid statuses: `pending`, `open`, `in_progress`, `resolved`, `closed`.
/// Same-status transitions are always allowed. `closed` is terminal.
pub fn is_valid_feedback_status_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "pending" => matches!(to, "open" | "in_progress" | "resolved" | "closed"),
        "open" | "in_progress" => matches!(to, "resolved" | "closed" | "pending"),
        "resolved" => matches!(to, "closed" | "open" | "in_progress"),
        "closed" => false,
        _ => false,
    }
}

/// Return `true` if `rating` is in the valid 1-5 range.
pub fn is_valid_rating(rating: u8) -> bool {
    (1..=5).contains(&rating)
}

/// Calculate the satisfaction score (average) from a slice of ratings.
///
/// Returns `0.0` when the slice is empty.
pub fn calc_satisfaction_score(ratings: &[u8]) -> f64 {
    if ratings.is_empty() {
        return 0.0;
    }
    let sum: u64 = ratings.iter().map(|&r| r as u64).sum();
    sum as f64 / ratings.len() as f64
}

/// Validate a feedback category against the known set.
pub fn validate_feedback_category(category: &str) -> Result<(), FeedbackError> {
    let trimmed = category.trim();
    if trimmed.is_empty() {
        return Err(FeedbackError::InvalidCategory("empty category".to_string()));
    }
    if !matches!(
        trimmed,
        "bug" | "feature" | "praise" | "complaint" | "other"
    ) {
        return Err(FeedbackError::InvalidCategory(format!(
            "unknown category: {trimmed}"
        )));
    }
    Ok(())
}

/// Return `true` when a feedback item is urgent: priority is `P0` or `P1`,
/// or sentiment is `negative`.
pub fn is_urgent(priority: &str, sentiment: &str) -> bool {
    matches!(priority, "P0" | "P1") || normalize_sentiment(sentiment) == "negative"
}

/// Calculate the average response time from a slice of response times
/// (seconds). Returns `0.0` when the slice is empty.
pub fn calc_response_time_avg(times: &[i64]) -> f64 {
    if times.is_empty() {
        return 0.0;
    }
    let sum: i64 = times.iter().sum();
    sum as f64 / times.len() as f64
}

/// Normalize a sentiment label: trim and lowercase.
pub fn normalize_sentiment(sentiment: &str) -> String {
    sentiment.trim().to_lowercase()
}

/// Return `true` if `feedback_type` is one of the recognized types.
pub fn is_valid_feedback_type(feedback_type: &str) -> bool {
    matches!(
        feedback_type,
        "bug" | "feature" | "praise" | "complaint" | "other"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== validate_feedback_id ==========

    #[test]
    fn test_validate_feedback_id_valid_lowercase() {
        assert!(validate_feedback_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
    }

    #[test]
    fn test_validate_feedback_id_valid_uppercase() {
        assert!(validate_feedback_id("550E8400-E29B-41D4-A716-446655440000").is_ok());
    }

    #[test]
    fn test_validate_feedback_id_valid_mixed_case() {
        assert!(validate_feedback_id("550e8400-E29b-41D4-a716-446655440000").is_ok());
    }

    #[test]
    fn test_validate_feedback_id_trims_whitespace() {
        assert!(validate_feedback_id("  550e8400-e29b-41d4-a716-446655440000  ").is_ok());
    }

    #[test]
    fn test_validate_feedback_id_empty() {
        assert!(validate_feedback_id("").is_err());
    }

    #[test]
    fn test_validate_feedback_id_only_whitespace() {
        assert!(validate_feedback_id("   ").is_err());
    }

    #[test]
    fn test_validate_feedback_id_too_few_groups() {
        assert!(validate_feedback_id("550e8400-e29b-41d4-a716").is_err());
    }

    #[test]
    fn test_validate_feedback_id_wrong_group_length() {
        assert!(validate_feedback_id("550e8400-e29b-41d4-a71-446655440000").is_err());
    }

    #[test]
    fn test_validate_feedback_id_non_hex_chars() {
        assert!(validate_feedback_id("550e8400-e29b-41d4-a716-44665544000g").is_err());
    }

    #[test]
    fn test_validate_feedback_id_no_hyphens() {
        assert!(validate_feedback_id("550e8400e29b41d4a716446655440000").is_err());
    }

    #[test]
    fn test_validate_feedback_id_error_type() {
        let err = validate_feedback_id("").unwrap_err();
        assert_eq!(
            err,
            FeedbackError::InvalidFeedbackId("empty feedback id".to_string())
        );
    }

    // ========== normalize_feedback_title ==========

    #[test]
    fn test_normalize_title_basic_trim() {
        assert_eq!(normalize_feedback_title("  Bug report  "), "Bug report");
    }

    #[test]
    fn test_normalize_title_collapse_spaces() {
        assert_eq!(normalize_feedback_title("Bug    report"), "Bug report");
    }

    #[test]
    fn test_normalize_title_tabs_and_newlines() {
        assert_eq!(
            normalize_feedback_title("Bug\treport\nnow"),
            "Bug report now"
        );
    }

    #[test]
    fn test_normalize_title_empty() {
        assert_eq!(normalize_feedback_title(""), "");
    }

    #[test]
    fn test_normalize_title_only_whitespace() {
        assert_eq!(normalize_feedback_title("   "), "");
    }

    #[test]
    fn test_normalize_title_single_word() {
        assert_eq!(normalize_feedback_title("Bug"), "Bug");
    }

    #[test]
    fn test_normalize_title_preserves_case() {
        assert_eq!(normalize_feedback_title("BUG Report"), "BUG Report");
    }

    #[test]
    fn test_normalize_title_unicode() {
        assert_eq!(normalize_feedback_title("  反馈 标题  "), "反馈 标题");
    }

    // ========== is_valid_feedback_status_transition ==========

    #[test]
    fn test_transition_same_status_allowed() {
        for s in ["pending", "open", "in_progress", "resolved", "closed"] {
            assert!(
                is_valid_feedback_status_transition(s, s),
                "same-status {s} should be allowed"
            );
        }
    }

    #[test]
    fn test_transition_pending_to_others() {
        assert!(is_valid_feedback_status_transition("pending", "open"));
        assert!(is_valid_feedback_status_transition(
            "pending",
            "in_progress"
        ));
        assert!(is_valid_feedback_status_transition("pending", "resolved"));
        assert!(is_valid_feedback_status_transition("pending", "closed"));
    }

    #[test]
    fn test_transition_open_to_resolved_closed_pending() {
        assert!(is_valid_feedback_status_transition("open", "resolved"));
        assert!(is_valid_feedback_status_transition("open", "closed"));
        assert!(is_valid_feedback_status_transition("open", "pending"));
    }

    #[test]
    fn test_transition_in_progress_to_resolved_closed_pending() {
        assert!(is_valid_feedback_status_transition(
            "in_progress",
            "resolved"
        ));
        assert!(is_valid_feedback_status_transition("in_progress", "closed"));
        assert!(is_valid_feedback_status_transition(
            "in_progress",
            "pending"
        ));
    }

    #[test]
    fn test_transition_open_to_pending_rejected_as_new_from_open() {
        // open -> pending is valid per FSM
        assert!(is_valid_feedback_status_transition("open", "pending"));
    }

    #[test]
    fn test_transition_resolved_reopen() {
        assert!(is_valid_feedback_status_transition("resolved", "open"));
        assert!(is_valid_feedback_status_transition(
            "resolved",
            "in_progress"
        ));
        assert!(is_valid_feedback_status_transition("resolved", "closed"));
    }

    #[test]
    fn test_transition_resolved_to_pending_rejected() {
        assert!(!is_valid_feedback_status_transition("resolved", "pending"));
    }

    #[test]
    fn test_transition_closed_terminal() {
        assert!(!is_valid_feedback_status_transition("closed", "pending"));
        assert!(!is_valid_feedback_status_transition("closed", "open"));
        assert!(!is_valid_feedback_status_transition(
            "closed",
            "in_progress"
        ));
        assert!(!is_valid_feedback_status_transition("closed", "resolved"));
    }

    #[test]
    fn test_transition_unknown_status_rejected() {
        assert!(!is_valid_feedback_status_transition("unknown", "open"));
        assert!(!is_valid_feedback_status_transition("open", "unknown"));
    }

    #[test]
    fn test_transition_empty_status_rejected() {
        assert!(!is_valid_feedback_status_transition("", "open"));
        assert!(!is_valid_feedback_status_transition("open", ""));
    }

    // ========== is_valid_rating ==========

    #[test]
    fn test_rating_valid_all() {
        for r in 1..=5u8 {
            assert!(is_valid_rating(r), "rating {r} should be valid");
        }
    }

    #[test]
    fn test_rating_invalid_zero() {
        assert!(!is_valid_rating(0));
    }

    #[test]
    fn test_rating_invalid_high() {
        assert!(!is_valid_rating(6));
        assert!(!is_valid_rating(255));
    }

    #[test]
    fn test_rating_boundary() {
        assert!(is_valid_rating(1));
        assert!(is_valid_rating(5));
        assert!(!is_valid_rating(0));
    }

    // ========== calc_satisfaction_score ==========

    #[test]
    fn test_satisfaction_score_empty() {
        assert!((calc_satisfaction_score(&[]) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_satisfaction_score_single() {
        assert!((calc_satisfaction_score(&[4]) - 4.0).abs() < 1e-9);
    }

    #[test]
    fn test_satisfaction_score_multiple() {
        assert!((calc_satisfaction_score(&[1, 2, 3, 4, 5]) - 3.0).abs() < 1e-9);
    }

    #[test]
    fn test_satisfaction_score_all_max() {
        assert!((calc_satisfaction_score(&[5, 5, 5]) - 5.0).abs() < 1e-9);
    }

    #[test]
    fn test_satisfaction_score_all_min() {
        assert!((calc_satisfaction_score(&[1, 1, 1]) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_satisfaction_score_two() {
        assert!((calc_satisfaction_score(&[3, 4]) - 3.5).abs() < 1e-9);
    }

    // ========== validate_feedback_category ==========

    #[test]
    fn test_validate_category_valid_all() {
        for c in ["bug", "feature", "praise", "complaint", "other"] {
            assert!(
                validate_feedback_category(c).is_ok(),
                "category {c} should be valid"
            );
        }
    }

    #[test]
    fn test_validate_category_trims_whitespace() {
        assert!(validate_feedback_category("  bug  ").is_ok());
    }

    #[test]
    fn test_validate_category_empty() {
        assert!(validate_feedback_category("").is_err());
    }

    #[test]
    fn test_validate_category_only_whitespace() {
        assert!(validate_feedback_category("   ").is_err());
    }

    #[test]
    fn test_validate_category_unknown() {
        assert!(validate_feedback_category("suggestion").is_err());
        assert!(validate_feedback_category("question").is_err());
    }

    #[test]
    fn test_validate_category_case_sensitive() {
        assert!(validate_feedback_category("Bug").is_err());
        assert!(validate_feedback_category("BUG").is_err());
    }

    #[test]
    fn test_validate_category_error_type() {
        let err = validate_feedback_category("suggestion").unwrap_err();
        assert_eq!(
            err,
            FeedbackError::InvalidCategory("unknown category: suggestion".to_string())
        );
    }

    // ========== is_urgent ==========

    #[test]
    fn test_is_urgent_p0() {
        assert!(is_urgent("P0", "positive"));
    }

    #[test]
    fn test_is_urgent_p1() {
        assert!(is_urgent("P1", "neutral"));
    }

    #[test]
    fn test_is_urgent_negative_sentiment() {
        assert!(is_urgent("P4", "negative"));
    }

    #[test]
    fn test_is_urgent_negative_sentiment_case_insensitive() {
        assert!(is_urgent("P4", "  NEGATIVE  "));
    }

    #[test]
    fn test_is_urgent_not_urgent() {
        assert!(!is_urgent("P2", "positive"));
        assert!(!is_urgent("P3", "neutral"));
        assert!(!is_urgent("P4", "positive"));
    }

    #[test]
    fn test_is_urgent_p0_and_negative() {
        assert!(is_urgent("P0", "negative"));
    }

    #[test]
    fn test_is_urgent_unknown_priority_neutral() {
        assert!(!is_urgent("unknown", "neutral"));
    }

    #[test]
    fn test_is_urgent_unknown_priority_negative() {
        assert!(is_urgent("unknown", "negative"));
    }

    // ========== calc_response_time_avg ==========

    #[test]
    fn test_response_time_avg_empty() {
        assert!((calc_response_time_avg(&[]) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_time_avg_single() {
        assert!((calc_response_time_avg(&[3600]) - 3600.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_time_avg_multiple() {
        assert!((calc_response_time_avg(&[3600, 7200, 10800]) - 7200.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_time_avg_with_zero() {
        assert!((calc_response_time_avg(&[0, 3600, 7200]) - 3600.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_time_avg_all_zeros() {
        assert!((calc_response_time_avg(&[0, 0, 0]) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_time_avg_with_negatives() {
        assert!((calc_response_time_avg(&[-3600, 3600]) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_time_avg_two() {
        assert!((calc_response_time_avg(&[100, 200]) - 150.0).abs() < 1e-9);
    }

    // ========== normalize_sentiment ==========

    #[test]
    fn test_normalize_sentiment_basic() {
        assert_eq!(normalize_sentiment("  Positive  "), "positive");
    }

    #[test]
    fn test_normalize_sentiment_lowercase() {
        assert_eq!(normalize_sentiment("NEGATIVE"), "negative");
    }

    #[test]
    fn test_normalize_sentiment_mixed_case() {
        assert_eq!(normalize_sentiment("NeUtRaL"), "neutral");
    }

    #[test]
    fn test_normalize_sentiment_empty() {
        assert_eq!(normalize_sentiment(""), "");
    }

    #[test]
    fn test_normalize_sentiment_only_whitespace() {
        assert_eq!(normalize_sentiment("   "), "");
    }

    #[test]
    fn test_normalize_sentiment_no_change() {
        assert_eq!(normalize_sentiment("positive"), "positive");
    }

    // ========== is_valid_feedback_type ==========

    #[test]
    fn test_feedback_type_valid_all() {
        for t in ["bug", "feature", "praise", "complaint", "other"] {
            assert!(is_valid_feedback_type(t), "type {t} should be valid");
        }
    }

    #[test]
    fn test_feedback_type_invalid_values() {
        assert!(!is_valid_feedback_type("suggestion"));
        assert!(!is_valid_feedback_type(""));
        assert!(!is_valid_feedback_type("BUG"));
        assert!(!is_valid_feedback_type("bug "));
    }

    // ========== FeedbackError structural / Display ==========

    #[test]
    fn test_feedback_error_debug_clone() {
        let err = FeedbackError::InvalidFeedbackId("bad".to_string());
        let cloned = err.clone();
        assert_eq!(err, cloned);
        let debug = format!("{:?}", err);
        assert!(debug.contains("InvalidFeedbackId"));
    }

    #[test]
    fn test_feedback_error_display_invalid_id() {
        let err = FeedbackError::InvalidFeedbackId("bad id".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid feedback id"));
        assert!(msg.contains("bad id"));
    }

    #[test]
    fn test_feedback_error_display_invalid_category() {
        let err = FeedbackError::InvalidCategory("foo".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid feedback category"));
        assert!(msg.contains("foo"));
    }

    #[test]
    fn test_feedback_error_display_invalid_title() {
        let err = FeedbackError::InvalidTitle("x".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid feedback title"));
    }

    #[test]
    fn test_feedback_error_eq_variants() {
        let a = FeedbackError::InvalidFeedbackId("x".to_string());
        let b = FeedbackError::InvalidCategory("x".to_string());
        assert_ne!(a, b);
        assert_eq!(a, FeedbackError::InvalidFeedbackId("x".to_string()));
    }

    #[test]
    fn test_feedback_error_is_std_error() {
        fn assert_error<T: std::error::Error>(_: T) {}
        assert_error(FeedbackError::InvalidFeedbackId("e".to_string()));
        assert_error(FeedbackError::InvalidCategory("e".to_string()));
        assert_error(FeedbackError::InvalidTitle("e".to_string()));
    }
}

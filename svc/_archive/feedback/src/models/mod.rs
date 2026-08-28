pub mod audit_log;

use std::collections::HashSet;

/// 标准化反馈标签：去除首尾空格、转小写、空格替换为下划线
pub fn normalize_feedback_tag(tag: &str) -> String {
    tag.trim().to_lowercase().replace(' ', "_")
}

/// 反馈去重：基于标准化后的主题去重，保留原始顺序和大小写
pub fn deduplicate_feedback(subjects: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for s in subjects {
        let key = s.trim().to_lowercase();
        if seen.insert(key) {
            result.push(s.clone());
        }
    }
    result
}

/// 根据受影响用户数和严重程度确定反馈优先级
pub fn feedback_priority(affected_users: u32, severity: &str) -> &'static str {
    let sev = severity.to_lowercase();
    match (affected_users, sev.as_str()) {
        (n, "critical") if n >= 100 => "P0",
        (n, "critical") if n >= 10 => "P1",
        (_, "critical") => "P2",
        (n, "high") if n >= 100 => "P1",
        (n, "high") if n >= 10 => "P2",
        (_, "high") => "P3",
        (n, "medium") if n >= 100 => "P2",
        (n, "medium") if n >= 10 => "P3",
        (_, "medium") => "P4",
        (n, "low") if n >= 100 => "P3",
        (n, "low") if n >= 10 => "P4",
        (_, "low") => "P4",
        _ => "P4",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- normalize_feedback_tag ----

    #[test]
    fn test_normalize_tag_basic() {
        assert_eq!(normalize_feedback_tag("  Bug Report  "), "bug_report");
    }

    #[test]
    fn test_normalize_tag_lowercase() {
        assert_eq!(normalize_feedback_tag("FeatureRequest"), "featurerequest");
    }

    #[test]
    fn test_normalize_tag_spaces() {
        assert_eq!(
            normalize_feedback_tag("very important bug"),
            "very_important_bug"
        );
    }

    #[test]
    fn test_normalize_tag_empty() {
        assert_eq!(normalize_feedback_tag(""), "");
        assert_eq!(normalize_feedback_tag("   "), "");
    }

    #[test]
    fn test_normalize_tag_no_change() {
        assert_eq!(normalize_feedback_tag("bug"), "bug");
    }

    #[test]
    fn test_normalize_tag_multiple_spaces() {
        assert_eq!(normalize_feedback_tag("a  b"), "a__b");
    }

    // ---- deduplicate_feedback ----

    #[test]
    fn test_dedup_empty() {
        assert!(deduplicate_feedback(&[]).is_empty());
    }

    #[test]
    fn test_dedup_no_duplicates() {
        let input: Vec<String> = vec!["a".into(), "b".into(), "c".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, input);
    }

    #[test]
    fn test_dedup_exact_duplicates() {
        let input: Vec<String> = vec!["bug".into(), "bug".into(), "bug".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, vec!["bug".to_string()]);
    }

    #[test]
    fn test_dedup_case_insensitive() {
        let input: Vec<String> = vec!["Bug".into(), "BUG".into(), "bug".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, vec!["Bug".to_string()]);
    }

    #[test]
    fn test_dedup_preserves_first() {
        let input: Vec<String> = vec!["  Bug  ".into(), "bug".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, vec!["  Bug  ".to_string()]);
    }

    #[test]
    fn test_dedup_preserves_order() {
        let input: Vec<String> = vec!["c".into(), "a".into(), "b".into(), "a".into(), "c".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(
            result,
            vec!["c".to_string(), "a".to_string(), "b".to_string()]
        );
    }

    // ---- feedback_priority ----

    #[test]
    fn test_priority_critical_high_users() {
        assert_eq!(feedback_priority(100, "critical"), "P0");
        assert_eq!(feedback_priority(500, "critical"), "P0");
    }

    #[test]
    fn test_priority_critical_medium_users() {
        assert_eq!(feedback_priority(10, "critical"), "P1");
        assert_eq!(feedback_priority(50, "critical"), "P1");
    }

    #[test]
    fn test_priority_critical_low_users() {
        assert_eq!(feedback_priority(1, "critical"), "P2");
        assert_eq!(feedback_priority(9, "critical"), "P2");
    }

    #[test]
    fn test_priority_high() {
        assert_eq!(feedback_priority(100, "high"), "P1");
        assert_eq!(feedback_priority(10, "high"), "P2");
        assert_eq!(feedback_priority(1, "high"), "P3");
    }

    #[test]
    fn test_priority_medium() {
        assert_eq!(feedback_priority(100, "medium"), "P2");
        assert_eq!(feedback_priority(10, "medium"), "P3");
        assert_eq!(feedback_priority(1, "medium"), "P4");
    }

    #[test]
    fn test_priority_low() {
        assert_eq!(feedback_priority(100, "low"), "P3");
        assert_eq!(feedback_priority(10, "low"), "P4");
        assert_eq!(feedback_priority(1, "low"), "P4");
    }

    #[test]
    fn test_priority_case_insensitive() {
        assert_eq!(feedback_priority(100, "CRITICAL"), "P0");
        assert_eq!(feedback_priority(100, "High"), "P1");
    }

    #[test]
    fn test_priority_unknown_severity() {
        assert_eq!(feedback_priority(1000, "unknown"), "P4");
        assert_eq!(feedback_priority(0, "xyz"), "P4");
    }

    #[test]
    fn test_priority_zero_users() {
        assert_eq!(feedback_priority(0, "critical"), "P2");
        assert_eq!(feedback_priority(0, "high"), "P3");
        assert_eq!(feedback_priority(0, "low"), "P4");
    }
}

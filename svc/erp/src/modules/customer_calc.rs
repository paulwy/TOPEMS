//! 客户模块纯计算函数
//!
//! 从 `customer.rs` handler 中提取的内联逻辑，便于单元测试与复用。

// ── 分页 ───────────────────────────────────────────────

/// 将可选的分页参数归一化为 `(page, page_size, offset)`。
///
/// - page 缺省 1，最小 1
/// - page_size 缺省 20，最大 100，最小 1
/// - offset = (page - 1) * page_size
pub fn normalize_pagination(page: Option<i64>, page_size: Option<i64>) -> (i64, i64, i64) {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    (page, page_size, offset)
}

/// 构建 SQL `ILIKE` 搜索模式 `"%keyword%"`
pub fn build_search_pattern(search: Option<&str>) -> Option<String> {
    search.filter(|s| !s.is_empty()).map(|s| format!("%{}%", s))
}

// ── 过滤检测 ───────────────────────────────────────────

/// 判断是否携带任一过滤条件（搜索词 / 状态 / 客户类型）
pub fn has_customer_filters(
    search: Option<&str>,
    status: Option<&str>,
    customer_type: Option<&str>,
) -> bool {
    search.is_some_and(|s| !s.is_empty())
        || status.is_some_and(|s| !s.is_empty())
        || customer_type.is_some_and(|s| !s.is_empty())
}

// ── 默认值 ─────────────────────────────────────────────

/// 信用额度缺省 0.0，负值钳制为 0
pub fn default_credit_limit(credit: Option<f64>) -> f64 {
    credit.unwrap_or(0.0).max(0.0)
}

/// 客户状态缺省 `"active"`
pub fn default_customer_status(status: Option<String>) -> String {
    status.unwrap_or_else(|| "active".to_string())
}

// ── 校验 ───────────────────────────────────────────────

/// 客户编码校验：非空且仅含字母、数字、下划线、短横线
pub fn validate_customer_code(code: &str) -> bool {
    if code.is_empty() {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/// 邮箱格式校验（`None` 视为合法——非必填字段）
pub fn validate_customer_email(email: Option<&str>) -> bool {
    match email {
        None => true,
        Some(e) if e.is_empty() => true,
        Some(e) => e.contains('@') && e.contains('.'),
    }
}

// ── 信用状态 ───────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CreditStatus {
    /// 用信 < 50%
    Normal,
    /// 50% ≤ 用信 < 80%
    Warning,
    /// 80% ≤ 用信 < 100%
    Danger,
    /// 用信 ≥ 100%
    Frozen,
}

/// 根据信用额度和已用额度计算信用状态
///
/// - credit_limit ≤ 0 时返回 `Normal`（无额度限制）
/// - used_credit < 0 时按 0 处理
pub fn credit_status(credit_limit: f64, used_credit: f64) -> CreditStatus {
    if credit_limit <= 0.0 {
        return CreditStatus::Normal;
    }
    let used = used_credit.max(0.0);
    let ratio = used / credit_limit;
    match ratio {
        r if r < 0.5 => CreditStatus::Normal,
        r if r < 0.8 => CreditStatus::Warning,
        r if r < 1.0 => CreditStatus::Danger,
        _ => CreditStatus::Frozen,
    }
}

/// 信用利用率（0.0 ~ 1.0+），credit_limit ≤ 0 时返回 0
pub fn credit_utilization_ratio(credit_limit: f64, used_credit: f64) -> f64 {
    if credit_limit <= 0.0 {
        return 0.0;
    }
    used_credit.max(0.0) / credit_limit
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── normalize_pagination ──────────────────────────

    #[test]
    fn test_pagination_defaults() {
        assert_eq!(normalize_pagination(None, None), (1, 20, 0));
    }

    #[test]
    fn test_pagination_custom_values() {
        assert_eq!(normalize_pagination(Some(3), Some(15)), (3, 15, 30));
    }

    #[test]
    fn test_pagination_page_below_min_clamped() {
        assert_eq!(normalize_pagination(Some(0), Some(10)), (1, 10, 0));
        assert_eq!(normalize_pagination(Some(-5), Some(10)), (1, 10, 0));
    }

    #[test]
    fn test_pagination_page_size_above_max_clamped() {
        assert_eq!(normalize_pagination(Some(1), Some(200)), (1, 100, 0));
    }

    #[test]
    fn test_pagination_page_size_below_min_clamped() {
        assert_eq!(normalize_pagination(Some(1), Some(0)), (1, 1, 0));
        assert_eq!(normalize_pagination(Some(1), Some(-10)), (1, 1, 0));
    }

    #[test]
    fn test_pagination_offset_calculation() {
        assert_eq!(normalize_pagination(Some(5), Some(20)), (5, 20, 80));
        assert_eq!(normalize_pagination(Some(2), Some(50)), (2, 50, 50));
    }

    // ── build_search_pattern ──────────────────────────

    #[test]
    fn test_search_pattern_some() {
        assert_eq!(build_search_pattern(Some("abc")), Some("%abc%".to_string()));
    }

    #[test]
    fn test_search_pattern_none() {
        assert_eq!(build_search_pattern(None), None);
    }

    #[test]
    fn test_search_pattern_empty_string_returns_none() {
        assert_eq!(build_search_pattern(Some("")), None);
    }

    #[test]
    fn test_search_pattern_with_spaces() {
        assert_eq!(
            build_search_pattern(Some("  hello  ")),
            Some("%  hello  %".to_string())
        );
    }

    // ── has_customer_filters ──────────────────────────

    #[test]
    fn test_has_filters_all_none() {
        assert!(!has_customer_filters(None, None, None));
    }

    #[test]
    fn test_has_filters_search_only() {
        assert!(has_customer_filters(Some("abc"), None, None));
    }

    #[test]
    fn test_has_filters_status_only() {
        assert!(has_customer_filters(None, Some("active"), None));
    }

    #[test]
    fn test_has_filters_customer_type_only() {
        assert!(has_customer_filters(None, None, Some("enterprise")));
    }

    #[test]
    fn test_has_filters_all_set() {
        assert!(has_customer_filters(
            Some("abc"),
            Some("active"),
            Some("enterprise")
        ));
    }

    #[test]
    fn test_has_filters_empty_strings_treated_as_no_filter() {
        assert!(!has_customer_filters(Some(""), Some(""), Some("")));
    }

    // ── default_credit_limit ──────────────────────────

    #[test]
    fn test_credit_limit_none_defaults_zero() {
        assert_eq!(default_credit_limit(None), 0.0);
    }

    #[test]
    fn test_credit_limit_some_value() {
        assert_eq!(default_credit_limit(Some(50000.0)), 50000.0);
    }

    #[test]
    fn test_credit_limit_negative_clamped_to_zero() {
        assert_eq!(default_credit_limit(Some(-100.0)), 0.0);
    }

    #[test]
    fn test_credit_limit_zero_allowed() {
        assert_eq!(default_credit_limit(Some(0.0)), 0.0);
    }

    // ── default_customer_status ───────────────────────

    #[test]
    fn test_status_none_defaults_active() {
        assert_eq!(default_customer_status(None), "active");
    }

    #[test]
    fn test_status_some_preserved() {
        assert_eq!(
            default_customer_status(Some("inactive".to_string())),
            "inactive"
        );
    }

    // ── validate_customer_code ────────────────────────

    #[test]
    fn test_code_valid_alphanumeric() {
        assert!(validate_customer_code("C001"));
    }

    #[test]
    fn test_code_valid_with_dash() {
        assert!(validate_customer_code("C-001"));
    }

    #[test]
    fn test_code_valid_with_underscore() {
        assert!(validate_customer_code("C_001"));
    }

    #[test]
    fn test_code_empty_invalid() {
        assert!(!validate_customer_code(""));
    }

    #[test]
    fn test_code_with_space_invalid() {
        assert!(!validate_customer_code("C 001"));
    }

    #[test]
    fn test_code_with_special_char_invalid() {
        assert!(!validate_customer_code("C@001"));
    }

    #[test]
    fn test_code_chinese_invalid() {
        assert!(!validate_customer_code("客户001"));
    }

    // ── validate_customer_email ───────────────────────

    #[test]
    fn test_email_none_valid() {
        assert!(validate_customer_email(None));
    }

    #[test]
    fn test_email_empty_valid() {
        assert!(validate_customer_email(Some("")));
    }

    #[test]
    fn test_email_valid_format() {
        assert!(validate_customer_email(Some("test@example.com")));
    }

    #[test]
    fn test_email_missing_at_invalid() {
        assert!(!validate_customer_email(Some("testexample.com")));
    }

    #[test]
    fn test_email_missing_dot_invalid() {
        assert!(!validate_customer_email(Some("test@example")));
    }

    // ── credit_status ─────────────────────────────────

    #[test]
    fn test_credit_status_no_limit_is_normal() {
        assert_eq!(credit_status(0.0, 1000.0), CreditStatus::Normal);
        assert_eq!(credit_status(-100.0, 5000.0), CreditStatus::Normal);
    }

    #[test]
    fn test_credit_status_normal_below_50pct() {
        assert_eq!(credit_status(10000.0, 4000.0), CreditStatus::Normal);
        assert_eq!(credit_status(10000.0, 0.0), CreditStatus::Normal);
    }

    #[test]
    fn test_credit_status_warning_50_to_80pct() {
        assert_eq!(credit_status(10000.0, 5000.0), CreditStatus::Warning);
        assert_eq!(credit_status(10000.0, 7999.0), CreditStatus::Warning);
    }

    #[test]
    fn test_credit_status_danger_80_to_100pct() {
        assert_eq!(credit_status(10000.0, 8000.0), CreditStatus::Danger);
        assert_eq!(credit_status(10000.0, 9999.0), CreditStatus::Danger);
    }

    #[test]
    fn test_credit_status_frozen_at_or_above_100pct() {
        assert_eq!(credit_status(10000.0, 10000.0), CreditStatus::Frozen);
        assert_eq!(credit_status(10000.0, 15000.0), CreditStatus::Frozen);
    }

    #[test]
    fn test_credit_status_negative_used_clamped_to_zero() {
        assert_eq!(credit_status(10000.0, -500.0), CreditStatus::Normal);
    }

    // ── credit_utilization_ratio ──────────────────────

    #[test]
    fn test_utilization_ratio_normal() {
        let r = credit_utilization_ratio(10000.0, 3000.0);
        assert!((r - 0.3).abs() < 1e-9);
    }

    #[test]
    fn test_utilization_ratio_zero_limit_returns_zero() {
        assert_eq!(credit_utilization_ratio(0.0, 5000.0), 0.0);
    }

    #[test]
    fn test_utilization_ratio_negative_used_returns_zero() {
        assert_eq!(credit_utilization_ratio(10000.0, -100.0), 0.0);
    }

    #[test]
    fn test_utilization_ratio_exceeds_1() {
        let r = credit_utilization_ratio(10000.0, 15000.0);
        assert!((r - 1.5).abs() < 1e-9);
    }
}

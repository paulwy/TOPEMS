//! CRM 领域纯函数工具集 —— 校验、归一化、客户价值与 RFM 评分
//!
//! 本模块仅包含无副作用、无 IO 的纯函数，便于单元测试覆盖。
//! 与 `shared/permission.rs`、`tests/opportunity_fsm_test.rs` 风格保持一致，
//! 不与现有 `models/customer_scoring.rs` 中的评分逻辑重叠。

/// CRM 工具层通用错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum CrmError {
    #[error("invalid customer code: {0}")]
    InvalidCustomerCode(String),
    #[error("invalid contact info: {0}")]
    InvalidContactInfo(String),
    #[error("invalid opportunity amount: {0}")]
    InvalidOpportunityAmount(String),
}

/// 客户状态机：与 `models/customer.rs` 中 status 取值一致
pub const CUSTOMER_STATES: &[&str] = &[
    "lead",
    "prospect",
    "active",
    "inactive",
    "churned",
    "blacklisted",
];

/// 客户状态机的终态（不可再转移）
pub const CUSTOMER_TERMINAL: &[&str] = &["churned", "blacklisted"];

/// 客户状态机允许的 (from, to) 转移
pub const CUSTOMER_TRANSITIONS: &[(&str, &str)] = &[
    ("lead", "prospect"),
    ("lead", "inactive"),
    ("lead", "blacklisted"),
    ("prospect", "active"),
    ("prospect", "lead"),
    ("prospect", "inactive"),
    ("active", "inactive"),
    ("active", "churned"),
    ("inactive", "active"),
    ("inactive", "churned"),
    ("inactive", "lead"),
];

/// 客户编码最大长度（不含）
pub const CUSTOMER_CODE_MAX_LEN: usize = 32;
/// 客户编码最小长度（含）
pub const CUSTOMER_CODE_MIN_LEN: usize = 3;

/// 校验客户编码
///
/// 规则：非空；trim 后长度 [3, 32]；首字符为 ASCII 字母；
/// 仅允许 ASCII 字母数字、`-`、`_`。
pub fn validate_customer_code(s: &str) -> Result<(), CrmError> {
    if s.is_empty() {
        return Err(CrmError::InvalidCustomerCode("empty".to_string()));
    }
    let trimmed = s.trim();
    if trimmed.len() < CUSTOMER_CODE_MIN_LEN {
        return Err(CrmError::InvalidCustomerCode(format!(
            "too short: '{}'",
            trimmed
        )));
    }
    if trimmed.len() > CUSTOMER_CODE_MAX_LEN {
        return Err(CrmError::InvalidCustomerCode(format!(
            "too long: {} chars",
            trimmed.len()
        )));
    }
    let first_ok = trimmed
        .chars()
        .next()
        .map(|c| c.is_ascii_alphabetic())
        .unwrap_or(false);
    if !first_ok {
        return Err(CrmError::InvalidCustomerCode(format!(
            "must start with letter: '{}'",
            trimmed
        )));
    }
    let all_ok = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !all_ok {
        return Err(CrmError::InvalidCustomerCode(format!(
            "contains invalid chars: '{}'",
            trimmed
        )));
    }
    Ok(())
}

/// 归一化电话号码：去除所有非数字字符（保留前导 +）
///
/// 例如：`"+86 138-0000-0000"` → `"+8613800000000"`；`"138 0000 0000"` → `"13800000000"`。
pub fn normalize_phone(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let mut result = String::with_capacity(trimmed.len());
    let mut iter = trimmed.chars().peekable();
    while let Some(c) = iter.next() {
        if c == '+' && result.is_empty() {
            result.push('+');
        } else if c.is_ascii_digit() {
            result.push(c);
        }
        // 其他字符（空格、`-`、`(`、`)` 等）忽略
        let _ = iter.peek();
    }
    result
}

/// 计算客户生命周期价值（CLV）
///
/// 公式：`orders × avg_order_value × retention_months`
///
/// 负输入按 0 处理；任意参数为 0 时结果为 0.0。
pub fn calc_customer_lifetime_value(
    orders: u64,
    avg_order_value: f64,
    retention_months: u32,
) -> f64 {
    let aov = if avg_order_value < 0.0 {
        0.0
    } else {
        avg_order_value
    };
    (orders as f64) * aov * (retention_months as f64)
}

/// 客户状态转移是否合法
///
/// 规则：未知状态拒绝；自转移拒绝；终态拒绝；必须在 `CUSTOMER_TRANSITIONS` 中。
pub fn is_valid_customer_status_transition(from: &str, to: &str) -> bool {
    if !CUSTOMER_STATES.contains(&from) || !CUSTOMER_STATES.contains(&to) {
        return false;
    }
    if CUSTOMER_TERMINAL.contains(&from) {
        return false;
    }
    if from == to {
        return false;
    }
    CUSTOMER_TRANSITIONS.contains(&(from, to))
}

/// 校验联系信息（email + phone）
///
/// 规则：
/// - email 必须包含 `@` 且 `@` 不在首尾；trim 后非空
/// - phone 去除非数字字符后长度 ∈ [7, 15]（不含前导 +）
/// - 两者都为空 → 错误
pub fn validate_contact_info(email: &str, phone: &str) -> Result<(), CrmError> {
    let email_t = email.trim();
    let phone_t = phone.trim();
    if email_t.is_empty() && phone_t.is_empty() {
        return Err(CrmError::InvalidContactInfo(
            "both email and phone are empty".to_string(),
        ));
    }
    if !email_t.is_empty() {
        let at_count = email_t.matches('@').count();
        if at_count != 1 {
            return Err(CrmError::InvalidContactInfo(format!(
                "email must contain exactly one '@': '{}'",
                email_t
            )));
        }
        let at_pos = email_t.find('@').unwrap();
        if at_pos == 0 || at_pos == email_t.len() - 1 {
            return Err(CrmError::InvalidContactInfo(format!(
                "email '@' cannot be at start or end: '{}'",
                email_t
            )));
        }
    }
    if !phone_t.is_empty() {
        let digits: String = phone_t.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.len() < 7 || digits.len() > 15 {
            return Err(CrmError::InvalidContactInfo(format!(
                "phone must have 7-15 digits, got {}: '{}'",
                digits.len(),
                phone_t
            )));
        }
    }
    Ok(())
}

/// 计算 RFM 评分（Recency / Frequency / Monetary，各 1-5 分）
///
/// - `recency_days`：自上次购买以来的天数；越小分数越高
///   - ≤7 天 → 5；≤30 → 4；≤90 → 3；≤180 → 2；否则 → 1
/// - `frequency`：购买次数；越大分数越高
///   - ≥20 → 5；≥10 → 4；≥5 → 3；≥2 → 2；否则 → 1
/// - `monetary`：累计消费金额；越大分数越高
///   - ≥10000 → 5；≥5000 → 4；≥1000 → 3；≥100 → 2；否则 → 1
pub fn calc_rfm_score(recency_days: u32, frequency: u32, monetary: f64) -> (u8, u8, u8) {
    let r = if recency_days <= 7 {
        5
    } else if recency_days <= 30 {
        4
    } else if recency_days <= 90 {
        3
    } else if recency_days <= 180 {
        2
    } else {
        1
    };
    let f = if frequency >= 20 {
        5
    } else if frequency >= 10 {
        4
    } else if frequency >= 5 {
        3
    } else if frequency >= 2 {
        2
    } else {
        1
    };
    let m = if monetary >= 10_000.0 {
        5
    } else if monetary >= 5_000.0 {
        4
    } else if monetary >= 1_000.0 {
        3
    } else if monetary >= 100.0 {
        2
    } else {
        1
    };
    (r, f, m)
}

/// 归一化客户姓名：去首尾空白、内部连续空白压缩为单空格
pub fn normalize_customer_name(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_space = false;
    for c in trimmed.chars() {
        if c.is_whitespace() {
            if !prev_space {
                result.push(' ');
                prev_space = true;
            }
        } else {
            result.push(c);
            prev_space = false;
        }
    }
    result
}

/// 校验商机金额
///
/// 规则：非负；有限（非 NaN、非 Inf）；> 0 时返回原值，= 0 时返回 0.0。
pub fn validate_opportunity_amount(amount: f64) -> Result<f64, CrmError> {
    if amount.is_nan() {
        return Err(CrmError::InvalidOpportunityAmount("NaN".to_string()));
    }
    if amount.is_infinite() {
        return Err(CrmError::InvalidOpportunityAmount("infinite".to_string()));
    }
    if amount < 0.0 {
        return Err(CrmError::InvalidOpportunityAmount(format!(
            "negative: {}",
            amount
        )));
    }
    Ok(amount)
}

/// BANT 法则判定线索是否合格
///
/// - `score`：线索评分（0-100）
/// - `budget`：是否有预算
/// - `authority`：是否有决策权
/// - `need`：是否有需求
/// - `timeline`：是否有明确时间表
///
/// 合格条件：四项布尔全为 true 且 score ≥ 60。
pub fn is_lead_qualified(
    score: u32,
    budget: bool,
    authority: bool,
    need: bool,
    timeline: bool,
) -> bool {
    score >= 60 && budget && authority && need && timeline
}

/// 计算转化率
///
/// `total_leads` 为 0 时返回 0.0；`leads_converted > total_leads` 时返回 1.0。
pub fn calc_conversion_rate(leads_converted: u64, total_leads: u64) -> f64 {
    if total_leads == 0 {
        return 0.0;
    }
    if leads_converted >= total_leads {
        return 1.0;
    }
    (leads_converted as f64) / (total_leads as f64)
}

#[cfg(test)]
mod tests {
    use super::*;

    // =========================================================================
    // validate_customer_code —— 18 tests
    // =========================================================================

    #[test]
    fn customer_code_valid_simple() {
        assert!(validate_customer_code("CUST-001").is_ok());
    }

    #[test]
    fn customer_code_valid_underscore() {
        assert!(validate_customer_code("C_12345").is_ok());
    }

    #[test]
    fn customer_code_valid_min_length() {
        assert!(validate_customer_code("ABC").is_ok());
    }

    #[test]
    fn customer_code_valid_with_padding() {
        assert!(validate_customer_code("  CUST-001  ").is_ok());
    }

    #[test]
    fn customer_code_valid_mixed_alphanum() {
        assert!(validate_customer_code("CRM2024X1").is_ok());
    }

    #[test]
    fn customer_code_invalid_empty() {
        let r = validate_customer_code("");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), CrmError::InvalidCustomerCode(_)));
    }

    #[test]
    fn customer_code_invalid_only_whitespace() {
        assert!(validate_customer_code("   ").is_err());
    }

    #[test]
    fn customer_code_invalid_too_short() {
        assert!(validate_customer_code("AB").is_err());
    }

    #[test]
    fn customer_code_invalid_too_short_after_trim() {
        assert!(validate_customer_code("  A  ").is_err());
    }

    #[test]
    fn customer_code_invalid_digit_prefix() {
        assert!(validate_customer_code("123ABC").is_err());
    }

    #[test]
    fn customer_code_invalid_underscore_prefix() {
        assert!(validate_customer_code("_CUST001").is_err());
    }

    #[test]
    fn customer_code_invalid_dash_prefix() {
        assert!(validate_customer_code("-CUST001").is_err());
    }

    #[test]
    fn customer_code_invalid_space_inside() {
        assert!(validate_customer_code("CUST 001").is_err());
    }

    #[test]
    fn customer_code_invalid_slash() {
        assert!(validate_customer_code("CUST/001").is_err());
    }

    #[test]
    fn customer_code_invalid_dot() {
        assert!(validate_customer_code("CUST.001").is_err());
    }

    #[test]
    fn customer_code_invalid_too_long() {
        let s = "A".to_string() + &"b".repeat(40);
        assert!(validate_customer_code(&s).is_err());
    }

    #[test]
    fn customer_code_valid_max_length() {
        let s = "A".to_string() + &"b".repeat(31);
        assert_eq!(s.len(), 32);
        assert!(validate_customer_code(&s).is_ok());
    }

    #[test]
    fn customer_code_invalid_just_over_max() {
        let s = "A".to_string() + &"b".repeat(32);
        assert_eq!(s.len(), 33);
        assert!(validate_customer_code(&s).is_err());
    }

    // =========================================================================
    // normalize_phone —— 14 tests
    // =========================================================================

    #[test]
    fn phone_basic_digits() {
        assert_eq!(normalize_phone("13800000000"), "13800000000");
    }

    #[test]
    fn phone_with_dashes() {
        assert_eq!(normalize_phone("138-0000-0000"), "13800000000");
    }

    #[test]
    fn phone_with_spaces() {
        assert_eq!(normalize_phone("138 0000 0000"), "13800000000");
    }

    #[test]
    fn phone_with_plus_prefix() {
        assert_eq!(normalize_phone("+86 138-0000-0000"), "+8613800000000");
    }

    #[test]
    fn phone_with_parens() {
        assert_eq!(normalize_phone("(010) 12345678"), "01012345678");
    }

    #[test]
    fn phone_empty_returns_empty() {
        assert_eq!(normalize_phone(""), "");
    }

    #[test]
    fn phone_only_whitespace_returns_empty() {
        assert_eq!(normalize_phone("   \t  "), "");
    }

    #[test]
    fn phone_only_plus_returns_plus() {
        assert_eq!(normalize_phone("+"), "+");
    }

    #[test]
    fn phone_plus_in_middle_ignored() {
        // + 只在开头保留
        assert_eq!(normalize_phone("138+0000"), "1380000");
    }

    #[test]
    fn phone_with_letters_ignored() {
        assert_eq!(normalize_phone("call 13800000000 now"), "13800000000");
    }

    #[test]
    fn phone_with_padding() {
        assert_eq!(normalize_phone("  13800000000  "), "13800000000");
    }

    #[test]
    fn phone_international_format() {
        assert_eq!(normalize_phone("+1 (555) 123-4567"), "+15551234567");
    }

    #[test]
    fn phone_all_non_digit_ignored() {
        assert_eq!(normalize_phone("abc-def-ghi"), "");
    }

    #[test]
    fn phone_long_international() {
        assert_eq!(
            normalize_phone("+44 20 7946 0958 ext 1234"),
            "+4420794609581234"
        );
    }

    // =========================================================================
    // calc_customer_lifetime_value —— 12 tests
    // =========================================================================

    #[test]
    fn clv_zero_orders() {
        assert_eq!(calc_customer_lifetime_value(0, 100.0, 12), 0.0);
    }

    #[test]
    fn clv_zero_aov() {
        assert_eq!(calc_customer_lifetime_value(10, 0.0, 12), 0.0);
    }

    #[test]
    fn clv_zero_retention() {
        assert_eq!(calc_customer_lifetime_value(10, 100.0, 0), 0.0);
    }

    #[test]
    fn clv_all_zero() {
        assert_eq!(calc_customer_lifetime_value(0, 0.0, 0), 0.0);
    }

    #[test]
    fn clv_basic() {
        // 10 单 × 100 元 × 12 月 = 12000
        assert_eq!(calc_customer_lifetime_value(10, 100.0, 12), 12_000.0);
    }

    #[test]
    fn clv_large_values() {
        // 100 单 × 1000 元 × 24 月 = 2_400_000
        assert_eq!(calc_customer_lifetime_value(100, 1000.0, 24), 2_400_000.0);
    }

    #[test]
    fn clv_negative_aov_clamped() {
        assert_eq!(calc_customer_lifetime_value(10, -100.0, 12), 0.0);
    }

    #[test]
    fn clv_fractional_aov() {
        let v = calc_customer_lifetime_value(7, 49.99, 6);
        assert!((v - 2099.58).abs() < 1e-2);
    }

    #[test]
    fn clv_single_order() {
        assert_eq!(calc_customer_lifetime_value(1, 50.0, 1), 50.0);
    }

    #[test]
    fn clv_long_retention() {
        // 5 单 × 200 元 × 120 月 = 120000
        assert_eq!(calc_customer_lifetime_value(5, 200.0, 120), 120_000.0);
    }

    #[test]
    fn clv_high_value_customer() {
        // 50 单 × 500 元 × 60 月 = 1_500_000
        assert_eq!(calc_customer_lifetime_value(50, 500.0, 60), 1_500_000.0);
    }

    #[test]
    fn clv_small_aov_many_orders() {
        // 1000 单 × 5 元 × 3 月 = 15000
        assert_eq!(calc_customer_lifetime_value(1000, 5.0, 3), 15_000.0);
    }

    // =========================================================================
    // is_valid_customer_status_transition —— 22 tests
    // =========================================================================

    #[test]
    fn customer_transition_lead_to_prospect() {
        assert!(is_valid_customer_status_transition("lead", "prospect"));
    }

    #[test]
    fn customer_transition_lead_to_inactive() {
        assert!(is_valid_customer_status_transition("lead", "inactive"));
    }

    #[test]
    fn customer_transition_lead_to_blacklisted() {
        assert!(is_valid_customer_status_transition("lead", "blacklisted"));
    }

    #[test]
    fn customer_transition_prospect_to_active() {
        assert!(is_valid_customer_status_transition("prospect", "active"));
    }

    #[test]
    fn customer_transition_prospect_back_to_lead() {
        assert!(is_valid_customer_status_transition("prospect", "lead"));
    }

    #[test]
    fn customer_transition_active_to_inactive() {
        assert!(is_valid_customer_status_transition("active", "inactive"));
    }

    #[test]
    fn customer_transition_active_to_churned() {
        assert!(is_valid_customer_status_transition("active", "churned"));
    }

    #[test]
    fn customer_transition_inactive_to_active() {
        assert!(is_valid_customer_status_transition("inactive", "active"));
    }

    #[test]
    fn customer_transition_inactive_to_churned() {
        assert!(is_valid_customer_status_transition("inactive", "churned"));
    }

    #[test]
    fn customer_transition_inactive_to_lead() {
        assert!(is_valid_customer_status_transition("inactive", "lead"));
    }

    #[test]
    fn customer_transition_self_rejected_lead() {
        assert!(!is_valid_customer_status_transition("lead", "lead"));
    }

    #[test]
    fn customer_transition_self_rejected_active() {
        assert!(!is_valid_customer_status_transition("active", "active"));
    }

    #[test]
    fn customer_transition_terminal_churned_rejected() {
        assert!(!is_valid_customer_status_transition("churned", "active"));
        assert!(!is_valid_customer_status_transition("churned", "lead"));
    }

    #[test]
    fn customer_transition_terminal_blacklisted_rejected() {
        assert!(!is_valid_customer_status_transition("blacklisted", "lead"));
        assert!(!is_valid_customer_status_transition(
            "blacklisted",
            "active"
        ));
    }

    #[test]
    fn customer_transition_invalid_jump_lead_to_active() {
        assert!(!is_valid_customer_status_transition("lead", "active"));
    }

    #[test]
    fn customer_transition_invalid_jump_lead_to_churned() {
        assert!(!is_valid_customer_status_transition("lead", "churned"));
    }

    #[test]
    fn customer_transition_invalid_jump_active_to_lead() {
        assert!(!is_valid_customer_status_transition("active", "lead"));
    }

    #[test]
    fn customer_transition_invalid_jump_prospect_to_churned() {
        assert!(!is_valid_customer_status_transition("prospect", "churned"));
    }

    #[test]
    fn customer_transition_unknown_from_rejected() {
        assert!(!is_valid_customer_status_transition("unknown", "active"));
    }

    #[test]
    fn customer_transition_unknown_to_rejected() {
        assert!(!is_valid_customer_status_transition("lead", "garbage"));
    }

    #[test]
    fn customer_transition_empty_strings_rejected() {
        assert!(!is_valid_customer_status_transition("", ""));
    }

    #[test]
    fn customer_transition_case_sensitive() {
        assert!(!is_valid_customer_status_transition("Lead", "prospect"));
        assert!(!is_valid_customer_status_transition("lead", "PROSPECT"));
    }

    // =========================================================================
    // validate_contact_info —— 16 tests
    // =========================================================================

    #[test]
    fn contact_valid_email_only() {
        assert!(validate_contact_info("alice@example.com", "").is_ok());
    }

    #[test]
    fn contact_valid_phone_only() {
        assert!(validate_contact_info("", "13800000000").is_ok());
    }

    #[test]
    fn contact_valid_both() {
        assert!(validate_contact_info("alice@example.com", "13800000000").is_ok());
    }

    #[test]
    fn contact_valid_phone_with_formatting() {
        assert!(validate_contact_info("", "+86 138-0000-0000").is_ok());
    }

    #[test]
    fn contact_invalid_both_empty() {
        let r = validate_contact_info("", "");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), CrmError::InvalidContactInfo(_)));
    }

    #[test]
    fn contact_invalid_both_whitespace() {
        assert!(validate_contact_info("   ", "   ").is_err());
    }

    #[test]
    fn contact_invalid_email_no_at() {
        assert!(validate_contact_info("alice.example.com", "").is_err());
    }

    #[test]
    fn contact_invalid_email_two_at() {
        assert!(validate_contact_info("a@@b.com", "").is_err());
    }

    #[test]
    fn contact_invalid_email_at_start() {
        assert!(validate_contact_info("@example.com", "").is_err());
    }

    #[test]
    fn contact_invalid_email_at_end() {
        assert!(validate_contact_info("alice@", "").is_err());
    }

    #[test]
    fn contact_invalid_phone_too_short() {
        assert!(validate_contact_info("", "12345").is_err());
    }

    #[test]
    fn contact_invalid_phone_too_long() {
        let p = "1".repeat(20);
        assert!(validate_contact_info("", &p).is_err());
    }

    #[test]
    fn contact_valid_phone_min_7_digits() {
        assert!(validate_contact_info("", "1234567").is_ok());
    }

    #[test]
    fn contact_valid_phone_max_15_digits() {
        let p = "1".repeat(15);
        assert!(validate_contact_info("", &p).is_ok());
    }

    #[test]
    fn contact_valid_phone_with_plus_and_spaces() {
        assert!(validate_contact_info("", "+1 555 1234567").is_ok());
    }

    #[test]
    fn contact_invalid_phone_with_letters() {
        // 字母被过滤后剩余数字可能太短
        assert!(validate_contact_info("", "call-123456").is_err());
    }

    // =========================================================================
    // calc_rfm_score —— 14 tests
    // =========================================================================

    #[test]
    fn rfm_best_customer() {
        // 7 天内、20 次、10000 元 → (5, 5, 5)
        assert_eq!(calc_rfm_score(7, 20, 10_000.0), (5, 5, 5));
    }

    #[test]
    fn rfm_worst_customer() {
        // 181 天、1 次、99 元 → (1, 1, 1)
        assert_eq!(calc_rfm_score(181, 1, 99.0), (1, 1, 1));
    }

    #[test]
    fn rfm_recency_boundary_7() {
        assert_eq!(calc_rfm_score(7, 5, 1_000.0).0, 5);
        assert_eq!(calc_rfm_score(8, 5, 1_000.0).0, 4);
    }

    #[test]
    fn rfm_recency_boundary_30() {
        assert_eq!(calc_rfm_score(30, 5, 1_000.0).0, 4);
        assert_eq!(calc_rfm_score(31, 5, 1_000.0).0, 3);
    }

    #[test]
    fn rfm_recency_boundary_90() {
        assert_eq!(calc_rfm_score(90, 5, 1_000.0).0, 3);
        assert_eq!(calc_rfm_score(91, 5, 1_000.0).0, 2);
    }

    #[test]
    fn rfm_recency_boundary_180() {
        assert_eq!(calc_rfm_score(180, 5, 1_000.0).0, 2);
        assert_eq!(calc_rfm_score(181, 5, 1_000.0).0, 1);
    }

    #[test]
    fn rfm_frequency_boundary_2() {
        assert_eq!(calc_rfm_score(7, 2, 1_000.0).1, 2);
        assert_eq!(calc_rfm_score(7, 1, 1_000.0).1, 1);
    }

    #[test]
    fn rfm_frequency_boundary_5() {
        assert_eq!(calc_rfm_score(7, 5, 1_000.0).1, 3);
        assert_eq!(calc_rfm_score(7, 4, 1_000.0).1, 2);
    }

    #[test]
    fn rfm_frequency_boundary_10() {
        assert_eq!(calc_rfm_score(7, 10, 1_000.0).1, 4);
        assert_eq!(calc_rfm_score(7, 9, 1_000.0).1, 3);
    }

    #[test]
    fn rfm_frequency_boundary_20() {
        assert_eq!(calc_rfm_score(7, 20, 1_000.0).1, 5);
        assert_eq!(calc_rfm_score(7, 19, 1_000.0).1, 4);
    }

    #[test]
    fn rfm_monetary_boundary_100() {
        assert_eq!(calc_rfm_score(7, 5, 100.0).2, 2);
        assert_eq!(calc_rfm_score(7, 5, 99.99).2, 1);
    }

    #[test]
    fn rfm_monetary_boundary_1000() {
        assert_eq!(calc_rfm_score(7, 5, 1_000.0).2, 3);
        assert_eq!(calc_rfm_score(7, 5, 999.99).2, 2);
    }

    #[test]
    fn rfm_monetary_boundary_5000() {
        assert_eq!(calc_rfm_score(7, 5, 5_000.0).2, 4);
        assert_eq!(calc_rfm_score(7, 5, 4_999.99).2, 3);
    }

    #[test]
    fn rfm_monetary_boundary_10000() {
        assert_eq!(calc_rfm_score(7, 5, 10_000.0).2, 5);
        assert_eq!(calc_rfm_score(7, 5, 9_999.99).2, 4);
    }

    // =========================================================================
    // normalize_customer_name —— 10 tests
    // =========================================================================

    #[test]
    fn name_basic_preserved() {
        assert_eq!(normalize_customer_name("Alice Zhang"), "Alice Zhang");
    }

    #[test]
    fn name_collapses_internal_spaces() {
        assert_eq!(normalize_customer_name("Alice   Zhang"), "Alice Zhang");
    }

    #[test]
    fn name_trims_padding() {
        assert_eq!(normalize_customer_name("  Alice Zhang  "), "Alice Zhang");
    }

    #[test]
    fn name_empty_returns_empty() {
        assert_eq!(normalize_customer_name(""), "");
    }

    #[test]
    fn name_only_whitespace_returns_empty() {
        assert_eq!(normalize_customer_name("   \t  \n  "), "");
    }

    #[test]
    fn name_single_word() {
        assert_eq!(normalize_customer_name("Alice"), "Alice");
    }

    #[test]
    fn name_mixed_whitespace() {
        assert_eq!(
            normalize_customer_name("Alice \t Bob \n Zhang"),
            "Alice Bob Zhang"
        );
    }

    #[test]
    fn name_preserves_case() {
        assert_eq!(normalize_customer_name("ALICE ZHANG"), "ALICE ZHANG");
    }

    #[test]
    fn name_unicode_preserved() {
        assert_eq!(normalize_customer_name("张  三"), "张 三");
    }

    #[test]
    fn name_multiple_words() {
        assert_eq!(normalize_customer_name("a b c d"), "a b c d");
    }

    // =========================================================================
    // validate_opportunity_amount —— 12 tests
    // =========================================================================

    #[test]
    fn opp_amount_zero_ok() {
        assert_eq!(validate_opportunity_amount(0.0).unwrap(), 0.0);
    }

    #[test]
    fn opp_amount_positive_ok() {
        assert_eq!(validate_opportunity_amount(100.0).unwrap(), 100.0);
    }

    #[test]
    fn opp_amount_large_ok() {
        assert_eq!(
            validate_opportunity_amount(1_000_000.0).unwrap(),
            1_000_000.0
        );
    }

    #[test]
    fn opp_amount_fractional_ok() {
        let r = validate_opportunity_amount(99.99).unwrap();
        assert!((r - 99.99).abs() < 1e-9);
    }

    #[test]
    fn opp_amount_negative_err() {
        assert!(validate_opportunity_amount(-1.0).is_err());
    }

    #[test]
    fn opp_amount_large_negative_err() {
        assert!(validate_opportunity_amount(-1_000_000.0).is_err());
    }

    #[test]
    fn opp_amount_nan_err() {
        assert!(validate_opportunity_amount(f64::NAN).is_err());
    }

    #[test]
    fn opp_amount_inf_err() {
        assert!(validate_opportunity_amount(f64::INFINITY).is_err());
    }

    #[test]
    fn opp_amount_neg_inf_err() {
        assert!(validate_opportunity_amount(f64::NEG_INFINITY).is_err());
    }

    #[test]
    fn opp_amount_tiny_positive_ok() {
        let r = validate_opportunity_amount(0.01).unwrap();
        assert!((r - 0.01).abs() < 1e-9);
    }

    #[test]
    fn opp_amount_negative_zero_ok() {
        // -0.0 视为 0.0（不 < 0）
        let r = validate_opportunity_amount(-0.0);
        assert!(r.is_ok());
    }

    #[test]
    fn opp_amount_error_message_contains_value() {
        let e = validate_opportunity_amount(-5.0).unwrap_err();
        let s = format!("{}", e);
        assert!(s.contains("5") || s.contains("negative"));
    }

    // =========================================================================
    // is_lead_qualified —— 12 tests
    // =========================================================================

    #[test]
    fn lead_qualified_all_true_high_score() {
        assert!(is_lead_qualified(80, true, true, true, true));
    }

    #[test]
    fn lead_qualified_min_score() {
        assert!(is_lead_qualified(60, true, true, true, true));
    }

    #[test]
    fn lead_not_qualified_score_too_low() {
        assert!(!is_lead_qualified(59, true, true, true, true));
    }

    #[test]
    fn lead_not_qualified_no_budget() {
        assert!(!is_lead_qualified(80, false, true, true, true));
    }

    #[test]
    fn lead_not_qualified_no_authority() {
        assert!(!is_lead_qualified(80, true, false, true, true));
    }

    #[test]
    fn lead_not_qualified_no_need() {
        assert!(!is_lead_qualified(80, true, true, false, true));
    }

    #[test]
    fn lead_not_qualified_no_timeline() {
        assert!(!is_lead_qualified(80, true, true, true, false));
    }

    #[test]
    fn lead_not_qualified_all_false() {
        assert!(!is_lead_qualified(80, false, false, false, false));
    }

    #[test]
    fn lead_qualified_max_score() {
        assert!(is_lead_qualified(100, true, true, true, true));
    }

    #[test]
    fn lead_not_qualified_score_zero() {
        assert!(!is_lead_qualified(0, true, true, true, true));
    }

    #[test]
    fn lead_not_qualified_one_missing() {
        assert!(!is_lead_qualified(99, true, true, true, false));
        assert!(!is_lead_qualified(99, true, true, false, true));
        assert!(!is_lead_qualified(99, true, false, true, true));
        assert!(!is_lead_qualified(99, false, true, true, true));
    }

    #[test]
    fn lead_qualified_high_score_all_true() {
        assert!(is_lead_qualified(95, true, true, true, true));
    }

    // =========================================================================
    // calc_conversion_rate —— 12 tests
    // =========================================================================

    #[test]
    fn conversion_rate_zero_total() {
        assert_eq!(calc_conversion_rate(5, 0), 0.0);
    }

    #[test]
    fn conversion_rate_zero_converted() {
        assert_eq!(calc_conversion_rate(0, 100), 0.0);
    }

    #[test]
    fn conversion_rate_all_converted() {
        assert_eq!(calc_conversion_rate(100, 100), 1.0);
    }

    #[test]
    fn conversion_rate_half_converted() {
        let r = calc_conversion_rate(50, 100);
        assert!((r - 0.5).abs() < 1e-9);
    }

    #[test]
    fn conversion_rate_more_converted_than_total_clamped() {
        assert_eq!(calc_conversion_rate(150, 100), 1.0);
    }

    #[test]
    fn conversion_rate_one_tenth() {
        let r = calc_conversion_rate(1, 10);
        assert!((r - 0.1).abs() < 1e-9);
    }

    #[test]
    fn conversion_rate_one_percent() {
        let r = calc_conversion_rate(1, 100);
        assert!((r - 0.01).abs() < 1e-9);
    }

    #[test]
    fn conversion_rate_both_zero() {
        assert_eq!(calc_conversion_rate(0, 0), 0.0);
    }

    #[test]
    fn conversion_rate_large_numbers() {
        let r = calc_conversion_rate(1234, 10000);
        assert!((r - 0.1234).abs() < 1e-9);
    }

    #[test]
    fn conversion_rate_one_in_one() {
        assert_eq!(calc_conversion_rate(1, 1), 1.0);
    }

    #[test]
    fn conversion_rate_typical_funnel() {
        // 1000 线索，250 转化 → 0.25
        let r = calc_conversion_rate(250, 1000);
        assert!((r - 0.25).abs() < 1e-9);
    }

    #[test]
    fn conversion_rate_high_rate() {
        let r = calc_conversion_rate(999, 1000);
        assert!((r - 0.999).abs() < 1e-9);
    }

    // =========================================================================
    // CrmError Display / Clone / Debug —— 8 tests
    // =========================================================================

    #[test]
    fn crm_error_invalid_customer_code_display_not_empty() {
        let e = CrmError::InvalidCustomerCode("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
        assert!(s.contains("bad") || s.contains("customer code"));
    }

    #[test]
    fn crm_error_invalid_contact_info_display_not_empty() {
        let e = CrmError::InvalidContactInfo("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn crm_error_invalid_opportunity_amount_display_not_empty() {
        let e = CrmError::InvalidOpportunityAmount("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn crm_error_clone_and_eq_same() {
        let a = CrmError::InvalidCustomerCode("x".to_string());
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn crm_error_ne_different_variants() {
        let a = CrmError::InvalidCustomerCode("x".to_string());
        let b = CrmError::InvalidContactInfo("x".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn crm_error_ne_different_payload() {
        let a = CrmError::InvalidCustomerCode("x".to_string());
        let b = CrmError::InvalidCustomerCode("y".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn crm_error_debug_format_contains_variant() {
        let a = CrmError::InvalidCustomerCode("abc".to_string());
        let s = format!("{:?}", a);
        assert!(s.contains("InvalidCustomerCode"));
        assert!(s.contains("abc"));
    }

    #[test]
    fn crm_error_can_be_used_in_match() {
        fn classify(e: &CrmError) -> &'static str {
            match e {
                CrmError::InvalidCustomerCode(_) => "code",
                CrmError::InvalidContactInfo(_) => "contact",
                CrmError::InvalidOpportunityAmount(_) => "amount",
            }
        }
        assert_eq!(classify(&CrmError::InvalidCustomerCode("a".into())), "code");
        assert_eq!(
            classify(&CrmError::InvalidContactInfo("a".into())),
            "contact"
        );
        assert_eq!(
            classify(&CrmError::InvalidOpportunityAmount("a".into())),
            "amount"
        );
    }

    // =========================================================================
    // 常量与边界 —— 6 tests
    // =========================================================================

    #[test]
    fn customer_states_has_six_entries() {
        assert_eq!(CUSTOMER_STATES.len(), 6);
        assert!(CUSTOMER_STATES.contains(&"lead"));
        assert!(CUSTOMER_STATES.contains(&"active"));
    }

    #[test]
    fn customer_terminal_has_two_entries() {
        assert_eq!(CUSTOMER_TERMINAL.len(), 2);
        assert!(CUSTOMER_TERMINAL.contains(&"churned"));
        assert!(CUSTOMER_TERMINAL.contains(&"blacklisted"));
    }

    #[test]
    fn customer_transitions_non_empty() {
        assert!(!CUSTOMER_TRANSITIONS.is_empty());
        assert!(CUSTOMER_TRANSITIONS.contains(&("lead", "prospect")));
    }

    #[test]
    fn customer_code_max_len_is_32() {
        assert_eq!(CUSTOMER_CODE_MAX_LEN, 32);
    }

    #[test]
    fn customer_code_min_len_is_3() {
        assert_eq!(CUSTOMER_CODE_MIN_LEN, 3);
    }

    #[test]
    fn terminal_states_not_in_transitions_as_source() {
        // 终态不应作为任何转移的 from
        for (from, _to) in CUSTOMER_TRANSITIONS {
            assert!(
                !CUSTOMER_TERMINAL.contains(from),
                "terminal state '{}' appears as transition source",
                from
            );
        }
    }
}

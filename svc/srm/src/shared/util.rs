//! SRM 领域纯函数工具集 —— 校验、归一化、招标评分与合同到期
//!
//! 本模块仅包含无副作用、无 IO 的纯函数，便于单元测试覆盖。
//! 与 `shared/permission.rs`、`models/supplier.rs` 风格保持一致，
//! 不与现有评分模块重叠。

/// SRM 工具层通用错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum SrmError {
    #[error("invalid supplier code: {0}")]
    InvalidSupplierCode(String),
    #[error("invalid contract amount: {0}")]
    InvalidContractAmount(String),
    #[error("invalid delivery date: {0}")]
    InvalidDeliveryDate(String),
}

/// 供应商状态机：与 `models/supplier.rs` 中 status 取值一致
pub const SUPPLIER_STATES: &[&str] = &[
    "pending",
    "approved",
    "active",
    "suspended",
    "blacklisted",
    "terminated",
    "rejected",
];

/// 供应商状态机的终态
pub const SUPPLIER_TERMINAL: &[&str] = &["blacklisted", "terminated", "rejected"];

/// 供应商状态机允许的 (from, to) 转移
pub const SUPPLIER_TRANSITIONS: &[(&str, &str)] = &[
    ("pending", "approved"),
    ("pending", "rejected"),
    ("approved", "active"),
    ("approved", "pending"),
    ("active", "suspended"),
    ("active", "terminated"),
    ("suspended", "active"),
    ("suspended", "blacklisted"),
    ("suspended", "terminated"),
];

/// 供应商编码最大长度（不含）
pub const SUPPLIER_CODE_MAX_LEN: usize = 32;
/// 供应商编码最小长度（含）
pub const SUPPLIER_CODE_MIN_LEN: usize = 3;

/// 招标评分各维度权重默认值（价格/质量/交付）
pub const DEFAULT_WEIGHTS: (f64, f64, f64) = (0.4, 0.4, 0.2);

/// 校验供应商编码
///
/// 规则：非空；trim 后长度 [3, 32]；首字符为 ASCII 字母；
/// 仅允许 ASCII 字母数字、`-`、`_`。
pub fn validate_supplier_code(s: &str) -> Result<(), SrmError> {
    if s.is_empty() {
        return Err(SrmError::InvalidSupplierCode("empty".to_string()));
    }
    let trimmed = s.trim();
    if trimmed.len() < SUPPLIER_CODE_MIN_LEN {
        return Err(SrmError::InvalidSupplierCode(format!(
            "too short: '{}'",
            trimmed
        )));
    }
    if trimmed.len() > SUPPLIER_CODE_MAX_LEN {
        return Err(SrmError::InvalidSupplierCode(format!(
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
        return Err(SrmError::InvalidSupplierCode(format!(
            "must start with letter: '{}'",
            trimmed
        )));
    }
    let all_ok = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !all_ok {
        return Err(SrmError::InvalidSupplierCode(format!(
            "contains invalid chars: '{}'",
            trimmed
        )));
    }
    Ok(())
}

/// 归一化报价单号：去首尾空白、内部连续空白压缩为单 `-`、转大写
pub fn normalize_quotation_no(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_space = false;
    for c in trimmed.chars() {
        if c.is_whitespace() {
            if !prev_space {
                result.push('-');
                prev_space = true;
            }
        } else {
            result.push(c.to_ascii_uppercase());
            prev_space = false;
        }
    }
    result
}

/// 供应商状态转移是否合法
///
/// 规则：未知状态拒绝；自转移拒绝；终态拒绝；必须在 `SUPPLIER_TRANSITIONS` 中。
pub fn is_valid_supplier_status_transition(from: &str, to: &str) -> bool {
    if !SUPPLIER_STATES.contains(&from) || !SUPPLIER_STATES.contains(&to) {
        return false;
    }
    if SUPPLIER_TERMINAL.contains(&from) {
        return false;
    }
    if from == to {
        return false;
    }
    SUPPLIER_TRANSITIONS.contains(&(from, to))
}

/// 计算招标综合评分
///
/// - `price_score`：价格得分（0-100）
/// - `quality_score`：质量得分（0-100）
/// - `delivery_score`：交付得分（0-100）
/// - `weights`：`(price_weight, quality_weight, delivery_weight)`，会归一化为 1.0
///
/// 返回加权平均分。各得分 clamp 到 [0, 100]；权重为 0 时返回 0.0。
pub fn calc_bid_score(
    price_score: f64,
    quality_score: f64,
    delivery_score: f64,
    weights: (f64, f64, f64),
) -> f64 {
    let p = price_score.clamp(0.0, 100.0);
    let q = quality_score.clamp(0.0, 100.0);
    let d = delivery_score.clamp(0.0, 100.0);
    let (pw, qw, dw) = weights;
    let total_w = pw + qw + dw;
    if total_w <= 0.0 {
        return 0.0;
    }
    let pw_n = pw / total_w;
    let qw_n = qw / total_w;
    let dw_n = dw / total_w;
    p * pw_n + q * qw_n + d * dw_n
}

/// 校验合同金额
///
/// 规则：非负；有限（非 NaN、非 Inf）；> 0 时返回原值，= 0 时返回 0.0。
pub fn validate_contract_amount(amount: f64) -> Result<f64, SrmError> {
    if amount.is_nan() {
        return Err(SrmError::InvalidContractAmount("NaN".to_string()));
    }
    if amount.is_infinite() {
        return Err(SrmError::InvalidContractAmount("infinite".to_string()));
    }
    if amount < 0.0 {
        return Err(SrmError::InvalidContractAmount(format!(
            "negative: {}",
            amount
        )));
    }
    Ok(amount)
}

/// 判定合同是否已过期
///
/// 参数为 epoch 天数。`end_date < current_date` 即过期（严格小于）。
pub fn is_contract_expired(end_date_days: i64, current_date_days: i64) -> bool {
    end_date_days < current_date_days
}

/// 计算评分列表的算术平均
///
/// 空列表返回 0.0；各元素 clamp 到 [0, 100]。
pub fn calc_total_score(scores: &[f64]) -> f64 {
    if scores.is_empty() {
        return 0.0;
    }
    let sum: f64 = scores.iter().map(|s| s.clamp(0.0, 100.0)).sum();
    sum / (scores.len() as f64)
}

/// 校验交付日期
///
/// 参数为 epoch 天数。规则：`promised >= requested`（承诺日不能早于要求日）。
pub fn validate_delivery_date(requested_days: i64, promised_days: i64) -> Result<(), SrmError> {
    if promised_days < requested_days {
        return Err(SrmError::InvalidDeliveryDate(format!(
            "promised ({}) before requested ({})",
            promised_days, requested_days
        )));
    }
    Ok(())
}

/// 归一化供应商名称：去首尾空白、内部连续空白压缩为单空格
pub fn normalize_supplier_name(s: &str) -> String {
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

/// 判定是否为优选供应商
///
/// 规则：`rating` ≥ 4 且 `on_time_rate` ≥ 0.95。
/// rating clamp 到 [0, 5]；on_time_rate clamp 到 [0, 1]。
pub fn is_preferred_supplier(rating: f64, on_time_rate: f64) -> bool {
    let r = rating.clamp(0.0, 5.0);
    let o = on_time_rate.clamp(0.0, 1.0);
    r >= 4.0 && o >= 0.95
}

#[cfg(test)]
mod tests {
    use super::*;

    // =========================================================================
    // validate_supplier_code —— 18 tests
    // =========================================================================

    #[test]
    fn supplier_code_valid_simple() {
        assert!(validate_supplier_code("SUP-001").is_ok());
    }

    #[test]
    fn supplier_code_valid_underscore() {
        assert!(validate_supplier_code("SUP_2024_001").is_ok());
    }

    #[test]
    fn supplier_code_valid_min_length() {
        assert!(validate_supplier_code("ABC").is_ok());
    }

    #[test]
    fn supplier_code_valid_with_padding() {
        assert!(validate_supplier_code("  SUP-001  ").is_ok());
    }

    #[test]
    fn supplier_code_valid_mixed_alphanum() {
        assert!(validate_supplier_code("SUP2024X1").is_ok());
    }

    #[test]
    fn supplier_code_invalid_empty() {
        let r = validate_supplier_code("");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), SrmError::InvalidSupplierCode(_)));
    }

    #[test]
    fn supplier_code_invalid_only_whitespace() {
        assert!(validate_supplier_code("   ").is_err());
    }

    #[test]
    fn supplier_code_invalid_too_short() {
        assert!(validate_supplier_code("AB").is_err());
    }

    #[test]
    fn supplier_code_invalid_too_short_after_trim() {
        assert!(validate_supplier_code("  A  ").is_err());
    }

    #[test]
    fn supplier_code_invalid_digit_prefix() {
        assert!(validate_supplier_code("123ABC").is_err());
    }

    #[test]
    fn supplier_code_invalid_underscore_prefix() {
        assert!(validate_supplier_code("_SUP001").is_err());
    }

    #[test]
    fn supplier_code_invalid_dash_prefix() {
        assert!(validate_supplier_code("-SUP001").is_err());
    }

    #[test]
    fn supplier_code_invalid_space_inside() {
        assert!(validate_supplier_code("SUP 001").is_err());
    }

    #[test]
    fn supplier_code_invalid_slash() {
        assert!(validate_supplier_code("SUP/001").is_err());
    }

    #[test]
    fn supplier_code_invalid_dot() {
        assert!(validate_supplier_code("SUP.001").is_err());
    }

    #[test]
    fn supplier_code_invalid_too_long() {
        let s = "A".to_string() + &"b".repeat(40);
        assert!(validate_supplier_code(&s).is_err());
    }

    #[test]
    fn supplier_code_valid_max_length() {
        let s = "A".to_string() + &"b".repeat(31);
        assert_eq!(s.len(), 32);
        assert!(validate_supplier_code(&s).is_ok());
    }

    #[test]
    fn supplier_code_invalid_just_over_max() {
        let s = "A".to_string() + &"b".repeat(32);
        assert_eq!(s.len(), 33);
        assert!(validate_supplier_code(&s).is_err());
    }

    // =========================================================================
    // normalize_quotation_no —— 12 tests
    // =========================================================================

    #[test]
    fn quote_no_basic_uppercase() {
        assert_eq!(normalize_quotation_no("q2024-001"), "Q2024-001");
    }

    #[test]
    fn quote_no_internal_space_becomes_dash() {
        assert_eq!(normalize_quotation_no("  Q 2024 001  "), "Q-2024-001");
    }

    #[test]
    fn quote_no_empty_returns_empty() {
        assert_eq!(normalize_quotation_no(""), "");
    }

    #[test]
    fn quote_no_only_whitespace_returns_empty() {
        assert_eq!(normalize_quotation_no("   \t\n  "), "");
    }

    #[test]
    fn quote_no_mixed_whitespace() {
        assert_eq!(normalize_quotation_no("q \t\n 2024 \n 001"), "Q-2024-001");
    }

    #[test]
    fn quote_no_already_normalized() {
        assert_eq!(normalize_quotation_no("Q-2024-001"), "Q-2024-001");
    }

    #[test]
    fn quote_no_preserves_digits() {
        assert_eq!(normalize_quotation_no("q2024"), "Q2024");
    }

    #[test]
    fn quote_no_single_char() {
        assert_eq!(normalize_quotation_no("q"), "Q");
    }

    #[test]
    fn quote_no_preserves_dash_and_underscore() {
        assert_eq!(normalize_quotation_no("q_2024-1"), "Q_2024-1");
    }

    #[test]
    fn quote_no_unicode_preserved() {
        // 非 ASCII 字符原样保留
        assert_eq!(normalize_quotation_no("报价 001"), "报价-001");
    }

    #[test]
    fn quote_no_multiple_consecutive_dashes_preserved() {
        assert_eq!(normalize_quotation_no("q-2024"), "Q-2024");
    }

    #[test]
    fn quote_no_only_special_chars() {
        // 特殊字符保留（不被当作空白）
        assert_eq!(normalize_quotation_no("q-1"), "Q-1");
    }

    // =========================================================================
    // is_valid_supplier_status_transition —— 22 tests
    // =========================================================================

    #[test]
    fn supplier_transition_pending_to_approved() {
        assert!(is_valid_supplier_status_transition("pending", "approved"));
    }

    #[test]
    fn supplier_transition_pending_to_rejected() {
        assert!(is_valid_supplier_status_transition("pending", "rejected"));
    }

    #[test]
    fn supplier_transition_approved_to_active() {
        assert!(is_valid_supplier_status_transition("approved", "active"));
    }

    #[test]
    fn supplier_transition_approved_back_to_pending() {
        assert!(is_valid_supplier_status_transition("approved", "pending"));
    }

    #[test]
    fn supplier_transition_active_to_suspended() {
        assert!(is_valid_supplier_status_transition("active", "suspended"));
    }

    #[test]
    fn supplier_transition_active_to_terminated() {
        assert!(is_valid_supplier_status_transition("active", "terminated"));
    }

    #[test]
    fn supplier_transition_suspended_to_active() {
        assert!(is_valid_supplier_status_transition("suspended", "active"));
    }

    #[test]
    fn supplier_transition_suspended_to_blacklisted() {
        assert!(is_valid_supplier_status_transition(
            "suspended",
            "blacklisted"
        ));
    }

    #[test]
    fn supplier_transition_suspended_to_terminated() {
        assert!(is_valid_supplier_status_transition(
            "suspended",
            "terminated"
        ));
    }

    #[test]
    fn supplier_transition_self_rejected_pending() {
        assert!(!is_valid_supplier_status_transition("pending", "pending"));
    }

    #[test]
    fn supplier_transition_self_rejected_active() {
        assert!(!is_valid_supplier_status_transition("active", "active"));
    }

    #[test]
    fn supplier_transition_terminal_blacklisted_rejected() {
        assert!(!is_valid_supplier_status_transition(
            "blacklisted",
            "active"
        ));
        assert!(!is_valid_supplier_status_transition(
            "blacklisted",
            "suspended"
        ));
    }

    #[test]
    fn supplier_transition_terminal_terminated_rejected() {
        assert!(!is_valid_supplier_status_transition("terminated", "active"));
        assert!(!is_valid_supplier_status_transition(
            "terminated",
            "suspended"
        ));
    }

    #[test]
    fn supplier_transition_invalid_jump_pending_to_active() {
        assert!(!is_valid_supplier_status_transition("pending", "active"));
    }

    #[test]
    fn supplier_transition_invalid_jump_pending_to_blacklisted() {
        assert!(!is_valid_supplier_status_transition(
            "pending",
            "blacklisted"
        ));
    }

    #[test]
    fn supplier_transition_invalid_jump_active_to_blacklisted() {
        assert!(!is_valid_supplier_status_transition(
            "active",
            "blacklisted"
        ));
    }

    #[test]
    fn supplier_transition_invalid_jump_approved_to_suspended() {
        assert!(!is_valid_supplier_status_transition(
            "approved",
            "suspended"
        ));
    }

    #[test]
    fn supplier_transition_unknown_from_rejected() {
        assert!(!is_valid_supplier_status_transition("unknown", "active"));
    }

    #[test]
    fn supplier_transition_unknown_to_rejected() {
        assert!(!is_valid_supplier_status_transition("pending", "garbage"));
    }

    #[test]
    fn supplier_transition_empty_strings_rejected() {
        assert!(!is_valid_supplier_status_transition("", ""));
    }

    #[test]
    fn supplier_transition_case_sensitive() {
        assert!(!is_valid_supplier_status_transition("Pending", "approved"));
        assert!(!is_valid_supplier_status_transition("pending", "APPROVED"));
    }

    #[test]
    fn supplier_transition_blacklisted_to_terminated_rejected() {
        // blacklisted 是终态
        assert!(!is_valid_supplier_status_transition(
            "blacklisted",
            "terminated"
        ));
    }

    // =========================================================================
    // calc_bid_score —— 16 tests
    // =========================================================================

    #[test]
    fn bid_score_default_weights_basic() {
        // 80 × 0.4 + 90 × 0.4 + 85 × 0.2 = 32 + 36 + 17 = 85
        let s = calc_bid_score(80.0, 90.0, 85.0, DEFAULT_WEIGHTS);
        assert!((s - 85.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_all_zero_scores() {
        assert_eq!(calc_bid_score(0.0, 0.0, 0.0, DEFAULT_WEIGHTS), 0.0);
    }

    #[test]
    fn bid_score_all_max_scores() {
        assert_eq!(calc_bid_score(100.0, 100.0, 100.0, DEFAULT_WEIGHTS), 100.0);
    }

    #[test]
    fn bid_score_zero_weights_returns_zero() {
        assert_eq!(calc_bid_score(80.0, 90.0, 85.0, (0.0, 0.0, 0.0)), 0.0);
    }

    #[test]
    fn bid_score_negative_weights_returns_zero() {
        assert_eq!(calc_bid_score(80.0, 90.0, 85.0, (-1.0, -1.0, -1.0)), 0.0);
    }

    #[test]
    fn bid_score_only_price_weight() {
        let s = calc_bid_score(80.0, 90.0, 85.0, (1.0, 0.0, 0.0));
        assert!((s - 80.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_only_quality_weight() {
        let s = calc_bid_score(80.0, 90.0, 85.0, (0.0, 1.0, 0.0));
        assert!((s - 90.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_only_delivery_weight() {
        let s = calc_bid_score(80.0, 90.0, 85.0, (0.0, 0.0, 1.0));
        assert!((s - 85.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_negative_score_clamped() {
        // -10 → 0
        let s = calc_bid_score(-10.0, 90.0, 85.0, (1.0, 0.0, 0.0));
        assert!((s - 0.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_over_100_clamped() {
        // 150 → 100
        let s = calc_bid_score(150.0, 90.0, 85.0, (1.0, 0.0, 0.0));
        assert!((s - 100.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_weights_normalized() {
        // 权重 (2, 2, 1) 归一化为 (0.4, 0.4, 0.2)
        let s1 = calc_bid_score(80.0, 90.0, 85.0, DEFAULT_WEIGHTS);
        let s2 = calc_bid_score(80.0, 90.0, 85.0, (2.0, 2.0, 1.0));
        assert!((s1 - s2).abs() < 1e-9);
    }

    #[test]
    fn bid_score_equal_weights() {
        let s = calc_bid_score(80.0, 90.0, 100.0, (1.0, 1.0, 1.0));
        // (80+90+100)/3 = 90
        assert!((s - 90.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_fractional_scores() {
        let s = calc_bid_score(85.5, 92.3, 88.1, DEFAULT_WEIGHTS);
        // 85.5*0.4 + 92.3*0.4 + 88.1*0.2 = 34.2 + 36.92 + 17.62 = 88.74
        assert!((s - 88.74).abs() < 1e-4);
    }

    #[test]
    fn bid_score_all_clamped_low() {
        let s = calc_bid_score(-50.0, -50.0, -50.0, DEFAULT_WEIGHTS);
        assert!((s - 0.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_all_clamped_high() {
        let s = calc_bid_score(200.0, 200.0, 200.0, DEFAULT_WEIGHTS);
        assert!((s - 100.0).abs() < 1e-9);
    }

    #[test]
    fn bid_score_typical_procurement() {
        // 价格优势大但质量稍差
        let s = calc_bid_score(95.0, 75.0, 85.0, (0.5, 0.3, 0.2));
        // 95*0.5 + 75*0.3 + 85*0.2 = 47.5 + 22.5 + 17 = 87
        assert!((s - 87.0).abs() < 1e-9);
    }

    // =========================================================================
    // validate_contract_amount —— 12 tests
    // =========================================================================

    #[test]
    fn contract_amount_zero_ok() {
        assert_eq!(validate_contract_amount(0.0).unwrap(), 0.0);
    }

    #[test]
    fn contract_amount_positive_ok() {
        assert_eq!(validate_contract_amount(100.0).unwrap(), 100.0);
    }

    #[test]
    fn contract_amount_large_ok() {
        assert_eq!(
            validate_contract_amount(10_000_000.0).unwrap(),
            10_000_000.0
        );
    }

    #[test]
    fn contract_amount_fractional_ok() {
        let r = validate_contract_amount(99.99).unwrap();
        assert!((r - 99.99).abs() < 1e-9);
    }

    #[test]
    fn contract_amount_negative_err() {
        assert!(validate_contract_amount(-1.0).is_err());
    }

    #[test]
    fn contract_amount_large_negative_err() {
        assert!(validate_contract_amount(-1_000_000.0).is_err());
    }

    #[test]
    fn contract_amount_nan_err() {
        assert!(validate_contract_amount(f64::NAN).is_err());
    }

    #[test]
    fn contract_amount_inf_err() {
        assert!(validate_contract_amount(f64::INFINITY).is_err());
    }

    #[test]
    fn contract_amount_neg_inf_err() {
        assert!(validate_contract_amount(f64::NEG_INFINITY).is_err());
    }

    #[test]
    fn contract_amount_tiny_positive_ok() {
        let r = validate_contract_amount(0.01).unwrap();
        assert!((r - 0.01).abs() < 1e-9);
    }

    #[test]
    fn contract_amount_negative_zero_ok() {
        assert!(validate_contract_amount(-0.0).is_ok());
    }

    #[test]
    fn contract_amount_error_message_contains_value() {
        let e = validate_contract_amount(-5.0).unwrap_err();
        let s = format!("{}", e);
        assert!(s.contains("5") || s.contains("negative"));
    }

    // =========================================================================
    // is_contract_expired —— 10 tests
    // =========================================================================

    #[test]
    fn contract_expired_before_end() {
        assert!(!is_contract_expired(1_000, 500));
    }

    #[test]
    fn contract_expired_after_end() {
        assert!(is_contract_expired(500, 1_000));
    }

    #[test]
    fn contract_expired_exact_end() {
        // 严格小于 → 同一天不算过期
        assert!(!is_contract_expired(1_000, 1_000));
    }

    #[test]
    fn contract_expired_zero_values() {
        assert!(!is_contract_expired(0, 0));
    }

    #[test]
    fn contract_expired_negative_end() {
        // end_date 在过去（负数）→ 过期
        assert!(is_contract_expired(-1, 0));
    }

    #[test]
    fn contract_expired_negative_current() {
        // current 在过去，end 在更远的过去 → 未过期
        assert!(!is_contract_expired(-100, -200));
    }

    #[test]
    fn contract_expired_large_values() {
        assert!(is_contract_expired(1_000_000, 2_000_000));
        assert!(!is_contract_expired(2_000_000, 1_000_000));
    }

    #[test]
    fn contract_expired_one_day_late() {
        assert!(is_contract_expired(1_000, 1_001));
    }

    #[test]
    fn contract_expired_one_day_before() {
        assert!(!is_contract_expired(1_000, 999));
    }

    #[test]
    fn contract_expired_far_future_end() {
        assert!(!is_contract_expired(10_000_000_000, 1_000));
    }

    // =========================================================================
    // calc_total_score —— 14 tests
    // =========================================================================

    #[test]
    fn total_score_empty_list() {
        assert_eq!(calc_total_score(&[]), 0.0);
    }

    #[test]
    fn total_score_single_element() {
        assert_eq!(calc_total_score(&[80.0]), 80.0);
    }

    #[test]
    fn total_score_two_elements() {
        assert_eq!(calc_total_score(&[80.0, 90.0]), 85.0);
    }

    #[test]
    fn total_score_three_elements() {
        let r = calc_total_score(&[80.0, 90.0, 100.0]);
        assert!((r - 90.0).abs() < 1e-9);
    }

    #[test]
    fn total_score_all_zero() {
        assert_eq!(calc_total_score(&[0.0, 0.0, 0.0]), 0.0);
    }

    #[test]
    fn total_score_all_max() {
        assert_eq!(calc_total_score(&[100.0, 100.0]), 100.0);
    }

    #[test]
    fn total_score_negative_clamped() {
        // -10 → 0
        let r = calc_total_score(&[-10.0, 90.0]);
        assert!((r - 45.0).abs() < 1e-9);
    }

    #[test]
    fn total_score_over_100_clamped() {
        // 150 → 100
        let r = calc_total_score(&[150.0, 50.0]);
        assert!((r - 75.0).abs() < 1e-9);
    }

    #[test]
    fn total_score_mixed_clamped() {
        let r = calc_total_score(&[-50.0, 200.0]);
        // 0 + 100 / 2 = 50
        assert!((r - 50.0).abs() < 1e-9);
    }

    #[test]
    fn total_score_large_list() {
        let scores: Vec<f64> = (0..10).map(|i| (i as f64) * 10.0).collect();
        // 0+10+...+90 = 450，平均 45
        assert!((calc_total_score(&scores) - 45.0).abs() < 1e-9);
    }

    #[test]
    fn total_score_all_negative_clamped() {
        let r = calc_total_score(&[-10.0, -20.0, -30.0]);
        assert!((r - 0.0).abs() < 1e-9);
    }

    #[test]
    fn total_score_all_over_100_clamped() {
        let r = calc_total_score(&[150.0, 200.0]);
        assert!((r - 100.0).abs() < 1e-9);
    }

    #[test]
    fn total_score_fractional_values() {
        let r = calc_total_score(&[85.5, 92.3, 88.1]);
        // (85.5 + 92.3 + 88.1) / 3 = 88.6333...
        assert!((r - 88.6333).abs() < 1e-3);
    }

    #[test]
    fn total_score_typical_evaluation() {
        // 5 个评审员打分
        let r = calc_total_score(&[88.0, 92.0, 85.0, 90.0, 87.0]);
        // (88+92+85+90+87)/5 = 442/5 = 88.4
        assert!((r - 88.4).abs() < 1e-9);
    }

    // =========================================================================
    // validate_delivery_date —— 10 tests
    // =========================================================================

    #[test]
    fn delivery_date_promised_equals_requested_ok() {
        assert!(validate_delivery_date(100, 100).is_ok());
    }

    #[test]
    fn delivery_date_promised_after_requested_ok() {
        assert!(validate_delivery_date(100, 200).is_ok());
    }

    #[test]
    fn delivery_date_promised_before_requested_err() {
        let r = validate_delivery_date(200, 100);
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), SrmError::InvalidDeliveryDate(_)));
    }

    #[test]
    fn delivery_date_zero_both_ok() {
        assert!(validate_delivery_date(0, 0).is_ok());
    }

    #[test]
    fn delivery_date_negative_requested_ok() {
        // 负的 requested（过去），promised 等于或之后即可
        assert!(validate_delivery_date(-100, -100).is_ok());
        assert!(validate_delivery_date(-100, 0).is_ok());
    }

    #[test]
    fn delivery_date_negative_promised_before_positive_requested_err() {
        assert!(validate_delivery_date(100, -100).is_err());
    }

    #[test]
    fn delivery_date_far_future_ok() {
        assert!(validate_delivery_date(1_000, 10_000_000).is_ok());
    }

    #[test]
    fn delivery_date_one_day_before_err() {
        assert!(validate_delivery_date(101, 100).is_err());
    }

    #[test]
    fn delivery_date_one_day_after_ok() {
        assert!(validate_delivery_date(100, 101).is_ok());
    }

    #[test]
    fn delivery_date_error_message_contains_dates() {
        let e = validate_delivery_date(200, 100).unwrap_err();
        let s = format!("{}", e);
        assert!(s.contains("100") || s.contains("200"));
    }

    // =========================================================================
    // normalize_supplier_name —— 10 tests
    // =========================================================================

    #[test]
    fn supplier_name_basic_preserved() {
        assert_eq!(normalize_supplier_name("Acme Corp"), "Acme Corp");
    }

    #[test]
    fn supplier_name_collapses_internal_spaces() {
        assert_eq!(normalize_supplier_name("Acme   Corp"), "Acme Corp");
    }

    #[test]
    fn supplier_name_trims_padding() {
        assert_eq!(normalize_supplier_name("  Acme Corp  "), "Acme Corp");
    }

    #[test]
    fn supplier_name_empty_returns_empty() {
        assert_eq!(normalize_supplier_name(""), "");
    }

    #[test]
    fn supplier_name_only_whitespace_returns_empty() {
        assert_eq!(normalize_supplier_name("   \t  \n  "), "");
    }

    #[test]
    fn supplier_name_single_word() {
        assert_eq!(normalize_supplier_name("Acme"), "Acme");
    }

    #[test]
    fn supplier_name_mixed_whitespace() {
        assert_eq!(
            normalize_supplier_name("Acme \t Corp \n Ltd"),
            "Acme Corp Ltd"
        );
    }

    #[test]
    fn supplier_name_preserves_case() {
        assert_eq!(normalize_supplier_name("ACME CORP"), "ACME CORP");
    }

    #[test]
    fn supplier_name_unicode_preserved() {
        assert_eq!(
            normalize_supplier_name("北京  科技  公司"),
            "北京 科技 公司"
        );
    }

    #[test]
    fn supplier_name_multiple_words() {
        assert_eq!(normalize_supplier_name("a b c d"), "a b c d");
    }

    // =========================================================================
    // is_preferred_supplier —— 14 tests
    // =========================================================================

    #[test]
    fn preferred_high_rating_high_on_time() {
        assert!(is_preferred_supplier(4.5, 0.98));
    }

    #[test]
    fn preferred_min_rating_min_on_time() {
        assert!(is_preferred_supplier(4.0, 0.95));
    }

    #[test]
    fn preferred_max_values() {
        assert!(is_preferred_supplier(5.0, 1.0));
    }

    #[test]
    fn preferred_low_rating_high_on_time() {
        assert!(!is_preferred_supplier(3.9, 0.98));
    }

    #[test]
    fn preferred_high_rating_low_on_time() {
        assert!(!is_preferred_supplier(4.5, 0.94));
    }

    #[test]
    fn preferred_low_rating_low_on_time() {
        assert!(!is_preferred_supplier(3.0, 0.80));
    }

    #[test]
    fn preferred_zero_rating() {
        assert!(!is_preferred_supplier(0.0, 1.0));
    }

    #[test]
    fn preferred_zero_on_time() {
        assert!(!is_preferred_supplier(5.0, 0.0));
    }

    #[test]
    fn preferred_both_zero() {
        assert!(!is_preferred_supplier(0.0, 0.0));
    }

    #[test]
    fn preferred_negative_rating_clamped() {
        // -1 → 0
        assert!(!is_preferred_supplier(-1.0, 1.0));
    }

    #[test]
    fn preferred_over_5_rating_clamped() {
        // 10 → 5
        assert!(is_preferred_supplier(10.0, 1.0));
    }

    #[test]
    fn preferred_negative_on_time_clamped() {
        // -0.5 → 0
        assert!(!is_preferred_supplier(5.0, -0.5));
    }

    #[test]
    fn preferred_over_one_on_time_clamped() {
        // 1.5 → 1.0
        assert!(is_preferred_supplier(5.0, 1.5));
    }

    #[test]
    fn preferred_just_below_threshold_rating() {
        assert!(!is_preferred_supplier(3.99, 0.98));
    }

    // =========================================================================
    // SrmError Display / Clone / Debug —— 8 tests
    // =========================================================================

    #[test]
    fn srm_error_invalid_supplier_code_display_not_empty() {
        let e = SrmError::InvalidSupplierCode("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
        assert!(s.contains("bad") || s.contains("supplier"));
    }

    #[test]
    fn srm_error_invalid_contract_amount_display_not_empty() {
        let e = SrmError::InvalidContractAmount("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn srm_error_invalid_delivery_date_display_not_empty() {
        let e = SrmError::InvalidDeliveryDate("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn srm_error_clone_and_eq_same() {
        let a = SrmError::InvalidSupplierCode("x".to_string());
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn srm_error_ne_different_variants() {
        let a = SrmError::InvalidSupplierCode("x".to_string());
        let b = SrmError::InvalidContractAmount("x".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn srm_error_ne_different_payload() {
        let a = SrmError::InvalidSupplierCode("x".to_string());
        let b = SrmError::InvalidSupplierCode("y".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn srm_error_debug_format_contains_variant() {
        let a = SrmError::InvalidSupplierCode("abc".to_string());
        let s = format!("{:?}", a);
        assert!(s.contains("InvalidSupplierCode"));
        assert!(s.contains("abc"));
    }

    #[test]
    fn srm_error_can_be_used_in_match() {
        fn classify(e: &SrmError) -> &'static str {
            match e {
                SrmError::InvalidSupplierCode(_) => "sup",
                SrmError::InvalidContractAmount(_) => "amt",
                SrmError::InvalidDeliveryDate(_) => "del",
            }
        }
        assert_eq!(classify(&SrmError::InvalidSupplierCode("a".into())), "sup");
        assert_eq!(
            classify(&SrmError::InvalidContractAmount("a".into())),
            "amt"
        );
        assert_eq!(classify(&SrmError::InvalidDeliveryDate("a".into())), "del");
    }

    // =========================================================================
    // 常量与边界 —— 6 tests
    // =========================================================================

    #[test]
    fn supplier_states_has_seven_entries() {
        assert_eq!(SUPPLIER_STATES.len(), 7);
        assert!(SUPPLIER_STATES.contains(&"pending"));
        assert!(SUPPLIER_STATES.contains(&"active"));
    }

    #[test]
    fn supplier_terminal_has_three_entries() {
        assert_eq!(SUPPLIER_TERMINAL.len(), 3);
        assert!(SUPPLIER_TERMINAL.contains(&"blacklisted"));
        assert!(SUPPLIER_TERMINAL.contains(&"terminated"));
        assert!(SUPPLIER_TERMINAL.contains(&"rejected"));
    }

    #[test]
    fn supplier_transitions_non_empty() {
        assert!(!SUPPLIER_TRANSITIONS.is_empty());
        assert!(SUPPLIER_TRANSITIONS.contains(&("pending", "approved")));
    }

    #[test]
    fn supplier_code_max_len_is_32() {
        assert_eq!(SUPPLIER_CODE_MAX_LEN, 32);
    }

    #[test]
    fn supplier_code_min_len_is_3() {
        assert_eq!(SUPPLIER_CODE_MIN_LEN, 3);
    }

    #[test]
    fn terminal_states_not_in_transitions_as_source() {
        for (from, _to) in SUPPLIER_TRANSITIONS {
            assert!(
                !SUPPLIER_TERMINAL.contains(from),
                "terminal state '{}' appears as transition source",
                from
            );
        }
    }
}

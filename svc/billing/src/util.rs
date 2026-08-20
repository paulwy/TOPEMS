//! Billing 领域纯函数工具集 —— 校验、税务、折扣与发票状态机
//!
//! 本模块仅包含无副作用、无 IO 的纯函数，便于单元测试覆盖。
//! 与 `models.rs` 中的纯函数（`calculate_percent_used` 等）风格保持一致，
//! 不与现有函数重叠。

/// Billing 工具层通用错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum BillingError {
    #[error("invalid invoice number: {0}")]
    InvalidInvoiceNo(String),
    #[error("invalid currency code: {0}")]
    InvalidCurrencyCode(String),
    #[error("invalid payment amount: {0}")]
    InvalidPaymentAmount(String),
}

/// 发票状态机：与 `models.rs` 中 `Invoice.status` 取值一致
pub const INVOICE_STATES: &[&str] = &["draft", "open", "paid", "void", "uncollectible"];

/// 发票状态机的终态
pub const INVOICE_TERMINAL: &[&str] = &["paid", "void", "uncollectible"];

/// 发票状态机允许的 (from, to) 转移
pub const INVOICE_TRANSITIONS: &[(&str, &str)] = &[
    ("draft", "open"),
    ("draft", "void"),
    ("open", "paid"),
    ("open", "void"),
    ("open", "uncollectible"),
    ("open", "draft"),
];

/// 发票编号最大长度（不含）
pub const INVOICE_NO_MAX_LEN: usize = 32;
/// 发票编号最小长度（含）
pub const INVOICE_NO_MIN_LEN: usize = 3;

/// 支持的 ISO 4217 货币代码（小部分常用）
pub const VALID_CURRENCY_CODES: &[&str] = &[
    "USD", "EUR", "GBP", "JPY", "CNY", "HKD", "AUD", "CAD", "SGD", "KRW", "INR", "CHF",
];

/// 校验发票编号
///
/// 规则：非空；trim 后长度 [3, 32]；首字符为 ASCII 字母；
/// 仅允许 ASCII 字母数字、`-`、`_`。
pub fn validate_invoice_no(s: &str) -> Result<(), BillingError> {
    if s.is_empty() {
        return Err(BillingError::InvalidInvoiceNo("empty".to_string()));
    }
    let trimmed = s.trim();
    if trimmed.len() < INVOICE_NO_MIN_LEN {
        return Err(BillingError::InvalidInvoiceNo(format!(
            "too short: '{}'",
            trimmed
        )));
    }
    if trimmed.len() > INVOICE_NO_MAX_LEN {
        return Err(BillingError::InvalidInvoiceNo(format!(
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
        return Err(BillingError::InvalidInvoiceNo(format!(
            "must start with letter: '{}'",
            trimmed
        )));
    }
    let all_ok = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !all_ok {
        return Err(BillingError::InvalidInvoiceNo(format!(
            "contains invalid chars: '{}'",
            trimmed
        )));
    }
    Ok(())
}

/// 计算税额
///
/// 公式：`subtotal × tax_rate`。负输入按 0 处理；tax_rate clamp 到 [0, 1]。
pub fn calc_tax_amount(subtotal: f64, tax_rate: f64) -> f64 {
    let s = if subtotal < 0.0 { 0.0 } else { subtotal };
    let r = tax_rate.clamp(0.0, 1.0);
    s * r
}

/// 发票状态转移是否合法
///
/// 规则：未知状态拒绝；自转移拒绝；终态拒绝；必须在 `INVOICE_TRANSITIONS` 中。
pub fn is_valid_invoice_status_transition(from: &str, to: &str) -> bool {
    topems_shared_core::is_valid_transition(
        from,
        to,
        INVOICE_TRANSITIONS,
        INVOICE_TERMINAL,
        INVOICE_STATES,
    )
}

/// 计算行项小计
///
/// 参数为 `&[(price, qty)]`，price 为单价，qty 为数量。
/// 负 price 按 0 处理；qty 为 0 时贡献 0。
pub fn calc_subtotal(line_items: &[(f64, u32)]) -> f64 {
    line_items
        .iter()
        .map(|(price, qty)| {
            let p = if *price < 0.0 { 0.0 } else { *price };
            p * (*qty as f64)
        })
        .sum()
}

/// 校验货币代码
///
/// 必须是 3 个 ASCII 大写字母，且在 `VALID_CURRENCY_CODES` 中。
pub fn validate_currency_code(code: &str) -> Result<(), BillingError> {
    let trimmed = code.trim();
    if trimmed.is_empty() {
        return Err(BillingError::InvalidCurrencyCode("empty".to_string()));
    }
    if trimmed.len() != 3 {
        return Err(BillingError::InvalidCurrencyCode(format!(
            "must be 3 letters: '{}'",
            trimmed
        )));
    }
    if !trimmed.chars().all(|c| c.is_ascii_uppercase()) {
        return Err(BillingError::InvalidCurrencyCode(format!(
            "must be uppercase ASCII: '{}'",
            trimmed
        )));
    }
    if !VALID_CURRENCY_CODES.contains(&trimmed) {
        return Err(BillingError::InvalidCurrencyCode(format!(
            "unsupported currency: '{}'",
            trimmed
        )));
    }
    Ok(())
}

/// 计算折扣金额
///
/// 公式：`original × discount_rate`。负 original 按 0 处理；rate clamp 到 [0, 1]。
pub fn calc_discount_amount(original: f64, discount_rate: f64) -> f64 {
    let o = if original < 0.0 { 0.0 } else { original };
    let r = discount_rate.clamp(0.0, 1.0);
    o * r
}

/// 判定支付是否逾期
///
/// 参数为 epoch 秒数。`due_date < current_date` 即逾期（严格小于）。
pub fn is_payment_overdue(due_date_secs: i64, current_date_secs: i64) -> bool {
    due_date_secs < current_date_secs
}

/// 计算逾期滞纳金
///
/// 公式：`amount × days_overdue × rate_per_day`。
/// 负 amount/days 按 0 处理；rate clamp 到 [0, 1]。
pub fn calc_late_fee(amount: f64, days_overdue: i64, rate_per_day: f64) -> f64 {
    let a = if amount < 0.0 { 0.0 } else { amount };
    let d = if days_overdue < 0 { 0 } else { days_overdue } as f64;
    let r = rate_per_day.clamp(0.0, 1.0);
    a * d * r
}

/// 归一化税务登记号：去首尾空白、内部连续空白压缩为单空格、转大写
pub fn normalize_tax_id(s: &str) -> String {
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
            result.push(c.to_ascii_uppercase());
            prev_space = false;
        }
    }
    result
}

/// 校验支付金额
///
/// 规则：
/// - 必须 ≥ 0 且有限（非 NaN、非 Inf）
/// - 不能超过发票总额（部分支付允许，超额拒绝）
pub fn validate_payment_amount(amount: f64, invoice_total: f64) -> Result<f64, BillingError> {
    if amount.is_nan() {
        return Err(BillingError::InvalidPaymentAmount("NaN".to_string()));
    }
    if amount.is_infinite() {
        return Err(BillingError::InvalidPaymentAmount("infinite".to_string()));
    }
    if amount < 0.0 {
        return Err(BillingError::InvalidPaymentAmount(format!(
            "negative: {}",
            amount
        )));
    }
    if amount > invoice_total {
        return Err(BillingError::InvalidPaymentAmount(format!(
            "exceeds invoice total: {} > {}",
            amount, invoice_total
        )));
    }
    Ok(amount)
}

#[cfg(test)]
mod tests {
    use super::*;

    // =========================================================================
    // validate_invoice_no —— 18 tests
    // =========================================================================

    #[test]
    fn invoice_no_valid_simple() {
        assert!(validate_invoice_no("INV-001").is_ok());
    }

    #[test]
    fn invoice_no_valid_underscore() {
        assert!(validate_invoice_no("INV_2024_001").is_ok());
    }

    #[test]
    fn invoice_no_valid_min_length() {
        assert!(validate_invoice_no("ABC").is_ok());
    }

    #[test]
    fn invoice_no_valid_with_padding() {
        assert!(validate_invoice_no("  INV-001  ").is_ok());
    }

    #[test]
    fn invoice_no_valid_mixed_alphanum() {
        assert!(validate_invoice_no("INV2024X1").is_ok());
    }

    #[test]
    fn invoice_no_invalid_empty() {
        let r = validate_invoice_no("");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), BillingError::InvalidInvoiceNo(_)));
    }

    #[test]
    fn invoice_no_invalid_only_whitespace() {
        assert!(validate_invoice_no("   ").is_err());
    }

    #[test]
    fn invoice_no_invalid_too_short() {
        assert!(validate_invoice_no("AB").is_err());
    }

    #[test]
    fn invoice_no_invalid_too_short_after_trim() {
        assert!(validate_invoice_no("  A  ").is_err());
    }

    #[test]
    fn invoice_no_invalid_digit_prefix() {
        assert!(validate_invoice_no("123ABC").is_err());
    }

    #[test]
    fn invoice_no_invalid_underscore_prefix() {
        assert!(validate_invoice_no("_INV001").is_err());
    }

    #[test]
    fn invoice_no_invalid_dash_prefix() {
        assert!(validate_invoice_no("-INV001").is_err());
    }

    #[test]
    fn invoice_no_invalid_space_inside() {
        assert!(validate_invoice_no("INV 001").is_err());
    }

    #[test]
    fn invoice_no_invalid_slash() {
        assert!(validate_invoice_no("INV/001").is_err());
    }

    #[test]
    fn invoice_no_invalid_dot() {
        assert!(validate_invoice_no("INV.001").is_err());
    }

    #[test]
    fn invoice_no_invalid_too_long() {
        let s = "A".to_string() + &"b".repeat(40);
        assert!(validate_invoice_no(&s).is_err());
    }

    #[test]
    fn invoice_no_valid_max_length() {
        let s = "A".to_string() + &"b".repeat(31);
        assert_eq!(s.len(), 32);
        assert!(validate_invoice_no(&s).is_ok());
    }

    #[test]
    fn invoice_no_invalid_just_over_max() {
        let s = "A".to_string() + &"b".repeat(32);
        assert_eq!(s.len(), 33);
        assert!(validate_invoice_no(&s).is_err());
    }

    // =========================================================================
    // calc_tax_amount —— 14 tests
    // =========================================================================

    #[test]
    fn tax_zero_subtotal() {
        assert_eq!(calc_tax_amount(0.0, 0.1), 0.0);
    }

    #[test]
    fn tax_zero_rate() {
        assert_eq!(calc_tax_amount(100.0, 0.0), 0.0);
    }

    #[test]
    fn tax_basic_10_pct() {
        assert_eq!(calc_tax_amount(100.0, 0.1), 10.0);
    }

    #[test]
    fn tax_basic_20_pct() {
        assert_eq!(calc_tax_amount(100.0, 0.2), 20.0);
    }

    #[test]
    fn tax_full_rate() {
        assert_eq!(calc_tax_amount(100.0, 1.0), 100.0);
    }

    #[test]
    fn tax_negative_subtotal_clamped() {
        assert_eq!(calc_tax_amount(-100.0, 0.1), 0.0);
    }

    #[test]
    fn tax_negative_rate_clamped() {
        assert_eq!(calc_tax_amount(100.0, -0.1), 0.0);
    }

    #[test]
    fn tax_over_one_rate_clamped() {
        assert_eq!(calc_tax_amount(100.0, 1.5), 100.0);
    }

    #[test]
    fn tax_large_subtotal() {
        assert_eq!(calc_tax_amount(1_000_000.0, 0.05), 50_000.0);
    }

    #[test]
    fn tax_fractional_subtotal() {
        let r = calc_tax_amount(99.99, 0.08);
        assert!((r - 7.9992).abs() < 1e-4);
    }

    #[test]
    fn tax_typical_vat() {
        // 中国 VAT 13%
        assert_eq!(calc_tax_amount(1000.0, 0.13), 130.0);
    }

    #[test]
    fn tax_small_rate() {
        let r = calc_tax_amount(100.0, 0.001);
        assert!((r - 0.1).abs() < 1e-9);
    }

    #[test]
    fn tax_both_negative() {
        assert_eq!(calc_tax_amount(-50.0, -0.1), 0.0);
    }

    #[test]
    fn tax_inf_rate_clamped() {
        assert_eq!(calc_tax_amount(100.0, f64::INFINITY), 100.0);
    }

    // =========================================================================
    // is_valid_invoice_status_transition —— 20 tests
    // =========================================================================

    #[test]
    fn invoice_transition_draft_to_open() {
        assert!(is_valid_invoice_status_transition("draft", "open"));
    }

    #[test]
    fn invoice_transition_draft_to_void() {
        assert!(is_valid_invoice_status_transition("draft", "void"));
    }

    #[test]
    fn invoice_transition_open_to_paid() {
        assert!(is_valid_invoice_status_transition("open", "paid"));
    }

    #[test]
    fn invoice_transition_open_to_void() {
        assert!(is_valid_invoice_status_transition("open", "void"));
    }

    #[test]
    fn invoice_transition_open_to_uncollectible() {
        assert!(is_valid_invoice_status_transition("open", "uncollectible"));
    }

    #[test]
    fn invoice_transition_open_back_to_draft() {
        assert!(is_valid_invoice_status_transition("open", "draft"));
    }

    #[test]
    fn invoice_transition_self_rejected_draft() {
        assert!(!is_valid_invoice_status_transition("draft", "draft"));
    }

    #[test]
    fn invoice_transition_self_rejected_open() {
        assert!(!is_valid_invoice_status_transition("open", "open"));
    }

    #[test]
    fn invoice_transition_terminal_paid_rejected() {
        assert!(!is_valid_invoice_status_transition("paid", "open"));
        assert!(!is_valid_invoice_status_transition("paid", "draft"));
    }

    #[test]
    fn invoice_transition_terminal_void_rejected() {
        assert!(!is_valid_invoice_status_transition("void", "draft"));
        assert!(!is_valid_invoice_status_transition("void", "open"));
    }

    #[test]
    fn invoice_transition_terminal_uncollectible_rejected() {
        assert!(!is_valid_invoice_status_transition("uncollectible", "open"));
        assert!(!is_valid_invoice_status_transition("uncollectible", "paid"));
    }

    #[test]
    fn invoice_transition_invalid_jump_draft_to_paid() {
        assert!(!is_valid_invoice_status_transition("draft", "paid"));
    }

    #[test]
    fn invoice_transition_invalid_jump_draft_to_uncollectible() {
        assert!(!is_valid_invoice_status_transition(
            "draft",
            "uncollectible"
        ));
    }

    #[test]
    fn invoice_transition_invalid_jump_paid_to_void() {
        assert!(!is_valid_invoice_status_transition("paid", "void"));
    }

    #[test]
    fn invoice_transition_unknown_from_rejected() {
        assert!(!is_valid_invoice_status_transition("unknown", "open"));
    }

    #[test]
    fn invoice_transition_unknown_to_rejected() {
        assert!(!is_valid_invoice_status_transition("draft", "garbage"));
    }

    #[test]
    fn invoice_transition_both_unknown_rejected() {
        assert!(!is_valid_invoice_status_transition("foo", "bar"));
    }

    #[test]
    fn invoice_transition_empty_strings_rejected() {
        assert!(!is_valid_invoice_status_transition("", ""));
    }

    #[test]
    fn invoice_transition_case_sensitive() {
        assert!(!is_valid_invoice_status_transition("Draft", "open"));
        assert!(!is_valid_invoice_status_transition("draft", "OPEN"));
    }

    #[test]
    fn invoice_transition_void_to_paid_rejected() {
        // void 是终态
        assert!(!is_valid_invoice_status_transition("void", "paid"));
    }

    // =========================================================================
    // calc_subtotal —— 14 tests
    // =========================================================================

    #[test]
    fn subtotal_empty_list() {
        assert_eq!(calc_subtotal(&[]), 0.0);
    }

    #[test]
    fn subtotal_single_item() {
        assert_eq!(calc_subtotal(&[(100.0, 2)]), 200.0);
    }

    #[test]
    fn subtotal_multiple_items() {
        assert_eq!(calc_subtotal(&[(100.0, 2), (50.0, 3)]), 350.0);
    }

    #[test]
    fn subtotal_zero_price() {
        assert_eq!(calc_subtotal(&[(0.0, 5)]), 0.0);
    }

    #[test]
    fn subtotal_zero_qty() {
        assert_eq!(calc_subtotal(&[(100.0, 0)]), 0.0);
    }

    #[test]
    fn subtotal_negative_price_clamped() {
        assert_eq!(calc_subtotal(&[(-100.0, 2)]), 0.0);
    }

    #[test]
    fn subtotal_mixed_negative_and_positive() {
        assert_eq!(calc_subtotal(&[(-100.0, 2), (50.0, 3)]), 150.0);
    }

    #[test]
    fn subtotal_large_qty() {
        assert_eq!(calc_subtotal(&[(1.0, 1_000_000)]), 1_000_000.0);
    }

    #[test]
    fn subtotal_fractional_price() {
        let r = calc_subtotal(&[(9.99, 3)]);
        assert!((r - 29.97).abs() < 1e-9);
    }

    #[test]
    fn subtotal_many_items() {
        let items: Vec<(f64, u32)> = (0..10).map(|i| ((i as f64) + 1.0, 1)).collect();
        // 1+2+...+10 = 55
        assert_eq!(calc_subtotal(&items), 55.0);
    }

    #[test]
    fn subtotal_all_zero_qty() {
        assert_eq!(calc_subtotal(&[(100.0, 0), (200.0, 0)]), 0.0);
    }

    #[test]
    fn subtotal_all_negative_price() {
        assert_eq!(calc_subtotal(&[(-10.0, 5), (-20.0, 3)]), 0.0);
    }

    #[test]
    fn subtotal_typical_invoice() {
        let items = vec![(19.99, 2), (5.50, 4), (100.0, 1)];
        // 39.98 + 22.0 + 100.0 = 161.98
        let r = calc_subtotal(&items);
        assert!((r - 161.98).abs() < 1e-9);
    }

    #[test]
    fn subtotal_one_item_zero_qty_one_item_real() {
        assert_eq!(calc_subtotal(&[(100.0, 0), (50.0, 2)]), 100.0);
    }

    // =========================================================================
    // validate_currency_code —— 16 tests
    // =========================================================================

    #[test]
    fn currency_valid_usd() {
        assert!(validate_currency_code("USD").is_ok());
    }

    #[test]
    fn currency_valid_eur() {
        assert!(validate_currency_code("EUR").is_ok());
    }

    #[test]
    fn currency_valid_cny() {
        assert!(validate_currency_code("CNY").is_ok());
    }

    #[test]
    fn currency_valid_jpy() {
        assert!(validate_currency_code("JPY").is_ok());
    }

    #[test]
    fn currency_valid_hkd() {
        assert!(validate_currency_code("HKD").is_ok());
    }

    #[test]
    fn currency_valid_with_padding() {
        assert!(validate_currency_code("  USD  ").is_ok());
    }

    #[test]
    fn currency_invalid_empty() {
        let r = validate_currency_code("");
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            BillingError::InvalidCurrencyCode(_)
        ));
    }

    #[test]
    fn currency_invalid_only_whitespace() {
        assert!(validate_currency_code("   ").is_err());
    }

    #[test]
    fn currency_invalid_too_short() {
        assert!(validate_currency_code("US").is_err());
    }

    #[test]
    fn currency_invalid_too_long() {
        assert!(validate_currency_code("USDD").is_err());
    }

    #[test]
    fn currency_invalid_lowercase() {
        assert!(validate_currency_code("usd").is_err());
    }

    #[test]
    fn currency_invalid_mixed_case() {
        assert!(validate_currency_code("Usd").is_err());
    }

    #[test]
    fn currency_invalid_digits() {
        assert!(validate_currency_code("US1").is_err());
    }

    #[test]
    fn currency_invalid_unsupported() {
        // 3 个大写字母但不在白名单
        assert!(validate_currency_code("XXX").is_err());
        assert!(validate_currency_code("ABC").is_err());
    }

    #[test]
    fn currency_invalid_special_chars() {
        assert!(validate_currency_code("U$D").is_err());
    }

    #[test]
    fn currency_all_valid_codes_pass() {
        for code in VALID_CURRENCY_CODES {
            assert!(
                validate_currency_code(code).is_ok(),
                "code {} should pass",
                code
            );
        }
    }

    // =========================================================================
    // calc_discount_amount —— 12 tests
    // =========================================================================

    #[test]
    fn discount_zero_original() {
        assert_eq!(calc_discount_amount(0.0, 0.1), 0.0);
    }

    #[test]
    fn discount_zero_rate() {
        assert_eq!(calc_discount_amount(100.0, 0.0), 0.0);
    }

    #[test]
    fn discount_basic_10_pct() {
        assert_eq!(calc_discount_amount(100.0, 0.1), 10.0);
    }

    #[test]
    fn discount_basic_50_pct() {
        assert_eq!(calc_discount_amount(100.0, 0.5), 50.0);
    }

    #[test]
    fn discount_full_100_pct() {
        assert_eq!(calc_discount_amount(100.0, 1.0), 100.0);
    }

    #[test]
    fn discount_negative_original_clamped() {
        assert_eq!(calc_discount_amount(-100.0, 0.1), 0.0);
    }

    #[test]
    fn discount_negative_rate_clamped() {
        assert_eq!(calc_discount_amount(100.0, -0.1), 0.0);
    }

    #[test]
    fn discount_over_one_rate_clamped() {
        assert_eq!(calc_discount_amount(100.0, 1.5), 100.0);
    }

    #[test]
    fn discount_large_original() {
        assert_eq!(calc_discount_amount(1_000_000.0, 0.2), 200_000.0);
    }

    #[test]
    fn discount_fractional_original() {
        let r = calc_discount_amount(99.99, 0.15);
        assert!((r - 14.9985).abs() < 1e-4);
    }

    #[test]
    fn discount_small_rate() {
        let r = calc_discount_amount(100.0, 0.001);
        assert!((r - 0.1).abs() < 1e-9);
    }

    #[test]
    fn discount_both_negative() {
        assert_eq!(calc_discount_amount(-100.0, -0.1), 0.0);
    }

    // =========================================================================
    // is_payment_overdue —— 10 tests
    // =========================================================================

    #[test]
    fn overdue_before_due_date() {
        assert!(!is_payment_overdue(1_000, 500));
    }

    #[test]
    fn overdue_after_due_date() {
        assert!(is_payment_overdue(500, 1_000));
    }

    #[test]
    fn overdue_exact_due_date() {
        // 严格小于 → 同一天不算逾期
        assert!(!is_payment_overdue(1_000, 1_000));
    }

    #[test]
    fn overdue_zero_values() {
        assert!(!is_payment_overdue(0, 0));
    }

    #[test]
    fn overdue_negative_due() {
        // due_date 在过去（负数）→ 逾期
        assert!(is_payment_overdue(-1, 0));
    }

    #[test]
    fn overdue_negative_current() {
        // current 在过去，due 在更远的过去
        assert!(!is_payment_overdue(-100, -200));
    }

    #[test]
    fn overdue_large_values() {
        assert!(is_payment_overdue(1_000_000, 2_000_000));
        assert!(!is_payment_overdue(2_000_000, 1_000_000));
    }

    #[test]
    fn overdue_one_second_late() {
        assert!(is_payment_overdue(1_000, 1_001));
    }

    #[test]
    fn overdue_one_second_before() {
        assert!(!is_payment_overdue(1_000, 999));
    }

    #[test]
    fn overdue_far_future_due() {
        assert!(!is_payment_overdue(10_000_000_000, 1_000));
    }

    // =========================================================================
    // calc_late_fee —— 12 tests
    // =========================================================================

    #[test]
    fn late_fee_zero_amount() {
        assert_eq!(calc_late_fee(0.0, 30, 0.01), 0.0);
    }

    #[test]
    fn late_fee_zero_days() {
        assert_eq!(calc_late_fee(100.0, 0, 0.01), 0.0);
    }

    #[test]
    fn late_fee_zero_rate() {
        assert_eq!(calc_late_fee(100.0, 30, 0.0), 0.0);
    }

    #[test]
    fn late_fee_basic() {
        // 100 × 30 × 0.01 = 30
        assert_eq!(calc_late_fee(100.0, 30, 0.01), 30.0);
    }

    #[test]
    fn late_fee_negative_amount_clamped() {
        assert_eq!(calc_late_fee(-100.0, 30, 0.01), 0.0);
    }

    #[test]
    fn late_fee_negative_days_clamped() {
        assert_eq!(calc_late_fee(100.0, -5, 0.01), 0.0);
    }

    #[test]
    fn late_fee_negative_rate_clamped() {
        assert_eq!(calc_late_fee(100.0, 30, -0.01), 0.0);
    }

    #[test]
    fn late_fee_over_one_rate_clamped() {
        // rate clamp 到 [0, 1]
        assert_eq!(calc_late_fee(100.0, 30, 1.5), 3000.0);
    }

    #[test]
    fn late_fee_full_rate() {
        assert_eq!(calc_late_fee(100.0, 10, 1.0), 1000.0);
    }

    #[test]
    fn late_fee_large_values() {
        assert_eq!(calc_late_fee(10_000.0, 365, 0.001), 3650.0);
    }

    #[test]
    fn late_fee_small_rate() {
        let r = calc_late_fee(1000.0, 1, 0.0001);
        assert!((r - 0.1).abs() < 1e-9);
    }

    #[test]
    fn late_fee_typical_credit_card() {
        // 1000 元账单，逾期 5 天，每天 0.05%
        let r = calc_late_fee(1000.0, 5, 0.0005);
        assert!((r - 2.5).abs() < 1e-9);
    }

    // =========================================================================
    // normalize_tax_id —— 10 tests
    // =========================================================================

    #[test]
    fn tax_id_basic_uppercase() {
        assert_eq!(normalize_tax_id("us123456789"), "US123456789");
    }

    #[test]
    fn tax_id_internal_space_preserved() {
        // 内部空格压缩为单空格并大写
        assert_eq!(normalize_tax_id("us 1234 5678"), "US 1234 5678");
    }

    #[test]
    fn tax_id_empty_returns_empty() {
        assert_eq!(normalize_tax_id(""), "");
    }

    #[test]
    fn tax_id_only_whitespace_returns_empty() {
        assert_eq!(normalize_tax_id("   \t\n  "), "");
    }

    #[test]
    fn tax_id_collapses_multiple_spaces() {
        assert_eq!(normalize_tax_id("US   1234"), "US 1234");
    }

    #[test]
    fn tax_id_trims_padding() {
        assert_eq!(normalize_tax_id("  US1234  "), "US1234");
    }

    #[test]
    fn tax_id_mixed_whitespace() {
        assert_eq!(normalize_tax_id("US \t 1234"), "US 1234");
    }

    #[test]
    fn tax_id_preserves_digits() {
        assert_eq!(
            normalize_tax_id("91 1100 00MA02CT357K"),
            "91 1100 00MA02CT357K"
        );
    }

    #[test]
    fn tax_id_single_char() {
        assert_eq!(normalize_tax_id("x"), "X");
    }

    #[test]
    fn tax_id_preserves_dash() {
        assert_eq!(normalize_tax_id("us-1234"), "US-1234");
    }

    // =========================================================================
    // validate_payment_amount —— 14 tests
    // =========================================================================

    #[test]
    fn payment_amount_zero_ok() {
        assert_eq!(validate_payment_amount(0.0, 100.0).unwrap(), 0.0);
    }

    #[test]
    fn payment_amount_partial_ok() {
        assert_eq!(validate_payment_amount(30.0, 100.0).unwrap(), 30.0);
    }

    #[test]
    fn payment_amount_full_ok() {
        assert_eq!(validate_payment_amount(100.0, 100.0).unwrap(), 100.0);
    }

    #[test]
    fn payment_amount_over_invoice_err() {
        assert!(validate_payment_amount(101.0, 100.0).is_err());
    }

    #[test]
    fn payment_amount_negative_err() {
        assert!(validate_payment_amount(-1.0, 100.0).is_err());
    }

    #[test]
    fn payment_amount_large_negative_err() {
        assert!(validate_payment_amount(-1_000_000.0, 100.0).is_err());
    }

    #[test]
    fn payment_amount_nan_err() {
        assert!(validate_payment_amount(f64::NAN, 100.0).is_err());
    }

    #[test]
    fn payment_amount_inf_err() {
        assert!(validate_payment_amount(f64::INFINITY, 100.0).is_err());
    }

    #[test]
    fn payment_amount_neg_inf_err() {
        assert!(validate_payment_amount(f64::NEG_INFINITY, 100.0).is_err());
    }

    #[test]
    fn payment_amount_tiny_positive_ok() {
        let r = validate_payment_amount(0.01, 100.0).unwrap();
        assert!((r - 0.01).abs() < 1e-9);
    }

    #[test]
    fn payment_amount_negative_zero_ok() {
        assert!(validate_payment_amount(-0.0, 100.0).is_ok());
    }

    #[test]
    fn payment_amount_zero_invoice_zero_payment_ok() {
        assert!(validate_payment_amount(0.0, 0.0).is_ok());
    }

    #[test]
    fn payment_amount_zero_invoice_positive_payment_err() {
        assert!(validate_payment_amount(1.0, 0.0).is_err());
    }

    #[test]
    fn payment_amount_error_message_contains_values() {
        let e = validate_payment_amount(150.0, 100.0).unwrap_err();
        let s = format!("{}", e);
        assert!(s.contains("150") || s.contains("exceeds"));
    }

    // =========================================================================
    // BillingError Display / Clone / Debug —— 8 tests
    // =========================================================================

    #[test]
    fn billing_error_invalid_invoice_no_display_not_empty() {
        let e = BillingError::InvalidInvoiceNo("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
        assert!(s.contains("bad") || s.contains("invoice"));
    }

    #[test]
    fn billing_error_invalid_currency_display_not_empty() {
        let e = BillingError::InvalidCurrencyCode("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn billing_error_invalid_payment_display_not_empty() {
        let e = BillingError::InvalidPaymentAmount("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn billing_error_clone_and_eq_same() {
        let a = BillingError::InvalidInvoiceNo("x".to_string());
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn billing_error_ne_different_variants() {
        let a = BillingError::InvalidInvoiceNo("x".to_string());
        let b = BillingError::InvalidCurrencyCode("x".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn billing_error_ne_different_payload() {
        let a = BillingError::InvalidInvoiceNo("x".to_string());
        let b = BillingError::InvalidInvoiceNo("y".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn billing_error_debug_format_contains_variant() {
        let a = BillingError::InvalidInvoiceNo("abc".to_string());
        let s = format!("{:?}", a);
        assert!(s.contains("InvalidInvoiceNo"));
        assert!(s.contains("abc"));
    }

    #[test]
    fn billing_error_can_be_used_in_match() {
        fn classify(e: &BillingError) -> &'static str {
            match e {
                BillingError::InvalidInvoiceNo(_) => "inv",
                BillingError::InvalidCurrencyCode(_) => "ccy",
                BillingError::InvalidPaymentAmount(_) => "pay",
            }
        }
        assert_eq!(classify(&BillingError::InvalidInvoiceNo("a".into())), "inv");
        assert_eq!(
            classify(&BillingError::InvalidCurrencyCode("a".into())),
            "ccy"
        );
        assert_eq!(
            classify(&BillingError::InvalidPaymentAmount("a".into())),
            "pay"
        );
    }

    // =========================================================================
    // 常量与边界 —— 6 tests
    // =========================================================================

    #[test]
    fn invoice_states_has_five_entries() {
        assert_eq!(INVOICE_STATES.len(), 5);
        assert!(INVOICE_STATES.contains(&"draft"));
        assert!(INVOICE_STATES.contains(&"paid"));
    }

    #[test]
    fn invoice_terminal_has_three_entries() {
        assert_eq!(INVOICE_TERMINAL.len(), 3);
        assert!(INVOICE_TERMINAL.contains(&"paid"));
        assert!(INVOICE_TERMINAL.contains(&"void"));
        assert!(INVOICE_TERMINAL.contains(&"uncollectible"));
    }

    #[test]
    fn invoice_transitions_non_empty() {
        assert!(!INVOICE_TRANSITIONS.is_empty());
        assert!(INVOICE_TRANSITIONS.contains(&("draft", "open")));
    }

    #[test]
    fn valid_currency_codes_has_twelve_entries() {
        assert_eq!(VALID_CURRENCY_CODES.len(), 12);
    }

    #[test]
    fn invoice_no_max_len_is_32() {
        assert_eq!(INVOICE_NO_MAX_LEN, 32);
    }

    #[test]
    fn terminal_states_not_in_transitions_as_source() {
        for (from, _to) in INVOICE_TRANSITIONS {
            assert!(
                !INVOICE_TERMINAL.contains(from),
                "terminal state '{}' appears as transition source",
                from
            );
        }
    }
}

use rust_decimal::Decimal;
use serde::Serialize;
use std::collections::BTreeMap;
use utoipa::ToSchema;

use super::super::super::models::JournalEntry;
use super::periods::{validate_trial_balance, PeriodValidationError};

/// 单个账户的借贷汇总。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct AccountTotal {
    pub account_code: String,
    pub account_name: String,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
}

/// 试算平衡计算结果。
#[derive(Debug, Clone, PartialEq, Serialize, ToSchema)]
pub struct TrialBalanceResult {
    pub total_debits: Decimal,
    pub total_credits: Decimal,
    pub is_balanced: bool,
    pub per_account_totals: Vec<AccountTotal>,
}

/// 纯函数：根据一组日记账分录计算试算平衡表。
///
/// 汇总所有分录的借方/贷方总额，并按账户代码分组得到每个账户的借贷汇总。
/// 当 `total_debits == total_credits` 时 `is_balanced` 为真。
/// 该函数无副作用、不依赖数据库，便于单元测试。
pub fn calculate_trial_balance(entries: &[JournalEntry]) -> TrialBalanceResult {
    let mut total_debits = Decimal::ZERO;
    let mut total_credits = Decimal::ZERO;
    // 按 account_code 聚合，保留第一次出现的 account_name。
    let mut by_code: BTreeMap<String, AccountTotal> = BTreeMap::new();

    for entry in entries {
        total_debits += entry.debit;
        total_credits += entry.credit;

        let account_total = by_code
            .entry(entry.account_code.clone())
            .or_insert_with(|| AccountTotal {
                account_code: entry.account_code.clone(),
                account_name: entry.account_name.clone(),
                total_debit: Decimal::ZERO,
                total_credit: Decimal::ZERO,
            });
        account_total.total_debit += entry.debit;
        account_total.total_credit += entry.credit;
    }

    let per_account_totals = by_code.into_values().collect();
    let is_balanced = total_debits == total_credits;

    TrialBalanceResult {
        total_debits,
        total_credits,
        is_balanced,
        per_account_totals,
    }
}

/// 结合试算平衡与期间结账校验：试算不平衡则禁止结账。
///
/// 该函数复用 `periods::validate_trial_balance` 的借贷相等校验，
/// 将 `TrialBalanceResult` 的总额传入，返回是否允许关闭会计期间。
pub fn validate_period_close_with_trial_balance(
    result: &TrialBalanceResult,
) -> Result<(), PeriodValidationError> {
    validate_trial_balance(result.total_debits, result.total_credits)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use rust_decimal::Decimal;

    fn entry(account_code: &str, account_name: &str, debit: i64, credit: i64) -> JournalEntry {
        JournalEntry {
            voucher_no: "记2026080001".to_string(),
            voucher_date: Utc::now(),
            account_code: account_code.to_string(),
            account_name: account_name.to_string(),
            description: None,
            debit: Decimal::new(debit, 0),
            credit: Decimal::new(credit, 0),
        }
    }

    fn entry_dec(
        account_code: &str,
        account_name: &str,
        debit: Decimal,
        credit: Decimal,
    ) -> JournalEntry {
        JournalEntry {
            voucher_no: "记2026080001".to_string(),
            voucher_date: Utc::now(),
            account_code: account_code.to_string(),
            account_name: account_name.to_string(),
            description: None,
            debit,
            credit,
        }
    }

    // ===== 基础场景 =====

    #[test]
    fn test_calculate_trial_balance_empty_entries() {
        let result = calculate_trial_balance(&[]);
        assert_eq!(result.total_debits, Decimal::ZERO);
        assert_eq!(result.total_credits, Decimal::ZERO);
        assert!(result.is_balanced, "空分录应平衡");
        assert!(result.per_account_totals.is_empty());
    }

    #[test]
    fn test_calculate_trial_balance_balanced_two_lines() {
        let entries = vec![
            entry("1001", "库存现金", 1000, 0),
            entry("2001", "应付账款", 0, 1000),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(1000, 0));
        assert_eq!(result.total_credits, Decimal::new(1000, 0));
        assert!(result.is_balanced, "借=贷 应平衡");
        assert_eq!(result.per_account_totals.len(), 2);
    }

    #[test]
    fn test_calculate_trial_balance_unbalanced_debit_greater() {
        let entries = vec![
            entry("1001", "库存现金", 1500, 0),
            entry("2001", "应付账款", 0, 1000),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(1500, 0));
        assert_eq!(result.total_credits, Decimal::new(1000, 0));
        assert!(!result.is_balanced, "借>贷 不平衡");
    }

    #[test]
    fn test_calculate_trial_balance_unbalanced_credit_greater() {
        let entries = vec![
            entry("1001", "库存现金", 800, 0),
            entry("2001", "应付账款", 0, 1200),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(800, 0));
        assert_eq!(result.total_credits, Decimal::new(1200, 0));
        assert!(!result.is_balanced, "贷>借 不平衡");
    }

    #[test]
    fn test_calculate_trial_balance_single_entry_debit_only() {
        let entries = vec![entry("1001", "库存现金", 500, 0)];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(500, 0));
        assert_eq!(result.total_credits, Decimal::ZERO);
        assert!(!result.is_balanced, "单边借方分录不平衡");
        assert_eq!(result.per_account_totals.len(), 1);
    }

    #[test]
    fn test_calculate_trial_balance_single_entry_balanced_within_line() {
        // 单行借贷相等（不常见但合法的数值场景）
        let entries = vec![entry("1001", "库存现金", 300, 300)];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(300, 0));
        assert_eq!(result.total_credits, Decimal::new(300, 0));
        assert!(result.is_balanced);
    }

    // ===== 多账户场景 =====

    #[test]
    fn test_calculate_trial_balance_multi_account_balanced() {
        let entries = vec![
            entry("1001", "库存现金", 1000, 0),
            entry("1002", "银行存款", 2000, 0),
            entry("2001", "应付账款", 0, 1500),
            entry("3001", "实收资本", 0, 1500),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(3000, 0));
        assert_eq!(result.total_credits, Decimal::new(3000, 0));
        assert!(result.is_balanced);
        assert_eq!(result.per_account_totals.len(), 4);
    }

    #[test]
    fn test_calculate_trial_balance_same_account_multiple_entries_aggregated() {
        let entries = vec![
            entry("1001", "库存现金", 100, 0),
            entry("1001", "库存现金", 200, 0),
            entry("1001", "库存现金", 0, 300),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(300, 0));
        assert_eq!(result.total_credits, Decimal::new(300, 0));
        assert!(result.is_balanced);
        assert_eq!(result.per_account_totals.len(), 1, "同账户应聚合为一行");
        let acct = &result.per_account_totals[0];
        assert_eq!(acct.account_code, "1001");
        assert_eq!(acct.total_debit, Decimal::new(300, 0));
        assert_eq!(acct.total_credit, Decimal::new(300, 0));
    }

    #[test]
    fn test_calculate_trial_balance_per_account_totals_sorted_by_code() {
        // 故意打乱顺序输入，验证输出按 account_code 升序
        let entries = vec![
            entry("3001", "实收资本", 0, 500),
            entry("1001", "库存现金", 500, 0),
            entry("2001", "应付账款", 0, 0),
        ];
        let result = calculate_trial_balance(&entries);
        let codes: Vec<&str> = result
            .per_account_totals
            .iter()
            .map(|a| a.account_code.as_str())
            .collect();
        assert_eq!(codes, vec!["1001", "2001", "3001"]);
    }

    #[test]
    fn test_calculate_trial_balance_per_account_name_from_first_occurrence() {
        let entries = vec![
            entry("1001", "库存现金-第一次", 100, 0),
            entry("1001", "库存现金-第二次", 0, 100),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.per_account_totals.len(), 1);
        assert_eq!(
            result.per_account_totals[0].account_name, "库存现金-第一次",
            "account_name 应取首次出现值"
        );
    }

    // ===== 边界场景 =====

    #[test]
    fn test_calculate_trial_balance_zero_amounts_balanced() {
        let entries = vec![
            entry("1001", "库存现金", 0, 0),
            entry("2001", "应付账款", 0, 0),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::ZERO);
        assert_eq!(result.total_credits, Decimal::ZERO);
        assert!(result.is_balanced, "全零应平衡");
        assert_eq!(result.per_account_totals.len(), 2);
    }

    #[test]
    fn test_calculate_trial_balance_negative_amounts_debit_equals_credit() {
        // 负数金额（异常但函数应如实汇总，不做业务拦截）
        let entries = vec![
            entry_dec("1001", "库存现金", Decimal::new(-100, 0), Decimal::ZERO),
            entry_dec("2001", "应付账款", Decimal::ZERO, Decimal::new(-100, 0)),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(-100, 0));
        assert_eq!(result.total_credits, Decimal::new(-100, 0));
        assert!(result.is_balanced, "借贷相等（含负数）应平衡");
    }

    #[test]
    fn test_calculate_trial_balance_large_numbers_balanced() {
        // 大数：1,000,000,000,000（1万亿）
        let big = Decimal::new(1_000_000_000_000, 0);
        let entries = vec![
            entry_dec("1001", "库存现金", big, Decimal::ZERO),
            entry_dec("2001", "应付账款", Decimal::ZERO, big),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, big);
        assert_eq!(result.total_credits, big);
        assert!(result.is_balanced, "大额借贷相等应平衡");
    }

    #[test]
    fn test_calculate_trial_balance_large_numbers_unbalanced() {
        let big = Decimal::new(1_000_000_000_000, 0);
        let entries = vec![
            entry_dec("1001", "库存现金", big, Decimal::ZERO),
            entry_dec(
                "2001",
                "应付账款",
                Decimal::ZERO,
                Decimal::new(999_999_999_999, 0),
            ),
        ];
        let result = calculate_trial_balance(&entries);
        assert!(!result.is_balanced, "大额借贷差 1 应不平衡");
    }

    #[test]
    fn test_calculate_trial_balance_decimal_precision_balanced() {
        // 小数精度：0.01
        let entries = vec![
            entry_dec("1001", "库存现金", Decimal::new(1, 2), Decimal::ZERO),
            entry_dec("2001", "应付账款", Decimal::ZERO, Decimal::new(1, 2)),
        ];
        let result = calculate_trial_balance(&entries);
        assert_eq!(result.total_debits, Decimal::new(1, 2));
        assert_eq!(result.total_credits, Decimal::new(1, 2));
        assert!(result.is_balanced);
    }

    #[test]
    fn test_calculate_trial_balance_decimal_precision_unbalanced() {
        let entries = vec![
            entry_dec("1001", "库存现金", Decimal::new(1, 2), Decimal::ZERO),
            entry_dec("2001", "应付账款", Decimal::ZERO, Decimal::new(2, 2)),
        ];
        let result = calculate_trial_balance(&entries);
        assert!(!result.is_balanced, "0.01 != 0.02 不平衡");
    }

    // ===== 与期间结账校验的集成测试 =====

    #[test]
    fn test_validate_period_close_balanced_trial_balance_ok() {
        // 借贷平衡 → 允许结账
        let entries = vec![
            entry("1001", "库存现金", 1000, 0),
            entry("2001", "应付账款", 0, 1000),
        ];
        let result = calculate_trial_balance(&entries);
        assert!(result.is_balanced);
        let close_result = validate_period_close_with_trial_balance(&result);
        assert!(close_result.is_ok(), "试算平衡应允许结账");
    }

    #[test]
    fn test_validate_period_close_unbalanced_debit_greater_err() {
        // 借>贷 → 禁止结账
        let entries = vec![
            entry("1001", "库存现金", 1500, 0),
            entry("2001", "应付账款", 0, 1000),
        ];
        let result = calculate_trial_balance(&entries);
        assert!(!result.is_balanced);
        let close_result = validate_period_close_with_trial_balance(&result);
        assert!(close_result.is_err(), "试算不平衡应禁止结账");
        let err = close_result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::TrialBalanceMismatch { debit, credit }
                if debit == Decimal::new(1500, 0) && credit == Decimal::new(1000, 0)
            ),
            "应返回 TrialBalanceMismatch 且金额正确"
        );
    }

    #[test]
    fn test_validate_period_close_unbalanced_credit_greater_err() {
        // 贷>借 → 禁止结账
        let entries = vec![
            entry("1001", "库存现金", 800, 0),
            entry("2001", "应付账款", 0, 1200),
        ];
        let result = calculate_trial_balance(&entries);
        assert!(!result.is_balanced);
        let close_result = validate_period_close_with_trial_balance(&result);
        assert!(close_result.is_err(), "试算不平衡应禁止结账");
        let err = close_result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::TrialBalanceMismatch { debit, credit }
                if debit == Decimal::new(800, 0) && credit == Decimal::new(1200, 0)
            ),
            "贷>借也应返回 TrialBalanceMismatch"
        );
    }

    #[test]
    fn test_validate_period_close_empty_trial_balance_ok() {
        // 空分录 → 借贷均为 0 → 平衡 → 允许结账
        let result = calculate_trial_balance(&[]);
        assert!(result.is_balanced);
        let close_result = validate_period_close_with_trial_balance(&result);
        assert!(close_result.is_ok(), "空试算平衡应允许结账");
    }

    #[test]
    fn test_validate_period_close_single_sided_err() {
        // 单边借方分录 → 不平衡 → 禁止结账
        let entries = vec![entry("1001", "库存现金", 500, 0)];
        let result = calculate_trial_balance(&entries);
        assert!(!result.is_balanced);
        let close_result = validate_period_close_with_trial_balance(&result);
        assert!(close_result.is_err());
    }

    #[test]
    fn test_validate_period_close_error_display_contains_amounts() {
        let entries = vec![
            entry("1001", "库存现金", 2000, 0),
            entry("2001", "应付账款", 0, 1000),
        ];
        let result = calculate_trial_balance(&entries);
        let err = validate_period_close_with_trial_balance(&result).unwrap_err();
        let display = format!("{}", err);
        assert!(display.contains("trial balance mismatch"));
        assert!(display.contains("2000"));
        assert!(display.contains("1000"));
    }
}

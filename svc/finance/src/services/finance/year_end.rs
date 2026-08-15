use rust_decimal::Decimal;
use std::fmt;

use super::super::super::models::{PeriodStatus, VoucherStatus};

// ===== Year-end close =====

/// 年度结账输入：单个会计期间（月份）的轻量摘要。
///
/// `period_no` 约定：1-12 表示月份；0 表示 fiscal year 级别的标记期间
/// （用于表达“整个会计年度已关闭”的状态，不能重复关闭）。
#[derive(Debug, Clone, PartialEq)]
pub struct YearEndPeriodInput {
    pub id: String,
    pub status: PeriodStatus,
    pub period_no: i32,
}

/// 年度结账输入：凭证的轻量摘要，用于检测是否还有未过账凭证。
#[derive(Debug, Clone, PartialEq)]
pub struct YearEndVoucherSummary {
    pub status: VoucherStatus,
    pub period_id: String,
}

/// 损益表科目类型（轻量枚举，不耦合 DB 模型）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum YearEndAccountType {
    Asset,
    Liability,
    Equity,
    Revenue,
    Expense,
}

/// 年度结账输入：单个账户的净余额摘要。
///
/// `net_balance` = 借方 - 贷方。
#[derive(Debug, Clone, PartialEq)]
pub struct YearEndAccountSummary {
    pub account_code: String,
    pub account_type: YearEndAccountType,
    pub net_balance: Decimal,
}

#[derive(Debug, Clone, PartialEq)]
pub enum YearEndCloseError {
    /// 规则4：fiscal year 已经关闭（period_no==0 标记期间为 Closed），不能重复关闭。
    FiscalYearAlreadyClosed,
    /// 规则1：存在未完全 Closed 的月份期间。
    PeriodNotClosed {
        index: usize,
        period_no: i32,
        status: PeriodStatus,
    },
    /// 规则2：全年试算不平衡。
    YearTrialBalanceUnbalanced { debit: Decimal, credit: Decimal },
    /// 规则3：损益类科目仍有非零净余额（尚未结转到留存收益）。
    IncomeAccountNotClosed {
        account_code: String,
        net_balance: Decimal,
    },
    /// 规则5：存在 Draft/Submitted 状态的待处理凭证。
    PendingVouchersExist {
        period_id: String,
        status: VoucherStatus,
    },
    /// 边界：未提供任何期间。
    EmptyPeriods,
    /// 边界：只有 fiscal year 标记期间（period_no==0），没有月份期间。
    NoMonthlyPeriods,
    /// 数据完整性：期间序号重复。
    DuplicatePeriodNo { period_no: i32 },
}

impl fmt::Display for YearEndCloseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            YearEndCloseError::FiscalYearAlreadyClosed => {
                write!(f, "fiscal year is already Closed, cannot re-close")
            }
            YearEndCloseError::PeriodNotClosed {
                index,
                period_no,
                status,
            } => {
                write!(
                    f,
                    "period at index {} (period_no={}) is not Closed, status: {:?}",
                    index, period_no, status
                )
            }
            YearEndCloseError::YearTrialBalanceUnbalanced { debit, credit } => {
                write!(
                    f,
                    "year trial balance unbalanced: debit {} != credit {}",
                    debit, credit
                )
            }
            YearEndCloseError::IncomeAccountNotClosed {
                account_code,
                net_balance,
            } => {
                write!(
                    f,
                    "income statement account {} has non-zero net balance {}, income accounts not closed",
                    account_code, net_balance
                )
            }
            YearEndCloseError::PendingVouchersExist { period_id, status } => {
                write!(
                    f,
                    "pending voucher with status {:?} exists in period {}, must be posted before year-end close",
                    status, period_id
                )
            }
            YearEndCloseError::EmptyPeriods => {
                write!(f, "no periods provided for year-end close")
            }
            YearEndCloseError::NoMonthlyPeriods => {
                write!(
                    f,
                    "no monthly periods (period_no 1-12) found, only fiscal year marker"
                )
            }
            YearEndCloseError::DuplicatePeriodNo { period_no } => {
                write!(f, "duplicate period_no {} detected", period_no)
            }
        }
    }
}

impl std::error::Error for YearEndCloseError {}

/// 校验年度结账的前置条件（纯函数，不依赖数据库）。
///
/// 规则：
/// 1. 所有月份期间（period_no 1-12）必须为 Closed。
/// 2. 全年试算平衡（所有账户净余额代数和为零）。
/// 3. 损益类科目（Revenue/Expense）净余额必须为零（已结转）。
/// 4. fiscal year 标记期间（period_no==0）不能已经是 Closed（不能重复关闭）。
/// 5. 任何期间不能存在 Draft/Submitted 的待处理凭证。
pub fn validate_year_end_close(
    periods: &[YearEndPeriodInput],
    vouchers: &[YearEndVoucherSummary],
    accounts: &[YearEndAccountSummary],
) -> Result<(), YearEndCloseError> {
    // 边界：未提供任何期间。
    if periods.is_empty() {
        return Err(YearEndCloseError::EmptyPeriods);
    }

    // 数据完整性：期间序号重复。
    for (i, p) in periods.iter().enumerate() {
        for q in periods.iter().take(i) {
            if q.period_no == p.period_no {
                return Err(YearEndCloseError::DuplicatePeriodNo {
                    period_no: p.period_no,
                });
            }
        }
    }

    // 规则4：fiscal year 标记期间（period_no==0）不能已经是 Closed。
    for p in periods {
        if p.period_no == 0 && matches!(p.status, PeriodStatus::Closed) {
            return Err(YearEndCloseError::FiscalYearAlreadyClosed);
        }
    }

    // 边界：没有月份期间。
    let has_monthly = periods.iter().any(|p| p.period_no != 0);
    if !has_monthly {
        return Err(YearEndCloseError::NoMonthlyPeriods);
    }

    // 规则1：所有月份期间必须为 Closed。
    for (i, p) in periods.iter().enumerate() {
        if p.period_no != 0 && !matches!(p.status, PeriodStatus::Closed) {
            return Err(YearEndCloseError::PeriodNotClosed {
                index: i,
                period_no: p.period_no,
                status: p.status.clone(),
            });
        }
    }

    // 规则5：不能存在 Draft/Submitted 的待处理凭证。
    for v in vouchers {
        if matches!(v.status, VoucherStatus::Draft | VoucherStatus::Submitted) {
            return Err(YearEndCloseError::PendingVouchersExist {
                period_id: v.period_id.clone(),
                status: v.status.clone(),
            });
        }
    }

    // 规则2：全年试算平衡。
    // net_balance = 借方 - 贷方；借方侧 = 正净额之和，贷方侧 = 负净额绝对值之和。
    // 借方侧 == 贷方侧  <=>  所有账户净额代数和为零  <=>  全年试算平衡。
    let mut debit_total = Decimal::ZERO;
    let mut credit_total = Decimal::ZERO;
    for a in accounts {
        if a.net_balance > Decimal::ZERO {
            debit_total += a.net_balance;
        } else if a.net_balance < Decimal::ZERO {
            credit_total += -a.net_balance;
        }
    }
    if debit_total != credit_total {
        return Err(YearEndCloseError::YearTrialBalanceUnbalanced {
            debit: debit_total,
            credit: credit_total,
        });
    }

    // 规则3：损益类科目净余额必须为零。
    for a in accounts {
        if matches!(
            a.account_type,
            YearEndAccountType::Revenue | YearEndAccountType::Expense
        ) && a.net_balance != Decimal::ZERO
        {
            return Err(YearEndCloseError::IncomeAccountNotClosed {
                account_code: a.account_code.clone(),
                net_balance: a.net_balance,
            });
        }
    }

    Ok(())
}

// ===== Consolidation =====

/// 合并报表输入：单个主体（子公司）的轻量摘要。
#[derive(Debug, Clone, PartialEq)]
pub struct ConsolidationEntityInput {
    pub entity_code: String,
    pub currency: String,
    pub fiscal_year_end: String,
    pub period_status: PeriodStatus,
    pub ic_receivables: Decimal,
    pub ic_payables: Decimal,
}

/// 货币转换汇率。
#[derive(Debug, Clone, PartialEq)]
pub struct ConsolidationConversionRate {
    pub from_currency: String,
    pub to_currency: String,
    pub rate: Decimal,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ConsolidationError {
    /// 规则1：合并至少需要 2 个主体。
    InsufficientEntities { count: usize },
    /// 规则2：主体的会计年度截止日不一致。
    FiscalYearEndMismatch {
        entity_code: String,
        fiscal_year_end: String,
    },
    /// 规则3：被合并期间的主体状态不是 Closed。
    EntityPeriodNotClosed {
        entity_code: String,
        period_status: PeriodStatus,
    },
    /// 规则4：内部往来不平衡（应收 != 应付）。
    InterCompanyImbalance {
        total_receivables: Decimal,
        total_payables: Decimal,
    },
    /// 规则5：存在不同币种但缺少转换汇率。
    MissingConversionRate {
        from_currency: String,
        to_currency: String,
    },
    /// 边界：未提供任何主体。
    EmptyEntities,
}

impl fmt::Display for ConsolidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConsolidationError::InsufficientEntities { count } => {
                write!(
                    f,
                    "consolidation requires at least 2 entities, got {}",
                    count
                )
            }
            ConsolidationError::FiscalYearEndMismatch {
                entity_code,
                fiscal_year_end,
            } => {
                write!(
                    f,
                    "entity {} has fiscal year end {}, does not match the first entity",
                    entity_code, fiscal_year_end
                )
            }
            ConsolidationError::EntityPeriodNotClosed {
                entity_code,
                period_status,
            } => {
                write!(
                    f,
                    "entity {} period is not Closed, status: {:?}",
                    entity_code, period_status
                )
            }
            ConsolidationError::InterCompanyImbalance {
                total_receivables,
                total_payables,
            } => {
                write!(
                    f,
                    "inter-company transactions not balanced: receivables {} != payables {}",
                    total_receivables, total_payables
                )
            }
            ConsolidationError::MissingConversionRate {
                from_currency,
                to_currency,
            } => {
                write!(
                    f,
                    "missing conversion rate from {} to {}",
                    from_currency, to_currency
                )
            }
            ConsolidationError::EmptyEntities => {
                write!(f, "no entities provided for consolidation")
            }
        }
    }
}

impl std::error::Error for ConsolidationError {}

/// 校验合并报表的前置条件（纯函数，不依赖数据库）。
///
/// 规则：
/// 1. 至少 2 个主体。
/// 2. 所有主体会计年度截止日相同。
/// 3. 所有主体被合并期间状态为 Closed。
/// 4. 内部往来平衡（应收总额 == 应付总额）。
/// 5. 若主体币种不同，必须提供转换汇率（以首个主体币种为基准）。
pub fn validate_consolidation(
    entities: &[ConsolidationEntityInput],
    conversion_rates: &[ConsolidationConversionRate],
) -> Result<(), ConsolidationError> {
    // 边界：未提供任何主体。
    if entities.is_empty() {
        return Err(ConsolidationError::EmptyEntities);
    }

    // 规则1：至少 2 个主体。
    if entities.len() < 2 {
        return Err(ConsolidationError::InsufficientEntities {
            count: entities.len(),
        });
    }

    // 规则2：所有主体会计年度截止日相同。
    let base_fye = &entities[0].fiscal_year_end;
    for e in entities.iter().skip(1) {
        if &e.fiscal_year_end != base_fye {
            return Err(ConsolidationError::FiscalYearEndMismatch {
                entity_code: e.entity_code.clone(),
                fiscal_year_end: e.fiscal_year_end.clone(),
            });
        }
    }

    // 规则3：所有主体被合并期间状态为 Closed。
    for e in entities {
        if !matches!(e.period_status, PeriodStatus::Closed) {
            return Err(ConsolidationError::EntityPeriodNotClosed {
                entity_code: e.entity_code.clone(),
                period_status: e.period_status.clone(),
            });
        }
    }

    // 规则4：内部往来平衡。
    let total_receivables: Decimal = entities.iter().map(|e| e.ic_receivables).sum();
    let total_payables: Decimal = entities.iter().map(|e| e.ic_payables).sum();
    if total_receivables != total_payables {
        return Err(ConsolidationError::InterCompanyImbalance {
            total_receivables,
            total_payables,
        });
    }

    // 规则5：不同币种必须提供转换汇率（基准 = 首个主体币种）。
    let base_currency = &entities[0].currency;
    for e in entities.iter().skip(1) {
        if &e.currency != base_currency {
            let has_rate = conversion_rates.iter().any(|r| {
                (&r.from_currency == base_currency && &r.to_currency == &e.currency)
                    || (&r.from_currency == &e.currency && &r.to_currency == base_currency)
            });
            if !has_rate {
                return Err(ConsolidationError::MissingConversionRate {
                    from_currency: base_currency.clone(),
                    to_currency: e.currency.clone(),
                });
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::periods::{validate_children_all_closed, PeriodValidationError};
    use super::super::trial_balance::{
        calculate_trial_balance, validate_period_close_with_trial_balance,
    };
    use super::super::voucher::{
        validate_post_entry, PostJournalEntry, PostPeriodInput, PostVoucherInput,
    };
    use super::*;
    use crate::models::JournalEntry;
    use chrono::Utc;
    use rust_decimal::Decimal;

    // ===== helpers =====

    fn period(id: &str, status: PeriodStatus, period_no: i32) -> YearEndPeriodInput {
        YearEndPeriodInput {
            id: id.to_string(),
            status,
            period_no,
        }
    }

    fn voucher(status: VoucherStatus, period_id: &str) -> YearEndVoucherSummary {
        YearEndVoucherSummary {
            status,
            period_id: period_id.to_string(),
        }
    }

    fn account(
        code: &str,
        account_type: YearEndAccountType,
        net_balance: i64,
    ) -> YearEndAccountSummary {
        YearEndAccountSummary {
            account_code: code.to_string(),
            account_type,
            net_balance: Decimal::new(net_balance, 0),
        }
    }

    fn twelve_months_closed() -> Vec<YearEndPeriodInput> {
        (1..=12)
            .map(|m| period(&format!("2026{:02}", m), PeriodStatus::Closed, m))
            .collect()
    }

    fn balanced_accounts_income_zero() -> Vec<YearEndAccountSummary> {
        vec![
            account("1001", YearEndAccountType::Asset, 1000),
            account("2001", YearEndAccountType::Liability, -1000),
            account("4001", YearEndAccountType::Revenue, 0),
            account("5001", YearEndAccountType::Expense, 0),
        ]
    }

    fn entity(
        code: &str,
        currency: &str,
        fye: &str,
        status: PeriodStatus,
        recv: i64,
        pay: i64,
    ) -> ConsolidationEntityInput {
        ConsolidationEntityInput {
            entity_code: code.to_string(),
            currency: currency.to_string(),
            fiscal_year_end: fye.to_string(),
            period_status: status,
            ic_receivables: Decimal::new(recv, 0),
            ic_payables: Decimal::new(pay, 0),
        }
    }

    fn rate(from: &str, to: &str, r: i64) -> ConsolidationConversionRate {
        ConsolidationConversionRate {
            from_currency: from.to_string(),
            to_currency: to.to_string(),
            rate: Decimal::new(r, 0),
        }
    }

    fn jentry(code: &str, name: &str, debit: i64, credit: i64) -> JournalEntry {
        JournalEntry {
            voucher_no: "V1".to_string(),
            voucher_date: Utc::now(),
            account_code: code.to_string(),
            account_name: name.to_string(),
            description: None,
            debit: Decimal::new(debit, 0),
            credit: Decimal::new(credit, 0),
        }
    }

    fn post_entry(code: &str, name: &str, debit: i64, credit: i64) -> PostJournalEntry {
        PostJournalEntry {
            voucher_no: "V1".to_string(),
            voucher_date: Utc::now(),
            account_code: code.to_string(),
            account_name: name.to_string(),
            description: None,
            debit: Decimal::new(debit, 0),
            credit: Decimal::new(credit, 0),
        }
    }

    // ===== validate_year_end_close: happy paths =====

    #[test]
    fn test_year_end_ok_all_months_closed_income_zero() {
        let periods = twelve_months_closed();
        assert!(validate_year_end_close(&periods, &[], &balanced_accounts_income_zero()).is_ok());
    }

    #[test]
    fn test_year_end_ok_with_posted_vouchers() {
        let periods = twelve_months_closed();
        let vouchers = vec![
            voucher(VoucherStatus::Posted, "202601"),
            voucher(VoucherStatus::Posted, "202612"),
        ];
        assert!(
            validate_year_end_close(&periods, &vouchers, &balanced_accounts_income_zero()).is_ok()
        );
    }

    #[test]
    fn test_year_end_ok_with_open_year_marker() {
        let mut periods = twelve_months_closed();
        periods.insert(0, period("2026YR", PeriodStatus::Open, 0));
        assert!(validate_year_end_close(&periods, &[], &balanced_accounts_income_zero()).is_ok());
    }

    #[test]
    fn test_year_end_ok_empty_accounts_no_vouchers() {
        let periods = twelve_months_closed();
        // 无分录、无凭证：试算平凡平衡（0==0），损益科目为空，应通过。
        assert!(validate_year_end_close(&periods, &[], &[]).is_ok());
    }

    // ===== Rule 4: FiscalYearAlreadyClosed =====

    #[test]
    fn test_year_end_err_fiscal_year_already_closed_marker_only() {
        let periods = vec![period("2026YR", PeriodStatus::Closed, 0)];
        let r = validate_year_end_close(&periods, &[], &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::FiscalYearAlreadyClosed
        ));
    }

    #[test]
    fn test_year_end_err_fiscal_year_already_closed_with_months() {
        let mut periods = twelve_months_closed();
        periods.insert(0, period("2026YR", PeriodStatus::Closed, 0));
        let r = validate_year_end_close(&periods, &[], &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::FiscalYearAlreadyClosed
        ));
    }

    // ===== Rule 1: PeriodNotClosed =====

    #[test]
    fn test_year_end_err_period_not_closed_open() {
        let mut periods = twelve_months_closed();
        periods[5] = period("202606", PeriodStatus::Open, 6);
        let r = validate_year_end_close(&periods, &[], &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::PeriodNotClosed {
                index: 5,
                period_no: 6,
                status: PeriodStatus::Open
            }
        ));
    }

    #[test]
    fn test_year_end_err_period_not_closed_closing() {
        let mut periods = twelve_months_closed();
        periods[2] = period("202603", PeriodStatus::Closing, 3);
        let r = validate_year_end_close(&periods, &[], &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::PeriodNotClosed {
                index: 2,
                period_no: 3,
                status: PeriodStatus::Closing
            }
        ));
    }

    // ===== Rule 2: YearTrialBalanceUnbalanced =====

    #[test]
    fn test_year_end_err_trial_unbalanced_debit_heavy() {
        let periods = twelve_months_closed();
        // 资产 1500（借方侧），负债 -1000（贷方侧 1000）→ 不平衡。
        let accounts = vec![
            account("1001", YearEndAccountType::Asset, 1500),
            account("2001", YearEndAccountType::Liability, -1000),
        ];
        let r = validate_year_end_close(&periods, &[], &accounts);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::YearTrialBalanceUnbalanced {
                debit,
                credit
            } if debit == Decimal::new(1500, 0) && credit == Decimal::new(1000, 0)
        ));
    }

    #[test]
    fn test_year_end_err_trial_unbalanced_credit_heavy() {
        let periods = twelve_months_closed();
        let accounts = vec![
            account("1001", YearEndAccountType::Asset, 800),
            account("2001", YearEndAccountType::Liability, -1200),
        ];
        let r = validate_year_end_close(&periods, &[], &accounts);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::YearTrialBalanceUnbalanced {
                debit,
                credit
            } if debit == Decimal::new(800, 0) && credit == Decimal::new(1200, 0)
        ));
    }

    // ===== Rule 3: IncomeAccountNotClosed =====

    #[test]
    fn test_year_end_err_income_not_closed_revenue() {
        let periods = twelve_months_closed();
        // 整体平衡：资产 1000（借方侧）；收入 -500 + 负债 -500（贷方侧 1000）。
        // 但收入净额非零 → IncomeAccountNotClosed。
        let accounts = vec![
            account("1001", YearEndAccountType::Asset, 1000),
            account("4001", YearEndAccountType::Revenue, -500),
            account("5001", YearEndAccountType::Expense, 0),
            account("2001", YearEndAccountType::Liability, -500),
        ];
        let r = validate_year_end_close(&periods, &[], &accounts);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::IncomeAccountNotClosed {
                ref account_code,
                net_balance
            } if account_code == "4001" && net_balance == Decimal::new(-500, 0)
        ));
    }

    #[test]
    fn test_year_end_err_income_not_closed_expense() {
        let periods = twelve_months_closed();
        // 整体平衡：资产 1000 + 费用 300（借方侧 1300）；负债 -1300（贷方侧 1300）。
        // 收入 0 OK；费用 300 非零 → IncomeAccountNotClosed。
        let accounts = vec![
            account("1001", YearEndAccountType::Asset, 1000),
            account("4001", YearEndAccountType::Revenue, 0),
            account("5001", YearEndAccountType::Expense, 300),
            account("2001", YearEndAccountType::Liability, -1300),
        ];
        let r = validate_year_end_close(&periods, &[], &accounts);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::IncomeAccountNotClosed {
                ref account_code,
                net_balance
            } if account_code == "5001" && net_balance == Decimal::new(300, 0)
        ));
    }

    // ===== Rule 5: PendingVouchersExist =====

    #[test]
    fn test_year_end_err_pending_voucher_draft() {
        let periods = twelve_months_closed();
        let vouchers = vec![
            voucher(VoucherStatus::Posted, "202601"),
            voucher(VoucherStatus::Draft, "202606"),
        ];
        let r = validate_year_end_close(&periods, &vouchers, &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::PendingVouchersExist {
                ref period_id,
                status: VoucherStatus::Draft
            } if period_id == "202606"
        ));
    }

    #[test]
    fn test_year_end_err_pending_voucher_submitted() {
        let periods = twelve_months_closed();
        let vouchers = vec![voucher(VoucherStatus::Submitted, "202603")];
        let r = validate_year_end_close(&periods, &vouchers, &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::PendingVouchersExist {
                ref period_id,
                status: VoucherStatus::Submitted
            } if period_id == "202603"
        ));
    }

    // ===== EmptyPeriods =====

    #[test]
    fn test_year_end_err_empty_periods_no_accounts() {
        let r = validate_year_end_close(&[], &[], &[]);
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), YearEndCloseError::EmptyPeriods));
    }

    #[test]
    fn test_year_end_err_empty_periods_with_accounts() {
        let r = validate_year_end_close(&[], &[], &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), YearEndCloseError::EmptyPeriods));
    }

    // ===== NoMonthlyPeriods =====

    #[test]
    fn test_year_end_err_no_monthly_periods_marker_open() {
        let periods = vec![period("2026YR", PeriodStatus::Open, 0)];
        let r = validate_year_end_close(&periods, &[], &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::NoMonthlyPeriods
        ));
    }

    #[test]
    fn test_year_end_err_no_monthly_periods_marker_closing() {
        let periods = vec![period("2026YR", PeriodStatus::Closing, 0)];
        let r = validate_year_end_close(&periods, &[], &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::NoMonthlyPeriods
        ));
    }

    // ===== DuplicatePeriodNo =====

    #[test]
    fn test_year_end_err_duplicate_period_no_monthly() {
        let mut periods = twelve_months_closed();
        periods.push(period("202601DUP", PeriodStatus::Closed, 1));
        let r = validate_year_end_close(&periods, &[], &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::DuplicatePeriodNo { period_no: 1 }
        ));
    }

    #[test]
    fn test_year_end_err_duplicate_period_no_marker() {
        let mut periods = twelve_months_closed();
        periods.insert(0, period("2026YR", PeriodStatus::Open, 0));
        periods.push(period("2026YR2", PeriodStatus::Open, 0));
        let r = validate_year_end_close(&periods, &[], &balanced_accounts_income_zero());
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::DuplicatePeriodNo { period_no: 0 }
        ));
    }

    // ===== YearEndCloseError trait tests =====

    #[test]
    fn test_year_end_error_clone_partial_eq_display() {
        let a = YearEndCloseError::PeriodNotClosed {
            index: 1,
            period_no: 2,
            status: PeriodStatus::Open,
        };
        let b = a.clone();
        assert_eq!(a, b);
        let display = format!("{}", a);
        assert!(display.contains("index 1"));
        assert!(display.contains("period_no=2"));
        assert!(display.contains("Open"));

        let unbalanced = YearEndCloseError::YearTrialBalanceUnbalanced {
            debit: Decimal::new(1500, 0),
            credit: Decimal::new(1000, 0),
        };
        let d = format!("{}", unbalanced);
        assert!(d.contains("unbalanced"));
        assert!(d.contains("1500"));
        assert!(d.contains("1000"));

        let err: Box<dyn std::error::Error> = Box::new(YearEndCloseError::EmptyPeriods);
        assert!(err.source().is_none());
    }

    // ===== validate_consolidation: happy paths =====

    #[test]
    fn test_consolidation_ok_two_entities_balanced() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        assert!(validate_consolidation(&entities, &[]).is_ok());
    }

    #[test]
    fn test_consolidation_ok_three_entities_balanced_same_currency() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 50),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 50, 100),
            entity("S3", "CNY", "12-31", PeriodStatus::Closed, 0, 0),
        ];
        // 应收合计 150，应付合计 150。
        assert!(validate_consolidation(&entities, &[]).is_ok());
    }

    #[test]
    fn test_consolidation_ok_mixed_currencies_with_rate() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "USD", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        let rates = vec![rate("CNY", "USD", 7)];
        assert!(validate_consolidation(&entities, &rates).is_ok());
    }

    #[test]
    fn test_consolidation_ok_mixed_currencies_reverse_rate() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "USD", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        // 反向汇率也应被接受。
        let rates = vec![rate("USD", "CNY", 1)];
        assert!(validate_consolidation(&entities, &rates).is_ok());
    }

    // ===== EmptyEntities =====

    #[test]
    fn test_consolidation_err_empty_entities_no_rates() {
        let r = validate_consolidation(&[], &[]);
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), ConsolidationError::EmptyEntities));
    }

    #[test]
    fn test_consolidation_err_empty_entities_with_rates() {
        let r = validate_consolidation(&[], &[rate("CNY", "USD", 7)]);
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), ConsolidationError::EmptyEntities));
    }

    // ===== InsufficientEntities =====

    #[test]
    fn test_consolidation_err_insufficient_entities_one() {
        let entities = vec![entity("S1", "CNY", "12-31", PeriodStatus::Closed, 0, 0)];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::InsufficientEntities { count: 1 }
        ));
    }

    #[test]
    fn test_consolidation_err_insufficient_entities_one_balanced() {
        let entities = vec![entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 100)];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::InsufficientEntities { count: 1 }
        ));
    }

    // ===== FiscalYearEndMismatch =====

    #[test]
    fn test_consolidation_err_fye_mismatch_second() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "CNY", "03-31", PeriodStatus::Closed, 0, 100),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::FiscalYearEndMismatch {
                ref entity_code,
                ref fiscal_year_end
            } if entity_code == "S2" && fiscal_year_end == "03-31"
        ));
    }

    #[test]
    fn test_consolidation_err_fye_mismatch_third() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 0, 50),
            entity("S3", "CNY", "06-30", PeriodStatus::Closed, 0, 50),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::FiscalYearEndMismatch {
                ref entity_code,
                ref fiscal_year_end
            } if entity_code == "S3" && fiscal_year_end == "06-30"
        ));
    }

    // ===== EntityPeriodNotClosed =====

    #[test]
    fn test_consolidation_err_entity_period_not_closed_open() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Open, 0, 100),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::EntityPeriodNotClosed {
                ref entity_code,
                period_status: PeriodStatus::Open
            } if entity_code == "S2"
        ));
    }

    #[test]
    fn test_consolidation_err_entity_period_not_closed_closing_first() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closing, 100, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::EntityPeriodNotClosed {
                ref entity_code,
                period_status: PeriodStatus::Closing
            } if entity_code == "S1"
        ));
    }

    // ===== InterCompanyImbalance =====

    #[test]
    fn test_consolidation_err_ic_imbalance_recv_greater() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 0, 90),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::InterCompanyImbalance {
                total_receivables,
                total_payables
            } if total_receivables == Decimal::new(100, 0) && total_payables == Decimal::new(90, 0)
        ));
    }

    #[test]
    fn test_consolidation_err_ic_imbalance_payable_greater() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 50, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::InterCompanyImbalance {
                total_receivables,
                total_payables
            } if total_receivables == Decimal::new(50, 0) && total_payables == Decimal::new(100, 0)
        ));
    }

    // ===== MissingConversionRate =====

    #[test]
    fn test_consolidation_err_missing_rate_cny_usd() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "USD", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::MissingConversionRate {
                ref from_currency,
                ref to_currency
            } if from_currency == "CNY" && to_currency == "USD"
        ));
    }

    #[test]
    fn test_consolidation_err_missing_rate_wrong_pair() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "USD", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        // 提供了汇率，但币种对不匹配。
        let rates = vec![rate("EUR", "CNY", 8)];
        let r = validate_consolidation(&entities, &rates);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::MissingConversionRate {
                ref from_currency,
                ref to_currency
            } if from_currency == "CNY" && to_currency == "USD"
        ));
    }

    // ===== ConsolidationError trait tests =====

    #[test]
    fn test_consolidation_error_clone_partial_eq_display() {
        let a = ConsolidationError::InterCompanyImbalance {
            total_receivables: Decimal::new(100, 0),
            total_payables: Decimal::new(90, 0),
        };
        let b = a.clone();
        assert_eq!(a, b);
        let display = format!("{}", a);
        assert!(display.contains("receivables"));
        assert!(display.contains("100"));
        assert!(display.contains("90"));

        let missing = ConsolidationError::MissingConversionRate {
            from_currency: "CNY".to_string(),
            to_currency: "USD".to_string(),
        };
        let d = format!("{}", missing);
        assert!(d.contains("CNY"));
        assert!(d.contains("USD"));

        let err: Box<dyn std::error::Error> = Box::new(ConsolidationError::EmptyEntities);
        assert!(err.source().is_none());
    }

    // ===== Integration tests: year-end close + trial_balance/period/voucher =====

    #[test]
    fn test_integration_close_all_periods_then_year_end_ok() {
        // 12 个月全 Closed：先通过 validate_children_all_closed，再通过年度结账。
        let child_statuses = vec![PeriodStatus::Closed; 12];
        assert!(validate_children_all_closed(&child_statuses).is_ok());

        let periods = twelve_months_closed();
        let accounts = vec![
            account("1001", YearEndAccountType::Asset, 1000),
            account("2001", YearEndAccountType::Liability, -1000),
        ];
        assert!(validate_year_end_close(&periods, &[], &accounts).is_ok());
    }

    #[test]
    fn test_integration_one_period_open_blocks_year_end() {
        // validate_children_all_closed 检测到 index 1 为 Open。
        let child_statuses = vec![
            PeriodStatus::Closed,
            PeriodStatus::Open,
            PeriodStatus::Closed,
        ];
        let child_r = validate_children_all_closed(&child_statuses);
        assert!(child_r.is_err());
        assert!(matches!(
            child_r.unwrap_err(),
            PeriodValidationError::ChildPeriodNotClosed { index: 1, .. }
        ));

        // 年度结账同样被阻止。
        let periods = vec![
            period("202601", PeriodStatus::Closed, 1),
            period("202602", PeriodStatus::Open, 2),
            period("202603", PeriodStatus::Closed, 3),
        ];
        let r = validate_year_end_close(&periods, &[], &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::PeriodNotClosed {
                index: 1,
                period_no: 2,
                ..
            }
        ));
    }

    #[test]
    fn test_integration_unbalanced_trial_blocks_year_end() {
        // 构造不平衡的日记账分录。
        let entries = vec![
            jentry("1001", "现金", 1500, 0),
            jentry("2001", "应付", 0, 1000),
        ];
        let tb = calculate_trial_balance(&entries);
        assert!(!tb.is_balanced);
        assert!(validate_period_close_with_trial_balance(&tb).is_err());

        // 由试算表派生账户净额，喂入年度结账校验。
        let accounts: Vec<YearEndAccountSummary> = tb
            .per_account_totals
            .iter()
            .map(|a| YearEndAccountSummary {
                account_code: a.account_code.clone(),
                account_type: if a.account_code.starts_with('1') {
                    YearEndAccountType::Asset
                } else {
                    YearEndAccountType::Liability
                },
                net_balance: a.total_debit - a.total_credit,
            })
            .collect();
        let periods = twelve_months_closed();
        let r = validate_year_end_close(&periods, &[], &accounts);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::YearTrialBalanceUnbalanced { .. }
        ));
    }

    #[test]
    fn test_integration_income_nonzero_blocks_year_end() {
        // 平衡但收入非零：期间结账（基于试算平衡）通过，年度结账被阻止。
        let entries = vec![
            jentry("1001", "现金", 1000, 0),
            jentry("4001", "收入", 0, 1000),
        ];
        let tb = calculate_trial_balance(&entries);
        assert!(tb.is_balanced);
        assert!(validate_period_close_with_trial_balance(&tb).is_ok());

        let accounts: Vec<YearEndAccountSummary> = tb
            .per_account_totals
            .iter()
            .map(|a| YearEndAccountSummary {
                account_code: a.account_code.clone(),
                account_type: if a.account_code.starts_with('1') {
                    YearEndAccountType::Asset
                } else {
                    YearEndAccountType::Revenue
                },
                net_balance: a.total_debit - a.total_credit,
            })
            .collect();
        let periods = twelve_months_closed();
        let r = validate_year_end_close(&periods, &[], &accounts);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::IncomeAccountNotClosed { .. }
        ));
    }

    #[test]
    fn test_integration_pending_voucher_blocks_year_end() {
        // Draft 凭证在 Open 期间可通过过账校验。
        let v = PostVoucherInput {
            status: VoucherStatus::Draft,
            period_id: "202606".to_string(),
            entries: vec![
                post_entry("1001", "现金", 1000, 0),
                post_entry("2001", "应付", 0, 1000),
            ],
        };
        let p = PostPeriodInput {
            id: "202606".to_string(),
            status: PeriodStatus::Open,
        };
        assert!(
            validate_post_entry(&v, &p).is_ok(),
            "Open 期间内的 Draft 凭证应通过过账校验"
        );

        // 但同一条 Draft 凭证作为待处理凭证会阻止年度结账。
        let periods = twelve_months_closed();
        let vouchers = vec![voucher(VoucherStatus::Draft, "202606")];
        let accounts = vec![
            account("1001", YearEndAccountType::Asset, 1000),
            account("2001", YearEndAccountType::Liability, -1000),
        ];
        let r = validate_year_end_close(&periods, &vouchers, &accounts);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            YearEndCloseError::PendingVouchersExist {
                status: VoucherStatus::Draft,
                ..
            }
        ));
    }

    #[test]
    fn test_integration_consolidation_ic_balanced_ok() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 500, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 0, 500),
        ];
        // 各主体期间均为 Closed。
        let statuses: Vec<PeriodStatus> =
            entities.iter().map(|e| e.period_status.clone()).collect();
        assert!(validate_children_all_closed(&statuses).is_ok());
        assert!(validate_consolidation(&entities, &[]).is_ok());
    }

    #[test]
    fn test_integration_consolidation_ic_imbalance_blocked() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 500, 0),
            entity("S2", "CNY", "12-31", PeriodStatus::Closed, 0, 400),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::InterCompanyImbalance {
                total_receivables,
                total_payables
            } if total_receivables == Decimal::new(500, 0) && total_payables == Decimal::new(400, 0)
        ));
    }

    #[test]
    fn test_integration_consolidation_mixed_currencies_no_rate_blocked() {
        let entities = vec![
            entity("S1", "CNY", "12-31", PeriodStatus::Closed, 100, 0),
            entity("S2", "USD", "12-31", PeriodStatus::Closed, 0, 100),
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ConsolidationError::MissingConversionRate {
                ref from_currency,
                ref to_currency
            } if from_currency == "CNY" && to_currency == "USD"
        ));
    }

    #[test]
    fn test_integration_trial_balance_derive_accounts_year_end_ok() {
        // 平衡且无损益科目：期间结账 + 年度结账均通过。
        let entries = vec![
            jentry("1001", "现金", 2000, 0),
            jentry("2001", "应付", 0, 2000),
        ];
        let tb = calculate_trial_balance(&entries);
        assert!(tb.is_balanced);
        assert!(validate_period_close_with_trial_balance(&tb).is_ok());

        let accounts: Vec<YearEndAccountSummary> = tb
            .per_account_totals
            .iter()
            .map(|a| YearEndAccountSummary {
                account_code: a.account_code.clone(),
                account_type: if a.account_code.starts_with('1') {
                    YearEndAccountType::Asset
                } else {
                    YearEndAccountType::Liability
                },
                net_balance: a.total_debit - a.total_credit,
            })
            .collect();
        let periods = twelve_months_closed();
        assert!(validate_year_end_close(&periods, &[], &accounts).is_ok());
    }

    #[test]
    fn test_integration_full_flow_close_post_year_end_ok() {
        // 1. 子期间全 Closed。
        let child_statuses = vec![PeriodStatus::Closed; 12];
        assert!(validate_children_all_closed(&child_statuses).is_ok());

        // 2. Approved 凭证在 Open 期间通过过账校验。
        let v = PostVoucherInput {
            status: VoucherStatus::Approved,
            period_id: "202606".to_string(),
            entries: vec![
                post_entry("1001", "现金", 3000, 0),
                post_entry("2001", "应付", 0, 3000),
            ],
        };
        let p = PostPeriodInput {
            id: "202606".to_string(),
            status: PeriodStatus::Open,
        };
        assert!(validate_post_entry(&v, &p).is_ok());

        // 3. 试算平衡。
        let j: Vec<JournalEntry> = v.entries.iter().cloned().map(JournalEntry::from).collect();
        let tb = calculate_trial_balance(&j);
        assert!(tb.is_balanced);
        assert!(validate_period_close_with_trial_balance(&tb).is_ok());

        // 4. 年度结账：Posted 凭证摘要 + 派生账户净额 → 通过。
        let accounts: Vec<YearEndAccountSummary> = tb
            .per_account_totals
            .iter()
            .map(|a| YearEndAccountSummary {
                account_code: a.account_code.clone(),
                account_type: if a.account_code.starts_with('1') {
                    YearEndAccountType::Asset
                } else {
                    YearEndAccountType::Liability
                },
                net_balance: a.total_debit - a.total_credit,
            })
            .collect();
        let periods = twelve_months_closed();
        let vouchers = vec![voucher(VoucherStatus::Posted, "202606")];
        assert!(validate_year_end_close(&periods, &vouchers, &accounts).is_ok());
    }
}

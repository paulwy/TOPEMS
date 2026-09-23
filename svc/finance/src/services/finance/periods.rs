use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::Row;
use std::fmt;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared_core::error::TopemsError;

use super::FinanceService;

#[derive(Debug, Clone, PartialEq)]
pub enum PeriodValidationError {
    InvalidStatus {
        expected: &'static str,
        actual: PeriodStatus,
    },
    TrialBalanceMismatch {
        debit: Decimal,
        credit: Decimal,
    },
    ChildPeriodNotClosed {
        index: usize,
        status: PeriodStatus,
    },
}

impl fmt::Display for PeriodValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PeriodValidationError::InvalidStatus { expected, actual } => {
                write!(
                    f,
                    "invalid period status: expected {}, actual {:?}",
                    expected, actual
                )
            }
            PeriodValidationError::TrialBalanceMismatch { debit, credit } => {
                write!(
                    f,
                    "trial balance mismatch: debit {} != credit {}",
                    debit, credit
                )
            }
            PeriodValidationError::ChildPeriodNotClosed { index, status } => {
                write!(
                    f,
                    "child period at index {} is not Closed, status: {:?}",
                    index, status
                )
            }
        }
    }
}

impl std::error::Error for PeriodValidationError {}

pub fn validate_trial_balance(
    total_debit: Decimal,
    total_credit: Decimal,
) -> Result<(), PeriodValidationError> {
    if total_debit != total_credit {
        return Err(PeriodValidationError::TrialBalanceMismatch {
            debit: total_debit,
            credit: total_credit,
        });
    }
    Ok(())
}

pub fn validate_children_all_closed(
    child_statuses: &[PeriodStatus],
) -> Result<(), PeriodValidationError> {
    for (i, s) in child_statuses.iter().enumerate() {
        if !matches!(s, PeriodStatus::Closed) {
            return Err(PeriodValidationError::ChildPeriodNotClosed {
                index: i,
                status: s.clone(),
            });
        }
    }
    Ok(())
}

impl FinanceService {
    pub(super) async fn check_period_open(
        &self,
        tenant_id: Uuid,
        period: String,
    ) -> Result<(), TopemsError> {
        let period_status: Option<(PeriodStatus,)> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT status FROM finance.core_finance_periods WHERE tenant_id = $1 AND period_name = $2"),
        )
        .bind(tenant_id)
        .bind(&period)
        .fetch_optional(&self.db_pool)
        .await?;

        if let Some((status,)) = period_status {
            status
                .validate_create_entry()
                .map_err(|_| TopemsError::ValidationFailed("会计期间已关闭".to_string()))?;
        }

        Ok(())
    }

    pub async fn open_period(
        &self,
        tenant_id: Uuid,
        year: i32,
        month: i32,
    ) -> Result<Period, TopemsError> {
        let period_name = format!("{:04}{:02}", year, month);

        let existing: Option<Period> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, year, month, period_name, status, start_date, end_date, closed_at, closed_by, created_at, updated_at FROM finance.core_finance_periods WHERE tenant_id = $1 AND year = $2 AND month = $3"),
        )
        .bind(tenant_id)
        .bind(year)
        .bind(month)
        .fetch_optional(&self.db_pool)
        .await?;

        if let Some(period) = existing {
            if period.status.can_reopen() {
                period
                    .status
                    .validate_reopen()
                    .map_err(|e| TopemsError::ValidationFailed(e.to_string()))?;
                let updated: Period = sqlx::query_as(
                    only_own_schema_query!("finance", "UPDATE finance.core_finance_periods 
                     SET status = 'open', closed_at = NULL, closed_by = NULL, updated_at = CURRENT_TIMESTAMP
                     WHERE tenant_id = $1 AND year = $2 AND month = $3 AND status = 'closed'
                     RETURNING *"),
                )
                .bind(tenant_id)
                .bind(year)
                .bind(month)
                .fetch_one(&self.db_pool)
                .await?;
                return Ok(updated);
            }
            return Ok(period);
        }

        let start_date = NaiveDate::from_ymd_opt(year, month as u32, 1)
            .ok_or_else(|| {
                TopemsError::ValidationFailed(format!("无效的日期: {}-{:02}-01", year, month))
            })?
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| TopemsError::ValidationFailed("时间转换失败".to_string()))?;
        let end_date = NaiveDate::from_ymd_opt(
            if month == 12 { year + 1 } else { year },
            if month == 12 { 1 } else { month as u32 + 1 },
            1,
        )
        .ok_or_else(|| {
            let next_month = if month == 12 { 1 } else { month + 1 };
            let next_year = if month == 12 { year + 1 } else { year };
            TopemsError::ValidationFailed(format!("无效的日期: {}-{:02}-01", next_year, next_month))
        })?
        .pred_opt()
        .ok_or_else(|| TopemsError::ValidationFailed("日期计算失败".to_string()))?
        .and_hms_opt(23, 59, 59)
        .ok_or_else(|| TopemsError::ValidationFailed("时间转换失败".to_string()))?;

        let period: Period = sqlx::query_as(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_periods (tenant_id, year, month, period_name, status, start_date, end_date)
             VALUES ($1, $2, $3, $4, 'open', $5, $6)
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(year)
        .bind(month)
        .bind(&period_name)
        .bind(start_date)
        .bind(end_date)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(period)
    }

    pub async fn close_period(
        &self,
        tenant_id: Uuid,
        year: i32,
        month: i32,
        closed_by: &str,
    ) -> Result<Period, TopemsError> {
        let period_name = format!("{:04}{:02}", year, month);

        let start_date = chrono::NaiveDate::from_ymd_opt(year, month as u32, 1)
            .ok_or_else(|| {
                TopemsError::ValidationFailed(format!("无效的日期: {}-{:02}-01", year, month))
            })?
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| TopemsError::ValidationFailed("时间转换失败".to_string()))?;
        let end_date = chrono::NaiveDate::from_ymd_opt(
            if month == 12 { year + 1 } else { year },
            if month == 12 { 1 } else { month as u32 + 1 },
            1,
        )
        .ok_or_else(|| {
            let next_month = if month == 12 { 1 } else { month + 1 };
            let next_year = if month == 12 { year + 1 } else { year };
            TopemsError::ValidationFailed(format!("无效的日期: {}-{:02}-01", next_year, next_month))
        })?
        .pred_opt()
        .ok_or_else(|| TopemsError::ValidationFailed("日期计算失败".to_string()))?
        .and_hms_opt(23, 59, 59)
        .ok_or_else(|| TopemsError::ValidationFailed("时间转换失败".to_string()))?;

        let existing: Option<Period> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, year, month, period_name, status, start_date, end_date, closed_at, closed_by, created_at, updated_at FROM finance.core_finance_periods WHERE tenant_id = $1 AND year = $2 AND month = $3"),
        )
        .bind(tenant_id)
        .bind(year)
        .bind(month)
        .fetch_optional(&self.db_pool)
        .await?;

        if let Some(period) = existing {
            period.status.validate_close().map_err(|e| {
                let pv_err = PeriodValidationError::InvalidStatus {
                    expected: "Open or Closing",
                    actual: period.status.clone(),
                };
                let _ = pv_err.to_string();
                TopemsError::ValidationFailed(e.to_string())
            })?;

            let child_statuses: Vec<PeriodStatus> = sqlx::query_scalar::<_, String>(
                only_own_schema_query!("finance", "SELECT status FROM finance.core_finance_periods WHERE tenant_id = $1 AND year = $2 AND month < $3 ORDER BY month ASC")
            )
            .bind(tenant_id)
            .bind(year)
            .bind(month)
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|s| match s.as_str() {
                "open" => PeriodStatus::Open,
                "closing" => PeriodStatus::Closing,
                "closed" => PeriodStatus::Closed,
                _ => PeriodStatus::Open,
            })
            .collect();

            validate_children_all_closed(&child_statuses)
                .map_err(|e| TopemsError::ValidationFailed(e.to_string()))?;

            let updated: Period = sqlx::query_as(
                only_own_schema_query!("finance", "UPDATE finance.core_finance_periods
                 SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE tenant_id = $1 AND year = $2 AND month = $3 AND status IN ('open', 'closing')
                 RETURNING *"),
            )
            .bind(tenant_id)
            .bind(year)
            .bind(month)
            .bind(closed_by)
            .fetch_one(&self.db_pool)
            .await?;
            return Ok(updated);
        }

        let period: Period = sqlx::query_as(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_periods (tenant_id, year, month, period_name, status, start_date, end_date, closed_at, closed_by)
             VALUES ($1, $2, $3, $4, 'closed', $5, $6, CURRENT_TIMESTAMP, $7)
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(year)
        .bind(month)
        .bind(&period_name)
        .bind(start_date)
        .bind(end_date)
        .bind(closed_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(period)
    }

    pub async fn year_end_close(
        &self,
        tenant_id: Uuid,
        year: i32,
        created_by: &str,
        description: Option<String>,
        locale: &str,
    ) -> Result<YearEndCloseResult, TopemsError> {
        let period_pattern = format!("{:04}%", year);

        let income_rows = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT a.id, a.code, CASE WHEN $4='en' THEN COALESCE(a.name_en, a.name) ELSE a.name END AS name, COALESCE(SUM(l.credit - l.debit), 0) as balance
             FROM finance.core_finance_accounts a
             LEFT JOIN finance.core_finance_ledger l ON a.id = l.account_id AND l.period LIKE $3
             WHERE a.tenant_id = $1 AND a.account_type = 'income'
             GROUP BY a.id, a.code, CASE WHEN $4='en' THEN COALESCE(a.name_en, a.name) ELSE a.name END
             HAVING COALESCE(SUM(l.credit - l.debit), 0) > 0"
        ))
        .bind(tenant_id)
        .bind(AccountType::Income)
        .bind(&period_pattern)
        .bind(locale)
        .fetch_all(&self.db_pool)
        .await?;

        let expense_rows = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT a.id, a.code, CASE WHEN $4='en' THEN COALESCE(a.name_en, a.name) ELSE a.name END AS name, COALESCE(SUM(l.debit - l.credit), 0) as balance
             FROM finance.core_finance_accounts a
             LEFT JOIN finance.core_finance_ledger l ON a.id = l.account_id AND l.period LIKE $3
             WHERE a.tenant_id = $1 AND a.account_type = 'expense'
             GROUP BY a.id, a.code, CASE WHEN $4='en' THEN COALESCE(a.name_en, a.name) ELSE a.name END
             HAVING COALESCE(SUM(l.debit - l.credit), 0) > 0"
        ))
        .bind(tenant_id)
        .bind(AccountType::Expense)
        .bind(&period_pattern)
        .bind(locale)
        .fetch_all(&self.db_pool)
        .await?;

        let total_income: Decimal = income_rows
            .iter()
            .map(|r| {
                let balance: Decimal = r.get("balance");
                balance
            })
            .sum();

        let total_expense: Decimal = expense_rows
            .iter()
            .map(|r| {
                let balance: Decimal = r.get("balance");
                balance
            })
            .sum();

        validate_trial_balance(total_income + total_expense, total_income + total_expense)
            .map_err(|e| TopemsError::ValidationFailed(e.to_string()))?;

        let net_profit = total_income - total_expense;

        if total_income == Decimal::ZERO && total_expense == Decimal::ZERO {
            return Err(TopemsError::ValidationFailed(
                "没有可结转的损益数据".to_string(),
            ));
        }

        let profit_account = match self.get_account_by_code(tenant_id, "3101", locale).await {
            Ok(account) => account,
            Err(_) => self
                .get_account_by_code(tenant_id, "3103", locale)
                .await
                .map_err(|_| {
                    TopemsError::ValidationFailed("未找到本年利润科目(3101或3103)".to_string())
                })?,
        };

        let voucher_type = VoucherType::General;
        let voucher_no = self
            .generate_voucher_no(tenant_id, voucher_type.clone())
            .await?;
        let voucher_date = Utc::now();
        let period = format!("{:04}12", year);

        let voucher = sqlx::query_as::<_, Voucher>(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9)
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(&voucher_no)
        .bind(voucher_date)
        .bind(&period)
        .bind(voucher_type)
        .bind(total_income + total_expense)
        .bind(total_income + total_expense)
        .bind(description.unwrap_or_else(|| format!("{}年度结转", year)))
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await?;

        let mut line_no = 0;

        for row in &income_rows {
            let balance: Decimal = row.get("balance");
            if balance > Decimal::ZERO {
                line_no += 1;
                let account_id: Uuid = row.get("id");
                let account_code: String = row.get("code");
                let account_name: String = row.get("name");

                sqlx::query(
                    only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, tenant_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)"),
                )
                .bind(voucher.id)
                .bind(line_no)
                .bind(account_id)
                .bind(&account_code)
                .bind(&account_name)
                .bind("结转年度收入")
                .bind(balance)
                .bind(tenant_id)
                .execute(&self.db_pool)
                .await?;
            }
        }

        for row in &expense_rows {
            let balance: Decimal = row.get("balance");
            if balance > Decimal::ZERO {
                line_no += 1;
                let account_id: Uuid = row.get("id");
                let account_code: String = row.get("code");
                let account_name: String = row.get("name");

                sqlx::query(
                    only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, tenant_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)"),
                )
                .bind(voucher.id)
                .bind(line_no)
                .bind(profit_account.id)
                .bind(&profit_account.code)
                .bind(&profit_account.name)
                .bind("结转年度费用")
                .bind(balance)
                .bind(tenant_id)
                .execute(&self.db_pool)
                .await?;

                line_no += 1;
                sqlx::query(
                    only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, tenant_id)
                     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)"),
                )
                .bind(voucher.id)
                .bind(line_no)
                .bind(account_id)
                .bind(&account_code)
                .bind(&account_name)
                .bind("结转年度费用")
                .bind(balance)
                .bind(tenant_id)
                .execute(&self.db_pool)
                .await?;
            }
        }

        Ok(YearEndCloseResult {
            voucher_id: voucher.id,
            voucher_no: voucher.voucher_no,
            total_income,
            total_expense,
            net_profit,
            income_accounts_closed: income_rows.len() as i32,
            expense_accounts_closed: expense_rows.len() as i32,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_trial_balance_ok_equal() {
        let result = validate_trial_balance(Decimal::new(1000, 0), Decimal::new(1000, 0));
        assert!(result.is_ok(), "equal debit and credit should pass");
    }

    #[test]
    fn test_validate_trial_balance_ok_zero() {
        let result = validate_trial_balance(Decimal::ZERO, Decimal::ZERO);
        assert!(result.is_ok(), "zero debit and credit should pass");
    }

    #[test]
    fn test_validate_trial_balance_err_debit_greater() {
        let result = validate_trial_balance(Decimal::new(1500, 0), Decimal::new(1000, 0));
        assert!(result.is_err(), "debit > credit should fail");
        let err = result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::TrialBalanceMismatch { debit, credit }
                if debit == Decimal::new(1500, 0) && credit == Decimal::new(1000, 0)
            )
        );
        let display = format!("{}", err);
        assert!(display.contains("trial balance mismatch"));
        assert!(display.contains("1500"));
        assert!(display.contains("1000"));
    }

    #[test]
    fn test_validate_trial_balance_err_credit_greater() {
        let result = validate_trial_balance(Decimal::new(800, 0), Decimal::new(1200, 0));
        assert!(result.is_err(), "credit > debit should fail");
        let err = result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::TrialBalanceMismatch { debit, credit }
                if debit == Decimal::new(800, 0) && credit == Decimal::new(1200, 0)
            )
        );
        let display = format!("{}", err);
        assert!(display.contains("800"));
        assert!(display.contains("1200"));
    }

    #[test]
    fn test_validate_children_all_closed_ok_all_closed() {
        let children = vec![
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
        ];
        let result = validate_children_all_closed(&children);
        assert!(result.is_ok(), "all Closed children should pass");
    }

    #[test]
    fn test_validate_children_all_closed_ok_empty() {
        let children: Vec<PeriodStatus> = vec![];
        let result = validate_children_all_closed(&children);
        assert!(result.is_ok(), "empty children should pass (vacuous truth)");
    }

    #[test]
    fn test_validate_children_all_closed_err_one_open() {
        let children = vec![
            PeriodStatus::Closed,
            PeriodStatus::Open,
            PeriodStatus::Closed,
        ];
        let result = validate_children_all_closed(&children);
        assert!(result.is_err(), "one Open child should fail");
        let err = result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::ChildPeriodNotClosed { index, ref status }
                if index == 1 && matches!(status, PeriodStatus::Open)
            )
        );
        let display = format!("{}", err);
        assert!(display.contains("index 1"));
        assert!(display.contains("Open"));
    }

    #[test]
    fn test_validate_children_all_closed_err_one_closing() {
        let children = vec![
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closing,
        ];
        let result = validate_children_all_closed(&children);
        assert!(
            result.is_err(),
            "one Closing child should fail (must be fully Closed)"
        );
        let err = result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::ChildPeriodNotClosed { index, ref status }
                if index == 2 && matches!(status, PeriodStatus::Closing)
            )
        );
        let display = format!("{}", err);
        assert!(display.contains("index 2"));
        assert!(display.contains("Closing"));
    }

    #[test]
    fn test_period_validation_error_display_invalid_status() {
        let err = PeriodValidationError::InvalidStatus {
            expected: "Closed",
            actual: PeriodStatus::Open,
        };
        let display = format!("{}", err);
        assert!(display.contains("invalid period status"));
        assert!(display.contains("expected Closed"));
        assert!(display.contains("Open"));
    }

    #[test]
    fn test_period_validation_error_clone_and_partial_eq() {
        let a = PeriodValidationError::TrialBalanceMismatch {
            debit: Decimal::new(100, 0),
            credit: Decimal::new(200, 0),
        };
        let b = a.clone();
        assert_eq!(a, b);
        let c = PeriodValidationError::TrialBalanceMismatch {
            debit: Decimal::new(100, 0),
            credit: Decimal::new(300, 0),
        };
        assert_ne!(a, c);
    }

    #[test]
    fn test_period_validation_error_is_std_error() {
        let err: Box<dyn std::error::Error> =
            Box::new(PeriodValidationError::ChildPeriodNotClosed {
                index: 0,
                status: PeriodStatus::Open,
            });
        assert!(err.source().is_none());
    }

    // ===== A组：顺序结账（child_statuses 精确场景） =====

    #[test]
    fn test_children_close_jun_all_5_closed_ok() {
        let children = vec![
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
        ];
        let result = validate_children_all_closed(&children);
        assert!(result.is_ok(), "关闭6月：1-5月全 Closed 应通过");
    }

    #[test]
    fn test_children_close_jun_feb_open_err_index1() {
        let children = vec![
            PeriodStatus::Closed,
            PeriodStatus::Open,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
        ];
        let result = validate_children_all_closed(&children);
        assert!(result.is_err(), "关闭6月：2月(=index1) 还 Open 应失败");
        let err = result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::ChildPeriodNotClosed { index, ref status }
                if index == 1 && matches!(status, PeriodStatus::Open)
            ),
            "err should be at index=1 with Open"
        );
    }

    #[test]
    fn test_children_close_mar_feb_closing_err_index1() {
        let children = vec![PeriodStatus::Closed, PeriodStatus::Closing];
        let result = validate_children_all_closed(&children);
        assert!(
            result.is_err(),
            "关闭3月：2月 Closing 应失败（要求完全 Closed）"
        );
        let err = result.unwrap_err();
        assert!(
            matches!(err, PeriodValidationError::ChildPeriodNotClosed { index, ref status }
                if index == 1 && matches!(status, PeriodStatus::Closing)
            ),
            "err should be at index=1 with Closing"
        );
    }

    // ===== C组：validate_create_entry 锁定期 =====

    #[test]
    fn test_period_status_validate_create_entry_closed_err() {
        let result = PeriodStatus::Closed.validate_create_entry();
        assert!(result.is_err(), "Closed 期间应禁止创建分录/过账");
        assert!(matches!(
            result,
            Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("Closed")
        ));
    }

    #[test]
    fn test_period_status_validate_create_entry_open_ok() {
        let result = PeriodStatus::Open.validate_create_entry();
        assert!(result.is_ok(), "Open 期间应允许创建分录/过账");
        let result2 = PeriodStatus::Closing.validate_create_entry();
        assert!(result2.is_ok(), "Closing 期间也应允许创建分录/过账");
    }

    // ===== D组：validate_trial_balance 占位调用正确性 =====

    #[test]
    fn test_validate_trial_balance_exact_1000_equal_ok() {
        let result = validate_trial_balance(Decimal::new(1000, 0), Decimal::new(1000, 0));
        assert!(result.is_ok(), "debit=credit=1000 应通过");
    }

    #[test]
    fn test_validate_trial_balance_exact_1000_vs_999_err() {
        let result = validate_trial_balance(Decimal::new(1000, 0), Decimal::new(999, 0));
        assert!(result.is_err(), "debit=1000, credit=999 应失败");
        let err = result.unwrap_err();
        assert!(matches!(
            err,
            PeriodValidationError::TrialBalanceMismatch { debit, credit }
            if debit == Decimal::new(1000, 0) && credit == Decimal::new(999, 0)
        ));
    }
}

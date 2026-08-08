use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::Row;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared_core::error::TopemsError;

use super::FinanceService;

impl FinanceService {
    pub(super) async fn check_period_open(
        &self,
        tenant_id: Uuid,
        period: String,
    ) -> Result<(), TopemsError> {
        let period_status: Option<(String,)> = sqlx::query_as(
            "SELECT status::text FROM core_finance_periods WHERE tenant_id = $1 AND period_name = $2",
        )
        .bind(tenant_id)
        .bind(&period)
        .fetch_optional(&self.db_pool)
        .await?;

        if let Some(status) = period_status {
            if status.0 == "closed" {
                return Err(TopemsError::ValidationFailed("会计期间已关闭".to_string()));
            }
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
            "SELECT id, tenant_id, year, month, period_name, status, start_date, end_date, closed_at, closed_by, created_at, updated_at FROM core_finance_periods WHERE tenant_id = $1 AND year = $2 AND month = $3",
        )
        .bind(tenant_id)
        .bind(year)
        .bind(month)
        .fetch_optional(&self.db_pool)
        .await?;

        if let Some(period) = existing {
            if period.status == PeriodStatus::Closed {
                let updated: Period = sqlx::query_as(
                    "UPDATE core_finance_periods 
                     SET status = 'open', closed_at = NULL, closed_by = NULL, updated_at = CURRENT_TIMESTAMP
                     WHERE tenant_id = $1 AND year = $2 AND month = $3
                     RETURNING *",
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
            "INSERT INTO core_finance_periods (tenant_id, year, month, period_name, status, start_date, end_date)
             VALUES ($1, $2, $3, $4, 'open', $5, $6)
             RETURNING *",
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

        let period = sqlx::query_as(
            "INSERT INTO core_finance_periods (tenant_id, year, month, period_name, status, start_date, end_date, closed_at, closed_by)
             VALUES ($1, $2, $3, $4, 'closed', $5, $6, CURRENT_TIMESTAMP, $7)
             ON CONFLICT (tenant_id, year, month) DO UPDATE SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = $7, updated_at = CURRENT_TIMESTAMP
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(year)
        .bind(month)
        .bind(period_name)
        .bind(chrono::NaiveDate::from_ymd_opt(year as i32, month as u32, 1)
            .ok_or_else(|| TopemsError::ValidationFailed(format!("无效的日期: {}-{:02}-01", year, month)))?
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| TopemsError::ValidationFailed("时间转换失败".to_string()))?)
        .bind(chrono::NaiveDate::from_ymd_opt(
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
        .ok_or_else(|| TopemsError::ValidationFailed("时间转换失败".to_string()))?)
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
    ) -> Result<YearEndCloseResult, TopemsError> {
        let period_pattern = format!("{:04}%", year);

        let income_rows = sqlx::query(
            "SELECT a.id, a.code, a.name, COALESCE(SUM(l.credit - l.debit), 0) as balance
             FROM core_finance_accounts a
             LEFT JOIN core_finance_ledger l ON a.id = l.account_id AND l.period LIKE $3
             WHERE a.tenant_id = $1 AND a.account_type = 'income'
             GROUP BY a.id, a.code, a.name
             HAVING COALESCE(SUM(l.credit - l.debit), 0) > 0",
        )
        .bind(tenant_id)
        .bind(AccountType::Income)
        .bind(&period_pattern)
        .fetch_all(&self.db_pool)
        .await?;

        let expense_rows = sqlx::query(
            "SELECT a.id, a.code, a.name, COALESCE(SUM(l.debit - l.credit), 0) as balance
             FROM core_finance_accounts a
             LEFT JOIN core_finance_ledger l ON a.id = l.account_id AND l.period LIKE $3
             WHERE a.tenant_id = $1 AND a.account_type = 'expense'
             GROUP BY a.id, a.code, a.name
             HAVING COALESCE(SUM(l.debit - l.credit), 0) > 0",
        )
        .bind(tenant_id)
        .bind(AccountType::Expense)
        .bind(&period_pattern)
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

        let net_profit = total_income - total_expense;

        if total_income == Decimal::ZERO && total_expense == Decimal::ZERO {
            return Err(TopemsError::ValidationFailed(
                "没有可结转的损益数据".to_string(),
            ));
        }

        let profit_account = match self.get_account_by_code(tenant_id, "3101").await {
            Ok(account) => account,
            Err(_) => self
                .get_account_by_code(tenant_id, "3103")
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
            "INSERT INTO core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9)
             RETURNING *",
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
                    "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 0)",
                )
                .bind(voucher.id)
                .bind(line_no)
                .bind(account_id)
                .bind(&account_code)
                .bind(&account_name)
                .bind("结转年度收入")
                .bind(balance)
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
                    "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 0)",
                )
                .bind(voucher.id)
                .bind(line_no)
                .bind(profit_account.id)
                .bind(&profit_account.code)
                .bind(&profit_account.name)
                .bind("结转年度费用")
                .bind(balance)
                .execute(&self.db_pool)
                .await?;

                line_no += 1;
                sqlx::query(
                    "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit)
                     VALUES ($1, $2, $3, $4, $5, $6, 0, $7)",
                )
                .bind(voucher.id)
                .bind(line_no)
                .bind(account_id)
                .bind(&account_code)
                .bind(&account_name)
                .bind("结转年度费用")
                .bind(balance)
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

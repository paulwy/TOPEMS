use chrono::{DateTime, Datelike, NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::{postgres::PgPool, Row};
use uuid::Uuid;

use super::super::models::*;
use topems_shared::error::TopemsError;

pub struct FinanceService {
    db_pool: PgPool,
}

impl FinanceService {
    pub fn new(db_pool: PgPool) -> Self {
        Self { db_pool }
    }

    pub async fn create_account(
        &self,
        tenant_id: Uuid,
        req: CreateAccountRequest,
    ) -> Result<Account, TopemsError> {
        let level = if let Some(parent_id) = req.parent_id {
            let parent: (i32,) =
                sqlx::query_as("SELECT level FROM core_finance_accounts WHERE id = $1")
                    .bind(parent_id)
                    .fetch_one(&self.db_pool)
                    .await?;
            parent.0 + 1
        } else {
            1
        };

        let account = sqlx::query_as(
            "INSERT INTO core_finance_accounts (tenant_id, code, name, parent_id, account_type, level, currency, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(req.code)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(req.account_type)
        .bind(level)
        .bind(req.currency)
        .bind(req.description)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(account)
    }

    pub async fn get_account(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<Account, TopemsError> {
        let account =
            sqlx::query_as("SELECT * FROM core_finance_accounts WHERE tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(account_id)
                .fetch_one(&self.db_pool)
                .await?;

        Ok(account)
    }

    pub async fn get_account_by_code(
        &self,
        tenant_id: Uuid,
        code: &str,
    ) -> Result<Account, TopemsError> {
        let account = sqlx::query_as(
            "SELECT * FROM core_finance_accounts WHERE tenant_id = $1 AND code = $2",
        )
        .bind(tenant_id)
        .bind(code)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(account)
    }

    pub async fn list_accounts(&self, tenant_id: Uuid) -> Result<Vec<Account>, TopemsError> {
        let accounts = sqlx::query_as(
            "SELECT * FROM core_finance_accounts WHERE tenant_id = $1 ORDER BY code",
        )
        .bind(tenant_id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(accounts)
    }

    pub async fn create_voucher(
        &self,
        tenant_id: Uuid,
        req: CreateVoucherRequest,
        created_by: &str,
    ) -> Result<VoucherResponse, TopemsError> {
        let period = format!(
            "{:04}{:02}",
            req.voucher_date.year(),
            req.voucher_date.month()
        );

        self.check_period_open(tenant_id, period.clone()).await?;

        let total_debit: Decimal = req.lines.iter().map(|l| l.debit).sum();
        let total_credit: Decimal = req.lines.iter().map(|l| l.credit).sum();

        if (total_debit - total_credit).abs() > Decimal::new(1, 4) {
            return Err(TopemsError::ValidationFailed("借贷不平".to_string()));
        }

        let voucher_no = self
            .generate_voucher_no(tenant_id, req.voucher_type.clone())
            .await?;

        let voucher: Voucher = sqlx::query_as(
            "INSERT INTO core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9)
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(voucher_no)
        .bind(req.voucher_date)
        .bind(period)
        .bind(req.voucher_type)
        .bind(total_debit)
        .bind(total_credit)
        .bind(req.description)
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await?;

        let mut lines = Vec::new();
        for (i, line) in req.lines.iter().enumerate() {
            let account = self
                .get_account_by_code(tenant_id, &line.account_code)
                .await?;

            let voucher_line = sqlx::query_as(
                "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *",
            )
            .bind(voucher.id)
            .bind(i as i32 + 1)
            .bind(account.id)
            .bind(account.code)
            .bind(account.name)
            .bind(line.description.clone())
            .bind(line.debit)
            .bind(line.credit)
            .bind(line.project_id)
            .bind(line.department_id)
            .fetch_one(&self.db_pool)
            .await?;

            lines.push(voucher_line);
        }

        Ok(VoucherResponse {
            id: voucher.id,
            voucher_no: voucher.voucher_no,
            voucher_date: voucher.voucher_date,
            voucher_type: voucher.voucher_type,
            status: voucher.status,
            total_debit: voucher.total_debit,
            total_credit: voucher.total_credit,
            lines,
            description: voucher.description,
            created_at: voucher.created_at,
        })
    }

    async fn generate_voucher_no(
        &self,
        tenant_id: Uuid,
        voucher_type: VoucherType,
    ) -> Result<String, TopemsError> {
        let today = Utc::now();
        let prefix = match voucher_type {
            VoucherType::General => "记",
            VoucherType::Payment => "付",
            VoucherType::Receipt => "收",
            VoucherType::Transfer => "转",
        };

        let year = today.year();
        let month = today.month();

        let period_prefix = format!("{:04}{:02}", year, month);
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM core_finance_vouchers 
             WHERE tenant_id = $1 AND voucher_type = $2 AND period LIKE $3",
        )
        .bind(tenant_id)
        .bind(voucher_type)
        .bind(format!("{}%", period_prefix))
        .fetch_one(&self.db_pool)
        .await?;

        Ok(format!("{}{}{:04}", prefix, period_prefix, count.0 + 1))
    }

    async fn check_period_open(&self, tenant_id: Uuid, period: String) -> Result<(), TopemsError> {
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

    pub async fn submit_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
    ) -> Result<Voucher, TopemsError> {
        let voucher = sqlx::query_as(
            "UPDATE core_finance_vouchers SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'draft'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(voucher)
    }

    pub async fn approve_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
        approved_by: &str,
    ) -> Result<Voucher, TopemsError> {
        let voucher = sqlx::query_as(
            "UPDATE core_finance_vouchers SET status = 'approved', approved_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .bind(approved_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(voucher)
    }

    pub async fn post_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
        posted_by: &str,
    ) -> Result<Voucher, TopemsError> {
        let voucher: Voucher = sqlx::query_as(
            "SELECT * FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2 AND status = 'approved'",
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        let lines: Vec<VoucherLine> = sqlx::query_as(
            "SELECT * FROM core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no",
        )
        .bind(voucher.id)
        .fetch_all(&self.db_pool)
        .await?;

        for line in &lines {
            let balance = self
                .calculate_account_balance(tenant_id, line.account_id)
                .await?;
            let new_balance = if line.debit > Decimal::ZERO {
                balance + line.debit - line.credit
            } else {
                balance - line.credit + line.debit
            };

            sqlx::query(
                "INSERT INTO core_finance_ledger (tenant_id, account_id, account_code, account_name, voucher_id, voucher_no, voucher_date, period, description, debit, credit, balance)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            )
            .bind(tenant_id)
            .bind(line.account_id)
            .bind(line.account_code.clone())
            .bind(line.account_name.clone())
            .bind(voucher.id)
            .bind(voucher.voucher_no.clone())
            .bind(voucher.voucher_date)
            .bind(voucher.period.clone())
            .bind(line.description.clone())
            .bind(line.debit)
            .bind(line.credit)
            .bind(new_balance)
            .execute(&self.db_pool)
            .await?;
        }

        let updated_voucher = sqlx::query_as(
            "UPDATE core_finance_vouchers SET status = 'posted', posted_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .bind(posted_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(updated_voucher)
    }

    async fn calculate_account_balance(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<Decimal, TopemsError> {
        let result: (Option<Decimal>,) = sqlx::query_as(
            "SELECT COALESCE(SUM(debit - credit), 0) as balance FROM core_finance_ledger
             WHERE tenant_id = $1 AND account_id = $2",
        )
        .bind(tenant_id)
        .bind(account_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(result.0.unwrap_or(Decimal::ZERO))
    }

    pub async fn get_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
    ) -> Result<VoucherResponse, TopemsError> {
        let voucher: Voucher =
            sqlx::query_as("SELECT * FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(voucher_id)
                .fetch_one(&self.db_pool)
                .await?;

        let lines: Vec<VoucherLine> = sqlx::query_as(
            "SELECT * FROM core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no",
        )
        .bind(voucher.id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(VoucherResponse {
            id: voucher.id,
            voucher_no: voucher.voucher_no,
            voucher_date: voucher.voucher_date,
            voucher_type: voucher.voucher_type,
            status: voucher.status,
            total_debit: voucher.total_debit,
            total_credit: voucher.total_credit,
            lines,
            description: voucher.description,
            created_at: voucher.created_at,
        })
    }

    pub async fn list_vouchers(
        &self,
        tenant_id: Uuid,
        status: Option<VoucherStatus>,
        period: Option<String>,
    ) -> Result<Vec<Voucher>, TopemsError> {
        let mut query = "SELECT * FROM core_finance_vouchers WHERE tenant_id = $1".to_string();
        let status_provided = status.is_some();
        let period_provided = period.is_some();

        if status_provided {
            query.push_str(" AND status = $2");
        }
        if period_provided {
            let param_num = if status_provided { "$3" } else { "$2" };
            query.push_str(&format!(" AND period = {}", param_num));
        }

        query.push_str(" ORDER BY voucher_date DESC");

        let mut query_builder = sqlx::query_as(&query).bind(tenant_id);
        if let Some(s) = status {
            query_builder = query_builder.bind(s);
        }
        if let Some(p) = period {
            query_builder = query_builder.bind(p);
        }

        let vouchers = query_builder.fetch_all(&self.db_pool).await?;

        Ok(vouchers)
    }

    pub async fn get_ledger(
        &self,
        tenant_id: Uuid,
        params: LedgerQueryParams,
    ) -> Result<Vec<LedgerEntry>, TopemsError> {
        let mut query = "SELECT * FROM core_finance_ledger WHERE tenant_id = $1".to_string();

        let account_id_provided = params.account_id.is_some();
        let account_code_provided = params.account_code.is_some();
        let period_provided = params.period.is_some();

        if account_id_provided {
            query.push_str(" AND account_id = $2");
        }
        if account_code_provided {
            let param_num = if account_id_provided { "$3" } else { "$2" };
            query.push_str(&format!(" AND account_code = {}", param_num));
        }
        if period_provided {
            let param_num = match (account_id_provided, account_code_provided) {
                (true, true) => "$4",
                (true, false) | (false, true) => "$3",
                (false, false) => "$2",
            };
            query.push_str(&format!(" AND period = {}", param_num));
        }

        query.push_str(" ORDER BY voucher_date, id");

        let mut query_builder = sqlx::query_as(&query).bind(tenant_id);
        if let Some(account_id) = params.account_id {
            query_builder = query_builder.bind(account_id);
        }
        if let Some(account_code) = params.account_code {
            query_builder = query_builder.bind(account_code);
        }
        if let Some(period) = params.period {
            query_builder = query_builder.bind(period);
        }

        let entries = query_builder.fetch_all(&self.db_pool).await?;

        Ok(entries)
    }

    pub async fn get_trial_balance(
        &self,
        tenant_id: Uuid,
        period: &str,
    ) -> Result<Vec<TrialBalance>, TopemsError> {
        let balances = sqlx::query_as(
            "SELECT 
                a.id as account_id,
                a.code as account_code,
                a.name as account_name,
                a.account_type,
                COALESCE(SUM(CASE WHEN l.debit > l.credit THEN l.debit - l.credit ELSE 0 END), 0) as debit_balance,
                COALESCE(SUM(CASE WHEN l.credit > l.debit THEN l.credit - l.debit ELSE 0 END), 0) as credit_balance
             FROM core_finance_accounts a
             LEFT JOIN core_finance_ledger l ON a.id = l.account_id AND l.period = $2
             WHERE a.tenant_id = $1
             GROUP BY a.id, a.code, a.name, a.account_type
             ORDER BY a.code",
        )
        .bind(tenant_id)
        .bind(period)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(balances)
    }

    pub async fn get_balance_sheet(
        &self,
        tenant_id: Uuid,
        period: &str,
    ) -> Result<BalanceSheet, TopemsError> {
        let assets = self
            .get_balance_items(tenant_id, period, AccountType::Asset)
            .await?;
        let liabilities = self
            .get_balance_items(tenant_id, period, AccountType::Liability)
            .await?;
        let equity = self
            .get_balance_items(tenant_id, period, AccountType::Equity)
            .await?;

        let total_assets: Decimal = assets.iter().map(|i| i.amount).sum();
        let total_liabilities: Decimal = liabilities.iter().map(|i| i.amount).sum();
        let total_equity: Decimal = equity.iter().map(|i| i.amount).sum();

        Ok(BalanceSheet {
            period: period.to_string(),
            assets,
            liabilities,
            equity,
            total_assets,
            total_liabilities,
            total_equity,
        })
    }

    async fn get_balance_items(
        &self,
        tenant_id: Uuid,
        period: &str,
        account_type: AccountType,
    ) -> Result<Vec<BalanceItem>, TopemsError> {
        let type_str = account_type.to_string();

        let amount_expr = match account_type {
            AccountType::Asset => "COALESCE(SUM(l.debit - l.credit), 0)",
            AccountType::Liability | AccountType::Equity => "COALESCE(SUM(l.credit - l.debit), 0)",
            _ => "COALESCE(SUM(l.debit - l.credit), 0)",
        };

        let query = format!(
            "SELECT
                a.code as account_code,
                a.name as account_name,
                {} as amount
             FROM core_finance_accounts a
             LEFT JOIN core_finance_ledger l ON a.id = l.account_id AND l.period = $3
             WHERE a.tenant_id = $1 AND a.account_type::text = $2
             GROUP BY a.code, a.name
             ORDER BY a.code",
            amount_expr
        );

        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(type_str)
            .bind(period)
            .fetch_all(&self.db_pool)
            .await?;

        let items = rows
            .into_iter()
            .map(|row| {
                let amount: Decimal = row.get("amount");
                let amount = if amount < Decimal::ZERO {
                    -amount
                } else {
                    amount
                };
                BalanceItem {
                    account_code: row.get("account_code"),
                    account_name: row.get("account_name"),
                    amount,
                }
            })
            .collect();

        Ok(items)
    }

    pub async fn get_income_statement(
        &self,
        tenant_id: Uuid,
        period: &str,
    ) -> Result<IncomeStatement, TopemsError> {
        let revenues = self
            .get_income_items(tenant_id, period, AccountType::Income)
            .await?;
        let expenses = self
            .get_income_items(tenant_id, period, AccountType::Expense)
            .await?;

        let total_revenue: Decimal = revenues.iter().map(|i| i.amount).sum();
        let total_expense: Decimal = expenses.iter().map(|i| i.amount).sum();
        let net_income = total_revenue - total_expense;

        Ok(IncomeStatement {
            period: period.to_string(),
            revenues,
            expenses,
            total_revenue,
            total_expense,
            net_income,
        })
    }

    async fn get_income_items(
        &self,
        tenant_id: Uuid,
        period: &str,
        account_type: AccountType,
    ) -> Result<Vec<IncomeItem>, TopemsError> {
        let type_str = account_type.to_string();
        let rows = sqlx::query(
            "SELECT 
                a.code as account_code,
                a.name as account_name,
                COALESCE(SUM(l.debit - l.credit), 0) as amount
             FROM core_finance_accounts a
             LEFT JOIN core_finance_ledger l ON a.id = l.account_id AND l.period = $3
             WHERE a.tenant_id = $1 AND a.account_type::text = $2
             GROUP BY a.code, a.name
             ORDER BY a.code",
        )
        .bind(tenant_id)
        .bind(type_str)
        .bind(period)
        .fetch_all(&self.db_pool)
        .await?;

        let items = rows
            .into_iter()
            .map(|row| IncomeItem {
                account_code: row.get("account_code"),
                account_name: row.get("account_name"),
                amount: row.get("amount"),
            })
            .collect();

        Ok(items)
    }

    pub async fn open_period(
        &self,
        tenant_id: Uuid,
        year: i32,
        month: i32,
    ) -> Result<Period, TopemsError> {
        let period_name = format!("{:04}{:02}", year, month);

        let existing: Option<Period> = sqlx::query_as(
            "SELECT * FROM core_finance_periods WHERE tenant_id = $1 AND year = $2 AND month = $3",
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
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let end_date = NaiveDate::from_ymd_opt(
            if month == 12 { year + 1 } else { year },
            if month == 12 { 1 } else { month as u32 + 1 },
            1,
        )
        .unwrap()
        .pred_opt()
        .unwrap()
        .and_hms_opt(23, 59, 59)
        .unwrap();

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
        .bind(chrono::NaiveDate::from_ymd_opt(year as i32, month as u32, 1).unwrap().and_hms_opt(0, 0, 0).unwrap())
        .bind(chrono::NaiveDate::from_ymd_opt(year as i32, month as u32, 1).unwrap().and_hms_opt(23, 59, 59).unwrap())
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

    pub async fn create_aux_account(
        &self,
        tenant_id: Uuid,
        req: CreateAuxiliaryAccountRequest,
    ) -> Result<AuxiliaryAccount, TopemsError> {
        let level = if let Some(parent_id) = req.parent_id {
            let parent: (i32,) =
                sqlx::query_as("SELECT level FROM core_finance_aux_accounts WHERE id = $1")
                    .bind(parent_id)
                    .fetch_one(&self.db_pool)
                    .await?;
            parent.0 + 1
        } else {
            1
        };

        let aux_account = sqlx::query_as(
            "INSERT INTO core_finance_aux_accounts (tenant_id, aux_type, code, name, parent_id, level, description)
             VALUES ($1, $2::aux_type, $3, $4, $5, $6, $7)
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(req.aux_type.to_string())
        .bind(req.code)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(level)
        .bind(req.description)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(aux_account)
    }

    pub async fn list_aux_accounts(
        &self,
        tenant_id: Uuid,
        aux_type: Option<AuxType>,
    ) -> Result<Vec<AuxiliaryAccount>, TopemsError> {
        let accounts = if let Some(t) = aux_type {
            let type_str = t.to_string();
            sqlx::query_as(
                "SELECT * FROM core_finance_aux_accounts WHERE tenant_id = $1 AND aux_type::text = $2 ORDER BY code",
            )
            .bind(tenant_id)
            .bind(type_str)
            .fetch_all(&self.db_pool)
            .await?
        } else {
            sqlx::query_as(
                "SELECT * FROM core_finance_aux_accounts WHERE tenant_id = $1 ORDER BY aux_type, code",
            )
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await?
        };

        Ok(accounts)
    }

    pub async fn get_aux_account(
        &self,
        tenant_id: Uuid,
        aux_id: Uuid,
    ) -> Result<AuxiliaryAccount, TopemsError> {
        let account = sqlx::query_as(
            "SELECT * FROM core_finance_aux_accounts WHERE tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(aux_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(account)
    }

    pub async fn get_aux_ledger(
        &self,
        tenant_id: Uuid,
        query: AuxLedgerQuery,
    ) -> Result<Vec<AuxLedgerEntry>, TopemsError> {
        let type_str = query.aux_type.to_string();
        let aux_id = query.aux_id;
        let account_id = query.account_id;
        let period = query.period;
        let start_date = query.start_date;
        let end_date = query.end_date;

        let entries = sqlx::query_as(
            r#"
            SELECT
                l.id,
                l.period,
                l.voucher_no,
                l.voucher_date,
                l.account_code,
                l.account_name,
                la.aux_type,
                la.id as aux_id,
                la.name as aux_name,
                l.description,
                l.debit,
                l.credit,
                l.balance
            FROM core_finance_ledger l
            JOIN core_finance_aux_accounts la ON la.id = l.aux_id
            WHERE l.tenant_id = $1
              AND la.aux_type::text = $2
              AND ($3::uuid IS NULL OR l.aux_id = $3)
              AND ($4::uuid IS NULL OR l.account_id = $4)
              AND ($5::text IS NULL OR l.period = $5)
              AND ($6::timestamptz IS NULL OR l.voucher_date >= $6)
              AND ($7::timestamptz IS NULL OR l.voucher_date <= $7)
            ORDER BY l.voucher_date, l.voucher_no
            "#,
        )
        .bind(tenant_id)
        .bind(type_str)
        .bind(aux_id)
        .bind(account_id)
        .bind(period)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(entries)
    }

    pub async fn get_aux_balance(
        &self,
        tenant_id: Uuid,
        query: AuxLedgerQuery,
    ) -> Result<Vec<AuxBalanceReport>, TopemsError> {
        let type_str = query.aux_type.to_string();
        let aux_id = query.aux_id;
        let account_id = query.account_id;
        let period = query.period;

        let rows = sqlx::query(
            r#"
            SELECT
                la.id as aux_id,
                la.name as aux_name,
                la.code as aux_code,
                a.id as account_id,
                a.code as account_code,
                a.name as account_name,
                COALESCE(SUM(l.debit), 0) as total_debit,
                COALESCE(SUM(l.credit), 0) as total_credit
            FROM core_finance_aux_accounts la
            CROSS JOIN core_finance_accounts a
            LEFT JOIN core_finance_ledger l ON l.account_id = a.id AND l.aux_id = la.id
                AND ($4::text IS NULL OR l.period = $4)
            WHERE la.tenant_id = $1
              AND a.tenant_id = $1
              AND la.aux_type::text = $2
              AND ($3::uuid IS NULL OR la.id = $3)
              AND ($5::uuid IS NULL OR a.id = $5)
            GROUP BY la.id, la.name, la.code, a.id, a.code, a.name
            ORDER BY la.code, a.code
            "#,
        )
        .bind(tenant_id)
        .bind(type_str)
        .bind(aux_id)
        .bind(period)
        .bind(account_id)
        .fetch_all(&self.db_pool)
        .await?;

        let mut acc: std::collections::HashMap<Uuid, AuxBalanceReport> =
            std::collections::HashMap::new();

        for row in rows.iter() {
            let aux_id: Uuid = row.get("aux_id");
            let aux_name: String = row.get("aux_name");
            let account_code: String = row.get("account_code");
            let account_name: String = row.get("account_name");
            let total_debit: Decimal = row.get("total_debit");
            let total_credit: Decimal = row.get("total_credit");

            if let std::collections::hash_map::Entry::Vacant(entry) = acc.entry(aux_id) {
                entry.insert(AuxBalanceReport {
                    aux_type: query.aux_type.clone(),
                    aux_id,
                    aux_name: aux_name.clone(),
                    items: vec![AuxBalanceItem {
                        account_code,
                        account_name,
                        debit_balance: total_debit,
                        credit_balance: total_credit,
                    }],
                    total_debit,
                    total_credit,
                });
            } else {
                let report = acc.get_mut(&aux_id).unwrap();
                report.total_debit += total_debit;
                report.total_credit += total_credit;
                report.items.push(AuxBalanceItem {
                    account_code,
                    account_name,
                    debit_balance: total_debit,
                    credit_balance: total_credit,
                });
            }
        }

        let reports: Vec<AuxBalanceReport> = acc.into_values().collect();
        Ok(reports)
    }

    pub async fn get_cash_flow_statement(
        &self,
        tenant_id: Uuid,
        period: &str,
    ) -> Result<CashFlowStatement, TopemsError> {
        let rows = sqlx::query(
            r#"
            SELECT
                a.code as account_code,
                a.name as account_name,
                COALESCE(SUM(l.debit), 0) as total_debit,
                COALESCE(SUM(l.credit), 0) as total_credit
            FROM core_finance_accounts a
            LEFT JOIN core_finance_ledger l ON a.id = l.account_id AND l.period = $2
            WHERE a.tenant_id = $1
              AND a.account_type::text = 'asset'
              AND a.code LIKE '1___'
            GROUP BY a.code, a.name
            ORDER BY a.code
            "#,
        )
        .bind(tenant_id)
        .bind(period)
        .fetch_all(&self.db_pool)
        .await?;

        let mut items = Vec::new();
        let mut total_inflow = Decimal::ZERO;
        let mut total_outflow = Decimal::ZERO;
        let mut closing_balance = Decimal::ZERO;

        for row in rows {
            let account_code: String = row.get("account_code");
            let account_name: String = row.get("account_name");
            let total_debit: Decimal = row.get("total_debit");
            let total_credit: Decimal = row.get("total_credit");
            let net = total_debit - total_credit;

            closing_balance += net;

            if net >= Decimal::ZERO {
                total_inflow += net;
                items.push(CashFlowItem {
                    item_code: account_code,
                    item_name: account_name,
                    item_type: "inflow".to_string(),
                    amount: net,
                    children: vec![],
                });
            } else {
                total_outflow += -net;
                items.push(CashFlowItem {
                    item_code: account_code,
                    item_name: account_name,
                    item_type: "outflow".to_string(),
                    amount: -net,
                    children: vec![],
                });
            }
        }

        Ok(CashFlowStatement {
            period: period.to_string(),
            items,
            total_inflow,
            total_outflow,
            net_change: total_inflow - total_outflow,
            opening_balance: Decimal::ZERO,
            closing_balance,
        })
    }

    pub async fn batch_submit_vouchers(
        &self,
        tenant_id: Uuid,
        voucher_ids: Vec<Uuid>,
    ) -> Result<BatchVoucherResponse, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for voucher_id in voucher_ids {
            match self.submit_voucher(tenant_id, voucher_id).await {
                Ok(voucher) => {
                    success_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: Some(voucher.voucher_no),
                        success: true,
                        message: "提交成功".to_string(),
                    });
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: None,
                        success: false,
                        message: e.to_string(),
                    });
                }
            }
        }

        Ok(BatchVoucherResponse {
            success_count,
            fail_count,
            results,
        })
    }

    pub async fn batch_approve_vouchers(
        &self,
        tenant_id: Uuid,
        voucher_ids: Vec<Uuid>,
        approved_by: &str,
    ) -> Result<BatchVoucherResponse, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for voucher_id in voucher_ids {
            match self
                .approve_voucher(tenant_id, voucher_id, approved_by)
                .await
            {
                Ok(voucher) => {
                    success_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: Some(voucher.voucher_no),
                        success: true,
                        message: "审批成功".to_string(),
                    });
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: None,
                        success: false,
                        message: e.to_string(),
                    });
                }
            }
        }

        Ok(BatchVoucherResponse {
            success_count,
            fail_count,
            results,
        })
    }

    pub async fn batch_post_vouchers(
        &self,
        tenant_id: Uuid,
        voucher_ids: Vec<Uuid>,
        posted_by: &str,
    ) -> Result<BatchVoucherResponse, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for voucher_id in voucher_ids {
            match self.post_voucher(tenant_id, voucher_id, posted_by).await {
                Ok(voucher) => {
                    success_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: Some(voucher.voucher_no),
                        success: true,
                        message: "过账成功".to_string(),
                    });
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: None,
                        success: false,
                        message: e.to_string(),
                    });
                }
            }
        }

        Ok(BatchVoucherResponse {
            success_count,
            fail_count,
            results,
        })
    }

    pub async fn export_vouchers(
        &self,
        tenant_id: Uuid,
        req: ExportVoucherRequest,
    ) -> Result<ExportVoucherResponse, TopemsError> {
        let mut query = "SELECT v.*, vl.* FROM core_finance_vouchers v JOIN core_finance_voucher_lines vl ON v.id = vl.voucher_id WHERE v.tenant_id = $1".to_string();

        if let Some(status) = req.status {
            query.push_str(&format!(" AND v.status = '{}'", status));
        }
        if let Some(period) = req.period {
            query.push_str(&format!(" AND v.period = '{}'", period));
        }

        if !req.voucher_ids.is_empty() {
            let ids_str = req
                .voucher_ids
                .iter()
                .map(|id| format!("'{}'", id))
                .collect::<Vec<_>>()
                .join(",");
            query.push_str(&format!(" AND v.id IN ({})", ids_str));
        }

        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await?;

        let mut total_debit = Decimal::ZERO;
        let mut total_credit = Decimal::ZERO;
        let mut export_rows = Vec::new();

        for row in rows {
            let voucher_no: String = row.get("voucher_no");
            let voucher_date: DateTime<Utc> = row.get("voucher_date");
            let period: String = row.get("period");
            let voucher_type: VoucherType = row.get("voucher_type");
            let status: VoucherStatus = row.get("status");
            let line_no: i32 = row.get("line_no");
            let account_code: String = row.get("account_code");
            let account_name: String = row.get("account_name");
            let description: Option<String> = row.get("description");
            let debit: Decimal = row.get("debit");
            let credit: Decimal = row.get("credit");
            let created_by: String = row.get("created_by");

            total_debit += debit;
            total_credit += credit;

            export_rows.push(VoucherExportRow {
                voucher_no,
                voucher_date: voucher_date.to_rfc3339(),
                period,
                voucher_type: voucher_type.to_string(),
                status: status.to_string(),
                line_no,
                account_code,
                account_name,
                description,
                debit,
                credit,
                project_name: None,
                department_name: None,
                created_by,
            });
        }

        let json_data = serde_json::to_string(&export_rows).map_err(|e| {
            TopemsError::Internal(format!("Failed to serialize export data: {}", e))
        })?;

        Ok(ExportVoucherResponse {
            file_name: format!("vouchers_export_{}.json", Utc::now().timestamp()),
            format: req.format,
            total_count: export_rows.len(),
            total_debit,
            total_credit,
            file_data: json_data,
            created_at: Utc::now(),
        })
    }

    pub async fn submit_for_approval(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
        doc_no: String,
        submitted_by: &str,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "INSERT INTO core_finance_approval_workflows (tenant_id, doc_type, doc_id, doc_no, status, submitted_by, submitted_at)
             VALUES ($1, $2, $3, $4, 'pending', $5, CURRENT_TIMESTAMP)
             ON CONFLICT (tenant_id, doc_type, doc_id) DO UPDATE SET status = 'pending', submitted_by = $5, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .bind(doc_no)
        .bind(submitted_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn approve(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
        approved_by: &str,
        comment: Option<String>,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "UPDATE core_finance_approval_workflows SET status = 'approved', approved_by = $3, approved_at = CURRENT_TIMESTAMP, comment = $4, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3 AND status = 'pending'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .bind(approved_by)
        .bind(comment)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn reject(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
        rejected_by: &str,
        reason: String,
        comment: Option<String>,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "UPDATE core_finance_approval_workflows SET status = 'rejected', rejected_by = $3, rejected_at = CURRENT_TIMESTAMP, rejection_reason = $4, comment = $5, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3 AND status = 'pending'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .bind(rejected_by)
        .bind(reason)
        .bind(comment)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn cancel_approval(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "UPDATE core_finance_approval_workflows SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3 AND status = 'pending'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn get_approval_status(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
    ) -> Result<Option<ApprovalWorkflow>, TopemsError> {
        let workflow = sqlx::query_as(
            "SELECT * FROM core_finance_approval_workflows WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .fetch_optional(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn list_pending_approvals(
        &self,
        tenant_id: Uuid,
        doc_type: Option<ApprovalDocType>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<ApprovalWorkflow>, i64), TopemsError> {
        let offset = (page - 1) * page_size;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM core_finance_approval_workflows WHERE tenant_id = $1 AND status = 'pending'"
        )
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await?;

        let workflows = if let Some(t) = doc_type {
            sqlx::query_as(
                "SELECT * FROM core_finance_approval_workflows WHERE tenant_id = $1 AND doc_type = $2 AND status = 'pending' ORDER BY submitted_at DESC LIMIT $3 OFFSET $4",
            )
            .bind(tenant_id)
            .bind(t)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.db_pool)
            .await?
        } else {
            sqlx::query_as(
                "SELECT * FROM core_finance_approval_workflows WHERE tenant_id = $1 AND status = 'pending' ORDER BY submitted_at DESC LIMIT $2 OFFSET $3",
            )
            .bind(tenant_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.db_pool)
            .await?
        };

        Ok((workflows, total.0))
    }
}

pub async fn init_database(pool: &PgPool) -> Result<(), TopemsError> {
    let create_types = r#"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
                CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense', 'cost');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_type') THEN
                CREATE TYPE voucher_type AS ENUM ('general', 'payment', 'receipt', 'transfer');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_status') THEN
                CREATE TYPE voucher_status AS ENUM ('draft', 'submitted', 'approved', 'posted', 'rejected', 'cancelled');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_status') THEN
                CREATE TYPE period_status AS ENUM ('open', 'closing', 'closed');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_doc_type') THEN
                CREATE TYPE approval_doc_type AS ENUM ('voucher', 'consolidation_report', 'financial_statement', 'journal_entry');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
                CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
            END IF;
        END $$;
    "#;
    sqlx::query(create_types).execute(pool).await?;

    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS core_finance_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            parent_id UUID REFERENCES core_finance_accounts(id),
            account_type account_type NOT NULL,
            level INT NOT NULL DEFAULT 1,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            description TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_account_code UNIQUE (tenant_id, code)
        )",
        "CREATE INDEX IF NOT EXISTS idx_account_tenant_id ON core_finance_accounts(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_account_parent_id ON core_finance_accounts(parent_id)",
        "CREATE TABLE IF NOT EXISTS core_finance_vouchers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            voucher_no VARCHAR(50) NOT NULL,
            voucher_date TIMESTAMP NOT NULL,
            period VARCHAR(6) NOT NULL,
            voucher_type voucher_type NOT NULL,
            total_debit NUMERIC(18,4) NOT NULL DEFAULT 0,
            total_credit NUMERIC(18,4) NOT NULL DEFAULT 0,
            status voucher_status NOT NULL DEFAULT 'draft',
            description TEXT,
            created_by VARCHAR(100) NOT NULL,
            approved_by VARCHAR(100),
            posted_by VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_voucher_tenant_id ON core_finance_vouchers(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_voucher_period ON core_finance_vouchers(period)",
        "CREATE INDEX IF NOT EXISTS idx_voucher_status ON core_finance_vouchers(status)",
        "CREATE TABLE IF NOT EXISTS core_finance_voucher_lines (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id) ON DELETE CASCADE,
            line_no INT NOT NULL,
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            account_code VARCHAR(50) NOT NULL,
            account_name VARCHAR(255) NOT NULL,
            description TEXT,
            debit NUMERIC(18,4) NOT NULL DEFAULT 0,
            credit NUMERIC(18,4) NOT NULL DEFAULT 0,
            project_id UUID,
            department_id UUID,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_voucher_line_voucher_id ON core_finance_voucher_lines(voucher_id)",
        "CREATE INDEX IF NOT EXISTS idx_voucher_line_account_id ON core_finance_voucher_lines(account_id)",
        "CREATE TABLE IF NOT EXISTS core_finance_ledger (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            account_code VARCHAR(50) NOT NULL,
            account_name VARCHAR(255) NOT NULL,
            voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id),
            voucher_no VARCHAR(50) NOT NULL,
            voucher_date TIMESTAMP NOT NULL,
            period VARCHAR(6) NOT NULL,
            description TEXT,
            debit NUMERIC(18,4) NOT NULL DEFAULT 0,
            credit NUMERIC(18,4) NOT NULL DEFAULT 0,
            balance NUMERIC(18,4) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_ledger_tenant_id ON core_finance_ledger(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON core_finance_ledger(account_id)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_period ON core_finance_ledger(period)",
        "CREATE TABLE IF NOT EXISTS core_finance_periods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            year INT NOT NULL,
            month INT NOT NULL,
            period_name VARCHAR(20) NOT NULL,
            status period_status NOT NULL DEFAULT 'open',
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            closed_at TIMESTAMP,
            closed_by VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_period UNIQUE (tenant_id, year, month)
        )",
        "CREATE INDEX IF NOT EXISTS idx_period_tenant_id ON core_finance_periods(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_period_status ON core_finance_periods(status)",
        "CREATE TABLE IF NOT EXISTS core_finance_approval_workflows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            doc_type approval_doc_type NOT NULL,
            doc_id UUID NOT NULL,
            doc_no VARCHAR(100) NOT NULL,
            status approval_status NOT NULL DEFAULT 'pending',
            submitted_by VARCHAR(100) NOT NULL,
            submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            approved_by VARCHAR(100),
            approved_at TIMESTAMP,
            rejected_by VARCHAR(100),
            rejected_at TIMESTAMP,
            rejection_reason TEXT,
            comment TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_doc_approval UNIQUE (tenant_id, doc_type, doc_id)
        )",
        "CREATE INDEX IF NOT EXISTS idx_approval_tenant_id ON core_finance_approval_workflows(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_approval_doc ON core_finance_approval_workflows(doc_type, doc_id)",
        "CREATE INDEX IF NOT EXISTS idx_approval_status ON core_finance_approval_workflows(status)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

pub async fn init_aux_tables(pool: &PgPool) -> Result<(), TopemsError> {
    let create_types = r#"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aux_type') THEN
                CREATE TYPE aux_type AS ENUM ('project', 'department', 'customer', 'supplier', 'employee', 'custom1', 'custom2', 'custom3');
            END IF;
        END $$;
    "#;
    sqlx::query(create_types).execute(pool).await?;

    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS core_finance_aux_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            aux_type aux_type NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            parent_id UUID REFERENCES core_finance_aux_accounts(id),
            level INT NOT NULL DEFAULT 1,
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_aux_code UNIQUE (tenant_id, aux_type, code)
        )",
        "CREATE INDEX IF NOT EXISTS idx_aux_account_tenant_id ON core_finance_aux_accounts(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_account_type ON core_finance_aux_accounts(aux_type)",
        "CREATE INDEX IF NOT EXISTS idx_aux_account_parent_id ON core_finance_aux_accounts(parent_id)",
        "CREATE TABLE IF NOT EXISTS core_finance_aux_balances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            aux_type aux_type NOT NULL,
            aux_id UUID NOT NULL,
            period VARCHAR(6) NOT NULL,
            debit_balance NUMERIC(18,4) NOT NULL DEFAULT 0,
            credit_balance NUMERIC(18,4) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_aux_balance UNIQUE (tenant_id, account_id, aux_type, aux_id, period)
        )",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_tenant_id ON core_finance_aux_balances(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_account_id ON core_finance_aux_balances(account_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_aux ON core_finance_aux_balances(aux_type, aux_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_period ON core_finance_aux_balances(period)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

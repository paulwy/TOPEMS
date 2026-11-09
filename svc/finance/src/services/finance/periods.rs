use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use std::fmt;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared_core::error::TopemsError;

use super::company::resolve_tenant_company;
use super::voucher::parse_period_str;
use super::FinanceService;

/// 结转分录（一笔凭证内的一行），借/贷单边。
struct ClosingEntry {
    account_id: Uuid,
    account_code: String,
    account_name: String,
    aux_type: Option<String>,
    aux_id: Option<Uuid>,
    debit: Decimal,
    credit: Decimal,
}

/// 某科目（含辅助核算维度）在结转期间内的净额，`balance` 口径统一为「贷 - 借」。
struct ProfitBalanceRow {
    account_id: Uuid,
    account_code: String,
    account_name: String,
    account_type: String,
    aux_type: Option<String>,
    aux_id: Option<Uuid>,
    balance: Decimal,
}

/// 损益结转计划：分录 + 收入/费用合计，供月结与年结复用。
struct ProfitClosePlan {
    entries: Vec<ClosingEntry>,
    total_income: Decimal,
    total_expense: Decimal,
    income_accounts: i32,
    expense_accounts: i32,
}

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

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
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

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
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
                only_own_schema_query!("finance", "SELECT status::text FROM finance.core_finance_periods WHERE tenant_id = $1 AND year = $2 AND month < $3 ORDER BY month ASC")
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

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_possible_wrap
    )]
    pub async fn year_end_close(
        &self,
        tenant_id: Uuid,
        year: i32,
        created_by: &str,
        description: Option<String>,
        locale: &str,
    ) -> Result<YearEndCloseResult, TopemsError> {
        let period = format!("{:04}{:02}", year, 12);
        let year_pattern = format!("{:04}%", year);
        let company_id = resolve_tenant_company(&self.db_pool, tenant_id).await?;
        let profit_account = self.resolve_profit_account(tenant_id, locale).await?;

        // 第一步：全年未结转损益（含此前月结遗留净额）结转到 4103 本年利润。
        // 若损益已按月结平，这一步自然没有分录，只做第二步的利润分配结转。
        let plan = self
            .build_profit_close_plan(
                tenant_id,
                company_id,
                &year_pattern,
                &profit_account,
                locale,
            )
            .await?;
        let mut profit_voucher: Option<Voucher> = None;
        let mut profit_ledger_rows = 0_i32;
        if !plan.entries.is_empty() {
            let (v, rows) = self
                .post_closing_voucher(
                    tenant_id,
                    company_id,
                    &period,
                    description.unwrap_or_else(|| format!("{year}年度损益结转")),
                    created_by,
                    &plan.entries,
                )
                .await?;
            profit_voucher = Some(v);
            profit_ledger_rows = rows;
        }

        // 第二步：4103 本年利润结转到 4104 利润分配（年结专属）
        let mut transfer_voucher: Option<Voucher> = None;
        let mut transfer_ledger_rows = 0_i32;
        if profit_account.code.starts_with("4103") {
            let balance = self
                .account_credit_balance(tenant_id, company_id, profit_account.id, &period)
                .await?;
            if balance != Decimal::ZERO {
                let distribution = self
                    .get_account_by_code(tenant_id, "4104", locale)
                    .await
                    .map_err(|_| {
                        TopemsError::ValidationFailed("未找到利润分配科目(4104)".to_string())
                    })?;
                // 本年利润为贷方余额（盈利）时借记 4103，亏损时反向
                let (debit_account, credit_account, amount) = if balance > Decimal::ZERO {
                    (&profit_account, &distribution, balance)
                } else {
                    (&distribution, &profit_account, -balance)
                };
                let transfer_entries = vec![
                    ClosingEntry {
                        account_id: debit_account.id,
                        account_code: debit_account.code.clone(),
                        account_name: debit_account.name.clone(),
                        aux_type: None,
                        aux_id: None,
                        debit: amount,
                        credit: Decimal::ZERO,
                    },
                    ClosingEntry {
                        account_id: credit_account.id,
                        account_code: credit_account.code.clone(),
                        account_name: credit_account.name.clone(),
                        aux_type: None,
                        aux_id: None,
                        debit: Decimal::ZERO,
                        credit: amount,
                    },
                ];
                let (tv, rows) = self
                    .post_closing_voucher(
                        tenant_id,
                        company_id,
                        &period,
                        format!("{year}年度利润分配结转"),
                        created_by,
                        &transfer_entries,
                    )
                    .await?;
                transfer_voucher = Some(tv);
                transfer_ledger_rows = rows;
            }
        }

        if profit_voucher.is_none() && transfer_voucher.is_none() {
            return Err(TopemsError::ValidationFailed(
                "没有可结转的损益数据".to_string(),
            ));
        }

        Ok(YearEndCloseResult {
            year,
            period,
            profit_voucher_id: profit_voucher.as_ref().map(|v| v.id),
            profit_voucher_no: profit_voucher.as_ref().map(|v| v.voucher_no.clone()),
            profit_total_debit: profit_voucher
                .as_ref()
                .map_or(Decimal::ZERO, |v| v.total_debit),
            profit_total_credit: profit_voucher
                .as_ref()
                .map_or(Decimal::ZERO, |v| v.total_credit),
            transfer_voucher_id: transfer_voucher.as_ref().map(|v| v.id),
            transfer_voucher_no: transfer_voucher.as_ref().map(|v| v.voucher_no.clone()),
            transfer_total_debit: transfer_voucher
                .as_ref()
                .map_or(Decimal::ZERO, |v| v.total_debit),
            transfer_total_credit: transfer_voucher
                .as_ref()
                .map_or(Decimal::ZERO, |v| v.total_credit),
            total_income: plan.total_income,
            total_expense: plan.total_expense,
            net_profit: plan.total_income - plan.total_expense,
            income_accounts_closed: plan.income_accounts,
            expense_accounts_closed: plan.expense_accounts,
            ledger_rows: profit_ledger_rows + transfer_ledger_rows,
        })
    }

    /// 损益结转计划：按「科目 + 辅助核算」汇总净额，收入借方/费用贷方，
    /// 另一端统一归集到本年利润，保证凭证借贷恒等。
    async fn build_profit_close_plan(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        period_like: &str,
        profit_account: &Account,
        locale: &str,
    ) -> Result<ProfitClosePlan, TopemsError> {
        let rows = self
            .profit_balances(tenant_id, company_id, period_like, locale)
            .await?;

        let mut entries: Vec<ClosingEntry> = Vec::with_capacity(rows.len() + 1);
        let mut total_income = Decimal::ZERO;
        let mut total_expense = Decimal::ZERO;
        let mut income_accounts = 0_i32;
        let mut expense_accounts = 0_i32;
        let mut pl_debit = Decimal::ZERO;
        let mut pl_credit = Decimal::ZERO;

        for row in &rows {
            if row.account_type == "income" {
                total_income += row.balance;
                income_accounts += 1;
            } else {
                total_expense += -row.balance;
                expense_accounts += 1;
            }
            if row.aux_id.is_some() && row.aux_type.is_none() {
                return Err(TopemsError::ValidationFailed(format!(
                    "科目 {} 存在辅助核算余额但缺少辅助类型，拒绝结转",
                    row.account_code
                )));
            }
            let (debit, credit) = if row.balance > Decimal::ZERO {
                (row.balance, Decimal::ZERO)
            } else {
                (Decimal::ZERO, -row.balance)
            };
            pl_debit += debit;
            pl_credit += credit;
            entries.push(ClosingEntry {
                account_id: row.account_id,
                account_code: row.account_code.clone(),
                account_name: row.account_name.clone(),
                aux_type: row.aux_type.clone(),
                aux_id: row.aux_id,
                debit,
                credit,
            });
        }

        if !entries.is_empty() {
            // 本年利润一侧：贷记损益借方合计、借记损益贷方合计
            entries.push(ClosingEntry {
                account_id: profit_account.id,
                account_code: profit_account.code.clone(),
                account_name: profit_account.name.clone(),
                aux_type: None,
                aux_id: None,
                debit: pl_credit,
                credit: pl_debit,
            });
        }

        Ok(ProfitClosePlan {
            entries,
            total_income,
            total_expense,
            income_accounts,
            expense_accounts,
        })
    }

    async fn resolve_profit_account(
        &self,
        tenant_id: Uuid,
        locale: &str,
    ) -> Result<Account, TopemsError> {
        match self.get_account_by_code(tenant_id, "4103", locale).await {
            Ok(account) => Ok(account),
            Err(_) => self
                .get_account_by_code(tenant_id, "4104", locale)
                .await
                .map_err(|_| {
                    TopemsError::ValidationFailed("未找到本年利润科目(4103或4104)".to_string())
                }),
        }
    }

    /// 期间内损益科目净额（贷 - 借），按科目 + 辅助核算维度分组，跳过净额为零的组合。
    async fn profit_balances(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        period_like: &str,
        locale: &str,
    ) -> Result<Vec<ProfitBalanceRow>, TopemsError> {
        let rows: Vec<(Uuid, String, String, String, Option<String>, Option<Uuid>, Decimal)> =
            sqlx::query_as(only_own_schema_query!(
                "finance",
                "SELECT a.id, a.code,
                        CASE WHEN $4 = 'en' THEN COALESCE(a.name_en, a.name) ELSE a.name END AS name,
                        a.account_type::text AS account_type,
                        ab.aux_type::text AS aux_type,
                        l.aux_id,
                        COALESCE(SUM(l.credit - l.debit), 0) AS balance
                 FROM finance.core_finance_ledger l
                 JOIN finance.core_finance_accounts a ON a.id = l.account_id
                 LEFT JOIN LATERAL (
                     SELECT x.aux_type FROM finance.core_finance_aux_balances x
                     WHERE x.tenant_id = l.tenant_id AND x.company_id = l.company_id
                       AND x.account_id = l.account_id AND x.aux_id = l.aux_id
                       AND x.period LIKE $3
                     LIMIT 1
                 ) ab ON TRUE
                 WHERE l.tenant_id = $1 AND l.company_id = $2 AND l.period LIKE $3
                   AND l.deleted_at IS NULL AND a.account_type::text IN ('income', 'expense')
                 GROUP BY a.id, a.code, name, a.account_type::text, ab.aux_type, l.aux_id
                 HAVING COALESCE(SUM(l.credit - l.debit), 0) <> 0
                 ORDER BY a.code, l.aux_id"
            ))
            .bind(tenant_id)
            .bind(company_id)
            .bind(period_like)
            .bind(locale)
            .fetch_all(&self.db_pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(
                |(
                    account_id,
                    account_code,
                    account_name,
                    account_type,
                    aux_type,
                    aux_id,
                    balance,
                )| {
                    ProfitBalanceRow {
                        account_id,
                        account_code,
                        account_name,
                        account_type,
                        aux_type,
                        aux_id,
                        balance,
                    }
                },
            )
            .collect())
    }

    /// 科目到指定期间为止的贷方净余额（贷 - 借）。
    async fn account_credit_balance(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        account_id: Uuid,
        period: &str,
    ) -> Result<Decimal, TopemsError> {
        let (balance,): (Decimal,) = sqlx::query_as(only_own_schema_query!(
            "finance",
            "SELECT COALESCE(SUM(credit - debit), 0) FROM finance.core_finance_ledger
             WHERE tenant_id = $1 AND company_id = $2 AND account_id = $3
               AND period <= $4 AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(company_id)
        .bind(account_id)
        .bind(period)
        .fetch_one(&self.db_pool)
        .await?;
        Ok(balance)
    }

    /// 结转凭证号：按凭证所属期间（而非当前日期）编号，避免 12 月结转凭证
    /// 在 11 月执行时与本期内另一张结转凭证取得相同编号。
    async fn generate_period_voucher_no(
        &self,
        tenant_id: Uuid,
        period: &str,
    ) -> Result<String, TopemsError> {
        let prefix = format!("记{}", period);
        let count: (i64,) = sqlx::query_as(only_own_schema_query!(
            "finance",
            "SELECT COUNT(*) FROM finance.core_finance_vouchers
             WHERE deleted_at IS NULL AND tenant_id = $1 AND voucher_no LIKE $2"
        ))
        .bind(tenant_id)
        .bind(format!("{}%", prefix))
        .fetch_one(&self.db_pool)
        .await?;
        Ok(format!("{}{:04}", prefix, count.0 + 1))
    }

    /// 结转凭证落库：借贷平衡校验 → 凭证 + 分录 + 总账 + 辅助核算余额，单事务原子化。
    /// 状态直接置为 posted（结转是期末动作，不再走审批），字段口径与普通凭证过账一致。
    async fn post_closing_voucher(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        period: &str,
        description: String,
        created_by: &str,
        entries: &[ClosingEntry],
    ) -> Result<(Voucher, i32), TopemsError> {
        let total_debit: Decimal = entries.iter().map(|e| e.debit).sum();
        let total_credit: Decimal = entries.iter().map(|e| e.credit).sum();
        validate_trial_balance(total_debit, total_credit)
            .map_err(|e| TopemsError::ValidationFailed(format!("结转凭证借贷不平：{}", e)))?;
        if entries.is_empty() || total_debit == Decimal::ZERO {
            return Err(TopemsError::ValidationFailed(
                "没有可结转的损益数据".to_string(),
            ));
        }

        let voucher_no = self.generate_period_voucher_no(tenant_id, period).await?;
        let voucher_date = Utc::now();

        let mut tx = self.db_pool.begin().await?;
        let voucher: Voucher = sqlx::query_as(only_own_schema_query!(
            "finance",
            "INSERT INTO finance.core_finance_vouchers (tenant_id, company_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, source_module)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'posted', $9, $10, $10, $10, 'finance_period_close')
             RETURNING *"
        ))
        .bind(tenant_id)
        .bind(company_id)
        .bind(&voucher_no)
        .bind(voucher_date)
        .bind(period)
        .bind(VoucherType::General)
        .bind(total_debit)
        .bind(total_credit)
        .bind(&description)
        .bind(created_by)
        .fetch_one(&mut *tx)
        .await?;

        for (idx, entry) in entries.iter().enumerate() {
            let line_no = i32::try_from(idx + 1).unwrap_or(i32::MAX);
            sqlx::query(only_own_schema_query!(
                "finance",
                "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, tenant_id, company_id, aux_type, aux_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
            ))
            .bind(voucher.id)
            .bind(line_no)
            .bind(entry.account_id)
            .bind(&entry.account_code)
            .bind(&entry.account_name)
            .bind(&description)
            .bind(entry.debit)
            .bind(entry.credit)
            .bind(tenant_id)
            .bind(company_id)
            .bind(entry.aux_type.as_deref())
            .bind(entry.aux_id)
            .execute(&mut *tx)
            .await?;

            let balance = self
                .calculate_account_balance(&mut *tx, tenant_id, entry.account_id)
                .await?;
            let new_balance = balance + entry.debit - entry.credit;

            sqlx::query(only_own_schema_query!(
                "finance",
                "INSERT INTO finance.core_finance_ledger (tenant_id, company_id, account_id, account_code, account_name, voucher_id, voucher_no, voucher_date, period, description, debit, credit, balance, aux_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"
            ))
            .bind(tenant_id)
            .bind(company_id)
            .bind(entry.account_id)
            .bind(&entry.account_code)
            .bind(&entry.account_name)
            .bind(voucher.id)
            .bind(&voucher_no)
            .bind(voucher_date)
            .bind(period)
            .bind(&description)
            .bind(entry.debit)
            .bind(entry.credit)
            .bind(new_balance)
            .bind(entry.aux_id)
            .execute(&mut *tx)
            .await?;

            if let (Some(aux_type), Some(aux_id)) = (entry.aux_type.as_deref(), entry.aux_id) {
                sqlx::query(only_own_schema_query!(
                    "finance",
                    "INSERT INTO finance.core_finance_aux_balances (tenant_id, company_id, account_id, aux_type, aux_id, period, debit_balance, credit_balance)
                     VALUES ($1, $2, $3, $4::public.aux_type, $5, $6, $7, $8)
                     ON CONFLICT (tenant_id, company_id, account_id, aux_type, aux_id, period)
                     DO UPDATE SET debit_balance = finance.core_finance_aux_balances.debit_balance + EXCLUDED.debit_balance,
                                   credit_balance = finance.core_finance_aux_balances.credit_balance + EXCLUDED.credit_balance,
                                   updated_at = CURRENT_TIMESTAMP"
                ))
                .bind(tenant_id)
                .bind(company_id)
                .bind(entry.account_id)
                .bind(aux_type)
                .bind(aux_id)
                .bind(period)
                .bind(entry.debit)
                .bind(entry.credit)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;
        Ok((voucher, i32::try_from(entries.len()).unwrap_or(i32::MAX)))
    }

    /// 月结：当月损益结转到 4103 本年利润（只结转到本年利润，不做利润分配结转）。
    pub async fn close_income_period(
        &self,
        tenant_id: Uuid,
        period: &str,
        created_by: &str,
        description: Option<String>,
        locale: &str,
    ) -> Result<IncomeCloseResult, TopemsError> {
        let (year, month) = parse_period_str(period)?;
        let period_code = format!("{:04}{:02}", year, month);
        let company_id = resolve_tenant_company(&self.db_pool, tenant_id).await?;
        let profit_account = self.resolve_profit_account(tenant_id, locale).await?;
        let plan = self
            .build_profit_close_plan(tenant_id, company_id, &period_code, &profit_account, locale)
            .await?;
        if plan.entries.is_empty() {
            return Err(TopemsError::ValidationFailed(
                "没有可结转的损益数据".to_string(),
            ));
        }
        let (voucher, ledger_rows) = self
            .post_closing_voucher(
                tenant_id,
                company_id,
                &period_code,
                description.unwrap_or_else(|| format!("{year}年{month}月损益结转")),
                created_by,
                &plan.entries,
            )
            .await?;

        Ok(IncomeCloseResult {
            period: period_code,
            voucher_id: voucher.id,
            voucher_no: voucher.voucher_no,
            total_income: plan.total_income,
            total_expense: plan.total_expense,
            net_profit: plan.total_income - plan.total_expense,
            total_debit: voucher.total_debit,
            total_credit: voucher.total_credit,
            income_accounts: plan.income_accounts,
            expense_accounts: plan.expense_accounts,
            ledger_rows,
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

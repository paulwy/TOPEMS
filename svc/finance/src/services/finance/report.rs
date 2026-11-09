use rust_decimal::Decimal;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared_core::error::TopemsError;

use super::FinanceService;

impl FinanceService {
    pub async fn get_ledger(
        &self,
        tenant_id: Uuid,
        params: LedgerQueryParams,
    ) -> Result<Vec<LedgerEntry>, TopemsError> {
        let mut query = "SELECT id, tenant_id, account_id, account_code, account_name, voucher_id, voucher_no, voucher_date, period, description, debit, credit, balance, created_at FROM finance.core_finance_ledger WHERE ($1::uuid = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)".to_string();

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

        let mut query_builder = sqlx::query_as(sqlx::AssertSqlSafe(query)).bind(tenant_id);
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
            only_own_schema_query!("finance", "SELECT 
                a.id as account_id,
                a.code as account_code,
                a.name as account_name,
                a.account_type,
                COALESCE(SUM(CASE WHEN l.debit > l.credit THEN l.debit - l.credit ELSE 0 END), 0) as debit_balance,
                COALESCE(SUM(CASE WHEN l.credit > l.debit THEN l.credit - l.debit ELSE 0 END), 0) as credit_balance
             FROM finance.core_finance_accounts a
             LEFT JOIN finance.core_finance_ledger l ON a.id = l.account_id AND l.period = $2
             WHERE ($1::uuid = '00000000-0000-0000-0000-000000000000' OR a.tenant_id = $1::uuid)
             GROUP BY a.id, a.code, a.name, a.account_type
             ORDER BY a.code"),
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

    pub(super) async fn get_balance_items(
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
             FROM finance.core_finance_accounts a
             LEFT JOIN finance.core_finance_ledger l ON a.id = l.account_id AND l.period = $3
             WHERE ($1::uuid = '00000000-0000-0000-0000-000000000000' OR a.tenant_id = $1::uuid) AND a.account_type::text = $2
             GROUP BY a.code, a.name
             ORDER BY a.code",
            amount_expr
        );

        let rows = sqlx::query(sqlx::AssertSqlSafe(query))
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

    pub(super) async fn get_income_items(
        &self,
        tenant_id: Uuid,
        period: &str,
        account_type: AccountType,
    ) -> Result<Vec<IncomeItem>, TopemsError> {
        let type_str = account_type.to_string();
        // 损益类科目不能统一取 debit - credit：收入类余额在贷方，费用类余额在借方。
        // 取数方向与科目类别一致，否则利润表收入会整体为负、净利润符号相反。
        let amount_expr = match account_type {
            AccountType::Income => "COALESCE(SUM(l.credit - l.debit), 0)",
            _ => "COALESCE(SUM(l.debit - l.credit), 0)",
        };
        let query = format!(
            "SELECT 
                a.code as account_code,
                a.name as account_name,
                {} as amount
             FROM finance.core_finance_accounts a
             LEFT JOIN finance.core_finance_ledger l ON a.id = l.account_id AND l.period = $3
             WHERE ($1::uuid = '00000000-0000-0000-0000-000000000000' OR a.tenant_id = $1::uuid) AND a.account_type::text = $2
             GROUP BY a.code, a.name
             ORDER BY a.code",
            amount_expr
        );
        let rows = sqlx::query(sqlx::AssertSqlSafe(query))
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

    pub async fn get_cash_flow_statement(
        &self,
        tenant_id: Uuid,
        period: &str,
    ) -> Result<CashFlowStatement, TopemsError> {
        let rows = sqlx::query(only_own_schema_query!(
            "finance",
            r#"
            SELECT
                a.code as account_code,
                a.name as account_name,
                COALESCE(SUM(l.debit), 0) as total_debit,
                COALESCE(SUM(l.credit), 0) as total_credit
            FROM finance.core_finance_accounts a
            LEFT JOIN finance.core_finance_ledger l ON a.id = l.account_id AND l.period = $2
            WHERE ($1::uuid = '00000000-0000-0000-0000-000000000000' OR a.tenant_id = $1::uuid)
              AND a.account_type::text = 'asset'
              AND a.code LIKE '1___'
            GROUP BY a.code, a.name
            ORDER BY a.code
            "#
        ))
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

    /// 科目余额表：期初 + 本期发生 + 本年累计 + 期末。
    ///
    /// 口径：
    /// - 期初 = 最近一期（period <= 报表期）期初余额 + 该期之后、报表期之前的总账发生额；
    /// - 本期 = 报表期当期总账发生额；
    /// - 本年累计 = 同一年度 1 月至报表期的总账发生额；
    /// - 期末 = 期初 + 本期发生额。
    ///
    /// 一致性校验 fail-closed：期初/期末任一侧借贷不平、或期初行未关联科目，
    /// 都返回带差异明细的 `checks`，由接口层转 409，不返回看似正常的空表。
    pub async fn get_account_balance_report(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        period: &str,
    ) -> Result<AccountBalanceReport, TopemsError> {
        let year_start = format!("{}01", &period[..4]);

        let rows = sqlx::query(
            r#"
            WITH base AS (
                SELECT ob.account_id,
                       ob.period AS base_period,
                       (ob.debit_balance - ob.credit_balance) AS base_net
                FROM erp.opening_balances ob
                WHERE ob.tenant_id = $1
                  AND ob.company_id = $2
                  AND ob.deleted_at IS NULL
                  AND ob.account_id IS NOT NULL
                  AND ob.period <= $3
                  AND ob.period = (
                      SELECT max(ob2.period)
                      FROM erp.opening_balances ob2
                      WHERE ob2.tenant_id = ob.tenant_id
                        AND ob2.company_id = ob.company_id
                        AND ob2.account_id = ob.account_id
                        AND ob2.deleted_at IS NULL
                        AND ob2.period <= $3
                  )
            ),
            opening_move AS (
                SELECT l.account_id, SUM(l.debit - l.credit) AS net
                FROM finance.core_finance_ledger l
                LEFT JOIN base b ON b.account_id = l.account_id
                WHERE l.tenant_id = $1
                  AND l.company_id = $2
                  AND l.period < $3
                  AND (b.base_period IS NULL OR l.period > b.base_period)
                GROUP BY l.account_id
            ),
            period_move AS (
                SELECT l.account_id, SUM(l.debit) AS debit, SUM(l.credit) AS credit
                FROM finance.core_finance_ledger l
                WHERE l.tenant_id = $1 AND l.company_id = $2 AND l.period = $3
                GROUP BY l.account_id
            ),
            ytd_move AS (
                SELECT l.account_id, SUM(l.debit) AS debit, SUM(l.credit) AS credit
                FROM finance.core_finance_ledger l
                WHERE l.tenant_id = $1 AND l.company_id = $2
                  AND l.period >= $4 AND l.period <= $3
                GROUP BY l.account_id
            )
            SELECT a.id AS account_id,
                   a.code AS account_code,
                   a.name AS account_name,
                   a.account_type::text AS account_type,
                   COALESCE(b.base_net, 0) + COALESCE(om.net, 0) AS opening_net,
                   COALESCE(pm.debit, 0) AS period_debit,
                   COALESCE(pm.credit, 0) AS period_credit,
                   COALESCE(ym.debit, 0) AS ytd_debit,
                   COALESCE(ym.credit, 0) AS ytd_credit,
                   COALESCE(b.base_net, 0) + COALESCE(om.net, 0)
                       + COALESCE(pm.debit, 0) - COALESCE(pm.credit, 0) AS closing_net
            FROM finance.core_finance_accounts a
            LEFT JOIN base b ON b.account_id = a.id
            LEFT JOIN opening_move om ON om.account_id = a.id
            LEFT JOIN period_move pm ON pm.account_id = a.id
            LEFT JOIN ytd_move ym ON ym.account_id = a.id
            WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
            ORDER BY a.code
            "#,
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(period)
        .bind(&year_start)
        .fetch_all(&self.db_pool)
        .await?;

        let mut items = Vec::with_capacity(rows.len());
        let mut total_opening_debit = Decimal::ZERO;
        let mut total_opening_credit = Decimal::ZERO;
        let mut total_period_debit = Decimal::ZERO;
        let mut total_period_credit = Decimal::ZERO;
        let mut total_closing_debit = Decimal::ZERO;
        let mut total_closing_credit = Decimal::ZERO;

        for row in rows {
            let opening_net: Decimal = row.get("opening_net");
            let period_debit: Decimal = row.get("period_debit");
            let period_credit: Decimal = row.get("period_credit");
            let ytd_debit: Decimal = row.get("ytd_debit");
            let ytd_credit: Decimal = row.get("ytd_credit");
            let closing_net: Decimal = row.get("closing_net");

            let (opening_debit, opening_credit) = split_net(opening_net);
            let (closing_debit, closing_credit) = split_net(closing_net);

            total_opening_debit += opening_debit;
            total_opening_credit += opening_credit;
            total_period_debit += period_debit;
            total_period_credit += period_credit;
            total_closing_debit += closing_debit;
            total_closing_credit += closing_credit;

            items.push(AccountBalanceItem {
                account_id: row.get("account_id"),
                account_code: row.get("account_code"),
                account_name: row.get("account_name"),
                account_type: row.get("account_type"),
                opening_debit,
                opening_credit,
                period_debit,
                period_credit,
                ytd_debit,
                ytd_credit,
                closing_debit,
                closing_credit,
            });
        }

        let mut checks = Vec::new();

        let unlinked: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM erp.opening_balances
               WHERE tenant_id = $1 AND company_id = $2
                 AND deleted_at IS NULL AND account_id IS NULL"#,
        )
        .bind(tenant_id)
        .bind(company_id)
        .fetch_one(&self.db_pool)
        .await?;
        if unlinked > 0 {
            checks.push(BalanceCheckIssue {
                code: "opening_account_unlinked".to_string(),
                message: format!("期初余额有 {unlinked} 行未关联科目，拒绝出表"),
                expected: Decimal::ZERO,
                actual: Decimal::from(unlinked),
                difference: Decimal::from(unlinked),
            });
        }

        let opening_diff = total_opening_debit - total_opening_credit;
        if opening_diff != Decimal::ZERO {
            checks.push(BalanceCheckIssue {
                code: "opening_unbalanced".to_string(),
                message: "期初余额借贷不平".to_string(),
                expected: total_opening_debit,
                actual: total_opening_credit,
                difference: opening_diff,
            });
        }

        let period_diff = total_period_debit - total_period_credit;
        if period_diff != Decimal::ZERO {
            checks.push(BalanceCheckIssue {
                code: "period_unbalanced".to_string(),
                message: "本期发生额借贷不平".to_string(),
                expected: total_period_debit,
                actual: total_period_credit,
                difference: period_diff,
            });
        }

        let closing_diff = total_closing_debit - total_closing_credit;
        if closing_diff != Decimal::ZERO {
            checks.push(BalanceCheckIssue {
                code: "closing_unbalanced".to_string(),
                message: "期末余额借贷不平".to_string(),
                expected: total_closing_debit,
                actual: total_closing_credit,
                difference: closing_diff,
            });
        }

        let balanced = checks.is_empty();

        Ok(AccountBalanceReport {
            company_id,
            period: period.to_string(),
            items: if balanced { items } else { Vec::new() },
            total_opening_debit,
            total_opening_credit,
            total_period_debit,
            total_period_credit,
            total_closing_debit,
            total_closing_credit,
            balanced,
            checks,
        })
    }
}

/// 把借贷净额拆成借贷两列（净额 > 0 记借方，< 0 记贷方）。
fn split_net(net: Decimal) -> (Decimal, Decimal) {
    if net >= Decimal::ZERO {
        (net, Decimal::ZERO)
    } else {
        (Decimal::ZERO, -net)
    }
}

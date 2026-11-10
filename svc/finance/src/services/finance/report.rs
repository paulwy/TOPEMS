use rust_decimal::Decimal;
use sqlx::Row;
use std::collections::BTreeMap;
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
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut query = "SELECT id, tenant_id, account_id, account_code, account_name, voucher_id, voucher_no, voucher_date, period, description, debit, credit, balance, created_at FROM finance.core_finance_ledger WHERE (tenant_id = $1::uuid)".to_string();

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

        let mut scope = self.read_scope().await?;

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

        let entries = query_builder.fetch_all(&mut scope).await?;

        Ok(entries)
    }

    pub async fn get_trial_balance(
        &self,
        tenant_id: Uuid,
        period: &str,
    ) -> Result<Vec<TrialBalance>, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope().await?;

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
             WHERE (a.tenant_id = $1::uuid)
             GROUP BY a.id, a.code, a.name, a.account_type
             ORDER BY a.code"),
        )
        .bind(tenant_id)
        .bind(period)
        .fetch_all(&mut scope)
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
        let tenant_id = super::require_tenant(tenant_id)?;
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
             WHERE (a.tenant_id = $1::uuid) AND a.account_type::text = $2
             GROUP BY a.code, a.name
             ORDER BY a.code",
            amount_expr
        );

        let mut scope = self.read_scope().await?;

        let rows = sqlx::query(sqlx::AssertSqlSafe(query))
            .bind(tenant_id)
            .bind(type_str)
            .bind(period)
            .fetch_all(&mut scope)
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
        let tenant_id = super::require_tenant(tenant_id)?;
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
             WHERE (a.tenant_id = $1::uuid) AND a.account_type::text = $2
             GROUP BY a.code, a.name
             ORDER BY a.code",
            amount_expr
        );
        let mut scope = self.read_scope().await?;

        let rows = sqlx::query(sqlx::AssertSqlSafe(query))
            .bind(tenant_id)
            .bind(type_str)
            .bind(period)
            .fetch_all(&mut scope)
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
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope().await?;

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
            WHERE (a.tenant_id = $1::uuid)
              AND a.account_type::text = 'asset'
              AND a.code LIKE '1___'
            GROUP BY a.code, a.name
            ORDER BY a.code
            "#
        ))
        .bind(tenant_id)
        .bind(period)
        .fetch_all(&mut scope)
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

        let mut scope = self.read_scope().await?;

        let rows = sqlx::query(only_own_schema_query!(
            "finance",
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
            "erp"
        ))
        .bind(tenant_id)
        .bind(company_id)
        .bind(period)
        .bind(&year_start)
        .fetch_all(&mut scope)
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

        let unlinked: i64 = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"SELECT COUNT(*) FROM erp.opening_balances
               WHERE tenant_id = $1 AND company_id = $2
                 AND deleted_at IS NULL AND account_id IS NULL"#,
            "erp"
        ))
        .bind(tenant_id)
        .bind(company_id)
        .fetch_one(&mut scope)
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

        // 未过账凭证只做提示，不计入 items 与各合计。
        let unposted = self
            .get_unposted_info(tenant_id, company_id, period)
            .await?;

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
            unposted,
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

#[derive(Default)]
struct LineAcc {
    line_code: String,
    line_name: String,
    line_level: i16,
    sort_no: i32,
    amount: Decimal,
    include_unclosed_pl: bool,
}

fn accumulate_line(
    map: &mut BTreeMap<(i32, String), LineAcc>,
    line_code: String,
    line_name: String,
    line_level: i16,
    sort_no: i32,
    include_unclosed_pl: bool,
    amount: Decimal,
) {
    let entry = map
        .entry((sort_no, line_code.clone()))
        .or_insert_with(|| LineAcc {
            line_code,
            line_name,
            line_level,
            sort_no,
            amount: Decimal::ZERO,
            include_unclosed_pl,
        });
    entry.amount += amount;
    entry.include_unclosed_pl = entry.include_unclosed_pl || include_unclosed_pl;
}

fn into_line_items(map: BTreeMap<(i32, String), LineAcc>) -> Vec<ReportLineItem> {
    map.into_values()
        .map(|acc| ReportLineItem {
            line_code: acc.line_code,
            line_name: acc.line_name,
            line_level: acc.line_level,
            sort_no: acc.sort_no,
            amount: acc.amount,
        })
        .collect()
}

impl FinanceService {
    /// 映射表驱动的法定报表：资产负债表 + 利润表 + 三道勾稽。
    ///
    /// 科目归类全部来自 `finance.core_finance_report_line_map`：
    /// 租户/公司级 override 优先于全局模板，同级别按最长前缀优先。
    /// 未过账凭证只统计提示，不进表（总账只有过账后才写入）。
    pub async fn get_statutory_reports(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        period: &str,
    ) -> Result<(StatutoryBalanceSheet, StatutoryIncomeStatement), TopemsError> {
        let mut scope = self.read_scope().await?;

        let bs_rows = sqlx::query(only_own_schema_query!(
            "finance",
            r#"
            WITH base AS (
                SELECT ob.account_id, ob.period AS base_period,
                       (ob.debit_balance - ob.credit_balance) AS base_net
                FROM erp.opening_balances ob
                WHERE ob.tenant_id = $1 AND ob.company_id = $2
                  AND ob.deleted_at IS NULL AND ob.account_id IS NOT NULL
                  AND ob.period <= $3
                  AND ob.period = (
                      SELECT max(ob2.period) FROM erp.opening_balances ob2
                      WHERE ob2.tenant_id = ob.tenant_id AND ob2.company_id = ob.company_id
                        AND ob2.account_id = ob.account_id AND ob2.deleted_at IS NULL
                        AND ob2.period <= $3
                  )
            ),
            opening_move AS (
                SELECT l.account_id, SUM(l.debit - l.credit) AS net
                FROM finance.core_finance_ledger l
                LEFT JOIN base b ON b.account_id = l.account_id
                WHERE l.tenant_id = $1 AND l.company_id = $2 AND l.period < $3
                  AND (b.base_period IS NULL OR l.period > b.base_period)
                GROUP BY l.account_id
            ),
            period_move AS (
                SELECT l.account_id, SUM(l.debit - l.credit) AS net
                FROM finance.core_finance_ledger l
                WHERE l.tenant_id = $1 AND l.company_id = $2 AND l.period = $3
                GROUP BY l.account_id
            )
            SELECT a.code AS account_code,
                   a.account_type::text AS account_type,
                   COALESCE(pm.net, 0) AS period_net,
                   COALESCE(b.base_net, 0) + COALESCE(om.net, 0) + COALESCE(pm.net, 0) AS closing_net,
                   m.line_code, m.line_name, m.line_level, m.sort_no,
                   m.direction, m.section, m.include_unclosed_pl
            FROM finance.core_finance_accounts a
            LEFT JOIN base b ON b.account_id = a.id
            LEFT JOIN opening_move om ON om.account_id = a.id
            LEFT JOIN period_move pm ON pm.account_id = a.id
            LEFT JOIN LATERAL (
                SELECT mm.line_code, mm.line_name, mm.line_level, mm.sort_no,
                       mm.direction, mm.section, mm.include_unclosed_pl
                FROM finance.core_finance_report_line_map mm
                WHERE mm.report_type = 'balance_sheet'
                  AND (mm.tenant_id IS NULL OR mm.tenant_id = $1)
                  AND (mm.company_id IS NULL OR mm.company_id = $2)
                  AND mm.section IN ('asset', 'liability', 'equity')
                  AND a.code LIKE mm.match_value
                ORDER BY (mm.tenant_id IS NOT NULL) DESC,
                         (mm.company_id IS NOT NULL) DESC,
                         length(mm.match_value) DESC,
                         mm.sort_no
                LIMIT 1
            ) m ON TRUE
            WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
            "#,
            "erp"
        ))
        .bind(tenant_id)
        .bind(company_id)
        .bind(period)
        .fetch_all(&mut scope)
        .await?;

        let mut asset_map: BTreeMap<(i32, String), LineAcc> = BTreeMap::new();
        let mut liability_map: BTreeMap<(i32, String), LineAcc> = BTreeMap::new();
        let mut equity_map: BTreeMap<(i32, String), LineAcc> = BTreeMap::new();
        let mut unclosed_pl = Decimal::ZERO;
        let mut unclosed_pl_delta = Decimal::ZERO;
        let mut current_year_profit_delta = Decimal::ZERO;
        let mut distribution_profit_delta = Decimal::ZERO;
        let mut equity_delta = Decimal::ZERO;

        for row in &bs_rows {
            let account_code: String = row.get("account_code");
            let account_type: String = row.get("account_type");
            let period_net: Decimal = row.get("period_net");
            let closing_net: Decimal = row.get("closing_net");

            if account_type == "income" || account_type == "expense" {
                unclosed_pl += -closing_net;
                unclosed_pl_delta += -period_net;
            }
            if account_code.starts_with("4103") {
                current_year_profit_delta += -period_net;
            }
            // 年结把 4103 结转到 4104 后，本年利润归零、净利润留在利润分配，
            // 勾稽 2 的「本年利润科目变动」需覆盖 4103 + 4104 才能保持恒等。
            if account_code.starts_with("4104") {
                distribution_profit_delta += -period_net;
            }

            let section: Option<String> = row.try_get("section").unwrap_or(None);
            let Some(section) = section else { continue };
            let direction: String = row.get("direction");
            let amount = if direction == "debit" {
                closing_net
            } else {
                -closing_net
            };
            if section == "equity" {
                equity_delta += -period_net;
            }

            let args = (
                row.get::<String, _>("line_code"),
                row.get::<String, _>("line_name"),
                row.get::<i16, _>("line_level"),
                row.get::<i32, _>("sort_no"),
                row.get::<bool, _>("include_unclosed_pl"),
            );
            let target = match section.as_str() {
                "asset" => &mut asset_map,
                "liability" => &mut liability_map,
                _ => &mut equity_map,
            };
            accumulate_line(target, args.0, args.1, args.2, args.3, args.4, amount);
        }

        // 未结转损益并入「本年利润」行（映射表 include_unclosed_pl 标记）。
        for map in [&mut asset_map, &mut liability_map, &mut equity_map] {
            for acc in map.values_mut() {
                if acc.include_unclosed_pl {
                    acc.amount += unclosed_pl;
                }
            }
        }

        let assets = into_line_items(asset_map);
        let liabilities = into_line_items(liability_map);
        let equity = into_line_items(equity_map);
        let total_assets: Decimal = assets.iter().map(|i| i.amount).sum();
        let total_liabilities: Decimal = liabilities.iter().map(|i| i.amount).sum();
        let total_equity: Decimal = equity.iter().map(|i| i.amount).sum();

        let is_rows = sqlx::query(
            r#"
            WITH period_move AS (
                SELECT l.account_id, SUM(l.debit - l.credit) AS net
                FROM finance.core_finance_ledger l
                WHERE l.tenant_id = $1 AND l.company_id = $2 AND l.period = $3
                  AND NOT EXISTS (
                      SELECT 1 FROM finance.core_finance_vouchers v
                      WHERE v.id = l.voucher_id AND v.source_module = 'finance_period_close'
                  )
                GROUP BY l.account_id
            )
            SELECT a.code AS account_code,
                   COALESCE(pm.net, 0) AS period_net,
                   m.line_code, m.line_name, m.line_level, m.sort_no, m.direction, m.section
            FROM finance.core_finance_accounts a
            LEFT JOIN period_move pm ON pm.account_id = a.id
            JOIN LATERAL (
                SELECT mm.line_code, mm.line_name, mm.line_level, mm.sort_no, mm.direction, mm.section
                FROM finance.core_finance_report_line_map mm
                WHERE mm.report_type = 'income_statement'
                  AND (mm.tenant_id IS NULL OR mm.tenant_id = $1)
                  AND (mm.company_id IS NULL OR mm.company_id = $2)
                  AND mm.section IN ('income', 'expense')
                  AND a.code LIKE mm.match_value
                ORDER BY (mm.tenant_id IS NOT NULL) DESC,
                         (mm.company_id IS NOT NULL) DESC,
                         length(mm.match_value) DESC,
                         mm.sort_no
                LIMIT 1
            ) m ON TRUE
            WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(period)
        .fetch_all(&mut scope)
        .await?;

        let mut revenue_map: BTreeMap<(i32, String), LineAcc> = BTreeMap::new();
        let mut expense_map: BTreeMap<(i32, String), LineAcc> = BTreeMap::new();
        for row in &is_rows {
            let period_net: Decimal = row.get("period_net");
            let direction: String = row.get("direction");
            let section: String = row.get("section");
            let amount = if direction == "debit" {
                period_net
            } else {
                -period_net
            };
            let target = if section == "income" {
                &mut revenue_map
            } else {
                &mut expense_map
            };
            accumulate_line(
                target,
                row.get("line_code"),
                row.get("line_name"),
                row.get("line_level"),
                row.get("sort_no"),
                false,
                amount,
            );
        }

        let revenues = into_line_items(revenue_map);
        let expenses = into_line_items(expense_map);
        let total_revenue: Decimal = revenues.iter().map(|i| i.amount).sum();
        let total_expense: Decimal = expenses.iter().map(|i| i.amount).sum();
        let net_income = total_revenue - total_expense;

        let unposted = self
            .get_unposted_info(tenant_id, company_id, period)
            .await?;

        let mut checks = Vec::new();
        let bs_diff = total_assets - (total_liabilities + total_equity);
        if bs_diff != Decimal::ZERO {
            checks.push(BalanceCheckIssue {
                code: "balance_sheet_unbalanced".to_string(),
                message: "资产合计 != 负债合计 + 所有者权益合计".to_string(),
                expected: total_assets,
                actual: total_liabilities + total_equity,
                difference: bs_diff,
            });
        }

        let profit_delta =
            current_year_profit_delta + distribution_profit_delta + unclosed_pl_delta;
        let profit_diff = net_income - profit_delta;
        if profit_diff != Decimal::ZERO {
            checks.push(BalanceCheckIssue {
                code: "profit_vs_current_year_profit".to_string(),
                message: "净利润 != 本年利润及利润分配变动（含未结转损益）".to_string(),
                expected: net_income,
                actual: profit_delta,
                difference: profit_diff,
            });
        }

        let equity_diff = net_income - (equity_delta + unclosed_pl_delta);
        if equity_diff != Decimal::ZERO {
            checks.push(BalanceCheckIssue {
                code: "profit_vs_equity_change".to_string(),
                message: "净利润 != 所有者权益变动（含未结转损益）".to_string(),
                expected: net_income,
                actual: equity_delta + unclosed_pl_delta,
                difference: equity_diff,
            });
        }

        let balanced = checks.is_empty();
        let checks_for_bs = checks.clone();

        Ok((
            StatutoryBalanceSheet {
                company_id,
                period: period.to_string(),
                assets: if balanced { assets } else { Vec::new() },
                liabilities: if balanced { liabilities } else { Vec::new() },
                equity: if balanced { equity } else { Vec::new() },
                total_assets,
                total_liabilities,
                total_equity,
                unposted: unposted.clone(),
                balanced,
                checks: checks_for_bs,
            },
            StatutoryIncomeStatement {
                company_id,
                period: period.to_string(),
                revenues: if balanced { revenues } else { Vec::new() },
                expenses: if balanced { expenses } else { Vec::new() },
                total_revenue,
                total_expense,
                net_income,
                unposted,
                balanced,
                checks,
            },
        ))
    }

    async fn get_unposted_info(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        period: &str,
    ) -> Result<UnpostedInfo, TopemsError> {
        let mut scope = self.read_scope().await?;

        let row = sqlx::query(
            r#"SELECT COUNT(*) AS cnt, COALESCE(SUM(total_debit), 0) AS amount
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND company_id = $2 AND period = $3
                 AND status IN ('draft', 'submitted', 'approved')"#,
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(period)
        .fetch_one(&mut scope)
        .await?;

        Ok(UnpostedInfo {
            count: row.get("cnt"),
            amount: row.get("amount"),
        })
    }
}

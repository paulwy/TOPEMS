use rust_decimal::Decimal;
use sqlx::Row;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared::error::TopemsError;

use super::FinanceService;

impl FinanceService {
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

    pub(super) async fn get_income_items(
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
}

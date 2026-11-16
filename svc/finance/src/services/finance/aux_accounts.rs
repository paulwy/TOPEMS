use rust_decimal::Decimal;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared_core::error::TopemsError;

use super::FinanceService;

impl FinanceService {
    pub async fn create_aux_account(
        &self,
        tenant_id: Uuid,
        req: CreateAuxiliaryAccountRequest,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<AuxiliaryAccount, TopemsError> {
        let mut scope = self.write_scope(txn).await?;

        let level = if let Some(parent_id) = req.parent_id {
            let parent: (i32,) = sqlx::query_as(only_own_schema_query!(
                "finance",
                "SELECT level FROM finance.core_finance_aux_accounts WHERE id = $1"
            ))
            .bind(parent_id)
            .fetch_one(&mut scope)
            .await?;
            parent.0 + 1
        } else {
            1
        };

        let aux_account = sqlx::query_as(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_aux_accounts (tenant_id, aux_type, code, name, parent_id, level, description)
             VALUES ($1, $2::aux_type, $3, $4, $5, $6, $7)
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(req.aux_type.to_string())
        .bind(req.code)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(level)
        .bind(req.description)
        .fetch_one(&mut scope)
        .await?;

        scope.commit().await?;

        Ok(aux_account)
    }

    pub async fn list_aux_accounts(
        &self,
        tenant_id: Uuid,
        aux_type: Option<AuxType>,
        locale: &str,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Vec<AuxiliaryAccount>, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope(txn).await?;

        let accounts = if let Some(t) = aux_type {
            let type_str = t.to_string();
            sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, tenant_id, aux_type, code, CASE WHEN $3='en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, level, is_enabled, description, created_at, updated_at FROM finance.core_finance_aux_accounts WHERE (tenant_id = $1::uuid) AND aux_type::text = $2 ORDER BY code"),
            )
            .bind(tenant_id)
            .bind(type_str)
            .bind(locale)
            .fetch_all(&mut scope)
            .await?
        } else {
            sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, tenant_id, aux_type, code, CASE WHEN $2='en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, level, is_enabled, description, created_at, updated_at FROM finance.core_finance_aux_accounts WHERE (tenant_id = $1::uuid) ORDER BY aux_type, code"),
            )
            .bind(tenant_id)
            .bind(locale)
            .fetch_all(&mut scope)
            .await?
        };

        Ok(accounts)
    }

    pub async fn get_aux_account(
        &self,
        tenant_id: Uuid,
        aux_id: Uuid,
        locale: &str,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<AuxiliaryAccount, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope(txn).await?;

        let account = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, aux_type, code, CASE WHEN $3='en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, level, is_enabled, description, created_at, updated_at FROM finance.core_finance_aux_accounts WHERE (tenant_id = $1::uuid) AND id = $2"),
        )
        .bind(tenant_id)
        .bind(aux_id)
        .bind(locale)
        .fetch_one(&mut scope)
        .await?;

        Ok(account)
    }

    pub async fn get_aux_ledger(
        &self,
        tenant_id: Uuid,
        query: AuxLedgerQuery,
        locale: &str,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Vec<AuxLedgerEntry>, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let type_str = query.aux_type.to_string();
        let aux_id = query.aux_id;
        let account_id = query.account_id;
        let period = query.period;
        let start_date = query.start_date;
        let end_date = query.end_date;

        let mut scope = self.read_scope(txn).await?;

        let entries = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"
            SELECT
                l.id,
                l.tenant_id,
                l.period,
                l.voucher_no,
                l.voucher_date,
                l.account_code,
                l.account_name,
                la.aux_type,
                la.id as aux_id,
                CASE WHEN $8 = 'en' THEN COALESCE(la.name_en, la.name) ELSE la.name END AS aux_name,
                l.description,
                l.debit,
                l.credit,
                l.balance
            FROM finance.core_finance_ledger l
            JOIN finance.core_finance_aux_accounts la ON la.id = l.aux_id
            WHERE (l.tenant_id = $1::uuid)
              AND la.aux_type::text = $2
              AND ($3::uuid IS NULL OR l.aux_id = $3)
              AND ($4::uuid IS NULL OR l.account_id = $4)
              AND ($5::text IS NULL OR l.period = $5)
              AND ($6::timestamptz IS NULL OR l.voucher_date >= $6)
              AND ($7::timestamptz IS NULL OR l.voucher_date <= $7)
            ORDER BY l.voucher_date, l.voucher_no
            "#
        ))
        .bind(tenant_id)
        .bind(type_str)
        .bind(aux_id)
        .bind(account_id)
        .bind(period)
        .bind(start_date)
        .bind(end_date)
        .bind(locale)
        .fetch_all(&mut scope)
        .await?;

        Ok(entries)
    }

    pub async fn get_aux_balance(
        &self,
        tenant_id: Uuid,
        query: AuxLedgerQuery,
        locale: &str,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Vec<AuxBalanceReport>, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let type_str = query.aux_type.to_string();
        let aux_id = query.aux_id;
        let account_id = query.account_id;
        let period = query.period;

        let mut scope = self.read_scope(txn).await?;

        let rows = sqlx::query(only_own_schema_query!(
            "finance",
            r#"
            SELECT
                la.id as aux_id,
                CASE WHEN $6 = 'en' THEN COALESCE(la.name_en, la.name) ELSE la.name END AS aux_name,
                la.code as aux_code,
                a.id as account_id,
                a.code as account_code,
                CASE WHEN $6 = 'en' THEN COALESCE(a.name_en, a.name) ELSE a.name END AS account_name,
                COALESCE(SUM(l.debit), 0) as total_debit,
                COALESCE(SUM(l.credit), 0) as total_credit
            FROM finance.core_finance_aux_accounts la
            CROSS JOIN finance.core_finance_accounts a
            LEFT JOIN finance.core_finance_ledger l ON l.account_id = a.id AND l.aux_id = la.id
                AND ($4::text IS NULL OR l.period = $4)
            WHERE (la.tenant_id = $1::uuid)
              AND (a.tenant_id = $1::uuid)
              AND la.aux_type::text = $2
              AND ($3::uuid IS NULL OR la.id = $3)
              AND ($5::uuid IS NULL OR a.id = $5)
            GROUP BY la.id, CASE WHEN $6 = 'en' THEN COALESCE(la.name_en, la.name) ELSE la.name END, la.code, a.id, a.code, CASE WHEN $6 = 'en' THEN COALESCE(a.name_en, a.name) ELSE a.name END
            ORDER BY la.code, a.code
            "#
        ))
        .bind(tenant_id)
        .bind(type_str)
        .bind(aux_id)
        .bind(period)
        .bind(account_id)
        .bind(locale)
        .fetch_all(&mut scope)
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
            } else if let Some(report) = acc.get_mut(&aux_id) {
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
}

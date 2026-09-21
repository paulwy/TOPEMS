use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared_core::error::TopemsError;

use super::FinanceService;

impl FinanceService {
    pub async fn create_account(
        &self,
        tenant_id: Uuid,
        req: CreateAccountRequest,
    ) -> Result<Account, TopemsError> {
        let level = if let Some(parent_id) = req.parent_id {
            let parent: (i32,) = sqlx::query_as(only_own_schema_query!(
                "finance",
                "SELECT level FROM finance.core_finance_accounts WHERE id = $1"
            ))
            .bind(parent_id)
            .fetch_one(&self.db_pool)
            .await?;
            parent.0 + 1
        } else {
            1
        };

        let account = sqlx::query_as(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_accounts (tenant_id, code, name, parent_id, account_type, level, currency, description, name_en)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(req.code)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(req.account_type.unwrap_or(AccountType::Asset))
        .bind(level)
        .bind(req.currency)
        .bind(req.description)
        .bind(req.name_en)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(account)
    }

    pub async fn get_account(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        locale: &str,
    ) -> Result<Account, TopemsError> {
        let account =
            sqlx::query_as(only_own_schema_query!("finance", "SELECT id, tenant_id, code, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM finance.core_finance_accounts WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1) AND id = $2"))
                .bind(tenant_id)
                .bind(account_id)
                .bind(locale)
                .fetch_one(&self.db_pool)
                .await?;

        Ok(account)
    }

    pub async fn get_account_by_code(
        &self,
        tenant_id: Uuid,
        code: &str,
        locale: &str,
    ) -> Result<Account, TopemsError> {
        let account = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, code, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM finance.core_finance_accounts WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1) AND code = $2"),
        )
        .bind(tenant_id)
        .bind(code)
        .bind(locale)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(account)
    }

    pub async fn list_accounts(&self, tenant_id: Uuid, locale: &str) -> Result<Vec<Account>, TopemsError> {
        let accounts = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, code, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM finance.core_finance_accounts WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1) ORDER BY code"),
        )
        .bind(tenant_id)
        .bind(locale)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(accounts)
    }
}

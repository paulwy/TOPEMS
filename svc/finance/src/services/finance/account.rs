use uuid::Uuid;

use super::super::super::models::*;
use topems_shared::error::TopemsError;

use super::FinanceService;

impl FinanceService {
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
        .bind(req.account_type.unwrap_or(AccountType::Asset))
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
            sqlx::query_as("SELECT id, tenant_id, code, name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM core_finance_accounts WHERE tenant_id = $1 AND id = $2")
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
            "SELECT id, tenant_id, code, name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM core_finance_accounts WHERE tenant_id = $1 AND code = $2",
        )
        .bind(tenant_id)
        .bind(code)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(account)
    }

    pub async fn list_accounts(&self, tenant_id: Uuid) -> Result<Vec<Account>, TopemsError> {
        let accounts = sqlx::query_as(
            "SELECT id, tenant_id, code, name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM core_finance_accounts WHERE tenant_id = $1 ORDER BY code",
        )
        .bind(tenant_id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(accounts)
    }
}

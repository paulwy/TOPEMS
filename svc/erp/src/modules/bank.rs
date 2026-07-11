#![allow(dead_code)]

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::{log_audit_event, AuditEventParams};
use topems_shared::{
    api_error, ApiResponse, DataMasking, EncryptionResult, FieldEncryptionService,
    PaginatedResponse,
};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BankAccount {
    pub id: Uuid,
    pub company_id: Uuid,
    pub bank_name: String,
    pub branch_name: Option<String>,
    pub account_number: String,
    pub account_name: String,
    pub account_type: String,
    pub currency: String,
    pub tax_registration_number: Option<String>,
    pub opening_date: DateTime<Utc>,
    pub balance: f64,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl BankAccount {
    pub fn encrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        self.account_number = service.encrypt_to_string(&self.account_number)?;
        if let Some(tax) = &self.tax_registration_number {
            self.tax_registration_number = Some(service.encrypt_to_string(tax)?);
        }
        Ok(())
    }

    pub fn decrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        if self.account_number.starts_with('{') {
            self.account_number = service.decrypt_string(&self.account_number)?;
        }
        if let Some(tax) = &self.tax_registration_number {
            if tax.starts_with('{') {
                self.tax_registration_number = Some(service.decrypt_string(tax)?);
            }
        }
        Ok(())
    }

    pub fn mask_sensitive_fields(&mut self) {
        self.account_number = DataMasking::bank_card(&self.account_number);
        if let Some(tax) = &self.tax_registration_number {
            self.tax_registration_number = Some(DataMasking::id_card(tax));
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateBankAccountRequest {
    pub company_id: Uuid,
    pub bank_name: String,
    pub branch_name: Option<String>,
    pub account_number: String,
    pub account_name: String,
    pub account_type: String,
    pub currency: String,
    pub tax_registration_number: Option<String>,
    pub opening_date: DateTime<Utc>,
    pub initial_balance: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateBankAccountRequest {
    pub bank_name: Option<String>,
    pub branch_name: Option<String>,
    pub account_name: Option<String>,
    pub account_type: Option<String>,
    pub tax_registration_number: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, sqlx::FromRow)]
pub struct BankTransaction {
    pub id: Uuid,
    pub bank_account_id: Uuid,
    pub transaction_type: String,
    pub amount: f64,
    pub balance_before: f64,
    pub balance_after: f64,
    pub summary: Option<String>,
    pub reference_number: Option<String>,
    pub transaction_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateBankTransactionRequest {
    pub bank_account_id: Uuid,
    pub transaction_type: String,
    pub amount: f64,
    pub summary: Option<String>,
    pub reference_number: Option<String>,
    pub transaction_date: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct BankAccountParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub company_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BankTransactionParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub bank_account_id: Option<String>,
    pub transaction_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/erp/bank-accounts",
            get(list_bank_accounts).post(create_bank_account),
        )
        .route(
            "/api/erp/bank-accounts/{id}",
            get(get_bank_account)
                .put(update_bank_account)
                .delete(delete_bank_account),
        )
        .route(
            "/api/erp/bank-transactions",
            get(list_bank_transactions).post(create_bank_transaction),
        )
        .route("/api/erp/bank-transactions/{id}", get(get_bank_transaction))
}

pub async fn list_bank_accounts(
    State(state): State<ApiState>,
    Query(params): Query<BankAccountParams>,
) -> Json<ApiResponse<PaginatedResponse<BankAccount>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, BankAccount>(
        r#"
        SELECT id, company_id, bank_name, branch_name, account_number, account_name, 
               account_type, currency, tax_registration_number, opening_date, balance, status, created_at, updated_at
        FROM bank_accounts
        WHERE ($1::text IS NULL OR bank_name ILIKE $1 OR account_number ILIKE $1 OR account_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR company_id = $3)
        ORDER BY bank_name ASC, account_number ASC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&params.status)
    .bind(params.company_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()))
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(mut accounts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM bank_accounts
                WHERE ($1::text IS NULL OR bank_name ILIKE $1 OR account_number ILIKE $1 OR account_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR company_id = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&params.status)
            .bind(params.company_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()))
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            for account in accounts.iter_mut() {
                let _ = account.decrypt_fields(&state.encryption);
                account.mask_sensitive_fields();
            }

            Json(ApiResponse::success(
                PaginatedResponse::new(accounts, total, page, page_size),
                "获取银行账户列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取银行账户列表失败: {}", e);
            Json(api_error(500, "获取银行账户列表失败"))
        }
    }
}

pub async fn create_bank_account(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateBankAccountRequest>,
) -> Json<ApiResponse<BankAccount>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let status = "active".to_string();

    let encrypted_account_number = state
        .encryption
        .encrypt_to_string(&req.account_number)
        .unwrap_or_else(|_| req.account_number.clone());
    let encrypted_tax_number = req
        .tax_registration_number
        .as_ref()
        .and_then(|tax| state.encryption.encrypt_to_string(tax).ok());

    let result = sqlx::query_as::<_, BankAccount>(
        r#"
        INSERT INTO bank_accounts (id, company_id, bank_name, branch_name, account_number, 
               account_name, account_type, currency, tax_registration_number, opening_date, balance, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, company_id, bank_name, branch_name, account_number, account_name, 
                  account_type, currency, tax_registration_number, opening_date, balance, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.company_id)
    .bind(&req.bank_name)
    .bind(&req.branch_name)
    .bind(&encrypted_account_number)
    .bind(&req.account_name)
    .bind(&req.account_type)
    .bind(&req.currency)
    .bind(&encrypted_tax_number)
    .bind(req.opening_date)
    .bind(req.initial_balance)
    .bind(&status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(account) => {
            let mut account = account.clone();
            let _ = account.decrypt_fields(&state.encryption);
            let response_data = serde_json::to_value(&account).ok();
            (
                Json(ApiResponse::success(account, "银行账户创建成功")),
                "success".to_string(),
                None,
                response_data,
            )
        }
        Err(e) => {
            tracing::error!("创建银行账户失败: {}", e);
            (
                Json(api_error(500, "银行账户创建失败")),
                "error".to_string(),
                Some(e.to_string()),
                None,
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "bank_account".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

pub async fn get_bank_account(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BankAccount>> {
    let result = sqlx::query_as::<_, BankAccount>(
        r#"
        SELECT id, company_id, bank_name, branch_name, account_number, account_name, 
               account_type, currency, tax_registration_number, opening_date, balance, status, created_at, updated_at
        FROM bank_accounts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(mut account)) => {
            let _ = account.decrypt_fields(&state.encryption);
            Json(ApiResponse::success(account, "获取银行账户成功"))
        }
        Ok(None) => Json(api_error(404, "银行账户不存在")),
        Err(e) => {
            tracing::error!("获取银行账户失败: {}", e);
            Json(api_error(500, "获取银行账户失败"))
        }
    }
}

pub async fn update_bank_account(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateBankAccountRequest>,
) -> Json<ApiResponse<BankAccount>> {
    let existing = sqlx::query_as::<_, BankAccount>(
        "SELECT id, company_id, bank_name, branch_name, account_number, account_name, 
                account_type, currency, tax_registration_number, opening_date, balance, status, created_at, updated_at FROM bank_accounts WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let mut existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "银行账户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询银行账户失败: {}", e))),
    };

    let _ = existing.decrypt_fields(&state.encryption);

    let request_data = serde_json::to_value(&req).ok();

    let bank_name = req.bank_name.unwrap_or(existing.bank_name);
    let branch_name = req.branch_name.or(existing.branch_name);
    let account_name = req.account_name.unwrap_or(existing.account_name);
    let account_type = req.account_type.unwrap_or(existing.account_type);
    let tax_registration_number = req
        .tax_registration_number
        .or(existing.tax_registration_number);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let encrypted_tax_number = tax_registration_number
        .as_ref()
        .and_then(|tax| state.encryption.encrypt_to_string(tax).ok());

    let result = sqlx::query_as::<_, BankAccount>(
        r#"
        UPDATE bank_accounts SET
            bank_name = $2, branch_name = $3, account_name = $4, account_type = $5, 
            tax_registration_number = $6, status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, company_id, bank_name, branch_name, account_number, account_name, 
                  account_type, currency, tax_registration_number, opening_date, balance, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&bank_name)
    .bind(&branch_name)
    .bind(&account_name)
    .bind(&account_type)
    .bind(&encrypted_tax_number)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(account) => {
            let mut account = account.clone();
            let _ = account.decrypt_fields(&state.encryption);
            let response_data = serde_json::to_value(&account).ok();
            (
                Json(ApiResponse::success(account, "银行账户更新成功")),
                "success".to_string(),
                None,
                response_data,
            )
        }
        Err(e) => {
            tracing::error!("更新银行账户失败: {}", e);
            (
                Json(api_error(500, "银行账户更新失败")),
                "error".to_string(),
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "bank_account".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

pub async fn delete_bank_account(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM bank_accounts WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "银行账户删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "银行账户不存在")),
            "error".to_string(),
            Some("银行账户不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除银行账户失败: {}", e);
            (
                Json(api_error(500, "银行账户删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "bank_account".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

pub async fn list_bank_transactions(
    State(state): State<ApiState>,
    Query(params): Query<BankTransactionParams>,
) -> Json<ApiResponse<PaginatedResponse<BankTransaction>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, BankTransaction>(
        r#"
        SELECT id, bank_account_id, transaction_type, amount, balance_before, balance_after, 
               summary, reference_number, transaction_date, created_at
        FROM bank_transactions
        WHERE ($1::uuid IS NULL OR bank_account_id = $1)
          AND ($2::text IS NULL OR transaction_type = $2)
          AND ($3::text IS NULL OR transaction_date >= $3::timestamp)
          AND ($4::text IS NULL OR transaction_date <= $4::timestamp)
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(
        params
            .bank_account_id
            .as_ref()
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(&params.transaction_type)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(transactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM bank_transactions
                WHERE ($1::uuid IS NULL OR bank_account_id = $1)
                  AND ($2::text IS NULL OR transaction_type = $2)
                  AND ($3::text IS NULL OR transaction_date >= $3::timestamp)
                  AND ($4::text IS NULL OR transaction_date <= $4::timestamp)
                "#,
            )
            .bind(
                params
                    .bank_account_id
                    .as_ref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(&params.transaction_type)
            .bind(&params.start_date)
            .bind(&params.end_date)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(transactions, total, page, page_size),
                "获取银行交易记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取银行交易记录失败: {}", e);
            Json(api_error(500, "获取银行交易记录失败"))
        }
    }
}

pub async fn create_bank_transaction(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateBankTransactionRequest>,
) -> Json<ApiResponse<BankTransaction>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let account = sqlx::query_as::<_, BankAccount>(
        "SELECT balance FROM bank_accounts WHERE id = $1 AND status = 'active'",
    )
    .bind(req.bank_account_id)
    .fetch_optional(&state.db)
    .await;

    let account = match account {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "银行账户不存在或已禁用")),
        Err(e) => return Json(api_error(500, &format!("查询银行账户失败: {}", e))),
    };

    let balance_before = account.balance;
    let balance_after = match req.transaction_type.as_str() {
        "deposit" => balance_before + req.amount,
        "withdrawal" => balance_before - req.amount,
        "transfer_in" => balance_before + req.amount,
        "transfer_out" => balance_before - req.amount,
        _ => balance_before,
    };

    let transaction = sqlx::query_as::<_, BankTransaction>(
        r#"
        INSERT INTO bank_transactions (id, bank_account_id, transaction_type, amount, 
               balance_before, balance_after, summary, reference_number, transaction_date, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, bank_account_id, transaction_type, amount, balance_before, balance_after, 
                  summary, reference_number, transaction_date, created_at
        "#,
    )
    .bind(id)
    .bind(req.bank_account_id)
    .bind(&req.transaction_type)
    .bind(req.amount)
    .bind(balance_before)
    .bind(balance_after)
    .bind(&req.summary)
    .bind(&req.reference_number)
    .bind(req.transaction_date)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &transaction {
        Ok(t) => {
            let _ =
                sqlx::query("UPDATE bank_accounts SET balance = $1, updated_at = $2 WHERE id = $3")
                    .bind(balance_after)
                    .bind(now)
                    .bind(req.bank_account_id)
                    .execute(&state.db)
                    .await;

            (
                Json(ApiResponse::success(t.clone(), "银行交易记录创建成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建银行交易记录失败: {}", e);
            (
                Json(api_error(500, "银行交易记录创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(t) = &transaction {
        serde_json::to_value(t).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "bank_transaction".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

pub async fn get_bank_transaction(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BankTransaction>> {
    let result = sqlx::query_as::<_, BankTransaction>(
        r#"
        SELECT id, bank_account_id, transaction_type, amount, balance_before, balance_after, 
               summary, reference_number, transaction_date, created_at
        FROM bank_transactions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(transaction)) => Json(ApiResponse::success(transaction, "获取银行交易记录成功")),
        Ok(None) => Json(api_error(404, "银行交易记录不存在")),
        Err(e) => {
            tracing::error!("获取银行交易记录失败: {}", e);
            Json(api_error(500, "获取银行交易记录失败"))
        }
    }
}

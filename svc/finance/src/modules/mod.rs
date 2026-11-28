// 2026-08-07: 部分报表和模型 struct 仅 serde 使用，保留 crate 级 allow
#![allow(dead_code)]
pub mod accounting_subjects;
pub mod ap_payment_status;
pub mod audit_v52;
pub mod bootstrap;
pub mod budget_status;
pub mod collection_status;
pub mod compliance_v51;
pub mod cqrs_routes;
pub mod currencies;
pub mod decision_v60;
pub mod event_routes;
pub mod expense_status;
pub mod finance_snapshot_status;
pub mod financial_report_status;
pub mod financial_reports;
pub mod forecast_v53;
pub mod forecasting;
pub mod operational;
pub mod payment_item_write_off_status;
pub mod payment_workflow_status;
pub mod receivable_payable_status;
pub mod reconcile_orders;
pub mod reconcile_status;
pub mod reconciliation;
pub mod report_center;
pub mod reports_v57;
pub mod risk_v54;
pub mod risk_v59;
pub mod sales_invoice;
pub mod settlement_center;
pub mod settlement_center_status;
pub mod settlement_v55;
pub mod tax_v56;
pub mod treasury_v58;
pub mod voucher_template;
pub mod voucher_template_entries;

use axum::{
    extract::{Json, Multipart, Path, Query, State},
    http::HeaderMap,
    response::IntoResponse,
    Extension, Router,
};
use chrono::{DateTime, Datelike, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tokio;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::models::*;
use crate::modules::expense_status::{
    normalize as normalize_expense_status, ExpenseApprovalStatus,
};
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared_core::{response::ApiResponse, TopemsError};

use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::locale::Locale;
use topems_shared_event::event::{
    commit_retry, EventType, PaymentMadePayload, PaymentReceivedPayload,
};

/// 期间解析：兼容 `YYYYMM` 与旧格式 `YYYY-MM`
fn parse_period_ym(period: &str) -> Option<(i32, i32)> {
    let bytes = period.as_bytes();
    let (year_part, month_part) = if bytes.len() == 6 {
        (period.get(0..4)?, period.get(4..6)?)
    } else if bytes.len() == 7 && bytes[4] == b'-' {
        (period.get(0..4)?, period.get(5..7)?)
    } else {
        return None;
    };
    if !year_part.bytes().all(|b| b.is_ascii_digit())
        || !month_part.bytes().all(|b| b.is_ascii_digit())
    {
        return None;
    }
    let year: i32 = year_part.parse().ok()?;
    let month: i32 = month_part.parse().ok()?;
    if !(1..=12).contains(&month) || !(2000..=2100).contains(&year) {
        return None;
    }
    Some((year, month))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct AccountQueryParams {
    parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, IntoParams, ToSchema)]
pub struct VoucherQueryParams {
    status: Option<String>,
    period: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct LedgerQueryParams {
    account_id: Option<Uuid>,
    account_code: Option<String>,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
    period: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct AccountBalanceQueryParams {
    account_ids: Option<Vec<Uuid>>,
    period: String,
    company_id: Option<String>,
    department_id: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
pub struct AuxQueryParams {
    pub aux_type: String,
    pub aux_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub period: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

async fn count_table_with_tenant(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    table: &str,
    _tenant_id: Option<Uuid>,
) -> i64 {
    // 复用请求事务：租户/系统通道由 tenant_middleware 的 GUC 决定（超管未选租户在中间件被拦 400）
    let Ok(mut scope) = db.scope_with(txn).await else {
        return 0;
    };
    let result = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM {}",
        table
    )))
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn count_table_with_tenant_and_status(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    table: &str,
    _tenant_id: Option<Uuid>,
    status: &str,
) -> i64 {
    // 复用请求事务：租户/系统通道由 tenant_middleware 的 GUC 决定（超管未选租户在中间件被拦 400）
    let Ok(mut scope) = db.scope_with(txn).await else {
        return 0;
    };
    let result = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM {} WHERE status = $1",
        table
    )))
    .bind(status)
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn sum_table_with_tenant(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    table: &str,
    _tenant_id: Option<Uuid>,
) -> i64 {
    // 复用请求事务：租户/系统通道由 tenant_middleware 的 GUC 决定（超管未选租户在中间件被拦 400）
    let Ok(mut scope) = db.scope_with(txn).await else {
        return 0;
    };
    let result = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(SUM(amount), 0) FROM {}",
        table
    )))
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn sum_overdue_with_tenant(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    table: &str,
    _tenant_id: Option<Uuid>,
) -> i64 {
    // 复用请求事务：租户/系统通道由 tenant_middleware 的 GUC 决定（超管未选租户在中间件被拦 400）
    let Ok(mut scope) = db.scope_with(txn).await else {
        return 0;
    };
    let result = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(SUM(amount), 0) FROM {} WHERE due_date < NOW() AND status = 'unpaid'",
        table
    )))
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(v) => v,
        Err(_) => 0,
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:account:create"])),
    path = "/accounts",
    tag = "Accounting",
    request_body = CreateAccountRequest,
    responses(
        (status = 200, description = "创建会计科目成功", body = ApiResponse<Account>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<CreateAccountRequest>,
) -> ApiResponse<Account> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.create_account(tenant_id, req, txn).await {
        Ok(account) => ApiResponse::success(account, "创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/accounts/{account_id}",
    tag = "Auto-Backfill",
    params(
        ("account_id" = String, Path, description = "account_id"),
    ),
    responses((status = 200, description = "get /api/finance/accounts/{account_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(account_id): Path<Uuid>,
    headers: HeaderMap,
) -> ApiResponse<Account> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .get_account(tenant_id, account_id, locale, txn)
        .await
    {
        Ok(account) => ApiResponse::success(account, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/accounts/code/{code}",
    tag = "Auto-Backfill",
    params(
        ("code" = String, Path, description = "code"),
    ),
    responses((status = 200, description = "get /api/finance/accounts/code/{code}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_account_by_code(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(code): Path<String>,
    headers: HeaderMap,
) -> ApiResponse<Account> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .get_account_by_code(tenant_id, &code, locale, txn)
        .await
    {
        Ok(account) => ApiResponse::success(account, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/accounts/balances",
    tag = "Accounting",
    responses(
        (status = 200, description = "获取科目余额成功", body = ApiResponse<Vec<TrialBalance>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_account_balances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<AccountBalanceQueryParams>,
) -> ApiResponse<Vec<TrialBalance>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .get_trial_balance(tenant_id, &params.period, txn)
        .await
    {
        Ok(balances) => {
            let filtered = if let Some(account_ids) = params.account_ids {
                balances
                    .into_iter()
                    .filter(|b| account_ids.contains(&b.account_id))
                    .collect()
            } else {
                balances
            };
            ApiResponse::success(filtered, "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/accounts",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/accounts"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(_params): Query<AccountQueryParams>,
    headers: HeaderMap,
) -> ApiResponse<Vec<Account>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match service.list_accounts(tenant_id, locale, txn).await {
        Ok(accounts) => ApiResponse::success(accounts, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/vouchers"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    headers: HeaderMap,
    Json(req): Json<CreateVoucherRequest>,
) -> ApiResponse<VoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .create_voucher(tenant_id, req, &created_by, locale, txn)
        .await
    {
        Ok(voucher) => ApiResponse::success(voucher, "创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "get /api/finance/vouchers/{voucher_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<VoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_voucher(tenant_id, voucher_id, txn).await {
        Ok(voucher) => ApiResponse::success(voucher, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/vouchers",
    tag = "Voucher",
    params(VoucherQueryParams),
    responses(
        (status = 200, description = "获取凭证列表成功", body = ApiResponse<Vec<Voucher>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<VoucherQueryParams>,
) -> ApiResponse<Vec<Voucher>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let status = params.status.map(|s| match s.as_str() {
        "draft" => VoucherStatus::Draft,
        "submitted" => VoucherStatus::Submitted,
        "approved" => VoucherStatus::Approved,
        "posted" => VoucherStatus::Posted,
        "rejected" => VoucherStatus::Rejected,
        "cancelled" => VoucherStatus::Cancelled,
        _ => VoucherStatus::Draft,
    });

    match service
        .list_vouchers(tenant_id, status, params.period, txn)
        .await
    {
        Ok(vouchers) => ApiResponse::success(vouchers, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/submit",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "post /api/finance/vouchers/{voucher_id}/submit"), (status = 500, description = "服务内部错误")),
)]
pub async fn submit_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<Voucher> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.submit_voucher(tenant_id, voucher_id, txn).await {
        Ok(voucher) => ApiResponse::success(voucher, "提交成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/approve",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "post /api/finance/vouchers/{voucher_id}/approve"), (status = 500, description = "服务内部错误")),
)]
pub async fn approve_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<Voucher> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let approved_by = claims.username.clone();
    match service
        .approve_voucher(tenant_id, voucher_id, &approved_by, txn)
        .await
    {
        Ok(voucher) => ApiResponse::success(voucher, "审批成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/post",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "post /api/finance/vouchers/{voucher_id}/post"), (status = 500, description = "服务内部错误")),
)]
pub async fn post_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<Voucher> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let posted_by = claims.username.clone();
    match service
        .post_voucher(tenant_id, voucher_id, &posted_by, txn)
        .await
    {
        Ok(voucher) => ApiResponse::success(voucher, "过账成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// V39.0 Phase 7: 更新凭证
#[utoipa::path(
    security(("BearerAuth" = [])),
    put,
    path = "/api/finance/vouchers/{voucher_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:voucher:update"])),
)]
async fn update_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(voucher_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateVoucherRequest>,
) -> ApiResponse<VoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let updated_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .update_voucher(tenant_id, voucher_id, req, &updated_by, locale, txn)
        .await
    {
        Ok(voucher) => ApiResponse::success(voucher, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// V39.0 Phase 7: 删除凭证
#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "delete /api/finance/vouchers/{voucher_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.delete_voucher(tenant_id, voucher_id, txn).await {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// V39.0 Phase 7: 反过账凭证
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/unpost",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "post /api/finance/vouchers/{voucher_id}/unpost"), (status = 500, description = "服务内部错误")),
)]
pub async fn unpost_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<Voucher> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.unpost_voucher(tenant_id, voucher_id, txn).await {
        Ok(voucher) => ApiResponse::success(voucher, "反过账成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/ledger",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/ledger"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_ledger(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<LedgerQueryParams>,
) -> ApiResponse<Vec<LedgerEntry>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let ledger_params = crate::models::LedgerQueryParams {
        account_id: params.account_id,
        account_code: params.account_code,
        start_date: params.start_date,
        end_date: params.end_date,
        period: params.period,
    };

    match service.get_ledger(tenant_id, ledger_params, txn).await {
        Ok(entries) => ApiResponse::success(entries, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/trial-balance/{period}",
    tag = "Report",
    params(
        ("period" = String, Path, description = "会计期间"),
    ),
    responses(
        (status = 200, description = "获取试算平衡表成功", body = ApiResponse<Vec<TrialBalance>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_trial_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(period): Path<String>,
) -> ApiResponse<Vec<TrialBalance>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_trial_balance(tenant_id, &period, txn).await {
        Ok(balance) => ApiResponse::success(balance, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/balance-sheet/{period}",
    tag = "Report",
    operation_id = "get_balance_sheet",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_balance_sheet(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(period): Path<String>,
) -> ApiResponse<BalanceSheet> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_balance_sheet(tenant_id, &period, txn).await {
        Ok(sheet) => ApiResponse::success(sheet, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/income-statement/{period}",
    tag = "Report",
    operation_id = "get_income_statement",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_income_statement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(period): Path<String>,
) -> ApiResponse<IncomeStatement> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_income_statement(tenant_id, &period, txn).await {
        Ok(statement) => ApiResponse::success(statement, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:period:write"])),
    path = "/api/finance/periods/{year}/{month}/close",
    tag = "Auto-Backfill",
    params(
        ("year" = String, Path, description = "year"),
        ("month" = String, Path, description = "month"),
    ),
    responses((status = 200, description = "post /api/finance/periods/{year}/{month}/close"), (status = 500, description = "服务内部错误")),
)]
pub async fn close_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path((year, month)): Path<(i32, i32)>,
) -> ApiResponse<Period> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let closed_by = claims.username.clone();
    match service
        .close_period(tenant_id, year, month, &closed_by, txn)
        .await
    {
        Ok(period) => ApiResponse::success(period, "期间已关闭"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:period:write"])),
    path = "/periods/{year}/{month}/open",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("year" = String, Path, description = "年份"),
        ("month" = String, Path, description = "月份"),
    ),
    tag = "Finance",
    operation_id = "open_period",
)]

pub async fn open_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path((year, month)): Path<(i32, i32)>,
) -> ApiResponse<Period> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.open_period(tenant_id, year, month, txn).await {
        Ok(period) => ApiResponse::success(period, "期间已打开"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:account:create"])),
    path = "/api/finance/aux-accounts",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/aux-accounts"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_aux_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<CreateAuxiliaryAccountRequest>,
) -> ApiResponse<AuxiliaryAccount> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.create_aux_account(tenant_id, req, txn).await {
        Ok(account) => ApiResponse::success(account, "辅助科目创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/finance/aux-accounts",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:account:read"])),
)]
async fn list_aux_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<AuxQueryParams>,
    headers: HeaderMap,
) -> ApiResponse<Vec<AuxiliaryAccount>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let aux_type = match params.aux_type.as_str() {
        "project" => Some(AuxType::Project),
        "department" => Some(AuxType::Department),
        "customer" => Some(AuxType::Customer),
        "supplier" => Some(AuxType::Supplier),
        "employee" => Some(AuxType::Employee),
        "custom1" => Some(AuxType::Custom1),
        "custom2" => Some(AuxType::Custom2),
        "custom3" => Some(AuxType::Custom3),
        _ => None,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .list_aux_accounts(tenant_id, aux_type, locale, txn)
        .await
    {
        Ok(accounts) => ApiResponse::success(accounts, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/aux-ledger",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = AuxQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance",
    operation_id = "get_aux_ledger",
)]

pub async fn get_aux_ledger(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<AuxQueryParams>,
    headers: HeaderMap,
) -> ApiResponse<Vec<AuxLedgerEntry>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let aux_type = match params.aux_type.as_str() {
        "project" => AuxType::Project,
        "department" => AuxType::Department,
        "customer" => AuxType::Customer,
        "supplier" => AuxType::Supplier,
        "employee" => AuxType::Employee,
        "custom1" => AuxType::Custom1,
        "custom2" => AuxType::Custom2,
        "custom3" => AuxType::Custom3,
        _ => return ApiResponse::bad_request("无效的辅助核算类型"),
    };
    let query = AuxLedgerQuery {
        aux_type,
        aux_id: params.aux_id,
        account_id: params.account_id,
        period: params.period,
        start_date: params.start_date,
        end_date: params.end_date,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match service.get_aux_ledger(tenant_id, query, locale, txn).await {
        Ok(entries) => ApiResponse::success(entries, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/aux-balance",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/aux-balance"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_aux_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<AuxQueryParams>,
    headers: HeaderMap,
) -> ApiResponse<Vec<AuxBalanceReport>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let aux_type = match params.aux_type.as_str() {
        "project" => AuxType::Project,
        "department" => AuxType::Department,
        "customer" => AuxType::Customer,
        "supplier" => AuxType::Supplier,
        "employee" => AuxType::Employee,
        "custom1" => AuxType::Custom1,
        "custom2" => AuxType::Custom2,
        "custom3" => AuxType::Custom3,
        _ => return ApiResponse::bad_request("无效的辅助核算类型"),
    };
    let query = AuxLedgerQuery {
        aux_type,
        aux_id: params.aux_id,
        account_id: params.account_id,
        period: params.period,
        start_date: params.start_date,
        end_date: params.end_date,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match service.get_aux_balance(tenant_id, query, locale, txn).await {
        Ok(balance) => ApiResponse::success(balance, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/cash-flow/{period}",
    tag = "Report",
    params(
        ("period" = String, Path, description = "会计期间"),
    ),
    responses(
        (status = 200, description = "获取现金流量表成功", body = ApiResponse<CashFlowStatement>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_cash_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(period): Path<String>,
) -> ApiResponse<CashFlowStatement> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .get_cash_flow_statement(tenant_id, &period, txn)
        .await
    {
        Ok(statement) => ApiResponse::success(statement, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/batch/submit",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/vouchers/batch/submit"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_submit_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<BatchVoucherRequest>,
) -> ApiResponse<BatchVoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .batch_submit_vouchers(tenant_id, req.voucher_ids, txn)
        .await
    {
        Ok(result) => ApiResponse::success(result, "批量提交完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/batch/approve",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/vouchers/batch/approve"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_approve_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<BatchVoucherRequest>,
) -> ApiResponse<BatchVoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let approved_by = claims.username.clone();
    match service
        .batch_approve_vouchers(tenant_id, req.voucher_ids, &approved_by, txn)
        .await
    {
        Ok(result) => ApiResponse::success(result, "批量审批完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/batch/post",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/vouchers/batch/post"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_post_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<BatchVoucherRequest>,
) -> ApiResponse<BatchVoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let posted_by = claims.username.clone();
    match service
        .batch_post_vouchers(tenant_id, req.voucher_ids, &posted_by, txn)
        .await
    {
        Ok(result) => ApiResponse::success(result, "批量过账完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/vouchers/export",
    tag = "Voucher",
    request_body = ExportVoucherRequest,
    responses(
        (status = 200, description = "导出凭证成功", body = ApiResponse<ExportVoucherResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn export_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<ExportVoucherRequest>,
) -> ApiResponse<ExportVoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.export_vouchers(tenant_id, req, txn).await {
        Ok(result) => ApiResponse::success(result, "导出成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:period:write"])),
    path = "/api/finance/year-end-close",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/year-end-close"), (status = 500, description = "服务内部错误")),
)]
pub async fn year_end_close(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    headers: HeaderMap,
    Json(req): Json<YearEndCloseRequest>,
) -> ApiResponse<YearEndCloseResult> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .year_end_close(
            tenant_id,
            req.year,
            &created_by,
            req.description,
            locale,
            txn,
        )
        .await
    {
        Ok(result) => ApiResponse::success(result, "年末结转成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/payments"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    headers: HeaderMap,
    Json(req): Json<CreatePaymentRequest>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();
    let supplier_id = req.supplier_id;
    let payment_method = req.payment_method.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .create_payment(tenant_id, req, &created_by, locale, txn)
        .await
    {
        Ok(payment) => {
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let payment_id = payment.id;
                let payment_no = payment.payment_no.clone();
                let amount = payment.total_amount;
                let _paid_by = Some(created_by.clone());
                let paid_at = Some(Utc::now());
                tokio::spawn(async move {
                    let payload = PaymentMadePayload {
                        payment_id,
                        payment_no,
                        order_id: None,
                        supplier_id,
                        amount,
                        payment_method: Some(payment_method),
                        paid_at,
                        tenant_id: Some(tenant_id),
                    };
                    // D6：commit 已成功（service.create_payment 内部 tx.commit），此处仅发布；
                    // 失败入 Redis ZSET 重试队列，由 main.rs 15s run_relay 重发。
                    if let Err(e) = publisher
                        .publish_event(EventType::PaymentMade, payload.clone())
                        .await
                    {
                        tracing::warn!("[finance] PaymentMade 事件发布失败: {}，入重试队列", e);
                        commit_retry::push_retry_typed("finance", EventType::PaymentMade, &payload)
                            .await;
                    } else {
                        tracing::info!(
                            "[finance] PaymentMade 事件发布成功 - payment_id={}",
                            payment_id
                        );
                    }
                });
            }
            ApiResponse::success(payment, "创建成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/{payment_id}",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "get /api/finance/payments/{payment_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<Uuid>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_payment(tenant_id, payment_id, txn).await {
        Ok(payment) => ApiResponse::success(payment, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Clone, Deserialize, IntoParams)]
pub struct PaymentListParams {
    pub supplier_id: Option<Uuid>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:payment:read"])),
    path = "/payments",
    tag = "Payment",
    operation_id = "list_payments_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_payments_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<PaymentListParams>,
) -> ApiResponse<PaymentListResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let query = crate::models::PaymentQueryParams {
        supplier_id: params.supplier_id,
        status: params.status,
        start_date: params.start_date,
        end_date: params.end_date,
        page: params.page,
        page_size: params.page_size,
    };
    match service.list_payments(tenant_id, query, txn).await {
        Ok((items, total)) => ApiResponse::success(
            PaymentListResponse {
                items,
                total,
                page,
                page_size,
            },
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/{payment_id}",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "put /api/finance/payments/{payment_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreatePaymentRequest>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let updated_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .update_payment(tenant_id, payment_id, req, &updated_by, locale, txn)
        .await
    {
        Ok(payment) => ApiResponse::success(payment, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/{payment_id}",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "delete /api/finance/payments/{payment_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.delete_payment(tenant_id, payment_id, txn).await {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/{payment_id}/submit",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "post /api/finance/payments/{payment_id}/submit"), (status = 500, description = "服务内部错误")),
)]
pub async fn submit_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<Uuid>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let _submitted_by = claims.username.clone();

    let payment = match service.get_payment(tenant_id, payment_id, txn).await {
        Ok(p) => p,
        Err(e) => return crate::shared::err_resp(e),
    };

    let voucher_id = match payment.voucher_id {
        Some(v) => v,
        None => {
            return crate::shared::err_resp(TopemsError::ValidationFailed(
                "付款单未关联凭证".to_string(),
            ));
        }
    };

    match service.submit_voucher(tenant_id, voucher_id, txn).await {
        Ok(_) => match service.get_payment(tenant_id, payment_id, txn).await {
            Ok(p) => ApiResponse::success(p, "提交成功"),
            Err(e) => crate::shared::err_resp(e),
        },
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/{payment_id}/approve",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "post /api/finance/payments/{payment_id}/approve"), (status = 500, description = "服务内部错误")),
)]
pub async fn approve_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<Uuid>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let approved_by = claims.username.clone();

    let payment = match service.get_payment(tenant_id, payment_id, txn).await {
        Ok(p) => p,
        Err(e) => return crate::shared::err_resp(e),
    };

    let voucher_id = match payment.voucher_id {
        Some(v) => v,
        None => {
            return crate::shared::err_resp(TopemsError::ValidationFailed(
                "付款单未关联凭证".to_string(),
            ));
        }
    };

    match service
        .approve_voucher(tenant_id, voucher_id, &approved_by, txn)
        .await
    {
        Ok(_) => match service.get_payment(tenant_id, payment_id, txn).await {
            Ok(p) => ApiResponse::success(p, "审批通过"),
            Err(e) => crate::shared::err_resp(e),
        },
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/{payment_id}/reject",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "post /api/finance/payments/{payment_id}/reject"), (status = 500, description = "服务内部错误")),
)]
pub async fn reject_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<Uuid>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let rejected_by = claims.username.clone();

    let payment = match service.get_payment(tenant_id, payment_id, txn).await {
        Ok(p) => p,
        Err(e) => return crate::shared::err_resp(e),
    };

    let voucher_id = match payment.voucher_id {
        Some(v) => v,
        None => {
            return crate::shared::err_resp(TopemsError::ValidationFailed(
                "付款单未关联凭证".to_string(),
            ));
        }
    };

    match service
        .reject_voucher(tenant_id, voucher_id, &rejected_by, txn)
        .await
    {
        Ok(_) => match service.get_payment(tenant_id, payment_id, txn).await {
            Ok(p) => ApiResponse::success(p, "已拒绝"),
            Err(e) => crate::shared::err_resp(e),
        },
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/{payment_id}/execute",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "post /api/finance/payments/{payment_id}/execute"), (status = 500, description = "服务内部错误")),
)]
pub async fn execute_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<Uuid>,
    Json(req): Json<crate::models::ExecutePaymentRequest>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    // executed_by 列为 uuid，按 JWT sub 绑定；用户名仅供日志/文本列使用。
    let executed_by = match claims.user_id() {
        Ok(u) => u,
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };

    match service
        .execute_payment(tenant_id, payment_id, req, executed_by, txn)
        .await
    {
        Ok(p) => ApiResponse::success(p, "执行成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct WriteOffRequest {
    pub item_id: Uuid,
    pub write_off_amount: Decimal,
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/payments/write-off",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/payments/write-off"), (status = 500, description = "服务内部错误")),
)]
pub async fn write_off_payment_item_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<WriteOffRequest>,
) -> ApiResponse<PaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let Some(write_off_by) = Uuid::parse_str(&claims.sub).ok() else {
        return ApiResponse::from(TopemsError::Unauthorized);
    };

    match service
        .write_off_payment_item(
            tenant_id,
            req.item_id,
            req.write_off_amount,
            write_off_by,
            txn,
        )
        .await
    {
        Ok(p) => ApiResponse::success(p, "核销成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/payments/export",
    tag = "Payment",
    request_body = ExportPaymentRequest,
    responses(
        (status = 200, description = "导出付款单成功", body = ApiResponse<ExportPaymentResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn export_payments_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<ExportPaymentRequest>,
) -> ApiResponse<ExportPaymentResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    match service.export_payments(tenant_id, req, txn).await {
        Ok(r) => ApiResponse::success(r, "导出成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/approval-configs",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/approval-configs"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_approval_configs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<Vec<ApprovalConfigResponse>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    if !claims.has_permission("finance:admin") {
        return ApiResponse::forbidden("没有权限访问审批配置");
    }

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    match service.list_approval_configs(tenant_id, txn).await {
        Ok(configs) => ApiResponse::success(configs, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/approval-configs",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/approval-configs"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<CreateApprovalConfigRequest>,
) -> ApiResponse<ApprovalConfigResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    if !claims.has_permission("finance:admin") {
        return ApiResponse::forbidden("没有权限创建审批配置");
    }

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = match claims.user_id() {
        Ok(u) => u.to_string(),
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };

    match service
        .create_approval_config(tenant_id, req, &created_by, txn)
        .await
    {
        Ok(config) => ApiResponse::success(config, "创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/approval-configs/{config_id}",
    tag = "Auto-Backfill",
    params(
        ("config_id" = String, Path, description = "config_id"),
    ),
    responses((status = 200, description = "get /api/finance/approval-configs/{config_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(config_id): Path<Uuid>,
) -> ApiResponse<ApprovalConfigResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    if !claims.has_permission("finance:admin") {
        return ApiResponse::forbidden("没有权限访问审批配置");
    }

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    match service.get_approval_config(tenant_id, config_id, txn).await {
        Ok(config) => ApiResponse::success(config, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/finance/approval-configs/{config_id}",
    tag = "Auto-Backfill",
    params(
        ("config_id" = String, Path, description = "config_id"),
    ),
    responses((status = 200, description = "put /api/finance/approval-configs/{config_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(config_id): Path<Uuid>,
    Json(req): Json<CreateApprovalConfigRequest>,
) -> ApiResponse<ApprovalConfigResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    if !claims.has_permission("finance:admin") {
        return ApiResponse::forbidden("没有权限更新审批配置");
    }

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let updated_by = claims.username.clone();

    match service
        .update_approval_config(tenant_id, config_id, req, &updated_by, txn)
        .await
    {
        Ok(config) => ApiResponse::success(config, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/finance/approval-configs/{config_id}",
    tag = "Auto-Backfill",
    params(
        ("config_id" = String, Path, description = "config_id"),
    ),
    responses((status = 200, description = "delete /api/finance/approval-configs/{config_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(config_id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    if !claims.has_permission("finance:admin") {
        return ApiResponse::forbidden("没有权限删除审批配置");
    }

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    match service
        .delete_approval_config(tenant_id, config_id, txn)
        .await
    {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== 审批操作（供 ERP 合并报表审批流程调用） ==========

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/approvals/submit",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/approvals/submit"), (status = 500, description = "服务内部错误")),
)]
pub async fn submit_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    tracing::debug!("[finance] 收到审批提交请求: {:?}", req);

    let entity_type = req
        .get("entity_type")
        .and_then(|v| v.as_str())
        .unwrap_or("finance");
    let record_id = req
        .get("record_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let from_status = req
        .get("from_status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending");
    let to_status = req
        .get("to_status")
        .and_then(|v| v.as_str())
        .unwrap_or("approved");
    let approver_id = claims.user_id().ok().unwrap_or_else(Uuid::nil);

    // 复用 tenant_middleware 的请求事务：审批审计与业务写入同生共死，
    // 不再为审计另开作用域（M-1/B4）。
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    if let Some(record_id) = record_id {
        if let Err(e) = topems_shared_db::approval::create_approval_and_log_db_txn(
            &state.db,
            txn,
            entity_type,
            record_id,
            from_status,
            to_status,
            approver_id,
        )
        .await
        {
            tracing::warn!("create_approval_and_log failed: {}", e);
        }
    }

    ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已提交"}),
        "审批已提交",
    )
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:expense_approval:update"])),
    path = "/approvals/approve",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "approve_approval",
)]

pub async fn approve_approval(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    tracing::debug!("[finance] 收到审批通过请求: {:?}", req);

    let entity_type = req
        .get("entity_type")
        .and_then(|v| v.as_str())
        .unwrap_or("finance");
    let record_id = req
        .get("record_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let approval_id = req
        .get("approval_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let from_status = req
        .get("from_status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending");
    let to_status = req
        .get("to_status")
        .and_then(|v| v.as_str())
        .unwrap_or("approved");

    // 复用 tenant_middleware 的请求事务：审批审计与业务写入同生共死，
    // 不再为审计另开作用域（M-1/B4）。
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    if let (Some(record_id), Some(approval_id)) = (record_id, approval_id) {
        if let Err(e) = topems_shared_db::approval::execute_transition_and_log_db_txn(
            &state.db,
            txn,
            None,
            entity_type,
            record_id,
            approval_id,
            from_status,
            to_status,
        )
        .await
        {
            tracing::warn!("execute_transition_and_log failed: {}", e);
        }
    }

    ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已通过"}),
        "审批已通过",
    )
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/approvals/reject",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/approvals/reject"), (status = 500, description = "服务内部错误")),
)]
pub async fn reject_approval(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    tracing::debug!("[finance] 收到审批驳回请求: {:?}", req);

    let entity_type = req
        .get("entity_type")
        .and_then(|v| v.as_str())
        .unwrap_or("finance");
    let record_id = req
        .get("record_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let approval_id = req
        .get("approval_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let reason = req
        .get("reason")
        .or_else(|| req.get("comment"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // 复用 tenant_middleware 的请求事务：审批审计与业务写入同生共死，
    // 不再为审计另开作用域（M-1/B4）。
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    if let (Some(record_id), Some(approval_id)) = (record_id, approval_id) {
        if let Err(e) = topems_shared_db::approval::reject_and_log_db_txn(
            &state.db,
            txn,
            entity_type,
            record_id,
            approval_id,
            reason,
        )
        .await
        {
            tracing::warn!("reject_and_log failed: {}", e);
        }
    }

    ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已驳回"}),
        "审批已驳回",
    )
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/approvals/cancel",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/approvals/cancel"), (status = 500, description = "服务内部错误")),
)]
pub async fn cancel_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    tracing::debug!("[finance] 收到审批取消请求: {:?}", req);
    ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已取消"}),
        "审批已取消",
    )
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FinanceDashboardStats {
    pub total_vouchers: i64,
    pub draft_vouchers: i64,
    pub submitted_vouchers: i64,
    pub approved_vouchers: i64,
    pub posted_vouchers: i64,
    pub total_payments: i64,
    pub pending_payments: i64,
    pub total_receivables: i64,
    pub overdue_receivables: i64,
    pub total_payables: i64,
    pub overdue_payables: i64,
    pub pending_approvals: i64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/dashboard",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/dashboard"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_dashboard_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<FinanceDashboardStats> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };

    let total_vouchers = count_table_with_tenant(&state.db, txn, "vouchers", tenant_id).await;
    let draft_vouchers =
        count_table_with_tenant_and_status(&state.db, txn, "vouchers", tenant_id, "draft").await;
    let submitted_vouchers =
        count_table_with_tenant_and_status(&state.db, txn, "vouchers", tenant_id, "submitted")
            .await;
    let approved_vouchers =
        count_table_with_tenant_and_status(&state.db, txn, "vouchers", tenant_id, "approved").await;
    let posted_vouchers =
        count_table_with_tenant_and_status(&state.db, txn, "vouchers", tenant_id, "posted").await;

    let total_payments = count_table_with_tenant(&state.db, txn, "payments", tenant_id).await;
    let pending_payments =
        count_table_with_tenant_and_status(&state.db, txn, "payments", tenant_id, "pending").await;

    let total_receivables = sum_table_with_tenant(&state.db, txn, "receivables", tenant_id).await;
    let overdue_receivables =
        sum_overdue_with_tenant(&state.db, txn, "receivables", tenant_id).await;

    let total_payables = sum_table_with_tenant(&state.db, txn, "payables", tenant_id).await;
    let overdue_payables = sum_overdue_with_tenant(&state.db, txn, "payables", tenant_id).await;

    let pending_approvals = count_table_with_tenant_and_status(
        &state.db,
        txn,
        "approval_workflows",
        tenant_id,
        "pending",
    )
    .await;

    let stats = FinanceDashboardStats {
        total_vouchers,
        draft_vouchers,
        submitted_vouchers,
        approved_vouchers,
        posted_vouchers,
        total_payments,
        pending_payments,
        total_receivables,
        overdue_receivables,
        total_payables,
        overdue_payables,
        pending_approvals,
    };

    ApiResponse::success(stats, "查询成功")
}

// ========== V40.0 Phase 8: 凭证模板 ==========

#[derive(Debug, Deserialize, IntoParams, ToSchema)]
pub struct VoucherTemplateQueryParams {
    pub voucher_type: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/voucher-templates",
    tag = "Voucher Template",
    params(VoucherTemplateQueryParams),
    responses(
        (status = 200, description = "获取凭证模板列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_voucher_templates_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<VoucherTemplateQueryParams>,
) -> ApiResponse<Vec<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .list_voucher_templates(tenant_id, params.voucher_type, params.status, txn)
        .await
    {
        Ok(templates) => {
            let json_templates: Vec<serde_json::Value> = templates
                .into_iter()
                .map(|t| serde_json::to_value(t).unwrap_or(serde_json::json!({})))
                .collect();
            ApiResponse::success(json_templates, "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-templates/{template_id}",
    tag = "Auto-Backfill",
    params(
        ("template_id" = String, Path, description = "template_id"),
    ),
    responses((status = 200, description = "get /api/finance/voucher-templates/{template_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(template_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .get_voucher_template(tenant_id, template_id, txn)
        .await
    {
        Ok(template) => ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-templates",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/voucher-templates"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();
    let req: crate::services::finance::voucher_template::CreateVoucherTemplateRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service
        .create_voucher_template(tenant_id, req, &created_by, txn)
        .await
    {
        Ok(template) => ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "创建成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    put,
    path = "/api/finance/voucher-templates/{template_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:voucher:update"])),
)]
async fn update_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let req: crate::services::finance::voucher_template::UpdateVoucherTemplateRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service
        .update_voucher_template(tenant_id, template_id, req, txn)
        .await
    {
        Ok(template) => ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "更新成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-templates/{template_id}",
    tag = "Auto-Backfill",
    params(
        ("template_id" = String, Path, description = "template_id"),
    ),
    responses((status = 200, description = "delete /api/finance/voucher-templates/{template_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(template_id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .delete_voucher_template(tenant_id, template_id, txn)
        .await
    {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-templates/{template_id}/set-default",
    tag = "Auto-Backfill",
    params(
        ("template_id" = String, Path, description = "template_id"),
    ),
    responses((status = 200, description = "post /api/finance/voucher-templates/{template_id}/set-default"), (status = 500, description = "服务内部错误")),
)]
pub async fn set_default_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(template_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .set_default_template(tenant_id, template_id, txn)
        .await
    {
        Ok(template) => ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "设置成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:create"])),
    path = "/voucher-templates/apply",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "apply_template_handler",
)]

pub async fn apply_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let req: crate::services::finance::voucher_template::ApplyTemplateRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service.apply_template(tenant_id, req, txn).await {
        Ok(result) => ApiResponse::success(result, "应用成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V40.0 Phase 8 扩展: 凭证模板复制/切换/匹配/统计 ==========

#[derive(Debug, Deserialize)]
pub struct CopyTemplateRequest {
    pub new_code: Option<String>,
    pub new_name: String,
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    post,
    path = "/api/finance/voucher-templates/{template_id}/copy",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:voucher:create"])),
)]
async fn copy_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(template_id): Path<Uuid>,
    Json(req): Json<CopyTemplateRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();
    let source = match service
        .get_voucher_template(tenant_id, template_id, txn)
        .await
    {
        Ok(t) => t,
        Err(e) => return crate::shared::err_resp(e),
    };
    let lines: Vec<crate::services::finance::voucher_template::CreateVoucherTemplateLineRequest> =
        source
            .lines
            .iter()
            .map(
                |l| crate::services::finance::voucher_template::CreateVoucherTemplateLineRequest {
                    description: l.description.clone(),
                    account_code: l.account_code.clone(),
                    direction: l.direction.clone(),
                    amount_formula: l.amount_formula.clone(),
                    sort_order: Some(l.sort_order),
                },
            )
            .collect();
    let create_req = crate::services::finance::voucher_template::CreateVoucherTemplateRequest {
        name: req.new_name,
        description: source.description.clone(),
        voucher_type: source.voucher_type.clone(),
        default_debit_account: source.default_debit_account.clone(),
        default_credit_account: source.default_credit_account.clone(),
        lines,
    };
    match service
        .create_voucher_template(tenant_id, create_req, &created_by, txn)
        .await
    {
        Ok(template) => ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "复制成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct ToggleTemplateRequest {
    pub isactive: bool,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:voucher:update"])),
    path = "/api/finance/voucher-templates/{template_id}/toggle",
    params(
        ("template_id" = String, Path, description = "template_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Mod"
)]
pub async fn toggle_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<ToggleTemplateRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let new_status = if req.isactive { "active" } else { "inactive" };
    let now = Utc::now();
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let res = sqlx::query(
        only_own_schema_query!("finance", "UPDATE finance.finance_voucher_templates SET status = $1, updated_at = $2 WHERE tenant_id = $3 AND id = $4"),
    )
    .bind(new_status)
    .bind(now)
    .bind(tenant_id)
    .bind(template_id)
    .execute(&mut scope)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return ApiResponse::not_found("凭证模板不存在");
            }
            let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
            // 释放写作用域：模板读取复用同一请求事务。
            if let Err(e) = scope.commit().await {
                return crate::shared::err_resp(e);
            }
            match service
                .get_voucher_template(tenant_id, template_id, txn)
                .await
            {
                Ok(template) => {
                    let mut val = serde_json::to_value(template).unwrap_or(serde_json::json!({}));
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("isactive".to_string(), serde_json::json!(req.isactive));
                    }
                    ApiResponse::success(val, "切换成功")
                }
                Err(e) => crate::shared::err_resp(e),
            }
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct MatchTemplateRequest {
    pub source_module: Option<String>,
    pub source_type: Option<String>,
    pub company_id: Option<String>,
    pub amount: Option<f64>,
    pub extra_data: Option<serde_json::Value>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/api/finance/voucher-templates/match",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Mod"
)]
pub async fn match_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<MatchTemplateRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let source_type = match req.source_type {
        Some(s) => s,
        None => return ApiResponse::bad_request("source_type 为必填"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rule: Option<crate::services::finance::voucher_generation::VoucherGenerationRule> = match sqlx::query_as(
        only_own_schema_query!("finance", "SELECT * FROM finance.finance_voucher_generation_rules WHERE tenant_id = $1 AND source_type = $2 AND status = 'active' ORDER BY priority ASC LIMIT 1"),
    )
    .bind(tenant_id)
    .bind(&source_type)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            return crate::shared::err_resp(e);
        }
    };
    match rule {
        Some(r) => {
            let template_id_opt = r
                .mapping_config
                .get("template_id")
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok());
            let template_val = if let Some(tid) = template_id_opt {
                let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
                // 释放读作用域：模板读取复用同一请求事务。
                if let Err(e) = scope.commit().await {
                    return crate::shared::err_resp(e);
                }
                match service.get_voucher_template(tenant_id, tid, txn).await {
                    Ok(t) => serde_json::to_value(t).unwrap_or(serde_json::json!(null)),
                    Err(_) => serde_json::json!(null),
                }
            } else {
                serde_json::json!(null)
            };
            ApiResponse::success(
                serde_json::json!({
                    "matched": true,
                    "rule": serde_json::to_value(&r).unwrap_or(serde_json::json!({})),
                    "template": template_val,
                }),
                "匹配成功",
            )
        }
        None => ApiResponse::success(
            serde_json::json!({
                "matched": false,
                "rule": null,
                "template": null,
            }),
            "未找到匹配的规则",
        ),
    }
}

#[derive(Debug, Deserialize)]
pub struct UsageStatsQueryParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/api/finance/voucher-templates/{template_id}/usage-stats",
    params(
        ("template_id" = String, Path, description = "template_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Mod"
)]
pub async fn get_template_usage_stats_handler(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(template_id): Path<Uuid>,
    Query(_params): Query<UsageStatsQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rule_count: i64 = match sqlx::query_scalar(
        only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.finance_voucher_generation_rules WHERE mapping_config::jsonb->>'template_id' = $1"),
    )
    .bind(template_id.to_string())
    .fetch_one(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let generated_voucher_count: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE template_id = $1"
    ))
    .bind(template_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let last_used_at: Option<DateTime<Utc>> = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT MAX(created_at) FROM finance.core_finance_vouchers WHERE template_id = $1"
    ))
    .bind(template_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    ApiResponse::success(
        serde_json::json!({
            "template_id": template_id,
            "usage_count": rule_count,
            "generated_voucher_count": generated_voucher_count,
            "last_used_at": last_used_at,
        }),
        "查询成功",
    )
}

// ========== 模板分录 CRUD ==========

#[derive(Debug, Deserialize)]
pub struct AddTemplateEntryRequest {
    pub description: Option<String>,
    pub account_code: String,
    pub direction: String,
    pub amount_formula: Option<String>,
    pub sort_order: Option<i32>,
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    post,
    path = "/api/finance/voucher-templates/{template_id}/entries",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:voucher:create"])),
)]
async fn add_template_entry_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<AddTemplateEntryRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let count: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.finance_voucher_templates WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    if count == 0 {
        return ApiResponse::not_found("凭证模板不存在");
    }
    let sort_order: i32 = match req.sort_order {
        Some(s) => s,
        None => {
            let max_order: i32 = match sqlx::query_scalar(
                only_own_schema_query!("finance", "SELECT COALESCE(MAX(sort_order), 0) FROM finance.finance_voucher_template_lines WHERE template_id = $1"),
            )
            .bind(template_id)
            .fetch_one(&mut scope)
            .await {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("[finance] 查询失败: {}", e);
                    return crate::shared::err_resp(e);
                }
            };
            max_order + 1
        }
    };
    let line_id = Uuid::new_v4();
    let now = Utc::now();
    let line: Result<
        crate::services::finance::voucher_template::VoucherTemplateLine,
        sqlx::Error,
    > = sqlx::query_as(
        only_own_schema_query!("finance", r#"INSERT INTO finance.finance_voucher_template_lines
            (id, template_id, description, account_code, direction, amount_formula, sort_order, created_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *"#),
    )
    .bind(line_id)
    .bind(template_id)
    .bind(&req.description)
    .bind(&req.account_code)
    .bind(&req.direction)
    .bind(&req.amount_formula)
    .bind(sort_order)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;
    match line {
        Ok(l) => ApiResponse::success(
            serde_json::to_value(l).unwrap_or(serde_json::json!({})),
            "新增分录成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateEntryRequest {
    pub description: Option<String>,
    pub account_code: Option<String>,
    pub direction: Option<String>,
    pub amount_formula: Option<String>,
    pub sort_order: Option<i32>,
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    put,
    path = "/api/finance/voucher-templates/{template_id}/entries/{entry_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:voucher:update"])),
)]
async fn update_template_entry_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateTemplateEntryRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let owns: i64 = match sqlx::query_scalar(
        only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.finance_voucher_template_lines l JOIN finance.finance_voucher_templates t ON l.template_id = t.id WHERE t.tenant_id = $1 AND l.template_id = $2 AND l.id = $3"),
    )
    .bind(tenant_id)
    .bind(template_id)
    .bind(entry_id)
    .fetch_one(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    if owns == 0 {
        return ApiResponse::not_found("模板分录不存在");
    }
    let existing: crate::services::finance::voucher_template::VoucherTemplateLine =
        match sqlx::query_as(only_own_schema_query!(
            "finance",
            "SELECT * FROM finance.finance_voucher_template_lines WHERE id = $1"
        ))
        .bind(entry_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(l) => l,
            Err(e) => {
                return crate::shared::err_resp(e);
            }
        };
    let description = req.description.or(existing.description);
    let account_code = req.account_code.unwrap_or(existing.account_code);
    let direction = req.direction.unwrap_or(existing.direction);
    let amount_formula = req.amount_formula.or(existing.amount_formula);
    let sort_order = req.sort_order.unwrap_or(existing.sort_order);
    let line: Result<crate::services::finance::voucher_template::VoucherTemplateLine, sqlx::Error> =
        sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.finance_voucher_template_lines
              SET description = $1, account_code = $2, direction = $3,
                  amount_formula = $4, sort_order = $5
            WHERE id = $6
           RETURNING *"#
        ))
        .bind(description)
        .bind(account_code)
        .bind(direction)
        .bind(amount_formula)
        .bind(sort_order)
        .bind(entry_id)
        .fetch_one(&mut scope)
        .await;
    match line {
        Ok(l) => ApiResponse::success(
            serde_json::to_value(l).unwrap_or(serde_json::json!({})),
            "更新分录成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    delete,
    path = "/api/finance/voucher-templates/{template_id}/entries/{entry_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:voucher:delete"])),
)]
async fn delete_template_entry_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let res = sqlx::query(
        only_own_schema_query!("finance", "DELETE FROM finance.finance_voucher_template_lines WHERE id = $1 AND template_id = $2 AND EXISTS (SELECT 1 FROM finance.finance_voucher_templates WHERE id = $2 AND tenant_id = $3)"),
    )
    .bind(entry_id)
    .bind(template_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return ApiResponse::not_found("模板分录不存在");
            }
            ApiResponse::success(
                serde_json::json!({"deleted": true, "entry_id": entry_id}),
                "删除分录成功",
            )
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct ReorderEntriesRequest {
    pub entry_ids: Vec<Uuid>,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:voucher:update"])),
    path = "/api/finance/voucher-templates/{template_id}/entries/reorder",
    params(
        ("template_id" = String, Path, description = "template_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Mod"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn reorder_template_entries_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<ReorderEntriesRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let count: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.finance_voucher_templates WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    if count == 0 {
        return ApiResponse::not_found("凭证模板不存在");
    }
    for (idx, entry_id) in req.entry_ids.iter().enumerate() {
        let sort_order = (idx + 1) as i32;
        if let Err(e) = sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance.finance_voucher_template_lines SET sort_order = $1 WHERE id = $2 AND template_id = $3"),
        )
        .bind(sort_order)
        .bind(entry_id)
        .bind(template_id)
        .execute(&mut scope)
        .await
        {
            return crate::shared::err_resp(e);
        }
    }
    let lines: Result<
        Vec<crate::services::finance::voucher_template::VoucherTemplateLine>,
        sqlx::Error,
    > = sqlx::query_as(
        only_own_schema_query!("finance", "SELECT * FROM finance.finance_voucher_template_lines WHERE template_id = $1 ORDER BY sort_order, created_at"),
    )
    .bind(template_id)
    .fetch_all(&mut scope)
    .await;
    match lines {
        Ok(ls) => {
            let json_lines: Vec<serde_json::Value> = ls
                .iter()
                .map(|l| serde_json::to_value(l).unwrap_or(serde_json::json!({})))
                .collect();
            ApiResponse::success(
                serde_json::json!({"template_id": template_id, "entries": json_lines}),
                "重排成功",
            )
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== 模板导入导出 ==========

#[derive(Debug, Deserialize)]
pub struct ExportQueryParams {
    pub format: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/api/finance/voucher-templates/{template_id}/export",
    params(
        ("template_id" = String, Path, description = "template_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Mod"
)]
pub async fn export_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(template_id): Path<Uuid>,
    Query(_params): Query<ExportQueryParams>,
) -> axum::response::Response {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp::<serde_json::Value, _>(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ))
        .into_response();
    };

    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => {
            return ApiResponse::<serde_json::Value>::error(code, &msg).into_response()
        }
    };
    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let template = match service
        .get_voucher_template(tenant_id, template_id, txn)
        .await
    {
        Ok(t) => t,
        Err(e) => return crate::shared::err_resp::<serde_json::Value, _>(e).into_response(),
    };
    let json = serde_json::to_value(template).unwrap_or(serde_json::json!({}));
    let filename = format!("template-{}.json", template_id);
    (
        [(
            axum::http::header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )],
        Json(json),
    )
        .into_response()
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:create"])),
    path = "/api/finance/voucher-templates/import",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Mod"
)]
pub async fn import_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    mut multipart: Multipart,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();

    let mut file_content: Option<Vec<u8>> = None;
    loop {
        // multipart 流本身的错误不能当成「没有更多字段」：否则上传中断会被静默丢弃
        let field = match multipart.next_field().await {
            Ok(Some(field)) => field,
            Ok(None) => break,
            Err(e) => {
                return ApiResponse::from(TopemsError::FileFormatError(format!(
                    "解析上传文件失败: {}",
                    e
                )))
            }
        };
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let data = match field.bytes().await {
                Ok(data) => data,
                Err(e) => {
                    return ApiResponse::from(TopemsError::FileFormatError(format!(
                        "读取上传文件内容失败: {}",
                        e
                    )))
                }
            };
            file_content = Some(data.to_vec());
        }
    }

    let file_data = match file_content {
        Some(data) => data,
        None => return ApiResponse::bad_request("缺少 file 字段"),
    };

    let json_str = match String::from_utf8(file_data) {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::from(TopemsError::FileFormatError(format!("文件编码错误: {}", e)))
        }
    };

    let template_data: serde_json::Value = match serde_json::from_str(&json_str) {
        Ok(v) => v,
        Err(e) => {
            return ApiResponse::from(TopemsError::FileFormatError(format!(
                "JSON 解析失败: {}",
                e
            )))
        }
    };

    let create_req: crate::services::finance::voucher_template::CreateVoucherTemplateRequest =
        match serde_json::from_value(template_data) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service
        .create_voucher_template(tenant_id, create_req, &created_by, txn)
        .await
    {
        Ok(template) => ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "导入成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V40.0 Phase 8: 凭证生成规则 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct GenerationRuleQueryParams {
    pub source_type: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/voucher-generation-rules",
    tag = "Voucher Generation Rule",
    params(GenerationRuleQueryParams),
    responses(
        (status = 200, description = "获取凭证生成规则列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_generation_rules_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<GenerationRuleQueryParams>,
) -> ApiResponse<Vec<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .list_generation_rules(tenant_id, params.source_type, params.status, txn)
        .await
    {
        Ok(rules) => {
            let json_rules: Vec<serde_json::Value> = rules
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or(serde_json::json!({})))
                .collect();
            ApiResponse::success(json_rules, "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-generation-rules/{rule_id}",
    tag = "Auto-Backfill",
    params(
        ("rule_id" = String, Path, description = "rule_id"),
    ),
    responses((status = 200, description = "get /api/finance/voucher-generation-rules/{rule_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(rule_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_generation_rule(tenant_id, rule_id, txn).await {
        Ok(rule) => ApiResponse::success(
            serde_json::to_value(rule).unwrap_or(serde_json::json!({})),
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-generation-rules",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/voucher-generation-rules"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();
    let req: crate::services::finance::voucher_generation::CreateGenerationRuleRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service
        .create_generation_rule(tenant_id, req, &created_by, txn)
        .await
    {
        Ok(rule) => ApiResponse::success(
            serde_json::to_value(rule).unwrap_or(serde_json::json!({})),
            "创建成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-generation-rules/{rule_id}",
    tag = "Auto-Backfill",
    params(
        ("rule_id" = String, Path, description = "rule_id"),
    ),
    responses((status = 200, description = "put /api/finance/voucher-generation-rules/{rule_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(rule_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let req: crate::services::finance::voucher_generation::UpdateGenerationRuleRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service
        .update_generation_rule(tenant_id, rule_id, req, txn)
        .await
    {
        Ok(rule) => ApiResponse::success(
            serde_json::to_value(rule).unwrap_or(serde_json::json!({})),
            "更新成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-generation-rules/{rule_id}",
    tag = "Auto-Backfill",
    params(
        ("rule_id" = String, Path, description = "rule_id"),
    ),
    responses((status = 200, description = "delete /api/finance/voucher-generation-rules/{rule_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(rule_id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .delete_generation_rule(tenant_id, rule_id, txn)
        .await
    {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct ToggleRuleRequest {
    pub isactive: bool,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-generation-rules/{rule_id}/toggle",
    tag = "Auto-Backfill",
    params(
        ("rule_id" = String, Path, description = "rule_id"),
    ),
    responses((status = 200, description = "put /api/finance/voucher-generation-rules/{rule_id}/toggle"), (status = 500, description = "服务内部错误")),
)]
pub async fn toggle_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(rule_id): Path<Uuid>,
    Json(req): Json<ToggleRuleRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let new_status = if req.isactive { "active" } else { "inactive" };
    let now = Utc::now();
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let res = sqlx::query(
        only_own_schema_query!("finance", "UPDATE finance.finance_voucher_generation_rules SET status = $1, updated_at = $2 WHERE tenant_id = $3 AND id = $4"),
    )
    .bind(new_status)
    .bind(now)
    .bind(tenant_id)
    .bind(rule_id)
    .execute(&mut scope)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return ApiResponse::not_found("生成规则不存在");
            }
            let rule: Result<
                crate::services::finance::voucher_generation::VoucherGenerationRule,
                sqlx::Error,
            > = sqlx::query_as(only_own_schema_query!(
                "finance",
                "SELECT * FROM finance.finance_voucher_generation_rules WHERE tenant_id = $1 AND id = $2"
            ))
            .bind(tenant_id)
            .bind(rule_id)
            .fetch_one(&mut scope)
            .await;
            match rule {
                Ok(r) => {
                    let mut val = serde_json::to_value(r).unwrap_or(serde_json::json!({}));
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("isactive".to_string(), serde_json::json!(req.isactive));
                    }
                    ApiResponse::success(val, "切换成功")
                }
                Err(e) => crate::shared::err_resp(e),
            }
        }
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/voucher-generation-rules/test",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "test_rule_handler",
)]

pub async fn test_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let req: crate::services::finance::voucher_generation::TestRuleRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service.test_rule(tenant_id, req, txn).await {
        Ok(result) => ApiResponse::success(
            serde_json::to_value(result).unwrap_or(serde_json::json!({})),
            "测试完成",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/voucher-generation-rules/generate",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/voucher-generation-rules/generate"), (status = 500, description = "服务内部错误")),
)]
pub async fn generate_vouchers_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let generated_by = claims.username.clone();
    let req: crate::services::finance::voucher_generation::GenerateVouchersRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service
        .generate_vouchers(tenant_id, req, &generated_by, txn)
        .await
    {
        Ok(result) => ApiResponse::success(
            serde_json::to_value(result).unwrap_or(serde_json::json!({})),
            "生成成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V40.0 Phase 8: U8 导入 ==========

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct U8ImportQueryParams {
    pub status: Option<String>,
    pub source_system: Option<String>,
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:create"])),
    path = "/u8-import/import",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "import_vouchers_handler",
)]

pub async fn import_vouchers_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let imported_by = claims.username.clone();
    let req: crate::services::finance::u8_import::ImportVouchersRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!("参数错误: {}", e)))
            }
        };
    match service
        .import_vouchers(tenant_id, req, &imported_by, txn)
        .await
    {
        // 单张落库未实现时，批次会以 success_count=0 / status=failed 收尾：
        // 这种情况不能再用「导入成功」的 200 交差（前端会按成功弹提示）。
        Ok(result) if result.total_count > 0 && result.success_count == 0 => ApiResponse::error(
            503,
            &format!(
                "凭证导入未写入任何数据（X-Stub）：{} 张全部失败，批次 {} 已记录为 failed",
                result.total_count, result.import_batch_no
            ),
        ),
        Ok(result) => ApiResponse::success(
            serde_json::to_value(result).unwrap_or(serde_json::json!({})),
            "导入成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/u8-import/{import_id}/status",
    tag = "Auto-Backfill",
    params(
        ("import_id" = String, Path, description = "import_id"),
    ),
    responses((status = 200, description = "get /api/finance/u8-import/{import_id}/status"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_import_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(import_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_import_status(tenant_id, import_id, txn).await {
        Ok(status) => ApiResponse::success(
            serde_json::to_value(status).unwrap_or(serde_json::json!({})),
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/u8-import/records",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/u8-import/records"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_import_records_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<U8ImportQueryParams>,
) -> ApiResponse<Vec<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let query = crate::services::finance::u8_import::ImportRecordQuery {
        status: params.status,
        source_system: params.source_system,
        start_date: None,
        end_date: None,
    };
    match service.list_import_records(tenant_id, query, txn).await {
        Ok(records) => {
            let json_records: Vec<serde_json::Value> = records
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or(serde_json::json!({})))
                .collect();
            ApiResponse::success(json_records, "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/u8-import/records/{import_id}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("import_id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance",
    operation_id = "get_import_record_handler",
)]

pub async fn get_import_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(import_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_import_record(tenant_id, import_id, txn).await {
        Ok(record) => ApiResponse::success(
            serde_json::to_value(record).unwrap_or(serde_json::json!({})),
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/u8-import/{import_id}/rollback",
    tag = "Auto-Backfill",
    params(
        ("import_id" = String, Path, description = "import_id"),
    ),
    responses((status = 200, description = "post /api/finance/u8-import/{import_id}/rollback"), (status = 500, description = "服务内部错误")),
)]
pub async fn rollback_import_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(import_id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.rollback_import(tenant_id, import_id, txn).await {
        Ok(_) => ApiResponse::success((), "回滚成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V41.0 Phase 9: 应收账款（Receivables）==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct ReceivableQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub customer_id: Option<String>,
}

async fn get_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(receivable_id): Path<uuid::Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_receivable(tenant_id, receivable_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn create_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = claims.username.clone();
    match service
        .create_receivable(tenant_id, req, &created_by, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn update_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(receivable_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .update_receivable(tenant_id, receivable_id, req, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn delete_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(receivable_id): Path<uuid::Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .delete_receivable(tenant_id, receivable_id, txn)
        .await
    {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/receivables/aging",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "get_receivable_aging_handler",
)]

pub async fn get_receivable_aging_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_receivable_aging(tenant_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/receivables/batch",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/receivables/batch"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_create_receivables_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = match claims.user_id() {
        Ok(u) => u.to_string(),
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service
        .batch_create_receivables(tenant_id, items, &created_by, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "批量创建完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V41.0 Phase 9: 应付账款（Payables）==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct PayableQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
}

async fn get_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payable_id): Path<uuid::Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_payable(tenant_id, payable_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn create_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = match claims.user_id() {
        Ok(u) => u.to_string(),
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };
    match service
        .create_payable(tenant_id, req, &created_by, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn update_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payable_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .update_payable(tenant_id, payable_id, req, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn delete_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payable_id): Path<uuid::Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.delete_payable(tenant_id, payable_id, txn).await {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/payables/aging",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "get_payable_aging_handler",
)]

pub async fn get_payable_aging_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_payable_aging(tenant_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:receivable_payable:create"])),
    path = "/payables/batch",
    tag = "Payable",
    operation_id = "batch_create_payables_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_create_payables_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = match claims.user_id() {
        Ok(u) => u.to_string(),
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service
        .batch_create_payables(tenant_id, items, &created_by, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "批量创建完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V41.0 Phase 9: 收款管理（Collections）==========

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct CollectionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub customer_id: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/ar/collections",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/collections"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_collections_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<CollectionQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let customer_id = params
        .customer_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok());
    match service
        .list_collections(tenant_id, page, page_size, params.status, customer_id, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/collections/{collection_id}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("collection_id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance",
    operation_id = "get_collection_handler",
)]

pub async fn get_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(collection_id): Path<uuid::Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_collection(tenant_id, collection_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/ar/collections",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/collections"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = match claims.user_id() {
        Ok(u) => u.to_string(),
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    match service
        .create_collection(tenant_id, req, &created_by, &mut scope)
        .await
    {
        Ok(data) => {
            // 收款创建 → PaymentReceived 事件（激活 erp 应收核销 / crm 账单核销 / finance 收款记录）
            // 此前 PaymentReceived 仅有订阅方、无发布方，整条核销链空转；此处补齐发布（2026-09-08）
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let payment_id = data
                    .get("id")
                    .and_then(|v| v.as_str())
                    .and_then(|v| uuid::Uuid::parse_str(v).ok())
                    .unwrap_or_else(uuid::Uuid::new_v4);
                let payment_no = data
                    .get("collection_no")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();
                let customer_name = data
                    .get("customer_name")
                    .and_then(|v| v.as_str())
                    .map(String::from);
                let amount = data
                    .get("amount")
                    .and_then(|v| {
                        v.as_str()
                            .map(String::from)
                            .or_else(|| v.as_number().map(|n| n.to_string()))
                    })
                    .and_then(|st| std::str::FromStr::from_str(&st).ok())
                    .unwrap_or(Decimal::ZERO);
                let payment_no_log = payment_no.clone();
                tokio::spawn(async move {
                    let payload = PaymentReceivedPayload {
                        payment_id,
                        payment_no,
                        order_id: None,
                        customer_id: None,
                        customer_name,
                        amount,
                        payment_method: Some("collection".to_string()),
                        received_at: Some(Utc::now()),
                        tenant_id: Some(tenant_id),
                    };
                    // D6：commit 已成功（service.create_collection 内部已落库），此处仅发布；
                    // 失败入 Redis ZSET 重试队列，由 main.rs 15s run_relay 重发。
                    if let Err(e) = publisher
                        .publish_event(EventType::PaymentReceived, payload.clone())
                        .await
                    {
                        tracing::warn!("[finance] PaymentReceived 事件发布失败: {}，入重试队列", e);
                        commit_retry::push_retry_typed(
                            "finance",
                            EventType::PaymentReceived,
                            &payload,
                        )
                        .await;
                    } else {
                        tracing::info!(
                            "[finance] PaymentReceived 事件发布成功 - payment_no={}, amount={}",
                            payment_no_log,
                            amount
                        );
                    }
                });
            }
            ApiResponse::success(data, "创建成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    put,
    path = "/api/finance/collections/{collection_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:receivable:read"])),
)]
async fn update_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(collection_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .update_collection(tenant_id, collection_id, req, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    delete,
    path = "/api/finance/collections/{collection_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:receivable:read"])),
)]
async fn delete_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(collection_id): Path<uuid::Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .delete_collection(tenant_id, collection_id, txn)
        .await
    {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:receivable:update"])),
    path = "/collections/write-off",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "write_off_collection_handler",
)]

pub async fn write_off_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let collection_id_str = req
        .get("collection_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let receivable_id_str = req
        .get("receivable_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let amount = req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);

    match (
        uuid::Uuid::parse_str(collection_id_str),
        uuid::Uuid::parse_str(receivable_id_str),
    ) {
        (Ok(cid), Ok(rid)) => {
            match service
                .write_off_collection(tenant_id, cid, rid, amount, txn)
                .await
            {
                Ok(data) => ApiResponse::success(data, "核销成功"),
                Err(e) => crate::shared::err_resp(e),
            }
        }
        _ => ApiResponse::bad_request("无效的ID格式"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/collections/batch-write-off",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/collections/batch-write-off"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_write_off_collections_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service.batch_write_off(tenant_id, items, txn).await {
        Ok(data) => ApiResponse::success(data, "批量核销完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V41.0 Phase 9: 付款管理（Payment Records）==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct PaymentRecordQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:payment:read"])),
    path = "/ap/payments",
    params(PaymentRecordQueryParams),
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "list_payment_records_handler",
)]
pub async fn list_payment_records_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<PaymentRecordQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let supplier_id = params
        .supplier_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok());
    match service
        .list_payment_records(tenant_id, page, page_size, params.status, supplier_id, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/payment-records/{payment_id}",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "get /api/finance/payment-records/{payment_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<uuid::Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_payment_record(tenant_id, payment_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/ap/payments",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/payment-records"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let created_by = match claims.user_id() {
        Ok(u) => u.to_string(),
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };
    match service
        .create_payment_record(tenant_id, req, &created_by, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/ap/payments/{payment_id}/approve",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "post /api/finance/ap/payments/{payment_id}/approve"), (status = 500, description = "服务内部错误")),
)]
pub async fn approve_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<uuid::Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .update_payment_record(
            tenant_id,
            payment_id,
            serde_json::json!({ "status": "approved" }),
            txn,
        )
        .await
    {
        Ok(data) => ApiResponse::success(data, "审批通过"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/ap/payments/{payment_id}/reject",
    tag = "Auto-Backfill",
    params(
        ("payment_id" = String, Path, description = "payment_id"),
    ),
    responses((status = 200, description = "post /api/finance/ap/payments/{payment_id}/reject"), (status = 500, description = "服务内部错误")),
)]
pub async fn reject_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<uuid::Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .update_payment_record(
            tenant_id,
            payment_id,
            serde_json::json!({ "status": "rejected" }),
            txn,
        )
        .await
    {
        Ok(data) => ApiResponse::success(data, "已拒绝"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    security(("BearerAuth" = [])),
    put,
    path = "/api/finance/payment-records/{payment_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:payment:read"])),
)]
async fn update_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .update_payment_record(tenant_id, payment_id, req, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    security(("BearerAuth" = [])),
    delete,
    path = "/api/finance/payment-records/{payment_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:payment:read"])),
)]
async fn delete_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(payment_id): Path<uuid::Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .delete_payment_record(tenant_id, payment_id, txn)
        .await
    {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/payment-records/write-off",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/payment-records/write-off"), (status = 500, description = "服务内部错误")),
)]
pub async fn write_off_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let payment_id_str = req.get("payment_id").and_then(|v| v.as_str()).unwrap_or("");
    let payable_id_str = req.get("payable_id").and_then(|v| v.as_str()).unwrap_or("");
    let amount = req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);

    match (
        uuid::Uuid::parse_str(payment_id_str),
        uuid::Uuid::parse_str(payable_id_str),
    ) {
        (Ok(pid), Ok(rid)) => match service
            .write_off_payment(tenant_id, pid, rid, amount, txn)
            .await
        {
            Ok(data) => ApiResponse::success(data, "核销成功"),
            Err(e) => crate::shared::err_resp(e),
        },
        _ => ApiResponse::bad_request("无效的ID格式"),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/payment-records/batch-write-off",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance",
    operation_id = "batch_write_off_payments_handler",
)]

pub async fn batch_write_off_payments_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service
        .batch_write_off_payments(tenant_id, items, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "批量核销完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== V41.0 Phase 9: 账龄分析（Aging）==========

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
pub struct AgingQueryParams {
    pub direction: Option<String>,
    pub bucket: Option<String>,
    pub months: Option<i32>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/aging/receivable",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/aging/receivable"), (status = 500, description = "服务内部错误")),
)]
pub async fn calculate_receivable_aging_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.calculate_receivable_aging(tenant_id, txn).await {
        Ok(data) => ApiResponse::success(data, "计算成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/aging/payable",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/aging/payable"), (status = 500, description = "服务内部错误")),
)]
pub async fn calculate_payable_aging_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.calculate_payable_aging(tenant_id, txn).await {
        Ok(data) => ApiResponse::success(data, "计算成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/aging/summary",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/aging/summary"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_aging_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_aging_summary(tenant_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/aging/detail",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = AgingQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance",
    operation_id = "get_aging_detail_handler",
)]

pub async fn get_aging_detail_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<AgingQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let direction = params.direction.unwrap_or_else(|| "receivable".to_string());
    match service
        .get_aging_detail(tenant_id, &direction, params.bucket, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/aging/trend",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/aging/trend"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_aging_trend_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<AgingQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let direction = params.direction.unwrap_or_else(|| "receivable".to_string());
    let months = params.months.unwrap_or(6);
    match service
        .get_aging_trend(tenant_id, &direction, months, txn)
        .await
    {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== RC4a 补齐: 凭证扩展接口 ==========

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchCreateVouchersRequest {
    pub vouchers: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchDeleteVouchersRequest {
    pub ids: Vec<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReverseVoucherRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct NextVoucherNoQuery {
    pub period: Option<String>,
    pub voucher_type: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateVoucherRequest {
    pub template_id: String,
    pub source_data: serde_json::Value,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PeriodActionRequest {
    pub period: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct PeriodListQuery {
    pub year: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ArAgingQuery {
    pub company_id: Option<String>,
    pub as_of_date: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/entries",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "get /api/finance/vouchers/{voucher_id}/entries"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_voucher_entries(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rows = sqlx::query(
        only_own_schema_query!("finance", "SELECT id, voucher_id, account_code, account_name, description, debit, credit, created_at FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY created_at"),
    )
    .bind(voucher_id)
    .fetch_all(&mut scope)
    .await;
    match rows {
        Ok(rs) => {
            let items: Vec<serde_json::Value> = rs
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.try_get::<Uuid, _>("id").ok(),
                        "voucher_id": r.try_get::<Uuid, _>("voucher_id").ok(),
                        "account_code": r.try_get::<String, _>("account_code").ok(),
                        "account_name": r.try_get::<String, _>("account_name").ok(),
                        "description": r.try_get::<String, _>("description").ok(),
                        "debit": r.try_get::<Decimal, _>("debit").ok(),
                        "credit": r.try_get::<Decimal, _>("credit").ok(),
                    })
                })
                .collect();
            ApiResponse::success(serde_json::Value::Array(items), "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/items",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "get /api/finance/vouchers/{voucher_id}/items"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_voucher_items(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rows = sqlx::query(
        only_own_schema_query!("finance", "SELECT id, voucher_id, account_code, account_name, description, debit, credit, created_at FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY created_at"),
    )
    .bind(voucher_id)
    .fetch_all(&mut scope)
    .await;
    match rows {
        Ok(rs) => {
            let items: Vec<serde_json::Value> = rs
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.try_get::<Uuid, _>("id").ok(),
                        "voucher_id": r.try_get::<Uuid, _>("voucher_id").ok(),
                        "account_code": r.try_get::<String, _>("account_code").ok(),
                        "account_name": r.try_get::<String, _>("account_name").ok(),
                        "description": r.try_get::<String, _>("description").ok(),
                        "debit": r.try_get::<Decimal, _>("debit").ok(),
                        "credit": r.try_get::<Decimal, _>("credit").ok(),
                    })
                })
                .collect();
            ApiResponse::success(serde_json::Value::Array(items), "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:create"])),
    path = "/vouchers/batch",
    tag = "Voucher",
    request_body = BatchCreateVouchersRequest,
    responses(
        (status = 200, description = "批量创建凭证成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn batch_create_vouchers(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<BatchCreateVouchersRequest>,
) -> ApiResponse<serde_json::Value> {
    let results: Vec<serde_json::Value> = req
        .vouchers
        .iter()
        .map(|_| {
            serde_json::json!({
                "success": false,
                "error": "批量创建尚未实现",
            })
        })
        .collect();
    ApiResponse::success(serde_json::json!({"results": results}), "批量创建完成")
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/batch-delete",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/vouchers/batch-delete"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_delete_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<BatchDeleteVouchersRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut deleted = 0i64;
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    for id_str in &req.ids {
        if let Ok(id) = Uuid::parse_str(id_str) {
            // 逐 id 独立 SAVEPOINT：保留原「单个失败只影响自己、其余照常提交」语义（K14）。
            let mut scope = match state.db.scope_savepoint(&mut *txn).await {
                Ok(s) => s,
                Err(e) => return crate::shared::err_resp(e),
            };
            let res = sqlx::query(only_own_schema_query!(
                "finance",
                "DELETE FROM finance.core_finance_vouchers WHERE id = $1 AND tenant_id = $2"
            ))
            .bind(id)
            .bind(tenant_id)
            .execute(&mut scope)
            .await;
            match res {
                Ok(r) => {
                    deleted += r.rows_affected() as i64;
                    if let Err(e) = scope.commit().await {
                        return crate::shared::err_resp(e);
                    }
                }
                Err(_) => {
                    let _ = scope.rollback().await;
                }
            }
        }
    }
    ApiResponse::success(
        serde_json::json!({"deleted": deleted, "total": req.ids.len()}),
        "批量删除完成",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/unapprove",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "post /api/finance/vouchers/{voucher_id}/unapprove"), (status = 500, description = "服务内部错误")),
)]
pub async fn unapprove_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(voucher_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let res = sqlx::query(only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET status = 'submitted', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status IN ('approved', 'posted') AND deleted_at IS NULL"))
        .bind(voucher_id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                ApiResponse::conflict("凭证不存在、已删除或状态不允许反审核")
            } else {
                ApiResponse::success(
                    serde_json::json!({"voucher_id": voucher_id, "status": "submitted"}),
                    "反审核成功",
                )
            }
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/{voucher_id}/reverse",
    tag = "Auto-Backfill",
    params(
        ("voucher_id" = String, Path, description = "voucher_id"),
    ),
    responses((status = 200, description = "post /api/finance/vouchers/{voucher_id}/reverse"), (status = 500, description = "服务内部错误")),
)]
pub async fn reverse_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(voucher_id): Path<Uuid>,
    Json(req): Json<ReverseVoucherRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let reversal_id = Uuid::new_v4();
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let res = sqlx::query(only_own_schema_query!("finance", "INSERT INTO finance.core_finance_vouchers (id, tenant_id, company_id, voucher_no, voucher_date, period, voucher_type, description, status, created_by, created_at, updated_at) SELECT $1, $2, company_id, CONCAT('RV-', voucher_no), voucher_date, period, voucher_type, CONCAT('红冲: ', description), 'draft', created_by, NOW(), NOW() FROM finance.core_finance_vouchers WHERE id = $3 AND tenant_id = $2"))
        .bind(reversal_id)
        .bind(tenant_id)
        .bind(voucher_id)
        .execute(&mut scope)
        .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                ApiResponse::not_found("凭证不存在")
            } else {
                ApiResponse::success(
                    serde_json::json!({"reversal_voucher_id": reversal_id, "original_voucher_id": voucher_id, "reason": req.reason}),
                    "红冲成功",
                )
            }
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/next-no",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/vouchers/next-no"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_next_voucher_no(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<NextVoucherNoQuery>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let prefix = format!(
        "{}-",
        params.voucher_type.unwrap_or_else(|| "GEN".to_string())
    );
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let count: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE tenant_id = $1"
    ))
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let voucher_no = format!("{}{:06}", prefix, count + 1);
    ApiResponse::success(serde_json::json!({"voucher_no": voucher_no}), "查询成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/generate",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/vouchers/generate"), (status = 500, description = "服务内部错误")),
)]
pub async fn generate_voucher_by_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<GenerateVoucherRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let template_id = match Uuid::parse_str(&req.template_id) {
        Ok(id) => id,
        Err(_) => return ApiResponse::bad_request("无效的模板ID"),
    };
    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service
        .get_voucher_template(tenant_id, template_id, txn)
        .await
    {
        Ok(template) => {
            let voucher_id = Uuid::new_v4();
            ApiResponse::success(
                serde_json::json!({
                    "voucher_id": voucher_id,
                    "template_id": template_id,
                    "template_name": template.name,
                    "status": "draft",
                }),
                "生成成功",
            )
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:create"])),
    path = "/vouchers/import",
    tag = "Voucher",
    responses(
        (status = 200, description = "导入凭证成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn import_vouchers_general(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    mut multipart: Multipart,
) -> ApiResponse<serde_json::Value> {
    let mut file_content: Option<Vec<u8>> = None;
    loop {
        let field = match multipart.next_field().await {
            Ok(Some(field)) => field,
            Ok(None) => break,
            Err(e) => {
                return ApiResponse::from(TopemsError::FileFormatError(format!(
                    "解析上传文件失败: {}",
                    e
                )))
            }
        };
        if field.name() == Some("file") {
            let data = match field.bytes().await {
                Ok(data) => data,
                Err(e) => {
                    return ApiResponse::from(TopemsError::FileFormatError(format!(
                        "读取上传文件内容失败: {}",
                        e
                    )))
                }
            };
            file_content = Some(data.to_vec());
        }
    }
    let Some(file_data) = file_content else {
        return ApiResponse::bad_request("缺少 file 字段");
    };
    // 该端点此前解析完文件就返回 {"total":0,"success":0} + 「导入完成」——一条都没写却报成功。
    // 落库分支同样未实现：/vouchers/import/u8 与 /u8-import/import 都只做到「显形失败」，
    // 所以这里不再指向另一个假成功端点，统一指向会给出明确失败的那个。
    ApiResponse::error(
        501,
        &format!(
            "凭证导入暂未实现（X-Stub）：已收到 {} 字节，但未写入任何凭证；批量导入接口为 /api/finance/u8-import/import（当前亦未实现落库）",
            file_data.len()
        ),
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/vouchers/import/u8",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/vouchers/import/u8"), (status = 500, description = "服务内部错误")),
)]
pub async fn import_vouchers_u8(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    // 此端点以前只生成一个 uuid，返回 status=pending / 0/0/0 + 「导入已提交」，
    // 既不解析 file_content 也不落库——前端会以为批次已进队列，实际什么都没发生。
    // 现在的口径：显形为未实现。批量导入请走 /api/finance/u8-import/import
    // （会真实校验入参、落批次记录；单张落库同样未实现，会明确回失败而不是 completed）。
    let file_name = req.get("file_name").and_then(|v| v.as_str()).unwrap_or("");
    ApiResponse::error(
        501,
        &format!(
            "凭证导入暂未实现（X-Stub）：未解析文件 {}{}，请改用 /api/finance/u8-import/import",
            if file_name.is_empty() {
                "<未提供>"
            } else {
                file_name
            },
            req.get("file_content")
                .and_then(|v| v.as_str())
                .map(|c| format!("（收到 {} 字符）", c.len()))
                .unwrap_or_default()
        ),
    )
}

// ========== RC4a 补齐: 会计期间接口 ==========

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/api/finance/period/current",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/period/current"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_current_period(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let now = Utc::now();
    ApiResponse::success(
        serde_json::json!({
            "period": format!("{:04}-{:02}", now.year(), now.month()),
            "year": now.year(),
            "month": now.month(),
        }),
        "查询成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/api/finance/periods",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/periods"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_periods(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<PeriodListQuery>,
) -> ApiResponse<serde_json::Value> {
    let now = Utc::now();
    let year = params.year.unwrap_or(now.year());
    let status_filter = match params.status.as_deref() {
        None => None,
        Some(raw) => match PeriodStatus::from_db_str(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("status 仅支持 open / closing / closed"),
        },
    };

    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    // 以前这里完全不查库，按“当前月份”推导 open/closed/locked，
    // 既会伪造未开账期间的 closed 状态，又返回了枚举中不存在的 locked。
    // 现在直接读取真实期间表，状态和起止日期都以库内记录为准。
    let rows = sqlx::query_as::<
        _,
        (
            String,
            i32,
            i32,
            PeriodStatus,
            DateTime<Utc>,
            DateTime<Utc>,
            Option<DateTime<Utc>>,
        ),
    >(only_own_schema_query!(
        "finance",
        "SELECT period_name, year, month, status, start_date, end_date, closed_at \
             FROM finance.core_finance_periods \
             WHERE tenant_id = $1 AND year = $2 AND deleted_at IS NULL \
               AND ($3::text IS NULL OR status::text = $3) \
             ORDER BY month"
    ))
    .bind(tenant_id)
    .bind(year)
    .bind(status_filter.map(|s| s.as_db_str()))
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows
                .into_iter()
                .map(
                    |(period_name, year, month, status, start_date, end_date, closed_at)| {
                        serde_json::json!({
                            "period": period_name,
                            "year": year,
                            "month": month,
                            "start_date": start_date,
                            "end_date": end_date,
                            "status": status.as_db_str(),
                            "closed_at": closed_at,
                        })
                    },
                )
                .collect();
            ApiResponse::success(serde_json::json!({"items": items}), "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:period:write"])),
    path = "/periods/open",
    tag = "Finance",
    request_body = PeriodActionRequest,
    responses(
        (status = 200, description = "开启会计期间成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "period 或状态非法"),
        (status = 409, description = "期间正在结账，不能直接重开"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn open_period_v2(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<PeriodActionRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    // period 兼容 "YYYYMM" 与旧 "YYYY-MM"；核心表以 (tenant_id, year, month) 为唯一键。
    let period = req.period.unwrap_or_default();
    let Some((year, month)) = parse_period_ym(&period) else {
        return ApiResponse::bad_request("period 格式应为 YYYYMM（兼容 YYYY-MM）");
    };
    let period_name = format!("{:04}{:02}", year, month);
    let month_u32 = match u32::try_from(month) {
        Ok(v) => v,
        Err(_) => return ApiResponse::bad_request("period 年月非法"),
    };
    let start = match chrono::NaiveDate::from_ymd_opt(year, month_u32, 1) {
        Some(d) => d,
        None => return ApiResponse::bad_request("period 年月非法"),
    };
    let next_month = if month_u32 == 12 {
        chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        chrono::NaiveDate::from_ymd_opt(year, month_u32 + 1, 1)
    };
    let Some(next_month) = next_month else {
        return ApiResponse::bad_request("period 年月非法");
    };
    let end = next_month - chrono::Duration::days(1);
    let start_date = start.format("%Y-%m-%d").to_string();
    let end_date = end.format("%Y-%m-%d").to_string();

    // 开启前先读真实状态：open 幂等；closed 允许重开并清空关闭痕迹；
    // closing 正在结账，禁止直接改回 open。旧实现无条件 UPDATE status='open'，
    // 会把任何已关闭期间静默重开。
    let current = sqlx::query_scalar::<_, PeriodStatus>(only_own_schema_query!(
        "finance",
        "SELECT status FROM finance.core_finance_periods \
             WHERE tenant_id = $1 AND year = $2 AND month = $3 AND deleted_at IS NULL"
    ))
    .bind(tenant_id)
    .bind(year)
    .bind(month)
    .fetch_optional(&mut scope)
    .await;

    let current = match current {
        Ok(v) => v,
        Err(e) => return crate::shared::err_resp(e),
    };

    match current {
        None => {
            let res = sqlx::query(only_own_schema_query!(
                "finance",
                "INSERT INTO finance.core_finance_periods \
                 (tenant_id, year, month, period_name, status, start_date, end_date, created_at, updated_at) \
                 VALUES ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, NOW(), NOW())"
            ))
            .bind(tenant_id)
            .bind(year)
            .bind(month)
            .bind(&period_name)
            .bind(PeriodStatus::Open)
            .bind(&start_date)
            .bind(&end_date)
            .execute(&mut scope)
            .await;
            match res {
                Ok(_) => ApiResponse::success(
                    serde_json::json!({"period": period_name, "status": "open"}),
                    "开启成功",
                ),
                Err(e) => crate::shared::err_resp(e),
            }
        }
        Some(PeriodStatus::Open) => ApiResponse::success(
            serde_json::json!({"period": period_name, "status": "open"}),
            "期间已处于开启状态",
        ),
        Some(PeriodStatus::Closing) => {
            ApiResponse::conflict("期间正在结账（closing），不能直接重开；请先完成或撤销结账流程")
        }
        Some(PeriodStatus::Closed) => {
            let res = sqlx::query(only_own_schema_query!(
                "finance",
                "UPDATE finance.core_finance_periods \
                 SET status = $4, closed_at = NULL, closed_by = NULL, updated_at = NOW() \
                 WHERE tenant_id = $1 AND year = $2 AND month = $3 AND deleted_at IS NULL \
                   AND status = $5"
            ))
            .bind(tenant_id)
            .bind(year)
            .bind(month)
            .bind(PeriodStatus::Open)
            .bind(PeriodStatus::Closed)
            .execute(&mut scope)
            .await;
            match res {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("期间状态已变化，请刷新后重试")
                }
                Ok(_) => ApiResponse::success(
                    serde_json::json!({"period": period_name, "status": "open"}),
                    "期间已重开",
                ),
                Err(e) => crate::shared::err_resp(e),
            }
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:period:write"])),
    path = "/api/finance/periods/close",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/periods/close"), (status = 500, description = "服务内部错误")),
)]
pub async fn close_period_v2(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<PeriodActionRequest>,
) -> ApiResponse<serde_json::Value> {
    let period = req.period.unwrap_or_default();
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    // period 兼容 "YYYYMM" 与旧 "YYYY-MM"；target 表列为 year/month，按 (tenant_id, year, month) 定位。
    let Some((year, month)) = parse_period_ym(&period) else {
        return ApiResponse::bad_request("period 格式应为 YYYYMM（兼容 YYYY-MM）");
    };
    let period_name = format!("{:04}{:02}", year, month);

    let current = sqlx::query_scalar::<_, PeriodStatus>(only_own_schema_query!(
        "finance",
        "SELECT status FROM finance.core_finance_periods \
             WHERE tenant_id = $1 AND year = $2 AND month = $3 AND deleted_at IS NULL"
    ))
    .bind(tenant_id)
    .bind(year)
    .bind(month)
    .fetch_optional(&mut scope)
    .await;
    let current = match current {
        Ok(v) => v,
        Err(e) => return crate::shared::err_resp(e),
    };
    let current_status = match current {
        None => return ApiResponse::not_found("会计期间不存在"),
        // 已关闭期间重复关闭按幂等成功处理，避免前端重试产生虚假失败。
        Some(PeriodStatus::Closed) => {
            return ApiResponse::success(
                serde_json::json!({"period": period_name, "status": "closed"}),
                "期间已处于关闭状态",
            )
        }
        Some(status @ (PeriodStatus::Open | PeriodStatus::Closing)) => status,
    };

    let res = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.core_finance_periods \
         SET status = $4, closed_at = COALESCE(closed_at, NOW()), closed_by = COALESCE(closed_by, $5), updated_at = NOW() \
         WHERE tenant_id = $1 AND year = $2 AND month = $3 AND deleted_at IS NULL \
           AND status = $6"
    ))
    .bind(tenant_id)
    .bind(year)
    .bind(month)
    .bind(PeriodStatus::Closed)
    .bind(&claims.username)
    .bind(&current_status)
    .execute(&mut scope)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                ApiResponse::conflict("期间状态已变化，请刷新后重试")
            } else {
                ApiResponse::success(
                    serde_json::json!({"period": period_name, "status": "closed"}),
                    "关闭成功",
                )
            }
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:period:write"])),
    path = "/api/finance/periods/close-income",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/periods/close-income"), (status = 500, description = "服务内部错误")),
)]
pub async fn close_income_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    headers: HeaderMap,
    Json(req): Json<PeriodActionRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let period = req.period.unwrap_or_default();
    if period.is_empty() {
        return ApiResponse::bad_request("period 不能为空（YYYY-MM 或 YYYYMM）");
    }
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .close_income_period(tenant_id, &period, &claims.username, None, locale, txn)
        .await
    {
        Ok(result) => ApiResponse::success(serde_json::json!(result), "损益结转成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:period:write"])),
    path = "/periods/year-end-close",
    tag = "Finance",
    request_body = PeriodActionRequest,
    responses(
        (status = 200, description = "年结成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn year_end_close_v2(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    headers: HeaderMap,
    Json(req): Json<PeriodActionRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let year = req.year.unwrap_or_else(|| Utc::now().year());
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .year_end_close(tenant_id, year, &claims.username, None, locale, txn)
        .await
    {
        Ok(result) => ApiResponse::success(serde_json::json!(result), "年结成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== RC4a 补齐: AR/AP 别名与对账接口 ==========

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/ar/aging",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/ar/aging"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_ar_aging(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(_params): Query<ArAgingQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_aging_summary(tenant_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/ap/aging",
    tag = "Payable",
    params(ArAgingQuery),
    responses(
        (status = 200, description = "获取应付账龄分析成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_ap_aging(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(_params): Query<ArAgingQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    match service.get_aging_summary(tenant_id, txn).await {
        Ok(data) => ApiResponse::success(data, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ==================== RC4a 补齐: 科目扩展 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/accounts/tree",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/accounts/tree"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_account_tree(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let category = params.get("category").and_then(|v| v.as_str());
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rows = sqlx::query(
        only_own_schema_query!("finance", "SELECT id, code, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, category, level, is_leaf, status FROM finance.core_finance_accounts WHERE ($1::text IS NULL OR category = $1) ORDER BY code"),
    )
    .bind(category)
    .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut scope)
    .await;
    match rows {
        Ok(rs) => {
            let items: Vec<serde_json::Value> = rs
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.try_get::<uuid::Uuid, _>("id").ok(),
                        "code": r.try_get::<String, _>("code").ok(),
                        "name": r.try_get::<String, _>("name").ok(),
                        "parent_id": r.try_get::<Option<uuid::Uuid>, _>("parent_id").ok(),
                        "category": r.try_get::<String, _>("category").ok(),
                        "level": r.try_get::<i32, _>("level").ok(),
                        "is_leaf": r.try_get::<bool, _>("is_leaf").ok(),
                        "status": r.try_get::<String, _>("status").ok(),
                    })
                })
                .collect();
            ApiResponse::success(serde_json::Value::Array(items), "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

fn normalize_account_status(raw: &str) -> Option<&'static str> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "active" => Some("active"),
        "inactive" => Some("inactive"),
        "archived" => Some("archived"),
        _ => None,
    }
}

/// archived 为终态；active ↔ inactive 可互调，二者均可归档。
fn account_transition_allowed(from: &str, to: &str) -> bool {
    from == to
        || (from == "active" && matches!(to, "inactive" | "archived"))
        || (from == "inactive" && matches!(to, "active" | "archived"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:account:update"])),
    path = "/api/finance/accounts/{account_id}",
    tag = "Auto-Backfill",
    params(
        ("account_id" = String, Path, description = "account_id"),
    ),
    responses((status = 200, description = "put /api/finance/accounts/{account_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(account_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<Account> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let current = sqlx::query_as::<_, (Option<String>, bool)>(only_own_schema_query!(
        "finance",
        "SELECT status, is_enabled FROM finance.core_finance_accounts \
         WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"
    ))
    .bind(account_id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    let current = match current {
        Ok(Some(v)) => v,
        Ok(None) => return ApiResponse::not_found("会计科目不存在"),
        Err(e) => return crate::shared::err_resp(e),
    };
    let current_raw = current.0.unwrap_or_else(|| "active".to_string());
    let Some(current_status) = normalize_account_status(&current_raw) else {
        return ApiResponse::conflict("会计科目状态不在规范集合内");
    };

    let target_status = match req.get("status").and_then(|v| v.as_str()) {
        None => current_status,
        Some(raw) => match normalize_account_status(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("status 仅支持 active / inactive / archived"),
        },
    };

    if current_status == "archived" {
        return ApiResponse::conflict("会计科目已归档，不可再编辑");
    }
    if !account_transition_allowed(current_status, target_status) {
        return ApiResponse::conflict("会计科目状态流转不合法");
    }

    let requested_enabled = req.get("is_enabled").and_then(|v| v.as_bool());
    if target_status == "active" && requested_enabled == Some(false) {
        return ApiResponse::bad_request(
            "启用状态请通过 status=inactive 停用，不能 active + is_enabled=false",
        );
    }
    if target_status != "active" && requested_enabled == Some(true) {
        return ApiResponse::bad_request("停用/归档科目不能设置 is_enabled=true");
    }
    let effective_enabled = if target_status != current_status {
        Some(target_status == "active")
    } else {
        requested_enabled
    };

    let name = req
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty());
    let name_en = req.get("name_en").and_then(|v| v.as_str());
    let description = req.get("description").and_then(|v| v.as_str());

    let result = sqlx::query_as::<_, Account>(only_own_schema_query!(
        "finance",
        "UPDATE finance.core_finance_accounts \
         SET name = COALESCE($2, name), \
             name_en = COALESCE($3, name_en), \
             description = COALESCE($4, description), \
             is_enabled = COALESCE($5, is_enabled), \
             status = COALESCE($6, status), \
             updated_at = NOW() \
         WHERE id = $1 AND tenant_id = $7::uuid AND deleted_at IS NULL \
           AND status IS NOT DISTINCT FROM $8 \
         RETURNING id, tenant_id, code, name, parent_id, account_type, level, currency, \
                   is_enabled, description, name_en, full_name, balance_direction, type, \
                   parent_code, haschildren, is_cash_flow, enable_quantity, unit, \
                   enable_foreign_currency, default_currency, is_detail, status, \
                   created_by, updated_by, created_at, updated_at"
    ))
    .bind(account_id)
    .bind(name)
    .bind(name_en)
    .bind(description)
    .bind(effective_enabled)
    .bind(Some(target_status))
    .bind(tenant_id)
    .bind(Some(current_raw))
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(account)) => ApiResponse::success(account, "更新成功"),
        Ok(None) => ApiResponse::conflict("会计科目状态已变化，请刷新后重试"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:account:delete"])),
    path = "/api/finance/accounts/{account_id}",
    tag = "Auto-Backfill",
    params(
        ("account_id" = String, Path, description = "account_id"),
    ),
    responses((status = 200, description = "delete /api/finance/accounts/{account_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(account_id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let current = sqlx::query_scalar::<_, Option<String>>(only_own_schema_query!(
        "finance",
        "SELECT status FROM finance.core_finance_accounts \
         WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"
    ))
    .bind(account_id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    let current = match current {
        Ok(Some(v)) => v.unwrap_or_else(|| "active".to_string()),
        Ok(None) => return ApiResponse::not_found("会计科目不存在"),
        Err(e) => return crate::shared::err_resp(e),
    };
    let Some(current_status) = normalize_account_status(&current) else {
        return ApiResponse::conflict("会计科目状态不在规范集合内");
    };
    if current_status == "active" {
        return ApiResponse::conflict("启用中的会计科目不可删除，请先停用或归档");
    }

    let deps = sqlx::query_as::<_, (i64, i64, i64, i64)>(only_own_schema_query!(
        "finance",
        "SELECT \
           (SELECT COUNT(*) FROM finance.core_finance_accounts \
              WHERE parent_id = $1 AND deleted_at IS NULL), \
           (SELECT COUNT(*) FROM finance.core_finance_voucher_lines WHERE account_id = $1), \
           (SELECT COUNT(*) FROM finance.core_finance_ledger WHERE account_id = $1), \
           (SELECT COUNT(*) FROM finance.core_finance_aux_balances WHERE account_id = $1)"
    ))
    .bind(account_id)
    .fetch_one(&mut scope)
    .await;
    let (children, voucher_lines, ledger_rows, aux_rows) = match deps {
        Ok(v) => v,
        Err(e) => return crate::shared::err_resp(e),
    };
    if children + voucher_lines + ledger_rows + aux_rows > 0 {
        return ApiResponse::conflict(
            "会计科目仍被下级科目、凭证分录、总账或辅助核算余额引用，不可删除",
        );
    }

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.core_finance_accounts \
         SET deleted_at = NOW(), updated_at = NOW() \
         WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL AND status = $3"
    ))
    .bind(account_id)
    .bind(tenant_id)
    .bind(current_status)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("会计科目状态已变化，请刷新后重试")
        }
        Ok(_) => ApiResponse::success(String::new(), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// B342: 批量创建下级科目。
/// 旧实现只把请求体原样回显并返回“批量创建成功”，不写库，属于假成功入口。
/// 现改为：父科目必须存在且未软删；每个子科目强制 parent_id=路径参数、
/// level=父级 +1、account_type 缺省继承父级、currency 缺省 CNY；
/// 单次上限 500 条；编码重复按 23505 转 409 并指明具体编码。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:account:create"])),
    path = "/api/finance/accounts/{account_id}/children-batch",
    tag = "Auto-Backfill",
    params(
        ("account_id" = String, Path, description = "account_id"),
    ),
    responses((status = 200, description = "post /api/finance/accounts/{account_id}/children-batch"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_create_account_children(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(account_id): Path<Uuid>,
    Json(req): Json<BatchCreateAccountChildrenRequest>,
) -> ApiResponse<Vec<Account>> {
    if req.accounts.is_empty() {
        return ApiResponse::bad_request("accounts 不能为空");
    }
    if req.accounts.len() > 500 {
        return ApiResponse::bad_request("单次最多创建 500 个下级科目");
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let parent: Option<(i32, AccountType, bool)> = match sqlx::query_as(only_own_schema_query!(
        "finance",
        "SELECT level, account_type, is_enabled FROM finance.core_finance_accounts \
             WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"
    ))
    .bind(account_id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(row) => row,
        Err(e) => return crate::shared::err_resp(e),
    };
    let Some((parent_level, parent_type, parent_enabled)) = parent else {
        return ApiResponse::not_found("父科目不存在或已删除");
    };
    if !parent_enabled {
        return ApiResponse::bad_request("父科目已停用，不能创建下级科目");
    }

    let mut created: Vec<Account> = Vec::with_capacity(req.accounts.len());
    for item in req.accounts {
        let code = item.code.trim().to_string();
        let name = item.name.trim().to_string();
        if code.is_empty() || name.is_empty() {
            return ApiResponse::bad_request("子科目编码和名称不能为空");
        }
        let account_type = item.account_type.unwrap_or(parent_type.clone());
        let currency = item
            .currency
            .filter(|c| !c.trim().is_empty())
            .unwrap_or_else(|| "CNY".to_string());
        let row: Result<Account, sqlx::Error> = sqlx::query_as(
            only_own_schema_query!(
                "finance",
                "INSERT INTO finance.core_finance_accounts \
                 (tenant_id, code, name, parent_id, account_type, level, currency, description, name_en) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) \
                 RETURNING *"
            ),
        )
        .bind(tenant_id)
        .bind(&code)
        .bind(&name)
        .bind(account_id)
        .bind(account_type)
        .bind(parent_level + 1)
        .bind(&currency)
        .bind(item.description)
        .bind(item.name_en)
        .fetch_one(&mut scope)
        .await;
        match row {
            Ok(account) => created.push(account),
            Err(e) => {
                if e.as_database_error().and_then(|db| db.code()).as_deref() == Some("23505") {
                    return ApiResponse::conflict(&format!(
                        "科目编码 {} 已存在，请调整后重试（本批未写入）",
                        code
                    ));
                }
                return crate::shared::err_resp(e);
            }
        }
    }

    let touched = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.core_finance_accounts \
         SET haschildren = TRUE, is_leaf = FALSE, updated_at = NOW() \
         WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"
    ))
    .bind(account_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    match touched {
        Ok(r) if r.rows_affected() == 1 => {}
        Ok(_) => return ApiResponse::conflict("父科目状态已变化，本批未写入"),
        Err(e) => return crate::shared::err_resp(e),
    }

    if let Err(e) = scope.commit().await {
        return crate::shared::err_resp(e);
    }

    let count = created.len();
    ApiResponse::success(created, &format!("批量创建成功（{} 个）", count))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:opening_balance:read"])),
    path = "/api/finance/accounts/opening-balances",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/accounts/opening-balances"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_opening_balances(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let company_id = params
        .get("company_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let period = params
        .get("period")
        .and_then(|v| v.as_str())
        .map(|s| s.replace('-', ""));
    let subject_code = params
        .get("subject_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let page: i64 = params
        .get("page")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or(1);
    let page_size: i64 = params
        .get("page_size")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);
    let offset = (page - 1).max(0) * page_size;

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rows: Result<
        Vec<(
            Uuid,
            Uuid,
            String,
            Option<String>,
            String,
            f64,
            f64,
            Option<Uuid>,
            chrono::DateTime<chrono::Utc>,
            chrono::DateTime<chrono::Utc>,
        )>,
        sqlx::Error,
    > = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, company_id, subject_code, subject_name, period,
                   debit_balance::float8, credit_balance::float8, tenant_id, created_at, updated_at
            FROM finance.opening_balances
            WHERE deleted_at IS NULL
              AND ($1::uuid IS NULL OR company_id = $1)
              AND ($2::text IS NULL OR period = $2)
              AND ($3::text IS NULL OR subject_code = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5"#
    ))
    .bind(company_id)
    .bind(&period)
    .bind(&subject_code)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(items) => {
            let total: i64 = match sqlx::query_scalar(only_own_schema_query!(
                "finance",
                r#"SELECT COUNT(*) FROM finance.opening_balances
                   WHERE deleted_at IS NULL
                     AND ($1::uuid IS NULL OR company_id = $1)
                     AND ($2::text IS NULL OR period = $2)
                     AND ($3::text IS NULL OR subject_code = $3)"#
            ))
            .bind(company_id)
            .bind(&period)
            .bind(&subject_code)
            .fetch_one(&mut scope)
            .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("[finance] 查询失败: {}", e);
                    return crate::shared::err_resp(e);
                }
            };

            let list: Vec<serde_json::Value> = items
                .into_iter()
                .map(
                    |(id, cid, code, name, p, debit, credit, tid, created_at, updated_at)| {
                        serde_json::json!({
                            "id": id, "company_id": cid, "subject_code": code,
                            "subject_name": name, "period": p,
                            "debit_balance": debit, "credit_balance": credit,
                            "tenant_id": tid, "created_at": created_at, "updated_at": updated_at,
                        })
                    },
                )
                .collect();
            ApiResponse::success(
                serde_json::json!({"items": list, "total": total}),
                "查询成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to get opening balances: {}", e);
            ApiResponse::from(TopemsError::internal("查询失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:opening_balance:read"])),
    path = "/api/finance/accounts/opening-balances/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get /api/finance/accounts/opening-balances/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_opening_balance(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let row: Result<
        Option<(
            Uuid,
            Uuid,
            String,
            Option<String>,
            String,
            f64,
            f64,
            Option<Uuid>,
            chrono::DateTime<chrono::Utc>,
            chrono::DateTime<chrono::Utc>,
        )>,
        sqlx::Error,
    > = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, company_id, subject_code, subject_name, period,
                  debit_balance::float8, credit_balance::float8, tenant_id, created_at, updated_at
           FROM finance.opening_balances
           WHERE id = $1 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some((id, cid, code, name, p, debit, credit, tid, created_at, updated_at))) => {
            ApiResponse::success(
                serde_json::json!({
                    "id": id, "company_id": cid, "subject_code": code,
                    "subject_name": name.unwrap_or_default(), "period": p,
                    "debit_balance": debit, "credit_balance": credit,
                    "tenant_id": tid, "created_at": created_at, "updated_at": updated_at,
                }),
                "查询成功",
            )
        }
        Ok(None) => ApiResponse::not_found("期初余额不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:opening_balance:update"])),
    path = "/api/finance/accounts/opening-balances/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "put /api/finance/accounts/opening-balances/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_opening_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    // W5-B：写路径不依赖 RLS 隐式过滤，显式带租户谓词（防 scope 被系统上下文绕过）。
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let period = req
        .get("period")
        .and_then(|v| v.as_str())
        .map(|s| s.replace('-', ""));
    let debit_balance: Option<f64> = req.get("debit_balance").and_then(|v| v.as_f64());
    let credit_balance: Option<f64> = req.get("credit_balance").and_then(|v| v.as_f64());
    let subject_name: Option<String> = req
        .get("subject_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let row: Result<
        Option<(
            Uuid,
            Uuid,
            String,
            Option<String>,
            String,
            f64,
            f64,
            Option<Uuid>,
            chrono::DateTime<chrono::Utc>,
            chrono::DateTime<chrono::Utc>,
        )>,
        sqlx::Error,
    > = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.opening_balances SET
               debit_balance = COALESCE($2, debit_balance),
               credit_balance = COALESCE($3, credit_balance),
               subject_name = COALESCE($4, subject_name),
               period = COALESCE($5, period),
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $6::uuid AND deleted_at IS NULL
           RETURNING id, company_id, subject_code, subject_name, period,
                     debit_balance::float8, credit_balance::float8, tenant_id, created_at, updated_at"#
    ))
    .bind(id)
    .bind(debit_balance)
    .bind(credit_balance)
    .bind(subject_name)
    .bind(period)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some((id, cid, code, name, p, debit, credit, tid, created_at, updated_at))) => {
            ApiResponse::success(
                serde_json::json!({
                    "id": id, "company_id": cid, "subject_code": code,
                    "subject_name": name.unwrap_or_default(), "period": p,
                    "debit_balance": debit, "credit_balance": credit,
                    "tenant_id": tid, "created_at": created_at, "updated_at": updated_at,
                }),
                "更新成功",
            )
        }
        Ok(None) => ApiResponse::not_found("期初余额不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:opening_balance:delete"])),
    path = "/api/finance/accounts/opening-balances/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "delete /api/finance/accounts/opening-balances/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_opening_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    // W5-B：软删同样显式带租户谓词，跨租户 id 统一 404。
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let res = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.opening_balances SET deleted_at = NOW()
           WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    match res {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success(String::new(), "删除成功"),
        Ok(_) => ApiResponse::not_found("期初余额不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:opening_balance:create"])),
    path = "/api/finance/accounts/opening-balances/batch",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/accounts/opening-balances/batch"), (status = 500, description = "服务内部错误")),
)]
pub async fn import_opening_balances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(rows): Json<Vec<serde_json::Value>>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let mut success_count = 0;
    let mut failed_count = 0;
    let mut errors: Vec<String> = Vec::new();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };

    for (idx, row) in rows.iter().enumerate() {
        let Some(company_id) = row
            .get("company_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok())
        else {
            failed_count += 1;
            errors.push(format!("第 {} 行: company_id 必填/非法", idx + 1));
            continue;
        };
        let subject_code = row
            .get("subject_code")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        if subject_code.is_empty() {
            failed_count += 1;
            errors.push(format!("第 {} 行: subject_code 必填", idx + 1));
            continue;
        }
        let period = row
            .get("period")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .replace('-', "");
        let debit_balance = row
            .get("debit_balance")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let credit_balance = row
            .get("credit_balance")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        // 逐行 SAVEPOINT：单行失败只回滚该行，其余行照常提交（K14）。
        let mut read_scope = match state.db.scope_savepoint(&mut *txn).await {
            Ok(s) => s,
            Err(e) => return crate::shared::err_resp(e),
        };
        let subject_name: Option<String> = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            "SELECT name FROM finance.core_finance_accounts WHERE code = $1 AND is_enabled = true LIMIT 1"
        ))
        .bind(&subject_code)
        .fetch_optional(&mut read_scope)
        .await
        .ok()
        .flatten();

        // P3：期初行必须带 account_id（报表按 id 归集并做一致性校验）。
        let account_id: Option<Uuid> = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            "SELECT id FROM finance.core_finance_accounts WHERE code = $1 LIMIT 1"
        ))
        .bind(&subject_code)
        .fetch_optional(&mut read_scope)
        .await
        .ok()
        .flatten();
        // 只读校验：用回滚收尾保存点，等价于原 read-only 事务「无写入即结束」，
        // 且即使查询报错也能把连接从 aborted 状态恢复，不影响后续行。
        let _ = read_scope.rollback().await;

        let mut write_scope = match state.db.scope_savepoint(&mut *txn).await {
            Ok(s) => s,
            Err(e) => return crate::shared::err_resp(e),
        };
        let res = sqlx::query(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.opening_balances
                (id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, account_id, tenant_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())"#
        ))
        .bind(Uuid::new_v4())
        .bind(company_id)
        .bind(&subject_code)
        .bind(subject_name.as_deref().unwrap_or(""))
        .bind(&period)
        .bind(debit_balance)
        .bind(credit_balance)
        .bind(account_id)
        .bind(tenant_id)
        .execute(&mut write_scope)
        .await;

        match res {
            Ok(_) => {
                success_count += 1;
                let _ = write_scope.commit().await;
            }
            Err(e) => {
                // 回滚到本行保存点，保证后续行仍可写入（原「独立事务」语义）。
                let _ = write_scope.rollback().await;
                failed_count += 1;
                errors.push(format!("第 {} 行: {}", idx + 1, e));
            }
        }
    }

    ApiResponse::success(
        serde_json::json!({
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors,
        }),
        "导入完成",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:opening_balance:create"])),
    path = "/api/finance/accounts/opening-balances",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/accounts/opening-balances"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_opening_balances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let company_id = req
        .get("company_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let Some(company_id) = company_id else {
        return ApiResponse::bad_request("company_id 必填");
    };
    let subject_code = req
        .get("subject_code")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    if subject_code.is_empty() {
        return ApiResponse::bad_request("subject_code 必填");
    }
    let period = req
        .get("period")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .replace('-', "");
    let debit_balance: f64 = req
        .get("debit_balance")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let credit_balance: f64 = req
        .get("credit_balance")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    // 科目名称（查不到则空）
    let subject_name: Option<String> = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT name FROM finance.core_finance_accounts WHERE code = $1 AND is_enabled = true LIMIT 1"
    ))
    .bind(&subject_code)
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();

    // P3：期初行必须带 account_id（报表按 id 归集并做一致性校验）。
    let account_id: Option<Uuid> = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT id FROM finance.core_finance_accounts WHERE code = $1 LIMIT 1"
    ))
    .bind(&subject_code)
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();

    let id = Uuid::new_v4();
    let now = Utc::now();
    let res = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.opening_balances
            (id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, account_id, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"#
    ))
    .bind(id)
    .bind(company_id)
    .bind(&subject_code)
    .bind(subject_name.as_deref().unwrap_or(""))
    .bind(&period)
    .bind(debit_balance)
    .bind(credit_balance)
    .bind(account_id)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .execute(&mut scope)
    .await;
    match res {
        Ok(_) => ApiResponse::success(
            serde_json::json!({"id": id, "company_id": company_id, "subject_code": subject_code, "period": period}),
            "创建成功",
        ),
        Err(e) => {
            tracing::error!("Failed to create opening balance: {}", e);
            ApiResponse::from(TopemsError::internal("创建失败", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:opening_balance:create"])),
    path = "/api/finance/accounts/{account_id}/opening-balance",
    tag = "Auto-Backfill",
    params(
        ("account_id" = String, Path, description = "account_id"),
    ),
    responses((status = 200, description = "post /api/finance/accounts/{account_id}/opening-balance"), (status = 500, description = "服务内部错误")),
)]
pub async fn set_opening_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(account_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let Some(tenant_id) = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    else {
        return ApiResponse::bad_request("缺少租户上下文");
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    // 由科目 id 解析 code/name
    let subject: Option<(String, Option<String>)> = sqlx::query_as(
        only_own_schema_query!(
            "finance",
            "SELECT code, name FROM finance.core_finance_accounts WHERE id = $1 AND is_enabled = true LIMIT 1"
        ),
    )
    .bind(account_id)
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();
    let Some((subject_code, subject_name)) = subject else {
        return ApiResponse::not_found("科目不存在");
    };
    // 记账主体：显式传入优先；否则按租户解析唯一公司（多主体 fail-closed）
    let company_id = match req
        .get("company_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(v) => v,
        None => {
            match crate::services::finance::company::resolve_tenant_company(&mut scope, tenant_id)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    return ApiResponse::from(e);
                }
            }
        }
    };
    let period = req
        .get("period")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .replace('-', "");
    let debit_balance: f64 = req
        .get("debit_balance")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let credit_balance: f64 = req
        .get("credit_balance")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    // 覆盖式更新：先软删旧行，再插入新行
    let _ = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.opening_balances SET deleted_at = NOW()
           WHERE tenant_id = $1 AND subject_code = $2 AND period = $3 AND company_id = $4"#
    ))
    .bind(tenant_id)
    .bind(&subject_code)
    .bind(&period)
    .bind(company_id)
    .execute(&mut scope)
    .await;

    let id = Uuid::new_v4();
    let now = Utc::now();
    let res = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.opening_balances
            (id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, account_id, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $11, $8, $9, $10)"#
    ))
    .bind(id)
    .bind(company_id)
    .bind(&subject_code)
    .bind(subject_name.as_deref().unwrap_or(""))
    .bind(&period)
    .bind(debit_balance)
    .bind(credit_balance)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .bind(account_id)
    .execute(&mut scope)
    .await;
    match res {
        Ok(_) => ApiResponse::success(
            serde_json::json!({"id": id, "subject_code": subject_code, "period": period}),
            "设置成功",
        ),
        Err(e) => {
            tracing::error!("Failed to set opening balance: {}", e);
            ApiResponse::from(TopemsError::internal("设置失败", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:opening_balance:create"])),
    path = "/api/finance/accounts/opening-balances/carry-forward",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/accounts/opening-balances/carry-forward"), (status = 500, description = "服务内部错误")),
)]
pub async fn carry_forward_opening_balance(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let from_period = req
        .get("from_period")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .replace('-', "");
    let to_period = req
        .get("to_period")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .replace('-', "");
    if from_period.is_empty() || to_period.is_empty() {
        return ApiResponse::bad_request("from_period / to_period 必填");
    }
    let company_id = req
        .get("company_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let res = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.opening_balances
            (id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, account_id, tenant_id, created_at, updated_at)
           SELECT gen_random_uuid(), company_id, subject_code, subject_name, $1, debit_balance, credit_balance, account_id, tenant_id, NOW(), NOW()
           FROM finance.opening_balances
           WHERE period = $2 AND deleted_at IS NULL
             AND ($3::uuid IS NULL OR company_id = $3)
           ON CONFLICT DO NOTHING"#
    ))
    .bind(&to_period)
    .bind(&from_period)
    .bind(company_id)
    .execute(&mut scope)
    .await;
    match res {
        Ok(r) => ApiResponse::success(format!("结转成功，共 {} 条", r.rows_affected()), "结转成功"),
        Err(e) => {
            tracing::error!("Failed to carry forward opening balance: {}", e);
            ApiResponse::from(TopemsError::internal("结转失败", e))
        }
    }
}

// ==================== RC4a 补齐: 交易对手财务信息 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/counterparty/customers",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/counterparty/customers"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_counterparty_customers(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(serde_json::json!({"items": [], "total": 0}), "查询成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/counterparty/customers/{customer_id}",
    tag = "Auto-Backfill",
    params(
        ("customer_id" = String, Path, description = "customer_id"),
    ),
    responses((status = 200, description = "get /api/finance/counterparty/customers/{customer_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_counterparty_customer(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(customer_id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(serde_json::json!({"customer_id": customer_id}), "查询成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:account:update"])),
    path = "/api/finance/counterparty/customers/{customer_id}",
    tag = "Auto-Backfill",
    params(
        ("customer_id" = String, Path, description = "customer_id"),
    ),
    responses((status = 200, description = "put /api/finance/counterparty/customers/{customer_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_counterparty_customer(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(customer_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({"customer_id": customer_id, "data": req}),
        "更新成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/counterparty/suppliers",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/counterparty/suppliers"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_counterparty_suppliers(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(serde_json::json!({"items": [], "total": 0}), "查询成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:account:read"])),
    path = "/api/finance/counterparty/suppliers/{supplier_id}",
    tag = "Auto-Backfill",
    params(
        ("supplier_id" = String, Path, description = "supplier_id"),
    ),
    responses((status = 200, description = "get /api/finance/counterparty/suppliers/{supplier_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_counterparty_supplier(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(supplier_id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(serde_json::json!({"supplier_id": supplier_id}), "查询成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:account:update"])),
    path = "/api/finance/counterparty/suppliers/{supplier_id}",
    tag = "Auto-Backfill",
    params(
        ("supplier_id" = String, Path, description = "supplier_id"),
    ),
    responses((status = 200, description = "put /api/finance/counterparty/suppliers/{supplier_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_counterparty_supplier(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(supplier_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({"supplier_id": supplier_id, "data": req}),
        "更新成功",
    )
}

// ==================== RC4a 补齐: 费用审批 ====================

/// 费用审批创建/更新入参。
///
/// `items` 显式声明为数组：此前用 `serde_json::Value` 接收，`items: "not-an-array"`
/// 会被静默忽略并返回 200。改为强类型后由 axum Json extractor 直接返回 422。
#[derive(Debug, Deserialize)]
pub struct ExpenseApprovalUpsert {
    expense_no: Option<String>,
    employee_id: Option<String>,
    employee_name: Option<String>,
    department: Option<String>,
    expense_date: Option<String>,
    expense_type: Option<String>,
    total_amount: Option<f64>,
    status: Option<String>,
    description: Option<String>,
    approval_note: Option<String>,
    approver_id: Option<String>,
    approver_name: Option<String>,
    items: Option<Vec<serde_json::Value>>,
}

/// 兼容 E2E/前端两种日期口径：RFC3339 与 `YYYY-MM-DD`。
fn parse_expense_date(raw: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return Some(dt.with_timezone(&Utc));
    }
    chrono::NaiveDate::parse_from_str(raw, "%Y-%m-%d")
        .ok()
        .and_then(|d| d.and_hms_opt(0, 0, 0))
        .map(|d| d.and_utc())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:expense_approval:read"])),
    path = "/expense-approvals",
    tag = "Expense Approval",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取费用审批列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_expense_approvals(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    axum::extract::Query(params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    // B349：显式租户谓词（此前只靠 RLS，缺上下文时会静默查空）
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) if !t.is_nil() => t,
        Ok(_) => return ApiResponse::bad_request("缺少租户上下文"),
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let page = params
        .get("page")
        .and_then(|v| v.as_u64())
        .unwrap_or(1)
        .max(1);
    let page_size = params
        .get("page_size")
        .and_then(|v| v.as_u64())
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;
    let search = params
        .get("search")
        .and_then(|v| v.as_str())
        .map(|s| format!("%{}%", s));
    // B361：按状态过滤时必须带历史别名（`pending_approval` 旧数据），否则这些行列不出来。
    let status_filter: Vec<&'static str> = match params.get("status").and_then(|v| v.as_str()) {
        None => ExpenseApprovalStatus::raw_values_for(&ExpenseApprovalStatus::DB_VALUES),
        Some(raw) => match ExpenseApprovalStatus::from_db_str(raw) {
            Some(status) => ExpenseApprovalStatus::raw_values_for(&[status.as_str()]),
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft/pending/approved/rejected/reimbursed",
                )
            }
        },
    };

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, expense_no, employee_id, employee_name, department, expense_date,
                  expense_type, total_amount, status, description, approver_id, approver_name,
                  approval_note, created_at, updated_at
           FROM finance.expense_approvals
           WHERE deleted_at IS NULL AND tenant_id = $5::uuid
             AND ($1::text IS NULL OR expense_no ILIKE $1 OR employee_name ILIKE $1)
             AND status = ANY($2::text[])
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
    ))
    .bind(&search)
    .bind(&status_filter)
    .bind(i64::try_from(page_size).unwrap_or(i64::MAX))
    .bind(i64::try_from(offset).unwrap_or(i64::MAX))
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows.iter().map(|row| {
                serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "expense_no": row.try_get::<String, _>("expense_no").ok(),
                    "employee_id": row.try_get::<Option<Uuid>, _>("employee_id").ok().flatten(),
                    "employee_name": row.try_get::<Option<String>, _>("employee_name").ok().flatten(),
                    "department": row.try_get::<Option<String>, _>("department").ok().flatten(),
                    "expense_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("expense_date").ok().flatten(),
                    "expense_type": row.try_get::<Option<String>, _>("expense_type").ok().flatten(),
                    "total_amount": row.try_get::<Option<rust_decimal::Decimal>, _>("total_amount").ok().flatten(),
                    "status": row.try_get::<Option<String>, _>("status").ok().flatten(),
                    "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
                    "approver_id": row.try_get::<Option<Uuid>, _>("approver_id").ok().flatten(),
                    "approver_name": row.try_get::<Option<String>, _>("approver_name").ok().flatten(),
                    "approval_note": row.try_get::<Option<String>, _>("approval_note").ok().flatten(),
                    "created_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("created_at").ok().flatten(),
                    "updated_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("updated_at").ok().flatten(),
                })
            }).collect();
            let total: i64 = match sqlx::query_scalar(only_own_schema_query!(
                "finance",
                r#"SELECT COUNT(*) FROM finance.expense_approvals
                   WHERE deleted_at IS NULL AND tenant_id = $3::uuid
                     AND ($1::text IS NULL OR expense_no ILIKE $1 OR employee_name ILIKE $1)
                     AND status = ANY($2::text[])"#
            ))
            .bind(&search)
            .bind(&status_filter)
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("[finance] 查询失败: {}", e);
                    return crate::shared::err_resp(e);
                }
            };
            ApiResponse::success(
                serde_json::json!({"items": items, "total": total, "page": page, "page_size": page_size}),
                "查询成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:expense_approval:create"])),
    path = "/expense-approvals",
    tag = "Expense Approval",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "创建费用审批成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<ExpenseApprovalUpsert>,
) -> ApiResponse<serde_json::Value> {
    // B349：缺失/非法租户直接 400，不再落到 NULL tenant_id 的历史行为
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) if !t.is_nil() => t,
        Ok(_) => return ApiResponse::bad_request("缺少租户上下文"),
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    // 必填校验：expense_no 为空串/缺失 → 400（此前空串直接落库并返回 200）
    let expense_no = match req.expense_no.as_deref().map(str::trim) {
        Some(s) if !s.is_empty() => s.to_string(),
        _ => return ApiResponse::bad_request("expense_no 必填"),
    };
    let employee_id = req
        .employee_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let employee_name = req.employee_name;
    let department = req.department;
    // 日期：缺失时沿用历史行为取当前时间；显式传入但格式非法 → 400
    let expense_date = match req.expense_date.as_deref().map(str::trim) {
        Some(s) if !s.is_empty() => match parse_expense_date(s) {
            Some(d) => d,
            None => return ApiResponse::bad_request("expense_date 格式无效"),
        },
        _ => Utc::now(),
    };
    let expense_type = req.expense_type;
    let total_amount = match req.total_amount {
        Some(v) if !v.is_finite() || v < 0.0 => {
            return ApiResponse::unprocessable("total_amount 不能为负数")
        }
        other => other,
    };
    let status = match req.status.as_deref() {
        None => ExpenseApprovalStatus::DEFAULT,
        Some(raw) => match normalize_expense_status(raw) {
            Some(status @ (ExpenseApprovalStatus::Draft | ExpenseApprovalStatus::Pending)) => {
                status
            }
            Some(_) => return ApiResponse::bad_request("新建费用审批仅支持 draft/pending"),
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft/pending/approved/rejected/reimbursed",
                )
            }
        },
    }
    .as_str()
    .to_string();
    let description = req.description;

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let result = sqlx::query(
        only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.expense_approvals (expense_no, employee_id, employee_name, department, expense_date,
                   expense_type, total_amount, status, description, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               RETURNING id, created_at"#
        )
    )
    .bind(&expense_no)
    .bind(employee_id)
    .bind(&employee_name)
    .bind(&department)
    .bind(expense_date)
    .bind(&expense_type)
    .bind(total_amount)
    .bind(&status)
    .bind(&description)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;
    match result {
        Ok(row) => {
            let id: Uuid = row.try_get("id").unwrap_or_default();
            ApiResponse::success(
                serde_json::json!({"id": id, "expense_no": expense_no, "status": status}),
                "创建成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("创建失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:expense_approval:read"])),
    path = "/expense-approvals/{id}",
    tag = "Expense Approval",
    params(("id" = String, Path, description = "费用审批ID")),
    responses(
        (status = 200, description = "获取费用审批成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "费用审批不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    // B349：显式租户谓词，跨租户 ID 一律 404
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) if !t.is_nil() => t,
        Ok(_) => return ApiResponse::bad_request("缺少租户上下文"),
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let id_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::from(TopemsError::NotFound("无效的ID".to_string())),
    };

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let row = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, expense_no, employee_id, employee_name, department, expense_date,
                      expense_type, total_amount, status, description, approver_id, approver_name,
                      approval_note, created_at, updated_at
               FROM finance.expense_approvals
               WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"#
    ))
    .bind(id_uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some(row)) => {
            let Some(status) = row
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .as_deref()
                .and_then(ExpenseApprovalStatus::from_db_str)
            else {
                return ApiResponse::conflict("费用审批状态不在规范集合内");
            };
            ApiResponse::success(
                serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "expense_no": row.try_get::<String, _>("expense_no").ok(),
                    "employee_id": row.try_get::<Option<Uuid>, _>("employee_id").ok().flatten(),
                    "employee_name": row.try_get::<Option<String>, _>("employee_name").ok().flatten(),
                    "department": row.try_get::<Option<String>, _>("department").ok().flatten(),
                    "expense_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("expense_date").ok().flatten(),
                    "expense_type": row.try_get::<Option<String>, _>("expense_type").ok().flatten(),
                    "total_amount": row.try_get::<Option<rust_decimal::Decimal>, _>("total_amount").ok().flatten(),
                    "status": status.as_str(),
                    "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
                    "approver_id": row.try_get::<Option<Uuid>, _>("approver_id").ok().flatten(),
                    "approver_name": row.try_get::<Option<String>, _>("approver_name").ok().flatten(),
                    "approval_note": row.try_get::<Option<String>, _>("approval_note").ok().flatten(),
                    "created_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("created_at").ok().flatten(),
                    "updated_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("updated_at").ok().flatten(),
                }),
                "查询成功",
            )
        }
        Ok(None) => ApiResponse::from(TopemsError::NotFound("费用审批不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:expense_approval:update"])),
    path = "/expense-approvals/{id}",
    tag = "Expense Approval",
    params(("id" = String, Path, description = "费用审批ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新费用审批成功", body = ApiResponse<serde_json::Value>),
        (status = 409, description = "当前状态不允许该操作"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<String>,
    Json(req): Json<ExpenseApprovalUpsert>,
) -> ApiResponse<serde_json::Value> {
    let id_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::not_found("费用审批不存在"),
    };
    let expense_date = match req.expense_date.as_deref().map(str::trim) {
        Some(s) if !s.is_empty() => match parse_expense_date(s) {
            Some(d) => Some(d),
            None => return ApiResponse::bad_request("expense_date 格式无效"),
        },
        _ => None,
    };
    if let Some(v) = req.total_amount {
        if !v.is_finite() || v < 0.0 {
            return ApiResponse::unprocessable("total_amount 不能为负数");
        }
    }
    let target_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match normalize_expense_status(raw) {
            Some(status) => Some(status),
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft/pending/approved/rejected/reimbursed",
                )
            }
        },
    };
    // B350：是否携带字段改写（终态记录只允许纯状态流转）。
    let editing_fields = req.expense_no.is_some()
        || req.employee_id.is_some()
        || req.employee_name.is_some()
        || req.department.is_some()
        || req
            .expense_date
            .as_deref()
            .is_some_and(|s| !s.trim().is_empty())
        || req.expense_type.is_some()
        || req.total_amount.is_some()
        || req.description.is_some()
        || req.approver_id.is_some()
        || req.approver_name.is_some()
        || req.approval_note.is_some();
    let employee_id = req
        .employee_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let approver_id = req
        .approver_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    if tenant_id.is_nil() {
        return ApiResponse::bad_request("缺少租户上下文");
    }

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let current_status = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "finance",
        "SELECT status FROM finance.expense_approvals WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"
    ))
    .bind(id_uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(status)) => match ExpenseApprovalStatus::from_db_str(&status) {
            Some(status) => status,
            None => return ApiResponse::conflict("费用审批状态不在规范集合内"),
        },
        Ok(None) => return ApiResponse::not_found("费用审批不存在"),
        Err(e) => return crate::shared::err_resp(e),
    };
    let same_or_no_target = target_status.is_none_or(|target| target == current_status);
    if same_or_no_target && !ExpenseApprovalStatus::EDITABLE.contains(&current_status.as_str()) {
        return ApiResponse::conflict("费用审批已审批/已报销，字段不可再编辑");
    }
    // B350：终态记录即使带着状态流转目标，也不允许夹带字段改写。
    // 旧逻辑只在「无目标态或同态」时拦字段，approved + status=reimbursed 可以顺手改金额/员工。
    if !ExpenseApprovalStatus::EDITABLE.contains(&current_status.as_str()) && editing_fields {
        return ApiResponse::conflict("费用审批已进入终态，只允许状态流转，不可修改字段");
    }
    if let Some(target) = target_status {
        if !target.allowed_from().contains(&current_status.as_str()) {
            return ApiResponse::conflict("当前状态不允许该操作");
        }
    }
    // B361：历史别名（pending_approval）也要能被命中，否则旧行会卡在「状态不允许」。
    let allowed_from_raw: Vec<&'static str> =
        ExpenseApprovalStatus::raw_values_for(&match target_status {
            Some(target) => target.allowed_from().to_vec(),
            None => vec![current_status.as_str()],
        });
    let current_raw: Vec<&'static str> =
        ExpenseApprovalStatus::raw_values_for(&[current_status.as_str()]);
    let status = target_status.map(ExpenseApprovalStatus::as_str);

    // 此前该 handler 是纯回显桩：返回 {id,data} 但不落库（GET 复核仍为 draft）。
    let row = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.expense_approvals SET
               employee_id = COALESCE($2, employee_id),
               status = COALESCE($3, status),
               expense_no = COALESCE($4, expense_no),
               employee_name = COALESCE($5, employee_name),
               department = COALESCE($6, department),
               expense_date = COALESCE($7, expense_date),
               expense_type = COALESCE($8, expense_type),
               total_amount = COALESCE($9, total_amount),
               description = COALESCE($10, description),
               approval_note = COALESCE($11, approval_note),
               approver_id = COALESCE($12, approver_id),
               approver_name = COALESCE($13, approver_name),
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $16::uuid AND deleted_at IS NULL
             AND status = ANY($14::text[]) AND status = ANY($15::text[])
           RETURNING id, expense_no, employee_id, employee_name, department, expense_date,
                     expense_type, total_amount, status, description, approver_id, approver_name,
                     approval_note, created_at, updated_at"#
    ))
    .bind(id_uuid)
    .bind(employee_id)
    .bind(status)
    .bind(req.expense_no.filter(|s| !s.trim().is_empty()))
    .bind(req.employee_name)
    .bind(req.department)
    .bind(expense_date)
    .bind(req.expense_type)
    .bind(req.total_amount)
    .bind(req.description)
    .bind(req.approval_note)
    .bind(approver_id)
    .bind(req.approver_name)
    .bind(&allowed_from_raw)
    .bind(&current_raw)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(row)) => ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "expense_no": row.try_get::<String, _>("expense_no").ok(),
                "employee_id": row.try_get::<Option<Uuid>, _>("employee_id").ok().flatten(),
                "employee_name": row.try_get::<Option<String>, _>("employee_name").ok().flatten(),
                "department": row.try_get::<Option<String>, _>("department").ok().flatten(),
                "expense_date": row.try_get::<Option<chrono::NaiveDate>, _>("expense_date").ok().flatten(),
                "expense_type": row.try_get::<Option<String>, _>("expense_type").ok().flatten(),
                "total_amount": row.try_get::<Option<Decimal>, _>("total_amount").ok().flatten(),
                "status": row.try_get::<Option<String>, _>("status").ok().flatten(),
                "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
                "approver_id": row.try_get::<Option<Uuid>, _>("approver_id").ok().flatten(),
                "approver_name": row.try_get::<Option<String>, _>("approver_name").ok().flatten(),
                "approval_note": row.try_get::<Option<String>, _>("approval_note").ok().flatten(),
                "created_at": row.try_get::<Option<DateTime<Utc>>, _>("created_at").ok().flatten(),
                "updated_at": row.try_get::<Option<DateTime<Utc>>, _>("updated_at").ok().flatten(),
            }),
            "更新成功",
        ),
        Ok(None) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            ApiResponse::conflict("当前状态不允许该操作")
        }
        Err(e) => ApiResponse::from(TopemsError::DatabaseQuery(format!(
            "更新费用审批失败: {}",
            e
        ))),
    }
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:expense_approval:delete"])),
    path = "/expense-approvals/{id}",
    tag = "Expense Approval",
    params(("id" = String, Path, description = "费用审批ID")),
    responses(
        (status = 200, description = "删除费用审批成功", body = ApiResponse<String>),
        (status = 409, description = "费用审批不存在、已删除或状态不允许删除"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<String> {
    let id_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::not_found("费用审批不存在"),
    };
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
    {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    if tenant_id.is_nil() {
        return ApiResponse::bad_request("缺少租户上下文");
    }

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    // 此前是空桩：无论 ID 是否存在/已删都返回 200。
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.expense_approvals SET deleted_at = NOW()
           WHERE id = $1 AND tenant_id = $3::uuid AND deleted_at IS NULL
             AND status = ANY($2::text[])"#
    ))
    .bind(id_uuid)
    .bind(ExpenseApprovalStatus::raw_values_for(
        &ExpenseApprovalStatus::DELETABLE,
    ))
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "删除成功"),
        Ok(_) => ApiResponse::conflict("费用审批不存在、已删除或状态不允许删除"),
        Err(e) => ApiResponse::from(TopemsError::DatabaseQuery(format!(
            "删除费用审批失败: {}",
            e
        ))),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:expense_approval:update"])),
    path = "/expense-approvals/{id}/submit",
    tag = "Expense Approval",
    params(("id" = String, Path, description = "费用审批ID")),
    responses(
        (status = 200, description = "提交成功", body = ApiResponse<serde_json::Value>),
        (status = 409, description = "当前状态不允许提交"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn submit_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    transition_expense_approval(
        &state,
        txn_arc,
        &claims,
        &id,
        ExpenseApprovalStatus::Draft,
        ExpenseApprovalStatus::Pending,
        None,
        None,
        "提交成功",
    )
    .await
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:expense_approval:update"])),
    path = "/expense-approvals/{id}/approve",
    tag = "Expense Approval",
    params(("id" = String, Path, description = "费用审批ID")),
    responses(
        (status = 200, description = "审批通过", body = ApiResponse<serde_json::Value>),
        (status = 409, description = "当前状态不允许审批"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn approve_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    transition_expense_approval(
        &state,
        txn_arc,
        &claims,
        &id,
        ExpenseApprovalStatus::Pending,
        ExpenseApprovalStatus::Approved,
        Some(claims.username.as_str()),
        None,
        "审批通过",
    )
    .await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:expense_approval:update"])),
    path = "/expense-approvals/{id}/reimburse",
    tag = "Expense Approval",
    params(("id" = String, Path, description = "费用审批ID")),
    responses(
        (status = 200, description = "报销完成", body = ApiResponse<serde_json::Value>),
        (status = 409, description = "当前状态不允许报销"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
/// B350：approved → reimbursed 专用动作。
///
/// 此前只能通过通用 `PUT /expense-approvals/{id}` 携带 `status=reimbursed` 完成，
/// 而该入口同时接受金额、员工等字段，终态记录可借道改写明细。专用动作只改状态。
pub async fn reimburse_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    transition_expense_approval(
        &state,
        txn_arc,
        &claims,
        &id,
        ExpenseApprovalStatus::Approved,
        ExpenseApprovalStatus::Reimbursed,
        None,
        None,
        "报销完成",
    )
    .await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:expense_approval:update"])),
    path = "/expense-approvals/{id}/reject",
    tag = "Expense Approval",
    params(("id" = String, Path, description = "费用审批ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "驳回成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn reject_expense_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let note = req.get("approval_note").and_then(|v| v.as_str());
    transition_expense_approval(
        &state,
        txn_arc,
        &claims,
        &id,
        ExpenseApprovalStatus::Pending,
        ExpenseApprovalStatus::Rejected,
        None,
        note,
        "驳回成功",
    )
    .await
}

async fn transition_expense_approval(
    state: &AppState,
    txn_arc: topems_shared_auth::middleware::tenant::RlsTxnCell,
    claims: &Claims,
    id: &str,
    from: ExpenseApprovalStatus,
    to: ExpenseApprovalStatus,
    actor: Option<&str>,
    note: Option<&str>,
    success_message: &str,
) -> ApiResponse<serde_json::Value> {
    let Ok(id_uuid) = Uuid::parse_str(id) else {
        return ApiResponse::not_found("费用审批不存在");
    };
    // B349：审批/驳回属写动作，缺租户直接 400，不再回退平台租户
    let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(claims)
    {
        Ok(t) if !t.is_nil() => t,
        Ok(_) => return ApiResponse::bad_request("缺少租户上下文"),
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => return crate::shared::err_resp(e),
    };
    let row = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.expense_approvals SET
               status = $3::varchar,
               approver_name = CASE WHEN $3::varchar = 'approved' THEN $4 ELSE approver_name END,
               approval_note = COALESCE($5, approval_note),
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $6::uuid
             AND status = ANY($2::text[]) AND deleted_at IS NULL
           RETURNING status"#
    ))
    .bind(id_uuid)
    .bind(ExpenseApprovalStatus::raw_values_for(&[from.as_str()]))
    .bind(to.as_str())
    .bind(actor)
    .bind(note)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(row)) => ApiResponse::success(
            serde_json::json!({
                "id": id_uuid,
                "status": row.try_get::<String, _>("status").ok(),
            }),
            success_message,
        ),
        Ok(None) => ApiResponse::conflict("当前状态不允许该操作"),
        Err(e) => ApiResponse::from(TopemsError::DatabaseQuery(format!(
            "费用审批状态更新失败: {e}"
        ))),
    }
}

// ==================== RC4a 补齐: 报表基础 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/account-balance",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/account-balance"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_account_balance_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    axum::extract::Query(params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let Some(tenant_id) = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    else {
        return ApiResponse::from(TopemsError::Unauthorized);
    };

    // 决定 6：单公司租户同样必须显式传 company_id，不做省略推断。
    let Some(company_id) = params
        .get("company_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
    else {
        return ApiResponse::error(400, "company_id 必传（单公司租户也不允许省略）");
    };

    let Some(period) = params
        .get("period")
        .and_then(|v| v.as_str())
        .map(|s| s.replace('-', ""))
    else {
        return ApiResponse::error(400, "period 必传（YYYYMM 或 YYYY-MM）");
    };
    if period.len() != 6 || !period.chars().all(|c| c.is_ascii_digit()) {
        return ApiResponse::error(400, "period 格式非法，应为 YYYYMM");
    }

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    match service
        .get_account_balance_report(tenant_id, company_id, &period, txn)
        .await
    {
        Ok(report) if report.balanced => {
            let data = serde_json::to_value(&report).unwrap_or(serde_json::json!({}));
            ApiResponse::success(data, "查询成功")
        }
        Ok(report) => {
            // 校验不通过：409 + 差异明细，不返回空表。
            let mut resp =
                ApiResponse::<serde_json::Value>::error(409, "科目余额表校验未通过，已拒绝出表");
            resp.data = Some(serde_json::to_value(&report).unwrap_or(serde_json::json!({})));
            resp
        }
        Err(e) => ApiResponse::from(TopemsError::internal("生成科目余额表失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/account-ledger",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/account-ledger"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_account_ledger_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(serde_json::json!({"items": [], "total": 0}), "查询成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/dimension-detail",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/dimension-detail"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_dimension_detail_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(serde_json::json!({"items": []}), "查询成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/balance-sheet/export",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/balance-sheet/export"), (status = 500, description = "服务内部错误")),
)]
pub async fn export_balance_sheet_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({"file_name": "balance_sheet.csv"}),
        "导出成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/income-statement/export",
    tag = "Report",
    params(
        ("period" = String, Query, description = "期间"),
        ("org_id" = Option<String>, Query, description = "组织ID"),
    ),
    responses(
        (status = 200, description = "导出利润表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn export_income_statement_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({"file_name": "income_statement.csv"}),
        "导出成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/cash-flow/export",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/cash-flow/export"), (status = 500, description = "服务内部错误")),
)]
pub async fn export_cash_flow_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({"file_name": "cash_flow.csv"}),
        "导出成功",
    )
}

pub fn create_routes() -> Router<AppState> {
    use topems_shared_auth::middleware::require_permission;

    // 子模块路由（已有各自 layer，不再重复挂）
    let submodules = Router::new()
        .merge(compliance_v51::create_routes())
        .merge(audit_v52::create_routes())
        .merge(forecast_v53::create_routes())
        .merge(risk_v54::create_routes())
        .merge(settlement_v55::create_routes())
        .merge(sales_invoice::create_routes())
        .merge(settlement_center::create_routes())
        .merge(tax_v56::create_routes())
        .merge(reports_v57::create_routes())
        .merge(treasury_v58::create_routes())
        .merge(risk_v59::create_routes())
        .merge(decision_v60::create_routes())
        .merge(reconcile_orders::create_routes())
        .merge(reconciliation::create_routes())
        .merge(operational::create_routes())
        .merge(report_center::create_routes())
        .merge(forecasting::create_routes())
        .merge(bootstrap::create_routes())
        .merge(financial_reports::create_routes())
        .merge(accounting_subjects::create_routes())
        .merge(currencies::create_routes())
        .nest("/cqrs", cqrs_routes::cqrs_routes())
        .merge(event_routes::event_routes());

    // ===== 科目/总账/对家 域 =====
    // B377：此前整个科目/期初域只挂 finance:account:read，只读角色可建/改/删会计科目、
    // 建辅助核算、批量建子科目、期初余额建/改/删/批量导入/结转、改客户与供应商主数据。
    // 按动作拆子 Router，各挂字典里真实存在的 finance:account:* 与 finance:opening_balance:*。
    let account_read_routes = Router::new()
        .route("/dashboard", axum::routing::get(get_dashboard_handler))
        .route("/accounts", axum::routing::get(list_accounts))
        .route(
            "/accounts/balances",
            axum::routing::get(get_account_balances),
        )
        .route("/accounts/{account_id}", axum::routing::get(get_account))
        .route(
            "/accounts/code/{code}",
            axum::routing::get(get_account_by_code),
        )
        .route("/aux-accounts", axum::routing::get(list_aux_accounts))
        .route("/accounts/tree", axum::routing::get(get_account_tree))
        .route(
            "/counterparty/customers",
            axum::routing::get(list_counterparty_customers),
        )
        .route(
            "/counterparty/customers/{customer_id}",
            axum::routing::get(get_counterparty_customer),
        )
        .route(
            "/counterparty/suppliers",
            axum::routing::get(list_counterparty_suppliers),
        )
        .route(
            "/counterparty/suppliers/{supplier_id}",
            axum::routing::get(get_counterparty_supplier),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:account:read",
        )));

    let account_create_routes = Router::new()
        .route("/accounts", axum::routing::post(create_account))
        .route("/aux-accounts", axum::routing::post(create_aux_account))
        .route(
            "/accounts/{account_id}/children-batch",
            axum::routing::post(batch_create_account_children),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:account:create",
        )));

    let account_update_routes = Router::new()
        .route("/accounts/{account_id}", axum::routing::put(update_account))
        .route(
            "/counterparty/customers/{customer_id}",
            axum::routing::put(update_counterparty_customer),
        )
        .route(
            "/counterparty/suppliers/{supplier_id}",
            axum::routing::put(update_counterparty_supplier),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:account:update",
        )));

    let account_delete_routes = Router::new()
        .route(
            "/accounts/{account_id}",
            axum::routing::delete(delete_account),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:account:delete",
        )));

    let opening_balance_read_routes = Router::new()
        .route(
            "/accounts/opening-balances",
            axum::routing::get(get_opening_balances),
        )
        .route(
            "/accounts/opening-balances/{id}",
            axum::routing::get(get_opening_balance),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:opening_balance:read",
        )));

    let opening_balance_create_routes = Router::new()
        .route(
            "/accounts/opening-balances",
            axum::routing::post(create_opening_balances),
        )
        .route(
            "/accounts/opening-balances/batch",
            axum::routing::post(import_opening_balances),
        )
        .route(
            "/accounts/{account_id}/opening-balance",
            axum::routing::post(set_opening_balance),
        )
        .route(
            "/accounts/opening-balances/carry-forward",
            axum::routing::post(carry_forward_opening_balance),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:opening_balance:create",
        )));

    let opening_balance_update_routes = Router::new()
        .route(
            "/accounts/opening-balances/{id}",
            axum::routing::put(update_opening_balance),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:opening_balance:update",
        )));

    let opening_balance_delete_routes = Router::new()
        .route(
            "/accounts/opening-balances/{id}",
            axum::routing::delete(delete_opening_balance),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:opening_balance:delete",
        )));

    let account_routes = Router::new()
        .merge(account_read_routes)
        .merge(account_create_routes)
        .merge(account_update_routes)
        .merge(account_delete_routes)
        .merge(opening_balance_read_routes)
        .merge(opening_balance_create_routes)
        .merge(opening_balance_update_routes)
        .merge(opening_balance_delete_routes);

    // ===== 凭证/模板/生成/U8导入 域 =====
    // B343: 凭证域按读/创建/更新/删除拆成四个子 Router，各自挂对应权限码。
    // 旧实现整个域（含删除、记账、审批、导入、模板变更）只挂 finance:voucher:read，
    // 只读角色可以凭证删除/记账。读接口继续要求 read，写接口叠加 create/update/delete。
    // 写接口仍保留路由级 read（能读才能改），避免把只读角色直接抬成写入角色。
    let voucher_read_routes = Router::new()
        .route("/vouchers", axum::routing::get(list_vouchers))
        .route("/vouchers/{voucher_id}", axum::routing::get(get_voucher))
        .route(
            "/vouchers/{voucher_id}/entries",
            axum::routing::get(get_voucher_entries),
        )
        .route(
            "/vouchers/{voucher_id}/items",
            axum::routing::get(get_voucher_items),
        )
        .route("/vouchers/next-no", axum::routing::get(get_next_voucher_no))
        .route("/vouchers/export", axum::routing::post(export_vouchers))
        .route(
            "/voucher-templates",
            axum::routing::get(list_voucher_templates_handler),
        )
        .route(
            "/voucher-templates/{template_id}",
            axum::routing::get(get_voucher_template_handler),
        )
        .route(
            "/voucher-templates/match",
            axum::routing::post(match_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/usage-stats",
            axum::routing::get(get_template_usage_stats_handler),
        )
        .route(
            "/voucher-templates/{template_id}/export",
            axum::routing::get(export_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/entries",
            axum::routing::get(voucher_template_entries::list_entries),
        )
        .route(
            "/voucher-templates/{template_id}/entries/{entry_id}",
            axum::routing::get(voucher_template_entries::get_entry),
        )
        .route(
            "/voucher-generation-rules",
            axum::routing::get(list_generation_rules_handler),
        )
        .route(
            "/voucher-generation-rules/{rule_id}",
            axum::routing::get(get_generation_rule_handler),
        )
        .route(
            "/voucher-generation-rules/test",
            axum::routing::post(test_rule_handler),
        )
        .route(
            "/voucher/generate/preview",
            axum::routing::post(voucher_template::preview_generation),
        )
        .route(
            "/u8-import/{import_id}/status",
            axum::routing::get(get_import_status_handler),
        )
        .route(
            "/u8-import/records",
            axum::routing::get(list_import_records_handler),
        )
        .route(
            "/u8-import/records/{import_id}",
            axum::routing::get(get_import_record_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:voucher:read",
        )));

    let voucher_create_routes = Router::new()
        .route("/vouchers", axum::routing::post(create_voucher))
        .route(
            "/vouchers/batch",
            axum::routing::post(batch_create_vouchers),
        )
        .route(
            "/vouchers/generate",
            axum::routing::post(generate_voucher_by_template),
        )
        .route(
            "/vouchers/import",
            axum::routing::post(import_vouchers_general),
        )
        .route(
            "/vouchers/import/u8",
            axum::routing::post(import_vouchers_u8),
        )
        .route(
            "/voucher-templates",
            axum::routing::post(create_voucher_template_handler),
        )
        .route(
            "/voucher-templates/apply",
            axum::routing::post(apply_template_handler),
        )
        .route(
            "/voucher-templates/import",
            axum::routing::post(import_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/copy",
            axum::routing::post(copy_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/entries",
            axum::routing::post(add_template_entry_handler),
        )
        .route(
            "/voucher-generation-rules",
            axum::routing::post(create_generation_rule_handler),
        )
        .route(
            "/voucher-generation-rules/generate",
            axum::routing::post(generate_vouchers_handler),
        )
        .route(
            "/voucher/generate/from-source",
            axum::routing::post(voucher_template::generate_from_source),
        )
        .route(
            "/voucher/generate/batch",
            axum::routing::post(voucher_template::batch_generate),
        )
        .route(
            "/voucher/generate/auto",
            axum::routing::post(voucher_template::auto_generate),
        )
        .route(
            "/voucher/generate/regenerate/{original_voucher_id}",
            axum::routing::post(voucher_template::regenerate),
        )
        .route(
            "/u8-import/import",
            axum::routing::post(import_vouchers_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:voucher:create",
        )));

    let voucher_update_routes = Router::new()
        .route("/vouchers/{voucher_id}", axum::routing::put(update_voucher))
        .route(
            "/vouchers/{voucher_id}/submit",
            axum::routing::post(submit_voucher),
        )
        .route(
            "/vouchers/{voucher_id}/approve",
            axum::routing::post(approve_voucher),
        )
        .route(
            "/vouchers/{voucher_id}/post",
            axum::routing::post(post_voucher),
        )
        .route(
            "/vouchers/{voucher_id}/unpost",
            axum::routing::post(unpost_voucher),
        )
        .route(
            "/vouchers/{voucher_id}/unapprove",
            axum::routing::post(unapprove_voucher),
        )
        .route(
            "/vouchers/{voucher_id}/reverse",
            axum::routing::post(reverse_voucher),
        )
        .route(
            "/vouchers/batch/submit",
            axum::routing::post(batch_submit_vouchers),
        )
        .route(
            "/vouchers/batch/approve",
            axum::routing::post(batch_approve_vouchers),
        )
        .route(
            "/vouchers/batch/post",
            axum::routing::post(batch_post_vouchers),
        )
        .route(
            "/voucher-templates/{template_id}",
            axum::routing::put(update_voucher_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/set-default",
            axum::routing::post(set_default_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/toggle",
            axum::routing::put(toggle_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/entries/reorder",
            axum::routing::put(reorder_template_entries_handler),
        )
        .route(
            "/voucher-templates/{template_id}/entries/{entry_id}",
            axum::routing::put(update_template_entry_handler),
        )
        .route(
            "/voucher-generation-rules/{rule_id}",
            axum::routing::put(update_generation_rule_handler),
        )
        .route(
            "/voucher-generation-rules/{rule_id}/toggle",
            axum::routing::put(toggle_generation_rule_handler),
        )
        .route(
            "/u8-import/{import_id}/rollback",
            axum::routing::post(rollback_import_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:voucher:update",
        )));

    let voucher_delete_routes = Router::new()
        .route(
            "/vouchers/{voucher_id}",
            axum::routing::delete(delete_voucher),
        )
        .route(
            "/vouchers/batch-delete",
            axum::routing::post(batch_delete_vouchers),
        )
        .route(
            "/voucher-templates/{template_id}",
            axum::routing::delete(delete_voucher_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/entries/{entry_id}",
            axum::routing::delete(delete_template_entry_handler),
        )
        .route(
            "/voucher-generation-rules/{rule_id}",
            axum::routing::delete(delete_generation_rule_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:voucher:delete",
        )));

    // 写入口同时要求 read：能读才允许改，避免只读角色被直接抬成写入角色。
    let voucher_write_routes = voucher_create_routes
        .merge(voucher_update_routes)
        .merge(voucher_delete_routes)
        .layer(axum::middleware::from_fn(require_permission(
            "finance:voucher:read",
        )));

    let voucher_routes = voucher_read_routes.merge(voucher_write_routes);

    // ===== 报表/总账/期间 域 =====
    // B377：此前报表/期间域只挂 finance:report:read，只读角色可年结、开账期、关账期、
    // 结转损益。报表全 GET 留 read 块；期间写动作（年结/开/关/结转）统一挂
    // finance:period:write（字典已有该码）。
    let report_read_routes = Router::new()
        .route("/ledger", axum::routing::get(get_ledger))
        .route("/aux-ledger", axum::routing::get(get_aux_ledger))
        .route("/aux-balance", axum::routing::get(get_aux_balance))
        .route(
            "/trial-balance/{period}",
            axum::routing::get(get_trial_balance),
        )
        .route(
            "/balance-sheet/{period}",
            axum::routing::get(get_balance_sheet),
        )
        .route(
            "/income-statement/{period}",
            axum::routing::get(get_income_statement),
        )
        .route("/cash-flow/{period}", axum::routing::get(get_cash_flow))
        .route("/period/current", axum::routing::get(get_current_period))
        .route("/periods", axum::routing::get(list_periods))
        .route(
            "/reports/account-balance",
            axum::routing::get(get_account_balance_report),
        )
        .route(
            "/reports/account-ledger",
            axum::routing::get(get_account_ledger_report),
        )
        .route(
            "/reports/dimension-detail",
            axum::routing::get(get_dimension_detail_report),
        )
        .route(
            "/reports/balance-sheet/export",
            axum::routing::get(export_balance_sheet_report),
        )
        .route(
            "/reports/income-statement/export",
            axum::routing::get(export_income_statement_report),
        )
        .route(
            "/reports/cash-flow/export",
            axum::routing::get(export_cash_flow_report),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:report:read",
        )));

    let period_write_routes = Router::new()
        .route("/year-end-close", axum::routing::post(year_end_close))
        .route("/periods/open", axum::routing::post(open_period_v2))
        .route("/periods/close", axum::routing::post(close_period_v2))
        .route(
            "/periods/close-income",
            axum::routing::post(close_income_period),
        )
        .route(
            "/periods/year-end-close",
            axum::routing::post(year_end_close_v2),
        )
        .route(
            "/periods/{year}/{month}/open",
            axum::routing::post(open_period),
        )
        .route(
            "/periods/{year}/{month}/close",
            axum::routing::post(close_period),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:period:write",
        )));

    let report_routes = Router::new()
        .merge(report_read_routes)
        .merge(period_write_routes);

    // ===== 付款/付款记录 域 =====
    // B376：此前整个付款域只挂 finance:payment:read，只读角色可建/改/删付款单、
    // 提交/审批/驳回/执行付款、核销、批量核销。按动作拆子 Router，各挂字典里真实存在的
    // finance:payment:{create,update,delete}；导出属批量取数，沿用既有 admin 意图
    // （require_module_write("finance") = finance:admin）。
    let payment_read_routes = Router::new()
        .route("/payments", axum::routing::get(list_payments_handler))
        .route(
            "/payments/{payment_id}",
            axum::routing::get(get_payment_handler),
        )
        .route(
            "/payment-records",
            axum::routing::get(list_payment_records_handler),
        )
        .route(
            "/ap/payments",
            axum::routing::get(list_payment_records_handler),
        )
        .route(
            "/payment-records/{payment_id}",
            axum::routing::get(get_payment_record_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:payment:read",
        )));

    let payment_create_routes = Router::new()
        .route("/payments", axum::routing::post(create_payment_handler))
        .route(
            "/payment-records",
            axum::routing::post(create_payment_record_handler),
        )
        .route(
            "/ap/payments",
            axum::routing::post(create_payment_record_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:payment:create",
        )));

    let payment_update_routes = Router::new()
        .route(
            "/payments/{payment_id}",
            axum::routing::put(update_payment_handler),
        )
        .route(
            "/payments/{payment_id}/submit",
            axum::routing::post(submit_payment_handler),
        )
        .route(
            "/payments/{payment_id}/approve",
            axum::routing::post(approve_payment_handler),
        )
        .route(
            "/payments/{payment_id}/reject",
            axum::routing::post(reject_payment_handler),
        )
        .route(
            "/payments/{payment_id}/execute",
            axum::routing::post(execute_payment_handler),
        )
        .route(
            "/payments/write-off",
            axum::routing::post(write_off_payment_item_handler),
        )
        .route(
            "/ap/payments/{payment_id}/approve",
            axum::routing::post(approve_payment_record_handler),
        )
        .route(
            "/ap/payments/{payment_id}/reject",
            axum::routing::post(reject_payment_record_handler),
        )
        .route(
            "/payment-records/{payment_id}",
            axum::routing::put(update_payment_record_handler),
        )
        .route(
            "/payment-records/write-off",
            axum::routing::post(write_off_payment_record_handler),
        )
        .route(
            "/payment-records/batch-write-off",
            axum::routing::post(batch_write_off_payments_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:payment:update",
        )));

    let payment_delete_routes = Router::new()
        .route(
            "/payments/{payment_id}",
            axum::routing::delete(delete_payment_handler),
        )
        .route(
            "/payment-records/{payment_id}",
            axum::routing::delete(delete_payment_record_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:payment:delete",
        )));

    let payment_admin_routes = Router::new()
        .route(
            "/payments/export",
            axum::routing::post(export_payments_handler),
        )
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_module_write("finance"),
        ));

    let payment_routes = Router::new()
        .merge(payment_read_routes)
        .merge(payment_create_routes)
        .merge(payment_update_routes)
        .merge(payment_delete_routes)
        .merge(payment_admin_routes);

    // ===== 审批配置/费用审批 域 =====
    // B349：此前整个域只挂 finance:expense_approval:read，只读角色可建/改/删审批配置、
    // 建费用审批、提交/审批/驳回、删费用审批。按方法拆子 Router，各挂对应码；
    // 写子 Router 合并后统一再套一层 read（能读才能改）。
    let approval_config_read_routes = Router::new()
        .route(
            "/approval-configs",
            axum::routing::get(list_approval_configs_handler),
        )
        .route(
            "/approval-configs/{config_id}",
            axum::routing::get(get_approval_config_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:approval_config:read",
        )));
    let approval_config_create_routes = Router::new()
        .route(
            "/approval-configs",
            axum::routing::post(create_approval_config_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:approval_config:create",
        )));
    let approval_config_update_routes = Router::new()
        .route(
            "/approval-configs/{config_id}",
            axum::routing::put(update_approval_config_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:approval_config:update",
        )));
    let approval_config_delete_routes = Router::new()
        .route(
            "/approval-configs/{config_id}",
            axum::routing::delete(delete_approval_config_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:approval_config:delete",
        )));
    let approval_config_write_routes = Router::new()
        .merge(approval_config_create_routes)
        .merge(approval_config_update_routes)
        .merge(approval_config_delete_routes)
        .layer(axum::middleware::from_fn(require_permission(
            "finance:approval_config:read",
        )));

    let expense_approval_read_routes = Router::new()
        .route(
            "/expense-approvals",
            axum::routing::get(list_expense_approvals),
        )
        .route(
            "/expense-approvals/{id}",
            axum::routing::get(get_expense_approval),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense_approval:read",
        )));
    let expense_approval_create_routes = Router::new()
        .route(
            "/expense-approvals",
            axum::routing::post(create_expense_approval),
        )
        .route("/approvals/submit", axum::routing::post(submit_approval))
        .route("/approvals/approve", axum::routing::post(approve_approval))
        .route("/approvals/reject", axum::routing::post(reject_approval))
        .route("/approvals/cancel", axum::routing::post(cancel_approval))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense_approval:create",
        )));
    let expense_approval_update_routes = Router::new()
        .route(
            "/expense-approvals/{id}",
            axum::routing::put(update_expense_approval),
        )
        .route(
            "/expense-approvals/{id}/submit",
            axum::routing::post(submit_expense_approval),
        )
        .route(
            "/expense-approvals/{id}/approve",
            axum::routing::post(approve_expense_approval),
        )
        .route(
            "/expense-approvals/{id}/reimburse",
            axum::routing::post(reimburse_expense_approval),
        )
        .route(
            "/expense-approvals/{id}/reject",
            axum::routing::post(reject_expense_approval),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense_approval:update",
        )));
    let expense_approval_delete_routes = Router::new()
        .route(
            "/expense-approvals/{id}",
            axum::routing::delete(delete_expense_approval),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense_approval:delete",
        )));
    let expense_approval_write_routes = Router::new()
        .merge(expense_approval_create_routes)
        .merge(expense_approval_update_routes)
        .merge(expense_approval_delete_routes)
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense_approval:read",
        )));

    let approval_routes = Router::new()
        .merge(approval_config_read_routes)
        .merge(approval_config_write_routes)
        .merge(expense_approval_read_routes)
        .merge(expense_approval_write_routes);

    // ===== 应收/应付/收款/账龄 域 =====
    // B376：应收/应付域同样只挂 finance:receivable:read，只读角色可建收款单、改/删收款单、
    // 核销、批量核销、批量建应收/应付。收款单读写挂 finance:receivable:{create,update,delete}；
    // 批量建应付无 finance:payable:* 字典条目，用 finance:receivable_payable:create。
    let ar_ap_read_routes = Router::new()
        .route(
            "/receivables/aging",
            axum::routing::get(get_receivable_aging_handler),
        )
        .route(
            "/payables/aging",
            axum::routing::get(get_payable_aging_handler),
        )
        .route("/collections", axum::routing::get(list_collections_handler))
        .route(
            "/collections/{collection_id}",
            axum::routing::get(get_collection_handler),
        )
        .route(
            "/ar/collections",
            axum::routing::get(list_collections_handler),
        )
        .route("/ar/aging", axum::routing::get(get_ar_aging))
        .route("/ap/aging", axum::routing::get(get_ap_aging))
        .route(
            "/aging/receivable",
            axum::routing::get(calculate_receivable_aging_handler),
        )
        .route(
            "/aging/payable",
            axum::routing::get(calculate_payable_aging_handler),
        )
        .route(
            "/aging/summary",
            axum::routing::get(get_aging_summary_handler),
        )
        .route(
            "/aging/detail",
            axum::routing::get(get_aging_detail_handler),
        )
        .route("/aging/trend", axum::routing::get(get_aging_trend_handler))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:read",
        )));

    let ar_ap_create_routes = Router::new()
        .route(
            "/collections",
            axum::routing::post(create_collection_handler),
        )
        .route(
            "/ar/collections",
            axum::routing::post(create_collection_handler),
        )
        .route(
            "/receivables/batch",
            axum::routing::post(batch_create_receivables_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:create",
        )));

    let ar_ap_batch_payable_routes = Router::new()
        .route(
            "/payables/batch",
            axum::routing::post(batch_create_payables_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable_payable:create",
        )));

    let ar_ap_update_routes = Router::new()
        .route(
            "/collections/{collection_id}",
            axum::routing::put(update_collection_handler),
        )
        .route(
            "/collections/write-off",
            axum::routing::post(write_off_collection_handler),
        )
        .route(
            "/collections/batch-write-off",
            axum::routing::post(batch_write_off_collections_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:update",
        )));

    let ar_ap_delete_routes = Router::new()
        .route(
            "/collections/{collection_id}",
            axum::routing::delete(delete_collection_handler),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:delete",
        )));

    let ar_ap_routes = Router::new()
        .merge(ar_ap_read_routes)
        .merge(ar_ap_create_routes)
        .merge(ar_ap_batch_payable_routes)
        .merge(ar_ap_update_routes)
        .merge(ar_ap_delete_routes);

    Router::new()
        .merge(submodules)
        .merge(account_routes)
        .merge(voucher_routes)
        .merge(report_routes)
        .merge(payment_routes)
        .merge(approval_routes)
        .merge(ar_ap_routes)
    // V41.0 Phase 9: 应收/应付账款 CRUD 已由 operational 模块提供，此处仅保留额外接口
}

#[cfg(test)]
mod account_lifecycle_tests {
    use super::*;

    #[test]
    fn account_status_set_is_strict() {
        assert_eq!(normalize_account_status(" ACTIVE "), Some("active"));
        assert_eq!(normalize_account_status("inactive"), Some("inactive"));
        assert_eq!(normalize_account_status("archived"), Some("archived"));
        assert_eq!(normalize_account_status("pending"), None);
    }

    #[test]
    fn account_transitions_keep_archive_terminal() {
        assert!(account_transition_allowed("active", "inactive"));
        assert!(account_transition_allowed("inactive", "active"));
        assert!(account_transition_allowed("active", "archived"));
        assert!(account_transition_allowed("inactive", "archived"));
        assert!(account_transition_allowed("archived", "archived"));
        assert!(!account_transition_allowed("archived", "active"));
        assert!(!account_transition_allowed("archived", "inactive"));
    }
}

#[cfg(test)]
mod voucher_route_perm_tests {
    use super::*;

    /// B343: 凭证域拆成读/创建/更新/删除四个子 Router 后必须能正常合并，
    /// 否则服务启动即 panic。此用例只构建路由表，不连接数据库。
    #[test]
    fn voucher_routes_merge_without_panic() {
        let _router = create_routes();
    }

    /// B349: 审批域按读/建/改/删拆成多个子 Router 后必须能正常合并，
    /// 否则服务启动即 panic。此用例只构建路由表，不连接数据库。
    #[test]
    fn approval_routes_merge_without_panic() {
        let _router = create_routes();
    }
}

#[cfg(test)]
mod query_error_ratchet {
    /// 本文件里的统计/存在性查询曾用 `.await.unwrap_or(0)` 吞错：
    /// `get_next_voucher_no` 查询失败会返回 `000001`（与既有凭证号撞号），
    /// 模板存在性检查失败会被当成「模板不存在」404，列表 COUNT 失败会给出 `total: 0` 但 items 非空。
    /// 此棘轮要求本文件不再出现「`.await` 后直接取默认值」。
    #[test]
    fn finance_module_handlers_do_not_swallow_query_errors() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/modules/mod.rs");
        let src = std::fs::read_to_string(&path).expect("读取 modules/mod.rs 失败");
        // 只扫到本测试模块之前：测试代码自身包含 ".unwrap_or" 字样，不能自匹配
        let scan_end = src.find("mod query_error_ratchet").unwrap_or(src.len());
        let src = &src[..scan_end];
        let bytes = src.as_bytes();
        for (idx, _) in src.match_indices(".unwrap_or") {
            let window = String::from_utf8_lossy(&bytes[idx.saturating_sub(60)..idx]);
            // 只判「.await 之后仅剩空白就直接取默认值」，避免误伤 `while let Ok(..) = x.await { ... .unwrap_or(..) }`
            let swallows = match window.rfind(".await") {
                Some(pos) => window[pos + ".await".len()..].trim().is_empty(),
                None => false,
            };
            assert!(
                !swallows,
                "modules/mod.rs 里又出现「查询失败即取默认值」：\n{}",
                String::from_utf8_lossy(
                    &bytes[idx.saturating_sub(120)..(idx + 40).min(bytes.len())]
                )
            );
        }
    }
}

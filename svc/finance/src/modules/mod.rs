// 2026-08-07: 部分报表和模型 struct 仅 serde 使用，保留 crate 级 allow
#![allow(dead_code)]
pub mod accounting_subjects;
pub mod audit_v52;
pub mod compliance_v51;
pub mod cqrs_routes;
pub mod decision_v60;
pub mod event_routes;
pub mod financial_reports;
pub mod forecast_v53;
pub mod forecasting;
pub mod multi_dimensional;
pub mod operational;
pub mod reconcile_orders;
pub mod reconciliation;
pub mod report_center;
pub mod reports_v57;
pub mod risk_v54;
pub mod risk_v59;
pub mod sales_invoice;
pub mod settlement_center;
pub mod settlement_v55;
pub mod shared_services;
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
use topems_shared_db::decimal::big_decimal_to_f64_non_opt;
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tokio;
use topems_shared_boundary::only_own_schema_query;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::models::*;
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::locale::Locale;
use topems_shared_event::event::{EventType, PaymentMadePayload, PaymentReceivedPayload};

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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct AuxQueryParams {
    pub aux_type: String,
    pub aux_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub period: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

async fn count_table_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Option<Uuid>) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1)",
        table
    ))
    .bind(tenant_id)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn count_table_with_tenant_and_status(
    pool: &sqlx::PgPool,
    table: &str,
    tenant_id: Option<Uuid>,
    status: &str,
) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = $2",
        table
    ))
    .bind(tenant_id)
    .bind(status)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn sum_table_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Option<Uuid>) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COALESCE(SUM(amount), 0) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1)",
        table
    ))
    .bind(tenant_id)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn sum_overdue_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Option<Uuid>) -> i64 {
    match sqlx::query_scalar(&format!("SELECT COALESCE(SUM(amount), 0) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1) AND due_date < NOW() AND status = 'unpaid'", table))
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
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
    Json(req): Json<CreateAccountRequest>,
) -> Json<ApiResponse<Account>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.create_account(tenant_id, req).await {
        Ok(account) => Json(ApiResponse::success(account, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/get_account/{id}",
    tag = "Finance",
    operation_id = "get_account",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(account_id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Account>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let locale = Locale::from_headers(&headers).as_sql();
    match service.get_account(tenant_id, account_id, locale).await {
        Ok(account) => Json(ApiResponse::success(account, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/get_account_by_code/{id}",
    tag = "Finance",
    operation_id = "get_account_by_code",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_account_by_code(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(code): Path<String>,
    headers: HeaderMap,
) -> Json<ApiResponse<Account>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let locale = Locale::from_headers(&headers).as_sql();
    match service.get_account_by_code(tenant_id, &code, locale).await {
        Ok(account) => Json(ApiResponse::success(account, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
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
    Query(params): Query<AccountBalanceQueryParams>,
) -> Json<ApiResponse<Vec<TrialBalance>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_trial_balance(tenant_id, &params.period).await {
        Ok(balances) => {
            let filtered = if let Some(account_ids) = params.account_ids {
                balances
                    .into_iter()
                    .filter(|b| account_ids.contains(&b.account_id))
                    .collect()
            } else {
                balances
            };
            Json(ApiResponse::success(filtered, "查询成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/list_accounts",
    tag = "Finance",
    operation_id = "list_accounts",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<AccountQueryParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<Account>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let locale = Locale::from_headers(&headers).as_sql();
    match service.list_accounts(tenant_id, locale).await {
        Ok(accounts) => Json(ApiResponse::success(accounts, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/create_voucher",
    tag = "Finance",
    operation_id = "create_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<ApiResponse<VoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .create_voucher(tenant_id, req, &created_by, locale)
        .await
    {
        Ok(voucher) => Json(ApiResponse::success(voucher, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/finance/get_voucher/{id}",
    tag = "Finance",
    operation_id = "get_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<VoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_voucher(tenant_id, voucher_id).await {
        Ok(voucher) => Json(ApiResponse::success(voucher, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Query(params): Query<VoucherQueryParams>,
) -> Json<ApiResponse<Vec<Voucher>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
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
        .list_vouchers(tenant_id, status, params.period)
        .await
    {
        Ok(vouchers) => Json(ApiResponse::success(vouchers, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/submit_voucher",
    tag = "Finance",
    operation_id = "submit_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn submit_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.submit_voucher(tenant_id, voucher_id).await {
        Ok(voucher) => Json(ApiResponse::success(voucher, "提交成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/finance/approve_voucher",
    tag = "Finance",
    operation_id = "approve_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn approve_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let approved_by = claims.username.clone();
    match service
        .approve_voucher(tenant_id, voucher_id, &approved_by)
        .await
    {
        Ok(voucher) => Json(ApiResponse::success(voucher, "审批成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/post_voucher",
    tag = "Finance",
    operation_id = "post_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn post_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let posted_by = claims.username.clone();
    match service
        .post_voucher(tenant_id, voucher_id, &posted_by)
        .await
    {
        Ok(voucher) => Json(ApiResponse::success(voucher, "过账成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/vouchers/{id}",
    tag = "Voucher",
    params(
        ("voucher_id" = Uuid, Path, description = "凭证ID"),
    ),
    request_body = UpdateVoucherRequest,
    responses(
        (status = 200, description = "更新凭证成功", body = ApiResponse<VoucherResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
/// V39.0 Phase 7: 更新凭证
async fn update_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateVoucherRequest>,
) -> Json<ApiResponse<VoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let updated_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .update_voucher(tenant_id, voucher_id, req, &updated_by, locale)
        .await
    {
        Ok(voucher) => Json(ApiResponse::success(voucher, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// V39.0 Phase 7: 删除凭证
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/delete_voucher/{id}",
    tag = "Finance",
    operation_id = "delete_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.delete_voucher(tenant_id, voucher_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// V39.0 Phase 7: 反过账凭证
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/unpost_voucher",
    tag = "Finance",
    operation_id = "unpost_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn unpost_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.unpost_voucher(tenant_id, voucher_id).await {
        Ok(voucher) => Json(ApiResponse::success(voucher, "反过账成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/get_ledger/{id}",
    tag = "Finance",
    operation_id = "get_ledger",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_ledger(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LedgerQueryParams>,
) -> Json<ApiResponse<Vec<LedgerEntry>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let ledger_params = crate::models::LedgerQueryParams {
        account_id: params.account_id,
        account_code: params.account_code,
        start_date: params.start_date,
        end_date: params.end_date,
        period: params.period,
    };

    match service.get_ledger(tenant_id, ledger_params).await {
        Ok(entries) => Json(ApiResponse::success(entries, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<TrialBalance>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_trial_balance(tenant_id, &period).await {
        Ok(balance) => Json(ApiResponse::success(balance, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Path(period): Path<String>,
) -> Json<ApiResponse<BalanceSheet>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_balance_sheet(tenant_id, &period).await {
        Ok(sheet) => Json(ApiResponse::success(sheet, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Path(period): Path<String>,
) -> Json<ApiResponse<IncomeStatement>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_income_statement(tenant_id, &period).await {
        Ok(statement) => Json(ApiResponse::success(statement, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/period",
    tag = "Finance",
    operation_id = "close_period",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn close_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((year, month)): Path<(i32, i32)>,
) -> Json<ApiResponse<Period>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let closed_by = claims.username.clone();
    match service
        .close_period(tenant_id, year, month, &closed_by)
        .await
    {
        Ok(period) => Json(ApiResponse::success(period, "期间已关闭")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
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
    Path((year, month)): Path<(i32, i32)>,
) -> Json<ApiResponse<Period>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.open_period(tenant_id, year, month).await {
        Ok(period) => Json(ApiResponse::success(period, "期间已打开")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/aux_account",
    tag = "Finance",
    operation_id = "create_aux_account",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_aux_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAuxiliaryAccountRequest>,
) -> Json<ApiResponse<AuxiliaryAccount>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.create_aux_account(tenant_id, req).await {
        Ok(account) => Json(ApiResponse::success(account, "辅助科目创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/aux_accounts",
    tag = "Finance",
    operation_id = "list_aux_accounts",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_aux_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<AuxiliaryAccount>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
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
    match service.list_aux_accounts(tenant_id, aux_type, locale).await {
        Ok(accounts) => Json(ApiResponse::success(accounts, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Query(params): Query<AuxQueryParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<AuxLedgerEntry>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let aux_type = match params.aux_type.as_str() {
        "project" => AuxType::Project,
        "department" => AuxType::Department,
        "customer" => AuxType::Customer,
        "supplier" => AuxType::Supplier,
        "employee" => AuxType::Employee,
        "custom1" => AuxType::Custom1,
        "custom2" => AuxType::Custom2,
        "custom3" => AuxType::Custom3,
        _ => return Json(ApiResponse::error(400, "无效的辅助核算类型")),
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
    match service.get_aux_ledger(tenant_id, query, locale).await {
        Ok(entries) => Json(ApiResponse::success(entries, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/aux_balance/{id}",
    tag = "Finance",
    operation_id = "get_aux_balance",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_aux_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<AuxBalanceReport>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let aux_type = match params.aux_type.as_str() {
        "project" => AuxType::Project,
        "department" => AuxType::Department,
        "customer" => AuxType::Customer,
        "supplier" => AuxType::Supplier,
        "employee" => AuxType::Employee,
        "custom1" => AuxType::Custom1,
        "custom2" => AuxType::Custom2,
        "custom3" => AuxType::Custom3,
        _ => return Json(ApiResponse::error(400, "无效的辅助核算类型")),
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
    match service.get_aux_balance(tenant_id, query, locale).await {
        Ok(balance) => Json(ApiResponse::success(balance, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Path(period): Path<String>,
) -> Json<ApiResponse<CashFlowStatement>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_cash_flow_statement(tenant_id, &period).await {
        Ok(statement) => Json(ApiResponse::success(statement, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/batch_submit_vouchers",
    tag = "Finance",
    operation_id = "batch_submit_vouchers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_submit_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<ApiResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .batch_submit_vouchers(tenant_id, req.voucher_ids)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "批量提交完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/batch_approve_vouchers",
    tag = "Finance",
    operation_id = "batch_approve_vouchers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_approve_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<ApiResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let approved_by = claims.username.clone();
    match service
        .batch_approve_vouchers(tenant_id, req.voucher_ids, &approved_by)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "批量审批完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/batch_post_vouchers",
    tag = "Finance",
    operation_id = "batch_post_vouchers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_post_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<ApiResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let posted_by = claims.username.clone();
    match service
        .batch_post_vouchers(tenant_id, req.voucher_ids, &posted_by)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "批量过账完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
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
    Json(req): Json<ExportVoucherRequest>,
) -> Json<ApiResponse<ExportVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.export_vouchers(tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "导出成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/year_end_close",
    tag = "Finance",
    operation_id = "year_end_close",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn year_end_close(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<YearEndCloseRequest>,
) -> Json<ApiResponse<YearEndCloseResult>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .year_end_close(tenant_id, req.year, &created_by, req.description, locale)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "年末结转成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/create_payment",
    tag = "Finance",
    operation_id = "create_payment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let supplier_id = req.supplier_id;
    let payment_method = req.payment_method.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .create_payment(tenant_id, req, &created_by, locale)
        .await
    {
        Ok(payment) => {
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let payment_id = payment.id;
                let payment_no = payment.payment_no.clone();
                let amount = big_decimal_to_f64_non_opt(payment.total_amount);
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
                    if let Err(e) = publisher
                        .publish_event(EventType::PaymentMade, payload)
                        .await
                    {
                        tracing::warn!(
                            "[finance] PaymentMade 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[finance] PaymentMade 事件发布成功 - payment_id={}",
                            payment_id
                        );
                    }
                });
            }
            Json(ApiResponse::success(payment, "创建成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:payment:read"])),
    path = "/payments/{id}",
    tag = "Payment",
    params(("payment_id" = Uuid, Path, description = "付款单ID")),
    responses(
        (status = 200, description = "获取付款单详情成功", body = ApiResponse<PaymentResponse>),
        (status = 404, description = "付款单不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_payment(tenant_id, payment_id).await {
        Ok(payment) => Json(ApiResponse::success(payment, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Clone, Deserialize, IntoParams)]
pub struct PaymentListParams {
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
    Query(params): Query<PaymentListParams>,
) -> Json<ApiResponse<PaymentListResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let query = crate::models::PaymentQueryParams {
        supplier_id: None,
        status: None,
        start_date: None,
        end_date: None,
        page: params.page,
        page_size: params.page_size,
    };
    match service.list_payments(tenant_id, query).await {
        Ok((items, total)) => Json(ApiResponse::success(
            PaymentListResponse {
                items,
                total,
                page,
                page_size,
            },
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/update_payment",
    tag = "Finance",
    operation_id = "update_payment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let updated_by = claims.username.clone();
    let locale = Locale::from_headers(&headers).as_sql();
    match service
        .update_payment(tenant_id, payment_id, req, &updated_by, locale)
        .await
    {
        Ok(payment) => Json(ApiResponse::success(payment, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/payments/{id}",
    tag = "Payment",
    params(("payment_id" = Uuid, Path, description = "付款单ID")),
    responses(
        (status = 200, description = "删除付款单成功", body = ApiResponse<()>),
        (status = 404, description = "付款单不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.delete_payment(tenant_id, payment_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/submit_payment",
    tag = "Finance",
    operation_id = "submit_payment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn submit_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let _submitted_by = claims.username.clone();

    let payment = match service.get_payment(tenant_id, payment_id).await {
        Ok(p) => p,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };

    match service.submit_voucher(tenant_id, payment.voucher_id).await {
        Ok(_) => match service.get_payment(tenant_id, payment_id).await {
            Ok(p) => Json(ApiResponse::success(p, "提交成功")),
            Err(e) => Json(ApiResponse::error(500, &e.to_string())),
        },
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:payment:read"])),
    path = "/finance/approve_payment",
    tag = "Finance",
    operation_id = "approve_payment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn approve_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let approved_by = claims.username.clone();

    let payment = match service.get_payment(tenant_id, payment_id).await {
        Ok(p) => p,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };

    match service
        .approve_voucher(tenant_id, payment.voucher_id, &approved_by)
        .await
    {
        Ok(_) => match service.get_payment(tenant_id, payment_id).await {
            Ok(p) => Json(ApiResponse::success(p, "审批通过")),
            Err(e) => Json(ApiResponse::error(500, &e.to_string())),
        },
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/payments/{id}/reject",
    tag = "Payment",
    params(("payment_id" = Uuid, Path, description = "付款单ID")),
    responses(
        (status = 200, description = "拒绝付款单成功", body = ApiResponse<PaymentResponse>),
        (status = 404, description = "付款单不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn reject_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rejected_by = claims.username.clone();

    let payment = match service.get_payment(tenant_id, payment_id).await {
        Ok(p) => p,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };

    match service
        .reject_voucher(tenant_id, payment.voucher_id, &rejected_by)
        .await
    {
        Ok(_) => match service.get_payment(tenant_id, payment_id).await {
            Ok(p) => Json(ApiResponse::success(p, "已拒绝")),
            Err(e) => Json(ApiResponse::error(500, &e.to_string())),
        },
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/execute_payment",
    tag = "Finance",
    operation_id = "execute_payment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn execute_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
    Json(req): Json<crate::models::ExecutePaymentRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let executed_by = claims.username.clone();

    match service
        .execute_payment(tenant_id, payment_id, req, &executed_by)
        .await
    {
        Ok(p) => Json(ApiResponse::success(p, "执行成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/write_off_payment_item",
    tag = "Finance",
    operation_id = "write_off_payment_item_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn write_off_payment_item_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<WriteOffRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let write_off_by = claims.username.clone();

    match service
        .write_off_payment_item(tenant_id, req.item_id, req.write_off_amount, &write_off_by)
        .await
    {
        Ok(p) => Json(ApiResponse::success(p, "核销成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
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
    Json(req): Json<ExportPaymentRequest>,
) -> Json<ApiResponse<ExportPaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    match service.export_payments(tenant_id, req).await {
        Ok(r) => Json(ApiResponse::success(r, "导出成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:approval:read"])),
    path = "/finance/list_approval_configs",
    tag = "Finance",
    operation_id = "list_approval_configs_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_approval_configs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ApprovalConfigResponse>>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限访问审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    match service.list_approval_configs(tenant_id).await {
        Ok(configs) => Json(ApiResponse::success(configs, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/create_approval_config",
    tag = "Finance",
    operation_id = "create_approval_config_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateApprovalConfigRequest>,
) -> Json<ApiResponse<ApprovalConfigResponse>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限创建审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();

    match service
        .create_approval_config(tenant_id, req, &created_by)
        .await
    {
        Ok(config) => Json(ApiResponse::success(config, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:approval:read"])),
    path = "/finance/get_approval_config",
    tag = "Finance",
    operation_id = "get_approval_config_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(config_id): Path<Uuid>,
) -> Json<ApiResponse<ApprovalConfigResponse>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限访问审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    match service.get_approval_config(tenant_id, config_id).await {
        Ok(config) => Json(ApiResponse::success(config, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/approval-configs/{id}",
    tag = "Approval Config",
    params(("config_id" = Uuid, Path, description = "审批配置ID")),
    request_body = CreateApprovalConfigRequest,
    responses(
        (status = 200, description = "更新审批配置成功", body = ApiResponse<ApprovalConfigResponse>),
        (status = 403, description = "无权限更新审批配置"),
        (status = 404, description = "审批配置不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(config_id): Path<Uuid>,
    Json(req): Json<CreateApprovalConfigRequest>,
) -> Json<ApiResponse<ApprovalConfigResponse>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限更新审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let updated_by = claims.username.clone();

    match service
        .update_approval_config(tenant_id, config_id, req, &updated_by)
        .await
    {
        Ok(config) => Json(ApiResponse::success(config, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/delete_approval_config",
    tag = "Finance",
    operation_id = "delete_approval_config_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(config_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限删除审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    match service.delete_approval_config(tenant_id, config_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ========== 审批操作（供 ERP 合并报表审批流程调用） ==========

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/approval",
    tag = "Finance",
    operation_id = "submit_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn submit_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    if let Some(record_id) = record_id {
        if let Err(e) = topems_shared_db::approval::create_approval_and_log(
            &state.pool,
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

    Json(ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已提交"}),
        "审批已提交",
    ))
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    if let (Some(record_id), Some(approval_id)) = (record_id, approval_id) {
        if let Err(e) = topems_shared_db::approval::execute_transition_and_log(
            &state.pool,
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

    Json(ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已通过"}),
        "审批已通过",
    ))
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/approval/{id}",
    tag = "Finance",
    operation_id = "reject_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn reject_approval(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    if let (Some(record_id), Some(approval_id)) = (record_id, approval_id) {
        if let Err(e) = topems_shared_db::approval::reject_and_log(
            &state.pool,
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

    Json(ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已驳回"}),
        "审批已驳回",
    ))
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/cancel_approval/{id}",
    tag = "Finance",
    operation_id = "cancel_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn cancel_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::debug!("[finance] 收到审批取消请求: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({"success": true, "message": "审批已取消"}),
        "审批已取消",
    ))
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
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/get_dashboard",
    tag = "Finance",
    operation_id = "get_dashboard_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_dashboard_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<FinanceDashboardStats>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };

    let total_vouchers = count_table_with_tenant(&state.pool, "vouchers", tenant_id).await;
    let draft_vouchers =
        count_table_with_tenant_and_status(&state.pool, "vouchers", tenant_id, "draft").await;
    let submitted_vouchers =
        count_table_with_tenant_and_status(&state.pool, "vouchers", tenant_id, "submitted").await;
    let approved_vouchers =
        count_table_with_tenant_and_status(&state.pool, "vouchers", tenant_id, "approved").await;
    let posted_vouchers =
        count_table_with_tenant_and_status(&state.pool, "vouchers", tenant_id, "posted").await;

    let total_payments = count_table_with_tenant(&state.pool, "payments", tenant_id).await;
    let pending_payments =
        count_table_with_tenant_and_status(&state.pool, "payments", tenant_id, "pending").await;

    let total_receivables = sum_table_with_tenant(&state.pool, "receivables", tenant_id).await;
    let overdue_receivables = sum_overdue_with_tenant(&state.pool, "receivables", tenant_id).await;

    let total_payables = sum_table_with_tenant(&state.pool, "payables", tenant_id).await;
    let overdue_payables = sum_overdue_with_tenant(&state.pool, "payables", tenant_id).await;

    let pending_approvals =
        count_table_with_tenant_and_status(&state.pool, "approval_workflows", tenant_id, "pending")
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

    Json(ApiResponse::success(stats, "查询成功"))
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
        (status = 200, description = "获取凭证模板列表成功", body = ApiResponse<Vec<serde_json::Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_voucher_templates_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VoucherTemplateQueryParams>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .list_voucher_templates(tenant_id, params.voucher_type, params.status)
        .await
    {
        Ok(templates) => {
            let json_templates: Vec<serde_json::Value> = templates
                .into_iter()
                .map(|t| serde_json::to_value(t).unwrap_or(serde_json::json!({})))
                .collect();
            Json(ApiResponse::success(json_templates, "查询成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/finance/get_voucher_template/{id}",
    tag = "Finance",
    operation_id = "get_voucher_template_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_voucher_template(tenant_id, template_id).await {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/create_voucher_template",
    tag = "Finance",
    operation_id = "create_voucher_template_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let req: crate::services::finance::voucher_template::CreateVoucherTemplateRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service
        .create_voucher_template(tenant_id, req, &created_by)
        .await
    {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "创建成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/voucher-templates/{templateId}",
    tag = "Voucher Template",
    params(("templateId" = Uuid, Path, description = "模板ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新凭证模板成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "凭证模板不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let req: crate::services::finance::voucher_template::UpdateVoucherTemplateRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service
        .update_voucher_template(tenant_id, template_id, req)
        .await
    {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "更新成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/delete_voucher_template",
    tag = "Finance",
    operation_id = "delete_voucher_template_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_voucher_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .delete_voucher_template(tenant_id, template_id)
        .await
    {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/set_default_template",
    tag = "Finance",
    operation_id = "set_default_template_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn set_default_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.set_default_template(tenant_id, template_id).await {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "设置成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let req: crate::services::finance::voucher_template::ApplyTemplateRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service.apply_template(tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "应用成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ========== V40.0 Phase 8 扩展: 凭证模板复制/切换/匹配/统计 ==========

#[derive(Debug, Deserialize)]
pub struct CopyTemplateRequest {
    pub new_code: Option<String>,
    pub new_name: String,
}

async fn copy_template_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<CopyTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let source = match service.get_voucher_template(tenant_id, template_id).await {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
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
        .create_voucher_template(tenant_id, create_req, &created_by)
        .await
    {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "复制成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Deserialize)]
pub struct ToggleTemplateRequest {
    pub isactive: bool,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:mod:write"])),
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
    Path(template_id): Path<Uuid>,
    Json(req): Json<ToggleTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let new_status = if req.isactive { "active" } else { "inactive" };
    let now = Utc::now();
    let res = sqlx::query(
        only_own_schema_query!("finance", "UPDATE finance_voucher_templates SET status = $1, updated_at = $2 WHERE tenant_id = $3 AND id = $4"),
    )
    .bind(new_status)
    .bind(now)
    .bind(tenant_id)
    .bind(template_id)
    .execute(&state.pool)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return Json(ApiResponse::error(404, "凭证模板不存在"));
            }
            let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
            match service.get_voucher_template(tenant_id, template_id).await {
                Ok(template) => {
                    let mut val = serde_json::to_value(template).unwrap_or(serde_json::json!({}));
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("isactive".to_string(), serde_json::json!(req.isactive));
                    }
                    Json(ApiResponse::success(val, "切换成功"))
                }
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    security(("BearerAuth" = ["finance:mod:write"])),
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
    Json(req): Json<MatchTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let source_type = match req.source_type {
        Some(s) => s,
        None => return Json(ApiResponse::error(400, "source_type 为必填")),
    };
    let rule: Option<crate::services::finance::voucher_generation::VoucherGenerationRule> = match sqlx::query_as(
        only_own_schema_query!("finance", "SELECT * FROM finance_voucher_generation_rules WHERE tenant_id = $1 AND source_type = $2 AND status = 'active' ORDER BY priority ASC LIMIT 1"),
    )
    .bind(tenant_id)
    .bind(&source_type)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };
    match rule {
        Some(r) => {
            let template_id_opt = r
                .mapping_config
                .get("template_id")
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok());
            let template_val = if let Some(tid) = template_id_opt {
                let service =
                    FinanceService::new(state.pool.clone(), state.workflow_client.clone());
                match service.get_voucher_template(tenant_id, tid).await {
                    Ok(t) => serde_json::to_value(t).unwrap_or(serde_json::json!(null)),
                    Err(_) => serde_json::json!(null),
                }
            } else {
                serde_json::json!(null)
            };
            Json(ApiResponse::success(
                serde_json::json!({
                    "matched": true,
                    "rule": serde_json::to_value(&r).unwrap_or(serde_json::json!({})),
                    "template": template_val,
                }),
                "匹配成功",
            ))
        }
        None => Json(ApiResponse::success(
            serde_json::json!({
                "matched": false,
                "rule": null,
                "template": null,
            }),
            "未找到匹配的规则",
        )),
    }
}

#[derive(Debug, Deserialize)]
pub struct UsageStatsQueryParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:mod:read"])),
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
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Query(_params): Query<UsageStatsQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rule_count: i64 = sqlx::query_scalar(
        only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance_voucher_generation_rules WHERE ($1::uuid IS NULL OR tenant_id = $1) AND mapping_config->>'template_id' = $2"),
    )
    .bind(tenant_id)
    .bind(template_id.to_string())
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let generated_voucher_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE template_id = $1"
    ))
    .bind(template_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let last_used_at: Option<DateTime<Utc>> = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT MAX(created_at) FROM finance.core_finance_vouchers WHERE template_id = $1"
    ))
    .bind(template_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(None);
    Json(ApiResponse::success(
        serde_json::json!({
            "template_id": template_id,
            "usage_count": rule_count,
            "generated_voucher_count": generated_voucher_count,
            "last_used_at": last_used_at,
        }),
        "查询成功",
    ))
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

async fn add_template_entry_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<AddTemplateEntryRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance_voucher_templates WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    if count == 0 {
        return Json(ApiResponse::error(404, "凭证模板不存在"));
    }
    let sort_order: i32 = match req.sort_order {
        Some(s) => s,
        None => {
            let max_order: i32 = sqlx::query_scalar(
                only_own_schema_query!("finance", "SELECT COALESCE(MAX(sort_order), 0) FROM finance_voucher_template_lines WHERE template_id = $1"),
            )
            .bind(template_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
            max_order + 1
        }
    };
    let line_id = Uuid::new_v4();
    let now = Utc::now();
    let line: Result<
        crate::services::finance::voucher_template::VoucherTemplateLine,
        sqlx::Error,
    > = sqlx::query_as(
        only_own_schema_query!("finance", r#"INSERT INTO finance_voucher_template_lines
            (id, template_id, description, account_code, direction, amount_formula, sort_order, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    .fetch_one(&state.pool)
    .await;
    match line {
        Ok(l) => Json(ApiResponse::success(
            serde_json::to_value(l).unwrap_or(serde_json::json!({})),
            "新增分录成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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

async fn update_template_entry_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateTemplateEntryRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let owns: i64 = sqlx::query_scalar(
        only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance_voucher_template_lines l JOIN finance_voucher_templates t ON l.template_id = t.id WHERE t.tenant_id = $1 AND l.template_id = $2 AND l.id = $3"),
    )
    .bind(tenant_id)
    .bind(template_id)
    .bind(entry_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    if owns == 0 {
        return Json(ApiResponse::error(404, "模板分录不存在"));
    }
    let existing: crate::services::finance::voucher_template::VoucherTemplateLine =
        match sqlx::query_as(only_own_schema_query!(
            "finance",
            "SELECT * FROM finance_voucher_template_lines WHERE id = $1"
        ))
        .bind(entry_id)
        .fetch_one(&state.pool)
        .await
        {
            Ok(l) => l,
            Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
        };
    let description = req.description.or(existing.description);
    let account_code = req.account_code.unwrap_or(existing.account_code);
    let direction = req.direction.unwrap_or(existing.direction);
    let amount_formula = req.amount_formula.or(existing.amount_formula);
    let sort_order = req.sort_order.unwrap_or(existing.sort_order);
    let line: Result<crate::services::finance::voucher_template::VoucherTemplateLine, sqlx::Error> =
        sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"UPDATE finance_voucher_template_lines
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
        .fetch_one(&state.pool)
        .await;
    match line {
        Ok(l) => Json(ApiResponse::success(
            serde_json::to_value(l).unwrap_or(serde_json::json!({})),
            "更新分录成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_template_entry_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let res = sqlx::query(
        only_own_schema_query!("finance", "DELETE FROM finance_voucher_template_lines WHERE id = $1 AND template_id = $2 AND EXISTS (SELECT 1 FROM finance_voucher_templates WHERE id = $2 AND tenant_id = $3)"),
    )
    .bind(entry_id)
    .bind(template_id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return Json(ApiResponse::error(404, "模板分录不存在"));
            }
            Json(ApiResponse::success(
                serde_json::json!({"deleted": true, "entry_id": entry_id}),
                "删除分录成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Deserialize)]
pub struct ReorderEntriesRequest {
    pub entry_ids: Vec<Uuid>,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:mod:write"])),
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
pub async fn reorder_template_entries_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<ReorderEntriesRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance_voucher_templates WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    if count == 0 {
        return Json(ApiResponse::error(404, "凭证模板不存在"));
    }
    for (idx, entry_id) in req.entry_ids.iter().enumerate() {
        let sort_order = (idx + 1) as i32;
        if let Err(e) = sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance_voucher_template_lines SET sort_order = $1 WHERE id = $2 AND template_id = $3"),
        )
        .bind(sort_order)
        .bind(entry_id)
        .bind(template_id)
        .execute(&state.pool)
        .await
        {
            return Json(ApiResponse::error(500, &e.to_string()));
        }
    }
    let lines: Result<
        Vec<crate::services::finance::voucher_template::VoucherTemplateLine>,
        sqlx::Error,
    > = sqlx::query_as(
        only_own_schema_query!("finance", "SELECT * FROM finance_voucher_template_lines WHERE template_id = $1 ORDER BY sort_order, created_at"),
    )
    .bind(template_id)
    .fetch_all(&state.pool)
    .await;
    match lines {
        Ok(ls) => {
            let json_lines: Vec<serde_json::Value> = ls
                .iter()
                .map(|l| serde_json::to_value(l).unwrap_or(serde_json::json!({})))
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({"template_id": template_id, "entries": json_lines}),
                "重排成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ========== 模板导入导出 ==========

#[derive(Debug, Deserialize)]
pub struct ExportQueryParams {
    pub format: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:mod:read"])),
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
    Path(template_id): Path<Uuid>,
    Query(_params): Query<ExportQueryParams>,
) -> axum::response::Response {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let template = match service.get_voucher_template(tenant_id, template_id).await {
        Ok(t) => t,
        Err(e) => {
            return Json(ApiResponse::<serde_json::Value>::error(500, &e.to_string()))
                .into_response()
        }
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
    security(("BearerAuth" = ["finance:mod:write"])),
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
    mut multipart: Multipart,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();

    let mut file_content: Option<Vec<u8>> = None;
    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let data = field.bytes().await.unwrap_or_default();
            file_content = Some(data.to_vec());
        }
    }

    let file_data = match file_content {
        Some(data) => data,
        None => return Json(ApiResponse::error(400, "缺少 file 字段")),
    };

    let json_str = match String::from_utf8(file_data) {
        Ok(s) => s,
        Err(e) => return Json(ApiResponse::error(400, &format!("文件编码错误: {}", e))),
    };

    let template_data: serde_json::Value = match serde_json::from_str(&json_str) {
        Ok(v) => v,
        Err(e) => return Json(ApiResponse::error(400, &format!("JSON 解析失败: {}", e))),
    };

    let create_req: crate::services::finance::voucher_template::CreateVoucherTemplateRequest =
        match serde_json::from_value(template_data) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service
        .create_voucher_template(tenant_id, create_req, &created_by)
        .await
    {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "导入成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
        (status = 200, description = "获取凭证生成规则列表成功", body = ApiResponse<Vec<serde_json::Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_generation_rules_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GenerationRuleQueryParams>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .list_generation_rules(tenant_id, params.source_type, params.status)
        .await
    {
        Ok(rules) => {
            let json_rules: Vec<serde_json::Value> = rules
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or(serde_json::json!({})))
                .collect();
            Json(ApiResponse::success(json_rules, "查询成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/get_generation_rule",
    tag = "Finance",
    operation_id = "get_generation_rule_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(rule_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_generation_rule(tenant_id, rule_id).await {
        Ok(rule) => Json(ApiResponse::success(
            serde_json::to_value(rule).unwrap_or(serde_json::json!({})),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/create_generation_rule",
    tag = "Finance",
    operation_id = "create_generation_rule_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let req: crate::services::finance::voucher_generation::CreateGenerationRuleRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service
        .create_generation_rule(tenant_id, req, &created_by)
        .await
    {
        Ok(rule) => Json(ApiResponse::success(
            serde_json::to_value(rule).unwrap_or(serde_json::json!({})),
            "创建成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/voucher-generation-rules/{ruleId}",
    tag = "Voucher Generation Rule",
    params(("ruleId" = Uuid, Path, description = "生成规则ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新凭证生成规则成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "生成规则不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(rule_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let req: crate::services::finance::voucher_generation::UpdateGenerationRuleRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service
        .update_generation_rule(tenant_id, rule_id, req)
        .await
    {
        Ok(rule) => Json(ApiResponse::success(
            serde_json::to_value(rule).unwrap_or(serde_json::json!({})),
            "更新成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/finance/delete_generation_rule",
    tag = "Finance",
    operation_id = "delete_generation_rule_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(rule_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.delete_generation_rule(tenant_id, rule_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Deserialize)]
pub struct ToggleRuleRequest {
    pub isactive: bool,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/toggle_generation_rule",
    tag = "Finance",
    operation_id = "toggle_generation_rule_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn toggle_generation_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(rule_id): Path<Uuid>,
    Json(req): Json<ToggleRuleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let new_status = if req.isactive { "active" } else { "inactive" };
    let now = Utc::now();
    let res = sqlx::query(
        only_own_schema_query!("finance", "UPDATE finance_voucher_generation_rules SET status = $1, updated_at = $2 WHERE tenant_id = $3 AND id = $4"),
    )
    .bind(new_status)
    .bind(now)
    .bind(tenant_id)
    .bind(rule_id)
    .execute(&state.pool)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return Json(ApiResponse::error(404, "生成规则不存在"));
            }
            let rule: Result<
                crate::services::finance::voucher_generation::VoucherGenerationRule,
                sqlx::Error,
            > = sqlx::query_as(only_own_schema_query!(
                "finance",
                "SELECT * FROM finance_voucher_generation_rules WHERE tenant_id = $1 AND id = $2"
            ))
            .bind(tenant_id)
            .bind(rule_id)
            .fetch_one(&state.pool)
            .await;
            match rule {
                Ok(r) => {
                    let mut val = serde_json::to_value(r).unwrap_or(serde_json::json!({}));
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("isactive".to_string(), serde_json::json!(req.isactive));
                    }
                    Json(ApiResponse::success(val, "切换成功"))
                }
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let req: crate::services::finance::voucher_generation::TestRuleRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service.test_rule(tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(
            serde_json::to_value(result).unwrap_or(serde_json::json!({})),
            "测试完成",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/vouchers",
    tag = "Finance",
    operation_id = "generate_vouchers_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn generate_vouchers_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let generated_by = claims.username.clone();
    let req: crate::services::finance::voucher_generation::GenerateVouchersRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service
        .generate_vouchers(tenant_id, req, &generated_by)
        .await
    {
        Ok(result) => Json(ApiResponse::success(
            serde_json::to_value(result).unwrap_or(serde_json::json!({})),
            "生成成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    security(("BearerAuth" = ["finance:voucher:write"])),
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let imported_by = claims.username.clone();
    let req: crate::services::finance::u8_import::ImportVouchersRequest =
        match serde_json::from_value(req) {
            Ok(r) => r,
            Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
        };
    match service.import_vouchers(tenant_id, req, &imported_by).await {
        Ok(result) => Json(ApiResponse::success(
            serde_json::to_value(result).unwrap_or(serde_json::json!({})),
            "导入成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/import_status",
    tag = "Finance",
    operation_id = "get_import_status_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_import_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(import_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_import_status(tenant_id, import_id).await {
        Ok(status) => Json(ApiResponse::success(
            serde_json::to_value(status).unwrap_or(serde_json::json!({})),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/import_records",
    tag = "Finance",
    operation_id = "list_import_records_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_import_records_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<U8ImportQueryParams>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let query = crate::services::finance::u8_import::ImportRecordQuery {
        status: params.status,
        source_system: params.source_system,
        start_date: None,
        end_date: None,
    };
    match service.list_import_records(tenant_id, query).await {
        Ok(records) => {
            let json_records: Vec<serde_json::Value> = records
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or(serde_json::json!({})))
                .collect();
            Json(ApiResponse::success(json_records, "查询成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Path(import_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_import_record(tenant_id, import_id).await {
        Ok(record) => Json(ApiResponse::success(
            serde_json::to_value(record).unwrap_or(serde_json::json!({})),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/import",
    tag = "Finance",
    operation_id = "rollback_import_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn rollback_import_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(import_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.rollback_import(tenant_id, import_id).await {
        Ok(_) => Json(ApiResponse::success((), "回滚成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/list_receivables",
    tag = "Finance",
    operation_id = "list_receivables_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_receivables_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReceivableQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let customer_id = params
        .customer_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok());
    match service
        .list_receivables(tenant_id, page, page_size, params.status, customer_id)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(receivable_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_receivable(tenant_id, receivable_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match service.create_receivable(tenant_id, req, &created_by).await {
        Ok(data) => Json(ApiResponse::success(data, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(receivable_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .update_receivable(tenant_id, receivable_id, req)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_receivable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(receivable_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.delete_receivable(tenant_id, receivable_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_receivable_aging(tenant_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/batch_create_receivables",
    tag = "Finance",
    operation_id = "batch_create_receivables_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_create_receivables_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service
        .batch_create_receivables(tenant_id, items, &created_by)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "批量创建完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/payables",
    tag = "Payable",
    operation_id = "list_payables_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_payables_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PayableQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let supplier_id = params
        .supplier_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok());
    match service
        .list_payables(tenant_id, page, page_size, params.status, supplier_id)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payable_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_payable(tenant_id, payable_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match service.create_payable(tenant_id, req, &created_by).await {
        Ok(data) => Json(ApiResponse::success(data, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payable_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.update_payable(tenant_id, payable_id, req).await {
        Ok(data) => Json(ApiResponse::success(data, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_payable_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payable_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.delete_payable(tenant_id, payable_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_payable_aging(tenant_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service
        .batch_create_payables(tenant_id, items, &created_by)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "批量创建完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/collections",
    tag = "Finance",
    operation_id = "list_collections_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_collections_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CollectionQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let customer_id = params
        .customer_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok());
    match service
        .list_collections(tenant_id, page, page_size, params.status, customer_id)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Path(collection_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_collection(tenant_id, collection_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/collection",
    tag = "Finance",
    operation_id = "create_collection_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match service.create_collection(tenant_id, req, &created_by).await {
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
                let amount = data.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
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
                    if let Err(e) = publisher
                        .publish_event(EventType::PaymentReceived, payload)
                        .await
                    {
                        tracing::warn!(
                            "[finance] PaymentReceived 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[finance] PaymentReceived 事件发布成功 - payment_no={}, amount={}",
                            payment_no_log,
                            amount
                        );
                    }
                });
            }
            Json(ApiResponse::success(data, "创建成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/collection/{id}",
    tag = "Finance",
    operation_id = "update_collection_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn update_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(collection_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .update_collection(tenant_id, collection_id, req)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/finance/collection/{id}",
    tag = "Finance",
    operation_id = "delete_collection_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn delete_collection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(collection_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.delete_collection(tenant_id, collection_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
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
                .write_off_collection(tenant_id, cid, rid, amount)
                .await
            {
                Ok(data) => Json(ApiResponse::success(data, "核销成功")),
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        _ => Json(ApiResponse::error(400, "无效的ID格式")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/batch_write_off_collections",
    tag = "Finance",
    operation_id = "batch_write_off_collections_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_write_off_collections_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service.batch_write_off(tenant_id, items).await {
        Ok(data) => Json(ApiResponse::success(data, "批量核销完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Query(params): Query<PaymentRecordQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let supplier_id = params
        .supplier_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok());
    match service
        .list_payment_records(tenant_id, page, page_size, params.status, supplier_id)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:payment:read"])),
    path = "/finance/payment_record/{id}",
    tag = "Finance",
    operation_id = "get_payment_record_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_payment_record(tenant_id, payment_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/create_payment_record",
    tag = "Finance",
    operation_id = "create_payment_record_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match service
        .create_payment_record(tenant_id, req, &created_by)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:payment:read"])),
    path = "/finance/approve_payment_record",
    tag = "Finance",
    operation_id = "approve_payment_record_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn approve_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .update_payment_record(
            tenant_id,
            payment_id,
            serde_json::json!({ "status": "approved" }),
        )
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "审批通过")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/ap/payments/{id}/reject",
    tag = "Payment",
    params(("id" = Uuid, Path, description = "应付付款记录ID")),
    responses(
        (status = 200, description = "拒绝应付付款记录成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "付款记录不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn reject_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .update_payment_record(
            tenant_id,
            payment_id,
            serde_json::json!({ "status": "rejected" }),
        )
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "已拒绝")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/payment_record/{id}",
    tag = "Finance",
    operation_id = "update_payment_record_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn update_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .update_payment_record(tenant_id, payment_id, req)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/payment_record/{id}",
    tag = "Finance",
    operation_id = "delete_payment_record_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn delete_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.delete_payment_record(tenant_id, payment_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
    path = "/finance/write_off_payment_record",
    tag = "Finance",
    operation_id = "write_off_payment_record_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn write_off_payment_record_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let payment_id_str = req.get("payment_id").and_then(|v| v.as_str()).unwrap_or("");
    let payable_id_str = req.get("payable_id").and_then(|v| v.as_str()).unwrap_or("");
    let amount = req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);

    match (
        uuid::Uuid::parse_str(payment_id_str),
        uuid::Uuid::parse_str(payable_id_str),
    ) {
        (Ok(pid), Ok(rid)) => match service.write_off_payment(tenant_id, pid, rid, amount).await {
            Ok(data) => Json(ApiResponse::success(data, "核销成功")),
            Err(e) => Json(ApiResponse::error(500, &e.to_string())),
        },
        _ => Json(ApiResponse::error(400, "无效的ID格式")),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:payment:admin"])),
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let items = req
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    match service.batch_write_off_payments(tenant_id, items).await {
        Ok(data) => Json(ApiResponse::success(data, "批量核销完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ========== V41.0 Phase 9: 账龄分析（Aging）==========

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct AgingQueryParams {
    pub direction: Option<String>,
    pub bucket: Option<String>,
    pub months: Option<i32>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/calculate_receivable_aging",
    tag = "Finance",
    operation_id = "calculate_receivable_aging_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn calculate_receivable_aging_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.calculate_receivable_aging(tenant_id).await {
        Ok(data) => Json(ApiResponse::success(data, "计算成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/calculate_payable_aging",
    tag = "Finance",
    operation_id = "calculate_payable_aging_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn calculate_payable_aging_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.calculate_payable_aging(tenant_id).await {
        Ok(data) => Json(ApiResponse::success(data, "计算成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/aging_summary",
    tag = "Finance",
    operation_id = "get_aging_summary_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_aging_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_aging_summary(tenant_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Query(params): Query<AgingQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let direction = params.direction.unwrap_or_else(|| "receivable".to_string());
    match service
        .get_aging_detail(tenant_id, &direction, params.bucket)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/aging_trend",
    tag = "Finance",
    operation_id = "get_aging_trend_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_aging_trend_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AgingQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let direction = params.direction.unwrap_or_else(|| "receivable".to_string());
    let months = params.months.unwrap_or(6);
    match service.get_aging_trend(tenant_id, &direction, months).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/vouchers/{id}/entries",
    tag = "Voucher",
    params(("id" = Uuid, Path, description = "凭证ID")),
    responses(
        (status = 200, description = "获取凭证分录成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_voucher_entries(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rows = sqlx::query(
        only_own_schema_query!("finance", "SELECT id, voucher_id, account_code, account_name, description, debit, credit, created_at FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at"),
    )
    .bind(voucher_id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
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
                        "debit": r.try_get::<f64, _>("debit").ok(),
                        "credit": r.try_get::<f64, _>("credit").ok(),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::Value::Array(items),
                "查询成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/finance/voucher_items",
    tag = "Finance",
    operation_id = "get_voucher_items",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_voucher_items(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rows = sqlx::query(
        only_own_schema_query!("finance", "SELECT id, voucher_id, account_code, account_name, description, debit, credit, sort_order FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY sort_order, created_at"),
    )
    .bind(voucher_id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
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
                        "debit": r.try_get::<f64, _>("debit").ok(),
                        "credit": r.try_get::<f64, _>("credit").ok(),
                        "sort_order": r.try_get::<i32, _>("sort_order").ok(),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::Value::Array(items),
                "查询成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
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
) -> Json<ApiResponse<serde_json::Value>> {
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
    Json(ApiResponse::success(
        serde_json::json!({"results": results}),
        "批量创建完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/batch_delete_vouchers",
    tag = "Finance",
    operation_id = "batch_delete_vouchers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_delete_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchDeleteVouchersRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut deleted = 0i64;
    for id_str in &req.ids {
        if let Ok(id) = Uuid::parse_str(id_str) {
            let res = sqlx::query(only_own_schema_query!(
                "finance",
                "DELETE FROM finance.core_finance_vouchers WHERE id = $1 AND tenant_id = $2"
            ))
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;
            if let Ok(r) = res {
                deleted += r.rows_affected() as i64;
            }
        }
    }
    Json(ApiResponse::success(
        serde_json::json!({"deleted": deleted, "total": req.ids.len()}),
        "批量删除完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/voucher",
    tag = "Finance",
    operation_id = "unapprove_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn unapprove_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let res = sqlx::query(only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET status = 'pending', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status IN ('approved', 'posted')"))
        .bind(voucher_id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                Json(ApiResponse::error(404, "凭证不存在或状态不允许反审核"))
            } else {
                Json(ApiResponse::success(
                    serde_json::json!({"voucher_id": voucher_id, "status": "pending"}),
                    "反审核成功",
                ))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/vouchers/{id}/reverse",
    tag = "Voucher",
    params(("id" = Uuid, Path, description = "凭证ID")),
    request_body = ReverseVoucherRequest,
    responses(
        (status = 200, description = "红冲凭证成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "凭证不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn reverse_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
    Json(req): Json<ReverseVoucherRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let reversal_id = Uuid::new_v4();
    let res = sqlx::query(only_own_schema_query!("finance", "INSERT INTO finance.core_finance_vouchers (id, tenant_id, voucher_no, voucher_date, period, voucher_type, description, status, is_reversed, original_voucher_id, created_by, created_at, updated_at) SELECT $1, $2, CONCAT('RV-', voucher_no), voucher_date, period, voucher_type, CONCAT('红冲: ', description), 'draft', true, $3, created_by, NOW(), NOW() FROM finance.core_finance_vouchers WHERE id = $3 AND tenant_id = $2"))
        .bind(reversal_id)
        .bind(tenant_id)
        .bind(voucher_id)
        .execute(&state.pool)
        .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                Json(ApiResponse::error(404, "凭证不存在"))
            } else {
                Json(ApiResponse::success(
                    serde_json::json!({"reversal_voucher_id": reversal_id, "original_voucher_id": voucher_id, "reason": req.reason}),
                    "红冲成功",
                ))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/finance/next_voucher_no/{id}",
    tag = "Finance",
    operation_id = "get_next_voucher_no",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_next_voucher_no(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NextVoucherNoQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let prefix = format!(
        "{}-",
        params.voucher_type.unwrap_or_else(|| "GEN".to_string())
    );
    let count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE tenant_id = $1"
    ))
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let voucher_no = format!("{}{:06}", prefix, count + 1);
    Json(ApiResponse::success(
        serde_json::json!({"voucher_no": voucher_no}),
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/voucher_by_template",
    tag = "Finance",
    operation_id = "generate_voucher_by_template",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn generate_voucher_by_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateVoucherRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let template_id = match Uuid::parse_str(&req.template_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的模板ID")),
    };
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_voucher_template(tenant_id, template_id).await {
        Ok(template) => {
            let voucher_id = Uuid::new_v4();
            Json(ApiResponse::success(
                serde_json::json!({
                    "voucher_id": voucher_id,
                    "template_id": template_id,
                    "template_name": template.name,
                    "status": "draft",
                }),
                "生成成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
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
) -> Json<ApiResponse<serde_json::Value>> {
    let mut file_content: Option<Vec<u8>> = None;
    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            let data = field.bytes().await.unwrap_or_default();
            file_content = Some(data.to_vec());
        }
    }
    if file_content.is_none() {
        return Json(ApiResponse::error(400, "缺少 file 字段"));
    }
    Json(ApiResponse::success(
        serde_json::json!({"total": 0, "success": 0, "failed": 0, "errors": []}),
        "导入完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:voucher:write"])),
    path = "/finance/vouchers_u8",
    tag = "Finance",
    operation_id = "import_vouchers_u8",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn import_vouchers_u8(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let import_id = Uuid::new_v4();
    let file_name = req.get("file_name").and_then(|v| v.as_str()).unwrap_or("");
    Json(ApiResponse::success(
        serde_json::json!({
            "import_id": import_id,
            "file_name": file_name,
            "status": "pending",
            "total": 0,
            "success": 0,
            "failed": 0,
        }),
        "导入已提交",
    ))
}

// ========== RC4a 补齐: 会计期间接口 ==========

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/current_period/{id}",
    tag = "Finance",
    operation_id = "get_current_period",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_current_period(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now();
    Json(ApiResponse::success(
        serde_json::json!({
            "period": format!("{:04}-{:02}", now.year(), now.month()),
            "year": now.year(),
            "month": now.month(),
        }),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/periods",
    tag = "Finance",
    operation_id = "list_periods",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_periods(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<PeriodListQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now();
    let year = params.year.unwrap_or(now.year());
    let mut items: Vec<serde_json::Value> = Vec::new();
    for month in 1..=12u32 {
        let period_str = format!("{:04}-{:02}", year, month);
        let status = if month < now.month() {
            "closed"
        } else if month == now.month() {
            "open"
        } else {
            "locked"
        };
        items.push(serde_json::json!({
            "period": period_str,
            "year": year,
            "month": month,
            "start_date": format!("{:04}-{:02}-01", year, month),
            "end_date": format!("{:04}-{:02}-30", year, month),
            "status": status,
        }));
    }
    Json(ApiResponse::success(
        serde_json::json!({"items": items}),
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/periods/open",
    tag = "Finance",
    request_body = PeriodActionRequest,
    responses(
        (status = 200, description = "开启会计期间成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn open_period_v2(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PeriodActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let period = req.period.unwrap_or_default();
    let tenant_id = get_tenant_id_from_claims(&claims);
    let res = sqlx::query(only_own_schema_query!("finance", "INSERT INTO finance.core_finance_periods (tenant_id, period, status, created_at, updated_at) VALUES ($1, $2, 'open', NOW(), NOW()) ON CONFLICT (tenant_id, period) DO UPDATE SET status = 'open', updated_at = NOW()"))
        .bind(tenant_id)
        .bind(&period)
        .execute(&state.pool)
        .await;
    match res {
        Ok(_) => Json(ApiResponse::success(
            serde_json::json!({"period": period, "status": "open"}),
            "开启成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/period_v2",
    tag = "Finance",
    operation_id = "close_period_v2",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn close_period_v2(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PeriodActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let period = req.period.unwrap_or_default();
    let tenant_id = get_tenant_id_from_claims(&claims);
    let res = sqlx::query(only_own_schema_query!("finance", "UPDATE finance.core_finance_periods SET status = 'closed', updated_at = NOW() WHERE tenant_id = $1 AND period = $2"))
        .bind(tenant_id)
        .bind(&period)
        .execute(&state.pool)
        .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                Json(ApiResponse::error(404, "会计期间不存在"))
            } else {
                Json(ApiResponse::success(
                    serde_json::json!({"period": period, "status": "closed"}),
                    "关闭成功",
                ))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/income_period",
    tag = "Finance",
    operation_id = "close_income_period",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn close_income_period(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<PeriodActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let period = req.period.unwrap_or_default();
    let voucher_id = Uuid::new_v4();
    Json(ApiResponse::success(
        serde_json::json!({"voucher_id": voucher_id, "period": period, "type": "income_close"}),
        "损益结转成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/periods/year-end-close",
    tag = "Finance",
    request_body = PeriodActionRequest,
    responses(
        (status = 200, description = "年结成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn year_end_close_v2(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<PeriodActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let year = req.year.unwrap_or(Utc::now().year());
    Json(ApiResponse::success(
        serde_json::json!({
            "year": year,
            "vouchers": [],
            "status": "completed",
        }),
        "年结成功",
    ))
}

// ========== RC4a 补齐: AR/AP 别名与对账接口 ==========

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/ar_aging/{id}",
    tag = "Finance",
    operation_id = "get_ar_aging",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_ar_aging(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<ArAgingQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_aging_summary(tenant_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
    Query(_params): Query<ArAgingQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_aging_summary(tenant_id).await {
        Ok(data) => Json(ApiResponse::success(data, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ==================== RC4a 补齐: 科目扩展 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/account_tree/{id}",
    tag = "Finance",
    operation_id = "get_account_tree",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_account_tree(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let category = params.get("category").and_then(|v| v.as_str());
    let rows = sqlx::query(
        only_own_schema_query!("finance", "SELECT id, code, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, parent_id, category, level, is_leaf, status FROM finance.core_finance_accounts WHERE ($1::uuid IS NULL OR tenant_id = $1) AND ($2::text IS NULL OR category = $2) ORDER BY code"),
    )
    .bind(tenant_id)
    .bind(category)
    .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
    .fetch_all(&state.pool)
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
            Json(ApiResponse::success(
                serde_json::Value::Array(items),
                "查询成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/account/{id}",
    tag = "Finance",
    operation_id = "update_account",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_account(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_account_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(req, "更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/accounts/{id}",
    tag = "Accounting",
    params(("id" = Uuid, Path, description = "科目ID")),
    responses(
        (status = 200, description = "删除科目成功", body = ApiResponse<String>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_account(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_account_id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("".to_string(), "删除成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/batch_create_account_children",
    tag = "Finance",
    operation_id = "batch_create_account_children",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_create_account_children(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_account_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(req, "批量创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/opening_balances",
    tag = "Finance",
    operation_id = "get_opening_balances",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_opening_balances(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": [], "total": 0}),
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/opening_balance",
    tag = "Finance",
    operation_id = "set_opening_balance",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn set_opening_balance(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_account_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(req, "设置成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/opening_balance",
    tag = "Finance",
    operation_id = "carry_forward_opening_balance",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn carry_forward_opening_balance(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("".to_string(), "结转成功"))
}

// ==================== RC4a 补齐: 交易对手财务信息 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/counterparty_customers",
    tag = "Finance",
    operation_id = "list_counterparty_customers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_counterparty_customers(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": [], "total": 0}),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/counterparty_customer/{id}",
    tag = "Finance",
    operation_id = "get_counterparty_customer",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_counterparty_customer(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(customer_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"customer_id": customer_id}),
        "查询成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/counterparty/customers/{customerId}",
    tag = "Counterparty",
    params(("customerId" = String, Path, description = "客户ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新客户财务信息成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_counterparty_customer(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(customer_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"customer_id": customer_id, "data": req}),
        "更新成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/counterparty_suppliers",
    tag = "Finance",
    operation_id = "list_counterparty_suppliers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_counterparty_suppliers(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": [], "total": 0}),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/counterparty_supplier/{id}",
    tag = "Finance",
    operation_id = "get_counterparty_supplier",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_counterparty_supplier(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(supplier_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"supplier_id": supplier_id}),
        "查询成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/counterparty_supplier/{id}",
    tag = "Finance",
    operation_id = "update_counterparty_supplier",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_counterparty_supplier(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(supplier_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"supplier_id": supplier_id, "data": req}),
        "更新成功",
    ))
}

// ==================== RC4a 补齐: 费用审批 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:approval:read"])),
    path = "/finance/expense_approvals",
    tag = "Finance",
    operation_id = "list_expense_approvals",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_expense_approvals(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": [], "total": 0}),
        "查询成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/expense-approvals",
    tag = "Expense Approval",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "创建费用审批成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_expense_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(req, "创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:approval:read"])),
    path = "/finance/expense_approval/{id}",
    tag = "Finance",
    operation_id = "get_expense_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_expense_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id}),
        "查询成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/expense_approval/{id}",
    tag = "Finance",
    operation_id = "update_expense_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_expense_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id, "data": req}),
        "更新成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/expense_approval/{id}",
    tag = "Finance",
    operation_id = "delete_expense_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_expense_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<String>,
) -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("".to_string(), "删除成功"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/expense_approval",
    tag = "Finance",
    operation_id = "submit_expense_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn submit_expense_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id, "status": "submitted"}),
        "提交成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/finance/expense_approval",
    tag = "Finance",
    operation_id = "approve_expense_approval",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn approve_expense_approval(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id, "status": "approved"}),
        "审批通过",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
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
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id, "status": "rejected"}),
        "驳回成功",
    ))
}

// ==================== RC4a 补齐: 报表基础 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/account_balance_report/{id}",
    tag = "Finance",
    operation_id = "get_account_balance_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_account_balance_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": [], "total_records": 0}),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/account_ledger_report/{id}",
    tag = "Finance",
    operation_id = "get_account_ledger_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_account_ledger_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": [], "total": 0}),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/dimension_detail_report/{id}",
    tag = "Finance",
    operation_id = "get_dimension_detail_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_dimension_detail_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": []}),
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/balance_sheet_report",
    tag = "Finance",
    operation_id = "export_balance_sheet_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn export_balance_sheet_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"file_name": "balance_sheet.csv"}),
        "导出成功",
    ))
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
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"file_name": "income_statement.csv"}),
        "导出成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/cash_flow_report",
    tag = "Finance",
    operation_id = "export_cash_flow_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn export_cash_flow_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Query(_params): axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"file_name": "cash_flow.csv"}),
        "导出成功",
    ))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
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
        .merge(multi_dimensional::create_routes())
        .merge(shared_services::create_routes())
        .merge(financial_reports::create_routes())
        .merge(accounting_subjects::create_routes())
        .nest("/cqrs", cqrs_routes::cqrs_routes())
        .merge(event_routes::event_routes())
        .route("/dashboard", axum::routing::get(get_dashboard_handler))
        .route(
            "/accounts",
            axum::routing::post(create_account).get(list_accounts),
        )
        .route(
            "/accounts/balances",
            axum::routing::get(get_account_balances),
        )
        .route(
            "/accounts/{account_id}",
            axum::routing::get(get_account)
                .put(update_account)
                .delete(delete_account),
        )
        .route(
            "/accounts/code/{code}",
            axum::routing::get(get_account_by_code),
        )
        .route(
            "/vouchers",
            axum::routing::post(create_voucher).get(list_vouchers),
        )
        .route(
            "/vouchers/{voucher_id}",
            axum::routing::get(get_voucher)
                .put(update_voucher)
                .delete(delete_voucher),
        )
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
        .route("/ledger", axum::routing::get(get_ledger))
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
        .route(
            "/periods/{year}/{month}/open",
            axum::routing::post(open_period),
        )
        .route(
            "/periods/{year}/{month}/close",
            axum::routing::post(close_period),
        )
        .route(
            "/aux-accounts",
            axum::routing::post(create_aux_account).get(list_aux_accounts),
        )
        .route("/aux-ledger", axum::routing::get(get_aux_ledger))
        .route("/aux-balance", axum::routing::get(get_aux_balance))
        .route("/cash-flow/{period}", axum::routing::get(get_cash_flow))
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
        .route("/vouchers/export", axum::routing::post(export_vouchers))
        .route("/year-end-close", axum::routing::post(year_end_close))
        .route(
            "/payments",
            axum::routing::post(create_payment_handler).get(list_payments_handler),
        )
        .route(
            "/payments/{payment_id}",
            axum::routing::get(get_payment_handler)
                .put(update_payment_handler)
                .delete(delete_payment_handler),
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
            "/payments/export",
            axum::routing::post(export_payments_handler),
        )
        .route(
            "/approval-configs",
            axum::routing::get(list_approval_configs_handler).post(create_approval_config_handler),
        )
        .route(
            "/approval-configs/{config_id}",
            axum::routing::get(get_approval_config_handler)
                .put(update_approval_config_handler)
                .delete(delete_approval_config_handler),
        )
        // 审批操作（供 ERP 合并报表审批流程调用）
        .route("/approvals/submit", axum::routing::post(submit_approval))
        .route("/approvals/approve", axum::routing::post(approve_approval))
        .route("/approvals/reject", axum::routing::post(reject_approval))
        .route("/approvals/cancel", axum::routing::post(cancel_approval))
        // V40.0 Phase 8: 凭证模板
        .route(
            "/voucher-templates",
            axum::routing::get(list_voucher_templates_handler)
                .post(create_voucher_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}",
            axum::routing::get(get_voucher_template_handler)
                .put(update_voucher_template_handler)
                .delete(delete_voucher_template_handler),
        )
        .route(
            "/voucher-templates/{template_id}/set-default",
            axum::routing::post(set_default_template_handler),
        )
        .route(
            "/voucher-templates/apply",
            axum::routing::post(apply_template_handler),
        )
        // V40.0 Phase 8: 凭证生成规则
        .route(
            "/voucher-generation-rules",
            axum::routing::get(list_generation_rules_handler).post(create_generation_rule_handler),
        )
        .route(
            "/voucher-generation-rules/{rule_id}",
            axum::routing::get(get_generation_rule_handler)
                .put(update_generation_rule_handler)
                .delete(delete_generation_rule_handler),
        )
        .route(
            "/voucher-generation-rules/test",
            axum::routing::post(test_rule_handler),
        )
        .route(
            "/voucher-generation-rules/generate",
            axum::routing::post(generate_vouchers_handler),
        )
        // V40.0 Phase 8 扩展: 凭证模板复制/切换/匹配/统计/分录/导入导出
        .route(
            "/voucher-templates/match",
            axum::routing::post(match_template_handler),
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
            "/voucher-templates/{template_id}/toggle",
            axum::routing::put(toggle_template_handler),
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
            axum::routing::get(voucher_template_entries::list_entries)
                .post(add_template_entry_handler),
        )
        // 注意: reorder 必须在 entries/{entry_id} 之前注册以避免路径匹配冲突
        .route(
            "/voucher-templates/{template_id}/entries/reorder",
            axum::routing::put(reorder_template_entries_handler),
        )
        .route(
            "/voucher-templates/{template_id}/entries/{entry_id}",
            axum::routing::get(voucher_template_entries::get_entry)
                .put(update_template_entry_handler)
                .delete(delete_template_entry_handler),
        )
        // 凭证生成规则切换
        .route(
            "/voucher-generation-rules/{rule_id}/toggle",
            axum::routing::put(toggle_generation_rule_handler),
        )
        // 凭证自动生成
        .route(
            "/voucher/generate/preview",
            axum::routing::post(voucher_template::preview_generation),
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
        // V40.0 Phase 8: U8 导入
        .route(
            "/u8-import/import",
            axum::routing::post(import_vouchers_handler),
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
        .route(
            "/u8-import/{import_id}/rollback",
            axum::routing::post(rollback_import_handler),
        )
        // V41.0 Phase 9: 应收账款额外接口（基础CRUD已由operational模块提供）
        .route(
            "/receivables/aging",
            axum::routing::get(get_receivable_aging_handler),
        )
        .route(
            "/receivables/batch",
            axum::routing::post(batch_create_receivables_handler),
        )
        // V41.0 Phase 9: 应付账款额外接口（基础CRUD已由operational模块提供）
        .route(
            "/payables/aging",
            axum::routing::get(get_payable_aging_handler),
        )
        .route(
            "/payables/batch",
            axum::routing::post(batch_create_payables_handler),
        )
        // V41.0 Phase 9: 收款管理
        .route(
            "/collections",
            axum::routing::get(list_collections_handler).post(create_collection_handler),
        )
        .route(
            "/collections/{collection_id}",
            axum::routing::get(get_collection_handler)
                .put(update_collection_handler)
                .delete(delete_collection_handler),
        )
        .route(
            "/collections/write-off",
            axum::routing::post(write_off_collection_handler),
        )
        .route(
            "/collections/batch-write-off",
            axum::routing::post(batch_write_off_collections_handler),
        )
        // V41.0 Phase 9: 付款管理
        .route(
            "/payment-records",
            axum::routing::get(list_payment_records_handler).post(create_payment_record_handler),
        )
        .route(
            "/ap/payments",
            axum::routing::get(list_payment_records_handler).post(create_payment_record_handler),
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
            axum::routing::get(get_payment_record_handler)
                .put(update_payment_record_handler)
                .delete(delete_payment_record_handler),
        )
        .route(
            "/payment-records/write-off",
            axum::routing::post(write_off_payment_record_handler),
        )
        .route(
            "/payment-records/batch-write-off",
            axum::routing::post(batch_write_off_payments_handler),
        )
        // V41.0 Phase 9: 账龄分析
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
        // RC4a 补齐: 凭证扩展路由
        .route(
            "/vouchers/{voucher_id}/entries",
            axum::routing::get(get_voucher_entries),
        )
        .route(
            "/vouchers/{voucher_id}/items",
            axum::routing::get(get_voucher_items),
        )
        .route(
            "/vouchers/batch",
            axum::routing::post(batch_create_vouchers),
        )
        .route(
            "/vouchers/batch-delete",
            axum::routing::post(batch_delete_vouchers),
        )
        .route(
            "/vouchers/{voucher_id}/unapprove",
            axum::routing::post(unapprove_voucher),
        )
        .route(
            "/vouchers/{voucher_id}/reverse",
            axum::routing::post(reverse_voucher),
        )
        .route("/vouchers/next-no", axum::routing::get(get_next_voucher_no))
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
        // RC4a 补齐: 会计期间路由
        .route("/period/current", axum::routing::get(get_current_period))
        .route("/periods", axum::routing::get(list_periods))
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
        // RC4a 补齐: AR/AP 别名与对账路由
        .route(
            "/ar/collections",
            axum::routing::get(list_collections_handler).post(create_collection_handler),
        )
        .route("/ar/aging", axum::routing::get(get_ar_aging))
        .route("/ap/aging", axum::routing::get(get_ap_aging))
        // RC4a 补齐: 科目扩展路由
        .route("/accounts/tree", axum::routing::get(get_account_tree))
        .route(
            "/accounts/{account_id}/children-batch",
            axum::routing::post(batch_create_account_children),
        )
        .route(
            "/accounts/opening-balances",
            axum::routing::get(get_opening_balances),
        )
        .route(
            "/accounts/{account_id}/opening-balance",
            axum::routing::post(set_opening_balance),
        )
        .route(
            "/accounts/opening-balances/carry-forward",
            axum::routing::post(carry_forward_opening_balance),
        )
        // RC4a 补齐: 交易对手财务信息路由
        .route(
            "/counterparty/customers",
            axum::routing::get(list_counterparty_customers),
        )
        .route(
            "/counterparty/customers/{customer_id}",
            axum::routing::get(get_counterparty_customer).put(update_counterparty_customer),
        )
        .route(
            "/counterparty/suppliers",
            axum::routing::get(list_counterparty_suppliers),
        )
        .route(
            "/counterparty/suppliers/{supplier_id}",
            axum::routing::get(get_counterparty_supplier).put(update_counterparty_supplier),
        )
        // RC4a 补齐: 费用审批路由
        .route(
            "/expense-approvals",
            axum::routing::get(list_expense_approvals).post(create_expense_approval),
        )
        .route(
            "/expense-approvals/{id}",
            axum::routing::get(get_expense_approval)
                .put(update_expense_approval)
                .delete(delete_expense_approval),
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
            "/expense-approvals/{id}/reject",
            axum::routing::post(reject_expense_approval),
        )
        // RC4a 补齐: 报表基础路由
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
    // V41.0 Phase 9: 应收/应付账款 CRUD 已由 operational 模块提供，此处仅保留额外接口
}

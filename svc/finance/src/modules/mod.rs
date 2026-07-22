mod reconciliation;

use axum::{
    extract::{Json, Path, Query, State},
    Extension, Router,
};
use chrono::{DateTime, Utc};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use tokio;
use uuid::Uuid;

use crate::models::*;
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared::event::{EventType, FinancePaymentMadePayload};
use topems_shared::{ApiResponse, Claims};

#[derive(Debug, Deserialize)]
pub struct AccountQueryParams {
    #[allow(dead_code)]
    parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct VoucherQueryParams {
    status: Option<String>,
    period: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LedgerQueryParams {
    account_id: Option<Uuid>,
    account_code: Option<String>,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
    period: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountBalanceQueryParams {
    account_ids: Option<Vec<Uuid>>,
    period: String,
    company_id: Option<String>,
    department_id: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuxQueryParams {
    pub aux_type: String,
    pub aux_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub period: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

async fn count_table_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Uuid) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE tenant_id = $1",
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
    tenant_id: Uuid,
    status: &str,
) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND status = $2",
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

async fn sum_table_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Uuid) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COALESCE(SUM(amount), 0) FROM {} WHERE tenant_id = $1",
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

async fn sum_overdue_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Uuid) -> i64 {
    match sqlx::query_scalar(&format!("SELECT COALESCE(SUM(amount), 0) FROM {} WHERE tenant_id = $1 AND due_date < NOW() AND status = 'unpaid'", table))
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn create_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAccountRequest>,
) -> Json<ApiResponse<Account>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.create_account(tenant_id, req).await {
        Ok(account) => Json(ApiResponse::success(account, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(account_id): Path<Uuid>,
) -> Json<ApiResponse<Account>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_account(tenant_id, account_id).await {
        Ok(account) => Json(ApiResponse::success(account, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_account_by_code(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(code): Path<String>,
) -> Json<ApiResponse<Account>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_account_by_code(tenant_id, &code).await {
        Ok(account) => Json(ApiResponse::success(account, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_account_balances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AccountBalanceQueryParams>,
) -> Json<ApiResponse<Vec<TrialBalance>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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

async fn list_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<AccountQueryParams>,
) -> Json<ApiResponse<Vec<Account>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.list_accounts(tenant_id).await {
        Ok(accounts) => Json(ApiResponse::success(accounts, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<ApiResponse<VoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();
    match service.create_voucher(tenant_id, req, &created_by).await {
        Ok(voucher) => Json(ApiResponse::success(voucher, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<VoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_voucher(tenant_id, voucher_id).await {
        Ok(voucher) => Json(ApiResponse::success(voucher, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VoucherQueryParams>,
) -> Json<ApiResponse<Vec<Voucher>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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

async fn submit_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.submit_voucher(tenant_id, voucher_id).await {
        Ok(voucher) => Json(ApiResponse::success(voucher, "提交成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn approve_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let approved_by = claims.username.clone();
    match service
        .approve_voucher(tenant_id, voucher_id, &approved_by)
        .await
    {
        Ok(voucher) => Json(ApiResponse::success(voucher, "审批成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn post_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let posted_by = claims.username.clone();
    match service
        .post_voucher(tenant_id, voucher_id, &posted_by)
        .await
    {
        Ok(voucher) => Json(ApiResponse::success(voucher, "过账成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_ledger(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LedgerQueryParams>,
) -> Json<ApiResponse<Vec<LedgerEntry>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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

async fn get_trial_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<TrialBalance>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_trial_balance(tenant_id, &period).await {
        Ok(balance) => Json(ApiResponse::success(balance, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_balance_sheet(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<BalanceSheet>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_balance_sheet(tenant_id, &period).await {
        Ok(sheet) => Json(ApiResponse::success(sheet, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_income_statement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<IncomeStatement>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_income_statement(tenant_id, &period).await {
        Ok(statement) => Json(ApiResponse::success(statement, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn close_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((year, month)): Path<(i32, i32)>,
) -> Json<ApiResponse<Period>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let closed_by = claims.username.clone();
    match service
        .close_period(tenant_id, year, month, &closed_by)
        .await
    {
        Ok(period) => Json(ApiResponse::success(period, "期间已关闭")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn open_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((year, month)): Path<(i32, i32)>,
) -> Json<ApiResponse<Period>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.open_period(tenant_id, year, month).await {
        Ok(period) => Json(ApiResponse::success(period, "期间已打开")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_aux_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAuxiliaryAccountRequest>,
) -> Json<ApiResponse<AuxiliaryAccount>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.create_aux_account(tenant_id, req).await {
        Ok(account) => Json(ApiResponse::success(account, "辅助科目创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_aux_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
) -> Json<ApiResponse<Vec<AuxiliaryAccount>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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
    match service.list_aux_accounts(tenant_id, aux_type).await {
        Ok(accounts) => Json(ApiResponse::success(accounts, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_aux_ledger(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
) -> Json<ApiResponse<Vec<AuxLedgerEntry>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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
    match service.get_aux_ledger(tenant_id, query).await {
        Ok(entries) => Json(ApiResponse::success(entries, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_aux_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
) -> Json<ApiResponse<Vec<AuxBalanceReport>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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
    match service.get_aux_balance(tenant_id, query).await {
        Ok(balance) => Json(ApiResponse::success(balance, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_cash_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<CashFlowStatement>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_cash_flow_statement(tenant_id, &period).await {
        Ok(statement) => Json(ApiResponse::success(statement, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn batch_submit_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<ApiResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service
        .batch_submit_vouchers(tenant_id, req.voucher_ids)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "批量提交完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn batch_approve_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<ApiResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let approved_by = claims.username.clone();
    match service
        .batch_approve_vouchers(tenant_id, req.voucher_ids, &approved_by)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "批量审批完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn batch_post_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<ApiResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let posted_by = claims.username.clone();
    match service
        .batch_post_vouchers(tenant_id, req.voucher_ids, &posted_by)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "批量过账完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn export_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExportVoucherRequest>,
) -> Json<ApiResponse<ExportVoucherResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.export_vouchers(tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "导出成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn submit_for_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SubmitApprovalRequest>,
) -> Json<ApiResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let submitted_by = claims.username.clone();
    match service
        .submit_for_approval(
            tenant_id,
            req.doc_type,
            req.doc_id,
            req.doc_no,
            &submitted_by,
        )
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "提交审批成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn approve_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<(ApprovalDocType, Uuid, ApproveRequest)>,
) -> Json<ApiResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let approved_by = claims.username.clone();
    let (doc_type, doc_id, req) = req;
    match service
        .approve(tenant_id, doc_type, doc_id, &approved_by, req.comment)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "审批通过")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn reject_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<(ApprovalDocType, Uuid, RejectRequest)>,
) -> Json<ApiResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let rejected_by = claims.username.clone();
    let (doc_type, doc_id, req) = req;
    match service
        .reject(
            tenant_id,
            doc_type,
            doc_id,
            &rejected_by,
            req.reason,
            req.comment,
        )
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "审批驳回")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn cancel_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<(ApprovalDocType, Uuid)>,
) -> Json<ApiResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let (doc_type, doc_id) = req;
    match service.cancel_approval(tenant_id, doc_type, doc_id).await {
        Ok(result) => Json(ApiResponse::success(result, "撤回审批成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_approval_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ApprovalStatusQuery>,
) -> Json<ApiResponse<Option<ApprovalWorkflow>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service
        .get_approval_status(tenant_id, params.doc_type, params.doc_id)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn year_end_close(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<YearEndCloseRequest>,
) -> Json<ApiResponse<YearEndCloseResult>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();
    match service
        .year_end_close(tenant_id, req.year, &created_by, req.description)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "年末结转成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_pending_approvals(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ApprovalListQuery>,
) -> Json<ApiResponse<ApprovalListResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    match service
        .list_pending_approvals(tenant_id, params.doc_type, page, page_size)
        .await
    {
        Ok((workflows, total)) => Json(ApiResponse::success(
            ApprovalListResponse {
                workflows,
                total,
                page,
                page_size,
            },
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();
    match service.create_payment(tenant_id, req, &created_by).await {
        Ok(payment) => {
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let payment_id = payment.id;
                let payment_no = payment.payment_no.clone();
                let invoice_id = None;
                let amount = payment.total_amount.to_f64().unwrap_or(0.0);
                let paid_by = Some(created_by.clone());
                let paid_at = Some(Utc::now());
                tokio::spawn(async move {
                    let payload = FinancePaymentMadePayload {
                        payment_id,
                        payment_no,
                        invoice_id,
                        amount,
                        paid_by,
                        paid_at,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::FinancePaymentMade, payload)
                        .await
                    {
                        tracing::warn!(
                            "[finance] FinancePaymentMade 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[finance] FinancePaymentMade 事件发布成功 - payment_id={}",
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

async fn get_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.get_payment(tenant_id, payment_id).await {
        Ok(payment) => Json(ApiResponse::success(payment, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PaymentListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

async fn list_payments_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaymentListParams>,
) -> Json<ApiResponse<PaymentListResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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

async fn update_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let updated_by = claims.username.clone();
    match service
        .update_payment(tenant_id, payment_id, req, &updated_by)
        .await
    {
        Ok(payment) => Json(ApiResponse::success(payment, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    match service.delete_payment(tenant_id, payment_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn submit_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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

async fn approve_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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

async fn reject_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
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

async fn execute_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(payment_id): Path<Uuid>,
    Json(req): Json<crate::models::ExecutePaymentRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let executed_by = claims.username.clone();

    match service
        .execute_payment(tenant_id, payment_id, req, &executed_by)
        .await
    {
        Ok(p) => Json(ApiResponse::success(p, "执行成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct WriteOffRequest {
    pub item_id: Uuid,
    pub write_off_amount: Decimal,
}

async fn write_off_payment_item_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<WriteOffRequest>,
) -> Json<ApiResponse<PaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let write_off_by = claims.username.clone();

    match service
        .write_off_payment_item(tenant_id, req.item_id, req.write_off_amount, &write_off_by)
        .await
    {
        Ok(p) => Json(ApiResponse::success(p, "核销成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn export_payments_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExportPaymentRequest>,
) -> Json<ApiResponse<ExportPaymentResponse>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.export_payments(tenant_id, req).await {
        Ok(r) => Json(ApiResponse::success(r, "导出成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_approval_configs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ApprovalConfigResponse>>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限访问审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.list_approval_configs(tenant_id).await {
        Ok(configs) => Json(ApiResponse::success(configs, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateApprovalConfigRequest>,
) -> Json<ApiResponse<ApprovalConfigResponse>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限创建审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();

    match service
        .create_approval_config(tenant_id, req, &created_by)
        .await
    {
        Ok(config) => Json(ApiResponse::success(config, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(config_id): Path<Uuid>,
) -> Json<ApiResponse<ApprovalConfigResponse>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限访问审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.get_approval_config(tenant_id, config_id).await {
        Ok(config) => Json(ApiResponse::success(config, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(config_id): Path<Uuid>,
    Json(req): Json<CreateApprovalConfigRequest>,
) -> Json<ApiResponse<ApprovalConfigResponse>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限更新审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let updated_by = claims.username.clone();

    match service
        .update_approval_config(tenant_id, config_id, req, &updated_by)
        .await
    {
        Ok(config) => Json(ApiResponse::success(config, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_approval_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(config_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    if !claims.has_permission("finance:admin") {
        return Json(ApiResponse::error(403, "没有权限删除审批配置"));
    }

    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.delete_approval_config(tenant_id, config_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

async fn get_dashboard_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<FinanceDashboardStats>> {
    let tenant_id = get_tenant_id(&claims);

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

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .merge(reconciliation::create_routes())
        .route("/dashboard", axum::routing::get(get_dashboard_handler))
        .route("/accounts", axum::routing::post(create_account))
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
        .route("/vouchers", axum::routing::post(create_voucher))
        .route("/vouchers", axum::routing::get(list_vouchers))
        .route("/vouchers/{voucher_id}", axum::routing::get(get_voucher))
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
        .route("/aux-accounts", axum::routing::post(create_aux_account))
        .route("/aux-accounts", axum::routing::get(list_aux_accounts))
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
            "/approvals/submit",
            axum::routing::post(submit_for_approval),
        )
        .route("/approvals/approve", axum::routing::post(approve_document))
        .route("/approvals/reject", axum::routing::post(reject_document))
        .route("/approvals/cancel", axum::routing::post(cancel_approval))
        .route(
            "/approvals/status",
            axum::routing::get(get_approval_status_handler),
        )
        .route(
            "/approvals/pending",
            axum::routing::get(list_pending_approvals),
        )
        .route("/payments", axum::routing::post(create_payment_handler))
        .route("/payments", axum::routing::get(list_payments_handler))
        .route(
            "/payments/{payment_id}",
            axum::routing::get(get_payment_handler),
        )
        .route(
            "/payments/{payment_id}",
            axum::routing::put(update_payment_handler),
        )
        .route(
            "/payments/{payment_id}",
            axum::routing::delete(delete_payment_handler),
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
            axum::routing::get(list_approval_configs_handler),
        )
        .route(
            "/approval-configs",
            axum::routing::post(create_approval_config_handler),
        )
        .route(
            "/approval-configs/{config_id}",
            axum::routing::get(get_approval_config_handler),
        )
        .route(
            "/approval-configs/{config_id}",
            axum::routing::put(update_approval_config_handler),
        )
        .route(
            "/approval-configs/{config_id}",
            axum::routing::delete(delete_approval_config_handler),
        )
}

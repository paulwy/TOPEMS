use std::sync::Arc;

use axum::{
    extract::{Json, Path, Query, State},
    Extension,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::{AppState, CoreResponse};
use super::models::*;
use super::service::FinanceService;
use topems_shared::Claims;

#[derive(Debug, Deserialize)]
pub struct AccountQueryParams {
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

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims.tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

#[axum::debug_handler]
pub async fn create_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAccountRequest>,
) -> Json<CoreResponse<Account>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.create_account(tenant_id, req).await {
        Ok(account) => Json(CoreResponse::success(account, "创建成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(account_id): Path<Uuid>,
) -> Json<CoreResponse<Account>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_account(tenant_id, account_id).await {
        Ok(account) => Json(CoreResponse::success(account, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_account_by_code(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(code): Path<String>,
) -> Json<CoreResponse<Account>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_account_by_code(tenant_id, &code).await {
        Ok(account) => Json(CoreResponse::success(account, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn list_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<AccountQueryParams>,
) -> Json<CoreResponse<Vec<Account>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.list_accounts(tenant_id).await {
        Ok(accounts) => Json(CoreResponse::success(accounts, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn create_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<CoreResponse<VoucherResponse>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();
    match service.create_voucher(tenant_id, req, &created_by).await {
        Ok(voucher) => Json(CoreResponse::success(voucher, "创建成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<CoreResponse<VoucherResponse>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_voucher(tenant_id, voucher_id).await {
        Ok(voucher) => Json(CoreResponse::success(voucher, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn list_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VoucherQueryParams>,
) -> Json<CoreResponse<Vec<Voucher>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
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

    match service.list_vouchers(tenant_id, status, params.period).await {
        Ok(vouchers) => Json(CoreResponse::success(vouchers, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn submit_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<CoreResponse<Voucher>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.submit_voucher(tenant_id, voucher_id).await {
        Ok(voucher) => Json(CoreResponse::success(voucher, "提交成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn approve_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<CoreResponse<Voucher>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let approved_by = claims.username.clone();
    match service.approve_voucher(tenant_id, voucher_id, &approved_by).await {
        Ok(voucher) => Json(CoreResponse::success(voucher, "审批成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn post_voucher(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(voucher_id): Path<Uuid>,
) -> Json<CoreResponse<Voucher>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let posted_by = claims.username.clone();
    match service.post_voucher(tenant_id, voucher_id, &posted_by).await {
        Ok(voucher) => Json(CoreResponse::success(voucher, "过账成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_ledger(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LedgerQueryParams>,
) -> Json<CoreResponse<Vec<LedgerEntry>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let ledger_params = super::models::LedgerQueryParams {
        account_id: params.account_id,
        account_code: params.account_code,
        start_date: params.start_date,
        end_date: params.end_date,
        period: params.period,
    };

    match service.get_ledger(tenant_id, ledger_params).await {
        Ok(entries) => Json(CoreResponse::success(entries, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_trial_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<CoreResponse<Vec<TrialBalance>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_trial_balance(tenant_id, &period).await {
        Ok(balance) => Json(CoreResponse::success(balance, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_balance_sheet(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<CoreResponse<BalanceSheet>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_balance_sheet(tenant_id, &period).await {
        Ok(sheet) => Json(CoreResponse::success(sheet, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_income_statement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<CoreResponse<IncomeStatement>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_income_statement(tenant_id, &period).await {
        Ok(statement) => Json(CoreResponse::success(statement, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn close_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((year, month)): Path<(i32, i32)>,
) -> Json<CoreResponse<Period>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let closed_by = claims.username.clone();
    match service.close_period(tenant_id, year, month, &closed_by).await {
        Ok(period) => Json(CoreResponse::success(period, "期间已关闭")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

#[axum::debug_handler]
pub async fn open_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((year, month)): Path<(i32, i32)>,
) -> Json<CoreResponse<Period>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.open_period(tenant_id, year, month).await {
        Ok(period) => Json(CoreResponse::success(period, "期间已打开")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
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

#[axum::debug_handler]
pub async fn create_aux_account(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAuxiliaryAccountRequest>,
) -> Json<CoreResponse<AuxiliaryAccount>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.create_aux_account(tenant_id, req).await {
        Ok(account) => Json(CoreResponse::success(account, "辅助科目创建成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn list_aux_accounts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
) -> Json<CoreResponse<Vec<AuxiliaryAccount>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
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
        Ok(accounts) => Json(CoreResponse::success(accounts, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_aux_ledger(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
) -> Json<CoreResponse<Vec<AuxLedgerEntry>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
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
        _ => return Json(CoreResponse::error("无效的辅助核算类型")),
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
        Ok(entries) => Json(CoreResponse::success(entries, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_aux_balance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuxQueryParams>,
) -> Json<CoreResponse<Vec<AuxBalanceReport>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
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
        _ => return Json(CoreResponse::error("无效的辅助核算类型")),
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
        Ok(balance) => Json(CoreResponse::success(balance, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_cash_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<CoreResponse<CashFlowStatement>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_cash_flow_statement(tenant_id, &period).await {
        Ok(statement) => Json(CoreResponse::success(statement, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

// 批量操作 handlers

pub async fn batch_submit_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<CoreResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.batch_submit_vouchers(tenant_id, req.voucher_ids).await {
        Ok(result) => Json(CoreResponse::success(result, "批量提交完成")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn batch_approve_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<CoreResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let approved_by = claims.username.clone();
    match service.batch_approve_vouchers(tenant_id, req.voucher_ids, &approved_by).await {
        Ok(result) => Json(CoreResponse::success(result, "批量审批完成")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn batch_post_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchVoucherRequest>,
) -> Json<CoreResponse<BatchVoucherResponse>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let posted_by = claims.username.clone();
    match service.batch_post_vouchers(tenant_id, req.voucher_ids, &posted_by).await {
        Ok(result) => Json(CoreResponse::success(result, "批量过账完成")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

use super::models::ExportVoucherRequest;

pub async fn export_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExportVoucherRequest>,
) -> Json<CoreResponse<super::models::ExportVoucherResponse>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.export_vouchers(tenant_id, req).await {
        Ok(result) => Json(CoreResponse::success(result, "导出成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

// ===== 审批工作流 handlers =====

use super::models::{ApprovalDocType, ApprovalWorkflow, SubmitApprovalRequest, ApproveRequest, RejectRequest};

pub async fn submit_for_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SubmitApprovalRequest>,
) -> Json<CoreResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let submitted_by = claims.username.clone();
    match service.submit_for_approval(tenant_id, req.doc_type, req.doc_id, req.doc_no, &submitted_by).await {
        Ok(result) => Json(CoreResponse::success(result, "提交审批成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn approve_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<(ApprovalDocType, Uuid, ApproveRequest)>,
) -> Json<CoreResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let approved_by = claims.username.clone();
    let (doc_type, doc_id, req) = req;
    match service.approve(tenant_id, doc_type, doc_id, &approved_by, req.comment).await {
        Ok(result) => Json(CoreResponse::success(result, "审批通过")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn reject_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<(ApprovalDocType, Uuid, RejectRequest)>,
) -> Json<CoreResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let rejected_by = claims.username.clone();
    let (doc_type, doc_id, req) = req;
    match service.reject(tenant_id, doc_type, doc_id, &rejected_by, req.reason, req.comment).await {
        Ok(result) => Json(CoreResponse::success(result, "审批驳回")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn cancel_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<(ApprovalDocType, Uuid)>,
) -> Json<CoreResponse<ApprovalWorkflow>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let (doc_type, doc_id) = req;
    match service.cancel_approval(tenant_id, doc_type, doc_id).await {
        Ok(result) => Json(CoreResponse::success(result, "撤回审批成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn get_approval_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<super::models::ApprovalStatusQuery>,
) -> Json<CoreResponse<Option<ApprovalWorkflow>>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    match service.get_approval_status(tenant_id, params.doc_type, params.doc_id).await {
        Ok(result) => Json(CoreResponse::success(result, "查询成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn year_end_close(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<super::models::YearEndCloseRequest>,
) -> Json<CoreResponse<super::models::YearEndCloseResult>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();
    match service.year_end_close(tenant_id, req.year, &created_by, req.description).await {
        Ok(result) => Json(CoreResponse::success(result, "年末结转成功")),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub async fn list_pending_approvals(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<super::models::ApprovalListQuery>,
) -> Json<CoreResponse<super::models::ApprovalListResponse>> {
    let service = FinanceService::new(Arc::new(state.pool.clone()));
    let tenant_id = get_tenant_id(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    match service.list_pending_approvals(tenant_id, params.doc_type, page, page_size).await {
        Ok((workflows, total)) => Json(CoreResponse::success(
            super::models::ApprovalListResponse { workflows, total, page, page_size },
            "查询成功"
        )),
        Err(e) => Json(CoreResponse::error(&e.to_string())),
    }
}

pub fn routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/accounts", axum::routing::post(create_account))
        .route("/accounts", axum::routing::get(list_accounts))
        .route("/accounts/{account_id}", axum::routing::get(get_account))
        .route("/accounts/code/{code}", axum::routing::get(get_account_by_code))
        .route("/vouchers", axum::routing::post(create_voucher))
        .route("/vouchers", axum::routing::get(list_vouchers))
        .route("/vouchers/{voucher_id}", axum::routing::get(get_voucher))
        .route("/vouchers/{voucher_id}/submit", axum::routing::post(submit_voucher))
        .route("/vouchers/{voucher_id}/approve", axum::routing::post(approve_voucher))
        .route("/vouchers/{voucher_id}/post", axum::routing::post(post_voucher))
        .route("/ledger", axum::routing::get(get_ledger))
        .route("/trial-balance/{period}", axum::routing::get(get_trial_balance))
        .route("/balance-sheet/{period}", axum::routing::get(get_balance_sheet))
        .route("/income-statement/{period}", axum::routing::get(get_income_statement))
        .route("/periods/{year}/{month}/open", axum::routing::post(open_period))
        .route("/periods/{year}/{month}/close", axum::routing::post(close_period))
        // 辅助核算
        .route("/aux-accounts", axum::routing::post(create_aux_account))
        .route("/aux-accounts", axum::routing::get(list_aux_accounts))
        .route("/aux-ledger", axum::routing::get(get_aux_ledger))
        .route("/aux-balance", axum::routing::get(get_aux_balance))
        // 财务报表
        .route("/cash-flow/{period}", axum::routing::get(get_cash_flow))
        // 批量操作
        .route("/vouchers/batch/submit", axum::routing::post(batch_submit_vouchers))
        .route("/vouchers/batch/approve", axum::routing::post(batch_approve_vouchers))
        .route("/vouchers/batch/post", axum::routing::post(batch_post_vouchers))
        // 导出
        .route("/vouchers/export", axum::routing::post(export_vouchers))
        // 期末结转
        .route("/year-end-close", axum::routing::post(year_end_close))
        // 统一审批工作流
        .route("/approvals/submit", axum::routing::post(submit_for_approval))
        .route("/approvals/approve", axum::routing::post(approve_document))
        .route("/approvals/reject", axum::routing::post(reject_document))
        .route("/approvals/cancel", axum::routing::post(cancel_approval))
        .route("/approvals/status", axum::routing::get(get_approval_status_handler))
        .route("/approvals/pending", axum::routing::get(list_pending_approvals))
}

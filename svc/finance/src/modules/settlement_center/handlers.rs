//! Settlement Center - 统一 API handlers
//!
//! 所有对账和结算接口在 `/api/core/settlement-center/` 路径下提供统一入口。

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde_json::json;
use topems_shared::auth::Claims;
use topems_shared::{api_error, api_success, ApiResponse};
use uuid::Uuid;

use crate::shared::AppState;

use super::models::*;
use super::service;

// ============================================================
// 工具函数
// ============================================================

/// 从 Claims 解析当前 tenant_id
fn current_tenant_id(claims: &Claims) -> Uuid {
    service::parse_tenant_id(&claims.tenant_id)
}

/// 从 Claims 解析当前 user UUID
fn current_user_id(claims: &Claims) -> Option<Uuid> {
    Uuid::parse_str(&claims.sub).ok()
}

// ============================================================
// 统一对账 API
// ============================================================

/// GET /api/core/settlement-center/reconciliations
pub async fn list_reconciliations(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ReconciliationListQuery>,
) -> Json<ApiResponse<Vec<UnifiedReconciliation>>> {
    let tenant_id = current_tenant_id(&claims);
    match service::list_reconciliations(&state.pool, tenant_id, &query).await {
        Ok(items) => Json(api_success(items)),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_reconciliations 失败: {}", e);
            Json(api_error(500, "获取对账列表失败"))
        }
    }
}

/// POST /api/core/settlement-center/reconciliations
pub async fn create_reconciliation(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReconciliationRequest>,
) -> Json<ApiResponse<UnifiedReconciliation>> {
    if req.recon_name.is_empty() {
        return Json(api_error(400, "对账名称不能为空"));
    }
    if req.period.is_empty() {
        return Json(api_error(400, "对账期间不能为空"));
    }
    if req.recon_type.is_empty() {
        return Json(api_error(400, "对账类型不能为空"));
    }

    let tenant_id = current_tenant_id(&claims);
    let creator = req.created_by.clone().unwrap_or_else(|| claims.sub.clone());

    match service::create_reconciliation(&state.pool, tenant_id, &req, creator).await {
        Ok(item) => Json(api_success(item)),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_reconciliation 失败: {}", e);
            Json(api_error(500, "创建对账单失败"))
        }
    }
}

/// GET /api/core/settlement-center/reconciliations/:id
pub async fn get_reconciliation(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ReconciliationDetail>> {
    let tenant_id = current_tenant_id(&claims);
    match service::get_reconciliation_detail(&state.pool, tenant_id, id).await {
        Ok(Some(detail)) => Json(api_success(detail)),
        Ok(None) => Json(api_error(404, "对账单不存在")),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_reconciliation 失败: {}", e);
            Json(api_error(500, "获取对账详情失败"))
        }
    }
}

/// POST /api/core/settlement-center/reconciliations/:id/reconcile
pub async fn reconcile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ReconcileRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = current_tenant_id(&claims);
    match service::manual_reconcile(&state.pool, tenant_id, id, &req).await {
        Ok(affected) => Json(api_success(json!({ "matched_count": affected }))),
        Err(e) => {
            tracing::error!("[SettlementCenter] manual_reconcile 失败: {}", e);
            Json(api_error(500, "手工对账失败"))
        }
    }
}

/// POST /api/core/settlement-center/auto-reconcile
pub async fn auto_reconcile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AutoReconcileRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if req.period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }
    let tenant_id = current_tenant_id(&claims);
    match service::auto_reconcile(&state.pool, tenant_id, &req).await {
        Ok(affected) => Json(api_success(json!({ "matched_count": affected }))),
        Err(e) => {
            tracing::error!("[SettlementCenter] auto_reconcile 失败: {}", e);
            Json(api_error(500, "自动对账失败"))
        }
    }
}

// ============================================================
// 统一结算 API
// ============================================================

/// GET /api/core/settlement-center/settlements
pub async fn list_settlements(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<SettlementListQuery>,
) -> Json<ApiResponse<Vec<UnifiedSettlement>>> {
    let tenant_id = current_tenant_id(&claims);
    match service::list_settlements(&state.pool, tenant_id, &query).await {
        Ok(items) => Json(api_success(items)),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_settlements 失败: {}", e);
            Json(api_error(500, "获取结算列表失败"))
        }
    }
}

/// POST /api/core/settlement-center/settlements
pub async fn create_settlement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSettlementRequest>,
) -> Json<ApiResponse<UnifiedSettlement>> {
    if req.settlement_name.is_empty() {
        return Json(api_error(400, "结算名称不能为空"));
    }
    if req.settlement_type.is_empty() {
        return Json(api_error(400, "结算类型不能为空"));
    }

    let tenant_id = current_tenant_id(&claims);
    let creator = req.created_by.clone().unwrap_or_else(|| claims.sub.clone());

    match service::create_settlement(&state.pool, tenant_id, &req, creator).await {
        Ok(item) => Json(api_success(item)),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_settlement 失败: {}", e);
            Json(api_error(500, "创建结算单失败"))
        }
    }
}

/// GET /api/core/settlement-center/settlements/:id
pub async fn get_settlement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SettlementDetail>> {
    let tenant_id = current_tenant_id(&claims);
    match service::get_settlement_detail(&state.pool, tenant_id, id).await {
        Ok(Some(detail)) => Json(api_success(detail)),
        Ok(None) => Json(api_error(404, "结算单不存在")),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_settlement 失败: {}", e);
            Json(api_error(500, "获取结算详情失败"))
        }
    }
}

/// POST /api/core/settlement-center/settlements/:id/approve
pub async fn approve_settlement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<UnifiedSettlement>> {
    let tenant_id = current_tenant_id(&claims);
    let approver = claims.sub.clone();
    match service::approve_settlement(&state.pool, tenant_id, id, approver).await {
        Ok(Some(item)) => Json(api_success(item)),
        Ok(None) => Json(api_error(400, "结算单不存在或当前状态不允许审批")),
        Err(e) => {
            tracing::error!("[SettlementCenter] approve_settlement 失败: {}", e);
            Json(api_error(500, "审批结算失败"))
        }
    }
}

// ============================================================
// 关联管理 API
// ============================================================

/// POST /api/core/settlement-center/links
pub async fn create_link(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateLinkRequest>,
) -> Json<ApiResponse<ReconciliationSettlementLink>> {
    if !["pre_settlement", "post_settlement", "adjustment"].contains(&req.link_type.as_str()) {
        return Json(api_error(400, "无效的关联类型"));
    }
    let tenant_id = current_tenant_id(&claims);
    let Some(creator) = current_user_id(&claims) else {
        return Json(api_error(401, "无效的用户身份"));
    };

    match service::create_link(&state.pool, tenant_id, &req, creator).await {
        Ok(link) => Json(api_success(link)),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_link 失败: {}", e);
            Json(api_error(500, "创建关联失败"))
        }
    }
}

/// DELETE /api/core/settlement-center/links/:id
pub async fn delete_link(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = current_tenant_id(&claims);
    match service::cancel_link(&state.pool, tenant_id, id).await {
        Ok(true) => Json(api_success(json!({ "cancelled": true }))),
        Ok(false) => Json(api_error(404, "关联不存在或已解除")),
        Err(e) => {
            tracing::error!("[SettlementCenter] delete_link 失败: {}", e);
            Json(api_error(500, "解除关联失败"))
        }
    }
}

/// GET /api/core/settlement-center/links
pub async fn list_links(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<LinkListQuery>,
) -> Json<ApiResponse<Vec<ReconciliationSettlementLink>>> {
    let tenant_id = current_tenant_id(&claims);
    match service::list_links(&state.pool, tenant_id, &query).await {
        Ok(items) => Json(api_success(items)),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_links 失败: {}", e);
            Json(api_error(500, "获取关联列表失败"))
        }
    }
}

// ============================================================
// 差异处理 API
// ============================================================

/// GET /api/core/settlement-center/differences
pub async fn list_differences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DifferenceListQuery>,
) -> Json<ApiResponse<Vec<DifferenceAdjustment>>> {
    let tenant_id = current_tenant_id(&claims);
    match service::list_differences(&state.pool, tenant_id, &query).await {
        Ok(items) => Json(api_success(items)),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_differences 失败: {}", e);
            Json(api_error(500, "获取差异列表失败"))
        }
    }
}

/// POST /api/core/settlement-center/differences
pub async fn create_difference(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDifferenceRequest>,
) -> Json<ApiResponse<DifferenceAdjustment>> {
    if !["reconciliation", "settlement"].contains(&req.source_type.as_str()) {
        return Json(api_error(400, "无效的来源类型"));
    }
    if !["amount", "timing", "missing", "duplicate"].contains(&req.difference_type.as_str()) {
        return Json(api_error(400, "无效的差异类型"));
    }
    if let Some(ref t) = req.adjustment_type {
        if !["write_off", "supplement", "transfer"].contains(&t.as_str()) {
            return Json(api_error(400, "无效的调整类型"));
        }
    }
    if req.reason.is_empty() {
        return Json(api_error(400, "差异原因不能为空"));
    }

    let tenant_id = current_tenant_id(&claims);
    let Some(creator) = current_user_id(&claims) else {
        return Json(api_error(401, "无效的用户身份"));
    };

    match service::create_difference(&state.pool, tenant_id, &req, creator).await {
        Ok(item) => Json(api_success(item)),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_difference 失败: {}", e);
            Json(api_error(500, "创建差异调整失败"))
        }
    }
}

/// POST /api/core/settlement-center/differences/:id/approve
pub async fn approve_difference(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DifferenceAdjustment>> {
    let tenant_id = current_tenant_id(&claims);
    let Some(approver) = current_user_id(&claims) else {
        return Json(api_error(401, "无效的用户身份"));
    };

    match service::approve_difference(&state.pool, tenant_id, id, approver).await {
        Ok(Some(item)) => Json(api_success(item)),
        Ok(None) => Json(api_error(400, "差异调整不存在或当前状态不允许审批")),
        Err(e) => {
            tracing::error!("[SettlementCenter] approve_difference 失败: {}", e);
            Json(api_error(500, "审批差异调整失败"))
        }
    }
}

/// POST /api/core/settlement-center/differences/:id/reject
pub async fn reject_difference(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DifferenceAdjustment>> {
    let tenant_id = current_tenant_id(&claims);
    let Some(approver) = current_user_id(&claims) else {
        return Json(api_error(401, "无效的用户身份"));
    };

    match service::reject_difference(&state.pool, tenant_id, id, approver).await {
        Ok(Some(item)) => Json(api_success(item)),
        Ok(None) => Json(api_error(400, "差异调整不存在或当前状态不允许拒绝")),
        Err(e) => {
            tracing::error!("[SettlementCenter] reject_difference 失败: {}", e);
            Json(api_error(500, "拒绝差异调整失败"))
        }
    }
}

// ============================================================
// 仪表盘与统计 API
// ============================================================

/// GET /api/core/settlement-center/dashboard
pub async fn get_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DashboardSummary>> {
    let tenant_id = current_tenant_id(&claims);
    match service::get_dashboard_summary(&state.pool, tenant_id).await {
        Ok(summary) => Json(api_success(summary)),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_dashboard 失败: {}", e);
            Json(api_error(500, "获取仪表盘失败"))
        }
    }
}

/// GET /api/core/settlement-center/statistics
pub async fn get_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<CenterStatistics>> {
    let tenant_id = current_tenant_id(&claims);
    match service::get_statistics(&state.pool, tenant_id).await {
        Ok(stats) => Json(api_success(stats)),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_statistics 失败: {}", e);
            Json(api_error(500, "获取统计数据失败"))
        }
    }
}

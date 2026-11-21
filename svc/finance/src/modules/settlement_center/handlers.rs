//! Settlement Center - 统一 API handlers
//!
//! 所有对账和结算接口在 `/api/core/settlement-center/` 路径下提供统一入口。

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde_json::json;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<ReconciliationListQuery>,
) -> ApiResponse<Vec<UnifiedReconciliation>> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::list_reconciliations(&state.db, txn, tenant_id, &query).await {
        Ok(items) => api_success(items),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_reconciliations 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取对账列表失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/reconciliations
pub async fn create_reconciliation(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateReconciliationRequest>,
) -> ApiResponse<UnifiedReconciliation> {
    if req.recon_name.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "对账名称不能为空".to_string(),
        ));
    }
    if req.period.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "对账期间不能为空".to_string(),
        ));
    }
    if req.recon_type.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "对账类型不能为空".to_string(),
        ));
    }

    let tenant_id = current_tenant_id(&claims);
    let creator = req.created_by.clone().unwrap_or_else(|| claims.sub.clone());

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::create_reconciliation(
        &state.db,
        txn,
        state.event_publisher.as_ref(),
        tenant_id,
        &req,
        creator,
    )
    .await
    {
        Ok(item) => api_success(item),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_reconciliation 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建对账单失败".to_string()))
        }
    }
}

/// GET /api/core/settlement-center/reconciliations/{id}
pub async fn get_reconciliation(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ReconciliationDetail> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::get_reconciliation_detail(&state.db, txn, tenant_id, id).await {
        Ok(Some(detail)) => api_success(detail),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("对账单不存在".to_string())),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_reconciliation 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取对账详情失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/reconciliations/{id}/reconcile
pub async fn reconcile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<ReconcileRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::manual_reconcile(
        &state.db,
        txn,
        state.event_publisher.as_ref(),
        tenant_id,
        id,
        &req,
    )
    .await
    {
        Ok(affected) => api_success(json!({ "matched_count": affected })),
        Err(e) => {
            tracing::error!("[SettlementCenter] manual_reconcile 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("手工对账失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/auto-reconcile
pub async fn auto_reconcile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<AutoReconcileRequest>,
) -> ApiResponse<serde_json::Value> {
    if req.period.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed("期间不能为空".to_string()));
    }
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::auto_reconcile(&state.db, txn, tenant_id, &req).await {
        Ok(affected) => api_success(json!({ "matched_count": affected })),
        Err(e) => {
            tracing::error!("[SettlementCenter] auto_reconcile 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("自动对账失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<SettlementListQuery>,
) -> ApiResponse<Vec<UnifiedSettlement>> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::list_settlements(&state.db, txn, tenant_id, &query).await {
        Ok(items) => api_success(items),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_settlements 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取结算列表失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/settlements
pub async fn create_settlement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSettlementRequest>,
) -> ApiResponse<UnifiedSettlement> {
    if req.settlement_name.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "结算名称不能为空".to_string(),
        ));
    }
    if req.settlement_type.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "结算类型不能为空".to_string(),
        ));
    }

    let tenant_id = current_tenant_id(&claims);
    let creator = req.created_by.clone().unwrap_or_else(|| claims.sub.clone());

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::create_settlement(
        &state.db,
        txn,
        state.event_publisher.as_ref(),
        tenant_id,
        &req,
        creator,
    )
    .await
    {
        Ok(item) => api_success(item),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_settlement 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建结算单失败".to_string()))
        }
    }
}

/// GET /api/core/settlement-center/settlements/{id}
pub async fn get_settlement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<SettlementDetail> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::get_settlement_detail(&state.db, txn, tenant_id, id).await {
        Ok(Some(detail)) => api_success(detail),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("结算单不存在".to_string())),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_settlement 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取结算详情失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/reconciliations/{id}/approve
pub async fn approve_reconciliation(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<UnifiedReconciliation> {
    let tenant_id = current_tenant_id(&claims);
    let approver = claims.sub.clone();
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::approve_reconciliation(
        &state.db,
        txn,
        state.event_publisher.as_ref(),
        tenant_id,
        id,
        approver,
    )
    .await
    {
        Ok(Some(item)) => api_success(item),
        Ok(None) => ApiResponse::from(TopemsError::ValidationFailed(
            "对账单不存在或当前状态不允许审批".to_string(),
        )),
        Err(e) => {
            tracing::error!("[SettlementCenter] approve_reconciliation 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("审批对账单失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/settlements/{id}/approve
pub async fn approve_settlement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<UnifiedSettlement> {
    let tenant_id = current_tenant_id(&claims);
    let approver = claims.sub.clone();
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::approve_settlement(
        &state.db,
        txn,
        state.event_publisher.as_ref(),
        tenant_id,
        id,
        approver,
    )
    .await
    {
        Ok(Some(item)) => api_success(item),
        Ok(None) => ApiResponse::from(TopemsError::ValidationFailed(
            "结算单不存在或当前状态不允许审批".to_string(),
        )),
        Err(e) => {
            tracing::error!("[SettlementCenter] approve_settlement 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("审批结算失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateLinkRequest>,
) -> ApiResponse<ReconciliationSettlementLink> {
    if !["pre_settlement", "post_settlement", "adjustment"].contains(&req.link_type.as_str()) {
        return ApiResponse::from(TopemsError::ValidationFailed("无效的关联类型".to_string()));
    }
    let tenant_id = current_tenant_id(&claims);
    let Some(creator) = current_user_id(&claims) else {
        return ApiResponse::from(TopemsError::Unauthorized);
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
    match service::create_link(&state.db, txn, tenant_id, &req, creator).await {
        Ok(link) => api_success(link),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_link 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建关联失败".to_string()))
        }
    }
}

/// DELETE /api/core/settlement-center/links/{id}
pub async fn delete_link(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::cancel_link(&state.db, txn, tenant_id, id).await {
        Ok(true) => api_success(json!({ "cancelled": true })),
        Ok(false) => ApiResponse::from(TopemsError::ResourceNotFound(
            "关联不存在或已解除".to_string(),
        )),
        Err(e) => {
            tracing::error!("[SettlementCenter] delete_link 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("解除关联失败".to_string()))
        }
    }
}

/// GET /api/core/settlement-center/links
pub async fn list_links(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<LinkListQuery>,
) -> ApiResponse<Vec<ReconciliationSettlementLink>> {
    if let Some(raw) = query
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        if raw
            .parse::<crate::modules::settlement_center_status::SettlementLinkStatus>()
            .is_err()
        {
            return ApiResponse::from(TopemsError::ValidationFailed(format!(
                "非法结算关联状态: {raw}，可选值: linked/cancelled"
            )));
        }
    }
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::list_links(&state.db, txn, tenant_id, &query).await {
        Ok(items) => api_success(items),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_links 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取关联列表失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<DifferenceListQuery>,
) -> ApiResponse<Vec<DifferenceAdjustment>> {
    if let Some(raw) = query.status.as_deref().filter(|s| !s.trim().is_empty()) {
        if raw
            .parse::<crate::modules::settlement_center_status::DifferenceAdjustmentStatus>()
            .is_err()
        {
            let allowed = crate::modules::settlement_center_status::DifferenceAdjustmentStatus::ALL
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<_>>()
                .join("/");
            return ApiResponse::from(TopemsError::ValidationFailed(format!(
                "非法差异调整状态: {}，可选值: {}",
                raw, allowed
            )));
        }
    }

    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::list_differences(&state.db, txn, tenant_id, &query).await {
        Ok(items) => api_success(items),
        Err(e) => {
            tracing::error!("[SettlementCenter] list_differences 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取差异列表失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/differences
pub async fn create_difference(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateDifferenceRequest>,
) -> ApiResponse<DifferenceAdjustment> {
    if !["reconciliation", "settlement"].contains(&req.source_type.as_str()) {
        return ApiResponse::from(TopemsError::ValidationFailed("无效的来源类型".to_string()));
    }
    if !["amount", "timing", "missing", "duplicate"].contains(&req.difference_type.as_str()) {
        return ApiResponse::from(TopemsError::ValidationFailed("无效的差异类型".to_string()));
    }
    if let Some(ref t) = req.adjustment_type {
        if !["write_off", "supplement", "transfer"].contains(&t.as_str()) {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调整类型".to_string()));
        }
    }
    if req.reason.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "差异原因不能为空".to_string(),
        ));
    }

    let tenant_id = current_tenant_id(&claims);
    let Some(creator) = current_user_id(&claims) else {
        return ApiResponse::from(TopemsError::Unauthorized);
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
    match service::create_difference(&state.db, txn, tenant_id, &req, creator).await {
        Ok(item) => api_success(item),
        Err(e) => {
            tracing::error!("[SettlementCenter] create_difference 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建差异调整失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/differences/{id}/approve
pub async fn approve_difference(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<DifferenceAdjustment> {
    let tenant_id = current_tenant_id(&claims);
    let Some(approver) = current_user_id(&claims) else {
        return ApiResponse::from(TopemsError::Unauthorized);
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
    match service::approve_difference(&state.db, txn, tenant_id, id, approver).await {
        Ok(Some(item)) => api_success(item),
        Ok(None) => ApiResponse::from(TopemsError::ValidationFailed(
            "差异调整不存在或当前状态不允许审批".to_string(),
        )),
        Err(e) => {
            tracing::error!("[SettlementCenter] approve_difference 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("审批差异调整失败".to_string()))
        }
    }
}

/// POST /api/core/settlement-center/differences/{id}/reject
pub async fn reject_difference(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<DifferenceAdjustment> {
    let tenant_id = current_tenant_id(&claims);
    let Some(approver) = current_user_id(&claims) else {
        return ApiResponse::from(TopemsError::Unauthorized);
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
    match service::reject_difference(&state.db, txn, tenant_id, id, approver).await {
        Ok(Some(item)) => api_success(item),
        Ok(None) => ApiResponse::from(TopemsError::ValidationFailed(
            "差异调整不存在或当前状态不允许拒绝".to_string(),
        )),
        Err(e) => {
            tracing::error!("[SettlementCenter] reject_difference 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("拒绝差异调整失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<DashboardSummary> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::get_dashboard_summary(&state.db, txn, tenant_id).await {
        Ok(summary) => api_success(summary),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_dashboard 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取仪表盘失败".to_string()))
        }
    }
}

/// GET /api/core/settlement-center/statistics
pub async fn get_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<CenterStatistics> {
    let tenant_id = current_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction(
                "请求事务缺失".to_string(),
            ))
        }
    };
    match service::get_statistics(&state.db, txn, tenant_id).await {
        Ok(stats) => api_success(stats),
        Err(e) => {
            tracing::error!("[SettlementCenter] get_statistics 失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取统计数据失败".to_string()))
        }
    }
}

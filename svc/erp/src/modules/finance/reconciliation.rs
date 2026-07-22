#![allow(dead_code)]

//! @deprecated 对账功能已迁移至 Finance 服务 (svc/finance/src/modules/reconciliation.rs)
//! 请使用 /api/core/finance/v1/reconciliation/* 替代 /api/erp/v1/finance/reconcile
//! 本模块保留仅用于向后兼容，将在 V15.0 结束后移除。

use serde::Deserialize;

use axum::extract::{Extension, Json, State};

use super::super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
struct ReconcileRequest {
    r#type: String,
    invoice_id: String,
    record_ids: Vec<String>,
}

#[deprecated(
    since = "V15.0",
    note = "对账功能已迁移至 Finance 服务。请使用 /api/core/finance/v1/reconciliation/sessions"
)]
pub async fn reconcile(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<ReconcileRequest>,
) -> Json<ApiResponse<()>> {
    tracing::warn!("[DEPRECATED] ERP /reconcile API is deprecated. Use Finance service /reconciliation/sessions instead.");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    Json(ApiResponse::success(
        (),
        "对账成功（注意：此 API 已废弃，请迁移至 Finance 服务）",
    ))
}

#[derive(Debug, Deserialize)]
pub struct AutoReconcileRequest {
    r#type: String,
    entity_id: String,
    period: String,
}

#[deprecated(
    since = "V15.0",
    note = "对账功能已迁移至 Finance 服务。请使用 /api/core/finance/v1/reconciliation/sessions"
)]
pub async fn auto_reconcile(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AutoReconcileRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::warn!("[DEPRECATED] ERP /auto-reconcile API is deprecated. Use Finance service /reconciliation/sessions instead.");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    Json(ApiResponse::success(
        serde_json::json!({ "reconciled": 0, "deprecated": true, "migration_target": "/api/core/finance/v1/reconciliation/sessions" }),
        "自动对账完成（注意：此 API 已废弃，请迁移至 Finance 服务）",
    ))
}

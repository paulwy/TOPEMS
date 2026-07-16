#![allow(dead_code)]

use serde::{Deserialize};

use axum::{
    extract::{State, Extension, Json},
};

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

pub async fn reconcile(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<ReconcileRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    Json(ApiResponse::success((), "对账成功"))
}

#[derive(Debug, Deserialize)]
struct AutoReconcileRequest {
    r#type: String,
    entity_id: String,
    period: String,
}

pub async fn auto_reconcile(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AutoReconcileRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    Json(ApiResponse::success(
        serde_json::json!({ "reconciled": 0 }),
        "自动对账完成",
    ))
}

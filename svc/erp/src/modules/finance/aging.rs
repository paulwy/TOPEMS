#![allow(dead_code)]

use serde::Deserialize;

use axum::extract::{Extension, Json, Path, Query, State};

use super::super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct AgingParams {
    company_id: Option<String>,
    as_of_date: String,
}

pub async fn get_receivable_aging(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AgingParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.as_of_date.is_empty() {
        return Json(api_error(400, "截止日期不能为空"));
    }

    let demo_data = super::super::demo_data::receivable_aging_demo();

    Json(ApiResponse::success(demo_data, "获取应收账款账龄分析成功"))
}

pub async fn get_payable_aging(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AgingParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.as_of_date.is_empty() {
        return Json(api_error(400, "截止日期不能为空"));
    }

    let demo_data = super::super::demo_data::payable_aging_demo();

    Json(ApiResponse::success(demo_data, "获取应付账款账龄分析成功"))
}

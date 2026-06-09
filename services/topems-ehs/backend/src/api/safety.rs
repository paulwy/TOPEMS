use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::{
    SafetyIncident, SafetyHazard,
    CreateSafetyIncidentRequest, UpdateSafetyIncidentRequest,
    HandleIncidentRequest, CreateSafetyHazardRequest, RectifyHazardRequest,
};
use crate::services::EhsService;
use crate::services::permission::{
    check_safety_permission, check_safety_write_permission,
};
use topems_shared::{ApiResponse, AuthState};
use topems_shared::auth::Claims;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub level: Option<String>,
}

#[derive(Clone)]
pub struct ApiState {
    pub ehs_service: EhsService,
    pub auth_state: AuthState,
}

pub fn create_routes(state: ApiState) -> Router<ApiState> {
    Router::new()
        .route("/api/v1/safety/incidents", get(list_incidents).post(create_incident))
        .route("/api/v1/safety/incidents/{id}", get(get_incident).put(update_incident).delete(delete_incident))
        .route("/api/v1/safety/incidents/{id}/handle", post(handle_incident))
        .route("/api/v1/safety/hazards", get(list_hazards).post(create_hazard))
        .route("/api/v1/safety/hazards/{id}/rectify", post(rectify_hazard))
        .with_state(state)
}

// ==================== 安全事故管理 ====================

async fn list_incidents(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<SafetyIncident>>> {
    if let Err(e) = check_safety_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.ehs_service.list_safety_incidents(page, page_size, params.search, params.status, params.level).await {
        Ok((incidents, _)) => Json(ApiResponse::success(incidents, "获取安全事故列表成功")),
        Err(e) => {
            tracing::error!("获取安全事故列表失败: {}", e);
            Json(ApiResponse::<Vec<SafetyIncident>>::error(500, "获取安全事故列表失败"))
        }
    }
}

async fn create_incident(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSafetyIncidentRequest>,
) -> Json<ApiResponse<SafetyIncident>> {
    if let Err(e) = check_safety_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.create_safety_incident(req).await {
        Ok(incident) => Json(ApiResponse::success(incident, "安全事故创建成功")),
        Err(e) => {
            tracing::error!("创建安全事故失败: {}", e);
            Json(ApiResponse::<SafetyIncident>::error(500, "安全事故创建失败"))
        }
    }
}

async fn get_incident(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SafetyIncident>> {
    if let Err(e) = check_safety_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.get_safety_incident(id).await {
        Ok(Some(incident)) => Json(ApiResponse::success(incident, "获取事故详情成功")),
        Ok(None) => Json(ApiResponse::<SafetyIncident>::error(404, "安全事故不存在")),
        Err(e) => {
            tracing::error!("获取事故详情失败: {}", e);
            Json(ApiResponse::<SafetyIncident>::error(500, "获取事故详情失败"))
        }
    }
}

async fn update_incident(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSafetyIncidentRequest>,
) -> Json<ApiResponse<SafetyIncident>> {
    if let Err(e) = check_safety_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.update_safety_incident(id, req).await {
        Ok(incident) => Json(ApiResponse::success(incident, "安全事故更新成功")),
        Err(e) => {
            tracing::error!("更新安全事故失败: {}", e);
            Json(ApiResponse::<SafetyIncident>::error(500, "安全事故更新失败"))
        }
    }
}

async fn delete_incident(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_safety_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.delete_safety_incident(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "安全事故删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "安全事故不存在")),
        Err(e) => {
            tracing::error!("删除安全事故失败: {}", e);
            Json(ApiResponse::<String>::error(500, "安全事故删除失败"))
        }
    }
}

async fn handle_incident(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<HandleIncidentRequest>,
) -> Json<ApiResponse<SafetyIncident>> {
    if let Err(e) = check_safety_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.handle_safety_incident(id, req).await {
        Ok(incident) => Json(ApiResponse::success(incident, "安全事故处理成功")),
        Err(e) => {
            tracing::error!("处理安全事故失败: {}", e);
            Json(ApiResponse::<SafetyIncident>::error(500, "处理安全事故失败"))
        }
    }
}

// ==================== 安全隐患管理 ====================

async fn list_hazards(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<SafetyHazard>>> {
    if let Err(e) = check_safety_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.ehs_service.list_safety_hazards(page, page_size, params.search, params.status, params.level).await {
        Ok((hazards, _)) => Json(ApiResponse::success(hazards, "获取安全隐患列表成功")),
        Err(e) => {
            tracing::error!("获取安全隐患列表失败: {}", e);
            Json(ApiResponse::<Vec<SafetyHazard>>::error(500, "获取安全隐患列表失败"))
        }
    }
}

async fn create_hazard(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    if let Err(e) = check_safety_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.create_safety_hazard(req).await {
        Ok(hazard) => Json(ApiResponse::success(hazard, "安全隐患创建成功")),
        Err(e) => {
            tracing::error!("创建安全隐患失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "安全隐患创建失败"))
        }
    }
}

async fn rectify_hazard(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<RectifyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    if let Err(e) = check_safety_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.rectify_safety_hazard(id, req).await {
        Ok(hazard) => Json(ApiResponse::success(hazard, "安全隐患整改成功")),
        Err(e) => {
            tracing::error!("整改安全隐患失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "安全隐患整改失败"))
        }
    }
}

use anyhow::Result;
use axum::{
    extract::{FromRef, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::{
    SafetyHazard, SafetyCheck, EmergencyPlan, DrillRecord,
    CreateSafetyHazardRequest, UpdateSafetyHazardRequest,
    CreateSafetyCheckRequest, UpdateSafetyCheckRequest,
    CreateEmergencyPlanRequest, UpdateEmergencyPlanRequest,
    CreateDrillRecordRequest, UpdateDrillRecordRequest,
};
use crate::services::EhsService;
use topems_shared::{ApiResponse, AuthState};

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Clone)]
pub struct ApiState {
    pub ehs_service: EhsService,
    pub auth_state: AuthState,
}

impl FromRef<ApiState> for AuthState {
    fn from_ref(state: &ApiState) -> Self {
        state.auth_state.clone()
    }
}

pub async fn create_routes(db: PgPool, auth_state: AuthState) -> Result<Router> {
    let ehs_service = EhsService::new(db);
    let state = ApiState { ehs_service, auth_state };
    
    let app = Router::new()
        .route("/api/v1/hazards", get(list_hazards).post(create_hazard))
        .route(
            "/api/v1/hazards/{id}",
            get(get_hazard).put(update_hazard).delete(delete_hazard),
        )
        .route("/api/v1/checks", get(list_checks).post(create_check))
        .route(
            "/api/v1/checks/{id}",
            get(get_check).put(update_check).delete(delete_check),
        )
        .route("/api/v1/plans", get(list_plans).post(create_plan))
        .route(
            "/api/v1/plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
        .route("/api/v1/drills", get(list_drills).post(create_drill))
        .route(
            "/api/v1/drills/{id}",
            get(get_drill).put(update_drill).delete(delete_drill),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Safety Hazard Handlers ====================

async fn list_hazards(
    State(state): State<ApiState>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<SafetyHazard>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.ehs_service.list_hazards(page, page_size, params.search, params.status).await {
        Ok((hazards, _)) => {
            Json(ApiResponse::success(hazards, "获取危险源列表成功"))
        }
        Err(e) => {
            tracing::error!("获取危险源列表失败: {}", e);
            Json(ApiResponse::<Vec<SafetyHazard>>::error(500, "获取危险源列表失败"))
        }
    }
}

async fn create_hazard(
    State(state): State<ApiState>,
    Json(req): Json<CreateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    match state.ehs_service.create_hazard(req).await {
        Ok(hazard) => Json(ApiResponse::success(hazard, "危险源创建成功")),
        Err(e) => {
            tracing::error!("创建危险源失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "危险源创建失败"))
        }
    }
}

async fn get_hazard(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SafetyHazard>> {
    match state.ehs_service.get_hazard(id).await {
        Ok(Some(hazard)) => Json(ApiResponse::success(hazard, "获取危险源成功")),
        Ok(None) => Json(ApiResponse::<SafetyHazard>::error(404, "危险源不存在")),
        Err(e) => {
            tracing::error!("获取危险源失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "获取危险源失败"))
        }
    }
}

async fn update_hazard(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    match state.ehs_service.update_hazard(id, req).await {
        Ok(hazard) => Json(ApiResponse::success(hazard, "危险源更新成功")),
        Err(e) => {
            tracing::error!("更新危险源失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "危险源更新失败"))
        }
    }
}

async fn delete_hazard(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match state.ehs_service.delete_hazard(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "危险源删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "危险源不存在")),
        Err(e) => {
            tracing::error!("删除危险源失败: {}", e);
            Json(ApiResponse::<String>::error(500, "危险源删除失败"))
        }
    }
}

// ==================== Safety Check Handlers ====================

async fn list_checks(
    State(state): State<ApiState>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<SafetyCheck>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.ehs_service.list_checks(page, page_size, params.search, params.status).await {
        Ok((checks, _)) => {
            Json(ApiResponse::success(checks, "获取安全检查列表成功"))
        }
        Err(e) => {
            tracing::error!("获取安全检查列表失败: {}", e);
            Json(ApiResponse::<Vec<SafetyCheck>>::error(500, "获取安全检查列表失败"))
        }
    }
}

async fn create_check(
    State(state): State<ApiState>,
    Json(req): Json<CreateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    match state.ehs_service.create_check(req).await {
        Ok(check) => Json(ApiResponse::success(check, "安全检查创建成功")),
        Err(e) => {
            tracing::error!("创建安全检查失败: {}", e);
            Json(ApiResponse::<SafetyCheck>::error(500, "安全检查创建失败"))
        }
    }
}

async fn get_check(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SafetyCheck>> {
    match state.ehs_service.get_check(id).await {
        Ok(Some(check)) => Json(ApiResponse::success(check, "获取安全检查成功")),
        Ok(None) => Json(ApiResponse::<SafetyCheck>::error(404, "安全检查不存在")),
        Err(e) => {
            tracing::error!("获取安全检查失败: {}", e);
            Json(ApiResponse::<SafetyCheck>::error(500, "获取安全检查失败"))
        }
    }
}

async fn update_check(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    match state.ehs_service.update_check(id, req).await {
        Ok(check) => Json(ApiResponse::success(check, "安全检查更新成功")),
        Err(e) => {
            tracing::error!("更新安全检查失败: {}", e);
            Json(ApiResponse::<SafetyCheck>::error(500, "安全检查更新失败"))
        }
    }
}

async fn delete_check(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match state.ehs_service.delete_check(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "安全检查删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "安全检查不存在")),
        Err(e) => {
            tracing::error!("删除安全检查失败: {}", e);
            Json(ApiResponse::<String>::error(500, "安全检查删除失败"))
        }
    }
}

// ==================== Emergency Plan Handlers ====================

async fn list_plans(
    State(state): State<ApiState>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<EmergencyPlan>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.ehs_service.list_plans(page, page_size, params.search, params.status).await {
        Ok((plans, _)) => {
            Json(ApiResponse::success(plans, "获取应急预案列表成功"))
        }
        Err(e) => {
            tracing::error!("获取应急预案列表失败: {}", e);
            Json(ApiResponse::<Vec<EmergencyPlan>>::error(500, "获取应急预案列表失败"))
        }
    }
}

async fn create_plan(
    State(state): State<ApiState>,
    Json(req): Json<CreateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    match state.ehs_service.create_plan(req).await {
        Ok(plan) => Json(ApiResponse::success(plan, "应急预案创建成功")),
        Err(e) => {
            tracing::error!("创建应急预案失败: {}", e);
            Json(ApiResponse::<EmergencyPlan>::error(500, "应急预案创建失败"))
        }
    }
}

async fn get_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<EmergencyPlan>> {
    match state.ehs_service.get_plan(id).await {
        Ok(Some(plan)) => Json(ApiResponse::success(plan, "获取应急预案成功")),
        Ok(None) => Json(ApiResponse::<EmergencyPlan>::error(404, "应急预案不存在")),
        Err(e) => {
            tracing::error!("获取应急预案失败: {}", e);
            Json(ApiResponse::<EmergencyPlan>::error(500, "获取应急预案失败"))
        }
    }
}

async fn update_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    match state.ehs_service.update_plan(id, req).await {
        Ok(plan) => Json(ApiResponse::success(plan, "应急预案更新成功")),
        Err(e) => {
            tracing::error!("更新应急预案失败: {}", e);
            Json(ApiResponse::<EmergencyPlan>::error(500, "应急预案更新失败"))
        }
    }
}

async fn delete_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match state.ehs_service.delete_plan(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "应急预案删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "应急预案不存在")),
        Err(e) => {
            tracing::error!("删除应急预案失败: {}", e);
            Json(ApiResponse::<String>::error(500, "应急预案删除失败"))
        }
    }
}

// ==================== Drill Record Handlers ====================

async fn list_drills(
    State(state): State<ApiState>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<DrillRecord>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.ehs_service.list_drills(page, page_size, params.search).await {
        Ok((drills, _)) => {
            Json(ApiResponse::success(drills, "获取演练记录列表成功"))
        }
        Err(e) => {
            tracing::error!("获取演练记录列表失败: {}", e);
            Json(ApiResponse::<Vec<DrillRecord>>::error(500, "获取演练记录列表失败"))
        }
    }
}

async fn create_drill(
    State(state): State<ApiState>,
    Json(req): Json<CreateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    match state.ehs_service.create_drill(req).await {
        Ok(drill) => Json(ApiResponse::success(drill, "演练记录创建成功")),
        Err(e) => {
            tracing::error!("创建演练记录失败: {}", e);
            Json(ApiResponse::<DrillRecord>::error(500, "演练记录创建失败"))
        }
    }
}

async fn get_drill(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DrillRecord>> {
    match state.ehs_service.get_drill(id).await {
        Ok(Some(drill)) => Json(ApiResponse::success(drill, "获取演练记录成功")),
        Ok(None) => Json(ApiResponse::<DrillRecord>::error(404, "演练记录不存在")),
        Err(e) => {
            tracing::error!("获取演练记录失败: {}", e);
            Json(ApiResponse::<DrillRecord>::error(500, "获取演练记录失败"))
        }
    }
}

async fn update_drill(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    match state.ehs_service.update_drill(id, req).await {
        Ok(drill) => Json(ApiResponse::success(drill, "演练记录更新成功")),
        Err(e) => {
            tracing::error!("更新演练记录失败: {}", e);
            Json(ApiResponse::<DrillRecord>::error(500, "演练记录更新失败"))
        }
    }
}

async fn delete_drill(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match state.ehs_service.delete_drill(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "演练记录删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "演练记录不存在")),
        Err(e) => {
            tracing::error!("删除演练记录失败: {}", e);
            Json(ApiResponse::<String>::error(500, "演练记录删除失败"))
        }
    }
}

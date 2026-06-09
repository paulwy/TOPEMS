use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::{
    RiskAssessment, RiskControl, RiskMatrix, RiskStatistics,
    CreateRiskAssessmentRequest, UpdateRiskAssessmentRequest,
    CreateRiskControlRequest,
};
use crate::services::EhsService;
use crate::services::permission::{
    check_risk_permission, check_risk_write_permission,
};
use topems_shared::{ApiResponse, AuthState};
use topems_shared::auth::Claims;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub risk_level: Option<String>,
}

#[derive(Clone)]
pub struct ApiState {
    pub ehs_service: EhsService,
    pub auth_state: AuthState,
}

pub fn create_routes(state: ApiState) -> Router<ApiState> {
    Router::new()
        .route("/api/v1/risks/assessments", get(list_assessments).post(create_assessment))
        .route("/api/v1/risks/assessments/{id}", get(get_assessment).put(update_assessment).delete(delete_assessment))
        .route("/api/v1/risks/assessments/{id}/control", post(create_risk_control))
        .route("/api/v1/risks/matrix", get(get_risk_matrix))
        .route("/api/v1/risks/statistics", get(get_risk_statistics))
        .with_state(state)
}

// ==================== 风险评估管理 ====================

async fn list_assessments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<RiskAssessment>>> {
    if let Err(e) = check_risk_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.ehs_service.list_risk_assessments(page, page_size, params.search, params.status, params.risk_level).await {
        Ok((assessments, _)) => Json(ApiResponse::success(assessments, "获取风险评估列表成功")),
        Err(e) => {
            tracing::error!("获取风险评估列表失败: {}", e);
            Json(ApiResponse::<Vec<RiskAssessment>>::error(500, "获取风险评估列表失败"))
        }
    }
}

async fn create_assessment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRiskAssessmentRequest>,
) -> Json<ApiResponse<RiskAssessment>> {
    if let Err(e) = check_risk_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.create_risk_assessment(req).await {
        Ok(assessment) => Json(ApiResponse::success(assessment, "风险评估创建成功")),
        Err(e) => {
            tracing::error!("创建风险评估失败: {}", e);
            Json(ApiResponse::<RiskAssessment>::error(500, "风险评估创建失败"))
        }
    }
}

async fn get_assessment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<RiskAssessment>> {
    if let Err(e) = check_risk_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.get_risk_assessment(id).await {
        Ok(Some(assessment)) => Json(ApiResponse::success(assessment, "获取评估详情成功")),
        Ok(None) => Json(ApiResponse::<RiskAssessment>::error(404, "风险评估不存在")),
        Err(e) => {
            tracing::error!("获取评估详情失败: {}", e);
            Json(ApiResponse::<RiskAssessment>::error(500, "获取评估详情失败"))
        }
    }
}

async fn update_assessment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRiskAssessmentRequest>,
) -> Json<ApiResponse<RiskAssessment>> {
    if let Err(e) = check_risk_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.update_risk_assessment(id, req).await {
        Ok(assessment) => Json(ApiResponse::success(assessment, "风险评估更新成功")),
        Err(e) => {
            tracing::error!("更新风险评估失败: {}", e);
            Json(ApiResponse::<RiskAssessment>::error(500, "风险评估更新失败"))
        }
    }
}

async fn delete_assessment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_risk_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.delete_risk_assessment(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "风险评估删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "风险评估不存在")),
        Err(e) => {
            tracing::error!("删除风险评估失败: {}", e);
            Json(ApiResponse::<String>::error(500, "风险评估删除失败"))
        }
    }
}

async fn create_risk_control(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
    Json(req): Json<CreateRiskControlRequest>,
) -> Json<ApiResponse<RiskControl>> {
    if let Err(e) = check_risk_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    // 确保风险评估ID匹配
    let control_req = CreateRiskControlRequest {
        assessment_id,
        ..req
    };
    
    match state.ehs_service.create_risk_control(control_req).await {
        Ok(control) => Json(ApiResponse::success(control, "风险控制措施创建成功")),
        Err(e) => {
            tracing::error!("创建风险控制措施失败: {}", e);
            Json(ApiResponse::<RiskControl>::error(500, "风险控制措施创建失败"))
        }
    }
}

// ==================== 风险矩阵和统计 ====================

async fn get_risk_matrix(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<RiskMatrix>> {
    if let Err(e) = check_risk_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.get_risk_matrix().await {
        Ok(matrix) => Json(ApiResponse::success(matrix, "获取风险矩阵成功")),
        Err(e) => {
            tracing::error!("获取风险矩阵失败: {}", e);
            Json(ApiResponse::<RiskMatrix>::error(500, "获取风险矩阵失败"))
        }
    }
}

async fn get_risk_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<RiskStatistics>> {
    if let Err(e) = check_risk_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }
    
    match state.ehs_service.get_risk_statistics().await {
        Ok(stats) => Json(ApiResponse::success(stats, "获取风险统计成功")),
        Err(e) => {
            tracing::error!("获取风险统计失败: {}", e);
            Json(ApiResponse::<RiskStatistics>::error(500, "获取风险统计失败"))
        }
    }
}
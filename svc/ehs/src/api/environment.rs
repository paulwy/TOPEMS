use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    CreateEnvironmentalDataRequest, CreateMonitoringPointRequest, EnvironmentalAlert,
    EnvironmentalData, EnvironmentalDataQuery, HandleAlertRequest, MonitoringPoint,
    UpdateMonitoringPointRequest,
};
use crate::services::permission::{
    check_environment_permission, check_environment_write_permission,
};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub point_type: Option<String>,
}

pub fn create_routes(state: super::ApiState) -> Router<super::ApiState> {
    Router::new()
        .route(
            "/api/v1/environment/monitoring-points",
            get(list_monitoring_points).post(create_monitoring_point),
        )
        .route(
            "/api/v1/environment/monitoring-points/{id}",
            get(get_monitoring_point)
                .put(update_monitoring_point)
                .delete(delete_monitoring_point),
        )
        .route(
            "/api/v1/environment/monitoring-points/{id}/data",
            get(get_monitoring_data).post(submit_monitoring_data),
        )
        .route("/api/v1/environment/alerts", get(list_alerts))
        .route("/api/v1/environment/alerts/{id}/handle", post(handle_alert))
        .with_state(state)
}

// ==================== 监测点管理 ====================

async fn list_monitoring_points(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<MonitoringPoint>>> {
    if let Err(e) = check_environment_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state
        .ehs_service
        .list_monitoring_points(
            page,
            page_size,
            params.search,
            params.point_type,
            params.status,
        )
        .await
    {
        Ok((points, _)) => Json(ApiResponse::success(points, "获取监测点列表成功")),
        Err(e) => {
            tracing::error!("获取监测点列表失败: {}", e);
            Json(ApiResponse::<Vec<MonitoringPoint>>::error(
                500,
                "获取监测点列表失败",
            ))
        }
    }
}

async fn create_monitoring_point(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMonitoringPointRequest>,
) -> Json<ApiResponse<MonitoringPoint>> {
    if let Err(e) = check_environment_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.create_monitoring_point(req).await {
        Ok(point) => Json(ApiResponse::success(point, "监测点创建成功")),
        Err(e) => {
            tracing::error!("创建监测点失败: {}", e);
            Json(ApiResponse::<MonitoringPoint>::error(500, "监测点创建失败"))
        }
    }
}

async fn get_monitoring_point(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MonitoringPoint>> {
    if let Err(e) = check_environment_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.get_monitoring_point(id).await {
        Ok(Some(point)) => Json(ApiResponse::success(point, "获取监测点成功")),
        Ok(None) => Json(ApiResponse::<MonitoringPoint>::error(404, "监测点不存在")),
        Err(e) => {
            tracing::error!("获取监测点失败: {}", e);
            Json(ApiResponse::<MonitoringPoint>::error(500, "获取监测点失败"))
        }
    }
}

async fn update_monitoring_point(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMonitoringPointRequest>,
) -> Json<ApiResponse<MonitoringPoint>> {
    if let Err(e) = check_environment_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.update_monitoring_point(id, req).await {
        Ok(point) => Json(ApiResponse::success(point, "监测点更新成功")),
        Err(e) => {
            tracing::error!("更新监测点失败: {}", e);
            Json(ApiResponse::<MonitoringPoint>::error(500, "监测点更新失败"))
        }
    }
}

async fn delete_monitoring_point(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_environment_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.delete_monitoring_point(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "监测点删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "监测点不存在")),
        Err(e) => {
            tracing::error!("删除监测点失败: {}", e);
            Json(ApiResponse::<String>::error(500, "监测点删除失败"))
        }
    }
}

// ==================== 监测数据管理 ====================

async fn submit_monitoring_data(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(point_id): Path<Uuid>,
    Json(req): Json<CreateEnvironmentalDataRequest>,
) -> Json<ApiResponse<EnvironmentalData>> {
    if let Err(e) = check_environment_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    // 确保监测点ID匹配
    let data_req = CreateEnvironmentalDataRequest { point_id, ..req };

    match state.ehs_service.submit_monitoring_data(data_req).await {
        Ok(data) => Json(ApiResponse::success(data, "监测数据提交成功")),
        Err(e) => {
            tracing::error!("提交监测数据失败: {}", e);
            Json(ApiResponse::<EnvironmentalData>::error(
                500,
                "监测数据提交失败",
            ))
        }
    }
}

async fn get_monitoring_data(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(point_id): Path<Uuid>,
    Query(params): Query<EnvironmentalDataQuery>,
) -> Json<ApiResponse<Vec<EnvironmentalData>>> {
    if let Err(e) = check_environment_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state
        .ehs_service
        .get_monitoring_data(point_id, params)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "获取监测数据成功")),
        Err(e) => {
            tracing::error!("获取监测数据失败: {}", e);
            Json(ApiResponse::<Vec<EnvironmentalData>>::error(
                500,
                "获取监测数据失败",
            ))
        }
    }
}

// ==================== 环境预警管理 ====================

async fn list_alerts(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<EnvironmentalAlert>>> {
    if let Err(e) = check_environment_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state
        .ehs_service
        .list_environmental_alerts(page, page_size, params.status)
        .await
    {
        Ok((alerts, _)) => Json(ApiResponse::success(alerts, "获取环境预警列表成功")),
        Err(e) => {
            tracing::error!("获取环境预警列表失败: {}", e);
            Json(ApiResponse::<Vec<EnvironmentalAlert>>::error(
                500,
                "获取环境预警列表失败",
            ))
        }
    }
}

async fn handle_alert(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<HandleAlertRequest>,
) -> Json<ApiResponse<EnvironmentalAlert>> {
    if let Err(e) = check_environment_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.handle_environmental_alert(id, req).await {
        Ok(alert) => Json(ApiResponse::success(alert, "环境预警处理成功")),
        Err(e) => {
            tracing::error!("处理环境预警失败: {}", e);
            Json(ApiResponse::<EnvironmentalAlert>::error(
                500,
                "处理环境预警失败",
            ))
        }
    }
}

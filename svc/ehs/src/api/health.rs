use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    CreateHealthCheckupRequest, CreateHealthRecordRequest, CreateVaccinationRecordRequest,
    HealthCheckup, HealthRecord, UpdateHealthRecordRequest, VaccinationRecord,
};
use crate::services::permission::{check_health_permission, check_health_write_permission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub employee_id: Option<String>,
}

pub fn create_routes(state: super::ApiState) -> Router<super::ApiState> {
    Router::new()
        .route(
            "/api/v1/health/records",
            get(list_health_records).post(create_health_record),
        )
        .route(
            "/api/v1/health/records/{id}",
            get(get_health_record)
                .put(update_health_record)
                .delete(delete_health_record),
        )
        .route(
            "/api/v1/health/checkups",
            get(list_checkups).post(create_checkup),
        )
        .route("/api/v1/health/checkups/{id}", get(get_checkup))
        .route(
            "/api/v1/health/vaccinations",
            get(list_vaccinations).post(create_vaccination),
        )
        .with_state(state)
}

// ==================== 健康档案管理 ====================

async fn list_health_records(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<HealthRecord>>> {
    if let Err(e) = check_health_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state
        .ehs_service
        .list_health_records(page, page_size, params.employee_id)
        .await
    {
        Ok((records, _)) => Json(ApiResponse::success(records, "获取健康档案列表成功")),
        Err(e) => {
            tracing::error!("获取健康档案列表失败: {}", e);
            Json(ApiResponse::<Vec<HealthRecord>>::error(
                500,
                "获取健康档案列表失败",
            ))
        }
    }
}

async fn create_health_record(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateHealthRecordRequest>,
) -> Json<ApiResponse<HealthRecord>> {
    if let Err(e) = check_health_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.create_health_record(req).await {
        Ok(record) => Json(ApiResponse::success(record, "健康档案创建成功")),
        Err(e) => {
            tracing::error!("创建健康档案失败: {}", e);
            Json(ApiResponse::<HealthRecord>::error(500, "健康档案创建失败"))
        }
    }
}

async fn get_health_record(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<HealthRecord>> {
    if let Err(e) = check_health_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.get_health_record(id).await {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取健康档案成功")),
        Ok(None) => Json(ApiResponse::<HealthRecord>::error(404, "健康档案不存在")),
        Err(e) => {
            tracing::error!("获取健康档案失败: {}", e);
            Json(ApiResponse::<HealthRecord>::error(500, "获取健康档案失败"))
        }
    }
}

async fn update_health_record(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateHealthRecordRequest>,
) -> Json<ApiResponse<HealthRecord>> {
    if let Err(e) = check_health_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.update_health_record(id, req).await {
        Ok(record) => Json(ApiResponse::success(record, "健康档案更新成功")),
        Err(e) => {
            tracing::error!("更新健康档案失败: {}", e);
            Json(ApiResponse::<HealthRecord>::error(500, "健康档案更新失败"))
        }
    }
}

async fn delete_health_record(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_health_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.delete_health_record(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "健康档案删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "健康档案不存在")),
        Err(e) => {
            tracing::error!("删除健康档案失败: {}", e);
            Json(ApiResponse::<String>::error(500, "健康档案删除失败"))
        }
    }
}

// ==================== 体检记录管理 ====================

async fn list_checkups(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<HealthCheckup>>> {
    if let Err(e) = check_health_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state
        .ehs_service
        .list_health_checkups(page, page_size, params.employee_id)
        .await
    {
        Ok((checkups, _)) => Json(ApiResponse::success(checkups, "获取体检记录列表成功")),
        Err(e) => {
            tracing::error!("获取体检记录列表失败: {}", e);
            Json(ApiResponse::<Vec<HealthCheckup>>::error(
                500,
                "获取体检记录列表失败",
            ))
        }
    }
}

async fn create_checkup(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateHealthCheckupRequest>,
) -> Json<ApiResponse<HealthCheckup>> {
    if let Err(e) = check_health_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.create_health_checkup(req).await {
        Ok(checkup) => Json(ApiResponse::success(checkup, "体检记录创建成功")),
        Err(e) => {
            tracing::error!("创建体检记录失败: {}", e);
            Json(ApiResponse::<HealthCheckup>::error(500, "体检记录创建失败"))
        }
    }
}

async fn get_checkup(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<HealthCheckup>> {
    if let Err(e) = check_health_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.get_health_checkup(id).await {
        Ok(Some(checkup)) => Json(ApiResponse::success(checkup, "获取体检详情成功")),
        Ok(None) => Json(ApiResponse::<HealthCheckup>::error(404, "体检记录不存在")),
        Err(e) => {
            tracing::error!("获取体检详情失败: {}", e);
            Json(ApiResponse::<HealthCheckup>::error(500, "获取体检详情失败"))
        }
    }
}

// ==================== 疫苗接种记录管理 ====================

async fn list_vaccinations(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<VaccinationRecord>>> {
    if let Err(e) = check_health_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state
        .ehs_service
        .list_vaccination_records(page, page_size, params.employee_id)
        .await
    {
        Ok((records, _)) => Json(ApiResponse::success(records, "获取疫苗接种记录成功")),
        Err(e) => {
            tracing::error!("获取疫苗接种记录失败: {}", e);
            Json(ApiResponse::<Vec<VaccinationRecord>>::error(
                500,
                "获取疫苗接种记录失败",
            ))
        }
    }
}

async fn create_vaccination(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateVaccinationRecordRequest>,
) -> Json<ApiResponse<VaccinationRecord>> {
    if let Err(e) = check_health_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.create_vaccination_record(req).await {
        Ok(record) => Json(ApiResponse::success(record, "疫苗接种记录创建成功")),
        Err(e) => {
            tracing::error!("创建疫苗接种记录失败: {}", e);
            Json(ApiResponse::<VaccinationRecord>::error(
                500,
                "疫苗接种记录创建失败",
            ))
        }
    }
}

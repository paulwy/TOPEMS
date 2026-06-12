use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    CompleteTrainingRequest, CreateTrainingProgramRequest, CreateTrainingRecordRequest,
    TrainingProgram, TrainingRecord, UpdateTrainingProgramRequest,
};
use crate::services::permission::{check_training_permission, check_training_write_permission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub training_type: Option<String>,
}

pub fn create_routes(state: super::ApiState) -> Router<super::ApiState> {
    Router::new()
        .route(
            "/api/v1/training/programs",
            get(list_programs).post(create_program),
        )
        .route(
            "/api/v1/training/programs/{id}",
            get(get_program).put(update_program).delete(delete_program),
        )
        .route(
            "/api/v1/training/programs/{id}/records",
            post(create_training_record),
        )
        .route(
            "/api/v1/training/programs/{id}/complete",
            post(complete_training),
        )
        .route("/api/v1/training/records", get(list_records))
        .with_state(state)
}

// ==================== 培训计划管理 ====================

async fn list_programs(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<TrainingProgram>>> {
    if let Err(e) = check_training_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state
        .ehs_service
        .list_training_programs(
            page,
            page_size,
            params.search,
            params.status,
            params.training_type,
        )
        .await
    {
        Ok((programs, _)) => Json(ApiResponse::success(programs, "获取培训计划列表成功")),
        Err(e) => {
            tracing::error!("获取培训计划列表失败: {}", e);
            Json(ApiResponse::<Vec<TrainingProgram>>::error(
                500,
                "获取培训计划列表失败",
            ))
        }
    }
}

async fn create_program(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTrainingProgramRequest>,
) -> Json<ApiResponse<TrainingProgram>> {
    if let Err(e) = check_training_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.create_training_program(req).await {
        Ok(program) => Json(ApiResponse::success(program, "培训计划创建成功")),
        Err(e) => {
            tracing::error!("创建培训计划失败: {}", e);
            Json(ApiResponse::<TrainingProgram>::error(
                500,
                "培训计划创建失败",
            ))
        }
    }
}

async fn get_program(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TrainingProgram>> {
    if let Err(e) = check_training_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.get_training_program(id).await {
        Ok(Some(program)) => Json(ApiResponse::success(program, "获取培训详情成功")),
        Ok(None) => Json(ApiResponse::<TrainingProgram>::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("获取培训详情失败: {}", e);
            Json(ApiResponse::<TrainingProgram>::error(
                500,
                "获取培训详情失败",
            ))
        }
    }
}

async fn update_program(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTrainingProgramRequest>,
) -> Json<ApiResponse<TrainingProgram>> {
    if let Err(e) = check_training_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.update_training_program(id, req).await {
        Ok(program) => Json(ApiResponse::success(program, "培训计划更新成功")),
        Err(e) => {
            tracing::error!("更新培训计划失败: {}", e);
            Json(ApiResponse::<TrainingProgram>::error(
                500,
                "培训计划更新失败",
            ))
        }
    }
}

async fn delete_program(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_training_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.delete_training_program(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "培训计划删除成功")),
        Ok(false) => Json(ApiResponse::<String>::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("删除培训计划失败: {}", e);
            Json(ApiResponse::<String>::error(500, "培训计划删除失败"))
        }
    }
}

async fn create_training_record(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(program_id): Path<Uuid>,
    Json(req): Json<CreateTrainingRecordRequest>,
) -> Json<ApiResponse<TrainingRecord>> {
    if let Err(e) = check_training_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    // 确保培训计划ID匹配
    let record_req = CreateTrainingRecordRequest { program_id, ..req };

    match state.ehs_service.create_training_record(record_req).await {
        Ok(record) => Json(ApiResponse::success(record, "培训记录创建成功")),
        Err(e) => {
            tracing::error!("创建培训记录失败: {}", e);
            Json(ApiResponse::<TrainingRecord>::error(
                500,
                "培训记录创建失败",
            ))
        }
    }
}

async fn complete_training(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<CompleteTrainingRequest>,
) -> Json<ApiResponse<TrainingProgram>> {
    if let Err(e) = check_training_write_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    match state.ehs_service.complete_training(id, req).await {
        Ok(program) => Json(ApiResponse::success(program, "培训完成成功")),
        Err(e) => {
            tracing::error!("完成培训失败: {}", e);
            Json(ApiResponse::<TrainingProgram>::error(500, "培训完成失败"))
        }
    }
}

// ==================== 培训记录管理 ====================

async fn list_records(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<Vec<TrainingRecord>>> {
    if let Err(e) = check_training_permission(&state.ehs_service.pool, &claims).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state
        .ehs_service
        .list_training_records(page, page_size, params.search)
        .await
    {
        Ok((records, _)) => Json(ApiResponse::success(records, "获取培训记录列表成功")),
        Err(e) => {
            tracing::error!("获取培训记录列表失败: {}", e);
            Json(ApiResponse::<Vec<TrainingRecord>>::error(
                500,
                "获取培训记录列表失败",
            ))
        }
    }
}

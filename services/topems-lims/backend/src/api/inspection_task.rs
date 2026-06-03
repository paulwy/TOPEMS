use topems_shared::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CompleteStepRequest, CreateInspectionTaskRequest, InspectionProcess, InspectionRecord, InspectionTask, UpdateInspectionTaskRequest};
use crate::api::ApiState;
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/tasks", get(list_tasks).post(create_task))
        .route(
            "/api/v1/tasks/{id}",
            get(get_task).put(update_task),
        )
        .route(
            "/api/v1/tasks/{id}/complete_step",
            post(complete_step),
        );

    Ok(app)
}

async fn list_tasks(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    
    // 预先处理搜索参数，避免所有权问题
    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, InspectionTask>(
        r#"
        SELECT id, sample_id, process_id, current_step, status, inspector, started_at, completed_at, created_at, updated_at
        FROM lims.inspection_tasks
        WHERE ($1::text IS NULL OR inspector ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(tasks) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM lims.inspection_tasks
                WHERE ($1::text IS NULL OR inspector ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "tasks": tasks,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取检验任务列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取检验任务列表失败: {}", e);
            Json(ApiResponse::error(500, "获取检验任务列表失败"))
        }
    }
}

async fn create_task(
    State(state): State<ApiState>,
    Json(req): Json<CreateInspectionTaskRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, InspectionTask>(
        r#"
        INSERT INTO lims.inspection_tasks (id, sample_id, process_id, current_step, status, inspector, started_at, created_at, updated_at)
        VALUES ($1, $2, $3, 1, 'pending', $4, $5, $6, $7)
        RETURNING id, sample_id, process_id, current_step, status, inspector, started_at, completed_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.sample_id)
    .bind(req.process_id)
    .bind(&req.inspector)
    .bind(now)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(task) => Json(ApiResponse::success(task, "检验任务创建成功")),
        Err(e) => {
            tracing::error!("创建检验任务失败: {}", e);
            Json(ApiResponse::error(500, "检验任务创建失败"))
        }
    }
}

async fn get_task(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InspectionTask>> {
    let result = sqlx::query_as::<_, InspectionTask>(
        r#"
        SELECT id, sample_id, process_id, current_step, status, inspector, started_at, completed_at, created_at, updated_at
        FROM lims.inspection_tasks WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(task)) => Json(ApiResponse::success(task, "获取检验任务成功")),
        Ok(None) => Json(ApiResponse::error(404, "检验任务不存在")),
        Err(e) => {
            tracing::error!("获取检验任务失败: {}", e);
            Json(ApiResponse::error(500, "获取检验任务失败"))
        }
    }
}

async fn update_task(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInspectionTaskRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let existing = sqlx::query_as::<_, InspectionTask>(
        "SELECT id, sample_id, process_id, current_step, status, inspector, started_at, completed_at, created_at, updated_at FROM lims.inspection_tasks WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "检验任务不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询检验任务失败: {}", e))),
    };

    let sample_id = req.sample_id.unwrap_or(existing.sample_id);
    let process_id = req.process_id.unwrap_or(existing.process_id);
    let inspector = req.inspector.unwrap_or(existing.inspector);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, InspectionTask>(
        r#"
        UPDATE lims.inspection_tasks SET
            sample_id = $2, process_id = $3, inspector = $4, status = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, sample_id, process_id, current_step, status, inspector, started_at, completed_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(sample_id)
    .bind(process_id)
    .bind(&inspector)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(task) => Json(ApiResponse::success(task, "检验任务更新成功")),
        Err(e) => {
            tracing::error!("更新检验任务失败: {}", e);
            Json(ApiResponse::error(500, "检验任务更新失败"))
        }
    }
}

async fn complete_step(
    State(state): State<ApiState>,
    Path(task_id): Path<Uuid>,
    Json(req): Json<CompleteStepRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    // 首先获取任务和流程信息
    let task_result = sqlx::query_as::<_, InspectionTask>(
        r#"
        SELECT id, sample_id, process_id, current_step, status, inspector, started_at, completed_at, created_at, updated_at
        FROM lims.inspection_tasks WHERE id = $1
        "#,
    )
    .bind(task_id)
    .fetch_optional(&state.db)
    .await;

    let task = match task_result {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "检验任务不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询检验任务失败: {}", e))),
    };

    // 获取流程信息以确定总步骤数
    let process_result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        SELECT id, name, description, steps, status, created_at, updated_at
        FROM lims.inspection_processes WHERE id = $1
        "#,
    )
    .bind(task.process_id)
    .fetch_optional(&state.db)
    .await;

    let process = match process_result {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "检验流程不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询检验流程失败: {}", e))),
    };

    let steps: Vec<serde_json::Value> = serde_json::from_value(process.steps).unwrap_or(vec![]);
    let total_steps = steps.len() as i32;

    let mut current_step = task.current_step;
    let mut status = task.status;
    let mut started_at = task.started_at;
    let mut completed_at = task.completed_at;

    // 如果是第一个步骤，设置开始时间
    if current_step == 1 && started_at.is_none() {
        started_at = Some(Utc::now());
        status = "in_progress".to_string();
    }

    // 创建检验记录
    let record_id = Uuid::new_v4();
    let record_result = sqlx::query_as::<_, InspectionRecord>(
        r#"
        INSERT INTO lims.inspection_records (id, task_id, step_id, step_name, result, conclusion, inspector, recorded_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, task_id, step_id, step_name, result, conclusion, inspector, recorded_at, created_at
        "#,
    )
    .bind(record_id)
    .bind(task_id)
    .bind(req.step_id)
    .bind(&req.step_name)
    .bind(&req.result)
    .bind(&req.conclusion)
    .bind(&req.inspector)
    .bind(Utc::now())
    .bind(Utc::now())
    .fetch_one(&state.db)
    .await;

    if let Err(e) = record_result {
        tracing::error!("创建检验记录失败: {}", e);
        return Json(ApiResponse::error(500, "创建检验记录失败"));
    }

    // 更新任务
    current_step += 1;
    if current_step > total_steps {
        status = "completed".to_string();
        completed_at = Some(Utc::now());
    }

    let update_result = sqlx::query_as::<_, InspectionTask>(
        r#"
        UPDATE lims.inspection_tasks SET
            current_step = $2, status = $3, started_at = $4, completed_at = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, sample_id, process_id, current_step, status, inspector, started_at, completed_at, created_at, updated_at
        "#,
    )
    .bind(task_id)
    .bind(current_step)
    .bind(&status)
    .bind(started_at)
    .bind(completed_at)
    .bind(Utc::now())
    .fetch_one(&state.db)
    .await;

    match update_result {
        Ok(updated_task) => Json(ApiResponse::success(updated_task, "步骤完成成功")),
        Err(e) => {
            tracing::error!("更新检验任务失败: {}", e);
            Json(ApiResponse::error(500, "更新检验任务失败"))
        }
    }
}

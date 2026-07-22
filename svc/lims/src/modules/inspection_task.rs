use axum::{
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::ApiResponse;

use crate::middleware::tenant::TenantContext;
use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/tasks", get(list_tasks).post(create_task))
        .route(
            "/tasks/{id}",
            get(get_task).put(update_task).delete(delete_task),
        )
        .route("/tasks/{id}/result", post(submit_result))
}

#[derive(Debug, Serialize)]
pub struct InspectionTask {
    pub id: String,
    pub tenant_id: String,
    pub task_no: String,
    pub sample_id: String,
    pub sample_no: String,
    pub test_items: serde_json::Value,
    pub status: String,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub planned_date: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub result: Option<serde_json::Value>,
    pub conclusion: Option<String>,
    pub recorded_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub sample_id: String,
    pub test_items: Vec<String>,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub planned_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub status: Option<String>,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitResultRequest {
    pub result: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
}

pub async fn list_tasks(
    State(state): State<crate::shared::AppState>,
) -> Json<ApiResponse<Vec<InspectionTask>>> {
    let rows = sqlx::query(
        "SELECT id, task_no, sample_id, sample_no, test_items, status, assigned_to, instrument_id, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at::TEXT, updated_at::TEXT FROM qa_lab_tasks ORDER BY created_at DESC"
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(data) => {
            let tasks = data
                .into_iter()
                .map(|row| InspectionTask {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    task_no: row.get("task_no"),
                    sample_id: row.get("sample_id"),
                    sample_no: row.get("sample_no"),
                    test_items: row.get("test_items"),
                    status: row.get("status"),
                    assigned_to: row.get("assigned_to"),
                    instrument_id: row.get("instrument_id"),
                    planned_date: row.get("planned_date"),
                    actual_start_date: row.get("actual_start_date"),
                    actual_end_date: row.get("actual_end_date"),
                    result: row.get("result"),
                    conclusion: row.get("conclusion"),
                    recorded_by: row.get("recorded_by"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(tasks, "获取检测任务列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch tasks: {}", e);
            Json(ApiResponse::error(500, "获取检测任务列表失败"))
        }
    }
}

pub async fn create_task(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreateTaskRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };

    let row = sqlx::query("SELECT id, sample_no FROM qa_lab_samples WHERE id = $1")
        .bind(sample_id)
        .fetch_one(&state.pool)
        .await;

    let sample = match row {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to fetch sample: {}", e);
            return Json(ApiResponse::error(404, "样品不存在"));
        }
    };

    let task_no = format!(
        "TK-{}-{}",
        chrono::Local::now().format("%Y%m%d"),
        uuid::Uuid::new_v4().to_string()[..6].to_uppercase()
    );

    let instrument_id = req
        .instrument_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let row = sqlx::query(
        "INSERT INTO qa_lab_tasks (task_no, sample_id, sample_no, test_items, assigned_to, instrument_id, planned_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, task_no, sample_id, sample_no, test_items, status, assigned_to, instrument_id, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at::TEXT, updated_at::TEXT"
    )
    .bind(task_no)
    .bind(sample_id)
    .bind(sample.get::<String, _>("sample_no"))
    .bind(serde_json::to_value(&req.test_items).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&req.assigned_to)
    .bind(instrument_id)
    .bind(&req.planned_date)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "检测任务创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create task: {}", e);
            Json(ApiResponse::error(500, "检测任务创建失败"))
        }
    }
}

pub async fn get_task(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InspectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query(
        "SELECT id, task_no, sample_id, sample_no, test_items, status, assigned_to, instrument_id, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at::TEXT, updated_at::TEXT FROM qa_lab_tasks WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取检测任务成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch task: {}", e);
            Json(ApiResponse::error(500, "获取检测任务失败"))
        }
    }
}

pub async fn update_task(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateTaskRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let instrument_id = req
        .instrument_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let row = sqlx::query(
        "UPDATE qa_lab_tasks SET status = COALESCE($2, status), assigned_to = COALESCE($3, assigned_to), instrument_id = COALESCE($4, instrument_id), actual_start_date = COALESCE($5, actual_start_date), actual_end_date = COALESCE($6, actual_end_date), updated_at = NOW() WHERE id = $1 RETURNING id, task_no, sample_id, sample_no, test_items, status, assigned_to, instrument_id, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(&req.status)
    .bind(&req.assigned_to)
    .bind(instrument_id)
    .bind(&req.actual_start_date)
    .bind(&req.actual_end_date)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "检测任务更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update task: {}", e);
            Json(ApiResponse::error(500, "检测任务更新失败"))
        }
    }
}

pub async fn submit_result(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<SubmitResultRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query(
        "UPDATE qa_lab_tasks SET result = $2, conclusion = $3, recorded_by = $4, status = 'completed', actual_end_date = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, task_no, sample_id, sample_no, test_items, status, assigned_to, instrument_id, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(req.result)
    .bind(&req.conclusion)
    .bind(&req.recorded_by)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let task = InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };

            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let tid = Uuid::parse_str(&task.id).unwrap_or_else(|_| Uuid::nil());
                let tno = task.task_no.clone();
                let sid = Uuid::parse_str(&task.sample_id).unwrap_or_else(|_| Uuid::nil());
                let sno = task.sample_no.clone();
                let conclusion = task.conclusion.clone().unwrap_or_default();
                let recorded_by = task.recorded_by.clone().unwrap_or_default();
                let result_val = task.result.clone().unwrap_or(serde_json::Value::Null);
                tokio::spawn(async move {
                    let payload = topems_shared::event::LimsInspectionResultSubmittedPayload {
                        task_id: tid,
                        task_no: tno,
                        sample_id: sid,
                        sample_no: sno,
                        conclusion,
                        result: result_val,
                        recorded_by,
                    };
                    if let Err(e) = publisher
                        .publish_event(
                            topems_shared::event::EventType::LimsInspectionResultSubmitted,
                            payload,
                        )
                        .await
                    {
                        tracing::warn!("[lims] LimsInspectionResultSubmitted 事件发布失败（graceful fallback）: {}", e);
                    } else {
                        tracing::info!(
                            "[lims] LimsInspectionResultSubmitted 事件发布成功 - task_id={}",
                            tid
                        );
                    }
                });
            }

            Json(ApiResponse::success(task, "检测结果提交成功"))
        }
        Err(e) => {
            tracing::error!("Failed to submit result: {}", e);
            Json(ApiResponse::error(500, "检测结果提交失败"))
        }
    }
}

pub async fn delete_task(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lab_tasks WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "检测任务删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete task: {}", e);
            Json(ApiResponse::error(500, "检测任务删除失败"))
        }
    }
}

use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/records", get(list_records).post(create_record))
        .route("/records/{id}", get(get_record).delete(delete_record))
}

#[derive(Debug, Deserialize)]
pub struct RecordQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub task_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InspectionRecord {
    pub id: String,
    pub tenant_id: String,
    pub record_no: String,
    pub task_id: String,
    pub task_no: Option<String>,
    pub test_data: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
    pub recorded_at: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRecordRequest {
    pub task_id: String,
    pub test_data: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:inspection_record:read"])),
    path = "/records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection_record"
)]
pub async fn list_records(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<RecordQuery>,
) -> Json<ApiResponse<Vec<InspectionRecord>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let rows = match query.task_id.as_ref() {
        Some(tid) => {
            let tid = match Uuid::parse_str(tid) {
                Ok(u) => u,
                Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
            };
            sqlx::query(
                "SELECT r.id, r.record_no, r.task_id, t.task_no, r.test_data, r.conclusion, r.recorded_by, r.recorded_at::TEXT, r.created_at::TEXT FROM qa_lab_records r LEFT JOIN qa_lab_tasks t ON r.task_id = t.id WHERE r.deleted_at IS NULL AND r.task_id = $1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(tid)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        None => sqlx::query(
            "SELECT r.id, r.record_no, r.task_id, t.task_no, r.test_data, r.conclusion, r.recorded_by, r.recorded_at::TEXT, r.created_at::TEXT FROM qa_lab_records r LEFT JOIN qa_lab_tasks t ON r.task_id = t.id WHERE r.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match rows {
        Ok(data) => {
            let records = data
                .into_iter()
                .map(|row| InspectionRecord {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    record_no: row.get("record_no"),
                    task_id: row.get("task_id"),
                    task_no: row.get("task_no"),
                    test_data: row.get("test_data"),
                    conclusion: row.get("conclusion"),
                    recorded_by: row.get("recorded_by"),
                    recorded_at: row.get("recorded_at"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(records, "获取检测记录列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch records: {}", e);
            Json(ApiResponse::error(500, "获取检测记录列表失败"))
        }
    }
}

pub async fn create_record(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreateRecordRequest>,
) -> Json<ApiResponse<InspectionRecord>> {
    let record_no = format!(
        "REC-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let task_id = match Uuid::parse_str(&req.task_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query(
        "INSERT INTO qa_lab_records (record_no, task_id, test_data, conclusion, recorded_by, recorded_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id::TEXT, record_no, task_id::TEXT, test_data, conclusion, recorded_by, recorded_at::TEXT, created_at::TEXT"
    )
    .bind(record_no)
    .bind(task_id)
    .bind(req.test_data)
    .bind(&req.conclusion)
    .bind(&req.recorded_by)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let task_no = sqlx::query("SELECT task_no FROM qa_lab_tasks WHERE id = $1")
                .bind(task_id)
                .fetch_optional(&state.pool)
                .await
                .ok()
                .flatten()
                .map(|r| r.get::<String, _>("task_no"));
            Json(ApiResponse::success(
                InspectionRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    record_no: r.get("record_no"),
                    task_id: r.get("task_id"),
                    task_no,
                    test_data: r.get("test_data"),
                    conclusion: r.get("conclusion"),
                    recorded_by: r.get("recorded_by"),
                    recorded_at: r.get("recorded_at"),
                    created_at: r.get("created_at"),
                },
                "检测记录创建成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to create record: {}", e);
            Json(ApiResponse::error(500, "检测记录创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:inspection_record:read"])),
    path = "/records/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection_record"
)]
pub async fn get_record(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InspectionRecord>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的记录ID")),
    };

    let row = sqlx::query(
        "SELECT r.id, r.record_no, r.task_id, t.task_no, r.test_data, r.conclusion, r.recorded_by, r.recorded_at::TEXT, r.created_at::TEXT FROM qa_lab_records r LEFT JOIN qa_lab_tasks t ON r.task_id = t.id WHERE r.deleted_at IS NULL AND r.id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            InspectionRecord {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                record_no: r.get("record_no"),
                task_id: r.get("task_id"),
                task_no: r.get("task_no"),
                test_data: r.get("test_data"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                recorded_at: r.get("recorded_at"),
                created_at: r.get("created_at"),
            },
            "获取检测记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch record: {}", e);
            Json(ApiResponse::error(500, "获取检测记录失败"))
        }
    }
}

pub async fn delete_record(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的记录ID")),
    };

    let result = sqlx::query("UPDATE qa_lab_records SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "检测记录删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete record: {}", e);
            Json(ApiResponse::error(500, "检测记录删除失败"))
        }
    }
}

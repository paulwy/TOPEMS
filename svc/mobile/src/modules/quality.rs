use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDefectRequest {
    pub task_id: String,
    pub defect_type: String,
    pub severity: String,
    pub quantity: i32,
    pub description: String,
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskStatusRequest {
    pub status: String,
    pub result: Option<serde_json::Value>,
}

pub async fn list_quality_tasks(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, task_no, task_type, product_name, batch_no, quantity, status, inspector, due_date, created_at
        FROM quality_tasks
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let tasks: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id,
                        "task_no": row.task_no,
                        "type": row.task_type,
                        "product_name": row.product_name,
                        "batch_no": row.batch_no,
                        "quantity": row.quantity,
                        "status": row.status,
                        "inspector": row.inspector,
                        "due_date": row.due_date.map(|d| d.to_string()),
                        "created_at": row.created_at.map(|t| t.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": tasks, "total": tasks.len() }),
                "获取质检任务列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取质检任务列表失败: {}", e);
            Json(ApiResponse::error(500, "获取质检任务列表失败"))
        }
    }
}

pub async fn get_quality_task(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的ID格式")),
    };

    let row = sqlx::query!(
        r#"
        SELECT id, task_no, task_type, product_name, batch_no, quantity, status, inspector, due_date, created_at
        FROM quality_tasks
        WHERE id = $1
        "#,
        task_id
    )
    .fetch_optional(&pool)
    .await;

    match row {
        Ok(Some(row)) => {
            let task = serde_json::json!({
                "id": row.id,
                "task_no": row.task_no,
                "type": row.task_type,
                "product_name": row.product_name,
                "batch_no": row.batch_no,
                "quantity": row.quantity,
                "status": row.status,
                "inspector": row.inspector,
                "due_date": row.due_date.map(|d| d.to_string()),
                "created_at": row.created_at.map(|t| t.to_string()),
            });
            Json(ApiResponse::success(task, "获取质检任务详情成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "质检任务不存在")),
        Err(e) => {
            tracing::error!("获取质检任务详情失败: {}", e);
            Json(ApiResponse::error(500, "获取质检任务详情失败"))
        }
    }
}

pub async fn list_defect_records(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, task_id, product_name, batch_no, defect_type, severity, quantity, description, images, reporter, reported_at, status
        FROM defect_records
        ORDER BY reported_at DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let records: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    let images: Vec<String> = if let Some(imgs) = row.images {
                        serde_json::from_str(&imgs).unwrap_or_default()
                    } else {
                        vec![]
                    };
                    serde_json::json!({
                        "id": row.id,
                        "task_id": row.task_id,
                        "product_name": row.product_name,
                        "batch_no": row.batch_no,
                        "defect_type": row.defect_type,
                        "severity": row.severity,
                        "quantity": row.quantity,
                        "description": row.description,
                        "images": images,
                        "reporter": row.reporter,
                        "reported_at": row.reported_at.map(|t| t.to_string()),
                        "status": row.status,
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": records, "total": records.len() }),
                "获取缺陷记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取缺陷记录列表失败: {}", e);
            Json(ApiResponse::error(500, "获取缺陷记录列表失败"))
        }
    }
}

pub async fn report_defect(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateDefectRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let task_id = match Uuid::parse_str(&payload.task_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID格式")),
    };

    let task_info = sqlx::query!(
        r#"
        SELECT product_name, batch_no
        FROM quality_tasks
        WHERE id = $1
        "#,
        task_id
    )
    .fetch_optional(&pool)
    .await;

    let (product_name, batch_no) = match task_info {
        Ok(Some(row)) => (row.product_name, row.batch_no),
        Ok(None) => return Json(ApiResponse::error(404, "质检任务不存在")),
        Err(e) => {
            tracing::error!("获取质检任务信息失败: {}", e);
            return Json(ApiResponse::error(500, "获取质检任务信息失败"));
        }
    };

    let record_id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let images = payload.images.clone().unwrap_or_default();
    let images_json_str = serde_json::to_string(&images).unwrap();

    let result = sqlx::query!(
        r#"
        INSERT INTO defect_records (id, task_id, product_name, batch_no, defect_type, severity, quantity, description, images, reporter, reported_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#,
        record_id,
        task_id,
        product_name,
        batch_no,
        payload.defect_type,
        payload.severity,
        payload.quantity as i32,
        payload.description,
        images_json_str,
        "mobile_user",
        now.naive_utc(),
        "open"
    )
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            let record = serde_json::json!({
                "id": record_id,
                "task_id": task_id,
                "product_name": product_name,
                "batch_no": batch_no,
                "defect_type": payload.defect_type,
                "severity": payload.severity,
                "quantity": payload.quantity,
                "description": payload.description,
                "images": images,
                "reporter": "mobile_user",
                "reported_at": now.to_rfc3339(),
                "status": "open",
            });
            Json(ApiResponse::success(record, "上报缺陷成功"))
        }
        Err(e) => {
            tracing::error!("上报缺陷失败: {}", e);
            Json(ApiResponse::error(500, "上报缺陷失败"))
        }
    }
}

pub async fn update_quality_task_status(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<UpdateTaskStatusRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的ID格式")),
    };

    let result = sqlx::query!(
        r#"
        UPDATE quality_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
        "#,
        payload.status,
        task_id
    )
    .execute(&pool)
    .await;

    match result {
        Ok(update_result) => {
            if update_result.rows_affected() == 0 {
                return Json(ApiResponse::error(404, "质检任务不存在"));
            }

            let row = sqlx::query!(
                r#"
                SELECT id, task_no, task_type, product_name, batch_no, quantity, status, inspector, due_date, created_at
                FROM quality_tasks
                WHERE id = $1
                "#,
                task_id
            )
            .fetch_optional(&pool)
            .await;

            match row {
                Ok(Some(row)) => {
                    let task = serde_json::json!({
                        "id": row.id,
                        "task_no": row.task_no,
                        "type": row.task_type,
                        "product_name": row.product_name,
                        "batch_no": row.batch_no,
                        "quantity": row.quantity,
                        "status": row.status,
                        "inspector": row.inspector,
                        "due_date": row.due_date.map(|d| d.to_string()),
                        "created_at": row.created_at.map(|t| t.to_string()),
                    });
                    Json(ApiResponse::success(task, "更新质检任务状态成功"))
                }
                _ => Json(ApiResponse::error(500, "获取更新后的任务信息失败")),
            }
        }
        Err(e) => {
            tracing::error!("更新质检任务状态失败: {}", e);
            Json(ApiResponse::error(500, "更新质检任务状态失败"))
        }
    }
}

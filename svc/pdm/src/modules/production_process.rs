use axum::{extract::Path, extract::Query, extract::State, routing::get, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/pdm/production-processes",
            get(list_processes).post(create_process),
        )
        .route(
            "/api/pdm/production-processes/{id}",
            get(get_process).put(update_process).delete(delete_process),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionProcess {
    pub id: Uuid,
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub process_type: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub unit: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProcessRequest {
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub process_type: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub unit: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProcessRequest {
    pub process_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub process_type: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub unit: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProcessQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn list_processes(
    State(state): State<AppState>,
    Query(query): Query<ProcessQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
        FROM pdm_production_processes
        WHERE ($1::text IS NULL OR process_no ILIKE $1 OR name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(processes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_production_processes
                WHERE ($1::text IS NULL OR process_no ILIKE $1 OR name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&query.status)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "processes": processes,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取工序列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取工序列表失败: {}", e);
            Json(ApiResponse::error(500, "获取工序列表失败"))
        }
    }
}

pub async fn create_process(
    State(state): State<AppState>,
    Json(req): Json<CreateProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    if req.process_no.is_empty() {
        return Json(ApiResponse::error(400, "工序编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "工序名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        INSERT INTO pdm_production_processes (process_no, name, description, process_type, standard_time, unit, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
        "#,
    )
    .bind(&req.process_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.process_type)
    .bind(&req.standard_time)
    .bind(&req.unit)
    .bind(&status)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(process) => Json(ApiResponse::success(process, "工序创建成功")),
        Err(e) => {
            tracing::error!("创建工序失败: {}", e);
            Json(ApiResponse::error(500, "创建工序失败"))
        }
    }
}

pub async fn get_process(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionProcess>> {
    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
        FROM pdm_production_processes WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(process)) => Json(ApiResponse::success(process, "获取工序成功")),
        Ok(None) => Json(ApiResponse::error(404, "工序不存在")),
        Err(e) => {
            tracing::error!("获取工序失败: {}", e);
            Json(ApiResponse::error(500, "获取工序失败"))
        }
    }
}

pub async fn update_process(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        UPDATE pdm_production_processes SET
            process_no = COALESCE($2, process_no),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            process_type = COALESCE($5, process_type),
            standard_time = COALESCE($6, standard_time),
            unit = COALESCE($7, unit),
            status = COALESCE($8, status),
            updated_at = $9
        WHERE id = $1
        RETURNING id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.process_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.process_type)
    .bind(&req.standard_time)
    .bind(&req.unit)
    .bind(&req.status)
    .bind(now)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(process)) => Json(ApiResponse::success(process, "工序更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "工序不存在")),
        Err(e) => {
            tracing::error!("更新工序失败: {}", e);
            Json(ApiResponse::error(500, "更新工序失败"))
        }
    }
}

pub async fn delete_process(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pdm_production_processes WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "工序删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "工序不存在")),
        Err(e) => {
            tracing::error!("删除工序失败: {}", e);
            Json(ApiResponse::error(500, "删除工序失败"))
        }
    }
}

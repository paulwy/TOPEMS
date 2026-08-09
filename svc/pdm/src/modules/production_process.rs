use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/production-processes",
            get(list_processes).post(create_process),
        )
        .route(
            "/production-processes/{id}",
            get(get_process).put(update_process).delete(delete_process),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionProcess {
    pub id: Uuid,
    pub tenant_id: Uuid,
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

#[utoipa::path(
    get,
    path = "/api/pdm/production-processes",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_processes(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ProcessQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, tenant_id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
        FROM pdm_production_processes
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR process_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
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
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR process_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
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

#[utoipa::path(
    post,
    path = "/api/pdm/production-processes",
    request_body = CreateProcessRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    if req.process_no.is_empty() {
        return Json(ApiResponse::error(400, "工序编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "工序名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        INSERT INTO pdm_production_processes (tenant_id, process_no, name, description, process_type, standard_time, unit, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
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

#[utoipa::path(
    get,
    path = "/api/pdm/production-processes/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ProductionProcess>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, tenant_id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
        FROM pdm_production_processes WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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

#[utoipa::path(
    put,
    path = "/api/pdm/production-processes/{id}",
    request_body = UpdateProcessRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
        WHERE id = $1 AND tenant_id = $10
        RETURNING id, tenant_id, process_no, name, description, process_type, standard_time, unit, status, created_at, updated_at
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
    .bind(tenant_id)
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

#[utoipa::path(
    delete,
    path = "/api/pdm/production-processes/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE pdm_production_processes SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
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

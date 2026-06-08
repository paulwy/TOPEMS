use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateLocationRequest, Location, UpdateLocationRequest};
use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, PaginationParams, api_error};

#[derive(Debug, Deserialize)]
pub struct LocationPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/api/v1/locations", get(list_locations).post(create_location))
        .route(
            "/api/v1/locations/{id}",
            get(get_location).put(update_location).delete(delete_location),
        )
}

async fn list_locations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LocationPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let warehouse_id = params.warehouse_id;

    let result = sqlx::query_as::<_, Location>(
        r#"
        SELECT id, warehouse_id, code, name, type, capacity, status, created_at, updated_at
        FROM locations
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR warehouse_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&warehouse_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(locations) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM locations
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR warehouse_id = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&warehouse_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "locations": locations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取库位列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库位列表失败: {}", e);
            Json(api_error(500, "获取库位列表失败"))
        }
    }
}

async fn create_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateLocationRequest>,
) -> Json<ApiResponse<Location>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Location>(
        r#"
        INSERT INTO locations (id, warehouse_id, code, name, type, capacity, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'available', $7, $8)
        RETURNING id, warehouse_id, code, name, type, capacity, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.warehouse_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.r#type)
    .bind(req.capacity)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(location) => (
            Json(ApiResponse::success(location.clone(), "库位创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建库位失败: {}", e);
            (
                Json(api_error(500, "库位创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(location) = &result {
        serde_json::to_value(location).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "location".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Location>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, Location>(
        r#"
        SELECT id, warehouse_id, code, name, type, capacity, status, created_at, updated_at
        FROM locations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(location)) => Json(ApiResponse::success(location, "获取库位成功")),
        Ok(None) => Json(api_error(404, "库位不存在")),
        Err(e) => {
            tracing::error!("获取库位失败: {}", e);
            Json(api_error(500, "获取库位失败"))
        }
    }
}

async fn update_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateLocationRequest>,
) -> Json<ApiResponse<Location>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, Location>(
        r#"
        SELECT id, warehouse_id, code, name, type, capacity, status, created_at, updated_at FROM locations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(l)) => l,
        Ok(None) => return Json(api_error(404, "库位不存在")),
        Err(e) => return Json(api_error(500, &format!("查询库位失败: {}", e))),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let code = req.code.unwrap_or(existing.code);
    let name = req.name.or(existing.name);
    let r#type = req.r#type.or(existing.r#type);
    let capacity = req.capacity.or(existing.capacity);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Location>(
        r#"
        UPDATE locations SET
            warehouse_id = $2, code = $3, name = $4, type = $5, capacity = $6, 
            status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, warehouse_id, code, name, type, capacity, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&warehouse_id)
    .bind(&code)
    .bind(&name)
    .bind(&r#type)
    .bind(capacity)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(location) => (
            Json(ApiResponse::success(location.clone(), "库位更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新库位失败: {}", e);
            (
                Json(api_error(500, "库位更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(location) = &result {
        serde_json::to_value(location).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "location".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM locations WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "库位删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "库位不存在")),
            "error",
            Some("库位不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除库位失败: {}", e);
            (
                Json(api_error(500, "库位删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "location".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}
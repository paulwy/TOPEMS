use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateWarehouseRequest, Warehouse, UpdateWarehouseRequest};
use crate::api::audit::log_audit_event;
use topems_shared::{ApiResponse, PaginationParams, api_error};

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/warehouses", get(list_warehouses).post(create_warehouse))
        .route(
            "/api/v1/warehouses/{id}",
            get(get_warehouse).put(update_warehouse).delete(delete_warehouse),
        )
        .with_state(state);

    Ok(app)
}

async fn list_warehouses(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Warehouse>(
        r#"
        SELECT id, name, code, address, manager, phone, status, created_at, updated_at
        FROM warehouses
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
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
        Ok(warehouses) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM warehouses
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
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
                    "warehouses": warehouses,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取仓库列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取仓库列表失败: {}", e);
            Json(api_error(500, "获取仓库列表失败"))
        }
    }
}

async fn create_warehouse(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateWarehouseRequest>,
) -> Json<ApiResponse<Warehouse>> {
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Warehouse>(
        r#"
        INSERT INTO warehouses (id, name, code, address, manager, phone, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
        RETURNING id, name, code, address, manager, phone, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.address)
    .bind(&req.manager)
    .bind(&req.phone)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(warehouse) => (
            Json(ApiResponse::success(warehouse.clone(), "仓库创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建仓库失败: {}", e);
            (
                Json(api_error(500, "仓库创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(warehouse) = &result {
        serde_json::to_value(warehouse).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "warehouse".to_string(),
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

async fn get_warehouse(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Warehouse>> {
    let result = sqlx::query_as::<_, Warehouse>(
        r#"
        SELECT id, name, code, address, manager, phone, status, created_at, updated_at
        FROM warehouses WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(warehouse)) => Json(ApiResponse::success(warehouse, "获取仓库成功")),
        Ok(None) => Json(api_error(404, "仓库不存在")),
        Err(e) => {
            tracing::error!("获取仓库失败: {}", e);
            Json(api_error(500, "获取仓库失败"))
        }
    }
}

async fn update_warehouse(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateWarehouseRequest>,
) -> Json<ApiResponse<Warehouse>> {
    // 先获取 request_data 避免所有权问题
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, Warehouse>(
        "SELECT id, name, code, address, manager, phone, status, created_at, updated_at FROM warehouses WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(w)) => w,
        Ok(None) => return Json(api_error(404, "仓库不存在")),
        Err(e) => return Json(api_error(500, &format!("查询仓库失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let address = req.address.or(existing.address);
    let manager = req.manager.or(existing.manager);
    let phone = req.phone.or(existing.phone);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Warehouse>(
        r#"
        UPDATE warehouses SET
            name = $2, code = $3, address = $4, manager = $5, phone = $6, status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, name, code, address, manager, phone, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&address)
    .bind(&manager)
    .bind(&phone)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(warehouse) => (
            Json(ApiResponse::success(warehouse.clone(), "仓库更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新仓库失败: {}", e);
            (
                Json(api_error(500, "仓库更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(warehouse) = &result {
        serde_json::to_value(warehouse).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "warehouse".to_string(),
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

async fn delete_warehouse(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM warehouses WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "仓库删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "仓库不存在")),
            "error",
            Some("仓库不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除仓库失败: {}", e);
            (
                Json(api_error(500, "仓库删除失败")),
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
        "warehouse".to_string(),
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

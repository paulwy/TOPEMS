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

use crate::models::{
    DictType, CreateDictTypeRequest, UpdateDictTypeRequest,
    DictItem, CreateDictItemRequest, UpdateDictItemRequest,
};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;

#[derive(Debug, Deserialize)]
pub struct DictTypeQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DictItemQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/dict-types", get(list_dict_types).post(create_dict_type))
        .route(
            "/api/v1/dict-types/{id}",
            get(get_dict_type).put(update_dict_type).delete(delete_dict_type),
        )
        .route("/api/v1/dict-types/{id}/items", get(list_dict_items))
        .route("/api/v1/dict-items", post(create_dict_item))
        .route(
            "/api/v1/dict-items/{id}",
            get(get_dict_item).put(update_dict_item).delete(delete_dict_item),
        )
        .with_state(state);

    Ok(app)
}

async fn list_dict_types(
    State(state): State<Arc<AppState>>,
    Query(params): Query<DictTypeQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<DictType>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let category_filter = params.category.clone();
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, DictType>(
        r#"
        SELECT id, code, name, category, description, status, created_at, updated_at
        FROM sys_dict_types
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR category = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&category_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(dict_types) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM sys_dict_types
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR category = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&category_filter)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(dict_types, total, page, page_size),
                "获取字典类型列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取字典类型列表失败: {}", e);
            Json(api_error(500, "获取字典类型列表失败"))
        }
    }
}

async fn create_dict_type(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, DictType>(
        r#"
        INSERT INTO sys_dict_types (id, code, name, category, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
        RETURNING id, code, name, category, description, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.category)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(dict_type) => (
            Json(ApiResponse::success(dict_type.clone(), "字典类型创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建字典类型失败: {}", e);
            (
                Json(api_error(500, "字典类型创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(dict_type) = &result {
        serde_json::to_value(dict_type).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "dict_type".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_dict_type(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DictType>> {
    let result = sqlx::query_as::<_, DictType>(
        r#"
        SELECT id, code, name, category, description, status, created_at, updated_at
        FROM sys_dict_types WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(dict_type)) => Json(ApiResponse::success(dict_type, "获取字典类型成功")),
        Ok(None) => Json(api_error(404, "字典类型不存在")),
        Err(e) => {
            tracing::error!("获取字典类型失败: {}", e);
            Json(api_error(500, "获取字典类型失败"))
        }
    }
}

async fn update_dict_type(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    let existing = sqlx::query_as::<_, DictType>(
        "SELECT id, code, name, category, description, status, created_at, updated_at FROM sys_dict_types WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(d)) => d,
        Ok(None) => return Json(api_error(404, "字典类型不存在")),
        Err(e) => return Json(api_error(500, &format!("查询字典类型失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.unwrap_or(existing.category);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, DictType>(
        r#"
        UPDATE sys_dict_types SET
            name = $2, category = $3, description = $4, status = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, code, name, category, description, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&description)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(dict_type) => (
            Json(ApiResponse::success(dict_type.clone(), "字典类型更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新字典类型失败: {}", e);
            (
                Json(api_error(500, "字典类型更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(dict_type) = &result {
        serde_json::to_value(dict_type).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "dict_type".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_dict_type(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let delete_items_result = sqlx::query("DELETE FROM sys_dict_items WHERE dict_type_id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    if let Err(e) = delete_items_result {
        tracing::error!("删除字典项失败: {}", e);
    }

    let result = sqlx::query("DELETE FROM sys_dict_types WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "字典类型删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "字典类型不存在")),
            "error".to_string(),
            Some("字典类型不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除字典类型失败: {}", e);
            (
                Json(api_error(500, "字典类型删除失败")),
                "error".to_string(),
                Some(e.to_string()),
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
        "dict_type".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn list_dict_items(
    State(state): State<Arc<AppState>>,
    Path(dict_type_id): Path<Uuid>,
    Query(params): Query<DictItemQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<DictItem>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(100).min(500);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, DictItem>(
        r#"
        SELECT id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        FROM sys_dict_items
        WHERE dict_type_id = $1
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
        ORDER BY sort_order ASC, created_at ASC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(dict_type_id)
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM sys_dict_items
                WHERE dict_type_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                "#,
            )
            .bind(dict_type_id)
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取字典项列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取字典项列表失败: {}", e);
            Json(api_error(500, "获取字典项列表失败"))
        }
    }
}

async fn create_dict_item(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let sort_order = req.sort_order.unwrap_or(0);

    let result = sqlx::query_as::<_, DictItem>(
        r#"
        INSERT INTO sys_dict_items (id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
        RETURNING id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.dict_type_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.value)
    .bind(sort_order)
    .bind(req.parent_id)
    .bind(&req.extra_data)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "字典项创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建字典项失败: {}", e);
            (
                Json(api_error(500, "字典项创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(item) = &result {
        serde_json::to_value(item).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "dict_item".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_dict_item(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DictItem>> {
    let result = sqlx::query_as::<_, DictItem>(
        r#"
        SELECT id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        FROM sys_dict_items WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => Json(ApiResponse::success(item, "获取字典项成功")),
        Ok(None) => Json(api_error(404, "字典项不存在")),
        Err(e) => {
            tracing::error!("获取字典项失败: {}", e);
            Json(api_error(500, "获取字典项失败"))
        }
    }
}

async fn update_dict_item(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    let existing = sqlx::query_as::<_, DictItem>(
        "SELECT id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at FROM sys_dict_items WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(d)) => d,
        Ok(None) => return Json(api_error(404, "字典项不存在")),
        Err(e) => return Json(api_error(500, &format!("查询字典项失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let code = req.code.unwrap_or(existing.code);
    let name = req.name.unwrap_or(existing.name);
    let value = req.value.or(existing.value);
    let sort_order = req.sort_order.unwrap_or(existing.sort_order);
    let parent_id = req.parent_id.or(existing.parent_id);
    let extra_data = req.extra_data.or(existing.extra_data);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, DictItem>(
        r#"
        UPDATE sys_dict_items SET
            code = $2, name = $3, value = $4, sort_order = $5, parent_id = $6, extra_data = $7, status = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&code)
    .bind(&name)
    .bind(&value)
    .bind(sort_order)
    .bind(parent_id)
    .bind(&extra_data)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "字典项更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新字典项失败: {}", e);
            (
                Json(api_error(500, "字典项更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(item) = &result {
        serde_json::to_value(item).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "dict_item".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_dict_item(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM sys_dict_items WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "字典项删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "字典项不存在")),
            "error".to_string(),
            Some("字典项不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除字典项失败: {}", e);
            (
                Json(api_error(500, "字典项删除失败")),
                "error".to_string(),
                Some(e.to_string()),
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
        "dict_item".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

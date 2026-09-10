use axum::{
    body::Body,
    extract::{Extension, Path, Query, State},
    http::{header, HeaderMap, Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    CreateDictItemRequest, CreateDictTypeRequest, DictItem, DictType, UpdateDictItemRequest,
    UpdateDictTypeRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::utils::validate_required_field;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BatchCreateDictItemRequest {
    pub dict_type_id: Uuid,
    pub items: Vec<CreateDictItemRequest>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DictItemExport {
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: i32,
    pub status: String,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct DictTypeQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct DictItemQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
}

fn extract_claims(req: &Request<Body>) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

async fn require_dict_read_permission(req: Request<Body>, next: Next) -> Response<Body> {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    if !claims.has_permission("iam:dictionaries_read") && !claims.is_superuser {
        tracing::warn!(
            "Permission denied: user={}, permission=iam:dictionaries_read",
            claims.username
        );
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            r#"{"success":false,"message":"权限不足：需要字典读取权限","code":403}"#,
        )
            .into_response();
    }

    next.run(req).await
}

async fn require_dict_write_permission(req: Request<Body>, next: Next) -> Response<Body> {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    if !claims.has_permission("iam:dictionaries_update") && !claims.is_superuser {
        tracing::warn!(
            "Permission denied: user={}, permission=iam:dictionaries_update",
            claims.username
        );
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            r#"{"success":false,"message":"权限不足：需要字典更新权限","code":403}"#,
        )
            .into_response();
    }

    next.run(req).await
}

async fn require_dict_delete_permission(req: Request<Body>, next: Next) -> Response<Body> {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    if !claims.is_superuser && !claims.has_permission("iam:dictionaries_update") {
        tracing::warn!(
            "Permission denied: user={}, permission=iam:dictionaries_update",
            claims.username
        );
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            r#"{"success":false,"message":"权限不足：需要超级管理员或字典更新权限","code":403}"#,
        )
            .into_response();
    }

    next.run(req).await
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/system/dict-types",
            get(list_dict_types)
                .post(create_dict_type)
                .layer(axum::middleware::from_fn(require_dict_write_permission)),
        )
        .route(
            "/system/dict-types/{id}",
            get(get_dict_type)
                .put(update_dict_type)
                .delete(delete_dict_type)
                .layer(axum::middleware::from_fn(require_dict_write_permission)),
        )
        .route("/system/dict-types/{id}/items", get(list_dict_items))
        .route(
            "/system/dict-types/{id}/items/export",
            get(export_dict_items),
        )
        .route(
            "/system/dict-items",
            post(create_dict_item).layer(axum::middleware::from_fn(require_dict_write_permission)),
        )
        .route(
            "/system/dict-items/batch",
            post(batch_create_dict_items)
                .layer(axum::middleware::from_fn(require_dict_write_permission)),
        )
        .route(
            "/system/dict-items/{id}",
            get(get_dict_item)
                .put(update_dict_item)
                .delete(delete_dict_item)
                .layer(axum::middleware::from_fn(require_dict_write_permission)),
        )
        .layer(axum::middleware::from_fn(require_dict_read_permission))
}

/// 列出字典类型（分页 + 搜索 + 分类/状态筛选）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:dict:read"])),
    path = "/system/dict-types",
    tag = "Dict",
    operation_id = "list_dict_types",
    params(DictTypeQueryParams),
    responses((status = 200, description = "OK")),
)]
pub async fn list_dict_types(
    State(state): State<ApiState>,
    Query(params): Query<DictTypeQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<DictType>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let category_filter = params.category.clone();
    let status_filter = params.status.clone();

    if search_pattern.is_none()
        && category_filter.is_none()
        && status_filter.is_none()
        && page == 1
        && page_size >= 100
    {
        if let Some(cached) = state.dict_cache.get("all_dict_types") {
            let total = cached.len() as i64;
            let dict_types = cached.into_iter().take(page_size as usize).collect();
            return Json(ApiResponse::success(
                PaginatedResponse::new(dict_types, total, page, page_size),
                "获取字典类型列表成功(缓存)",
            ));
        }
    }

    let result = sqlx::query_as::<_, DictType>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, code, name, category, description, status, created_at, updated_at
        FROM erp.dict_types
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR category = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#
    ))
    .bind(&search_pattern)
    .bind(&category_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(dict_types) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "erp",
                r#"
                SELECT COUNT(*) FROM erp.dict_types
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR category = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#
            ))
            .bind(&search_pattern)
            .bind(&category_filter)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            if search_pattern.is_none() && category_filter.is_none() && status_filter.is_none() {
                state
                    .dict_cache
                    .set("all_dict_types".to_string(), dict_types.clone());
            }

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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:dict:write"])),
    path = "/system/dict-types",
    tag = "Dict",
    operation_id = "create_dict_type",
    responses((status = 200, description = "OK")),
)]
pub async fn create_dict_type(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = validate_required_field("字典类型编码", &req.code) {
        return Json(api_error(400, &e));
    }

    if let Err(e) = validate_required_field("字典类型名称", &req.name) {
        return Json(api_error(400, &e));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, DictType>(
        only_own_schema_query!("erp", r#"
        INSERT INTO erp.dict_types (id, code, name, category, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
        RETURNING id, code, name, category, description, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.category)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(dict_type) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(api_error(500, "事务提交失败"));
                }
            }
            state.dict_cache.remove("all_dict_types");
            (
                Json(ApiResponse::success(dict_type.clone(), "字典类型创建成功")),
                "success".to_string(),
                None,
            )
        }
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
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "dict_type".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:dict:read"])),
    path = "/system/dict-types/{id}",
    tag = "Dict",
    operation_id = "get_dict_type",
    responses((status = 200, description = "OK")),
)]
pub async fn get_dict_type(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<DictType>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, DictType>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, code, name, category, description, status, created_at, updated_at
        FROM erp.dict_types WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:dict:write"])),
    path = "/system/dict-types/{id}",
    tag = "Dict",
    operation_id = "update_dict_type",
    responses((status = 200, description = "OK")),
)]
pub async fn update_dict_type(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, DictType>(
        only_own_schema_query!("erp", "SELECT id, code, name, category, description, status, created_at, updated_at FROM erp.dict_types WHERE id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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

    let result = sqlx::query_as::<_, DictType>(only_own_schema_query!(
        "erp",
        r#"
        UPDATE erp.dict_types SET
            name = $2, category = $3, description = $4, status = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, code, name, category, description, status, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&description)
    .bind(&status)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(dict_type) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(api_error(500, "事务提交失败"));
                }
            }
            state.dict_cache.remove("all_dict_types");
            (
                Json(ApiResponse::success(dict_type.clone(), "字典类型更新成功")),
                "success".to_string(),
                None,
            )
        }
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
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "dict_type".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:dict:write"])),
    path = "/system/dict-types/{id}",
    tag = "Dict",
    operation_id = "delete_dict_type",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_dict_type(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.dict_items SET deleted_at = NOW() WHERE dict_type_id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await
    {
        tracing::warn!("删除字典条目失败，继续删除字典类型: {}", e);
    }

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.dict_types SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.dict_cache.remove("all_dict_types");
            (
                Json(ApiResponse::success("".to_string(), "字典类型删除成功")),
                "success".to_string(),
                None,
            )
        }
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "dict_type".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

/// 列出指定字典类型下的字典项（分页 + 搜索）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:dict:read"])),
    path = "/system/dict-types/{id}/items",
    tag = "Dict",
    operation_id = "list_dict_items",
    params(DictItemQueryParams),
    responses((status = 200, description = "OK")),
)]
pub async fn list_dict_items(
    State(_state): State<ApiState>,
    Path(dict_type_id): Path<Uuid>,
    Query(params): Query<DictItemQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<DictItem>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(100).min(500);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, DictItem>(
        only_own_schema_query!("erp", r#"
        SELECT id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        FROM erp.dict_items
        WHERE dict_type_id = $1
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
        ORDER BY sort_order ASC, created_at ASC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(dict_type_id)
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "erp",
                r#"
                SELECT COUNT(*) FROM erp.dict_items
                WHERE deleted_at IS NULL AND dict_type_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                "#
            ))
            .bind(dict_type_id)
            .bind(&search_pattern)
            .fetch_one(&mut **txn)
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:dict:write"])),
    path = "/system/dict-items",
    tag = "Dict",
    operation_id = "create_dict_item",
    responses((status = 200, description = "OK")),
)]
pub async fn create_dict_item(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();
    let sort_order = req.sort_order.unwrap_or(0);

    let result = sqlx::query_as::<_, DictItem>(
        only_own_schema_query!("erp", r#"
        INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
        RETURNING id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        "#),
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
    .fetch_one(&mut **txn)
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(item) = &result {
        serde_json::to_value(item).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "dict_item".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:dict:read"])),
    path = "/system/dict-items/{id}",
    tag = "Dict",
    operation_id = "get_dict_item",
    responses((status = 200, description = "OK")),
)]
pub async fn get_dict_item(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<DictItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, DictItem>(
        only_own_schema_query!("erp", r#"
        SELECT id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        FROM erp.dict_items WHERE id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:dict:write"])),
    path = "/system/dict-items/{id}",
    tag = "Dict",
    operation_id = "update_dict_item",
    responses((status = 200, description = "OK")),
)]
pub async fn update_dict_item(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, DictItem>(
        only_own_schema_query!("erp", "SELECT id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at FROM erp.dict_items WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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
        only_own_schema_query!("erp", r#"
        UPDATE erp.dict_items SET
            code = $2, name = $3, value = $4, sort_order = $5, parent_id = $6, extra_data = $7, status = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        "#),
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
    .fetch_one(&mut **txn)
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(item) = &result {
        serde_json::to_value(item).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "dict_item".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:dict:write"])),
    path = "/system/dict-items/{id}",
    tag = "Dict",
    operation_id = "delete_dict_item",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_dict_item(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.dict_items SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "dict_item".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:dict:write"])),
    path = "/system/dict-items/batch",
    tag = "Dict",
    operation_id = "batch_create_dict_items",
    responses((status = 200, description = "OK")),
)]
pub async fn batch_create_dict_items(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<BatchCreateDictItemRequest>,
) -> Json<ApiResponse<Vec<DictItem>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let mut created_items = Vec::new();
    let now = Utc::now();

    for item_req in req.items.iter() {
        let id = Uuid::new_v4();
        let sort_order = item_req.sort_order.unwrap_or(0);

        let result = sqlx::query_as::<_, DictItem>(
            only_own_schema_query!("erp", r#"
            INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
            RETURNING id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
            "#),
        )
        .bind(id)
        .bind(req.dict_type_id)
        .bind(&item_req.code)
        .bind(&item_req.name)
        .bind(&item_req.value)
        .bind(sort_order)
        .bind(item_req.parent_id)
        .bind(&item_req.extra_data)
        .bind(now)
        .bind(now)
        .fetch_one(&mut **txn)
        .await;

        match result {
            Ok(item) => created_items.push(item),
            Err(e) => {
                tracing::error!("批量创建字典项失败: {}", e);
                return Json(api_error(500, &format!("批量创建字典项失败: {}", e)));
            }
        }
    }

    let request_data = serde_json::to_value(&req).ok();
    let response_data = serde_json::to_value(&created_items).ok();

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "batch_create".to_string(),
            entity_type: "dict_item".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: "success".to_string(),
            error_message: None,
        },
        &headers,
    )
    .await;

    let count = created_items.len();
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }
    Json(ApiResponse::success(
        created_items,
        &format!("成功创建 {} 个字典项", count),
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:dict:read"])),
    path = "/system/dict-types/{id}/items/export",
    tag = "Dict",
    operation_id = "export_dict_items",
    responses((status = 200, description = "OK")),
)]
pub async fn export_dict_items(
    State(_state): State<ApiState>,
    Path(dict_type_id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Response<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, DictItem>(
        only_own_schema_query!("erp", r#"
        SELECT id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at
        FROM erp.dict_items
        WHERE dict_type_id = $1
        ORDER BY sort_order ASC, created_at ASC
        "#),
    )
    .bind(dict_type_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let export_items: Vec<DictItemExport> = items
                .into_iter()
                .map(|item| DictItemExport {
                    code: item.code,
                    name: item.name,
                    value: item.value,
                    sort_order: item.sort_order,
                    status: item.status,
                })
                .collect();

            let json_data = serde_json::to_string_pretty(&export_items).unwrap_or_default();

            Response::builder()
                .header("Content-Type", "application/json")
                .header(
                    "Content-Disposition",
                    "attachment; filename=\"dict_items.json\"",
                )
                .body(json_data)
                .unwrap_or_else(|_| {
                    Response::builder()
                        .status(500)
                        .body("导出失败".to_string())
                        .unwrap_or_default()
                })
        }
        Err(e) => {
            tracing::error!("导出字典项失败: {}", e);
            Response::builder()
                .status(500)
                .body(format!("导出字典项失败: {}", e))
                .unwrap_or_default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dict_type_query_params_all_none() {
        let json = r#"{}"#;
        let params: DictTypeQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.page, None);
        assert_eq!(params.search, None);
    }

    #[test]
    fn test_dict_type_query_params_full() {
        let json = r#"{"page":2,"page_size":50,"search":"abc","category":"sys","status":"active"}"#;
        let params: DictTypeQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(50));
        assert_eq!(params.search.as_deref(), Some("abc"));
        assert_eq!(params.category.as_deref(), Some("sys"));
        assert_eq!(params.status.as_deref(), Some("active"));
    }

    #[test]
    fn test_dict_item_query_params_all_none() {
        let json = r#"{}"#;
        let params: DictItemQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.page, None);
        assert_eq!(params.search, None);
    }

    #[test]
    fn test_dict_item_query_params_with_search() {
        let json = r#"{"page":1,"page_size":10,"search":"gender"}"#;
        let params: DictItemQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.search.as_deref(), Some("gender"));
    }

    #[test]
    fn test_dict_item_export_serialize() {
        let item = DictItemExport {
            code: "M".to_string(),
            name: "Male".to_string(),
            value: Some("1".to_string()),
            sort_order: 0,
            status: "active".to_string(),
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"code\":\"M\""));
        assert!(json.contains("\"name\":\"Male\""));
        assert!(json.contains("\"sort_order\":0"));
    }

    #[test]
    fn test_dict_item_export_none_value() {
        let item = DictItemExport {
            code: "F".to_string(),
            name: "Female".to_string(),
            value: None,
            sort_order: 1,
            status: "active".to_string(),
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"value\":null"));
    }

    #[test]
    fn test_batch_create_dict_item_request_deserialize() {
        let uuid_str = "550e8400-e29b-41d4-a716-446655440000";
        let json = format!(
            r#"{{"dict_type_id":"{}","items":[{{"dict_type_id":"{}","code":"M","name":"Male"}}]}}"#,
            uuid_str, uuid_str
        );
        let req: BatchCreateDictItemRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.items.len(), 1);
        assert_eq!(req.items[0].code, "M");
        assert_eq!(req.items[0].name, "Male");
    }

    #[test]
    fn test_batch_create_dict_item_request_empty_items() {
        let uuid_str = "550e8400-e29b-41d4-a716-446655440000";
        let json = format!(r#"{{"dict_type_id":"{}","items":[]}}"#, uuid_str);
        let req: BatchCreateDictItemRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.items.len(), 0);
    }
}

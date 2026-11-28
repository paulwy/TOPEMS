use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    AddTagToCustomerRequest, CreateTagRequest, CustomerWithTags, Tag, UpdateTagRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

#[derive(Debug, Deserialize)]
pub struct TagPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/tags", get(list_tags).post(create_tag))
        .route(
            "/tags/{id}",
            get(get_tag).put(update_tag).delete(delete_tag),
        )
        .route("/tags/{id}/customers", get(get_tagged_customers))
        .route(
            "/customers/{id}/tags",
            get(get_customer_tags).post(add_tag_to_customer),
        )
        .route(
            "/customers/{id}/tags/{tag_id}",
            delete(remove_tag_from_customer),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:tag:read"])),
    path = "/tags",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tag"
)]
pub async fn list_tags(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TagPaginationParams>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let result = sqlx::query_as::<_, Tag>(
        r#"
        SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000')::uuid AS tenant_id,
               CASE WHEN $4 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               color, description, created_at, updated_at
        FROM crm.tags
        WHERE ($1::text IS NULL OR name ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&_headers).as_sql())
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(tags) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.tags
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR name ILIKE $1)
                "#,
            )
            .bind(&search_pattern)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": tags,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取标签列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取标签列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取标签列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:tag:write"])),
    path = "/tags",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/tag"
)]
pub(crate) async fn create_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateTagRequest>,
) -> ApiResponse<Tag> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    if req.name.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "标签名称不能为空".to_string(),
        ));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let color = req.color.clone().unwrap_or_else(|| "#1890ff".to_string());
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let result = sqlx::query_as::<_, Tag>(

        r#"
        INSERT INTO crm.tags (id, tenant_id, name, color, description, created_at, updated_at, org_id, name_en)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id,
                  CASE WHEN $10 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                  color, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&color)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(tag) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success(tag.clone(), "标签创建成功"),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建标签失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("标签创建失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(tag) = &result {
        serde_json::to_value(tag).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "tag".to_string(),
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
    get,
    security(("BearerAuth" = ["crm:tag:read"])),
    path = "/tags/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tag"
)]
pub async fn get_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<Tag> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query_as::<_, Tag>(
        r#"
        SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000')::uuid AS tenant_id,
               CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               color, description, created_at, updated_at
        FROM crm.tags WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(Locale::from_headers(&_headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(tag)) => ApiResponse::success(tag, "获取标签成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("标签不存在".to_string())),
        Err(e) => {
            tracing::error!("获取标签失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取标签失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["crm:tag:write"])),
    path = "/tags/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/tag"
)]
pub(crate) async fn update_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateTagRequest>,
) -> ApiResponse<Tag> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let existing = sqlx::query_as::<_, Tag>(
        r#"
        SELECT id, tenant_id, name, color, description, created_at, updated_at FROM crm.tags WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("标签不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询标签失败", e)),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let color = req.color.unwrap_or(existing.color);
    let description = req.description.or(existing.description);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Tag>(
        r#"
        UPDATE crm.tags SET
            name = $2, color = $3, description = $4, updated_at = $5,
            name_en = COALESCE($7, name_en)
        WHERE id = $1 AND tenant_id = $6
        RETURNING id, tenant_id,
                  CASE WHEN $8 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                  color, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&color)
    .bind(&description)
    .bind(now)
    .bind(tenant_id)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(tag) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success(tag.clone(), "标签更新成功"),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新标签失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("标签更新失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(tag) = &result {
        serde_json::to_value(tag).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "tag".to_string(),
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
    security(("BearerAuth" = ["crm:tag:write"])),
    path = "/tags/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/tag"
)]
pub(crate) async fn delete_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let result =
        sqlx::query("UPDATE crm.tags SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&mut **txn)
            .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success("".to_string(), "标签删除成功"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("标签不存在".to_string())),
            "error".to_string(),
            Some("标签不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除标签失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("标签删除失败".to_string())),
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
        &state.system_pool,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "tag".to_string(),
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
    get,
    security(("BearerAuth" = ["crm:tag:read"])),
    path = "/customers/{id}/tags",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tag"
)]
pub async fn get_customer_tags(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<Vec<Tag>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query_as::<_, Tag>(
        r#"
        SELECT t.id, t.tenant_id, t.name, t.color, t.description, t.created_at, t.updated_at
        FROM crm.tags t
        JOIN crm.customer_tags ct ON t.id = ct.tag_id
        WHERE ct.customer_id = $1
        ORDER BY t.created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(tags) => ApiResponse::success(tags, "获取客户标签成功"),
        Err(e) => {
            tracing::error!("获取客户标签失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取客户标签失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:tag:write"])),
    path = "/customers/{id}/tags",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/tag"
)]
pub(crate) async fn add_tag_to_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<AddTagToCustomerRequest>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let customer_id = id;
    let tag_id = req.tag_id;
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let exists = sqlx::query_scalar::<_, bool>(

        "SELECT EXISTS(SELECT 1 FROM crm.customer_tags WHERE customer_id = $1 AND tag_id = $2 AND tenant_id = $3)",
    )
    .bind(customer_id)
    .bind(tag_id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(false);

    if exists {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "标签已添加到客户".to_string(),
        ));
    }

    let result = sqlx::query(
        "INSERT INTO crm.customer_tags (customer_id, tag_id, tenant_id, org_id) VALUES ($1, $2, $3, $4)",
    )
    .bind(customer_id)
    .bind(tag_id)
    .bind(tenant_id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(_) => (
            ApiResponse::success("".to_string(), "标签添加成功"),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("添加标签失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("添加标签失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.system_pool,
        AuditEventParams {
            action: "add_tag".to_string(),
            entity_type: "customer_tag".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some(customer_id.to_string()),
            user_name: Some(tag_id.to_string()),
            request_details: Some(
                serde_json::json!({ "customer_id": customer_id, "tag_id": tag_id }),
            ),
            response_details: None,
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
    security(("BearerAuth" = ["crm:tag:write"])),
    path = "/customers/{id}/tags/{tag_id}",
    params(
        ("id" = String, Path, description = "id"),
        ("tag_id" = String, Path, description = "tag_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tag"
)]
pub async fn remove_tag_from_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path((id, tag_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let customer_id = id;
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let result = sqlx::query(
        "DELETE FROM crm.customer_tags WHERE customer_id = $1 AND tag_id = $2 AND tenant_id = $3",
    )
    .bind(customer_id)
    .bind(tag_id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success("".to_string(), "标签移除成功"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "客户标签关系不存在".to_string(),
            )),
            "error".to_string(),
            Some("客户标签关系不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("移除标签失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("移除标签失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.system_pool,
        AuditEventParams {
            action: "remove_tag".to_string(),
            entity_type: "customer_tag".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some(customer_id.to_string()),
            user_name: Some(tag_id.to_string()),
            request_details: None,
            response_details: None,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:tag:read"])),
    path = "/tags/{id}/customers",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tag"
)]
pub async fn get_tagged_customers(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<Vec<CustomerWithTags>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let customers = sqlx::query(
        r#"
        SELECT c.id as customer_id, c.name as customer_name
        FROM crm.customers c
        JOIN crm.customer_tags ct ON c.id = ct.customer_id
        WHERE ct.tag_id = $1
        ORDER BY c.created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match customers {
        Ok(customers) => {
            let mut result = Vec::new();
            for customer in customers {
                let customer_id: Uuid = customer.get("customer_id");
                let customer_name: String = customer.get("customer_name");
                let tags = sqlx::query_as::<_, Tag>(
                    r#"
                    SELECT t.id, t.tenant_id, t.name, t.color, t.description, t.created_at, t.updated_at
                    FROM crm.tags t
                    JOIN crm.customer_tags ct ON t.id = ct.tag_id
                    WHERE ct.customer_id = $1
                    "#,
                )
                .bind(customer_id)
                .fetch_all(&mut **txn)
                .await
                .unwrap_or_default();

                result.push(CustomerWithTags {
                    customer_id,
                    customer_name,
                    tags,
                });
            }
            ApiResponse::success(result, "获取标签关联客户成功")
        }
        Err(e) => {
            tracing::error!("获取标签关联客户失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取标签关联客户失败".to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_pagination_params_deserialize() {
        let query = "page=1&page_size=20&search=vip";
        let params: TagPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.search.as_deref(), Some("vip"));
    }

    #[test]
    fn test_tag_pagination_params_default() {
        let query = "";
        let params: TagPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.search.is_none());
    }
}

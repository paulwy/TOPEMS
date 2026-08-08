use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::middleware::tenant::get_tenant_id;
use crate::models::{Contact, CreateContactRequest, UpdateContactRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct ContactPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/contacts", get(list_contacts).post(create_contact))
        .route("/contacts/batch-delete", post(batch_delete_contacts))
        .route(
            "/contacts/{id}",
            get(get_contact).put(update_contact).delete(delete_contact),
        )
}

#[utoipa::path(
    get,
    path = "/contacts",
    tag = "contact",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("customer_id" = Option<Uuid>, Query, description = "客户ID过滤"),
    ),
    responses(
        (status = 200, description = "联系人列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_contacts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ContactPaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_filter = params.customer_id;
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        FROM crm.contacts
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR first_name ILIKE $2 OR last_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR customer_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&customer_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contacts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.contacts
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR first_name ILIKE $2 OR last_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR customer_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&customer_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": contacts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取联系人列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取联系人列表失败: {}", e);
            Json(api_error(500, "获取联系人列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/contacts",
    tag = "contact",
    request_body = CreateContactRequest,
    responses(
        (status = 200, description = "联系人创建成功", body = ApiResponse<Contact>),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_contact(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.first_name.is_empty() {
        return Json(api_error(400, "联系人名字不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Contact>(
        r#"
        INSERT INTO crm.contacts (
            id, tenant_id, customer_id, first_name, last_name, email, phone, position, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        RETURNING id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.customer_id)
    .bind(&req.first_name)
    .bind(&req.last_name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(&req.position)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contact) => (
            Json(ApiResponse::success(contact.clone(), "联系人创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建联系人失败: {}", e);
            (
                Json(api_error(500, "联系人创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(contact) = &result {
        serde_json::to_value(contact).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "contact".to_string(),
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

async fn get_contact(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Contact>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        FROM crm.contacts WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(contact)) => Json(ApiResponse::success(contact, "获取联系人成功")),
        Ok(None) => Json(api_error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("获取联系人失败: {}", e);
            Json(api_error(500, "获取联系人失败"))
        }
    }
}

async fn update_contact(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at FROM crm.contacts WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "联系人不存在")),
        Err(e) => return Json(api_error(500, &format!("查询联系人失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let first_name = req.first_name.unwrap_or(existing.first_name);
    let last_name = req.last_name.or(existing.last_name);
    let email = req.email.or(existing.email);
    let phone = req.phone.or(existing.phone);
    let position = req.position.or(existing.position);
    let customer_id = req.customer_id.or(existing.customer_id);
    let status = req.status.unwrap_or(existing.status);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Contact>(
        r#"
        UPDATE crm.contacts SET
            first_name = $2, last_name = $3, email = $4, phone = $5, position = $6,
            customer_id = $7, status = $8, notes = $9, updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&first_name)
    .bind(&last_name)
    .bind(&email)
    .bind(&phone)
    .bind(&position)
    .bind(&customer_id)
    .bind(&status)
    .bind(&notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contact) => (
            Json(ApiResponse::success(contact.clone(), "联系人更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新联系人失败: {}", e);
            (
                Json(api_error(500, "联系人更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(contact) = &result {
        serde_json::to_value(contact).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "contact".to_string(),
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

async fn delete_contact(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("UPDATE crm.contacts SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "联系人删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "联系人不存在")),
            "error".to_string(),
            Some("联系人不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除联系人失败: {}", e);
            (
                Json(api_error(500, "联系人删除失败")),
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
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "contact".to_string(),
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

async fn batch_delete_contacts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的联系人"));
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE crm.contacts SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2",
    )
    .bind(&req.ids)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                "".to_string(),
                &format!("成功删除 {} 个联系人", r.rows_affected()),
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除联系人失败: {}", e);
            (
                Json(api_error(500, "批量删除联系人失败")),
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
        AuditEventParams {
            action: "batch_delete".to_string(),
            entity_type: "contact".to_string(),
            entity_id: None,
            entity_ids: serde_json::to_value(&req.ids).ok(),
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

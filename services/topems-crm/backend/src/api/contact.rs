use anyhow::Result;
use axum::{
    extract::{Path, Query, State, Extension},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use topems_shared::{ApiResponse, api_error};
use topems_shared::auth::Claims;
use crate::models::{Contact, CreateContactRequest, UpdateContactRequest};
use crate::api::audit::log_audit_event;
use crate::services::permission::{check_permission, ModulePermission};
use super::ApiState;

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
        .route("/api/v1/contacts", get(list_contacts).post(create_contact))
        .route("/api/v1/contacts/batch-delete", post(batch_delete_contacts))
        .route(
            "/api/v1/contacts/{id}",
            get(get_contact).put(update_contact).delete(delete_contact),
        )
}

async fn list_contacts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ContactPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_filter = params.customer_id;

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        FROM contacts
        WHERE ($1::text IS NULL OR first_name ILIKE $1 OR last_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR customer_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
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
                SELECT COUNT(*) FROM contacts
                WHERE ($1::text IS NULL OR first_name ILIKE $1 OR last_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR customer_id = $3)
                "#,
            )
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

async fn create_contact(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    if req.first_name.is_empty() {
        return Json(api_error(400, "联系人名字不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Contact>(
        r#"
        INSERT INTO contacts (
            id, customer_id, first_name, last_name, email, phone, position, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
        RETURNING id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
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
        "create".to_string(),
        "contact".to_string(),
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

async fn get_contact(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Contact>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        FROM contacts WHERE id = $1
        "#,
    )
    .bind(id)
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
        Ok(_) => {},
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at FROM contacts WHERE id = $1
        "#,
    )
    .bind(id)
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
        UPDATE contacts SET
            first_name = $2, last_name = $3, email = $4, phone = $5, position = $6,
            customer_id = $7, status = $8, notes = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
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
        "update".to_string(),
        "contact".to_string(),
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

async fn delete_contact(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM contacts WHERE id = $1")
        .bind(id)
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
        "delete".to_string(),
        "contact".to_string(),
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

async fn batch_delete_contacts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的联系人"));
    }

    let result = sqlx::query("DELETE FROM contacts WHERE id = ANY($1)")
        .bind(&req.ids)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success("".to_string(), &format!("成功删除 {} 个联系人", r.rows_affected()))),
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
        "batch_delete".to_string(),
        "contact".to_string(),
        None,
        serde_json::to_value(&req.ids).ok(),
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

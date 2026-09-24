use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use crate::models::{Contact, CreateContactRequest, UpdateContactRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;

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
        .route(
            "/contacts/{id}/approval/start",
            post(start_contact_approval),
        )
        .route("/contacts/{id}/approval/approve", post(approve_contact))
        .route("/contacts/{id}/approval/reject", post(reject_contact))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:contact:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ContactPaginationParams>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at
        FROM crm.contacts
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR first_name ILIKE $2 OR last_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR customer_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_opt)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(customer_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(contacts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.contacts
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR first_name ILIKE $2 OR last_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR customer_id = $4)
                "#,
            )
            .bind(tenant_opt)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(customer_filter)
            .fetch_one(&mut **txn)
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
    security(("BearerAuth" = ["crm:contact:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.first_name.is_empty() {
        return Json(api_error(400, "联系人名字不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("valid org uuid");

    let result = sqlx::query_as::<_, Contact>(

        r#"
        INSERT INTO crm.contacts (
            id, tenant_id, customer_id, first_name, last_name, email, phone, position, notes, status, approval_status, created_at, updated_at, org_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', 'none', $10, $11, $12)
        RETURNING id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(&req.first_name)
    .bind(&req.last_name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(&req.position)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .bind(org_id)
    .fetch_one(&mut **txn)
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Contact>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at
        FROM crm.contacts WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let existing = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at FROM crm.contacts WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
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
        RETURNING id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(&first_name)
    .bind(&last_name)
    .bind(&email)
    .bind(&phone)
    .bind(&position)
    .bind(customer_id)
    .bind(&status)
    .bind(&notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result =
        sqlx::query("UPDATE crm.contacts SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&mut **txn)
            .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的联系人"));
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        "UPDATE crm.contacts SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2",
    )
    .bind(&req.ids)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

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

#[derive(Debug, Deserialize, ToSchema)]
pub struct StartContactApprovalRequest {
    pub workflow_id: Uuid,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ContactApprovalActionRequest {
    pub comment: Option<String>,
    pub reason: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:approval:admin"])),
    path = "/contacts/{id}/approval/start",
    params(("id" = Uuid, Path, description = "Contact id to start approval")),
    request_body = StartContactApprovalRequest,
    responses(
        (status = 200, description = "Contact approval started (pending)"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:contact:write"])),
    tag = "contact"
)]
async fn start_contact_approval(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<StartContactApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let contact = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at
        FROM crm.contacts WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let contact = match contact {
        Ok(c) => c,
        Err(_) => return Json(api_error(404, "联系人不存在")),
    };
    let old_approval_status = contact.approval_status.clone();
    let new_approval_status = "pending".to_string();

    let workflow_client = state.workflow_client.clone();
    let id_str = id.to_string();
    let req_workflow_id = req.workflow_id;
    tokio::spawn(async move {
        let request = topems_shared_service_client::service_client::CreateInstanceRequest {
            workflow_id: req_workflow_id,
            title: format!("联系人审批 - {}", id_str),
            variables: Some(serde_json::json!({
                "contact_id": id_str,
            })),
        };
        match workflow_client.create_instance(request).await {
            Ok(instance) => {
                tracing::info!("[crm] 联系人审批流程启动成功 - instance_id={}", instance.id);
            }
            Err(e) => {
                tracing::warn!("[crm] 联系人审批流程启动失败: {}", e);
            }
        }
    });

    let _ = sqlx::query(
        "UPDATE crm.contacts SET approval_status = 'pending', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    let request_data = serde_json::json!({
        "workflow_id": req.workflow_id.to_string(),
        "comment": req.comment,
    });
    let response_data = serde_json::json!({
        "old_approval_status": old_approval_status,
        "new_approval_status": new_approval_status,
        "contact_id": id.to_string(),
        "workflow_id": req.workflow_id.to_string(),
        "comment": req.comment,
    });
    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.contact.approval.start".to_string(),
                entity_type: "contact".to_string(),
                entity_id: Some(id),
                entity_ids: None,
                user_id: None,
                user_name: None,
                request_details: Some(request_data),
                response_details: Some(response_data),
                status: "success".to_string(),
                error_message: None,
            },
            &headers,
        )
        .await;
    });

    Json(ApiResponse::success(
        serde_json::json!({
            "contact_id": id,
            "workflow_id": req.workflow_id,
            "approval_status": "pending"
        }),
        "联系人审批流程已启动",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:contact:read"])),
    path = "/contacts/{id}/approval/approve",
    params(("id" = Uuid, Path, description = "Contact id to approve")),
    request_body = ContactApprovalActionRequest,
    responses(
        (status = 200, description = "Contact approved (approval_status = approved)"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:contact:write"])),
    tag = "contact"
)]
async fn approve_contact(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ContactApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let contact = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at
        FROM crm.contacts WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let contact = match contact {
        Ok(c) => c,
        Err(_) => return Json(api_error(404, "联系人不存在")),
    };
    let old_approval_status = contact.approval_status.clone();
    let new_approval_status = "approved".to_string();

    let _ = sqlx::query(
        "UPDATE crm.contacts SET approval_status = 'approved', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    let request_data = serde_json::json!({
        "comment": req.comment,
    });
    let response_data = serde_json::json!({
        "old_approval_status": old_approval_status,
        "new_approval_status": new_approval_status,
        "contact_id": id.to_string(),
        "comment": req.comment,
    });
    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.contact.approval.approve".to_string(),
                entity_type: "contact".to_string(),
                entity_id: Some(id),
                entity_ids: None,
                user_id: None,
                user_name: None,
                request_details: Some(request_data),
                response_details: Some(response_data),
                status: "success".to_string(),
                error_message: None,
            },
            &headers,
        )
        .await;
    });

    Json(ApiResponse::success(
        serde_json::json!({
            "contact_id": id,
            "approval_status": "approved"
        }),
        "联系人审批通过",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:contact:read"])),
    path = "/contacts/{id}/approval/reject",
    params(("id" = Uuid, Path, description = "Contact id to reject")),
    request_body = ContactApprovalActionRequest,
    responses(
        (status = 200, description = "Contact rejected (approval_status = rejected, with reason)"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:contact:write"])),
    tag = "contact"
)]
async fn reject_contact(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ContactApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContactWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let contact = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at, deleted_at
        FROM crm.contacts WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let contact = match contact {
        Ok(c) => c,
        Err(_) => return Json(api_error(404, "联系人不存在")),
    };
    let old_approval_status = contact.approval_status.clone();
    let new_approval_status = "rejected".to_string();

    let _ = sqlx::query(
        "UPDATE crm.contacts SET approval_status = 'rejected', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    let reason = req.reason.clone().unwrap_or_default();
    let request_data = serde_json::json!({
        "comment": req.comment,
        "reason": reason,
    });
    let response_data = serde_json::json!({
        "old_approval_status": old_approval_status,
        "new_approval_status": new_approval_status,
        "contact_id": id.to_string(),
        "comment": req.comment,
        "reason": reason,
    });
    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.contact.approval.reject".to_string(),
                entity_type: "contact".to_string(),
                entity_id: Some(id),
                entity_ids: None,
                user_id: None,
                user_name: None,
                request_details: Some(request_data),
                response_details: Some(response_data),
                status: "success".to_string(),
                error_message: None,
            },
            &headers,
        )
        .await;
    });

    Json(ApiResponse::success(
        serde_json::json!({
            "contact_id": id,
            "approval_status": "rejected"
        }),
        "联系人审批已驳回",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    use uuid::Uuid;

    #[test]
    fn contact_pagination_params_empty() {
        let json = r#"{}"#;
        let q: ContactPaginationParams = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.search.is_none());
        assert!(q.status.is_none());
        assert!(q.customer_id.is_none());
    }

    #[test]
    fn contact_pagination_params_all() {
        let cid = Uuid::new_v4();
        let json = format!(
            r#"{{"page":2,"page_size":30,"search":"Smith","status":"inactive","customer_id":"{}"}}"#,
            cid
        );
        let q: ContactPaginationParams = serde_json::from_str(&json).unwrap();
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(30));
        assert_eq!(q.search.as_deref(), Some("Smith"));
        assert_eq!(q.status.as_deref(), Some("inactive"));
        assert_eq!(q.customer_id, Some(cid));
    }

    #[test]
    fn contact_pagination_params_partial() {
        let json = r#"{"page":1,"search":"a"}"#;
        let q: ContactPaginationParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.search.as_deref(), Some("a"));
        assert!(q.status.is_none());
    }

    #[test]
    fn contact_pagination_params_invalid_uuid_fails() {
        let json = r#"{"customer_id":"bad-uuid"}"#;
        let res: Result<ContactPaginationParams, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn batch_delete_request_valid() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let json = format!(r#"{{"ids":["{}","{}"]}}"#, id1, id2);
        let r: BatchDeleteRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(r.ids.len(), 2);
        assert_eq!(r.ids[0], id1);
        assert_eq!(r.ids[1], id2);
    }

    #[test]
    fn batch_delete_request_empty() {
        let json = r#"{"ids":[]}"#;
        let r: BatchDeleteRequest = serde_json::from_str(json).unwrap();
        assert!(r.ids.is_empty());
    }

    #[test]
    fn batch_delete_request_invalid_uuid_fails() {
        let json = r#"{"ids":["not-a-uuid"]}"#;
        let res: Result<BatchDeleteRequest, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn start_contact_approval_request_deserialize() {
        let wid = Uuid::new_v4();
        let json = format!(r#"{{"workflow_id":"{}","comment":"开始审批"}}"#, wid);
        let r: StartContactApprovalRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(r.workflow_id, wid);
        assert_eq!(r.comment.as_deref(), Some("开始审批"));
    }

    #[test]
    fn start_contact_approval_request_no_comment() {
        let wid = Uuid::new_v4();
        let json = format!(r#"{{"workflow_id":"{}"}}"#, wid);
        let r: StartContactApprovalRequest = serde_json::from_str(&json).unwrap();
        assert!(r.comment.is_none());
    }

    #[test]
    fn contact_approval_action_request_both() {
        let json = r#"{"comment":"同意","reason":"资料齐全"}"#;
        let r: ContactApprovalActionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(r.comment.as_deref(), Some("同意"));
        assert_eq!(r.reason.as_deref(), Some("资料齐全"));
    }

    #[test]
    fn contact_approval_action_request_neither() {
        let json = r#"{}"#;
        let r: ContactApprovalActionRequest = serde_json::from_str(json).unwrap();
        assert!(r.comment.is_none());
        assert!(r.reason.is_none());
    }

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}

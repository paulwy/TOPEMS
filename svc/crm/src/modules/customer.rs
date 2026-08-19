use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use super::ApiState;
use crate::models::customer::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::response::{api_error, ApiResponse, ListResponse};
use topems_shared_auth::middleware::tenant::get_tenant_id;

#[derive(Debug, Deserialize, IntoParams)]
pub struct CustomerPaginationParams {
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_page_size")]
    pub page_size: i64,
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub rating: Option<String>,
}

fn default_page() -> i64 {
    1
}
fn default_page_size() -> i64 {
    25
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/customers", get(list_customers).post(create_customer))
        .route("/customers/batch-delete", post(batch_delete_customers))
        .route(
            "/customers/{id}",
            get(get_customer)
                .put(update_customer)
                .delete(delete_customer),
        )
        .route(
            "/customers/{id}/approval/start",
            post(start_customer_approval),
        )
        .route("/customers/{id}/approval/approve", post(approve_customer))
        .route("/customers/{id}/approval/reject", post(reject_customer))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:customer:read"])),
    path = "/api/crm/customers",
    params(CustomerPaginationParams),
    responses(
        (status = 200, description = "Customer paginated list (tenant isolated)", body = ListResponse<Customer>),
        (status = 403, description = "CRM::TENANT_MISMATCH / CRM::NOT_OWNER"),
    ),
    security(("bearer_auth" = ["crm:customer:read"])),
    tag = "customer"
)]
pub async fn list_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CustomerPaginationParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ListResponse<Customer>>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.max(1).min(1_000);
    let page_size = params.page_size.max(1).min(200);
    let offset = (page - 1) * page_size;
    let search = params
        .search
        .as_ref()
        .map(|s| s.trim()[..s.len().min(100)].to_string());
    let tenant_id = get_tenant_id(&claims, &headers);

    let mut count_qb = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM crm.customers WHERE tenant_id = $1 AND deleted_at IS NULL",
    );
    let mut list_qb = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at FROM crm.customers WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    );
    count_qb = count_qb.bind(tenant_id);
    list_qb = list_qb.bind(tenant_id).bind(page_size).bind(offset);

    if let Some(s) = search.clone() {
        let like = format!("%{}%", s.replace('%', "\\%").replace('_', "\\_"));
        count_qb = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM crm.customers WHERE tenant_id = $1 AND name ILIKE $2 AND deleted_at IS NULL")
            .bind(tenant_id).bind(like.clone());
        list_qb = sqlx::query_as::<_, Customer>(
            "SELECT id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at FROM crm.customers WHERE tenant_id = $1 AND name ILIKE $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        ).bind(tenant_id).bind(like).bind(page_size).bind(offset);
    }

    let total: i64 = count_qb.fetch_one(&state.db).await.unwrap_or(0);
    let items: Vec<Customer> = list_qb.fetch_all(&state.db).await.unwrap_or_default();

    let body = ListResponse::with_pagination(items, total, page, page_size);

    Json(ApiResponse::success(body, "获取客户列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers",
    request_body = CreateCustomerRequest,
    responses(
        (status = 200, body = Customer, description = "Customer created"),
        (status = 400, description = "CRM::VALIDATION_ERROR (name empty)"),
    ),
    security(("bearer_auth" = ["crm:customer:write"])),
    tag = "customer"
)]
async fn create_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.name.is_empty() {
        return Json(api_error(400, "客户名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO crm.customers (tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at
        "#
    )
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.customer_type)
    .bind(req.industry.as_deref())
    .bind(req.rating.as_deref())
    .bind(req.region.as_deref())
    .bind(req.owner_id)
    .bind(req.tags.as_deref())
    .bind("none")
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(customer) => {
            let request_data = serde_json::to_value(&req).ok();
            let response_data = serde_json::to_value(&customer).ok();
            tokio::spawn(async move {
                let _ = log_audit_event(
                    &state.db,
                    AuditEventParams {
                        action: "crm.customer.create".to_string(),
                        entity_type: "customer".to_string(),
                        entity_id: Some(id),
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
            });
            Json(ApiResponse::success(customer, "客户创建成功"))
        }
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            Json(api_error(500, "客户创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:customer:read"])),
    path = "/api/crm/customers/{id}",
    params(("id" = Uuid, Path, description = "Customer id")),
    responses(
        (status = 200, body = Customer),
        (status = 404, description = "CRM::NOT_FOUND (customer {id} not found)"),
    ),
    security(("bearer_auth" = ["crm:customer:read"])),
    tag = "customer"
)]
async fn get_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    match sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "获取客户成功")),
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("获取客户失败: {}", e);
            Json(api_error(500, "获取客户失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers/{id}",
    params(("id" = Uuid, Path, description = "Customer id to update")),
    request_body = UpdateCustomerRequest,
    responses(
        (status = 200, body = Customer),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:customer:write"])),
    tag = "customer"
)]
async fn update_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();
    let name = req.name.unwrap_or(existing.name);
    let customer_type = req.customer_type.unwrap_or(existing.customer_type);
    let industry = req.industry.or(existing.industry);
    let rating = req.rating.unwrap_or(existing.rating);
    let region = req.region.or(existing.region);
    let owner_id = req.owner_id.unwrap_or(existing.owner_id);
    let tags = req.tags.unwrap_or(existing.tags);
    let now = Utc::now();

    match sqlx::query_as::<_, Customer>(
        r#"
        UPDATE crm.customers SET
            name = $2, customer_type = $3, industry = $4, rating = $5, region = $6, owner_id = $7, tags = $8, updated_at = $9
        WHERE id = $1 AND tenant_id = $10
        RETURNING id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at
        "#
    )
    .bind(id)
    .bind(&name)
    .bind(&customer_type)
    .bind(industry.as_deref())
    .bind(&rating)
    .bind(region.as_deref())
    .bind(owner_id)
    .bind(&tags[..])
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    {
        Ok(customer) => {
            let response_data = serde_json::to_value(&customer).ok();
            tokio::spawn(async move {
                let _ = log_audit_event(
                    &state.db,
                    AuditEventParams {
                        action: "crm.customer.update".to_string(),
                        entity_type: "customer".to_string(),
                        entity_id: Some(id),
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
            });
            Json(ApiResponse::success(customer, "客户更新成功"))
        }
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            Json(api_error(500, "客户更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers/{id}",
    params(("id" = Uuid, Path, description = "Customer id to soft-delete")),
    responses(
        (status = 200, description = "Customer soft-deleted"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:customer:write"])),
    tag = "customer"
)]
async fn delete_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<()>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    match sqlx::query(
        "UPDATE crm.customers SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.db)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => {
            let response_data = serde_json::json!({ "rows_affected": r.rows_affected() });
            tokio::spawn(async move {
                let _ = log_audit_event(
                    &state.db,
                    AuditEventParams {
                        action: "crm.customer.delete".to_string(),
                        entity_type: "customer".to_string(),
                        entity_id: Some(id),
                        entity_ids: None,
                        user_id: None,
                        user_name: None,
                        request_details: None,
                        response_details: Some(response_data),
                        status: "success".to_string(),
                        error_message: None,
                    },
                    &headers,
                )
                .await;
            });
            Json(ApiResponse::success_no_data("客户删除成功"))
        }
        Ok(_) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            Json(api_error(500, "客户删除失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers/batch-delete",
    request_body = BatchDeleteRequest,
    responses(
        (status = 200, description = "N customers soft-deleted"),
        (status = 400, description = "CRM::VALIDATION_ERROR (empty ids)"),
    ),
    security(("bearer_auth" = ["crm:customer:write"])),
    tag = "customer"
)]
#[axum::debug_handler]
async fn batch_delete_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的客户"));
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    match sqlx::query(
        "UPDATE crm.customers SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2",
    )
    .bind(&req.ids)
    .bind(tenant_id)
    .execute(&state.db)
    .await
    {
        Ok(r) => {
            let entity_ids = serde_json::to_value(&req.ids).ok();
            let response_data = serde_json::json!({ "rows_affected": r.rows_affected() });
            tokio::spawn(async move {
                let _ = log_audit_event(
                    &state.db,
                    AuditEventParams {
                        action: "crm.customer.batch_delete".to_string(),
                        entity_type: "customer".to_string(),
                        entity_id: None,
                        entity_ids,
                        user_id: None,
                        user_name: None,
                        request_details: None,
                        response_details: Some(response_data),
                        status: "success".to_string(),
                        error_message: None,
                    },
                    &headers,
                )
                .await;
            });
            Json(ApiResponse::success(
                format!("成功删除 {} 个客户", r.rows_affected()),
                "批量删除成功",
            ))
        }
        Err(e) => {
            tracing::error!("批量删除客户失败: {}", e);
            Json(api_error(500, "批量删除客户失败"))
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct StartApprovalRequest {
    pub workflow_id: Uuid,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ApprovalActionRequest {
    pub comment: Option<String>,
    pub reason: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers/{id}/approval/start",
    params(("id" = Uuid, Path, description = "Customer id to start approval workflow")),
    request_body = StartApprovalRequest,
    responses(
        (status = 200, description = "Customer approval started (pending)"),
        (status = 404, description = "CRM::NOT_FOUND"),
        (status = 409, description = "CRM::APPROVAL_DUPLICATE"),
    ),
    security(("bearer_auth" = ["crm:customer:write"])),
    tag = "customer"
)]
async fn start_customer_approval(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<StartApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let customer = match customer {
        Ok(c) => c,
        Err(_) => return Json(api_error(404, "客户不存在")),
    };
    let old_approval_status = customer.approval_status.clone();
    let new_approval_status = "pending".to_string();

    let workflow_client = state.workflow_client.clone();
    let id_str = id.to_string();
    let req_workflow_id = req.workflow_id;
    tokio::spawn(async move {
        let request = topems_shared_service_client::service_client::CreateInstanceRequest {
            workflow_id: req_workflow_id,
            title: format!("客户审批 - {}", id_str),
            variables: Some(serde_json::json!({
                "customer_id": id_str,
            })),
        };
        match workflow_client.create_instance(request).await {
            Ok(instance) => {
                tracing::info!("[crm] 客户审批流程启动成功 - instance_id={}", instance.id);
            }
            Err(e) => {
                tracing::warn!("[crm] 客户审批流程启动失败: {}", e);
            }
        }
    });

    let _ = sqlx::query(
        "UPDATE crm.customers SET approval_status = 'pending', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    let request_data = serde_json::json!({
        "workflow_id": req.workflow_id.to_string(),
        "comment": req.comment,
    });
    let response_data = serde_json::json!({
        "old_approval_status": old_approval_status,
        "new_approval_status": new_approval_status,
        "customer_id": id.to_string(),
        "workflow_id": req.workflow_id.to_string(),
        "comment": req.comment,
    });
    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.customer.approval.start".to_string(),
                entity_type: "customer".to_string(),
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
            "customer_id": id,
            "workflow_id": req.workflow_id,
            "approval_status": "pending"
        }),
        "客户审批流程已启动",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers/{id}/approval/approve",
    params(("id" = Uuid, Path, description = "Customer id to approve")),
    request_body = ApprovalActionRequest,
    responses(
        (status = 200, description = "Customer approved (approval_status = approved)"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:customer:write"])),
    tag = "customer"
)]
async fn approve_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let customer = match customer {
        Ok(c) => c,
        Err(_) => return Json(api_error(404, "客户不存在")),
    };
    let old_approval_status = customer.approval_status.clone();
    let new_approval_status = "approved".to_string();

    let _ = sqlx::query(
        "UPDATE crm.customers SET approval_status = 'approved', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    let request_data = serde_json::json!({
        "comment": req.comment,
    });
    let response_data = serde_json::json!({
        "old_approval_status": old_approval_status,
        "new_approval_status": new_approval_status,
        "customer_id": id.to_string(),
        "comment": req.comment,
    });
    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.customer.approval.approve".to_string(),
                entity_type: "customer".to_string(),
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
            "customer_id": id,
            "approval_status": "approved"
        }),
        "客户审批通过",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers/{id}/approval/reject",
    params(("id" = Uuid, Path, description = "Customer id to reject (reason required)")),
    request_body = ApprovalActionRequest,
    responses(
        (status = 200, description = "Customer rejected (approval_status = rejected, with reason)"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:customer:write"])),
    tag = "customer"
)]
async fn reject_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let customer = match customer {
        Ok(c) => c,
        Err(_) => return Json(api_error(404, "客户不存在")),
    };
    let old_approval_status = customer.approval_status.clone();
    let new_approval_status = "rejected".to_string();

    let _ = sqlx::query(
        "UPDATE crm.customers SET approval_status = 'rejected', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    let reason = req.reason.clone().unwrap_or_default();
    let request_data = serde_json::json!({
        "comment": req.comment,
        "reason": reason,
    });
    let response_data = serde_json::json!({
        "old_approval_status": old_approval_status,
        "new_approval_status": new_approval_status,
        "customer_id": id.to_string(),
        "comment": req.comment,
        "reason": reason,
    });
    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.customer.approval.reject".to_string(),
                entity_type: "customer".to_string(),
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
            "customer_id": id,
            "approval_status": "rejected"
        }),
        "客户审批已驳回",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    use uuid::Uuid;

    #[test]
    fn customer_pagination_params_defaults() {
        let json = r#"{}"#;
        let q: CustomerPaginationParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, 1);
        assert_eq!(q.page_size, 25);
        assert!(q.search.is_none());
        assert!(q.industry.is_none());
        assert!(q.rating.is_none());
    }

    #[test]
    fn customer_pagination_params_all() {
        let json = r#"{"page":5,"page_size":50,"search":"ACME","industry":"制造业","rating":"A"}"#;
        let q: CustomerPaginationParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, 5);
        assert_eq!(q.page_size, 50);
        assert_eq!(q.search.as_deref(), Some("ACME"));
        assert_eq!(q.industry.as_deref(), Some("制造业"));
        assert_eq!(q.rating.as_deref(), Some("A"));
    }

    #[test]
    fn customer_pagination_params_partial() {
        let json = r#"{"search":"Tech","rating":"B"}"#;
        let q: CustomerPaginationParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, 1);
        assert_eq!(q.page_size, 25);
        assert_eq!(q.search.as_deref(), Some("Tech"));
        assert_eq!(q.rating.as_deref(), Some("B"));
        assert!(q.industry.is_none());
    }

    #[test]
    fn default_page_returns_one() {
        assert_eq!(default_page(), 1);
    }

    #[test]
    fn default_page_size_returns_25() {
        assert_eq!(default_page_size(), 25);
    }

    #[test]
    fn batch_delete_request_valid_ids() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let id3 = Uuid::new_v4();
        let json = format!(r#"{{"ids":["{}","{}","{}"]}}"#, id1, id2, id3);
        let r: BatchDeleteRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(r.ids.len(), 3);
    }

    #[test]
    fn batch_delete_request_empty_ids() {
        let json = r#"{"ids":[]}"#;
        let r: BatchDeleteRequest = serde_json::from_str(json).unwrap();
        assert!(r.ids.is_empty());
    }

    #[test]
    fn batch_delete_request_invalid_uuid_fails() {
        let json = r#"{"ids":["xyz"]}"#;
        let res: Result<BatchDeleteRequest, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn start_approval_request_with_comment() {
        let wid = Uuid::new_v4();
        let json = format!(r#"{{"workflow_id":"{}","comment":"请审批"}}"#, wid);
        let r: StartApprovalRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(r.workflow_id, wid);
        assert_eq!(r.comment.as_deref(), Some("请审批"));
    }

    #[test]
    fn start_approval_request_no_comment() {
        let wid = Uuid::new_v4();
        let json = format!(r#"{{"workflow_id":"{}"}}"#, wid);
        let r: StartApprovalRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(r.workflow_id, wid);
        assert!(r.comment.is_none());
    }

    #[test]
    fn start_approval_request_invalid_workflow_id_fails() {
        let json = r#"{"workflow_id":"bad"}"#;
        let res: Result<StartApprovalRequest, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn approval_action_request_full() {
        let json = r#"{"comment":"已审核","reason":"符合条件"}"#;
        let r: ApprovalActionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(r.comment.as_deref(), Some("已审核"));
        assert_eq!(r.reason.as_deref(), Some("符合条件"));
    }

    #[test]
    fn approval_action_request_empty() {
        let json = r#"{}"#;
        let r: ApprovalActionRequest = serde_json::from_str(json).unwrap();
        assert!(r.comment.is_none());
        assert!(r.reason.is_none());
    }

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}

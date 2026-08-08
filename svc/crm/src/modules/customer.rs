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
use crate::models::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::services::mdm_event_service::MdmEventService;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::event::MasterDataAction;
use topems_shared::service_client::CreateInstanceRequest;
use topems_shared::{api_error, ApiResponse, ListResponse};

#[derive(Debug, Deserialize)]
pub struct CustomerPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_type: Option<String>,
    pub rating: Option<String>,
    pub industry: Option<String>,
}

#[derive(Debug, Deserialize)]
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

fn customer_cache_key(id: &Uuid) -> String {
    format!("customer:{}", id)
}

#[utoipa::path(
    get,
    path = "/customers",
    tag = "customer",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("customer_type" = Option<String>, Query, description = "客户类型过滤"),
        ("rating" = Option<String>, Query, description = "评级过滤"),
        ("industry" = Option<String>, Query, description = "行业过滤"),
    ),
    responses(
        (status = 200, description = "客户列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CustomerPaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<ListResponse<Customer>>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, tenant_id, name, code, industry, company_size, website, email, phone, fax,
               address, city, province, country, postal_code, status, customer_type,
               source, rating, revenue, employee_count, notes, created_at, updated_at
        FROM crm.customers
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR customer_type = $4)
          AND ($5::text IS NULL OR rating = $5)
          AND ($6::text IS NULL OR industry ILIKE $6)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&params.status)
    .bind(&params.customer_type)
    .bind(&params.rating)
    .bind(&params.industry)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(mut customers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.customers
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR customer_type = $4)
                  AND ($5::text IS NULL OR rating = $5)
                  AND ($6::text IS NULL OR industry ILIKE $6)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&params.status)
            .bind(&params.customer_type)
            .bind(&params.rating)
            .bind(&params.industry)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            for customer in customers.iter_mut() {
                let _ = customer.decrypt_fields(&state.encryption);
                customer.mask_sensitive_fields();
            }

            Json(ApiResponse::success(
                ListResponse::with_pagination(customers, total, page, page_size),
                "获取客户列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取客户列表失败: {}", e);
            Json(api_error(500, "获取客户列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/customers",
    tag = "customer",
    request_body = CreateCustomerRequest,
    responses(
        (status = 200, description = "客户创建成功", body = ApiResponse<Customer>),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
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

    let mut encrypted_email = req.email.clone();
    let mut encrypted_phone = req.phone.clone();

    if let Some(email) = &req.email {
        if let Ok(enc) = state.encryption.encrypt_to_string(email) {
            encrypted_email = Some(enc);
        }
    }
    if let Some(phone) = &req.phone {
        if let Ok(enc) = state.encryption.encrypt_to_string(phone) {
            encrypted_phone = Some(enc);
        }
    }

    let result = sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO crm.customers (
            id, tenant_id, name, code, industry, company_size, website, email, phone, fax,
            address, city, province, country, postal_code, customer_type, source,
            rating, revenue, employee_count, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                  $16, $17, $18, $19, $20, $21, 'active', $22, $23)
        RETURNING id, tenant_id, name, code, industry, company_size, website, email, phone, fax,
                  address, city, province, country, postal_code, status, customer_type,
                  source, rating, revenue, employee_count, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.industry)
    .bind(&req.company_size)
    .bind(&req.website)
    .bind(&encrypted_email)
    .bind(&encrypted_phone)
    .bind(&req.fax)
    .bind(&req.address)
    .bind(&req.city)
    .bind(&req.province)
    .bind(&req.country)
    .bind(&req.postal_code)
    .bind(&req.customer_type)
    .bind(&req.source)
    .bind(&req.rating)
    .bind(&req.revenue)
    .bind(&req.employee_count)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(customer) => {
            let mut customer = customer.clone();
            let _ = customer.decrypt_fields(&state.encryption);
            (
                Json(ApiResponse::success(customer, "客户创建成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            (
                Json(api_error(500, "客户创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(customer) = &result {
        serde_json::to_value(customer).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "customer".to_string(),
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

    // 发布 MDM 主数据事件
    if let Ok(customer) = &result {
        let mdm_service = MdmEventService::new();
        let cid = customer.id;
        let ccode = customer.code.clone().unwrap_or_default();
        let cname = customer.name.clone();
        let cemail = customer.email.clone();
        let cphone = customer.phone.clone();
        let cstatus = customer.status.clone();
        let tenant = tenant_id;
        tokio::spawn(async move {
            mdm_service
                .publish_customer_event(
                    tenant,
                    cid,
                    &ccode,
                    &cname,
                    cemail.as_deref(),
                    cphone.as_deref(),
                    &cstatus,
                    MasterDataAction::Created,
                    None,
                )
                .await;
        });
    }

    response
}

#[utoipa::path(
    get,
    path = "/customers/{id}",
    tag = "customer",
    params(
        ("id" = Uuid, Path, description = "客户ID"),
    ),
    responses(
        (status = 200, description = "客户详情", body = ApiResponse<Customer>),
        (status = 404, description = "客户不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let cache_key = customer_cache_key(&id);

    if let Some(cached) = state.customer_cache.get(&cache_key) {
        return Json(ApiResponse::success(cached, "从内存缓存获取客户成功"));
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, tenant_id, name, code, industry, company_size, website, email, phone, fax,
               address, city, province, country, postal_code, status, customer_type,
               source, rating, revenue, employee_count, notes, created_at, updated_at
        FROM crm.customers WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(mut customer)) => {
            let _ = customer.decrypt_fields(&state.encryption);
            state.customer_cache.set(cache_key, customer.clone());
            Json(ApiResponse::success(customer, "获取客户成功"))
        }
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("获取客户失败: {}", e);
            Json(api_error(500, "获取客户失败"))
        }
    }
}

async fn update_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, tenant_id, name, code, industry, company_size, website, email, phone, fax,
               address, city, province, country, postal_code, status, customer_type,
               source, rating, revenue, employee_count, notes, created_at, updated_at
        FROM crm.customers WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let mut existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let _ = existing.decrypt_fields(&state.encryption);

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let industry = req.industry.or(existing.industry);
    let company_size = req.company_size.or(existing.company_size);
    let website = req.website.or(existing.website);
    let email = req.email.or(existing.email);
    let phone = req.phone.or(existing.phone);
    let fax = req.fax.or(existing.fax);
    let address = req.address.or(existing.address);
    let city = req.city.or(existing.city);
    let province = req.province.or(existing.province);
    let country = req.country.or(existing.country);
    let postal_code = req.postal_code.or(existing.postal_code);
    let status = req.status.unwrap_or(existing.status);
    let customer_type = req.customer_type.or(existing.customer_type);
    let source = req.source.or(existing.source);
    let rating = req.rating.or(existing.rating);
    let revenue = req.revenue.or(existing.revenue);
    let employee_count = req.employee_count.or(existing.employee_count);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let mut encrypted_email = email.clone();
    let mut encrypted_phone = phone.clone();

    if let Some(email_val) = &email {
        if let Ok(enc) = state.encryption.encrypt_to_string(email_val) {
            encrypted_email = Some(enc);
        }
    }
    if let Some(phone_val) = &phone {
        if let Ok(enc) = state.encryption.encrypt_to_string(phone_val) {
            encrypted_phone = Some(enc);
        }
    }

    let result = sqlx::query_as::<_, Customer>(
        r#"
        UPDATE crm.customers SET
            name = $2, code = $3, industry = $4, company_size = $5, website = $6,
            email = $7, phone = $8, fax = $9,
            address = $10, city = $11, province = $12, country = $13, postal_code = $14,
            status = $15, customer_type = $16, source = $17, rating = $18, revenue = $19,
            employee_count = $20, notes = $21, updated_at = $22
        WHERE id = $1 AND tenant_id = $23
        RETURNING id, tenant_id, name, code, industry, company_size, website, email, phone, fax,
                  address, city, province, country, postal_code, status, customer_type,
                  source, rating, revenue, employee_count, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&industry)
    .bind(&company_size)
    .bind(&website)
    .bind(&encrypted_email)
    .bind(&encrypted_phone)
    .bind(&fax)
    .bind(&address)
    .bind(&city)
    .bind(&province)
    .bind(&country)
    .bind(&postal_code)
    .bind(&status)
    .bind(&customer_type)
    .bind(&source)
    .bind(&rating)
    .bind(&revenue)
    .bind(&employee_count)
    .bind(&notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(customer) => {
            let mut customer = customer.clone();
            let _ = customer.decrypt_fields(&state.encryption);
            state.customer_cache.remove(&customer_cache_key(&id));
            let response_data = serde_json::to_value(&customer).ok();
            (
                Json(ApiResponse::success(customer, "客户更新成功")),
                "success".to_string(),
                None,
                response_data,
            )
        }
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            (
                Json(api_error(500, "客户更新失败")),
                "error".to_string(),
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "customer".to_string(),
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

    // 发布 MDM 主数据事件
    if let Ok(customer) = &result {
        let mdm_service = MdmEventService::new();
        let cid = customer.id;
        let ccode = customer.code.clone().unwrap_or_default();
        let cname = customer.name.clone();
        let cemail = customer.email.clone();
        let cphone = customer.phone.clone();
        let cstatus = customer.status.clone();
        let tenant = tenant_id;
        tokio::spawn(async move {
            mdm_service
                .publish_customer_event(
                    tenant,
                    cid,
                    &ccode,
                    &cname,
                    cemail.as_deref(),
                    cphone.as_deref(),
                    &cstatus,
                    MasterDataAction::Updated,
                    None,
                )
                .await;
        });
    }

    response
}

async fn delete_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("UPDATE crm.customers SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.customer_cache.remove(&customer_cache_key(&id));
            (
                Json(ApiResponse::success("".to_string(), "客户删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "客户不存在")),
            "error".to_string(),
            Some("客户不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            (
                Json(api_error(500, "客户删除失败")),
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

    let status_str_clone = status_str.clone();
    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "customer".to_string(),
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

    // 发布 MDM 主数据事件
    if status_str_clone == "success" {
        let mdm_service = MdmEventService::new();
        let tenant = tenant_id;
        tokio::spawn(async move {
            mdm_service
                .publish_customer_event(
                    tenant,
                    id,
                    "",
                    "",
                    None,
                    None,
                    "deleted",
                    MasterDataAction::Deleted,
                    None,
                )
                .await;
        });
    }

    response
}

async fn batch_delete_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
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

    let result = sqlx::query(
        "UPDATE crm.customers SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2",
    )
    .bind(&req.ids)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                "".to_string(),
                &format!("成功删除 {} 个客户", r.rows_affected()),
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除客户失败: {}", e);
            (
                Json(api_error(500, "批量删除客户失败")),
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

    let entity_ids = serde_json::to_value(&req.ids).ok();
    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "batch_delete".to_string(),
            entity_type: "customer".to_string(),
            entity_id: None,
            entity_ids: entity_ids,
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

// ==================== Customer Approval Workflow ====================

#[derive(Debug, Deserialize)]
pub struct StartApprovalRequest {
    pub workflow_id: uuid::Uuid,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalActionRequest {
    pub comment: Option<String>,
}

async fn start_customer_approval(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<StartApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_no, customer_type, status, rating, industry, contact_person, phone, email, address, website, source, description, created_at, updated_at FROM plugin_crm.customers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if customer.is_err() {
        return Json(ApiResponse::<serde_json::Value>::error(404, "客户不存在"));
    }

    tracing::info!(
        "Starting approval for customer {}: workflow_id={}",
        id,
        req.workflow_id
    );

    let workflow_client = state.workflow_client.clone();
    let id_str = id.to_string();
    tokio::spawn(async move {
        let request = CreateInstanceRequest {
            workflow_id: req.workflow_id,
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
                tracing::warn!("[crm] 客户审批流程启动失败（graceful fallback）: {}", e);
            }
        }
    });

    let result = sqlx::query(
        "UPDATE plugin_crm.customers SET status = 'pending_approval', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    if result.is_ok() {
        state.customer_cache.remove(&customer_cache_key(&id));
    }

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "start_approval".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: None,
            request_details: None,
            response_details: Some(serde_json::json!({
                "workflow_id": req.workflow_id.to_string(),
                "comment": req.comment,
            })),
            status: "success".to_string(),
            error_message: None,
        },
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "customer_id": id,
            "workflow_id": req.workflow_id,
            "approval_status": "pending"
        }),
        "客户审批流程已启动",
    ))
}

async fn approve_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(_req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_no, customer_type, status, rating, industry, contact_person, phone, email, address, website, source, description, created_at, updated_at FROM plugin_crm.customers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if customer.is_err() {
        return Json(ApiResponse::<serde_json::Value>::error(404, "客户不存在"));
    }

    let result = sqlx::query(
        "UPDATE plugin_crm.customers SET status = 'approved', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    if result.is_ok() {
        state.customer_cache.remove(&customer_cache_key(&id));
    }

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "approve".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: None,
            request_details: None,
            response_details: Some(serde_json::json!({
                "status": "approved",
            })),
            status: "success".to_string(),
            error_message: None,
        },
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "customer_id": id,
            "approval_status": "approved"
        }),
        "客户审批通过",
    ))
}

async fn reject_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(_req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, customer_no, customer_type, status, rating, industry, contact_person, phone, email, address, website, source, description, created_at, updated_at FROM plugin_crm.customers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if customer.is_err() {
        return Json(ApiResponse::<serde_json::Value>::error(404, "客户不存在"));
    }

    let result = sqlx::query(
        "UPDATE plugin_crm.customers SET status = 'rejected', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    if result.is_ok() {
        state.customer_cache.remove(&customer_cache_key(&id));
    }

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "reject".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: None,
            request_details: None,
            response_details: Some(serde_json::json!({
                "status": "rejected",
            })),
            status: "success".to_string(),
            error_message: None,
        },
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "customer_id": id,
            "approval_status": "rejected"
        }),
        "客户审批已驳回",
    ))
}

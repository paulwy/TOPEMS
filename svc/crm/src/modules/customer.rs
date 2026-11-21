use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use super::ApiState;
use crate::models::customer::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::modules::audit::{log_audit_event_with_actor, AuditActor, AuditEventParams};
use crate::modules::customer_approval_status::CustomerApprovalStatus;
use crate::modules::customer_status::CustomerStatus;
use crate::modules::finance_risk::FinanceRiskLevel;
use crate::shared::permission::{check_permission, ModulePermission};
use std::str::FromStr;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::resolve_create_tenant;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::{ApiResponse, ListResponse};
use topems_shared_core::TopemsError;

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
        // P0-1: 客户财务信息（前端 CustomerDetailPage 真实消费 GET/PUT /customers/{id}/finance）
        .route(
            "/customers/{id}/finance",
            get(get_customer_finance).put(update_customer_finance),
        )
}

/// 单条客户详情缓存 key（含 locale 语言维度 + tenant_id 做租户隔离）
///
/// 列表/详情按 Accept-Language 返回不同 name（zh/en），因此缓存 key 必须带语言维度，
/// 否则英文请求会命中中文缓存。失效 pattern 仍为 `crm:customer:*`（见 invalidate_customer_cache），
/// 新 key 以 `crm:customer:` 开头可被正确失效；旧 key 无需主动清理——每次写操作都会 clear_l1()，
/// 且新部署后旧 key 自然过期（TTL）。
fn customer_detail_cache_key(locale: &str, tenant_id: Uuid, id: Uuid) -> String {
    format!("crm:customer:{}:{}:{}", locale, tenant_id, id)
}

/// 客户列表缓存 key（含 locale 语言维度 + tenant_id 与查询参数 hash）
fn customer_list_cache_key(
    locale: &str,
    tenant_id: Uuid,
    page: i64,
    page_size: i64,
    search: &Option<String>,
) -> String {
    format!(
        "crm:customer:list:{}:{}:page:{}:size:{}:search:{:?}",
        locale, tenant_id, page, page_size, search
    )
}

/// 客户数据变更后失效本地缓存并发布跨实例失效事件
///
/// 列表缓存无法精确按键删除，因此清空本地 L1；
/// 同时发布 `crm:customer:*` pattern 事件，驱动其它实例清空 L1。
async fn invalidate_customer_cache(state: &ApiState, reason: &str) {
    state.customer_cache.clear_l1();
    if let Some(publisher) = &state.event_publisher {
        if let Err(e) = publisher
            .publish_cache_invalidated("crm:customer:*", "pattern", Some(reason))
            .await
        {
            tracing::warn!("发布客户缓存失效事件失败: {}", e);
        }
    }
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<CustomerPaginationParams>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<ListResponse<Customer>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.max(1).min(1_000);
    let page_size = params.page_size.max(1).min(200);
    let offset = (page - 1) * page_size;
    let search = params
        .search
        .as_ref()
        .map(|s| s.trim()[..s.len().min(100)].to_string());
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

    // 缓存命中则直接返回（含 tenant_id 的隔离 key）
    let list_cache_key = customer_list_cache_key(
        Locale::from_headers(&headers).as_sql(),
        tenant_id,
        page,
        page_size,
        &search,
    );
    if let Some(cached) = state.customer_cache.get(&list_cache_key).await {
        match serde_json::from_value::<ListResponse<Customer>>(cached) {
            Ok(list_resp) => {
                tracing::debug!("📋 客户列表缓存命中: {}", list_cache_key);
                return ApiResponse::success(list_resp, "获取客户列表成功");
            }
            Err(_) => {
                tracing::warn!("客户列表缓存反序列化失败，回源查询");
            }
        }
    }

    let mut count_qb = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "crm",
        "SELECT COUNT(*) FROM crm.customers WHERE deleted_at IS NULL"
    ));
    let mut list_qb = sqlx::query_as::<_, Customer>(
        only_own_schema_query!("crm", "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at FROM crm.customers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2")
    );
    list_qb = list_qb
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql());

    if let Some(s) = search.clone() {
        let like = format!("%{}%", s.replace('%', "\\%").replace('_', "\\_"));
        count_qb = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "crm",
            "SELECT COUNT(*) FROM crm.customers WHERE name ILIKE $1 AND deleted_at IS NULL"
        ))
        .bind(like.clone());
        list_qb = sqlx::query_as::<_, Customer>(
            only_own_schema_query!("crm", "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $4 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at FROM crm.customers WHERE name ILIKE $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3")
        ).bind(like).bind(page_size).bind(offset).bind(Locale::from_headers(&headers).as_sql());
    }

    let total: i64 = count_qb.fetch_one(&mut **txn).await.unwrap_or(0);
    let items: Vec<Customer> = match list_qb.fetch_all(&mut **txn).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(?e, "crm list_customers decode failed");
            vec![]
        }
    };

    let body = ListResponse::with_pagination(items, total, page, page_size);

    // 回填缓存
    if let Ok(value) = serde_json::to_value(&body) {
        state.customer_cache.set(list_cache_key, value).await;
    }

    ApiResponse::success(body, "获取客户列表成功")
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
pub async fn create_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateCustomerRequest>,
) -> ApiResponse<Customer> {
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
            "客户名称不能为空".to_string(),
        ));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    // 普通用户必须携带可解析 claims.tenant_id（crm.customers.tenant_id NOT NULL，
    // 超管回退 nil），缺失/非法直接 400，禁止静默落全零导致 RLS 不可见
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(Some(t)) => t,
        Ok(None) => uuid::Uuid::nil(),
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    // 归属人缺省取当前登录用户（claims.sub → user_id），前端可不传 owner_id
    let owner_id = req.owner_id.or_else(|| claims.user_id().ok());

    let status_value = match req.status.as_deref() {
        Some(raw) => match CustomerStatus::from_db_str(raw) {
            Some(v) => v.as_db_str(),
            None => return ApiResponse::bad_request("无效的客户状态"),
        },
        None => CustomerStatus::DEFAULT.as_db_str(),
    };

    let result = sqlx::query_as::<_, Customer>(

        only_own_schema_query!("crm", r#"
        INSERT INTO crm.customers (tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, organization_id, name_en, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
        RETURNING id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $30 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at
        "#
        )
    )
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.customer_type)
    .bind(req.industry.as_deref())
    // rating 未传时绑定默认 'C'（列定义 DEFAULT 'C'，模型为非空 String）
    .bind(req.rating.as_deref().unwrap_or("C"))
    .bind(req.region.as_deref())
    .bind(owner_id)
    // tags 未传时绑定空数组（列定义 TEXT[] NOT NULL DEFAULT '{}'，避免 NULL 违反约束）
    .bind(req.tags.as_deref().unwrap_or(&[]))
    .bind("none")
    .bind(now)
    .bind(now)
    // organization_id：CreateCustomerRequest 无该字段，落 NULL（勿误绑 tenant_id）
    .bind(Option::<uuid::Uuid>::None)
    .bind(&req.name_en)
    .bind(req.code.as_deref())
    .bind(req.email.as_deref())
    .bind(req.phone.as_deref())
    .bind(req.website.as_deref())
    .bind(req.address.as_deref())
    .bind(req.city.as_deref())
    .bind(req.province.as_deref())
    .bind(req.country.as_deref())
    .bind(req.company_size.as_deref())
    .bind(req.employee_count)
    .bind(req.revenue)
    .bind(req.source.as_deref())
    // status 列 NOT NULL（DEFAULT 'active'）：前端契约可省略，未传时绑定默认值，
    // 避免显式 NULL 违反 NOT NULL 约束（MCS 冒烟暴露 500）
    .bind(status_value)
    .bind(req.fax.as_deref())
    .bind(req.postal_code.as_deref())
    .bind(req.notes.as_deref())
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(customer) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            // 创建客户后失效客户列表缓存
            invalidate_customer_cache(&state, "customer_created").await;
            let request_data = serde_json::to_value(&req).ok();
            let response_data = serde_json::to_value(&customer).ok();
            let audit_actor = AuditActor::from_claims(Some(customer.tenant_id), &claims);
            tokio::spawn(async move {
                let _ = log_audit_event_with_actor(
                    &state.system_pool,
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
                    audit_actor,
                )
                .await;
            });
            ApiResponse::success(customer, "客户创建成功")
        }
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            ApiResponse::from(TopemsError::Internal("客户创建失败".to_string()))
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
pub async fn get_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<Customer> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
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

    // 缓存命中则直接返回
    let detail_key =
        customer_detail_cache_key(Locale::from_headers(&headers).as_sql(), tenant_id, id);
    if let Some(cached) = state.customer_cache.get(&detail_key).await {
        match serde_json::from_value::<Customer>(cached) {
            Ok(customer) => {
                tracing::debug!("📋 客户详情缓存命中: {}", detail_key);
                return ApiResponse::success(customer, "获取客户成功");
            }
            Err(_) => {
                tracing::warn!("客户详情缓存反序列化失败，回源查询");
            }
        }
    }

    match sqlx::query_as::<_, Customer>(
        "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1 AND deleted_at IS NULL"
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(customer)) => {
            if let Ok(value) = serde_json::to_value(&customer) {
                state.customer_cache.set(detail_key, value).await;
            }
            ApiResponse::success(customer, "获取客户成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("客户不存在".to_string())),
        Err(e) => {
            tracing::error!("获取客户失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取客户失败".to_string()))
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
pub async fn update_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateCustomerRequest>,
) -> ApiResponse<Customer> {
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

    let existing = sqlx::query_as::<_, Customer>(
        "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("客户不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询客户失败", e)),
    };

    let request_data = serde_json::to_value(&req).ok();
    let name = req.name.unwrap_or(existing.name);
    let customer_type = req.customer_type.unwrap_or(existing.customer_type);
    let industry = req.industry.or(existing.industry);
    let rating = req.rating.unwrap_or(existing.rating);
    let region = req.region.or(existing.region);
    let owner_id = req.owner_id.or(existing.owner_id);
    let tags = req.tags.unwrap_or(existing.tags);
    // 字段级对拍 crm 批（2026-10-17）：编辑提交字段对齐 DB 列，未传保留旧值
    let code = req.code.or(existing.code);
    let email = req.email.or(existing.email);
    let phone = req.phone.or(existing.phone);
    let website = req.website.or(existing.website);
    let address = req.address.or(existing.address);
    let city = req.city.or(existing.city);
    let province = req.province.or(existing.province);
    let country = req.country.or(existing.country);
    let company_size = req.company_size.or(existing.company_size);
    let employee_count = req.employee_count.or(existing.employee_count);
    let revenue = req.revenue.or(existing.revenue);
    let source = req.source.or(existing.source);
    let status = match req.status {
        Some(raw) => match CustomerStatus::from_db_str(&raw) {
            Some(next) => {
                if let Some(cur_raw) = existing.status.as_deref() {
                    match CustomerStatus::from_db_str(cur_raw) {
                        Some(cur) if cur.can_transition_to(next) => {}
                        Some(cur) => {
                            let msg = format!(
                                "客户状态不允许从 {} 变更为 {}",
                                cur.as_db_str(),
                                next.as_db_str()
                            );
                            return ApiResponse::error(409, &msg);
                        }
                        None => return ApiResponse::error(409, "客户当前状态非法，无法变更"),
                    }
                }
                Some(next.as_db_str().to_string())
            }
            None => return ApiResponse::bad_request("无效的客户状态"),
        },
        None => existing.status,
    };
    let fax = req.fax.or(existing.fax);
    let postal_code = req.postal_code.or(existing.postal_code);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    match sqlx::query_as::<_, Customer>(
        r#"
        UPDATE crm.customers SET
            name = $2, customer_type = $3, industry = $4, rating = $5, region = $6, owner_id = $7, tags = $8, updated_at = $9, name_en = COALESCE($11, name_en),
            code = COALESCE($12, code), email = COALESCE($13, email), phone = COALESCE($14, phone), website = COALESCE($15, website), address = COALESCE($16, address), city = COALESCE($17, city), province = COALESCE($18, province), country = COALESCE($19, country), company_size = COALESCE($20, company_size), employee_count = COALESCE($21, employee_count), revenue = COALESCE($22, revenue), source = COALESCE($23, source), status = COALESCE($24, status), fax = COALESCE($25, fax), postal_code = COALESCE($26, postal_code), notes = COALESCE($27, notes)
        WHERE id = $1 AND tenant_id = $10
        RETURNING id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $28 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at
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
    .bind(&req.name_en)
    .bind(code.as_deref())
    .bind(email.as_deref())
    .bind(phone.as_deref())
    .bind(website.as_deref())
    .bind(address.as_deref())
    .bind(city.as_deref())
    .bind(province.as_deref())
    .bind(country.as_deref())
    .bind(company_size.as_deref())
    .bind(employee_count)
    .bind(revenue)
    .bind(source.as_deref())
    .bind(status.as_deref())
    .bind(fax.as_deref())
    .bind(postal_code.as_deref())
    .bind(notes.as_deref())
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await
    {
        Ok(customer) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            let response_data = serde_json::to_value(&customer).ok();
            // 更新客户后失效客户详情与列表缓存
            invalidate_customer_cache(&state, "customer_updated").await;
            let audit_actor = AuditActor::from_claims(Some(customer.tenant_id), &claims);
            tokio::spawn(async move {
                let _ = log_audit_event_with_actor(
                    &state.system_pool,
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
                    audit_actor,
                )
                .await;
            });
            ApiResponse::success(customer, "客户更新成功")
        }
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            ApiResponse::from(TopemsError::Internal("客户更新失败".to_string()))
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
pub async fn delete_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<()> {
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

    match sqlx::query_scalar::<_, Uuid>(
        "UPDATE crm.customers SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING tenant_id",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(entity_tenant)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            // 删除客户后失效缓存
            invalidate_customer_cache(&state, "customer_deleted").await;
            let response_data = serde_json::json!({ "rows_affected": 1 });
            let audit_actor = AuditActor::from_claims(Some(entity_tenant), &claims);
            tokio::spawn(async move {
                let _ = log_audit_event_with_actor(
                    &state.system_pool,
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
                    audit_actor,
                )
                .await;
            });
            ApiResponse::success_no_data("客户删除成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("客户不存在".to_string())),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            ApiResponse::from(TopemsError::Internal("客户删除失败".to_string()))
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
pub async fn batch_delete_customers(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
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

    if req.ids.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "请选择要删除的客户".to_string(),
        ));
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    match sqlx::query_scalar::<_, Option<Uuid>>(
        "UPDATE crm.customers SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2 RETURNING tenant_id",
    )
    .bind(&req.ids)
    .bind(tenant_id)
    .fetch_all(&mut **txn)
    .await
    {
        Ok(tenant_rows) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            let rows_affected = u64::try_from(tenant_rows.len()).unwrap_or(u64::MAX);
            // 批量删除客户后失效缓存
            invalidate_customer_cache(&state, "customer_batch_deleted").await;
            let entity_ids = serde_json::to_value(&req.ids).ok();
            // 单行审计无法表达多个租户：仅当命中的非 nil 实体租户唯一时才落该租户，
            // 否则（混合租户 / 全部 nil 系统行）落 nil。
            let mut distinct_tenant: Option<Uuid> = None;
            let mut multi_tenant = false;
            for t in tenant_rows.iter().flatten() {
                match distinct_tenant {
                    None => distinct_tenant = Some(*t),
                    Some(d) if d != *t => multi_tenant = true,
                    _ => {}
                }
            }
            let audit_tenant = if multi_tenant { None } else { distinct_tenant };
            let audit_actor = AuditActor::from_claims(audit_tenant, &claims);
            let response_data = serde_json::json!({ "rows_affected": rows_affected });
            tokio::spawn(async move {
                let _ = log_audit_event_with_actor(
                    &state.system_pool,
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
                    audit_actor,
                )
                .await;
            });
            ApiResponse::success(format!("成功删除 {} 个客户", rows_affected), "批量删除成功")
        }
        Err(e) => {
            tracing::error!("批量删除客户失败: {}", e);
            ApiResponse::from(TopemsError::Internal("批量删除客户失败".to_string()))
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
pub async fn start_customer_approval(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<StartApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    // 预读与下方 UPDATE 均依赖严格 RLS 的租户谓词（app.tenant_id / app.rls_system），
    // 超管走系统通道可跨租户定位实体；审计租户一律取实体行 tenant_id。
    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1",
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    let customer = match customer {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("客户不存在".to_string()))
        }
    };
    let old_approval_status = customer.approval_status.clone();
    let current = match CustomerApprovalStatus::from_db_str(&customer.approval_status) {
        Some(v) => v,
        None => return ApiResponse::conflict("客户审批状态异常，无法启动审批"),
    };
    if !CustomerApprovalStatus::Pending
        .start_from()
        .contains(&current)
    {
        return ApiResponse::conflict("客户当前审批状态不允许重复启动");
    }
    let new_status = CustomerApprovalStatus::Pending;
    let new_approval_status = new_status.as_db_str().to_string();
    let allowed_from: Vec<&str> = new_status
        .start_from()
        .iter()
        .map(|v| v.as_db_str())
        .collect();

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

    let update = sqlx::query(
        "UPDATE crm.customers SET approval_status = $2, updated_at = NOW() WHERE id = $1 AND approval_status = ANY($3::text[])",
    )
    .bind(id)
    .bind(new_status.as_db_str())
    .bind(&allowed_from)
    .execute(&mut **txn)
    .await;
    match update {
        Err(e) => {
            tracing::error!("客户审批启动状态更新失败: {}", e);
            return ApiResponse::server_error("启动客户审批失败");
        }
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::conflict("客户审批状态已变化，请刷新后重试")
        }
        Ok(_) => {}
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }

    let audit_actor = AuditActor::from_claims(Some(customer.tenant_id), &claims);
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
        let _ = log_audit_event_with_actor(
            &state.system_pool,
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
            audit_actor,
        )
        .await;
    });

    ApiResponse::success(
        serde_json::json!({
            "customer_id": id,
            "workflow_id": req.workflow_id,
            "approval_status": new_approval_status
        }),
        "客户审批流程已启动",
    )
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
pub async fn approve_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ApprovalActionRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    // 预读与下方 UPDATE 均依赖严格 RLS 的租户谓词（app.tenant_id / app.rls_system），
    // 超管走系统通道可跨租户定位实体；审计租户一律取实体行 tenant_id。
    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1",
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    let customer = match customer {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("客户不存在".to_string()))
        }
    };
    let old_approval_status = customer.approval_status.clone();
    match CustomerApprovalStatus::from_db_str(&customer.approval_status) {
        Some(v) if CustomerApprovalStatus::Approved.decide_from().contains(&v) => {}
        Some(_) => return ApiResponse::conflict("客户当前审批状态不允许通过"),
        None => return ApiResponse::conflict("客户审批状态异常，无法通过"),
    }
    let new_status = CustomerApprovalStatus::Approved;
    let new_approval_status = new_status.as_db_str().to_string();
    let allowed_from: Vec<&str> = new_status
        .decide_from()
        .iter()
        .map(|v| v.as_db_str())
        .collect();

    let update = sqlx::query(
        "UPDATE crm.customers SET approval_status = $2, updated_at = NOW() WHERE id = $1 AND approval_status = ANY($3::text[])",
    )
    .bind(id)
    .bind(new_status.as_db_str())
    .bind(&allowed_from)
    .execute(&mut **txn)
    .await;
    match update {
        Err(e) => {
            tracing::error!("客户审批通过状态更新失败: {}", e);
            return ApiResponse::server_error("客户审批通过失败");
        }
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::conflict("客户审批状态已变化，请刷新后重试")
        }
        Ok(_) => {}
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }

    let audit_actor = AuditActor::from_claims(Some(customer.tenant_id), &claims);
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
        let _ = log_audit_event_with_actor(
            &state.system_pool,
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
            audit_actor,
        )
        .await;
    });

    ApiResponse::success(
        serde_json::json!({
            "customer_id": id,
            "approval_status": new_approval_status
        }),
        "客户审批通过",
    )
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
pub async fn reject_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ApprovalActionRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    // 预读与下方 UPDATE 均依赖严格 RLS 的租户谓词（app.tenant_id / app.rls_system），
    // 超管走系统通道可跨租户定位实体；审计租户一律取实体行 tenant_id。
    let customer = sqlx::query_as::<_, Customer>(
        "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, name_en, customer_type, industry, COALESCE(rating, '') AS rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, fax, postal_code, notes, created_at, updated_at, deleted_at FROM crm.customers WHERE id = $1",
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    let customer = match customer {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("客户不存在".to_string()))
        }
    };
    let old_approval_status = customer.approval_status.clone();
    match CustomerApprovalStatus::from_db_str(&customer.approval_status) {
        Some(v) if CustomerApprovalStatus::Rejected.decide_from().contains(&v) => {}
        Some(_) => return ApiResponse::conflict("客户当前审批状态不允许驳回"),
        None => return ApiResponse::conflict("客户审批状态异常，无法驳回"),
    }
    let new_status = CustomerApprovalStatus::Rejected;
    let new_approval_status = new_status.as_db_str().to_string();
    let allowed_from: Vec<&str> = new_status
        .decide_from()
        .iter()
        .map(|v| v.as_db_str())
        .collect();

    let update = sqlx::query(
        "UPDATE crm.customers SET approval_status = $2, updated_at = NOW() WHERE id = $1 AND approval_status = ANY($3::text[])",
    )
    .bind(id)
    .bind(new_status.as_db_str())
    .bind(&allowed_from)
    .execute(&mut **txn)
    .await;
    match update {
        Err(e) => {
            tracing::error!("客户审批驳回状态更新失败: {}", e);
            return ApiResponse::server_error("客户审批驳回失败");
        }
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::conflict("客户审批状态已变化，请刷新后重试")
        }
        Ok(_) => {}
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }

    let audit_actor = AuditActor::from_claims(Some(customer.tenant_id), &claims);
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
        let _ = log_audit_event_with_actor(
            &state.system_pool,
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
            audit_actor,
        )
        .await;
    });

    ApiResponse::success(
        serde_json::json!({
            "customer_id": id,
            "approval_status": new_approval_status
        }),
        "客户审批已驳回",
    )
}

// ========== 客户财务信息（P0-1 补实现：前端 CustomerDetailPage 真实消费 GET/PUT /customers/{id}/finance） ==========

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CustomerFinanceInfo {
    pub customer_id: Uuid,
    pub customer_name: String,
    pub credit_limit: f64,
    pub credit_used: f64,
    pub credit_available: f64,
    pub credit_term_days: i64,
    pub receivable_balance: f64,
    pub accounts_receivable: f64,
    pub overdue_amount: rust_decimal::Decimal,
    pub overdue_receivable: f64,
    pub avg_collection_days: i64,
    pub total_sales: f64,
    pub total_received: f64,
    pub last_transaction_date: Option<DateTime<Utc>>,
    pub payment_terms: String,
    pub risklevel: String,
    pub status: String,
    pub bank_name: Option<String>,
    pub bank_account: Option<String>,
    pub account_name: Option<String>,
    pub tax_number: Option<String>,
}

impl CustomerFinanceInfo {
    fn default_for(customer_id: Uuid, customer_name: String) -> Self {
        Self {
            customer_id,
            customer_name,
            credit_limit: 0.0,
            credit_used: 0.0,
            credit_available: 0.0,
            credit_term_days: 0,
            receivable_balance: 0.0,
            accounts_receivable: 0.0,
            overdue_amount: rust_decimal::Decimal::ZERO,
            overdue_receivable: 0.0,
            avg_collection_days: 0,
            total_sales: 0.0,
            total_received: 0.0,
            last_transaction_date: None,
            payment_terms: String::new(),
            risklevel: "low".to_string(),
            status: "active".to_string(),
            bank_name: None,
            bank_account: None,
            account_name: None,
            tax_number: None,
        }
    }
}

/// 运行时行结构（GET /customers/{id}/finance 读路径超管豁免；原 query! 离线缓存改 query_as 运行时）
#[derive(Debug, sqlx::FromRow)]
struct CustomerFinanceRow {
    customer_id: Uuid,
    customer_name: String,
    credit_limit: sqlx::types::BigDecimal,
    credit_used: sqlx::types::BigDecimal,
    credit_available: sqlx::types::BigDecimal,
    credit_term_days: i32,
    receivable_balance: sqlx::types::BigDecimal,
    accounts_receivable: sqlx::types::BigDecimal,
    overdue_amount: sqlx::types::BigDecimal,
    overdue_receivable: sqlx::types::BigDecimal,
    avg_collection_days: i32,
    total_sales: sqlx::types::BigDecimal,
    total_received: sqlx::types::BigDecimal,
    last_transaction_date: Option<DateTime<Utc>>,
    payment_terms: String,
    risklevel: String,
    status: String,
    bank_name: Option<String>,
    bank_account: Option<String>,
    account_name: Option<String>,
    tax_number: Option<String>,
    resolved_name: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateCustomerFinanceRequest {
    pub credit_limit: Option<f64>,
    pub credit_used: Option<f64>,
    pub credit_available: Option<f64>,
    pub credit_term_days: Option<i64>,
    pub receivable_balance: Option<f64>,
    pub accounts_receivable: Option<f64>,
    pub overdue_amount: Option<rust_decimal::Decimal>,
    pub overdue_receivable: Option<f64>,
    pub avg_collection_days: Option<i64>,
    pub total_sales: Option<f64>,
    pub total_received: Option<f64>,
    pub last_transaction_date: Option<DateTime<Utc>>,
    pub payment_terms: Option<String>,
    pub risklevel: Option<String>,
    pub status: Option<String>,
    pub bank_name: Option<String>,
    pub bank_account: Option<String>,
    pub account_name: Option<String>,
    pub tax_number: Option<String>,
}

/// NUMERIC → f64（sqlx query! 下 NUMERIC 为 Option<BigDecimal>）
fn num_f64(v: sqlx::types::BigDecimal) -> f64 {
    v.to_string().parse::<f64>().unwrap_or(0.0)
}

/// f64 → NUMERIC（query! 写 NUMERIC 列需要 BigDecimal）
fn to_bd(v: f64) -> sqlx::types::BigDecimal {
    use std::str::FromStr;
    sqlx::types::BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:customer:read"])),
    path = "/api/crm/customers/{id}/finance",
    params(("id" = Uuid, Path, description = "Customer id")),
    responses((status = 200, body = CustomerFinanceInfo)),
    tag = "customer"
)]
#[allow(clippy::as_conversions)]
pub async fn get_customer_finance(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<CustomerFinanceInfo> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let locale = Locale::from_headers(&headers).as_sql();

    // 租户隔离由严格 RLS 承担（超管走系统通道，可跨租户查看）
    let row = sqlx::query_as::<_, CustomerFinanceRow>(
        r#"
        SELECT cf.customer_id, cf.customer_name, cf.credit_limit, cf.credit_used,
               cf.credit_available, cf.credit_term_days, cf.receivable_balance,
               cf.accounts_receivable, cf.overdue_amount, cf.overdue_receivable,
               cf.avg_collection_days, cf.total_sales, cf.total_received,
               cf.last_transaction_date, cf.payment_terms, cf.risklevel, cf.status,
               cf.bank_name, cf.bank_account, cf.account_name, cf.tax_number,
               COALESCE(CASE WHEN $2 = 'en' THEN COALESCE(c.name_en, c.name) ELSE c.name END, cf.customer_name) AS resolved_name
        FROM crm.customer_finance cf
        LEFT JOIN crm.customers c ON c.id = cf.customer_id
        WHERE cf.customer_id = $1
        "#,
    )
    .bind(id)
    .bind(locale)
    .fetch_optional(&mut **txn)
    .await;

    match row {
        Ok(Some(r)) => {
            if FinanceRiskLevel::from_db_str(&r.risklevel).is_none() {
                return ApiResponse::error(409, "客户财务风险等级非法，拒绝读取");
            }
            ApiResponse::success(
                CustomerFinanceInfo {
                    customer_id: r.customer_id,
                    customer_name: r.resolved_name.unwrap_or_default(),
                    credit_limit: num_f64(r.credit_limit),
                    credit_used: num_f64(r.credit_used),
                    credit_available: num_f64(r.credit_available),
                    credit_term_days: r.credit_term_days as i64,
                    receivable_balance: num_f64(r.receivable_balance),
                    accounts_receivable: num_f64(r.accounts_receivable),
                    overdue_amount: rust_decimal::Decimal::from_str(&r.overdue_amount.to_string())
                        .unwrap_or_default(),
                    overdue_receivable: num_f64(r.overdue_receivable),
                    avg_collection_days: r.avg_collection_days as i64,
                    total_sales: num_f64(r.total_sales),
                    total_received: num_f64(r.total_received),
                    last_transaction_date: r.last_transaction_date,
                    payment_terms: r.payment_terms,
                    risklevel: r.risklevel,
                    status: r.status,
                    bank_name: r.bank_name,
                    bank_account: r.bank_account,
                    account_name: r.account_name,
                    tax_number: r.tax_number,
                },
                "获取客户财务信息成功",
            )
        }
        Ok(None) => {
            // 无财务记录：返回默认财务信息（前端依赖默认展示，不 404）
            let name = sqlx::query_scalar::<_, String>(
                "SELECT CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END FROM crm.customers WHERE id = $1",
            )
            .bind(id)
            .bind(locale)
            .fetch_optional(&mut **txn)
            .await;
            let customer_name = match name {
                Ok(Some(n)) => n,
                _ => String::new(),
            };
            ApiResponse::success(
                CustomerFinanceInfo::default_for(id, customer_name),
                "获取客户财务信息成功",
            )
        }
        Err(e) => {
            tracing::error!("获取客户财务信息失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取客户财务信息失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["crm:customer:write"])),
    path = "/api/crm/customers/{id}/finance",
    params(("id" = Uuid, Path, description = "Customer id")),
    request_body = UpdateCustomerFinanceRequest,
    responses((status = 200, body = CustomerFinanceInfo)),
    tag = "customer"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn update_customer_finance(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateCustomerFinanceRequest>,
) -> ApiResponse<CustomerFinanceInfo> {
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
    let locale = Locale::from_headers(&headers).as_sql();

    // 读取现值（无则默认），与请求合并
    let cur = {
        let row = sqlx::query!(
            r#"
            SELECT cf.credit_limit, cf.credit_used, cf.credit_available,
                   cf.credit_term_days, cf.receivable_balance, cf.accounts_receivable,
                   cf.overdue_amount, cf.overdue_receivable, cf.avg_collection_days,
                   cf.total_sales, cf.total_received, cf.last_transaction_date,
                   cf.payment_terms, cf.risklevel, cf.status, cf.bank_name,
                   cf.bank_account, cf.account_name, cf.tax_number, cf.customer_name,
                   COALESCE(CASE WHEN $3 = 'en' THEN COALESCE(c.name_en, c.name) ELSE c.name END, cf.customer_name) AS resolved_name
            FROM crm.customer_finance cf
            LEFT JOIN crm.customers c ON c.id = cf.customer_id
            WHERE cf.customer_id = $1 AND cf.tenant_id = $2
            "#,
            id,
            tenant_id,
            locale,
        )
        .fetch_optional(&mut **txn)
        .await;
        match row {
            Ok(Some(r)) => CustomerFinanceInfo {
                customer_id: id,
                customer_name: r.resolved_name.unwrap_or_default(),
                credit_limit: num_f64(r.credit_limit),
                credit_used: num_f64(r.credit_used),
                credit_available: num_f64(r.credit_available),
                credit_term_days: r.credit_term_days as i64,
                receivable_balance: num_f64(r.receivable_balance),
                accounts_receivable: num_f64(r.accounts_receivable),
                overdue_amount: rust_decimal::Decimal::from_str(&r.overdue_amount.to_string())
                    .unwrap_or_default(),
                overdue_receivable: num_f64(r.overdue_receivable),
                avg_collection_days: r.avg_collection_days as i64,
                total_sales: num_f64(r.total_sales),
                total_received: num_f64(r.total_received),
                last_transaction_date: r.last_transaction_date,
                payment_terms: r.payment_terms,
                risklevel: r.risklevel,
                status: r.status,
                bank_name: r.bank_name,
                bank_account: r.bank_account,
                account_name: r.account_name,
                tax_number: r.tax_number,
            },
            Ok(None) => {
                let name = sqlx::query!(
                    "SELECT CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name FROM crm.customers WHERE id = $1 AND tenant_id = $2",
                    id,
                    tenant_id,
                    locale,
                )
                .fetch_optional(&mut **txn)
                .await;
                let customer_name = match name {
                    Ok(Some(n)) => n.name.unwrap_or_default(),
                    _ => String::new(),
                };
                CustomerFinanceInfo::default_for(id, customer_name)
            }
            Err(e) => {
                tracing::error!("读取客户财务现值失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "更新客户财务信息失败".to_string(),
                ));
            }
        }
    };

    if FinanceRiskLevel::from_db_str(&cur.risklevel).is_none() {
        return ApiResponse::error(409, "客户财务当前风险等级非法，无法变更");
    }
    let risklevel = match req.risklevel.as_deref() {
        None => cur.risklevel.clone(),
        Some(raw) => match FinanceRiskLevel::from_db_str(raw) {
            Some(level) => level.as_db_str().to_string(),
            None => return ApiResponse::bad_request("无效的风险等级"),
        },
    };

    let merged = CustomerFinanceInfo {
        credit_limit: req.credit_limit.unwrap_or(cur.credit_limit),
        credit_used: req.credit_used.unwrap_or(cur.credit_used),
        credit_available: req.credit_available.unwrap_or(cur.credit_available),
        credit_term_days: req.credit_term_days.unwrap_or(cur.credit_term_days),
        receivable_balance: req.receivable_balance.unwrap_or(cur.receivable_balance),
        accounts_receivable: req.accounts_receivable.unwrap_or(cur.accounts_receivable),
        overdue_amount: req.overdue_amount.unwrap_or(cur.overdue_amount),
        overdue_receivable: req.overdue_receivable.unwrap_or(cur.overdue_receivable),
        avg_collection_days: req.avg_collection_days.unwrap_or(cur.avg_collection_days),
        total_sales: req.total_sales.unwrap_or(cur.total_sales),
        total_received: req.total_received.unwrap_or(cur.total_received),
        last_transaction_date: req.last_transaction_date.or(cur.last_transaction_date),
        payment_terms: req.payment_terms.unwrap_or(cur.payment_terms),
        risklevel,
        status: match req.status.as_deref() {
            Some(raw) => match CustomerStatus::from_db_str(raw) {
                Some(next) => match CustomerStatus::from_db_str(&cur.status) {
                    Some(current) if current.can_transition_to(next) => {
                        next.as_db_str().to_string()
                    }
                    Some(current) => {
                        let msg = format!(
                            "客户财务状态不允许从 {} 变更为 {}",
                            current.as_db_str(),
                            next.as_db_str()
                        );
                        return ApiResponse::error(409, &msg);
                    }
                    None => return ApiResponse::error(409, "客户财务当前状态非法，无法变更"),
                },
                None => return ApiResponse::bad_request("无效的客户财务状态"),
            },
            None => cur.status,
        },
        bank_name: req.bank_name.or(cur.bank_name),
        bank_account: req.bank_account.or(cur.bank_account),
        account_name: req.account_name.or(cur.account_name),
        tax_number: req.tax_number.or(cur.tax_number),
        ..cur
    };

    // upsert：先 UPDATE，0 行受影响则 INSERT
    let updated = sqlx::query!(
        r#"
        UPDATE crm.customer_finance
        SET customer_name = $3, credit_limit = $4, credit_used = $5, credit_available = $6,
            credit_term_days = $7, receivable_balance = $8, accounts_receivable = $9,
            overdue_amount = $10, overdue_receivable = $11, avg_collection_days = $12,
            total_sales = $13, total_received = $14, last_transaction_date = $15,
            payment_terms = $16, risklevel = $17, status = $18, bank_name = $19,
            bank_account = $20, account_name = $21, tax_number = $22, updated_at = NOW()
        WHERE customer_id = $1 AND tenant_id = $2
        "#,
        id,
        tenant_id,
        merged.customer_name,
        to_bd(merged.credit_limit),
        to_bd(merged.credit_used),
        to_bd(merged.credit_available),
        merged.credit_term_days as i32,
        to_bd(merged.receivable_balance),
        to_bd(merged.accounts_receivable),
        sqlx::types::BigDecimal::from_str(&merged.overdue_amount.to_string()).unwrap_or_default(),
        to_bd(merged.overdue_receivable),
        merged.avg_collection_days as i32,
        to_bd(merged.total_sales),
        to_bd(merged.total_received),
        merged.last_transaction_date,
        merged.payment_terms,
        merged.risklevel,
        merged.status,
        merged.bank_name,
        merged.bank_account,
        merged.account_name,
        merged.tax_number,
    )
    .execute(&mut **txn)
    .await;

    match updated {
        Ok(res) if res.rows_affected() == 0 => {
            let inserted = sqlx::query!(
                r#"
                INSERT INTO crm.customer_finance
                    (customer_id, tenant_id, customer_name, credit_limit, credit_used,
                     credit_available, credit_term_days, receivable_balance, accounts_receivable,
                     overdue_amount, overdue_receivable, avg_collection_days, total_sales,
                     total_received, last_transaction_date, payment_terms, risklevel, status,
                     bank_name, bank_account, account_name, tax_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                "#,
                id,
                tenant_id,
                merged.customer_name,
                to_bd(merged.credit_limit),
                to_bd(merged.credit_used),
                to_bd(merged.credit_available),
                merged.credit_term_days as i32,
                to_bd(merged.receivable_balance),
                to_bd(merged.accounts_receivable),
                sqlx::types::BigDecimal::from_str(&merged.overdue_amount.to_string()).unwrap_or_default(),
                to_bd(merged.overdue_receivable),
                merged.avg_collection_days as i32,
                to_bd(merged.total_sales),
                to_bd(merged.total_received),
                merged.last_transaction_date,
                merged.payment_terms,
                merged.risklevel,
                merged.status,
                merged.bank_name,
                merged.bank_account,
                merged.account_name,
                merged.tax_number,
            )
            .execute(&mut **txn)
            .await;
            match inserted {
                Ok(_) => {
                    if let Some(t) = guard.take() {
                        if let Err(e) = t.commit().await {
                            tracing::error!("事务提交失败: {}", e);

                            return ApiResponse::server_error("事务提交失败");
                        }
                    }
                    ApiResponse::success(merged, "更新客户财务信息成功")
                }
                Err(e) => {
                    tracing::error!("插入客户财务信息失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("更新客户财务信息失败".to_string()))
                }
            }
        }
        Ok(_) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(merged, "更新客户财务信息成功")
        }
        Err(e) => {
            tracing::error!("更新客户财务信息失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新客户财务信息失败".to_string()))
        }
    }
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

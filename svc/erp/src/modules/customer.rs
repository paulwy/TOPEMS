use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::modules::customer_calc::{
    build_search_pattern, default_credit_limit, default_customer_status, has_customer_filters,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::{api_error, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct CustomerListParams {
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    #[serde(
        default,
        alias = "page_size",
        alias = "pageSize",
        alias = "size",
        alias = "limit"
    )]
    pub page_size: Option<i64>,
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    #[serde(default, alias = "sort", alias = "sortBy", alias = "sortby")]
    pub sort_by: Option<String>,
    #[serde(
        default,
        alias = "sortorder",
        alias = "sortOrder",
        alias = "sort_dir",
        alias = "dir"
    )]
    pub sort_dir: Option<String>,
    pub status: Option<String>,
    pub customer_type: Option<String>,
}

impl CustomerListParams {
    fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }
    fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }
    fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
    fn limit(&self) -> i64 {
        self.page_size_or_default()
    }
    fn normalized_sort_dir(&self) -> String {
        match self.sort_dir.as_deref() {
            Some("asc") => "asc".into(),
            _ => "desc".into(),
        }
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/customers", get(list_customers).post(create_customer))
        .route(
            "/customers/{id}",
            get(get_customer)
                .put(update_customer)
                .delete(delete_customer),
        )
        // #26: 批量/统计端点
        .route("/customers/batch-list", post(batch_list_customers))
        .route(
            "/customers/batch",
            post(batch_create_customers)
                .put(batch_update_customers)
                .delete(batch_delete_customers),
        )
        .route("/customers/batch/status", post(batch_change_status))
        .route("/customers/batch/category", post(batch_change_category))
        .route("/customers/{id}/status", put(change_customer_status))
        .route("/customers/stats", get(get_customer_stats))
        .route("/customers/recent", get(list_recent_customers))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/customers",
    responses(
        (status = 200, description = "list_customers OK")
    ),
    tag = "ERP/customer"
)]
pub async fn list_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CustomerListParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<Customer>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let search_pattern = build_search_pattern(params.search.as_deref());
    let status_filter = params.status.clone();
    let customer_type_filter = params.customer_type.clone();

    let customers_result = if has_customer_filters(
        params.search.as_deref(),
        status_filter.as_deref(),
        customer_type_filter.as_deref(),
    ) {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();
        let customer_type = customer_type_filter.clone();

        sqlx::query_as::<_, Customer>(
            only_own_schema_query!("erp", r#"SELECT id, code, CASE WHEN $6 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at
               FROM erp.customers
               WHERE (code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1)
                 AND ($2 = '' OR status = $2)
                 AND ($3 = '' OR customer_type = $3)
               ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(customer_type.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query_as::<_, Customer>(
            only_own_schema_query!("erp", "SELECT id, code, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at FROM erp.customers ORDER BY created_at DESC LIMIT $1 OFFSET $2")
        )
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut **txn)
        .await
    };

    let customers = match customers_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("查询客户失败: {}", e);
            return Json(api_error(500, "查询客户失败"));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("erp", r#"SELECT COUNT(*) FROM erp.customers WHERE deleted_at IS NULL AND (code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1) AND ($2 = '' OR status = $2) AND ($3 = '' OR customer_type = $3)"#)
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_else(|| "%%".to_string()))
    .bind(status_filter.as_deref().unwrap_or(""))
    .bind(customer_type_filter.as_deref().unwrap_or(""))
    .fetch_one(&mut **txn)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询客户总数失败: {}", e);
            return Json(api_error(500, "查询客户总数失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(customers, total, page, page_size),
        "获取客户列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/customers/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "get_customer OK")
    ),
    tag = "ERP/customer"
)]
pub async fn get_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Customer>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, Customer>(
        only_own_schema_query!("erp", "SELECT id, code, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at FROM erp.customers WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "获取客户成功")),
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("查询客户失败: {}", e);
            Json(api_error(500, "查询客户失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/customers",
    request_body = CreateCustomerRequest,
    responses(
        (status = 200, description = "create_customer OK")
    ),
    tag = "ERP/customer"
)]
pub async fn create_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<CreateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Customer>(
        only_own_schema_query!("erp", "INSERT INTO erp.customers (code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status, name_en) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id, code, CASE WHEN $17 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at"),
    )
    .bind(body.code)
    .bind(body.name)
    .bind(body.short_name)
    .bind(body.contact_person)
    .bind(body.contact_phone)
    .bind(body.email)
    .bind(body.address)
    .bind(body.province)
    .bind(body.city)
    .bind(body.district)
    .bind(body.customer_type)
    .bind(body.industry)
    .bind(body.scale)
    .bind(default_credit_limit(body.credit_limit))
    .bind(default_customer_status(body.status))
    .bind(body.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "创建客户成功")),
        Ok(None) => Json(api_error(500, "创建客户失败")),
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            Json(api_error(500, "创建客户失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/customers/{id}",
    request_body = UpdateCustomerRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "update_customer OK")
    ),
    tag = "ERP/customer"
)]
pub async fn update_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Customer>(
        only_own_schema_query!("erp", "UPDATE erp.customers SET name = COALESCE($1, name), short_name = COALESCE($2, short_name), contact_person = COALESCE($3, contact_person), contact_phone = COALESCE($4, contact_phone), email = COALESCE($5, email), address = COALESCE($6, address), province = COALESCE($7, province), city = COALESCE($8, city), district = COALESCE($9, district), customer_type = COALESCE($10, customer_type), industry = COALESCE($11, industry), scale = COALESCE($12, scale), credit_limit = COALESCE($13, credit_limit), status = COALESCE($14, status), updated_at = NOW(), name_en = COALESCE($16, name_en) WHERE id = $15 RETURNING id, code, CASE WHEN $17 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at"),
    )
    .bind(body.name)
    .bind(body.short_name)
    .bind(body.contact_person)
    .bind(body.contact_phone)
    .bind(body.email)
    .bind(body.address)
    .bind(body.province)
    .bind(body.city)
    .bind(body.district)
    .bind(body.customer_type)
    .bind(body.industry)
    .bind(body.scale)
    .bind(body.credit_limit)
    .bind(body.status)
    .bind(id)
    .bind(body.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "更新客户成功")),
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            Json(api_error(500, "更新客户失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/customers/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "delete_customer OK")
    ),
    tag = "ERP/customer"
)]
pub async fn delete_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.customers SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success("删除成功".to_string(), "删除客户成功"))
        }
        Ok(_) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            Json(api_error(500, "删除客户失败"))
        }
    }
}

// ============ #26: 批量/统计端点 ============

#[derive(Debug, Deserialize)]
struct BatchListRequest {
    ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct BatchCreateRequest {
    customers: Vec<CreateCustomerRequest>,
}

#[derive(Debug, Deserialize)]
struct BatchUpdateItem {
    id: Uuid,
    payload: UpdateCustomerRequest,
}

#[derive(Debug, Deserialize)]
struct BatchUpdateRequest {
    updates: Vec<BatchUpdateItem>,
}

#[derive(Debug, Deserialize)]
struct BatchDeleteRequest {
    ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
struct StatusUpdateRequest {
    status: String,
}

#[derive(Debug, Deserialize)]
struct BatchStatusRequest {
    ids: Vec<Uuid>,
    status: String,
}

#[derive(Debug, Deserialize)]
struct BatchCategoryRequest {
    ids: Vec<Uuid>,
    category: Option<String>,
    industry: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RecentParams {
    limit: Option<i64>,
}

#[derive(Debug, Serialize)]
struct CustomerStatsResponse {
    total: i64,
    active: i64,
    inactive: i64,
    blacklisted: i64,
    by_category: Vec<CategoryCount>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct CategoryCount {
    category: String,
    count: i64,
}

#[derive(Debug, Serialize)]
struct CustomerRecentResponse {
    customers: Vec<Customer>,
    total: i64,
    page: i64,
    page_size: i64,
}

fn customer_select_cols(locale_placeholder: &str) -> String {
    format!(
        "id, code, CASE WHEN {locale_placeholder} = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at"
    )
}

async fn batch_list_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<BatchListRequest>,
) -> Json<ApiResponse<Vec<Customer>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }
    if body.ids.is_empty() {
        return Json(ApiResponse::success(vec![], "批量查询成功"));
    }
    let uuids: Vec<Uuid> = body
        .ids
        .iter()
        .filter_map(|s| Uuid::parse_str(s).ok())
        .collect();
    if uuids.is_empty() {
        return Json(ApiResponse::success(vec![], "批量查询成功"));
    }
    let placeholders: Vec<String> = (1..=uuids.len()).map(|i| format!("${}", i)).collect();
    let locale_placeholder = format!("${}", uuids.len() + 1);
    let sql = format!(
        "SELECT {} FROM erp.customers WHERE deleted_at IS NULL AND id = ANY(array[{}]::uuid[])",
        customer_select_cols(&locale_placeholder),
        placeholders.join(",")
    );
    let mut query = sqlx::query_as::<_, Customer>(&sql);
    for id in &uuids {
        query = query.bind(id);
    }
    match query.fetch_all(&mut **txn).await {
        Ok(customers) => Json(ApiResponse::success(customers, "批量查询成功")),
        Err(e) => {
            tracing::error!("批量查询客户失败: {}", e);
            Json(api_error(500, "批量查询客户失败"))
        }
    }
}

async fn batch_create_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<BatchCreateRequest>,
) -> Json<ApiResponse<Vec<Customer>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }
    let mut created = Vec::new();
    for req in &body.customers {
        let result = sqlx::query_as::<_, Customer>(only_own_schema_query!(
            "erp",
            "INSERT INTO erp.customers (code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status, name_en) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id, code, CASE WHEN $17 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at"
        ))
        .bind(&req.code).bind(&req.name).bind(&req.short_name).bind(&req.contact_person)
        .bind(&req.contact_phone).bind(&req.email).bind(&req.address).bind(&req.province)
        .bind(&req.city).bind(&req.district).bind(&req.customer_type).bind(&req.industry)
        .bind(&req.scale).bind(default_credit_limit(req.credit_limit))
        .bind(default_customer_status(req.status.clone()))
        .bind(&req.name_en)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&mut **txn).await;
        if let Ok(Some(c)) = result {
            created.push(c);
        }
    }
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }
    Json(ApiResponse::success(created, "批量创建成功"))
}

async fn batch_update_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<BatchUpdateRequest>,
) -> Json<ApiResponse<Vec<Customer>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }
    let mut updated = Vec::new();
    for item in &body.updates {
        let result = sqlx::query_as::<_, Customer>(only_own_schema_query!(
            "erp",
            "UPDATE erp.customers SET name = COALESCE($1, name), short_name = COALESCE($2, short_name), contact_person = COALESCE($3, contact_person), contact_phone = COALESCE($4, contact_phone), email = COALESCE($5, email), address = COALESCE($6, address), province = COALESCE($7, province), city = COALESCE($8, city), district = COALESCE($9, district), customer_type = COALESCE($10, customer_type), industry = COALESCE($11, industry), scale = COALESCE($12, scale), credit_limit = COALESCE($13, credit_limit), status = COALESCE($14, status), updated_at = NOW(), name_en = COALESCE($16, name_en) WHERE id = $15 AND deleted_at IS NULL RETURNING id, code, CASE WHEN $17 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at"
        ))
        .bind(&item.payload.name).bind(&item.payload.short_name).bind(&item.payload.contact_person)
        .bind(&item.payload.contact_phone).bind(&item.payload.email).bind(&item.payload.address)
        .bind(&item.payload.province).bind(&item.payload.city).bind(&item.payload.district)
        .bind(&item.payload.customer_type).bind(&item.payload.industry).bind(&item.payload.scale)
        .bind(item.payload.credit_limit).bind(&item.payload.status).bind(item.id)
        .fetch_optional(&mut **txn).await;
        if let Ok(Some(c)) = result {
            updated.push(c);
        }
    }
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }
    Json(ApiResponse::success(updated, "批量更新成功"))
}

async fn batch_delete_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }
    if body.ids.is_empty() {
        return Json(ApiResponse::success("".to_string(), "批量删除成功"));
    }
    let placeholders: Vec<String> = (1..=body.ids.len()).map(|i| format!("${}", i)).collect();
    let sql = format!(
        "UPDATE erp.customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = ANY(array[{}]::uuid[]) AND deleted_at IS NULL",
        placeholders.join(",")
    );
    let mut query = sqlx::query(&sql);
    for id in &body.ids {
        query = query.bind(id);
    }
    match query.execute(&mut **txn).await {
        Ok(r) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(api_error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                format!("已删除 {} 条客户记录", r.rows_affected()),
                "批量删除成功",
            ))
        }
        Err(e) => {
            tracing::error!("批量删除客户失败: {}", e);
            Json(api_error(500, "批量删除客户失败"))
        }
    }
}

async fn change_customer_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<StatusUpdateRequest>,
) -> Json<ApiResponse<Customer>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }
    let result = sqlx::query_as::<_, Customer>(only_own_schema_query!(
        "erp",
        "UPDATE erp.customers SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id, code, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at"
    ))
    .bind(&body.status).bind(id).bind(Locale::from_headers(&headers).as_sql()).fetch_optional(&mut **txn).await;
    match result {
        Ok(Some(customer)) => {
            if let Some(t) = guard.take() {
                let _ = t.commit().await;
            }
            Json(ApiResponse::success(customer, "客户状态更新成功"))
        }
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("更新客户状态失败: {}", e);
            Json(api_error(500, "更新客户状态失败"))
        }
    }
}

async fn batch_change_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<BatchStatusRequest>,
) -> Json<ApiResponse<Vec<Customer>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }
    if body.ids.is_empty() {
        return Json(ApiResponse::success(vec![], "批量状态更新成功"));
    }
    let placeholders: Vec<String> = (2..=body.ids.len() + 1)
        .map(|i| format!("${}", i))
        .collect();
    let sql = format!(
        "UPDATE erp.customers SET status = $1, updated_at = NOW() WHERE id = ANY(array[{}]::uuid[]) AND deleted_at IS NULL RETURNING id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at",
        placeholders.join(",")
    );
    let mut query = sqlx::query_as::<_, Customer>(&sql);
    query = query.bind(&body.status);
    for id in &body.ids {
        query = query.bind(id);
    }
    match query.fetch_all(&mut **txn).await {
        Ok(customers) => {
            if let Some(t) = guard.take() {
                let _ = t.commit().await;
            }
            Json(ApiResponse::success(customers, "批量状态更新成功"))
        }
        Err(e) => {
            tracing::error!("批量更新客户状态失败: {}", e);
            Json(api_error(500, "批量更新客户状态失败"))
        }
    }
}

async fn batch_change_category(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<BatchCategoryRequest>,
) -> Json<ApiResponse<Vec<Customer>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }
    if body.ids.is_empty() {
        return Json(ApiResponse::success(vec![], "批量分类更新成功"));
    }
    let placeholders: Vec<String> = (3..=body.ids.len() + 2)
        .map(|i| format!("${}", i))
        .collect();
    let sql = format!(
        "UPDATE erp.customers SET customer_type = COALESCE($1, customer_type), industry = COALESCE($2, industry), updated_at = NOW() WHERE id = ANY(array[{}]::uuid[]) AND deleted_at IS NULL RETURNING id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at",
        placeholders.join(",")
    );
    let mut query = sqlx::query_as::<_, Customer>(&sql);
    query = query.bind(&body.category).bind(&body.industry);
    for id in &body.ids {
        query = query.bind(id);
    }
    match query.fetch_all(&mut **txn).await {
        Ok(customers) => {
            if let Some(t) = guard.take() {
                let _ = t.commit().await;
            }
            Json(ApiResponse::success(customers, "批量分类更新成功"))
        }
        Err(e) => {
            tracing::error!("批量更新客户分类失败: {}", e);
            Json(api_error(500, "批量更新客户分类失败"))
        }
    }
}

async fn get_customer_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<CustomerStatsResponse>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }
    let total: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.customers WHERE deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);
    let active: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.customers WHERE deleted_at IS NULL AND status = 'active'"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);
    let inactive: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.customers WHERE deleted_at IS NULL AND status = 'inactive'"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);
    let blacklisted: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.customers WHERE deleted_at IS NULL AND status = 'blacklisted'"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);
    let by_category: Vec<CategoryCount> = sqlx::query_as(only_own_schema_query!("erp", "SELECT customer_type AS category, COUNT(*) AS count FROM erp.customers WHERE deleted_at IS NULL GROUP BY customer_type ORDER BY count DESC")).fetch_all(&mut **txn).await.unwrap_or_default();
    Json(ApiResponse::success(
        CustomerStatsResponse {
            total,
            active,
            inactive,
            blacklisted,
            by_category,
        },
        "获取客户统计成功",
    ))
}

async fn list_recent_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<RecentParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<CustomerRecentResponse>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let customers: Vec<Customer> = sqlx::query_as(only_own_schema_query!("erp", "SELECT id, code, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit::float8 AS credit_limit, status, created_at, updated_at FROM erp.customers WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT $1")).bind(limit).bind(Locale::from_headers(&headers).as_sql()).fetch_all(&mut **txn).await.unwrap_or_default();
    let total: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.customers WHERE deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);
    Json(ApiResponse::success(
        CustomerRecentResponse {
            customers,
            total,
            page: 1,
            page_size: limit,
        },
        "获取最近客户成功",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_customer_list_params_deserialize() {
        let query = "status=active&customer_type=enterprise";
        let params: CustomerListParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.status.as_deref(), Some("active"));
        assert_eq!(params.customer_type.as_deref(), Some("enterprise"));
    }

    #[test]
    fn test_customer_list_params_default() {
        let query = "";
        let params: CustomerListParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.status.is_none());
        assert!(params.customer_type.is_none());
    }

    #[test]
    fn test_customer_list_params_only_status() {
        let query = "status=inactive";
        let params: CustomerListParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.status.as_deref(), Some("inactive"));
        assert!(params.customer_type.is_none());
    }

    #[test]
    fn test_customer_list_params_only_type() {
        let query = "customer_type=potential";
        let params: CustomerListParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.status.is_none());
        assert_eq!(params.customer_type.as_deref(), Some("potential"));
    }
}

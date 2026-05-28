mod models;
mod api;

use anyhow::Result;
use axum::{
    extract::{FromRef, Path, Query, State, HeaderMap},
    routing::{delete, get, post, put},
    Json,
    Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPoolOptions;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

use topems_shared::{ApiResponse, AuthState, api_error, auth_middleware, create_cors_layer};
use models::{
    CreateCustomerRequest, Customer, UpdateCustomerRequest,
    CreateContactRequest, Contact, UpdateContactRequest,
    CreateOpportunityRequest, Opportunity, UpdateOpportunityRequest,
    CreateInteractionRequest, Interaction, UpdateInteractionRequest,
};

use api::audit::log_audit_event;

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for sqlx::PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

#[derive(Debug, Deserialize)]
pub struct CustomerPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ContactPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct OpportunityPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub stage: Option<String>,
    pub customer_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct InteractionPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://xingzhai@localhost/topems_crm".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let audit_router = api::audit::create_routes(pool.clone()).await?;
    
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/customers", get(list_customers).post(create_customer))
        .route("/api/v1/customers/{id}", get(get_customer).put(update_customer).delete(delete_customer))
        .route("/api/v1/contacts", get(list_contacts).post(create_contact))
        .route("/api/v1/contacts/{id}", get(get_contact).put(update_contact).delete(delete_contact))
        .route("/api/v1/opportunities", get(list_opportunities).post(create_opportunity))
        .route("/api/v1/opportunities/{id}", get(get_opportunity).put(update_opportunity).delete(delete_opportunity))
        .route("/api/v1/interactions", get(list_interactions).post(create_interaction))
        .route("/api/v1/interactions/{id}", get(get_interaction).put(update_interaction).delete(delete_interaction))
        .merge(audit_router)
        .with_state(app_state.clone())
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8009".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-CRM 客户关系管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-CRM is running", "健康检查"))
}

// Customers
async fn list_customers(
    State(pool): State<sqlx::PgPool>,
    Query(params): Query<CustomerPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        FROM customers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(customers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM customers
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "customers": customers,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取客户列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取客户列表失败: {}", e);
            Json(api_error(500, "获取客户列表失败"))
        }
    }
}

async fn create_customer(
    State(pool): State<sqlx::PgPool>,
    headers: HeaderMap,
    Json(req): Json<CreateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO customers (
            id, name, code, industry, website, email, phone, address, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        RETURNING id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.industry)
    .bind(&req.website)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(&req.address)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(customer) => (
            Json(ApiResponse::success(customer.clone(), "客户创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            (
                Json(api_error(500, "客户创建失败")),
                "error",
                Some(e.to_string())
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
        &pool,
        "create".to_string(),
        "customer".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_customer(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Customer>> {
    let result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        FROM customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "获取客户成功")),
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("获取客户失败: {}", e);
            Json(api_error(500, "获取客户失败"))
        }
    }
}

async fn update_customer(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    let existing = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at FROM customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let industry = req.industry.or(existing.industry);
    let website = req.website.or(existing.website);
    let email = req.email.or(existing.email);
    let phone = req.phone.or(existing.phone);
    let address = req.address.or(existing.address);
    let status = req.status.unwrap_or(existing.status);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Customer>(
        r#"
        UPDATE customers SET
            name = $2, code = $3, industry = $4, website = $5, email = $6, phone = $7, address = $8, 
            status = $9, notes = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&industry)
    .bind(&website)
    .bind(&email)
    .bind(&phone)
    .bind(&address)
    .bind(&status)
    .bind(&notes)
    .bind(now)
    .fetch_one(&pool)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(customer) => (
            Json(ApiResponse::success(customer.clone(), "客户更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            (
                Json(api_error(500, "客户更新失败")),
                "error",
                Some(e.to_string())
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
        &pool,
        "update".to_string(),
        "customer".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_customer(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM customers WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "客户删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "客户不存在")),
            "error",
            Some("客户不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            (
                Json(api_error(500, "客户删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &pool,
        "delete".to_string(),
        "customer".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

// Contacts
async fn list_contacts(
    State(pool): State<sqlx::PgPool>,
    Query(params): Query<ContactPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
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
    .fetch_all(&pool)
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
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "contacts": contacts,
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
    State(pool): State<sqlx::PgPool>,
    headers: HeaderMap,
    Json(req): Json<CreateContactRequest>,
) -> Json<ApiResponse<Contact>> {
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
    .fetch_one(&pool)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contact) => (
            Json(ApiResponse::success(contact.clone(), "联系人创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建联系人失败: {}", e);
            (
                Json(api_error(500, "联系人创建失败")),
                "error",
                Some(e.to_string())
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
        &pool,
        "create".to_string(),
        "contact".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_contact(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Contact>> {
    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
        FROM contacts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
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
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    let existing = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at FROM contacts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "联系人不存在")),
        Err(e) => return Json(api_error(500, &format!("查询联系人失败: {}", e))),
    };

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
    .fetch_one(&pool)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contact) => (
            Json(ApiResponse::success(contact.clone(), "联系人更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新联系人失败: {}", e);
            (
                Json(api_error(500, "联系人更新失败")),
                "error",
                Some(e.to_string())
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
        &pool,
        "update".to_string(),
        "contact".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_contact(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM contacts WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "联系人删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "联系人不存在")),
            "error",
            Some("联系人不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除联系人失败: {}", e);
            (
                Json(api_error(500, "联系人删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &pool,
        "delete".to_string(),
        "contact".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

// Opportunities
async fn list_opportunities(
    State(pool): State<sqlx::PgPool>,
    Query(params): Query<OpportunityPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let stage_filter = params.stage.clone();
    let customer_filter = params.customer_id;

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        FROM opportunities
        WHERE ($1::text IS NULL OR name ILIKE $1)
          AND ($2::text IS NULL OR stage = $2)
          AND ($3::uuid IS NULL OR customer_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&stage_filter)
    .bind(&customer_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(opportunities) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM opportunities
                WHERE ($1::text IS NULL OR name ILIKE $1)
                  AND ($2::text IS NULL OR stage = $2)
                  AND ($3::uuid IS NULL OR customer_id = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&stage_filter)
            .bind(&customer_filter)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "opportunities": opportunities,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取销售机会列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取销售机会列表失败: {}", e);
            Json(api_error(500, "获取销售机会列表失败"))
        }
    }
}

async fn create_opportunity(
    State(pool): State<sqlx::PgPool>,
    headers: HeaderMap,
    Json(req): Json<CreateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        INSERT INTO opportunities (
            id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'prospecting', $5, $6, $7, $8, $9)
        RETURNING id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.customer_id)
    .bind(req.value)
    .bind(req.probability)
    .bind(&req.close_date)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opportunity) => (
            Json(ApiResponse::success(opportunity.clone(), "销售机会创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(opportunity) = &result {
        serde_json::to_value(opportunity).ok()
    } else {
        None
    };

    log_audit_event(
        &pool,
        "create".to_string(),
        "opportunity".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_opportunity(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Opportunity>> {
    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        FROM opportunities WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(opportunity)) => Json(ApiResponse::success(opportunity, "获取销售机会成功")),
        Ok(None) => Json(api_error(404, "销售机会不存在")),
        Err(e) => {
            tracing::error!("获取销售机会失败: {}", e);
            Json(api_error(500, "获取销售机会失败"))
        }
    }
}

async fn update_opportunity(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    let existing = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at FROM opportunities WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "销售机会不存在")),
        Err(e) => return Json(api_error(500, &format!("查询销售机会失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let customer_id = req.customer_id.or(existing.customer_id);
    let value = req.value.or(existing.value);
    let stage = req.stage.unwrap_or(existing.stage);
    let probability = req.probability.or(existing.probability);
    let close_date = req.close_date.or(existing.close_date);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        UPDATE opportunities SET
            name = $2, customer_id = $3, value = $4, stage = $5, probability = $6, 
            close_date = $7, notes = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&customer_id)
    .bind(value)
    .bind(&stage)
    .bind(probability)
    .bind(&close_date)
    .bind(&notes)
    .bind(now)
    .fetch_one(&pool)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opportunity) => (
            Json(ApiResponse::success(opportunity.clone(), "销售机会更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(opportunity) = &result {
        serde_json::to_value(opportunity).ok()
    } else {
        None
    };

    log_audit_event(
        &pool,
        "update".to_string(),
        "opportunity".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_opportunity(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM opportunities WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "销售机会删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "销售机会不存在")),
            "error",
            Some("销售机会不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &pool,
        "delete".to_string(),
        "opportunity".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

// Interactions
async fn list_interactions(
    State(pool): State<sqlx::PgPool>,
    Query(params): Query<InteractionPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_filter = params.customer_id;
    let contact_filter = params.contact_id;

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM interactions
        WHERE ($1::text IS NULL OR subject ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR customer_id = $3)
          AND ($4::uuid IS NULL OR contact_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&customer_filter)
    .bind(&contact_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(interactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM interactions
                WHERE ($1::text IS NULL OR subject ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR customer_id = $3)
                  AND ($4::uuid IS NULL OR contact_id = $4)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&customer_filter)
            .bind(&contact_filter)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "interactions": interactions,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取交互记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取交互记录列表失败: {}", e);
            Json(api_error(500, "获取交互记录列表失败"))
        }
    }
}

async fn create_interaction(
    State(pool): State<sqlx::PgPool>,
    headers: HeaderMap,
    Json(req): Json<CreateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        INSERT INTO interactions (
            id, customer_id, contact_id, type, subject, content, scheduled_at, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, $10)
        RETURNING id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.customer_id)
    .bind(&req.contact_id)
    .bind(&req.type_)
    .bind(&req.subject)
    .bind(&req.content)
    .bind(&req.scheduled_at)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(interaction) => (
            Json(ApiResponse::success(interaction.clone(), "交互记录创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建交互记录失败: {}", e);
            (
                Json(api_error(500, "交互记录创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(interaction) = &result {
        serde_json::to_value(interaction).ok()
    } else {
        None
    };

    log_audit_event(
        &pool,
        "create".to_string(),
        "interaction".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_interaction(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Interaction>> {
    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM interactions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(interaction)) => Json(ApiResponse::success(interaction, "获取交互记录成功")),
        Ok(None) => Json(api_error(404, "交互记录不存在")),
        Err(e) => {
            tracing::error!("获取交互记录失败: {}", e);
            Json(api_error(500, "获取交互记录失败"))
        }
    }
}

async fn update_interaction(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let existing = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at FROM interactions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "交互记录不存在")),
        Err(e) => return Json(api_error(500, &format!("查询交互记录失败: {}", e))),
    };

    let type_ = req.type_.unwrap_or(existing.type_);
    let subject = req.subject.or(existing.subject);
    let content = req.content.or(existing.content);
    let scheduled_at = req.scheduled_at.or(existing.scheduled_at);
    let completed_at = req.completed_at.or(existing.completed_at);
    let status = req.status.unwrap_or(existing.status);
    let customer_id = req.customer_id.or(existing.customer_id);
    let contact_id = req.contact_id.or(existing.contact_id);
    let _notes = req.notes;
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        UPDATE interactions SET
            type = $2, subject = $3, content = $4, scheduled_at = $5, completed_at = $6, 
            status = $7, customer_id = $8, contact_id = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&type_)
    .bind(&subject)
    .bind(&content)
    .bind(&scheduled_at)
    .bind(&completed_at)
    .bind(&status)
    .bind(&customer_id)
    .bind(&contact_id)
    .bind(now)
    .fetch_one(&pool)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(interaction) => (
            Json(ApiResponse::success(interaction.clone(), "交互记录更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新交互记录失败: {}", e);
            (
                Json(api_error(500, "交互记录更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(interaction) = &result {
        serde_json::to_value(interaction).ok()
    } else {
        None
    };

    log_audit_event(
        &pool,
        "update".to_string(),
        "interaction".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_interaction(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM interactions WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "交互记录删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "交互记录不存在")),
            "error",
            Some("交互记录不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除交互记录失败: {}", e);
            (
                Json(api_error(500, "交互记录删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &pool,
        "delete".to_string(),
        "interaction".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            industry VARCHAR(100),
            website VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address VARCHAR(500),
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS contacts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_id UUID REFERENCES customers(id),
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100),
            email VARCHAR(255),
            phone VARCHAR(50),
            position VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS opportunities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            customer_id UUID REFERENCES customers(id),
            value NUMERIC(15,2),
            stage VARCHAR(50) NOT NULL DEFAULT 'prospecting',
            probability INTEGER,
            close_date TIMESTAMPTZ,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS interactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_id UUID REFERENCES customers(id),
            contact_id UUID REFERENCES contacts(id),
            type VARCHAR(50) NOT NULL,
            subject VARCHAR(255),
            content TEXT,
            scheduled_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID,
            entity_ids JSONB,
            user_id VARCHAR(255),
            user_name VARCHAR(255),
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(50) NOT NULL,
            error_message TEXT,
            ip_address VARCHAR(255),
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status)"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

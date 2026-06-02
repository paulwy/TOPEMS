use anyhow::Result;
use axum::{
    extract::{FromRef, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPoolOptions;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

use topems_shared::{ApiResponse, AuthState, api_error, auth_middleware, create_cors_layer};

// 模型定义，直接在这里
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct Customer {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CustomerPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

// 联系人相关
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct Contact {
    pub id: Uuid,
    pub customer_id: Option<Uuid>,
    pub first_name: String,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateContactRequest {
    pub customer_id: Option<Uuid>,
    pub first_name: String,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContactRequest {
    pub customer_id: Option<Uuid>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ContactPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
}

// 商机相关
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct Opportunity {
    pub id: Uuid,
    pub name: String,
    pub customer_id: Option<Uuid>,
    pub value: Option<rust_decimal::Decimal>,
    pub stage: String,
    pub probability: Option<i32>,
    pub close_date: Option<chrono::DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOpportunityRequest {
    pub name: String,
    pub customer_id: Option<Uuid>,
    pub value: Option<rust_decimal::Decimal>,
    pub stage: Option<String>,
    pub probability: Option<i32>,
    pub close_date: Option<chrono::DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOpportunityRequest {
    pub name: Option<String>,
    pub customer_id: Option<Uuid>,
    pub value: Option<rust_decimal::Decimal>,
    pub stage: Option<String>,
    pub probability: Option<i32>,
    pub close_date: Option<chrono::DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OpportunityPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub stage: Option<String>,
}

// 交互相关
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct Interaction {
    pub id: Uuid,
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub interaction_type: String,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub scheduled_at: Option<chrono::DateTime<Utc>>,
    pub completed_at: Option<chrono::DateTime<Utc>>,
    pub status: String,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInteractionRequest {
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub interaction_type: String,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub scheduled_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInteractionRequest {
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub interaction_type: Option<String>,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub scheduled_at: Option<chrono::DateTime<Utc>>,
    pub completed_at: Option<chrono::DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InteractionPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
}

// 审计日志相关
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListAuditLogsQuery {
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

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

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE,
            industry VARCHAR(100),
            website VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
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
            name VARCHAR(255) NOT NULL,
            position VARCHAR(100),
            email VARCHAR(255),
            phone VARCHAR(50),
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
            customer_id UUID REFERENCES customers(id),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            value NUMERIC(15,2),
            probability INT DEFAULT 0,
            stage VARCHAR(50) DEFAULT 'lead',
            expected_close_date DATE,
            status VARCHAR(50) DEFAULT 'open',
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
            type VARCHAR(50) NOT NULL,
            description TEXT,
            outcome VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    tracing::info!("✅ CRM 数据库表初始化完成");
    Ok(())
}

// 处理函数定义
async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-CRM is running", "健康检查"))
}

// 客户处理函数
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

    match result {
        Ok(customer) => Json(ApiResponse::success(customer, "客户创建成功")),
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            Json(api_error(500, "客户创建失败"))
        }
    }
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

    match result {
        Ok(customer) => Json(ApiResponse::success(customer, "客户更新成功")),
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            Json(api_error(500, "客户更新失败"))
        }
    }
}

async fn delete_customer(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM customers WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "客户删除成功")),
        Ok(_) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            Json(api_error(500, "客户删除失败"))
        }
    }
}

// 联系人处理函数
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

    match result {
        Ok(contact) => Json(ApiResponse::success(contact, "联系人创建成功")),
        Err(e) => {
            tracing::error!("创建联系人失败: {}", e);
            Json(api_error(500, "联系人创建失败"))
        }
    }
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

    match result {
        Ok(contact) => Json(ApiResponse::success(contact, "联系人更新成功")),
        Err(e) => {
            tracing::error!("更新联系人失败: {}", e);
            Json(api_error(500, "联系人更新失败"))
        }
    }
}

async fn delete_contact(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM contacts WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "联系人删除成功")),
        Ok(_) => Json(api_error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("删除联系人失败: {}", e);
            Json(api_error(500, "联系人删除失败"))
        }
    }
}

// 商机处理函数
async fn list_opportunities(
    State(pool): State<sqlx::PgPool>,
    Query(params): Query<OpportunityPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let stage_filter = params.stage.clone();

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        FROM opportunities
        WHERE ($1::text IS NULL OR name ILIKE $1)
          AND ($2::text IS NULL OR stage = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&stage_filter)
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
                "#,
            )
            .bind(&search_pattern)
            .bind(&stage_filter)
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
                "获取商机列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取商机列表失败: {}", e);
            Json(api_error(500, "获取商机列表失败"))
        }
    }
}

async fn create_opportunity(
    State(pool): State<sqlx::PgPool>,
    Json(req): Json<CreateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let stage = req.stage.unwrap_or_else(|| "prospecting".to_string());

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        INSERT INTO opportunities (
            id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.customer_id)
    .bind(&req.value)
    .bind(&stage)
    .bind(&req.probability)
    .bind(&req.close_date)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(opportunity) => Json(ApiResponse::success(opportunity, "商机创建成功")),
        Err(e) => {
            tracing::error!("创建商机失败: {}", e);
            Json(api_error(500, "商机创建失败"))
        }
    }
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
        Ok(Some(opportunity)) => Json(ApiResponse::success(opportunity, "获取商机成功")),
        Ok(None) => Json(api_error(404, "商机不存在")),
        Err(e) => {
            tracing::error!("获取商机失败: {}", e);
            Json(api_error(500, "获取商机失败"))
        }
    }
}

async fn update_opportunity(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
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
        Ok(None) => return Json(api_error(404, "商机不存在")),
        Err(e) => return Json(api_error(500, &format!("查询商机失败: {}", e))),
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
            name = $2, customer_id = $3, value = $4, stage = $5, probability = $6, close_date = $7, notes = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&customer_id)
    .bind(&value)
    .bind(&stage)
    .bind(&probability)
    .bind(&close_date)
    .bind(&notes)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(opportunity) => Json(ApiResponse::success(opportunity, "商机更新成功")),
        Err(e) => {
            tracing::error!("更新商机失败: {}", e);
            Json(api_error(500, "商机更新失败"))
        }
    }
}

async fn delete_opportunity(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM opportunities WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "商机删除成功")),
        Ok(_) => Json(api_error(404, "商机不存在")),
        Err(e) => {
            tracing::error!("删除商机失败: {}", e);
            Json(api_error(500, "商机删除失败"))
        }
    }
}

// 交互处理函数
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

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as interaction_type, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM interactions
        WHERE ($1::text IS NULL OR subject ILIKE $1 OR content ILIKE $1)
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
        Ok(interactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM interactions
                WHERE ($1::text IS NULL OR subject ILIKE $1 OR content ILIKE $1)
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
                    "interactions": interactions,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取交互列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取交互列表失败: {}", e);
            Json(api_error(500, "获取交互列表失败"))
        }
    }
}

async fn create_interaction(
    State(pool): State<sqlx::PgPool>,
    Json(req): Json<CreateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        INSERT INTO interactions (
            id, customer_id, contact_id, type, subject, content, scheduled_at, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8, $9)
        RETURNING id, customer_id, contact_id, type as interaction_type, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.customer_id)
    .bind(&req.contact_id)
    .bind(&req.interaction_type)
    .bind(&req.subject)
    .bind(&req.content)
    .bind(&req.scheduled_at)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(interaction) => Json(ApiResponse::success(interaction, "交互创建成功")),
        Err(e) => {
            tracing::error!("创建交互失败: {}", e);
            Json(api_error(500, "交互创建失败"))
        }
    }
}

async fn get_interaction(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Interaction>> {
    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as interaction_type, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM interactions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(interaction)) => Json(ApiResponse::success(interaction, "获取交互成功")),
        Ok(None) => Json(api_error(404, "交互不存在")),
        Err(e) => {
            tracing::error!("获取交互失败: {}", e);
            Json(api_error(500, "获取交互失败"))
        }
    }
}

async fn update_interaction(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let existing = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as interaction_type, subject, content, scheduled_at, completed_at, status, created_at, updated_at FROM interactions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "交互不存在")),
        Err(e) => return Json(api_error(500, &format!("查询交互失败: {}", e))),
    };

    let interaction_type = req.interaction_type.unwrap_or(existing.interaction_type);
    let customer_id = req.customer_id.or(existing.customer_id);
    let contact_id = req.contact_id.or(existing.contact_id);
    let subject = req.subject.or(existing.subject);
    let content = req.content.or(existing.content);
    let scheduled_at = req.scheduled_at.or(existing.scheduled_at);
    let completed_at = req.completed_at.or(existing.completed_at);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        UPDATE interactions SET
            customer_id = $2, contact_id = $3, type = $4, subject = $5, content = $6,
            scheduled_at = $7, completed_at = $8, status = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, customer_id, contact_id, type as interaction_type, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&customer_id)
    .bind(&contact_id)
    .bind(&interaction_type)
    .bind(&subject)
    .bind(&content)
    .bind(&scheduled_at)
    .bind(&completed_at)
    .bind(&status)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(interaction) => Json(ApiResponse::success(interaction, "交互更新成功")),
        Err(e) => {
            tracing::error!("更新交互失败: {}", e);
            Json(api_error(500, "交互更新失败"))
        }
    }
}

async fn delete_interaction(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM interactions WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "交互删除成功")),
        Ok(_) => Json(api_error(404, "交互不存在")),
        Err(e) => {
            tracing::error!("删除交互失败: {}", e);
            Json(api_error(500, "交互删除失败"))
        }
    }
}

// 审计日志处理函数
async fn list_audit_logs(
    State(pool): State<sqlx::PgPool>,
    Query(params): Query<ListAuditLogsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR entity_type = $2)
          AND ($3::text IS NULL OR user_id = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamptz)
          AND ($6::text IS NULL OR created_at <= $6::timestamptz)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.user_id)
    .bind(&params.status)
    .bind(params.start_date.clone())
    .bind(params.end_date.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(logs) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM audit_logs
                WHERE ($1::text IS NULL OR action = $1)
                  AND ($2::text IS NULL OR entity_type = $2)
                  AND ($3::text IS NULL OR user_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR created_at >= $5::timestamptz)
                  AND ($6::text IS NULL OR created_at <= $6::timestamptz)
                "#,
            )
            .bind(&params.action)
            .bind(&params.entity_type)
            .bind(&params.user_id)
            .bind(&params.status)
            .bind(params.start_date)
            .bind(params.end_date)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "audit_logs": logs,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取审计日志成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(ApiResponse::error(500, "获取审计日志失败"))
        }
    }
}

async fn get_audit_log(
    State(pool): State<sqlx::PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AuditLog>> {
    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM audit_logs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(log)) => Json(ApiResponse::success(log, "获取审计日志成功")),
        Ok(None) => Json(ApiResponse::error(404, "审计日志不存在")),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(ApiResponse::error(500, "获取审计日志失败"))
        }
    }
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
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/customers", get(list_customers))
        .route("/api/v1/customers/{id}", get(get_customer))
        .route("/api/v1/contacts", get(list_contacts))
        .route("/api/v1/contacts/{id}", get(get_contact))
        .route("/api/v1/opportunities", get(list_opportunities))
        .route("/api/v1/opportunities/{id}", get(get_opportunity))
        .route("/api/v1/interactions", get(list_interactions))
        .route("/api/v1/interactions/{id}", get(get_interaction))
        .with_state(app_state.pool.clone());

    let app = Router::new()
        .merge(public_routes)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8013".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-CRM 客户关系管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

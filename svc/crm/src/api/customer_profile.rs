use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::models::Customer;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Serialize)]
pub struct CustomerProfile {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub province: Option<String>,
    pub country: Option<String>,
    pub status: String,
    pub customer_type: Option<String>,
    pub source: Option<String>,
    pub rating: Option<String>,
    pub revenue: Option<f64>,
    pub employee_count: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub score: Option<CustomerScoreSummary>,
    pub opportunities: Vec<OpportunitySummary>,
    pub interactions: Vec<InteractionSummary>,
    pub contacts: Vec<ContactSummary>,
    pub profile_tags: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CustomerScoreSummary {
    pub score: i32,
    pub score_level: String,
    pub trend: String,
    pub scoring_date: DateTime<Utc>,
    pub factors: serde_json::Value,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OpportunitySummary {
    pub id: Uuid,
    pub name: String,
    pub value: Option<Decimal>,
    pub stage: String,
    pub probability: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct InteractionSummary {
    pub id: Uuid,
    pub type_: String,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ContactSummary {
    pub id: Uuid,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProfileQueryParams {
    pub include_opportunities: Option<bool>,
    pub include_interactions: Option<bool>,
    pub include_contacts: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AddProfileTagRequest {
    pub tags: Vec<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/crm/customers/:id/profile", get(get_customer_profile))
        .route("/api/crm/customers/:id/profile/tags", post(add_profile_tags))
        .route("/api/crm/customers/:id/profile/tags", delete(remove_profile_tags))
        .route("/api/crm/customer-profiles", get(list_customer_profiles))
}

async fn get_customer_profile(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Query(params): Query<ProfileQueryParams>,
) -> Json<ApiResponse<CustomerProfile>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let customer_result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, company_size, website, email, phone, fax,
               address, city, province, country, postal_code, status, customer_type,
               source, rating, revenue, employee_count, notes, created_at, updated_at
        FROM crm.customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let customer = match customer_result {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("获取客户信息失败: {}", e);
            return Json(api_error(500, "获取客户信息失败"));
        }
    };

    let score = fetch_customer_score(&state.db, id).await;

    let opportunities = if params.include_opportunities.unwrap_or(true) {
        fetch_customer_opportunities(&state.db, id).await
    } else {
        Vec::new()
    };

    let interactions = if params.include_interactions.unwrap_or(true) {
        fetch_customer_interactions(&state.db, id).await
    } else {
        Vec::new()
    };

    let contacts = if params.include_contacts.unwrap_or(true) {
        fetch_customer_contacts(&state.db, id).await
    } else {
        Vec::new()
    };

    let profile_tags = generate_profile_tags(&customer, &score, &opportunities);

    let profile = CustomerProfile {
        id: customer.id,
        name: customer.name,
        code: customer.code,
        industry: customer.industry,
        company_size: customer.company_size,
        website: customer.website,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        province: customer.province,
        country: customer.country,
        status: customer.status,
        customer_type: customer.customer_type,
        source: customer.source,
        rating: customer.rating,
        revenue: customer.revenue,
        employee_count: customer.employee_count,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        score,
        opportunities,
        interactions,
        contacts,
        profile_tags,
    };

    Json(ApiResponse::success(profile, "获取客户画像成功"))
}

async fn fetch_customer_score(db: &sqlx::PgPool, customer_id: Uuid) -> Option<CustomerScoreSummary> {
    let result = sqlx::query(
        r#"
        SELECT score, score_level, trend, scoring_date, factors
        FROM plugin_crm.customer_scores
        WHERE customer_id = $1
        ORDER BY scoring_date DESC
        LIMIT 1
        "#,
    )
    .bind(customer_id)
    .fetch_optional(db)
    .await;

    match result {
        Ok(Some(row)) => Some(CustomerScoreSummary {
            score: row.get(0),
            score_level: row.get(1),
            trend: row.get(2),
            scoring_date: row.get(3),
            factors: row.get(4),
        }),
        _ => None,
    }
}

async fn fetch_customer_opportunities(db: &sqlx::PgPool, customer_id: Uuid) -> Vec<OpportunitySummary> {
    let result = sqlx::query_as::<_, OpportunitySummary>(
        r#"
        SELECT id, name, value, stage, probability, close_date
        FROM plugin_crm.opportunities
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
        "#,
    )
    .bind(customer_id)
    .fetch_all(db)
    .await;

    match result {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("获取客户商机失败: {}", e);
            Vec::new()
        }
    }
}

async fn fetch_customer_interactions(db: &sqlx::PgPool, customer_id: Uuid) -> Vec<InteractionSummary> {
    let result = sqlx::query_as::<_, InteractionSummary>(
        r#"
        SELECT id, type_ as "type_", subject, content, scheduled_at, completed_at, status, created_at
        FROM plugin_crm.interactions
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
        "#,
    )
    .bind(customer_id)
    .fetch_all(db)
    .await;

    match result {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("获取客户互动记录失败: {}", e);
            Vec::new()
        }
    }
}

async fn fetch_customer_contacts(db: &sqlx::PgPool, customer_id: Uuid) -> Vec<ContactSummary> {
    let result = sqlx::query_as::<_, ContactSummary>(
        r#"
        SELECT id, name, email, phone, position, department
        FROM crm.contacts
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
        "#,
    )
    .bind(customer_id)
    .fetch_all(db)
    .await;

    match result {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("获取客户联系人失败: {}", e);
            Vec::new()
        }
    }
}

fn generate_profile_tags(customer: &Customer, score: &Option<CustomerScoreSummary>, opportunities: &[OpportunitySummary]) -> Vec<String> {
    let mut tags = Vec::new();

    tags.push(format!("状态: {}", customer.status));

    if let Some(industry) = &customer.industry {
        tags.push(format!("行业: {}", industry));
    }

    if let Some(company_size) = &customer.company_size {
        tags.push(format!("规模: {}", company_size));
    }

    if let Some(rating) = &customer.rating {
        tags.push(format!("评级: {}", rating));
    }

    if let Some(score) = score {
        tags.push(format!("评分等级: {}", score.score_level));
        tags.push(format!("评分趋势: {}", score.trend));
    }

    if !opportunities.is_empty() {
        let total_value: Decimal = opportunities.iter().filter_map(|o| o.value).sum();
        tags.push(format!("商机数量: {}", opportunities.len()));
        tags.push(format!("商机总值: {}", total_value));
    }

    if let Some(revenue) = customer.revenue {
        if revenue >= 1_000_000.0 {
            tags.push("高价值客户".to_string());
        } else if revenue >= 100_000.0 {
            tags.push("中价值客户".to_string());
        } else {
            tags.push("潜力客户".to_string());
        }
    }

    tags
}

async fn add_profile_tags(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AddProfileTagRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    for tag in &req.tags {
        let result = sqlx::query(
            r#"
            INSERT INTO plugin_crm.customer_tags (customer_id, tag, created_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (customer_id, tag) DO NOTHING
            "#,
        )
        .bind(id)
        .bind(tag)
        .bind(Utc::now())
        .execute(&state.db)
        .await;

        if let Err(e) = result {
            tracing::error!("添加标签失败: {}", e);
            return Json(api_error(500, "添加标签失败"));
        }
    }

    Json(ApiResponse::success("".to_string(), "标签添加成功"))
}

async fn remove_profile_tags(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AddProfileTagRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    for tag in &req.tags {
        let result = sqlx::query(
            "DELETE FROM plugin_crm.customer_tags WHERE customer_id = $1 AND tag = $2",
        )
        .bind(id)
        .bind(tag)
        .execute(&state.db)
        .await;

        if let Err(e) = result {
            tracing::error!("删除标签失败: {}", e);
            return Json(api_error(500, "删除标签失败"));
        }
    }

    Json(ApiResponse::success("".to_string(), "标签删除成功"))
}

async fn list_customer_profiles(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CustomerPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));

    let customers_result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, company_size, website, email, phone, fax,
               address, city, province, country, postal_code, status, customer_type,
               source, rating, revenue, employee_count, notes, created_at, updated_at
        FROM crm.customers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR customer_type = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&params.status)
    .bind(&params.customer_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match customers_result {
        Ok(customers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.customers
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR customer_type = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&params.status)
            .bind(&params.customer_type)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            let mut profiles = Vec::new();
            for customer in customers {
                let score = fetch_customer_score(&state.db, customer.id).await;
                let opportunities = fetch_customer_opportunities(&state.db, customer.id).await;
                let interactions = fetch_customer_interactions(&state.db, customer.id).await;
                let contacts = fetch_customer_contacts(&state.db, customer.id).await;
                let profile_tags = generate_profile_tags(&customer, &score, &opportunities);

                profiles.push(CustomerProfile {
                    id: customer.id,
                    name: customer.name,
                    code: customer.code,
                    industry: customer.industry,
                    company_size: customer.company_size,
                    website: customer.website,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    city: customer.city,
                    province: customer.province,
                    country: customer.country,
                    status: customer.status,
                    customer_type: customer.customer_type,
                    source: customer.source,
                    rating: customer.rating,
                    revenue: customer.revenue,
                    employee_count: customer.employee_count,
                    created_at: customer.created_at,
                    updated_at: customer.updated_at,
                    score,
                    opportunities,
                    interactions,
                    contacts,
                    profile_tags,
                });
            }

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": profiles,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取客户画像列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取客户画像列表失败: {}", e);
            Json(api_error(500, "获取客户画像列表失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CustomerPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_type: Option<String>,
}
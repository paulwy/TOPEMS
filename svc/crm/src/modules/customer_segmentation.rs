use axum::{
    extract::{Extension, Query, State},
    routing::{delete, get},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CustomerSegment {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub criteria: serde_json::Value,
    pub customer_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SegmentResult {
    pub segment: CustomerSegment,
    pub customers: Vec<SegmentedCustomer>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SegmentedCustomer {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub status: String,
    pub score: Option<i32>,
    pub score_level: Option<String>,
    pub revenue: Option<f64>,
    pub segment_tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSegmentRequest {
    pub name: String,
    pub description: Option<String>,
    pub criteria: SegmentCriteria,
}

#[derive(Debug, Deserialize, Serialize, Default)]
pub struct SegmentCriteria {
    pub score_levels: Option<Vec<String>>,
    pub industries: Option<Vec<String>>,
    pub company_sizes: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
    pub customer_types: Option<Vec<String>>,
    pub revenue_min: Option<f64>,
    pub revenue_max: Option<f64>,
    pub score_min: Option<i32>,
    pub score_max: Option<i32>,
    pub interaction_min: Option<i32>,
    pub opportunity_min: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct SegmentQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/segments", get(list_segments).post(create_segment))
        .route("/segments/{id}", get(get_segment))
        .route("/segments/{id}/customers", get(get_segment_customers))
        .route("/segments/{id}", delete(delete_segment))
        .route("/segments/auto", get(auto_segment))
}

async fn list_segments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SegmentQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, CustomerSegment>(
        r#"
        SELECT id, name, description, criteria, customer_count, created_at, updated_at
        FROM plugin_crm.customer_segments
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(segments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM plugin_crm.customer_segments WHERE deleted_at IS NULL",
            )
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": segments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取客户分群列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取客户分群列表失败: {}", e);
            Json(api_error(500, "获取客户分群列表失败"))
        }
    }
}

async fn get_segment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<CustomerSegment>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, CustomerSegment>(
        r#"
        SELECT id, name, description, criteria, customer_count, created_at, updated_at
        FROM plugin_crm.customer_segments WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(segment)) => Json(ApiResponse::success(segment, "获取客户分群成功")),
        Ok(None) => Json(api_error(404, "客户分群不存在")),
        Err(e) => {
            tracing::error!("获取客户分群失败: {}", e);
            Json(api_error(500, "获取客户分群失败"))
        }
    }
}

async fn create_segment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSegmentRequest>,
) -> Json<ApiResponse<CustomerSegment>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.name.is_empty() {
        return Json(api_error(400, "分群名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let criteria_json = serde_json::to_value(&req.criteria).unwrap_or(serde_json::json!({}));

    let customer_count = count_matching_customers(&state.db, &req.criteria).await;

    let result = sqlx::query_as::<_, CustomerSegment>(
        r#"
        INSERT INTO plugin_crm.customer_segments (id, name, description, criteria, customer_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, description, criteria, customer_count, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&criteria_json)
    .bind(customer_count)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(segment) => Json(ApiResponse::success(segment, "客户分群创建成功")),
        Err(e) => {
            tracing::error!("创建客户分群失败: {}", e);
            Json(api_error(500, "创建客户分群失败"))
        }
    }
}

async fn delete_segment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result =
        sqlx::query("UPDATE plugin_crm.customer_segments SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "客户分群删除成功"))
        }
        Ok(_) => Json(api_error(404, "客户分群不存在")),
        Err(e) => {
            tracing::error!("删除客户分群失败: {}", e);
            Json(api_error(500, "删除客户分群失败"))
        }
    }
}

async fn get_segment_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Query(params): Query<SegmentQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let segment_result =
        sqlx::query("SELECT name, criteria FROM plugin_crm.customer_segments WHERE deleted_at IS NULL AND id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await;

    let (segment_name, criteria) = match segment_result {
        Ok(Some(s)) => (s.get::<String, _>(0), s.get::<serde_json::Value, _>(1)),
        Ok(None) => return Json(api_error(404, "客户分群不存在")),
        Err(e) => {
            tracing::error!("获取客户分群失败: {}", e);
            return Json(api_error(500, "获取客户分群失败"));
        }
    };

    let criteria: SegmentCriteria = serde_json::from_value(criteria).unwrap_or_default();

    let customers = fetch_segment_customers(&state.db, &criteria, page_size, offset).await;

    let total = count_matching_customers(&state.db, &criteria).await;

    Json(ApiResponse::success(
        serde_json::json!({
            "segment_name": segment_name,
            "items": customers,
            "total": total,
            "page": page,
            "page_size": page_size
        }),
        "获取分群客户列表成功",
    ))
}

async fn auto_segment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let segments = vec![
        (
            "A类高价值客户",
            SegmentCriteria {
                score_levels: Some(vec!["A".to_string()]),
                ..Default::default()
            },
        ),
        (
            "B类潜力客户",
            SegmentCriteria {
                score_levels: Some(vec!["B".to_string()]),
                ..Default::default()
            },
        ),
        (
            "C类培育客户",
            SegmentCriteria {
                score_levels: Some(vec!["C".to_string()]),
                ..Default::default()
            },
        ),
        (
            "D类待激活客户",
            SegmentCriteria {
                score_levels: Some(vec!["D".to_string()]),
                ..Default::default()
            },
        ),
        (
            "高营收客户",
            SegmentCriteria {
                revenue_min: Some(1_000_000.0),
                ..Default::default()
            },
        ),
        (
            "中营收客户",
            SegmentCriteria {
                revenue_min: Some(100_000.0),
                revenue_max: Some(1_000_000.0),
                ..Default::default()
            },
        ),
        (
            "活跃客户",
            SegmentCriteria {
                statuses: Some(vec!["active".to_string()]),
                ..Default::default()
            },
        ),
        (
            "沉默客户",
            SegmentCriteria {
                statuses: Some(vec!["inactive".to_string()]),
                ..Default::default()
            },
        ),
    ];

    let mut results = Vec::new();
    for (name, criteria) in segments {
        let count = count_matching_customers(&state.db, &criteria).await;
        results.push(serde_json::json!({
            "name": name,
            "criteria": criteria,
            "customer_count": count
        }));
    }

    Json(ApiResponse::success(
        serde_json::json!({ "segments": results }),
        "自动分群完成",
    ))
}

async fn count_matching_customers(db: &sqlx::PgPool, criteria: &SegmentCriteria) -> i64 {
    let mut conditions = Vec::new();
    let mut params = Vec::new();
    let mut param_idx = 1;

    if let Some(levels) = &criteria.score_levels {
        if !levels.is_empty() {
            let placeholders: Vec<String> =
                levels.iter().map(|_| format!("${}", param_idx)).collect();
            conditions.push(format!("cs.score_level IN ({})", placeholders.join(", ")));
            params.extend(levels.iter().cloned());
            param_idx += levels.len();
        }
    }

    if let Some(industries) = &criteria.industries {
        if !industries.is_empty() {
            let placeholders: Vec<String> = industries
                .iter()
                .map(|_| format!("${}", param_idx))
                .collect();
            conditions.push(format!("c.industry IN ({})", placeholders.join(", ")));
            params.extend(industries.iter().cloned());
            param_idx += industries.len();
        }
    }

    if let Some(sizes) = &criteria.company_sizes {
        if !sizes.is_empty() {
            let placeholders: Vec<String> =
                sizes.iter().map(|_| format!("${}", param_idx)).collect();
            conditions.push(format!("c.company_size IN ({})", placeholders.join(", ")));
            params.extend(sizes.iter().cloned());
            param_idx += sizes.len();
        }
    }

    if let Some(statuses) = &criteria.statuses {
        if !statuses.is_empty() {
            let placeholders: Vec<String> =
                statuses.iter().map(|_| format!("${}", param_idx)).collect();
            conditions.push(format!("c.status IN ({})", placeholders.join(", ")));
            params.extend(statuses.iter().cloned());
            param_idx += statuses.len();
        }
    }

    if let Some(min) = criteria.revenue_min {
        conditions.push(format!("c.revenue >= ${}", param_idx));
        params.push(min.to_string());
        param_idx += 1;
    }

    if let Some(max) = criteria.revenue_max {
        conditions.push(format!("c.revenue <= ${}", param_idx));
        params.push(max.to_string());
        param_idx += 1;
    }

    if let Some(min) = criteria.score_min {
        conditions.push(format!("cs.score >= ${}", param_idx));
        params.push(min.to_string());
        param_idx += 1;
    }

    if let Some(max) = criteria.score_max {
        conditions.push(format!("cs.score <= ${}", param_idx));
        params.push(max.to_string());
    }

    let where_clause = if conditions.is_empty() {
        "".to_string()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let query = format!(
        r#"
        SELECT COUNT(DISTINCT c.id)
        FROM crm.customers c
        LEFT JOIN plugin_crm.customer_scores cs ON c.id = cs.customer_id
        {}
        "#,
        where_clause
    );

    let mut sqlx_query = sqlx::query(&query);
    for param in params {
        sqlx_query = sqlx_query.bind(param);
    }

    match sqlx_query.fetch_one(db).await {
        Ok(row) => row.get_unchecked(0),
        Err(e) => {
            tracing::error!("统计分群客户数量失败: {}", e);
            0
        }
    }
}

async fn fetch_segment_customers(
    db: &sqlx::PgPool,
    criteria: &SegmentCriteria,
    limit: i64,
    offset: i64,
) -> Vec<SegmentedCustomer> {
    let mut conditions = Vec::new();
    let mut params = Vec::new();
    let mut param_idx = 1;

    if let Some(levels) = &criteria.score_levels {
        if !levels.is_empty() {
            let placeholders: Vec<String> =
                levels.iter().map(|_| format!("${}", param_idx)).collect();
            conditions.push(format!("cs.score_level IN ({})", placeholders.join(", ")));
            params.extend(levels.iter().cloned());
            param_idx += levels.len();
        }
    }

    if let Some(industries) = &criteria.industries {
        if !industries.is_empty() {
            let placeholders: Vec<String> = industries
                .iter()
                .map(|_| format!("${}", param_idx))
                .collect();
            conditions.push(format!("c.industry IN ({})", placeholders.join(", ")));
            params.extend(industries.iter().cloned());
            param_idx += industries.len();
        }
    }

    if let Some(sizes) = &criteria.company_sizes {
        if !sizes.is_empty() {
            let placeholders: Vec<String> =
                sizes.iter().map(|_| format!("${}", param_idx)).collect();
            conditions.push(format!("c.company_size IN ({})", placeholders.join(", ")));
            params.extend(sizes.iter().cloned());
            param_idx += sizes.len();
        }
    }

    if let Some(statuses) = &criteria.statuses {
        if !statuses.is_empty() {
            let placeholders: Vec<String> =
                statuses.iter().map(|_| format!("${}", param_idx)).collect();
            conditions.push(format!("c.status IN ({})", placeholders.join(", ")));
            params.extend(statuses.iter().cloned());
            param_idx += statuses.len();
        }
    }

    if let Some(min) = criteria.revenue_min {
        conditions.push(format!("c.revenue >= ${}", param_idx));
        params.push(min.to_string());
        param_idx += 1;
    }

    if let Some(max) = criteria.revenue_max {
        conditions.push(format!("c.revenue <= ${}", param_idx));
        params.push(max.to_string());
        param_idx += 1;
    }

    if let Some(min) = criteria.score_min {
        conditions.push(format!("cs.score >= ${}", param_idx));
        params.push(min.to_string());
        param_idx += 1;
    }

    if let Some(max) = criteria.score_max {
        conditions.push(format!("cs.score <= ${}", param_idx));
        params.push(max.to_string());
    }

    let where_clause = if conditions.is_empty() {
        "".to_string()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    conditions.push(format!("${} = cs.id", param_idx));
    params.push("c.id".to_string());
    param_idx += 1;

    let query = format!(
        r#"
        SELECT c.id, c.name, c.code, c.industry, c.status, c.revenue,
               cs.score, cs.score_level
        FROM crm.customers c
        LEFT JOIN (
            SELECT customer_id, score, score_level
            FROM plugin_crm.customer_scores
            WHERE customer_id = c.id
            ORDER BY scoring_date DESC
            LIMIT 1
        ) cs ON c.id = cs.customer_id
        {}
        ORDER BY c.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_idx,
        param_idx + 1
    );

    let mut sqlx_query = sqlx::query_as::<_, SegmentedCustomer>(&query);
    for param in params {
        sqlx_query = sqlx_query.bind(param);
    }
    sqlx_query = sqlx_query.bind(limit).bind(offset);

    match sqlx_query.fetch_all(db).await {
        Ok(mut customers) => {
            for customer in &mut customers {
                customer.segment_tags = generate_segment_tags(customer);
            }
            customers
        }
        Err(e) => {
            tracing::error!("获取分群客户失败: {}", e);
            Vec::new()
        }
    }
}

fn generate_segment_tags(customer: &SegmentedCustomer) -> Vec<String> {
    let mut tags = Vec::new();

    if let Some(industry) = &customer.industry {
        tags.push(format!("行业: {}", industry));
    }

    tags.push(format!("状态: {}", customer.status));

    if let Some(score_level) = &customer.score_level {
        tags.push(format!("评分等级: {}", score_level));
    }

    if let Some(score) = customer.score {
        tags.push(format!("评分: {}", score));
    }

    if let Some(revenue) = customer.revenue {
        if revenue >= 1_000_000.0 {
            tags.push("高价值".to_string());
        } else if revenue >= 100_000.0 {
            tags.push("中价值".to_string());
        } else {
            tags.push("潜力客户".to_string());
        }
    }

    tags
}

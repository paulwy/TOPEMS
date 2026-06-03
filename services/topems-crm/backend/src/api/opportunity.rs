use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, api_error};
use crate::models::{CreateOpportunityRequest, Opportunity, UpdateOpportunityRequest};
use crate::api::audit::log_audit_event;

#[derive(Debug, Deserialize)]
pub struct OpportunityPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub stage: Option<String>,
    pub customer_id: Option<Uuid>,
}

pub async fn create_routes() -> Result<Router> {
    let app = Router::new()
        .route("/api/v1/opportunities", get(list_opportunities).post(create_opportunity))
        .route(
            "/api/v1/opportunities/{id}",
            get(get_opportunity).put(update_opportunity).delete(delete_opportunity),
        );

    Ok(app)
}

async fn list_opportunities(
    State(pool): State<PgPool>,
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
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(req): Json<CreateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    if req.name.is_empty() {
        return Json(api_error(400, "销售机会名称不能为空"));
    }

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
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会创建失败")),
                "error".to_string(),
                Some(e.to_string()),
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
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_opportunity(
    State(pool): State<PgPool>,
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
    State(pool): State<PgPool>,
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

    let request_data = serde_json::to_value(&req).ok();

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
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

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
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_opportunity(
    State(pool): State<PgPool>,
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
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "销售机会不存在")),
            "error".to_string(),
            Some("销售机会不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会删除失败")),
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
        &pool,
        "delete".to_string(),
        "opportunity".to_string(),
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

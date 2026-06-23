use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::log_audit_event;
use crate::models::{
    CreateCustomerScoreRequest, CustomerScore, CustomerScoringQueryParams,
    UpdateCustomerScoreRequest,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct BatchCalculateRequest {
    pub customer_ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/crm/customer-scoring",
            get(list_customer_scores).post(create_customer_score),
        )
        .route(
            "/api/crm/customer-scoring/calculate",
            post(batch_calculate),
        )
        .route(
            "/api/crm/customer-scoring/{id}",
            get(get_customer_score)
                .put(update_customer_score)
                .delete(delete_customer_score),
        )
}

async fn list_customer_scores(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CustomerScoringQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let customer_id_filter = params.customer_id;
    let score_level_filter = params.score_level.clone();

    let result = sqlx::query_as::<_, CustomerScore>(
        r#"
        SELECT id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at
        FROM plugin_crm.customer_scores
        WHERE ($1::uuid IS NULL OR customer_id = $1)
          AND ($2::text IS NULL OR score_level = $2)
        ORDER BY scoring_date DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&customer_id_filter)
    .bind(&score_level_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(scores) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_crm.customer_scores
                WHERE ($1::uuid IS NULL OR customer_id = $1)
                  AND ($2::text IS NULL OR score_level = $2)
                "#,
            )
            .bind(&customer_id_filter)
            .bind(&score_level_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": scores,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取客户评分列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取客户评分列表失败: {}", e);
            Json(api_error(500, "获取客户评分列表失败"))
        }
    }
}

async fn get_customer_score(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<CustomerScore>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, CustomerScore>(
        r#"
        SELECT id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at
        FROM plugin_crm.customer_scores WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(score)) => Json(ApiResponse::success(score, "获取客户评分成功")),
        Ok(None) => Json(api_error(404, "客户评分不存在")),
        Err(e) => {
            tracing::error!("获取客户评分失败: {}", e);
            Json(api_error(500, "获取客户评分失败"))
        }
    }
}

async fn create_customer_score(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateCustomerScoreRequest>,
) -> Json<ApiResponse<CustomerScore>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let customer = sqlx::query_scalar::<_, String>(
        "SELECT name FROM plugin_crm.customers WHERE id = $1",
    )
    .bind(&req.customer_id)
    .fetch_optional(&state.db)
    .await;

    let customer_name = match customer {
        Ok(Some(name)) => name,
        Ok(None) => return Json(api_error(400, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let score = req.score.unwrap_or(0);
    let score_level = req.score_level.clone().unwrap_or_else(|| {
        if score >= 80 {
            "A".to_string()
        } else if score >= 60 {
            "B".to_string()
        } else if score >= 40 {
            "C".to_string()
        } else {
            "D".to_string()
        }
    });

    let last_score = sqlx::query_scalar::<_, Option<i32>>(
        "SELECT score FROM plugin_crm.customer_scores WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(&req.customer_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None)
    .flatten();

    let trend = match last_score {
        Some(last) if score > last => "up".to_string(),
        Some(last) if score < last => "down".to_string(),
        _ => "stable".to_string(),
    };

    let factors = serde_json::Value::Array(Default::default());

    let result = sqlx::query_as::<_, CustomerScore>(
        r#"
        INSERT INTO plugin_crm.customer_scores (
            id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.customer_id)
    .bind(&customer_name)
    .bind(score)
    .bind(&score_level)
    .bind(now)
    .bind(&factors)
    .bind(&trend)
    .bind(&last_score)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(score) => (
            Json(ApiResponse::success(score.clone(), "客户评分创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建客户评分失败: {}", e);
            (
                Json(api_error(500, "客户评分创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(score) = &result {
        serde_json::to_value(score).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "customer_score".to_string(),
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

async fn update_customer_score(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCustomerScoreRequest>,
) -> Json<ApiResponse<CustomerScore>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, CustomerScore>(
        r#"
        SELECT id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at FROM plugin_crm.customer_scores WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "客户评分不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户评分失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let score = req.score.unwrap_or(existing.score);
    let score_level = req.score_level.unwrap_or(existing.score_level);
    let factors = req.factors.unwrap_or(existing.factors);
    let now = Utc::now();

    let result = sqlx::query_as::<_, CustomerScore>(
        r#"
        UPDATE plugin_crm.customer_scores SET
            score = $2, score_level = $3, factors = $4, updated_at = $5
        WHERE id = $1
        RETURNING id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(score)
    .bind(&score_level)
    .bind(&factors)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(score) => (
            Json(ApiResponse::success(score.clone(), "客户评分更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新客户评分失败: {}", e);
            (
                Json(api_error(500, "客户评分更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(score) = &result {
        serde_json::to_value(score).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "customer_score".to_string(),
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

async fn delete_customer_score(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM plugin_crm.customer_scores WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "客户评分删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "客户评分不存在")),
            "error".to_string(),
            Some("客户评分不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除客户评分失败: {}", e);
            (
                Json(api_error(500, "客户评分删除失败")),
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
        "delete".to_string(),
        "customer_score".to_string(),
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

async fn batch_calculate(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchCalculateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.customer_ids.is_empty() {
        return Json(api_error(400, "请选择要计算评分的客户"));
    }

    let mut results = Vec::new();
    let now = Utc::now();

    for customer_id in &req.customer_ids {
        let customer_info: Option<(String, DateTime<Utc>, Option<String>, Option<Decimal>)> = sqlx::query_scalar(
            "SELECT name, created_at, status, revenue FROM plugin_crm.customers WHERE id = $1",
        )
        .bind(customer_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

        if let Some((name, created_at, status, revenue)) = customer_info {
            let id = Uuid::new_v4();

            let total_opportunity_value: Option<Decimal> = sqlx::query_scalar(
                "SELECT COALESCE(SUM(value), 0) FROM plugin_crm.opportunities WHERE customer_id = $1",
            )
            .bind(customer_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);

            let opportunity_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM plugin_crm.opportunities WHERE customer_id = $1",
            )
            .bind(customer_id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            let interaction_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM plugin_crm.interactions WHERE customer_id = $1",
            )
            .bind(customer_id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            let won_opportunity_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM plugin_crm.opportunities WHERE customer_id = $1 AND stage = 'closed_won'",
            )
            .bind(customer_id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            let days_since_created = (now - created_at).num_days();
            let years_since_created = days_since_created / 365;

            let revenue_score = calculate_revenue_score(revenue, total_opportunity_value);
            let opportunity_score = calculate_opportunity_score(opportunity_count, won_opportunity_count);
            let interaction_score = calculate_interaction_score(interaction_count);
            let loyalty_score = calculate_loyalty_score(years_since_created, status.as_deref());

            let total_score = (
                revenue_score * 35 +
                opportunity_score * 30 +
                interaction_score * 20 +
                loyalty_score * 15
            ) / 100;

            let score = total_score.max(10).min(100);

            let score_level = if score >= 80 {
                "A".to_string()
            } else if score >= 60 {
                "B".to_string()
            } else if score >= 40 {
                "C".to_string()
            } else {
                "D".to_string()
            };

            let last_score = sqlx::query_scalar::<_, Option<i32>>(
                "SELECT score FROM plugin_crm.customer_scores WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1",
            )
            .bind(customer_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None)
            .flatten();

            let trend = match last_score {
                Some(last) if score > last => "up".to_string(),
                Some(last) if score < last => "down".to_string(),
                _ => "stable".to_string(),
            };

            let factors = serde_json::json!([
                {"name": "营收价值", "weight": 35, "score": revenue_score, "max_score": 100, "description": format!("营收: {}, 商机总值: {}", revenue.unwrap_or(Decimal::ZERO), total_opportunity_value.unwrap_or(Decimal::ZERO))},
                {"name": "商机表现", "weight": 30, "score": opportunity_score, "max_score": 100, "description": format!("商机数: {}, 赢单数: {}", opportunity_count, won_opportunity_count)},
                {"name": "互动活跃度", "weight": 20, "score": interaction_score, "max_score": 100, "description": format!("互动次数: {}", interaction_count)},
                {"name": "客户忠诚度", "weight": 15, "score": loyalty_score, "max_score": 100, "description": format!("合作年限: {}年, 状态: {}", years_since_created, status.unwrap_or_default())}
            ]);

            let result = sqlx::query_as::<_, CustomerScore>(
                r#"
                INSERT INTO plugin_crm.customer_scores (
                    id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(customer_id)
            .bind(&name)
            .bind(score)
            .bind(&score_level)
            .bind(now)
            .bind(&factors)
            .bind(&trend)
            .bind(&last_score)
            .bind(now)
            .bind(now)
            .fetch_one(&state.db)
            .await;

            if let Ok(score) = result {
                results.push(score);
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({ "scores": results, "count": results.len() }),
        &format!("成功计算 {} 个客户评分", results.len()),
    ))
}

fn calculate_revenue_score(revenue: Option<Decimal>, total_opportunity_value: Option<Decimal>) -> i32 {
    let total_value = revenue.unwrap_or(Decimal::ZERO) + total_opportunity_value.unwrap_or(Decimal::ZERO);
    
    let value_f64: f64 = total_value.to_f64().unwrap_or(0.0);
    
    if value_f64 >= 1_000_000.0 {
        100
    } else if value_f64 >= 500_000.0 {
        80
    } else if value_f64 >= 100_000.0 {
        60
    } else if value_f64 >= 50_000.0 {
        40
    } else if value_f64 >= 10_000.0 {
        20
    } else {
        10
    }
}

fn calculate_opportunity_score(opportunity_count: i64, won_count: i64) -> i32 {
    if opportunity_count == 0 {
        return 10;
    }
    
    let win_rate = if opportunity_count > 0 {
        (won_count as f64 / opportunity_count as f64) * 100.0
    } else {
        0.0
    };

    let volume_score = if opportunity_count >= 10 {
        60
    } else if opportunity_count >= 5 {
        45
    } else if opportunity_count >= 3 {
        30
    } else if opportunity_count >= 1 {
        15
    } else {
        10
    };

    let win_rate_score = if win_rate >= 70.0 {
        40
    } else if win_rate >= 50.0 {
        30
    } else if win_rate >= 30.0 {
        20
    } else {
        10
    };

    volume_score + win_rate_score
}

fn calculate_interaction_score(interaction_count: i64) -> i32 {
    if interaction_count >= 20 {
        100
    } else if interaction_count >= 10 {
        80
    } else if interaction_count >= 5 {
        60
    } else if interaction_count >= 3 {
        40
    } else if interaction_count >= 1 {
        20
    } else {
        10
    }
}

fn calculate_loyalty_score(years_since_created: i64, status: Option<&str>) -> i32 {
    let base_score = if years_since_created >= 5 {
        60
    } else if years_since_created >= 3 {
        45
    } else if years_since_created >= 1 {
        30
    } else {
        15
    };

    let status_bonus = if status == Some("active") {
        40
    } else if status == Some("inactive") {
        20
    } else {
        10
    };

    base_score + status_bonus
}
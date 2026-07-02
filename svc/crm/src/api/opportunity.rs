use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{Datelike, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::log_audit_event;
use crate::models::{CreateOpportunityRequest, Opportunity, UpdateOpportunityRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelStage {
    pub stage: String,
    pub stage_label: String,
    pub count: i64,
    pub total_value: Option<f64>,
    pub avg_probability: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityStats {
    pub total_count: i64,
    pub total_value: Option<f64>,
    pub weighted_value: Option<f64>,
    pub won_count: i64,
    pub won_value: Option<f64>,
    pub lost_count: i64,
    pub lost_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct StageTransition {
    pub from_stage: String,
    pub to_stage: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityForecast {
    pub forecast_month: String,
    pub forecast_value: f64,
    pub opportunity_count: i64,
    pub avg_probability: f64,
}

#[derive(Debug, Deserialize)]
pub struct ForecastParams {
    pub months: Option<i64>,
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
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/crm/opportunities",
            get(list_opportunities).post(create_opportunity),
        )
        .route(
            "/api/crm/opportunities/batch-delete",
            post(batch_delete_opportunities),
        )
        .route(
            "/api/crm/opportunities/{id}",
            get(get_opportunity)
                .put(update_opportunity)
                .delete(delete_opportunity),
        )
        .route("/api/crm/opportunities/funnel", get(get_sales_funnel))
        .route("/api/crm/opportunities/stats", get(get_opportunity_stats))
        .route(
            "/api/crm/opportunities/forecast",
            get(get_opportunity_forecast),
        )
        .route(
            "/api/crm/opportunities/stage-transitions",
            get(get_stage_transitions),
        )
}

async fn list_opportunities(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<OpportunityPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let stage_filter = params.stage.clone();
    let customer_filter = params.customer_id;

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        FROM plugin_crm.opportunities
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
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(opportunities) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_crm.opportunities
                WHERE ($1::text IS NULL OR name ILIKE $1)
                  AND ($2::text IS NULL OR stage = $2)
                  AND ($3::uuid IS NULL OR customer_id = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&stage_filter)
            .bind(&customer_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": opportunities,
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.name.is_empty() {
        return Json(api_error(400, "销售机会名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        INSERT INTO plugin_crm.opportunities (
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
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opportunity) => (
            Json(ApiResponse::success(
                opportunity.clone(),
                "销售机会创建成功",
            )),
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
        &state.db,
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Opportunity>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        FROM plugin_crm.opportunities WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at FROM plugin_crm.opportunities WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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
        UPDATE plugin_crm.opportunities SET
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
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opportunity) => (
            Json(ApiResponse::success(
                opportunity.clone(),
                "销售机会更新成功",
            )),
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
        &state.db,
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM plugin_crm.opportunities WHERE id = $1")
        .bind(id)
        .execute(&state.db)
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
        &state.db,
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

async fn batch_delete_opportunities(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的销售机会"));
    }

    let result = sqlx::query("DELETE FROM plugin_crm.opportunities WHERE id = ANY($1)")
        .bind(&req.ids)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                "".to_string(),
                &format!("成功删除 {} 个销售机会", r.rows_affected()),
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除销售机会失败: {}", e);
            (
                Json(api_error(500, "批量删除销售机会失败")),
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
        "batch_delete".to_string(),
        "opportunity".to_string(),
        None,
        serde_json::to_value(&req.ids).ok(),
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

async fn get_sales_funnel(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<FunnelStage>>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let stages = vec![
        ("prospecting", "线索"),
        ("qualified", "合格"),
        ("proposal", "提案"),
        ("negotiation", "谈判"),
        ("closed_won", "赢单"),
        ("closed_lost", "输单"),
    ];

    let mut funnel_stages = Vec::new();

    for (stage, stage_label) in stages {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM plugin_crm.opportunities WHERE stage = $1")
                .bind(stage)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

        let total_value: Option<f64> = sqlx::query_scalar(
            "SELECT COALESCE(SUM(value), 0) FROM plugin_crm.opportunities WHERE stage = $1 AND value IS NOT NULL"
        )
        .bind(stage)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(Some(0.0));

        let avg_probability: Option<f64> = sqlx::query_scalar(
            "SELECT COALESCE(AVG(probability), 0) FROM plugin_crm.opportunities WHERE stage = $1 AND probability IS NOT NULL"
        )
        .bind(stage)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(Some(0.0));

        funnel_stages.push(FunnelStage {
            stage: stage.to_string(),
            stage_label: stage_label.to_string(),
            count,
            total_value,
            avg_probability,
        });
    }

    Json(ApiResponse::success(funnel_stages, "获取销售漏斗成功"))
}

async fn get_opportunity_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<OpportunityStats>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let total_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM plugin_crm.opportunities")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let total_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM plugin_crm.opportunities WHERE value IS NOT NULL",
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or(Some(0.0));

    let weighted_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value * probability / 100), 0) FROM plugin_crm.opportunities WHERE value IS NOT NULL AND probability IS NOT NULL"
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or(Some(0.0));

    let won_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM plugin_crm.opportunities WHERE stage = 'closed_won'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let won_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM plugin_crm.opportunities WHERE stage = 'closed_won' AND value IS NOT NULL"
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or(Some(0.0));

    let lost_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM plugin_crm.opportunities WHERE stage = 'closed_lost'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let lost_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM plugin_crm.opportunities WHERE stage = 'closed_lost' AND value IS NOT NULL"
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or(Some(0.0));

    let stats = OpportunityStats {
        total_count,
        total_value,
        weighted_value,
        won_count,
        won_value,
        lost_count,
        lost_value,
    };

    Json(ApiResponse::success(stats, "获取商机统计成功"))
}

async fn get_opportunity_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ForecastParams>,
) -> Json<ApiResponse<Vec<OpportunityForecast>>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let months = params.months.unwrap_or(12).min(24).max(1);

    let mut forecasts = Vec::new();

    for i in 0..months as usize {
        let forecast_month = Utc::now() + chrono::Duration::days(i as i64 * 30);
        let month_start = Utc.from_utc_datetime(
            &forecast_month
                .date_naive()
                .with_day(1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
        );
        let month_end = month_start + chrono::Duration::days(31);

        let forecast_value: f64 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(value * probability / 100), 0) 
            FROM plugin_crm.opportunities 
            WHERE close_date >= $1 AND close_date < $2 AND stage NOT IN ('closed_won', 'closed_lost')
            "#,
        )
        .bind(month_start)
        .bind(month_end)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0);

        let opportunity_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) 
            FROM plugin_crm.opportunities 
            WHERE close_date >= $1 AND close_date < $2 AND stage NOT IN ('closed_won', 'closed_lost')
            "#,
        )
        .bind(month_start)
        .bind(month_end)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(Some(0))
        .unwrap_or(0);

        let avg_probability: f64 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(AVG(probability), 0) 
            FROM plugin_crm.opportunities 
            WHERE close_date >= $1 AND close_date < $2 AND stage NOT IN ('closed_won', 'closed_lost') AND probability IS NOT NULL
            "#,
        )
        .bind(month_start)
        .bind(month_end)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0);

        forecasts.push(OpportunityForecast {
            forecast_month: forecast_month.format("%Y-%m").to_string(),
            forecast_value,
            opportunity_count,
            avg_probability,
        });
    }

    Json(ApiResponse::success(forecasts, "获取商机预测成功"))
}

async fn get_stage_transitions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<StageTransition>>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transitions: Vec<StageTransition> = sqlx::query_as(
        r#"
        SELECT stage AS from_stage, stage AS to_stage, COUNT(*) as count
        FROM plugin_crm.opportunities
        GROUP BY stage
        ORDER BY count DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(transitions, "获取阶段转换统计成功"))
}

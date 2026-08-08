use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use super::ApiState;
use crate::models::opportunity::Opportunity;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelStage {
    pub stage: String,
    pub count: i64,
    pub total_value: Decimal,
    pub avg_value: Decimal,
    pub probability: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelMetrics {
    pub total_opportunities: i64,
    pub total_value: Decimal,
    pub avg_value: Decimal,
    pub conversion_rate: f64,
    pub weighted_value: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelConversion {
    pub from_stage: String,
    pub to_stage: String,
    pub conversion_count: i64,
    pub conversion_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelTrend {
    pub period: String,
    pub stage: String,
    pub count: i64,
    pub value: Decimal,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FunnelQueryParams {
    pub page: Option<usize>,
    pub page_size: Option<usize>,
    pub stage: Option<String>,
    pub period_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/sales-funnel", get(get_funnel_data))
        .route("/sales-funnel/metrics", get(get_funnel_metrics))
        .route("/sales-funnel/conversion", get(get_funnel_conversion))
        .route("/sales-funnel/trend", get(get_funnel_trend))
        .route("/sales-funnel/stage/{stage}", get(get_stage_opportunities))
}

async fn get_funnel_data(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<FunnelQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let stage_order = [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
    ];

    let mut stages: Vec<FunnelStage> = Vec::new();

    for stage in stage_order.iter() {
        let result = sqlx::query(
            r#"
            SELECT COUNT(*) as count, 
                   COALESCE(SUM(value), 0) as total_value,
                   COALESCE(AVG(value), 0) as avg_value,
                   COALESCE(AVG(probability), 0) as avg_probability
            FROM plugin_crm.opportunities
            WHERE stage = $1
            "#,
        )
        .bind(stage)
        .fetch_one(&state.db)
        .await;

        match result {
            Ok(row) => {
                stages.push(FunnelStage {
                    stage: stage.to_string(),
                    count: row.get("count"),
                    total_value: row.get("total_value"),
                    avg_value: row.get("avg_value"),
                    probability: Some(row.get("avg_probability")),
                });
            }
            Err(e) => {
                tracing::error!("查询漏斗阶段失败: {}", e);
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "stages": stages,
            "stage_order": stage_order
        }),
        "获取销售漏斗数据成功",
    ))
}

async fn get_funnel_metrics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<FunnelMetrics>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT COUNT(*) as total_count,
               COALESCE(SUM(value), 0) as total_value,
               COALESCE(AVG(value), 0) as avg_value,
               COALESCE(SUM(CASE WHEN stage = 'closed_won' THEN 1 ELSE 0 END), 0) as won_count
        FROM plugin_crm.opportunities
        "#,
    )
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let total_count: i64 = row.get("total_count");
            let total_value: Decimal = row.get("total_value");
            let avg_value: Decimal = row.get("avg_value");
            let won_count: i64 = row.get("won_count");

            let conversion_rate = if total_count > 0 {
                (won_count as f64 / total_count as f64) * 100.0
            } else {
                0.0
            };

            let weighted_result = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(value * probability / 100), 0) as weighted_value
                FROM plugin_crm.opportunities
                WHERE stage != 'closed_lost'
                "#,
            )
            .fetch_one(&state.db)
            .await;

            let weighted_value = weighted_result.unwrap_or(Decimal::from(0));

            Json(ApiResponse::success(
                FunnelMetrics {
                    total_opportunities: total_count,
                    total_value,
                    avg_value,
                    conversion_rate,
                    weighted_value,
                },
                "获取销售漏斗指标成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取漏斗指标失败: {}", e);
            Json(api_error(500, "获取销售漏斗指标失败"))
        }
    }
}

async fn get_funnel_conversion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<FunnelConversion>>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let stage_order = ["lead", "qualified", "proposal", "negotiation", "closed_won"];
    let mut conversions: Vec<FunnelConversion> = Vec::new();

    for i in 0..stage_order.len() - 1 {
        let from_stage = stage_order[i];
        let to_stage = stage_order[i + 1];

        let from_count_result: Result<i64, sqlx::Error> =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM plugin_crm.opportunities WHERE stage = $1"#)
                .bind(from_stage)
                .fetch_one(&state.db)
                .await;

        let to_count_result: Result<i64, sqlx::Error> =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM plugin_crm.opportunities WHERE stage = $1"#)
                .bind(to_stage)
                .fetch_one(&state.db)
                .await;

        if let (Ok(from_count), Ok(to_count)) = (from_count_result, to_count_result) {
            let conversion_rate = if from_count > 0 {
                (to_count as f64 / from_count as f64) * 100.0
            } else {
                0.0
            };

            conversions.push(FunnelConversion {
                from_stage: from_stage.to_string(),
                to_stage: to_stage.to_string(),
                conversion_count: to_count,
                conversion_rate,
            });
        }
    }

    Json(ApiResponse::success(conversions, "获取销售漏斗转化率成功"))
}

async fn get_funnel_trend(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<FunnelQueryParams>,
) -> Json<ApiResponse<Vec<FunnelTrend>>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let period_type = params.period_type.unwrap_or_else(|| "month".to_string());

    let date_format = match period_type.as_str() {
        "week" => "%Y-W%U",
        "quarter" => "%Y-Q%q",
        "year" => "%Y",
        _ => "%Y-%m",
    };

    let query_str = format!(
        r#"
        SELECT TO_CHAR(created_at, '{}') as period,
               stage,
               COUNT(*) as count,
               COALESCE(SUM(value), 0) as value
        FROM plugin_crm.opportunities
        GROUP BY period, stage
        ORDER BY period DESC, stage
        LIMIT 50
        "#,
        date_format
    );

    let result: Result<Vec<sqlx::postgres::PgRow>, sqlx::Error> =
        sqlx::query(&query_str).fetch_all(&state.db).await;

    match result {
        Ok(rows) => {
            let trends: Vec<FunnelTrend> = rows
                .into_iter()
                .map(|row| FunnelTrend {
                    period: row.get("period"),
                    stage: row.get("stage"),
                    count: row.get("count"),
                    value: row.get("value"),
                })
                .collect();

            Json(ApiResponse::success(trends, "获取销售漏斗趋势成功"))
        }
        Err(e) => {
            tracing::error!("获取漏斗趋势失败: {}", e);
            Json(api_error(500, "获取销售漏斗趋势失败"))
        }
    }
}

async fn get_stage_opportunities(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(stage): Path<String>,
    Query(params): Query<FunnelQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1) as i64;
    let page_size = params.page_size.unwrap_or(20).min(100) as i64;
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at
        FROM plugin_crm.opportunities
        WHERE stage = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&stage)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(opportunities) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM plugin_crm.opportunities WHERE stage = $1"#,
            )
            .bind(&stage)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": opportunities,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "stage": stage
                }),
                "获取阶段商机列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取阶段商机失败: {}", e);
            Json(api_error(500, "获取阶段商机失败"))
        }
    }
}

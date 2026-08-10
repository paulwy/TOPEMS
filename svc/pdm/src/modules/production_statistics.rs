use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/production-statistics", get(list_statistics))
        .route("/statistics", get(get_statistics_summary))
        .route("/statistics/{id}", get(get_statistics))
}

#[derive(Debug, Deserialize)]
pub struct StatisticsQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductStatistics {
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub batch_count: i64,
    pub total_quantity: Option<BigDecimal>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StatusCount {
    pub status: Option<String>,
    pub count: i64,
    pub quantity: Option<BigDecimal>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatisticsDetail {
    pub product_id: Uuid,
    pub product_name: Option<String>,
    pub total_batches: i64,
    pub total_quantity: Option<BigDecimal>,
    pub status_distribution: HashMap<String, i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PdmStatisticsSummary {
    pub total_processes: i64,
    pub active_processes: i64,
    pub total_formulas: i64,
    pub active_formulas: i64,
    pub total_batches: i64,
    pub planning_batches: i64,
    pub in_progress_batches: i64,
    pub completed_batches: i64,
    pub cancelled_batches: i64,
    pub total_steps: i64,
    pub total_output_quantity: Option<BigDecimal>,
    pub total_reject_quantity: i64,
    pub average_pass_rate: BigDecimal,
}

#[utoipa::path(
    get,
    path = "/api/pdm/production-statistics",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<StatisticsQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, ProductStatistics>(
        r#"
        SELECT product_id, product_name, COUNT(*) AS batch_count, SUM(quantity) AS total_quantity
        FROM pdm_production_batches
        WHERE tenant_id = $1
        GROUP BY product_id, product_name
        ORDER BY batch_count DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(tenant_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(statistics) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM (
                    SELECT 1 FROM pdm_production_batches
                    WHERE tenant_id = $1
                    GROUP BY product_id, product_name
                ) AS grouped
                "#,
            )
            .bind(tenant_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "statistics": statistics,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取生产批次统计列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产批次统计列表失败: {}", e);
            Json(ApiResponse::error(500, "获取生产批次统计列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/statistics",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn get_statistics_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, (
        i64,
        i64,
        i64,
        i64,
        i64,
        i64,
        i64,
        i64,
        i64,
        i64,
        Option<BigDecimal>,
    )>(
        r#"
        SELECT
            (SELECT COUNT(*) FROM pdm_production_processes WHERE tenant_id = $1) AS total_processes,
            (SELECT COUNT(*) FROM pdm_production_processes WHERE tenant_id = $1 AND status = 'active') AS active_processes,
            (SELECT COUNT(*) FROM pdm_production_formulas WHERE tenant_id = $1) AS total_formulas,
            (SELECT COUNT(*) FROM pdm_production_formulas WHERE tenant_id = $1 AND status = 'active') AS active_formulas,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE tenant_id = $1) AS total_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE tenant_id = $1 AND status IN ('planning', 'pending')) AS planning_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE tenant_id = $1 AND status IN ('in_progress', 'processing')) AS in_progress_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE tenant_id = $1 AND status = 'completed') AS completed_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE tenant_id = $1 AND status = 'cancelled') AS cancelled_batches,
            (SELECT COUNT(*) FROM pdm_production_steps WHERE tenant_id = $1) AS total_steps,
            (SELECT COALESCE(SUM(quantity), 0) FROM pdm_production_batches WHERE tenant_id = $1) AS total_output_quantity
        "#,
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok((
            total_processes,
            active_processes,
            total_formulas,
            active_formulas,
            total_batches,
            planning_batches,
            in_progress_batches,
            completed_batches,
            cancelled_batches,
            total_steps,
            total_output_quantity,
        )) => {
            let summary = PdmStatisticsSummary {
                total_processes,
                active_processes,
                total_formulas,
                active_formulas,
                total_batches,
                planning_batches,
                in_progress_batches,
                completed_batches,
                cancelled_batches,
                total_steps,
                total_output_quantity,
                total_reject_quantity: 0,
                average_pass_rate: BigDecimal::from(100),
            };

            match serde_json::to_value(summary) {
                Ok(value) => Json(ApiResponse::success(value, "获取 PDM 统计汇总成功")),
                Err(e) => {
                    tracing::error!("序列化 PDM 统计汇总失败: {}", e);
                    Json(ApiResponse::error(500, "获取 PDM 统计汇总失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("获取 PDM 统计汇总失败: {}", e);
            Json(ApiResponse::error(500, "获取 PDM 统计汇总失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/statistics/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let main_result = sqlx::query_as::<_, ProductStatistics>(
        r#"
        SELECT product_id, product_name, COUNT(*) AS batch_count, SUM(quantity) AS total_quantity
        FROM pdm_production_batches
        WHERE product_id = $1 AND tenant_id = $2
        GROUP BY product_id, product_name
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match main_result {
        Ok(Some(stat)) => {
            let mut status_distribution: HashMap<String, i64> = HashMap::new();

            let status_result = sqlx::query_as::<_, StatusCount>(
                r#"
                SELECT status, COUNT(*) AS count, SUM(quantity) AS quantity
                FROM pdm_production_batches
                WHERE product_id = $1 AND tenant_id = $2
                GROUP BY status
                "#,
            )
            .bind(id)
            .bind(tenant_id)
            .fetch_all(&state.pool)
            .await;

            if let Ok(rows) = status_result {
                for row in rows {
                    status_distribution.insert(
                        row.status.unwrap_or_else(|| "unknown".to_string()),
                        row.count,
                    );
                }
            }

            let detail = StatisticsDetail {
                product_id: stat.product_id.unwrap_or(id),
                product_name: stat.product_name,
                total_batches: stat.batch_count,
                total_quantity: stat.total_quantity,
                status_distribution,
            };

            match serde_json::to_value(detail) {
                Ok(value) => Json(ApiResponse::success(value, "获取生产批次统计详情成功")),
                Err(e) => {
                    tracing::error!("序列化统计详情失败: {}", e);
                    Json(ApiResponse::error(500, "获取生产批次统计详情失败"))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "该产品无生产批次统计信息")),
        Err(e) => {
            tracing::error!("获取生产批次统计详情失败: {}", e);
            Json(ApiResponse::error(500, "获取生产批次统计详情失败"))
        }
    }
}

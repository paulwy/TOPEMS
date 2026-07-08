use axum::{extract::Path, extract::Query, extract::State, routing::get, Json, Router};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/pdm/production-statistics", get(list_statistics))
        .route("/api/pdm/statistics/{id}", get(get_statistics))
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

pub async fn list_statistics(
    State(state): State<AppState>,
    Query(query): Query<StatisticsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, ProductStatistics>(
        r#"
        SELECT product_id, product_name, COUNT(*) AS batch_count, SUM(quantity) AS total_quantity
        FROM pdm_production_batches
        GROUP BY product_id, product_name
        ORDER BY batch_count DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(statistics) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM (
                    SELECT 1 FROM pdm_production_batches GROUP BY product_id, product_name
                ) AS grouped
                "#,
            )
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

pub async fn get_statistics(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let main_result = sqlx::query_as::<_, ProductStatistics>(
        r#"
        SELECT product_id, product_name, COUNT(*) AS batch_count, SUM(quantity) AS total_quantity
        FROM pdm_production_batches
        WHERE product_id = $1
        GROUP BY product_id, product_name
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match main_result {
        Ok(Some(stat)) => {
            let mut status_distribution: HashMap<String, i64> = HashMap::new();

            let status_result = sqlx::query_as::<_, StatusCount>(
                r#"
                SELECT status, COUNT(*) AS count, SUM(quantity) AS quantity
                FROM pdm_production_batches
                WHERE product_id = $1
                GROUP BY status
                "#,
            )
            .bind(id)
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

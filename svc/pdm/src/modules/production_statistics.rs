use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

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
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-statistics",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<StatisticsQuery>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            claims
                .tenant_id
                .as_deref()
                .and_then(|t| uuid::Uuid::parse_str(t).ok())
                .unwrap_or_default(),
        )
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, ProductStatistics>(
        r#"
        SELECT product_id, product_name, COUNT(*) AS batch_count, SUM(quantity) AS total_quantity
        FROM pdm_production_batches
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
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
                    WHERE ($1::uuid IS NULL OR tenant_id = $1)
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
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/statistics",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn get_statistics_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            claims
                .tenant_id
                .as_deref()
                .and_then(|t| uuid::Uuid::parse_str(t).ok())
                .unwrap_or_default(),
        )
    };

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
            (SELECT COUNT(*) FROM pdm_production_processes WHERE ($1::uuid IS NULL OR tenant_id = $1)) AS total_processes,
            (SELECT COUNT(*) FROM pdm_production_processes WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'active') AS active_processes,
            (SELECT COUNT(*) FROM pdm_production_formulas WHERE ($1::uuid IS NULL OR tenant_id = $1)) AS total_formulas,
            (SELECT COUNT(*) FROM pdm_production_formulas WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'active') AS active_formulas,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE ($1::uuid IS NULL OR tenant_id = $1)) AS total_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status IN ('planning', 'pending')) AS planning_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status IN ('in_progress', 'processing')) AS in_progress_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'completed') AS completed_batches,
            (SELECT COUNT(*) FROM pdm_production_batches WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'cancelled') AS cancelled_batches,
            (SELECT COUNT(*) FROM pdm_production_steps WHERE ($1::uuid IS NULL OR tenant_id = $1)) AS total_steps,
            (SELECT COALESCE(SUM(quantity), 0) FROM pdm_production_batches WHERE ($1::uuid IS NULL OR tenant_id = $1)) AS total_output_quantity
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
    security(("BearerAuth" = ["pdm:read"])),
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
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            claims
                .tenant_id
                .as_deref()
                .and_then(|t| uuid::Uuid::parse_str(t).ok())
                .unwrap_or_default(),
        )
    };

    let main_result = sqlx::query_as::<_, ProductStatistics>(
        r#"
        SELECT product_id, product_name, COUNT(*) AS batch_count, SUM(quantity) AS total_quantity
        FROM pdm_production_batches
        WHERE product_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
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
                WHERE product_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
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

#[cfg(test)]
mod tests {
    use super::*;
    use bigdecimal::BigDecimal;
    use serde_json::json;
    use std::collections::HashMap;

    #[test]
    fn test_create_routes_smoke() {
        let _router = create_routes();
    }

    #[test]
    fn test_statistics_query_deserialize_empty() {
        let j = json!({});
        let q: StatisticsQuery = serde_json::from_value(j).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
    }

    #[test]
    fn test_statistics_query_deserialize_filled() {
        let j = json!({ "page": 5, "page_size": 100 });
        let q: StatisticsQuery = serde_json::from_value(j).unwrap();
        assert_eq!(q.page, Some(5));
        assert_eq!(q.page_size, Some(100));
    }

    #[test]
    fn test_product_statistics_serde_roundtrip() {
        let ps = ProductStatistics {
            product_id: Some(Uuid::new_v4()),
            product_name: Some("Widget".to_string()),
            batch_count: 10,
            total_quantity: Some(BigDecimal::from(100)),
        };
        let serialized = serde_json::to_string(&ps).unwrap();
        let d: ProductStatistics = serde_json::from_str(&serialized).unwrap();
        assert_eq!(d.product_id, ps.product_id);
        assert_eq!(d.product_name.as_deref(), Some("Widget"));
        assert_eq!(d.batch_count, 10);
        assert!(d.total_quantity.is_some());
    }

    #[test]
    fn test_product_statistics_serde_with_nones() {
        let ps = ProductStatistics {
            product_id: None,
            product_name: None,
            batch_count: 0,
            total_quantity: None,
        };
        let serialized = serde_json::to_value(&ps).unwrap();
        assert!(serialized["product_id"].is_null());
        assert!(serialized["product_name"].is_null());
        assert_eq!(serialized["batch_count"], 0);
        assert!(serialized["total_quantity"].is_null());
    }

    #[test]
    fn test_status_count_serde_roundtrip() {
        let sc = StatusCount {
            status: Some("completed".to_string()),
            count: 25,
            quantity: Some(BigDecimal::from(500)),
        };
        let serialized = serde_json::to_string(&sc).unwrap();
        let d: StatusCount = serde_json::from_str(&serialized).unwrap();
        assert_eq!(d.status.as_deref(), Some("completed"));
        assert_eq!(d.count, 25);
        assert!(d.quantity.is_some());
    }

    #[test]
    fn test_status_count_serde_defaults() {
        let sc = StatusCount {
            status: None,
            count: 0,
            quantity: None,
        };
        let v = serde_json::to_value(&sc).unwrap();
        assert!(v["status"].is_null());
        assert_eq!(v["count"], 0);
        assert!(v["quantity"].is_null());
    }

    #[test]
    fn test_statistics_detail_serde_roundtrip() {
        let mut sd = HashMap::new();
        sd.insert("planning".to_string(), 3);
        sd.insert("completed".to_string(), 7);
        let detail = StatisticsDetail {
            product_id: Uuid::new_v4(),
            product_name: Some("ProductA".to_string()),
            total_batches: 10,
            total_quantity: Some(BigDecimal::from(200)),
            status_distribution: sd,
        };
        let serialized = serde_json::to_string(&detail).unwrap();
        let d: StatisticsDetail = serde_json::from_str(&serialized).unwrap();
        assert_eq!(d.product_id, detail.product_id);
        assert_eq!(d.product_name.as_deref(), Some("ProductA"));
        assert_eq!(d.total_batches, 10);
        assert_eq!(d.status_distribution.get("planning"), Some(&3));
        assert_eq!(d.status_distribution.get("completed"), Some(&7));
    }

    #[test]
    fn test_statistics_detail_serde_empty_map() {
        let detail = StatisticsDetail {
            product_id: Uuid::new_v4(),
            product_name: None,
            total_batches: 0,
            total_quantity: None,
            status_distribution: HashMap::new(),
        };
        let v = serde_json::to_value(&detail).unwrap();
        assert!(v["product_name"].is_null());
        assert!(v["status_distribution"].as_object().unwrap().is_empty());
    }

    #[test]
    fn test_pdm_statistics_summary_serde_roundtrip() {
        let summary = PdmStatisticsSummary {
            total_processes: 10,
            active_processes: 8,
            total_formulas: 5,
            active_formulas: 4,
            total_batches: 20,
            planning_batches: 5,
            in_progress_batches: 7,
            completed_batches: 6,
            cancelled_batches: 2,
            total_steps: 50,
            total_output_quantity: Some(BigDecimal::from(1000)),
            total_reject_quantity: 10,
            average_pass_rate: BigDecimal::from(99),
        };
        let serialized = serde_json::to_string(&summary).unwrap();
        let d: PdmStatisticsSummary = serde_json::from_str(&serialized).unwrap();
        assert_eq!(d.total_processes, 10);
        assert_eq!(d.active_processes, 8);
        assert_eq!(d.total_formulas, 5);
        assert_eq!(d.active_formulas, 4);
        assert_eq!(d.total_batches, 20);
        assert_eq!(d.planning_batches, 5);
        assert_eq!(d.in_progress_batches, 7);
        assert_eq!(d.completed_batches, 6);
        assert_eq!(d.cancelled_batches, 2);
        assert_eq!(d.total_steps, 50);
        assert_eq!(d.total_reject_quantity, 10);
    }

    #[test]
    fn test_pdm_statistics_summary_all_zero() {
        let summary = PdmStatisticsSummary {
            total_processes: 0,
            active_processes: 0,
            total_formulas: 0,
            active_formulas: 0,
            total_batches: 0,
            planning_batches: 0,
            in_progress_batches: 0,
            completed_batches: 0,
            cancelled_batches: 0,
            total_steps: 0,
            total_output_quantity: None,
            total_reject_quantity: 0,
            average_pass_rate: BigDecimal::from(0),
        };
        let v = serde_json::to_value(&summary).unwrap();
        assert!(v["total_output_quantity"].is_null());
        assert_eq!(v["total_processes"], 0);
    }
}

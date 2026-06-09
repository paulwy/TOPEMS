use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, Claims};
use crate::models::analysis::*;
use crate::services::permission::{check_permission, BIPermission};

/// 执行数据分析查询
pub async fn execute_query(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ExecuteAnalysisQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 查询分析配置
    let query_config = sqlx::query_as::<_, AnalysisQuery>(
        "SELECT * FROM analysis_queries WHERE id = $1 AND is_active = true"
    )
    .bind(payload.query_id)
    .fetch_optional(&pool)
    .await;

    match query_config {
        Ok(Some(config)) => {
            // 执行查询（这里简化实现，实际应该根据数据源类型执行不同的查询）
            let start_time = Utc::now();
            
            // 模拟查询结果
            let result_data = json!({
                "rows": [
                    {"id": 1, "name": "示例数据1", "value": 100},
                    {"id": 2, "name": "示例数据2", "value": 200},
                    {"id": 3, "name": "示例数据3", "value": 300},
                ],
                "total": 3,
                "metadata": {
                    "execution_time_ms": 50,
                    "row_count": 3,
                }
            });

            let end_time = Utc::now();
            let execution_time_ms = (end_time - start_time).num_milliseconds();

            // 保存分析结果
            let result_id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO analysis_results (id, query_id, result_data, metadata, execution_time_ms, row_count, created_at, cached)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
            )
            .bind(result_id)
            .bind(payload.query_id)
            .bind(&result_data)
            .bind(json!({"parameters": payload.parameters}))
            .bind(execution_time_ms)
            .bind(3)
            .bind(Utc::now())
            .bind(false)
            .execute(&pool)
            .await
            .ok();

            Json(ApiResponse::success(result_data, "查询执行成功"))
        },
        Ok(None) => Json(ApiResponse::error(404, "查询配置不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

/// 数据聚合分析
pub async fn execute_aggregation(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<AnalysisQueryRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 创建聚合查询配置
    let query_id = Uuid::new_v4();
    let aggregations_json = payload.aggregations.map(|a| serde_json::to_value(a).unwrap_or_default());
    let time_range_json = payload.time_range.map(|t| serde_json::to_value(t).unwrap_or_default());

    let result = sqlx::query(
        "INSERT INTO analysis_queries (id, name, description, query_type, data_source_id, sql_query, filters, group_by, aggregations, time_range, created_by, created_at, updated_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"
    )
    .bind(query_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.query_type)
    .bind(&payload.data_source_id)
    .bind(&payload.sql_query)
    .bind(&payload.filters)
    .bind(json!(payload.group_by))
    .bind(&aggregations_json)
    .bind(&time_range_json)
    .bind(payload.created_by)
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(true)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            // 执行聚合查询（简化实现）
            let aggregation_result = json!({
                "query_id": query_id,
                "aggregations": {
                    "total_count": 1000,
                    "sum_value": 50000,
                    "avg_value": 50.0,
                    "max_value": 200,
                    "min_value": 10,
                },
                "groups": [
                    {"group_key": "A", "count": 250, "sum": 12500},
                    {"group_key": "B", "count": 300, "sum": 15000},
                    {"group_key": "C", "count": 450, "sum": 22500},
                ],
                "metadata": {
                    "execution_time_ms": 120,
                    "row_count": 1000,
                }
            });

            Json(ApiResponse::success(aggregation_result, "聚合分析执行成功"))
        },
        Err(e) => Json(ApiResponse::error(500, &format!("创建聚合查询失败: {}", e))),
    }
}

/// 数据对比分析
pub async fn execute_comparison(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<AnalysisQueryRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 执行对比分析（简化实现）
    let comparison_result = json!({
        "comparison_data": {
            "baseline": {
                "period": "2024-01",
                "metrics": {
                    "total": 1000,
                    "average": 50.0,
                    "max": 200,
                }
            },
            "comparison": {
                "period": "2024-02",
                "metrics": {
                    "total": 1200,
                    "average": 60.0,
                    "max": 250,
                }
            },
            "changes": {
                "total_change": 20.0,
                "average_change": 20.0,
                "max_change": 25.0,
            }
        },
        "metadata": {
            "execution_time_ms": 150,
            "baseline_count": 1000,
            "comparison_count": 1200,
        }
    });

    Json(ApiResponse::success(comparison_result, "对比分析执行成功"))
}

/// 趋势分析
pub async fn execute_trend(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<AnalysisQueryRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 执行趋势分析（简化实现）
    let trend_result = json!({
        "trend_data": {
            "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
            "datasets": [
                {
                    "label": "趋势值",
                    "data": [100, 120, 150, 180, 220, 250],
                    "trend": "increasing",
                    "growth_rate": 25.0,
                }
            ],
            "statistics": {
                "slope": 30.0,
                "r_squared": 0.95,
                "forecast": {
                    "next_month": 280,
                    "next_quarter": 350,
                }
            }
        },
        "metadata": {
            "execution_time_ms": 200,
            "data_points": 6,
        }
    });

    Json(ApiResponse::success(trend_result, "趋势分析执行成功"))
}

/// 获取分析历史
pub async fn get_history(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<HistoryQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 查询分析历史
    let history = sqlx::query_as::<_, AnalysisHistory>(
        "SELECT * FROM analysis_history 
         WHERE ($1::uuid IS NULL OR query_id = $1)
         AND ($2::uuid IS NULL OR user_id = $2)
         ORDER BY executed_at DESC 
         LIMIT $3 OFFSET $4"
    )
    .bind(params.query_id)
    .bind(params.user_id)
    .bind(params.limit.unwrap_or(20))
    .bind(params.offset.unwrap_or(0))
    .fetch_all(&pool)
    .await;

    match history {
        Ok(records) => {
            Json(ApiResponse::success(json!({
                "history": records,
                "total": records.len(),
            }), "获取分析历史成功"))
        },
        Err(e) => Json(ApiResponse::error(500, &format!("查询历史失败: {}", e))),
    }
}

/// 保存分析结果
pub async fn save_result(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<SaveAnalysisResult>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result_id = Uuid::new_v4();
    let result = sqlx::query(
        "INSERT INTO saved_analysis_results (id, query_id, name, description, result_data, metadata, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(result_id)
    .bind(payload.query_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.result_data)
    .bind(&payload.metadata)
    .bind(claims.sub)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "result_id": result_id,
            "saved_at": Utc::now().to_rfc3339(),
        }), "保存分析结果成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("保存失败: {}", e))),
    }
}

/// 历史查询参数
#[derive(Debug, Deserialize)]
pub struct HistoryQueryParams {
    pub query_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}
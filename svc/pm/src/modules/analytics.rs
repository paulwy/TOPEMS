//! PM 分析聚合 API
//! 提供项目创建趋势等聚合查询
//! 路径前缀: /pm/analytics

use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ===== 数据类型 =====

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectTrendItem {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStatusItem {
    pub status: String,
    pub count: i64,
    pub percentage: f64,
}

// ===== API 处理函数 =====

/// 获取项目创建趋势（最近7天）
pub async fn get_project_trend(
    State(pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ProjectTrendItem>>> {
    tracing::info!("获取PM项目创建趋势数据");

    let rows: Vec<(Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT 
            dates.date::text as date,
            COALESCE(p.count, 0) as count
         FROM (
             SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as date
         ) dates
         LEFT JOIN (
             SELECT DATE(created_at) as date, COUNT(*) as count
             FROM pm.projects
             WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY DATE(created_at)
         ) p ON dates.date = p.date
         ORDER BY dates.date"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let items: Vec<ProjectTrendItem> = rows
        .into_iter()
        .map(|(date, count)| ProjectTrendItem {
            date: date.unwrap_or_default(),
            count: count.unwrap_or(0),
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取项目状态分布
pub async fn get_project_status(
    State(pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ProjectStatusItem>>> {
    tracing::info!("获取PM项目状态分布");

    let total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM pm.projects WHERE deleted_at IS NULL")
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

    let rows: Vec<(Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT status, COUNT(*) as count
         FROM pm.projects
         WHERE deleted_at IS NULL
         GROUP BY status
         ORDER BY count DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let items: Vec<ProjectStatusItem> = rows
        .into_iter()
        .map(|(status, count)| {
            let cnt = count.unwrap_or(0);
            let percentage = if total > 0 {
                (cnt as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            ProjectStatusItem {
                status: status.unwrap_or_else(|| "未知".to_string()),
                count: cnt,
                percentage,
            }
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

// ===== 路由注册 =====

pub fn create_routes(db: PgPool) -> Router {
    Router::new()
        .route("/analytics/project-trend", get(get_project_trend))
        .route("/analytics/project-status", get(get_project_status))
        .with_state(db)
}

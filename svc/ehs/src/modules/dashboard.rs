//! EHS Dashboard 聚合端点
//!
//! 补齐前端 ehsDashboardApi 调用的 /dashboard 缺口。
//! 从 qa_ehs_accidents / qa_ehs_hazards / qa_ehs_trainings / qa_ehs_drill_records
//! 聚合统计数据返回。

use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::Row;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new().route("/dashboard", get(get_dashboard))
}

#[derive(Debug, Serialize)]
pub struct NameValue {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, Serialize)]
pub struct EhsDashboardStats {
    pub total_accidents: i64,
    pub pending_hazards: i64,
    pub training_rate: f64,
    pub drill_count: i64,
    pub accident_trend: Vec<NameValue>,
    pub hazard_types: Vec<NameValue>,
    pub training_trend: Vec<NameValue>,
}

pub async fn get_dashboard(
    State(state): State<crate::shared::AppState>,
) -> Json<ApiResponse<EhsDashboardStats>> {
    let pool = &state.pool;

    // --- 事故统计 ---
    let total_accidents: i64 = sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_accidents")
        .fetch_one(pool)
        .await
        .ok()
        .and_then(|r| r.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let reported_accidents: i64 =
        sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_accidents WHERE status = 'reported'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let investigating_accidents: i64 =
        sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_accidents WHERE status = 'investigating'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let treating_accidents: i64 =
        sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_accidents WHERE status = 'treating'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let closed_accidents: i64 =
        sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_accidents WHERE status = 'closed'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    // --- 隐患统计 ---
    let pending_hazards: i64 =
        sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_hazards WHERE status != 'closed'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    // 隐患按类别分组
    let hazard_rows = sqlx::query(
        "SELECT COALESCE(category, '未分类') AS cat, COUNT(*) AS cnt FROM ehs.qa_ehs_hazards GROUP BY category ORDER BY cnt DESC LIMIT 10",
    )
    .fetch_all(pool)
    .await
    .ok();

    let hazard_types: Vec<NameValue> = hazard_rows
        .map(|rows| {
            rows.into_iter()
                .map(|r| NameValue {
                    name: r
                        .try_get::<String, _>("cat")
                        .unwrap_or_else(|_| "未分类".to_string()),
                    value: r.try_get::<i64, _>("cnt").unwrap_or(0),
                })
                .collect()
        })
        .unwrap_or_default();

    // --- 培训统计 ---
    let total_trainings: i64 = sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_trainings")
        .fetch_one(pool)
        .await
        .ok()
        .and_then(|r| r.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let completed_trainings: i64 =
        sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_trainings WHERE status = 'completed'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let scheduled_trainings: i64 =
        sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_trainings WHERE status = 'scheduled'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let training_rate = if total_trainings == 0 {
        0.0
    } else {
        (completed_trainings as f64 / total_trainings as f64) * 100.0
    };

    // --- 应急演练统计 ---
    let drill_count: i64 = sqlx::query("SELECT COUNT(*) FROM ehs.qa_ehs_drill_records")
        .fetch_one(pool)
        .await
        .ok()
        .and_then(|r| r.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let stats = EhsDashboardStats {
        total_accidents,
        pending_hazards,
        training_rate,
        drill_count,
        accident_trend: vec![
            NameValue {
                name: "已报告".to_string(),
                value: reported_accidents,
            },
            NameValue {
                name: "调查中".to_string(),
                value: investigating_accidents,
            },
            NameValue {
                name: "处理中".to_string(),
                value: treating_accidents,
            },
            NameValue {
                name: "已闭环".to_string(),
                value: closed_accidents,
            },
        ],
        hazard_types,
        training_trend: vec![
            NameValue {
                name: "已完成".to_string(),
                value: completed_trainings,
            },
            NameValue {
                name: "计划中".to_string(),
                value: scheduled_trainings,
            },
        ],
    };

    Json(ApiResponse::success(stats, "获取EHS仪表盘数据成功"))
}

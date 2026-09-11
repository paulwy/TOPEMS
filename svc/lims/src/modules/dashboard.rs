//! LIMS Dashboard 聚合端点
//!
//! 补齐前端 LimsDashboardPage 真实消费的 /dashboard 缺口。
//! 从 qa_lab_samples / qa_lab_tasks / qa_lab_records / qa_lab_instruments
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
pub struct LimsDashboardStats {
    pub pending_samples: i64,
    pub in_progress_tasks: i64,
    pub instrument_usage: f64,
    pub pass_rate: f64,
    pub test_items: Vec<NameValue>,
    pub task_completion: Vec<NameValue>,
    pub instrument_status: Vec<NameValue>,
}

pub async fn get_dashboard(
    State(state): State<crate::shared::AppState>,
) -> Json<ApiResponse<LimsDashboardStats>> {
    let pool = &state.pool;

    // --- 样品状态分布 ---
    let received_samples: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'received'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let testing_samples: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'testing'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let completed_samples: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'completed'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let cancelled_samples: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'cancelled'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    // --- 任务状态分布 ---
    let pending_tasks: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_tasks WHERE status = 'pending'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let in_progress_tasks: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_tasks WHERE status = 'in_progress'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let completed_tasks: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_tasks WHERE status = 'completed'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    // --- 仪器状态分布 ---
    let total_instruments: i64 = sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments")
        .fetch_one(pool)
        .await
        .ok()
        .and_then(|r| r.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let normal_instruments: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'normal'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let calibration_instruments: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'calibration'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let maintenance_instruments: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'maintenance'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let disabled_instruments: i64 =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'disabled'")
            .fetch_one(pool)
            .await
            .ok()
            .and_then(|r| r.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    // --- 检验记录合格率 ---
    let total_records: i64 = sqlx::query("SELECT COUNT(*) FROM qa_lab_records")
        .fetch_one(pool)
        .await
        .ok()
        .and_then(|r| r.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let passed_records: i64 = sqlx::query("SELECT COUNT(*) FROM qa_lab_records WHERE (conclusion = 'pass' OR conclusion = 'qualified' OR conclusion = '合格')")
        .fetch_one(pool)
        .await
        .ok()
        .and_then(|r| r.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let pass_rate = if total_records == 0 {
        0.0
    } else {
        (passed_records as f64 / total_records as f64) * 100.0
    };

    // 仪器使用率 = 正常仪器占比
    let instrument_usage = if total_instruments == 0 {
        0.0
    } else {
        (normal_instruments as f64 / total_instruments as f64) * 100.0
    };

    let stats = LimsDashboardStats {
        pending_samples: received_samples,
        in_progress_tasks,
        instrument_usage,
        pass_rate,
        test_items: vec![
            NameValue {
                name: "待检".to_string(),
                value: received_samples,
            },
            NameValue {
                name: "检测中".to_string(),
                value: testing_samples,
            },
            NameValue {
                name: "已完成".to_string(),
                value: completed_samples,
            },
            NameValue {
                name: "已取消".to_string(),
                value: cancelled_samples,
            },
        ],
        task_completion: vec![
            NameValue {
                name: "待开始".to_string(),
                value: pending_tasks,
            },
            NameValue {
                name: "进行中".to_string(),
                value: in_progress_tasks,
            },
            NameValue {
                name: "已完成".to_string(),
                value: completed_tasks,
            },
        ],
        instrument_status: vec![
            NameValue {
                name: "正常".to_string(),
                value: normal_instruments,
            },
            NameValue {
                name: "校准中".to_string(),
                value: calibration_instruments,
            },
            NameValue {
                name: "维护中".to_string(),
                value: maintenance_instruments,
            },
            NameValue {
                name: "停用".to_string(),
                value: disabled_instruments,
            },
        ],
    };

    Json(ApiResponse::success(stats, "获取LIMS仪表盘数据成功"))
}

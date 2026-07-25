use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::Row;
use topems_shared::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new().route("/statistics", get(get_statistics))
}

#[derive(Debug, Serialize)]
pub struct Statistics {
    pub total_samples: i64,
    pub pending_samples: i64,
    pub testing_samples: i64,
    pub completed_samples: i64,
    pub cancelled_samples: i64,

    pub total_tasks: i64,
    pub pending_tasks: i64,
    pub in_progress_tasks: i64,
    pub completed_tasks: i64,

    pub total_processes: i64,

    pub total_instruments: i64,
    pub normal_instruments: i64,
    pub calibration_instruments: i64,
    pub maintenance_instruments: i64,
    pub disabled_instruments: i64,
}

pub async fn get_statistics(
    State(state): State<crate::shared::AppState>,
) -> Json<ApiResponse<Statistics>> {
    let total_samples = sqlx::query("SELECT COUNT(*) FROM qa_lab_samples")
        .fetch_one(&state.pool)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let pending_samples =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'received'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let testing_samples =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'testing'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let completed_samples =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'completed'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let cancelled_samples =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_samples WHERE status = 'cancelled'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let total_tasks = sqlx::query("SELECT COUNT(*) FROM qa_lab_tasks")
        .fetch_one(&state.pool)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let pending_tasks = sqlx::query("SELECT COUNT(*) FROM qa_lab_tasks WHERE status = 'pending'")
        .fetch_one(&state.pool)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let in_progress_tasks =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_tasks WHERE status = 'in_progress'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let completed_tasks =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_tasks WHERE status = 'completed'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let total_processes = sqlx::query("SELECT COUNT(*) FROM qa_lab_processes")
        .fetch_one(&state.pool)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let total_instruments = sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments")
        .fetch_one(&state.pool)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let normal_instruments =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'normal'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let calibration_instruments =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'calibration'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let maintenance_instruments =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'maintenance'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let disabled_instruments =
        sqlx::query("SELECT COUNT(*) FROM qa_lab_instruments WHERE status = 'disabled'")
            .fetch_one(&state.pool)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    Json(ApiResponse::success(
        Statistics {
            total_samples,
            pending_samples,
            testing_samples,
            completed_samples,
            cancelled_samples,
            total_tasks,
            pending_tasks,
            in_progress_tasks,
            completed_tasks,
            total_processes,
            total_instruments,
            normal_instruments,
            calibration_instruments,
            maintenance_instruments,
            disabled_instruments,
        },
        "获取统计数据成功",
    ))
}

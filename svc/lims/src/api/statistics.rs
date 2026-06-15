use axum::{extract::State, Json, Router};
use sqlx::postgres::PgPool;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<PgPool> {
    Router::new().route("/api/v1/statistics", axum::routing::get(get_statistics))
}

async fn get_statistics(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    let total_samples = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.samples WHERE status != 'deleted'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let pending_samples = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.samples WHERE status = 'pending'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let testing_samples = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.samples WHERE status = 'testing'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let completed_samples = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.samples WHERE status = 'completed'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let cancelled_samples = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.samples WHERE status = 'cancelled'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.inspection_tasks WHERE status != 'deleted'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let pending_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.inspection_tasks WHERE status = 'pending'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let in_progress_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.inspection_tasks WHERE status = 'in_progress'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let completed_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.inspection_tasks WHERE status = 'completed'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_processes = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.inspection_processes WHERE status != 'deleted'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_instruments = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.instruments WHERE status != 'deleted'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let normal_instruments = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.instruments WHERE status = 'normal'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let calibration_instruments = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.instruments WHERE status = 'calibration'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let maintenance_instruments = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.instruments WHERE status = 'maintenance'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let disabled_instruments = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lims.instruments WHERE status = 'disabled'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let stats = serde_json::json!({
        "total_samples": total_samples,
        "pending_samples": pending_samples,
        "testing_samples": testing_samples,
        "completed_samples": completed_samples,
        "cancelled_samples": cancelled_samples,
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "completed_tasks": completed_tasks,
        "total_processes": total_processes,
        "total_instruments": total_instruments,
        "normal_instruments": normal_instruments,
        "calibration_instruments": calibration_instruments,
        "maintenance_instruments": maintenance_instruments,
        "disabled_instruments": disabled_instruments,
    });

    Json(ApiResponse::success(stats, "获取统计数据成功"))
}
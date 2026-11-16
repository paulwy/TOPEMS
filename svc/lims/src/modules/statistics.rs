use axum::{extract::State, routing::get, Extension, Router};
use serde::Serialize;
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:statistics:read"])),
    path = "/statistics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "statistics"
)]
pub async fn get_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Statistics> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取统计数据读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取统计数据失败");
        }
    };

    let total_samples = sqlx::query("SELECT COUNT(*) FROM public.qa_lab_samples")
        .fetch_one(&mut scope)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let pending_samples =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_samples WHERE status = 'received'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let testing_samples =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_samples WHERE status = 'testing'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let completed_samples =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_samples WHERE status = 'completed'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let cancelled_samples =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_samples WHERE status = 'cancelled'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let total_tasks = sqlx::query("SELECT COUNT(*) FROM public.qa_lab_tasks")
        .fetch_one(&mut scope)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let pending_tasks =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_tasks WHERE status = 'pending'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let in_progress_tasks =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_tasks WHERE status = 'in_progress'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let completed_tasks =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_tasks WHERE status = 'completed'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let total_processes = sqlx::query("SELECT COUNT(*) FROM public.qa_lab_processes")
        .fetch_one(&mut scope)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let total_instruments = sqlx::query("SELECT COUNT(*) FROM public.qa_lab_instruments")
        .fetch_one(&mut scope)
        .await
        .ok()
        .and_then(|row| row.try_get::<i64, _>(0).ok())
        .unwrap_or(0);

    let normal_instruments =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_instruments WHERE status = 'normal'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let calibration_instruments =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_instruments WHERE status = 'calibration'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let maintenance_instruments =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_instruments WHERE status = 'maintenance'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let disabled_instruments =
        sqlx::query("SELECT COUNT(*) FROM public.qa_lab_instruments WHERE status = 'disabled'")
            .fetch_one(&mut scope)
            .await
            .ok()
            .and_then(|row| row.try_get::<i64, _>(0).ok())
            .unwrap_or(0);

    let _ = scope.commit().await;

    ApiResponse::success(
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
    )
}

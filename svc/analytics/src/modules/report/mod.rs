//! Report module

pub mod report;
pub mod report_plugin;
pub mod schedule;
pub mod scheduler;
pub mod subscription;
pub mod template;

pub use scheduler::ReportScheduler;

use axum::routing::{get, post, put};
use axum::Router;
use sqlx::PgPool;

/// 报表中心读路由（由 routes.rs 叠加细粒度码 bi:report:read）
pub fn create_read_routes() -> Router<crate::shared::AppState> {
    Router::new()
        .route("/reports", get(report::list_reports))
        .route("/reports/{id}", get(report::get_report))
        .route("/reports/{id}/exports", get(report::list_export_jobs))
        .route("/reports/exports/{job_id}", get(report::get_export_job))
        .route(
            "/reports/exports/{job_id}/download",
            get(report::download_export),
        )
        .route("/templates", get(template::list_templates))
        .route("/templates/{id}", get(template::get_template))
        .route("/schedules", get(schedule::list_schedules))
        .route("/schedules/{id}", get(schedule::get_schedule))
        .route(
            "/schedules/{id}/history",
            get(schedule::get_execution_history),
        )
        .route("/subscriptions", get(subscription::list_subscriptions))
        .route("/subscriptions/{id}", get(subscription::get_subscription))
        .route(
            "/subscriptions/user/{user_id}",
            get(subscription::get_user_subscriptions),
        )
}

/// 报表中心写路由（由 routes.rs 叠加细粒度码 bi:report:write）
pub fn create_write_routes() -> Router<crate::shared::AppState> {
    Router::new()
        .route("/reports", post(report::create_report))
        .route(
            "/reports/from-template",
            post(report::create_report_from_template),
        )
        .route(
            "/reports/{id}",
            put(report::update_report).delete(report::delete_report),
        )
        .route("/reports/{id}/export", post(report::export_report))
        .route("/reports/{id}/run", post(report::run_report))
        .route("/templates", post(template::create_template))
        .route(
            "/templates/{id}",
            put(template::update_template).delete(template::delete_template),
        )
        .route("/schedules", post(schedule::create_schedule))
        .route(
            "/schedules/{id}",
            put(schedule::update_schedule).delete(schedule::delete_schedule),
        )
        .route("/schedules/{id}/execute", post(schedule::execute_schedule))
        .route("/schedules/{id}/toggle", post(schedule::toggle_schedule))
        .route("/subscriptions", post(subscription::create_subscription))
        .route(
            "/subscriptions/{id}",
            put(subscription::update_subscription).delete(subscription::delete_subscription),
        )
        .route(
            "/subscriptions/{id}/toggle",
            post(subscription::toggle_subscription),
        )
}

/// Initialize Report database tables
pub async fn run_schema_defense(pool: &PgPool) -> Result<(), sqlx::Error> {
    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[analytics] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

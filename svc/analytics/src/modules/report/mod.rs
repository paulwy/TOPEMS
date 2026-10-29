//! Report module

pub mod report;
pub mod report_plugin;
pub mod schedule;
pub mod scheduler;
pub mod subscription;
pub mod template;

pub use scheduler::ReportScheduler;

use axum::Router;
use sqlx::PgPool;

/// Create report API routes
pub fn create_routes() -> Router<crate::shared::AppState> {
    Router::new()
        .merge(report::create_routes())
        .merge(template::create_routes())
        .merge(schedule::create_routes())
        .merge(subscription::create_routes())
}

/// Initialize Report database tables
pub async fn run_schema_defense(pool: &PgPool) -> Result<(), sqlx::Error> {
    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[analytics] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

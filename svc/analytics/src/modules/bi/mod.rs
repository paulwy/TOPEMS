//! BI module - Business Intelligence

pub mod analytics;
pub mod chart_service;
pub mod comparison_analysis;
pub mod dashboard;
pub mod data_drilldown;
pub mod dataset;
pub mod dataset_whitelist;
pub mod datasource;
pub mod multidimensional_analysis;
pub mod plugin;
pub mod predictive_analysis;
pub mod row_level_permission;
pub mod self_service_report;
#[cfg(test)]
mod sql_injection_tests;
pub mod sync_records;
pub mod visualization;
pub mod websocket;
pub mod widget;

use sqlx::PgPool;

/// Initialize BI database tables
pub async fn run_schema_defense(pool: &PgPool) -> Result<(), sqlx::Error> {
    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[analytics] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

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

use sqlx::{PgPool, Postgres, Transaction};
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

/// 从 claims 取租户 UUID；缺失或非法时返回 nil（与 report 子系统一致）
pub(crate) fn tenant_uuid(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil)
}

/// 开启事务并在同连接设置 `app.tenant_id`（is_local，随事务结束失效），
/// 确保 RLS 上下文与业务 SQL 落在同一连接上。
pub(crate) async fn begin_tenant_txn(
    pool: &PgPool,
    claims: &Claims,
) -> Result<Transaction<'static, Postgres>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(tenant_uuid(claims).to_string())
        .execute(&mut *tx)
        .await?;
    Ok(tx)
}

/// Initialize BI database tables
pub async fn run_schema_defense(pool: &PgPool) -> Result<(), sqlx::Error> {
    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[analytics] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

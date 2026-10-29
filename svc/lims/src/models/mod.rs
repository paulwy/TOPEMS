pub mod audit_log;
pub mod schema_defense;

use sqlx::PgPool;

pub async fn run_schema_defense(pool: &PgPool) -> Result<(), sqlx::Error> {
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[lims] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

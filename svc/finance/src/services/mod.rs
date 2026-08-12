pub mod finance;

pub use finance::FinanceService;
pub use finance::ReconciliationService;

use sqlx::PgPool;
use topems_shared_core::error::TopemsError;

pub async fn init_database(pool: &PgPool) -> Result<(), TopemsError> {
    finance::init_database(pool).await?;
    finance::init_aux_tables(pool).await?;
    tracing::info!("✅ Finance module database initialized");

    // Finance 全模块增量迁移 + schema 自检（66 表 / 563 列）
    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::warn!("⚠️ Finance schema 防御初始化失败（不阻塞启动）: {}", e);
    }
    Ok(())
}

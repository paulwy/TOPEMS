pub mod finance;

pub use finance::FinanceService;
pub use finance::ReconciliationService;

use sqlx::PgPool;
use topems_shared_core::error::TopemsError;

pub async fn run_schema_defense(pool: &PgPool) -> Result<(), TopemsError> {
    // Finance 全模块增量迁移 + schema 自检（66 表 / 563 列；建表 DDL 已收敛至迁移链，D7）
    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::warn!("⚠️ Finance schema 防御初始化失败（不阻塞启动）: {}", e);
    }

    Ok(())
}

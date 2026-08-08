pub mod finance;

pub use finance::FinanceService;
pub use finance::ReconciliationService;

use sqlx::PgPool;
use topems_shared_core::error::TopemsError;

pub async fn init_database(pool: &PgPool) -> Result<(), TopemsError> {
    finance::init_database(pool).await?;
    finance::init_aux_tables(pool).await?;
    tracing::info!("✅ Finance module database initialized");
    Ok(())
}

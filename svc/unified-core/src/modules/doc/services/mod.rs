pub mod document;
pub mod folder;
pub mod template;

pub use document::DocumentService;
pub use folder::FolderService;
pub use template::TemplateService;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS doc")
        .execute(pool)
        .await?;

    document::init_database(pool).await?;
    template::init_database(pool).await?;
    folder::init_database(pool).await?;

    tracing::info!("✅ Document module database initialized");
    Ok(())
}

//! PDM module - Product Data Management

pub mod product;
pub mod material;
pub mod configuration;
pub mod document;
pub mod version;
pub mod plugin;

use sqlx::PgPool;

/// Initialize PDM database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create products table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            version VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create materials table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_materials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            material_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            spec VARCHAR(256),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_products_product_no ON pdm_products(product_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_materials_material_no ON pdm_materials(material_no)")
        .execute(pool)
        .await?;

    Ok(())
}

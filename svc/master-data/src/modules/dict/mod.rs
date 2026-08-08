pub mod handlers;
pub mod models;
pub mod seed;

pub use handlers::*;
pub use models::*;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_dict_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT 'general',
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_dict_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            dict_type_id UUID NOT NULL REFERENCES core_dict_types(id) ON DELETE CASCADE,
            code VARCHAR(100) NOT NULL,
            name VARCHAR(200) NOT NULL,
            value TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            parent_id UUID REFERENCES core_dict_items(id) ON DELETE SET NULL,
            extra_data JSONB,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(dict_type_id, code)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_dict_items_type_id ON core_dict_items(dict_type_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_dict_items_parent_id ON core_dict_items(parent_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_dict_types_category ON core_dict_types(category);")
        .execute(pool)
        .await?;

    Ok(())
}

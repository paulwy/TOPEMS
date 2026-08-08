pub mod handlers;
pub mod models;

pub use handlers::*;
pub use models::*;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_menu_groups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(200) NOT NULL,
            code VARCHAR(100) NOT NULL,
            icon VARCHAR(200),
            sort_order INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, code),
                deleted_at TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_menus (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            group_id UUID NOT NULL REFERENCES core_menu_groups(id) ON DELETE CASCADE,
            parent_id UUID REFERENCES core_menus(id) ON DELETE SET NULL,
            name VARCHAR(200) NOT NULL,
            code VARCHAR(100) NOT NULL,
            path VARCHAR(500),
            icon VARCHAR(200),
            sort_order INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            permissions JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, code),
                deleted_at TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_menu_groups_tenant_id ON core_menu_groups(tenant_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_menu_groups_status ON core_menu_groups(status);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_menus_tenant_id ON core_menus(tenant_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_menus_group_id ON core_menus(group_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_menus_parent_id ON core_menus(parent_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_menus_status ON core_menus(status);")
        .execute(pool)
        .await?;

    Ok(())
}

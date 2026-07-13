pub mod inbound;
pub mod inventory;
pub mod outbound;
pub mod warehouse;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_wms_warehouses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            address TEXT,
            manager VARCHAR(100),
            phone VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, code)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_wms_inventory (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            warehouse_id UUID REFERENCES core_wms_warehouses(id) ON DELETE CASCADE,
            material_code VARCHAR(50) NOT NULL,
            material_name VARCHAR(200),
            quantity DECIMAL(14,2) DEFAULT 0,
            unit VARCHAR(20),
            batch_number VARCHAR(50),
            location_code VARCHAR(100),
            locked_quantity DECIMAL(14,2) DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_wms_inbound_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            order_number VARCHAR(50) NOT NULL,
            warehouse_id UUID REFERENCES core_wms_warehouses(id),
            inbound_type VARCHAR(50) NOT NULL DEFAULT 'purchase',
            inbound_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            remarks TEXT,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, order_number)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_wms_outbound_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            order_number VARCHAR(50) NOT NULL,
            warehouse_id UUID REFERENCES core_wms_warehouses(id),
            outbound_type VARCHAR(50) NOT NULL DEFAULT 'sales',
            outbound_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            remarks TEXT,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, order_number)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wms_wh_tenant ON core_wms_warehouses(tenant_id);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_wms_in_tenant ON core_wms_inbound_orders(tenant_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_wms_out_tenant ON core_wms_outbound_orders(tenant_id);",
    )
    .execute(pool)
    .await?;

    Ok(())
}

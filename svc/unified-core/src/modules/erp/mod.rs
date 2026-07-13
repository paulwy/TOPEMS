pub mod customer;
pub mod inventory;
pub mod material;
pub mod purchase;
pub mod sales;
pub mod supplier;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_erp_suppliers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            contact_person VARCHAR(100),
            phone VARCHAR(50),
            email VARCHAR(200),
            address TEXT,
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
        CREATE TABLE IF NOT EXISTS core_erp_customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            contact_person VARCHAR(100),
            phone VARCHAR(50),
            email VARCHAR(200),
            address TEXT,
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
        CREATE TABLE IF NOT EXISTS core_erp_materials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            specification TEXT,
            unit VARCHAR(20),
            category VARCHAR(100),
            price DECIMAL(12,2) DEFAULT 0,
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
        CREATE TABLE IF NOT EXISTS core_erp_purchase_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            order_number VARCHAR(50) NOT NULL,
            supplier_id UUID REFERENCES core_erp_suppliers(id),
            order_date DATE NOT NULL,
            expected_date DATE,
            total_amount DECIMAL(14,2) DEFAULT 0,
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
        CREATE TABLE IF NOT EXISTS core_erp_sales_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            order_number VARCHAR(50) NOT NULL,
            customer_id UUID REFERENCES core_erp_customers(id),
            order_date DATE NOT NULL,
            expected_date DATE,
            total_amount DECIMAL(14,2) DEFAULT 0,
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
        CREATE TABLE IF NOT EXISTS core_erp_inventory (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            material_id UUID REFERENCES core_erp_materials(id),
            warehouse_code VARCHAR(50),
            quantity DECIMAL(14,2) DEFAULT 0,
            unit VARCHAR(20),
            batch_number VARCHAR(50),
            location VARCHAR(100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_erp_po_tenant ON core_erp_purchase_orders(tenant_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_erp_so_tenant ON core_erp_sales_orders(tenant_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_erp_inv_tenant ON core_erp_inventory(tenant_id);")
        .execute(pool)
        .await?;

    Ok(())
}

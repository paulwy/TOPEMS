pub mod contact;
pub mod customer;
pub mod opportunity;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_crm_customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(200) NOT NULL,
            industry VARCHAR(100),
            scale VARCHAR(50),
            source VARCHAR(50),
            contact_person VARCHAR(100),
            phone VARCHAR(50),
            email VARCHAR(200),
            address TEXT,
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
        CREATE TABLE IF NOT EXISTS core_crm_contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            customer_id UUID REFERENCES core_crm_customers(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            position VARCHAR(100),
            phone VARCHAR(50),
            email VARCHAR(200),
            is_primary BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_crm_opportunities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            customer_id UUID REFERENCES core_crm_customers(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            amount DECIMAL(14,2) DEFAULT 0,
            stage VARCHAR(50) NOT NULL DEFAULT 'lead',
            expected_close_date DATE,
            probability INTEGER DEFAULT 0,
            owner_id UUID,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_crm_cust_tenant ON core_crm_customers(tenant_id);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_crm_opp_tenant ON core_crm_opportunities(tenant_id);",
    )
    .execute(pool)
    .await?;

    Ok(())
}

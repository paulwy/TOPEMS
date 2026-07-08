//! Tenant module - Multi-tenant Management
//!
//! Supports:
//! - Independent database mode (one database per tenant)
//! - Shared database mode (row-level isolation via tenant_id)

pub mod handlers;
pub mod models;

use sqlx::PgPool;

/// Initialize Tenant database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Tenants table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_tenants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            code VARCHAR(64) NOT NULL UNIQUE,  -- Used for subdomains
            tenant_type VARCHAR(32) DEFAULT 'shared',  -- 'independent' | 'shared'
            
            -- Plan and licensing
            plan VARCHAR(32) DEFAULT 'basic',  -- 'basic' | 'professional' | 'enterprise'
            license_type VARCHAR(32) DEFAULT 'subscription',  -- 'perpetual' | 'subscription'
            license_expires_at TIMESTAMP,
            
            -- Database config (for independent mode)
            database_host VARCHAR(256),
            database_port INTEGER DEFAULT 5432,
            database_name VARCHAR(64),
            
            -- Quota limits
            quota_users INTEGER DEFAULT 20,
            quota_storage_gb BIGINT DEFAULT 10,
            quota_api_calls BIGINT DEFAULT 100000,
            quota_plugins TEXT[],  -- Available plugins
            
            -- Feature flags
            features JSONB DEFAULT '{}',
            
            -- Status
            status VARCHAR(32) DEFAULT 'trial',  -- 'active' | 'suspended' | 'trial' | 'expired'
            trial_expires_at TIMESTAMP,
            
            -- Metadata
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            activated_at TIMESTAMP,
            suspended_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Tenant usage statistics
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_tenant_usage (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            
            -- Usage metrics
            users_count INTEGER DEFAULT 0,
            storage_used_mb BIGINT DEFAULT 0,
            api_calls_count BIGINT DEFAULT 0,
            
            -- Billing period
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            
            -- Costs
            base_cost DECIMAL(10, 2) DEFAULT 0,
            overage_cost DECIMAL(10, 2) DEFAULT 0,
            plugin_cost DECIMAL(10, 2) DEFAULT 0,
            total_cost DECIMAL(10, 2) DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, period_start)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Tenant modules (activated plugins/features)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_tenant_modules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            module_code VARCHAR(64) NOT NULL,
            module_name VARCHAR(128),
            is_active BOOLEAN DEFAULT TRUE,
            activated_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP,
            UNIQUE(tenant_id, module_code)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Tenant settings (key-value store)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_tenant_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            setting_key VARCHAR(128) NOT NULL,
            setting_value TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, setting_key)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Tenant users table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_tenant_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            email VARCHAR(256) NOT NULL,
            role VARCHAR(32) DEFAULT 'member',
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            last_login TIMESTAMP,
            UNIQUE(tenant_id, user_id),
            UNIQUE(tenant_id, email)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_tenants_code ON core_tenants(code)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_tenants_status ON core_tenants(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_tenant_usage_period ON core_tenant_usage(tenant_id, period_start)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_tenant_users_tenant ON core_tenant_users(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_tenant_users_email ON core_tenant_users(email)",
    )
    .execute(pool)
    .await?;

    Ok(())
}

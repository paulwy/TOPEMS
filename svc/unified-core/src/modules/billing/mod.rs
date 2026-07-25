#![allow(dead_code)]
//! # [DEPRECATED] Billing 模块已迁移为独立微服务
//!
//! 本模块已废弃，请使用独立服务 `svc/billing`（端口 8085）。
//!
//! ## 迁移说明
//! - 独立服务路径：`svc/billing/`
//! - API 路由：`/api/billing/*`
//! - 旧路由别名：`/api/core/billing/*`（通过反向代理兼容）
//!
//! 本模块代码保留用于参考，将在未来版本中移除。

pub mod handlers;
pub mod models;

use sqlx::PgPool;

/// Initialize Billing database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Billing plans table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_billing_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            
            -- Plan type
            license_type VARCHAR(32) DEFAULT 'subscription',  -- 'perpetual' | 'subscription'
            
            -- Base pricing (in cents)
            price_cents INTEGER NOT NULL DEFAULT 0,
            price_period VARCHAR(32) DEFAULT 'monthly',  -- 'monthly' | 'yearly'
            
            -- Included quotas
            included_users INTEGER DEFAULT 5,
            included_storage_gb BIGINT DEFAULT 5,
            included_api_calls BIGINT DEFAULT 50000,
            
            -- Modules included
            included_modules TEXT[],
            
            -- Overage pricing (in cents)
            overage_users_cents INTEGER DEFAULT 500,  -- per user/month
            overage_storage_cents INTEGER DEFAULT 50,  -- per GB/month
            overage_api_calls_cents INTEGER DEFAULT 10,  -- per 1000 calls
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_trial BOOLEAN DEFAULT FALSE,
            
            -- Metadata
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Subscriptions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            plan_id UUID NOT NULL REFERENCES core_billing_plans(id),
            
            -- Subscription status
            status VARCHAR(32) DEFAULT 'active',  -- 'active' | 'cancelled' | 'expired' | 'trial'
            
            -- Billing period
            current_period_start DATE NOT NULL,
            current_period_end DATE NOT NULL,
            
            -- Trial info
            is_trial BOOLEAN DEFAULT FALSE,
            trial_ends_at TIMESTAMP,
            
            -- Cancellation
            cancelled_at TIMESTAMP,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            
            -- Metadata
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(tenant_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Billing invoices table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_billing_invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            subscription_id UUID REFERENCES core_subscriptions(id),
            
            -- Invoice info
            invoice_number VARCHAR(64) NOT NULL,
            status VARCHAR(32) DEFAULT 'draft',  -- 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
            
            -- Amounts (in cents)
            subtotal_cents INTEGER DEFAULT 0,
            discount_cents INTEGER DEFAULT 0,
            tax_cents INTEGER DEFAULT 0,
            total_cents INTEGER DEFAULT 0,
            
            -- Period
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            
            -- Payment
            paid_at TIMESTAMP,
            payment_method VARCHAR(64),
            payment_reference VARCHAR(256),
            
            -- Line items
            line_items JSONB DEFAULT '[]',
            
            -- Metadata
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(tenant_id, invoice_number)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Usage records table (for detailed usage tracking)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_usage_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            
            -- Usage type
            metric_type VARCHAR(64) NOT NULL,  -- 'users' | 'storage' | 'api_calls' | 'plugin_usage'
            metric_name VARCHAR(128),
            
            -- Quantity
            quantity BIGINT NOT NULL DEFAULT 0,
            unit VARCHAR(32),
            
            -- Period
            period_start TIMESTAMP NOT NULL,
            period_end TIMESTAMP NOT NULL,
            
            -- Cost (in cents)
            cost_cents INTEGER DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Plugin pricing table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_plugin_pricing (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plugin_code VARCHAR(64) NOT NULL UNIQUE,
            plugin_name VARCHAR(128) NOT NULL,
            
            -- Pricing (in cents)
            base_price_cents INTEGER DEFAULT 0,
            per_user_price_cents INTEGER DEFAULT 0,  -- 每人月费
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_subscriptions_tenant ON core_subscriptions(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_invoices_tenant ON core_billing_invoices(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_invoices_status ON core_billing_invoices(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_usage_tenant_period ON core_usage_records(tenant_id, period_start)")
        .execute(pool)
        .await?;

    // Insert default plans
    sqlx::query(
        r#"
        INSERT INTO core_billing_plans (code, name, description, license_type, price_cents, price_period, included_users, included_storage_gb, included_api_calls, included_modules)
        VALUES 
            ('basic', '基础版', '适合小团队，包含核心功能', 'perpetual', 29999, 'yearly', 20, 10, 100000, ARRAY['iam', 'doc', 'flow', 'file']),
            ('basic-monthly', '基础版（月付）', '适合小团队，按月付费', 'subscription', 299, 'monthly', 20, 10, 100000, ARRAY['iam', 'doc', 'flow', 'file']),
            ('professional', '专业版', '适合成长型企业', 'perpetual', 99999, 'yearly', 100, 100, 500000, ARRAY['iam', 'doc', 'flow', 'file', 'comm', 'erp', 'hrms', 'crm']),
            ('professional-monthly', '专业版（月付）', '适合成长型企业，按月付费', 'subscription', 999, 'monthly', 100, 100, 500000, ARRAY['iam', 'doc', 'flow', 'file', 'comm', 'erp', 'hrms', 'crm']),
            ('enterprise', '企业版', '适合大型企业，无限用户', 'perpetual', 199999, 'yearly', -1, 1000, -1, ARRAY['*']),
            ('enterprise-monthly', '企业版（月付）', '适合大型企业，无限用户', 'subscription', 1999, 'monthly', -1, 1000, -1, ARRAY['*'])
        ON CONFLICT (code) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

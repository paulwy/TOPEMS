CREATE TABLE IF NOT EXISTS core_billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    license_type VARCHAR(32) DEFAULT 'subscription',
    price_cents INTEGER NOT NULL DEFAULT 0,
    price_period VARCHAR(32) DEFAULT 'monthly',
    included_users INTEGER DEFAULT 5,
    included_storage_gb BIGINT DEFAULT 5,
    included_api_calls BIGINT DEFAULT 50000,
    included_modules TEXT[],
    overage_users_cents INTEGER DEFAULT 500,
    overage_storage_cents INTEGER DEFAULT 50,
    overage_api_calls_cents INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    is_trial BOOLEAN DEFAULT FALSE,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    plan_id UUID NOT NULL REFERENCES core_billing_plans(id),
    status VARCHAR(32) DEFAULT 'active',
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    is_trial BOOLEAN DEFAULT FALSE,
    trial_ends_at timestamptz,
    cancelled_at timestamptz,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS core_billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    subscription_id UUID REFERENCES core_subscriptions(id),
    invoice_number VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'draft',
    subtotal_cents INTEGER DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    paid_at timestamptz,
    payment_method VARCHAR(64),
    payment_reference VARCHAR(256),
    line_items JSONB DEFAULT '[]',
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS core_usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    metric_type VARCHAR(64) NOT NULL,
    metric_name VARCHAR(128),
    quantity BIGINT NOT NULL DEFAULT 0,
    unit VARCHAR(32),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    cost_cents INTEGER DEFAULT 0,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_plugin_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_code VARCHAR(64) NOT NULL UNIQUE,
    plugin_name VARCHAR(128) NOT NULL,
    base_price_cents INTEGER DEFAULT 0,
    per_user_price_cents INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_subscriptions_tenant ON core_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_invoices_tenant ON core_billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_invoices_status ON core_billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_core_usage_tenant_period ON core_usage_records(tenant_id, period_start);
CREATE INDEX IF NOT EXISTS idx_core_billing_plans_tenant ON core_billing_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_plugin_pricing_tenant ON core_plugin_pricing(tenant_id);
CREATE TABLE IF NOT EXISTS core_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    tenant_type VARCHAR(32) DEFAULT 'shared',
    plan VARCHAR(32) DEFAULT 'basic',
    license_type VARCHAR(32) DEFAULT 'subscription',
    license_expires_at TIMESTAMP,
    database_host VARCHAR(256),
    database_port INTEGER DEFAULT 5432,
    database_name VARCHAR(64),
    quota_users INTEGER DEFAULT 20,
    quota_storage_gb BIGINT DEFAULT 10,
    quota_api_calls BIGINT DEFAULT 100000,
    quota_plugins TEXT[],
    features JSONB DEFAULT '{}',
    status VARCHAR(32) DEFAULT 'trial',
    trial_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    activated_at TIMESTAMP,
    suspended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core_tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    users_count INTEGER DEFAULT 0,
    storage_used_mb BIGINT DEFAULT 0,
    api_calls_count BIGINT DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_cost DECIMAL(10, 2) DEFAULT 0,
    overage_cost DECIMAL(10, 2) DEFAULT 0,
    plugin_cost DECIMAL(10, 2) DEFAULT 0,
    total_cost DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, period_start)
);

CREATE TABLE IF NOT EXISTS core_tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    module_code VARCHAR(64) NOT NULL,
    module_name VARCHAR(128),
    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(tenant_id, module_code)
);

CREATE TABLE IF NOT EXISTS core_tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    setting_key VARCHAR(128) NOT NULL,
    setting_value TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

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
);

CREATE INDEX IF NOT EXISTS idx_core_tenants_code ON core_tenants(code);
CREATE INDEX IF NOT EXISTS idx_core_tenants_status ON core_tenants(status);
CREATE INDEX IF NOT EXISTS idx_core_tenant_usage_period ON core_tenant_usage(tenant_id, period_start);
CREATE INDEX IF NOT EXISTS idx_core_tenant_users_tenant ON core_tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenant_users_email ON core_tenant_users(email);
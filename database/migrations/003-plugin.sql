CREATE TABLE IF NOT EXISTS core_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    version VARCHAR(32) NOT NULL,
    plugin_type VARCHAR(32) DEFAULT 'business',
    is_installed BOOLEAN DEFAULT FALSE,
    installed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP,
    is_free BOOLEAN DEFAULT TRUE,
    price_cents INTEGER DEFAULT 0,
    remote_url VARCHAR(512),
    checksum VARCHAR(64),
    entry_point VARCHAR(256),
    dependencies JSONB DEFAULT '[]',
    install_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_recommended BOOLEAN DEFAULT FALSE,
    author_name VARCHAR(128),
    author_url VARCHAR(512),
    homepage_url VARCHAR(512),
    screenshots JSONB DEFAULT '[]',
    tags TEXT[],
    category VARCHAR(64),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core_plugin_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core_plugins(id) ON DELETE CASCADE,
    version VARCHAR(32) NOT NULL,
    release_notes TEXT,
    is_stable BOOLEAN DEFAULT TRUE,
    is_latest BOOLEAN DEFAULT FALSE,
    download_url VARCHAR(512),
    checksum VARCHAR(64),
    file_size BIGINT,
    min_app_version VARCHAR(32),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plugin_id, version)
);

CREATE TABLE IF NOT EXISTS core_plugin_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core_plugins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name VARCHAR(128),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(256),
    content TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_tenant_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
    plugin_id UUID NOT NULL REFERENCES core_plugins(id) ON DELETE CASCADE,
    installed_version VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE,
    license_type VARCHAR(32) DEFAULT 'subscription',
    license_expires_at TIMESTAMP,
    purchase_order_id VARCHAR(128),
    activated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, plugin_id)
);

CREATE TABLE IF NOT EXISTS core_plugin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(64),
    sort_order INTEGER DEFAULT 0,
    plugin_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS core_plugin_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core_plugins(id) ON DELETE CASCADE,
    runtime_url VARCHAR(512),
    runtime_status VARCHAR(32) DEFAULT 'stopped',
    base_path VARCHAR(128) DEFAULT '/api/plugins/{code}',
    last_heartbeat TIMESTAMP,
    started_at TIMESTAMP,
    stopped_at TIMESTAMP,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plugin_id)
);

CREATE TABLE IF NOT EXISTS core_plugin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_code VARCHAR(64) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    permission_name VARCHAR(255),
    resource_type VARCHAR(50),
    action VARCHAR(50),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plugin_code, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_core_plugins_code ON core_plugins(code);
CREATE INDEX IF NOT EXISTS idx_core_plugins_installed ON core_plugins(is_installed);
CREATE INDEX IF NOT EXISTS idx_core_plugins_category ON core_plugins(category);
CREATE INDEX IF NOT EXISTS idx_core_plugins_tenant ON core_plugins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenant_plugins_tenant ON core_tenant_plugins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_plugin_reviews_plugin ON core_plugin_reviews(plugin_id);
CREATE INDEX IF NOT EXISTS idx_core_plugin_reviews_tenant ON core_plugin_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_status ON core_plugin_instances(runtime_status);
CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_tenant ON core_plugin_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_plugin_permissions_code ON core_plugin_permissions(plugin_code);
CREATE INDEX IF NOT EXISTS idx_core_plugin_permissions_tenant ON core_plugin_permissions(tenant_id);
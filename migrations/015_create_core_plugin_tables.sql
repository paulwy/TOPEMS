-- Core Plugin Tables Migration
-- Created for TOPEMS unified-core plugin system

-- Create core schema
CREATE SCHEMA IF NOT EXISTS core;

-- Plugin Categories
CREATE TABLE IF NOT EXISTS core.core_plugin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_plugin_categories_name ON core.core_plugin_categories(name);
CREATE INDEX idx_core_plugin_categories_sort_order ON core.core_plugin_categories(sort_order);

-- Plugins
CREATE TABLE IF NOT EXISTS core.core_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '0.1.0',
    plugin_type VARCHAR(50) DEFAULT 'business',
    is_free BOOLEAN DEFAULT TRUE,
    price_cents INTEGER DEFAULT 0,
    remote_url TEXT,
    entry_point TEXT,
    dependencies JSONB DEFAULT '[]',
    author_name VARCHAR(255),
    author_url TEXT,
    homepage_url TEXT,
    screenshots JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    category VARCHAR(100),
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_recommended BOOLEAN DEFAULT FALSE,
    install_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_installed BOOLEAN DEFAULT FALSE,
    installed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMPTZ,
    checksum TEXT
);

CREATE INDEX idx_core_plugins_code ON core.core_plugins(code);
CREATE INDEX idx_core_plugins_category ON core.core_plugins(category);
CREATE INDEX idx_core_plugins_is_published ON core.core_plugins(is_published);
CREATE INDEX idx_core_plugins_install_count ON core.core_plugins(install_count);

-- Plugin Versions
CREATE TABLE IF NOT EXISTS core.core_plugin_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    release_notes TEXT,
    is_stable BOOLEAN DEFAULT FALSE,
    is_latest BOOLEAN DEFAULT TRUE,
    download_url TEXT,
    checksum VARCHAR(255),
    file_size BIGINT,
    min_app_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_plugin_versions_plugin_id ON core.core_plugin_versions(plugin_id);
CREATE INDEX idx_core_plugin_versions_version ON core.core_plugin_versions(version);

-- Plugin Permissions
CREATE TABLE IF NOT EXISTS core.core_plugin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_code VARCHAR(100) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    action VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_core_plugin_permissions_unique ON core.core_plugin_permissions(plugin_code, permission_code);
CREATE INDEX idx_core_plugin_permissions_plugin_code ON core.core_plugin_permissions(plugin_code);

-- Plugin Instances (Runtime)
CREATE TABLE IF NOT EXISTS core.core_plugin_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
    runtime_url TEXT NOT NULL,
    runtime_status VARCHAR(50) DEFAULT 'stopped',
    base_path VARCHAR(255),
    last_heartbeat TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_core_plugin_instances_plugin_id ON core.core_plugin_instances(plugin_id);
CREATE INDEX idx_core_plugin_instances_runtime_status ON core.core_plugin_instances(runtime_status);

-- Tenant Plugins (Installations)
CREATE TABLE IF NOT EXISTS core.core_tenant_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
    installed_version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    license_type VARCHAR(50) DEFAULT 'free',
    license_expires_at TIMESTAMPTZ,
    purchase_order_id UUID,
    activated_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_core_tenant_plugins_unique ON core.core_tenant_plugins(tenant_id, plugin_id);
CREATE INDEX idx_core_tenant_plugins_tenant_id ON core.core_tenant_plugins(tenant_id);
CREATE INDEX idx_core_tenant_plugins_is_active ON core.core_tenant_plugins(is_active);

-- Plugin Reviews
CREATE TABLE IF NOT EXISTS core.core_plugin_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
    user_id UUID,
    user_name VARCHAR(255),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    content TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_plugin_reviews_plugin_id ON core.core_plugin_reviews(plugin_id);
CREATE INDEX idx_core_plugin_reviews_user_id ON core.core_plugin_reviews(user_id);
CREATE INDEX idx_core_plugin_reviews_rating ON core.core_plugin_reviews(rating);

-- Insert default categories
INSERT INTO core.core_plugin_categories (name, description, sort_order)
VALUES
    ('crm', '客户关系管理', 1),
    ('erp', '企业资源计划', 2),
    ('hrm', '人力资源管理', 3),
    ('scm', '供应链管理', 4),
    ('wms', '仓储管理', 5),
    ('mes', '生产制造', 6),
    ('pm', '项目管理', 7),
    ('qms', '质量管理', 8),
    ('lims', '实验室管理', 9),
    ('bi', '商业智能', 10),
    ('finance', '财务管理', 11),
    ('doc', '文档管理', 12),
    ('ai', 'AI智能', 13),
    ('mobile', '移动应用', 14),
    ('integration', '系统集成', 15)
ON CONFLICT DO NOTHING;

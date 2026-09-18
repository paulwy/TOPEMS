CREATE TABLE IF NOT EXISTS core_dict_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_dict_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dict_type_id UUID NOT NULL REFERENCES core_dict_types(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    value TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_id UUID REFERENCES core_dict_items(id) ON DELETE SET NULL,
    extra_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(dict_type_id, code)
);

CREATE INDEX IF NOT EXISTS idx_dict_items_type_id ON core_dict_items(dict_type_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_parent_id ON core_dict_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_dict_types_category ON core_dict_types(category);
CREATE INDEX IF NOT EXISTS idx_dict_types_tenant ON core_dict_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_tenant ON core_dict_items(tenant_id);
CREATE TABLE IF NOT EXISTS iam.permission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::JSONB,
    tenant_id UUID NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_templates_name ON iam.permission_templates(name);
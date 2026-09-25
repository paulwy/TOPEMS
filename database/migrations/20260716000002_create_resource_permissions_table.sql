CREATE TABLE IF NOT EXISTS iam.resource_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID,
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    permission VARCHAR(128) NOT NULL,
    tenant_id UUID NOT NULL,
    created_at timestamptz WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_type, resource_id, user_id, permission)
);

CREATE TABLE IF NOT EXISTS iam.data_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(64) NOT NULL,
    conditions JSONB NOT NULL,
    tenant_id UUID NOT NULL,
    created_at timestamptz WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_id ON iam.resource_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON iam.resource_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_permissions_user_id ON iam.data_permissions(user_id);
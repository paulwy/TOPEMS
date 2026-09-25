CREATE TABLE IF NOT EXISTS iam.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    department_id UUID,
    description TEXT,
    created_at timestamptz WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS iam.position_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES iam.positions(id) ON DELETE CASCADE,
    permission VARCHAR(128) NOT NULL,
    tenant_id UUID NOT NULL,
    UNIQUE(position_id, permission)
);

CREATE TABLE IF NOT EXISTS iam.position_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES iam.positions(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    UNIQUE(position_id, role_id)
);

CREATE TABLE IF NOT EXISTS iam.user_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES iam.positions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    UNIQUE(user_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_positions_code ON iam.positions(code);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON iam.positions(department_id);
CREATE INDEX IF NOT EXISTS idx_position_permissions_position_id ON iam.position_permissions(position_id);
CREATE INDEX IF NOT EXISTS idx_position_roles_position_id ON iam.position_roles(position_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON iam.user_positions(user_id);
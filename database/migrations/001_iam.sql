CREATE TABLE IF NOT EXISTS core_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128),
    phone VARCHAR(32),
    avatar_url VARCHAR(512),
    status VARCHAR(32) DEFAULT 'active',
    is_superuser BOOLEAN DEFAULT FALSE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    resource VARCHAR(64),
    action VARCHAR(32),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_user_roles (
    user_id UUID NOT NULL REFERENCES core_users(id),
    role_id UUID NOT NULL REFERENCES core_roles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS core_role_permissions (
    role_id UUID NOT NULL REFERENCES core_roles(id),
    permission_id UUID NOT NULL REFERENCES core_permissions(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_core_users_username ON core_users(username);
CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email);
CREATE INDEX IF NOT EXISTS idx_core_users_tenant ON core_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_roles_name ON core_roles(name);
CREATE INDEX IF NOT EXISTS idx_core_roles_tenant ON core_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_user_roles_user_id ON core_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_core_role_permissions_role_id ON core_role_permissions(role_id);
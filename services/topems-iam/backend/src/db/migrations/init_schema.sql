CREATE SCHEMA IF NOT EXISTS iam;

CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam.user_roles (
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS iam.role_permissions (
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS iam.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam.password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON iam.password_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS iam.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON iam.login_attempts(username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON iam.login_attempts(ip_address, created_at DESC);

CREATE TABLE IF NOT EXISTS iam.user_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    locked_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_lockouts_user_id ON iam.user_lockouts(user_id);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON iam.access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON iam.access_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_resource ON iam.access_logs(resource, created_at DESC);

ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE;

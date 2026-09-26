-- IAM schema 统一迁移
-- 把用户表从 public.core_users 迁移到 iam.users
-- 把租户用户关联表从 public.core_tenant_users 迁移到 iam.tenant_users

-- ================================================
-- 1. 创建 iam schema（如果不存在）
-- ================================================
CREATE SCHEMA IF NOT EXISTS iam;

-- ================================================
-- 2. 创建 iam.tenant_users 表（如果不存在）
-- ================================================
CREATE TABLE IF NOT EXISTS iam.tenant_users (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role character varying,
    status character varying,
    created_at timestamp with time zone,
    last_login timestamp with time zone,
    deleted_at timestamp with time zone
);

-- ================================================
-- 3. 数据迁移：从 public.core_tenant_users 到 iam.tenant_users
-- ================================================
INSERT INTO iam.tenant_users (
    id,
    tenant_id,
    user_id,
    email,
    role,
    status,
    created_at,
    last_login,
    deleted_at
)
SELECT 
    id,
    tenant_id,
    user_id,
    email,
    role,
    status,
    created_at,
    last_login,
    deleted_at
FROM public.core_tenant_users
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- ================================================
-- 4. 数据迁移：从 public.core_users 到 iam.users（如果 iam.users 表存在）
-- ================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'iam' AND table_name = 'users'
    ) THEN
        INSERT INTO iam.users (
            id,
            username,
            email,
            password_hash,
            full_name,
            phone,
            avatar_url,
            status,
            email_verified,
            phone_verified,
            failed_login_attempts,
            must_change_password,
            mfa_enabled,
            created_at,
            updated_at,
            is_active,
            is_superuser,
            last_login_at
        )
        SELECT 
            id,
            username,
            email,
            password_hash,
            full_name,
            phone,
            avatar_url,
            COALESCE(status, 'active'),
            true,
            true,
            0,
            false,
            false,
            created_at,
            updated_at,
            true,
            COALESCE(is_superuser, false),
            last_login_at
        FROM public.core_users
        ON CONFLICT (id) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            email = EXCLUDED.email,
            updated_at = NOW();
    END IF;
END $$;

-- ================================================
-- 5. 说明：旧的 public.core_users 和 public.core_tenant_users 表暂时保留
-- 等所有代码都切换到 iam schema 之后，再删除旧表
-- ================================================

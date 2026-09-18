-- 20260901000024_auth_unify_fk.sql
-- 双轨认证统一（2026-09-01）：auth 基础设施表 FK 从 iam.users 改指 core_users（唯一权威源）。
-- 背景：core_users 为认证/权限/租户唯一权威表；iam.users 仅保留旧数据兼容。
--      auth.rs 登录/注册/刷新/找回/改密已全部改查 core_users，新注册用户不再写 iam.users，
--      故 iam.* 中引用用户的外键必须指向 core_users(id)。
-- 注意：admin 用户在双表存在 id 不一致（iam 8f6cdc35… vs core 2eb884ef…）——迁移按 username
--      统一 id 并同步 iam 侧引用表，保证 FK 落 core_users 后可匹配。
-- 幂等：DROP IF EXISTS + ADD 命名一致可重跑。
--
-- 2026-09-18 防御化修补（空库重建链卡点）：空库重建时 iam 引用 5 表仅为
-- business_base_tables 建的 2 列裸骨架，UPDATE 引用 user_id 报列不存在；
-- 现于文件开头以 ADD COLUMN IF NOT EXISTS 补齐（refresh_tokens/sessions 依 5432
-- 权威结构，user_roles 参照 unified_core，另 2 表最小列），自包含幂等。

-- ============ 防御化：补齐 iam 引用表列（2026-09-18）============
-- ============ iam.refresh_tokens（5432 权威结构补齐）============
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "token_hash" VARCHAR(255) NOT NULL;
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "device_info" jsonb;
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "ip_address" inet;
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone NOT NULL;
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "revoked_reason" VARCHAR(255);
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "iam"."refresh_tokens" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

-- ============ iam.sessions（5432 权威结构补齐）============
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "token_hash" VARCHAR(255) NOT NULL;
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "ip_address" inet;
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "device_info" jsonb;
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone NOT NULL;
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "refresh_expires_at" timestamp with time zone;
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp with time zone DEFAULT now();
ALTER TABLE "iam"."sessions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

-- ============ iam.user_roles（5432 无 iam 版本，参照 unified_core.user_roles 6 列）============
ALTER TABLE "iam"."user_roles" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "iam"."user_roles" ADD COLUMN IF NOT EXISTS "role_id" uuid;
ALTER TABLE "iam"."user_roles" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "iam"."user_roles" ADD COLUMN IF NOT EXISTS "granted_by" VARCHAR(64);
ALTER TABLE "iam"."user_roles" ADD COLUMN IF NOT EXISTS "granted_at" timestamp with time zone DEFAULT now();
ALTER TABLE "iam"."user_roles" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;

-- ============ iam.password_reset_tokens（5432 无此表，最小列补齐满足 000024 解析）============
ALTER TABLE "iam"."password_reset_tokens" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "iam"."password_reset_tokens" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE "iam"."password_reset_tokens" ADD COLUMN IF NOT EXISTS "token" VARCHAR(255);
ALTER TABLE "iam"."password_reset_tokens" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "iam"."password_reset_tokens" ADD COLUMN IF NOT EXISTS "used" boolean DEFAULT false;
ALTER TABLE "iam"."password_reset_tokens" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- ============ iam.user_access_logs（5432 无此表，最小列补齐满足 000024 解析）============
ALTER TABLE "iam"."user_access_logs" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "iam"."user_access_logs" ADD COLUMN IF NOT EXISTS "login_at" timestamp with time zone DEFAULT now();
ALTER TABLE "iam"."user_access_logs" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(64);
ALTER TABLE "iam"."user_access_logs" ADD COLUMN IF NOT EXISTS "user_agent" text;


-- 1) 先 DROP 旧外键（指向 iam.users），避免后续 UPDATE 主键/id 受 FK 约束
ALTER TABLE iam.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE iam.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE iam.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE iam.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE iam.user_access_logs DROP CONSTRAINT IF EXISTS user_access_logs_user_id_fkey;

-- 2) 同步 iam 侧引用表 user_id 到 core_users 对应 id（同 username 但 id 不同的用户，如 admin）
UPDATE iam.refresh_tokens rt SET user_id = c.id
FROM iam.users i, core_users c
WHERE rt.user_id = i.id AND i.username = c.username AND i.id <> c.id;
UPDATE iam.sessions s SET user_id = c.id
FROM iam.users i, core_users c
WHERE s.user_id = i.id AND i.username = c.username AND i.id <> c.id;
UPDATE iam.user_roles ur SET user_id = c.id
FROM iam.users i, core_users c
WHERE ur.user_id = i.id AND i.username = c.username AND i.id <> c.id;
UPDATE iam.password_reset_tokens pr SET user_id = c.id
FROM iam.users i, core_users c
WHERE pr.user_id = i.id AND i.username = c.username AND i.id <> c.id;
UPDATE iam.user_access_logs al SET user_id = c.id
FROM iam.users i, core_users c
WHERE al.user_id = i.id AND i.username = c.username AND i.id <> c.id;

-- 3) 统一 iam.users 主键 id 与 core_users 一致（iam.users 仅兼容保留，保持数据一致便于归档）
UPDATE iam.users u SET id = c.id
FROM core_users c
WHERE u.username = c.username AND u.id <> c.id;

-- 4) ADD 新外键指向 core_users(id)（唯一权威源）
ALTER TABLE iam.refresh_tokens ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE;
ALTER TABLE iam.sessions ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE;
ALTER TABLE iam.user_roles ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE;
ALTER TABLE iam.password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE;
ALTER TABLE iam.user_access_logs ADD CONSTRAINT user_access_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE;

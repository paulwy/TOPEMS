-- ============================================================================
-- 20261024000012_srm_supplier_users.sql
--
-- srm.supplier_users 供应商账号映射桥表（由 docs/database/
--   draft-2026-10-24-srm-supplier-user-mapping.sql.draft 落地）。
--
-- 背景：
--   上轮 srm supplier_portal 拆分后，供应商账号级自助（claims 归属、
--   供应商登录后只读自己的数据）需要 supplier → user 的映射表。
--   现网 srm.suppliers 仅有 contact_person / phone / email 文本联系信息
--   （已只读核对 topems_test：24 列中无 contact_user_id/account_user_id，
--     有 created_by 文本列但不作为账号映射依据）。
--
-- 目标：建立 srm.supplier_users，把「哪个 iam 用户 / 门户账号」绑定到
--   「哪家供应商」，作为供应商自助门户鉴权与数据归属的桥表。
--
-- 幂等风格：对齐 database/migrations/20261024000001_p2_four_tables_tenant_rls.sql
--   （to_regclass 守卫 + IF NOT EXISTS + DO $$ 块，主/测库可重复执行）。
-- RLS 谓词：tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true),
--   '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
--   （超管/未设置 GUC/全零租户 → 需显式 SET app.tenant_id='00000000-...' 才能访问，
--     与本仓 P2 RLS 谓词约定一致）。
--
-- 落地决策（按任务授权，草稿主设计直接落地，确认点保留为注释）：
--   [Q1] role 列：varchar(32) 自由文本（候选 owner/contact/readonly），
--        暂不枚举化、不绑定 iam 角色 ID。
--   [Q2] 不回写 srm.suppliers.primary_contact_user_id；桥表只管账号绑定。
--   [Q3] user_id 暂不 FK iam.users（降低耦合，门户账号若落在 iam.users 之外
--        也能建表）；引用完整性由应用层保证。
--   [Q4] supplier 范围策略依赖供应商登录后 SET app.supplier_id；
--        若认证改为单 GUC 方案，删除 policy 2、改应用层过滤。
--   [Q5] 当前允许一人多供应商（唯一键不含 user_id 单列）；
--        若产品要求一人一户，需再加 UNIQUE (tenant_id, user_id)。
-- ============================================================================

-- 1. 建表
DO $$
BEGIN
    IF to_regclass('srm.supplier_users') IS NULL THEN
        CREATE TABLE srm.supplier_users (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            supplier_id uuid NOT NULL REFERENCES srm.suppliers(id) ON DELETE CASCADE,
            -- Q3：门户账号一律在 iam.users 时，可改为 user_id uuid NOT NULL REFERENCES iam.users(id)
            user_id     uuid NOT NULL,
            tenant_id   uuid NOT NULL,
            role        varchar(32) NOT NULL DEFAULT 'contact',   -- Q1：取值 owner/contact/readonly，待枚举化
            status      varchar(16) NOT NULL DEFAULT 'active',    -- active / disabled
            created_at  timestamptz NOT NULL DEFAULT now(),
            updated_at  timestamptz NOT NULL DEFAULT now(),
            deleted_at  timestamptz
        );

        COMMENT ON TABLE srm.supplier_users IS
          '供应商账号映射桥表：user ↔ supplier 多对多绑定，支撑供应商门户自助。';
    END IF;
END $$;

-- 2. 租户内「一个 user 在一家供应商下只绑一次」唯一约束（部分索引：软删不挡重绑）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'srm' AND tablename = 'supplier_users'
          AND indexname = 'supplier_users_tenant_supplier_user_key'
    ) THEN
        CREATE UNIQUE INDEX supplier_users_tenant_supplier_user_key
            ON srm.supplier_users (tenant_id, supplier_id, user_id)
            WHERE deleted_at IS NULL;
    END IF;
END $$;

-- 3. RLS：ENABLE + FORCE + 租户谓词策略
DO $$
BEGIN
    IF to_regclass('srm.supplier_users') IS NOT NULL THEN
        ALTER TABLE srm.supplier_users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE srm.supplier_users FORCE  ROW LEVEL SECURITY;

        -- policy 1：租户隔离（与 P2 批次同型谓词，全零租户放行给超管）
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'srm' AND tablename = 'supplier_users'
              AND policyname = 'tenant_isolation_supplier_users'
        ) THEN
            CREATE POLICY tenant_isolation_supplier_users ON srm.supplier_users FOR ALL
            USING (
                tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
                                     '00000000-0000-0000-0000-000000000000'::uuid)
            )
            WITH CHECK (
                tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
                                     '00000000-0000-0000-0000-000000000000'::uuid)
            );
        END IF;

        -- policy 2：供应商范围（门户自助只读自己那家供应商的绑定记录）
        -- Q4：依赖应用在供应商登录后 SET app.supplier_id；
        -- 若认证方案改为单 GUC（仅 tenant_id），本策略删除、由应用层过滤。
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'srm' AND tablename = 'supplier_users'
              AND policyname = 'supplier_scope_supplier_users'
        ) THEN
            CREATE POLICY supplier_scope_supplier_users ON srm.supplier_users FOR SELECT
            USING (
                supplier_id = COALESCE(NULLIF(current_setting('app.supplier_id', true), '')::uuid,
                                       '00000000-0000-0000-0000-000000000000'::uuid)
                OR current_setting('app.supplier_id', true) IS NULL
            );
        END IF;
    END IF;
END $$;

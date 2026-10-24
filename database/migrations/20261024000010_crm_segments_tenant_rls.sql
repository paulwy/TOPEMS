-- ============================================================================
-- 20261024000010_crm_segments_tenant_rls.sql
--
-- 平台域补漏：crm.customer_segments / crm.customer_recommendations 补租户隔离。
--
-- 勘察（2026-10-24，topems_test，只读 information_schema）：
--   · crm.customer_segments：id/name/description/criteria(jsonb)/customer_count/
--     created_at/updated_at/name_en/deleted_at 共 9 列——无 tenant_id、
--     无 created_by/org 等可派生租户列；当前 0 行；relrowsecurity=f。
--   · crm.customer_recommendations：id/customer_id/customer_name/recommendations
--     (jsonb)/recommendation_type/model/confidence/created_at/deleted_at 共 9 列
--     ——无 tenant_id、无 created_by/org；当前 0 行；relrowsecurity=f。
--
-- 处置（幂等 DO 块，对齐 20261024000001 模板）：
--   1. ADD COLUMN IF NOT EXISTS tenant_id uuid（两表均无）；
--   2. 存量回填：两表均无可派生租户列（customer_id 指向客户表，客户-租户归属
--      链不可靠、customer_name 为文本），按约定全部回填为全零 uuid；
--   3. SET NOT NULL（回填后无 NULL，幂等重跑为 no-op）；
--   4. ENABLE + FORCE RLS + tenant_isolation 策略，谓词：
--        tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
--                             '00000000-0000-0000-0000-000000000000'::uuid)
--      （超管/未设置 GUC → 只能见全零租户行，需显式 SET app.tenant_id 访问，
--        与本仓 P2 RLS 谓词约定一致，见 20261024000012 srm 模板）。
--
-- 遗留确认点：回填统一用全零 uuid；若后续两表补 created_by/客户租户映射列，
-- 需再补一次按派生列的修正回填。
-- ============================================================================

-- 1. crm.customer_segments
DO $$
BEGIN
    IF to_regclass('crm.customer_segments') IS NULL THEN
        RAISE NOTICE 'crm.customer_segments 不存在，跳过';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'crm' AND table_name = 'customer_segments' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE crm.customer_segments ADD COLUMN tenant_id uuid;
        END IF;

        -- 存量回填：无可派生列 → 全零 uuid
        UPDATE crm.customer_segments
           SET tenant_id = '00000000-0000-0000-0000-000000000000'
         WHERE tenant_id IS NULL;

        ALTER TABLE crm.customer_segments ALTER COLUMN tenant_id SET NOT NULL;

        ALTER TABLE crm.customer_segments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE crm.customer_segments FORCE  ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'crm' AND tablename = 'customer_segments'
              AND policyname = 'tenant_isolation_customer_segments'
        ) THEN
            CREATE POLICY tenant_isolation_customer_segments ON crm.customer_segments FOR ALL
            USING (
                tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
                                     '00000000-0000-0000-0000-000000000000'::uuid)
            )
            WITH CHECK (
                tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
                                     '00000000-0000-0000-0000-000000000000'::uuid)
            );
        END IF;
    END IF;
END $$;

-- 2. crm.customer_recommendations
DO $$
BEGIN
    IF to_regclass('crm.customer_recommendations') IS NULL THEN
        RAISE NOTICE 'crm.customer_recommendations 不存在，跳过';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'crm' AND table_name = 'customer_recommendations' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE crm.customer_recommendations ADD COLUMN tenant_id uuid;
        END IF;

        -- 存量回填：无可派生租户列（customer_id 归属链不可靠）→ 全零 uuid
        UPDATE crm.customer_recommendations
           SET tenant_id = '00000000-0000-0000-0000-000000000000'
         WHERE tenant_id IS NULL;

        ALTER TABLE crm.customer_recommendations ALTER COLUMN tenant_id SET NOT NULL;

        ALTER TABLE crm.customer_recommendations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE crm.customer_recommendations FORCE  ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'crm' AND tablename = 'customer_recommendations'
              AND policyname = 'tenant_isolation_customer_recommendations'
        ) THEN
            CREATE POLICY tenant_isolation_customer_recommendations ON crm.customer_recommendations FOR ALL
            USING (
                tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
                                     '00000000-0000-0000-0000-000000000000'::uuid)
            )
            WITH CHECK (
                tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
                                     '00000000-0000-0000-0000-000000000000'::uuid)
            );
        END IF;
    END IF;
END $$;

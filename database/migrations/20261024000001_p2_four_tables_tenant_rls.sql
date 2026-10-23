-- ============================================================================
-- 20261024000001_p2_four_tables_tenant_rls.sql
--
-- 第三批 P2：4 张「已补 tenant_id 列但未开 RLS」的业务表补齐 FORCE RLS 策略。
--
-- 背景：089 全量扫描发现下列 4 表均已补 tenant_id（20261018000003 /
-- 20261020000023 / 20261019000001 / 20261018000001），但从未 ENABLE ROW
-- LEVEL SECURITY、无租户隔离策略——应用层按 tenant_id 过滤之外，DB 层无兜底。
-- 本迁移逐表幂等补 ENABLE + FORCE + tenant_isolation 策略，谓词与既有宽松策略
-- 同型（对齐 20261015000076 / rebuild_orphan_tables 的 mes 版模板表策略）：
--   超管/未设置 GUC / 全零租户 / tenant_id IS NULL → 放行；否则按 app.tenant_id 匹配。
--
-- 四表均为业务数据且已有 tenant_id 列，故全部补 RLS，无豁免项。
-- communication.core_notification_templates 历史上仅被 20260909000004 置 FORCE
-- （relrowsecurity 仍为 f，FORCE 空转），此处正式 ENABLE 并补策略。
--
-- 幂等保证：to_regclass 守卫 + pg_policies 存在性判断；主/测库可重复执行。
-- ============================================================================

-- 1. finance.expense_approvals（tenant_id uuid 可空，20261018000003 建表）
DO $$
BEGIN
    IF to_regclass('finance.expense_approvals') IS NULL THEN
        RAISE NOTICE 'finance.expense_approvals 不存在，跳过';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'finance' AND table_name = 'expense_approvals' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE finance.expense_approvals ADD COLUMN tenant_id uuid;
        END IF;

        ALTER TABLE finance.expense_approvals ENABLE ROW LEVEL SECURITY;
        ALTER TABLE finance.expense_approvals FORCE ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'finance' AND tablename = 'expense_approvals'
              AND policyname = 'tenant_isolation_expense_approvals'
        ) THEN
            CREATE POLICY tenant_isolation_expense_approvals ON finance.expense_approvals FOR ALL
            USING (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id IS NULL
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            )
            WITH CHECK (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id IS NULL
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            );
        END IF;
    END IF;
END $$;

-- 2. scm.incoming_notices（tenant_id uuid NOT NULL DEFAULT 全零，20261020000023 补列）
DO $$
BEGIN
    IF to_regclass('scm.incoming_notices') IS NULL THEN
        RAISE NOTICE 'scm.incoming_notices 不存在，跳过';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'scm' AND table_name = 'incoming_notices' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE scm.incoming_notices ADD COLUMN tenant_id uuid;
        END IF;

        ALTER TABLE scm.incoming_notices ENABLE ROW LEVEL SECURITY;
        ALTER TABLE scm.incoming_notices FORCE ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'scm' AND tablename = 'incoming_notices'
              AND policyname = 'tenant_isolation_incoming_notices'
        ) THEN
            CREATE POLICY tenant_isolation_incoming_notices ON scm.incoming_notices FOR ALL
            USING (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            )
            WITH CHECK (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            );
        END IF;
    END IF;
END $$;

-- 3. communication.core_notification_templates
--    （tenant_id uuid 可空，20261019000001 补列；20260909000004 仅置 FORCE 未 ENABLE）
DO $$
BEGIN
    IF to_regclass('communication.core_notification_templates') IS NULL THEN
        RAISE NOTICE 'communication.core_notification_templates 不存在，跳过';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'communication' AND table_name = 'core_notification_templates' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE communication.core_notification_templates ADD COLUMN tenant_id uuid;
        END IF;

        ALTER TABLE communication.core_notification_templates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE communication.core_notification_templates FORCE ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'communication' AND tablename = 'core_notification_templates'
              AND policyname = 'tenant_isolation_core_notification_templates'
        ) THEN
            CREATE POLICY tenant_isolation_core_notification_templates ON communication.core_notification_templates FOR ALL
            USING (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id IS NULL
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            )
            WITH CHECK (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id IS NULL
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            );
        END IF;
    END IF;
END $$;

-- 4. ehs.qa_ehs_drill_evaluations（tenant_id uuid 可空，20261018000001 补列）
DO $$
BEGIN
    IF to_regclass('ehs.qa_ehs_drill_evaluations') IS NULL THEN
        RAISE NOTICE 'ehs.qa_ehs_drill_evaluations 不存在，跳过';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'ehs' AND table_name = 'qa_ehs_drill_evaluations' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE ehs.qa_ehs_drill_evaluations ADD COLUMN tenant_id uuid;
        END IF;

        ALTER TABLE ehs.qa_ehs_drill_evaluations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ehs.qa_ehs_drill_evaluations FORCE ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'ehs' AND tablename = 'qa_ehs_drill_evaluations'
              AND policyname = 'tenant_isolation_qa_ehs_drill_evaluations'
        ) THEN
            CREATE POLICY tenant_isolation_qa_ehs_drill_evaluations ON ehs.qa_ehs_drill_evaluations FOR ALL
            USING (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id IS NULL
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            )
            WITH CHECK (
                COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR tenant_id IS NULL
                OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
            );
        END IF;
    END IF;
END $$;

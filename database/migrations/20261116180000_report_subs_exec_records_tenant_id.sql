-- 报表子系统两张从表的租户列缺口：bi.report_subscriptions / analytics.report_execution_records
--
-- 背景：M-2 收口把 bi.reports / bi.report_templates / bi.report_schedules 收紧为 fail-closed，
--   但这两张从表既无 tenant_id 列，也未开启 RLS，隔离只能靠 JOIN 父表间接实现。
--
-- 现状（2026-11-16 对 topems_prod 只读实测；克隆库 m2_dryrun_20261116 同源）：
--   bi.report_subscriptions            0 行；无 tenant_id；relrowsecurity=f / relforcerowsecurity=f
--   analytics.report_execution_records 0 行；无 tenant_id；relrowsecurity=f / relforcerowsecurity=f
--   父表：bi.report_templates 0 行（tenant_id 已 NOT NULL）、bi.report_schedules 0 行（tenant_id 已 NOT NULL）
--   两表均无同名索引/策略。
--
-- 回填口径（只认父表推导，绝不用零租户兜底）：
--   bi.report_subscriptions.tenant_id            ← bi.report_templates.tenant_id   （template_id → id）
--   analytics.report_execution_records.tenant_id ← bi.report_schedules.tenant_id   （schedule_id → id）
--   父表租户为空或为零 UUID 时不回填，回填后仍有 NULL 即 RAISE EXCEPTION 中止整笔迁移。
--
-- NOT NULL 判定：prod 两表均 0 行 → 回填天然完成；回填后 NULL 行断言为 0，故直接 SET NOT NULL。
--   若将来在仍有历史行的环境执行，同样以回溯断言为准（不能全量推导则整笔失败，不降级为可空）。
--
-- RLS：与既有 382 条收口同构（B 范式），USING 与 WITH CHECK 相同：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 上生产前置条件（重要）：新二进制写 tenant_id、旧库无该列 → 旧二进制会在 parse 阶段 42703，
--   新二进制在旧库同样失败；两者必须同一停机窗口内完成：停服 → 本迁移 → 起新二进制。
--   锁影响：ADD COLUMN 无默认值（瞬时元数据）、CREATE INDEX 在 0 行表上瞬时、
--   ENABLE/FORCE RLS 需 ACCESS EXCLUSIVE（瞬时）、SET NOT NULL 需全表校验（0 行即瞬时）。
--
-- 回滚：database/rollback/20261116180000_report_subs_exec_records_tenant_id.rollback.sql

-- 1. 前置断言：表存在、tenant_id 尚不存在、父表具备可推导租户列
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['bi.report_subscriptions', 'analytics.report_execution_records'] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = split_part(t, '.', 1)
               AND table_name   = split_part(t, '.', 2)
               AND column_name  = 'tenant_id'
        ) THEN
            RAISE EXCEPTION '前置断言失败：%.tenant_id 已存在，本迁移只补缺失列', t;
        END IF;
    END LOOP;
END $$;

-- 2. 补列（先可空，回填后再置 NOT NULL）
ALTER TABLE bi.report_subscriptions ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE analytics.report_execution_records ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 3. 按父表回填（零租户/空租户不推导）
UPDATE bi.report_subscriptions s
   SET tenant_id = t.tenant_id
  FROM bi.report_templates t
 WHERE t.id = s.template_id
   AND s.tenant_id IS NULL
   AND t.tenant_id IS NOT NULL
   AND t.tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid;

UPDATE analytics.report_execution_records e
   SET tenant_id = sc.tenant_id
  FROM bi.report_schedules sc
 WHERE sc.id = e.schedule_id
   AND e.tenant_id IS NULL
   AND sc.tenant_id IS NOT NULL
   AND sc.tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid;

-- 4. 回填完整性断言：任何无法由父表推导的行都必须中止迁移，不允许零租户兜底
DO $$
DECLARE
    n_subs bigint;
    n_exec bigint;
BEGIN
    SELECT count(*) INTO n_subs FROM bi.report_subscriptions WHERE tenant_id IS NULL;
    IF n_subs <> 0 THEN
        RAISE EXCEPTION '回填失败：bi.report_subscriptions 仍有 % 行无法由 report_templates 推导租户，中止迁移', n_subs;
    END IF;

    SELECT count(*) INTO n_exec FROM analytics.report_execution_records WHERE tenant_id IS NULL;
    IF n_exec <> 0 THEN
        RAISE EXCEPTION '回填失败：analytics.report_execution_records 仍有 % 行无法由 report_schedules 推导租户（含 schedule_id 为空或指向缺失调度），中止迁移', n_exec;
    END IF;
END $$;

-- 5. 置为 NOT NULL
ALTER TABLE bi.report_subscriptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE analytics.report_execution_records ALTER COLUMN tenant_id SET NOT NULL;

-- 6. 租户索引
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_tenant_id
    ON bi.report_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_execution_records_tenant_id
    ON analytics.report_execution_records (tenant_id);

-- 7. 开启并强制 RLS + B 范式策略
ALTER TABLE bi.report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi.report_subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON bi.report_subscriptions
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE analytics.report_execution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.report_execution_records FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON analytics.report_execution_records
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 8. 后置断言：形状、策略、索引、RLS 开关逐项对齐
DO $$
DECLARE
    t text;
    v_type text;
    v_nullable text;
    v_default text;
    rls boolean;
    frls boolean;
    n_pol int;
    n_idx int;
BEGIN
    FOREACH t IN ARRAY ARRAY['bi.report_subscriptions', 'analytics.report_execution_records'] LOOP
        SELECT data_type, is_nullable, column_default
          INTO v_type, v_nullable, v_default
          FROM information_schema.columns
         WHERE table_schema = split_part(t, '.', 1)
           AND table_name   = split_part(t, '.', 2)
           AND column_name  = 'tenant_id';

        IF v_type IS NULL THEN
            RAISE EXCEPTION '后置断言失败：%.tenant_id 未创建', t;
        END IF;
        IF v_type <> 'uuid' OR v_nullable <> 'NO' OR v_default IS NOT NULL THEN
            RAISE EXCEPTION '后置断言失败：%.tenant_id 形状=(%,%,%)，期望=(uuid,NO,NULL)',
                t, v_type, v_nullable, coalesce(v_default, 'NULL');
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity
          INTO rls, frls
          FROM pg_class c
         WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls_tenant_isolation 策略数 = %（期望 1）', t, n_pol;
        END IF;

        SELECT count(*) INTO n_idx
          FROM pg_indexes
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND indexname  LIKE '%tenant_id';
        IF n_idx < 1 THEN
            RAISE EXCEPTION '后置断言失败：% 缺 tenant_id 索引', t;
        END IF;
    END LOOP;
END $$;

-- engagement 两张表补 RLS（生产窗口第 6 条）
--
-- 目标表：flow.core_comments、flow.core_favorites
--   （代码中按 search_path 无限定名访问；public.* 同名影子表已由 20261105210000 清理）
--
-- 定性依据（2026-11-17 生产 topems_prod / 克隆库 m2_dryrun_20261116 只读核查）：
--   flow.core_comments   tenant_id NOT NULL default '00000000-0000-0000-0000-000000000001'；
--                        两库均 0 行、tenant_id NULL 0 行
--   flow.core_favorites  tenant_id NOT NULL default '...0001'；两库均 0 行、tenant_id NULL 0 行
--   两表均 relrowsecurity=false 且无任何策略 → 此前只能靠查询层 sargable 谓词隔离
--   种子路径：全仓 migrations 无 INSERT INTO flow.core_comments / flow.core_favorites
--   → 无平台内置行，不需要全零租户归一；全部走真实租户严格 B 范式
--
-- 索引：已有 idx_core_comments_entity(tenant_id, entity_type, entity_id)、
--   idx_core_favorites_user(tenant_id, user_id) 与唯一键
--   (tenant_id, user_id, entity_type, entity_id) 覆盖策略过滤列，本迁移不新建索引。
--
-- 代码耦合：svc/unified-core/src/modules/engagement/handlers.rs 已改为请求事务作用域，
--   读取用 TenantScope 显式谓词、写入用 require_tenant 显式绑定 tenant_id；本迁移不改变列，
--   不影响既有 SQL 的 parse。
--
-- 锁影响：2 次 ALTER TABLE ENABLE/FORCE（SHARE ROW EXCLUSIVE）、策略 CREATE（ACCESS EXCLUSIVE，
--   瞬时）、可能的 SET NOT NULL（空表全表扫描）。无数据 DML。
--
-- 回滚：database/rollback/20261117235500_engagement_rls_strict.rollback.sql

-- 1. 前置断言与读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY['flow.core_comments', 'flow.core_favorites'] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;
        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', t)
          INTO n_rows, n_null;
        RAISE NOTICE '迁移前 %：总行 %，NULL 租户 % 行', t, n_rows, n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '中止：% 存在 % 行 NULL 租户，需先定性归属', t, n_null;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 清空既有策略（当前无策略；保留幂等，防止其它环境残留放行分支）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE (schemaname, tablename) IN (
               ('flow', 'core_comments'),
               ('flow', 'core_favorites'))
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 4. 强制 RLS + 唯一严格 B 范式策略
ALTER TABLE flow.core_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.core_comments FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON flow.core_comments
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE flow.core_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.core_favorites FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON flow.core_favorites
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 5. 租户列收敛（幂等；两表当前已是 NOT NULL）
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['flow.core_comments', 'flow.core_favorites'] LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'flow'
               AND table_name = split_part(t, '.', 2)
               AND column_name = 'tenant_id'
               AND is_nullable = 'YES'
        ) THEN
            EXECUTE format('ALTER TABLE %s ALTER COLUMN tenant_id SET NOT NULL', t);
        END IF;
    END LOOP;
END $$;

-- 6. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['flow.core_comments', 'flow.core_favorites'] LOOP
        SELECT count(*), max(p.qual::text), max(p.with_check::text) INTO n_pol, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = 'flow' AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;
        IF v_qual IS NULL OR position('app.rls_system' IN v_qual) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.rls_system 分支：%', t, v_qual;
        END IF;
        IF position('tenant_id IS NULL' IN v_qual) > 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 仍含 tenant_id IS NULL 放行分支：%', t, v_qual;
        END IF;
        IF v_wcheck IS NULL OR position('app.rls_system' IN v_wcheck) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 WITH CHECK 缺失或未显式：%', t, v_wcheck;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;
    END LOOP;
END $$;

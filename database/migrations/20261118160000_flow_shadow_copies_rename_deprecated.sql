-- flow schema 11 张同名副本改名为 _deprecated_<原名>（不直接 DROP）
--
-- 范围：只处理下列 11 张与 public 同名的 flow 副本；不触碰
--   flow.core_comments / flow.core_favorites / flow.notifications / flow.workflows
--   （这 4 张只在 flow 存在，是业务表，不能清）。
--
-- 依据：docs/database/shadow-bare-ref-scan-2026-11-18.md 第 5 节；
--   2026-11-18 生产 topems_prod 只读核查：11 张 flow 副本均为 0 行，
--   列/类型/默认值/唯一键/主键与 public 同名表一致，且均未启用 RLS。
--
-- 口径：不直接 DROP，改为 RENAME TO _deprecated_<原名>，保留可回滚路径；
--   前置断言副本必须 0 行；后置断言 public 同名表仍在、RLS 与策略逐字未变。
--
-- 幂等：flow 副本不存在（含已被 20261027200000 直接 DROP 的情形）→ NOTICE 跳过；
--   若 flow._deprecated_<原名> 已存在且原名不存在 → 视为已完成，跳过。
--
-- 冲突提示：活动链 `20261027200000_core_schema_duplicates_cleanup.sql` 仍包含本 11 张的
--   `DROP TABLE IF EXISTS ... CASCADE`。该迁移若先于本迁移被执行，本迁移会自动跳过；
--   两条迁移不要在同一窗口重复批准。
--
-- 锁影响：11 次 ALTER TABLE ... RENAME（ACCESS EXCLUSIVE 瞬时；0 行表，毫秒级）。
--   不改列、不改数据、不建/删策略，public 侧零 DDL。
--
-- 回滚：database/rollback/20261118160000_flow_shadow_copies_rename_deprecated.rollback.sql
--
-- 部署耦合：需代码同窗口上线。
--   svc/unified-core 的 master / doc 裸引用已改为显式 public. + 租户作用域；
--   只上迁移 → 旧代码走 flow 首命中的裸引用会因副本改名而落到 public，
--   其中 master 的变更日志/审批写路径未带租户 GUC，会被 public RLS 拒绝。
--   只上代码 → 副本仍在，但代码已显式 public.，不影响正确性。
--
-- destructive-gate: allow
-- ticket: SHADOW-COPY-20261118

-- 0) 前置：public 同名表必须存在；快照其 RLS/策略供后置比对
DO $$
DECLARE
    t text;
    n_missing int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'core_doc_documents',
        'core_doc_folders',
        'core_doc_templates',
        'core_flow_categories',
        'core_master_data_change_log',
        'core_mdm_approvals',
        'core_operation_logs',
        'core_tenant_modules',
        'core_tenant_settings',
        'core_tenant_usage',
        'core_tenant_users'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            RAISE WARNING '前置检查：public.% 不存在', t;
            n_missing := n_missing + 1;
        END IF;
    END LOOP;
    IF n_missing <> 0 THEN
        RAISE EXCEPTION '前置断言失败：% 张 public 同名表缺失，停止改名', n_missing;
    END IF;
END $$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理本迁移会话内临时表 pg_temp._shadow_public_policy_before，非业务表、会话结束即消失
-- destructive-owner: flow
-- destructive-ticket: FLOW-SHADOW-20261118
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: pg_temp 临时表无持久数据（0 行），无需备份
DROP TABLE IF EXISTS pg_temp._shadow_public_policy_before;
CREATE TEMP TABLE _shadow_public_policy_before AS
SELECT c.relname,
       c.relrowsecurity,
       c.relforcerowsecurity,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                      'name', p.policyname,
                      'cmd', p.cmd,
                      'permissive', p.permissive,
                      'roles', p.roles,
                      'qual', p.qual,
                      'with_check', p.with_check
                  ) ORDER BY p.policyname)
             FROM pg_policies p
            WHERE p.schemaname = 'public'
              AND p.tablename = c.relname
       ), '[]'::jsonb) AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname = ANY (ARRAY[
       'core_doc_documents',
       'core_doc_folders',
       'core_doc_templates',
       'core_flow_categories',
       'core_master_data_change_log',
       'core_mdm_approvals',
       'core_operation_logs',
       'core_tenant_modules',
       'core_tenant_settings',
       'core_tenant_usage',
       'core_tenant_users'
   ]);

-- 1) 前置断言（0 行）+ 记录哪些副本真实存在，供后置断言使用
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理本迁移会话内临时表 pg_temp._shadow_rename_plan，非业务表、会话结束即消失
-- destructive-owner: flow
-- destructive-ticket: FLOW-SHADOW-20261118
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: pg_temp 临时表无持久数据（0 行），无需备份
DROP TABLE IF EXISTS pg_temp._shadow_rename_plan;
CREATE TEMP TABLE _shadow_rename_plan (
    table_name text PRIMARY KEY,
    existed boolean NOT NULL
);

DO $$
DECLARE
    t text;
    n_rows bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'core_doc_documents',
        'core_doc_folders',
        'core_doc_templates',
        'core_flow_categories',
        'core_master_data_change_log',
        'core_mdm_approvals',
        'core_operation_logs',
        'core_tenant_modules',
        'core_tenant_settings',
        'core_tenant_usage',
        'core_tenant_users'
    ] LOOP
        IF to_regclass(format('flow.%I', t)) IS NULL THEN
            INSERT INTO _shadow_rename_plan VALUES (t, false);
            RAISE NOTICE '跳过 flow.%：副本不存在（已清理或从未创建）', t;
            CONTINUE;
        END IF;

        IF to_regclass(format('flow.%I', '_deprecated_' || t)) IS NOT NULL THEN
            RAISE EXCEPTION '前置断言失败：flow._deprecated_% 已存在，需人工确认', t;
        END IF;

        EXECUTE format('SELECT count(*) FROM flow.%I', t) INTO n_rows;
        IF n_rows <> 0 THEN
            RAISE EXCEPTION '前置断言失败：flow.% 有 % 行数据（期望 0），不得改名为废弃表', t, n_rows;
        END IF;

        INSERT INTO _shadow_rename_plan VALUES (t, true);
        RAISE NOTICE '前置断言通过：flow.% 为 0 行', t;
    END LOOP;
END $$;

-- 2) 改名：flow.<原名> → flow._deprecated_<原名>
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'core_doc_documents',
        'core_doc_folders',
        'core_doc_templates',
        'core_flow_categories',
        'core_master_data_change_log',
        'core_mdm_approvals',
        'core_operation_logs',
        'core_tenant_modules',
        'core_tenant_settings',
        'core_tenant_usage',
        'core_tenant_users'
    ] LOOP
        IF NOT EXISTS (SELECT 1 FROM _shadow_rename_plan p WHERE p.table_name = t AND p.existed) THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE flow.%I RENAME TO %I', t, '_deprecated_' || t);
        RAISE NOTICE '已改名 flow.% → flow._deprecated_%', t, t;
    END LOOP;
END $$;

-- 3) 后置断言：public 同名表仍在、RLS/策略逐字未变；原名副本已消失
DO $$
DECLARE
    rec record;
    after_rls boolean;
    after_frls boolean;
    after_policies jsonb;
    n int;
BEGIN
    FOR rec IN SELECT * FROM _shadow_public_policy_before LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO after_rls, after_frls
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = rec.relname;
        IF NOT FOUND THEN
            RAISE EXCEPTION '后置断言失败：public.% 在改名后消失', rec.relname;
        END IF;

        SELECT COALESCE((
                   SELECT jsonb_agg(jsonb_build_object(
                              'name', p.policyname,
                              'cmd', p.cmd,
                              'permissive', p.permissive,
                              'roles', p.roles,
                              'qual', p.qual,
                              'with_check', p.with_check
                          ) ORDER BY p.policyname)
                     FROM pg_policies p
                    WHERE p.schemaname = 'public'
                      AND p.tablename = rec.relname
               ), '[]'::jsonb)
          INTO after_policies;

        IF after_rls IS DISTINCT FROM rec.relrowsecurity
           OR after_frls IS DISTINCT FROM rec.relforcerowsecurity
           OR after_policies IS DISTINCT FROM rec.policies THEN
            RAISE EXCEPTION '后置断言失败：public.% 的 RLS/策略发生变化', rec.relname;
        END IF;
    END LOOP;

    SELECT count(*) INTO n FROM _shadow_public_policy_before;
    IF n <> 11 THEN
        RAISE EXCEPTION '后置断言失败：public 快照表数 = %（期望 11）', n;
    END IF;

    FOR rec IN SELECT * FROM _shadow_rename_plan WHERE existed LOOP
        IF to_regclass(format('flow.%I', rec.table_name)) IS NOT NULL THEN
            RAISE EXCEPTION '后置断言失败：flow.% 原名仍存在', rec.table_name;
        END IF;
        IF to_regclass(format('flow.%I', '_deprecated_' || rec.table_name)) IS NULL THEN
            RAISE EXCEPTION '后置断言失败：flow._deprecated_% 未生成', rec.table_name;
        END IF;
    END LOOP;

    RAISE NOTICE '后置断言通过：11 张 public 表与策略未变，flow 副本已完成改名';
END $$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理本迁移会话内临时表 pg_temp._shadow_rename_plan，非业务表、会话结束即消失
-- destructive-owner: flow
-- destructive-ticket: FLOW-SHADOW-20261118
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: pg_temp 临时表无持久数据（0 行），无需备份
DROP TABLE IF EXISTS pg_temp._shadow_rename_plan;
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理本迁移会话内临时表 pg_temp._shadow_public_policy_before，非业务表、会话结束即消失
-- destructive-owner: flow
-- destructive-ticket: FLOW-SHADOW-20261118
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: pg_temp 临时表无持久数据（0 行），无需备份
DROP TABLE IF EXISTS pg_temp._shadow_public_policy_before;

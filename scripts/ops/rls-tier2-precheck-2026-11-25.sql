-- ============================================================
-- 档 2 · 五条漂移表 · 窗口前只读预检（基线 + 数据侧风险读数）
--
-- 用法：psql -v ON_ERROR_STOP=1 -d topems_prod -f scripts/ops/rls-tier2-precheck-2026-11-25.sql
--       （纯只读 SELECT，不修改任何数据/策略；窗口前、窗口后各跑一次留对照）
--
-- 预检目的：
--   1. 记录五条表订正前的策略集合、RLS/FORCE 开关（漂移基线）；
--   2. 采集既有迁移前置断言依赖的数据读数（NULL/零租户、回填可推知性），
--      避免开窗后才被 RAISE 中止；
--   3. 核对账本水位与三条既有迁移是否已入账。
--
-- 对照基准：database/rls_policy_expected.json
-- 订正执行：追平账本重放既有迁移（优先）；兜底补丁三件套见同目录 tier2-drift-fix。
-- ============================================================

\pset pager off

-- ① 账本水位：三条既有迁移入账状态（success=1 即已落地，策略不应仍漂移）
SELECT version, success, installed_on
  FROM _sqlx_migrations
 WHERE version IN (20261119150000, 20261119151000, 20261119161000)
 ORDER BY version;

SELECT max(version) AS ledger_max,
       count(*) FILTER (WHERE NOT success) AS failed
  FROM _sqlx_migrations;

-- ② 五条表 RLS / FORCE / 策略集合（订正前基线）
SELECT n.nspname AS "schema", c.relname AS "表",
       c.relrowsecurity AS "RLS", c.relforcerowsecurity AS "FORCE",
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS "策略数"
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE (n.nspname, c.relname) IN (
        ('iam', 'roles'), ('core', 'core_tenant_plugins'), ('portal', 'user_preferences'),
        ('mobile', 'oa_announcement_reads'), ('pdm', 'pdm_master_data_refs'))
 ORDER BY n.nspname, c.relname;

-- ③ 逐条策略明细：cmd / 角色 / USING / WITH CHECK（识别 qual=true 全放行）
SELECT schemaname || '.' || tablename AS "表",
       policyname AS "策略", cmd AS "cmd",
       qual AS "USING", with_check AS "WITH CHECK"
  FROM pg_policies
 WHERE (schemaname, tablename) IN (
        ('iam', 'roles'), ('core', 'core_tenant_plugins'), ('portal', 'user_preferences'),
        ('mobile', 'oa_announcement_reads'), ('pdm', 'pdm_master_data_refs'))
 ORDER BY schemaname, tablename, policyname;

-- ④ pdm.pdm_master_data_refs 数据读数（迁移 150000 前置断言：NULL/零租户必须 0）
SELECT count(*) AS "总行",
       count(*) FILTER (WHERE tenant_id IS NULL) AS "NULL租户",
       count(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AS "零租户"
  FROM pdm.pdm_master_data_refs;

-- ⑤ mobile.oa_announcement_reads 回填可推知性（迁移 151000 前置：回填后 0 NULL）
--    via_announcement：关联公告命中；via_user：公告未命中、按用户主体推；
--    unresolved：两源都推不出，开窗前必须先人工定性归属，否则迁移 RAISE 中止。
SELECT count(*) AS "总行",
       count(*) FILTER (WHERE a.tenant_id IS NOT NULL) AS "via_announcement",
       count(*) FILTER (WHERE a.tenant_id IS NULL AND u.tenant_id IS NOT NULL) AS "via_user",
       count(*) FILTER (WHERE a.tenant_id IS NULL AND u.tenant_id IS NULL) AS "unresolved"
  FROM mobile.oa_announcement_reads r
  LEFT JOIN mobile.oa_announcements a ON a.id = r.announcement_id
  LEFT JOIN public.core_users u ON u.id::text = r.user_id;

-- ⑥ core.core_tenant_plugins / portal.user_preferences 行数（壳/预留表，应为 0 或仅系统种子）
SELECT 'core.core_tenant_plugins' AS "表", count(*) AS "行数" FROM core.core_tenant_plugins
UNION ALL
SELECT 'portal.user_preferences', count(*) FROM portal.user_preferences;

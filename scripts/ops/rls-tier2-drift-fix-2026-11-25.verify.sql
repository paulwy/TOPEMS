-- ============================================================
-- 档 2 · 五条漂移策略订正 · 只读核对脚本（窗口前后各跑一次留基线）
--
-- 用法：psql -v ON_ERROR_STOP=1 -d topems_prod -f scripts/ops/rls-tier2-drift-fix-2026-11-25.verify.sql
--       （纯只读 SELECT，不修改数据/策略）
--
-- 对照基准：database/rls_policy_expected.json
--   · iam.roles                    rls_global_read(SELECT, true) + rls_system_write(ALL, system)
--   · core.core_tenant_plugins     rls_system_only(ALL, system)
--   · portal.user_preferences      rls_system_only(ALL, system)
--   · mobile.oa_announcement_reads rls_tenant_isolation(ALL, system OR tenant)
--   · pdm.pdm_master_data_refs     rls_tenant_isolation(ALL, system OR tenant)
--
-- 状态口径：
--   PASS    策略集合、cmd、qual 分支与基准一致，RLS+FORCE 开启
--   DRIFT   存在全放行 qual=true / 缺基准策略 / 多余策略 / RLS 或 FORCE 关闭
--   MISSING 表不存在（跨 schema 影子表场景，需人工确认）
-- ============================================================

\pset pager off

WITH expected(schema_name, table_name, polname, cmd, kind) AS (VALUES
    ('iam',    'roles',                     'rls_global_read',      'SELECT', 'global_read'),
    ('iam',    'roles',                     'rls_system_write',     'ALL',    'system_write'),
    ('core',   'core_tenant_plugins',      'rls_system_only',      'ALL',    'system_only'),
    ('portal', 'user_preferences',          'rls_system_only',      'ALL',    'system_only'),
    ('mobile', 'oa_announcement_reads',     'rls_tenant_isolation', 'ALL',    'tenant_isolation'),
    ('pdm',    'pdm_master_data_refs',      'rls_tenant_isolation', 'ALL',    'tenant_isolation')
),
actual AS (
    SELECT schemaname, tablename, policyname,
           cmd, qual, with_check AS wcheck
      FROM pg_policies
),
joined AS (
    SELECT e.schema_name, e.table_name, e.polname, e.cmd, e.kind,
           a.cmd AS actual_cmd, a.qual, a.wcheck,
           (a.policyname IS NOT NULL) AS present
      FROM expected e
      LEFT JOIN actual a
        ON a.schemaname = e.schema_name AND a.tablename = e.table_name
       AND a.policyname = e.polname
)
SELECT j.schema_name || '.' || j.table_name AS "表",
       j.polname AS "期望策略",
       j.cmd AS "期望cmd",
       CASE
         WHEN NOT j.present THEN 'MISSING'
         WHEN j.actual_cmd <> j.cmd THEN 'DRIFT(cmd)'
         WHEN j.kind = 'global_read'  AND j.qual NOT LIKE '%true%' THEN 'DRIFT(qual)'
         WHEN j.kind = 'system_only'  AND j.qual NOT LIKE '%app.rls_system%' THEN 'DRIFT(qual)'
         WHEN j.kind = 'system_write' AND (j.qual NOT LIKE '%app.rls_system%' OR j.wcheck NOT LIKE '%app.rls_system%') THEN 'DRIFT(qual)'
         WHEN j.kind = 'tenant_isolation' AND (
              j.qual NOT LIKE '%app.rls_system%' OR j.qual NOT LIKE '%app.tenant_id%'
           OR j.wcheck NOT LIKE '%app.rls_system%' OR j.wcheck NOT LIKE '%app.tenant_id%') THEN 'DRIFT(qual)'
         WHEN j.qual LIKE '%true%' AND j.kind NOT IN ('global_read') THEN 'DRIFT(allow-all)'
         ELSE 'PASS'
       END AS "状态",
       j.qual AS "USING",
       j.wcheck AS "WITH CHECK"
  FROM joined j
 ORDER BY j.schema_name, j.table_name, j.polname;

-- 各表 RLS / FORCE 与策略总数复核
SELECT n.nspname AS "schema", c.relname AS "表",
       c.relrowsecurity AS "RLS", c.relforcerowsecurity AS "FORCE",
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS "策略数"
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE (n.nspname, c.relname) IN (
        ('iam', 'roles'), ('core', 'core_tenant_plugins'), ('portal', 'user_preferences'),
        ('mobile', 'oa_announcement_reads'), ('pdm', 'pdm_master_data_refs'))
 ORDER BY n.nspname, c.relname;

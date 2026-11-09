-- ============================================================
-- W7 · B1 验证脚本（窗口内执行，只读断言 + 可回滚的写探测）
--
-- 用法：psql -v ON_ERROR_STOP=1 -d <db> -f scripts/ops/w7_b1_verify.sql
--       （本文件自带事务边界与 ROLLBACK，不修改数据）
--
-- 覆盖设计 §6.2 四层中的第 1、2 层：
--   A. 结构断言：策略数 / FORCE / USING(true)=0 / nil 分支 / 列侧 cast
--   B. 双身份：超管（系统通道） vs 租户（...0001）可见行数
--   C. 写探测：租户改全局行 = 0 行；系统通道可改（事务内 ROLLBACK）
--   D. 无上下文：fail-closed（0 行，不报错，符合 §5.1）
-- ============================================================

\pset pager off

-- 必须以「非超级用户」身份验证：超级用户永远绕过 RLS。
-- 用法：psql -v app_role=topems_prod -f scripts/ops/w7_b1_verify.sql
\if :{?app_role}
\echo '切换验证角色：' :'app_role'
SET ROLE :'app_role';
\endif

\echo ''
\echo '=== A1. 12 张表策略清单（期望：每表 1~2 条，见迁移头注释）==='
SELECT tablename,
       count(*) AS policy_cnt,
       string_agg(cmd || ':' || policyname, ', ' ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('core_sessions','core_refresh_tokens','core_menus','core_menu_groups',
                    'core_tenants','core_roles','core_dict_types','core_dict_items',
                    'audit_logs','core_login_logs','core_tenant_settings',
                    'core_user_company_scopes')
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo '=== A2. RLS / FORCE（期望：12 张全 t / t）==='
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('core_sessions','core_refresh_tokens','core_menus','core_menu_groups',
                    'core_tenants','core_roles','core_dict_types','core_dict_items',
                    'audit_logs','core_login_logs','core_tenant_settings',
                    'core_user_company_scopes')
ORDER BY c.relname;

\echo ''
\echo '=== A3. fail-open 形态（using_true 期望 0；cast 期望 0；0001 期望 0）==='
SELECT count(*) FILTER (WHERE pg_get_expr(p.polqual, p.polrelid) = 'true')                AS using_true,
       count(*) FILTER (WHERE pg_get_expr(p.polqual, p.polrelid) LIKE '%(tenant_id)::text%') AS col_side_cast,
       count(*) FILTER (WHERE pg_get_expr(p.polqual, p.polrelid) LIKE '%00000000-0000-0000-0000-000000000001%') AS hard_0001,
       count(*) FILTER (WHERE pg_get_expr(p.polqual, p.polrelid) LIKE '%00000000-0000-0000-0000-000000000000%') AS nil_branch
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('core_sessions','core_refresh_tokens','core_menus','core_menu_groups',
                    'core_tenants','core_roles','core_dict_types','core_dict_items',
                    'audit_logs','core_login_logs','core_tenant_settings',
                    'core_user_company_scopes');

\echo ''
\echo '=== A4. nil 分支（期望：0 行；系统角色已在数据迁移中归一为 NULL）==='
SELECT c.relname, p.polname, p.polcmd
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('core_sessions','core_refresh_tokens','core_menus','core_menu_groups',
                    'core_tenants','core_roles','core_dict_types','core_dict_items',
                    'audit_logs','core_login_logs','core_tenant_settings',
                    'core_user_company_scopes')
  AND pg_get_expr(p.polqual, p.polrelid) LIKE '%00000000-0000-0000-0000-000000000000%'
ORDER BY 1, 2;

\echo ''
\echo '=== B0. 基线：系统通道视角（超管/后台任务）==='
SET app.rls_system = 'on';
SET app.tenant_id = '';

CREATE TEMP TABLE w7_base AS
SELECT 'core_menus' AS t, count(*) AS n FROM public.core_menus
UNION ALL SELECT 'core_menu_groups', count(*) FROM public.core_menu_groups
UNION ALL SELECT 'core_dict_types', count(*) FROM public.core_dict_types
UNION ALL SELECT 'core_dict_items', count(*) FROM public.core_dict_items
UNION ALL SELECT 'core_roles', count(*) FROM public.core_roles
UNION ALL SELECT 'core_tenants', count(*) FROM public.core_tenants
UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs
UNION ALL SELECT 'core_login_logs', count(*) FROM public.core_login_logs
UNION ALL SELECT 'core_tenant_settings', count(*) FROM public.core_tenant_settings
UNION ALL SELECT 'core_user_company_scopes', count(*) FROM public.core_user_company_scopes;

SELECT * FROM w7_base ORDER BY t;

\echo ''
\echo '=== B1. 租户身份 tenant=...0001（期望：菜单/字典总行数 = 基线；跨租户不可见）==='
SET app.rls_system = 'off';
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';

SELECT 'core_menus' AS t,
       (SELECT count(*) FROM public.core_menus) AS visible,
       (SELECT n FROM w7_base WHERE t = 'core_menus') AS base
UNION ALL SELECT 'core_menu_groups',
       (SELECT count(*) FROM public.core_menu_groups),
       (SELECT n FROM w7_base WHERE t = 'core_menu_groups')
UNION ALL SELECT 'core_dict_types',
       (SELECT count(*) FROM public.core_dict_types),
       (SELECT n FROM w7_base WHERE t = 'core_dict_types')
UNION ALL SELECT 'core_dict_items',
       (SELECT count(*) FROM public.core_dict_items),
       (SELECT n FROM w7_base WHERE t = 'core_dict_items')
UNION ALL SELECT 'core_roles',
       (SELECT count(*) FROM public.core_roles),
       (SELECT n FROM w7_base WHERE t = 'core_roles')
UNION ALL SELECT 'core_tenants',
       (SELECT count(*) FROM public.core_tenants),
       (SELECT n FROM w7_base WHERE t = 'core_tenants')
UNION ALL SELECT 'audit_logs',
       (SELECT count(*) FROM public.audit_logs),
       (SELECT n FROM w7_base WHERE t = 'audit_logs')
ORDER BY t;

\echo '--- B1.1 跨租户隔离：租户视角不应看到其它租户行（期望 other_tenants=0）---'
SELECT count(*) AS other_tenant_rows
FROM public.audit_logs
WHERE tenant_id IS NOT NULL
  AND tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid;

\echo ''
\echo '=== C. 写探测（事务内，结束 ROLLBACK，不落数据）==='
\echo '--- C1. 租户改全局行（期望 updated=0）---'
BEGIN;
WITH u AS (
    UPDATE public.core_dict_items SET name = name WHERE tenant_id IS NULL RETURNING 1
)
SELECT count(*) AS updated FROM u;
ROLLBACK;

\echo '--- C2. 系统通道改全局行（期望 updated = 全局行数）---'
BEGIN;
SET LOCAL app.rls_system = 'on';
WITH u AS (
    UPDATE public.core_dict_items SET name = name WHERE tenant_id IS NULL RETURNING 1
)
SELECT count(*) AS updated FROM u;
ROLLBACK;

\echo ''
\echo '=== D. 无上下文 fail-closed（租户专属表期望 0 行；菜单/字典为全局行，按设计仍可见）==='
SET app.rls_system = 'off';
SET app.tenant_id = '';
SELECT (SELECT count(*) FROM public.audit_logs) AS audit_without_context,
       (SELECT count(*) FROM public.core_user_company_scopes) AS company_scopes_without_context,
       (SELECT count(*) FROM public.core_menus) AS global_menus_still_visible,
       (SELECT count(*) FROM public.core_dict_items) AS global_dict_items_still_visible;

RESET app.rls_system;
RESET app.tenant_id;
RESET ROLE;

\echo ''
\echo '=== W7-B1 验证结束 ==='

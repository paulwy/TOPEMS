-- ============================================================
-- W7 · B1 回滚脚本（窗口内手工执行 / 急停用）
--
-- 用法：psql -v ON_ERROR_STOP=1 -f scripts/ops/w7_b1_rollback.sql
--       （本文件自带 BEGIN/COMMIT，不要加 --single-transaction）
--
-- 分两段，按需执行：
--   第 1 段（数据回滚）：core_menus / core_menu_groups / core_dict_types /
--          core_dict_items 的 NULL 行改回 ...0001；core_roles 的 NULL 行改回
--          ...0000（系统角色）。
--   第 2 段（策略急停）：12 张表 NO FORCE，恢复 owner 旁路（设计 §7.1.1）。
--          ⚠️ 只 NO FORCE、不 DROP 策略：策略保留，非 owner 角色仍受隔离。
--
-- ⚠️ 第 1 段只在「迁移前 NULL 行数 = 0」时逐行等价（生产 4 张表复核均为 0）。
--    若迁移前已存在全局 NULL 行，本段会把它们一并翻成 ...0001，必须改用
--    窗口前的行快照恢复；迁移前计数见迁移 20261110100100 的 NOTICE 日志。
-- ============================================================

\echo '=== W7-B1 第 1 段：数据回滚（NULL → ...0001）==='

BEGIN;
SET LOCAL app.rls_system = 'on';

DO $rb$
DECLARE
    v_tenant CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
    t text;
    n bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'core_menus', 'core_menu_groups', 'core_dict_types', 'core_dict_items'
    ]
    LOOP
        EXECUTE format('UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL', t)
            USING v_tenant;
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'W7-B1 回滚 %: % 行 NULL → ...0001', t, n;
    END LOOP;
END
$rb$;

DO $rb_roles$
DECLARE
    v_nil CONSTANT uuid := '00000000-0000-0000-0000-000000000000';
    n bigint;
BEGIN
    UPDATE public.core_roles SET tenant_id = v_nil WHERE tenant_id IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'W7-B1 回滚 core_roles: % 行 NULL → ...0000', n;
END
$rb_roles$;

-- 数据回滚完成后恢复 NOT NULL（若仍有非迁移产生的 NULL 行，这里会失败，
-- 正好提示必须改用行快照恢复）
ALTER TABLE public.core_menus       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.core_menu_groups ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.core_dict_types  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.core_dict_items  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.core_roles       ALTER COLUMN tenant_id SET NOT NULL;

COMMIT;

\echo '=== W7-B1 第 2 段：策略急停（12 张表 NO FORCE）==='

BEGIN;

ALTER TABLE public.core_sessions             NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_refresh_tokens       NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_menus                NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_menu_groups          NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenants              NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_roles                NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_dict_types           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_dict_items           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_login_logs           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_settings      NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_user_company_scopes  NO FORCE ROW LEVEL SECURITY;

COMMIT;

\echo '=== W7-B1 回滚完成（策略仍在，仅 owner 旁路恢复）==='

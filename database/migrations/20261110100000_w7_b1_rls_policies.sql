-- ============================================================
-- W7 · B1 系统/认证边界：12 张表 RLS 策略收敛（fail-closed）
-- 版本：20261110100000
--
-- 统一谓词（设计 §4.1，裁决 2/5/6）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--   - 无 nil UUID 全量分支；未设上下文 = 看不到任何行
--   - 不做列侧 cast（(tenant_id)::text 会让索引失效）
--   - app.rls_system 仅 SET LOCAL，未设即 off
--
-- 策略形态（每种表只保留下面登记的 1~2 条，其余历史策略一律 DROP）：
--   1) 系统通道专用：core_sessions / core_refresh_tokens（裁决 1）
--   2) 本租户 + 系统通道：audit_logs / core_tenant_settings / core_user_company_scopes
--   3) 本租户 + 系统通道读，写仅系统：core_login_logs
--   4) 全局行只读（独立 SELECT 策略，裁决 2/§4.3）：
--        core_menus / core_menu_groups / core_dict_types / core_dict_items / core_roles
--      写仍限「本租户或系统通道」，全局行对租户只读；
--      全局行统一为 tenant_id IS NULL（nil 行由 20261110100100 归一）
--   5) 租户登记表只读 + 系统写：core_tenants
--
-- 12 张表全部 ENABLE + FORCE（其中 core_sessions / core_refresh_tokens /
-- core_user_company_scopes 为本次补 FORCE）。
--
-- 幂等：先按 pg_policies 动态清空目标表全部策略，再 CREATE POLICY；
--       重复执行结果一致。
--
-- 回滚（手工执行，等价于恢复 owner 旁路，仅供窗口急停）：
--   DROP POLICY IF EXISTS rls_tenant_isolation ON public.<表>;
--   ALTER TABLE public.<表> NO FORCE ROW LEVEL SECURITY;
--   （core_sessions/core_refresh_tokens 的 rls_system_only 同理；
--     完整的策略恢复需回放窗口前 pg_policies 快照，见脚本
--     scripts/ops/w7_b1_rollback.sql）
-- ============================================================

SET lock_timeout = '5s';

-- ------------------------------------------------------------
-- 0) 清空 12 张表的全部历史策略（permissive 是 OR 关系，留着旧条目等于没收紧）
-- ------------------------------------------------------------
DO $purge$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'core_sessions', 'core_refresh_tokens', 'core_menus', 'core_menu_groups',
              'core_tenants', 'core_roles', 'core_dict_types', 'core_dict_items',
              'audit_logs', 'core_login_logs', 'core_tenant_settings',
              'core_user_company_scopes'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END
$purge$;

-- ------------------------------------------------------------
-- 1) 系统通道专用（裁决 1：登录/刷新/登出只走 scope_system）
-- ------------------------------------------------------------
ALTER TABLE public.core_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_system_only ON public.core_sessions
    FOR ALL TO PUBLIC
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

ALTER TABLE public.core_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_refresh_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_system_only ON public.core_refresh_tokens
    FOR ALL TO PUBLIC
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

-- ------------------------------------------------------------
-- 2) 本租户 + 系统通道（无全局行）
-- ------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.audit_logs
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_tenant_settings
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_user_company_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_user_company_scopes FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_user_company_scopes
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- ------------------------------------------------------------
-- 3) 登录日志：读本租户 + 系统通道；写仅系统通道
-- ------------------------------------------------------------
ALTER TABLE public.core_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_login_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_read ON public.core_login_logs
    FOR SELECT TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
CREATE POLICY rls_system_only ON public.core_login_logs
    FOR ALL TO PUBLIC
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

-- ------------------------------------------------------------
-- 4) 全局行只读：菜单 / 菜单分组 / 字典类型 / 字典项
--    SELECT = 本租户 + 系统通道 + 全局行（tenant_id IS NULL）
--    ALL    = 本租户 + 系统通道（全局行对租户不可写）
-- ------------------------------------------------------------
ALTER TABLE public.core_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_menus FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_global_read ON public.core_menus
    FOR SELECT TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );
CREATE POLICY rls_tenant_isolation ON public.core_menus
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_menu_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_menu_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_global_read ON public.core_menu_groups
    FOR SELECT TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );
CREATE POLICY rls_tenant_isolation ON public.core_menu_groups
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_dict_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_dict_types FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_global_read ON public.core_dict_types
    FOR SELECT TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );
CREATE POLICY rls_tenant_isolation ON public.core_dict_types
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_dict_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_dict_items FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_global_read ON public.core_dict_items
    FOR SELECT TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );
CREATE POLICY rls_tenant_isolation ON public.core_dict_items
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- ------------------------------------------------------------
-- 5) core_roles：全局行 = tenant_id IS NULL（系统角色行在 20261110100100 中
--    由 ...0000 归一为 NULL，策略本身不再保留 nil 分支）
-- ------------------------------------------------------------
ALTER TABLE public.core_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_global_read ON public.core_roles
    FOR SELECT TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );
CREATE POLICY rls_tenant_isolation ON public.core_roles
    FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- ------------------------------------------------------------
-- 6) core_tenants：租户登记表，租户侧只读全局行，写仅系统通道
-- ------------------------------------------------------------
ALTER TABLE public.core_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_global_read ON public.core_tenants
    FOR SELECT TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id IS NULL
    );
CREATE POLICY rls_system_only ON public.core_tenants
    FOR ALL TO PUBLIC
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

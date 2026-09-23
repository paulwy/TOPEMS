-- menu 全局（零值租户）菜单可见性修复
-- 问题：通用 rls_tenant_isolation 策略将零值租户行（全局系统菜单）对普通租户拦截，
--       导致租户登录后看不到系统菜单（list items=[] 而 total=53）。
-- 方案：为 menu 表新增专属策略（零值行对所有租户可见 + 本租户专属行可见），
--       与通用策略并存（PostgreSQL RLS 多策略 OR 合并 → 放行）。
-- 影响面：仅 core_menu_groups / core_menus 两表，不触碰通用策略（避免 audit_logs 等
--       零值行意外暴露给租户）。

DROP POLICY IF EXISTS rls_menu_global_visible ON public.core_menu_groups;
CREATE POLICY rls_menu_global_visible ON public.core_menu_groups
USING (
  tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_menu_global_visible ON public.core_menus;
CREATE POLICY rls_menu_global_visible ON public.core_menus
USING (
  tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);

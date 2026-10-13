-- 清理 portal schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS portal_announcements_tenant_policy ON portal.portal_announcements;
DROP POLICY IF EXISTS user_preferences_tenant_policy ON portal.user_preferences;
DROP POLICY IF EXISTS portal_quick_actions_tenant_isolation ON portal.portal_quick_actions;
DROP POLICY IF EXISTS portal_todos_tenant_isolation ON portal.portal_todos;

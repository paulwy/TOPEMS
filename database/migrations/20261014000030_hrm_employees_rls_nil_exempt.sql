-- 4.4 修复：hrm.employees 缺 nil 租户写豁免，与 departments/positions 对齐。
--
-- 背景：
--   hrm/departments、hrm/positions 的 rls_tenant_isolation WITH CHECK 含
--   `OR app.tenant_id = '00000000-0000-0000-0000-000000000000'` 豁免，
--   而 hrm.employees 的同名策略缺该子句。初始化向导（/setup/admin）以超管/服务身份
--   （tenant_middleware 置 nil RLS 上下文）插入 tenant_id='000...001' 的管理员员工，
--   因 WITH CHECK 不含 nil 豁免被 RLS 拒绝，导致向导 live 走不通。
--
-- 处置：DROP 既有策略后按 a5（20261003000009）标准表达式重建（含 nil 豁免），
--       USING 与 WITH CHECK 同式，与 departments/positions 逐字对齐。

DROP POLICY IF EXISTS "rls_tenant_isolation" ON "hrm"."employees";

CREATE POLICY "rls_tenant_isolation" ON "hrm"."employees"
    FOR ALL
    USING (
        (COALESCE(current_setting('app.tenant_id'::text, true), '') = '00000000-0000-0000-0000-000000000000')
        OR (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = '')
        OR (tenant_id IS NULL)
        OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''))
    )
    WITH CHECK (
        (COALESCE(current_setting('app.tenant_id'::text, true), '') = '00000000-0000-0000-0000-000000000000')
        OR (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = '')
        OR (tenant_id IS NULL)
        OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''))
    );

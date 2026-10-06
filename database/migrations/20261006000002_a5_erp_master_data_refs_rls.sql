-- =============================================================
-- A5：erp.erp_master_data_refs RLS 租户隔离策略（供 topems_app 受限角色）
-- 关联审计：A5（erp RLS policy 供 topems_app）
--
-- 背景：
--   erp.erp_master_data_refs 已 ENABLE + FORCE ROW LEVEL SECURITY，但 pg_policies
--   中无任何策略（RLS 开 + 无策略 = 默认拒绝）。scripts/db/rls-app-exemption.sql
--   中虽有同名历史策略（tenant_isolation_erp_master_data_refs），但脚本为人工维护、
--   当前未落盘执行。本迁移将策略以规范迁移形式固化，供 topems_app 受限角色接入。
--
-- 策略语义（与 B5/U5、rls-policy-unify.sql 一致）：
--   - GUC 未设置/为空 → 全放行（向后兼容）
--   - GUC = nil UUID（service token / 系统调用）→ 全放行
--   - tenant_id IS NULL（共享/全局行）→ 放行
--   - 否则仅放行本租户行
--
-- 幂等：
--   - 策略仅在不存在时创建（NOT EXISTS 守卫），不覆盖既有策略
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'erp'
          AND tablename = 'erp_master_data_refs'
          AND policyname = 'rls_tenant_isolation'
    ) THEN
        CREATE POLICY rls_tenant_isolation ON erp.erp_master_data_refs
        FOR ALL USING (
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
        RAISE NOTICE 'A5: created rls_tenant_isolation on erp.erp_master_data_refs';
    END IF;
END $$;

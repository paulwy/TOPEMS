-- RLS 覆盖率专项：为 12 张含 tenant_id 但未启用 RLS 的表补 RLS（幂等）
-- 盘点来源：docs/assessments/rls-coverage-audit-2026-09-10.md
-- 策略语义：无租户上下文→全放行；有上下文→仅本租户行；tenant_id IS NULL→共享行放行
-- 2026-09-18 防御化（空库重建链卡点）：重构为 FOREACH 循环；
-- 表不存在或无 tenant_id 列（骨架/未建表）时跳过，幂等安全。

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm.customer_finance',
    'wms.slotting_rules',
    'wms.slotting_suggestions',
    'wms.slotting_zones',
    'hrm.module_settings',
    'mes.module_settings',
    'pdm.module_settings',
    'rs.module_settings',
    'scm.module_settings',
    'scm.inspection_records',
    'ai.model_usage_stats',
    'communication.notification_channels'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2))
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2)
                 AND column_name = 'tenant_id') THEN
      EXECUTE 'ALTER TABLE ' || t || ' ENABLE ROW LEVEL SECURITY';
      EXECUTE 'DROP POLICY IF EXISTS rls_tenant_isolation ON ' || t;
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
  END LOOP;
END $$;

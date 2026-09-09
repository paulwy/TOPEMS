-- RLS 覆盖率专项：为 12 张含 tenant_id 但未启用 RLS 的表补 RLS（幂等）
-- 盘点来源：docs/assessments/rls-coverage-audit-2026-09-10.md
-- 策略语义：无租户上下文→全放行；有上下文→仅本租户行；tenant_id IS NULL→共享行放行

-- ========== 启用 RLS ==========

-- P0：P0 新建表遗漏 RLS（4 张）
ALTER TABLE crm.customer_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_zones ENABLE ROW LEVEL SECURITY;

-- P1：module_settings 系列（5 张）
ALTER TABLE hrm.module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.module_settings ENABLE ROW LEVEL SECURITY;

-- P1：存量业务表（1 张）
ALTER TABLE scm.inspection_records ENABLE ROW LEVEL SECURITY;

-- P2：统计表/配置表（2 张）
ALTER TABLE ai.model_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.notification_channels ENABLE ROW LEVEL SECURITY;

-- ========== 创建租户隔离 policy（幂等：先 DROP 再 CREATE）==========

DROP POLICY IF EXISTS rls_tenant_isolation ON crm.customer_finance;
CREATE POLICY rls_tenant_isolation ON crm.customer_finance USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.slotting_rules;
CREATE POLICY rls_tenant_isolation ON wms.slotting_rules USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.slotting_suggestions;
CREATE POLICY rls_tenant_isolation ON wms.slotting_suggestions USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.slotting_zones;
CREATE POLICY rls_tenant_isolation ON wms.slotting_zones USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON hrm.module_settings;
CREATE POLICY rls_tenant_isolation ON hrm.module_settings USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON mes.module_settings;
CREATE POLICY rls_tenant_isolation ON mes.module_settings USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.module_settings;
CREATE POLICY rls_tenant_isolation ON pdm.module_settings USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON rs.module_settings;
CREATE POLICY rls_tenant_isolation ON rs.module_settings USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON scm.module_settings;
CREATE POLICY rls_tenant_isolation ON scm.module_settings USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON scm.inspection_records;
CREATE POLICY rls_tenant_isolation ON scm.inspection_records USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ai.model_usage_stats;
CREATE POLICY rls_tenant_isolation ON ai.model_usage_stats USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON communication.notification_channels;
CREATE POLICY rls_tenant_isolation ON communication.notification_channels USING (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = current_setting('app.current_tenant_id', true)
) WITH CHECK (
  current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
  OR tenant_id IS NULL
  OR tenant_id = current_setting('app.current_tenant_id', true)
);

-- 验证
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = t.schemaname)
  WHERE t.schemaname NOT IN ('pg_catalog', 'information_schema', 'public', '_sqlx_test')
    AND c.relrowsecurity = false
    AND EXISTS (
      SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema = t.schemaname AND col.table_name = t.tablename
        AND col.column_name IN ('tenant_id', 'org_id')
    );
  RAISE NOTICE 'RLS 覆盖率专项完成：剩余含 tenant_id 但未启用 RLS 的表 = %', cnt;
END $$;

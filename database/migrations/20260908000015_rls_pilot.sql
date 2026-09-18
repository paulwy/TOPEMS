-- RLS 专项试点：4 张含租户列表启用 RLS + 租户隔离策略（幂等）
-- 策略语义：
--   无租户上下文（current_setting 未设置或空）→ 全放行（兼容现有连接，零破坏）
--   有租户上下文 → 仅可见/可写本租户行（tenant_id 匹配）
--   tenant_id IS NULL 的行视为共享/系统行，放行
-- 不 FORCE：superuser/owner 管理通道不受影响（应用接入非 superuser 角色或 FORCE 后生效）
-- 后续全量迁移将按本策略模板扩展至全部 334 张未启用表
-- 2026-09-18 防御化（空库重建链卡点）：pm.pm_master_data_refs 在空库重建仅为 2 列骨架
-- （5432 亦不存在此表），策略引用 tenant_id 报列不存在；先对 4 张表防御式补列（表存在才补）。
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pm.pm_tasks', 'pm.pm_master_data_refs',
    'crm.billing_records', 'crm.returns'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2)) THEN
      EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
    END IF;
  END LOOP;
END $$;
DO $$
DECLARE
  t text;
  pol_exists boolean;
  uuid_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pm.pm_tasks', 'pm.pm_master_data_refs',
    'crm.billing_records', 'crm.returns'
  ]
  LOOP
    -- 幂等：已启用则跳过
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);

    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = split_part(t, '.', 1)
        AND tablename = split_part(t, '.', 2)
        AND policyname = 'rls_tenant_isolation'
    ) INTO pol_exists;

    IF NOT pol_exists THEN
      EXECUTE format(
        'CREATE POLICY rls_tenant_isolation ON %s
         USING (
           current_setting(''app.current_tenant_id'', true) IS NULL
           OR current_setting(''app.current_tenant_id'', true) = ''''
           OR tenant_id IS NULL
           OR tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
         )
         WITH CHECK (
           current_setting(''app.current_tenant_id'', true) IS NULL
           OR current_setting(''app.current_tenant_id'', true) = ''''
           OR tenant_id IS NULL
           OR tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
         )',
        t);
    END IF;
  END LOOP;
END $$;

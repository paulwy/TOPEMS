-- 检索投影"公共行"可见性收口
--
-- 背景：
--   erp 侧超管创建的公共主数据（如 erp.materials）落 `tenant_id IS NULL`，
--   erp 自有 RLS 策略允许 `tenant_id IS NULL` 行对所有租户可见；
--   但投影表 `public.search_entity_projections` 的 tenant_id 是 PK 列（NOT NULL
--   DEFAULT 零租户），写投影时 NULL 被归一为零租户 UUID，原策略只放行
--   `tenant_id = app.tenant_id` / `tenant_id IS NULL`，于是公共行对任何真实租户都不可见，
--   表现为"物料/客户等公共主数据搜不到"。
--
-- 处理：
--   把零租户 UUID 视为"公共行"（与 erp `tenant_id IS NULL` 语义对齐），
--   在投影层显式放行；租户自有行仍严格按 app.tenant_id 隔离，跨租户数据不会互相可见
--   （零租户桶按定义只有"无归属/公共"数据）。
--
-- 事务：本文件不自带 BEGIN/COMMIT（外层 apply 用 --single-transaction 包住
--       「迁移 SQL + 账本写入」，文件内 COMMIT 会提前结束外层事务、产生半应用态）。
--
-- 回滚（如需恢复严格隔离）：
--   DROP POLICY IF EXISTS tenant_isolation_search_entity_projections ON public.search_entity_projections;
--   CREATE POLICY tenant_isolation_search_entity_projections ON public.search_entity_projections
--     FOR ALL USING (
--       tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID
--       OR tenant_id IS NULL
--       OR NULLIF(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
--     )
--     WITH CHECK (...同上...);

DO $$
DECLARE
  t text;
  nil_uuid constant text := '00000000-0000-0000-0000-000000000000';
  pol text;
  pol_sql text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.search_entity_projections',
    'public.search_entity_projections_v2'
  ] LOOP
    IF to_regclass(t) IS NULL THEN
      RAISE NOTICE 'skip (relation missing): %', t;
      CONTINUE;
    END IF;

    pol := 'tenant_isolation_' || split_part(t, '.', 2);
    pol_sql := format(
      'tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::UUID '
      'OR tenant_id IS NULL '
      'OR tenant_id = %L::UUID '
      'OR NULLIF(current_setting(''app.tenant_id'', true), '''') = %L',
      nil_uuid, nil_uuid
    );

    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol, t);
    EXECUTE format('CREATE POLICY %I ON %s FOR ALL USING (%s) WITH CHECK (%s)', pol, t, pol_sql, pol_sql);
    RAISE NOTICE 'public-row visibility applied: %', t;
  END LOOP;
END $$;


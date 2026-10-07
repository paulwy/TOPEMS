-- =============================================================
-- B5（残留补齐）：gis 含 tenant_id 表误用 allow-all 策略的修正（幂等）
-- 关联：20261006000001_b5_gis_rls_enable（B5）+ 20261006000004_b5b_gis_rls_allowall_policy
--
-- 背景：
--   20261006000004（b5b）当时对“无 tenant_id 列”的 gis 基表补 gis_allow_all_*
--   全放行策略，以解除 RLS+FORCE 无策略导致的“意外全拒”。但后续迁移把 tenant_id(uuid)
--   列补回了其中 7 张表，这些表当前状态为：
--     RLS=ON + FORCE=ON + 有 tenant_id(uuid) 列，但策略仍是 gis_allow_all_*（USING true）。
--   Postgres 的多条 permissive 策略按 OR 叠加 → allow-all 架空租户隔离，
--   即 U5/finance 同款“有 RLS 无隔离”旧病在 gis 的残留（F-06 族）。
--
--   实测 5432/5433（2026-10-08）命中 7 张表：
--     business_locations / device_location_records / device_locations / devices /
--     factory_maps / location_photos / warehouse_locations
--   （均 tenant_id uuid 可空、当前 0 行；gis_map_markers 已有等价 tenant_isolation 策略，不动）
--
-- 本迁移按 finance U5（20261003000001）口径修正：
--   对“含 tenant_id(uuid) 列 且 仍挂 gis_allow_all_* 策略”的 gis 基表：
--     1) ENABLE + FORCE ROW LEVEL SECURITY（幂等，已开则无操作）
--     2) DROP gis_allow_all_* 策略（解除对租户隔离的架空）
--     3) CREATE POLICY rls_tenant_isolation（与 finance U5 / evidence_records 同一表达式）
--
-- 策略语义（与 finance U5 完全一致）：
--   - GUC 未设置/为空（无 x-tenant-id 的系统/事件/健康查询）→ 全放行（向后兼容 allow-all 旧行为）
--   - GUC = nil UUID（service token / 系统调用）→ 全放行
--   - tenant_id IS NULL（共享/全局行）→ 放行
--   - 否则仅放行本租户行（跨租户行对运行时角色不可见）
--
-- 幂等：
--   - 目标表由“有 tenant_id(uuid) 且仍挂 gis_allow_all_*”动态界定；
--     二次运行时 allow-all 已 drop、rls_tenant_isolation 已建 → 外层循环不再命中，无副作用。
--   - 不动：已有 rls_tenant_isolation 的表、gis_map_markers（已有等价 tenant_isolation）、
--         真正无 tenant_id 列的表（其 b5b allow-all 保留）。
--   - 不修改任何已应用迁移文件。
-- =============================================================

DO $$
DECLARE
    r RECORD;
    pol text;
    expr text;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'gis'
          AND c.relkind = 'r'                 -- 仅基表，排除视图
          AND c.relname NOT LIKE 'pg\_%'
          -- 含 tenant_id(uuid) 列
          AND EXISTS (
              SELECT 1 FROM information_schema.columns ci
              WHERE ci.table_schema = 'gis'
                AND ci.table_name = c.relname
                AND ci.column_name = 'tenant_id'
                AND ci.data_type = 'uuid'
          )
          -- 但仍挂着 b5b 的全放行策略（残留）
          AND EXISTS (
              SELECT 1 FROM pg_policies p
              WHERE p.schemaname = 'gis'
                AND p.tablename = c.relname
                AND p.policyname LIKE 'gis\_allow\_all\_%'
          )
        ORDER BY c.relname
    LOOP
        -- 1) 启用 RLS + FORCE（幂等）
        EXECUTE format('ALTER TABLE gis.%I ENABLE ROW LEVEL SECURITY', r.tbl);
        EXECUTE format('ALTER TABLE gis.%I FORCE ROW LEVEL SECURITY', r.tbl);

        -- 2) 删除架空隔离的 allow-all 策略
        FOR pol IN
            SELECT p.policyname FROM pg_policies p
            WHERE p.schemaname = 'gis'
              AND p.tablename = r.tbl
              AND p.policyname LIKE 'gis\_allow\_all\_%'
        LOOP
            EXECUTE format('DROP POLICY %I ON gis.%I', pol, r.tbl);
            RAISE NOTICE 'B5: dropped allow-all policy % on gis.%', pol, r.tbl;
        END LOOP;

        -- 3) 与 finance U5（evidence_records/locations）完全一致的 uuid 表达式
        expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
             || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
             || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
             || ' OR (tenant_id IS NULL)'
             || ' OR ((tenant_id)::text = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'gis'
              AND p.tablename = r.tbl
              AND p.policyname = 'rls_tenant_isolation'
        ) THEN
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON gis.%I FOR ALL USING (%s) WITH CHECK (%s)',
                r.tbl, expr, expr
            );
            RAISE NOTICE 'B5: created rls_tenant_isolation on gis.%', r.tbl;
        END IF;
    END LOOP;
END $$;

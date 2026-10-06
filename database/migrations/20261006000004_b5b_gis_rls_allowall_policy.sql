-- =============================================================================
-- 20261006000004_b5b_gis_rls_allowall_policy.sql — B5 发现项：无 tenant_id 表策略补齐
-- =============================================================================
-- 背景（B5 关联审计，2026-10-06）:
--   B5（20261006000001）对 gis schema 含 tenant_id 列的业务表补齐了
--   rls_tenant_isolation 租户隔离策略，按设计未触碰无 tenant_id 列的表
--   （14 张：audit_log/audit_logs/business_locations/device_location_records/
--   device_locations/devices/factory_maps/geodata/geofeatures/geofence_alerts/
--   location_photos/map_layers/spatial_analysis/warehouse_locations）。
--   但实测发现：这 14 张表 RLS 与 FORCE 均已开启（历史迁移所致）且无任何策略
--   → RLS 开 + FORCE + 无策略 = 默认拒绝所有行——受限角色（topems_app）运行时
--   对这些表 读/写 全被拒绝（gis 服务对 business_locations 等有 10+ 处查询）。
--
-- 定案：补"全放行"策略（USING(true) WITH CHECK(true)）。
--   - 这些表无 tenant_id 列 → 无租户隔离设计（补列+数据回填+服务改造是另一工程，
--     如需真租户隔离另立条目）；
--   - 现状等同"superuser 视角可读写"（生产/部署受限角色被意外全拒是功能缺陷）；
--   - 全放行策略解除意外全拒，恢复设计预期可读写，与"无隔离意图"语义一致。
--
-- 幂等：
--   - 仅对"无 tenant_id 列 且 当前无任何策略"的 gis 基表创建策略（NOT EXISTS 守卫）；
--   - 已有 rls_tenant_isolation 的 6 张含 tenant_id 表不受影响；
--   - 重复执行：已有策略的表被 NOT EXISTS 跳过，无副作用。
--
-- 遗留登记：如业务需要真租户隔离，需为这些表补 tenant_id 列 + 服务写入改造
--          （另立条目），本迁移只解除意外全拒。
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'gis'
          AND c.relkind = 'r'                 -- 仅基表，排除视图
          AND c.relname NOT LIKE 'pg\_%'
          AND NOT EXISTS (
              -- 无 tenant_id 列
              SELECT 1 FROM information_schema.columns ic
              WHERE ic.table_schema = 'gis'
                AND ic.table_name = c.relname
                AND ic.column_name = 'tenant_id'
          )
          AND NOT EXISTS (
              -- 当前无任何策略（幂等：已有策略的表跳过）
              SELECT 1 FROM pg_policies p
              WHERE p.schemaname = 'gis' AND p.tablename = c.relname
          )
    LOOP
        EXECUTE format(
            'CREATE POLICY gis_allow_all_%I ON gis.%I USING (true) WITH CHECK (true)',
            r.tbl, r.tbl
        );
        RAISE NOTICE 'created allow-all policy on gis.%', r.tbl;
    END LOOP;
END $$;

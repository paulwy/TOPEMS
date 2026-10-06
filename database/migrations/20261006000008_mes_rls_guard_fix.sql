-- 清理 mes schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS equipment_tenant_policy ON mes.equipment;
DROP POLICY IF EXISTS equipment_inspection_records_tenant_policy ON mes.equipment_inspection_records;
DROP POLICY IF EXISTS equipment_maintenance_records_tenant_policy ON mes.equipment_maintenance_records;
DROP POLICY IF EXISTS process_route_steps_tenant_policy ON mes.process_route_steps;
DROP POLICY IF EXISTS process_routes_tenant_policy ON mes.process_routes;
DROP POLICY IF EXISTS production_orders_tenant_policy ON mes.production_orders;
DROP POLICY IF EXISTS production_processes_tenant_policy ON mes.production_processes;
DROP POLICY IF EXISTS production_records_tenant_policy ON mes.production_records;
DROP POLICY IF EXISTS work_stations_tenant_policy ON mes.work_stations;
DROP POLICY IF EXISTS process_flows_tenant_policy ON mes.process_flows;
DROP POLICY IF EXISTS process_flow_steps_tenant_policy ON mes.process_flow_steps;
DROP POLICY IF EXISTS quality_inspections_tenant_policy ON mes.quality_inspections;
DROP POLICY IF EXISTS quality_patrols_tenant_policy ON mes.quality_patrols;
DROP POLICY IF EXISTS quality_patrol_items_tenant_policy ON mes.quality_patrol_items;
DROP POLICY IF EXISTS quality_standard_values_tenant_policy ON mes.quality_standard_values;
DROP POLICY IF EXISTS quality_standards_tenant_policy ON mes.quality_standards;

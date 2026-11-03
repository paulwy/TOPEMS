-- ============================================================
-- DB-13: 5433 numeric↔double precision 20 列对齐 test
--
-- 背景：类型批次——数值类型方向差异。
-- 方向：对齐 test（基准）。
--   * test=numeric, cur=double precision → 5433 改 numeric（13 列，mes.equipment_oee 11 + erp/gis 各 1）
--   * test=double precision, cur=numeric → 5433 改 double precision（7 列，rs.project_members 5 + rs.projects 1 + mes.capacities 1）
-- ============================================================

SET lock_timeout = '5s';

-- test=numeric → 5433 改 numeric（13 列）
ALTER TABLE erp.bank_accounts ALTER COLUMN balance TYPE numeric USING balance::numeric;
ALTER TABLE gis.warehouse_locations ALTER COLUMN usage_rate TYPE numeric USING usage_rate::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN actual_output TYPE numeric USING actual_output::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN actual_run_time TYPE numeric USING actual_run_time::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN availability TYPE numeric USING availability::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN defective_output TYPE numeric USING defective_output::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN downtime TYPE numeric USING downtime::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN good_output TYPE numeric USING good_output::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN ideal_cycle_time TYPE numeric USING ideal_cycle_time::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN oee TYPE numeric USING oee::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN performance TYPE numeric USING performance::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN planned_production_time TYPE numeric USING planned_production_time::numeric;
ALTER TABLE mes.equipment_oee ALTER COLUMN quality_rate TYPE numeric USING quality_rate::numeric;

-- test=double precision → 5433 改 double precision（7 列）
ALTER TABLE mes.capacities ALTER COLUMN used_hours TYPE double precision USING used_hours::double precision;
ALTER TABLE rs.project_members ALTER COLUMN actual_hours TYPE double precision USING actual_hours::double precision;
ALTER TABLE rs.project_members ALTER COLUMN allocation TYPE double precision USING allocation::double precision;
ALTER TABLE rs.project_members ALTER COLUMN budgeted_hours TYPE double precision USING budgeted_hours::double precision;
ALTER TABLE rs.project_members ALTER COLUMN cost_rate TYPE double precision USING cost_rate::double precision;
ALTER TABLE rs.project_members ALTER COLUMN hourly_rate TYPE double precision USING hourly_rate::double precision;
ALTER TABLE rs.projects ALTER COLUMN budget TYPE double precision USING budget::double precision;

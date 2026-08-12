-- TOPEMS MES Service - Add tenant_id + RLS for all business tables (spec 2026-08-12)
-- 覆盖 spec §3.1 中的 22 张表（不带 mes_ 前缀的业务表）

-- ============================================
-- 通用模板：每张表执行 ADD COLUMN + backfill + NOT NULL + index + RLS
-- ============================================

-- 1. production_orders
ALTER TABLE IF EXISTS production_orders ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_orders SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_orders ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_orders_tenant_id ON production_orders(tenant_id);
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_orders_tenant_isolation ON production_orders;
CREATE POLICY production_orders_tenant_isolation ON production_orders
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 2. production_processes
ALTER TABLE IF EXISTS production_processes ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_processes SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_processes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_processes ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_processes_tenant_id ON production_processes(tenant_id);
ALTER TABLE production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_processes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_processes_tenant_isolation ON production_processes;
CREATE POLICY production_processes_tenant_isolation ON production_processes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 3. production_records
ALTER TABLE IF EXISTS production_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_records_tenant_id ON production_records(tenant_id);
ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_records_tenant_isolation ON production_records;
CREATE POLICY production_records_tenant_isolation ON production_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 4. equipment
ALTER TABLE IF EXISTS equipment ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_tenant_id ON equipment(tenant_id);
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_tenant_isolation ON equipment;
CREATE POLICY equipment_tenant_isolation ON equipment
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 5. work_stations
ALTER TABLE IF EXISTS work_stations ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE work_stations SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE work_stations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE work_stations ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_work_stations_tenant_id ON work_stations(tenant_id);
ALTER TABLE work_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_stations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_stations_tenant_isolation ON work_stations;
CREATE POLICY work_stations_tenant_isolation ON work_stations
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 6. production_schedules
ALTER TABLE IF EXISTS production_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_schedules SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_schedules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_schedules ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_schedules_tenant_id ON production_schedules(tenant_id);
ALTER TABLE production_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_schedules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_schedules_tenant_isolation ON production_schedules;
CREATE POLICY production_schedules_tenant_isolation ON production_schedules
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 7-8. material_boms, bom_items
ALTER TABLE IF EXISTS material_boms ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_boms SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_boms ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_boms ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_boms_tenant_id ON material_boms(tenant_id);
ALTER TABLE material_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_boms FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_boms_tenant_isolation ON material_boms;
CREATE POLICY material_boms_tenant_isolation ON material_boms
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS bom_items ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE bom_items SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE bom_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE bom_items ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_bom_items_tenant_id ON bom_items(tenant_id);
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bom_items_tenant_isolation ON bom_items;
CREATE POLICY bom_items_tenant_isolation ON bom_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 9-10. material_issues, material_issue_items
ALTER TABLE IF EXISTS material_issues ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_issues SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_issues ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_issues ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_issues_tenant_id ON material_issues(tenant_id);
ALTER TABLE material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_issues FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_issues_tenant_isolation ON material_issues;
CREATE POLICY material_issues_tenant_isolation ON material_issues
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS material_issue_items ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_issue_items SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_issue_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_issue_items ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_issue_items_tenant_id ON material_issue_items(tenant_id);
ALTER TABLE material_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_issue_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_issue_items_tenant_isolation ON material_issue_items;
CREATE POLICY material_issue_items_tenant_isolation ON material_issue_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 11-12. material_returns, material_return_items
ALTER TABLE IF EXISTS material_returns ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_returns SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_returns ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_returns ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_returns_tenant_id ON material_returns(tenant_id);
ALTER TABLE material_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_returns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_returns_tenant_isolation ON material_returns;
CREATE POLICY material_returns_tenant_isolation ON material_returns
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS material_return_items ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_return_items SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_return_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_return_items ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_return_items_tenant_id ON material_return_items(tenant_id);
ALTER TABLE material_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_return_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_return_items_tenant_isolation ON material_return_items;
CREATE POLICY material_return_items_tenant_isolation ON material_return_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 13-14. quality_records, batch_records
ALTER TABLE IF EXISTS quality_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE quality_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE quality_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE quality_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_quality_records_tenant_id ON quality_records(tenant_id);
ALTER TABLE quality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quality_records_tenant_isolation ON quality_records;
CREATE POLICY quality_records_tenant_isolation ON quality_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS batch_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE batch_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE batch_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE batch_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_batch_records_tenant_id ON batch_records(tenant_id);
ALTER TABLE batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS batch_records_tenant_isolation ON batch_records;
CREATE POLICY batch_records_tenant_isolation ON batch_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 15. equipment_oee
ALTER TABLE IF EXISTS equipment_oee ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment_oee SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment_oee ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment_oee ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_oee_tenant_id ON equipment_oee(tenant_id);
ALTER TABLE equipment_oee ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_oee FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_oee_tenant_isolation ON equipment_oee;
CREATE POLICY equipment_oee_tenant_isolation ON equipment_oee
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 16-17. wips, wip_transfers
ALTER TABLE IF EXISTS wips ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE wips SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE wips ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wips ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_wips_tenant_id ON wips(tenant_id);
ALTER TABLE wips ENABLE ROW LEVEL SECURITY;
ALTER TABLE wips FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wips_tenant_isolation ON wips;
CREATE POLICY wips_tenant_isolation ON wips
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS wip_transfers ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE wip_transfers SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE wip_transfers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wip_transfers ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_wip_transfers_tenant_id ON wip_transfers(tenant_id);
ALTER TABLE wip_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wip_transfers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wip_transfers_tenant_isolation ON wip_transfers;
CREATE POLICY wip_transfers_tenant_isolation ON wip_transfers
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 18-19. teams, team_members
ALTER TABLE IF EXISTS teams ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE teams SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE teams ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE teams ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teams_tenant_isolation ON teams;
CREATE POLICY teams_tenant_isolation ON teams
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS team_members ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE team_members SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE team_members ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE team_members ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_id ON team_members(tenant_id);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_members_tenant_isolation ON team_members;
CREATE POLICY team_members_tenant_isolation ON team_members
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 20. material_requirements
ALTER TABLE IF EXISTS material_requirements ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_requirements SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_requirements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_requirements ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_requirements_tenant_id ON material_requirements(tenant_id);
ALTER TABLE material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requirements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_requirements_tenant_isolation ON material_requirements;
CREATE POLICY material_requirements_tenant_isolation ON material_requirements
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 21-22. equipment_inspections, equipment_maintenance_records
ALTER TABLE IF EXISTS equipment_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment_inspections SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment_inspections ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment_inspections ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_tenant_id ON equipment_inspections(tenant_id);
ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_inspections_tenant_isolation ON equipment_inspections;
CREATE POLICY equipment_inspections_tenant_isolation ON equipment_inspections
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS equipment_maintenance_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment_maintenance_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment_maintenance_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment_maintenance_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_records_tenant_id ON equipment_maintenance_records(tenant_id);
ALTER TABLE equipment_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_maintenance_records_tenant_isolation ON equipment_maintenance_records;
CREATE POLICY equipment_maintenance_records_tenant_isolation ON equipment_maintenance_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- TOPEMS MES Service - Add tenant_id for multi-tenant support

-- ============================================
-- 1. MES Work Orders
-- ============================================
ALTER TABLE IF EXISTS mes_work_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_work_orders SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mes_work_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_work_orders_tenant_id ON mes_work_orders(tenant_id);

-- ============================================
-- 2. MES Work Order Details
-- ============================================
ALTER TABLE IF EXISTS mes_work_order_details ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_work_order_details mwod SET tenant_id = (SELECT mwo.tenant_id FROM mes_work_orders mwo WHERE mwo.id = mwod.work_order_id);
ALTER TABLE mes_work_order_details ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_work_order_details_tenant_id ON mes_work_order_details(tenant_id);

-- ============================================
-- 3. MES Production Lines
-- ============================================
ALTER TABLE IF EXISTS mes_production_lines ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_production_lines SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mes_production_lines ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_production_lines_tenant_id ON mes_production_lines(tenant_id);

-- ============================================
-- 4. MES Stations
-- ============================================
ALTER TABLE IF EXISTS mes_stations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_stations ms SET tenant_id = (SELECT mpl.tenant_id FROM mes_production_lines mpl WHERE mpl.id = ms.production_line_id);
UPDATE mes_stations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mes_stations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_stations_tenant_id ON mes_stations(tenant_id);

-- ============================================
-- 5. MES Equipment
-- ============================================
ALTER TABLE IF EXISTS mes_equipment ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_equipment SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mes_equipment ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_tenant_id ON mes_equipment(tenant_id);

-- ============================================
-- 6. MES Equipment Status
-- ============================================
ALTER TABLE IF EXISTS mes_equipment_status ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_equipment_status mes SET tenant_id = (SELECT me.tenant_id FROM mes_equipment me WHERE me.id = mes.equipment_id);
ALTER TABLE mes_equipment_status ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_status_tenant_id ON mes_equipment_status(tenant_id);

-- ============================================
-- 7. MES Equipment Maintenance
-- ============================================
ALTER TABLE IF EXISTS mes_equipment_maintenance ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_equipment_maintenance mem SET tenant_id = (SELECT me.tenant_id FROM mes_equipment me WHERE me.id = mem.equipment_id);
ALTER TABLE mes_equipment_maintenance ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_maintenance_tenant_id ON mes_equipment_maintenance(tenant_id);

-- ============================================
-- 8. MES Quality Inspections
-- ============================================
ALTER TABLE IF EXISTS mes_quality_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_quality_inspections mqi SET tenant_id = (SELECT mwo.tenant_id FROM mes_work_orders mwo WHERE mwo.id = mqi.work_order_id);
UPDATE mes_quality_inspections SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mes_quality_inspections ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_quality_inspections_tenant_id ON mes_quality_inspections(tenant_id);

-- ============================================
-- 9. MES Quality Defects
-- ============================================
ALTER TABLE IF EXISTS mes_quality_defects ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_quality_defects mqd SET tenant_id = (SELECT mqi.tenant_id FROM mes_quality_inspections mqi WHERE mqi.id = mqd.inspection_id);
ALTER TABLE mes_quality_defects ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_quality_defects_tenant_id ON mes_quality_defects(tenant_id);

-- ============================================
-- 10. MES Material Movements
-- ============================================
ALTER TABLE IF EXISTS mes_material_movements ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_material_movements SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mes_material_movements ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_material_movements_tenant_id ON mes_material_movements(tenant_id);

-- ============================================
-- 11. MES Inventory Transactions
-- ============================================
ALTER TABLE IF EXISTS mes_inventory_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_inventory_transactions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mes_inventory_transactions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_inventory_transactions_tenant_id ON mes_inventory_transactions(tenant_id);

-- ============================================
-- 12. MES Shift Records
-- ============================================
ALTER TABLE IF EXISTS mes_shift_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_shift_records msr SET tenant_id = (SELECT mpl.tenant_id FROM mes_production_lines mpl WHERE mpl.id = msr.production_line_id);
ALTER TABLE mes_shift_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_shift_records_tenant_id ON mes_shift_records(tenant_id);

-- ============================================
-- 13. MES Production Statistics
-- ============================================
ALTER TABLE IF EXISTS mes_production_statistics ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_production_statistics mps SET tenant_id = (SELECT mpl.tenant_id FROM mes_production_lines mpl WHERE mpl.id = mps.production_line_id);
ALTER TABLE mes_production_statistics ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_production_statistics_tenant_id ON mes_production_statistics(tenant_id);

-- ============================================
-- 14. MES Downtime Records
-- ============================================
ALTER TABLE IF EXISTS mes_downtime_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_downtime_records mdr SET tenant_id = (SELECT mpl.tenant_id FROM mes_production_lines mpl WHERE mpl.id = mdr.production_line_id);
ALTER TABLE mes_downtime_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_downtime_records_tenant_id ON mes_downtime_records(tenant_id);

-- ============================================
-- 15. MES Process Parameters
-- ============================================
ALTER TABLE IF EXISTS mes_process_parameters ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_process_parameters mpp SET tenant_id = (SELECT ms.tenant_id FROM mes_stations ms WHERE ms.id = mpp.station_id);
ALTER TABLE mes_process_parameters ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_process_parameters_tenant_id ON mes_process_parameters(tenant_id);

-- ============================================
-- 16. MES Process Data
-- ============================================
ALTER TABLE IF EXISTS mes_process_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mes_process_data mpd SET tenant_id = (SELECT mpp.tenant_id FROM mes_process_parameters mpp WHERE mpp.id = mpd.parameter_id);
ALTER TABLE mes_process_data ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_process_data_tenant_id ON mes_process_data(tenant_id);

-- ============================================
-- Enable Row Level Security for all tables
-- ============================================
ALTER TABLE mes_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_work_order_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_equipment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_quality_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_shift_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_production_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_downtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_process_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes_process_data ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create tenant isolation policies
-- ============================================
CREATE POLICY "mes_work_orders_tenant_isolation" ON mes_work_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_work_order_details_tenant_isolation" ON mes_work_order_details
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_production_lines_tenant_isolation" ON mes_production_lines
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_stations_tenant_isolation" ON mes_stations
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_equipment_tenant_isolation" ON mes_equipment
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_equipment_status_tenant_isolation" ON mes_equipment_status
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_equipment_maintenance_tenant_isolation" ON mes_equipment_maintenance
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_quality_inspections_tenant_isolation" ON mes_quality_inspections
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_quality_defects_tenant_isolation" ON mes_quality_defects
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_material_movements_tenant_isolation" ON mes_material_movements
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_inventory_transactions_tenant_isolation" ON mes_inventory_transactions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_shift_records_tenant_isolation" ON mes_shift_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_production_statistics_tenant_isolation" ON mes_production_statistics
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_downtime_records_tenant_isolation" ON mes_downtime_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_process_parameters_tenant_isolation" ON mes_process_parameters
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mes_process_data_tenant_isolation" ON mes_process_data
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
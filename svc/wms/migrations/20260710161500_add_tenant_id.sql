-- TOPEMS WMS 数据库迁移脚本
-- 为所有 WMS 表添加 tenant_id 字段以支持多租户

-- ============================================
-- 1. 仓库表 (warehouses)
-- ============================================
ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.warehouses SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.warehouses ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id ON wms.warehouses(tenant_id);

-- ============================================
-- 2. 库位表 (locations)
-- ============================================
ALTER TABLE wms.locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.locations SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.locations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON wms.locations(tenant_id);

-- ============================================
-- 3. 库存表 (inventory)
-- ============================================
ALTER TABLE wms.inventory ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.inventory SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.inventory ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON wms.inventory(tenant_id);

-- ============================================
-- 4. 入库订单表 (inbound_orders)
-- ============================================
ALTER TABLE wms.inbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.inbound_orders SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.inbound_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_orders_tenant_id ON wms.inbound_orders(tenant_id);

-- ============================================
-- 入库订单明细表 (inbound_order_items)
-- ============================================
ALTER TABLE wms.inbound_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.inbound_order_items SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.inbound_order_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_order_items_tenant_id ON wms.inbound_order_items(tenant_id);

-- ============================================
-- 5. 出库订单表 (outbound_orders)
-- ============================================
ALTER TABLE wms.outbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.outbound_orders SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.outbound_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbound_orders_tenant_id ON wms.outbound_orders(tenant_id);

-- ============================================
-- 出库订单明细表 (outbound_order_items)
-- ============================================
ALTER TABLE wms.outbound_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.outbound_order_items SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.outbound_order_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbound_order_items_tenant_id ON wms.outbound_order_items(tenant_id);

-- ============================================
-- 6. 盘点表 (stock_takes)
-- ============================================
ALTER TABLE wms.stock_takes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.stock_takes SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.stock_takes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_takes_tenant_id ON wms.stock_takes(tenant_id);

-- ============================================
-- 盘点明细表 (stock_take_items)
-- ============================================
ALTER TABLE wms.stock_take_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.stock_take_items SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.stock_take_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_take_items_tenant_id ON wms.stock_take_items(tenant_id);

-- ============================================
-- 7. 转移记录表 (transfers)
-- ============================================
ALTER TABLE wms.transfers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.transfers SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.transfers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transfers_tenant_id ON wms.transfers(tenant_id);

-- ============================================
-- 转移明细表 (transfer_items)
-- ============================================
ALTER TABLE wms.transfer_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.transfer_items SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.transfer_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transfer_items_tenant_id ON wms.transfer_items(tenant_id);

-- ============================================
-- 8. 审计日志表 (audit_logs)
-- ============================================
ALTER TABLE wms.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.audit_logs SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON wms.audit_logs(tenant_id);

-- ============================================
-- 9. 批次表 (batches)
-- ============================================
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.batches SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE wms.batches ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batches_tenant_id ON wms.batches(tenant_id);

-- ============================================
-- 10. 序列号表 (serial_numbers)
-- ============================================
ALTER TABLE wms.serial_numbers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.serial_numbers SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE wms.serial_numbers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_tenant_id ON wms.serial_numbers(tenant_id);

-- ============================================
-- 11. 调拨单表 (transfer_orders)
-- ============================================
ALTER TABLE wms.transfer_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.transfer_orders SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE wms.transfer_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transfer_orders_tenant_id ON wms.transfer_orders(tenant_id);

-- ============================================
-- 调拨单明细表 (transfer_order_items)
-- ============================================
ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.transfer_order_items toi 
SET tenant_id = (SELECT tenant_id FROM wms.transfer_orders WHERE id = toi.transfer_id)
WHERE tenant_id IS NULL;
ALTER TABLE wms.transfer_order_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transfer_order_items_tenant_id ON wms.transfer_order_items(tenant_id);

-- ============================================
-- 12. 库存预警表 (inventory_alerts)
-- ============================================
ALTER TABLE wms.inventory_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.inventory_alerts SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.inventory_alerts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_tenant_id ON wms.inventory_alerts(tenant_id);

-- ============================================
-- 13. 库存预警规则表 (inventory_alert_rules)
-- ============================================
ALTER TABLE wms.inventory_alert_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.inventory_alert_rules SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.inventory_alert_rules ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_tenant_id ON wms.inventory_alert_rules(tenant_id);

-- ============================================
-- 14. 库存预警记录表 (inventory_alert_records)
-- ============================================
ALTER TABLE wms.inventory_alert_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.inventory_alert_records SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.inventory_alert_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_tenant_id ON wms.inventory_alert_records(tenant_id);

-- ============================================
-- 15. 循环盘点配置表 (cycle_count_configs)
-- ============================================
ALTER TABLE wms.cycle_count_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.cycle_count_configs SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.cycle_count_configs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_tenant_id ON wms.cycle_count_configs(tenant_id);

-- ============================================
-- 16. 盘点差异处理表 (discrepancy_records)
-- ============================================
ALTER TABLE wms.discrepancy_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.discrepancy_records SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.discrepancy_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discrepancy_records_tenant_id ON wms.discrepancy_records(tenant_id);

-- ============================================
-- 17. 波次拣货表 (wave_picks)
-- ============================================
ALTER TABLE wms.wave_picks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.wave_picks SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.wave_picks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wave_picks_tenant_id ON wms.wave_picks(tenant_id);

-- ============================================
-- 波次拣货明细表 (wave_pick_items)
-- ============================================
ALTER TABLE wms.wave_pick_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE wms.wave_pick_items SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE wms.wave_pick_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wave_pick_items_tenant_id ON wms.wave_pick_items(tenant_id);

-- ============================================
-- 添加字段注释
-- ============================================
COMMENT ON COLUMN wms.warehouses.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.locations.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.inventory.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.inbound_orders.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.inbound_order_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.outbound_orders.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.outbound_order_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.stock_takes.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.stock_take_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.transfers.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.transfer_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.audit_logs.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.batches.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.serial_numbers.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.transfer_orders.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.transfer_order_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.inventory_alerts.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.inventory_alert_rules.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.inventory_alert_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.cycle_count_configs.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.discrepancy_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.wave_picks.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN wms.wave_pick_items.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 启用行级安全策略 (RLS)
-- ============================================
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'wms'
    LOOP
        EXECUTE format('ALTER TABLE wms.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON wms.%I', table_name);
        EXECUTE format('CREATE POLICY tenant_isolation_policy ON wms.%I USING (tenant_id = current_setting(''app.tenant_id'')::uuid)', table_name);
    END LOOP;
END;
$$;

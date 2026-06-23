-- WMS 库存预警功能迁移脚本
-- 创建库存预警表和循环盘点配置表

-- ============================================
-- 1. 库存预警表 (inventory_alerts)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.inventory_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    inventory_id UUID NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    current_quantity NUMERIC(15, 2),
    threshold_value NUMERIC(15, 2),
    deviation_quantity NUMERIC(15, 2),
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_organization_id ON wms.inventory_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_inventory_id ON wms.inventory_alerts(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_alert_type ON wms.inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_severity ON wms.inventory_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_status ON wms.inventory_alerts(status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_created_at ON wms.inventory_alerts(created_at DESC);

COMMENT ON TABLE wms.inventory_alerts IS '库存预警表';
COMMENT ON COLUMN wms.inventory_alerts.alert_type IS '预警类型：below_min, above_max, reorder_needed, expiry_warning, out_of_stock';
COMMENT ON COLUMN wms.inventory_alerts.severity IS '严重程度：critical, warning, info';
COMMENT ON COLUMN wms.inventory_alerts.status IS '状态：pending, acknowledged, resolved';

-- ============================================
-- 2. 循环盘点配置表 (cycle_count_configs)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.cycle_count_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    material_category VARCHAR(50),
    count_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    priority_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    last_count_date TIMESTAMPTZ,
    next_count_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_organization_id ON wms.cycle_count_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_warehouse_id ON wms.cycle_count_configs(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_location_id ON wms.cycle_count_configs(location_id);
CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_count_frequency ON wms.cycle_count_configs(count_frequency);
CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_priority_level ON wms.cycle_count_configs(priority_level);
CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_next_count_date ON wms.cycle_count_configs(next_count_date);
CREATE INDEX IF NOT EXISTS idx_cycle_count_configs_is_active ON wms.cycle_count_configs(is_active);

COMMENT ON TABLE wms.cycle_count_configs IS '循环盘点配置表';
COMMENT ON COLUMN wms.cycle_count_configs.count_frequency IS '盘点频率：daily, weekly, monthly';
COMMENT ON COLUMN wms.cycle_count_configs.priority_level IS '优先级：high, medium, low';

-- ============================================
-- 3. 盘点差异处理表 (discrepancy_records)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.discrepancy_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    stock_take_id UUID NOT NULL REFERENCES wms.stock_takes(id) ON DELETE CASCADE,
    stock_take_item_id UUID NOT NULL REFERENCES wms.stock_take_items(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    system_quantity NUMERIC(15, 2) NOT NULL,
    counted_quantity NUMERIC(15, 2) NOT NULL,
    discrepancy_quantity NUMERIC(15, 2) NOT NULL,
    discrepancy_type VARCHAR(20) NOT NULL,
    adjustment_quantity NUMERIC(15, 2),
    adjustment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_by_id UUID,
    approval_date TIMESTAMPTZ,
    adjustment_date TIMESTAMPTZ,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_records_organization_id ON wms.discrepancy_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_records_stock_take_id ON wms.discrepancy_records(stock_take_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_records_stock_take_item_id ON wms.discrepancy_records(stock_take_item_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_records_inventory_id ON wms.discrepancy_records(inventory_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_records_discrepancy_type ON wms.discrepancy_records(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_discrepancy_records_adjustment_status ON wms.discrepancy_records(adjustment_status);
CREATE INDEX IF NOT EXISTS idx_discrepancy_records_created_at ON wms.discrepancy_records(created_at DESC);

COMMENT ON TABLE wms.discrepancy_records IS '盘点差异处理表';
COMMENT ON COLUMN wms.discrepancy_records.discrepancy_type IS '差异类型：over, under, none';
COMMENT ON COLUMN wms.discrepancy_records.adjustment_status IS '调整状态：pending, approved, rejected, completed';

-- 为新表创建更新时间触发器
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'wms' AND tablename IN ('inventory_alerts', 'cycle_count_configs', 'discrepancy_records')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON wms.%I', table_name, table_name);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON wms.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', table_name, table_name);
    END LOOP;
END;
$$;

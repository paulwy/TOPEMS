-- WMS 波次拣货和库存预警规则/记录功能迁移脚本

-- ============================================
-- 1. 库存预警规则表 (inventory_alert_rules)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.inventory_alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    warehouse_id UUID REFERENCES wms.warehouses(id) ON DELETE SET NULL,
    material_code VARCHAR(100),
    threshold_value NUMERIC(15, 2) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_organization_id ON wms.inventory_alert_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_alert_type ON wms.inventory_alert_rules(alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_warehouse_id ON wms.inventory_alert_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_enabled ON wms.inventory_alert_rules(enabled);

COMMENT ON TABLE wms.inventory_alert_rules IS '库存预警规则表';
COMMENT ON COLUMN wms.inventory_alert_rules.alert_type IS '预警类型：below_min, above_max, reorder_needed, expiry_warning, out_of_stock';
COMMENT ON COLUMN wms.inventory_alert_rules.severity IS '严重程度：critical, warning, info';

-- ============================================
-- 2. 库存预警记录表 (inventory_alert_records)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.inventory_alert_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    inventory_id UUID REFERENCES wms.inventory(id) ON DELETE SET NULL,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    warehouse_id UUID REFERENCES wms.warehouses(id) ON DELETE SET NULL,
    warehouse_name VARCHAR(255),
    location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    location_code VARCHAR(100),
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

CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_organization_id ON wms.inventory_alert_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_inventory_id ON wms.inventory_alert_records(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_alert_type ON wms.inventory_alert_records(alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_severity ON wms.inventory_alert_records(severity);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_status ON wms.inventory_alert_records(status);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_warehouse_id ON wms.inventory_alert_records(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_records_created_at ON wms.inventory_alert_records(created_at DESC);

COMMENT ON TABLE wms.inventory_alert_records IS '库存预警记录表';
COMMENT ON COLUMN wms.inventory_alert_records.alert_type IS '预警类型：below_min, above_max, reorder_needed, expiry_warning, out_of_stock';
COMMENT ON COLUMN wms.inventory_alert_records.severity IS '严重程度：critical, warning, info';
COMMENT ON COLUMN wms.inventory_alert_records.status IS '状态：pending, confirmed, resolved';

-- ============================================
-- 3. 波次拣货表 (wave_picks)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.wave_picks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    wave_pick_number VARCHAR(100) NOT NULL UNIQUE,
    wave_pick_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID,
    assigned_user_name VARCHAR(255),
    batch_id UUID REFERENCES wms.batches(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    total_items BIGINT NOT NULL DEFAULT 0,
    picked_items BIGINT NOT NULL DEFAULT 0,
    total_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    picked_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wave_picks_organization_id ON wms.wave_picks(organization_id);
CREATE INDEX IF NOT EXISTS idx_wave_picks_wave_pick_number ON wms.wave_picks(wave_pick_number);
CREATE INDEX IF NOT EXISTS idx_wave_picks_warehouse_id ON wms.wave_picks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wave_picks_status ON wms.wave_picks(status);
CREATE INDEX IF NOT EXISTS idx_wave_picks_assigned_to ON wms.wave_picks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wave_picks_batch_id ON wms.wave_picks(batch_id);
CREATE INDEX IF NOT EXISTS idx_wave_picks_created_at ON wms.wave_picks(created_at DESC);

COMMENT ON TABLE wms.wave_picks IS '波次拣货表';
COMMENT ON COLUMN wms.wave_picks.wave_pick_type IS '波次类型：standard, priority, zone, wave';
COMMENT ON COLUMN wms.wave_picks.status IS '状态：pending, assigned, picking, completed, cancelled';

-- ============================================
-- 4. 波次拣货明细表 (wave_pick_items)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.wave_pick_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    wave_pick_id UUID NOT NULL REFERENCES wms.wave_picks(id) ON DELETE CASCADE,
    outbound_order_id UUID REFERENCES wms.outbound_orders(id) ON DELETE SET NULL,
    outbound_order_number VARCHAR(100),
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    location_code VARCHAR(100),
    planned_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    picked_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wave_pick_items_organization_id ON wms.wave_pick_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_wave_pick_items_wave_pick_id ON wms.wave_pick_items(wave_pick_id);
CREATE INDEX IF NOT EXISTS idx_wave_pick_items_outbound_order_id ON wms.wave_pick_items(outbound_order_id);
CREATE INDEX IF NOT EXISTS idx_wave_pick_items_material_code ON wms.wave_pick_items(material_code);
CREATE INDEX IF NOT EXISTS idx_wave_pick_items_location_id ON wms.wave_pick_items(location_id);
CREATE INDEX IF NOT EXISTS idx_wave_pick_items_status ON wms.wave_pick_items(status);
CREATE INDEX IF NOT EXISTS idx_wave_pick_items_created_at ON wms.wave_pick_items(created_at DESC);

COMMENT ON TABLE wms.wave_pick_items IS '波次拣货明细表';
COMMENT ON COLUMN wms.wave_pick_items.status IS '状态：pending, picked, skipped';

-- 为新表创建更新时间触发器
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'wms' AND tablename IN ('inventory_alert_rules', 'inventory_alert_records', 'wave_picks', 'wave_pick_items')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON wms.%I', table_name, table_name);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON wms.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', table_name, table_name);
    END LOOP;
END;
$$;

-- WMS 库存移动记录表 - V19.6 新增
-- 支持库存入库/出库/调拨/退货/调整等移动类型的追踪

CREATE TABLE IF NOT EXISTS wms.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_no VARCHAR(50) NOT NULL,
    tenant_id UUID NOT NULL,
    movement_type VARCHAR(20) NOT NULL,      -- inbound/outbound/transfer/return/adjustment
    reference_id VARCHAR(100),                -- 关联业务单号（如退换单号）
    reference_type VARCHAR(50),               -- 关联业务类型（return_order/sales_order/purchase_order/transfer_order）
    material_id UUID,
    material_code VARCHAR(100),
    material_name VARCHAR(200),
    quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    from_location_id UUID,
    to_location_id UUID,
    from_warehouse_id UUID,
    to_warehouse_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',  -- pending/completed/cancelled
    performed_by UUID,
    performed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(movement_no, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant ON wms.inventory_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON wms.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_status ON wms.inventory_movements(status);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON wms.inventory_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_material ON wms.inventory_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_from ON wms.inventory_movements(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_to ON wms.inventory_movements(to_warehouse_id);

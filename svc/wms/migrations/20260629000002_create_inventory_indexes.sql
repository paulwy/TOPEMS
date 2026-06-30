CREATE INDEX IF NOT EXISTS idx_inventory_material_code ON wms.inventory(material_code);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON wms.inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_quality_status ON wms.inventory(quality_status);
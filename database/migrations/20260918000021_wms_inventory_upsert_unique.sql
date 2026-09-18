-- 为 wms.inventory 的收货 UPSERT（inbound_order.rs）补唯一约束。
-- 该 UPSERT 使用 ON CONFLICT (organization_id, material_code, batch_number)，
-- 但原表仅有主键 (id) 唯一索引，运行时会报 no unique or exclusion constraint matching。
-- 幂等：CREATE UNIQUE INDEX IF NOT EXISTS。batch_number 可空，唯一索引对 NULL 不去重，属预期行为。
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_material_batch
    ON wms.inventory (organization_id, material_code, batch_number);

-- 为 wms.inventory 的收货 UPSERT（inbound_order.rs）补唯一约束。
-- 该 UPSERT 使用 ON CONFLICT (organization_id, material_code, batch_number)，
-- 但原表仅有主键 (id) 唯一索引，运行时会报 no unique or exclusion constraint matching。
-- 5433 重建库 inventory 表缺 organization_id（5432 权威结构已有）→ 先幂等补列。
-- 幂等：ADD COLUMN IF NOT EXISTS + CREATE UNIQUE INDEX IF NOT EXISTS。
-- batch_number 可空，唯一索引对 NULL 不去重，属预期行为。
ALTER TABLE wms.inventory ADD COLUMN IF NOT EXISTS organization_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_material_batch
    ON wms.inventory (organization_id, material_code, batch_number);

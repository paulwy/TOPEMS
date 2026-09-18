-- TOPEMS database migration 20260918000028
-- 补齐 wms.inbound_orders / srm.quotations 缺列（代码需求并集，幂等）
-- 5432 缺：inbound_orders.approved_by/approved_at（审批流）、quotations.deleted_at（软删）
-- 5433 缺：inbound_orders.organization_id（对齐 5432 权威结构）

ALTER TABLE wms.inbound_orders ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE wms.inbound_orders ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE wms.inbound_orders ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE srm.quotations ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

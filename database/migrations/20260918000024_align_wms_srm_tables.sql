-- TOPEMS database migration 20260918000024
-- 对齐 wms.stock_takes / srm.inquiries 缺列（代码需求并集，幂等）

-- wms.stock_takes: 代码 SELECT/INSERT 使用 remarks、tenant_id
ALTER TABLE wms.stock_takes ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE wms.stock_takes ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- srm.inquiries: 代码软删除逻辑使用 deleted_at
ALTER TABLE srm.inquiries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- B126 WMS 盘点明细质量状态 CHECK 候选（NOT VALID）
-- 目标：wms.stock_take_items.quality_status
-- 规范集合：qualified / unqualified / pending（与 Rust StockTakeItemQualityStatus 一致）
--
-- 同时收口 B122 遗留：库内 ck_stock_take_items_status_standard 仍是
-- active / inactive / archived 的错误定义，且已 VALIDATE；本候选一并替换为
-- pending / completed，避免盘点明细写入被旧约束拦下。本候选 supersedes
-- docs/database/wms-stock-take-item-status-check-candidates-2026-11-22.sql。
--
-- 现状：本地与生产快照 wms.stock_take_items 均 0 行；status / quality_status
-- 均 nullable、无默认；status 存在上述错误 CHECK，quality_status 无 CHECK。
--
-- 执行顺序：先替换错误 status 约束，再补默认、回填、NOT NULL 与 NOT VALID CHECK。
-- CHECK 一律 NOT VALID，存量非法值不会被扫描；新写入立即受约束。

-- 1) 替换 B122 遗留的错误状态约束
ALTER TABLE wms.stock_take_items
  DROP CONSTRAINT IF EXISTS ck_stock_take_items_status_standard;

ALTER TABLE wms.stock_take_items
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE wms.stock_take_items
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE wms.stock_take_items
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE wms.stock_take_items
  ADD CONSTRAINT ck_stock_take_items_status_standard
  CHECK (status IN ('pending', 'completed'))
  NOT VALID;

-- 2) 收口质量状态
ALTER TABLE wms.stock_take_items
  ALTER COLUMN quality_status SET DEFAULT 'pending';

UPDATE wms.stock_take_items
SET quality_status = 'pending'
WHERE quality_status IS NULL;

ALTER TABLE wms.stock_take_items
  ALTER COLUMN quality_status SET NOT NULL;

ALTER TABLE wms.stock_take_items
  DROP CONSTRAINT IF EXISTS ck_stock_take_items_quality_status_standard;

ALTER TABLE wms.stock_take_items
  ADD CONSTRAINT ck_stock_take_items_quality_status_standard
  CHECK (quality_status IN ('qualified', 'unqualified', 'pending'))
  NOT VALID;

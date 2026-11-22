-- WMS 盘点明细状态候选约束（B122）
-- 目标列：wms.stock_take_items.status
-- 规范集合：pending / completed，默认 pending
--
-- 现状：库内已有同名约束 ck_stock_take_items_status_standard，
--       但定义是 active / inactive / archived（从通用状态约束误复制），
--       且已 VALIDATE。现有代码写 pending / completed 会被该约束拦下；
--       本地与生产快照表均为 0 行，可直接替换。
--
-- 预检：
--   SELECT status, count(*)
--   FROM wms.stock_take_items
--   GROUP BY status;
--
-- 执行顺序：先移除错误约束，再改默认值，最后加正确约束（NOT VALID）。
ALTER TABLE wms.stock_take_items
  DROP CONSTRAINT IF EXISTS ck_stock_take_items_status_standard;

ALTER TABLE wms.stock_take_items
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE wms.stock_take_items
  ADD CONSTRAINT ck_stock_take_items_status_standard
  CHECK (status IN ('pending', 'completed'))
  NOT VALID;

-- 核销存量后执行：
-- ALTER TABLE wms.stock_take_items
--   VALIDATE CONSTRAINT ck_stock_take_items_status_standard;

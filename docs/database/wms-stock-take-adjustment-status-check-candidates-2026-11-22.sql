-- B124 盘点调整状态约束候选
-- 目标：wms.stock_takes.adjustment_status / wms.stock_take_items.adjustment_status
-- 现状（2026-11-22 实测）：本地与生产快照盘点单/明细均 0 行；两列 nullable、无默认、无 CHECK。
-- 统一为 pending / completed，默认 pending；库存调整成功提交时主表与全量明细同事务置 completed。
-- 约束一律 NOT VALID，待本地演练与业务确认后在目标库执行。

BEGIN;

ALTER TABLE wms.stock_takes
    DROP CONSTRAINT IF EXISTS ck_stock_takes_adjustment_status_standard;
ALTER TABLE wms.stock_take_items
    DROP CONSTRAINT IF EXISTS ck_stock_take_items_adjustment_status_standard;

ALTER TABLE wms.stock_takes
    ALTER COLUMN adjustment_status SET DEFAULT 'pending';
ALTER TABLE wms.stock_take_items
    ALTER COLUMN adjustment_status SET DEFAULT 'pending';

UPDATE wms.stock_takes
SET adjustment_status = 'pending'
WHERE adjustment_status IS NULL;
UPDATE wms.stock_take_items
SET adjustment_status = 'pending'
WHERE adjustment_status IS NULL;

ALTER TABLE wms.stock_takes
    ALTER COLUMN adjustment_status SET NOT NULL;
ALTER TABLE wms.stock_take_items
    ALTER COLUMN adjustment_status SET NOT NULL;

ALTER TABLE wms.stock_takes
    ADD CONSTRAINT ck_stock_takes_adjustment_status_standard
        CHECK (adjustment_status IN ('pending', 'completed')) NOT VALID;
ALTER TABLE wms.stock_take_items
    ADD CONSTRAINT ck_stock_take_items_adjustment_status_standard
        CHECK (adjustment_status IN ('pending', 'completed')) NOT VALID;

COMMIT;

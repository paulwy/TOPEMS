-- B125 WMS 盘点审批状态 CHECK 候选（NOT VALID）
-- 目标：wms.stock_takes.approval_status
-- 规范集合：pending / approved / rejected（与 Rust StockTakeApprovalStatus 一致）
-- 现状：本地与生产快照均 0 行；列 nullable、无默认、无 CHECK。
-- 执行顺序：默认值 → 回填空值 → NOT NULL → NOT VALID CHECK。
-- 注意：CHECK 一律 NOT VALID，存量非法值不会被扫描；新写入立即受约束。
-- 上线前请先执行本候选，再部署 B125 代码，否则新建盘点单写 pending 会因旧数据/空值语义不一致而出现偏差。

ALTER TABLE wms.stock_takes
    ALTER COLUMN approval_status SET DEFAULT 'pending';

UPDATE wms.stock_takes
SET approval_status = 'pending'
WHERE approval_status IS NULL;

ALTER TABLE wms.stock_takes
    ALTER COLUMN approval_status SET NOT NULL;

ALTER TABLE wms.stock_takes
    DROP CONSTRAINT IF EXISTS ck_stock_takes_approval_status_standard;

ALTER TABLE wms.stock_takes
    ADD CONSTRAINT ck_stock_takes_approval_status_standard
    CHECK (approval_status IN ('pending', 'approved', 'rejected'))
    NOT VALID;

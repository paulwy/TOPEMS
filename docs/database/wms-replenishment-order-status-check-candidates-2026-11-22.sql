-- WMS 补货订单状态 CHECK 候选（B117）
-- 目标：wms.replenishment_orders.status 只允许 pending / confirmed / completed；
--      B37 之前创建订单误写的历史 active 先归并为 pending。
--
-- 前置：本地 273 行、全部为 active；生产快照 0 行。当前无状态 CHECK。
-- 上线前只读预检：
-- SELECT count(*) FROM wms.replenishment_orders WHERE status NOT IN ('pending', 'confirmed', 'completed', 'active');
-- SELECT count(*) FROM wms.replenishment_orders WHERE status = 'active';

ALTER TABLE wms.replenishment_orders
    ALTER COLUMN status SET DEFAULT 'pending';

-- 历史兼容归并：active 与 pending 都是“待确认”，归并后才能收紧 CHECK。
UPDATE wms.replenishment_orders
SET status = 'pending'
WHERE status = 'active';

ALTER TABLE wms.replenishment_orders
    ADD CONSTRAINT ck_replenishment_orders_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['pending', 'confirmed', 'completed']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_replenishment_orders_status_standard ON wms.replenishment_orders
    IS 'B117 补货订单状态：pending/confirmed/completed';

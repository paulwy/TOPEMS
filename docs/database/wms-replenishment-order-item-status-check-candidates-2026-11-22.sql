-- WMS 补货明细状态收敛候选（2026-11-22）
-- 唯一状态集合：pending / confirmed / completed
-- 明细状态随补货订单动作推进：创建 pending，订单确认 confirmed，订单完成 completed。

BEGIN;

ALTER TABLE wms.replenishment_order_items
    DROP CONSTRAINT IF EXISTS ck_replenishment_order_items_status_standard;

ALTER TABLE wms.replenishment_order_items
    ADD CONSTRAINT ck_replenishment_order_items_status_standard
    CHECK (status IN ('pending', 'confirmed', 'completed'))
    NOT VALID;

COMMIT;

-- 列默认值已是 pending，与 ReplenishmentOrderItemStatus::DEFAULT 一致。

-- 窗口内：
-- ALTER TABLE wms.replenishment_order_items VALIDATE CONSTRAINT ck_replenishment_order_items_status_standard;
-- 回滚：
-- ALTER TABLE wms.replenishment_order_items DROP CONSTRAINT IF EXISTS ck_replenishment_order_items_status_standard;

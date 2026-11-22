-- WMS 调拨单 / 调拨明细状态 CHECK 候选（B112）
--
-- 目标：
--   wms.transfer_orders.status       pending/confirmed/shipped/received/completed/cancelled
--   wms.transfer_order_items.status  pending/shipped/partial/completed/cancelled
--
-- 上线前只读预检：期望返回 0。
-- SELECT count(*) FROM wms.transfer_orders
-- WHERE status NOT IN ('pending','confirmed','shipped','received','completed','cancelled');
-- SELECT count(*) FROM wms.transfer_order_items
-- WHERE status NOT IN ('pending','shipped','partial','completed','cancelled');

ALTER TABLE wms.transfer_orders
    ADD CONSTRAINT ck_transfer_orders_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['pending', 'confirmed', 'shipped', 'received', 'completed', 'cancelled']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_transfer_orders_status_standard ON wms.transfer_orders
    IS 'B112 调拨单状态：pending/confirmed/shipped/received/completed/cancelled';

ALTER TABLE wms.transfer_order_items
    ADD CONSTRAINT ck_transfer_order_items_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['pending', 'shipped', 'partial', 'completed', 'cancelled']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_transfer_order_items_status_standard ON wms.transfer_order_items
    IS 'B112 调拨明细状态：pending/shipped/partial/completed/cancelled';

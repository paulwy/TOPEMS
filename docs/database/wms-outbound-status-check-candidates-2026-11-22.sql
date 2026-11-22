-- WMS 出库单状态 CHECK 候选（B109）
-- 目标：wms.outbound_orders.status 只允许
-- created / confirmed / picking / packing / shipping / completed / cancelled。
--
-- 上线前只读预检：期望返回值 0。
-- SELECT id, status FROM wms.outbound_orders
-- WHERE deleted_at IS NULL
--   AND status NOT IN ('created', 'confirmed', 'picking', 'packing', 'shipping', 'completed', 'cancelled');
--
-- 约束以 NOT VALID 加列，避免一次性锁表校验存量；存量核销后再 VALIDATE。

ALTER TABLE wms.outbound_orders
    ADD CONSTRAINT ck_outbound_orders_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['created', 'confirmed', 'picking', 'packing', 'shipping', 'completed', 'cancelled']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_outbound_orders_status_standard ON wms.outbound_orders
    IS 'B109 出库单状态：created/confirmed/picking/packing/shipping/completed/cancelled';

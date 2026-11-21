-- WMS 入库单状态 CHECK 候选（B106）
-- 目标：wms.inbound_orders.status 只允许 created / confirmed / received / completed / cancelled。
--
-- 上线前只读预检：期望返回值 0。
-- SELECT id, status FROM wms.inbound_orders
-- WHERE deleted_at IS NULL
--   AND status NOT IN ('created', 'confirmed', 'received', 'completed', 'cancelled');
--
-- 历史数据修正（仅确认无业务语义后执行）：
-- UPDATE wms.inbound_orders
-- SET status = 'created', updated_at = NOW()
-- WHERE status = 'pending';
--
-- 约束先以 NOT VALID 加列，避免一次性锁表校验存量；存量核销后再 VALIDATE。

ALTER TABLE wms.inbound_orders
    ADD CONSTRAINT ck_inbound_orders_status_standard
    CHECK (
        status IS NULL
        OR status::text = ANY (
            ARRAY['created', 'confirmed', 'received', 'completed', 'cancelled']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_inbound_orders_status_standard ON wms.inbound_orders
    IS 'B106 入库单规范状态：created/confirmed/received/completed/cancelled';

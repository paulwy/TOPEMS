-- WMS 入库明细质量状态 CHECK 候选（B107）
-- 目标：wms.inbound_order_items.quality_status 只允许 pending / qualified / rejected。
--
-- 上线前只读预检：期望返回值 0。
-- SELECT id, quality_status FROM wms.inbound_order_items
-- WHERE quality_status IS NOT NULL
--   AND quality_status NOT IN ('pending', 'qualified', 'rejected');
--
-- 约束以 NOT VALID 加列，避免一次性锁表校验存量；存量核销后再 VALIDATE。

ALTER TABLE wms.inbound_order_items
    ADD CONSTRAINT ck_inbound_order_items_quality_status_standard
    CHECK (
        quality_status IS NULL
        OR quality_status::text = ANY (
            ARRAY['pending', 'qualified', 'rejected']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_inbound_order_items_quality_status_standard ON wms.inbound_order_items
    IS 'B107 入库明细质量结论：pending/qualified/rejected';

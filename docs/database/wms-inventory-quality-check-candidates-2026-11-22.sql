-- WMS 库存质量状态 CHECK 候选（B108）
-- 目标：wms.inventory.quality_status 只允许 qualified / unqualified / pending。
--
-- 上线前只读预检：期望返回值 0。
-- SELECT id, quality_status FROM wms.inventory
-- WHERE deleted_at IS NULL
--   AND quality_status NOT IN ('qualified', 'unqualified', 'pending');
--
-- 约束以 NOT VALID 加列，避免一次性锁表校验存量；存量核销后再 VALIDATE。

ALTER TABLE wms.inventory
    ADD CONSTRAINT ck_inventory_quality_status_standard
    CHECK (
        quality_status::text = ANY (
            ARRAY['qualified', 'unqualified', 'pending']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_inventory_quality_status_standard ON wms.inventory
    IS 'B108 库存质量状态：qualified/unqualified/pending';

-- WMS 库位状态 CHECK 候选（B110）
-- 目标：wms.locations.status 只允许 available / partial / full / inactive。
--
-- 上线前只读预检：期望返回值 0。
-- SELECT id, status FROM wms.locations
-- WHERE deleted_at IS NULL
--   AND status NOT IN ('available', 'partial', 'full', 'inactive');
--
-- 旧值 empty / partially_filled 需先迁到 available / partial，否则加约束会失败。
--
-- 约束以 NOT VALID 加列，避免一次性锁表校验存量；存量核销后再 VALIDATE。

ALTER TABLE wms.locations
    ADD CONSTRAINT ck_wms_locations_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['available', 'partial', 'full', 'inactive']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_wms_locations_status_standard ON wms.locations
    IS 'B110 库位状态：available/partial/full/inactive';

-- WMS 仓库状态 CHECK 候选（B111）
-- 目标：wms.warehouses.status 只允许 active / inactive / maintenance。
--
-- 重要前置：本地与既有迁移已存在约束 ck_warehouses_status_standard，
-- 允许 active / inactive / archived，但不允许 maintenance。仅新增约束会继续被旧约束拒绝，
-- 所以这里必须先替换旧约束。
--
-- 上线前只读预检：期望两行都返回 0。
-- SELECT count(*) FROM wms.warehouses WHERE status = 'archived';
-- SELECT count(*) FROM wms.warehouses
-- WHERE status IS NOT NULL AND status NOT IN ('active', 'inactive', 'maintenance');

ALTER TABLE wms.warehouses
    DROP CONSTRAINT IF EXISTS ck_warehouses_status_standard;

ALTER TABLE wms.warehouses
    ADD CONSTRAINT ck_warehouses_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['active', 'inactive', 'maintenance']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_warehouses_status_standard ON wms.warehouses
    IS 'B111 仓库状态：active/inactive/maintenance';

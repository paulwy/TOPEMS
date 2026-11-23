-- B249：wms.warehouses.status 收敛到 active/inactive/maintenance/archived
-- 既有约束 ck_warehouses_status_standard 允许 active/inactive/archived，
-- 后端枚举与前端选项却使用 maintenance；本批以四态替换旧约束。

ALTER TABLE wms.warehouses
    DROP CONSTRAINT IF EXISTS ck_warehouses_status_standard;

ALTER TABLE wms.warehouses
    ADD CONSTRAINT ck_warehouses_status_lifecycle_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text, 'archived'::text]))
    ) NOT VALID;

-- B247：ehs.qa_ehs_environment_monitors.status 收敛到 active/inactive/maintenance/archived
-- 既有约束 ck_qa_ehs_environment_monitors_status_standard 允许 active/inactive/archived，
-- 前端契约却使用 maintenance；本批以四态替换旧约束。

ALTER TABLE ehs.qa_ehs_environment_monitors
    DROP CONSTRAINT IF EXISTS ck_qa_ehs_environment_monitors_status_standard;

ALTER TABLE ehs.qa_ehs_environment_monitors
    ADD CONSTRAINT ck_qa_ehs_environment_monitors_status_lifecycle_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text, 'archived'::text]))
    ) NOT VALID;

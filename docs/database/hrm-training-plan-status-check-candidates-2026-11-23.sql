-- B245：hrm.training_plans.status 收敛到 active/inactive/completed/archived
-- 既有约束 ck_training_plans_status_standard 只允许 active/inactive/archived，
-- 与模型中的 completed 值集不一致；本批替换为生命周期约束，覆盖两种终态。
-- 创建原硬编码 'active'；更新原样写 status；activate/deactivate 可从 completed/archived 复活。

ALTER TABLE hrm.training_plans
    DROP CONSTRAINT IF EXISTS ck_training_plans_status_standard;

ALTER TABLE hrm.training_plans
    ADD CONSTRAINT ck_training_plans_status_lifecycle_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'completed'::text, 'archived'::text]))
    ) NOT VALID;

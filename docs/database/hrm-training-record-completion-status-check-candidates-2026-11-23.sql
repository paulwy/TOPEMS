-- B243：hrm.training_records.completion_status 收敛到 in_progress/completed/failed
-- 报名与创建原硬编码 'in_progress'；更新接口原样写值；列表声明的 status 过滤被忽略。
-- 本批统一枚举、过滤与 CHECK，complete 仅允许从 in_progress 进入 completed。

ALTER TABLE hrm.training_records
    ADD CONSTRAINT ck_training_records_completion_status_standard
    CHECK (
        (completion_status IS NULL)
        OR ((completion_status)::text = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text]))
    ) NOT VALID;

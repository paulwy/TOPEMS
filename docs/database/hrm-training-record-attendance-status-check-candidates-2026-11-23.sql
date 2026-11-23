-- B244：hrm.training_records.attendance_status 收敛到 registered/attended
-- 创建与报名原硬编码 'registered'；更新接口原样写值；完成接口不落出勤，记录可“已完成但未出勤”。
-- 本批统一枚举、流转校验与 CHECK，完成时同步写 attended。

ALTER TABLE hrm.training_records
    ADD CONSTRAINT ck_training_records_attendance_status_standard
    CHECK (
        (attendance_status IS NULL)
        OR ((attendance_status)::text = ANY (ARRAY['registered'::text, 'attended'::text]))
    ) NOT VALID;

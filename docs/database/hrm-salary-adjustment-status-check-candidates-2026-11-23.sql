-- B207：HRM 薪资调整双状态列值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/hrm/src/modules/salary_adjustment_status.rs（SalaryAdjustmentStatus）
-- 值集：pending / approved / rejected，默认 pending（与 DB 默认一致，无需改默认/回填）
--   status          审批流当前态，代码唯一写入列
--   approval_status 同表历史冗余列，当前无任何代码读写，用同一词表兜底外部写入
-- 对齐前端 apps/web/src/schemas/hrm/salaryAdjustment.ts 的下拉/筛选/色板。
-- 本地表 0 行。NOT VALID 只约束新写入；禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE hrm.salary_adjustments
    ADD CONSTRAINT ck_hrm_salary_adjustments_status_standard
    CHECK (status IN ('pending', 'approved', 'rejected')) NOT VALID;

ALTER TABLE hrm.salary_adjustments
    ADD CONSTRAINT ck_hrm_salary_adjustments_approval_status_standard
    CHECK (approval_status IN ('pending', 'approved', 'rejected')) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_salary_adjustments_status_standard ON hrm.salary_adjustments
    IS '状态值域由 svc/hrm/src/modules/salary_adjustment_status.rs 定义（B207）';
COMMENT ON CONSTRAINT ck_hrm_salary_adjustments_approval_status_standard ON hrm.salary_adjustments
    IS '历史冗余列，无代码读写，按同表审批语义兜底（B207）';

COMMIT;

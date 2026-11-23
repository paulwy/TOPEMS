-- B209：HRM 薪资周期 / 薪资明细状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/hrm/src/modules/payroll_status.rs
--   PayrollRunStatus  = draft / calculated / paid   （默认 draft）
--   PayrollItemStatus = pending / paid              （默认 pending）
-- 值集依据：创建 run 写 draft；计算写 calculated；发放写 paid；
--   明细在计算时写 pending、发放时写 paid。无其它写入方，不预置 cancelled/approved。
-- 两表本地均 0 行，NOT VALID 应用无风险。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE hrm.payroll_runs
    ADD CONSTRAINT ck_hrm_payroll_runs_status_standard
    CHECK (status IN ('draft', 'calculated', 'paid')) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_payroll_runs_status_standard ON hrm.payroll_runs
    IS '状态值域由 svc/hrm/src/modules/payroll_status.rs 定义（B209）';

ALTER TABLE hrm.payroll_items
    ADD CONSTRAINT ck_hrm_payroll_items_status_standard
    CHECK (status IN ('pending', 'paid')) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_payroll_items_status_standard ON hrm.payroll_items
    IS '状态值域由 svc/hrm/src/modules/payroll_status.rs 定义（B209）';

COMMIT;

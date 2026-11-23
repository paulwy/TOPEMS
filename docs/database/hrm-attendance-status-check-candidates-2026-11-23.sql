-- B208：HRM 考勤记录状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/hrm/src/modules/attendance_status.rs（AttendanceStatus）
-- 值集：normal / active / late / early_leave，默认 normal（与 DB 默认一致）
--   normal      DB 默认
--   active      clock-in 兜底值，本地存量 5 行全部为该值
--   late        统计口径（late_days）
--   early_leave 统计口径（early_leave_days）
-- absent / leave / overtime 当前无任何写入方，不预置；出现写入方时按证据扩展。
-- 本地 5 行均为 active，NOT VALID 不校验存量，可安全应用。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE hrm.attendance_records
    ADD CONSTRAINT ck_hrm_attendance_records_status_standard
    CHECK (status IN ('normal', 'active', 'late', 'early_leave')) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_attendance_records_status_standard ON hrm.attendance_records
    IS '状态值域由 svc/hrm/src/modules/attendance_status.rs 定义（B208）';

COMMIT;

-- 员工月薪读写打通：models/services 已引用 hrm.employees.monthly_salary，
-- 但此前没有对应列，运行期会 42703。补列并保持幂等。
ALTER TABLE hrm.employees
    ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(14, 2);

COMMENT ON COLUMN hrm.employees.monthly_salary IS '员工月薪（税前，元）';

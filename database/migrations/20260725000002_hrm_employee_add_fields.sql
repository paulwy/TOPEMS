-- TOPEMS HRM 员工表字段补齐迁移脚本
-- 为 hrm.employees 表添加前端期望的缺失字段，使后端响应与前端类型定义一致
--
-- 注意：以下字段在原建表脚本 (20260608100000_create_hrm_schema.sql) 中已存在，无需重复添加：
--   birth_date, position, education, emergency_contact_name, emergency_contact_phone
--
-- 本次新增字段（10 个）：
--   regular_date, probation_period, joblevel, work_location, report_to_name,
--   emergency_relation, hukou_location, remark, employee_type, user_id

-- ============================================
-- 1. 转正日期
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS regular_date DATE;
COMMENT ON COLUMN hrm.employees.regular_date IS '转正日期';

-- ============================================
-- 2. 试用期（月）
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS probation_period INTEGER;
COMMENT ON COLUMN hrm.employees.probation_period IS '试用期长度（月）';

-- ============================================
-- 3. 职级
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS joblevel VARCHAR(50);
COMMENT ON COLUMN hrm.employees.joblevel IS '职级';

-- ============================================
-- 4. 工作地点
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS work_location VARCHAR(255);
COMMENT ON COLUMN hrm.employees.work_location IS '工作地点';

-- ============================================
-- 5. 汇报对象姓名
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS report_to_name VARCHAR(255);
COMMENT ON COLUMN hrm.employees.report_to_name IS '汇报对象姓名';

-- ============================================
-- 6. 紧急联系人关系
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS emergency_relation VARCHAR(50);
COMMENT ON COLUMN hrm.employees.emergency_relation IS '紧急联系人关系';

-- ============================================
-- 7. 户口所在地
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS hukou_location VARCHAR(255);
COMMENT ON COLUMN hrm.employees.hukou_location IS '户口所在地';

-- ============================================
-- 8. 备注
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS remark TEXT;
COMMENT ON COLUMN hrm.employees.remark IS '备注';

-- ============================================
-- 9. 员工类型（full-time/part-time/intern/contractor 等）
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50);
COMMENT ON COLUMN hrm.employees.employee_type IS '员工类型';

-- ============================================
-- 10. 关联用户 ID（IAM 用户）
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS user_id UUID;
COMMENT ON COLUMN hrm.employees.user_id IS '关联的 IAM 用户 ID';

-- 为 user_id 创建索引以便按用户反查员工
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON hrm.employees(user_id);

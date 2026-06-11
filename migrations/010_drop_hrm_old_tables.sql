-- 删除 HRM schema 中的旧表
-- 注意：需要先删除外键约束，然后才能删除表

-- 1. 删除 hrm.employees 的外键约束
ALTER TABLE hrm.employees
    DROP CONSTRAINT IF EXISTS employees_company_id_fkey,
    DROP CONSTRAINT IF EXISTS employees_department_id_fkey,
    DROP CONSTRAINT IF EXISTS employees_position_id_fkey;

-- 2. 删除 hrm.departments 的外键约束
ALTER TABLE hrm.departments
    DROP CONSTRAINT IF EXISTS departments_company_id_fkey,
    DROP CONSTRAINT IF EXISTS departments_parent_id_fkey;

-- 3. 删除 hrm.positions 的外键约束（指向 departments）
ALTER TABLE hrm.positions
    DROP CONSTRAINT IF EXISTS positions_department_id_fkey;

-- 4. 删除旧表（按依赖顺序）
DROP TABLE IF EXISTS hrm.employees CASCADE;
DROP TABLE IF EXISTS hrm.departments CASCADE;
DROP TABLE IF EXISTS hrm.companies CASCADE;

-- 5. 验证删除结果
SELECT 'Old tables deleted successfully!' as result;

-- 显示 shared schema 中的表
SELECT 'shared schema tables:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'shared' ORDER BY table_name;

-- 显示 hrm schema 中剩余的表
SELECT 'hrm schema remaining tables:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'hrm' ORDER BY table_name;

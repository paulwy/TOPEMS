-- 通讯录示例数据
-- 插入一些示例公司
INSERT INTO erp.companies (id, name, short_name, registration_number, tax_number, address, contact_phone, email, status)
VALUES 
    (gen_random_uuid(), '北京天地科技有限公司', '天地科技', '1101010000001', '110000000000', '北京市海淀区中关村大街1号', '010-12345678', 'contact@tdtech.com', 'active'),
    (gen_random_uuid(), '上海创新电子集团', '创新电子', '3101010000001', '310000000000', '上海市浦东新区张江高科技园区', '021-87654321', 'info@innov-e.com', 'active')
ON CONFLICT DO NOTHING;

-- 插入一些示例部门
INSERT INTO erp.departments (id, name, code, parent_id, description, status)
VALUES 
    (gen_random_uuid(), '总公司', 'HEAD', NULL, '集团总部', 'active'),
    (gen_random_uuid(), '技术部', 'TECH', (SELECT id FROM erp.departments WHERE code = 'HEAD'), '技术研发部门', 'active'),
    (gen_random_uuid(), '市场部', 'MARKET', (SELECT id FROM erp.departments WHERE code = 'HEAD'), '市场营销部门', 'active'),
    (gen_random_uuid(), '人力资源部', 'HR', (SELECT id FROM erp.departments WHERE code = 'HEAD'), '人事管理部门', 'active'),
    (gen_random_uuid(), '财务部', 'FINANCE', (SELECT id FROM erp.departments WHERE code = 'HEAD'), '财务管理部门', 'active')
ON CONFLICT DO NOTHING;

-- 插入一些示例员工
INSERT INTO erp.employees (id, employee_number, name, gender, hire_date, department_id, position, email, phone, status)
VALUES 
    (gen_random_uuid(), 'EMP001', '张三', 'male', '2020-01-15', (SELECT id FROM erp.departments WHERE code = 'TECH'), '高级软件工程师', 'zhangsan@tdtech.com', '13800138001', 'active'),
    (gen_random_uuid(), 'EMP002', '李四', 'female', '2021-03-20', (SELECT id FROM erp.departments WHERE code = 'TECH'), 'UI设计师', 'lisi@tdtech.com', '13800138002', 'active'),
    (gen_random_uuid(), 'EMP003', '王五', 'male', '2019-08-10', (SELECT id FROM erp.departments WHERE code = 'MARKET'), '市场经理', 'wangwu@tdtech.com', '13800138003', 'active'),
    (gen_random_uuid(), 'EMP004', '赵六', 'female', '2022-06-01', (SELECT id FROM erp.departments WHERE code = 'HR'), '人力资源专员', 'zhaoliu@tdtech.com', '13800138004', 'active'),
    (gen_random_uuid(), 'EMP005', '钱七', 'male', '2018-11-25', (SELECT id FROM erp.departments WHERE code = 'FINANCE'), '财务主管', 'qianqi@tdtech.com', '13800138005', 'active')
ON CONFLICT DO NOTHING;

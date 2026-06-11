-- 迁移 HRM 数据到 shared schema
-- Phase 1: 迁移 companies 数据
INSERT INTO shared.companies (id, organization_id, name, short_name, registration_number, tax_number, address, contact_phone, contact_email, website, description, status, created_at, updated_at)
SELECT id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'), name, short_name, registration_number, tax_number, address, contact_phone, email, website, description, COALESCE(status, 'active'), created_at, updated_at
FROM hrm.companies
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    registration_number = EXCLUDED.registration_number,
    tax_number = EXCLUDED.tax_number,
    address = EXCLUDED.address,
    contact_phone = EXCLUDED.contact_phone,
    contact_email = EXCLUDED.contact_email,
    website = EXCLUDED.website,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

-- Phase 2: 迁移 departments 数据
INSERT INTO shared.departments (id, organization_id, company_id, parent_id, name, code, manager_id, description, status, created_at, updated_at)
SELECT id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'), company_id, parent_id, name, code, manager_id, description, COALESCE(status, 'active'), created_at, updated_at
FROM hrm.departments
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    manager_id = EXCLUDED.manager_id,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

-- Phase 3: 迁移 employees 数据
INSERT INTO shared.employees (id, organization_id, company_id, department_id, position_id, employee_number, name, gender, birth_date, id_card_number, hire_date, leave_date, position, job_title, email, phone, emergency_contact_name, emergency_contact_phone, address, education, marital_status, nationality, bank_account, bank_name, status, created_at, updated_at)
SELECT id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'), company_id, department_id, position_id, employee_number, name, gender, birth_date, id_card_number, hire_date, leave_date, position, job_title, email, phone, emergency_contact_name, emergency_contact_phone, address, education, marital_status, nationality, bank_account, bank_name, COALESCE(status, 'active'), created_at, updated_at
FROM hrm.employees
ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    department_id = EXCLUDED.department_id,
    position_id = EXCLUDED.position_id,
    employee_number = EXCLUDED.employee_number,
    name = EXCLUDED.name,
    gender = EXCLUDED.gender,
    birth_date = EXCLUDED.birth_date,
    id_card_number = EXCLUDED.id_card_number,
    hire_date = EXCLUDED.hire_date,
    leave_date = EXCLUDED.leave_date,
    position = EXCLUDED.position,
    job_title = EXCLUDED.job_title,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    address = EXCLUDED.address,
    education = EXCLUDED.education,
    marital_status = EXCLUDED.marital_status,
    nationality = EXCLUDED.nationality,
    bank_account = EXCLUDED.bank_account,
    bank_name = EXCLUDED.bank_name,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

-- 查看迁移结果
SELECT 'companies' as table_name, COUNT(*) as count FROM shared.companies
UNION ALL
SELECT 'departments', COUNT(*) FROM shared.departments
UNION ALL
SELECT 'employees', COUNT(*) FROM shared.employees;

SELECT 'Data migration completed!' as result;

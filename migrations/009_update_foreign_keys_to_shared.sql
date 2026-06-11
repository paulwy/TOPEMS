-- 更新外键约束指向 shared schema
-- 注意：需要先删除旧的外键约束，然后添加新的外键约束

-- 1. 更新 hrm.attendance_records 的外键
ALTER TABLE hrm.attendance_records 
    DROP CONSTRAINT IF EXISTS attendance_records_company_id_fkey,
    DROP CONSTRAINT IF EXISTS attendance_records_department_id_fkey,
    DROP CONSTRAINT IF EXISTS attendance_records_employee_id_fkey;

ALTER TABLE hrm.attendance_records
    ADD CONSTRAINT attendance_records_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES shared.companies(id) ON DELETE SET NULL,
    ADD CONSTRAINT attendance_records_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES shared.departments(id) ON DELETE SET NULL,
    ADD CONSTRAINT attendance_records_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE;

-- 2. 更新 hrm.contracts 的外键
ALTER TABLE hrm.contracts
    DROP CONSTRAINT IF EXISTS contracts_employee_id_fkey;

ALTER TABLE hrm.contracts
    ADD CONSTRAINT contracts_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE;

-- 3. 更新 hrm.leave_records 的外键
ALTER TABLE hrm.leave_records
    DROP CONSTRAINT IF EXISTS leave_records_employee_id_fkey,
    DROP CONSTRAINT IF EXISTS leave_records_approver_id_fkey;

ALTER TABLE hrm.leave_records
    ADD CONSTRAINT leave_records_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT leave_records_approver_id_fkey 
        FOREIGN KEY (approver_id) REFERENCES shared.employees(id) ON DELETE SET NULL;

-- 4. 更新 hrm.payroll_records 的外键
ALTER TABLE hrm.payroll_records
    DROP CONSTRAINT IF EXISTS payroll_records_employee_id_fkey;

ALTER TABLE hrm.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE;

-- 5. 更新 hrm.performance_records 的外键
ALTER TABLE hrm.performance_records
    DROP CONSTRAINT IF EXISTS performance_records_employee_id_fkey,
    DROP CONSTRAINT IF EXISTS performance_records_reviewer_id_fkey;

ALTER TABLE hrm.performance_records
    ADD CONSTRAINT performance_records_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT performance_records_reviewer_id_fkey 
        FOREIGN KEY (reviewer_id) REFERENCES shared.employees(id) ON DELETE SET NULL;

-- 6. 更新 hrm.recruitment_applications 的外键
ALTER TABLE hrm.recruitment_applications
    DROP CONSTRAINT IF EXISTS recruitment_applications_department_id_fkey;

ALTER TABLE hrm.recruitment_applications
    ADD CONSTRAINT recruitment_applications_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES shared.departments(id) ON DELETE SET NULL;

-- 7. 更新 hrm.salary_adjustments 的外键
ALTER TABLE hrm.salary_adjustments
    DROP CONSTRAINT IF EXISTS salary_adjustments_employee_id_fkey,
    DROP CONSTRAINT IF EXISTS salary_adjustments_approver_id_fkey;

ALTER TABLE hrm.salary_adjustments
    ADD CONSTRAINT salary_adjustments_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT salary_adjustments_approver_id_fkey 
        FOREIGN KEY (approver_id) REFERENCES shared.employees(id) ON DELETE SET NULL;

-- 8. 更新 hrm.training_participants 的外键
ALTER TABLE hrm.training_participants
    DROP CONSTRAINT IF EXISTS training_participants_employee_id_fkey;

ALTER TABLE hrm.training_participants
    ADD CONSTRAINT training_participants_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE;

-- 9. 更新 hrm.positions 的外键
ALTER TABLE hrm.positions
    DROP CONSTRAINT IF EXISTS positions_company_id_fkey;

ALTER TABLE hrm.positions
    ADD CONSTRAINT positions_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES shared.companies(id) ON DELETE SET NULL;

SELECT 'Foreign key constraints updated successfully!' as result;

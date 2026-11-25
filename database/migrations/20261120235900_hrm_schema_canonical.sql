-- 20261120235900: hrm 23 张运行期表收口（W2-D2 第十二个模块）
--
-- 背景：svc/hrm/src/schema_defense.rs 的 TABLE_DEFS 声明 28 张表（501 列），
-- 启动时建骨架表并调用 shared-db 的 run_schema_defense 逐列补列。
-- 其中 payroll_records / performance_records / recruitment_applications /
-- recruitment_records / training_participants 已被 20261119110000_drop_dead_tables_batch2
-- 归档删除，但启动期 DDL 按旧定义把它们复活；本迁移不纳入这 5 张死表。
-- hrm.hrm_master_data_refs 同属 batch2 死表，由 server hrm_real_module 的
-- default_init_db(with_master_data_refs=true) 运行期重建，已另行移除该调用。
-- 其余 23 张 live 表以真实形状固化；hrm_cache_invalidation_logs / module_settings
-- 由既有迁移维护、未纳入。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS hrm.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    date date NOT NULL,
    check_in_time time without time zone,
    check_out_time time without time zone,
    check_in_location character varying(255),
    check_out_location character varying(255),
    status character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    work_hours numeric(5,2),
    overtime_hours numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255),
    action character varying(100) DEFAULT ''::character varying NOT NULL,
    entity_type character varying(100) DEFAULT ''::character varying NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_name character varying(255),
    request_details jsonb,
    response_details jsonb,
    status character varying(50) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE TABLE IF NOT EXISTS hrm.candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    name character varying(255) NOT NULL,
    email text,
    phone text,
    position_id uuid,
    job_opening_id uuid,
    resume_path text,
    source character varying(100),
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    short_name character varying(100),
    registration_number character varying(100),
    tax_number character varying(100),
    address text,
    contact_phone text,
    contact_email text,
    website character varying(255),
    description text,
    legal_person character varying(100),
    industry character varying(100),
    registered_capital numeric(18,2),
    established_date date,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    code character varying(64) NOT NULL,
    functional_currency character varying(3) DEFAULT 'CNY'::character varying NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.contract_renewals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    previous_contract_id uuid,
    renewal_type character varying(50) NOT NULL,
    renew_reason text,
    renewal_reason text,
    new_start_date date NOT NULL,
    new_end_date date,
    new_salary numeric(15,2),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approver_id uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    organization_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    contract_no character varying(100),
    contract_type character varying(50) NOT NULL,
    party_a_name character varying(255),
    party_a_contact character varying(255),
    party_b_name character varying(255),
    party_b_contact character varying(255),
    start_date date NOT NULL,
    end_date date,
    salary numeric(15,2),
    probation_period_days integer,
    contract_file_path text,
    reminder_days integer DEFAULT 30,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    contract_name character varying(256),
    currency character varying(16),
    salary_type character varying(32),
    work_location character varying(256),
    probation_end_date timestamp with time zone,
    department character varying(256),
    position character varying(256)
);

CREATE TABLE IF NOT EXISTS hrm.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    name character varying(255) NOT NULL,
    code character varying(50),
    parent_id uuid,
    manager_id uuid,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    name_en character varying(255),
    company_id uuid,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    company_id uuid,
    department_id uuid,
    position_id uuid,
    employee_number character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    gender character varying(20),
    birth_date date,
    hire_date date,
    regular_date date,
    probation_period integer,
    leave_date date,
    id_card_number text,
    job_title character varying(255),
    position character varying(255),
    joblevel character varying(50),
    work_location character varying(255),
    report_to_name character varying(255),
    email text,
    phone text,
    emergency_contact_name character varying(255),
    emergency_contact_phone text,
    emergency_relation character varying(50),
    hukou_location character varying(255),
    address text,
    education character varying(50),
    marital_status character varying(20),
    nationality character varying(50),
    bank_account character varying(100),
    bank_name character varying(100),
    remark text,
    employee_type character varying(50),
    user_id uuid,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    name_en character varying(255),
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.initialization_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    action character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    error_message text,
    new_data jsonb,
    old_data jsonb,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    step_name character varying(100) NOT NULL,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.initialization_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    step_name character varying(100) NOT NULL,
    step_order integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    candidate_id uuid NOT NULL,
    interviewer_id uuid,
    round integer DEFAULT 1 NOT NULL,
    scheduled_at timestamp with time zone,
    actual_at timestamp with time zone,
    duration_minutes integer DEFAULT 30 NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    result character varying(50),
    notes text,
    score numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.job_openings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    title character varying(255) NOT NULL,
    code character varying(128),
    department_id uuid,
    position_id uuid,
    employment_type character varying(50),
    location character varying(255),
    description text,
    requirements text,
    salary_min numeric(15,2),
    salary_max numeric(15,2),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    publish_date timestamp with time zone,
    close_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.leave_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days numeric(5,2) NOT NULL,
    reason text,
    approver_id uuid,
    approval_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approval_date date,
    rejection_reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    organization_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.payroll_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    payroll_item_id uuid NOT NULL,
    item_type character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.payroll_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    payroll_run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    gross_amount numeric(15,2) DEFAULT 0 NOT NULL,
    net_amount numeric(15,2) DEFAULT 0 NOT NULL,
    deductions numeric(15,2) DEFAULT 0 NOT NULL,
    taxes numeric(15,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    bank_account character varying(50),
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.payroll_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    pay_period character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    employee_count integer DEFAULT 0 NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.performance_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    target character varying(255),
    weight numeric(5,2) DEFAULT 0 NOT NULL,
    achieved numeric(5,2),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    organization_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.performance_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    review_period character varying(50) NOT NULL,
    reviewer_id uuid,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    overall_rating numeric(5,2),
    self_rating numeric(5,2),
    manager_rating numeric(5,2),
    final_rating numeric(5,2),
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    organization_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    department_id uuid,
    name character varying(255) NOT NULL,
    code character varying(50),
    level integer DEFAULT 1,
    description text,
    responsibilities text,
    requirements text,
    salary_range_min numeric(15,2),
    salary_range_max numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    name_en character varying(255),
    company_id uuid,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.salary_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    adjustment_type character varying(50) NOT NULL,
    previous_salary numeric(15,2) NOT NULL,
    new_salary numeric(15,2) NOT NULL,
    adjustment_amount numeric(15,2) NOT NULL,
    adjustment_percentage numeric(5,2),
    effective_date date NOT NULL,
    reason text,
    approver_id uuid,
    approval_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approval_date date,
    rejection_reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    organization_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS hrm.training_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    plan_id uuid,
    name character varying(255) NOT NULL,
    code character varying(128),
    category character varying(64) DEFAULT 'other'::character varying NOT NULL,
    level character varying(64) DEFAULT 'beginner'::character varying NOT NULL,
    description text,
    duration_hours numeric(8,2),
    instructor_id uuid,
    instructor_name character varying(255),
    location character varying(255),
    max_participants integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.training_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    name character varying(255) NOT NULL,
    code character varying(128),
    description text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    budget numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS hrm.training_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    training_name character varying(255),
    training_type character varying(50),
    training_category character varying(50),
    description text,
    instructor character varying(255),
    start_date date,
    end_date date,
    duration_hours numeric(5,2),
    location character varying(255),
    cost numeric(15,2),
    max_participants integer,
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    course_id uuid,
    employee_id uuid,
    enrollment_date timestamp with time zone,
    attendance_status character varying(30),
    completion_status character varying(30),
    certificate_no character varying(100),
    completed_at timestamp with time zone,
    feedback text,
    score numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_companies_tenant_code ON hrm.companies USING btree (tenant_id, lower((code)::text)) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_contracts_employee_id ON hrm.contracts USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON hrm.departments USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_hrm_departments_tenant_parent ON hrm.departments USING btree (tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON hrm.employees USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON hrm.employees USING btree (department_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_number_unique ON hrm.employees USING btree (employee_number, tenant_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON hrm.employees USING btree (position_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON hrm.employees USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_initialization_logs_tenant_id ON hrm.initialization_logs USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_approver_id ON hrm.leave_records USING btree (approver_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_employee_id ON hrm.leave_records USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_payroll_item_id ON hrm.payroll_details USING btree (payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll_run_id ON hrm.payroll_items USING btree (payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON hrm.positions USING btree (department_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_approver_id ON hrm.salary_adjustments USING btree (approver_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_employee_id ON hrm.salary_adjustments USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_training_records_course_id ON hrm.training_records USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_training_records_employee_id ON hrm.training_records USING btree (employee_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.attendance_records'::regclass AND contype='p') THEN
        ALTER TABLE hrm.attendance_records ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.audit_logs'::regclass AND contype='p') THEN
        ALTER TABLE hrm.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.candidates'::regclass AND contype='p') THEN
        ALTER TABLE hrm.candidates ADD CONSTRAINT "candidates_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.companies'::regclass AND contype='p') THEN
        ALTER TABLE hrm.companies ADD CONSTRAINT "companies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.contract_renewals'::regclass AND contype='p') THEN
        ALTER TABLE hrm.contract_renewals ADD CONSTRAINT "contract_renewals_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.contracts'::regclass AND contype='p') THEN
        ALTER TABLE hrm.contracts ADD CONSTRAINT "contracts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.departments'::regclass AND contype='p') THEN
        ALTER TABLE hrm.departments ADD CONSTRAINT "departments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.employees'::regclass AND contype='p') THEN
        ALTER TABLE hrm.employees ADD CONSTRAINT "employees_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.initialization_logs'::regclass AND contype='p') THEN
        ALTER TABLE hrm.initialization_logs ADD CONSTRAINT "initialization_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.initialization_status'::regclass AND contype='p') THEN
        ALTER TABLE hrm.initialization_status ADD CONSTRAINT "initialization_status_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.interviews'::regclass AND contype='p') THEN
        ALTER TABLE hrm.interviews ADD CONSTRAINT "interviews_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.job_openings'::regclass AND contype='p') THEN
        ALTER TABLE hrm.job_openings ADD CONSTRAINT "job_openings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.leave_records'::regclass AND contype='p') THEN
        ALTER TABLE hrm.leave_records ADD CONSTRAINT "leave_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.payroll_details'::regclass AND contype='p') THEN
        ALTER TABLE hrm.payroll_details ADD CONSTRAINT "payroll_details_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.payroll_items'::regclass AND contype='p') THEN
        ALTER TABLE hrm.payroll_items ADD CONSTRAINT "payroll_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.payroll_runs'::regclass AND contype='p') THEN
        ALTER TABLE hrm.payroll_runs ADD CONSTRAINT "payroll_runs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.performance_goals'::regclass AND contype='p') THEN
        ALTER TABLE hrm.performance_goals ADD CONSTRAINT "performance_goals_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.performance_reviews'::regclass AND contype='p') THEN
        ALTER TABLE hrm.performance_reviews ADD CONSTRAINT "performance_reviews_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.positions'::regclass AND contype='p') THEN
        ALTER TABLE hrm.positions ADD CONSTRAINT "positions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.salary_adjustments'::regclass AND contype='p') THEN
        ALTER TABLE hrm.salary_adjustments ADD CONSTRAINT "salary_adjustments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_courses'::regclass AND contype='p') THEN
        ALTER TABLE hrm.training_courses ADD CONSTRAINT "training_courses_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_plans'::regclass AND contype='p') THEN
        ALTER TABLE hrm.training_plans ADD CONSTRAINT "training_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_records'::regclass AND contype='p') THEN
        ALTER TABLE hrm.training_records ADD CONSTRAINT "training_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.companies'::regclass AND conname='uq_companies_tenant_id_id') THEN
        ALTER TABLE hrm.companies ADD CONSTRAINT "uq_companies_tenant_id_id" UNIQUE (tenant_id, id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_records'::regclass AND conname='ck_training_records_cost') THEN
        ALTER TABLE hrm.training_records ADD CONSTRAINT "ck_training_records_cost" CHECK (((cost IS NULL) OR (cost >= (0)::numeric)));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_records'::regclass AND conname='ck_training_records_duration_hours') THEN
        ALTER TABLE hrm.training_records ADD CONSTRAINT "ck_training_records_duration_hours" CHECK (((duration_hours IS NULL) OR (duration_hours >= (0)::numeric)));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_records'::regclass AND conname='ck_training_records_score') THEN
        ALTER TABLE hrm.training_records ADD CONSTRAINT "ck_training_records_score" CHECK (((score IS NULL) OR ((score >= (0)::numeric) AND (score <= (100)::numeric))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_records'::regclass AND conname='ck_training_records_status') THEN
        ALTER TABLE hrm.training_records ADD CONSTRAINT "ck_training_records_status" CHECK (((status)::text = ANY (ARRAY[('planned'::character varying)::text, ('active'::character varying)::text, ('inactive'::character varying)::text, ('archived'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.positions'::regclass AND conname='hrm_positions_department_id_fkey') THEN
        ALTER TABLE hrm.positions ADD CONSTRAINT "hrm_positions_department_id_fkey" FOREIGN KEY (department_id) REFERENCES hrm.departments(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_records'::regclass AND conname='fk_training_records_course') THEN
        ALTER TABLE hrm.training_records ADD CONSTRAINT "fk_training_records_course" FOREIGN KEY (course_id) REFERENCES hrm.training_courses(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='hrm.training_records'::regclass AND conname='fk_training_records_employee') THEN
        ALTER TABLE hrm.training_records ADD CONSTRAINT "fk_training_records_employee" FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE SET NULL;
    END IF;
END $$;


ALTER TABLE hrm.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.attendance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.candidates FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.contract_renewals FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.departments FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.employees FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.initialization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.initialization_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.initialization_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.initialization_status FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.interviews FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.job_openings FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.leave_records FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.payroll_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.payroll_details FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.payroll_items FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.payroll_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.performance_goals FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.performance_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.positions FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.salary_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.salary_adjustments FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.training_courses FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.training_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE hrm.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.training_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.attendance_records;
CREATE POLICY "rls_tenant_isolation" ON hrm.attendance_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.audit_logs;
CREATE POLICY "rls_tenant_isolation" ON hrm.audit_logs AS PERMISSIVE FOR ALL USING ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)) WITH CHECK ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.candidates;
CREATE POLICY "rls_tenant_isolation" ON hrm.candidates AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.companies;
CREATE POLICY "rls_tenant_isolation" ON hrm.companies AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.contract_renewals;
CREATE POLICY "rls_tenant_isolation" ON hrm.contract_renewals AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.contracts;
CREATE POLICY "rls_tenant_isolation" ON hrm.contracts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.departments;
CREATE POLICY "rls_tenant_isolation" ON hrm.departments AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.employees;
CREATE POLICY "rls_tenant_isolation" ON hrm.employees AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.initialization_logs;
CREATE POLICY "rls_tenant_isolation" ON hrm.initialization_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.initialization_status;
CREATE POLICY "rls_tenant_isolation" ON hrm.initialization_status AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.interviews;
CREATE POLICY "rls_tenant_isolation" ON hrm.interviews AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.job_openings;
CREATE POLICY "rls_tenant_isolation" ON hrm.job_openings AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.leave_records;
CREATE POLICY "rls_tenant_isolation" ON hrm.leave_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.payroll_details;
CREATE POLICY "rls_tenant_isolation" ON hrm.payroll_details AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.payroll_items;
CREATE POLICY "rls_tenant_isolation" ON hrm.payroll_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.payroll_runs;
CREATE POLICY "rls_tenant_isolation" ON hrm.payroll_runs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.performance_goals;
CREATE POLICY "rls_tenant_isolation" ON hrm.performance_goals AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.performance_reviews;
CREATE POLICY "rls_tenant_isolation" ON hrm.performance_reviews AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.positions;
CREATE POLICY "rls_tenant_isolation" ON hrm.positions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.salary_adjustments;
CREATE POLICY "rls_tenant_isolation" ON hrm.salary_adjustments AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.training_courses;
CREATE POLICY "rls_tenant_isolation" ON hrm.training_courses AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.training_plans;
CREATE POLICY "rls_tenant_isolation" ON hrm.training_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON hrm.training_records;
CREATE POLICY "rls_tenant_isolation" ON hrm.training_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

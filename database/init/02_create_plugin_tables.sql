-- ================================================================================
-- TOPEMS 业务插件表结构
-- 版本: v2.0.0
-- 日期: 2026-06-18
-- 说明: 创建所有业务插件的核心表结构
-- ================================================================================

-- ================================================================================
-- 1. ERP 插件（企业资源计划）
-- ================================================================================

-- 资产表
CREATE TABLE plugin_erp.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    asset_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    specification TEXT,
    brand VARCHAR(100),
    model VARCHAR(100),
    purchase_date DATE,
    purchase_amount DECIMAL(15, 2),
    depreciation_method VARCHAR(50),
    useful_life_years INT,
    residual_value DECIMAL(15, 2),
    current_value DECIMAL(15, 2),
    location VARCHAR(255),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    custodian_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, asset_number)
);

COMMENT ON TABLE plugin_erp.assets IS '固定资产表';

-- 凭证表
CREATE TABLE plugin_erp.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    voucher_number VARCHAR(100) NOT NULL,
    voucher_date DATE NOT NULL,
    voucher_type VARCHAR(50),
    description TEXT,
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, voucher_number)
);

COMMENT ON TABLE plugin_erp.vouchers IS '会计凭证表';

-- 凭证明细表
CREATE TABLE plugin_erp.voucher_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    voucher_id UUID REFERENCES plugin_erp.vouchers(id) ON DELETE CASCADE,
    account_code VARCHAR(100) NOT NULL,
    account_name VARCHAR(255),
    description TEXT,
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_erp.voucher_items IS '凭证分录表';

-- 费用报销表
CREATE TABLE plugin_erp.expense_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    claim_number VARCHAR(100) NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    claim_date DATE NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, claim_number)
);

COMMENT ON TABLE plugin_erp.expense_claims IS '费用报销单表';

-- 报销明细表
CREATE TABLE plugin_erp.expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES plugin_erp.expense_claims(id) ON DELETE CASCADE,
    expense_type VARCHAR(100),
    description TEXT,
    amount DECIMAL(15, 2) DEFAULT 0,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    attachment_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_erp.expense_items IS '报销明细表';

-- 创建索引
CREATE INDEX idx_erp_assets_tenant_id ON plugin_erp.assets(tenant_id);
CREATE INDEX idx_erp_assets_asset_number ON plugin_erp.assets(asset_number);
CREATE INDEX idx_erp_vouchers_tenant_id ON plugin_erp.vouchers(tenant_id);
CREATE INDEX idx_erp_voucher_items_voucher_id ON plugin_erp.voucher_items(voucher_id);
CREATE INDEX idx_erp_expense_claims_tenant_id ON plugin_erp.expense_claims(tenant_id);
CREATE INDEX idx_erp_expense_items_claim_id ON plugin_erp.expense_items(claim_id);

-- ================================================================================
-- 2. HRM 插件（人力资源管理）
-- ================================================================================

-- 职位表
CREATE TABLE plugin_hrm.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    level INTEGER DEFAULT 1,
    description TEXT,
    responsibilities TEXT,
    requirements TEXT,
    salary_range_min NUMERIC(15, 2),
    salary_range_max NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE plugin_hrm.positions IS '职位表';
CREATE INDEX idx_hrm_positions_tenant_id ON plugin_hrm.positions(tenant_id);
CREATE INDEX idx_hrm_positions_company_id ON plugin_hrm.positions(company_id);
CREATE INDEX idx_hrm_positions_department_id ON plugin_hrm.positions(department_id);

-- 考勤记录表
CREATE TABLE plugin_hrm.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    work_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'normal',
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, attendance_date)
);

COMMENT ON TABLE plugin_hrm.attendance_records IS '考勤记录表';

-- 请假记录表
CREATE TABLE plugin_hrm.leave_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_hrm.leave_records IS '请假记录表';

-- 薪资记录表
CREATE TABLE plugin_hrm.payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    payroll_period VARCHAR(20) NOT NULL,  -- 2026-06
    base_salary DECIMAL(15, 2) DEFAULT 0,
    overtime_pay DECIMAL(15, 2) DEFAULT 0,
    bonus DECIMAL(15, 2) DEFAULT 0,
    deductions DECIMAL(15, 2) DEFAULT 0,
    net_salary DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, payroll_period)
);

COMMENT ON TABLE plugin_hrm.payroll_records IS '薪资记录表';

-- 绩效考核表
CREATE TABLE plugin_hrm.performance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL,  -- 2026-Q2
    score DECIMAL(5, 2),
    grade VARCHAR(10),
    goals JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    feedback TEXT,
    reviewer_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_hrm.performance_records IS '绩效考核表';

-- 招聘申请表
CREATE TABLE plugin_hrm.recruitment_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    position VARCHAR(100) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255),
    applicant_phone VARCHAR(50),
    resume_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'applied',
    interview_date TIMESTAMP WITH TIME ZONE,
    interviewer_id UUID,
    offer_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_hrm.recruitment_applications IS '招聘申请表';

-- 培训记录表
CREATE TABLE plugin_hrm.training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    training_name VARCHAR(255) NOT NULL,
    training_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    trainer VARCHAR(255),
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_hrm.training_records IS '培训记录表';

-- 培训参与人员表
CREATE TABLE plugin_hrm.training_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    training_id UUID REFERENCES plugin_hrm.training_records(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    score DECIMAL(5, 2),
    certificate_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, employee_id)
);

COMMENT ON TABLE plugin_hrm.training_participants IS '培训参与人员表';

-- 创建索引
CREATE INDEX idx_hrm_attendance_tenant_id ON plugin_hrm.attendance_records(tenant_id);
CREATE INDEX idx_hrm_attendance_employee_id ON plugin_hrm.attendance_records(employee_id);
CREATE INDEX idx_hrm_leave_tenant_id ON plugin_hrm.leave_records(tenant_id);
CREATE INDEX idx_hrm_leave_employee_id ON plugin_hrm.leave_records(employee_id);
CREATE INDEX idx_hrm_payroll_tenant_id ON plugin_hrm.payroll_records(tenant_id);
CREATE INDEX idx_hrm_payroll_employee_id ON plugin_hrm.payroll_records(employee_id);
CREATE INDEX idx_hrm_performance_tenant_id ON plugin_hrm.performance_records(tenant_id);
CREATE INDEX idx_hrm_performance_employee_id ON plugin_hrm.performance_records(employee_id);
CREATE INDEX idx_hrm_recruitment_tenant_id ON plugin_hrm.recruitment_applications(tenant_id);
CREATE INDEX idx_hrm_training_tenant_id ON plugin_hrm.training_records(tenant_id);

-- ================================================================================
-- 3. CRM 插件（客户关系管理）
-- ================================================================================

-- 客户表
CREATE TABLE plugin_crm.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    type VARCHAR(50),  -- enterprise | individual
    industry VARCHAR(100),
    scale VARCHAR(50),
    source VARCHAR(100),
    owner_id UUID,  -- 销售负责人
    status VARCHAR(20) DEFAULT 'active',
    address VARCHAR(500),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, customer_number)
);

COMMENT ON TABLE plugin_crm.customers IS '客户表';

-- 联系人表
CREATE TABLE plugin_crm.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES plugin_crm.customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_crm.contacts IS '联系人表';

-- 商机表
CREATE TABLE plugin_crm.opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES plugin_crm.customers(id) ON DELETE SET NULL,
    opportunity_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    stage VARCHAR(50) DEFAULT 'initial',  -- initial | negotiation | contract | closed
    probability DECIMAL(5, 2) DEFAULT 0,
    expected_amount DECIMAL(15, 2) DEFAULT 0,
    expected_close_date DATE,
    owner_id UUID,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, opportunity_number)
);

COMMENT ON TABLE plugin_crm.opportunities IS '商机表';

-- 销售订单表
CREATE TABLE plugin_crm.sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES plugin_crm.customers(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES plugin_crm.opportunities(id) ON DELETE SET NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    signed_by UUID,
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE plugin_crm.sales_orders IS '销售订单表';

-- 创建索引
CREATE INDEX idx_crm_customers_tenant_id ON plugin_crm.customers(tenant_id);
CREATE INDEX idx_crm_customers_owner_id ON plugin_crm.customers(owner_id);
CREATE INDEX idx_crm_contacts_customer_id ON plugin_crm.contacts(customer_id);
CREATE INDEX idx_crm_opportunities_tenant_id ON plugin_crm.opportunities(tenant_id);
CREATE INDEX idx_crm_opportunities_customer_id ON plugin_crm.opportunities(customer_id);
CREATE INDEX idx_crm_sales_orders_tenant_id ON plugin_crm.sales_orders(tenant_id);

-- ================================================================================
-- 4. PM 插件（项目管理）
-- ================================================================================

-- 项目表
CREATE TABLE plugin_pm.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2) DEFAULT 0,
    actual_cost DECIMAL(15, 2) DEFAULT 0,
    manager_id UUID,
    team_members JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, project_number)
);

COMMENT ON TABLE plugin_pm.projects IS '项目表';

-- 任务表
CREATE TABLE plugin_pm.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES plugin_pm.projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES plugin_pm.tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    assignee_id UUID,
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_pm.tasks IS '任务表';

-- 里程碑表
CREATE TABLE plugin_pm.milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES plugin_pm.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_pm.milestones IS '里程碑表';

-- 创建索引
CREATE INDEX idx_pm_projects_tenant_id ON plugin_pm.projects(tenant_id);
CREATE INDEX idx_pm_projects_manager_id ON plugin_pm.projects(manager_id);
CREATE INDEX idx_pm_tasks_project_id ON plugin_pm.tasks(project_id);
CREATE INDEX idx_pm_tasks_assignee_id ON plugin_pm.tasks(assignee_id);
CREATE INDEX idx_pm_milestones_project_id ON plugin_pm.milestones(project_id);

-- ================================================================================
-- 5. WMS 插件（仓储管理）
-- ================================================================================

-- 仓库表
CREATE TABLE plugin_wms.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    warehouse_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),  -- raw_material | finished_goods | distribution
    address VARCHAR(500),
    manager_id UUID,
    capacity DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, warehouse_code)
);

COMMENT ON TABLE plugin_wms.warehouses IS '仓库表';

-- 库位表
CREATE TABLE plugin_wms.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES plugin_wms.warehouses(id) ON DELETE CASCADE,
    location_code VARCHAR(100) NOT NULL,
    zone VARCHAR(50),
    aisle VARCHAR(50),
    shelf VARCHAR(50),
    bin VARCHAR(50),
    capacity DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, location_code)
);

COMMENT ON TABLE plugin_wms.locations IS '库位表';

-- 库存表
CREATE TABLE plugin_wms.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES plugin_wms.warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES plugin_wms.locations(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255),
    batch_number VARCHAR(100),
    quantity DECIMAL(15, 2) DEFAULT 0,
    available_quantity DECIMAL(15, 2) DEFAULT 0,
    locked_quantity DECIMAL(15, 2) DEFAULT 0,
    unit VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_wms.inventory IS '库存表';

-- 入库单表
CREATE TABLE plugin_wms.inbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    warehouse_id UUID REFERENCES plugin_wms.warehouses(id) ON DELETE CASCADE,
    order_type VARCHAR(50),  -- purchase | return | transfer
    supplier_id UUID,
    status VARCHAR(20) DEFAULT 'pending',
    received_by UUID,
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE plugin_wms.inbound_orders IS '入库单表';

-- 出库单表
CREATE TABLE plugin_wms.outbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    warehouse_id UUID REFERENCES plugin_wms.warehouses(id) ON DELETE CASCADE,
    order_type VARCHAR(50),  -- sales | production | transfer
    customer_id UUID,
    status VARCHAR(20) DEFAULT 'pending',
    shipped_by UUID,
    shipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE plugin_wms.outbound_orders IS '出库单表';

-- 创建索引
CREATE INDEX idx_wms_warehouses_tenant_id ON plugin_wms.warehouses(tenant_id);
CREATE INDEX idx_wms_locations_warehouse_id ON plugin_wms.locations(warehouse_id);
CREATE INDEX idx_wms_inventory_tenant_id ON plugin_wms.inventory(tenant_id);
CREATE INDEX idx_wms_inventory_product_code ON plugin_wms.inventory(product_code);
CREATE INDEX idx_wms_inbound_tenant_id ON plugin_wms.inbound_orders(tenant_id);
CREATE INDEX idx_wms_outbound_tenant_id ON plugin_wms.outbound_orders(tenant_id);

-- ================================================================================
-- 6. Mobile 插件（移动端）
-- ================================================================================

-- 巡检记录表
CREATE TABLE plugin_mobile.patrol_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location_lat NUMERIC(10,6) NOT NULL,
    location_lng NUMERIC(10,6) NOT NULL,
    address VARCHAR(500),
    patrol_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    checked_by VARCHAR(100) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plugin_mobile.patrol_records IS '巡检记录表';

-- 扫码记录表
CREATE TABLE plugin_mobile.scan_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    barcode VARCHAR(100) NOT NULL,
    location_lat NUMERIC(10,6) NOT NULL,
    location_lng NUMERIC(10,6) NOT NULL,
    operator VARCHAR(100) NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plugin_mobile.scan_records IS '扫码记录表';

-- 移动端任务表
CREATE TABLE plugin_mobile.mobile_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    assignee VARCHAR(100),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plugin_mobile.mobile_tasks IS '移动端任务表';

-- 创建索引
CREATE INDEX idx_mobile_patrol_tenant_id ON plugin_mobile.patrol_records(tenant_id);
CREATE INDEX idx_mobile_patrol_checked_by ON plugin_mobile.patrol_records(checked_by);
CREATE INDEX idx_mobile_scan_tenant_id ON plugin_mobile.scan_records(tenant_id);
CREATE INDEX idx_mobile_scan_operator ON plugin_mobile.scan_records(operator);
CREATE INDEX idx_mobile_tasks_tenant_id ON plugin_mobile.mobile_tasks(tenant_id);
CREATE INDEX idx_mobile_tasks_assignee ON plugin_mobile.mobile_tasks(assignee);

-- ================================================================================
-- 完成提示
-- ================================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '业务插件表结构创建完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已创建插件:';
    RAISE NOTICE '  - plugin_erp (ERP 企业资源计划)';
    RAISE NOTICE '  - plugin_hrm (HRM 人力资源管理)';
    RAISE NOTICE '  - plugin_crm (CRM 客户关系管理)';
    RAISE NOTICE '  - plugin_pm (PM 项目管理)';
    RAISE NOTICE '  - plugin_wms (WMS 仓储管理)';
    RAISE NOTICE '  - plugin_mobile (Mobile 移动端)';
    RAISE NOTICE '========================================';
END $$;

-- TOPEMS database migration 20260920000085
-- GET 业务 code500（HTTP200 内嵌 500）批量修复第一批：7 张代码引用但缺失的表
-- 列取自代码 SQL 精确引用（payables/expenses/meeting_bookings/quality_inspections 逐列对齐）
-- 幂等建表，双库安全。

CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS srm;
CREATE SCHEMA IF NOT EXISTS rs;
CREATE SCHEMA IF NOT EXISTS erp;

CREATE TABLE IF NOT EXISTS finance.payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT, supplier_name TEXT, project_id UUID, contract_id UUID,
    category TEXT, amount NUMERIC DEFAULT 0, invoice_date TIMESTAMPTZ, due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', paid_amount NUMERIC DEFAULT 0, payment_schedule TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS finance.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number TEXT, applicant_name TEXT, department_id UUID, expense_type TEXT,
    amount NUMERIC DEFAULT 0, description TEXT, expense_date TIMESTAMPTZ, receipt_count INT DEFAULT 0,
    status TEXT DEFAULT 'pending', approver_id UUID, approved_at TIMESTAMPTZ, reimbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS erp.meeting_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID, room_name TEXT, title TEXT, organizer TEXT,
    start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
-- 无前缀引用兜底（search_path 含 public）
CREATE TABLE IF NOT EXISTS public.meeting_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID, room_name TEXT, title TEXT, organizer TEXT,
    start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mes.production_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID, order_id UUID,
    cost_category TEXT, cost_date DATE, quantity DOUBLE PRECISION DEFAULT 0, total_cost NUMERIC DEFAULT 0,
    tenant_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS srm.bidding_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bidding_id UUID, supplier_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), tenant_id UUID, deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rs.material_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID, experiment_id UUID, material_name TEXT, supplier TEXT, batch_number TEXT,
    test_results JSONB, conclusion TEXT, tested_by UUID, tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mes.quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_no TEXT, order_id UUID, order_number TEXT, product_code TEXT, product_name TEXT,
    process_id UUID, process_name TEXT, inspection_type TEXT,
    quantity DOUBLE PRECISION DEFAULT 0, qualified_quantity DOUBLE PRECISION DEFAULT 0,
    unqualified_quantity DOUBLE PRECISION DEFAULT 0, qualification_rate NUMERIC DEFAULT 0,
    inspector TEXT, inspection_time TIMESTAMPTZ, status TEXT DEFAULT 'pending', result TEXT, memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

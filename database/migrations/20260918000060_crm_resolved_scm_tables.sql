-- TOPEMS database migration 20260918000060
-- 1) crm.returns 补 resolved_at timestamptz（create RETURNING 引用）
-- 2) scm 补建 8 张代码引用但 5432 缺失的表（DDL 对齐 5433，CREATE TABLE IF NOT EXISTS 幂等）
-- 3) finance.budgets.fiscal_year 类型已在代码侧修正（text→int bind）

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='returns')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='crm' AND table_name='returns' AND column_name='resolved_at') THEN
        ALTER TABLE crm.returns ADD COLUMN resolved_at timestamptz;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS scm.materials (
    material_code text PRIMARY KEY,
    material_name text NOT NULL,
    specification text,
    unit text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.sales_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    material_code text,
    quantity numeric,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.demand_forecast (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    material_code text,
    quantity numeric,
    forecast_date date,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.incoming_notices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notice_number text,
    purchase_order_id uuid,
    purchase_order_number text,
    supplier_id uuid,
    supplier_name text,
    warehouse_id uuid,
    warehouse_name text,
    expected_arrival_date date,
    status text,
    total_quantity numeric,
    inspection_required boolean,
    remarks text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.incoming_inspections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_number text,
    notice_id uuid,
    notice_number text,
    material_code text,
    material_name text,
    specification text,
    unit text,
    batch_number text,
    inspected_quantity numeric,
    passed_quantity numeric,
    failed_quantity numeric,
    sampling_quantity numeric,
    inspection_result text,
    status text,
    inspection_items jsonb,
    remarks text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.inspection_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    inspection_id uuid,
    item_code text,
    item_name text,
    specification text,
    unit text,
    batch_no text,
    quantity numeric,
    samplesize numeric,
    inspectionitems text,
    inspection_method text,
    inspection_standard text,
    result text,
    defect_details text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.module_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    category text,
    key text,
    value text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.supplier_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    product_no text,
    supplier_id uuid,
    name text,
    description text,
    category text,
    unit text,
    unit_price numeric,
    currency text,
    min_order_qty numeric,
    lead_time_days integer,
    priority text,
    status text,
    specifications text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

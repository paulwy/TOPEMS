-- 20260908000009: 补齐全仓"代码有表无"缺口（30 张，跨 9 个 schema）
-- 背景：门禁只校验 schema 白名单不校验表存在性；全仓 SQL 引用 vs 5432 实况比对
--       发现 tms/scm/rs/erp/core/ai/qms/unified_core 共 30 张被活跃引用但从未建表的表。
-- 定义提取自各模块 INSERT/SELECT/UPDATE/RETURNING（列名对齐代码，类型按仓库惯例推断）。
-- 全部幂等（CREATE TABLE IF NOT EXISTS），重复执行无害。

-- ========== ai（推荐服务）==========
CREATE TABLE IF NOT EXISTS ai.user_profiles (
    user_id UUID PRIMARY KEY,
    preferences JSONB NOT NULL DEFAULT '{}',
    recent_interactions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== core（ai_knowledge 模块，20260908 挂载未建表）==========
CREATE TABLE IF NOT EXISTS core.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    kb_type TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    document_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    kb_id UUID,
    title TEXT NOT NULL,
    content TEXT,
    doc_type TEXT,
    file_path TEXT,
    file_size BIGINT,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    document_id UUID,
    kb_id UUID,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    embedding JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.knowledge_qa_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    kb_id UUID,
    question TEXT NOT NULL,
    answer TEXT,
    sources JSONB NOT NULL DEFAULT '[]',
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== erp（单据/凭证/库存余额）==========
CREATE TABLE IF NOT EXISTS erp.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'active',
    file_url TEXT,
    file_size BIGINT,
    uploader UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp.vouchers (
    voucher_no TEXT PRIMARY KEY,
    voucher_type TEXT NOT NULL,
    reference_no TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp.account_balances (
    material_code TEXT PRIMARY KEY,
    last_movement_date TIMESTAMP WITH TIME ZONE,
    last_movement_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== qms（integration 服务集成写入的目标域）==========
CREATE TABLE IF NOT EXISTS qms.qa_lab_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    sample_no TEXT NOT NULL UNIQUE,
    sample_name TEXT,
    sample_type TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qms.qa_lab_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    task_no TEXT NOT NULL UNIQUE,
    sample_no TEXT,
    test_items TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qms.qa_ehs_hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    hazard_no TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    category TEXT,
    level TEXT,
    source TEXT,
    location TEXT,
    reported_by UUID,
    reported_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== rs（rd 服务）==========
CREATE TABLE IF NOT EXISTS rs.ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    analysis_type TEXT NOT NULL,
    prompt TEXT,
    response TEXT,
    ai_service_url TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rs.document_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    doc_service_file_id TEXT,
    doc_service_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rs.experiment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL,
    record_type TEXT NOT NULL,
    content TEXT,
    attachments JSONB NOT NULL DEFAULT '[]',
    recorded_by UUID,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rs.formula_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    formula_id UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    ingredients JSONB NOT NULL DEFAULT '[]',
    process_steps JSONB NOT NULL DEFAULT '[]',
    process_params JSONB NOT NULL DEFAULT '{}',
    properties JSONB NOT NULL DEFAULT '{}',
    changes JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rs.material_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    experiment_id UUID,
    material_name TEXT,
    supplier TEXT,
    batch_number TEXT,
    test_results JSONB NOT NULL DEFAULT '{}',
    conclusion TEXT,
    tested_by UUID,
    tested_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rs.patents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    patent_number TEXT NOT NULL UNIQUE,
    project_id UUID,
    application_date DATE,
    grant_date DATE,
    status TEXT NOT NULL DEFAULT 'applied',
    type TEXT,
    inventors JSONB NOT NULL DEFAULT '[]',
    assignee TEXT,
    description TEXT,
    abstract TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rs.research_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CNY',
    description TEXT,
    cost_date DATE NOT NULL,
    payer TEXT,
    payment_method TEXT,
    receipt_no TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== scm（MRP/质检/供应商产品）==========
CREATE TABLE IF NOT EXISTS scm.materials (
    material_code TEXT PRIMARY KEY,
    material_name TEXT NOT NULL,
    specification TEXT,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scm.demand_forecast (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    material_code TEXT NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    forecast_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scm.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    material_code TEXT NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scm.supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    product_no TEXT NOT NULL,
    supplier_id UUID REFERENCES scm.suppliers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit TEXT,
    unit_price NUMERIC(15, 2),
    currency TEXT NOT NULL DEFAULT 'CNY',
    min_order_qty INTEGER,
    lead_time_days INTEGER,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    specifications TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, product_no)
);

CREATE TABLE IF NOT EXISTS scm.incoming_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notice_number TEXT NOT NULL UNIQUE,
    purchase_order_id UUID,
    purchase_order_number TEXT,
    supplier_id UUID,
    supplier_name TEXT,
    warehouse_id UUID,
    warehouse_name TEXT,
    expected_arrival_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    total_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    inspection_required BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scm.incoming_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_number TEXT NOT NULL UNIQUE,
    notice_id UUID,
    notice_number TEXT,
    material_code TEXT,
    material_name TEXT,
    specification TEXT,
    unit TEXT,
    batch_number TEXT,
    inspected_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    passed_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    failed_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    sampling_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    inspection_result TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    inspection_items JSONB NOT NULL DEFAULT '[]',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== tms（整个 schema 不存在，先建 schema 再建表）==========
CREATE SCHEMA IF NOT EXISTS tms;

CREATE TABLE IF NOT EXISTS tms.tms_carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    contact_phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    service_area TEXT,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tms.tms_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    license_no TEXT,
    license_type TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    carrier_id UUID,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tms.tms_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_no TEXT NOT NULL UNIQUE,
    name TEXT,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    distance_km NUMERIC(10, 2),
    estimated_hours NUMERIC(6, 2),
    status TEXT NOT NULL DEFAULT 'active',
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tms.tms_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_no TEXT NOT NULL UNIQUE,
    order_id UUID,
    carrier_id UUID,
    vehicle_id UUID,
    driver_id UUID,
    route_id UUID,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    freight_amount NUMERIC(15, 2),
    planned_departure TIMESTAMP WITH TIME ZONE,
    planned_arrival TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tms.tms_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_no TEXT NOT NULL UNIQUE,
    plate_number TEXT,
    vehicle_type TEXT,
    capacity NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'active',
    carrier_id UUID,
    notes TEXT,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== unified_core（IAM 密码重置）==========
CREATE TABLE IF NOT EXISTS unified_core.password_resets (
    user_id UUID PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引（高频查询列）
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_kb ON core.knowledge_documents (kb_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON core.knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_scm_incoming_notices_po ON scm.incoming_notices (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_scm_incoming_inspections_notice ON scm.incoming_inspections (notice_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_carrier ON tms.tms_shipments (carrier_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_vehicle ON tms.tms_shipments (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_driver ON tms.tms_shipments (driver_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_route ON tms.tms_shipments (route_id);

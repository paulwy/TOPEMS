-- 对齐 public.process_flows / public.process_flow_steps / public.quality_records
-- 幂等：IF NOT EXISTS / to_regclass 保护，双库可重复应用

-- 1. public.process_flows 补列（对齐 mes 结构）
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS code VARCHAR;
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS name VARCHAR;
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS version VARCHAR;
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS route_id UUID;
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS production_line VARCHAR;
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS capacity NUMERIC;
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS unit VARCHAR;

-- 2. public.process_flow_steps 补列（对齐 mes 结构）
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS process_id UUID;
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS sequence INTEGER;
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS work_station_id UUID;
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS standard_time NUMERIC;
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS wait_time NUMERIC;
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS transfer_time NUMERIC;
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS quality_check_required BOOLEAN;
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS equipment_ids UUID[];

-- 3. public.quality_records 建表（如不存在，结构对齐 mes.quality_records）
CREATE TABLE IF NOT EXISTS public.quality_records (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    record_no VARCHAR NOT NULL,
    record_type VARCHAR,
    order_id UUID,
    order_no VARCHAR,
    product_id UUID,
    product_name VARCHAR,
    product_code VARCHAR,
    batch_no VARCHAR,
    quantity NUMERIC NOT NULL DEFAULT 0,
    qualified_quantity NUMERIC,
    defective_quantity NUMERIC,
    quality_status VARCHAR,
    inspector VARCHAR,
    inspection_time TIMESTAMP,
    defect_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

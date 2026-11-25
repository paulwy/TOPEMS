-- 20261121160000: mes 14 张运行期表收口（W2-D2 第二十一个模块）
--
-- 背景：svc/mes/src/models/schema_defense.rs 的 TABLE_DEFS 声明 14 张表，启动时由
-- schema_defense 逐列补列/自检。live mes 另有 material_*/quality_*/work_orders 等
-- 由既有迁移维护，不在 TABLE_DEFS 内，本迁移不纳入、不改动。
-- 迁移内容：14 表 / 403 列 / 129 约束 / 53 索引 / 14 策略 / 14 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS mes.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    action character varying(128) DEFAULT ''::character varying NOT NULL,
    entity_type character varying(64) DEFAULT ''::character varying NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_id uuid,
    user_name character varying(256),
    request_details jsonb,
    response_details jsonb,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    ip_address character varying(64),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.equipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    equipment_code character varying(100) NOT NULL,
    equipment_name character varying(255) NOT NULL,
    equipment_type character varying(50),
    category character varying(50),
    model character varying(100),
    brand character varying(100),
    serial_number character varying(100),
    specification text,
    manufacturer character varying(255),
    manufacture_date date,
    purchase_date date,
    installation_date date,
    location character varying(255),
    building character varying(100),
    floor character varying(50),
    area character varying(100),
    work_station_id uuid,
    responsible_person character varying(255),
    responsible_person_id uuid,
    department character varying(100),
    purchase_price numeric(15,2),
    current_value numeric(15,2),
    depreciation_rate numeric(5,2),
    warranty_expiry_date date,
    power_consumption numeric(10,2),
    capacity character varying(100),
    max_capacity numeric(10,2),
    current_capacity numeric(10,2),
    efficiency_percentage numeric(5,2),
    availability_percentage numeric(5,2),
    performance_percentage numeric(5,2),
    quality_percentage numeric(5,2),
    oee_percentage numeric(5,2),
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    operating_status character varying(20),
    last_inspection_date date,
    next_inspection_date date,
    last_maintenance_date date,
    next_maintenance_date date,
    maintenance_frequency_days integer,
    total_operating_hours numeric(10,2),
    total_maintenance_count integer,
    total_failure_count integer,
    last_failure_date date,
    failure_description text,
    operating_hours jsonb,
    maintenance_history jsonb,
    inspection_history jsonb,
    failure_history jsonb,
    notes text,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid,
    description text NOT NULL,
    equipment_no text,
    equipment_name_en character varying(255),
    maintenance_cycle integer DEFAULT 30,
    name character varying(128),
    warranty_end_date date
);

CREATE TABLE IF NOT EXISTS mes.equipment_inspection_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    equipment_code character varying(100),
    equipment_name character varying(255),
    inspection_type character varying(50),
    inspector character varying(255) NOT NULL,
    inspector_id uuid,
    inspection_date date NOT NULL,
    inspection_time time without time zone,
    location character varying(255),
    temperature numeric(10,2),
    vibration numeric(10,2),
    noise_level numeric(10,2),
    humidity numeric(5,2),
    pressure numeric(10,2),
    voltage numeric(10,2),
    current numeric(10,2),
    speed numeric(10,2),
    inspection_items jsonb,
    overall_status character varying(20) NOT NULL,
    abnormalities text,
    recommendations text,
    next_inspection_date date,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    attachments jsonb,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS mes.equipment_maintenance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    equipment_code character varying(100),
    equipment_name character varying(255),
    maintenance_type character varying(50) NOT NULL,
    maintenance_category character varying(50),
    description text NOT NULL,
    maintainer character varying(255) NOT NULL,
    maintainer_id uuid,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_minutes numeric(10,2),
    cost numeric(15,2),
    parts_replaced jsonb,
    parts_cost numeric(15,2),
    labor_cost numeric(15,2),
    other_cost numeric(15,2),
    result character varying(20),
    effectiveness character varying(20),
    issues_found text,
    recommendations text,
    next_maintenance_date date,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    attachments jsonb,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid,
    completed_at timestamp with time zone,
    fault_reason text,
    started_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.process_route_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid NOT NULL,
    route_id uuid NOT NULL,
    process_id uuid NOT NULL,
    sequence integer NOT NULL,
    is_parallel boolean DEFAULT false,
    parallel_group integer,
    estimated_time_minutes numeric(10,2),
    estimated_cost numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS mes.process_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid NOT NULL,
    route_code character varying(100) NOT NULL,
    route_name character varying(255) NOT NULL,
    product_code character varying(100),
    product_name character varying(255),
    description text,
    version character varying(20) DEFAULT '1.0'::character varying,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    total_time_minutes numeric(10,2),
    total_cost numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS mes.production_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    workshop_id uuid,
    description text,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS mes.production_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid,
    order_number character varying(100) NOT NULL,
    order_type character varying(50),
    product_name character varying(255) NOT NULL,
    product_code character varying(100) NOT NULL,
    product_specification text,
    batch_number character varying(100),
    quantity bigint NOT NULL,
    unit character varying(20) DEFAULT 'piece'::character varying,
    planned_quantity integer,
    completed_quantity numeric(12,2) DEFAULT 0,
    rejected_quantity integer DEFAULT 0,
    scrapped_quantity integer DEFAULT 0,
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'created'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    estimated_duration_hours numeric(10,2),
    actual_duration_hours numeric(10,2),
    customer_id uuid,
    customer_name character varying(255),
    customer_order_number character varying(100),
    sales_order_id uuid,
    process_route_id uuid,
    process_route_name character varying(255),
    work_station_id uuid,
    work_station_name character varying(255),
    assigned_to character varying(255),
    assigned_to_id uuid,
    team character varying(100),
    material_requirements jsonb,
    tool_requirements jsonb,
    quality_requirements jsonb,
    special_instructions text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid,
    source_order_id uuid,
    source_order_number character varying,
    workshop_id uuid,
    product_name_en character varying(255),
    order_no character varying(100) DEFAULT ''::character varying NOT NULL,
    product_id uuid,
    source character varying(32) DEFAULT 'manual'::character varying,
    qualified_quantity bigint DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mes.production_processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    equipment_required boolean,
    organization_id uuid,
    process_code character varying(100) NOT NULL,
    process_name character varying(255) NOT NULL,
    process_type character varying(50),
    description text,
    sequence integer NOT NULL,
    version character varying(20) DEFAULT '1.0'::character varying,
    is_active boolean DEFAULT true,
    standard_time_minutes numeric(10,2),
    setup_time_minutes numeric(10,2),
    cycle_time_minutes numeric(10,2),
    wait_time_minutes numeric(10,2),
    work_station_id uuid,
    work_station_name character varying(255),
    required_skills jsonb,
    required_tools jsonb,
    required_materials jsonb,
    quality_check_points jsonb,
    safety_requirements text,
    environmental_requirements text,
    operation_instructions text,
    parameters jsonb,
    predecessor_process_id uuid,
    successor_process_id uuid,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS mes.production_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    process_id uuid,
    process_name character varying(255),
    route_step_id uuid,
    work_station_id uuid,
    work_station_name character varying(255),
    operator character varying(255) NOT NULL,
    operator_id uuid,
    team character varying(100),
    batch_number character varying(100),
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_minutes numeric(10,2),
    planned_quantity integer,
    completed_quantity numeric(12,2) DEFAULT 0 NOT NULL,
    good_quantity integer DEFAULT 0,
    rejected_quantity integer DEFAULT 0,
    scrapped_quantity integer DEFAULT 0,
    rework_quantity integer DEFAULT 0,
    yield_rate numeric(5,2),
    efficiency_rate numeric(5,2),
    quality_check_result character varying(20),
    quality_check_notes text,
    material_usage jsonb,
    tool_usage jsonb,
    parameters jsonb,
    deviations text,
    issues text,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    notes text,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid,
    equipment_id uuid,
    product_code character varying(64),
    product_name character varying(256),
    qualified_quantity numeric(12,2),
    quantity numeric(12,2),
    quantity_defective numeric(12,2) DEFAULT 0,
    quantity_produced numeric(12,2) DEFAULT 0,
    record_no character varying(64),
    unqualified_quantity numeric(12,2)
);

CREATE TABLE IF NOT EXISTS mes.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_overnight boolean DEFAULT false,
    status character varying(32) DEFAULT 'active'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS mes.work_calendars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    calendar_type character varying(32) DEFAULT 'workday'::character varying,
    work_date date NOT NULL,
    shift_id uuid,
    is_working boolean DEFAULT true,
    remark text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS mes.work_stations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid,
    station_no character varying(100),
    station_code character varying(100),
    workshop_id uuid,
    station_name character varying(255) NOT NULL,
    station_type character varying(50),
    description text,
    location character varying(255),
    building character varying(100),
    floor character varying(50),
    area character varying(100),
    capacity integer DEFAULT 1,
    current_load integer DEFAULT 0,
    efficiency_percentage numeric(5,2) DEFAULT 100,
    supervisor character varying(255),
    supervisor_id uuid,
    team character varying(100),
    equipment_id uuid,
    process_id uuid,
    equipment_ids jsonb,
    available_skills jsonb,
    available_tools jsonb,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    last_maintenance_date date,
    next_maintenance_date date,
    maintenance_frequency_days integer,
    operating_hours jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS mes.workshops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    location character varying(256),
    manager character varying(128),
    status character varying(32) DEFAULT 'active'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON mes.audit_logs USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS equipment_tenant_id_idx ON mes.equipment USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_no ON mes.equipment USING btree (equipment_no);
CREATE INDEX IF NOT EXISTS idx_equipment_work_station_id ON mes.equipment USING btree (work_station_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inspection_records_equipment_id ON mes.equipment_inspection_records USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_records_equipment_id ON mes.equipment_maintenance_records USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_records_status ON mes.equipment_maintenance_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_process_route_steps_process_id ON mes.process_route_steps USING btree (process_id);
CREATE INDEX IF NOT EXISTS idx_process_route_steps_route_id ON mes.process_route_steps USING btree (route_id);
CREATE INDEX IF NOT EXISTS process_routes_tenant_id_idx ON mes.process_routes USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_lines_workshop_id ON mes.production_lines USING btree (workshop_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_created_at ON mes.production_orders USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_production_orders_order_no ON mes.production_orders USING btree (order_no);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON mes.production_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_production_orders_workshop_id ON mes.production_orders USING btree (workshop_id);
CREATE INDEX IF NOT EXISTS production_orders_tenant_id_idx ON mes.production_orders USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_processes_predecessor_process_id ON mes.production_processes USING btree (predecessor_process_id);
CREATE INDEX IF NOT EXISTS idx_production_processes_successor_process_id ON mes.production_processes USING btree (successor_process_id);
CREATE INDEX IF NOT EXISTS production_processes_tenant_id_idx ON mes.production_processes USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_mes_production_processes_tenant_name ON mes.production_processes USING btree (tenant_id, process_name) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_production_records_created_at ON mes.production_records USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_production_records_equipment_id ON mes.production_records USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_production_records_order_id ON mes.production_records USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_production_records_process_id ON mes.production_records USING btree (process_id);
CREATE INDEX IF NOT EXISTS idx_production_records_work_station_id ON mes.production_records USING btree (work_station_id);
CREATE INDEX IF NOT EXISTS production_records_tenant_id_idx ON mes.production_records USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_calendars_shift_id ON mes.work_calendars USING btree (shift_id);
CREATE INDEX IF NOT EXISTS idx_work_stations_equipment_id ON mes.work_stations USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_stations_process_id ON mes.work_stations USING btree (process_id);
CREATE INDEX IF NOT EXISTS idx_work_stations_station_no ON mes.work_stations USING btree (station_no);
CREATE INDEX IF NOT EXISTS idx_work_stations_workshop_id ON mes.work_stations USING btree (workshop_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.audit_logs'::regclass AND conname='audit_logs_pkey') THEN
        ALTER TABLE mes.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.equipment'::regclass AND conname='equipment_pkey') THEN
        ALTER TABLE mes.equipment ADD CONSTRAINT "equipment_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.equipment_inspection_records'::regclass AND conname='equipment_inspection_records_pkey') THEN
        ALTER TABLE mes.equipment_inspection_records ADD CONSTRAINT "equipment_inspection_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.equipment_maintenance_records'::regclass AND conname='equipment_maintenance_records_pkey') THEN
        ALTER TABLE mes.equipment_maintenance_records ADD CONSTRAINT "equipment_maintenance_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.process_route_steps'::regclass AND conname='process_route_steps_pkey') THEN
        ALTER TABLE mes.process_route_steps ADD CONSTRAINT "process_route_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.process_routes'::regclass AND conname='process_routes_pkey') THEN
        ALTER TABLE mes.process_routes ADD CONSTRAINT "process_routes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_lines'::regclass AND conname='production_lines_pkey') THEN
        ALTER TABLE mes.production_lines ADD CONSTRAINT "production_lines_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_orders'::regclass AND conname='production_orders_pkey') THEN
        ALTER TABLE mes.production_orders ADD CONSTRAINT "production_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_processes'::regclass AND conname='production_processes_pkey') THEN
        ALTER TABLE mes.production_processes ADD CONSTRAINT "production_processes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_records'::regclass AND conname='production_records_pkey') THEN
        ALTER TABLE mes.production_records ADD CONSTRAINT "production_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.shifts'::regclass AND conname='shifts_pkey') THEN
        ALTER TABLE mes.shifts ADD CONSTRAINT "shifts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_calendars'::regclass AND conname='work_calendars_pkey') THEN
        ALTER TABLE mes.work_calendars ADD CONSTRAINT "work_calendars_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_stations'::regclass AND conname='work_stations_pkey') THEN
        ALTER TABLE mes.work_stations ADD CONSTRAINT "work_stations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.workshops'::regclass AND conname='workshops_pkey') THEN
        ALTER TABLE mes.workshops ADD CONSTRAINT "workshops_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.equipment'::regclass AND conname='equipment_equipment_no_key') THEN
        ALTER TABLE mes.equipment ADD CONSTRAINT "equipment_equipment_no_key" UNIQUE (equipment_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_lines'::regclass AND conname='production_lines_code_key') THEN
        ALTER TABLE mes.production_lines ADD CONSTRAINT "production_lines_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_orders'::regclass AND conname='production_orders_order_no_key') THEN
        ALTER TABLE mes.production_orders ADD CONSTRAINT "production_orders_order_no_key" UNIQUE (order_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_processes'::regclass AND conname='production_processes_process_code_key') THEN
        ALTER TABLE mes.production_processes ADD CONSTRAINT "production_processes_process_code_key" UNIQUE (process_code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.shifts'::regclass AND conname='shifts_code_key') THEN
        ALTER TABLE mes.shifts ADD CONSTRAINT "shifts_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_calendars'::regclass AND conname='work_calendars_code_key') THEN
        ALTER TABLE mes.work_calendars ADD CONSTRAINT "work_calendars_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_stations'::regclass AND conname='work_stations_station_no_key') THEN
        ALTER TABLE mes.work_stations ADD CONSTRAINT "work_stations_station_no_key" UNIQUE (station_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.workshops'::regclass AND conname='workshops_code_key') THEN
        ALTER TABLE mes.workshops ADD CONSTRAINT "workshops_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.equipment_maintenance_records'::regclass AND conname='equipment_maintenance_records_equipment_id_fkey') THEN
        ALTER TABLE mes.equipment_maintenance_records ADD CONSTRAINT "equipment_maintenance_records_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_lines'::regclass AND conname='production_lines_workshop_id_fkey') THEN
        ALTER TABLE mes.production_lines ADD CONSTRAINT "production_lines_workshop_id_fkey" FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_orders'::regclass AND conname='fk_production_orders_workshop') THEN
        ALTER TABLE mes.production_orders ADD CONSTRAINT "fk_production_orders_workshop" FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_records'::regclass AND conname='production_records_equipment_id_fkey') THEN
        ALTER TABLE mes.production_records ADD CONSTRAINT "production_records_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_records'::regclass AND conname='production_records_order_id_fkey') THEN
        ALTER TABLE mes.production_records ADD CONSTRAINT "production_records_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_records'::regclass AND conname='production_records_process_id_fkey') THEN
        ALTER TABLE mes.production_records ADD CONSTRAINT "production_records_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_records'::regclass AND conname='production_records_work_station_id_fkey') THEN
        ALTER TABLE mes.production_records ADD CONSTRAINT "production_records_work_station_id_fkey" FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_calendars'::regclass AND conname='work_calendars_shift_id_fkey') THEN
        ALTER TABLE mes.work_calendars ADD CONSTRAINT "work_calendars_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES mes.shifts(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_stations'::regclass AND conname='fk_work_stations_workshop') THEN
        ALTER TABLE mes.work_stations ADD CONSTRAINT "fk_work_stations_workshop" FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_stations'::regclass AND conname='work_stations_equipment_id_fkey') THEN
        ALTER TABLE mes.work_stations ADD CONSTRAINT "work_stations_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.work_stations'::regclass AND conname='work_stations_process_id_fkey') THEN
        ALTER TABLE mes.work_stations ADD CONSTRAINT "work_stations_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);
    END IF;
END $$;


ALTER TABLE mes.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.equipment FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.equipment_inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.equipment_inspection_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.equipment_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.equipment_maintenance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.process_route_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.process_route_steps FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.process_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.process_routes FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.production_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.production_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.production_processes FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.production_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.shifts FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.work_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.work_calendars FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.work_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.work_stations FORCE ROW LEVEL SECURITY;
ALTER TABLE mes.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE mes.workshops FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.audit_logs;
CREATE POLICY "rls_tenant_isolation" ON mes.audit_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.equipment;
CREATE POLICY "rls_tenant_isolation" ON mes.equipment AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.equipment_inspection_records;
CREATE POLICY "rls_tenant_isolation" ON mes.equipment_inspection_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.equipment_maintenance_records;
CREATE POLICY "rls_tenant_isolation" ON mes.equipment_maintenance_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.process_route_steps;
CREATE POLICY "rls_tenant_isolation" ON mes.process_route_steps AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.process_routes;
CREATE POLICY "rls_tenant_isolation" ON mes.process_routes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.production_lines;
CREATE POLICY "rls_tenant_isolation" ON mes.production_lines AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.production_orders;
CREATE POLICY "rls_tenant_isolation" ON mes.production_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.production_processes;
CREATE POLICY "rls_tenant_isolation" ON mes.production_processes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.production_records;
CREATE POLICY "rls_tenant_isolation" ON mes.production_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.shifts;
CREATE POLICY "rls_tenant_isolation" ON mes.shifts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.work_calendars;
CREATE POLICY "rls_tenant_isolation" ON mes.work_calendars AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.work_stations;
CREATE POLICY "rls_tenant_isolation" ON mes.work_stations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mes.workshops;
CREATE POLICY "rls_tenant_isolation" ON mes.workshops AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

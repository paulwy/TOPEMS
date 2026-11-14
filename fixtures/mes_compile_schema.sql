-- ============================================================================
-- mes 编译结构快照（scripts/mes_guard.sh --sync-snapshot 自动生成，勿手改）
-- 基线日期: 2026-11-14
-- 唯一真源: ssh://xingzhai@192.168.3.129/topems_prod（只读导出，未写入任何对象）
-- 数据库: topems_prod  服务端: PostgreSQL 18.4(Homebrew)
-- pg_dump: pg_dump (PostgreSQL) 18.4 (Homebrew)
-- 账本水位: max(version)=20261114160000  行数=673（public._sqlx_migrations）
-- 生成命令: bash scripts/mes_guard.sh --sync-snapshot --snapshot-ssh xingzhai@192.168.3.129 --snapshot-db topems_prod --snapshot-pg-bin /opt/homebrew/bin
-- 生成时间: 2026-11-14T14:06:37Z
-- 内容区 sha256（不含本头部）: 80d89008c4e00d6095d72df6a27fca1751b853a3b11ba3587dba63c617709959
-- 用途: CI mes-online-check 干净库编译（导入本文件后在线解析）
-- 规则: 任何 mes schema / public 共享表结构变更后，必须重新执行本脚本同步
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS mes;
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET app.tenant_id = %L', current_database(), '00000000-0000-0000-0000-000000000000'); EXCEPTION WHEN OTHERS THEN NULL; END $$;



-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;






CREATE FUNCTION mes.prevent_archived_dict_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    check_type_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'dict_items' THEN
            check_type_id := OLD.dict_type_id;
            IF EXISTS (
                SELECT 1 FROM erp.dict_types dt
                WHERE dt.id = check_type_id
                AND dt.status = 'archived'
            ) THEN
                RAISE EXCEPTION 'Cannot modify archived dictionary items. HR dictionary data is managed by HRM service.';
            END IF;
        END IF;
        RETURN OLD;
    END IF;
    -- NEW.dict_type_id 先赋值到局部变量再参与子查询：PL/pgSQL 对 SQL 子查询中的
    -- record 字段引用在语句准备期解析，若直接写 NEW.dict_type_id 即使被分支包裹
    -- 也会在 dict_types 上抛 "record new has no field dict_type_id"。
    IF TG_TABLE_NAME = 'dict_items' THEN
        check_type_id := NEW.dict_type_id;
        IF EXISTS (
            SELECT 1 FROM erp.dict_types dt
            WHERE dt.id = check_type_id
            AND dt.status = 'archived'
        ) THEN
            RAISE EXCEPTION 'Cannot modify archived dictionary items. HR dictionary data is managed by HRM service.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;



SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE mes.audit_logs (
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

ALTER TABLE ONLY mes.audit_logs FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.batch_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    product_code character varying(64),
    quantity numeric(12,2) NOT NULL,
    unit character varying(32),
    production_date date,
    expiry_date date,
    supplier character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.batch_records FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.bom_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bom_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    specification character varying(256),
    unit character varying(32) NOT NULL,
    quantity numeric(12,4) NOT NULL,
    loss_rate numeric(5,4) DEFAULT 0,
    sequence integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.bom_items FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.capacities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    workshop text,
    available_hours numeric(10,2),
    capacity_date date,
    created_at timestamp with time zone DEFAULT now(),
    status character varying(32) DEFAULT 'available'::character varying,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    used_hours numeric(10,2) DEFAULT 0,
    utilization_rate numeric(5,2),
    work_center_id uuid NOT NULL,
    work_center_name character varying(256),
    shift character varying(32)
);

ALTER TABLE ONLY mes.capacities FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.dashboard_stats (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    key character varying(100) NOT NULL,
    value character varying(255) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.dashboard_stats FORCE ROW LEVEL SECURITY;




CREATE SEQUENCE mes.dashboard_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




CREATE TABLE mes.demand_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    accuracy_rate numeric(5,2),
    actual_quantity numeric(14,2),
    confidence_level numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    forecast_date date,
    forecast_no character varying(64) NOT NULL,
    forecast_period character varying(32),
    forecast_quantity numeric(14,2),
    method character varying(64) DEFAULT 'moving_average'::character varying,
    notes text,
    product_id uuid,
    product_name character varying(256),
    status character varying(32) DEFAULT 'draft'::character varying,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY mes.demand_forecasts FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.equipment (
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

ALTER TABLE ONLY mes.equipment FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.equipment_inspection_records (
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

ALTER TABLE ONLY mes.equipment_inspection_records FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.equipment_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    equipment_code character varying(64),
    equipment_name character varying(128),
    inspector character varying(128) NOT NULL,
    inspection_date character varying(32) NOT NULL,
    location character varying(256),
    temperature numeric(10,2),
    vibration numeric(10,4),
    noiselevel numeric(10,2),
    status character varying(32) DEFAULT 'normal'::character varying,
    items jsonb,
    abnormalities text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.equipment_inspections FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.equipment_maintenance_records (
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

ALTER TABLE ONLY mes.equipment_maintenance_records FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.equipment_oee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    record_date timestamp with time zone NOT NULL,
    planned_production_time double precision NOT NULL,
    actual_run_time double precision NOT NULL,
    downtime double precision,
    ideal_cycle_time double precision NOT NULL,
    actual_output double precision NOT NULL,
    good_output double precision NOT NULL,
    defective_output double precision,
    availability double precision,
    performance double precision,
    quality_rate double precision,
    oee double precision,
    shift character varying(32),
    operator character varying(128),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.equipment_oee FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.financial_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    record_type character varying(50) NOT NULL,
    category character varying(255) NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text,
    transaction_date date NOT NULL,
    payment_method character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.financial_records FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_boms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bom_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256) NOT NULL,
    product_code character varying(64) NOT NULL,
    version character varying(32) DEFAULT '1.0'::character varying,
    status character varying(32) DEFAULT 'draft'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_boms FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_categories FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_issue_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    unit character varying(32) NOT NULL,
    planned_quantity numeric(12,4) NOT NULL,
    actual_quantity numeric(12,4) NOT NULL,
    batch_no character varying(64),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_issue_items FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    bom_id uuid,
    status character varying(32) DEFAULT 'pending'::character varying,
    warehouse_id uuid,
    operator_id uuid,
    issue_time timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_issues FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no text NOT NULL,
    plan_id uuid,
    material_id uuid,
    material_code text,
    material_name text,
    required_quantity double precision DEFAULT 0 NOT NULL,
    available_quantity double precision DEFAULT 0 NOT NULL,
    shortfall_quantity double precision DEFAULT 0 NOT NULL,
    required_date timestamp with time zone,
    supply_type text DEFAULT 'purchase'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.material_plans FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_requirement_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_requirement_items FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mrp_no character varying(64) NOT NULL,
    order_id uuid,
    order_number character varying(64),
    product_code character varying(64) NOT NULL,
    product_name character varying(256) NOT NULL,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    specification character varying(256),
    unit character varying(32),
    required_quantity numeric(12,4) NOT NULL,
    available_quantity numeric(12,4) DEFAULT 0,
    shortfall_quantity numeric(12,4) DEFAULT 0,
    required_date character varying(32) NOT NULL,
    priority character varying(32) DEFAULT 'normal'::character varying,
    status character varying(32) DEFAULT 'pending'::character varying,
    source_type character varying(32),
    remark text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_requirements FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_return_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    unit character varying(32) NOT NULL,
    quantity numeric(12,4) NOT NULL,
    reason text,
    batch_no character varying(64),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_return_items FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.material_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    warehouse_id uuid,
    operator_id uuid,
    return_time timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.material_returns FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.module_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    category text NOT NULL,
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.module_settings FORCE ROW LEVEL SECURITY;




CREATE SEQUENCE mes.permission_audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




CREATE TABLE mes.process_flow_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    equipment_ids uuid[],
    flow_id uuid NOT NULL,
    process_id uuid,
    quality_check_required boolean DEFAULT false,
    sequence integer NOT NULL,
    standard_time double precision,
    transfer_time text,
    updated_at timestamp with time zone DEFAULT now(),
    wait_time double precision,
    work_station_id uuid,
    process_flow_id uuid,
    step_no integer,
    step_name text,
    operation_type text,
    duration_seconds integer,
    tenant_id uuid
);

ALTER TABLE ONLY mes.process_flow_steps FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.process_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    capacity double precision,
    code character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    name character varying(256) NOT NULL,
    production_line character varying(128),
    route_id uuid,
    status character varying(32) DEFAULT 'active'::character varying,
    unit character varying(32),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1,
    tenant_id uuid
);

ALTER TABLE ONLY mes.process_flows FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.process_route_steps (
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

ALTER TABLE ONLY mes.process_route_steps FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.process_routes (
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

ALTER TABLE ONLY mes.process_routes FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid,
    order_id uuid,
    cost_category text,
    cost_date date,
    quantity double precision DEFAULT 0,
    total_cost numeric DEFAULT 0,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workshop text,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.production_costs FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_lines (
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

ALTER TABLE ONLY mes.production_lines FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_orders (
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
    completed_quantity bigint DEFAULT 0,
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

ALTER TABLE ONLY mes.production_orders FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    end_date date,
    notes text,
    plan_name character varying(256) NOT NULL,
    plan_no character varying(64) NOT NULL,
    plan_type character varying(32) DEFAULT 'monthly'::character varying,
    product_id uuid,
    product_name character varying(256),
    start_date date,
    status character varying(32) DEFAULT 'draft'::character varying,
    target_quantity numeric(14,2),
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY mes.production_plans FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_processes (
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

ALTER TABLE ONLY mes.production_processes FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_records (
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

ALTER TABLE ONLY mes.production_records FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256) NOT NULL,
    product_code character varying(64) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    completed_quantity numeric(12,2) DEFAULT 0,
    work_station_id uuid,
    equipment_id uuid,
    process_id uuid,
    planned_start_time timestamp with time zone,
    planned_end_time timestamp with time zone,
    actual_start_time timestamp with time zone,
    actual_end_time timestamp with time zone,
    status character varying(32) DEFAULT 'pending'::character varying,
    priority integer DEFAULT 0,
    sequence integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.production_schedules FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    inspection_no character varying(64) NOT NULL,
    inspection_time text,
    inspection_type character varying(32) NOT NULL,
    inspector character varying(128),
    memo text,
    order_id uuid,
    order_number character varying(64),
    process_id uuid,
    process_name character varying(256),
    product_code character varying(64) NOT NULL,
    product_name character varying(256) NOT NULL,
    qualification_rate numeric(5,2),
    qualified_quantity numeric(12,2),
    quantity numeric(12,2),
    result character varying(32),
    status character varying(32) DEFAULT 'pending'::character varying,
    unqualified_quantity numeric(12,2),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid
);

ALTER TABLE ONLY mes.quality_inspections FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_patrol_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    actual_value text,
    created_at timestamp with time zone DEFAULT now(),
    item_name character varying(256) NOT NULL,
    patrol_id uuid,
    remark text,
    standard text,
    status character varying(32),
    tenant_id uuid
);

ALTER TABLE ONLY mes.quality_patrol_items FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_patrols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    findings text,
    inspector character varying(128) NOT NULL,
    memo text,
    patrol_no character varying(64) NOT NULL,
    patrol_time text,
    production_line character varying(128),
    result character varying(32),
    status character varying(32) DEFAULT 'pending'::character varying,
    updated_at timestamp with time zone DEFAULT now(),
    workstation_id uuid,
    workstation_name character varying(256),
    tenant_id uuid
);

ALTER TABLE ONLY mes.quality_patrols FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    record_type character varying(32) DEFAULT 'inspection'::character varying,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256),
    product_code character varying(64),
    batch_no character varying(64),
    quantity numeric(12,2) NOT NULL,
    qualified_quantity numeric(12,2) DEFAULT 0,
    defective_quantity numeric(12,2) DEFAULT 0,
    quality_status character varying(32) DEFAULT 'pending'::character varying,
    inspector character varying(128),
    inspection_time timestamp with time zone,
    defect_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.quality_records FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_standard_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    inspection_method character varying(256),
    item_name character varying(256),
    lower_limit numeric(12,4),
    remark text,
    standard_id uuid,
    unit character varying(32),
    upper_limit numeric(12,4),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE ONLY mes.quality_standard_values FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_standards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    code character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    description text,
    effective_date text,
    inspection_type character varying(32),
    name character varying(256) NOT NULL,
    product_code character varying(64),
    product_name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1,
    tenant_id uuid
);

ALTER TABLE ONLY mes.quality_standards FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.schema_defense_ledger (
    service_schema text NOT NULL,
    schema_hash text NOT NULL,
    tables_count integer DEFAULT 0 NOT NULL,
    cols_count integer DEFAULT 0 NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    last_skipped_ensure boolean DEFAULT false NOT NULL
);




CREATE TABLE mes.shifts (
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

ALTER TABLE ONLY mes.shifts FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.supply_chain_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    order_type character varying(50) NOT NULL,
    supplier_customer character varying(255) NOT NULL,
    product_name character varying(255) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    order_date date NOT NULL,
    delivery_date date,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.supply_chain_orders FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(128) NOT NULL,
    employee_code character varying(64),
    "position" character varying(128),
    join_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    status character varying(32) DEFAULT 'active'::character varying,
    tenant_id uuid
);

ALTER TABLE ONLY mes.team_members FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_code character varying(100) NOT NULL,
    team_name character varying(200) NOT NULL,
    team_type character varying(50),
    work_station_id uuid,
    leader_id uuid,
    leader_name character varying(128),
    member_count integer DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.teams FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.tenant_backfill_quarantine (
    table_name text NOT NULL,
    row_id uuid NOT NULL,
    reason text NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.wip_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_no character varying(64) NOT NULL,
    wip_id uuid NOT NULL,
    from_process_id uuid,
    from_work_station_id uuid,
    to_process_id uuid,
    to_work_station_id uuid,
    quantity numeric(12,2) NOT NULL,
    transfer_time timestamp with time zone NOT NULL,
    operator character varying(128),
    transfer_type character varying(32) DEFAULT 'process_transfer'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.wip_transfers FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.wips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wip_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256) NOT NULL,
    product_code character varying(64) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    current_process_id uuid,
    current_work_station_id uuid,
    status character varying(32) DEFAULT 'in_progress'::character varying,
    batch_no character varying(64),
    start_time timestamp with time zone,
    last_transfer_time timestamp with time zone,
    operator character varying(128),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.wips FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.work_calendars (
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

ALTER TABLE ONLY mes.work_calendars FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.work_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    product_code character varying(64),
    product_name character varying(256),
    work_station_id uuid,
    process_id uuid,
    planned_quantity numeric(12,2) DEFAULT 0,
    completed_quantity numeric(12,2) DEFAULT 0,
    plan_start_date timestamp with time zone,
    plan_end_date timestamp with time zone,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    team_id uuid,
    operator character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    priority integer DEFAULT 0,
    remark text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.work_orders FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.workshops (
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

ALTER TABLE ONLY mes.workshops FORCE ROW LEVEL SECURITY;




CREATE VIEW mes.v_tenant_backfill_gaps AS
 SELECT 'batch_records'::text AS tbl,
    batch_records.id
   FROM mes.batch_records
  WHERE ((batch_records.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'batch_records'::text) AND (q.row_id = batch_records.id))))))
UNION ALL
 SELECT 'bom_items'::text AS tbl,
    bom_items.id
   FROM mes.bom_items
  WHERE ((bom_items.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'bom_items'::text) AND (q.row_id = bom_items.id))))))
UNION ALL
 SELECT 'equipment_inspections'::text AS tbl,
    equipment_inspections.id
   FROM mes.equipment_inspections
  WHERE ((equipment_inspections.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'equipment_inspections'::text) AND (q.row_id = equipment_inspections.id))))))
UNION ALL
 SELECT 'material_boms'::text AS tbl,
    material_boms.id
   FROM mes.material_boms
  WHERE ((material_boms.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_boms'::text) AND (q.row_id = material_boms.id))))))
UNION ALL
 SELECT 'material_categories'::text AS tbl,
    material_categories.id
   FROM mes.material_categories
  WHERE ((material_categories.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_categories'::text) AND (q.row_id = material_categories.id))))))
UNION ALL
 SELECT 'material_issue_items'::text AS tbl,
    material_issue_items.id
   FROM mes.material_issue_items
  WHERE ((material_issue_items.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_issue_items'::text) AND (q.row_id = material_issue_items.id))))))
UNION ALL
 SELECT 'material_issues'::text AS tbl,
    material_issues.id
   FROM mes.material_issues
  WHERE ((material_issues.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_issues'::text) AND (q.row_id = material_issues.id))))))
UNION ALL
 SELECT 'material_requirement_items'::text AS tbl,
    material_requirement_items.id
   FROM mes.material_requirement_items
  WHERE ((material_requirement_items.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_requirement_items'::text) AND (q.row_id = material_requirement_items.id))))))
UNION ALL
 SELECT 'material_requirements'::text AS tbl,
    material_requirements.id
   FROM mes.material_requirements
  WHERE ((material_requirements.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_requirements'::text) AND (q.row_id = material_requirements.id))))))
UNION ALL
 SELECT 'material_return_items'::text AS tbl,
    material_return_items.id
   FROM mes.material_return_items
  WHERE ((material_return_items.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_return_items'::text) AND (q.row_id = material_return_items.id))))))
UNION ALL
 SELECT 'material_returns'::text AS tbl,
    material_returns.id
   FROM mes.material_returns
  WHERE ((material_returns.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'material_returns'::text) AND (q.row_id = material_returns.id))))))
UNION ALL
 SELECT 'production_lines'::text AS tbl,
    production_lines.id
   FROM mes.production_lines
  WHERE ((production_lines.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'production_lines'::text) AND (q.row_id = production_lines.id))))))
UNION ALL
 SELECT 'quality_records'::text AS tbl,
    quality_records.id
   FROM mes.quality_records
  WHERE ((quality_records.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'quality_records'::text) AND (q.row_id = quality_records.id))))))
UNION ALL
 SELECT 'shifts'::text AS tbl,
    shifts.id
   FROM mes.shifts
  WHERE ((shifts.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'shifts'::text) AND (q.row_id = shifts.id))))))
UNION ALL
 SELECT 'team_members'::text AS tbl,
    team_members.id
   FROM mes.team_members
  WHERE ((team_members.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'team_members'::text) AND (q.row_id = team_members.id))))))
UNION ALL
 SELECT 'wip_transfers'::text AS tbl,
    wip_transfers.id
   FROM mes.wip_transfers
  WHERE ((wip_transfers.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'wip_transfers'::text) AND (q.row_id = wip_transfers.id))))))
UNION ALL
 SELECT 'wips'::text AS tbl,
    wips.id
   FROM mes.wips
  WHERE ((wips.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'wips'::text) AND (q.row_id = wips.id))))))
UNION ALL
 SELECT 'work_calendars'::text AS tbl,
    work_calendars.id
   FROM mes.work_calendars
  WHERE ((work_calendars.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'work_calendars'::text) AND (q.row_id = work_calendars.id))))))
UNION ALL
 SELECT 'workshops'::text AS tbl,
    workshops.id
   FROM mes.workshops
  WHERE ((workshops.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'workshops'::text) AND (q.row_id = workshops.id))))))
UNION ALL
 SELECT 'work_orders'::text AS tbl,
    work_orders.id
   FROM mes.work_orders
  WHERE ((work_orders.tenant_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM mes.tenant_backfill_quarantine q
          WHERE ((q.table_name = 'work_orders'::text) AND (q.row_id = work_orders.id))))));




CREATE TABLE mes.work_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    output_quantity numeric DEFAULT 0,
    defect_quantity numeric DEFAULT 0,
    labor_hours numeric DEFAULT 0,
    approval_remark text,
    approved_at timestamp with time zone,
    approved_by character varying(128),
    created_at timestamp with time zone DEFAULT now(),
    order_id uuid,
    order_no character varying(64),
    remark text,
    report_date timestamp with time zone,
    report_no character varying(64),
    reporter_name character varying(128),
    shift character varying(32),
    status character varying(32) DEFAULT 'pending'::character varying,
    updated_at timestamp with time zone DEFAULT now(),
    work_order_id uuid,
    work_order_no character varying(64),
    work_station_id uuid,
    work_station_name character varying(256),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE ONLY mes.work_reports FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.work_stations (
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

ALTER TABLE ONLY mes.work_stations FORCE ROW LEVEL SECURITY;




ALTER TABLE ONLY mes.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.batch_records
    ADD CONSTRAINT batch_records_batch_no_key UNIQUE (batch_no);



ALTER TABLE ONLY mes.batch_records
    ADD CONSTRAINT batch_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.capacities
    ADD CONSTRAINT capacities_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.dashboard_stats
    ADD CONSTRAINT dashboard_stats_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.demand_forecasts
    ADD CONSTRAINT demand_forecasts_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment
    ADD CONSTRAINT equipment_equipment_no_key UNIQUE (equipment_no);



ALTER TABLE ONLY mes.equipment_inspection_records
    ADD CONSTRAINT equipment_inspection_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment_inspections
    ADD CONSTRAINT equipment_inspections_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment_maintenance_records
    ADD CONSTRAINT equipment_maintenance_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment_oee
    ADD CONSTRAINT equipment_oee_equipment_id_record_date_shift_key UNIQUE (equipment_id, record_date, shift);



ALTER TABLE ONLY mes.equipment_oee
    ADD CONSTRAINT equipment_oee_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.financial_records
    ADD CONSTRAINT financial_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_boms
    ADD CONSTRAINT material_boms_bom_no_key UNIQUE (bom_no);



ALTER TABLE ONLY mes.material_boms
    ADD CONSTRAINT material_boms_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_categories
    ADD CONSTRAINT material_categories_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_issue_items
    ADD CONSTRAINT material_issue_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_issue_no_key UNIQUE (issue_no);



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_plans
    ADD CONSTRAINT material_plans_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_plans
    ADD CONSTRAINT material_plans_plan_no_key UNIQUE (plan_no);



ALTER TABLE ONLY mes.material_requirement_items
    ADD CONSTRAINT material_requirement_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_requirements
    ADD CONSTRAINT material_requirements_mrp_no_key UNIQUE (mrp_no);



ALTER TABLE ONLY mes.material_requirements
    ADD CONSTRAINT material_requirements_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_return_items
    ADD CONSTRAINT material_return_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_returns
    ADD CONSTRAINT material_returns_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_returns
    ADD CONSTRAINT material_returns_return_no_key UNIQUE (return_no);



ALTER TABLE ONLY mes.module_settings
    ADD CONSTRAINT module_settings_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.module_settings
    ADD CONSTRAINT module_settings_tenant_id_category_key_key UNIQUE (tenant_id, category, key);



ALTER TABLE ONLY mes.process_flow_steps
    ADD CONSTRAINT process_flow_steps_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.process_flows
    ADD CONSTRAINT process_flows_code_key UNIQUE (code);



ALTER TABLE ONLY mes.process_flows
    ADD CONSTRAINT process_flows_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.process_route_steps
    ADD CONSTRAINT process_route_steps_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.process_routes
    ADD CONSTRAINT process_routes_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_costs
    ADD CONSTRAINT production_costs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_lines
    ADD CONSTRAINT production_lines_code_key UNIQUE (code);



ALTER TABLE ONLY mes.production_lines
    ADD CONSTRAINT production_lines_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_orders
    ADD CONSTRAINT production_orders_order_no_key UNIQUE (order_no);



ALTER TABLE ONLY mes.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_plans
    ADD CONSTRAINT production_plans_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_process_code_key UNIQUE (process_code);



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_schedule_no_key UNIQUE (schedule_no);



ALTER TABLE ONLY mes.quality_inspections
    ADD CONSTRAINT quality_inspections_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_patrol_items
    ADD CONSTRAINT quality_patrol_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_patrols
    ADD CONSTRAINT quality_patrols_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_records
    ADD CONSTRAINT quality_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_records
    ADD CONSTRAINT quality_records_record_no_key UNIQUE (record_no);



ALTER TABLE ONLY mes.quality_standard_values
    ADD CONSTRAINT quality_standard_values_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_standards
    ADD CONSTRAINT quality_standards_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.schema_defense_ledger
    ADD CONSTRAINT schema_defense_ledger_pkey PRIMARY KEY (service_schema);



ALTER TABLE ONLY mes.shifts
    ADD CONSTRAINT shifts_code_key UNIQUE (code);



ALTER TABLE ONLY mes.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.supply_chain_orders
    ADD CONSTRAINT supply_chain_orders_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.teams
    ADD CONSTRAINT teams_tenant_id_team_code_key UNIQUE NULLS NOT DISTINCT (tenant_id, team_code);



ALTER TABLE ONLY mes.tenant_backfill_quarantine
    ADD CONSTRAINT tenant_backfill_quarantine_pkey PRIMARY KEY (table_name, row_id);



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_transfer_no_key UNIQUE (transfer_no);



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_wip_no_key UNIQUE (wip_no);



ALTER TABLE ONLY mes.work_calendars
    ADD CONSTRAINT work_calendars_code_key UNIQUE (code);



ALTER TABLE ONLY mes.work_calendars
    ADD CONSTRAINT work_calendars_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.work_orders
    ADD CONSTRAINT work_orders_work_order_no_key UNIQUE (work_order_no);



ALTER TABLE ONLY mes.work_reports
    ADD CONSTRAINT work_reports_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.work_stations
    ADD CONSTRAINT work_stations_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.work_stations
    ADD CONSTRAINT work_stations_station_no_key UNIQUE (station_no);



ALTER TABLE ONLY mes.workshops
    ADD CONSTRAINT workshops_code_key UNIQUE (code);



ALTER TABLE ONLY mes.workshops
    ADD CONSTRAINT workshops_pkey PRIMARY KEY (id);



CREATE INDEX audit_logs_tenant_id_idx ON mes.audit_logs USING btree (tenant_id);



CREATE INDEX equipment_tenant_id_idx ON mes.equipment USING btree (tenant_id);



CREATE INDEX idx_batch_records_batch_no ON mes.batch_records USING btree (batch_no);



CREATE INDEX idx_bom_items_bom_id ON mes.bom_items USING btree (bom_id);



CREATE INDEX idx_equipment_inspection_records_equipment_id ON mes.equipment_inspection_records USING btree (equipment_id);



CREATE INDEX idx_equipment_inspections_equipment_id ON mes.equipment_inspections USING btree (equipment_id);



CREATE INDEX idx_equipment_inspections_inspection_date ON mes.equipment_inspections USING btree (inspection_date);



CREATE INDEX idx_equipment_maintenance_records_equipment_id ON mes.equipment_maintenance_records USING btree (equipment_id);



CREATE INDEX idx_equipment_maintenance_records_status ON mes.equipment_maintenance_records USING btree (status);



CREATE INDEX idx_equipment_no ON mes.equipment USING btree (equipment_no);



CREATE INDEX idx_equipment_oee_equipment_id ON mes.equipment_oee USING btree (equipment_id);



CREATE INDEX idx_equipment_oee_record_date ON mes.equipment_oee USING btree (record_date);



CREATE INDEX idx_equipment_work_station_id ON mes.equipment USING btree (work_station_id);



CREATE INDEX idx_material_boms_bom_no ON mes.material_boms USING btree (bom_no);



CREATE INDEX idx_material_boms_product_id ON mes.material_boms USING btree (product_id);



CREATE INDEX idx_material_issue_items_issue_id ON mes.material_issue_items USING btree (issue_id);



CREATE INDEX idx_material_issues_bom_id ON mes.material_issues USING btree (bom_id);



CREATE INDEX idx_material_issues_issue_no ON mes.material_issues USING btree (issue_no);



CREATE INDEX idx_material_issues_order_id ON mes.material_issues USING btree (order_id);



CREATE INDEX idx_material_plans_material_id ON mes.material_plans USING btree (material_id);



CREATE INDEX idx_material_plans_plan_id ON mes.material_plans USING btree (plan_id);



CREATE INDEX idx_material_plans_required_date ON mes.material_plans USING btree (required_date);



CREATE INDEX idx_material_plans_status ON mes.material_plans USING btree (status);



CREATE INDEX idx_material_requirements_material_code ON mes.material_requirements USING btree (material_code);



CREATE INDEX idx_material_requirements_mrp_no ON mes.material_requirements USING btree (mrp_no);



CREATE INDEX idx_material_requirements_order_id ON mes.material_requirements USING btree (order_id);



CREATE INDEX idx_material_requirements_status ON mes.material_requirements USING btree (status);



CREATE INDEX idx_material_return_items_return_id ON mes.material_return_items USING btree (return_id);



CREATE INDEX idx_material_returns_order_id ON mes.material_returns USING btree (order_id);



CREATE INDEX idx_material_returns_return_no ON mes.material_returns USING btree (return_no);



CREATE INDEX idx_mes_module_settings_category ON mes.module_settings USING btree (tenant_id, category);



CREATE INDEX idx_process_flow_steps_flow_id ON mes.process_flow_steps USING btree (flow_id);



CREATE INDEX idx_process_route_steps_process_id ON mes.process_route_steps USING btree (process_id);



CREATE INDEX idx_process_route_steps_route_id ON mes.process_route_steps USING btree (route_id);



CREATE INDEX idx_production_lines_workshop_id ON mes.production_lines USING btree (workshop_id);



CREATE INDEX idx_production_orders_created_at ON mes.production_orders USING btree (created_at);



CREATE INDEX idx_production_orders_order_no ON mes.production_orders USING btree (order_no);



CREATE INDEX idx_production_orders_status ON mes.production_orders USING btree (status);



CREATE INDEX idx_production_orders_workshop_id ON mes.production_orders USING btree (workshop_id);



CREATE INDEX idx_production_processes_predecessor_process_id ON mes.production_processes USING btree (predecessor_process_id);



CREATE INDEX idx_production_processes_successor_process_id ON mes.production_processes USING btree (successor_process_id);



CREATE INDEX idx_production_records_created_at ON mes.production_records USING btree (created_at);



CREATE INDEX idx_production_records_equipment_id ON mes.production_records USING btree (equipment_id);



CREATE INDEX idx_production_records_order_id ON mes.production_records USING btree (order_id);



CREATE INDEX idx_production_records_process_id ON mes.production_records USING btree (process_id);



CREATE INDEX idx_production_records_work_station_id ON mes.production_records USING btree (work_station_id);



CREATE INDEX idx_production_schedules_equipment_id ON mes.production_schedules USING btree (equipment_id);



CREATE INDEX idx_production_schedules_order_id ON mes.production_schedules USING btree (order_id);



CREATE INDEX idx_production_schedules_process_id ON mes.production_schedules USING btree (process_id);



CREATE INDEX idx_production_schedules_schedule_no ON mes.production_schedules USING btree (schedule_no);



CREATE INDEX idx_production_schedules_status ON mes.production_schedules USING btree (status);



CREATE INDEX idx_production_schedules_work_station_id ON mes.production_schedules USING btree (work_station_id);



CREATE INDEX idx_quality_patrol_items_patrol_id ON mes.quality_patrol_items USING btree (patrol_id);



CREATE INDEX idx_quality_records_order_id ON mes.quality_records USING btree (order_id);



CREATE INDEX idx_quality_records_record_no ON mes.quality_records USING btree (record_no);



CREATE INDEX idx_quality_standard_values_standard_id ON mes.quality_standard_values USING btree (standard_id);



CREATE INDEX idx_team_members_employee_id ON mes.team_members USING btree (employee_id);



CREATE INDEX idx_team_members_team_id ON mes.team_members USING btree (team_id);



CREATE INDEX idx_teams_status ON mes.teams USING btree (status);



CREATE INDEX idx_teams_team_code ON mes.teams USING btree (team_code);



CREATE INDEX idx_teams_work_station_id ON mes.teams USING btree (work_station_id);



CREATE INDEX idx_wip_transfers_from_process_id ON mes.wip_transfers USING btree (from_process_id);



CREATE INDEX idx_wip_transfers_from_work_station_id ON mes.wip_transfers USING btree (from_work_station_id);



CREATE INDEX idx_wip_transfers_to_process_id ON mes.wip_transfers USING btree (to_process_id);



CREATE INDEX idx_wip_transfers_to_work_station_id ON mes.wip_transfers USING btree (to_work_station_id);



CREATE INDEX idx_wip_transfers_wip_id ON mes.wip_transfers USING btree (wip_id);



CREATE INDEX idx_wips_created_at ON mes.wips USING btree (created_at);



CREATE INDEX idx_wips_current_process_id ON mes.wips USING btree (current_process_id);



CREATE INDEX idx_wips_current_work_station_id ON mes.wips USING btree (current_work_station_id);



CREATE INDEX idx_wips_order_id ON mes.wips USING btree (order_id);



CREATE INDEX idx_wips_status ON mes.wips USING btree (status);



CREATE INDEX idx_wips_wip_no ON mes.wips USING btree (wip_no);



CREATE INDEX idx_work_calendars_shift_id ON mes.work_calendars USING btree (shift_id);



CREATE INDEX idx_work_orders_order_id ON mes.work_orders USING btree (order_id);



CREATE INDEX idx_work_stations_equipment_id ON mes.work_stations USING btree (equipment_id);



CREATE INDEX idx_work_stations_process_id ON mes.work_stations USING btree (process_id);



CREATE INDEX idx_work_stations_station_no ON mes.work_stations USING btree (station_no);



CREATE INDEX idx_work_stations_workshop_id ON mes.work_stations USING btree (workshop_id);



CREATE INDEX process_routes_tenant_id_idx ON mes.process_routes USING btree (tenant_id);



CREATE INDEX production_orders_tenant_id_idx ON mes.production_orders USING btree (tenant_id);



CREATE INDEX production_processes_tenant_id_idx ON mes.production_processes USING btree (tenant_id);



CREATE INDEX production_records_tenant_id_idx ON mes.production_records USING btree (tenant_id);



CREATE INDEX quality_standard_values_tenant_id_idx ON mes.quality_standard_values USING btree (tenant_id);



CREATE UNIQUE INDEX ux_mes_production_processes_tenant_name ON mes.production_processes USING btree (tenant_id, process_name) WHERE (deleted_at IS NULL);



CREATE INDEX work_reports_tenant_id_idx ON mes.work_reports USING btree (tenant_id);



ALTER TABLE ONLY mes.bom_items
    ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment_inspections
    ADD CONSTRAINT equipment_inspections_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment_maintenance_records
    ADD CONSTRAINT equipment_maintenance_records_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment_oee
    ADD CONSTRAINT equipment_oee_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.production_orders
    ADD CONSTRAINT fk_production_orders_workshop FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.work_stations
    ADD CONSTRAINT fk_work_stations_workshop FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_issue_items
    ADD CONSTRAINT material_issue_items_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES mes.material_issues(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_requirements
    ADD CONSTRAINT material_requirements_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_return_items
    ADD CONSTRAINT material_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES mes.material_returns(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.material_returns
    ADD CONSTRAINT material_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.process_flow_steps
    ADD CONSTRAINT process_flow_steps_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES mes.process_flows(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.production_lines
    ADD CONSTRAINT production_lines_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id);



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.quality_patrol_items
    ADD CONSTRAINT quality_patrol_items_patrol_id_fkey FOREIGN KEY (patrol_id) REFERENCES mes.quality_patrols(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.quality_records
    ADD CONSTRAINT quality_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.quality_standard_values
    ADD CONSTRAINT quality_standard_values_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES mes.quality_standards(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES mes.teams(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.teams
    ADD CONSTRAINT teams_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_from_process_id_fkey FOREIGN KEY (from_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_from_work_station_id_fkey FOREIGN KEY (from_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_to_process_id_fkey FOREIGN KEY (to_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_to_work_station_id_fkey FOREIGN KEY (to_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_wip_id_fkey FOREIGN KEY (wip_id) REFERENCES mes.wips(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_current_process_id_fkey FOREIGN KEY (current_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_current_work_station_id_fkey FOREIGN KEY (current_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.work_calendars
    ADD CONSTRAINT work_calendars_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES mes.shifts(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.work_orders
    ADD CONSTRAINT work_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.work_stations
    ADD CONSTRAINT work_stations_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);



ALTER TABLE ONLY mes.work_stations
    ADD CONSTRAINT work_stations_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);



ALTER TABLE mes.audit_logs ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.batch_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.bom_items ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.capacities ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.dashboard_stats ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.demand_forecasts ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.equipment ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.equipment_inspection_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.equipment_inspections ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.equipment_maintenance_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.equipment_oee ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.financial_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_boms ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_categories ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_issue_items ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_issues ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_plans ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_requirement_items ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_requirements ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_return_items ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.material_returns ENABLE ROW LEVEL SECURITY;


CREATE POLICY mes_allow_all_quality_standards ON mes.quality_standards USING (true) WITH CHECK (true);



ALTER TABLE mes.module_settings ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.process_flow_steps ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.process_flows ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.process_route_steps ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.process_routes ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_costs ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_lines ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_orders ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_plans ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_processes ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_schedules ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.quality_inspections ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.quality_patrol_items ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.quality_patrols ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.quality_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.quality_standard_values ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.quality_standards ENABLE ROW LEVEL SECURITY;


CREATE POLICY rls_tenant_isolation ON mes.audit_logs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.batch_records USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.bom_items USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.capacities USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.dashboard_stats USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.demand_forecasts USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.equipment USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.equipment_inspection_records USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.equipment_inspections USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.equipment_maintenance_records USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.financial_records USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.material_boms USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_categories USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_issue_items USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_issues USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_requirement_items USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_requirements USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_return_items USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.material_returns USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.module_settings USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



CREATE POLICY rls_tenant_isolation ON mes.process_flow_steps USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (EXISTS ( SELECT 1
   FROM mes.process_flows p
  WHERE ((p.id = process_flow_steps.flow_id) AND (p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (EXISTS ( SELECT 1
   FROM mes.process_flows p
  WHERE ((p.id = process_flow_steps.flow_id) AND (p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))));



CREATE POLICY rls_tenant_isolation ON mes.process_flows USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.process_route_steps USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.process_routes USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.production_lines USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.production_orders USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.production_plans USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.production_processes USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.production_records USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.quality_inspections USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.quality_patrol_items USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (EXISTS ( SELECT 1
   FROM mes.quality_patrols p
  WHERE ((p.id = quality_patrol_items.patrol_id) AND (p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (EXISTS ( SELECT 1
   FROM mes.quality_patrols p
  WHERE ((p.id = quality_patrol_items.patrol_id) AND (p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))));



CREATE POLICY rls_tenant_isolation ON mes.quality_patrols USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.quality_records USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.quality_standard_values USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.shifts USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.supply_chain_orders USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.team_members USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.wip_transfers USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.wips USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.work_calendars USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.work_orders USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.work_reports USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.work_stations USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY rls_tenant_isolation ON mes.workshops USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



ALTER TABLE mes.shifts ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.supply_chain_orders ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.team_members ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.teams ENABLE ROW LEVEL SECURITY;


CREATE POLICY tenant_isolation_audit_logs ON mes.audit_logs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));



CREATE POLICY tenant_isolation_dashboard_stats ON mes.dashboard_stats USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY tenant_isolation_equipment_oee ON mes.equipment_oee USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));



CREATE POLICY tenant_isolation_financial_records ON mes.financial_records USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));



CREATE POLICY tenant_isolation_production_costs ON mes.production_costs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));



CREATE POLICY tenant_isolation_production_schedules ON mes.production_schedules USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



CREATE POLICY tenant_isolation_quality_standard_values ON mes.quality_standard_values USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



CREATE POLICY tenant_isolation_supply_chain_orders ON mes.supply_chain_orders USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));



CREATE POLICY tenant_isolation_teams ON mes.teams USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



CREATE POLICY tenant_isolation_work_reports ON mes.work_reports USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.wip_transfers ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.wips ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.work_calendars ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.work_orders ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.work_reports ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.work_stations ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.workshops ENABLE ROW LEVEL SECURITY;








-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    action character varying(255) DEFAULT ''::character varying NOT NULL,
    entity_type character varying(50) DEFAULT ''::character varying NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_id uuid,
    user_name text,
    request_details jsonb,
    response_details jsonb,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    success boolean
);

ALTER TABLE ONLY public.audit_logs FORCE ROW LEVEL SECURITY;




ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);



CREATE INDEX audit_logs_tenant_id_idx ON public.audit_logs USING btree (tenant_id);



CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);



CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);



CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);



CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);



ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


CREATE POLICY rls_tenant_isolation ON public.audit_logs USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));






-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE public.schema_defense_ledger (
    service_schema text NOT NULL,
    schema_hash text NOT NULL,
    tables_count integer DEFAULT 0 NOT NULL,
    cols_count integer DEFAULT 0 NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    last_skipped_ensure boolean DEFAULT false NOT NULL
);




ALTER TABLE ONLY public.schema_defense_ledger
    ADD CONSTRAINT schema_defense_ledger_pkey PRIMARY KEY (service_schema);





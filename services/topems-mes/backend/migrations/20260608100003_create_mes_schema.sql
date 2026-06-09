-- TOPEMS MES 数据库迁移脚本
-- 创建制造执行系统相关的表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建 MES schema
CREATE SCHEMA IF NOT EXISTS mes;

-- ============================================
-- 1. 生产订单表 (production_orders)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    order_type VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    product_specification TEXT,
    batch_number VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) DEFAULT 'piece',
    planned_quantity INTEGER,
    completed_quantity INTEGER DEFAULT 0,
    rejected_quantity INTEGER DEFAULT 0,
    scrapped_quantity INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'created',
    progress_percentage INTEGER DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    estimated_duration_hours NUMERIC(10, 2),
    actual_duration_hours NUMERIC(10, 2),
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_order_number VARCHAR(100),
    sales_order_id UUID,
    process_route_id UUID,
    process_route_name VARCHAR(255),
    work_station_id UUID,
    work_station_name VARCHAR(255),
    assigned_to VARCHAR(255),
    assigned_to_id UUID,
    team VARCHAR(100),
    material_requirements JSONB,
    tool_requirements JSONB,
    quality_requirements JSONB,
    special_instructions TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_production_orders_organization_id ON mes.production_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_order_number ON mes.production_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_production_orders_product_code ON mes.production_orders(product_code);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON mes.production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_priority ON mes.production_orders(priority);
CREATE INDEX IF NOT EXISTS idx_production_orders_planned_start_date ON mes.production_orders(planned_start_date);
CREATE INDEX IF NOT EXISTS idx_production_orders_planned_end_date ON mes.production_orders(planned_end_date);
CREATE INDEX IF NOT EXISTS idx_production_orders_actual_start_date ON mes.production_orders(actual_start_date);
CREATE INDEX IF NOT EXISTS idx_production_orders_assigned_to ON mes.production_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_orders_work_station_id ON mes.production_orders(work_station_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_orders_number_unique ON mes.production_orders(order_number, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE mes.production_orders IS '生产订单表';
COMMENT ON COLUMN mes.production_orders.order_type IS '订单类型：standard, urgent, trial, sample等';
COMMENT ON COLUMN mes.production_orders.status IS '状态：created, released, in_progress, completed, cancelled等';
COMMENT ON COLUMN mes.production_orders.priority IS '优先级：urgent, high, normal, low等';

-- ============================================
-- 2. 生产工艺表 (production_processes)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.production_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    process_code VARCHAR(100),
    process_name VARCHAR(255) NOT NULL,
    process_type VARCHAR(50),
    description TEXT,
    sequence INTEGER NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    standard_time_minutes NUMERIC(10, 2),
    setup_time_minutes NUMERIC(10, 2),
    cycle_time_minutes NUMERIC(10, 2),
    wait_time_minutes NUMERIC(10, 2),
    work_station_id UUID,
    work_station_name VARCHAR(255),
    required_skills JSONB,
    required_tools JSONB,
    required_materials JSONB,
    quality_check_points JSONB,
    safety_requirements TEXT,
    environmental_requirements TEXT,
    operation_instructions TEXT,
    parameters JSONB,
    predecessor_process_id UUID REFERENCES mes.production_processes(id) ON DELETE SET NULL,
    successor_process_id UUID REFERENCES mes.production_processes(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_production_processes_organization_id ON mes.production_processes(organization_id);
CREATE INDEX IF NOT EXISTS idx_production_processes_code ON mes.production_processes(process_code);
CREATE INDEX IF NOT EXISTS idx_production_processes_name ON mes.production_processes(process_name);
CREATE INDEX IF NOT EXISTS idx_production_processes_sequence ON mes.production_processes(sequence);
CREATE INDEX IF NOT EXISTS idx_production_processes_status ON mes.production_processes(status);
CREATE INDEX IF NOT EXISTS idx_production_processes_work_station_id ON mes.production_processes(work_station_id);
CREATE INDEX IF NOT EXISTS idx_production_processes_predecessor_id ON mes.production_processes(predecessor_process_id);
CREATE INDEX IF NOT EXISTS idx_production_processes_successor_id ON mes.production_processes(successor_process_id);

COMMENT ON TABLE mes.production_processes IS '生产工艺表';
COMMENT ON COLUMN mes.production_processes.process_type IS '工艺类型：assembly, machining, welding, inspection等';
COMMENT ON COLUMN mes.production_processes.sequence IS '工艺顺序号';

-- ============================================
-- 工艺路线表 (process_routes)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.process_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    route_code VARCHAR(100) NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    total_time_minutes NUMERIC(10, 2),
    total_cost NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_process_routes_organization_id ON mes.process_routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_process_routes_code ON mes.process_routes(route_code);
CREATE INDEX IF NOT EXISTS idx_process_routes_product_code ON mes.process_routes(product_code);
CREATE INDEX IF NOT EXISTS idx_process_routes_status ON mes.process_routes(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_process_routes_code_unique ON mes.process_routes(route_code, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE mes.process_routes IS '工艺路线表';

-- ============================================
-- 工艺路线明细表 (process_route_steps)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.process_route_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    route_id UUID NOT NULL REFERENCES mes.process_routes(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES mes.production_processes(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    is_parallel BOOLEAN DEFAULT FALSE,
    parallel_group INTEGER,
    estimated_time_minutes NUMERIC(10, 2),
    estimated_cost NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_process_route_steps_organization_id ON mes.process_route_steps(organization_id);
CREATE INDEX IF NOT EXISTS idx_process_route_steps_route_id ON mes.process_route_steps(route_id);
CREATE INDEX IF NOT EXISTS idx_process_route_steps_process_id ON mes.process_route_steps(process_id);
CREATE INDEX IF NOT EXISTS idx_process_route_steps_sequence ON mes.process_route_steps(sequence);

COMMENT ON TABLE mes.process_route_steps IS '工艺路线明细表';

-- ============================================
-- 3. 工作站表 (work_stations)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.work_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    station_code VARCHAR(100),
    station_name VARCHAR(255) NOT NULL,
    station_type VARCHAR(50),
    description TEXT,
    location VARCHAR(255),
    building VARCHAR(100),
    floor VARCHAR(50),
    area VARCHAR(100),
    capacity INTEGER DEFAULT 1,
    current_load INTEGER DEFAULT 0,
    efficiency_percentage NUMERIC(5, 2) DEFAULT 100,
    supervisor VARCHAR(255),
    supervisor_id UUID,
    team VARCHAR(100),
    equipment_ids JSONB,
    available_skills JSONB,
    available_tools JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_frequency_days INTEGER,
    operating_hours JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_work_stations_organization_id ON mes.work_stations(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_stations_code ON mes.work_stations(station_code);
CREATE INDEX IF NOT EXISTS idx_work_stations_name ON mes.work_stations(station_name);
CREATE INDEX IF NOT EXISTS idx_work_stations_type ON mes.work_stations(station_type);
CREATE INDEX IF NOT EXISTS idx_work_stations_status ON mes.work_stations(status);
CREATE INDEX IF NOT EXISTS idx_work_stations_location ON mes.work_stations(location);
CREATE INDEX IF NOT EXISTS idx_work_stations_supervisor ON mes.work_stations(supervisor);

COMMENT ON TABLE mes.work_stations IS '工作站表';
COMMENT ON COLUMN mes.work_stations.station_type IS '工作站类型：assembly, machining, welding, packaging等';
COMMENT ON COLUMN mes.work_stations.status IS '状态：available, busy, maintenance, offline等';

-- ============================================
-- 4. 生产记录表 (production_records)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.production_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES mes.production_orders(id) ON DELETE CASCADE,
    process_id UUID REFERENCES mes.production_processes(id) ON DELETE SET NULL,
    process_name VARCHAR(255),
    route_step_id UUID,
    work_station_id UUID REFERENCES mes.work_stations(id) ON DELETE SET NULL,
    work_station_name VARCHAR(255),
    operator VARCHAR(255) NOT NULL,
    operator_id UUID,
    team VARCHAR(100),
    batch_number VARCHAR(100),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes NUMERIC(10, 2),
    planned_quantity INTEGER,
    completed_quantity INTEGER NOT NULL DEFAULT 0,
    good_quantity INTEGER DEFAULT 0,
    rejected_quantity INTEGER DEFAULT 0,
    scrapped_quantity INTEGER DEFAULT 0,
    rework_quantity INTEGER DEFAULT 0,
    yield_rate NUMERIC(5, 2),
    efficiency_rate NUMERIC(5, 2),
    quality_check_result VARCHAR(20),
    quality_check_notes TEXT,
    material_usage JSONB,
    tool_usage JSONB,
    parameters JSONB,
    deviations TEXT,
    issues TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_production_records_organization_id ON mes.production_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_production_records_order_id ON mes.production_records(order_id);
CREATE INDEX IF NOT EXISTS idx_production_records_process_id ON mes.production_records(process_id);
CREATE INDEX IF NOT EXISTS idx_production_records_work_station_id ON mes.production_records(work_station_id);
CREATE INDEX IF NOT EXISTS idx_production_records_operator ON mes.production_records(operator);
CREATE INDEX IF NOT EXISTS idx_production_records_status ON mes.production_records(status);
CREATE INDEX IF NOT EXISTS idx_production_records_start_time ON mes.production_records(start_time);
CREATE INDEX IF NOT EXISTS idx_production_records_end_time ON mes.production_records(end_time);
CREATE INDEX IF NOT EXISTS idx_production_records_batch_number ON mes.production_records(batch_number);

COMMENT ON TABLE mes.production_records IS '生产记录表';
COMMENT ON COLUMN mes.production_records.status IS '状态：in_progress, completed, paused, cancelled等';
COMMENT ON COLUMN mes.production_records.quality_check_result IS '质检结果：passed, failed, conditional等';

-- ============================================
-- 5. 设备表 (equipment)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    equipment_code VARCHAR(100) NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(50),
    category VARCHAR(50),
    model VARCHAR(100),
    brand VARCHAR(100),
    serial_number VARCHAR(100),
    specification TEXT,
    manufacturer VARCHAR(255),
    manufacture_date DATE,
    purchase_date DATE,
    installation_date DATE,
    location VARCHAR(255),
    building VARCHAR(100),
    floor VARCHAR(50),
    area VARCHAR(100),
    work_station_id UUID REFERENCES mes.work_stations(id) ON DELETE SET NULL,
    responsible_person VARCHAR(255),
    responsible_person_id UUID,
    department VARCHAR(100),
    purchase_price NUMERIC(15, 2),
    current_value NUMERIC(15, 2),
    depreciation_rate NUMERIC(5, 2),
    warranty_expiry_date DATE,
    power_consumption NUMERIC(10, 2),
    capacity VARCHAR(100),
    max_capacity NUMERIC(10, 2),
    current_capacity NUMERIC(10, 2),
    efficiency_percentage NUMERIC(5, 2),
    availability_percentage NUMERIC(5, 2),
    performance_percentage NUMERIC(5, 2),
    quality_percentage NUMERIC(5, 2),
    oee_percentage NUMERIC(5, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    operating_status VARCHAR(20),
    last_inspection_date DATE,
    next_inspection_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_frequency_days INTEGER,
    total_operating_hours NUMERIC(10, 2),
    total_maintenance_count INTEGER,
    total_failure_count INTEGER,
    last_failure_date DATE,
    failure_description TEXT,
    operating_hours JSONB,
    maintenance_history JSONB,
    inspection_history JSONB,
    failure_history JSONB,
    notes TEXT,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_equipment_organization_id ON mes.equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_code ON mes.equipment(equipment_code);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON mes.equipment(equipment_name);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON mes.equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON mes.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON mes.equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_operating_status ON mes.equipment(operating_status);
CREATE INDEX IF NOT EXISTS idx_equipment_location ON mes.equipment(location);
CREATE INDEX IF NOT EXISTS idx_equipment_work_station_id ON mes.equipment(work_station_id);
CREATE INDEX IF NOT EXISTS idx_equipment_responsible_person ON mes.equipment(responsible_person);
CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance_date ON mes.equipment(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_equipment_next_inspection_date ON mes.equipment(next_inspection_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_code_unique ON mes.equipment(equipment_code, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE mes.equipment IS '设备表';
COMMENT ON COLUMN mes.equipment.equipment_type IS '设备类型：production, testing, auxiliary等';
COMMENT ON COLUMN mes.equipment.status IS '状态：available, in_use, maintenance, repair, scrapped等';
COMMENT ON COLUMN mes.equipment.operating_status IS '运行状态：running, idle, standby, fault等';

-- ============================================
-- 设备检验记录表 (equipment_inspection_records)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.equipment_inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    equipment_id UUID NOT NULL REFERENCES mes.equipment(id) ON DELETE CASCADE,
    equipment_code VARCHAR(100),
    equipment_name VARCHAR(255),
    inspection_type VARCHAR(50),
    inspector VARCHAR(255) NOT NULL,
    inspector_id UUID,
    inspection_date DATE NOT NULL,
    inspection_time TIME,
    location VARCHAR(255),
    temperature NUMERIC(10, 2),
    vibration NUMERIC(10, 2),
    noise_level NUMERIC(10, 2),
    humidity NUMERIC(5, 2),
    pressure NUMERIC(10, 2),
    voltage NUMERIC(10, 2),
    current NUMERIC(10, 2),
    speed NUMERIC(10, 2),
    inspection_items JSONB,
    overall_status VARCHAR(20) NOT NULL,
    abnormalities TEXT,
    recommendations TEXT,
    next_inspection_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    attachments JSONB,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_equipment_inspection_organization_id ON mes.equipment_inspection_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inspection_equipment_id ON mes.equipment_inspection_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inspection_type ON mes.equipment_inspection_records(inspection_type);
CREATE INDEX IF NOT EXISTS idx_equipment_inspection_date ON mes.equipment_inspection_records(inspection_date);
CREATE INDEX IF NOT EXISTS idx_equipment_inspection_status ON mes.equipment_inspection_records(overall_status);

COMMENT ON TABLE mes.equipment_inspection_records IS '设备检验记录表';
COMMENT ON COLUMN mes.equipment_inspection_records.inspection_type IS '检验类型：routine, special, annual等';

-- ============================================
-- 设备维护记录表 (equipment_maintenance_records)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.equipment_maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    equipment_id UUID NOT NULL REFERENCES mes.equipment(id) ON DELETE CASCADE,
    equipment_code VARCHAR(100),
    equipment_name VARCHAR(255),
    maintenance_type VARCHAR(50) NOT NULL,
    maintenance_category VARCHAR(50),
    description TEXT NOT NULL,
    maintainer VARCHAR(255) NOT NULL,
    maintainer_id UUID,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes NUMERIC(10, 2),
    cost NUMERIC(15, 2),
    parts_replaced JSONB,
    parts_cost NUMERIC(15, 2),
    labor_cost NUMERIC(15, 2),
    other_cost NUMERIC(15, 2),
    result VARCHAR(20),
    effectiveness VARCHAR(20),
    issues_found TEXT,
    recommendations TEXT,
    next_maintenance_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    attachments JSONB,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_organization_id ON mes.equipment_maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment_id ON mes.equipment_maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_type ON mes.equipment_maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_status ON mes.equipment_maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_start_time ON mes.equipment_maintenance_records(start_time);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_end_time ON mes.equipment_maintenance_records(end_time);

COMMENT ON TABLE mes.equipment_maintenance_records IS '设备维护记录表';
COMMENT ON COLUMN mes.equipment_maintenance_records.maintenance_type IS '维护类型：preventive, corrective, emergency等';
COMMENT ON COLUMN mes.equipment_maintenance_records.status IS '状态：in_progress, completed, cancelled等';

-- ============================================
-- 6. 审计日志表 (audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS mes.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON mes.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON mes.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON mes.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON mes.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON mes.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON mes.audit_logs(created_at DESC);

COMMENT ON TABLE mes.audit_logs IS '审计日志表';

-- ============================================
-- 插入默认数据（种子数据）
-- ============================================

-- 插入默认工作站（示例）
INSERT INTO mes.work_stations (id, organization_id, station_code, station_name, station_type, location, capacity, status)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WS001', '装配工作站1', 'assembly', 'A区1楼', 5, 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WS002', '装配工作站2', 'assembly', 'A区1楼', 5, 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WS003', '加工工作站1', 'machining', 'B区2楼', 3, 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WS004', '检测工作站', 'inspection', 'C区1楼', 2, 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WS005', '包装工作站', 'packaging', 'D区1楼', 4, 'available')
ON CONFLICT DO NOTHING;

-- 插入默认设备（示例）
INSERT INTO mes.equipment (id, organization_id, equipment_code, equipment_name, equipment_type, category, model, status)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'EQ001', '数控车床1', 'production', 'machining', 'CNC-2000', 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'EQ002', '数控车床2', 'production', 'machining', 'CNC-2000', 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'EQ003', '装配机器人1', 'production', 'assembly', 'ARM-X100', 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'EQ004', '质量检测仪', 'testing', 'quality', 'QC-500', 'available'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'EQ005', '包装机', 'production', 'packaging', 'PACK-300', 'available')
ON CONFLICT DO NOTHING;

-- 插入默认生产工艺（示例）
INSERT INTO mes.production_processes (id, organization_id, process_code, process_name, process_type, sequence, standard_time_minutes, status)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'PROC001', '原材料准备', 'preparation', 1, 30, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'PROC002', '零件加工', 'machining', 2, 60, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'PROC003', '部件装配', 'assembly', 3, 45, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'PROC004', '质量检测', 'inspection', 4, 20, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'PROC005', '产品包装', 'packaging', 5, 15, 'active')
ON CONFLICT DO NOTHING;

-- ============================================
-- 创建更新时间触发器函数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表创建更新时间触发器
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'mes' AND tablename != 'audit_logs'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_trigger ON mes.%I', table_name);
        EXECUTE format('CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', table_name);
    END LOOP;
END;
$$;
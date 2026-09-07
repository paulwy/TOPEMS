-- =============================================================
-- 20260907000001: ERP 与遗留 public 业务表收敛迁移
-- =============================================================
-- 背景：erp.* 7 表原仅存在于 database/postgres/administration_tables.sql，
--       public 5 表原仅存在于 database/postgres/init.sql（运维手动脚本，
--       不纳入迁移流程），导致生产/标准升级路径缺失这些业务表。
-- 本迁移将唯一来源的表结构统一纳入迁移管理，消除静态 DDL 双轨制。
-- 来源文件（已收敛为说明文件）：
--   - database/postgres/administration_tables.sql（原样迁移）
--   - database/postgres/init.sql（结构部分，示例数据不随迁移）
-- 注意：notifications / patrol_records / scan_records 因在 database/init/
--       体系存在同名不同结构定义（移动端版），本迁移不搬入，遗留记录在
--       架构评估报告（P1：同名表结构冲突，需业务决策）。
-- =============================================================

-- =============================================================
-- 1. ERP 行政业务表（原 administration_tables.sql）
-- =============================================================

-- 办公用品表
CREATE TABLE IF NOT EXISTS erp.office_supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    price DECIMAL(10, 2),
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_office_supplies_name ON erp.office_supplies(name);
CREATE INDEX IF NOT EXISTS idx_office_supplies_status ON erp.office_supplies(status);
CREATE INDEX IF NOT EXISTS idx_office_supplies_category ON erp.office_supplies(category);

-- 会议室表
CREATE TABLE IF NOT EXISTS erp.meeting_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 10,
    location VARCHAR(255),
    facilities TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_name ON erp.meeting_rooms(name);
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_status ON erp.meeting_rooms(status);

-- 会议预约表
CREATE TABLE IF NOT EXISTS erp.meeting_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES erp.meeting_rooms(id) ON DELETE CASCADE,
    room_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    organizer VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_bookings_room_id ON erp.meeting_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_status ON erp.meeting_bookings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_start_time ON erp.meeting_bookings(start_time);

-- 车辆表
CREATE TABLE IF NOT EXISTS erp.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    brand VARCHAR(100),
    model VARCHAR(100),
    vehicle_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    driver VARCHAR(255),
    last_service TIMESTAMP,
    mileage INTEGER DEFAULT 0,
    fuel_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON erp.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON erp.vehicles(status);

-- 车辆申请记录表
CREATE TABLE IF NOT EXISTS erp.vehicle_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES erp.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(50) NOT NULL,
    requester VARCHAR(255) NOT NULL,
    purpose TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    driver_required BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_vehicle_id ON erp.vehicle_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status ON erp.vehicle_requests(status);

-- 文档管理表
CREATE TABLE IF NOT EXISTS erp.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    doc_type VARCHAR(100) NOT NULL DEFAULT 'general',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    file_url TEXT,
    file_size BIGINT DEFAULT 0,
    uploader VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_title ON erp.documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_status ON erp.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON erp.documents(doc_type);

-- 公告表
CREATE TABLE IF NOT EXISTS erp.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    priority VARCHAR(50) DEFAULT 'normal',
    publish_at TIMESTAMP,
    expire_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON erp.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON erp.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON erp.announcements(publish_at);

-- =============================================================
-- 2. 遗留 public 业务表（原 postgres/init.sql，结构部分）
--    示例数据不随迁移（种子数据由 init 体系管理）
-- =============================================================

-- Production Plans Table (ERP Module)
CREATE TABLE IF NOT EXISTS production_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    planned_quantity INTEGER NOT NULL,
    actual_quantity INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supply Chain Orders Table (SCM Module)
CREATE TABLE IF NOT EXISTS supply_chain_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    supplier_customer VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Records Table (Finance Module)
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    category VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard Stats (Mobile Dashboard)
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    key VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inspection Records (QMS)
CREATE TABLE IF NOT EXISTS inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    inspector VARCHAR(255),
    inspection_time TIMESTAMP NOT NULL,
    issues TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant ID Indexes (Multi-Tenant Row-Level Security)
CREATE INDEX IF NOT EXISTS idx_production_plans_tenant_id ON production_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_orders_tenant_id ON supply_chain_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_tenant_id ON financial_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_tenant_id ON dashboard_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_tenant_id ON inspection_records(tenant_id);

-- =============================================================
-- 3. updated_at 触发器（原 postgres/init.sql）
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_production_plans_updated_at ON production_plans;
CREATE TRIGGER update_production_plans_updated_at
    BEFORE UPDATE ON production_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supply_chain_orders_updated_at ON supply_chain_orders;
CREATE TRIGGER update_supply_chain_orders_updated_at
    BEFORE UPDATE ON supply_chain_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_records_updated_at ON financial_records;
CREATE TRIGGER update_financial_records_updated_at
    BEFORE UPDATE ON financial_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

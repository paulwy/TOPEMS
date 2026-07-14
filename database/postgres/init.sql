-- =============================================================
-- TOPEMS Database Initialization Script
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- Production Plans Table (ERP Module)
-- =============================================================
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

-- =============================================================
-- Supply Chain Orders Table (SCM Module)
-- =============================================================
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

-- =============================================================
-- Financial Records Table (Finance Module)
-- =============================================================
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

-- =============================================================
-- Notifications Table (Notification Module)
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    priority SMALLINT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- =============================================================
-- Mobile Module Tables
-- =============================================================

-- Dashboard Stats
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    key VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patrol Records
CREATE TABLE IF NOT EXISTS patrol_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    patrol_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    patrol_time TIMESTAMP NOT NULL,
    reporter VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan Records
CREATE TABLE IF NOT EXISTS scan_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    scan_time TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    operator VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inspection Records
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

-- =============================================================
-- Tenant ID Indexes (Multi-Tenant Row-Level Security)
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_production_plans_tenant_id ON production_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_orders_tenant_id ON supply_chain_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_tenant_id ON financial_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_tenant_id ON dashboard_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patrol_records_tenant_id ON patrol_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_records_tenant_id ON scan_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_tenant_id ON inspection_records(tenant_id);

-- =============================================================
-- Update Timestamp Trigger Function
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- Apply Triggers to Tables
-- =============================================================

-- Production Plans
CREATE TRIGGER update_production_plans_updated_at
    BEFORE UPDATE ON production_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Supply Chain Orders
CREATE TRIGGER update_supply_chain_orders_updated_at
    BEFORE UPDATE ON supply_chain_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Financial Records
CREATE TRIGGER update_financial_records_updated_at
    BEFORE UPDATE ON financial_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- Initial Sample Data (System Tenant: 00000000-0000-0000-0000-000000000000)
-- =============================================================

-- Insert initial dashboard stats
INSERT INTO dashboard_stats (tenant_id, key, value) VALUES
('00000000-0000-0000-0000-000000000000', 'total_equipment', '128'),
('00000000-0000-0000-0000-000000000000', 'patrol_today', '24'),
('00000000-0000-0000-0000-000000000000', 'scan_count', '1,890'),
('00000000-0000-0000-0000-000000000000', 'pending_alerts', '12');

-- Insert sample patrol records
INSERT INTO patrol_records (tenant_id, patrol_name, location, status, patrol_time, reporter, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'A区巡检', '生产线A', 'normal', '2026-05-31 08:30:00', '张工', '一切正常'),
('00000000-0000-0000-0000-000000000000', 'B区巡检', '仓库B', 'warning', '2026-05-31 09:15:00', '李工', '温度略高');

-- Insert sample scan records
INSERT INTO scan_records (tenant_id, code, product_name, location, scan_time, status, operator) VALUES
('00000000-0000-0000-0000-000000000000', 'PRD-001', '复合材料预浸料', '入库口', '2026-05-31 10:00:00', 'success', '王操作员'),
('00000000-0000-0000-0000-000000000000', 'PRD-002', '碳纤维布', '质检台', '2026-05-31 10:15:00', 'success', '赵操作员');

-- Insert sample inspection records
INSERT INTO inspection_records (tenant_id, item_name, category, status, inspector, inspection_time, issues) VALUES
('00000000-0000-0000-0000-000000000000', '设备X-101', '生产设备', 'pass', '陈检验员', '2026-05-31 09:00:00', '无'),
('00000000-0000-0000-0000-000000000000', '原料批次A001', '原材料', 'fail', '刘检验员', '2026-05-31 09:30:00', '含水量超标');

-- Insert sample notifications
INSERT INTO notifications (tenant_id, user_id, notification_type, title, content, priority, is_read) VALUES
('00000000-0000-0000-0000-000000000000', 'user-1', 'system', '生产计划更新', '生产计划PP-2026-001已更新', 2, false),
('00000000-0000-0000-0000-000000000000', 'user-2', 'alert', '库存预警', '原材料A库存不足', 3, false);

-- =============================================================
-- Initialization Complete
-- =============================================================

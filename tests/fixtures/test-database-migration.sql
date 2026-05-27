-- Test Database Schema Initialization Script
-- This script creates the test database schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS production_plans CASCADE;
DROP TABLE IF EXISTS supply_chain_orders CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- Create Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Production Plans table
CREATE TABLE production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    planned_quantity INTEGER NOT NULL CHECK (planned_quantity > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT '计划中',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create Supply Chain Orders table
CREATE TABLE supply_chain_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_type VARCHAR(50) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    supplier_customer VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT '待处理',
    order_date DATE NOT NULL,
    expected_date DATE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Financial Records table
CREATE TABLE financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better query performance
CREATE INDEX idx_production_plans_status ON production_plans(status);
CREATE INDEX idx_production_plans_created_by ON production_plans(created_by);
CREATE INDEX idx_supply_chain_orders_status ON supply_chain_orders(status);
CREATE INDEX idx_supply_chain_orders_supplier ON supply_chain_orders(supplier_customer);
CREATE INDEX idx_financial_records_type ON financial_records(record_type);
CREATE INDEX idx_financial_records_category ON financial_records(category);
CREATE INDEX idx_financial_records_date ON financial_records(date);

-- Insert Test Users
INSERT INTO users (id, username, email, password_hash, role, is_active, is_superuser) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin', 'admin@topems.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBx5OqKC2', 'admin', true, true),
    ('550e8400-e29b-41d4-a716-446655440002', 'user', 'user@topems.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBx5OqKC2', 'user', true, false),
    ('550e8400-e29b-41d4-a716-446655440003', 'guest', 'guest@topems.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBx5OqKC2', 'guest', true, false);

-- Insert Test Roles
INSERT INTO roles (id, name, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440011', 'admin', 'Administrator role with full access'),
    ('550e8400-e29b-41d4-a716-446655440012', 'user', 'Regular user role'),
    ('550e8400-e29b-41d4-a716-446655440013', 'manager', 'Manager role with approval permissions'),
    ('550e8400-e29b-41d4-a716-446655440014', 'guest', 'Guest role with read-only access');

-- Insert Test Permissions
INSERT INTO permissions (id, name, description, resource, action) VALUES
    ('550e8400-e29b-41d4-a716-446655440021', 'read_production_plans', 'Read production plans', 'production_plans', 'read'),
    ('550e8400-e29b-41d4-a716-446655440022', 'write_production_plans', 'Create/update production plans', 'production_plans', 'write'),
    ('550e8400-e29b-41d4-a716-446655440023', 'delete_production_plans', 'Delete production plans', 'production_plans', 'delete'),
    ('550e8400-e29b-41d4-a716-446655440024', 'read_supply_chain', 'Read supply chain orders', 'supply_chain', 'read'),
    ('550e8400-e29b-41d4-a716-446655440025', 'write_supply_chain', 'Create/update supply chain orders', 'supply_chain', 'write'),
    ('550e8400-e29b-41d4-a716-446655440026', 'read_financial', 'Read financial records', 'financial', 'read'),
    ('550e8400-e29b-41d4-a716-446655440027', 'write_financial', 'Create/update financial records', 'financial', 'write');

-- Insert Test Production Plans
INSERT INTO production_plans (id, product_name, product_code, planned_quantity, start_date, end_date, status, created_by) VALUES
    ('550e8400-e29b-41d4-a716-446655440101', '高性能复合材料 A', 'MAT-A-001', 1000, '2026-01-01', '2026-06-30', '计划中', '生产经理'),
    ('550e8400-e29b-41d4-a716-446655440102', '特殊合金材料 B', 'MAT-B-002', 500, '2026-03-01', '2026-09-30', '进行中', '生产经理');

-- Insert Test Supply Chain Orders
INSERT INTO supply_chain_orders (id, order_type, material_name, quantity, supplier_customer, status, order_date, expected_date, created_by) VALUES
    ('550e8400-e29b-41d4-a716-446655440201', '采购', '化工原料 X', 500, '供应商 A', '待处理', '2026-01-15', '2026-02-15', '采购员'),
    ('550e8400-e29b-41d4-a716-446655440202', '采购', '金属原料 Y', 1000, '供应商 B', '已完成', '2026-01-01', '2026-01-31', '采购员');

-- Insert Test Financial Records
INSERT INTO financial_records (id, record_type, description, amount, category, date, reference_number, created_by) VALUES
    ('550e8400-e29b-41d4-a716-446655440301', '收入', '产品销售订单', 50000.00, '销售收入', '2026-01-20', 'INV-2026-001', '财务'),
    ('550e8400-e29b-41d4-a716-446655440302', '支出', '原材料采购', 25000.00, '采购成本', '2026-01-18', 'EXP-2026-001', '财务');

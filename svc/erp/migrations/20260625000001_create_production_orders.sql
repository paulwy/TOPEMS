-- ERP Production Order Migration
-- ERP 生产订单表

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS erp;

-- Set search path
SET search_path TO erp;

-- ==================== ERP 生产订单表 ====================

CREATE TABLE IF NOT EXISTS erp_production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) NOT NULL UNIQUE,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
    completed_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_order_id VARCHAR(100),
    source_order_number VARCHAR(255),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    workshop_id UUID,
    workshop_name VARCHAR(255),
    priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_erp_production_orders_status ON erp.erp_production_orders(status);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_source ON erp.erp_production_orders(source);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_source_order ON erp.erp_production_orders(source_order_id);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_product ON erp.erp_production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_workshop ON erp.erp_production_orders(workshop_id);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_created ON erp.erp_production_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_planned_start ON erp.erp_production_orders(planned_start_date);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_planned_end ON erp.erp_production_orders(planned_end_date);

-- Reset search path
RESET search_path;

-- Add ERP master data tables
CREATE SCHEMA IF NOT EXISTS erp;

SET search_path TO erp;

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    specification VARCHAR(500),
    unit VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    barcode VARCHAR(100),
    safety_stock NUMERIC(15,2),
    unit_price NUMERIC(15,4),
    tax_rate NUMERIC(5,2),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    contact_person VARCHAR(100),
    contact_phone TEXT,
    email TEXT,
    address VARCHAR(500),
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    customer_type VARCHAR(50),
    industry VARCHAR(100),
    scale VARCHAR(50),
    credit_limit NUMERIC(15,2),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    contact_person VARCHAR(100),
    contact_phone TEXT,
    email TEXT,
    address VARCHAR(500),
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    supplier_type VARCHAR(50),
    industry VARCHAR(100),
    qualification_level VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Sales orders table
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES erp.customers(id),
    customer_name VARCHAR(200),
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_date TIMESTAMPTZ,
    total_amount NUMERIC(15,2),
    tax_amount NUMERIC(15,2),
    discount_amount NUMERIC(15,2),
    payable_amount NUMERIC(15,2),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES erp.materials(id),
    material_code VARCHAR(50),
    material_name VARCHAR(200),
    warehouse_id UUID,
    warehouse_name VARCHAR(200),
    location_code VARCHAR(50),
    quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
    available_quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(15,4) DEFAULT 0,
    unit VARCHAR(20),
    unit_price NUMERIC(15,4),
    total_amount NUMERIC(15,2),
    batch_no VARCHAR(50),
    expire_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_materials_code ON erp.materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_status ON erp.materials(status);
CREATE INDEX IF NOT EXISTS idx_customers_code ON erp.customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_status ON erp.customers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON erp.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON erp.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_no ON erp.sales_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON erp.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON erp.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_material ON erp.inventory(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON erp.inventory(status);

RESET search_path;

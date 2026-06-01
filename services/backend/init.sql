CREATE TABLE IF NOT EXISTS production_plans (
    id UUID PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    planned_quantity INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supply_chain_orders (
    id UUID PRIMARY KEY,
    order_type VARCHAR(50) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    supplier_customer VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY,
    record_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_production_plans_status ON production_plans(status);
CREATE INDEX IF NOT EXISTS idx_supply_chain_orders_status ON supply_chain_orders(status);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date);

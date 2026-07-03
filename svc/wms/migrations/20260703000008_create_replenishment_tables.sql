CREATE TABLE IF NOT EXISTS wms.replenishment_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_number VARCHAR(50) NOT NULL,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    unit VARCHAR(50),
    warehouse_id UUID NOT NULL,
    warehouse_name VARCHAR(200),
    location_id UUID,
    current_stock DECIMAL(18,4) DEFAULT 0,
    available_stock DECIMAL(18,4) DEFAULT 0,
    safety_stock DECIMAL(18,4) DEFAULT 0,
    reorder_point DECIMAL(18,4) DEFAULT 0,
    max_stock DECIMAL(18,4),
    consumption_rate DECIMAL(18,4) DEFAULT 0,
    lead_time_days INTEGER DEFAULT 7,
    suggested_quantity DECIMAL(18,4) DEFAULT 0,
    supplier_id UUID,
    supplier_name VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    trigger_type VARCHAR(50) DEFAULT 'stock_based',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms.replenishment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    warehouse_id UUID,
    warehouse_name VARCHAR(200),
    material_category VARCHAR(100),
    material_code VARCHAR(100),
    safety_stock DECIMAL(18,4),
    reorder_point DECIMAL(18,4),
    max_stock DECIMAL(18,4),
    safety_factor DECIMAL(10,4),
    lead_time_days INTEGER,
    consumption_days INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority_order INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms.replenishment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id UUID,
    warehouse_name VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_quantity BIGINT DEFAULT 0,
    total_amount DECIMAL(18,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms.replenishment_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES wms.replenishment_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    sku VARCHAR(100) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    unit VARCHAR(50) NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 0,
    unit_price DECIMAL(18,4),
    total_amount DECIMAL(18,4),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms.safety_stock_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID,
    warehouse_name VARCHAR(200),
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    safety_stock DECIMAL(18,4) DEFAULT 0,
    reorder_point DECIMAL(18,4) DEFAULT 0,
    max_stock DECIMAL(18,4),
    safety_factor DECIMAL(10,4),
    lead_time_days INTEGER,
    consumption_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_number ON wms.replenishment_suggestions(suggestion_number);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_material ON wms.replenishment_suggestions(material_code);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_warehouse ON wms.replenishment_suggestions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_status ON wms.replenishment_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_priority ON wms.replenishment_suggestions(priority);
CREATE INDEX IF NOT EXISTS idx_replenishment_rules_warehouse ON wms.replenishment_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_rules_material ON wms.replenishment_rules(material_code);
CREATE INDEX IF NOT EXISTS idx_replenishment_rules_enabled ON wms.replenishment_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_replenishment_orders_number ON wms.replenishment_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_replenishment_orders_status ON wms.replenishment_orders(status);
CREATE INDEX IF NOT EXISTS idx_replenishment_order_items_order ON wms.replenishment_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_safety_stock_material ON wms.safety_stock_settings(material_code);
CREATE INDEX IF NOT EXISTS idx_safety_stock_warehouse ON wms.safety_stock_settings(warehouse_id);
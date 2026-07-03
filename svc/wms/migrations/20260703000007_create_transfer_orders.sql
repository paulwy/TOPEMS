CREATE TABLE IF NOT EXISTS wms.transfer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    transfer_type VARCHAR(50) NOT NULL DEFAULT 'inter_warehouse',
    from_warehouse_id VARCHAR(36) NOT NULL,
    from_warehouse_name VARCHAR(200),
    from_location_id VARCHAR(36),
    from_location_code VARCHAR(100),
    to_warehouse_id VARCHAR(36) NOT NULL,
    to_warehouse_name VARCHAR(200),
    to_location_id VARCHAR(36),
    to_location_code VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_quantity BIGINT DEFAULT 0,
    total_amount DECIMAL(18,4),
    planned_date DATE,
    actual_date DATE,
    transporter VARCHAR(200),
    tracking_number VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    remarks TEXT,
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    shipped_by VARCHAR(100),
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_by VARCHAR(100),
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms.transfer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES wms.transfer_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    sku VARCHAR(100) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    batch_number VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    planned_quantity BIGINT NOT NULL DEFAULT 0,
    shipped_quantity BIGINT NOT NULL DEFAULT 0,
    received_quantity BIGINT NOT NULL DEFAULT 0,
    unit_price DECIMAL(18,4),
    total_amount DECIMAL(18,4),
    from_location_id VARCHAR(36),
    to_location_id VARCHAR(36),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_orders_order_number ON wms.transfer_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_from_warehouse ON wms.transfer_orders(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_to_warehouse ON wms.transfer_orders(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_status ON wms.transfer_orders(status);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_transfer_type ON wms.transfer_orders(transfer_type);
CREATE INDEX IF NOT EXISTS idx_transfer_order_items_transfer_id ON wms.transfer_order_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_order_items_sku ON wms.transfer_order_items(sku);
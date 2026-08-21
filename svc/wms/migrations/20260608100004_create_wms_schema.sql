-- TOPEMS WMS 数据库迁移脚本
-- 创建仓储管理系统相关的表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建 WMS schema
CREATE SCHEMA IF NOT EXISTS wms;

-- ============================================
-- 1. 仓库表 (warehouses)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    warehouse_code VARCHAR(100) NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    warehouse_type VARCHAR(50),
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    contact_person VARCHAR(255),
    contact_phone TEXT,
    contact_email TEXT,
    total_area NUMERIC(15, 2),
    usable_area NUMERIC(15, 2),
    total_capacity NUMERIC(15, 2),
    current_capacity NUMERIC(15, 2),
    utilization_rate NUMERIC(5, 2),
    temperature_min NUMERIC(5, 2),
    temperature_max NUMERIC(5, 2),
    humidity_min NUMERIC(5, 2),
    humidity_max NUMERIC(5, 2),
    is_temperature_controlled BOOLEAN DEFAULT FALSE,
    is_humidity_controlled BOOLEAN DEFAULT FALSE,
    security_level VARCHAR(20),
    operating_hours JSONB,
    manager VARCHAR(255),
    manager_id UUID,
    department VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_inspection_date DATE,
    next_inspection_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_warehouses_organization_id ON wms.warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON wms.warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON wms.warehouses(warehouse_name);
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON wms.warehouses(warehouse_type);
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON wms.warehouses(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_location ON wms.warehouses(city, province);
CREATE INDEX IF NOT EXISTS idx_warehouses_manager ON wms.warehouses(manager);
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_code_unique ON wms.warehouses(warehouse_code, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE wms.warehouses IS '仓库信息表';
COMMENT ON COLUMN wms.warehouses.warehouse_type IS '仓库类型：raw_material, finished_goods, semi_finished, spare_parts等';
COMMENT ON COLUMN wms.warehouses.status IS '状态：active, inactive, maintenance等';

-- ============================================
-- 2. 库位表 (locations)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    location_code VARCHAR(100) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50),
    zone VARCHAR(50),
    aisle VARCHAR(50),
    shelf VARCHAR(50),
    level VARCHAR(50),
    position VARCHAR(50),
    barcode VARCHAR(100),
    description TEXT,
    capacity NUMERIC(15, 2),
    current_quantity NUMERIC(15, 2) DEFAULT 0,
    max_weight NUMERIC(15, 2),
    current_weight NUMERIC(15, 2) DEFAULT 0,
    dimensions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    temperature_requirement VARCHAR(50),
    humidity_requirement VARCHAR(50),
    special_requirements TEXT,
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    last_inspection_date DATE,
    next_inspection_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON wms.locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id ON wms.locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_locations_code ON wms.locations(location_code);
CREATE INDEX IF NOT EXISTS idx_locations_name ON wms.locations(location_name);
CREATE INDEX IF NOT EXISTS idx_locations_type ON wms.locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_zone ON wms.locations(zone);
CREATE INDEX IF NOT EXISTS idx_locations_status ON wms.locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_barcode ON wms.locations(barcode);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON wms.locations(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_is_blocked ON wms.locations(is_blocked);
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_code_unique ON wms.locations(location_code, warehouse_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE wms.locations IS '库位信息表';
COMMENT ON COLUMN wms.locations.location_type IS '库位类型：storage, picking, receiving, shipping等';
COMMENT ON COLUMN wms.locations.status IS '状态：available, occupied, blocked, maintenance等';

-- ============================================
-- 3. 库存表 (inventory)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50),
    material_category VARCHAR(50),
    specification TEXT,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    quantity NUMERIC(15, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    available_quantity NUMERIC(15, 2) NOT NULL,
    reserved_quantity NUMERIC(15, 2) DEFAULT 0,
    in_transit_quantity NUMERIC(15, 2) DEFAULT 0,
    quality_status VARCHAR(20) NOT NULL DEFAULT 'qualified',
    production_date DATE,
    expiry_date DATE,
    shelf_life_days INTEGER,
    days_to_expiry INTEGER,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    supplier_code VARCHAR(100),
    purchase_order_number VARCHAR(100),
    purchase_price NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    cost_method VARCHAR(20),
    standard_cost NUMERIC(15, 2),
    average_cost NUMERIC(15, 2),
    last_movement_date TIMESTAMPTZ,
    last_movement_type VARCHAR(50),
    movement_count INTEGER DEFAULT 0,
    min_quantity NUMERIC(15, 2),
    max_quantity NUMERIC(15, 2),
    reorder_point NUMERIC(15, 2),
    reorder_quantity NUMERIC(15, 2),
    safety_stock NUMERIC(15, 2),
    is_below_min BOOLEAN DEFAULT FALSE,
    is_above_max BOOLEAN DEFAULT FALSE,
    needs_reorder BOOLEAN DEFAULT FALSE,
    weight NUMERIC(15, 2),
    volume NUMERIC(15, 2),
    special_attributes JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_organization_id ON wms.inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON wms.inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON wms.inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_material_code ON wms.inventory(material_code);
CREATE INDEX IF NOT EXISTS idx_inventory_material_name ON wms.inventory(material_name);
CREATE INDEX IF NOT EXISTS idx_inventory_batch_number ON wms.inventory(batch_number);
CREATE INDEX IF NOT EXISTS idx_inventory_lot_number ON wms.inventory(lot_number);
CREATE INDEX IF NOT EXISTS idx_inventory_quality_status ON wms.inventory(quality_status);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry_date ON wms.inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_production_date ON wms.inventory(production_date);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON wms.inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_needs_reorder ON wms.inventory(needs_reorder);
CREATE INDEX IF NOT EXISTS idx_inventory_is_below_min ON wms.inventory(is_below_min);
CREATE INDEX IF NOT EXISTS idx_inventory_last_movement_date ON wms.inventory(last_movement_date);

COMMENT ON TABLE wms.inventory IS '库存信息表';
COMMENT ON COLUMN wms.inventory.quality_status IS '质量状态：qualified, quarantined, rejected, pending等';
COMMENT ON COLUMN wms.inventory.cost_method IS '成本方法：standard, average, fifo, lifo等';

-- ============================================
-- 4. 入库订单表 (inbound_orders)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.inbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    reference_type VARCHAR(50),
    warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(255),
    supplier_id UUID,
    supplier_name VARCHAR(255),
    supplier_code VARCHAR(100),
    purchase_order_id UUID,
    purchase_order_number VARCHAR(100),
    production_order_id UUID,
    production_order_number VARCHAR(100),
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_order_number VARCHAR(100),
    expected_arrival_date DATE,
    actual_arrival_date DATE,
    arrival_time TIME,
    received_date DATE,
    received_time TIME,
    carrier VARCHAR(255),
    carrier_code VARCHAR(100),
    vehicle_number VARCHAR(100),
    driver_name VARCHAR(255),
    driver_phone TEXT,
    total_items INTEGER,
    total_quantity NUMERIC(15, 2),
    received_quantity NUMERIC(15, 2),
    rejected_quantity NUMERIC(15, 2),
    total_weight NUMERIC(15, 2),
    total_volume NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'created',
    receiver VARCHAR(255),
    receiver_id UUID,
    receiving_team VARCHAR(100),
    inspection_required BOOLEAN DEFAULT TRUE,
    inspection_status VARCHAR(20),
    inspection_result VARCHAR(20),
    inspector VARCHAR(255),
    inspection_date DATE,
    quality_check_notes TEXT,
    receiving_notes TEXT,
    special_instructions TEXT,
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inbound_orders_organization_id ON wms.inbound_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_number ON wms.inbound_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_type ON wms.inbound_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_warehouse_id ON wms.inbound_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_status ON wms.inbound_orders(status);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_expected_arrival_date ON wms.inbound_orders(expected_arrival_date);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_actual_arrival_date ON wms.inbound_orders(actual_arrival_date);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_supplier_id ON wms.inbound_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_reference_number ON wms.inbound_orders(reference_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_orders_number_unique ON wms.inbound_orders(order_number, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE wms.inbound_orders IS '入库订单表';
COMMENT ON COLUMN wms.inbound_orders.order_type IS '订单类型：purchase, production_return, customer_return, transfer等';
COMMENT ON COLUMN wms.inbound_orders.status IS '状态：created, confirmed, receiving, received, completed, cancelled等';

-- ============================================
-- 入库订单明细表 (inbound_order_items)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.inbound_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES wms.inbound_orders(id) ON DELETE CASCADE,
    line_number INTEGER,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50),
    specification TEXT,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    expected_quantity NUMERIC(15, 2) NOT NULL,
    received_quantity NUMERIC(15, 2) DEFAULT 0,
    rejected_quantity NUMERIC(15, 2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    location_code VARCHAR(100),
    location_name VARCHAR(255),
    quality_status VARCHAR(20) DEFAULT 'pending',
    production_date DATE,
    expiry_date DATE,
    supplier_batch VARCHAR(100),
    unit_price NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    weight NUMERIC(15, 2),
    volume NUMERIC(15, 2),
    inspection_required BOOLEAN DEFAULT TRUE,
    inspection_status VARCHAR(20),
    inspection_result VARCHAR(20),
    inspector VARCHAR(255),
    inspection_date DATE,
    inspection_notes TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inbound_order_items_organization_id ON wms.inbound_order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inbound_order_items_order_id ON wms.inbound_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inbound_order_items_material_code ON wms.inbound_order_items(material_code);
CREATE INDEX IF NOT EXISTS idx_inbound_order_items_location_id ON wms.inbound_order_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inbound_order_items_quality_status ON wms.inbound_order_items(quality_status);
CREATE INDEX IF NOT EXISTS idx_inbound_order_items_batch_number ON wms.inbound_order_items(batch_number);

COMMENT ON TABLE wms.inbound_order_items IS '入库订单明细表';

-- ============================================
-- 5. 出库订单表 (outbound_orders)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.outbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    reference_type VARCHAR(50),
    warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(255),
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_code VARCHAR(100),
    sales_order_id UUID,
    sales_order_number VARCHAR(100),
    production_order_id UUID,
    production_order_number VARCHAR(100),
    transfer_order_id UUID,
    transfer_order_number VARCHAR(100),
    destination_warehouse_id UUID,
    destination_warehouse_name VARCHAR(255),
    destination_address TEXT,
    expected_ship_date DATE,
    actual_ship_date DATE,
    ship_time TIME,
    delivery_date DATE,
    delivery_time TIME,
    carrier VARCHAR(255),
    carrier_code VARCHAR(100),
    carrier_service VARCHAR(100),
    vehicle_number VARCHAR(100),
    driver_name VARCHAR(255),
    driver_phone TEXT,
    tracking_number VARCHAR(100),
    total_items INTEGER,
    total_quantity NUMERIC(15, 2),
    shipped_quantity NUMERIC(15, 2),
    total_weight NUMERIC(15, 2),
    total_volume NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    shipping_cost NUMERIC(15, 2),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'created',
    picker VARCHAR(255),
    picker_id UUID,
    picking_team VARCHAR(100),
    packer VARCHAR(255),
    packer_id UUID,
    packing_team VARCHAR(100),
    shipper VARCHAR(255),
    shipper_id UUID,
    shipping_team VARCHAR(100),
    picking_method VARCHAR(50),
    packing_method VARCHAR(50),
    shipping_method VARCHAR(50),
    picking_status VARCHAR(20),
    packing_status VARCHAR(20),
    shipping_status VARCHAR(20),
    picking_start_time TIMESTAMPTZ,
    picking_end_time TIMESTAMPTZ,
    packing_start_time TIMESTAMPTZ,
    packing_end_time TIMESTAMPTZ,
    special_instructions TEXT,
    shipping_notes TEXT,
    delivery_notes TEXT,
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbound_orders_organization_id ON wms.outbound_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_number ON wms.outbound_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_type ON wms.outbound_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_warehouse_id ON wms.outbound_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_status ON wms.outbound_orders(status);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_expected_ship_date ON wms.outbound_orders(expected_ship_date);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_actual_ship_date ON wms.outbound_orders(actual_ship_date);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_customer_id ON wms.outbound_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_reference_number ON wms.outbound_orders(reference_number);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_tracking_number ON wms.outbound_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_picking_status ON wms.outbound_orders(picking_status);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_packing_status ON wms.outbound_orders(packing_status);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_shipping_status ON wms.outbound_orders(shipping_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_orders_number_unique ON wms.outbound_orders(order_number, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE wms.outbound_orders IS '出库订单表';
COMMENT ON COLUMN wms.outbound_orders.order_type IS '订单类型：sales, production, transfer, scrap等';
COMMENT ON COLUMN wms.outbound_orders.status IS '状态：created, confirmed, picking, picked, packing, packed, shipping, shipped, delivered, cancelled等';

-- ============================================
-- 出库订单明细表 (outbound_order_items)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.outbound_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES wms.outbound_orders(id) ON DELETE CASCADE,
    line_number INTEGER,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50),
    specification TEXT,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    requested_quantity NUMERIC(15, 2) NOT NULL,
    reserved_quantity NUMERIC(15, 2) DEFAULT 0,
    picked_quantity NUMERIC(15, 2) DEFAULT 0,
    packed_quantity NUMERIC(15, 2) DEFAULT 0,
    shipped_quantity NUMERIC(15, 2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    source_location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    source_location_code VARCHAR(100),
    source_location_name VARCHAR(255),
    destination_location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    destination_location_code VARCHAR(100),
    destination_location_name VARCHAR(255),
    unit_price NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    weight NUMERIC(15, 2),
    volume NUMERIC(15, 2),
    picking_status VARCHAR(20),
    packing_status VARCHAR(20),
    picker VARCHAR(255),
    picking_time TIMESTAMPTZ,
    packer VARCHAR(255),
    packing_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbound_order_items_organization_id ON wms.outbound_order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_outbound_order_items_order_id ON wms.outbound_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_outbound_order_items_material_code ON wms.outbound_order_items(material_code);
CREATE INDEX IF NOT EXISTS idx_outbound_order_items_source_location_id ON wms.outbound_order_items(source_location_id);
CREATE INDEX IF NOT EXISTS idx_outbound_order_items_destination_location_id ON wms.outbound_order_items(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_outbound_order_items_batch_number ON wms.outbound_order_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_outbound_order_items_picking_status ON wms.outbound_order_items(picking_status);

COMMENT ON TABLE wms.outbound_order_items IS '出库订单明细表';

-- ============================================
-- 6. 盘点表 (stock_takes)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.stock_takes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    stock_take_number VARCHAR(100) NOT NULL,
    stock_take_type VARCHAR(50) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(255),
    location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    location_code VARCHAR(100),
    location_name VARCHAR(255),
    material_code VARCHAR(100),
    material_name VARCHAR(255),
    planned_date DATE,
    actual_date DATE,
    start_time TIME,
    end_time TIME,
    planned_by VARCHAR(255),
    planned_by_id UUID,
    executed_by VARCHAR(255),
    executed_by_id UUID,
    team VARCHAR(100),
    total_items INTEGER,
    counted_items INTEGER DEFAULT 0,
    discrepancy_items INTEGER DEFAULT 0,
    total_quantity NUMERIC(15, 2),
    counted_quantity NUMERIC(15, 2),
    discrepancy_quantity NUMERIC(15, 2),
    discrepancy_value NUMERIC(15, 2),
    accuracy_rate NUMERIC(5, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    approval_status VARCHAR(20),
    approved_by VARCHAR(255),
    approved_by_id UUID,
    approval_date DATE,
    approval_notes TEXT,
    adjustment_status VARCHAR(20),
    adjusted_by VARCHAR(255),
    adjusted_by_id UUID,
    adjustment_date DATE,
    adjustment_notes TEXT,
    reason TEXT,
    findings TEXT,
    recommendations TEXT,
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_takes_organization_id ON wms.stock_takes(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_number ON wms.stock_takes(stock_take_number);
CREATE INDEX IF NOT EXISTS idx_stock_takes_type ON wms.stock_takes(stock_take_type);
CREATE INDEX IF NOT EXISTS idx_stock_takes_warehouse_id ON wms.stock_takes(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_location_id ON wms.stock_takes(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_status ON wms.stock_takes(status);
CREATE INDEX IF NOT EXISTS idx_stock_takes_planned_date ON wms.stock_takes(planned_date);
CREATE INDEX IF NOT EXISTS idx_stock_takes_actual_date ON wms.stock_takes(actual_date);
CREATE INDEX IF NOT EXISTS idx_stock_takes_material_code ON wms.stock_takes(material_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_takes_number_unique ON wms.stock_takes(stock_take_number, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE wms.stock_takes IS '盘点表';
COMMENT ON COLUMN wms.stock_takes.stock_take_type IS '盘点类型：full, partial, cycle, spot_check等';
COMMENT ON COLUMN wms.stock_takes.status IS '状态：planned, in_progress, completed, cancelled等';

-- ============================================
-- 盘点明细表 (stock_take_items)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.stock_take_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    stock_take_id UUID NOT NULL REFERENCES wms.stock_takes(id) ON DELETE CASCADE,
    line_number INTEGER,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50),
    specification TEXT,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    location_code VARCHAR(100),
    location_name VARCHAR(255),
    system_quantity NUMERIC(15, 2) NOT NULL,
    counted_quantity NUMERIC(15, 2),
    discrepancy_quantity NUMERIC(15, 2) DEFAULT 0,
    discrepancy_type VARCHAR(20),
    unit VARCHAR(20) NOT NULL,
    unit_price NUMERIC(15, 2),
    discrepancy_value NUMERIC(15, 2),
    quality_status VARCHAR(20),
    counter VARCHAR(255),
    counter_id UUID,
    counting_time TIMESTAMPTZ,
    recount_required BOOLEAN DEFAULT FALSE,
    recount_quantity NUMERIC(15, 2),
    recount_by VARCHAR(255),
    recount_time TIMESTAMPTZ,
    discrepancy_reason VARCHAR(100),
    discrepancy_notes TEXT,
    adjustment_required BOOLEAN DEFAULT FALSE,
    adjustment_quantity NUMERIC(15, 2),
    adjustment_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_take_items_organization_id ON wms.stock_take_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_stock_take_id ON wms.stock_take_items(stock_take_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_material_code ON wms.stock_take_items(material_code);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_location_id ON wms.stock_take_items(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_batch_number ON wms.stock_take_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_discrepancy_type ON wms.stock_take_items(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_recount_required ON wms.stock_take_items(recount_required);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_adjustment_required ON wms.stock_take_items(adjustment_required);

COMMENT ON TABLE wms.stock_take_items IS '盘点明细表';
COMMENT ON COLUMN wms.stock_take_items.discrepancy_type IS '差异类型：over, under, none等';

-- ============================================
-- 7. 转移记录表 (transfers)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    transfer_number VARCHAR(100) NOT NULL,
    transfer_type VARCHAR(50) NOT NULL,
    source_warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    source_warehouse_name VARCHAR(255),
    source_location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    source_location_code VARCHAR(100),
    source_location_name VARCHAR(255),
    destination_warehouse_id UUID NOT NULL REFERENCES wms.warehouses(id) ON DELETE CASCADE,
    destination_warehouse_name VARCHAR(255),
    destination_location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    destination_location_code VARCHAR(100),
    destination_location_name VARCHAR(255),
    reference_number VARCHAR(100),
    reference_type VARCHAR(50),
    planned_date DATE,
    actual_date DATE,
    start_time TIME,
    end_time TIME,
    total_items INTEGER,
    total_quantity NUMERIC(15, 2),
    transferred_quantity NUMERIC(15, 2),
    total_weight NUMERIC(15, 2),
    total_volume NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'created',
    requester VARCHAR(255),
    requester_id UUID,
    request_department VARCHAR(100),
    request_reason TEXT,
    approver VARCHAR(255),
    approver_id UUID,
    approval_status VARCHAR(20),
    approval_date DATE,
    approval_notes TEXT,
    transfer_by VARCHAR(255),
    transfer_by_id UUID,
    transfer_team VARCHAR(100),
    transfer_start_time TIMESTAMPTZ,
    transfer_end_time TIMESTAMPTZ,
    receive_by VARCHAR(255),
    receive_by_id UUID,
    receive_team VARCHAR(100),
    receive_start_time TIMESTAMPTZ,
    receive_end_time TIMESTAMPTZ,
    carrier VARCHAR(255),
    carrier_code VARCHAR(100),
    vehicle_number VARCHAR(100),
    driver_name VARCHAR(255),
    driver_phone TEXT,
    transfer_notes TEXT,
    receive_notes TEXT,
    special_instructions TEXT,
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transfers_organization_id ON wms.transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_number ON wms.transfers(transfer_number);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON wms.transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_transfers_source_warehouse_id ON wms.transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination_warehouse_id ON wms.transfers(destination_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfers_source_location_id ON wms.transfers(source_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination_location_id ON wms.transfers(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON wms.transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_planned_date ON wms.transfers(planned_date);
CREATE INDEX IF NOT EXISTS idx_transfers_actual_date ON wms.transfers(actual_date);
CREATE INDEX IF NOT EXISTS idx_transfers_reference_number ON wms.transfers(reference_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_number_unique ON wms.transfers(transfer_number, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE wms.transfers IS '转移记录表';
COMMENT ON COLUMN wms.transfers.transfer_type IS '转移类型：warehouse_to_warehouse, location_to_location, replenishment等';
COMMENT ON COLUMN wms.transfers.status IS '状态：created, approved, in_transit, received, completed, cancelled等';

-- ============================================
-- 转移明细表 (transfer_items)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    transfer_id UUID NOT NULL REFERENCES wms.transfers(id) ON DELETE CASCADE,
    line_number INTEGER,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50),
    specification TEXT,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    requested_quantity NUMERIC(15, 2) NOT NULL,
    transferred_quantity NUMERIC(15, 2) DEFAULT 0,
    received_quantity NUMERIC(15, 2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    source_location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    source_location_code VARCHAR(100),
    source_location_name VARCHAR(255),
    destination_location_id UUID REFERENCES wms.locations(id) ON DELETE SET NULL,
    destination_location_code VARCHAR(100),
    destination_location_name VARCHAR(255),
    unit_price NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    weight NUMERIC(15, 2),
    volume NUMERIC(15, 2),
    quality_status VARCHAR(20),
    transfer_status VARCHAR(20),
    receive_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_organization_id ON wms.transfer_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer_id ON wms.transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_material_code ON wms.transfer_items(material_code);
CREATE INDEX IF NOT EXISTS idx_transfer_items_source_location_id ON wms.transfer_items(source_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_destination_location_id ON wms.transfer_items(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_batch_number ON wms.transfer_items(batch_number);

COMMENT ON TABLE wms.transfer_items IS '转移明细表';

-- ============================================
-- 8. 审计日志表 (audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS wms.audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON wms.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON wms.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON wms.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON wms.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON wms.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON wms.audit_logs(created_at DESC);

COMMENT ON TABLE wms.audit_logs IS '审计日志表';

-- ============================================
-- 插入默认数据（种子数据）
-- ============================================

-- 插入默认仓库（示例）
INSERT INTO wms.warehouses (id, organization_id, warehouse_code, warehouse_name, warehouse_type, city, province, status)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WH001', '原材料仓库', 'raw_material', '上海', '上海', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WH002', '成品仓库', 'finished_goods', '上海', '上海', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WH003', '半成品仓库', 'semi_finished', '上海', '上海', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'WH004', '备件仓库', 'spare_parts', '上海', '上海', 'active')
ON CONFLICT DO NOTHING;

-- 插入默认库位（示例）
INSERT INTO wms.locations (id, organization_id, warehouse_id, location_code, location_name, location_type, zone, aisle, shelf, level, status)
SELECT
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    w.id,
    l_code,
    l_name,
    l_type,
    zone,
    aisle,
    shelf,
    level,
    'available'
FROM wms.warehouses w,
     (VALUES
        ('A-01-01-01', '库位A-01-01-01', 'storage', 'A', '01', '01', '01'),
        ('A-01-01-02', '库位A-01-01-02', 'storage', 'A', '01', '01', '02'),
        ('A-01-02-01', '库位A-01-02-01', 'storage', 'A', '01', '02', '01'),
        ('B-01-01-01', '库位B-01-01-01', 'picking', 'B', '01', '01', '01'),
        ('B-01-01-02', '库位B-01-01-02', 'picking', 'B', '01', '01', '02')
     ) AS loc(l_code, l_name, l_type, zone, aisle, shelf, level)
WHERE w.warehouse_code IN ('WH001', 'WH002')
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
        SELECT tablename FROM pg_tables WHERE schemaname = 'wms' AND tablename != 'audit_logs'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_trigger ON wms.%I', table_name);
        EXECUTE format('CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', table_name);
    END LOOP;
END;
$$;
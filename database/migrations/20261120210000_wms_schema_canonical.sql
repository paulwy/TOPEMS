-- 20261120210000: wms 31 张运行期表收口（W2-D2 第十个模块）
--
-- 背景：svc/wms/src/schema_defense.rs 的 TABLE_DEFS 声明 33 张表（900 列），
-- 启动时建骨架表并调用 shared-db 的 run_schema_defense 逐列补列。
-- 其中 wms.transfers / wms.transfer_items 已被 20261119100000_drop_dead_tables_batch1
-- 归档删除（运行代码已改用 transfer_orders / transfer_order_items），
-- 但启动期 TABLE_DEFS 把它们按旧定义复活；本迁移不纳入这两张死表。
-- wms.wms_master_data_refs 同样在 batch1 死表清单内，由 server 的
-- default_init_db(with_master_data_refs=true) 运行期重建，已另行移除该调用。
-- 其余 31 张 live 表以真实形状固化；alerts / labor_shifts /
-- purchase_order_snapshots / wms_approval_events 由既有迁移维护、未纳入。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS wms.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    entity_type text,
    entity_id uuid,
    entity_ids jsonb,
    user_name text,
    request_details jsonb,
    response_details jsonb,
    status character varying(32),
    error_message text,
    success boolean,
    action character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    details jsonb,
    ip_address text,
    new_values jsonb,
    old_values jsonb,
    organization_id uuid,
    resource character varying(100),
    resource_id uuid,
    tenant_id uuid,
    user_agent text,
    user_id uuid,
    org_id uuid
);

CREATE TABLE IF NOT EXISTS wms.batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    org_id uuid,
    available_quantity numeric(18,4),
    batch_no text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expiry_date timestamp with time zone,
    location_code character varying(100),
    location_id uuid,
    manufacture_date timestamp with time zone,
    material_name text,
    production_date timestamp with time zone,
    quality_status text,
    quantity numeric(18,4),
    receipt_date timestamp with time zone,
    remaining_days integer,
    remark text,
    shelf_life_days integer,
    sku text,
    specification text,
    status text,
    supplier_id uuid,
    supplier_name character varying(200),
    tenant_id uuid,
    total_value numeric(18,2),
    unit text,
    unit_price numeric(18,4),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(200)
);

CREATE TABLE IF NOT EXISTS wms.cycle_count_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    org_id uuid,
    count_frequency text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    is_active boolean DEFAULT true,
    last_count_date timestamp with time zone,
    location_id uuid,
    material_category text,
    next_count_date timestamp with time zone,
    organization_id uuid NOT NULL,
    priority_level text,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    warehouse_id uuid
);

CREATE TABLE IF NOT EXISTS wms.discrepancy_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    org_id uuid,
    adjustment_date timestamp with time zone,
    adjustment_quantity numeric(15,2),
    adjustment_status text,
    approval_date timestamp with time zone,
    approved_by text,
    approved_by_id uuid,
    counted_quantity numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    discrepancy_quantity numeric(15,2),
    discrepancy_type text,
    inventory_id uuid,
    material_code text,
    material_name text,
    notes text,
    reason text,
    stock_take_id uuid,
    stock_take_item_id uuid,
    system_quantity numeric(15,2),
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS wms.inbound_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    batch_number character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    expected_quantity numeric(15,2) NOT NULL,
    expiry_date date,
    inspection_date date,
    inspection_notes text,
    inspection_required boolean DEFAULT true,
    inspection_result character varying(20),
    inspection_status character varying(20),
    inspector character varying(255),
    line_number integer,
    location_code character varying(100),
    location_id uuid,
    location_name character varying(255),
    lot_number character varying(100),
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    notes text,
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    production_date date,
    quality_status character varying(20) DEFAULT 'pending'::character varying,
    received_quantity numeric(15,2) DEFAULT 0,
    rejected_quantity numeric(15,2) DEFAULT 0,
    serial_number character varying(100),
    specification text,
    supplier_batch character varying(100),
    tenant_id uuid,
    total_value numeric(15,2),
    unit character varying(20) NOT NULL,
    unit_price numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    volume numeric(15,2),
    weight numeric(15,2),
    org_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.inbound_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    order_number character varying(100) NOT NULL,
    order_type character varying(50) NOT NULL,
    reference_number character varying(100),
    reference_type character varying(50),
    warehouse_id uuid,
    warehouse_name character varying(255),
    supplier_id uuid,
    supplier_name character varying(255),
    supplier_code character varying(100),
    purchase_order_id uuid,
    purchase_order_number character varying(100),
    production_order_id uuid,
    production_order_number character varying(100),
    customer_id uuid,
    customer_name character varying(255),
    customer_order_number character varying(100),
    expected_arrival_date timestamp with time zone,
    actual_arrival_date timestamp with time zone,
    arrival_time time without time zone,
    received_date timestamp with time zone,
    received_time time without time zone,
    carrier character varying(255),
    carrier_code character varying(100),
    vehicle_number character varying(100),
    driver_name character varying(255),
    driver_phone text,
    total_items integer,
    total_quantity numeric(15,2),
    received_quantity numeric(15,2),
    rejected_quantity numeric(15,2),
    total_weight numeric(15,2),
    total_volume numeric(15,2),
    total_value numeric(15,2),
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'created'::character varying NOT NULL,
    receiver character varying(255),
    receiver_id uuid,
    receiving_team character varying(100),
    inspection_required boolean DEFAULT true,
    inspection_status character varying(20),
    inspection_result character varying(20),
    inspector character varying(255),
    inspection_date timestamp with time zone,
    quality_check_notes text,
    receiving_notes text,
    special_instructions text,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    order_date timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS wms.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    material_category character varying(50),
    specification text,
    batch_number character varying(100),
    lot_number character varying(100),
    serial_number character varying(100),
    quantity numeric(15,2) NOT NULL,
    unit character varying(20) NOT NULL,
    available_quantity numeric(15,2) NOT NULL,
    reserved_quantity numeric(15,2) DEFAULT 0,
    in_transit_quantity numeric(15,2) DEFAULT 0,
    quality_status character varying(20) DEFAULT 'qualified'::character varying NOT NULL,
    production_date date,
    expiry_date date,
    shelf_life_days integer,
    days_to_expiry integer,
    supplier_id uuid,
    supplier_name character varying(255),
    supplier_code character varying(100),
    purchase_order_number character varying(100),
    purchase_price numeric(15,2),
    total_value numeric(15,2),
    cost_method character varying(20),
    standard_cost numeric(15,2),
    average_cost numeric(15,2),
    last_movement_date timestamp with time zone,
    last_movement_type character varying(50),
    movement_count integer DEFAULT 0,
    min_quantity numeric(15,2),
    max_quantity numeric(15,2),
    reorder_point numeric(15,2),
    reorder_quantity numeric(15,2),
    safety_stock numeric(15,2),
    is_below_min boolean DEFAULT false,
    is_above_max boolean DEFAULT false,
    needs_reorder boolean DEFAULT false,
    weight numeric(15,2),
    volume numeric(15,2),
    special_attributes jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    organization_id uuid,
    org_id uuid
);

CREATE TABLE IF NOT EXISTS wms.inventory_alert_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    rule_id uuid,
    item_id uuid,
    item_code text,
    alert_level text,
    threshold_quantity numeric,
    alert_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    current_quantity numeric(15,2),
    deviation_quantity numeric(15,2),
    inventory_id uuid,
    location_code character varying(100),
    location_id uuid,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    organization_id uuid NOT NULL,
    remarks text,
    severity character varying(20) DEFAULT 'warning'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid,
    threshold_value numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    warehouse_id uuid,
    warehouse_name character varying(255),
    org_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.inventory_alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    alert_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    enabled boolean DEFAULT true NOT NULL,
    material_code character varying(100),
    organization_id uuid NOT NULL,
    remarks text,
    rule_name character varying(255) NOT NULL,
    severity character varying(20) DEFAULT 'warning'::character varying NOT NULL,
    tenant_id uuid,
    threshold_value numeric(15,2) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    warehouse_id uuid,
    org_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movement_no character varying(50) NOT NULL,
    tenant_id uuid NOT NULL,
    movement_type character varying(20) NOT NULL,
    reference_id character varying(100),
    reference_type character varying(50),
    material_id uuid,
    material_code character varying(100),
    material_name character varying(200),
    quantity double precision DEFAULT 0 NOT NULL,
    from_location_id uuid,
    to_location_id uuid,
    from_warehouse_id uuid,
    to_warehouse_id uuid,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    performed_by uuid,
    performed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    org_id uuid,
    aisle character varying(50),
    barcode character varying(100),
    block_reason text,
    capacity numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    current_quantity numeric(15,2) DEFAULT 0,
    current_weight numeric(15,2) DEFAULT 0,
    description text,
    dimensions jsonb,
    humidity_requirement character varying(50),
    is_active boolean DEFAULT true,
    is_blocked boolean DEFAULT false,
    last_inspection_date date,
    level character varying(50),
    location_code text,
    location_name text,
    location_type text,
    max_weight numeric(15,2),
    next_inspection_date date,
    notes text,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000002'::uuid NOT NULL,
    position character varying(50),
    priority integer DEFAULT 0,
    shelf character varying(50),
    special_requirements text,
    status text,
    temperature_requirement character varying(50),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    warehouse_id uuid,
    zone character varying(50),
    address text,
    code character varying(100),
    name character varying(255),
    properties jsonb
);

CREATE TABLE IF NOT EXISTS wms.outbound_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    batch_number character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    destination_location_code character varying(100),
    destination_location_id uuid,
    destination_location_name character varying(255),
    line_number integer,
    lot_number character varying(100),
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    notes text,
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    packed_quantity numeric(15,2) DEFAULT 0,
    packer character varying(255),
    packing_status character varying(20),
    packing_time timestamp with time zone,
    picked_quantity numeric(15,2) DEFAULT 0,
    picker character varying(255),
    picking_status character varying(20),
    picking_time timestamp with time zone,
    requested_quantity numeric(15,2) NOT NULL,
    reserved_quantity numeric(15,2) DEFAULT 0,
    serial_number character varying(100),
    shipped_quantity numeric(15,2) DEFAULT 0,
    source_location_code character varying(100),
    source_location_id uuid,
    source_location_name character varying(255),
    specification text,
    tenant_id uuid,
    total_value numeric(15,2),
    unit character varying(20) NOT NULL,
    unit_price numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    volume numeric(15,2),
    weight numeric(15,2),
    org_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.outbound_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    order_number character varying(100) NOT NULL,
    order_type character varying(50) NOT NULL,
    reference_number character varying(100),
    reference_type character varying(50),
    warehouse_id uuid NOT NULL,
    warehouse_name character varying(255),
    customer_id uuid,
    customer_name character varying(255),
    customer_code character varying(100),
    sales_order_id uuid,
    sales_order_number character varying(100),
    production_order_id uuid,
    production_order_number character varying(100),
    transfer_order_id uuid,
    transfer_order_number character varying(100),
    destination_warehouse_id uuid,
    destination_warehouse_name character varying(255),
    destination_address text,
    expected_ship_date timestamp with time zone,
    actual_ship_date timestamp with time zone,
    ship_time time without time zone,
    delivery_date date,
    delivery_time time without time zone,
    carrier character varying(255),
    carrier_code character varying(100),
    carrier_service character varying(100),
    vehicle_number character varying(100),
    driver_name character varying(255),
    driver_phone text,
    tracking_number character varying(100),
    total_items integer,
    total_quantity numeric(15,2),
    shipped_quantity numeric(15,2),
    total_weight numeric(15,2),
    total_volume numeric(15,2),
    total_value numeric(15,2),
    shipping_cost numeric(15,2),
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'created'::character varying NOT NULL,
    picker character varying(255),
    picker_id uuid,
    picking_team character varying(100),
    packer character varying(255),
    packer_id uuid,
    packing_team character varying(100),
    shipper character varying(255),
    shipper_id uuid,
    shipping_team character varying(100),
    picking_method character varying(50),
    packing_method character varying(50),
    shipping_method character varying(50),
    picking_status character varying(20),
    packing_status character varying(20),
    shipping_status character varying(20),
    picking_start_time timestamp with time zone,
    picking_end_time timestamp with time zone,
    packing_start_time timestamp with time zone,
    packing_end_time timestamp with time zone,
    special_instructions text,
    shipping_notes text,
    delivery_notes text,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    picked_quantity integer DEFAULT 0,
    packed_quantity integer DEFAULT 0,
    approved_by uuid,
    approved_at timestamp with time zone,
    is_synced_to_crm boolean DEFAULT false NOT NULL,
    organization_id uuid NOT NULL,
    order_date timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.replenishment_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    line_number integer NOT NULL,
    sku character varying(100) NOT NULL,
    material_name character varying(200) NOT NULL,
    specification character varying(200),
    unit character varying(50) NOT NULL,
    quantity bigint DEFAULT 0 NOT NULL,
    unit_price numeric(18,4),
    total_amount numeric(18,4),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS wms.replenishment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(200),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_quantity bigint DEFAULT 0,
    total_amount numeric(18,4) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS wms.replenishment_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name character varying(200) NOT NULL,
    rule_type character varying(50) DEFAULT 'custom'::character varying NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(200),
    material_category character varying(100),
    material_code character varying(100),
    safety_stock numeric(18,4),
    reorder_point numeric(18,4),
    max_stock numeric(18,4),
    safety_factor numeric(10,4),
    lead_time_days integer,
    consumption_days integer,
    enabled boolean DEFAULT true NOT NULL,
    priority_order integer DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS wms.replenishment_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    suggestion_number text,
    material_code text,
    material_name text,
    specification text,
    unit text,
    warehouse_id uuid,
    location_id uuid,
    current_stock numeric(18,4),
    available_stock numeric(18,4),
    safety_stock numeric(18,4),
    reorder_point numeric(18,4),
    max_stock numeric(18,4),
    suggested_quantity numeric(18,4),
    consumption_rate numeric(18,4),
    lead_time_days integer,
    trigger_type text,
    priority text,
    status text,
    supplier_id uuid,
    supplier_name text,
    warehouse_name text,
    remarks text,
    org_id uuid,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.safety_stock_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(200),
    material_code character varying(100) NOT NULL,
    material_name character varying(200) NOT NULL,
    specification character varying(200),
    safety_stock numeric(18,4) DEFAULT 0,
    reorder_point numeric(18,4) DEFAULT 0,
    max_stock numeric(18,4),
    safety_factor numeric(10,4),
    lead_time_days integer,
    consumption_days integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS wms.serial_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    serial_no character varying(100) NOT NULL,
    sku character varying(100) NOT NULL,
    material_name character varying(200) NOT NULL,
    specification character varying(200),
    unit character varying(50),
    warehouse_id uuid NOT NULL,
    warehouse_name character varying(200),
    location_id uuid,
    location_code character varying(100),
    supplier_id uuid,
    supplier_name character varying(200),
    batch_no character varying(100),
    production_date date,
    expiry_date date,
    quality_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    status character varying(50) DEFAULT 'in_stock'::character varying NOT NULL,
    warranty_start_date date,
    warranty_end_date date,
    inbound_order_no character varying(100),
    outbound_order_no character varying(100),
    current_owner character varying(200),
    unit_price numeric(18,4),
    remark text,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.slotting_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    warehouse_id uuid NOT NULL,
    rule_type character varying(50) DEFAULT 'velocity_class'::character varying NOT NULL,
    priority integer DEFAULT 10 NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.slotting_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    warehouse_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(100) DEFAULT ''::character varying NOT NULL,
    material_name character varying(255) DEFAULT ''::character varying NOT NULL,
    current_location_id uuid,
    suggested_location_id uuid,
    suggested_location_name character varying(255),
    reason text DEFAULT ''::text NOT NULL,
    score numeric(8,4) DEFAULT 0 NOT NULL,
    expected_improvement numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.slotting_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    warehouse_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    zone_type character varying(50) DEFAULT 'bulk'::character varying NOT NULL,
    location_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS wms.stock_take_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    status character varying,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    org_id uuid,
    adjustment_quantity numeric(15,2),
    adjustment_required boolean DEFAULT false,
    adjustment_status text,
    batch_number text,
    counted_quantity numeric(15,2),
    counter character varying(255),
    counter_id uuid,
    counting_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    discrepancy_notes text,
    discrepancy_quantity numeric(15,2),
    discrepancy_reason text,
    discrepancy_type text,
    discrepancy_value numeric(15,2),
    line_number integer,
    location_code character varying(100),
    location_id uuid,
    location_name character varying(255),
    lot_number character varying(100),
    material_code text,
    material_name text,
    material_type character varying(50),
    notes text,
    quality_status text,
    recount_by character varying(255),
    recount_quantity numeric(15,2),
    recount_required boolean DEFAULT false,
    recount_time timestamp with time zone,
    serial_number character varying(100),
    specification text,
    stock_take_id uuid,
    system_quantity numeric(15,2),
    tenant_id uuid,
    unit text,
    unit_price numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS wms.stock_takes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    remarks text,
    tenant_id uuid,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    accuracy_rate numeric(5,2),
    actual_date timestamp with time zone,
    adjusted_by text,
    adjusted_by_id uuid,
    adjustment_date timestamp with time zone,
    adjustment_notes text,
    adjustment_status text,
    approval_date date,
    approval_notes text,
    approval_status character varying(20),
    approved_by character varying(255),
    approved_by_id uuid,
    attachments jsonb,
    counted_items integer,
    counted_quantity numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    discrepancy_items integer,
    discrepancy_quantity numeric(15,2),
    discrepancy_value numeric(15,2),
    end_time time without time zone,
    executed_by character varying(255),
    executed_by_id uuid,
    findings text,
    location_code text,
    location_id uuid,
    location_name character varying(255),
    material_category text,
    material_code text,
    material_name text,
    notes text,
    planned_by text,
    planned_by_id uuid,
    planned_date timestamp with time zone,
    reason text,
    recommendations text,
    start_time time without time zone,
    status text,
    stock_take_number text,
    stock_take_type text,
    team character varying(100),
    total_items integer,
    total_quantity numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    warehouse_id uuid,
    warehouse_name text
);

CREATE TABLE IF NOT EXISTS wms.sync_record_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_record_id uuid NOT NULL,
    record_id character varying(100),
    record_type character varying(50),
    record_name character varying(200),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    source_data jsonb,
    target_data jsonb,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_no character varying(50) NOT NULL,
    source_system character varying(50) NOT NULL,
    target_system character varying(50) NOT NULL,
    sync_type character varying(50) NOT NULL,
    sync_direction character varying(20) DEFAULT 'push'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    skipped_count integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    error_message text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.transfer_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    line_number integer NOT NULL,
    sku character varying(100) NOT NULL,
    material_name character varying(200) NOT NULL,
    specification character varying(200),
    batch_number character varying(100),
    unit character varying(50) NOT NULL,
    planned_quantity bigint DEFAULT 0 NOT NULL,
    shipped_quantity bigint DEFAULT 0 NOT NULL,
    received_quantity bigint DEFAULT 0 NOT NULL,
    unit_price numeric(18,4),
    total_amount numeric(18,4),
    from_location_id uuid,
    to_location_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    item_id uuid,
    item_code text,
    item_name text,
    quantity numeric DEFAULT 0,
    order_number text,
    transfer_no text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.transfer_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    from_warehouse_id uuid NOT NULL,
    from_warehouse_name character varying(200),
    from_location_id uuid,
    from_location_code character varying(100),
    to_warehouse_id uuid NOT NULL,
    to_warehouse_name character varying(200),
    to_location_id uuid,
    to_location_code character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_quantity bigint DEFAULT 0,
    total_amount numeric(18,4),
    planned_date date,
    actual_date date,
    transporter character varying(200),
    tracking_number character varying(100),
    priority character varying(20) DEFAULT 'normal'::character varying,
    remarks text,
    created_by character varying(100),
    approved_by character varying(100),
    approved_at timestamp with time zone,
    shipped_by character varying(100),
    shipped_at timestamp with time zone,
    received_by character varying(100),
    received_at timestamp with time zone,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    transfer_type character varying(50) DEFAULT 'inter_warehouse'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.warehouses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name text,
    warehouse_name_en character varying(255),
    org_id uuid,
    address text,
    city character varying(100),
    contact_email text,
    contact_person character varying(255),
    contact_phone text,
    country character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    current_capacity numeric(15,2),
    department character varying(100),
    description text,
    humidity_max numeric(5,2),
    humidity_min numeric(5,2),
    is_humidity_controlled boolean DEFAULT false,
    is_temperature_controlled boolean DEFAULT false,
    last_inspection_date date,
    manager text,
    manager_id uuid,
    next_inspection_date date,
    notes text,
    operating_hours jsonb,
    organization_id uuid,
    postal_code character varying(20),
    province character varying(100),
    security_level character varying(20),
    status text,
    temperature_max numeric(5,2),
    temperature_min numeric(5,2),
    tenant_id uuid,
    total_area numeric(15,2),
    total_capacity numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    usable_area numeric(15,2),
    utilization_rate numeric(5,2),
    warehouse_code text,
    warehouse_name text,
    warehouse_type character varying(50)
);

CREATE TABLE IF NOT EXISTS wms.wave_pick_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    location_code character varying(100),
    location_id uuid,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    organization_id uuid NOT NULL,
    outbound_order_id uuid,
    outbound_order_number character varying(100),
    picked_quantity numeric(15,2) DEFAULT 0 NOT NULL,
    planned_quantity numeric(15,2) DEFAULT 0 NOT NULL,
    remarks text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    wave_pick_id uuid NOT NULL,
    org_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.wave_picks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    assigned_to uuid,
    assigned_user_name character varying(255),
    batch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    end_time timestamp with time zone,
    organization_id uuid NOT NULL,
    picked_items bigint DEFAULT 0 NOT NULL,
    picked_quantity numeric(15,2) DEFAULT 0 NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    remarks text,
    start_time timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid,
    total_items bigint DEFAULT 0 NOT NULL,
    total_quantity numeric(15,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    warehouse_id uuid NOT NULL,
    warehouse_name character varying(255),
    wave_pick_number character varying(100) NOT NULL,
    wave_pick_type character varying(50) DEFAULT 'standard'::character varying NOT NULL,
    org_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbound_orders_order_date ON wms.inbound_orders USING btree (order_date);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_warehouse_id ON wms.inbound_orders USING btree (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON wms.inventory USING btree (location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON wms.inventory USING btree (warehouse_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_material_batch ON wms.inventory USING btree (organization_id, material_code, batch_number);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_warehouse_id ON wms.outbound_orders USING btree (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfer_order_items_transfer_id ON wms.transfer_order_items USING btree (transfer_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.audit_logs'::regclass AND conname='audit_logs_pkey') THEN
        ALTER TABLE wms.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.batches'::regclass AND conname='batches_pkey') THEN
        ALTER TABLE wms.batches ADD CONSTRAINT "batches_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.cycle_count_configs'::regclass AND conname='cycle_count_configs_pkey') THEN
        ALTER TABLE wms.cycle_count_configs ADD CONSTRAINT "cycle_count_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.discrepancy_records'::regclass AND conname='discrepancy_records_pkey') THEN
        ALTER TABLE wms.discrepancy_records ADD CONSTRAINT "discrepancy_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.inbound_order_items'::regclass AND conname='inbound_order_items_pkey') THEN
        ALTER TABLE wms.inbound_order_items ADD CONSTRAINT "inbound_order_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.inbound_orders'::regclass AND conname='inbound_orders_pkey') THEN
        ALTER TABLE wms.inbound_orders ADD CONSTRAINT "inbound_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.inventory'::regclass AND conname='inventory_pkey') THEN
        ALTER TABLE wms.inventory ADD CONSTRAINT "inventory_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.inventory_alert_records'::regclass AND conname='inventory_alert_records_pkey') THEN
        ALTER TABLE wms.inventory_alert_records ADD CONSTRAINT "inventory_alert_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.inventory_alert_rules'::regclass AND conname='inventory_alert_rules_pkey') THEN
        ALTER TABLE wms.inventory_alert_rules ADD CONSTRAINT "inventory_alert_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.inventory_movements'::regclass AND conname='inventory_movements_pkey') THEN
        ALTER TABLE wms.inventory_movements ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.locations'::regclass AND conname='locations_pkey') THEN
        ALTER TABLE wms.locations ADD CONSTRAINT "locations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.outbound_order_items'::regclass AND conname='outbound_order_items_pkey') THEN
        ALTER TABLE wms.outbound_order_items ADD CONSTRAINT "outbound_order_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.outbound_orders'::regclass AND conname='outbound_orders_pkey') THEN
        ALTER TABLE wms.outbound_orders ADD CONSTRAINT "outbound_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.replenishment_order_items'::regclass AND conname='replenishment_order_items_pkey') THEN
        ALTER TABLE wms.replenishment_order_items ADD CONSTRAINT "replenishment_order_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.replenishment_orders'::regclass AND conname='replenishment_orders_pkey') THEN
        ALTER TABLE wms.replenishment_orders ADD CONSTRAINT "replenishment_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.replenishment_rules'::regclass AND conname='replenishment_rules_pkey') THEN
        ALTER TABLE wms.replenishment_rules ADD CONSTRAINT "replenishment_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.replenishment_suggestions'::regclass AND conname='replenishment_suggestions_pkey') THEN
        ALTER TABLE wms.replenishment_suggestions ADD CONSTRAINT "replenishment_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.safety_stock_settings'::regclass AND conname='safety_stock_settings_pkey') THEN
        ALTER TABLE wms.safety_stock_settings ADD CONSTRAINT "safety_stock_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.serial_numbers'::regclass AND conname='serial_numbers_pkey') THEN
        ALTER TABLE wms.serial_numbers ADD CONSTRAINT "serial_numbers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.slotting_rules'::regclass AND conname='slotting_rules_pkey') THEN
        ALTER TABLE wms.slotting_rules ADD CONSTRAINT "slotting_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.slotting_suggestions'::regclass AND conname='slotting_suggestions_pkey') THEN
        ALTER TABLE wms.slotting_suggestions ADD CONSTRAINT "slotting_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.slotting_zones'::regclass AND conname='slotting_zones_pkey') THEN
        ALTER TABLE wms.slotting_zones ADD CONSTRAINT "slotting_zones_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.stock_take_items'::regclass AND conname='stock_take_items_pkey') THEN
        ALTER TABLE wms.stock_take_items ADD CONSTRAINT "stock_take_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.stock_takes'::regclass AND conname='stock_takes_pkey') THEN
        ALTER TABLE wms.stock_takes ADD CONSTRAINT "stock_takes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.sync_record_details'::regclass AND conname='sync_record_details_pkey') THEN
        ALTER TABLE wms.sync_record_details ADD CONSTRAINT "sync_record_details_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.sync_records'::regclass AND conname='sync_records_pkey') THEN
        ALTER TABLE wms.sync_records ADD CONSTRAINT "sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.transfer_order_items'::regclass AND conname='transfer_order_items_pkey') THEN
        ALTER TABLE wms.transfer_order_items ADD CONSTRAINT "transfer_order_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.transfer_orders'::regclass AND conname='transfer_orders_pkey') THEN
        ALTER TABLE wms.transfer_orders ADD CONSTRAINT "transfer_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.warehouses'::regclass AND conname='warehouses_pkey') THEN
        ALTER TABLE wms.warehouses ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.wave_pick_items'::regclass AND conname='wave_pick_items_pkey') THEN
        ALTER TABLE wms.wave_pick_items ADD CONSTRAINT "wave_pick_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wms.wave_picks'::regclass AND conname='wave_picks_pkey') THEN
        ALTER TABLE wms.wave_picks ADD CONSTRAINT "wave_picks_pkey" PRIMARY KEY (id);
    END IF;
END $$;


ALTER TABLE wms.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.batches FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.cycle_count_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.cycle_count_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.discrepancy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.discrepancy_records FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.inbound_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inbound_order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.inbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inbound_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory_alert_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory_alert_records FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory_alert_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.locations FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.outbound_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.outbound_order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.outbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.outbound_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.replenishment_suggestions FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.safety_stock_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.safety_stock_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.serial_numbers FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_suggestions FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.slotting_zones FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.stock_take_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.stock_take_items FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.stock_takes FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.sync_record_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.sync_record_details FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.sync_records FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.transfer_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.transfer_order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.transfer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.transfer_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.warehouses FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.wave_pick_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.wave_pick_items FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.wave_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.wave_picks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.audit_logs;
CREATE POLICY "rls_tenant_isolation" ON wms.audit_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.batches;
CREATE POLICY "rls_tenant_isolation" ON wms.batches AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.cycle_count_configs;
CREATE POLICY "rls_tenant_isolation" ON wms.cycle_count_configs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.discrepancy_records;
CREATE POLICY "rls_tenant_isolation" ON wms.discrepancy_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.inbound_order_items;
CREATE POLICY "rls_tenant_isolation" ON wms.inbound_order_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.inbound_orders;
CREATE POLICY "rls_tenant_isolation" ON wms.inbound_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.inventory;
CREATE POLICY "rls_tenant_isolation" ON wms.inventory AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.inventory_alert_records;
CREATE POLICY "rls_tenant_isolation" ON wms.inventory_alert_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.inventory_alert_rules;
CREATE POLICY "rls_tenant_isolation" ON wms.inventory_alert_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.inventory_movements;
CREATE POLICY "rls_tenant_isolation" ON wms.inventory_movements AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.locations;
CREATE POLICY "rls_tenant_isolation" ON wms.locations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.outbound_order_items;
CREATE POLICY "rls_tenant_isolation" ON wms.outbound_order_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.outbound_orders;
CREATE POLICY "rls_tenant_isolation" ON wms.outbound_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.replenishment_order_items;
CREATE POLICY "rls_tenant_isolation" ON wms.replenishment_order_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.replenishment_orders;
CREATE POLICY "rls_tenant_isolation" ON wms.replenishment_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.replenishment_rules;
CREATE POLICY "rls_tenant_isolation" ON wms.replenishment_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.replenishment_suggestions;
CREATE POLICY "rls_tenant_isolation" ON wms.replenishment_suggestions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.safety_stock_settings;
CREATE POLICY "rls_tenant_isolation" ON wms.safety_stock_settings AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.serial_numbers;
CREATE POLICY "rls_tenant_isolation" ON wms.serial_numbers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.slotting_rules;
CREATE POLICY "rls_tenant_isolation" ON wms.slotting_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.slotting_suggestions;
CREATE POLICY "rls_tenant_isolation" ON wms.slotting_suggestions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.slotting_zones;
CREATE POLICY "rls_tenant_isolation" ON wms.slotting_zones AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.stock_take_items;
CREATE POLICY "rls_tenant_isolation" ON wms.stock_take_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.stock_takes;
CREATE POLICY "rls_tenant_isolation" ON wms.stock_takes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.sync_record_details;
CREATE POLICY "rls_tenant_isolation" ON wms.sync_record_details AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.sync_records;
CREATE POLICY "rls_tenant_isolation" ON wms.sync_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.transfer_order_items;
CREATE POLICY "rls_tenant_isolation" ON wms.transfer_order_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.transfer_orders;
CREATE POLICY "rls_tenant_isolation" ON wms.transfer_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.warehouses;
CREATE POLICY "rls_tenant_isolation" ON wms.warehouses AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.wave_pick_items;
CREATE POLICY "rls_tenant_isolation" ON wms.wave_pick_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON wms.wave_picks;
CREATE POLICY "rls_tenant_isolation" ON wms.wave_picks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

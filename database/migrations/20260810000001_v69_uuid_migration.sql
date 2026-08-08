-- V69.0 P3-1: VARCHAR(36) → UUID migration
-- Converge 12 VARCHAR(36) columns across 6 tables in 3 services to native UUID type
-- All FK-like columns have no actual FK constraints (logical FKs only)

-- Phase 1: Data quality pre-check — clean empty strings in audit_logs.user_id
-- (middleware fallback produces "" when no user extension is present)
UPDATE audit_logs SET user_id = NULL WHERE user_id = '';

-- Phase 2: mobile tables — PK columns
ALTER TABLE mobile.mobile_attendance ALTER COLUMN id TYPE UUID USING id::UUID;
ALTER TABLE mobile.mobile_leave_applications ALTER COLUMN id TYPE UUID USING id::UUID;

-- Phase 3: wms.serial_numbers — FK-like columns
ALTER TABLE wms.serial_numbers ALTER COLUMN warehouse_id TYPE UUID USING warehouse_id::UUID;
ALTER TABLE wms.serial_numbers ALTER COLUMN location_id TYPE UUID USING location_id::UUID;
ALTER TABLE wms.serial_numbers ALTER COLUMN supplier_id TYPE UUID USING supplier_id::UUID;

-- Phase 4: wms.transfer_orders — FK-like columns
ALTER TABLE wms.transfer_orders ALTER COLUMN from_warehouse_id TYPE UUID USING from_warehouse_id::UUID;
ALTER TABLE wms.transfer_orders ALTER COLUMN from_location_id TYPE UUID USING from_location_id::UUID;
ALTER TABLE wms.transfer_orders ALTER COLUMN to_warehouse_id TYPE UUID USING to_warehouse_id::UUID;
ALTER TABLE wms.transfer_orders ALTER COLUMN to_location_id TYPE UUID USING to_location_id::UUID;

-- Phase 5: wms.transfer_order_items — FK-like columns
ALTER TABLE wms.transfer_order_items ALTER COLUMN from_location_id TYPE UUID USING from_location_id::UUID;
ALTER TABLE wms.transfer_order_items ALTER COLUMN to_location_id TYPE UUID USING to_location_id::UUID;

-- Phase 6: audit_logs — user_id column
ALTER TABLE audit_logs ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

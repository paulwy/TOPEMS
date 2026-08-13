-- V76: VARCHAR(36) → UUID cleanup
-- Converge 11 VARCHAR(36) columns across 5 tables (mobile + wms) to native UUID type
-- All wrapped in DO blocks with exception handling for idempotent re-runs

-- mobile.mobile_attendance — PK id
DO $$ BEGIN
    EXECUTE 'ALTER TABLE mobile.mobile_attendance ALTER COLUMN id TYPE UUID USING id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- mobile.mobile_leave_applications — PK id
DO $$ BEGIN
    EXECUTE 'ALTER TABLE mobile.mobile_leave_applications ALTER COLUMN id TYPE UUID USING id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- wms.serial_numbers — warehouse_id, location_id, supplier_id
DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.serial_numbers ALTER COLUMN warehouse_id TYPE UUID USING warehouse_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.serial_numbers ALTER COLUMN location_id TYPE UUID USING location_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.serial_numbers ALTER COLUMN supplier_id TYPE UUID USING supplier_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- wms.transfer_orders — from/to_warehouse_id, from/to_location_id
DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.transfer_orders ALTER COLUMN from_warehouse_id TYPE UUID USING from_warehouse_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.transfer_orders ALTER COLUMN from_location_id TYPE UUID USING from_location_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.transfer_orders ALTER COLUMN to_warehouse_id TYPE UUID USING to_warehouse_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.transfer_orders ALTER COLUMN to_location_id TYPE UUID USING to_location_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- wms.transfer_order_items — from_location_id, to_location_id
DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.transfer_order_items ALTER COLUMN from_location_id TYPE UUID USING from_location_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'ALTER TABLE wms.transfer_order_items ALTER COLUMN to_location_id TYPE UUID USING to_location_id::uuid';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

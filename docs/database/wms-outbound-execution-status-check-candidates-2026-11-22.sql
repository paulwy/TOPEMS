-- B123 出库执行阶段状态约束候选
-- 目标：wms.outbound_orders.picking_status / packing_status / shipping_status
-- 现状（2026-11-22 实测）：本地与生产快照均 0 行；三列 nullable、无默认、无 CHECK；
-- 本候选统一为 pending / in_progress / completed，并补默认与非空约束。
-- 约束一律 NOT VALID，待本地演练与业务确认后在目标库执行。

BEGIN;

ALTER TABLE wms.outbound_orders
    DROP CONSTRAINT IF EXISTS ck_outbound_orders_picking_status_standard,
    DROP CONSTRAINT IF EXISTS ck_outbound_orders_packing_status_standard,
    DROP CONSTRAINT IF EXISTS ck_outbound_orders_shipping_status_standard;

ALTER TABLE wms.outbound_orders
    ALTER COLUMN picking_status SET DEFAULT 'pending',
    ALTER COLUMN packing_status SET DEFAULT 'pending',
    ALTER COLUMN shipping_status SET DEFAULT 'pending';

UPDATE wms.outbound_orders
SET picking_status = 'pending'
WHERE picking_status IS NULL;

UPDATE wms.outbound_orders
SET packing_status = 'pending'
WHERE packing_status IS NULL;

UPDATE wms.outbound_orders
SET shipping_status = 'pending'
WHERE shipping_status IS NULL;

ALTER TABLE wms.outbound_orders
    ALTER COLUMN picking_status SET NOT NULL,
    ALTER COLUMN packing_status SET NOT NULL,
    ALTER COLUMN shipping_status SET NOT NULL;

ALTER TABLE wms.outbound_orders
    ADD CONSTRAINT ck_outbound_orders_picking_status_standard
        CHECK (picking_status IN ('pending', 'in_progress', 'completed')) NOT VALID,
    ADD CONSTRAINT ck_outbound_orders_packing_status_standard
        CHECK (packing_status IN ('pending', 'in_progress', 'completed')) NOT VALID,
    ADD CONSTRAINT ck_outbound_orders_shipping_status_standard
        CHECK (shipping_status IN ('pending', 'in_progress', 'completed')) NOT VALID;

COMMIT;

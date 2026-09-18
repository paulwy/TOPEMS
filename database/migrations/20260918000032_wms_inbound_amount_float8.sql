-- TOPEMS database migration 20260918000032
-- wms.inbound_orders：org_id NOT NULL 但代码 INSERT 未填（设默认值兜底）；
-- 6 个 numeric 量列改 double precision 对齐代码 Option<f64>（有数据时 sqlx decode 会炸）。

ALTER TABLE wms.inbound_orders ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE wms.inbound_orders ALTER COLUMN total_quantity TYPE double precision;
ALTER TABLE wms.inbound_orders ALTER COLUMN received_quantity TYPE double precision;
ALTER TABLE wms.inbound_orders ALTER COLUMN rejected_quantity TYPE double precision;
ALTER TABLE wms.inbound_orders ALTER COLUMN total_weight TYPE double precision;
ALTER TABLE wms.inbound_orders ALTER COLUMN total_volume TYPE double precision;
ALTER TABLE wms.inbound_orders ALTER COLUMN total_value TYPE double precision;

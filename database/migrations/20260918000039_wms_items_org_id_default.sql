-- TOPEMS database migration 20260918000039
-- wms.inbound_order_items.org_id NOT NULL 无默认，但 create item INSERT 只填 organization_id 未填 org_id
-- （同 000032 对 inbound_orders 的处理）：设默认单租户 org_id，幂等。

ALTER TABLE wms.inbound_order_items
    ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

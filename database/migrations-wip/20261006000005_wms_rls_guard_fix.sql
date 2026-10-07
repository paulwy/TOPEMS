-- 清理 wms schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS batches_tenant_policy ON wms.batches;
DROP POLICY IF EXISTS inventory_tenant_policy ON wms.inventory;
DROP POLICY IF EXISTS inbound_orders_tenant_policy ON wms.inbound_orders;
DROP POLICY IF EXISTS inbound_order_items_tenant_policy ON wms.inbound_order_items;
DROP POLICY IF EXISTS outbound_order_items_tenant_policy ON wms.outbound_order_items;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON wms.audit_logs;
DROP POLICY IF EXISTS cycle_count_configs_tenant_policy ON wms.cycle_count_configs;
DROP POLICY IF EXISTS discrepancy_records_tenant_policy ON wms.discrepancy_records;
DROP POLICY IF EXISTS inventory_alert_rules_tenant_policy ON wms.inventory_alert_rules;
DROP POLICY IF EXISTS inventory_alert_records_tenant_policy ON wms.inventory_alert_records;
DROP POLICY IF EXISTS wave_picks_tenant_policy ON wms.wave_picks;
DROP POLICY IF EXISTS wave_pick_items_tenant_policy ON wms.wave_pick_items;
DROP POLICY IF EXISTS transfers_tenant_policy ON wms.transfers;
DROP POLICY IF EXISTS transfer_orders_tenant_policy ON wms.transfer_orders;
DROP POLICY IF EXISTS warehouses_tenant_policy ON wms.warehouses;
DROP POLICY IF EXISTS serial_numbers_tenant_policy ON wms.serial_numbers;
DROP POLICY IF EXISTS locations_tenant_policy ON wms.locations;
DROP POLICY IF EXISTS outbound_orders_tenant_policy ON wms.outbound_orders;
DROP POLICY IF EXISTS stock_takes_tenant_policy ON wms.stock_takes;
DROP POLICY IF EXISTS stock_take_items_tenant_policy ON wms.stock_take_items;
DROP POLICY IF EXISTS transfer_items_tenant_policy ON wms.transfer_items;
DROP POLICY IF EXISTS transfer_order_items_tenant_policy ON wms.transfer_order_items;

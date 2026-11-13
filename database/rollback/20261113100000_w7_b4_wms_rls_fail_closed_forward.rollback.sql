-- ============================================================
-- 回滚：20261113100000_w7_b4_wms_rls_fail_closed_forward.sql
--       （前向承接 20261112105000_w7_b4_wms_rls_fail_closed.sql）
--
-- 口径：精确退回生产基线 fail-open
--       （生产基线 w7_s1_txn：wms 表 39 / 带 tenant_id 表 37 / 策略 42 /
--        USING true 且 WITH CHECK true 的策略 16 / RLS 开启 37 / FORCE 37）。
--       逐表恢复 RLS 开关、FORCE 状态与策略集合，四项指标与基线逐项相等。
--   1. 先 DROP 每张 wms 表的全部当前策略（含 rls_tenant_isolation）；
--   2. 按下方静态快照重建 42 条原策略（permissive / ALL / PUBLIC，USING 与 WITH CHECK 原值）；
--   3. safety_stock_settings：基线为 RLS 关闭 / 无 FORCE / 0 策略，
--      回滚逐项恢复为 DISABLE ROW LEVEL SECURITY + NO FORCE + 0 策略；
--   4. schema_defense_ledger：基线同为 RLS 关闭 / 无 FORCE / 0 策略，
--      回滚同样恢复为 DISABLE ROW LEVEL SECURITY + NO FORCE + 0 策略；
--   5. 其余 37 张表：逐表 ENABLE + FORCE ROW LEVEL SECURITY。
--
-- 用于生产急停（必须带 --single-transaction：脚本本身不发 BEGIN/COMMIT，
-- 由 psql 把整份文件包成单事务；任一步失败即整体回退，不留半套策略）：
--   psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 \
--     -f database/rollback/20261113100000_w7_b4_wms_rls_fail_closed_forward.rollback.sql
--
-- 注意：快照取自生产基线。若目标库 wms_master_data_refs 已有 tenant_id 等历史漂移，
--       本脚本只恢复基线中的 42 条策略，漂移策略不会重建（先人工核对 pg_policies）。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- ---------- 1. 清空当前策略 ----------
DO $w7b4wms_rb_clear$
DECLARE
    t record;
    pol record;
BEGIN
    FOR t IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'wms' AND c.relkind = 'r'
         ORDER BY c.relname
    LOOP
        FOR pol IN
            SELECT policyname FROM pg_policies
             WHERE schemaname = 'wms' AND tablename = t.relname
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON wms.%I', pol.policyname, t.relname);
        END LOOP;
    END LOOP;
    RAISE NOTICE 'B4-WMS 回滚：已清空 wms 当前策略';
END
$w7b4wms_rb_clear$;

-- ---------- 2. 重建原策略（生产基线快照，42 条） ----------
DROP POLICY IF EXISTS tenant_isolation_alerts ON wms.alerts;
CREATE POLICY tenant_isolation_alerts ON wms.alerts FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

DROP POLICY IF EXISTS wms_allow_all_audit_logs ON wms.audit_logs;
CREATE POLICY wms_allow_all_audit_logs ON wms.audit_logs FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_batches ON wms.batches;
CREATE POLICY wms_allow_all_batches ON wms.batches FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_cycle_count_configs ON wms.cycle_count_configs;
CREATE POLICY wms_allow_all_cycle_count_configs ON wms.cycle_count_configs FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_discrepancy_records ON wms.discrepancy_records;
CREATE POLICY wms_allow_all_discrepancy_records ON wms.discrepancy_records FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_inbound_order_items ON wms.inbound_order_items;
CREATE POLICY wms_allow_all_inbound_order_items ON wms.inbound_order_items FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation_inbound_orders ON wms.inbound_orders;
CREATE POLICY tenant_isolation_inbound_orders ON wms.inbound_orders FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.inventory;
CREATE POLICY rls_tenant_isolation ON wms.inventory FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS tenant_isolation_inventory ON wms.inventory;
CREATE POLICY tenant_isolation_inventory ON wms.inventory FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS wms_allow_all_inventory_alert_records ON wms.inventory_alert_records;
CREATE POLICY wms_allow_all_inventory_alert_records ON wms.inventory_alert_records FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_inventory_alert_rules ON wms.inventory_alert_rules;
CREATE POLICY wms_allow_all_inventory_alert_rules ON wms.inventory_alert_rules FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.inventory_movements;
CREATE POLICY rls_tenant_isolation ON wms.inventory_movements FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS tenant_isolation_inventory_movements ON wms.inventory_movements;
CREATE POLICY tenant_isolation_inventory_movements ON wms.inventory_movements FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.labor_shifts;
CREATE POLICY rls_tenant_isolation ON wms.labor_shifts FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.locations;
CREATE POLICY rls_tenant_isolation ON wms.locations FOR ALL TO PUBLIC
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

DROP POLICY IF EXISTS wms_allow_all_outbound_order_items ON wms.outbound_order_items;
CREATE POLICY wms_allow_all_outbound_order_items ON wms.outbound_order_items FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation_outbound_orders ON wms.outbound_orders;
CREATE POLICY tenant_isolation_outbound_orders ON wms.outbound_orders FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.purchase_order_snapshots;
CREATE POLICY rls_tenant_isolation ON wms.purchase_order_snapshots FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.replenishment_order_items;
CREATE POLICY rls_tenant_isolation ON wms.replenishment_order_items FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.replenishment_orders;
CREATE POLICY rls_tenant_isolation ON wms.replenishment_orders FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.replenishment_rules;
CREATE POLICY rls_tenant_isolation ON wms.replenishment_rules FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS tenant_isolation_replenishment_suggestions ON wms.replenishment_suggestions;
CREATE POLICY tenant_isolation_replenishment_suggestions ON wms.replenishment_suggestions FOR ALL TO PUBLIC
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

DROP POLICY IF EXISTS tenant_isolation_serial_numbers ON wms.serial_numbers;
CREATE POLICY tenant_isolation_serial_numbers ON wms.serial_numbers FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.slotting_rules;
CREATE POLICY rls_tenant_isolation ON wms.slotting_rules FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS tenant_isolation_slotting_rules ON wms.slotting_rules;
CREATE POLICY tenant_isolation_slotting_rules ON wms.slotting_rules FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.slotting_suggestions;
CREATE POLICY rls_tenant_isolation ON wms.slotting_suggestions FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS tenant_isolation_slotting_suggestions ON wms.slotting_suggestions;
CREATE POLICY tenant_isolation_slotting_suggestions ON wms.slotting_suggestions FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.slotting_zones;
CREATE POLICY rls_tenant_isolation ON wms.slotting_zones FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DROP POLICY IF EXISTS tenant_isolation_slotting_zones ON wms.slotting_zones;
CREATE POLICY tenant_isolation_slotting_zones ON wms.slotting_zones FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS wms_allow_all_stock_take_items ON wms.stock_take_items;
CREATE POLICY wms_allow_all_stock_take_items ON wms.stock_take_items FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.stock_takes;
CREATE POLICY rls_tenant_isolation ON wms.stock_takes FOR ALL TO PUBLIC
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

DROP POLICY IF EXISTS tenant_isolation_sync_record_details ON wms.sync_record_details;
CREATE POLICY tenant_isolation_sync_record_details ON wms.sync_record_details FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

DROP POLICY IF EXISTS tenant_isolation_sync_records ON wms.sync_records;
CREATE POLICY tenant_isolation_sync_records ON wms.sync_records FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

DROP POLICY IF EXISTS wms_allow_all_transfer_items ON wms.transfer_items;
CREATE POLICY wms_allow_all_transfer_items ON wms.transfer_items FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation_transfer_order_items ON wms.transfer_order_items;
CREATE POLICY tenant_isolation_transfer_order_items ON wms.transfer_order_items FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS tenant_isolation_transfer_orders ON wms.transfer_orders;
CREATE POLICY tenant_isolation_transfer_orders ON wms.transfer_orders FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

DROP POLICY IF EXISTS wms_allow_all_transfers ON wms.transfers;
CREATE POLICY wms_allow_all_transfers ON wms.transfers FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_warehouses ON wms.warehouses;
CREATE POLICY wms_allow_all_warehouses ON wms.warehouses FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_wave_pick_items ON wms.wave_pick_items;
CREATE POLICY wms_allow_all_wave_pick_items ON wms.wave_pick_items FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_wave_picks ON wms.wave_picks;
CREATE POLICY wms_allow_all_wave_picks ON wms.wave_picks FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_wms_approval_events ON wms.wms_approval_events;
CREATE POLICY wms_allow_all_wms_approval_events ON wms.wms_approval_events FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wms_allow_all_wms_master_data_refs ON wms.wms_master_data_refs;
CREATE POLICY wms_allow_all_wms_master_data_refs ON wms.wms_master_data_refs FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

-- ---------- 3. 特殊表：基线为 RLS 关闭 / 无 FORCE / 0 策略 ----------
ALTER TABLE wms.safety_stock_settings NO FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.safety_stock_settings DISABLE ROW LEVEL SECURITY;

ALTER TABLE wms.schema_defense_ledger NO FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.schema_defense_ledger DISABLE ROW LEVEL SECURITY;

-- ---------- 4. 恢复其余 37 张表的 RLS + FORCE ----------
DO $w7b4wms_rb_force$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'wms' AND c.relkind = 'r'
           AND c.relname NOT IN ('schema_defense_ledger', 'safety_stock_settings')
    LOOP
        EXECUTE format('ALTER TABLE wms.%I ENABLE ROW LEVEL SECURITY', t.relname);
        EXECUTE format('ALTER TABLE wms.%I FORCE ROW LEVEL SECURITY', t.relname);
    END LOOP;
END
$w7b4wms_rb_force$;

-- ---------- 5. 校验：四项指标与逐表状态必须等于基线 ----------
DO $w7b4wms_rb_verify$
DECLARE
    n_tables int;
    n_rls int;
    n_force int;
    n_pol int;
    n_open int;
    n_bad int;
    expected_pols int;
    r record;
BEGIN
    SELECT count(*),
           count(*) FILTER (WHERE c.relrowsecurity),
           count(*) FILTER (WHERE c.relforcerowsecurity)
      INTO n_tables, n_rls, n_force
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'wms' AND c.relkind = 'r';

    SELECT count(*) INTO n_pol FROM pg_policies WHERE schemaname = 'wms';
    SELECT count(*) INTO n_open FROM pg_policies
     WHERE schemaname = 'wms' AND qual = 'true' AND with_check = 'true';
    -- 新形状的判据是策略里出现 app.rls_system；原策略（基线）不含该 GUC。
    SELECT count(*) INTO n_bad FROM pg_policies
     WHERE schemaname = 'wms'
       AND (coalesce(qual, '') LIKE '%app.rls_system%'
            OR coalesce(with_check, '') LIKE '%app.rls_system%');

    IF n_tables <> 39 THEN
        RAISE EXCEPTION 'B4-WMS 回滚校验失败：wms 表数 %，期望 39', n_tables;
    END IF;
    IF n_rls <> 37 THEN
        RAISE EXCEPTION 'B4-WMS 回滚校验失败：RLS 开启表数 %，期望 37', n_rls;
    END IF;
    IF n_force <> 37 THEN
        RAISE EXCEPTION 'B4-WMS 回滚校验失败：FORCE 表数 %，期望 37', n_force;
    END IF;
    IF n_pol <> 42 THEN
        RAISE EXCEPTION 'B4-WMS 回滚校验失败：策略数 %，期望 42', n_pol;
    END IF;
    IF n_open <> 16 THEN
        RAISE EXCEPTION 'B4-WMS 回滚校验失败：USING/WITH CHECK 均为 true 的策略 % 条，期望 16', n_open;
    END IF;
    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B4-WMS 回滚失败：仍有 % 条 fail-closed 新形状策略', n_bad;
    END IF;

    FOR r IN
        SELECT c.relname,
               c.relrowsecurity,
               c.relforcerowsecurity,
               (SELECT count(*) FROM pg_policies p
                 WHERE p.schemaname = 'wms' AND p.tablename = c.relname) AS pols
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'wms' AND c.relkind = 'r'
         ORDER BY c.relname
    LOOP
        expected_pols := CASE
            WHEN r.relname IN ('safety_stock_settings', 'schema_defense_ledger') THEN 0
            WHEN r.relname IN ('inventory', 'inventory_movements',
                               'slotting_rules', 'slotting_suggestions', 'slotting_zones') THEN 2
            ELSE 1
        END;

        IF r.pols <> expected_pols THEN
            RAISE EXCEPTION 'B4-WMS 回滚校验失败：% 策略数 %，期望 %',
                r.relname, r.pols, expected_pols;
        END IF;

        IF r.relname IN ('safety_stock_settings', 'schema_defense_ledger') THEN
            IF r.relrowsecurity OR r.relforcerowsecurity THEN
                RAISE EXCEPTION 'B4-WMS 回滚校验失败：% 应 RLS 关闭且无 FORCE', r.relname;
            END IF;
        ELSE
            IF NOT r.relrowsecurity OR NOT r.relforcerowsecurity THEN
                RAISE EXCEPTION 'B4-WMS 回滚校验失败：% 应 ENABLE + FORCE', r.relname;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'B4-WMS 回滚完成：39 表 / 42 策略 / 16 条 true-true，逐表 RLS+FORCE 与基线一致';
END
$w7b4wms_rb_verify$;

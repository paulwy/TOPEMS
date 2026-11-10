-- ============================================================
-- W7 · B2 零裸池模块（integration）：18 张表 RLS 收敛（fail-closed）
-- 版本：20261110110200
--
-- 依据：docs/quality/w7-rls-fail-closed-design-2026-11-09.md §6.1（B2 表集）/
--       §6.3（全局只读表）/ §4.1（统一谓词）
-- 表集来源：生产 schema 快照 docs/quality/prod_schema_live_20261109.json
--         （integration 有 tenant_id 的表 18 张，逐张已核对存在且为 uuid）
--
-- 每张表最终只保留（permissive 是 OR 关系，历史条目一律先清空）：
--   1) rls_tenant_isolation  FOR ALL
--      USING/WITH CHECK:
--        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--      - 无 nil UUID 全量分支；未设上下文 = 0 行（fail-closed）
--      - 不做列侧 cast（(tenant_id)::text 会让索引失效）
--      - WITH CHECK 不含 tenant_id IS NULL：租户不能写全局行
--   2) rls_global_read  FOR SELECT（仅下列全局内容表）
--      USING: 上面谓词 OR tenant_id IS NULL
--      - 全局行（tenant_id IS NULL）对所有租户只读
--
-- 全部 ENABLE + FORCE（含本地/生产当前缺 FORCE 的表），owner 也受约束。
-- 守卫式：表不存在或无 tenant_id 列 → WARNING 跳过，不中断；幂等：重复执行
--         结果一致（先按 pg_policies 清空该表全部策略再重建）。
--
-- 全局只读表（本文件内）：无
-- rls-global-read-tables: none
--
-- 表列表：
--   integration.async_tasks
--   integration.conversion_executions
--   integration.conversion_rules
--   integration.core_inter_module_sync
--   integration.crm_erp_sync
--   integration.crm_scm_sync
--   integration.erp_connections
--   integration.erp_mappings
--   integration.erp_wms_sync
--   integration.external_erp_staging
--   integration.external_erp_sync_logs
--   integration.hrm_finance_sync
--   integration.integration_events
--   integration.integration_sync_logs
--   integration.lims_qms_sync
--   integration.mes_erp_sync
--   integration.mes_qms_sync
--   integration.wms_scm_sync
--
-- 回滚（仅窗口急停用；等价恢复 owner 旁路，完整恢复需回放 pg_policies 快照）：
--   DROP POLICY IF EXISTS rls_tenant_isolation ON <schema>.<表>;
--   DROP POLICY IF EXISTS rls_global_read      ON <schema>.<表>;  -- 仅全局只读表
--   ALTER TABLE <schema>.<表> NO FORCE ROW LEVEL SECURITY;
--   见 scripts/ops/w7_b2_rollback.sql
-- ============================================================

SET lock_timeout = '5s';

DO $w7b2_policy$
DECLARE
    v_pred CONSTANT text :=
        'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'''
        ' OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid';
    r record;
    p record;
    v_target int := 0;
    v_skipped int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('integration', 'async_tasks', false),
            ('integration', 'conversion_executions', false),
            ('integration', 'conversion_rules', false),
            ('integration', 'core_inter_module_sync', false),
            ('integration', 'crm_erp_sync', false),
            ('integration', 'crm_scm_sync', false),
            ('integration', 'erp_connections', false),
            ('integration', 'erp_mappings', false),
            ('integration', 'erp_wms_sync', false),
            ('integration', 'external_erp_staging', false),
            ('integration', 'external_erp_sync_logs', false),
            ('integration', 'hrm_finance_sync', false),
            ('integration', 'integration_events', false),
            ('integration', 'integration_sync_logs', false),
            ('integration', 'lims_qms_sync', false),
            ('integration', 'mes_erp_sync', false),
            ('integration', 'mes_qms_sync', false),
            ('integration', 'wms_scm_sync', false)
        ) AS v(sch, tbl, global_read)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE WARNING 'W7-B2 跳过 %.%：表不存在', r.sch, r.tbl;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND attname = 'tenant_id' AND attnum > 0 AND NOT attisdropped
        ) THEN
            RAISE WARNING 'W7-B2 跳过 %.%：无 tenant_id 列', r.sch, r.tbl;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        FOR p IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = r.sch AND tablename = r.tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, r.sch, r.tbl);
        END LOOP;

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);

        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
            r.sch, r.tbl, v_pred, v_pred);

        IF r.global_read THEN
            EXECUTE format(
                'CREATE POLICY rls_global_read ON %I.%I FOR SELECT TO PUBLIC USING (%s OR tenant_id IS NULL)',
                r.sch, r.tbl, v_pred);
        END IF;

        v_target := v_target + 1;
    END LOOP;

    RAISE NOTICE 'W7-B2 integration：收敛 % 张，跳过 % 张', v_target, v_skipped;
END
$w7b2_policy$;

-- 结构断言：目标表必须 ENABLE + FORCE，且策略数等于登记值（1 或 2）
DO $w7b2_assert$
DECLARE
    r record;
    v_pols int;
    v_bad text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('integration', 'async_tasks', 1),
            ('integration', 'conversion_executions', 1),
            ('integration', 'conversion_rules', 1),
            ('integration', 'core_inter_module_sync', 1),
            ('integration', 'crm_erp_sync', 1),
            ('integration', 'crm_scm_sync', 1),
            ('integration', 'erp_connections', 1),
            ('integration', 'erp_mappings', 1),
            ('integration', 'erp_wms_sync', 1),
            ('integration', 'external_erp_staging', 1),
            ('integration', 'external_erp_sync_logs', 1),
            ('integration', 'hrm_finance_sync', 1),
            ('integration', 'integration_events', 1),
            ('integration', 'integration_sync_logs', 1),
            ('integration', 'lims_qms_sync', 1),
            ('integration', 'mes_erp_sync', 1),
            ('integration', 'mes_qms_sync', 1),
            ('integration', 'wms_scm_sync', 1)
        ) AS v(sch, tbl, exp_pols)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        SELECT count(*) INTO v_pols
        FROM pg_policies WHERE schemaname = r.sch AND tablename = r.tbl;
        IF v_pols <> r.exp_pols THEN
            v_bad := v_bad || format(' %I.%I 策略数=%s(期望%s);', r.sch, r.tbl, v_pols, r.exp_pols);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' %I.%I 未 ENABLE/FORCE;', r.sch, r.tbl);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'W7-B2 integration 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'W7-B2 integration 结构断言通过';
END
$w7b2_assert$;

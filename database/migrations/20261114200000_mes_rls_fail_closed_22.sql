-- RLS 阶段二 M1：22 张 mes 表由 fail-open 收紧为 fail-closed
--
-- 目标谓词（USING 与 WITH CHECK 相同）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 做法：逐表 DROP 掉全部现行策略（含重复 permissive 与旧式单策略），
-- 再建唯一策略 rls_tenant_isolation。不保留任何
-- current_setting(...) IS NULL / tenant_id IS NULL / app.tenant_id = '' / nil UUID 兜底分支。
--
-- 回滚见 database/rollback/20261114200000_mes_rls_fail_closed_22.rollback.sql：逐表恢复收紧前的策略原文。
-- 投递门（两句都要满足，缺一不可）：
--   1) 部署门：prod 账本 max(version) >= 20261114201000（M2a 已补 tenant_id），否则禁止部署新二进制；
--   2) 收紧门：新二进制（含阶段一代码 + K2 修复）已部署，否则旧二进制不设 GUC、走裸池，会被本迁移挡住。
-- 本迁移与 M2b(20261114202000) 同批投递（窗口 C）。

-- 1. mes.audit_logs
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.audit_logs;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON mes.audit_logs;
CREATE POLICY rls_tenant_isolation ON mes.audit_logs
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 2. mes.dashboard_stats
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.dashboard_stats;
DROP POLICY IF EXISTS tenant_isolation_dashboard_stats ON mes.dashboard_stats;
CREATE POLICY rls_tenant_isolation ON mes.dashboard_stats
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 3. mes.equipment
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.equipment;
CREATE POLICY rls_tenant_isolation ON mes.equipment
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 4. mes.equipment_inspection_records
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.equipment_inspection_records;
CREATE POLICY rls_tenant_isolation ON mes.equipment_inspection_records
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 5. mes.equipment_maintenance_records
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.equipment_maintenance_records;
CREATE POLICY rls_tenant_isolation ON mes.equipment_maintenance_records
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 6. mes.equipment_oee
DROP POLICY IF EXISTS tenant_isolation_equipment_oee ON mes.equipment_oee;
CREATE POLICY rls_tenant_isolation ON mes.equipment_oee
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 7. mes.financial_records
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.financial_records;
DROP POLICY IF EXISTS tenant_isolation_financial_records ON mes.financial_records;
CREATE POLICY rls_tenant_isolation ON mes.financial_records
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 8. mes.material_plans
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.material_plans;
CREATE POLICY rls_tenant_isolation ON mes.material_plans
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 9. mes.module_settings（纯 fail-closed，不保留 NULL 全局默认读分支）
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.module_settings;
CREATE POLICY rls_tenant_isolation ON mes.module_settings
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 10. mes.process_route_steps
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.process_route_steps;
CREATE POLICY rls_tenant_isolation ON mes.process_route_steps
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 11. mes.process_routes
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.process_routes;
CREATE POLICY rls_tenant_isolation ON mes.process_routes
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 12. mes.production_costs
DROP POLICY IF EXISTS tenant_isolation_production_costs ON mes.production_costs;
CREATE POLICY rls_tenant_isolation ON mes.production_costs
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 13. mes.production_orders
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.production_orders;
CREATE POLICY rls_tenant_isolation ON mes.production_orders
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 14. mes.production_processes
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.production_processes;
CREATE POLICY rls_tenant_isolation ON mes.production_processes
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 15. mes.production_records
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.production_records;
CREATE POLICY rls_tenant_isolation ON mes.production_records
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 16. mes.production_schedules
DROP POLICY IF EXISTS tenant_isolation_production_schedules ON mes.production_schedules;
CREATE POLICY rls_tenant_isolation ON mes.production_schedules
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 17. mes.quality_standard_values
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.quality_standard_values;
DROP POLICY IF EXISTS tenant_isolation_quality_standard_values ON mes.quality_standard_values;
CREATE POLICY rls_tenant_isolation ON mes.quality_standard_values
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 18. mes.quality_standards（原 USING(true)）
DROP POLICY IF EXISTS mes_allow_all_quality_standards ON mes.quality_standards;
CREATE POLICY rls_tenant_isolation ON mes.quality_standards
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 19. mes.supply_chain_orders
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.supply_chain_orders;
DROP POLICY IF EXISTS tenant_isolation_supply_chain_orders ON mes.supply_chain_orders;
CREATE POLICY rls_tenant_isolation ON mes.supply_chain_orders
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 20. mes.teams
DROP POLICY IF EXISTS tenant_isolation_teams ON mes.teams;
CREATE POLICY rls_tenant_isolation ON mes.teams
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 21. mes.work_reports
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.work_reports;
DROP POLICY IF EXISTS tenant_isolation_work_reports ON mes.work_reports;
CREATE POLICY rls_tenant_isolation ON mes.work_reports
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 22. mes.work_stations
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.work_stations;
CREATE POLICY rls_tenant_isolation ON mes.work_stations
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- RLS 阶段二 M2b：8 张表的策略收紧——删 `*_allow_all_*`，建 fail-closed 目标策略
--
-- 目标谓词（USING 与 WITH CHECK 相同）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 投递顺序（硬约束）：M2a（补列）-> 部署新二进制 -> M2b 与 M1 同批。
-- 旧二进制不设 GUC、走裸池，先收紧会让它的读写被 RLS 挡住（生产级故障）。
-- 本迁移依赖 M2a 已补出的 tenant_id 列。
--
-- 回滚见 database/rollback/20261114202000_erp_crm_portal_rls_fail_closed_8.rollback.sql：删目标策略，逐表恢复原 allow_all 原文（prod 快照原文）。

-- 1. erp.meeting_rooms
DROP POLICY IF EXISTS erp_allow_all_meeting_rooms ON erp.meeting_rooms;
CREATE POLICY rls_tenant_isolation ON erp.meeting_rooms
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 2. erp.meeting_bookings
DROP POLICY IF EXISTS erp_allow_all_meeting_bookings ON erp.meeting_bookings;
CREATE POLICY rls_tenant_isolation ON erp.meeting_bookings
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 3. erp.vehicles
DROP POLICY IF EXISTS erp_allow_all_vehicles ON erp.vehicles;
CREATE POLICY rls_tenant_isolation ON erp.vehicles
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 4. erp.vehicle_requests
DROP POLICY IF EXISTS erp_allow_all_vehicle_requests ON erp.vehicle_requests;
CREATE POLICY rls_tenant_isolation ON erp.vehicle_requests
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 5. erp.expenses
DROP POLICY IF EXISTS erp_allow_all_expenses ON erp.expenses;
CREATE POLICY rls_tenant_isolation ON erp.expenses
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 6. crm.core_crm_customers
DROP POLICY IF EXISTS crm_allow_all_core_crm_customers ON crm.core_crm_customers;
CREATE POLICY rls_tenant_isolation ON crm.core_crm_customers
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 7. erp.core_erp_suppliers
DROP POLICY IF EXISTS erp_allow_all_core_erp_suppliers ON erp.core_erp_suppliers;
CREATE POLICY rls_tenant_isolation ON erp.core_erp_suppliers
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 8. portal.portal_announcements
DROP POLICY IF EXISTS portal_allow_all_portal_announcements ON portal.portal_announcements;
CREATE POLICY rls_tenant_isolation ON portal.portal_announcements
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

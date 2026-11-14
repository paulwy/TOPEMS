-- 回滚入口（M2b）：仓库统一放在 database/rollback/<version>_<name>.rollback.sql，与既有迁移一致。
-- 放位依据：scripts/check-migration-names.mjs --strict 会把 database/migrations 下的 *.down.sql 判为
--   UNKNOWN pattern 并阻断提交，故不使用 .down.sql；validate.sh 的 down 检查仅产生 WARN。
-- RLS 阶段二 M2b 回滚：删除目标策略，逐表恢复 prod 快照中的 allow_all 原文。
-- 恢复后 pg_policies 应与 M2b 执行前逐表一致（演练中以快照基线做 diff 验证）。
-- 本迁移只改策略，不涉及列/索引；列与回填的回滚见 M2a 的 .down.sql。

-- 1. erp.meeting_rooms
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.meeting_rooms;
CREATE POLICY erp_allow_all_meeting_rooms ON erp.meeting_rooms USING (true) WITH CHECK (true);

-- 2. erp.meeting_bookings
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.meeting_bookings;
CREATE POLICY erp_allow_all_meeting_bookings ON erp.meeting_bookings USING (true) WITH CHECK (true);

-- 3. erp.vehicles
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.vehicles;
CREATE POLICY erp_allow_all_vehicles ON erp.vehicles USING (true) WITH CHECK (true);

-- 4. erp.vehicle_requests
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.vehicle_requests;
CREATE POLICY erp_allow_all_vehicle_requests ON erp.vehicle_requests USING (true) WITH CHECK (true);

-- 5. erp.expenses
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.expenses;
CREATE POLICY erp_allow_all_expenses ON erp.expenses USING (true) WITH CHECK (true);

-- 6. crm.core_crm_customers
DROP POLICY IF EXISTS rls_tenant_isolation ON crm.core_crm_customers;
CREATE POLICY crm_allow_all_core_crm_customers ON crm.core_crm_customers USING (true) WITH CHECK (true);

-- 7. erp.core_erp_suppliers
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.core_erp_suppliers;
CREATE POLICY erp_allow_all_core_erp_suppliers ON erp.core_erp_suppliers USING (true) WITH CHECK (true);

-- 8. portal.portal_announcements
DROP POLICY IF EXISTS rls_tenant_isolation ON portal.portal_announcements;
CREATE POLICY portal_allow_all_portal_announcements ON portal.portal_announcements USING (true) WITH CHECK (true);

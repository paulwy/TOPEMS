-- 回滚入口（K8 第一批）：database/rollback/<version>_<name>.rollback.sql，与既有迁移一致。
-- 回退顺序：**先回策略、再回二进制**。策略恢复 fail-open 后，新旧二进制都能工作；
--   反过来（先回旧二进制、留着收紧策略）会让 TMS 无 GUC 的老路径直接读 0 行。
-- 恢复目标：与 prod 2026-11-15 快照逐字一致（策略名、谓词、PERMISSIVE/ALL、PUBLIC），
--   tenant_id 恢复可空，并删除本迁移新增的 3 个租户索引。rls / force_rls 前后均为 true，不动。
-- 原始谓词（prod pg_policies.qual 原文，三表相同）：
--   ((current_setting('app.tenant_id'::text, true) IS NULL)
--    OR (current_setting('app.tenant_id'::text, true) = ''::text)
--    OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
--    OR (tenant_id IS NULL)
--    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))

-- 1. tms.tms_carriers
DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_carriers;
CREATE POLICY rls_tenant_isolation ON tms.tms_carriers
    USING (
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    )
    WITH CHECK (
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );
ALTER TABLE tms.tms_carriers ALTER COLUMN tenant_id DROP NOT NULL;
DROP INDEX IF EXISTS tms.idx_tms_carriers_tenant;

-- 2. tms.tms_drivers
DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_drivers;
CREATE POLICY rls_tenant_isolation ON tms.tms_drivers
    USING (
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    )
    WITH CHECK (
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );
ALTER TABLE tms.tms_drivers ALTER COLUMN tenant_id DROP NOT NULL;
DROP INDEX IF EXISTS tms.idx_tms_drivers_tenant;

-- 3. tms.tms_vehicles
DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_vehicles;
CREATE POLICY rls_tenant_isolation ON tms.tms_vehicles
    USING (
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    )
    WITH CHECK (
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );
ALTER TABLE tms.tms_vehicles ALTER COLUMN tenant_id DROP NOT NULL;
DROP INDEX IF EXISTS tms.idx_tms_vehicles_tenant;

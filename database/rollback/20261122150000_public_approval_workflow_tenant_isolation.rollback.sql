-- ============================================================
-- 回滚 20261122150000_public_approval_workflow_tenant_isolation
--
-- 回滚后形态（务必与发布说明一致）：
--   数据：tenant_id 列保留（迁移前既有的资产，删除属破坏性动作，不回滚），
--         已按 P1-P4 回填的租户值保留；本迁移不改任何其他列。
--   策略：approvals / approval_records 回到「严格 USING、无 WITH CHECK」，
--         即迁移前的生产形态（2026-11-22 只读实测 topems_prod / topems_gate）；
--         core_workflow_instances / core_workflow_tasks 本就是 USING + WITH CHECK，
--         回滚按同一表达式重建，形状不变。
--   索引：删除本迁移新建的 4 条 idx_<table>_tenant_id。
--
-- 限定说明：若目标库是「从空链初始化」而非生产形态，20260923160000 给
--   approvals / approval_records 的前置策略是「nil/空串/全零/NULL 放行」的宽松模板。
--   本回滚不会把策略降回宽松模板（那会重新扩大可见面），而是保持严格 fail-closed；
--   需要完全复刻空链前置时，另行按 20260923160000 手工还原，不在本回滚范围。
--
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DROP INDEX IF EXISTS public.idx_approvals_tenant_id;
DROP INDEX IF EXISTS public.idx_approval_records_tenant_id;
DROP INDEX IF EXISTS public.idx_core_workflow_instances_tenant_id;
DROP INDEX IF EXISTS public.idx_core_workflow_tasks_tenant_id;

-- 迁移前形态：仅 USING，无 WITH CHECK（USING 隐式作为写检查）
DROP POLICY IF EXISTS rls_tenant_isolation ON public.approvals;
CREATE POLICY rls_tenant_isolation ON public.approvals
    FOR ALL TO public
    USING (
        (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );

DROP POLICY IF EXISTS rls_tenant_isolation ON public.approval_records;
CREATE POLICY rls_tenant_isolation ON public.approval_records
    FOR ALL TO public
    USING (
        (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );

-- 迁移前后同形：USING + WITH CHECK 严格 B 范式
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_workflow_instances;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_instances
    FOR ALL TO public
    USING (
        (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    )
    WITH CHECK (
        (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );

DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_workflow_tasks;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_tasks
    FOR ALL TO public
    USING (
        (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    )
    WITH CHECK (
        (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );

-- destructive-gate: allow
-- destructive-kind: DELETE
-- destructive-reason: 回滚仅删除本迁移在账本中的 1 行登记，不删业务数据
-- destructive-owner: database-rls
-- destructive-ticket: RLS-APPROVAL-20261122
-- destructive-expires: 2027-05-19
-- destructive-max-rows: 1
-- destructive-backup: 迁移窗口前 pg_dump -t public._sqlx_migrations
DELETE FROM public._sqlx_migrations WHERE version = 20261122150000;

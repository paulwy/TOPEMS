-- 回滚 20261117234000_legacy_permissive_rls_to_strict.sql
--
-- 恢复三表迁移前的「历史宽松策略」形态（与原策略文本一致）：
--   public.core_files              → tenant_isolation_core_files（四放行分支 + NULL 租户）
--   bi.analytics_datasets          → tenant_isolation_analytics_datasets（USING only，与 20261023000005 同型）
--   master_data.mdm_metadata_objects → mdm_metadata_objects_tenant_policy（GUC 未设/空串/全零/NULL/本租户）
-- 同时：移除新建的 idx_mdm_metadata_objects_tenant_id、恢复 mdm.tenant_id 可空。
--
-- 不回退项（有意）：
--   1. NULL 租户 → 全零平台租户的归一不回退：回退会把平台可见文件/对象重新变成无归属行，
--      在恢复的宽松策略下虽然可见，但归属信息已丢失且与 20261117120000 的口径冲突。
--   2. RLS 的 ENABLE / FORCE 保持（迁移前三表本就处于 ENABLE + FORCE）。
--
-- 注意：只在确认需要放弃「严格租户隔离」时执行；生产窗口内正常路径是前向修复，不是回滚。

SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 1. 删除严格策略
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_files;
DROP POLICY IF EXISTS rls_tenant_isolation ON bi.analytics_datasets;
DROP POLICY IF EXISTS rls_tenant_isolation ON master_data.mdm_metadata_objects;

-- 2. 恢复历史宽松策略
CREATE POLICY tenant_isolation_core_files ON public.core_files
    FOR ALL TO public
    USING (
        (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
        OR tenant_id IS NULL
        OR NULLIF(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
    )
    WITH CHECK (
        (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
        OR tenant_id IS NULL
        OR NULLIF(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
    );

CREATE POLICY tenant_isolation_analytics_datasets ON bi.analytics_datasets
    FOR ALL TO public
    USING (
        tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
        OR NULLIF(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
    );

CREATE POLICY mdm_metadata_objects_tenant_policy ON master_data.mdm_metadata_objects
    FOR ALL TO public
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 3. 移除新增索引，恢复 mdm.tenant_id 可空
DROP INDEX IF EXISTS master_data.idx_mdm_metadata_objects_tenant_id;
ALTER TABLE master_data.mdm_metadata_objects ALTER COLUMN tenant_id DROP NOT NULL;

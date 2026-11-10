-- ============================================================
-- W7 · B4 回滚：还原 2026-11-10 窗口前的 pdm 策略集（40 条）
--
-- 生成自窗口前 pg_policies 快照（/tmp/pdm_policies_before.txt），逐字还原
-- 策略名 / permissive / cmd / USING / WITH CHECK；表级 ENABLE+FORCE 未变，不动。
-- 用法：psql -X -1 -v ON_ERROR_STOP=1 -f scripts/ops/w7_b4_rollback.sql
-- 顺序：先删新增策略 → 再建旧策略；整个脚本必须单事务执行。
-- ============================================================
SET lock_timeout = '5s';

-- 1) 删除本窗口新增的策略
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.module_settings;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_bom_items;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_boms;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_change_notices;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_configurations;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_document_versions;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_documents;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_drawings;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_master_data_refs;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_materials;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_production_batches;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_production_formulas;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_production_processes;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_production_steps;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_products;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_project_members;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_project_phases;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_projects;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_versions;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_workflow_instances;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_workflows;
DROP POLICY IF EXISTS pdm_master_data_refs_read ON pdm.pdm_master_data_refs;
DROP POLICY IF EXISTS pdm_master_data_refs_write ON pdm.pdm_master_data_refs;

-- 2) 还原窗口前策略（快照逐条）
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."module_settings";
CREATE POLICY "rls_tenant_isolation" ON pdm."module_settings" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_bom_items";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_bom_items" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_bom_items" ON pdm."pdm_bom_items";
CREATE POLICY "tenant_isolation_pdm_bom_items" ON pdm."pdm_bom_items" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_boms";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_boms" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_boms" ON pdm."pdm_boms";
CREATE POLICY "tenant_isolation_pdm_boms" ON pdm."pdm_boms" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_change_notices";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_change_notices" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_change_notices" ON pdm."pdm_change_notices";
CREATE POLICY "tenant_isolation_pdm_change_notices" ON pdm."pdm_change_notices" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_configurations";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_configurations" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_configurations" ON pdm."pdm_configurations";
CREATE POLICY "tenant_isolation_pdm_configurations" ON pdm."pdm_configurations" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_document_versions";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_document_versions" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_document_versions" ON pdm."pdm_document_versions";
CREATE POLICY "tenant_isolation_pdm_document_versions" ON pdm."pdm_document_versions" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_documents";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_documents" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_documents" ON pdm."pdm_documents";
CREATE POLICY "tenant_isolation_pdm_documents" ON pdm."pdm_documents" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_drawings";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_drawings" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_drawings" ON pdm."pdm_drawings";
CREATE POLICY "tenant_isolation_pdm_drawings" ON pdm."pdm_drawings" AS PERMISSIVE FOR ALL TO PUBLIC
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL)));
DROP POLICY IF EXISTS "pdm_allow_all_pdm_master_data_refs" ON pdm."pdm_master_data_refs";
CREATE POLICY "pdm_allow_all_pdm_master_data_refs" ON pdm."pdm_master_data_refs" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_materials";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_materials" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_materials" ON pdm."pdm_materials";
CREATE POLICY "tenant_isolation_pdm_materials" ON pdm."pdm_materials" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_production_batches";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_production_batches" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_production_batches" ON pdm."pdm_production_batches";
CREATE POLICY "tenant_isolation_pdm_production_batches" ON pdm."pdm_production_batches" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_production_formulas";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_production_formulas" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_production_formulas" ON pdm."pdm_production_formulas";
CREATE POLICY "tenant_isolation_pdm_production_formulas" ON pdm."pdm_production_formulas" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_production_processes";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_production_processes" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_production_processes" ON pdm."pdm_production_processes";
CREATE POLICY "tenant_isolation_pdm_production_processes" ON pdm."pdm_production_processes" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_production_steps";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_production_steps" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_production_steps" ON pdm."pdm_production_steps";
CREATE POLICY "tenant_isolation_pdm_production_steps" ON pdm."pdm_production_steps" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_products";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_products" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_products" ON pdm."pdm_products";
CREATE POLICY "tenant_isolation_pdm_products" ON pdm."pdm_products" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_project_members";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_project_members" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_project_members" ON pdm."pdm_project_members";
CREATE POLICY "tenant_isolation_pdm_project_members" ON pdm."pdm_project_members" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_project_phases";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_project_phases" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_project_phases" ON pdm."pdm_project_phases";
CREATE POLICY "tenant_isolation_pdm_project_phases" ON pdm."pdm_project_phases" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_projects";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_projects" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_projects" ON pdm."pdm_projects";
CREATE POLICY "tenant_isolation_pdm_projects" ON pdm."pdm_projects" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_versions";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_versions" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_versions" ON pdm."pdm_versions";
CREATE POLICY "tenant_isolation_pdm_versions" ON pdm."pdm_versions" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_workflow_instances";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_workflow_instances" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_workflow_instances" ON pdm."pdm_workflow_instances";
CREATE POLICY "tenant_isolation_pdm_workflow_instances" ON pdm."pdm_workflow_instances" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm."pdm_workflows";
CREATE POLICY "rls_tenant_isolation" ON pdm."pdm_workflows" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_pdm_workflows" ON pdm."pdm_workflows";
CREATE POLICY "tenant_isolation_pdm_workflows" ON pdm."pdm_workflows" AS PERMISSIVE FOR ALL TO PUBLIC
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- 3) 自检：策略条数必须回到 40，且不含新策略名
DO $chk$
DECLARE v_n int; v_new int;
BEGIN
    SELECT count(*) INTO v_n FROM pg_policies WHERE schemaname = 'pdm';
    -- 注：rls_tenant_isolation 是窗口前就存在的旧策略名（module_settings 等），
    -- 不属于窗口后新增，故自检只认 refs 的两条新策略名。
    SELECT count(*) INTO v_new FROM pg_policies WHERE schemaname = 'pdm'
      AND policyname IN ('pdm_master_data_refs_read', 'pdm_master_data_refs_write');
    IF v_n <> 40 OR v_new <> 0 THEN
        RAISE EXCEPTION 'B4 回滚自检失败：策略数=%（期望 40），残留新增策略=%', v_n, v_new;
    END IF;
    RAISE NOTICE 'B4 回滚自检通过：策略数=40，无新增策略残留';
END
$chk$;

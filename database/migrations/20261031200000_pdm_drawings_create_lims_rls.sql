-- WCS smoke 核销补底：pdm.pdm_drawings 真实 DDL 落地 + lims.qa_lims_analytes RLS 双策略
-- 来源：svc/pdm/src/modules/drawings.rs 使用方契约（Drawing struct + INSERT/UPDATE/SELECT 列）；
--       lims 上一轮漂移表归位后补充租户隔离策略（pdm_drawings 建表 + lims RLS 均为 live DB 手工落地，此处归档）
-- 幂等：CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS + CREATE POLICY（migration 版本表防重跑）

-- 1) pdm.pdm_drawings 建表（15 列，对齐 Drawing FromRow 契约）
CREATE TABLE IF NOT EXISTS pdm.pdm_drawings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    drawing_no TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    drawing_type TEXT,
    product_id UUID,
    version TEXT NOT NULL DEFAULT '1',
    status TEXT NOT NULL DEFAULT 'active',
    file_path TEXT,
    file_size BIGINT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE pdm.pdm_drawings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON pdm.pdm_drawings;
CREATE POLICY rls_tenant_isolation ON pdm.pdm_drawings
    USING ((current_setting('app.tenant_id', true) IS NULL)
        OR (current_setting('app.tenant_id', true) = '')
        OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid));
DROP POLICY IF EXISTS tenant_isolation_pdm_drawings ON pdm.pdm_drawings;
CREATE POLICY tenant_isolation_pdm_drawings ON pdm.pdm_drawings
    USING (((tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')) OR (tenant_id IS NULL));
ALTER TABLE pdm.pdm_drawings FORCE ROW LEVEL SECURITY;

-- 2) lims.qa_lims_analytes RLS 双策略（与 qms/lims 同款模板；live 未 FORCE，保持一致）
ALTER TABLE lims.qa_lims_analytes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON lims.qa_lims_analytes;
CREATE POLICY rls_tenant_isolation ON lims.qa_lims_analytes
    USING ((current_setting('app.tenant_id', true) IS NULL)
        OR (current_setting('app.tenant_id', true) = '')
        OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid));
DROP POLICY IF EXISTS tenant_isolation_qa_lims_analytes ON lims.qa_lims_analytes;
CREATE POLICY tenant_isolation_qa_lims_analytes ON lims.qa_lims_analytes
    USING (((tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')) OR (tenant_id IS NULL));

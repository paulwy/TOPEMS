-- audit_logs RLS 收口 Phase 0：给缺失 tenant_id 的 5 张表补列并回填 nil UUID
-- 关联方案：docs/architecture/audit-logs-rls-hardening-plan-20261107.md
--
-- 说明：
-- - flow / gis / iam / qms / shared 的 audit_logs 没有 tenant_id 列，无法套租户谓词；
-- - 统一使用 nil UUID（不是 SQL NULL）表示系统级行，`tenant_id = nil` 才能被策略命中；
-- - ADD COLUMN ... NOT NULL DEFAULT 会让已有行自动回填，无需额外 UPDATE；
-- - shared.audit_logs 当前未启用 RLS，策略在下一个迁移里一并启用。

ALTER TABLE flow.audit_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE INDEX IF NOT EXISTS idx_flow_audit_logs_tenant_id ON flow.audit_logs (tenant_id);

ALTER TABLE gis.audit_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE INDEX IF NOT EXISTS idx_gis_audit_logs_tenant_id ON gis.audit_logs (tenant_id);

ALTER TABLE iam.audit_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE INDEX IF NOT EXISTS idx_iam_audit_logs_tenant_id ON iam.audit_logs (tenant_id);

ALTER TABLE qms.audit_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE INDEX IF NOT EXISTS idx_qms_audit_logs_tenant_id ON qms.audit_logs (tenant_id);

ALTER TABLE shared.audit_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE INDEX IF NOT EXISTS idx_shared_audit_logs_tenant_id ON shared.audit_logs (tenant_id);

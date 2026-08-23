-- =============================================================================
-- V101_hrm_rd_audit_cluster_a.sql  (Task B of P1-3 pre-migrations)
--
-- Align hrm.audit_logs and rs.audit_logs (RD service) to the Cluster-A
-- 15-column standard, so that when P1-3 SchemaAwareAuditLogService lands,
-- both services can consume the unified INSERT without extended columns.
--
--  - hrm.audit_logs: drop organization_id and tenant_id (both were
--    hard-coded to UUID zeros in every INSERT; callers have no way to pass
--    real values; SELECT / AuditLog struct never read them). We soft-rename
--    to deprecated_*_v101 for 30 days before hard drop.
--  - rs.audit_logs: ensure id column has DEFAULT uuid_generate_v4() so the
--    application no longer needs to pre-generate UUIDs (rd modules/audit.rs
--    now omits id in INSERT).
--
-- Idempotent: uses DO blocks + information_schema guards. Safe to rerun.
-- =============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- HRM: soft deprecate organization_id / tenant_id
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='hrm' AND table_name='audit_logs'
                  AND column_name='organization_id') THEN
        ALTER TABLE hrm.audit_logs
            RENAME COLUMN organization_id TO deprecated_organization_id_v101;
        COMMENT ON COLUMN hrm.audit_logs.deprecated_organization_id_v101 IS
            'Task B (V101): always written as UUID zero (unused); drop after 30d';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='hrm' AND table_name='audit_logs'
                  AND column_name='tenant_id') THEN
        ALTER TABLE hrm.audit_logs
            RENAME COLUMN tenant_id TO deprecated_tenant_id_v101;
        COMMENT ON COLUMN hrm.audit_logs.deprecated_tenant_id_v101 IS
            'Task B (V101): always written as UUID zero (unused); drop after 30d';
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- RD: ensure id UUID DEFAULT uuid_generate_v4() (may be missing in legacy envs)
-- --------------------------------------------------------------------------
DO $$
DECLARE
    _def text;
BEGIN
    SELECT column_default INTO _def
    FROM information_schema.columns
    WHERE table_schema='rs' AND table_name='audit_logs' AND column_name='id';

    IF FOUND AND (_def IS NULL OR _def NOT LIKE '%uuid_generate_v4%') THEN
        ALTER TABLE rs.audit_logs
            ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

COMMIT;

-- audit_logs RLS 收口：把 13 张 allow_all + 1 张无策略 + 4 张旧 nil=全可见
-- 统一替换为 Phase 2 谓词（18 张）。
-- 关联方案：docs/architecture/audit-logs-rls-hardening-plan-20261107.md
--
-- 目标谓词：
--   tenant_id = GUC(app.tenant_id)
--   OR (GUC(app.tenant_id) = nil UUID AND app.rls_system = 'on')
--
-- 语义：
-- - 普通租户（GUC=<tenant>, rls_system=off）：只见自己租户的行；
-- - 超管 / service / 显式系统作用域（GUC=nil, rls_system=on）：可见全量；
-- - 裸连接（GUC 未设置）：两侧均为 NULL → fail-closed，0 行 / INSERT 报错。
--
-- 回滚：database/scripts/audit_logs_rls_phase2_rollback.sql（按 schema 分段，
-- 可只回单个 schema；恢复原 allow_all / 旧 nil=全可见策略）。
-- 执行前必须导出 pg_policies 备份（见方案 §6）。

-- ---------- 13 张 allow_all_audit_logs ----------

DROP POLICY IF EXISTS bi_allow_all_audit_logs ON bi.audit_logs;
CREATE POLICY rls_tenant_isolation ON bi.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE bi.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_allow_all_audit_logs ON crm.audit_logs;
CREATE POLICY rls_tenant_isolation ON crm.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE crm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ehs_allow_all_audit_logs ON ehs.audit_logs;
CREATE POLICY rls_tenant_isolation ON ehs.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE ehs.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS erp_allow_all_audit_logs ON erp.audit_logs;
CREATE POLICY rls_tenant_isolation ON erp.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE erp.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flow_allow_all_audit_logs ON flow.audit_logs;
CREATE POLICY rls_tenant_isolation ON flow.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE flow.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gis_allow_all_audit_logs ON gis.audit_logs;
CREATE POLICY rls_tenant_isolation ON gis.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE gis.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrm_allow_all_audit_logs ON hrm.audit_logs;
CREATE POLICY rls_tenant_isolation ON hrm.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE hrm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iam_allow_all_audit_logs ON iam.audit_logs;
CREATE POLICY rls_tenant_isolation ON iam.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE iam.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lims_allow_all_audit_logs ON lims.audit_logs;
CREATE POLICY rls_tenant_isolation ON lims.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE lims.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qms_allow_all_audit_logs ON qms.audit_logs;
CREATE POLICY rls_tenant_isolation ON qms.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE qms.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scm_allow_all_audit_logs ON scm.audit_logs;
CREATE POLICY rls_tenant_isolation ON scm.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE scm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS srm_allow_all_audit_logs ON srm.audit_logs;
CREATE POLICY rls_tenant_isolation ON srm.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE srm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wms_allow_all_audit_logs ON wms.audit_logs;
CREATE POLICY rls_tenant_isolation ON wms.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE wms.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.audit_logs FORCE ROW LEVEL SECURITY;

-- ---------- shared.audit_logs：原本完全无策略 ----------

CREATE POLICY rls_tenant_isolation ON shared.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );
ALTER TABLE shared.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.audit_logs FORCE ROW LEVEL SECURITY;

-- ---------- 既有 4 张：从「nil = 全可见」升级为 Phase 2 ----------

DROP POLICY IF EXISTS rls_tenant_isolation ON public.audit_logs;
CREATE POLICY rls_tenant_isolation ON public.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );

DROP POLICY IF EXISTS rls_tenant_isolation ON mes.audit_logs;
CREATE POLICY rls_tenant_isolation ON mes.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );

DROP POLICY IF EXISTS rls_tenant_isolation ON plugin_mes.audit_logs;
CREATE POLICY rls_tenant_isolation ON plugin_mes.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );

DROP POLICY IF EXISTS rls_tenant_isolation ON rs.audit_logs;
CREATE POLICY rls_tenant_isolation ON rs.audit_logs FOR ALL
  USING (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  )
  WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR (
      (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
      AND current_setting('app.rls_system', true) = 'on'
    )
  );

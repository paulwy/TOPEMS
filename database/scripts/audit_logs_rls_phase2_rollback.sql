-- audit_logs RLS Phase 2 手工回滚脚本（按 schema 分段，可只执行单个 schema）
-- 对应迁移：20261107000010_audit_logs_tenant_id_5tables.sql
--           20261107000011_audit_logs_rls_phase2_18tables.sql
--
-- 使用方式：
--   1) 执行前必须先导出 pg_policies 备份：
--      psql ... -c "COPY (SELECT * FROM pg_policies WHERE tablename='audit_logs') TO '/tmp/pg_policies_audit_logs_before.sql'"
--   2) 只回滚出问题的 schema：从对应分段里复制 3 条语句执行，不要整文件跑。
--   3) 回滚后确认：策略名恢复为 <schema>_allow_all_audit_logs / rls_tenant_isolation（旧谓词）。
--
-- 注意：tenant_id 列与索引不回滚（新增列默认 nil UUID，保留不会影响业务；
-- 如需彻底恢复，可在确认该表无数据后手工执行文件末的「可选列回滚」。

-- ========== 13 张 allow_all -> 恢复原 allow_all ==========

-- bi
DROP POLICY IF EXISTS rls_tenant_isolation ON bi.audit_logs;
CREATE POLICY bi_allow_all_audit_logs ON bi.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- crm
DROP POLICY IF EXISTS rls_tenant_isolation ON crm.audit_logs;
CREATE POLICY crm_allow_all_audit_logs ON crm.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ehs
DROP POLICY IF EXISTS rls_tenant_isolation ON ehs.audit_logs;
CREATE POLICY ehs_allow_all_audit_logs ON ehs.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- erp
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.audit_logs;
CREATE POLICY erp_allow_all_audit_logs ON erp.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- flow
DROP POLICY IF EXISTS rls_tenant_isolation ON flow.audit_logs;
CREATE POLICY flow_allow_all_audit_logs ON flow.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- gis
DROP POLICY IF EXISTS rls_tenant_isolation ON gis.audit_logs;
CREATE POLICY gis_allow_all_audit_logs ON gis.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- hrm
DROP POLICY IF EXISTS rls_tenant_isolation ON hrm.audit_logs;
CREATE POLICY hrm_allow_all_audit_logs ON hrm.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- iam
DROP POLICY IF EXISTS rls_tenant_isolation ON iam.audit_logs;
CREATE POLICY iam_allow_all_audit_logs ON iam.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- lims
DROP POLICY IF EXISTS rls_tenant_isolation ON lims.audit_logs;
CREATE POLICY lims_allow_all_audit_logs ON lims.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- qms
DROP POLICY IF EXISTS rls_tenant_isolation ON qms.audit_logs;
CREATE POLICY qms_allow_all_audit_logs ON qms.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- scm
DROP POLICY IF EXISTS rls_tenant_isolation ON scm.audit_logs;
CREATE POLICY scm_allow_all_audit_logs ON scm.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- srm
DROP POLICY IF EXISTS rls_tenant_isolation ON srm.audit_logs;
CREATE POLICY srm_allow_all_audit_logs ON srm.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- wms
DROP POLICY IF EXISTS rls_tenant_isolation ON wms.audit_logs;
CREATE POLICY wms_allow_all_audit_logs ON wms.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ========== shared：恢复「无策略 + 未启用 RLS」 ==========

DROP POLICY IF EXISTS rls_tenant_isolation ON shared.audit_logs;
ALTER TABLE shared.audit_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE shared.audit_logs DISABLE ROW LEVEL SECURITY;

-- ========== 既有 4 张：恢复旧「nil = 全可见」谓词 ==========

-- public
DROP POLICY IF EXISTS rls_tenant_isolation ON public.audit_logs;
CREATE POLICY rls_tenant_isolation ON public.audit_logs FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  )
  WITH CHECK (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  );

-- mes
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.audit_logs;
CREATE POLICY rls_tenant_isolation ON mes.audit_logs FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  )
  WITH CHECK (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  );

-- plugin_mes
DROP POLICY IF EXISTS rls_tenant_isolation ON plugin_mes.audit_logs;
CREATE POLICY rls_tenant_isolation ON plugin_mes.audit_logs FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  )
  WITH CHECK (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  );

-- rs
DROP POLICY IF EXISTS rls_tenant_isolation ON rs.audit_logs;
CREATE POLICY rls_tenant_isolation ON rs.audit_logs FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  )
  WITH CHECK (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  );

-- ========== 可选：仅在确认表内无数据后执行，彻底恢复原始结构 ==========
-- DROP INDEX IF EXISTS flow.audit_logs_tenant_id_idx;
-- ALTER TABLE flow.audit_logs DROP COLUMN IF EXISTS tenant_id;
-- DROP INDEX IF EXISTS gis.audit_logs_tenant_id_idx;
-- ALTER TABLE gis.audit_logs DROP COLUMN IF EXISTS tenant_id;
-- DROP INDEX IF EXISTS iam.audit_logs_tenant_id_idx;
-- ALTER TABLE iam.audit_logs DROP COLUMN IF EXISTS tenant_id;
-- DROP INDEX IF EXISTS qms.audit_logs_tenant_id_idx;
-- ALTER TABLE qms.audit_logs DROP COLUMN IF EXISTS tenant_id;
-- DROP INDEX IF EXISTS shared.audit_logs_tenant_id_idx;
-- ALTER TABLE shared.audit_logs DROP COLUMN IF EXISTS tenant_id;

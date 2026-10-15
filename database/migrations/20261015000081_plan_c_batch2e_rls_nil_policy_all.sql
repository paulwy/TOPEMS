-- 方案C批2-E：全库 RLS policy 统一补 nil 分支（pool 直连兼容）
-- 背景：PG18 未 SET 的 current_setting('app.tenant_id', true) 返回 nil UUID 字符串（非 SQL NULL/空串）
--       旧 policy 无 nil 分支 → pool 直连显式过滤读/绑租户写被 RLS 拒绝（实测 500 / 空结果）
-- 语义：非 txn crate 隔离靠 handler 显式过滤（方案C），RLS 为兜底；补 nil 分支使 pool 直连路径可用
-- 范围：259 个缺 nil policy（225 tenant_isolation_* + 31 rls_tenant_isolation + 3 ai.*_tenant_policy）
--       4 个 allow_all（USING=true）已全量放行，跳过
-- 生成方式：python 读取 pg_policy 现状生成，追加统一 nil 分支
-- 修订 v2：ALTER POLICY 的 USING/WITH CHECK 合并为单条语句（v1 分号切断导致空 ALTER 未生效）

DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'ai_models' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON ai.ai_models USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'ai_models' AND policyname = 'tenant_isolation_ai_models') THEN
    ALTER POLICY "tenant_isolation_ai_models" ON ai.ai_models USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'ai_prompt_templates' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON ai.ai_prompt_templates USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'ai_prompt_templates' AND policyname = 'tenant_isolation_ai_prompt_templates') THEN
    ALTER POLICY "tenant_isolation_ai_prompt_templates" ON ai.ai_prompt_templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'analysis_results' AND policyname = 'tenant_isolation_analysis_results') THEN
    ALTER POLICY "tenant_isolation_analysis_results" ON ai.analysis_results USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'document_chunks' AND policyname = 'document_chunks_tenant_policy') THEN
    ALTER POLICY "document_chunks_tenant_policy" ON ai.document_chunks USING ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'document_chunks' AND policyname = 'tenant_isolation_document_chunks') THEN
    ALTER POLICY "tenant_isolation_document_chunks" ON ai.document_chunks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'documents' AND policyname = 'documents_tenant_policy') THEN
    ALTER POLICY "documents_tenant_policy" ON ai.documents USING ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'documents' AND policyname = 'tenant_isolation_documents') THEN
    ALTER POLICY "tenant_isolation_documents" ON ai.documents USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'model_usage_stats' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON ai.model_usage_stats USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'model_usage_stats' AND policyname = 'tenant_isolation_model_usage_stats') THEN
    ALTER POLICY "tenant_isolation_model_usage_stats" ON ai.model_usage_stats USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'qa_history' AND policyname = 'qa_history_tenant_policy') THEN
    ALTER POLICY "qa_history_tenant_policy" ON ai.qa_history USING ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'qa_history' AND policyname = 'tenant_isolation_qa_history') THEN
    ALTER POLICY "tenant_isolation_qa_history" ON ai.qa_history USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'usage_logs' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON ai.usage_logs USING ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ai' AND tablename = 'usage_logs' AND policyname = 'tenant_isolation_usage_logs') THEN
    ALTER POLICY "tenant_isolation_usage_logs" ON ai.usage_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'bi' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON bi.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'bi' AND tablename = 'report_schedules' AND policyname = 'tenant_isolation_report_schedules') THEN
    ALTER POLICY "tenant_isolation_report_schedules" ON bi.report_schedules USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'bi' AND tablename = 'report_templates' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON bi.report_templates USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'bi' AND tablename = 'report_templates' AND policyname = 'tenant_isolation_report_templates') THEN
    ALTER POLICY "tenant_isolation_report_templates" ON bi.report_templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'bi' AND tablename = 'reports' AND policyname = 'tenant_isolation_reports') THEN
    ALTER POLICY "tenant_isolation_reports" ON bi.reports USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'communication' AND tablename = 'notification_channels' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON communication.notification_channels USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'communication' AND tablename = 'notification_channels' AND policyname = 'tenant_isolation_notification_channels') THEN
    ALTER POLICY "tenant_isolation_notification_channels" ON communication.notification_channels USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'core' AND tablename = 'core_plugins' AND policyname = 'tenant_isolation_core_plugins') THEN
    ALTER POLICY "tenant_isolation_core_plugins" ON core.core_plugins USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON crm.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'contacts' AND policyname = 'tenant_isolation_contacts') THEN
    ALTER POLICY "tenant_isolation_contacts" ON crm.contacts USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'contracts' AND policyname = 'tenant_isolation_contracts') THEN
    ALTER POLICY "tenant_isolation_contracts" ON crm.contracts USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'customer_finance' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON crm.customer_finance USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'customer_finance' AND policyname = 'tenant_isolation_customer_finance') THEN
    ALTER POLICY "tenant_isolation_customer_finance" ON crm.customer_finance USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'customer_tags' AND policyname = 'tenant_isolation_customer_tags') THEN
    ALTER POLICY "tenant_isolation_customer_tags" ON crm.customer_tags USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'customers' AND policyname = 'tenant_isolation_customers') THEN
    ALTER POLICY "tenant_isolation_customers" ON crm.customers USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'interactions' AND policyname = 'tenant_isolation_interactions') THEN
    ALTER POLICY "tenant_isolation_interactions" ON crm.interactions USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'opportunities' AND policyname = 'tenant_isolation_opportunities') THEN
    ALTER POLICY "tenant_isolation_opportunities" ON crm.opportunities USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'tags' AND policyname = 'tenant_isolation_tags') THEN
    ALTER POLICY "tenant_isolation_tags" ON crm.tags USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'doc_service' AND tablename = 'archives' AND policyname = 'tenant_isolation_archives') THEN
    ALTER POLICY "tenant_isolation_archives" ON doc_service.archives USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'doc_service' AND tablename = 'files' AND policyname = 'tenant_isolation_files') THEN
    ALTER POLICY "tenant_isolation_files" ON doc_service.files USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'doc_service' AND tablename = 'folders' AND policyname = 'tenant_isolation_folders') THEN
    ALTER POLICY "tenant_isolation_folders" ON doc_service.folders USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'doc_service' AND tablename = 'templates' AND policyname = 'tenant_isolation_templates') THEN
    ALTER POLICY "tenant_isolation_templates" ON doc_service.templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON ehs.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'drill_records' AND policyname = 'tenant_isolation_drill_records') THEN
    ALTER POLICY "tenant_isolation_drill_records" ON ehs.drill_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'emergency_plans' AND policyname = 'tenant_isolation_emergency_plans') THEN
    ALTER POLICY "tenant_isolation_emergency_plans" ON ehs.emergency_plans USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'environmental_alerts' AND policyname = 'tenant_isolation_environmental_alerts') THEN
    ALTER POLICY "tenant_isolation_environmental_alerts" ON ehs.environmental_alerts USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'environmental_data' AND policyname = 'tenant_isolation_environmental_data') THEN
    ALTER POLICY "tenant_isolation_environmental_data" ON ehs.environmental_data USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'health_checkups' AND policyname = 'tenant_isolation_health_checkups') THEN
    ALTER POLICY "tenant_isolation_health_checkups" ON ehs.health_checkups USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'health_records' AND policyname = 'tenant_isolation_health_records') THEN
    ALTER POLICY "tenant_isolation_health_records" ON ehs.health_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'monitoring_points' AND policyname = 'tenant_isolation_monitoring_points') THEN
    ALTER POLICY "tenant_isolation_monitoring_points" ON ehs.monitoring_points USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'risk_assessments' AND policyname = 'tenant_isolation_risk_assessments') THEN
    ALTER POLICY "tenant_isolation_risk_assessments" ON ehs.risk_assessments USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'risk_controls' AND policyname = 'tenant_isolation_risk_controls') THEN
    ALTER POLICY "tenant_isolation_risk_controls" ON ehs.risk_controls USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'safety_checks' AND policyname = 'tenant_isolation_safety_checks') THEN
    ALTER POLICY "tenant_isolation_safety_checks" ON ehs.safety_checks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'safety_hazards' AND policyname = 'tenant_isolation_safety_hazards') THEN
    ALTER POLICY "tenant_isolation_safety_hazards" ON ehs.safety_hazards USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'safety_incidents' AND policyname = 'tenant_isolation_safety_incidents') THEN
    ALTER POLICY "tenant_isolation_safety_incidents" ON ehs.safety_incidents USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'training_programs' AND policyname = 'tenant_isolation_training_programs') THEN
    ALTER POLICY "tenant_isolation_training_programs" ON ehs.training_programs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'training_records' AND policyname = 'tenant_isolation_training_records') THEN
    ALTER POLICY "tenant_isolation_training_records" ON ehs.training_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'vaccination_records' AND policyname = 'tenant_isolation_vaccination_records') THEN
    ALTER POLICY "tenant_isolation_vaccination_records" ON ehs.vaccination_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'approval_records' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON flow.approval_records USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'approval_records' AND policyname = 'tenant_isolation_approval_records') THEN
    ALTER POLICY "tenant_isolation_approval_records" ON flow.approval_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'approvals' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON flow.approvals USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'approvals' AND policyname = 'tenant_isolation_approvals') THEN
    ALTER POLICY "tenant_isolation_approvals" ON flow.approvals USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'core_workflow_instances' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON flow.core_workflow_instances USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'core_workflow_instances' AND policyname = 'tenant_isolation_core_workflow_instances') THEN
    ALTER POLICY "tenant_isolation_core_workflow_instances" ON flow.core_workflow_instances USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'core_workflow_tasks' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON flow.core_workflow_tasks USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'core_workflow_tasks' AND policyname = 'tenant_isolation_core_workflow_tasks') THEN
    ALTER POLICY "tenant_isolation_core_workflow_tasks" ON flow.core_workflow_tasks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'notifications' AND policyname = 'tenant_isolation_notifications') THEN
    ALTER POLICY "tenant_isolation_notifications" ON flow.notifications USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'flow' AND tablename = 'workflows' AND policyname = 'tenant_isolation_workflows') THEN
    ALTER POLICY "tenant_isolation_workflows" ON flow.workflows USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'hrm' AND tablename = 'initialization_logs' AND policyname = 'tenant_isolation_initialization_logs') THEN
    ALTER POLICY "tenant_isolation_initialization_logs" ON hrm.initialization_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'hrm' AND tablename = 'initialization_status' AND policyname = 'tenant_isolation_initialization_status') THEN
    ALTER POLICY "tenant_isolation_initialization_status" ON hrm.initialization_status USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'hrm' AND tablename = 'module_settings' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON hrm.module_settings USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'hrm' AND tablename = 'module_settings' AND policyname = 'tenant_isolation_module_settings') THEN
    ALTER POLICY "tenant_isolation_module_settings" ON hrm.module_settings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'iam' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON iam.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'iam' AND tablename = 'permission_templates' AND policyname = 'tenant_isolation_permission_templates') THEN
    ALTER POLICY "tenant_isolation_permission_templates" ON iam.permission_templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'iam' AND tablename = 'permissions' AND policyname = 'tenant_isolation_permissions') THEN
    ALTER POLICY "tenant_isolation_permissions" ON iam.permissions USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'iam' AND tablename = 'roles' AND policyname = 'tenant_isolation_roles') THEN
    ALTER POLICY "tenant_isolation_roles" ON iam.roles USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'integration' AND tablename = 'async_tasks' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON integration.async_tasks USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'integration' AND tablename = 'async_tasks' AND policyname = 'tenant_isolation_async_tasks') THEN
    ALTER POLICY "tenant_isolation_async_tasks" ON integration.async_tasks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'integration' AND tablename = 'integration_events' AND policyname = 'tenant_isolation_integration_events') THEN
    ALTER POLICY "tenant_isolation_integration_events" ON integration.integration_events USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'integration' AND tablename = 'lims_qms_sync' AND policyname = 'tenant_isolation_lims_qms_sync') THEN
    ALTER POLICY "tenant_isolation_lims_qms_sync" ON integration.lims_qms_sync USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'integration' AND tablename = 'mes_erp_sync' AND policyname = 'tenant_isolation_mes_erp_sync') THEN
    ALTER POLICY "tenant_isolation_mes_erp_sync" ON integration.mes_erp_sync USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'integration' AND tablename = 'wms_scm_sync' AND policyname = 'tenant_isolation_wms_scm_sync') THEN
    ALTER POLICY "tenant_isolation_wms_scm_sync" ON integration.wms_scm_sync USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'ai_analyses' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON lims.ai_analyses USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'ai_analyses' AND policyname = 'tenant_isolation_ai_analyses') THEN
    ALTER POLICY "tenant_isolation_ai_analyses" ON lims.ai_analyses USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON lims.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'document_relations' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON lims.document_relations USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'document_relations' AND policyname = 'tenant_isolation_document_relations') THEN
    ALTER POLICY "tenant_isolation_document_relations" ON lims.document_relations USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'inspection_processes' AND policyname = 'tenant_isolation_inspection_processes') THEN
    ALTER POLICY "tenant_isolation_inspection_processes" ON lims.inspection_processes USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'inspection_records' AND policyname = 'tenant_isolation_inspection_records') THEN
    ALTER POLICY "tenant_isolation_inspection_records" ON lims.inspection_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'inspection_tasks' AND policyname = 'tenant_isolation_inspection_tasks') THEN
    ALTER POLICY "tenant_isolation_inspection_tasks" ON lims.inspection_tasks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'instrument_calibrations' AND policyname = 'tenant_isolation_instrument_calibrations') THEN
    ALTER POLICY "tenant_isolation_instrument_calibrations" ON lims.instrument_calibrations USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'instruments' AND policyname = 'tenant_isolation_instruments') THEN
    ALTER POLICY "tenant_isolation_instruments" ON lims.instruments USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'lab_ledger' AND policyname = 'tenant_isolation_lab_ledger') THEN
    ALTER POLICY "tenant_isolation_lab_ledger" ON lims.lab_ledger USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'maintenance_records' AND policyname = 'tenant_isolation_maintenance_records') THEN
    ALTER POLICY "tenant_isolation_maintenance_records" ON lims.maintenance_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'reagent_usages' AND policyname = 'tenant_isolation_reagent_usages') THEN
    ALTER POLICY "tenant_isolation_reagent_usages" ON lims.reagent_usages USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'reagents' AND policyname = 'tenant_isolation_reagents') THEN
    ALTER POLICY "tenant_isolation_reagents" ON lims.reagents USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'lims' AND tablename = 'samples' AND policyname = 'tenant_isolation_samples') THEN
    ALTER POLICY "tenant_isolation_samples" ON lims.samples USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mail' AND tablename = 'emails' AND policyname = 'tenant_isolation_emails') THEN
    ALTER POLICY "tenant_isolation_emails" ON mail.emails USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mail' AND tablename = 'templates' AND policyname = 'tenant_isolation_templates') THEN
    ALTER POLICY "tenant_isolation_templates" ON mail.templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'core_dict_items' AND policyname = 'tenant_isolation_core_dict_items') THEN
    ALTER POLICY "tenant_isolation_core_dict_items" ON master_data.core_dict_items USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'core_dict_types' AND policyname = 'tenant_isolation_core_dict_types') THEN
    ALTER POLICY "tenant_isolation_core_dict_types" ON master_data.core_dict_types USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_audit_events' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_audit_events USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_audit_export_logs' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_audit_export_logs USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_auto_fix_actions' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_auto_fix_actions USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_billing_records' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_billing_records USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_data_permissions' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_data_permissions USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_fix_strategies' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_fix_strategies USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_governance_insights' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_governance_insights USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_governance_suggestions' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_governance_suggestions USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_lifecycle_history' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_lifecycle_history USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_lifecycle_policies' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_lifecycle_policies USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_lifecycle_stages' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_lifecycle_stages USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_metadata_attributes' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_metadata_attributes USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_metadata_tags' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_metadata_tags USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_permission_roles' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_permission_roles USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_quality_checks' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_quality_checks USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_quality_loop_configs' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_quality_loop_configs USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_rate_cards' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_rate_cards USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_sla_configs' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_sla_configs USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_sla_incidents' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_sla_incidents USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_sla_measurements' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_sla_measurements USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_usage_records' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_usage_records USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_user_role_assignments' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_user_role_assignments USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_v' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_v60_lineage_edges USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_v' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_v60_lineage_graphs USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_v' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_v60_lineage_nodes USING ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'mdm_version_branches' AND policyname = 'tenant_isolation_policy') THEN
    ALTER POLICY "tenant_isolation_policy" ON master_data.mdm_version_branches USING ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'equipment' AND policyname = 'tenant_isolation_equipment') THEN
    ALTER POLICY "tenant_isolation_equipment" ON mes.equipment USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'equipment_inspection_records' AND policyname = 'tenant_isolation_equipment_inspection_records') THEN
    ALTER POLICY "tenant_isolation_equipment_inspection_records" ON mes.equipment_inspection_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'equipment_maintenance_records' AND policyname = 'tenant_isolation_equipment_maintenance_records') THEN
    ALTER POLICY "tenant_isolation_equipment_maintenance_records" ON mes.equipment_maintenance_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'module_settings' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON mes.module_settings USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'module_settings' AND policyname = 'tenant_isolation_module_settings') THEN
    ALTER POLICY "tenant_isolation_module_settings" ON mes.module_settings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'process_flow_steps' AND policyname = 'tenant_isolation_process_flow_steps') THEN
    ALTER POLICY "tenant_isolation_process_flow_steps" ON mes.process_flow_steps USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'process_flows' AND policyname = 'tenant_isolation_process_flows') THEN
    ALTER POLICY "tenant_isolation_process_flows" ON mes.process_flows USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'process_route_steps' AND policyname = 'tenant_isolation_process_route_steps') THEN
    ALTER POLICY "tenant_isolation_process_route_steps" ON mes.process_route_steps USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'process_routes' AND policyname = 'tenant_isolation_process_routes') THEN
    ALTER POLICY "tenant_isolation_process_routes" ON mes.process_routes USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'production_orders' AND policyname = 'tenant_isolation_production_orders') THEN
    ALTER POLICY "tenant_isolation_production_orders" ON mes.production_orders USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'production_processes' AND policyname = 'tenant_isolation_production_processes') THEN
    ALTER POLICY "tenant_isolation_production_processes" ON mes.production_processes USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'production_records' AND policyname = 'tenant_isolation_production_records') THEN
    ALTER POLICY "tenant_isolation_production_records" ON mes.production_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'quality_inspections' AND policyname = 'tenant_isolation_quality_inspections') THEN
    ALTER POLICY "tenant_isolation_quality_inspections" ON mes.quality_inspections USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'quality_patrol_items' AND policyname = 'tenant_isolation_quality_patrol_items') THEN
    ALTER POLICY "tenant_isolation_quality_patrol_items" ON mes.quality_patrol_items USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'quality_patrols' AND policyname = 'tenant_isolation_quality_patrols') THEN
    ALTER POLICY "tenant_isolation_quality_patrols" ON mes.quality_patrols USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'quality_standard_values' AND policyname = 'tenant_isolation_quality_standard_values') THEN
    ALTER POLICY "tenant_isolation_quality_standard_values" ON mes.quality_standard_values USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'quality_standards' AND policyname = 'tenant_isolation_quality_standards') THEN
    ALTER POLICY "tenant_isolation_quality_standards" ON mes.quality_standards USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mes' AND tablename = 'work_stations' AND policyname = 'tenant_isolation_work_stations') THEN
    ALTER POLICY "tenant_isolation_work_stations" ON mes.work_stations USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'audio_recordings' AND policyname = 'tenant_isolation_audio_recordings') THEN
    ALTER POLICY "tenant_isolation_audio_recordings" ON mobile.audio_recordings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'barcode_scans' AND policyname = 'tenant_isolation_barcode_scans') THEN
    ALTER POLICY "tenant_isolation_barcode_scans" ON mobile.barcode_scans USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'devices' AND policyname = 'tenant_isolation_devices') THEN
    ALTER POLICY "tenant_isolation_devices" ON mobile.devices USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'media_files' AND policyname = 'tenant_isolation_media_files') THEN
    ALTER POLICY "tenant_isolation_media_files" ON mobile.media_files USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'mobile_scan_records' AND policyname = 'tenant_isolation_mobile_scan_records') THEN
    ALTER POLICY "tenant_isolation_mobile_scan_records" ON mobile.mobile_scan_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'mobile_tasks' AND policyname = 'tenant_isolation_mobile_tasks') THEN
    ALTER POLICY "tenant_isolation_mobile_tasks" ON mobile.mobile_tasks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'mobile_users' AND policyname = 'tenant_isolation_mobile_users') THEN
    ALTER POLICY "tenant_isolation_mobile_users" ON mobile.mobile_users USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_announcements' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON mobile.oa_announcements USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_announcements' AND policyname = 'tenant_isolation_oa_announcements') THEN
    ALTER POLICY "tenant_isolation_oa_announcements" ON mobile.oa_announcements USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_calendar_events' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON mobile.oa_calendar_events USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_calendar_events' AND policyname = 'tenant_isolation_oa_calendar_events') THEN
    ALTER POLICY "tenant_isolation_oa_calendar_events" ON mobile.oa_calendar_events USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_meetings' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON mobile.oa_meetings USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_meetings' AND policyname = 'tenant_isolation_oa_meetings') THEN
    ALTER POLICY "tenant_isolation_oa_meetings" ON mobile.oa_meetings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_tasks' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON mobile.oa_tasks USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'oa_tasks' AND policyname = 'tenant_isolation_oa_tasks') THEN
    ALTER POLICY "tenant_isolation_oa_tasks" ON mobile.oa_tasks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'offline_operations' AND policyname = 'tenant_isolation_offline_operations') THEN
    ALTER POLICY "tenant_isolation_offline_operations" ON mobile.offline_operations USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'offline_sync_records' AND policyname = 'tenant_isolation_offline_sync_records') THEN
    ALTER POLICY "tenant_isolation_offline_sync_records" ON mobile.offline_sync_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'patrol_records' AND policyname = 'tenant_isolation_patrol_records') THEN
    ALTER POLICY "tenant_isolation_patrol_records" ON mobile.patrol_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'photo_evidences' AND policyname = 'tenant_isolation_photo_evidences') THEN
    ALTER POLICY "tenant_isolation_photo_evidences" ON mobile.photo_evidences USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'photo_uploads' AND policyname = 'tenant_isolation_photo_uploads') THEN
    ALTER POLICY "tenant_isolation_photo_uploads" ON mobile.photo_uploads USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'push_devices' AND policyname = 'tenant_isolation_push_devices') THEN
    ALTER POLICY "tenant_isolation_push_devices" ON mobile.push_devices USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'push_notifications' AND policyname = 'tenant_isolation_push_notifications') THEN
    ALTER POLICY "tenant_isolation_push_notifications" ON mobile.push_notifications USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'push_templates' AND policyname = 'tenant_isolation_push_templates') THEN
    ALTER POLICY "tenant_isolation_push_templates" ON mobile.push_templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'scan_records' AND policyname = 'tenant_isolation_scan_records') THEN
    ALTER POLICY "tenant_isolation_scan_records" ON mobile.scan_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'sync_policies' AND policyname = 'tenant_isolation_sync_policies') THEN
    ALTER POLICY "tenant_isolation_sync_policies" ON mobile.sync_policies USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'mobile' AND tablename = 'video_recordings' AND policyname = 'tenant_isolation_video_recordings') THEN
    ALTER POLICY "tenant_isolation_video_recordings" ON mobile.video_recordings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'notification' AND tablename = 'notifications' AND policyname = 'tenant_isolation_notifications') THEN
    ALTER POLICY "tenant_isolation_notifications" ON notification.notifications USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pdm' AND tablename = 'module_settings' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON pdm.module_settings USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pdm' AND tablename = 'module_settings' AND policyname = 'tenant_isolation_module_settings') THEN
    ALTER POLICY "tenant_isolation_module_settings" ON pdm.module_settings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'plugin_finance' AND tablename = 'difference_adjustments' AND policyname = 'tenant_isolation_difference_adjustments') THEN
    ALTER POLICY "tenant_isolation_difference_adjustments" ON plugin_finance.difference_adjustments USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'plugin_finance' AND tablename = 'reconciliation_item_snapshots' AND policyname = 'tenant_isolation_reconciliation_item_snapshots') THEN
    ALTER POLICY "tenant_isolation_reconciliation_item_snapshots" ON plugin_finance.reconciliation_item_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'plugin_finance' AND tablename = 'reconciliation_settlement_links' AND policyname = 'tenant_isolation_reconciliation_settlement_links') THEN
    ALTER POLICY "tenant_isolation_reconciliation_settlement_links" ON plugin_finance.reconciliation_settlement_links USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'plugin_finance' AND tablename = 'reconciliation_snapshots' AND policyname = 'tenant_isolation_reconciliation_snapshots') THEN
    ALTER POLICY "tenant_isolation_reconciliation_snapshots" ON plugin_finance.reconciliation_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'plugin_finance' AND tablename = 'settlement_snapshots' AND policyname = 'tenant_isolation_settlement_snapshots') THEN
    ALTER POLICY "tenant_isolation_settlement_snapshots" ON plugin_finance.settlement_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'plugin_mes' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON plugin_mes.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'acceptance_items' AND policyname = 'tenant_isolation_acceptance_items') THEN
    ALTER POLICY "tenant_isolation_acceptance_items" ON pm.acceptance_items USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'acceptance_plans' AND policyname = 'tenant_isolation_acceptance_plans') THEN
    ALTER POLICY "tenant_isolation_acceptance_plans" ON pm.acceptance_plans USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'acceptance_records' AND policyname = 'tenant_isolation_acceptance_records') THEN
    ALTER POLICY "tenant_isolation_acceptance_records" ON pm.acceptance_records USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'acceptances' AND policyname = 'tenant_isolation_acceptances') THEN
    ALTER POLICY "tenant_isolation_acceptances" ON pm.acceptances USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'budget_items' AND policyname = 'tenant_isolation_budget_items') THEN
    ALTER POLICY "tenant_isolation_budget_items" ON pm.budget_items USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'budgets' AND policyname = 'tenant_isolation_budgets') THEN
    ALTER POLICY "tenant_isolation_budgets" ON pm.budgets USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'contract_milestones' AND policyname = 'tenant_isolation_contract_milestones') THEN
    ALTER POLICY "tenant_isolation_contract_milestones" ON pm.contract_milestones USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'contract_payment_schedule' AND policyname = 'tenant_isolation_contract_payment_schedule') THEN
    ALTER POLICY "tenant_isolation_contract_payment_schedule" ON pm.contract_payment_schedule USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'contract_templates' AND policyname = 'tenant_isolation_contract_templates') THEN
    ALTER POLICY "tenant_isolation_contract_templates" ON pm.contract_templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'contracts' AND policyname = 'tenant_isolation_contracts') THEN
    ALTER POLICY "tenant_isolation_contracts" ON pm.contracts USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'defects' AND policyname = 'tenant_isolation_defects') THEN
    ALTER POLICY "tenant_isolation_defects" ON pm.defects USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'document_folders' AND policyname = 'tenant_isolation_document_folders') THEN
    ALTER POLICY "tenant_isolation_document_folders" ON pm.document_folders USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'document_versions' AND policyname = 'tenant_isolation_document_versions') THEN
    ALTER POLICY "tenant_isolation_document_versions" ON pm.document_versions USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'documents' AND policyname = 'tenant_isolation_documents') THEN
    ALTER POLICY "tenant_isolation_documents" ON pm.documents USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'notification_settings' AND policyname = 'tenant_isolation_notification_settings') THEN
    ALTER POLICY "tenant_isolation_notification_settings" ON pm.notification_settings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'notifications' AND policyname = 'tenant_isolation_notifications') THEN
    ALTER POLICY "tenant_isolation_notifications" ON pm.notifications USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_approvals' AND policyname = 'tenant_isolation_project_approvals') THEN
    ALTER POLICY "tenant_isolation_project_approvals" ON pm.project_approvals USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_benefits' AND policyname = 'tenant_isolation_project_benefits') THEN
    ALTER POLICY "tenant_isolation_project_benefits" ON pm.project_benefits USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_documents' AND policyname = 'tenant_isolation_project_documents') THEN
    ALTER POLICY "tenant_isolation_project_documents" ON pm.project_documents USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_expenses' AND policyname = 'tenant_isolation_project_expenses') THEN
    ALTER POLICY "tenant_isolation_project_expenses" ON pm.project_expenses USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_members' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON pm.project_members USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_members' AND policyname = 'tenant_isolation_project_members') THEN
    ALTER POLICY "tenant_isolation_project_members" ON pm.project_members USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_milestones' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON pm.project_milestones USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_milestones' AND policyname = 'tenant_isolation_project_milestones') THEN
    ALTER POLICY "tenant_isolation_project_milestones" ON pm.project_milestones USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_phases' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON pm.project_phases USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_phases' AND policyname = 'tenant_isolation_project_phases') THEN
    ALTER POLICY "tenant_isolation_project_phases" ON pm.project_phases USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_reports' AND policyname = 'tenant_isolation_project_reports') THEN
    ALTER POLICY "tenant_isolation_project_reports" ON pm.project_reports USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_resources' AND policyname = 'tenant_isolation_project_resources') THEN
    ALTER POLICY "tenant_isolation_project_resources" ON pm.project_resources USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_risks' AND policyname = 'tenant_isolation_project_risks') THEN
    ALTER POLICY "tenant_isolation_project_risks" ON pm.project_risks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'project_type_configs' AND policyname = 'tenant_isolation_project_type_configs') THEN
    ALTER POLICY "tenant_isolation_project_type_configs" ON pm.project_type_configs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'projects' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON pm.projects USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'projects' AND policyname = 'tenant_isolation_projects') THEN
    ALTER POLICY "tenant_isolation_projects" ON pm.projects USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'quality_checks' AND policyname = 'tenant_isolation_quality_checks') THEN
    ALTER POLICY "tenant_isolation_quality_checks" ON pm.quality_checks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'report_templates' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON pm.report_templates USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'report_templates' AND policyname = 'tenant_isolation_report_templates') THEN
    ALTER POLICY "tenant_isolation_report_templates" ON pm.report_templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'risk_events' AND policyname = 'tenant_isolation_risk_events') THEN
    ALTER POLICY "tenant_isolation_risk_events" ON pm.risk_events USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'risks' AND policyname = 'tenant_isolation_risks') THEN
    ALTER POLICY "tenant_isolation_risks" ON pm.risks USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'service_integrations' AND policyname = 'tenant_isolation_service_integrations') THEN
    ALTER POLICY "tenant_isolation_service_integrations" ON pm.service_integrations USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'settlement_adjustments' AND policyname = 'tenant_isolation_settlement_adjustments') THEN
    ALTER POLICY "tenant_isolation_settlement_adjustments" ON pm.settlement_adjustments USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'settlement_items' AND policyname = 'tenant_isolation_settlement_items') THEN
    ALTER POLICY "tenant_isolation_settlement_items" ON pm.settlement_items USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'settlements' AND policyname = 'tenant_isolation_settlements') THEN
    ALTER POLICY "tenant_isolation_settlements" ON pm.settlements USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'portal' AND tablename = 'portal_announcements' AND policyname = 'tenant_isolation_portal_announcements') THEN
    ALTER POLICY "tenant_isolation_portal_announcements" ON portal.portal_announcements USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'portal' AND tablename = 'portal_quick_actions' AND policyname = 'tenant_isolation_portal_quick_actions') THEN
    ALTER POLICY "tenant_isolation_portal_quick_actions" ON portal.portal_quick_actions USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'portal' AND tablename = 'portal_todos' AND policyname = 'tenant_isolation_portal_todos') THEN
    ALTER POLICY "tenant_isolation_portal_todos" ON portal.portal_todos USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'portal' AND tablename = 'user_preferences' AND policyname = 'tenant_isolation_user_preferences') THEN
    ALTER POLICY "tenant_isolation_user_preferences" ON portal.user_preferences USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'archived_notifications' AND policyname = 'tenant_isolation_archived_notifications') THEN
    ALTER POLICY "tenant_isolation_archived_notifications" ON public.archived_notifications USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_dashboard_snapshots' AND policyname = 'tenant_isolation_crm_dashboard_snapshots') THEN
    ALTER POLICY "tenant_isolation_crm_dashboard_snapshots" ON public.crm_dashboard_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ehs_dashboard_snapshots' AND policyname = 'tenant_isolation_ehs_dashboard_snapshots') THEN
    ALTER POLICY "tenant_isolation_ehs_dashboard_snapshots" ON public.ehs_dashboard_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hrm_dashboard_snapshots' AND policyname = 'tenant_isolation_hrm_dashboard_snapshots') THEN
    ALTER POLICY "tenant_isolation_hrm_dashboard_snapshots" ON public.hrm_dashboard_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lims_dashboard_snapshots' AND policyname = 'tenant_isolation_lims_dashboard_snapshots') THEN
    ALTER POLICY "tenant_isolation_lims_dashboard_snapshots" ON public.lims_dashboard_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monitor_settings' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON public.monitor_settings USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monitor_settings' AND policyname = 'tenant_isolation_monitor_settings') THEN
    ALTER POLICY "tenant_isolation_monitor_settings" ON public.monitor_settings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_templates' AND policyname = 'tenant_isolation_notification_templates') THEN
    ALTER POLICY "tenant_isolation_notification_templates" ON public.notification_templates USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pdm_dashboard_snapshots' AND policyname = 'tenant_isolation_pdm_dashboard_snapshots') THEN
    ALTER POLICY "tenant_isolation_pdm_dashboard_snapshots" ON public.pdm_dashboard_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_logs' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON public.search_logs USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_logs' AND policyname = 'tenant_isolation_search_logs') THEN
    ALTER POLICY "tenant_isolation_search_logs" ON public.search_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON public.system_settings USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'tenant_isolation_system_settings') THEN
    ALTER POLICY "tenant_isolation_system_settings" ON public.system_settings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenant_isolation_tenants') THEN
    ALTER POLICY "tenant_isolation_tenants" ON public.tenants USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'versions' AND policyname = 'tenant_isolation_versions') THEN
    ALTER POLICY "tenant_isolation_versions" ON public.versions USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wms_dashboard_snapshots' AND policyname = 'tenant_isolation_wms_dashboard_snapshots') THEN
    ALTER POLICY "tenant_isolation_wms_dashboard_snapshots" ON public.wms_dashboard_snapshots USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON qms.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'corrective_actions' AND policyname = 'tenant_isolation_corrective_actions') THEN
    ALTER POLICY "tenant_isolation_corrective_actions" ON qms.corrective_actions USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'dashboard_metrics' AND policyname = 'tenant_isolation_dashboard_metrics') THEN
    ALTER POLICY "tenant_isolation_dashboard_metrics" ON qms.dashboard_metrics USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'inspection_items' AND policyname = 'tenant_isolation_inspection_items') THEN
    ALTER POLICY "tenant_isolation_inspection_items" ON qms.inspection_items USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'qa_ehs_hazards' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON qms.qa_ehs_hazards USING ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'qa_ehs_hazards' AND policyname = 'tenant_isolation_qa_ehs_hazards') THEN
    ALTER POLICY "tenant_isolation_qa_ehs_hazards" ON qms.qa_ehs_hazards USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'quality_inspections' AND policyname = 'tenant_isolation_quality_inspections') THEN
    ALTER POLICY "tenant_isolation_quality_inspections" ON qms.quality_inspections USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'quality_issues' AND policyname = 'tenant_isolation_quality_issues') THEN
    ALTER POLICY "tenant_isolation_quality_issues" ON qms.quality_issues USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'qms' AND tablename = 'quality_standards' AND policyname = 'tenant_isolation_quality_standards') THEN
    ALTER POLICY "tenant_isolation_quality_standards" ON qms.quality_standards USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'report' AND tablename = 'reports' AND policyname = 'tenant_isolation_reports') THEN
    ALTER POLICY "tenant_isolation_reports" ON report.reports USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rs' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON rs.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rs' AND tablename = 'experiments' AND policyname = 'tenant_isolation_experiments') THEN
    ALTER POLICY "tenant_isolation_experiments" ON rs.experiments USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rs' AND tablename = 'module_settings' AND policyname = 'rls_tenant_isolation') THEN
    ALTER POLICY "rls_tenant_isolation" ON rs.module_settings USING ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)) WITH CHECK ((((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rs' AND tablename = 'module_settings' AND policyname = 'tenant_isolation_module_settings') THEN
    ALTER POLICY "tenant_isolation_module_settings" ON rs.module_settings USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs') THEN
    ALTER POLICY "tenant_isolation_audit_logs" ON srm.audit_logs USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'contract_terms' AND policyname = 'tenant_isolation_contract_terms') THEN
    ALTER POLICY "tenant_isolation_contract_terms" ON srm.contract_terms USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'purchase_orders' AND policyname = 'tenant_isolation_purchase_orders') THEN
    ALTER POLICY "tenant_isolation_purchase_orders" ON srm.purchase_orders USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'supplier_categories' AND policyname = 'tenant_isolation_supplier_categories') THEN
    ALTER POLICY "tenant_isolation_supplier_categories" ON srm.supplier_categories USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'supplier_contracts' AND policyname = 'tenant_isolation_supplier_contracts') THEN
    ALTER POLICY "tenant_isolation_supplier_contracts" ON srm.supplier_contracts USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'supplier_evaluations' AND policyname = 'tenant_isolation_supplier_evaluations') THEN
    ALTER POLICY "tenant_isolation_supplier_evaluations" ON srm.supplier_evaluations USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'supplier_products' AND policyname = 'tenant_isolation_supplier_products') THEN
    ALTER POLICY "tenant_isolation_supplier_products" ON srm.supplier_products USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'srm' AND tablename = 'suppliers' AND policyname = 'tenant_isolation_suppliers') THEN
    ALTER POLICY "tenant_isolation_suppliers" ON srm.suppliers USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;
DO $nilguard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'files' AND policyname = 'tenant_isolation_files') THEN
    ALTER POLICY "tenant_isolation_files" ON storage.files USING (((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
  END IF;
END $nilguard$;

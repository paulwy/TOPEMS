-- ai schema RLS 上下文修复：
-- 1) 全仓服务实际写入的 GUC 为 app.tenant_id（tenant_middleware / rls.rs），
--    usage_logs 新建 policy 误用旧的 app.current_tenant_id → 上下文永远不匹配。
-- 2) qa_history 旧 policy 对 current_setting 裸 ::uuid，连接上 GUC 为空串时
--    抛 "invalid input syntax for type uuid"（真实缺陷，QA 首次写路径暴露）。
-- 修复：统一 app.tenant_id + NULLIF 空安全（对齐 lib/shared-db/src/rls.rs 标准生成器），
--       未设置上下文时仅放行 tenant_id IS NULL 的行（严格租户隔离）。
-- 2026-09-18 防御化（空库重建链卡点）：ai 大部分表无 tenant_id 列（业务表设计如此），
-- 重构为 FOREACH 循环：表不存在或无 tenant_id 列时跳过该表策略。

DO $$
DECLARE
  _guc text := 'app.tenant_id';
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai.qa_history', 'ai.usage_logs', 'ai.documents', 'ai.document_chunks'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2))
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2)
                 AND column_name = 'tenant_id') THEN
      EXECUTE 'DROP POLICY IF EXISTS qa_history_tenant_policy ON ' || t;
      EXECUTE 'DROP POLICY IF EXISTS rls_tenant_isolation ON ' || t;
      EXECUTE 'DROP POLICY IF EXISTS documents_tenant_policy ON ' || t;
      EXECUTE 'DROP POLICY IF EXISTS document_chunks_tenant_policy ON ' || t;
      EXECUTE format($p$CREATE POLICY rls_tenant_isolation ON $p$ || t || $p$ USING (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
      ) WITH CHECK (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
      )$p$, _guc, _guc);
    END IF;
  END LOOP;
END $$;

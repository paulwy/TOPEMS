-- ai schema RLS 上下文修复：
-- 1) 全仓服务实际写入的 GUC 为 app.tenant_id（tenant_middleware / rls.rs），
--    usage_logs 新建 policy 误用旧的 app.current_tenant_id → 上下文永远不匹配。
-- 2) qa_history 旧 policy 对 current_setting 裸 ::uuid，连接上 GUC 为空串时
--    抛 "invalid input syntax for type uuid"（真实缺陷，QA 首次写路径暴露）。
-- 修复：统一 app.tenant_id + NULLIF 空安全（对齐 lib/shared-db/src/rls.rs 标准生成器），
--       未设置上下文时仅放行 tenant_id IS NULL 的行（严格租户隔离）。

DO $$
DECLARE _guc text := 'app.tenant_id';
BEGIN
    -- ========== ai.qa_history ==========
    DROP POLICY IF EXISTS qa_history_tenant_policy ON ai.qa_history;
    DROP POLICY IF EXISTS rls_tenant_isolation ON ai.qa_history;
    EXECUTE format($p$CREATE POLICY qa_history_tenant_policy ON ai.qa_history USING (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    ) WITH CHECK (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    )$p$, _guc, _guc);

    -- ========== ai.usage_logs（GUC 名对齐 + 空安全）==========
    DROP POLICY IF EXISTS rls_tenant_isolation ON ai.usage_logs;
    EXECUTE format($p$CREATE POLICY rls_tenant_isolation ON ai.usage_logs USING (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    ) WITH CHECK (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    )$p$, _guc, _guc);

    -- ========== ai.documents / ai.document_chunks（历史 NULLIF 写法已安全，统一校验一遍）==========
    DROP POLICY IF EXISTS documents_tenant_policy ON ai.documents;
    DROP POLICY IF EXISTS document_chunks_tenant_policy ON ai.document_chunks;
    EXECUTE format($p$CREATE POLICY documents_tenant_policy ON ai.documents USING (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    ) WITH CHECK (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    )$p$, _guc, _guc);
    EXECUTE format($p$CREATE POLICY document_chunks_tenant_policy ON ai.document_chunks USING (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    ) WITH CHECK (
        tenant_id = NULLIF(current_setting(%L, true), '')::uuid OR tenant_id IS NULL
    )$p$, _guc, _guc);
END $$;

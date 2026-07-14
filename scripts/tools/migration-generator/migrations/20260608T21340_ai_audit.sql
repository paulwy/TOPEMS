-- ============================================
-- AI 审计触发器
-- 生成时间: 2026-06-08T21:34:08.321Z
-- ============================================

BEGIN;

SET search_path TO ai, public;

-- 审计日志函数
CREATE OR REPLACE FUNCTION ai.audit_log_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_action VARCHAR(50);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_old_data = to_jsonb(OLD);
        v_action = 'DELETE';
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data = to_jsonb(OLD);
        v_new_data = to_jsonb(NEW);
        v_action = 'UPDATE';
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data = to_jsonb(NEW);
        v_action = 'INSERT';
    END IF;

    INSERT INTO ai.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent,
        organization_id
    ) VALUES (
        CURRENT_SETTING('app.user_id')::UUID,
        v_action,
        TG_TABLE_NAME,
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        v_old_data,
        v_new_data,
        CURRENT_SETTING('app.ip_address', TRUE),
        CURRENT_SETTING('app.user_agent', TRUE),
        CURRENT_SETTING('app.organization_id')::UUID
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- knowledge_bases 审计触发器
DROP TRIGGER IF EXISTS trigger_knowledge_bases_audit ON ai.knowledge_bases;

CREATE TRIGGER trigger_knowledge_bases_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

-- documents 审计触发器
DROP TRIGGER IF EXISTS trigger_documents_audit ON ai.documents;

CREATE TRIGGER trigger_documents_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.documents
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

-- document_chunks 审计触发器
DROP TRIGGER IF EXISTS trigger_document_chunks_audit ON ai.document_chunks;

CREATE TRIGGER trigger_document_chunks_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.document_chunks
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

-- search_queries 审计触发器
DROP TRIGGER IF EXISTS trigger_search_queries_audit ON ai.search_queries;

CREATE TRIGGER trigger_search_queries_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.search_queries
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

-- ai_models 审计触发器
DROP TRIGGER IF EXISTS trigger_ai_models_audit ON ai.ai_models;

CREATE TRIGGER trigger_ai_models_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.ai_models
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

-- conversations 审计触发器
DROP TRIGGER IF EXISTS trigger_conversations_audit ON ai.conversations;

CREATE TRIGGER trigger_conversations_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.conversations
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

-- conversation_messages 审计触发器
DROP TRIGGER IF EXISTS trigger_conversation_messages_audit ON ai.conversation_messages;

CREATE TRIGGER trigger_conversation_messages_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.conversation_messages
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

-- embedding_tasks 审计触发器
DROP TRIGGER IF EXISTS trigger_embedding_tasks_audit ON ai.embedding_tasks;

CREATE TRIGGER trigger_embedding_tasks_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.embedding_tasks
    FOR EACH ROW EXECUTE FUNCTION ai.audit_log_change();

COMMIT;

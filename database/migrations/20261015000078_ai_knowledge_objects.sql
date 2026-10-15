-- ai_knowledge 补齐缺失对象（D3 遗留：ddl_pool 无 DDL 权限而降级 warn 的对象）
-- 表 owner 均为 topems_app，本 migration 以 DATABASE_URL(topems_app) 执行。
-- 全部幂等：索引 IF NOT EXISTS、函数 OR REPLACE、触发器存在性检查后创建。

-- 1. 向量索引 idx_kc_embedding（IVFFlat，语义检索专用）
CREATE INDEX IF NOT EXISTS idx_kc_embedding
    ON core.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 2. 问答历史索引 idx_qa_*（4）
CREATE INDEX IF NOT EXISTS idx_qa_tenant_id ON core.knowledge_qa_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_kb_id     ON core.knowledge_qa_history(kb_id);
CREATE INDEX IF NOT EXISTS idx_qa_user_id   ON core.knowledge_qa_history(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_created_at ON core.knowledge_qa_history(created_at);

-- 3. updated_at 触发器函数（显式 core schema：此前 search_path 解析误入 ai/mes）
CREATE OR REPLACE FUNCTION core.core_set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 触发器 trg_kb_updated_at / trg_kd_updated_at（存在性守卫后创建，显式绑定 core 函数）
DO $$
BEGIN
    DROP TRIGGER IF EXISTS trg_kb_updated_at ON core.knowledge_bases;
    CREATE TRIGGER trg_kb_updated_at BEFORE UPDATE ON core.knowledge_bases
        FOR EACH ROW EXECUTE FUNCTION core.core_set_updated_at();
    DROP TRIGGER IF EXISTS trg_kd_updated_at ON core.knowledge_documents;
    CREATE TRIGGER trg_kd_updated_at BEFORE UPDATE ON core.knowledge_documents
        FOR EACH ROW EXECUTE FUNCTION core.core_set_updated_at();
END $$;

-- 断言
DO $$
DECLARE
    missing int := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='core' AND indexname='idx_kc_embedding') THEN
        RAISE NOTICE 'MISSING idx_kc_embedding'; missing := missing + 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='core' AND indexname='idx_qa_tenant_id') THEN
        RAISE NOTICE 'MISSING idx_qa_tenant_id'; missing := missing + 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='core'::regnamespace AND proname='core_set_updated_at') THEN
        RAISE NOTICE 'MISSING core_set_updated_at'; missing := missing + 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='core.knowledge_bases'::regclass AND tgname='trg_kb_updated_at' AND NOT tgisinternal) THEN
        RAISE NOTICE 'MISSING trg_kb_updated_at'; missing := missing + 1;
    END IF;
    IF missing > 0 THEN
        RAISE EXCEPTION 'ai_knowledge objects incomplete: % issue(s)', missing;
    END IF;
    RAISE NOTICE 'ai_knowledge objects OK';
END $$;

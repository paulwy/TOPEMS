-- 回滚 20261120120000_ai_drop_duplicate_chunk_document_idx
--
-- 重新创建被删除的冗余索引，使 schema 回到迁移前形状。
-- 注意：该索引与 idx_document_chunks_document_id 定义完全相同，回滚只用于
-- 严格复原现场，不恢复任何业务语义。

CREATE INDEX IF NOT EXISTS idx_chunks_document_id
    ON ai.document_chunks USING btree (document_id);

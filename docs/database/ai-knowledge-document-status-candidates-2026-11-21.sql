-- B77 · core.knowledge_documents.status 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ai/src/modules/ai_knowledge/document_status.rs（KnowledgeDocumentStatus）
-- 生命周期：pending → processing → ready / failed；failed/ready 可重新处理回 pending。
-- 本地存量：core.knowledge_documents 0 行，可直接 VALIDATE（生产仍需窗口）。

ALTER TABLE core.knowledge_documents
  ADD CONSTRAINT knowledge_documents_status_check
  CHECK (status = ANY (ARRAY['pending','processing','ready','failed']))
  NOT VALID;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert pending → processing → ready 各 1；ready → 'completed' → 23514。

-- 回滚：
-- ALTER TABLE core.knowledge_documents DROP CONSTRAINT IF EXISTS knowledge_documents_status_check;

-- B32 · ai.documents.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ai/src/models/document_status.rs（pending/processed/empty）
-- 写入方：vector.rs create_document（pending）、document.rs 处理完成（processed）/空内容（empty）。
-- 预检：本地 32 行全为 pending，集合外 0。
-- 回滚：文件末尾。

ALTER TABLE ai.documents
  ADD CONSTRAINT documents_status_check
  CHECK (status = ANY (ARRAY['pending','processed','empty']))
  NOT VALID;

-- 窗口内（存量清理后）：
-- ALTER TABLE ai.documents VALIDATE CONSTRAINT documents_status_check;
-- 回滚：
-- ALTER TABLE ai.documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   UPDATE pending→'bogus' → 23514
--   UPDATE pending→processed → UPDATE 1

-- 附：ai.document_chunks.embedding_status（本地 0 行、svc/ai 代码零引用）是死列，
-- 不在本批收口；建议先确认是否仍被外部向量化任务写入，否则走删列评审后再谈 CHECK。

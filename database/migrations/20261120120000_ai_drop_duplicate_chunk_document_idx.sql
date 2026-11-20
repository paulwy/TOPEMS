-- 20261120120000: 清理 ai.document_chunks 的重复索引
--
-- 根因：ai.document_chunks.document_id 上有两个定义完全相同的 btree 索引：
--   * idx_chunks_document_id        —— 旧 svc/ai/src/schema_defense.rs 运行期创建
--   * idx_document_chunks_document_id —— 迁移链创建
-- 两者均为 (document_id) btree、非唯一、不承载任何约束；保留两个只会让每次
-- INSERT/UPDATE 多维护一棵索引，无查询收益。
--
-- 保留迁移链命名的 idx_document_chunks_document_id（新库由
-- 20261120110000_ai_schema_canonical.sql 只建这一份），删除 schema_defense 遗留索引。
-- 幂等：IF EXISTS；不涉及数据、不改表结构。

DROP INDEX IF EXISTS ai.idx_chunks_document_id;

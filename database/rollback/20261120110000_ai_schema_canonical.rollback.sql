-- 回滚 20261120110000_ai_schema_canonical
--
-- 口径：本迁移是“接管既有表”而非新建业务表。目标库里这 4 张表通常早已存在，
-- 且被 svc/ai（documents / document_chunks / qa_history / analysis_results）真实读写。
--
-- 因此回滚不做 DROP TABLE / DROP COLUMN：
--   * 删表会直接丢业务数据；
--   * 删列会丢向量、问答与分析结果；
--   * 恢复运行期自动建表也不再需要（W2-D2 已移除 schema_defense）。
--
-- 若确实需要在空环境撤销，请在确认无数据后人工执行 DROP TABLE，
-- 本文件只负责明确拒绝，防止误跑回滚破坏数据。

DO $$
BEGIN
    RAISE EXCEPTION
        '20261120110000 为 schema 接管型迁移，不可自动回滚；'
        '如需撤销请先确认 ai.documents/document_chunks/qa_history/analysis_results 无数据，再人工 DROP';
END
$$;

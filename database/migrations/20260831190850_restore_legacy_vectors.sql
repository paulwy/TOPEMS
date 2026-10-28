-- ================================================================================
-- 20260831190850_restore_legacy_vectors.sql
-- 空库重建遗留表恢复（20260831190900 的 hrm.vectors 源表）
-- ================================================================================
-- 背景（2026-09-18 全链验证发现）：20260831190900_ai_vectors_schema 将
-- hrm.vectors 迁移至 ai.vectors，其 INSERT...SELECT FROM hrm.vectors 在解析期
-- 即要求源表存在（该表由运行时 shared-ai 创建，迁移链与 5432/5433 均无此表）。
-- 本迁移在 20260831190900 之前以同结构（key 主键 + pgvector vector）恢复
-- hrm.vectors 空表，使 INSERT...SELECT 可解析（0 行），随后该迁移自行 DROP。
-- 幂等：CREATE TABLE IF NOT EXISTS。仅作用于空库重建路径（5432 不应用）。
-- [2026-10-29] 类型用 public.vector（pgvector 扩展安装于 public，无 SCHEMA 参数）；
--   禁用 ai.vector（迁移顺序中 ai schema 无该类型，全新库按序执行即失败）。
-- ================================================================================

CREATE TABLE IF NOT EXISTS hrm.vectors (
    key TEXT PRIMARY KEY,
    embedding public.vector,
    metadata JSONB,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

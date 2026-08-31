-- 20260831190900: AI 向量表归属迁移——hrm.vectors → ai.vectors
-- 背景：shared-ai/vector_store.rs SQL 硬编码 hrm.vectors（历史遗留，向量属 AI 能力应归 ai schema）；
--   引用仅 lib/shared-ai（svc/ai 唯一使用者），hrm 服务无建表逻辑，数据 0 行。
-- 幂等：CREATE IF NOT EXISTS / INSERT ON CONFLICT / DROP IF EXISTS。

CREATE SCHEMA IF NOT EXISTS ai;

-- 建 ai.vectors（结构与 hrm.vectors 一致：key 主键 + pgvector vector 类型）
CREATE TABLE IF NOT EXISTS ai.vectors (
    key TEXT PRIMARY KEY,
    embedding vector,
    metadata JSONB,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 数据迁移（当前 0 行，保留完整性；重跑幂等）
INSERT INTO ai.vectors (key, embedding, metadata, deleted_at, created_at)
SELECT key, embedding, metadata, deleted_at, created_at FROM hrm.vectors
ON CONFLICT (key) DO NOTHING;

-- 确认无其他引用后清理旧表
DROP TABLE IF EXISTS hrm.vectors;

-- 创建 ai.ai_settings 租户级 AI 配置表
-- 代码权威: svc/ai/src/modules/settings.rs
--   get_settings: SELECT default_model,max_tokens,temperature,enable_streaming,
--                 enable_function_calling,available_models WHERE tenant_id=$1
--   首次访问:      INSERT INTO ai.ai_settings (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING
--   update_settings: INSERT ... ON CONFLICT (tenant_id) DO UPDATE ... RETURNING 上述列
-- 约定: 时间戳统一 timestamptz（与 ai.ai_models / ai.documents 一致）；
--       temperature 用 float8(DOUBLE PRECISION) 以匹配 Rust 侧 f64 绑定。

CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE IF NOT EXISTS ai.ai_settings (
    tenant_id                UUID PRIMARY KEY,
    default_model            TEXT        NOT NULL DEFAULT 'gpt-3.5-turbo',
    max_tokens               INTEGER     NOT NULL DEFAULT 4096,
    temperature              DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    enable_streaming         BOOLEAN     NOT NULL DEFAULT true,
    enable_function_calling  BOOLEAN     NOT NULL DEFAULT true,
    available_models         JSONB       NOT NULL DEFAULT '[]'::jsonb,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

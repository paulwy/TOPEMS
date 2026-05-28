-- TOPEMS API 密钥数据库迁移脚本
-- 创建 API 密钥管理相关的表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建 API 密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL,
    created_by UUID NOT NULL,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);

-- 添加注释
COMMENT ON TABLE api_keys IS 'API 密钥管理表';
COMMENT ON COLUMN api_keys.id IS 'API 密钥ID';
COMMENT ON COLUMN api_keys.name IS 'API 密钥名称（用于标识）';
COMMENT ON COLUMN api_keys.key_hash IS 'API 密钥哈希值（bcrypt 哈希）';
COMMENT ON COLUMN api_keys.permissions IS 'API 密钥权限（JSONB 格式）';
COMMENT ON COLUMN api_keys.created_by IS '创建该密钥的用户ID';
COMMENT ON COLUMN api_keys.expires_at IS '过期时间（NULL表示永不过期）';
COMMENT ON COLUMN api_keys.last_used_at IS '最后使用时间';
COMMENT ON COLUMN api_keys.is_active IS '是否激活';
COMMENT ON COLUMN api_keys.created_at IS '创建时间';
COMMENT ON COLUMN api_keys.updated_at IS '更新时间';

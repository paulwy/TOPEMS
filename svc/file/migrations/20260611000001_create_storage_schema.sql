-- Migration: Create unified storage schema
-- Date: 2026-06-11
-- Description: 统一文件服务核心表结构

-- ============================================
-- Schema: storage
-- ============================================

-- Create storage schema
CREATE SCHEMA IF NOT EXISTS storage;

-- ============================================
-- Table: storage.files
-- Description: 统一文件元数据表
-- ============================================
CREATE TABLE IF NOT EXISTS storage.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,              -- 上传用户 ID
    owner_department_id UUID,            -- 所属部门 ID

    filename VARCHAR(500) NOT NULL,       -- 原始文件名
    storage_path VARCHAR(1000) NOT NULL, -- 存储路径
    file_size BIGINT NOT NULL,           -- 文件大小（字节）
    content_type VARCHAR(100) NOT NULL,  -- MIME 类型

    -- 文件分类
    file_type VARCHAR(50) NOT NULL DEFAULT 'document',  -- 'document', 'attachment', 'image', 'video', 'archive'
    category VARCHAR(100),                -- 业务分类

    -- 版本控制
    version INT DEFAULT 1,
    parent_id UUID REFERENCES storage.files(id) ON DELETE SET NULL, -- 上一版本

    -- 向量化状态
    vector_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    vector_document_id UUID,             -- 关联 AI 文档 ID

    -- 共享属性
    is_shared BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'department', 'public'

    -- 状态
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'deleted', 'archived'

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_storage_files_owner ON storage.files(owner_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_department ON storage.files(owner_department_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_type ON storage.files(file_type);
CREATE INDEX IF NOT EXISTS idx_storage_files_status ON storage.files(status);
CREATE INDEX IF NOT EXISTS idx_storage_files_vector ON storage.files(vector_status);
CREATE INDEX IF NOT EXISTS idx_storage_files_visibility ON storage.files(visibility);
CREATE INDEX IF NOT EXISTS idx_storage_files_category ON storage.files(category);
CREATE INDEX IF NOT EXISTS idx_storage_files_created_at ON storage.files(created_at DESC);

-- ============================================
-- Table: storage.file_permissions
-- Description: 文件权限表
-- ============================================
CREATE TABLE IF NOT EXISTS storage.file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES storage.files(id) ON DELETE CASCADE,
    principal_type VARCHAR(20) NOT NULL, -- 'user', 'department', 'role'
    principal_id UUID NOT NULL,           -- user_id / department_id / role_id
    permission VARCHAR(50) NOT NULL,      -- 'read', 'write', 'delete', 'share', 'admin'
    granted_by UUID,                      -- 授权人
    expires_at TIMESTAMPTZ,              -- 过期时间，可选
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 唯一约束：防止重复授权
    UNIQUE(file_id, principal_type, principal_id, permission)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_file_perms_file ON storage.file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_perms_principal ON storage.file_permissions(principal_type, principal_id);
CREATE INDEX IF NOT EXISTS idx_file_perms_expires ON storage.file_permissions(expires_at);

-- ============================================
-- Table: storage.backends
-- Description: 存储后端配置表
-- ============================================
CREATE TABLE IF NOT EXISTS storage.backends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,   -- 'local', 's3', 'minio'
    backend_type VARCHAR(50) NOT NULL,   -- 'local', 's3', 'minio'
    is_active BOOLEAN DEFAULT FALSE,
    config JSONB,                        -- 存储配置 (endpoint, bucket, region, access_key, secret_key, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认本地存储配置
INSERT INTO storage.backends (name, backend_type, is_active, config)
VALUES (
    'local',
    'local',
    true,
    '{"base_path": "./storage/files", "max_file_size": 104857600}'  -- 100MB
) ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Triggers
-- ============================================

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_storage_files_updated_at ON storage.files;
CREATE TRIGGER update_storage_files_updated_at
    BEFORE UPDATE ON storage.files
    FOR EACH ROW
    EXECUTE FUNCTION storage.update_updated_at_column();

DROP TRIGGER IF EXISTS update_storage_backends_updated_at ON storage.backends;
CREATE TRIGGER update_storage_backends_updated_at
    BEFORE UPDATE ON storage.backends
    FOR EACH ROW
    EXECUTE FUNCTION storage.update_updated_at_column();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE storage.files IS '统一文件元数据表';
COMMENT ON TABLE storage.file_permissions IS '文件权限控制表';
COMMENT ON TABLE storage.backends IS '存储后端配置表';

COMMENT ON COLUMN storage.files.owner_id IS '文件所有者用户ID';
COMMENT ON COLUMN storage.files.owner_department_id IS '文件所有者部门ID';
COMMENT ON COLUMN storage.files.file_type IS '文件类型: document/attachment/image/video/archive';
COMMENT ON COLUMN storage.files.vector_status IS '向量化状态: pending/processing/completed/failed';
COMMENT ON COLUMN storage.files.visibility IS '可见性: private/department/public';
COMMENT ON COLUMN storage.files.storage_path IS '存储路径，相对于存储后端根目录';

-- ============================================
-- Grant Permissions (for development)
-- ============================================
GRANT USAGE ON SCHEMA storage TO topems_dev;
GRANT ALL PRIVILEGES ON TABLE storage.files TO topems_dev;
GRANT ALL PRIVILEGES ON TABLE storage.file_permissions TO topems_dev;
GRANT ALL PRIVILEGES ON TABLE storage.backends TO topems_dev;

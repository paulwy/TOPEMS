-- 文档管理服务独立数据库 Schema
CREATE SCHEMA IF NOT EXISTS doc_service;

-- 文件表
CREATE TABLE IF NOT EXISTS doc_service.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    folder_id UUID,
    size BIGINT NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 文件夹表
CREATE TABLE IF NOT EXISTS doc_service.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES doc_service.folders(id) ON DELETE CASCADE
);

-- 文件版本表
CREATE TABLE IF NOT EXISTS doc_service.file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES doc_service.files(id) ON DELETE CASCADE,
    version INT NOT NULL,
    size BIGINT NOT NULL,
    checksum VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    UNIQUE(file_id, version)
);

-- 文件权限表
CREATE TABLE IF NOT EXISTS doc_service.file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES doc_service.files(id) ON DELETE CASCADE,
    user_id UUID,
    role_id UUID,
    permission VARCHAR(50) NOT NULL, -- read, write, delete, admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 文件夹权限表（支持权限继承）
CREATE TABLE IF NOT EXISTS doc_service.folder_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES doc_service.folders(id) ON DELETE CASCADE,
    user_id UUID,
    role_id UUID,
    permission VARCHAR(50) NOT NULL, -- read, write, delete, admin
    inherit BOOLEAN NOT NULL DEFAULT true, -- 是否继承到子文件夹和文件
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON doc_service.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_by ON doc_service.files(created_by);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON doc_service.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_created_by ON doc_service.folders(created_by);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON doc_service.file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_file_id ON doc_service.file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON doc_service.file_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_role_id ON doc_service.file_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_folder_id ON doc_service.folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_user_id ON doc_service.folder_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_role_id ON doc_service.folder_permissions(role_id);

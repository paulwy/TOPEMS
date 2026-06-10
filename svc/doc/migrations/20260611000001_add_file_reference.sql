-- 为文档表添加文件引用
-- 添加 file_id 字段关联到 File 服务

-- 添加 file_id 到 documents 表（如果有 documents 表）
-- 注意：这个迁移需要检查表是否存在

DO $$
BEGIN
    -- 检查 documents 表是否存在
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
    ) THEN
        -- 添加 file_id 字段
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'documents' 
            AND column_name = 'file_id'
        ) THEN
            ALTER TABLE documents ADD COLUMN file_id UUID;
            COMMENT ON COLUMN documents.file_id IS '关联到 File 服务的文件 ID';
        END IF;

        -- 添加 storage_path 字段
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'documents' 
            AND column_name = 'storage_path'
        ) THEN
            ALTER TABLE documents ADD COLUMN storage_path VARCHAR(1000);
            COMMENT ON COLUMN documents.storage_path IS 'File 服务中的存储路径';
        END IF;

        -- 添加索引
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'documents' 
            AND indexname = 'idx_documents_file_id'
        ) THEN
            CREATE INDEX idx_documents_file_id ON documents(file_id);
        END IF;
    END IF;

    -- 同样检查 ai.documents 表（如果存在）
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'ai' 
        AND table_name = 'documents'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'ai' 
            AND table_name = 'documents' 
            AND column_name = 'file_id'
        ) THEN
            ALTER TABLE ai.documents ADD COLUMN file_id UUID;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'ai' 
            AND tablename = 'documents' 
            AND indexname = 'idx_ai_documents_file_id'
        ) THEN
            CREATE INDEX idx_ai_documents_file_id ON ai.documents(file_id);
        END IF;
    END IF;
END
$$;

-- 创建 storage schema（如果 File 服务需要）
CREATE SCHEMA IF NOT EXISTS storage;

-- 创建 files 表（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' 
        AND table_name = 'files'
    ) THEN
        CREATE TABLE storage.files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id UUID NOT NULL,
            owner_department_id UUID,
            filename VARCHAR(255) NOT NULL,
            storage_path VARCHAR(1000) NOT NULL,
            file_size BIGINT NOT NULL DEFAULT 0,
            content_type VARCHAR(100),
            file_type VARCHAR(50) DEFAULT 'document',
            category VARCHAR(100),
            version INTEGER DEFAULT 1,
            parent_id UUID,
            vector_status VARCHAR(50) DEFAULT 'none',
            vector_document_id UUID,
            is_shared BOOLEAN DEFAULT FALSE,
            visibility VARCHAR(50) DEFAULT 'private',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        );

        -- 创建索引
        CREATE INDEX idx_storage_files_owner_id ON storage.files(owner_id);
        CREATE INDEX idx_storage_files_file_type ON storage.files(file_type);
        CREATE INDEX idx_storage_files_category ON storage.files(category);
        CREATE INDEX idx_storage_files_vector_status ON storage.files(vector_status);
        CREATE INDEX idx_storage_files_status ON storage.files(status);

        COMMENT ON TABLE storage.files IS 'File 服务文件存储表';
    END IF;

    -- 创建 file_permissions 表（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' 
        AND table_name = 'file_permissions'
    ) THEN
        CREATE TABLE storage.file_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_id UUID NOT NULL,
            principal_type VARCHAR(50) NOT NULL,
            principal_id UUID NOT NULL,
            permission VARCHAR(50) NOT NULL,
            granted_by UUID NOT NULL,
            granted_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX idx_storage_file_permissions_file_id ON storage.file_permissions(file_id);
        CREATE INDEX idx_storage_file_permissions_principal ON storage.file_permissions(principal_type, principal_id);
    END IF;
END
$$;

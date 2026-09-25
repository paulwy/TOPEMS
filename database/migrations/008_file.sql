CREATE TABLE IF NOT EXISTS core_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(256) NOT NULL,
    original_name VARCHAR(256),
    path VARCHAR(512) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(128),
    extension VARCHAR(32),
    folder_id UUID,
    uploader_id UUID NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_file_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    parent_id UUID,
    owner_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_files_folder ON core_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_core_files_uploader ON core_files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_core_files_tenant ON core_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_file_folders_parent ON core_file_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_core_file_folders_tenant ON core_file_folders(tenant_id);
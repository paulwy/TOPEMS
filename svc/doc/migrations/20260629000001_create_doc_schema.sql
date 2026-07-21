CREATE TABLE IF NOT EXISTS core_doc_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES core_doc_folders(id),
    owner_id UUID,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_doc_folders_tenant ON core_doc_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_folders_parent ON core_doc_folders(parent_id);

CREATE TABLE IF NOT EXISTS core_doc_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'html',
    variables JSONB DEFAULT '[]',
    fields JSONB DEFAULT '[]',
    is_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_doc_templates_tenant ON core_doc_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_templates_category ON core_doc_templates(category);

CREATE TABLE IF NOT EXISTS core_doc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    title VARCHAR(500) NOT NULL,
    folder_id UUID REFERENCES core_doc_folders(id),
    template_id UUID REFERENCES core_doc_templates(id),
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'html',
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    tags TEXT[],
    description TEXT,
    file_name VARCHAR(500),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    published_at TIMESTAMPTZ,
    published_by VARCHAR(100),
    archived_at TIMESTAMPTZ,
    archived_by VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_doc_documents_tenant ON core_doc_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_documents_folder ON core_doc_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_documents_status ON core_doc_documents(status);
CREATE INDEX IF NOT EXISTS idx_core_doc_documents_template ON core_doc_documents(template_id);

CREATE TABLE IF NOT EXISTS core_doc_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    document_id UUID NOT NULL REFERENCES core_doc_documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'html',
    change_log TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_core_doc_versions_tenant ON core_doc_document_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_versions_document ON core_doc_document_versions(document_id);

CREATE TABLE IF NOT EXISTS core_doc_document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    document_id UUID NOT NULL REFERENCES core_doc_documents(id) ON DELETE CASCADE,
    user_id UUID,
    role_id UUID,
    permission_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_doc_permissions_tenant ON core_doc_document_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_permissions_document ON core_doc_document_permissions(document_id);

CREATE TABLE IF NOT EXISTS core_doc_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    document_id UUID NOT NULL REFERENCES core_doc_documents(id) ON DELETE CASCADE,
    link_type VARCHAR(50),
    target_document_id UUID REFERENCES core_doc_documents(id),
    target_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_doc_links_tenant ON core_doc_document_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_links_document ON core_doc_document_links(document_id);
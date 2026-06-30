CREATE SCHEMA IF NOT EXISTS doc;

CREATE TABLE IF NOT EXISTS doc.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES doc.folders(id),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_folders_tenant ON doc.folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent ON doc.folders(parent_id);

CREATE TABLE IF NOT EXISTS doc.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'html',
    fields JSONB DEFAULT '[]',
    is_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_templates_tenant ON doc.templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_category ON doc.templates(category);

CREATE TABLE IF NOT EXISTS doc.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    title VARCHAR(500) NOT NULL,
    folder_id UUID REFERENCES doc.folders(id),
    template_id UUID REFERENCES doc.templates(id),
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

CREATE INDEX IF NOT EXISTS idx_doc_documents_tenant ON doc.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_documents_folder ON doc.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_doc_documents_status ON doc.documents(status);
CREATE INDEX IF NOT EXISTS idx_doc_documents_template ON doc.documents(template_id);

CREATE TABLE IF NOT EXISTS doc.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    document_id UUID NOT NULL REFERENCES doc.documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'html',
    change_log TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_tenant ON doc.document_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON doc.document_versions(document_id);

CREATE TABLE IF NOT EXISTS doc.document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    document_id UUID NOT NULL REFERENCES doc.documents(id) ON DELETE CASCADE,
    user_id UUID,
    role_id UUID,
    permission_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_permissions_tenant ON doc.document_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_permissions_document ON doc.document_permissions(document_id);

CREATE TABLE IF NOT EXISTS doc.document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    document_id UUID NOT NULL REFERENCES doc.documents(id) ON DELETE CASCADE,
    link_type VARCHAR(50),
    target_document_id UUID REFERENCES doc.documents(id),
    target_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_links_tenant ON doc.document_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_links_document ON doc.document_links(document_id);
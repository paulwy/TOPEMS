-- Doc - 添加 tenant_id 支持

-- Documents 表
ALTER TABLE doc.documents ALTER COLUMN tenant_id SET NOT NULL;
UPDATE doc.documents SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_documents_tenant_id ON doc.documents(tenant_id);

-- Templates 表
ALTER TABLE doc.templates ALTER COLUMN tenant_id SET NOT NULL;
UPDATE doc.templates SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_templates_tenant_id ON doc.templates(tenant_id);

-- Folders 表
ALTER TABLE doc.folders ALTER COLUMN tenant_id SET NOT NULL;
UPDATE doc.folders SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_folders_tenant_id ON doc.folders(tenant_id);

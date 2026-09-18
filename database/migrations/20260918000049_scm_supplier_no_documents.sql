-- TOPEMS database migration 20260918000049
-- 1) scm.suppliers.supplier_no NOT NULL 无默认，但 create INSERT 不绑定该列 → DROP NOT NULL
-- 2) 5432 补建 erp.documents（5433 存在，5432 缺失；DDL 取自 5433 全量一致）
-- DO 块动态判断，幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='scm' AND table_name='suppliers' AND column_name='supplier_no'
                 AND is_nullable='NO') THEN
        ALTER TABLE scm.suppliers ALTER COLUMN supplier_no DROP NOT NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS erp.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    title text NOT NULL,
    doc_type text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    file_url text,
    file_size bigint,
    uploader uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'erp.documents'::regclass AND conname = 'documents_pkey') THEN
        ALTER TABLE ONLY erp.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='erp' AND tablename='documents' AND policyname='rls_tenant_isolation') THEN
        ALTER TABLE erp.documents ENABLE ROW LEVEL SECURITY;
        CREATE POLICY rls_tenant_isolation ON erp.documents USING (
            ((current_setting('app.tenant_id'::text, true) IS NULL)
             OR (current_setting('app.tenant_id'::text, true) = ''::text)
             OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
             OR (tenant_id IS NULL)
             OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
        ) WITH CHECK (
            ((current_setting('app.tenant_id'::text, true) IS NULL)
             OR (current_setting('app.tenant_id'::text, true) = ''::text)
             OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
             OR (tenant_id IS NULL)
             OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
        );
    END IF;
END $$;

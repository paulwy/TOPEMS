-- TOPEMS database migration 20260918000050
-- 1) scm.suppliers.category NOT NULL 无默认，create INSERT 不绑定该列 → DROP NOT NULL
-- 2) erp.documents.uploader uuid → text（create 绑定 Option<String>）
-- DO 块动态判断，幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='scm' AND table_name='suppliers' AND column_name='category'
                 AND is_nullable='NO') THEN
        ALTER TABLE scm.suppliers ALTER COLUMN category DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='documents' AND column_name='uploader'
                 AND data_type='uuid') THEN
        ALTER TABLE erp.documents ALTER COLUMN uploader TYPE text;
    END IF;
END $$;

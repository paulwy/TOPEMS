-- TOPEMS database migration 20260918000054
-- 1) public.pdm_materials / public.pdm_products 补 tenant_id uuid（create INSERT 引用）
-- 2) bi.reports.created_by uuid → text（create 绑定 String，sqlx 严格类型不匹配）
-- DO 块动态判断，幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pdm_materials')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='pdm_materials' AND column_name='tenant_id') THEN
        ALTER TABLE public.pdm_materials ADD COLUMN tenant_id uuid;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pdm_products')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='pdm_products' AND column_name='tenant_id') THEN
        ALTER TABLE public.pdm_products ADD COLUMN tenant_id uuid;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='bi' AND table_name='reports' AND column_name='created_by'
                 AND data_type='uuid') THEN
        ALTER TABLE bi.reports ALTER COLUMN created_by TYPE text;
    END IF;
END $$;

-- TOPEMS database migration 20260918000055
-- 1) public.pdm_materials / pdm_products / pdm_documents：
--    created_at/updated_at timestamp(无时区) → timestamptz（模型 DateTime<Utc>，sqlx 严格解码不匹配）
-- 2) public.pdm_documents 补 tenant_id uuid（create INSERT 引用）
-- DO 块动态判断，幂等且双库安全。

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['pdm_materials','pdm_products','pdm_documents'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name=t AND column_name='created_at'
                         AND data_type='timestamp without time zone') THEN
                EXECUTE format('ALTER TABLE public.%I
                                ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE ''UTC'',
                                ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE ''UTC''', t);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name=t AND column_name='tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid', t);
            END IF;
        END IF;
    END LOOP;
END $$;

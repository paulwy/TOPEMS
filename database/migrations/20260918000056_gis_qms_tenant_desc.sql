-- TOPEMS database migration 20260918000056
-- 1) gis.map_markers 补 tenant_id uuid（create INSERT 引用）
-- 2) gis.pipelines 补 description text + tenant_id uuid
-- 3) qms.qa_apqp_projects 补 tenant_id uuid
-- DO 块动态判断，幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='gis' AND table_name='map_markers')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='gis' AND table_name='map_markers' AND column_name='tenant_id') THEN
        ALTER TABLE gis.map_markers ADD COLUMN tenant_id uuid;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='gis' AND table_name='pipelines') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='gis' AND table_name='pipelines' AND column_name='description') THEN
            ALTER TABLE gis.pipelines ADD COLUMN description text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='gis' AND table_name='pipelines' AND column_name='tenant_id') THEN
            ALTER TABLE gis.pipelines ADD COLUMN tenant_id uuid;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='qms' AND table_name='qa_apqp_projects')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='qms' AND table_name='qa_apqp_projects' AND column_name='tenant_id') THEN
        ALTER TABLE qms.qa_apqp_projects ADD COLUMN tenant_id uuid;
    END IF;
END $$;

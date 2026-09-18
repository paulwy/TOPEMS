-- TOPEMS database migration 20260918000057
-- 1) qms.qa_apqp_{projects,phases,tasks,risks,approvals}.status 约束枚举过窄：
--    代码 create 硬编码 'planning'/'pending'，原约束仅 active/inactive/archived → 重建扩展
-- 2) gis.pipelines.map_id DROP NOT NULL（create INSERT 不传 map_id）
-- DO 块动态判断，幂等且双库安全。

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['qa_apqp_projects','qa_apqp_phases','qa_apqp_tasks','qa_apqp_risks','qa_apqp_approvals'] LOOP
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_'||t||'_status_standard') THEN
            EXECUTE format('ALTER TABLE qms.%I DROP CONSTRAINT ck_%I_status_standard', t, t);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='qms' AND table_name=t) THEN
            EXECUTE format($f$ALTER TABLE qms.%I ADD CONSTRAINT ck_%I_status_standard
                           CHECK (status IS NULL OR status::text = ANY (ARRAY['active','inactive','archived','planning','pending','completed','cancelled','approved','rejected']::text[]))$f$, t, t);
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='gis' AND table_name='pipelines')
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='gis' AND table_name='pipelines' AND column_name='map_id'
                     AND is_nullable='NO') THEN
        ALTER TABLE gis.pipelines ALTER COLUMN map_id DROP NOT NULL;
    END IF;
END $$;

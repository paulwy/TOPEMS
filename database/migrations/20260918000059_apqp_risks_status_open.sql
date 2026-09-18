-- TOPEMS database migration 20260918000059
-- qms.qa_apqp_risks.status 约束补充 'open'（create INSERT 硬编码 'open'）
-- 同时把 approvals 约束一并核对；幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='qms' AND table_name='qa_apqp_risks') THEN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_qa_apqp_risks_status_standard') THEN
            ALTER TABLE qms.qa_apqp_risks DROP CONSTRAINT ck_qa_apqp_risks_status_standard;
        END IF;
        ALTER TABLE qms.qa_apqp_risks ADD CONSTRAINT ck_qa_apqp_risks_status_standard
            CHECK (status IS NULL OR status::text = ANY (ARRAY['active','inactive','archived','planning','pending','completed','cancelled','approved','rejected','open','closed','mitigating']::text[]));
    END IF;
END $$;

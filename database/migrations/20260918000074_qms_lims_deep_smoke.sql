-- TOPEMS database migration 20260918000074
-- 深冒烟第七轮（qms/lims 扩展扫描）：
-- 1) qms/public/rs 的 qa_corrective_actions、qa_audit_plans 时间列 timestamp→timestamptz
-- 2) qms/public/rs 的 qa_fmea_analyses/qa_quality_issues/qa_eightd_reports ck 枚举扩展
--    （代码 INSERT 硬编码 draft/open/new）
-- 3) qms/public 的 qa_alert_messages 补 tenant_id
-- 4) lims.maintenance_records.performed_by uuid→varchar（代码传 text）
-- 幂等、双库安全。

DO $$
DECLARE
    sch text;
    t text;
    c text;
    cols text[];
    v text;
BEGIN
    -- 1. 时间列 → timestamptz
    FOREACH sch IN ARRAY ARRAY['qms','public','rs'] LOOP
        FOREACH t IN ARRAY ARRAY['qa_corrective_actions','qa_audit_plans'] LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=sch AND table_name=t) THEN
                cols := ARRAY['target_date','completed_at','created_at','updated_at','scheduled_start','scheduled_end','actual_start','actual_end'];
                FOREACH c IN ARRAY cols LOOP
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=sch AND table_name=t AND column_name=c AND data_type='timestamp without time zone') THEN
                        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE timestamp with time zone USING %I AT TIME ZONE ''UTC''', sch, t, c, c);
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;

    -- 2. ck 枚举扩展
    FOREACH sch IN ARRAY ARRAY['qms','public','rs'] LOOP
        FOREACH t IN ARRAY ARRAY['qa_fmea_analyses','qa_quality_issues','qa_eightd_reports'] LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=sch AND table_name=t) THEN
                EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS ck_%I_status_standard', sch, t, t);
                EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT ck_%I_status_standard CHECK (status IS NULL OR status::text = ANY (ARRAY[''active'',''inactive'',''archived'',''draft'',''pending'',''open'',''new'',''completed'',''cancelled'']::text[]))', sch, t, t);
            END IF;
        END LOOP;
    END LOOP;

    -- 3. qa_alert_messages 补 tenant_id
    FOREACH sch IN ARRAY ARRAY['qms','public','rs'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=sch AND table_name='qa_alert_messages') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=sch AND table_name='qa_alert_messages' AND column_name='tenant_id') THEN
                EXECUTE format('ALTER TABLE %I.qa_alert_messages ADD COLUMN tenant_id uuid', sch);
            END IF;
        END IF;
    END LOOP;

    -- 4. lims.maintenance_records.performed_by → varchar
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='lims' AND table_name='maintenance_records') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='lims' AND table_name='maintenance_records' AND column_name='performed_by' AND data_type='uuid') THEN
            ALTER TABLE lims.maintenance_records ALTER COLUMN performed_by TYPE character varying USING performed_by::text;
        END IF;
    END IF;
END $$;

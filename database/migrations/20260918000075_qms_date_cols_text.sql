-- TOPEMS database migration 20260918000075
-- 深冒烟第八轮：qms 时间列 timestamptz→text
-- 模型 CorrectiveAction/AuditPlan 时间字段为 Option<String>，代码 bind 传 String(text)，
-- RETURNING 用 ::TEXT。列类型应为 text 才能匹配 bind/decode。
-- created_at/updated_at 保持 timestamptz（代码 INSERT 用 CURRENT_TIMESTAMP）。
-- 幂等、双库安全。

DO $$
DECLARE
    sch text;
    t text;
    c text;
    cols text[];
BEGIN
    FOREACH sch IN ARRAY ARRAY['qms','public','rs'] LOOP
        FOREACH t IN ARRAY ARRAY['qa_corrective_actions','qa_audit_plans'] LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=sch AND table_name=t) THEN
                cols := ARRAY['target_date','completed_at','scheduled_start','scheduled_end','actual_start','actual_end'];
                FOREACH c IN ARRAY cols LOOP
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=sch AND table_name=t AND column_name=c AND data_type='timestamp with time zone') THEN
                        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE text USING %I::text', sch, t, c, c);
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END $$;

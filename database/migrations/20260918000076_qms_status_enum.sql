-- TOPEMS database migration 20260918000076
-- 深冒烟第九轮：qms 状态枚举扩展
-- qa_corrective_actions（代码 INSERT 用 'pending'）、qa_audit_plans（'draft'）、
-- qa_alert_messages（'active' 已有）统一扩展标准状态枚举。
-- 幂等、双库安全。

DO $$
DECLARE
    sch text;
    t text;
BEGIN
    FOREACH sch IN ARRAY ARRAY['qms','public','rs'] LOOP
        FOREACH t IN ARRAY ARRAY['qa_corrective_actions','qa_audit_plans','qa_alert_messages'] LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=sch AND table_name=t) THEN
                EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS ck_%I_status_standard', sch, t, t);
                EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT ck_%I_status_standard CHECK (status IS NULL OR status::text = ANY (ARRAY[''active'',''inactive'',''archived'',''draft'',''pending'',''open'',''new'',''completed'',''cancelled'']::text[]))', sch, t, t);
            END IF;
        END LOOP;
    END LOOP;
END $$;

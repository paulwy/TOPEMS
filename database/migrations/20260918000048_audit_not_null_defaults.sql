-- TOPEMS database migration 20260918000048
-- audit_logs 写路径兜底：所有 audit_logs 的 NOT NULL 无默认列设默认值，避免
-- log_audit_event（shared CreateAuditLogRequest 13 列 INSERT）逐个暴露约束错误。
-- 文本/枚举类列设 ''，uuid 列设单租户 org。DO 块动态判断，幂等且双库安全。

DO $$
DECLARE s text; c record;
BEGIN
    FOREACH s IN ARRAY ARRAY['public','scm','wms','iam','shared','srm','bi','crm','erp','hrm','mes','rs','flow','mobile','finance'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = s AND table_name = 'audit_logs') THEN
            FOR c IN
                SELECT column_name, data_type FROM information_schema.columns
                WHERE table_schema = s AND table_name = 'audit_logs'
                  AND is_nullable = 'NO' AND column_default IS NULL
                  AND column_name IN ('action','resource','entity_type','status',
                                      'organization_id','tenant_id','user_id','org_id')
            LOOP
                IF c.data_type = 'uuid' THEN
                    EXECUTE format('ALTER TABLE %I.audit_logs ALTER COLUMN %I SET DEFAULT %L',
                                   s, c.column_name, '00000000-0000-0000-0000-000000000001');
                ELSE
                    EXECUTE format('ALTER TABLE %I.audit_logs ALTER COLUMN %I SET DEFAULT %L',
                                   s, c.column_name, '');
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;

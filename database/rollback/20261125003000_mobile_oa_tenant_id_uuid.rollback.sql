-- 回滚 B273：mobile OA 表 tenant_id 恢复 text，并恢复旧版策略表达式
-- 仅在代码同步回退到 text 租户契约时使用；存量 uuid 值按文本还原。
DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'oa_announcements',
        'oa_meetings',
        'oa_calendar_events',
        'oa_tasks'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'mobile'
              AND table_name = tbl
              AND column_name = 'tenant_id'
              AND data_type = 'uuid'
        ) THEN
            EXECUTE format(
                'DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.%I',
                tbl
            );
            EXECUTE format(
                'ALTER TABLE mobile.%I ALTER COLUMN tenant_id TYPE text USING tenant_id::text',
                tbl
            );
            EXECUTE format($policy$
                CREATE POLICY rls_tenant_isolation ON mobile.%I
                    FOR ALL
                    USING (
                        current_setting('app.tenant_id', true) IS NULL
                        OR current_setting('app.tenant_id', true) = ''
                        OR tenant_id IS NULL
                        OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
                    )
                    WITH CHECK (
                        current_setting('app.tenant_id', true) IS NULL
                        OR current_setting('app.tenant_id', true) = ''
                        OR tenant_id IS NULL
                        OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
                    )
            $policy$, tbl);
        END IF;
    END LOOP;
END
$$;

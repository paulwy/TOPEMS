-- B273: 修正 mobile OA 能力表 tenant_id 类型漂移
-- 背景：20260917000001_mobile_oa_tables.sql 在空库重建时把
--   oa_announcements / oa_meetings / oa_calendar_events / oa_tasks 的
--   tenant_id 建成 text；真实库与 Rust 实体均按 uuid 读写，导致
--   schedule 等端点出现 "Rust type uuid::Uuid is not compatible with SQL type TEXT"。
-- 处置：仅当列仍为 text 时转为 uuid（存量值按 uuid 文本解释），并重建
--   rls_tenant_isolation，表达式与真实库对齐为 tenant_id = (NULLIF(...,''))::uuid。
-- 幂等：已是 uuid 时跳过改型，仅校正策略。
-- 回滚：database/rollback/20261125003000_mobile_oa_tenant_id_uuid.rollback.sql

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
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'mobile'
                  AND table_name = tbl
                  AND column_name = 'tenant_id'
                  AND data_type = 'text'
            ) THEN
                EXECUTE format(
                    'DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.%I',
                    tbl
                );
                EXECUTE format(
                    'ALTER TABLE mobile.%I ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid',
                    tbl
                );
            END IF;

            EXECUTE format(
                'DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.%I',
                tbl
            );
            EXECUTE format($policy$
                CREATE POLICY rls_tenant_isolation ON mobile.%I
                    FOR ALL
                    USING (
                        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                    )
                    WITH CHECK (
                        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                    )
            $policy$, tbl);
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'mobile'
          AND table_name IN ('oa_announcements', 'oa_meetings', 'oa_calendar_events', 'oa_tasks')
          AND column_name = 'tenant_id'
          AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'mobile OA 表 tenant_id 仍为 text，未完成 uuid 收口';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = 'mobile'
          AND p.tablename IN ('oa_announcements', 'oa_meetings', 'oa_calendar_events', 'oa_tasks')
          AND p.policyname = 'rls_tenant_isolation'
          AND p.qual NOT LIKE '%::uuid%'
    ) THEN
        RAISE EXCEPTION 'mobile OA 表 rls_tenant_isolation 未按 uuid 租户比较重建';
    END IF;
END
$$;

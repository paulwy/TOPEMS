-- 20261015000079_rls_policy_missing_ok.sql
-- 对齐 work_stations 的 policy 写法：production_schedules 的 tenant 隔离 policy
-- 中 current_setting 缺少 missing_ok（第二个参数 true）。虽然应用层请求总会设置
-- app.tenant_id，但未设置上下文时无 missing_ok 的 current_setting 会抛
-- "unrecognized configuration parameter"，导致查询 500。补上 missing_ok 更健壮，
-- 与 work_stations/equipment_oee 等表的语义一致（缺失时返回 NULL 而非抛错）。
-- 由 DATABASE_URL(topems_app, 表 owner) 执行；幂等：重复执行仅重建同义 policy。

ALTER POLICY tenant_isolation_production_schedules
    ON mes.production_schedules
    USING (
        (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
        OR (tenant_id IS NULL)
        OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)
    );

-- 断言：policy 已含 missing_ok
DO $$
DECLARE
    _ok BOOLEAN;
BEGIN
    SELECT qual LIKE '%current_setting(''app.tenant_id''::text, true)%'
    INTO _ok
    FROM pg_policies
    WHERE schemaname = 'mes'
      AND tablename = 'production_schedules'
      AND policyname = 'tenant_isolation_production_schedules';

    IF NOT COALESCE(_ok, false) THEN
        RAISE EXCEPTION 'MISSING missing_ok in tenant_isolation_production_schedules';
    END IF;
END $$;

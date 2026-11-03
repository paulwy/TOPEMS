-- ============================================================
-- DB-05: 5433 public.tenant_permissions.tenant_id varchar(64) → uuid
--
-- 背景：类型批次挂账——iam.tenant_permissions.tenant_id 被 RLS 策略
-- rls_tenant_isolation 依赖不可 ALTER（5433 实际表在 public schema）。
-- prod 已为 uuid，本批对齐 5433。
--
-- 关键实测（2026-11-03）：
--   * 5433 public.tenant_permissions 空表（0 行），无数据转换。
--   * 2 条 RLS 策略引用 tenant_id，需 DROP → ALTER → CREATE。
--   * 策略 qual 不变（(tenant_id)::text 对 uuid 仍有效）。
--
-- 幂等：DO 块仅在列存在且仍为 varchar 时 ALTER。
-- ============================================================

SET lock_timeout = '5s';

-- DROP 策略
DROP POLICY IF EXISTS rls_tenant_isolation ON public.tenant_permissions;
DROP POLICY IF EXISTS tenant_isolation_tenant_permissions ON public.tenant_permissions;

-- ALTER COLUMN
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'tenant_permissions'
      AND a.attname = 'tenant_id'
      AND NOT a.attisdropped
      AND a.atttypid = 'character varying'::regtype
  ) THEN
    ALTER TABLE public.tenant_permissions
      ALTER COLUMN tenant_id TYPE uuid
      USING tenant_id::uuid;
  END IF;
END
$migration$;

-- 重建策略
CREATE POLICY rls_tenant_isolation ON public.tenant_permissions
  FOR ALL USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  );

CREATE POLICY tenant_isolation_tenant_permissions ON public.tenant_permissions
  FOR ALL USING (
    (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
    OR tenant_id IS NULL
  );

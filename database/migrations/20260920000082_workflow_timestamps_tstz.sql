-- TOPEMS database migration 20260920000082
-- flow create/list 500（decode）：public/rs 的 core_workflows 时间列为
--   timestamp WITHOUT time zone（core 为 WITH time zone），代码 DateTime<Utc> 期望 timestamptz。
--   INSERT ... RETURNING / SELECT decode 失败。统一三 schema 副本为 timestamptz。
-- 幂等：仅转换 timestamp without time zone 的列。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflows' AND c.relkind='r') THEN
    ALTER TABLE public.core_workflows ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    ALTER TABLE public.core_workflows ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    ALTER TABLE public.core_workflows ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='core_workflows' AND c.relkind='r') THEN
    ALTER TABLE rs.core_workflows ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    ALTER TABLE rs.core_workflows ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    ALTER TABLE rs.core_workflows ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_workflows' AND c.relkind='r') THEN
    ALTER TABLE core.core_workflows ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    ALTER TABLE core.core_workflows ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    ALTER TABLE core.core_workflows ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC';
  END IF;
END $$;

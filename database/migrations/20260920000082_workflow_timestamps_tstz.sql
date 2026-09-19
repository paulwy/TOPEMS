-- TOPEMS database migration 20260920000082
-- flow create/list 500（decode）：public/rs 的 core_workflows 时间列为
--   timestamp WITHOUT time zone（core 为 WITH time zone），代码 DateTime<Utc> 期望 timestamptz。
--   INSERT ... RETURNING / SELECT decode 失败。统一三 schema 副本为 timestamptz。
-- 幂等：仅转换 timestamp without time zone 的列。

DO $$
BEGIN
  IF to_regclass('public.core_workflows') IS NOT NULL THEN
    ALTER TABLE public.core_workflows ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    ALTER TABLE public.core_workflows ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    ALTER TABLE public.core_workflows ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC';
  END IF;
  IF to_regclass('rs.core_workflows') IS NOT NULL THEN
    ALTER TABLE rs.core_workflows ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    ALTER TABLE rs.core_workflows ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    ALTER TABLE rs.core_workflows ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC';
  END IF;
  IF to_regclass('core.core_workflows') IS NOT NULL THEN
    ALTER TABLE core.core_workflows ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    ALTER TABLE core.core_workflows ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    ALTER TABLE core.core_workflows ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC';
  END IF;
END $$;

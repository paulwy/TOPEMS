-- ============================================================
-- P5a: prod 残留 naive timestamp → timestamptz（5 列，db04-prod 的覆盖缺口）
--
-- 背景：20261103173000_db04_prod_unify_remaining_naive_timestamps_174cols.sql 已把
--   prod 174 列统一为 timestamptz（实测该文件确含 174 个 ALTER COLUMN），但漏掉了
--   以下 2 张表共 5 列，prod 只读盘点 2026-11-04 仍为 timestamp without time zone：
--     public.equipment.created_at / updated_at / last_maintenance / next_maintenance
--     iam.core_plugin_instances.last_heartbeat
--   上述表名不在 db04 的文件清单内（db04 覆盖的是 rs.equipment，不是 public.equipment）。
--
-- 依据：prod 实测 2026-11-04；除 iam.core_plugin_instances.last_heartbeat 外均为 0 行表，
--   该列所在行数极小，改写窗口可忽略。
-- 写法：沿用 db04 的 USING col AT TIME ZONE 'UTC'（naive 值按 UTC 解释后再落 tz）。
--   仅当列当前仍为 timestamp without time zone 时才执行，重复执行即跳过。
-- 回滚：timestamptz → naive 会丢失时区语义，属不可逆；回滚=执行前整库 dump 还原。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- public.equipment.created_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'equipment'
      AND a.attname = 'created_at' AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$$;

-- public.equipment.updated_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'equipment'
      AND a.attname = 'updated_at' AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$$;

-- public.equipment.last_maintenance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'equipment'
      AND a.attname = 'last_maintenance' AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment
      ALTER COLUMN last_maintenance TYPE timestamptz
      USING last_maintenance AT TIME ZONE 'UTC';
  END IF;
END
$$;

-- public.equipment.next_maintenance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'equipment'
      AND a.attname = 'next_maintenance' AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment
      ALTER COLUMN next_maintenance TYPE timestamptz
      USING next_maintenance AT TIME ZONE 'UTC';
  END IF;
END
$$;

-- iam.core_plugin_instances.last_heartbeat
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'iam' AND t.relname = 'core_plugin_instances'
      AND a.attname = 'last_heartbeat' AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE iam.core_plugin_instances
      ALTER COLUMN last_heartbeat TYPE timestamptz
      USING last_heartbeat AT TIME ZONE 'UTC';
  END IF;
END
$$;

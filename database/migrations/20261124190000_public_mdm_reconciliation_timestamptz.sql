-- 2026-11-24 B263：public.core_mdm_reconciliation_log 统一 timestamptz
-- 背景：20261120235945_unified_core_schema_canonical.sql 建表时 detected_at /
--   resolved_at 用了 timestamp without time zone，与日期类型契约（Instant 边界
--   必须 timestamptz）不一致；date-type-audit 将其判为基线外新增，阻断 CI。
-- 处置：仅当列仍为 naive timestamp 时改型，存量值按 UTC 解释；已有 timestamptz 跳过。
-- date-type-baseline: covered
-- 幂等：按 information_schema 判断列类型，重复执行为 no-op。
-- 回滚：database/rollback/20261124190000_public_mdm_reconciliation_timestamptz.rollback.sql

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'core_mdm_reconciliation_log'
          AND column_name = 'detected_at'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE public.core_mdm_reconciliation_log
            ALTER COLUMN detected_at TYPE timestamp with time zone
            USING detected_at AT TIME ZONE 'UTC';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'core_mdm_reconciliation_log'
          AND column_name = 'resolved_at'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE public.core_mdm_reconciliation_log
            ALTER COLUMN resolved_at TYPE timestamp with time zone
            USING resolved_at AT TIME ZONE 'UTC';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'core_mdm_reconciliation_log'
          AND column_name IN ('detected_at', 'resolved_at')
          AND data_type = 'timestamp without time zone'
    ) THEN
        RAISE EXCEPTION 'public.core_mdm_reconciliation_log 仍存在无时区 timestamp 列';
    END IF;
END
$$;

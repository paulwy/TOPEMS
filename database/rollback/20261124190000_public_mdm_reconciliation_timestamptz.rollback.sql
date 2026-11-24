-- 回滚 B263：public.core_mdm_reconciliation_log 恢复 timestamp without time zone
-- 仅在代码同步回退到 naive timestamp 契约时使用；存量值按 UTC 还原。
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'core_mdm_reconciliation_log'
          AND column_name = 'detected_at'
          AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE public.core_mdm_reconciliation_log
            ALTER COLUMN detected_at TYPE timestamp without time zone
            USING detected_at AT TIME ZONE 'UTC';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'core_mdm_reconciliation_log'
          AND column_name = 'resolved_at'
          AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE public.core_mdm_reconciliation_log
            ALTER COLUMN resolved_at TYPE timestamp without time zone
            USING resolved_at AT TIME ZONE 'UTC';
    END IF;
END
$$;

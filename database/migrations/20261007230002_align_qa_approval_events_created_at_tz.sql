-- =============================================================================
-- 20261007230002_align_qa_approval_events_created_at_tz.sql
-- =============================================================================
-- 修复时间类型终态契约回归：qms.qa_approval_events.created_at 原为 naive
--   timestamp（迁移 20261007204301 定义 TIMESTAMP DEFAULT NOW()），
--   违反「naive timestamp = 0」终态。此处按全库 1132 列迁移同模式
--   （USING col AT TIME ZONE 'UTC'，无偏移）收敛为 timestamptz。
--
-- 幂等守卫：仅当列仍为 naive timestamp 时才 ALTER，重复执行无副作用。
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'qms'
          AND table_name   = 'qa_approval_events'
          AND column_name  = 'created_at'
          AND data_type    = 'timestamp without time zone'
    ) THEN
        ALTER TABLE qms.qa_approval_events
            ALTER COLUMN created_at TYPE TIMESTAMPTZ
            USING created_at AT TIME ZONE 'UTC';
    END IF;
END $$;

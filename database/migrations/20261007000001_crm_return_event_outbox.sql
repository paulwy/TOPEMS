-- ============================================================================
-- F-54: crm 售后事件发布补偿表（Outbox-lite）
--
-- 根因：complete_return / process_return 在事务 commit 前 tokio::spawn 发布
-- ReturnProcessed/ReturnCompleted 事件——spawn 任务可先于 commit 完成发布，
-- 事务随后回滚时产生"幽灵事件"（DB 无变更但 ERP 已生成退款凭证/收到完成事件）。
-- 修复：事件发布移到 commit 之后（原子性）；发布失败登记本表（补偿），
-- 通过 /returns/events/replay 重放，事件不静默丢失。
--
-- 本表为服务端内部补偿表（无租户查询面），不开 RLS；仅供 crm 服务写入与重放。
-- ============================================================================
CREATE TABLE IF NOT EXISTS "crm"."return_event_outbox" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id   UUID NOT NULL,
    return_no   VARCHAR(64) NOT NULL,
    event_type  VARCHAR(32) NOT NULL,
    payload     JSONB NOT NULL,
    status      VARCHAR(16) NOT NULL DEFAULT 'FAILED',  -- FAILED / REPLAYED
    attempts    INT NOT NULL DEFAULT 1,
    last_error  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_event_outbox_status
    ON "crm"."return_event_outbox" (status, created_at);

-- 通知投递记录（STUB deliveries 子域真实化，2026-10-20）
CREATE TABLE IF NOT EXISTS communication.core_notification_deliveries (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id   uuid NOT NULL,
    user_id           uuid,
    tenant_id         uuid,
    channel           text NOT NULL DEFAULT 'in_app',
    status            text NOT NULL DEFAULT 'pending',
    recipient         text NOT NULL DEFAULT '',
    subject           text,
    body              text,
    sent_at           timestamptz,
    delivered_at      timestamptz,
    failed_at         timestamptz,
    failure_reason    text,
    retry_count       int NOT NULL DEFAULT 0,
    max_retries       int NOT NULL DEFAULT 3,
    next_retry_at     timestamptz,
    provider_message_id text,
    batch_id          uuid,
    metadata          jsonb,
    created_at        timestamptz NOT NULL DEFAULT NOW(),
    updated_at        timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notif ON communication.core_notification_deliveries (notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_batch ON communication.core_notification_deliveries (batch_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user ON communication.core_notification_deliveries (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON communication.core_notification_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel ON communication.core_notification_deliveries (channel);

ALTER TABLE communication.core_notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.core_notification_deliveries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_deliveries_tenant_isolation ON communication.core_notification_deliveries;
CREATE POLICY notification_deliveries_tenant_isolation
    ON communication.core_notification_deliveries
    USING ((tenant_id = (current_setting('app.tenant_id', true))::uuid) OR (current_setting('app.tenant_id', true) = ''));

-- 通知订阅（STUB subscriptions 子域真实化，2026-10-20）
CREATE TABLE IF NOT EXISTS communication.core_notification_subscriptions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL,
    tenant_id        uuid,
    event_type       text NOT NULL,
    event_category   text,
    channels         text[] NOT NULL DEFAULT ARRAY['in_app'],
    status           text NOT NULL DEFAULT 'active',
    filter_expression text,
    priority         int NOT NULL DEFAULT 0,
    expires_at       timestamptz,
    created_at       timestamptz NOT NULL DEFAULT NOW(),
    updated_at       timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON communication.core_notification_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_event ON communication.core_notification_subscriptions (event_type);

ALTER TABLE communication.core_notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.core_notification_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_subscriptions_tenant_isolation ON communication.core_notification_subscriptions;
CREATE POLICY notification_subscriptions_tenant_isolation
    ON communication.core_notification_subscriptions
    USING ((tenant_id = (current_setting('app.tenant_id', true))::uuid) OR (current_setting('app.tenant_id', true) = ''));

-- 通知用户偏好设置（STUB preferences 子域真实化，2026-10-20）
-- 单行 JSONB 存储：categories / quiet_hours / global_mute 以 jsonb 存，其余标量列
CREATE TABLE IF NOT EXISTS communication.core_notification_preferences (
    user_id          uuid PRIMARY KEY,
    categories       jsonb NOT NULL DEFAULT '[]'::jsonb,
    quiet_hours      jsonb NOT NULL DEFAULT '{}'::jsonb,
    global_mute      jsonb NOT NULL DEFAULT '{}'::jsonb,
    default_channels text[] NOT NULL DEFAULT ARRAY['in_app'],
    language         text NOT NULL DEFAULT 'zh-CN',
    timezone         text NOT NULL DEFAULT 'Asia/Shanghai',
    tenant_id        uuid,
    updated_at       timestamptz NOT NULL DEFAULT NOW()
);

-- RLS：与 communication 其余表一致启用并强制（按租户隔离）
ALTER TABLE communication.core_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.core_notification_preferences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_tenant_isolation ON communication.core_notification_preferences;
CREATE POLICY notification_preferences_tenant_isolation
    ON communication.core_notification_preferences
    USING ((tenant_id = (current_setting('app.tenant_id', true))::uuid) OR (current_setting('app.tenant_id', true) = ''));

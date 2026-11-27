-- 移动端用户偏好设置：真实持久化
-- 背景：GET /api/mobile/user/settings 原返回硬编码 JSON，前端开关无法保存。
-- 本迁移建立 mobile.user_settings（按 tenant_id + user_id 唯一），并挂 RLS（FORCE）。
BEGIN;

CREATE TABLE IF NOT EXISTS mobile.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    user_id uuid NOT NULL,
    language character varying(20) DEFAULT 'zh-CN'::character varying NOT NULL,
    theme character varying(20) DEFAULT 'light'::character varying NOT NULL,
    notification_enabled boolean DEFAULT true NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    auto_sync boolean DEFAULT true NOT NULL,
    sync_interval integer DEFAULT 15 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'mobile.user_settings'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE mobile.user_settings ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS mobile_user_settings_tenant_user_key
    ON mobile.user_settings USING btree (tenant_id, user_id)
    WHERE deleted_at IS NULL;

ALTER TABLE mobile.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.user_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.user_settings;
CREATE POLICY rls_tenant_isolation ON mobile.user_settings FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

COMMENT ON TABLE mobile.user_settings IS '移动端用户偏好设置（语言/主题/推送/离线同步）';

COMMIT;

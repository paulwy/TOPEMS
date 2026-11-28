-- 移动应用（App 包）配置：真实持久化（原 /mobile/settings-app 只写 localStorage）
BEGIN;

CREATE TABLE IF NOT EXISTS mobile.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    force_update boolean DEFAULT false NOT NULL,
    auto_update boolean DEFAULT true NOT NULL,
    min_version character varying(20) DEFAULT ''::character varying NOT NULL,
    app_key character varying(200) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'mobile.app_settings'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE mobile.app_settings ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS mobile_app_settings_tenant_key
    ON mobile.app_settings USING btree (tenant_id)
    WHERE deleted_at IS NULL;

ALTER TABLE mobile.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.app_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.app_settings;
CREATE POLICY rls_tenant_isolation ON mobile.app_settings FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

COMMENT ON TABLE mobile.app_settings IS '移动应用包配置（强制更新/自动更新/最低版本/AppKey）';

COMMIT;

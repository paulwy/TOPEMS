-- 20261121110000: mobile 22 张运行期表收口（W2-D2 第十六个模块）
--
-- 背景：svc/mobile/src/schema_defense.rs 的 TABLE_DEFS 声明 23 张表（267 列），
-- 启动时建骨架表并逐列补列。其中 mobile.mobile_leave_applications 已被
-- 20261119100000_drop_dead_tables_batch1 归档并删除，live 已不存在，且全仓
-- 运行代码零引用；本迁移不纳入，并由 20261121111000 做幂等清理兜底。
-- 剩余 22 张在 live mobile schema 全部存在，与 batch1/batch2 无其他冲突。
-- 以 baseline+forward 库真实形状固化：22 表 / 293 列 / 24 约束 / 9 附加索引 /
-- 21 策略 / 22 RLS，列、约束、索引、策略、RLS 五项 diff 为 0。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS mobile.audio_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    address character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    duration_seconds integer,
    file_url character varying(500),
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    recorded_by character varying(100) NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.barcode_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    barcode character varying NOT NULL,
    barcode_type character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    decoded_data text NOT NULL,
    location_lat double precision,
    location_lng double precision,
    result_action character varying,
    result_data jsonb,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.core_mobile_offline_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    module character varying(64) NOT NULL,
    action character varying(64) NOT NULL,
    data jsonb NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    policy_key text,
    policy_value jsonb,
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS mobile.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    app_version character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    device_id character varying NOT NULL,
    device_name character varying NOT NULL,
    device_type character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone DEFAULT now() NOT NULL,
    os_type character varying NOT NULL,
    os_version character varying NOT NULL,
    push_token character varying,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.media_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    file_name character varying NOT NULL,
    file_size bigint NOT NULL,
    file_type character varying NOT NULL,
    file_url character varying,
    mime_type character varying NOT NULL,
    tags text[],
    tenant_id uuid,
    uploaded_by character varying NOT NULL,
    uploaded_by_name character varying
);

CREATE TABLE IF NOT EXISTS mobile.mobile_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    date character varying(20) NOT NULL,
    check_in_time character varying(20),
    check_out_time character varying(20),
    check_in_lat numeric(10,6),
    check_in_lng numeric(10,6),
    check_in_address character varying(500),
    check_out_lat numeric(10,6),
    check_out_lng numeric(10,6),
    check_out_address character varying(500),
    status character varying(20) DEFAULT 'not_checked_in'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mobile.mobile_push_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    content text,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    source_type character varying(50),
    source_id uuid,
    target_user character varying(100) DEFAULT 'all'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    push_time timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.mobile_scan_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    location_lat double precision,
    location_lng double precision,
    result_data jsonb,
    scan_data text NOT NULL,
    scan_type character varying NOT NULL,
    tenant_id uuid,
    user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.mobile_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    assignee character varying(100),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    due_date date,
    location_lat numeric(10,6),
    location_lng numeric(10,6),
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    task_type character varying(50) NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.mobile_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    avatar_url character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    department character varying,
    email character varying,
    nickname character varying,
    password_hash character varying NOT NULL,
    phone character varying,
    position character varying,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    username character varying NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.offline_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    entity_id character varying,
    entity_type character varying NOT NULL,
    last_sync_error text,
    operation_data jsonb NOT NULL,
    operation_type character varying NOT NULL,
    sync_attempts integer DEFAULT 0 NOT NULL,
    sync_status character varying DEFAULT 'pending'::character varying NOT NULL,
    synced_at timestamp with time zone,
    tenant_id uuid,
    user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.offline_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    sync_data jsonb NOT NULL,
    sync_type character varying NOT NULL,
    synced_count integer DEFAULT 0 NOT NULL,
    tenant_id uuid,
    user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.patrol_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    address character varying(500),
    checked_at timestamp with time zone,
    checked_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    patrol_type text DEFAULT 'routine'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    tenant_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.photo_evidences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    address character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    file_url character varying(500),
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    recorded_by character varying(100) NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.photo_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    compression_ratio double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    file_name character varying NOT NULL,
    file_path character varying NOT NULL,
    file_size bigint NOT NULL,
    has_watermark boolean DEFAULT false NOT NULL,
    height integer,
    location_lat double precision,
    location_lng double precision,
    mime_type character varying NOT NULL,
    tenant_id uuid,
    thumbnail_url character varying,
    upload_progress integer DEFAULT 0 NOT NULL,
    upload_status character varying DEFAULT 'uploading'::character varying NOT NULL,
    uploaded_at timestamp with time zone,
    user_id uuid NOT NULL,
    watermark_text character varying,
    width integer
);

CREATE TABLE IF NOT EXISTS mobile.push_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    app_version character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    device_model character varying NOT NULL,
    device_token character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    os_version character varying NOT NULL,
    platform character varying NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.push_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying NOT NULL,
    body text NOT NULL,
    notification_type character varying DEFAULT 'info'::character varying NOT NULL,
    data jsonb,
    target_type character varying NOT NULL,
    target_ids text[] NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    delivered_count integer DEFAULT 0 NOT NULL,
    clicked_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    user_id uuid,
    read_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mobile.push_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    body_template text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    name character varying NOT NULL,
    notification_type character varying NOT NULL,
    tenant_id uuid,
    title_template text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.scan_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    barcode character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_type character varying(50) NOT NULL,
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    operator character varying(100) NOT NULL,
    quantity numeric(10,2),
    scanned_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.shortcuts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(100) NOT NULL,
    action_type character varying(100) NOT NULL,
    action_params jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mobile.sync_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    auto_sync_enabled boolean DEFAULT true NOT NULL,
    conflict_strategy character varying DEFAULT 'server优先'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sync_interval_minutes integer DEFAULT 5 NOT NULL,
    sync_on_network_change boolean DEFAULT true NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile.video_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    duration_seconds integer,
    file_url character varying(500),
    location_track jsonb,
    recorded_at timestamp with time zone NOT NULL,
    recorded_by character varying(100) NOT NULL,
    start_location_lat numeric(10,6) NOT NULL,
    start_location_lng numeric(10,6) NOT NULL,
    tenant_id uuid NOT NULL,
    thumbnail_url character varying(500),
    title character varying(200) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mobile_offline_module ON mobile.core_mobile_offline_records USING btree (module);
CREATE INDEX IF NOT EXISTS idx_mobile_offline_status ON mobile.core_mobile_offline_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_mobile_offline_user ON mobile.core_mobile_offline_records USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_push_source ON mobile.mobile_push_notifications USING btree (source_type, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_devices_token ON mobile.push_devices USING btree (device_token);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON mobile.push_notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_user_id ON mobile.shortcuts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_sync_policies_tenant_user ON mobile.sync_policies USING btree (tenant_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS sync_policies_user_id_key ON mobile.sync_policies USING btree (user_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.audio_recordings'::regclass AND conname='audio_recordings_pkey') THEN
        ALTER TABLE mobile.audio_recordings ADD CONSTRAINT "audio_recordings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.barcode_scans'::regclass AND conname='barcode_scans_pkey') THEN
        ALTER TABLE mobile.barcode_scans ADD CONSTRAINT "barcode_scans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.core_mobile_offline_records'::regclass AND conname='core_mobile_offline_records_pkey') THEN
        ALTER TABLE mobile.core_mobile_offline_records ADD CONSTRAINT "core_mobile_offline_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.devices'::regclass AND conname='devices_pkey') THEN
        ALTER TABLE mobile.devices ADD CONSTRAINT "devices_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.media_files'::regclass AND conname='media_files_pkey') THEN
        ALTER TABLE mobile.media_files ADD CONSTRAINT "media_files_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.mobile_attendance'::regclass AND conname='mobile_attendance_pkey') THEN
        ALTER TABLE mobile.mobile_attendance ADD CONSTRAINT "mobile_attendance_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.mobile_push_notifications'::regclass AND conname='mobile_push_notifications_pkey') THEN
        ALTER TABLE mobile.mobile_push_notifications ADD CONSTRAINT "mobile_push_notifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.mobile_scan_records'::regclass AND conname='mobile_scan_records_pkey') THEN
        ALTER TABLE mobile.mobile_scan_records ADD CONSTRAINT "mobile_scan_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.mobile_tasks'::regclass AND conname='mobile_tasks_pkey') THEN
        ALTER TABLE mobile.mobile_tasks ADD CONSTRAINT "mobile_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.mobile_users'::regclass AND conname='mobile_users_pkey') THEN
        ALTER TABLE mobile.mobile_users ADD CONSTRAINT "mobile_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.offline_operations'::regclass AND conname='offline_operations_pkey') THEN
        ALTER TABLE mobile.offline_operations ADD CONSTRAINT "offline_operations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.offline_sync_records'::regclass AND conname='offline_sync_records_pkey') THEN
        ALTER TABLE mobile.offline_sync_records ADD CONSTRAINT "offline_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.patrol_records'::regclass AND conname='patrol_records_pkey') THEN
        ALTER TABLE mobile.patrol_records ADD CONSTRAINT "patrol_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.photo_evidences'::regclass AND conname='photo_evidences_pkey') THEN
        ALTER TABLE mobile.photo_evidences ADD CONSTRAINT "photo_evidences_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.photo_uploads'::regclass AND conname='photo_uploads_pkey') THEN
        ALTER TABLE mobile.photo_uploads ADD CONSTRAINT "photo_uploads_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.push_devices'::regclass AND conname='push_devices_pkey') THEN
        ALTER TABLE mobile.push_devices ADD CONSTRAINT "push_devices_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.push_notifications'::regclass AND conname='push_notifications_pkey') THEN
        ALTER TABLE mobile.push_notifications ADD CONSTRAINT "push_notifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.push_templates'::regclass AND conname='push_templates_pkey') THEN
        ALTER TABLE mobile.push_templates ADD CONSTRAINT "push_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.scan_records'::regclass AND conname='scan_records_pkey') THEN
        ALTER TABLE mobile.scan_records ADD CONSTRAINT "scan_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.shortcuts'::regclass AND conname='shortcuts_pkey') THEN
        ALTER TABLE mobile.shortcuts ADD CONSTRAINT "shortcuts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.sync_policies'::regclass AND conname='sync_policies_pkey') THEN
        ALTER TABLE mobile.sync_policies ADD CONSTRAINT "sync_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.video_recordings'::regclass AND conname='video_recordings_pkey') THEN
        ALTER TABLE mobile.video_recordings ADD CONSTRAINT "video_recordings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.mobile_tasks'::regclass AND conname='ck_mobile_tasks_status_standard') THEN
        ALTER TABLE mobile.mobile_tasks ADD CONSTRAINT "ck_mobile_tasks_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('on_hold'::character varying)::text]))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mobile.shortcuts'::regclass AND conname='shortcuts_user_id_fkey') THEN
        ALTER TABLE mobile.shortcuts ADD CONSTRAINT "shortcuts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES mobile.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;


ALTER TABLE mobile.audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.audio_recordings FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.barcode_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.barcode_scans FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.core_mobile_offline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.core_mobile_offline_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.devices FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.media_files FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_push_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_scan_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.mobile_users FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.offline_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.offline_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.offline_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.offline_sync_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.patrol_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.patrol_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.photo_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.photo_evidences FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.photo_uploads FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.push_devices FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.push_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.push_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.push_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.scan_records FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.shortcuts FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.sync_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.sync_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile.video_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.video_recordings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.audio_recordings;
CREATE POLICY "rls_tenant_isolation" ON mobile.audio_recordings AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.barcode_scans;
CREATE POLICY "rls_tenant_isolation" ON mobile.barcode_scans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.core_mobile_offline_records;
CREATE POLICY "rls_tenant_isolation" ON mobile.core_mobile_offline_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.devices;
CREATE POLICY "rls_tenant_isolation" ON mobile.devices AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.media_files;
CREATE POLICY "rls_tenant_isolation" ON mobile.media_files AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.mobile_push_notifications;
CREATE POLICY "rls_tenant_isolation" ON mobile.mobile_push_notifications AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.mobile_scan_records;
CREATE POLICY "rls_tenant_isolation" ON mobile.mobile_scan_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.mobile_tasks;
CREATE POLICY "rls_tenant_isolation" ON mobile.mobile_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.mobile_users;
CREATE POLICY "rls_tenant_isolation" ON mobile.mobile_users AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.offline_operations;
CREATE POLICY "rls_tenant_isolation" ON mobile.offline_operations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.offline_sync_records;
CREATE POLICY "rls_tenant_isolation" ON mobile.offline_sync_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.patrol_records;
CREATE POLICY "rls_tenant_isolation" ON mobile.patrol_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.photo_evidences;
CREATE POLICY "rls_tenant_isolation" ON mobile.photo_evidences AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.photo_uploads;
CREATE POLICY "rls_tenant_isolation" ON mobile.photo_uploads AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.push_devices;
CREATE POLICY "rls_tenant_isolation" ON mobile.push_devices AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.push_notifications;
CREATE POLICY "rls_tenant_isolation" ON mobile.push_notifications AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.push_templates;
CREATE POLICY "rls_tenant_isolation" ON mobile.push_templates AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.scan_records;
CREATE POLICY "rls_tenant_isolation" ON mobile.scan_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.shortcuts;
CREATE POLICY "rls_tenant_isolation" ON mobile.shortcuts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.sync_policies;
CREATE POLICY "rls_tenant_isolation" ON mobile.sync_policies AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON mobile.video_recordings;
CREATE POLICY "rls_tenant_isolation" ON mobile.video_recordings AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

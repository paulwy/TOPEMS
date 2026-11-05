-- TOPEMS Mobile Service - Database Initialization

-- Mobile Users Table
CREATE TABLE IF NOT EXISTS public.mobile_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nickname character varying(255),
    phone text,
    email text,
    avatar_url character varying(500),
    department character varying(255),
    "position" character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS iam.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id)
);

-- Notifications Table
-- [2026-09-08 遗留⑨闭环] public.notifications 已判死：通知域以 unified_core.notifications 为准
-- （database/init/01_rebuild_database.sql:528），mobile 端通知走 HTTP API 代理（svc/mobile/modules/notifications.rs），
-- 不直连本表。历史定义已删除，索引见 database/postgres/02_create_performance_indexes.sql 同批清理。

-- User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    theme character varying(50) DEFAULT 'light'::character varying,
    language character varying(20) DEFAULT 'zh-CN'::character varying,
    timezone character varying(50) DEFAULT 'Asia/Shanghai'::character varying,
    notification_enabled boolean DEFAULT true,
    notification_sound boolean DEFAULT false,
    auto_refresh boolean DEFAULT false,
    refresh_interval integer DEFAULT 60,
    default_dashboard character varying(100) DEFAULT 'overview'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT user_settings_pkey PRIMARY KEY (id)
);

-- Legacy Tables (existing)
-- [2026-09-08 遗留⑨闭环] public.patrol_records / public.scan_records 已判死：
-- 活版本为 svc/mobile 的 mobile schema 版（schema_defense.rs TABLE_DEFS，V69.3 单一事实源，代码全量读写）。
-- 本 public 版结构与 mobile 版不同（DOUBLE PRECISION vs DECIMAL、无 tenant_id 等），且已被迁移
-- database/migrations/20260901000010_drop_public_iot_shadow.sql DROP，历史定义已删除。

CREATE TABLE IF NOT EXISTS photo_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    address VARCHAR(500),
    file_url VARCHAR(500),
    recorded_by VARCHAR(255) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    address VARCHAR(500),
    duration_seconds INTEGER,
    file_url VARCHAR(500),
    recorded_by VARCHAR(255) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_location_lat DOUBLE PRECISION NOT NULL,
    start_location_lng DOUBLE PRECISION NOT NULL,
    location_track JSONB,
    duration_seconds INTEGER,
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    recorded_by VARCHAR(255) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    assignee VARCHAR(255),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Mobile Approvals Table
CREATE TABLE IF NOT EXISTS mobile_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_instance_id VARCHAR(255) NOT NULL,
    process_definition_id VARCHAR(255) NOT NULL,
    process_name VARCHAR(255) NOT NULL,
    business_key VARCHAR(255),
    business_title VARCHAR(500),
    applicant_id UUID NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    assignee_id UUID NOT NULL,
    assignee_name VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    due_date TIMESTAMP WITH TIME ZONE,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    batch_no VARCHAR(100),
    expiry_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'normal',
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Stocktake Tasks Table
CREATE TABLE IF NOT EXISTS stocktake_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    warehouse VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_items INTEGER NOT NULL DEFAULT 0,
    counted_items INTEGER NOT NULL DEFAULT 0,
    assignee VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Stocktake Records Table
CREATE TABLE IF NOT EXISTS stocktake_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES stocktake_tasks(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    system_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'normal',
    counted_by VARCHAR(255) NOT NULL,
    counted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Inbound Orders Table
CREATE TABLE IF NOT EXISTS inbound_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) NOT NULL UNIQUE,
    supplier VARCHAR(255) NOT NULL,
    order_type VARCHAR(50) NOT NULL DEFAULT 'purchase',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_items INTEGER NOT NULL DEFAULT 0,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    expected_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Outbound Orders Table
CREATE TABLE IF NOT EXISTS outbound_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) NOT NULL UNIQUE,
    customer VARCHAR(255) NOT NULL,
    order_type VARCHAR(50) NOT NULL DEFAULT 'sales',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_items INTEGER NOT NULL DEFAULT 0,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    expected_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Quality Tasks Table
CREATE TABLE IF NOT EXISTS quality_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no VARCHAR(100) NOT NULL UNIQUE,
    task_type VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inspector VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Defect Records Table
CREATE TABLE IF NOT EXISTS defect_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES quality_tasks(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    defect_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'minor',
    quantity INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    images JSONB,
    reporter VARCHAR(255) NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Production Orders Table
CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    completed_quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    workstation VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Work Reports Table
CREATE TABLE IF NOT EXISTS work_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    order_no VARCHAR(100) NOT NULL,
    workstation VARCHAR(255) NOT NULL,
    operator VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    good_quantity INTEGER NOT NULL DEFAULT 0,
    bad_quantity INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_no VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    location VARCHAR(255),
    last_maintenance DATE,
    next_maintenance DATE,
    running_hours INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mobile_users_username ON mobile_users(username);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(refresh_token);
-- [2026-09-08 遗留⑨闭环] idx_notifications_user_id / idx_notifications_is_read 已删除：
-- public.notifications 已判死（活版本 unified_core.notifications，索引见 01_rebuild_database.sql:776-778）
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- [2026-09-08 遗留⑨闭环] idx_patrol_records_created_at / idx_scan_records_created_at 已删除：
-- public 版 patrol_records / scan_records 已判死（活版本 mobile schema，索引由 svc/mobile schema_defense 维护）
CREATE INDEX IF NOT EXISTS idx_photo_evidences_created_at ON photo_evidences(created_at);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_created_at ON audio_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_video_recordings_created_at ON video_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_status ON mobile_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_created_at ON mobile_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_mobile_approvals_assignee ON mobile_approvals(assignee_id);
CREATE INDEX IF NOT EXISTS idx_mobile_approvals_status ON mobile_approvals(status);
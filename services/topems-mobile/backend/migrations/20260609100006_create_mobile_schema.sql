-- Mobile Schema Migration
-- 移动端服务

-- Create schema
CREATE SCHEMA IF NOT EXISTS mobile;

-- Set search path
SET search_path TO mobile;

-- ==================== 巡检记录表 ====================

-- 巡检记录表
CREATE TABLE IF NOT EXISTS patrol_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location_lat NUMERIC(10,6) NOT NULL,
    location_lng NUMERIC(10,6) NOT NULL,
    address VARCHAR(500),
    patrol_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    checked_by VARCHAR(100) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 扫码记录表 ====================

-- 扫码记录表
CREATE TABLE IF NOT EXISTS scan_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(100) NOT NULL,
    location_lat NUMERIC(10,6) NOT NULL,
    location_lng NUMERIC(10,6) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    quantity NUMERIC(10,2),
    operator VARCHAR(100) NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 照片取证表 ====================

-- 照片取证表
CREATE TABLE IF NOT EXISTS photo_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location_lat NUMERIC(10,6) NOT NULL,
    location_lng NUMERIC(10,6) NOT NULL,
    address VARCHAR(500),
    file_url VARCHAR(500),
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 音频录制表 ====================

-- 音频录制表
CREATE TABLE IF NOT EXISTS audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location_lat NUMERIC(10,6) NOT NULL,
    location_lng NUMERIC(10,6) NOT NULL,
    address VARCHAR(500),
    duration_seconds INTEGER,
    file_url VARCHAR(500),
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 视频录制表 ====================

-- 视频录制表
CREATE TABLE IF NOT EXISTS video_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_location_lat NUMERIC(10,6) NOT NULL,
    start_location_lng NUMERIC(10,6) NOT NULL,
    location_track JSONB,
    duration_seconds INTEGER,
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 移动任务表 ====================

-- 移动任务表
CREATE TABLE IF NOT EXISTS mobile_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    assignee VARCHAR(100),
    location_lat NUMERIC(10,6),
    location_lng NUMERIC(10,6),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_patrol_records_type ON mobile.patrol_records(patrol_type);
CREATE INDEX IF NOT EXISTS idx_patrol_records_status ON mobile.patrol_records(status);
CREATE INDEX IF NOT EXISTS idx_patrol_records_checked_by ON mobile.patrol_records(checked_by);
CREATE INDEX IF NOT EXISTS idx_patrol_records_checked_at ON mobile.patrol_records(checked_at);
CREATE INDEX IF NOT EXISTS idx_scan_records_barcode ON mobile.scan_records(barcode);
CREATE INDEX IF NOT EXISTS idx_scan_records_operator ON mobile.scan_records(operator);
CREATE INDEX IF NOT EXISTS idx_scan_records_scanned_at ON mobile.scan_records(scanned_at);
CREATE INDEX IF NOT EXISTS idx_photo_evidences_recorded_by ON mobile.photo_evidences(recorded_by);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_recorded_by ON mobile.audio_recordings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_video_recordings_recorded_by ON mobile.video_recordings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_type ON mobile.mobile_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_status ON mobile.mobile_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_assignee ON mobile.mobile_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_due_date ON mobile.mobile_tasks(due_date);

-- Reset search path
RESET search_path;
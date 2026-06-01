#!/bin/bash
# 更新移动工作台数据库表以使用TIMESTAMPTZ

psql -U xingzhai -d topems_mobile << 'ENDSQL'
-- 删除旧表
DROP TABLE IF EXISTS mobile_tasks CASCADE;
DROP TABLE IF EXISTS video_recordings CASCADE;
DROP TABLE IF EXISTS audio_recordings CASCADE;
DROP TABLE IF EXISTS photo_evidences CASCADE;
DROP TABLE IF EXISTS scan_records CASCADE;
DROP TABLE IF EXISTS patrol_records CASCADE;

-- 创建新表（使用TIMESTAMPTZ）
CREATE TABLE IF NOT EXISTS patrol_records (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    address VARCHAR(500),
    patrol_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    checked_by VARCHAR(100) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_records (
    id UUID PRIMARY KEY,
    barcode VARCHAR(255) NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    quantity DOUBLE PRECISION,
    operator VARCHAR(100) NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS photo_evidences (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    address VARCHAR(500),
    file_url VARCHAR(500),
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_recordings (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    address VARCHAR(500),
    duration_seconds INTEGER,
    file_url VARCHAR(500),
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS video_recordings (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_location_lat DOUBLE PRECISION NOT NULL,
    start_location_lng DOUBLE PRECISION NOT NULL,
    location_track JSONB,
    duration_seconds INTEGER,
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile_tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    assignee VARCHAR(100),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
ENDSQL

echo "Database tables updated successfully!"

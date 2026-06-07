-- TOPEMS Mobile Service - Database Initialization

CREATE TABLE IF NOT EXISTS patrol_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    address VARCHAR(500),
    patrol_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    checked_by VARCHAR(255) NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(255) NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    item_type VARCHAR(100) NOT NULL,
    quantity DOUBLE PRECISION,
    operator VARCHAR(255) NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_patrol_records_created_at ON patrol_records(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_records_created_at ON scan_records(created_at);
CREATE INDEX IF NOT EXISTS idx_photo_evidences_created_at ON photo_evidences(created_at);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_created_at ON audio_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_video_recordings_created_at ON video_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_status ON mobile_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_created_at ON mobile_tasks(created_at);

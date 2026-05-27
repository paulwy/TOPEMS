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
    checked_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_records (
    id UUID PRIMARY KEY,
    barcode VARCHAR(255) NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    quantity DOUBLE PRECISION,
    operator VARCHAR(100) NOT NULL,
    scanned_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
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
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
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
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
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
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile_tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    assignee VARCHAR(100) NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    due_date DATE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patrol_records_type ON patrol_records(patrol_type);
CREATE INDEX IF NOT EXISTS idx_scan_records_barcode ON scan_records(barcode);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_status ON mobile_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_assignee ON mobile_tasks(assignee);

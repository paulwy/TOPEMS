SET search_path TO mobile;

CREATE TABLE IF NOT EXISTS mobile_attendance (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    date VARCHAR(20) NOT NULL,
    check_in_time VARCHAR(20),
    check_out_time VARCHAR(20),
    check_in_lat NUMERIC(10,6),
    check_in_lng NUMERIC(10,6),
    check_in_address VARCHAR(500),
    check_out_lat NUMERIC(10,6),
    check_out_lng NUMERIC(10,6),
    check_out_address VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'not_checked_in',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_attendance_user_date ON mobile_attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_mobile_attendance_user_id ON mobile_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_attendance_date ON mobile_attendance(date);
CREATE INDEX IF NOT EXISTS idx_mobile_attendance_status ON mobile_attendance(status);

CREATE TABLE IF NOT EXISTS mobile_leave_applications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date VARCHAR(20) NOT NULL,
    end_date VARCHAR(20) NOT NULL,
    duration_days NUMERIC(5,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_leave_user_id ON mobile_leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_leave_status ON mobile_leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_mobile_leave_created_at ON mobile_leave_applications(created_at);

RESET search_path;
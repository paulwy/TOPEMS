-- 办公用品表
CREATE TABLE IF NOT EXISTS erp.office_supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    price DECIMAL(10, 2),
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_office_supplies_name ON erp.office_supplies(name);
CREATE INDEX IF NOT EXISTS idx_office_supplies_status ON erp.office_supplies(status);
CREATE INDEX IF NOT EXISTS idx_office_supplies_category ON erp.office_supplies(category);

-- 会议室表
CREATE TABLE IF NOT EXISTS erp.meeting_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 10,
    location VARCHAR(255),
    facilities TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_name ON erp.meeting_rooms(name);
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_status ON erp.meeting_rooms(status);

-- 会议预约表
CREATE TABLE IF NOT EXISTS erp.meeting_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES erp.meeting_rooms(id) ON DELETE CASCADE,
    room_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    organizer VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_bookings_room_id ON erp.meeting_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_status ON erp.meeting_bookings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_start_time ON erp.meeting_bookings(start_time);

-- 车辆表
CREATE TABLE IF NOT EXISTS erp.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    brand VARCHAR(100),
    model VARCHAR(100),
    vehicle_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    driver VARCHAR(255),
    last_service TIMESTAMP,
    mileage INTEGER DEFAULT 0,
    fuel_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON erp.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON erp.vehicles(status);

-- 车辆申请记录表
CREATE TABLE IF NOT EXISTS erp.vehicle_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES erp.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(50) NOT NULL,
    requester VARCHAR(255) NOT NULL,
    purpose TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    driver_required BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_vehicle_id ON erp.vehicle_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status ON erp.vehicle_requests(status);

-- 文档管理表
CREATE TABLE IF NOT EXISTS erp.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    doc_type VARCHAR(100) NOT NULL DEFAULT 'general',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    file_url TEXT,
    file_size BIGINT DEFAULT 0,
    uploader VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_title ON erp.documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_status ON erp.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON erp.documents(doc_type);

-- 公告表
CREATE TABLE IF NOT EXISTS erp.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    priority VARCHAR(50) DEFAULT 'normal',
    publish_at TIMESTAMP,
    expire_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON erp.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON erp.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON erp.announcements(publish_at);

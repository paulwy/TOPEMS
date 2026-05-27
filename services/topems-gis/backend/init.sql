CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS factory_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    map_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    bounds JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    device_code VARCHAR(100) NOT NULL,
    device_type VARCHAR(100),
    position JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    description TEXT,
    last_inspected TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    pipeline_type VARCHAR(100),
    path JSONB NOT NULL,
    properties JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(255) NOT NULL,
    zone VARCHAR(100),
    position JSONB NOT NULL,
    capacity INTEGER,
    usage_rate DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
    position JSONB NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    description TEXT,
    taken_by VARCHAR(255) NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_locations_map_id ON device_locations(map_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_map_id ON pipelines(map_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_map_id ON warehouse_locations(map_id);
CREATE INDEX IF NOT EXISTS idx_location_photos_map_id ON location_photos(map_id);

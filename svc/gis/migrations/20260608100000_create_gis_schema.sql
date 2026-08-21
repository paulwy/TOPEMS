-- GIS 服务数据库迁移脚本
-- 创建 gis schema
CREATE SCHEMA IF NOT EXISTS gis;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 创建工厂地图表
CREATE TABLE IF NOT EXISTS gis.factory_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    map_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    bounds JSONB,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建设备位置表
CREATE TABLE IF NOT EXISTS gis.device_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES gis.factory_maps(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    device_code VARCHAR(100) NOT NULL,
    device_type VARCHAR(100),
    position JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    description TEXT,
    last_inspected TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建管线表
CREATE TABLE IF NOT EXISTS gis.pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES gis.factory_maps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    pipeline_type VARCHAR(100),
    path JSONB NOT NULL,
    properties JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建仓库位置表
CREATE TABLE IF NOT EXISTS gis.warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES gis.factory_maps(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(255) NOT NULL,
    zone VARCHAR(100),
    position JSONB NOT NULL,
    capacity INTEGER,
    usage_rate DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建位置照片表
CREATE TABLE IF NOT EXISTS gis.location_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES gis.factory_maps(id) ON DELETE CASCADE,
    position JSONB NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    description TEXT,
    taken_by VARCHAR(255) NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建业务位置表
CREATE TABLE IF NOT EXISTS gis.business_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    business_type VARCHAR(50) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_code VARCHAR(100),
    category VARCHAR(100),
    position JSONB NOT NULL,
    address TEXT,
    contact_person VARCHAR(255),
    contact_phone TEXT,
    capacity INTEGER,
    current_usage INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    properties JSONB,
    description TEXT,
    external_id UUID,
    external_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建地图标记表
CREATE TABLE IF NOT EXISTS gis.map_markers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    marker_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    marker_style VARCHAR(50),
    position JSONB NOT NULL,
    icon_svg TEXT,
    color VARCHAR(20),
    size INTEGER DEFAULT 32,
    popup_content TEXT,
    click_action VARCHAR(50),
    action_data JSONB,
    visible BOOLEAN DEFAULT true,
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建地图表
CREATE TABLE IF NOT EXISTS gis.maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    map_type VARCHAR(50) NOT NULL DEFAULT 'base',
    projection VARCHAR(50) DEFAULT 'EPSG:4326',
    bounds JSONB,
    center JSONB,
    zoom_level INTEGER DEFAULT 10,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建地图图层表
CREATE TABLE IF NOT EXISTS gis.map_layers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES gis.maps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    layer_type VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_url VARCHAR(500),
    source_data JSONB,
    style_config JSONB,
    opacity DECIMAL(3,2) DEFAULT 1.0,
    visible BOOLEAN DEFAULT true,
    z_index INTEGER DEFAULT 0,
    min_zoom INTEGER,
    max_zoom INTEGER,
    properties JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建地理数据表
CREATE TABLE IF NOT EXISTS gis.geodata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    format VARCHAR(50) NOT NULL,
    file_path VARCHAR(500),
    geojson_data JSONB,
    feature_count INTEGER,
    extent JSONB,
    properties_schema JSONB,
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'active',
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建地理要素表
CREATE TABLE IF NOT EXISTS gis.geofeatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    geodata_id UUID NOT NULL REFERENCES gis.geodata(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL,
    geometry JSONB NOT NULL,
    properties JSONB,
    centroid JSONB,
    area DECIMAL(15,5),
    length DECIMAL(15,5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建空间分析表
CREATE TABLE IF NOT EXISTS gis.spatial_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    analysis_type VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    parameters JSONB,
    result_data JSONB,
    result_geometry JSONB,
    statistics JSONB,
    execution_time_ms INTEGER,
    status VARCHAR(50) DEFAULT 'completed',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建位置表
CREATE TABLE IF NOT EXISTS gis.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    location_type VARCHAR(50) NOT NULL,
    position JSONB NOT NULL,
    address TEXT,
    description TEXT,
    properties JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建设备表
CREATE TABLE IF NOT EXISTS gis.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    device_code VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    description TEXT,
    properties JSONB,
    status VARCHAR(50) DEFAULT 'active',
    registered_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建设备位置记录表
CREATE TABLE IF NOT EXISTS gis.device_location_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES gis.devices(id) ON DELETE CASCADE,
    position JSONB NOT NULL,
    accuracy DECIMAL(10,2),
    speed DECIMAL(10,2),
    direction DECIMAL(5,2),
    altitude DECIMAL(10,2),
    battery_level INTEGER,
    signal_strength INTEGER,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS gis.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    user_id UUID,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建索引
-- 工厂地图索引
CREATE INDEX IF NOT EXISTS idx_factory_maps_organization_id ON gis.factory_maps(organization_id);
CREATE INDEX IF NOT EXISTS idx_factory_maps_deleted_at ON gis.factory_maps(deleted_at);

-- 设备位置索引
CREATE INDEX IF NOT EXISTS idx_device_locations_organization_id ON gis.device_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_device_locations_map_id ON gis.device_locations(map_id);
CREATE INDEX IF NOT EXISTS idx_device_locations_deleted_at ON gis.device_locations(deleted_at);

-- 管线索引
CREATE INDEX IF NOT EXISTS idx_pipelines_organization_id ON gis.pipelines(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_map_id ON gis.pipelines(map_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_deleted_at ON gis.pipelines(deleted_at);

-- 仓库位置索引
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_organization_id ON gis.warehouse_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_map_id ON gis.warehouse_locations(map_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_deleted_at ON gis.warehouse_locations(deleted_at);

-- 位置照片索引
CREATE INDEX IF NOT EXISTS idx_location_photos_organization_id ON gis.location_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_location_photos_map_id ON gis.location_photos(map_id);
CREATE INDEX IF NOT EXISTS idx_location_photos_deleted_at ON gis.location_photos(deleted_at);

-- 业务位置索引
CREATE INDEX IF NOT EXISTS idx_business_locations_organization_id ON gis.business_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_type ON gis.business_locations(business_type);
CREATE INDEX IF NOT EXISTS idx_business_locations_position ON gis.business_locations USING GIN(position);
CREATE INDEX IF NOT EXISTS idx_business_locations_deleted_at ON gis.business_locations(deleted_at);

-- 地图标记索引
CREATE INDEX IF NOT EXISTS idx_map_markers_organization_id ON gis.map_markers(organization_id);
CREATE INDEX IF NOT EXISTS idx_map_markers_type ON gis.map_markers(marker_type);
CREATE INDEX IF NOT EXISTS idx_map_markers_deleted_at ON gis.map_markers(deleted_at);

-- 地图索引
CREATE INDEX IF NOT EXISTS idx_maps_organization_id ON gis.maps(organization_id);
CREATE INDEX IF NOT EXISTS idx_maps_code ON gis.maps(code);
CREATE INDEX IF NOT EXISTS idx_maps_deleted_at ON gis.maps(deleted_at);

-- 地图图层索引
CREATE INDEX IF NOT EXISTS idx_map_layers_organization_id ON gis.map_layers(organization_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_map_id ON gis.map_layers(map_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_deleted_at ON gis.map_layers(deleted_at);

-- 地理数据索引
CREATE INDEX IF NOT EXISTS idx_geodata_organization_id ON gis.geodata(organization_id);
CREATE INDEX IF NOT EXISTS idx_geodata_name ON gis.geodata(name);
CREATE INDEX IF NOT EXISTS idx_geodata_deleted_at ON gis.geodata(deleted_at);

-- 地理要素索引
CREATE INDEX IF NOT EXISTS idx_geofeatures_organization_id ON gis.geofeatures(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofeatures_geodata_id ON gis.geofeatures(geodata_id);
CREATE INDEX IF NOT EXISTS idx_geofeatures_type ON gis.geofeatures(feature_type);
CREATE INDEX IF NOT EXISTS idx_geofeatures_deleted_at ON gis.geofeatures(deleted_at);

-- 空间分析索引
CREATE INDEX IF NOT EXISTS idx_spatial_analysis_organization_id ON gis.spatial_analysis(organization_id);
CREATE INDEX IF NOT EXISTS idx_spatial_analysis_deleted_at ON gis.spatial_analysis(deleted_at);

-- 位置索引
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON gis.locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON gis.locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_position ON gis.locations USING GIN(position);
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON gis.locations(deleted_at);

-- 设备索引
CREATE INDEX IF NOT EXISTS idx_devices_organization_id ON gis.devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_code ON gis.devices(device_code);
CREATE INDEX IF NOT EXISTS idx_devices_deleted_at ON gis.devices(deleted_at);

-- 设备位置记录索引
CREATE INDEX IF NOT EXISTS idx_device_location_records_organization_id ON gis.device_location_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_device_location_records_device_id ON gis.device_location_records(device_id);
CREATE INDEX IF NOT EXISTS idx_device_location_records_recorded_at ON gis.device_location_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_device_location_records_deleted_at ON gis.device_location_records(deleted_at);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON gis.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON gis.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON gis.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at ON gis.audit_logs(deleted_at);
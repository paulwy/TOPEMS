-- 20261121120000: gis 20 张运行期表收口（W2-D2 第十七个模块）
--
-- 背景：svc/gis/src/db/schema.rs 的 TABLE_DEFS 声明 20 张表，启动时由
-- schema_defense 建表/补列。live gis 业务表共 20 张：TABLE_DEFS 内的
-- factory_maps/device_locations/.../track_positions 共 19 张在库，audit_log 不在库；
-- 另有 gis.gis_map_markers 由 event_handlers 活跃写入，属运行期表，一并固化。
-- 因此本迁移按 live 真实形状固化 20 张，不重建 gis.audit_log（无迁移、无 live 表）。
-- 迁移内容：20 表 / 310 列 / 160 约束 / 44 索引 / 20 策略 / 20 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

CREATE SCHEMA IF NOT EXISTS gis;

CREATE TABLE IF NOT EXISTS gis.business_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    address text,
    business_code character varying(100),
    business_name character varying(255) NOT NULL,
    business_type character varying(100) NOT NULL,
    capacity integer,
    category character varying(100),
    contact_person character varying(255),
    contact_phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    current_usage integer,
    description text,
    external_id uuid,
    external_type character varying(100),
    position jsonb NOT NULL,
    properties jsonb,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    name text,
    location_type text,
    longitude numeric(10,6),
    latitude numeric(10,6)
);

CREATE TABLE IF NOT EXISTS gis.device_location_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    accuracy double precision,
    altitude double precision,
    battery_level integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    device_id uuid NOT NULL,
    direction double precision,
    position jsonb NOT NULL,
    recorded_at timestamp with time zone DEFAULT now(),
    signal_strength integer,
    speed double precision,
    tenant_id uuid,
    located_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.device_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    device_code character varying(100) NOT NULL,
    device_name character varying(255) NOT NULL,
    device_type character varying(100),
    last_inspected timestamp with time zone,
    map_id uuid NOT NULL,
    position jsonb NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    device_id uuid,
    device_info jsonb,
    longitude numeric(10,6),
    latitude numeric(10,6),
    altitude numeric(10,2),
    speed numeric(10,2),
    located_at timestamp with time zone,
    properties jsonb,
    registered_by uuid
);

CREATE TABLE IF NOT EXISTS gis.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    device_code character varying(100) NOT NULL,
    device_name character varying(255) NOT NULL,
    device_type character varying(100) NOT NULL,
    properties jsonb,
    registered_by uuid,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    device_token character varying(64)
);

CREATE TABLE IF NOT EXISTS gis.evidence_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    duration numeric(10,2),
    evidence_type character varying(50),
    file_hash character varying(128),
    file_size bigint,
    file_url text,
    metadata jsonb,
    position point,
    recorded_at timestamp with time zone,
    recorded_by uuid,
    tags jsonb,
    tenant_id uuid,
    thumbnail_url text,
    title character varying(255),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.factory_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    bounds jsonb,
    code character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    file_url text NOT NULL,
    map_type character varying(50) DEFAULT 'factory'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    floor_level integer DEFAULT 1,
    image_url text,
    width numeric(10,2),
    height numeric(10,2),
    scale numeric(10,4) DEFAULT 1,
    status text DEFAULT 'active'::text
);

CREATE TABLE IF NOT EXISTS gis.geodata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    data_type character varying(50) NOT NULL,
    extent jsonb,
    feature_count integer,
    file_path text,
    format character varying(50) DEFAULT 'geojson'::character varying NOT NULL,
    geojson_data jsonb,
    metadata jsonb,
    name character varying(255) NOT NULL,
    properties_schema jsonb,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by uuid,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.geofeatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    area double precision,
    centroid jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    feature_type character varying(50) NOT NULL,
    geodata_id uuid NOT NULL,
    geometry jsonb NOT NULL,
    length double precision,
    properties jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.geofences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    chat_id uuid,
    creator_id uuid,
    shape_type character varying(50) NOT NULL,
    coordinates jsonb NOT NULL,
    radius double precision,
    event_types jsonb DEFAULT '["enter"]'::jsonb,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    trigger_cooldown integer DEFAULT 300,
    notify_channels jsonb DEFAULT '["notification"]'::jsonb,
    notify_users jsonb DEFAULT '[]'::jsonb,
    gis_fence_id uuid,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.gis_map_markers (
    id uuid NOT NULL,
    marker_type text NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    level text DEFAULT 'normal'::text NOT NULL,
    location text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS gis.location_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    map_id uuid NOT NULL,
    photo_url text NOT NULL,
    position jsonb NOT NULL,
    taken_at timestamp with time zone DEFAULT now(),
    taken_by character varying(255) NOT NULL,
    tenant_id uuid,
    location_id uuid,
    location_type text,
    remark text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    address text,
    code character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    location_type character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    position jsonb NOT NULL,
    properties jsonb,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.map_layers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    layer_type character varying(50) NOT NULL,
    map_id uuid NOT NULL,
    max_zoom integer,
    min_zoom integer,
    name character varying(255) NOT NULL,
    opacity double precision DEFAULT 1.0,
    properties jsonb,
    source_data jsonb,
    source_type character varying(50) NOT NULL,
    source_url text,
    style_config jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    visible boolean DEFAULT true,
    z_index integer DEFAULT 0,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.map_markers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    action_data jsonb,
    click_action character varying(100),
    color character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    icon_svg text,
    marker_style character varying(100),
    marker_type character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    popup_content text,
    position jsonb NOT NULL,
    size integer DEFAULT 24,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    visible boolean DEFAULT true,
    z_index integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gis.maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    name character varying DEFAULT ''::character varying NOT NULL,
    code character varying DEFAULT ''::character varying NOT NULL,
    description text,
    map_type character varying DEFAULT 'general'::character varying NOT NULL,
    projection character varying DEFAULT 'EPSG:4326'::character varying,
    bounds jsonb,
    center jsonb,
    zoom_level integer DEFAULT 12,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.pipelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    description text,
    tenant_id uuid,
    code character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    map_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    path jsonb NOT NULL,
    pipeline_type character varying(100),
    properties jsonb,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.spatial_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    analysis_type character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    execution_time_ms integer,
    input_data jsonb NOT NULL,
    parameters jsonb,
    result_data jsonb,
    result_geometry jsonb,
    statistics jsonb,
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS gis.track_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id uuid,
    position point,
    altitude numeric(10,2),
    speed numeric(10,2),
    heading numeric(10,2),
    accuracy numeric(10,2),
    battery_level numeric(5,2),
    timestamp timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS gis.track_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    device_id uuid,
    device_name character varying(255),
    end_time timestamp with time zone,
    start_time timestamp with time zone,
    tenant_id uuid,
    total_distance numeric(12,2)
);

CREATE TABLE IF NOT EXISTS gis.warehouse_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    description text,
    capacity integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    map_id uuid NOT NULL,
    position jsonb NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    usage_rate double precision,
    warehouse_name character varying(255) NOT NULL,
    zone character varying(100),
    tenant_id uuid,
    warehouse_id uuid,
    name text,
    location_type text,
    longitude numeric(10,6),
    latitude numeric(10,6),
    radius numeric(10,2)
);

CREATE INDEX IF NOT EXISTS idx_business_locations_position ON gis.business_locations USING gin ("position");
CREATE INDEX IF NOT EXISTS idx_business_locations_type ON gis.business_locations USING btree (business_type);
CREATE INDEX IF NOT EXISTS idx_device_location_records_device_id ON gis.device_location_records USING btree (device_id);
CREATE INDEX IF NOT EXISTS idx_gis_device_location_records_device_id ON gis.device_location_records USING btree (device_id);
CREATE INDEX IF NOT EXISTS idx_gis_device_location_records_recorded_at ON gis.device_location_records USING btree (recorded_at);
CREATE INDEX IF NOT EXISTS idx_device_locations_map_id ON gis.device_locations USING btree (map_id);
CREATE INDEX IF NOT EXISTS idx_device_locations_position ON gis.device_locations USING gin ("position");
CREATE INDEX IF NOT EXISTS idx_gis_geodata_tenant_id ON gis.geodata USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_geofeatures_geodata_id ON gis.geofeatures USING btree (geodata_id);
CREATE INDEX IF NOT EXISTS idx_gis_geofeatures_geodata_id ON gis.geofeatures USING btree (geodata_id);
CREATE INDEX IF NOT EXISTS idx_gis_geofeatures_tenant_id ON gis.geofeatures USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gis_geofences_chat_id ON gis.geofences USING btree (chat_id);
CREATE INDEX IF NOT EXISTS idx_gis_geofences_coordinates ON gis.geofences USING gin (coordinates);
CREATE INDEX IF NOT EXISTS idx_gis_geofences_status ON gis.geofences USING btree (status);
CREATE INDEX IF NOT EXISTS idx_gis_geofences_tenant ON gis.geofences USING btree (tenant_id) WHERE (tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid);
CREATE INDEX IF NOT EXISTS idx_location_photos_map_id ON gis.location_photos USING btree (map_id);
CREATE INDEX IF NOT EXISTS idx_gis_locations_position ON gis.locations USING gin ("position");
CREATE INDEX IF NOT EXISTS idx_gis_map_layers_tenant_id ON gis.map_layers USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_map_id ON gis.map_layers USING btree (map_id);
CREATE INDEX IF NOT EXISTS idx_map_markers_type ON gis.map_markers USING btree (marker_type);
CREATE INDEX IF NOT EXISTS idx_pipelines_map_id ON gis.pipelines USING btree (map_id);
CREATE INDEX IF NOT EXISTS idx_gis_spatial_analysis_tenant_id ON gis.spatial_analysis USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_map_id ON gis.warehouse_locations USING btree (map_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.business_locations'::regclass AND conname='business_locations_pkey') THEN
        ALTER TABLE gis.business_locations ADD CONSTRAINT "business_locations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.device_location_records'::regclass AND conname='device_location_records_pkey') THEN
        ALTER TABLE gis.device_location_records ADD CONSTRAINT "device_location_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.device_locations'::regclass AND conname='device_locations_pkey') THEN
        ALTER TABLE gis.device_locations ADD CONSTRAINT "device_locations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.devices'::regclass AND conname='devices_pkey') THEN
        ALTER TABLE gis.devices ADD CONSTRAINT "devices_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.evidence_records'::regclass AND conname='evidence_records_pkey') THEN
        ALTER TABLE gis.evidence_records ADD CONSTRAINT "evidence_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.factory_maps'::regclass AND conname='factory_maps_pkey') THEN
        ALTER TABLE gis.factory_maps ADD CONSTRAINT "factory_maps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.geodata'::regclass AND conname='geodata_pkey') THEN
        ALTER TABLE gis.geodata ADD CONSTRAINT "geodata_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.geofeatures'::regclass AND conname='geofeatures_pkey') THEN
        ALTER TABLE gis.geofeatures ADD CONSTRAINT "geofeatures_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.geofences'::regclass AND conname='geofences_pkey') THEN
        ALTER TABLE gis.geofences ADD CONSTRAINT "geofences_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.gis_map_markers'::regclass AND conname='gis_map_markers_pkey') THEN
        ALTER TABLE gis.gis_map_markers ADD CONSTRAINT "gis_map_markers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.location_photos'::regclass AND conname='location_photos_pkey') THEN
        ALTER TABLE gis.location_photos ADD CONSTRAINT "location_photos_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.locations'::regclass AND conname='locations_pkey') THEN
        ALTER TABLE gis.locations ADD CONSTRAINT "locations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.map_layers'::regclass AND conname='map_layers_pkey') THEN
        ALTER TABLE gis.map_layers ADD CONSTRAINT "map_layers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.map_markers'::regclass AND conname='map_markers_pkey') THEN
        ALTER TABLE gis.map_markers ADD CONSTRAINT "map_markers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.maps'::regclass AND conname='maps_pkey') THEN
        ALTER TABLE gis.maps ADD CONSTRAINT "maps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.pipelines'::regclass AND conname='pipelines_pkey') THEN
        ALTER TABLE gis.pipelines ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.spatial_analysis'::regclass AND conname='spatial_analysis_pkey') THEN
        ALTER TABLE gis.spatial_analysis ADD CONSTRAINT "spatial_analysis_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.track_positions'::regclass AND conname='track_positions_pkey') THEN
        ALTER TABLE gis.track_positions ADD CONSTRAINT "track_positions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.track_records'::regclass AND conname='track_records_pkey') THEN
        ALTER TABLE gis.track_records ADD CONSTRAINT "track_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.warehouse_locations'::regclass AND conname='warehouse_locations_pkey') THEN
        ALTER TABLE gis.warehouse_locations ADD CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.gis_map_markers'::regclass AND conname='gis_map_markers_source_uniq') THEN
        ALTER TABLE gis.gis_map_markers ADD CONSTRAINT "gis_map_markers_source_uniq" UNIQUE (source_type, source_id, tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.device_location_records'::regclass AND conname='device_location_records_device_id_fkey') THEN
        ALTER TABLE gis.device_location_records ADD CONSTRAINT "device_location_records_device_id_fkey" FOREIGN KEY (device_id) REFERENCES gis.devices(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.device_locations'::regclass AND conname='device_locations_map_id_fkey') THEN
        ALTER TABLE gis.device_locations ADD CONSTRAINT "device_locations_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.geofeatures'::regclass AND conname='geofeatures_geodata_id_fkey') THEN
        ALTER TABLE gis.geofeatures ADD CONSTRAINT "geofeatures_geodata_id_fkey" FOREIGN KEY (geodata_id) REFERENCES gis.geodata(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.location_photos'::regclass AND conname='location_photos_map_id_fkey') THEN
        ALTER TABLE gis.location_photos ADD CONSTRAINT "location_photos_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.map_layers'::regclass AND conname='map_layers_map_id_fkey') THEN
        ALTER TABLE gis.map_layers ADD CONSTRAINT "map_layers_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.maps(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.pipelines'::regclass AND conname='pipelines_map_id_fkey') THEN
        ALTER TABLE gis.pipelines ADD CONSTRAINT "pipelines_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='gis.warehouse_locations'::regclass AND conname='warehouse_locations_map_id_fkey') THEN
        ALTER TABLE gis.warehouse_locations ADD CONSTRAINT "warehouse_locations_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;


ALTER TABLE gis.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.business_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.device_location_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.device_location_records FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.device_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.device_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.devices FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.evidence_records FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.factory_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.factory_maps FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.geodata ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.geodata FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.geofeatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.geofeatures FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.geofences FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.gis_map_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.gis_map_markers FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.location_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.location_photos FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.locations FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.map_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.map_layers FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.map_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.map_markers FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.maps FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.pipelines FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.spatial_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.spatial_analysis FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.track_records FORCE ROW LEVEL SECURITY;
ALTER TABLE gis.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.warehouse_locations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.business_locations;
CREATE POLICY "rls_tenant_isolation" ON gis.business_locations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.device_location_records;
CREATE POLICY "rls_tenant_isolation" ON gis.device_location_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.device_locations;
CREATE POLICY "rls_tenant_isolation" ON gis.device_locations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.devices;
CREATE POLICY "rls_tenant_isolation" ON gis.devices AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.evidence_records;
CREATE POLICY "rls_tenant_isolation" ON gis.evidence_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.factory_maps;
CREATE POLICY "rls_tenant_isolation" ON gis.factory_maps AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.geodata;
CREATE POLICY "rls_tenant_isolation" ON gis.geodata AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.geofeatures;
CREATE POLICY "rls_tenant_isolation" ON gis.geofeatures AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.geofences;
CREATE POLICY "rls_tenant_isolation" ON gis.geofences AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.gis_map_markers;
CREATE POLICY "rls_tenant_isolation" ON gis.gis_map_markers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.location_photos;
CREATE POLICY "rls_tenant_isolation" ON gis.location_photos AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.locations;
CREATE POLICY "rls_tenant_isolation" ON gis.locations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.map_layers;
CREATE POLICY "rls_tenant_isolation" ON gis.map_layers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.map_markers;
CREATE POLICY "rls_tenant_isolation" ON gis.map_markers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.maps;
CREATE POLICY "rls_tenant_isolation" ON gis.maps AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.pipelines;
CREATE POLICY "rls_tenant_isolation" ON gis.pipelines AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.spatial_analysis;
CREATE POLICY "rls_tenant_isolation" ON gis.spatial_analysis AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "gis_allow_all_track_positions" ON gis.track_positions;
CREATE POLICY "gis_allow_all_track_positions" ON gis.track_positions AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.track_records;
CREATE POLICY "rls_tenant_isolation" ON gis.track_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON gis.warehouse_locations;
CREATE POLICY "rls_tenant_isolation" ON gis.warehouse_locations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

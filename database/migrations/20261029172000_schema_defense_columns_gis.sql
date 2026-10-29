-- schema_defense 服务级补列批次 [gis]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- gis.audit_log: +7 列
ALTER TABLE IF EXISTS "gis"."audit_log" ADD COLUMN IF NOT EXISTS "action" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."audit_log" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."audit_log" ADD COLUMN IF NOT EXISTS "new_value" JSONB;
ALTER TABLE IF EXISTS "gis"."audit_log" ADD COLUMN IF NOT EXISTS "old_value" JSONB;
ALTER TABLE IF EXISTS "gis"."audit_log" ADD COLUMN IF NOT EXISTS "resource_id" UUID;
ALTER TABLE IF EXISTS "gis"."audit_log" ADD COLUMN IF NOT EXISTS "resource_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."audit_log" ADD COLUMN IF NOT EXISTS "user_id" UUID;

-- gis.business_locations: +13 列
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "business_code" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "business_name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "business_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "category" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "contact_person" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "current_usage" INTEGER;
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "external_id" UUID;
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "external_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "position" JSONB;
ALTER TABLE IF EXISTS "gis"."business_locations" ADD COLUMN IF NOT EXISTS "properties" JSONB;

-- gis.device_location_records: +9 列
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "accuracy" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "altitude" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "battery_level" INTEGER;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "device_id" UUID;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "direction" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "position" JSONB;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "recorded_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "signal_strength" INTEGER;
ALTER TABLE IF EXISTS "gis"."device_location_records" ADD COLUMN IF NOT EXISTS "speed" DOUBLE PRECISION;

-- gis.device_locations: +6 列
ALTER TABLE IF EXISTS "gis"."device_locations" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "gis"."device_locations" ADD COLUMN IF NOT EXISTS "device_code" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."device_locations" ADD COLUMN IF NOT EXISTS "device_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."device_locations" ADD COLUMN IF NOT EXISTS "last_inspected" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."device_locations" ADD COLUMN IF NOT EXISTS "map_id" UUID;
ALTER TABLE IF EXISTS "gis"."device_locations" ADD COLUMN IF NOT EXISTS "position" JSONB;

-- gis.evidence_records: +15 列
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "duration" NUMERIC(10,2);
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "evidence_type" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "file_hash" VARCHAR(128);
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "file_size" BIGINT;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "file_url" TEXT;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "position" POINT;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "recorded_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "recorded_by" UUID;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE IF EXISTS "gis"."evidence_records" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);

-- gis.factory_maps: +4 列
ALTER TABLE IF EXISTS "gis"."factory_maps" ADD COLUMN IF NOT EXISTS "bounds" JSONB;
ALTER TABLE IF EXISTS "gis"."factory_maps" ADD COLUMN IF NOT EXISTS "code" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."factory_maps" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "gis"."factory_maps" ADD COLUMN IF NOT EXISTS "file_url" TEXT;

-- gis.geodata: +12 列
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "data_type" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "extent" JSONB;
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "feature_count" INTEGER;
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "file_path" TEXT;
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "format" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "geojson_data" JSONB;
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "properties_schema" JSONB;
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."geodata" ADD COLUMN IF NOT EXISTS "uploaded_by" UUID;

-- gis.geofeatures: +8 列
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "area" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "centroid" JSONB;
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "feature_type" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "geodata_id" UUID;
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "geometry" JSONB;
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "length" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "gis"."geofeatures" ADD COLUMN IF NOT EXISTS "properties" JSONB;

-- gis.location_photos: +4 列
ALTER TABLE IF EXISTS "gis"."location_photos" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "gis"."location_photos" ADD COLUMN IF NOT EXISTS "map_id" UUID;
ALTER TABLE IF EXISTS "gis"."location_photos" ADD COLUMN IF NOT EXISTS "position" JSONB;
ALTER TABLE IF EXISTS "gis"."location_photos" ADD COLUMN IF NOT EXISTS "taken_by" VARCHAR(255);

-- gis.locations: +9 列
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "code" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "location_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "position" JSONB;
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "properties" JSONB;
ALTER TABLE IF EXISTS "gis"."locations" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);

-- gis.map_layers: +14 列
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "layer_type" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "map_id" UUID;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "max_zoom" INTEGER;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "min_zoom" INTEGER;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "opacity" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "properties" JSONB;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "source_data" JSONB;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "source_url" TEXT;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "style_config" JSONB;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "visible" BOOLEAN;
ALTER TABLE IF EXISTS "gis"."map_layers" ADD COLUMN IF NOT EXISTS "z_index" INTEGER;

-- gis.map_markers: +13 列
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "action_data" JSONB;
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "click_action" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "color" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "icon_svg" TEXT;
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "marker_style" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "marker_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "popup_content" TEXT;
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "position" JSONB;
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "size" INTEGER;
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "visible" BOOLEAN;
ALTER TABLE IF EXISTS "gis"."map_markers" ADD COLUMN IF NOT EXISTS "z_index" INTEGER;

-- gis.pipelines: +9 列
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "code" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "map_id" UUID;
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "path" JSONB;
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "pipeline_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "properties" JSONB;
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE IF EXISTS "gis"."pipelines" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE;

-- gis.spatial_analysis: +9 列
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "analysis_type" VARCHAR(100);
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "execution_time_ms" INTEGER;
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "input_data" JSONB;
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "parameters" JSONB;
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "result_data" JSONB;
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "result_geometry" JSONB;
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "statistics" JSONB;
ALTER TABLE IF EXISTS "gis"."spatial_analysis" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);

-- gis.track_records: +6 列
ALTER TABLE IF EXISTS "gis"."track_records" ADD COLUMN IF NOT EXISTS "device_id" UUID;
ALTER TABLE IF EXISTS "gis"."track_records" ADD COLUMN IF NOT EXISTS "device_name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."track_records" ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."track_records" ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "gis"."track_records" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "gis"."track_records" ADD COLUMN IF NOT EXISTS "total_distance" NUMERIC(12,2);

-- gis.warehouse_locations: +6 列
ALTER TABLE IF EXISTS "gis"."warehouse_locations" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE IF EXISTS "gis"."warehouse_locations" ADD COLUMN IF NOT EXISTS "map_id" UUID;
ALTER TABLE IF EXISTS "gis"."warehouse_locations" ADD COLUMN IF NOT EXISTS "position" JSONB;
ALTER TABLE IF EXISTS "gis"."warehouse_locations" ADD COLUMN IF NOT EXISTS "usage_rate" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "gis"."warehouse_locations" ADD COLUMN IF NOT EXISTS "warehouse_name" VARCHAR(255);
ALTER TABLE IF EXISTS "gis"."warehouse_locations" ADD COLUMN IF NOT EXISTS "zone" VARCHAR(100);

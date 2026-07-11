-- TOPEMS GIS 数据库迁移脚本
-- 为所有 GIS 表添加 tenant_id 字段以支持多租户

-- ============================================
-- 1. 工厂地图表 (factory_maps)
-- ============================================
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.factory_maps SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.factory_maps ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_factory_maps_tenant_id ON gis.factory_maps(tenant_id);

-- ============================================
-- 2. 设备点位表 (device_locations)
-- ============================================
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.device_locations SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.device_locations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_device_locations_tenant_id ON gis.device_locations(tenant_id);

-- ============================================
-- 3. 管道表 (pipelines)
-- ============================================
ALTER TABLE gis.pipelines ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.pipelines SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.pipelines ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON gis.pipelines(tenant_id);

-- ============================================
-- 4. 仓储位置表 (warehouse_locations)
-- ============================================
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.warehouse_locations SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.warehouse_locations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_tenant_id ON gis.warehouse_locations(tenant_id);

-- ============================================
-- 5. 位置照片表 (location_photos)
-- ============================================
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.location_photos SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.location_photos ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_location_photos_tenant_id ON gis.location_photos(tenant_id);

-- ============================================
-- 6. 业务位置表 (business_locations)
-- ============================================
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.business_locations SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.business_locations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_locations_tenant_id ON gis.business_locations(tenant_id);

-- ============================================
-- 7. 设备表 (devices)
-- ============================================
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.devices SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.devices ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON gis.devices(tenant_id);

-- ============================================
-- 8. 设备位置记录表 (device_location_records)
-- ============================================
ALTER TABLE gis.device_location_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.device_location_records dlr SET tenant_id = (SELECT d.tenant_id FROM gis.devices d WHERE d.id = dlr.device_id) WHERE tenant_id IS NULL;
ALTER TABLE gis.device_location_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_device_location_records_tenant_id ON gis.device_location_records(tenant_id);

-- ============================================
-- 9. 地图表 (maps)
-- ============================================
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.maps SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.maps ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maps_tenant_id ON gis.maps(tenant_id);

-- ============================================
-- 10. 地图图层表 (map_layers)
-- ============================================
ALTER TABLE gis.map_layers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.map_layers ml SET tenant_id = (SELECT m.tenant_id FROM gis.maps m WHERE m.id = ml.map_id) WHERE tenant_id IS NULL;
ALTER TABLE gis.map_layers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_layers_tenant_id ON gis.map_layers(tenant_id);

-- ============================================
-- 11. 地图标记表 (map_markers)
-- ============================================
ALTER TABLE gis.map_markers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.map_markers mm SET tenant_id = (SELECT m.tenant_id FROM gis.maps m WHERE m.id = mm.map_id) WHERE tenant_id IS NULL;
ALTER TABLE gis.map_markers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_markers_tenant_id ON gis.map_markers(tenant_id);

-- ============================================
-- 12. 地理数据表 (geodata)
-- ============================================
ALTER TABLE gis.geodata ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.geodata SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.geodata ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geodata_tenant_id ON gis.geodata(tenant_id);

-- ============================================
-- 13. 地理要素表 (geofeatures)
-- ============================================
ALTER TABLE gis.geofeatures ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.geofeatures SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.geofeatures ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geofeatures_tenant_id ON gis.geofeatures(tenant_id);

-- ============================================
-- 14. 地理围栏表 (geofences)
-- ============================================
ALTER TABLE gis.geofences ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.geofences SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.geofences ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geofences_tenant_id ON gis.geofences(tenant_id);

-- ============================================
-- 15. 地理围栏告警表 (geofence_alerts)
-- ============================================
ALTER TABLE gis.geofence_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.geofence_alerts ga SET tenant_id = (SELECT g.tenant_id FROM gis.geofences g WHERE g.id = ga.geofence_id) WHERE tenant_id IS NULL;
ALTER TABLE gis.geofence_alerts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_tenant_id ON gis.geofence_alerts(tenant_id);

-- ============================================
-- 16. 位置表 (locations)
-- ============================================
ALTER TABLE gis.locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.locations SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.locations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON gis.locations(tenant_id);

-- ============================================
-- 17. 空间分析表 (spatial_analysis)
-- ============================================
ALTER TABLE gis.spatial_analysis ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.spatial_analysis SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.spatial_analysis ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_analysis_tenant_id ON gis.spatial_analysis(tenant_id);

-- ============================================
-- 18. 审计日志表 (audit_logs)
-- ============================================
ALTER TABLE gis.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.audit_logs SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON gis.audit_logs(tenant_id);

-- ============================================
-- 19. 审计日志表 (audit_log) - 旧表
-- ============================================
ALTER TABLE gis.audit_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE gis.audit_log SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.audit_log ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON gis.audit_log(tenant_id);

COMMENT ON COLUMN gis.factory_maps.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.device_locations.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.pipelines.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.warehouse_locations.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.location_photos.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.business_locations.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.devices.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.device_location_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.maps.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.map_layers.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.map_markers.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.geodata.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.geofeatures.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.geofences.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.geofence_alerts.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.locations.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.spatial_analysis.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.audit_logs.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN gis.audit_log.tenant_id IS '租户ID，用于多租户隔离';

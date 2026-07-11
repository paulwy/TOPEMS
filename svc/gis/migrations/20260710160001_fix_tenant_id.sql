-- TOPEMS GIS 数据库迁移修复脚本
-- 修复之前迁移失败的表

-- ============================================
-- 修复 map_markers (有 organization_id，但 tenant_id 为 null)
-- ============================================
UPDATE gis.map_markers SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE gis.map_markers ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- 修复 geodata (没有 organization_id，使用关联的 geofeatures 或默认值)
-- ============================================
UPDATE gis.geodata SET tenant_id = (
    SELECT gf.tenant_id 
    FROM gis.geofeatures gf 
    WHERE gf.geodata_id = gis.geodata.id 
    LIMIT 1
) WHERE tenant_id IS NULL;

UPDATE gis.geodata SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE gis.geodata ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- 修复 geofeatures (没有 organization_id)
-- ============================================
UPDATE gis.geofeatures gf SET tenant_id = (
    SELECT g.tenant_id 
    FROM gis.geodata g 
    WHERE g.id = gf.geodata_id
) WHERE tenant_id IS NULL;

UPDATE gis.geofeatures SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE gis.geofeatures ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- 修复 geofences (没有 organization_id，有 map_id)
-- ============================================
UPDATE gis.geofences gf SET tenant_id = (
    SELECT m.tenant_id 
    FROM gis.maps m 
    WHERE m.id = gf.map_id
) WHERE tenant_id IS NULL;

UPDATE gis.geofences SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE gis.geofences ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- 修复 locations (没有 organization_id)
-- ============================================
UPDATE gis.locations SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE gis.locations ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- 修复 spatial_analysis (没有 organization_id)
-- ============================================
UPDATE gis.spatial_analysis SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE gis.spatial_analysis ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- 修复 audit_log (没有 organization_id)
-- ============================================
UPDATE gis.audit_log SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE gis.audit_log ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- 验证所有表的 tenant_id 都已设置
-- ============================================
SELECT table_name, COUNT(*) as null_count
FROM information_schema.columns
WHERE table_schema = 'gis' 
  AND column_name = 'tenant_id'
GROUP BY table_name;

SELECT '所有 GIS 表 tenant_id 修复完成' as status;

-- 回滚入口（B 类 3/7）· 对应 database/migrations/20261115141400_b_class_gis_tenant_id_4tables.sql
-- 口径：仅本次新增才删；逐表判断，表内一旦出现非空 tenant_id 即保留并 RAISE NOTICE。
-- 本迁移未建索引/约束/策略，回滚只涉及列本身；不涉及 pg_policies。

-- 1. gis.geodata.tenant_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141400_b_class_gis_tenant_id_4tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gis.geodata WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE gis.geodata DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'gis.geodata.tenant_id 存在非空值，保留列';
    END IF;
END $$;

-- 2. gis.geofeatures.tenant_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141400_b_class_gis_tenant_id_4tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gis.geofeatures WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE gis.geofeatures DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'gis.geofeatures.tenant_id 存在非空值，保留列';
    END IF;
END $$;

-- 3. gis.map_layers.tenant_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141400_b_class_gis_tenant_id_4tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gis.map_layers WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE gis.map_layers DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'gis.map_layers.tenant_id 存在非空值，保留列';
    END IF;
END $$;

-- 4. gis.spatial_analysis.tenant_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141400_b_class_gis_tenant_id_4tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gis.spatial_analysis WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE gis.spatial_analysis DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'gis.spatial_analysis.tenant_id 存在非空值，保留列';
    END IF;
END $$;

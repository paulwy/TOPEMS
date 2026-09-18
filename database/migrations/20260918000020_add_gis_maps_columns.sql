-- ============================================================================
-- 补齐 gis.maps 列（运行时冒烟发现：代码 SELECT id, tenant_id, name, ...
-- 而 5432 表缺 tenant_id（13 列）、5433 仅骨架（2 列 id/deleted_at））
-- 幂等：ADD COLUMN IF NOT EXISTS，双库同迁；不修改既有列类型。
-- ============================================================================

ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS name character varying NOT NULL DEFAULT '';
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS code character varying NOT NULL DEFAULT '';
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS map_type character varying NOT NULL DEFAULT 'general';
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS projection character varying DEFAULT 'EPSG:4326';
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS bounds jsonb;
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS center jsonb;
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS zoom_level integer DEFAULT 12;
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS status character varying NOT NULL DEFAULT 'active';
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE gis.maps ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE gis.maps ALTER COLUMN id SET DEFAULT gen_random_uuid();

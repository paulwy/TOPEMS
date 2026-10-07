-- =============================================================================
-- 20261007000019_create_gis_map_markers.sql
-- =============================================================================
-- 修复 BE-01（审计 P1）：gis 事件处理器向两库均不存在的
--   gis_map_markers 执行 INSERT ... ON CONFLICT。
-- 证据：svc/gis/src/event_handlers/mod.rs:60-81
--   INSERT INTO gis_map_markers
--     (id, marker_type, source_type, source_id, title, description, level,
--      location, status, created_at, updated_at, tenant_id)
--     VALUES ($1..$9, 'active', $9, $9, '00000000-0000-0000-0000-000000000000')
--     ON CONFLICT (source_type, source_id, tenant_id) DO UPDATE ...
--
-- 决策：(a) 必需 —— 补建表。
--   地图标注是 GIS 域的核心实体：EHS 隐患 / SCM 收货 / 库存出入库三类事件
--   （mod.rs:123/164/209/243）全部落地为地图标注以支撑一张图可视化。
--   注意：base 迁移已建的是 gis.map_markers（另一对象，列结构完全不同：position jsonb 等），
--   与本 INSERT 引用的非限定 gis_map_markers 不是同一关系；代码绑定的是后者，故按代码建表。
--   运行期 search_path = "gis, public"（svc/gis/src/main.rs:29），
--   非限定 gis_map_markers 解析到 gis schema。
--
-- 列对齐 INSERT；ON CONFLICT(source_type, source_id, tenant_id) 需唯一约束。
-- 幂等：CREATE TABLE IF NOT EXISTS + 唯一约束/策略均用 IF NOT EXISTS / DROP IF EXISTS。
-- =============================================================================

CREATE TABLE IF NOT EXISTS gis.gis_map_markers (
    id          UUID PRIMARY KEY,
    marker_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id   UUID NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    level       TEXT NOT NULL DEFAULT 'normal',
    location    TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    tenant_id   UUID
);

-- ON CONFLICT (source_type, source_id, tenant_id) 依赖该唯一约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'gis'
          AND c.conname = 'gis_map_markers_source_uniq'
    ) THEN
        ALTER TABLE gis.gis_map_markers
            ADD CONSTRAINT gis_map_markers_source_uniq
            UNIQUE (source_type, source_id, tenant_id);
    END IF;
END $$;

ALTER TABLE gis.gis_map_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis.gis_map_markers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON gis.gis_map_markers;
CREATE POLICY tenant_isolation ON gis.gis_map_markers
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

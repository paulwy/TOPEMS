-- 2026-10-15 K1 收尾：metadata_v60 剩余实体接真表（属性/标签/血缘/生命周期）。
--
-- 背景：迁移 20261014000060 只建了 metadata_objects（已回填 2 行）+ version_snapshots/
--       api_products/subscriptions；v60 其余实体（attributes / tags / lineage_nodes /
--       lineage_edges / lineage_graphs / lifecycle_policies / lifecycle_history /
--       current_stages）仍走内存 Store。mdm_collections 有 v60 快照 → 本迁移建 8 表 + 回填。
-- 风格对齐：master_data schema；RLS FORCE + nil/空/全零豁免；快照数组用
--       jsonb_array_elements + elem->>'...'；current_stages 为 object → jsonb_each_text。

CREATE SCHEMA IF NOT EXISTS master_data;

-- ---------- metadata_v60：属性 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_metadata_attributes (
    id          TEXT PRIMARY KEY,
    object_id   TEXT NOT NULL DEFAULT '',
    key         TEXT NOT NULL DEFAULT '',
    value       TEXT NOT NULL DEFAULT '',
    data_type   TEXT NOT NULL DEFAULT 'string',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_uid  UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_mattr_object_idx
    ON master_data.mdm_metadata_attributes (object_id);

-- ---------- metadata_v60：标签 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_metadata_tags (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '#95a5a6',
    description TEXT NOT NULL DEFAULT '',
    usage_count BIGINT NOT NULL DEFAULT 0,
    tenant_uid  UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- metadata_v60：血缘节点 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_v60_lineage_nodes (
    id          TEXT PRIMARY KEY,
    entity_id   TEXT NOT NULL DEFAULT '',
    entity_type TEXT NOT NULL DEFAULT '',
    name        TEXT NOT NULL DEFAULT '',
    attributes  JSONB NOT NULL DEFAULT '{}'::jsonb,
    level       BIGINT NOT NULL DEFAULT 0,
    position    JSONB NOT NULL DEFAULT '{}'::jsonb,
    tenant_uid  UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_v60_lnode_entity_idx
    ON master_data.mdm_v60_lineage_nodes (entity_id);

-- ---------- metadata_v60：血缘边 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_v60_lineage_edges (
    id                     TEXT PRIMARY KEY,
    source_id              TEXT NOT NULL DEFAULT '',
    target_id              TEXT NOT NULL DEFAULT '',
    transformation_type    TEXT NOT NULL DEFAULT 'transform',
    transformation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence             DOUBLE PRECISION NOT NULL DEFAULT 1,
    tenant_uid             UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_v60_ledge_source_idx
    ON master_data.mdm_v60_lineage_edges (source_id);
CREATE INDEX IF NOT EXISTS mdm_v60_ledge_target_idx
    ON master_data.mdm_v60_lineage_edges (target_id);

-- ---------- metadata_v60：血缘图谱（图聚合） ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_v60_lineage_graphs (
    id         TEXT PRIMARY KEY,
    nodes      JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges      JSONB NOT NULL DEFAULT '[]'::jsonb,
    root_ids   JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TEXT NOT NULL DEFAULT '',
    tenant_uid UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- metadata_v60：生命周期策略 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_lifecycle_policies (
    id            TEXT PRIMARY KEY,
    entity_type   TEXT NOT NULL DEFAULT '',
    transitions   JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_days BIGINT NOT NULL DEFAULT 0,
    actions       JSONB NOT NULL DEFAULT '[]'::jsonb,
    tenant_uid    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- metadata_v60：生命周期历史 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_lifecycle_history (
    id         TEXT PRIMARY KEY,
    entity_id  TEXT NOT NULL DEFAULT '',
    stage      TEXT NOT NULL DEFAULT 'created',
    from_stage TEXT,
    reason     TEXT NOT NULL DEFAULT '',
    changed_at TEXT NOT NULL DEFAULT '',
    changed_by TEXT NOT NULL DEFAULT '',
    tenant_uid UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_lhist_entity_idx
    ON master_data.mdm_lifecycle_history (entity_id);

-- ---------- metadata_v60：生命周期当前阶段 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_lifecycle_stages (
    entity_id  TEXT PRIMARY KEY,
    stage      TEXT NOT NULL DEFAULT 'created',
    tenant_uid UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- RLS ----------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'mdm_metadata_attributes',
        'mdm_metadata_tags',
        'mdm_v60_lineage_nodes',
        'mdm_v60_lineage_edges',
        'mdm_v60_lineage_graphs',
        'mdm_lifecycle_policies',
        'mdm_lifecycle_history',
        'mdm_lifecycle_stages'
    ]
    LOOP
        EXECUTE format('ALTER TABLE master_data.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE master_data.%I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON master_data.%I', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON master_data.%I
             USING (tenant_uid IS NULL OR tenant_uid::text = '''' OR tenant_uid = ''00000000-0000-0000-0000-000000000001''::uuid
                    OR tenant_uid::text = current_setting(''app.tenant_id'', true))
             WITH CHECK (tenant_uid IS NULL OR tenant_uid::text = '''' OR tenant_uid = ''00000000-0000-0000-0000-000000000001''::uuid
                    OR tenant_uid::text = current_setting(''app.tenant_id'', true))',
            t);
    END LOOP;
END $$;

-- ---------- 回填（mdm_collections metadata_v60 快照，幂等） ----------
-- 属性（快照空）
INSERT INTO master_data.mdm_metadata_attributes
    (id, object_id, key, value, data_type, is_required)
SELECT elem->>'id', elem->>'object_id', elem->>'key', elem->>'value',
       elem->>'data_type', COALESCE((elem->>'is_required')::boolean, FALSE)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'metadata_v60' AND c.entity = 'attributes' AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

-- 标签
INSERT INTO master_data.mdm_metadata_tags
    (id, name, color, description, usage_count)
SELECT elem->>'id', elem->>'name', COALESCE(elem->>'color', '#95a5a6'),
       COALESCE(elem->>'description', ''), COALESCE((elem->>'usage_count')::bigint, 0)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'metadata_v60' AND c.entity = 'tags' AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

-- 血缘节点
INSERT INTO master_data.mdm_v60_lineage_nodes
    (id, entity_id, entity_type, name, attributes, level, position)
SELECT elem->>'id', elem->>'entity_id', elem->>'entity_type', elem->>'name',
       COALESCE(elem->'attributes', '{}'::jsonb),
       COALESCE((elem->>'level')::bigint, 0),
       COALESCE(elem->'position', '{}'::jsonb)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'metadata_v60' AND c.entity = 'lineage_nodes' AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

-- 血缘边
INSERT INTO master_data.mdm_v60_lineage_edges
    (id, source_id, target_id, transformation_type, transformation_details, confidence)
SELECT elem->>'id', elem->>'source_id', elem->>'target_id',
       COALESCE(elem->>'transformation_type', 'transform'),
       COALESCE(elem->'transformation_details', '{}'::jsonb),
       COALESCE((elem->>'confidence')::double precision, 1)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'metadata_v60' AND c.entity = 'lineage_edges' AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

-- 血缘图谱（节点/边数组整体入 JSONB）
INSERT INTO master_data.mdm_v60_lineage_graphs
    (id, nodes, edges, root_ids, updated_at)
SELECT elem->>'id', COALESCE(elem->'nodes', '[]'::jsonb), COALESCE(elem->'edges', '[]'::jsonb),
       COALESCE(elem->'root_ids', '[]'::jsonb), COALESCE(elem->>'updated_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'metadata_v60' AND c.entity = 'lineage_graphs' AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

-- 生命周期策略
INSERT INTO master_data.mdm_lifecycle_policies
    (id, entity_type, transitions, duration_days, actions)
SELECT elem->>'id', elem->>'entity_type',
       COALESCE(elem->'transitions', '{}'::jsonb),
       COALESCE((elem->>'duration_days')::bigint, 0),
       COALESCE(elem->'actions', '[]'::jsonb)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'metadata_v60' AND c.entity = 'lifecycle_policies' AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

-- 生命周期历史（快照空）
INSERT INTO master_data.mdm_lifecycle_history
    (id, entity_id, stage, from_stage, reason, changed_at, changed_by)
SELECT elem->>'id', elem->>'entity_id', elem->>'stage', elem->>'from_stage',
       COALESCE(elem->>'reason', ''), COALESCE(elem->>'changed_at', ''), COALESCE(elem->>'changed_by', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'metadata_v60' AND c.entity = 'lifecycle_history' AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

-- 生命周期当前阶段（快照为 object：key=entity_id, value=stage）
INSERT INTO master_data.mdm_lifecycle_stages (entity_id, stage)
SELECT kv.key, kv.value
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_each_text(c.data) AS kv
WHERE c.module = 'metadata_v60' AND c.entity = 'current_stages' AND jsonb_typeof(c.data) = 'object'
ON CONFLICT (entity_id) DO NOTHING;

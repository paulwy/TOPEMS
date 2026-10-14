-- 2026-10-15 K1：MDM 冻结模块接真表（knowledge_v53 第二批）。
-- 对齐 20261014000060 / 20261015000061 样板：master_data schema、tenant_id + RLS FORCE
-- nil/空/全零豁免、幂等、mdm_collections JSONB 回填 ON CONFLICT DO NOTHING。
-- 复杂实体（KGNode.properties/embeddings、DataAsset.tags/lineage_summary、推荐 reason）
-- 以 JSONB 列承载；search_index（HashMap<String,Vec<String>>）扁平为 (key, value JSONB) 行。

CREATE SCHEMA IF NOT EXISTS master_data;

-- ---------- knowledge_v53：知识图谱 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_kg_nodes (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL DEFAULT '',
    node_type   TEXT NOT NULL DEFAULT 'entity',
    properties  JSONB NOT NULL DEFAULT '{}'::jsonb,
    embeddings  JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TEXT NOT NULL DEFAULT '',
    tenant_id   UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS master_data.mdm_kg_edges (
    id            TEXT PRIMARY KEY,
    source_id     TEXT NOT NULL,
    target_id     TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'derived_from',
    weight        DOUBLE PRECISION NOT NULL DEFAULT 1,
    confidence    DOUBLE PRECISION NOT NULL DEFAULT 1,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_kg_edges_source_idx ON master_data.mdm_kg_edges (source_id);
CREATE INDEX IF NOT EXISTS mdm_kg_edges_target_idx ON master_data.mdm_kg_edges (target_id);

CREATE TABLE IF NOT EXISTS master_data.mdm_kg_graphs (
    id           TEXT PRIMARY KEY,
    nodes        JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges        JSONB NOT NULL DEFAULT '[]'::jsonb,
    version      BIGINT NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT '',
    tenant_id    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- knowledge_v53：智能推荐 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_recommendations (
    id        TEXT PRIMARY KEY,
    target_id TEXT NOT NULL DEFAULT '',
    item_id   TEXT NOT NULL DEFAULT '',
    score     DOUBLE PRECISION NOT NULL DEFAULT 0,
    reason    JSONB NOT NULL DEFAULT '{}'::jsonb,
    source    TEXT NOT NULL DEFAULT 'hybrid',
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_recommendations_target_idx
    ON master_data.mdm_recommendations (target_id);

CREATE TABLE IF NOT EXISTS master_data.mdm_interactions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL DEFAULT '',
    item_id          TEXT NOT NULL DEFAULT '',
    interaction_type TEXT NOT NULL DEFAULT 'view',
    timestamp        TEXT NOT NULL DEFAULT '',
    tenant_id        UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_interactions_item_idx ON master_data.mdm_interactions (item_id);
CREATE INDEX IF NOT EXISTS mdm_interactions_user_idx ON master_data.mdm_interactions (user_id);

-- ---------- knowledge_v53：数据资产目录 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_assets (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL DEFAULT '',
    asset_type      TEXT NOT NULL DEFAULT 'entity',
    description     TEXT NOT NULL DEFAULT '',
    owner           TEXT NOT NULL DEFAULT '',
    domain          TEXT NOT NULL DEFAULT '',
    tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
    lineage_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_score   DOUBLE PRECISION NOT NULL DEFAULT 0,
    access_level    TEXT NOT NULL DEFAULT 'internal',
    updated_at      TEXT NOT NULL DEFAULT '',
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_assets_domain_idx ON master_data.mdm_assets (domain);
CREATE INDEX IF NOT EXISTS mdm_assets_type_idx ON master_data.mdm_assets (asset_type);

CREATE TABLE IF NOT EXISTS master_data.mdm_asset_categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    parent_id   TEXT,
    asset_count BIGINT NOT NULL DEFAULT 0,
    tenant_id   UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- search_index：HashMap<String, Vec<String>> 扁平为 (key, value) 行。
CREATE TABLE IF NOT EXISTS master_data.mdm_search_indexes (
    key       TEXT PRIMARY KEY,
    value     JSONB NOT NULL DEFAULT '[]'::jsonb,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- RLS：8 表统一 ----------
DO $$
DECLARE
    t text;
    tenant_col text;
BEGIN
    FOR t, tenant_col IN
        SELECT * FROM (VALUES
            ('master_data.mdm_kg_nodes', 'tenant_id'),
            ('master_data.mdm_kg_edges', 'tenant_id'),
            ('master_data.mdm_kg_graphs', 'tenant_id'),
            ('master_data.mdm_recommendations', 'tenant_id'),
            ('master_data.mdm_interactions', 'tenant_id'),
            ('master_data.mdm_assets', 'tenant_id'),
            ('master_data.mdm_asset_categories', 'tenant_id'),
            ('master_data.mdm_search_indexes', 'tenant_id')
        ) AS v(tbl, tcol)
    LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
                       split_part(t, '.', 2) || '_tenant_policy', t);
        EXECUTE format($f$
            CREATE POLICY %I ON %s
            USING (
                current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
                OR %s IS NULL
                OR %s = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            )
            WITH CHECK (
                current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
                OR %s IS NULL
                OR %s = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            )
        $f$, split_part(t, '.', 2) || '_tenant_policy', t,
            tenant_col, tenant_col, tenant_col, tenant_col);
    END LOOP;
END $$;

-- ---------- 回填：mdm_collections JSONB 快照（ON CONFLICT DO NOTHING） ----------
INSERT INTO master_data.mdm_kg_nodes (id, label, node_type, properties, embeddings, created_at)
SELECT e->>'id', COALESCE(e->>'label', ''), COALESCE(e->>'type', 'entity'),
       COALESCE((e->'properties')::jsonb, '{}'::jsonb),
       COALESCE((e->'embeddings')::jsonb, '[]'::jsonb),
       COALESCE(e->>'created_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'knowledge_v53' AND c.entity = 'kg_nodes'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_kg_edges (id, source_id, target_id, relation_type, weight, confidence)
SELECT e->>'id', e->>'source_id', e->>'target_id',
       COALESCE(e->>'relation_type', 'derived_from'),
       COALESCE((e->>'weight')::double precision, 1),
       COALESCE((e->>'confidence')::double precision, 1)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'knowledge_v53' AND c.entity = 'kg_edges'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_kg_graphs (id, nodes, edges, version, last_updated)
SELECT COALESCE(e->>'id', 'default'),
       COALESCE((e->'nodes')::jsonb, '[]'::jsonb),
       COALESCE((e->'edges')::jsonb, '[]'::jsonb),
       COALESCE((e->>'version')::bigint, 0),
       COALESCE(e->>'last_updated', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'knowledge_v53' AND c.entity = 'kg_graphs'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_recommendations (id, target_id, item_id, score, reason, source)
SELECT e->>'id', COALESCE(e->>'target_id', ''), COALESCE(e->>'item_id', ''),
       COALESCE((e->>'score')::double precision, 0),
       COALESCE((e->'reason')::jsonb, '{}'::jsonb),
       COALESCE(e->>'source', 'hybrid')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'knowledge_v53' AND c.entity = 'recommendations'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_interactions (id, user_id, item_id, interaction_type, timestamp)
SELECT e->>'id', COALESCE(e->>'user_id', ''), COALESCE(e->>'item_id', ''),
       COALESCE(e->>'interaction_type', 'view'), COALESCE(e->>'timestamp', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'knowledge_v53' AND c.entity = 'interactions'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_assets
    (id, name, asset_type, description, owner, domain, tags, lineage_summary, quality_score, access_level, updated_at)
SELECT e->>'id', COALESCE(e->>'name', ''), COALESCE(e->>'asset_type', 'entity'),
       COALESCE(e->>'description', ''), COALESCE(e->>'owner', ''),
       COALESCE(e->>'domain', ''), COALESCE((e->'tags')::jsonb, '[]'::jsonb),
       COALESCE((e->'lineage_summary')::jsonb, '{}'::jsonb),
       COALESCE((e->>'quality_score')::double precision, 0),
       COALESCE(e->>'access_level', 'internal'), COALESCE(e->>'updated_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'knowledge_v53' AND c.entity = 'assets'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_asset_categories (id, name, parent_id, asset_count)
SELECT e->>'id', COALESCE(e->>'name', ''), NULLIF(e->>'parent_id', ''),
       COALESCE((e->>'asset_count')::bigint, 0)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'knowledge_v53' AND c.entity = 'asset_categories'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_search_indexes (key, value)
SELECT k, COALESCE(v, '[]'::jsonb)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_each(c.data) AS kv(k, v)
WHERE c.module = 'knowledge_v53' AND c.entity = 'search_index'
  AND jsonb_typeof(c.data) = 'object'
ON CONFLICT (key) DO NOTHING;

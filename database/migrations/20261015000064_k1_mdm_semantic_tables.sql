-- K1：semantic_v57 接真表（8 表 + RLS + 回填）
-- 权威库：live DB topems（5432）；回填源 master_data.mdm_collections（module='semantic_v57'）

CREATE TABLE IF NOT EXISTS master_data.mdm_graph_nodes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL DEFAULT '',
    node_type TEXT NOT NULL DEFAULT '',
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    embeddings JSONB NOT NULL DEFAULT '[]'::jsonb,
    degree BIGINT NOT NULL DEFAULT 0,
    community_id TEXT,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_data.mdm_graph_edges (
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'related',
    weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_id, target_id, relation_type)
);

CREATE TABLE IF NOT EXISTS master_data.mdm_graph_communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    node_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    algorithm TEXT NOT NULL DEFAULT 'label_propagation',
    modularity DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_data.mdm_semantic_search_indexes (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id TEXT NOT NULL DEFAULT '',
    embeddings JSONB NOT NULL DEFAULT '[]'::jsonb,
    text TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_data.mdm_search_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL DEFAULT '',
    results_count BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT '',
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
);

CREATE TABLE IF NOT EXISTS master_data.mdm_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    usage_count BIGINT NOT NULL DEFAULT 0,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_data.mdm_tag_rules (
    id TEXT PRIMARY KEY,
    tag_id TEXT NOT NULL DEFAULT '',
    condition JSONB NOT NULL DEFAULT '{}'::jsonb,
    auto_apply BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_data.mdm_tagged_entities (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    tag_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    applied_at TEXT NOT NULL DEFAULT '',
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, entity_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_mdm_graph_nodes_tenant ON master_data.mdm_graph_nodes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_graph_edges_tenant ON master_data.mdm_graph_edges (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_graph_communities_tenant ON master_data.mdm_graph_communities (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_semantic_search_indexes_tenant ON master_data.mdm_semantic_search_indexes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_search_history_tenant ON master_data.mdm_search_history (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_tags_tenant ON master_data.mdm_tags (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_tag_rules_tenant ON master_data.mdm_tag_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_tagged_entities_tenant ON master_data.mdm_tagged_entities (tenant_id);

-- RLS（8 表统一）
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'master_data.mdm_graph_nodes',
        'master_data.mdm_graph_edges',
        'master_data.mdm_graph_communities',
        'master_data.mdm_semantic_search_indexes',
        'master_data.mdm_search_history',
        'master_data.mdm_tags',
        'master_data.mdm_tag_rules',
        'master_data.mdm_tagged_entities'
    ] LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', split_part(t, '.', 1), split_part(t, '.', 2));
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', split_part(t, '.', 1), split_part(t, '.', 2));
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I.%I', split_part(t, '.', 1), split_part(t, '.', 2));
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I.%I
             USING (current_setting(''app.tenant_id'', true) IS NULL
                    OR current_setting(''app.tenant_id'', true) = ''''
                    OR current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000''
                    OR tenant_id::text = current_setting(''app.tenant_id'', true))
             WITH CHECK (current_setting(''app.tenant_id'', true) IS NULL
                    OR current_setting(''app.tenant_id'', true) = ''''
                    OR current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000''
                    OR tenant_id::text = current_setting(''app.tenant_id'', true))',
            split_part(t, '.', 1), split_part(t, '.', 2)
        );
    END LOOP;
END $$;

-- 回填（从 mdm_collections 快照；数组实体 JOIN LATERAL jsonb_array_elements）
INSERT INTO master_data.mdm_graph_nodes (id, label, node_type, properties, embeddings, degree, community_id)
SELECT elem->>'id', COALESCE(elem->>'label', ''), COALESCE(elem->>'node_type', ''),
       COALESCE(elem->'properties', '{}'::jsonb), COALESCE(elem->'embeddings', '[]'::jsonb),
       COALESCE((elem->>'degree')::bigint, 0), elem->>'community_id'
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'graph_nodes'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_graph_edges (source_id, target_id, relation_type, weight, confidence)
SELECT elem->>'source_id', COALESCE(elem->>'target_id', ''), COALESCE(elem->>'relation_type', 'related'),
       COALESCE((elem->>'weight')::double precision, 1.0), COALESCE((elem->>'confidence')::double precision, 1.0)
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'graph_edges'
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;

INSERT INTO master_data.mdm_graph_communities (id, name, node_ids, algorithm, modularity)
SELECT elem->>'id', COALESCE(elem->>'name', ''), COALESCE(elem->'node_ids', '[]'::jsonb),
       COALESCE(elem->>'algorithm', 'label_propagation'), COALESCE((elem->>'modularity')::double precision, 0.0)
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'graph_communities'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_semantic_search_indexes (id, entity_type, entity_id, embeddings, text, metadata)
SELECT elem->>'id', COALESCE(elem->>'entity_type', ''), COALESCE(elem->>'entity_id', ''),
       COALESCE(elem->'embeddings', '[]'::jsonb), COALESCE(elem->>'text', ''), COALESCE(elem->'metadata', '{}'::jsonb)
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'search_indexes'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_search_history (id, query, results_count, created_at)
SELECT elem->>'id', COALESCE(elem->>'query', ''), COALESCE((elem->>'results_count')::bigint, 0), COALESCE(elem->>'created_at', '')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'search_history'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_tags (id, name, category, color, description, usage_count)
SELECT elem->>'id', COALESCE(elem->>'name', ''), COALESCE(elem->>'category', ''),
       COALESCE(elem->>'color', ''), COALESCE(elem->>'description', ''),
       COALESCE((elem->>'usage_count')::bigint, 0)
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'tagger_tags'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_tag_rules (id, tag_id, condition, auto_apply, priority)
SELECT elem->>'id', COALESCE(elem->>'tag_id', ''), COALESCE(elem->'condition', '{}'::jsonb),
       COALESCE((elem->>'auto_apply')::boolean, false), COALESCE((elem->>'priority')::integer, 0)
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'tagger_rules'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_tagged_entities (entity_type, entity_id, tag_ids, confidence, applied_at)
SELECT elem->>'entity_type', COALESCE(elem->>'entity_id', ''), COALESCE(elem->'tag_ids', '[]'::jsonb),
       COALESCE((elem->>'confidence')::double precision, 1.0), COALESCE(elem->>'applied_at', '')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'semantic_v57' AND c.entity = 'tagger_tagged_entities'
ON CONFLICT (entity_type, entity_id) DO NOTHING;

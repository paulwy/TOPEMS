-- 2026-10-15 K1：MDM 冻结模块接真表（lineage_v52 首批）。
--
-- 背景：v52-v60 原为 LazyLock<Mutex<Vec<T>>> 内存 Store，经 persist 层整体快照为
--       master_data.mdm_collections（JSONB）。本迁移把 lineage_v52 的 8 个实体集合
--       建为关系型真表，对齐 20261014000060 K1 核心表样板：
--         * master_data schema；
--         * tenant_id 列 + RLS FORCE + nil/空/全零豁免（GUC 未设置时放行，语义对齐 shared-db）；
--         * 幂等 IF NOT EXISTS / DROP POLICY IF EXISTS；
--         * 回填走 mdm_collections JSONB，ON CONFLICT DO NOTHING。
--       嵌套复杂实体（图谱 nodes/edges、影响分析/模拟全量）以 JSONB 列承载，与
--       快照语义一致；简单标量实体列化。
-- 其余冻结模块（knowledge_v53 / disaster_v56 / semantic_v57 / governance_v58 /
--   ai_governance_v59）随其后分批接真表，见 TODO.md K1 backlog。

CREATE SCHEMA IF NOT EXISTS master_data;

-- ---------- lineage_v52：数据血缘 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_lineage_nodes (
    id            TEXT PRIMARY KEY,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT,
    created_at    TEXT NOT NULL DEFAULT '',
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_lineage_nodes_entity_idx
    ON master_data.mdm_lineage_nodes (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS master_data.mdm_lineage_edges (
    id                        TEXT PRIMARY KEY,
    from_node_id              TEXT NOT NULL,
    to_node_id                TEXT NOT NULL,
    edge_type                 TEXT NOT NULL DEFAULT 'derives_from',
    transformation_description TEXT,
    tenant_id                 UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_lineage_edges_from_idx
    ON master_data.mdm_lineage_edges (from_node_id);
CREATE INDEX IF NOT EXISTS mdm_lineage_edges_to_idx
    ON master_data.mdm_lineage_edges (to_node_id);

CREATE TABLE IF NOT EXISTS master_data.mdm_lineage_graphs (
    id            TEXT PRIMARY KEY,
    nodes         JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges         JSONB NOT NULL DEFAULT '[]'::jsonb,
    version       BIGINT NOT NULL DEFAULT 0,
    last_updated  TEXT NOT NULL DEFAULT '',
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- lineage_v52：影响分析 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_impact_analyses (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    analyzed_at TEXT NOT NULL DEFAULT '',
    tenant_id  UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_impact_analyses_time_idx
    ON master_data.mdm_impact_analyses (analyzed_at);

CREATE TABLE IF NOT EXISTS master_data.mdm_impact_simulations (
    id        TEXT PRIMARY KEY,
    data      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TEXT NOT NULL DEFAULT '',
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- lineage_v52：变更传播 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_change_events (
    id           TEXT PRIMARY KEY,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    change_type  TEXT NOT NULL DEFAULT 'create',
    old_value    JSONB,
    new_value    JSONB,
    triggered_at TEXT NOT NULL DEFAULT '',
    tenant_id    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_change_events_entity_idx
    ON master_data.mdm_change_events (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS master_data.mdm_propagation_rules (
    id                 TEXT PRIMARY KEY,
    source_entity_type TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    condition          TEXT NOT NULL DEFAULT '',
    action             TEXT NOT NULL DEFAULT 'cascade_update',
    tenant_id          UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_propagation_rules_src_idx
    ON master_data.mdm_propagation_rules (source_entity_type);

CREATE TABLE IF NOT EXISTS master_data.mdm_propagation_logs (
    id               TEXT PRIMARY KEY,
    change_event_id  TEXT NOT NULL,
    rule_id          TEXT NOT NULL,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    action           TEXT NOT NULL DEFAULT 'cascade_update',
    status           TEXT NOT NULL DEFAULT 'propagated',
    propagated_at    TEXT NOT NULL DEFAULT '',
    rollback_id      TEXT,
    tenant_id        UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_propagation_logs_event_idx
    ON master_data.mdm_propagation_logs (change_event_id);

-- ---------- RLS：8 表统一开启 + FORCE + tenant 策略（nil/空豁免，对齐 20261014000060） ----------
DO $$
DECLARE
    t text;
    tenant_col text;
BEGIN
    FOR t, tenant_col IN
        SELECT * FROM (VALUES
            ('master_data.mdm_lineage_nodes', 'tenant_id'),
            ('master_data.mdm_lineage_edges', 'tenant_id'),
            ('master_data.mdm_lineage_graphs', 'tenant_id'),
            ('master_data.mdm_impact_analyses', 'tenant_id'),
            ('master_data.mdm_impact_simulations', 'tenant_id'),
            ('master_data.mdm_change_events', 'tenant_id'),
            ('master_data.mdm_propagation_rules', 'tenant_id'),
            ('master_data.mdm_propagation_logs', 'tenant_id')
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

-- ---------- 回填：从 mdm_collections JSONB 快照抽取（ON CONFLICT DO NOTHING） ----------
INSERT INTO master_data.mdm_lineage_nodes (id, entity_type, entity_id, name, description, created_at)
SELECT e->>'id', e->>'entity_type', e->>'entity_id', COALESCE(e->>'name', ''),
       NULLIF(e->>'description', ''), COALESCE(e->>'created_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'lineage_nodes'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_lineage_edges
    (id, from_node_id, to_node_id, edge_type, transformation_description)
SELECT e->>'id', e->>'from_node_id', e->>'to_node_id',
       COALESCE(e->>'edge_type', 'derives_from'), NULLIF(e->>'transformation_description', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'lineage_edges'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_lineage_graphs (id, nodes, edges, version, last_updated)
SELECT COALESCE(e->>'id', 'default'),
       COALESCE((e->'nodes')::jsonb, '[]'::jsonb),
       COALESCE((e->'edges')::jsonb, '[]'::jsonb),
       COALESCE((e->>'version')::bigint, 0),
       COALESCE(e->>'last_updated', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'lineage_graphs'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_impact_analyses (id, data, analyzed_at)
SELECT e->>'id', e, COALESCE(e->>'analyzed_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'impact_analyses'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_impact_simulations (id, data, created_at)
SELECT e->>'id', e, COALESCE(e->>'simulation_timestamp', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'impact_simulations'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_change_events
    (id, entity_type, entity_id, change_type, old_value, new_value, triggered_at)
SELECT e->>'id', COALESCE(e->>'entity_type', ''), COALESCE(e->>'entity_id', ''),
       COALESCE(e->>'change_type', 'create'),
       NULLIF((e->'old_value')::text, 'null')::jsonb,
       NULLIF((e->'new_value')::text, 'null')::jsonb,
       COALESCE(e->>'triggered_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'change_events'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_propagation_rules
    (id, source_entity_type, target_entity_type, condition, action)
SELECT e->>'id', COALESCE(e->>'source_entity_type', ''), COALESCE(e->>'target_entity_type', ''),
       COALESCE(e->>'condition', ''), COALESCE(e->>'action', 'cascade_update')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'propagation_rules'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_propagation_logs
    (id, change_event_id, rule_id, source_entity_id, target_entity_id, action, status, propagated_at, rollback_id)
SELECT e->>'id', COALESCE(e->>'change_event_id', ''), COALESCE(e->>'rule_id', ''),
       COALESCE(e->>'source_entity_id', ''), COALESCE(e->>'target_entity_id', ''),
       COALESCE(e->>'action', 'cascade_update'), COALESCE(e->>'status', 'propagated'),
       COALESCE(e->>'propagated_at', ''), NULLIF(e->>'rollback_id', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'lineage_v52' AND c.entity = 'propagation_logs'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

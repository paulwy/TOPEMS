-- 2026-10-15 K1 续：quality_v51 剩余实体接真表（质量检查/循环配置/自动修复/策略/治理建议/洞察）。
--
-- 背景：v51 为「A 试点」——quality_rules 已由迁移 20261014000010 建关系表并真表 CRUD；
--       其余 6 实体（quality_checks / quality_loop_configs / auto_fix_actions /
--       fix_strategies / governance_suggestions / governance_insights）仍走内存 Store +
--       persist 快照（mdm_collections module='quality_v51'）。本迁移补齐 6 表 + 回填。
-- 风格对齐：master_data schema；tenant_id + RLS FORCE + nil/空/全零豁免；
--           IF NOT EXISTS / DROP POLICY IF EXISTS 幂等；回填 ON CONFLICT DO NOTHING。

CREATE SCHEMA IF NOT EXISTS master_data;

-- ---------- quality_v51：质量检查记录 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_quality_checks (
    id          TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id   TEXT NOT NULL DEFAULT '',
    rule_id     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'passed',
    score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    details     JSONB,
    checked_at  TEXT NOT NULL DEFAULT '',
    tenant_id   UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_quality_checks_entity_idx
    ON master_data.mdm_quality_checks (entity_type, entity_id);

-- ---------- quality_v51：质量循环配置（entity_type 为业务主键） ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_quality_loop_configs (
    entity_type          TEXT PRIMARY KEY,
    enabled_rules        JSONB NOT NULL DEFAULT '[]'::jsonb,
    auto_fix_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    notification_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_retries          INTEGER NOT NULL DEFAULT 3,
    tenant_id            UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- quality_v51：自动修复动作 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_auto_fix_actions (
    id           TEXT PRIMARY KEY,
    rule_id      TEXT NOT NULL DEFAULT '',
    entity_type  TEXT NOT NULL DEFAULT '',
    entity_id    TEXT NOT NULL DEFAULT '',
    action_type  TEXT NOT NULL DEFAULT 'normalize',
    before_value JSONB,
    after_value  JSONB,
    confidence   DOUBLE PRECISION NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'pending',
    applied_at   TEXT,
    tenant_id    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_auto_fix_entity_idx
    ON master_data.mdm_auto_fix_actions (entity_type, entity_id);

-- ---------- quality_v51：修复策略（枚举表） ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_fix_strategies (
    key      TEXT PRIMARY KEY,
    label    TEXT NOT NULL DEFAULT '',
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- quality_v51：数据治理 AI 建议 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_governance_suggestions (
    id                TEXT PRIMARY KEY,
    entity_type       TEXT NOT NULL DEFAULT '',
    entity_id         TEXT NOT NULL DEFAULT '',
    suggestion_type   TEXT NOT NULL DEFAULT 'standardize',
    confidence        DOUBLE PRECISION NOT NULL DEFAULT 0,
    rationale         TEXT NOT NULL DEFAULT '',
    suggested_action  TEXT NOT NULL DEFAULT '',
    ai_model_version  TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'pending',
    created_at        TEXT NOT NULL DEFAULT '',
    tenant_id         UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_gov_sugg_entity_idx
    ON master_data.mdm_governance_suggestions (entity_type, entity_id);

-- ---------- quality_v51：治理洞察（insight_type 为业务主键） ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_governance_insights (
    insight_type     TEXT PRIMARY KEY,
    severity         TEXT NOT NULL DEFAULT 'info',
    affected_records BIGINT NOT NULL DEFAULT 0,
    trend_analysis   TEXT NOT NULL DEFAULT '',
    recommendations  JSONB NOT NULL DEFAULT '[]'::jsonb,
    tenant_id        UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- RLS ----------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'mdm_quality_checks',
        'mdm_quality_loop_configs',
        'mdm_auto_fix_actions',
        'mdm_fix_strategies',
        'mdm_governance_suggestions',
        'mdm_governance_insights'
    ]
    LOOP
        EXECUTE format('ALTER TABLE master_data.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE master_data.%I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON master_data.%I', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON master_data.%I
             USING (tenant_id IS NULL OR tenant_id::text = '''' OR tenant_id = ''00000000-0000-0000-0000-000000000001''::uuid
                    OR tenant_id::text = current_setting(''app.tenant_id'', true))
             WITH CHECK (tenant_id IS NULL OR tenant_id::text = '''' OR tenant_id = ''00000000-0000-0000-0000-000000000001''::uuid
                    OR tenant_id::text = current_setting(''app.tenant_id'', true))',
            t);
    END LOOP;
END $$;

-- ---------- 回填（mdm_collections JSONB 快照，module='quality_v51'） ----------
INSERT INTO master_data.mdm_quality_checks (id, entity_type, entity_id, rule_id, status, score, details, checked_at)
SELECT elem->>'id', COALESCE(elem->>'entity_type', ''), COALESCE(elem->>'entity_id', ''),
       COALESCE(elem->>'rule_id', ''), COALESCE(elem->>'status', 'passed'),
       COALESCE((elem->>'score')::double precision, 0), elem->'details',
       COALESCE(elem->>'checked_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'quality_v51' AND c.entity = 'quality_checks'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_quality_loop_configs (entity_type, enabled_rules, auto_fix_enabled, notification_channels, max_retries)
SELECT elem->>'entity_type',
       COALESCE(elem->'enabled_rules', '[]'::jsonb),
       COALESCE((elem->>'auto_fix_enabled')::boolean, FALSE),
       COALESCE(elem->'notification_channels', '[]'::jsonb),
       COALESCE((elem->>'max_retries')::integer, 3)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'quality_v51' AND c.entity = 'quality_loop_configs'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (entity_type) DO NOTHING;

INSERT INTO master_data.mdm_auto_fix_actions (id, rule_id, entity_type, entity_id, action_type, before_value, after_value, confidence, status, applied_at)
SELECT elem->>'id', COALESCE(elem->>'rule_id', ''), COALESCE(elem->>'entity_type', ''),
       COALESCE(elem->>'entity_id', ''), COALESCE(elem->>'action_type', 'normalize'),
       elem->'before_value', elem->'after_value',
       COALESCE((elem->>'confidence')::double precision, 0),
       COALESCE(elem->>'status', 'pending'), elem->>'applied_at'
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'quality_v51' AND c.entity = 'auto_fix_actions'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_fix_strategies (key, label)
SELECT elem #>> '{}' AS key, elem #>> '{}' AS label
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'quality_v51' AND c.entity = 'fix_strategies'
  AND jsonb_typeof(c.data) = 'array'
  AND jsonb_typeof(elem) = 'string'
ON CONFLICT (key) DO NOTHING;

INSERT INTO master_data.mdm_governance_suggestions (id, entity_type, entity_id, suggestion_type, confidence, rationale, suggested_action, ai_model_version, status, created_at)
SELECT elem->>'id', COALESCE(elem->>'entity_type', ''), COALESCE(elem->>'entity_id', ''),
       COALESCE(elem->>'suggestion_type', 'standardize'),
       COALESCE((elem->>'confidence')::double precision, 0),
       COALESCE(elem->>'rationale', ''), COALESCE(elem->>'suggested_action', ''),
       COALESCE(elem->>'ai_model_version', ''), COALESCE(elem->>'status', 'pending'),
       COALESCE(elem->>'created_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'quality_v51' AND c.entity = 'governance_suggestions'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_governance_insights (insight_type, severity, affected_records, trend_analysis, recommendations)
SELECT COALESCE(elem->>'insight_type', elem->>'id'), COALESCE(elem->>'severity', 'info'),
       COALESCE((elem->>'affected_records')::bigint, 0),
       COALESCE(elem->>'trend_analysis', ''),
       COALESCE(elem->'recommendations', '[]'::jsonb)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'quality_v51' AND c.entity = 'governance_insights'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (insight_type) DO NOTHING;

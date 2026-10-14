-- 4.1（MDM A 试点）：quality_rules 集合从通用 JSONB 快照表转为关系型真表。
--
-- 背景：master-data v51-v60 原为 LazyLock<Mutex<Vec<T>>> 内存 Store，B10 后 HTTP 写经
-- flush_on_write 中间件整体快照 upsert 到 master_data.mdm_collections（JSONB）。
-- 本迁移挑 quality_rules 单表做"内存集合 → 关系型 CRUD"试点，验证 sqlx 直查模板；
-- 其余 9 模块仍走 JSONB 快照，不做全量转换（触发条件见 TODO.md 4.1 backlog）。
--
-- 幂等：CREATE TABLE / INDEX IF NOT EXISTS；回填用 ON CONFLICT DO NOTHING。

CREATE SCHEMA IF NOT EXISTS master_data;

CREATE TABLE IF NOT EXISTS master_data.mdm_quality_rules (
    id          UUID        PRIMARY KEY,
    name        TEXT        NOT NULL,
    entity_type TEXT        NOT NULL,
    rule_type   TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    severity    TEXT        NOT NULL DEFAULT 'info',
    parameters  JSONB       NOT NULL DEFAULT '{}'::jsonb,
    enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mdm_quality_rules_entity_type_idx
    ON master_data.mdm_quality_rules (entity_type);

CREATE INDEX IF NOT EXISTS mdm_quality_rules_enabled_idx
    ON master_data.mdm_quality_rules (enabled)
    WHERE enabled = TRUE;

-- 回填：从通用快照表 master_data.mdm_collections（module='quality_v51',
-- entity='quality_rules'）抽出历史 JSONB 集合，逐行落关系表。
-- 仅回填 id 形如 UUID 的行（早期内存种子 id 如 'r-1' 非合法 UUID，跳过，避免 cast 失败）。
INSERT INTO master_data.mdm_quality_rules
    (id, name, entity_type, rule_type, description, severity, parameters, enabled, created_at, updated_at)
SELECT (e->>'id')::uuid,
       e->>'name',
       e->>'entity_type',
       e->>'rule_type',
       COALESCE(e->>'description', ''),
       COALESCE(e->>'severity', 'info'),
       COALESCE((e->'parameters')::jsonb, '{}'::jsonb),
       COALESCE((e->>'enabled')::boolean, TRUE),
       COALESCE((e->>'created_at')::timestamptz, now()),
       COALESCE((e->>'updated_at')::timestamptz, now())
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'quality_v51'
  AND c.entity = 'quality_rules'
  AND jsonb_typeof(c.data) = 'array'
  AND e->>'id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
ON CONFLICT (id) DO NOTHING;

-- K1 冻结模块接真表：governance_v58（迁移 20261015000065）
-- 9 表 + RLS（ENABLE+FORCE+tenant_isolation_policy）+ 快照回填（数组实体 JOIN LATERAL）
BEGIN;

-- ============ 1. 成熟度评估 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_maturity_assessments (
    id                TEXT PRIMARY KEY,
    dimension         TEXT NOT NULL,
    current_level     TEXT NOT NULL,
    target_level      TEXT NOT NULL,
    score             DOUBLE PRECISION NOT NULL DEFAULT 0,
    gaps              JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations   JSONB NOT NULL DEFAULT '[]'::jsonb,
    assessed_at       TEXT NOT NULL,
    tenant_id         UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdm_maturity_assessments_tenant ON master_data.mdm_maturity_assessments (tenant_id);

-- ============ 2. 成熟度历史 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_maturity_history (
    id            TEXT PRIMARY KEY,
    dimension     TEXT NOT NULL,
    score         DOUBLE PRECISION NOT NULL DEFAULT 0,
    level         TEXT NOT NULL,
    recorded_at   TEXT NOT NULL,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdm_maturity_history_tenant ON master_data.mdm_maturity_history (tenant_id);

-- ============ 3. 维度得分 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_dimension_scores (
    dimension      TEXT PRIMARY KEY,
    score          DOUBLE PRECISION NOT NULL,
    weight         DOUBLE PRECISION NOT NULL DEFAULT 0,
    maturity_level TEXT NOT NULL,
    evidence       JSONB NOT NULL DEFAULT '[]'::jsonb,
    tenant_id      UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdm_dimension_scores_tenant ON master_data.mdm_dimension_scores (tenant_id);

-- ============ 4. 改进计划 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_improvement_plans (
    id            TEXT PRIMARY KEY,
    dimension     TEXT NOT NULL,
    target_level  TEXT NOT NULL,
    actions       JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority      TEXT NOT NULL,
    due_date      TEXT,
    status        TEXT NOT NULL,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdm_improvement_plans_tenant ON master_data.mdm_improvement_plans (tenant_id);

-- ============ 5. 工作流 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_workflows (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    workflow_type TEXT NOT NULL,
    steps         JSONB NOT NULL DEFAULT '[]'::jsonb,
    triggers      JSONB NOT NULL DEFAULT '{}'::jsonb,
    status        TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'
);
CREATE INDEX IF NOT EXISTS idx_mdm_workflows_tenant ON master_data.mdm_workflows (tenant_id);

-- ============ 6. 工作流模板 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_workflow_templates (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL,
    workflow_type TEXT NOT NULL,
    steps         JSONB NOT NULL DEFAULT '[]'::jsonb,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdm_workflow_templates_tenant ON master_data.mdm_workflow_templates (tenant_id);

-- ============ 7. 工作流历史 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_workflow_history (
    id           TEXT PRIMARY KEY,
    workflow_id  TEXT NOT NULL,
    action       TEXT NOT NULL,
    step_id      TEXT,
    actor        TEXT NOT NULL,
    comment      TEXT,
    recorded_at  TEXT NOT NULL,
    tenant_id    UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdm_workflow_history_tenant ON master_data.mdm_workflow_history (tenant_id);

-- ============ 8. 数据产品 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_data_products (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    owner         TEXT NOT NULL,
    domain        TEXT NOT NULL,
    consumers     JSONB NOT NULL DEFAULT '[]'::jsonb,
    data_contract JSONB,
    sla_level     TEXT NOT NULL,
    status        TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'
);
CREATE INDEX IF NOT EXISTS idx_mdm_data_products_tenant ON master_data.mdm_data_products (tenant_id);

-- ============ 9. 数据契约 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_data_contracts (
    product_id            TEXT PRIMARY KEY,
    schema                JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_requirements  JSONB NOT NULL DEFAULT '[]'::jsonb,
    freshness_sla         TEXT NOT NULL,
    security_level        TEXT NOT NULL,
    version               TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    tenant_id             UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdm_data_contracts_tenant ON master_data.mdm_data_contracts (tenant_id);

-- ============ 10. API 暴露 ============
CREATE TABLE IF NOT EXISTS master_data.mdm_api_exposures (
    id            TEXT PRIMARY KEY,
    product_id    TEXT NOT NULL,
    endpoint      TEXT NOT NULL,
    auth_type     TEXT NOT NULL,
    rate_limit    TEXT NOT NULL,
    enabled       BOOLEAN NOT NULL DEFAULT true,
    created_at    TEXT NOT NULL,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'
);
CREATE INDEX IF NOT EXISTS idx_mdm_api_exposures_tenant ON master_data.mdm_api_exposures (tenant_id);

-- ============ RLS（全部表） ============
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'mdm_maturity_assessments','mdm_maturity_history','mdm_dimension_scores','mdm_improvement_plans',
        'mdm_workflows','mdm_workflow_templates','mdm_workflow_history',
        'mdm_data_products','mdm_data_contracts','mdm_api_exposures'
    ]
    LOOP
        EXECUTE format('ALTER TABLE master_data.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE master_data.%I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON master_data.%I', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON master_data.%I
               USING (current_setting(''app.tenant_id'', true) IS NULL
                      OR current_setting(''app.tenant_id'', true) = ''''
                      OR current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000''
                      OR tenant_id IS NULL
                      OR tenant_id::text = current_setting(''app.tenant_id'', true))
               WITH CHECK (current_setting(''app.tenant_id'', true) IS NULL
                      OR current_setting(''app.tenant_id'', true) = ''''
                      OR current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000''
                      OR tenant_id IS NULL
                      OR tenant_id::text = current_setting(''app.tenant_id'', true))',
            t
        );
    END LOOP;
END $$;

-- ============ 快照回填（数组实体 JOIN LATERAL） ============
INSERT INTO master_data.mdm_dimension_scores (dimension, score, weight, maturity_level, evidence)
SELECT elem->>'dimension', (elem->>'score')::double precision,
       (elem->>'weight')::double precision, elem->>'maturity_level', elem->'evidence'
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'governance_v58' AND c.entity = 'dimension_scores'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (dimension) DO NOTHING;

INSERT INTO master_data.mdm_workflow_templates (id, name, description, workflow_type, steps)
SELECT elem->>'id', elem->>'name', elem->>'description', elem->>'workflow_type', elem->'steps'
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'governance_v58' AND c.entity = 'workflow_templates'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_data_products
    (id, name, description, owner, domain, consumers, data_contract, sla_level, status, created_at, updated_at)
SELECT elem->>'id', elem->>'name', elem->>'description', elem->>'owner', elem->>'domain',
       elem->'consumers', elem->'data_contract', elem->>'sla_level', elem->>'status',
       elem->>'created_at', elem->>'updated_at'
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'governance_v58' AND c.entity = 'data_products'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- K1: ai_governance_v59 接真表（master_data schema）
-- V59.0 MDM AC-31: 数据治理 AI + 智能匹配 + 自动分类
-- 权威库: live DB (127.0.0.1:5432 topems)
-- 样板: e25296c39 / 61-65 迁移；全部 IF NOT EXISTS 幂等；RLS FORCE + DROP POLICY 重建

CREATE SCHEMA IF NOT EXISTS master_data;

-- ==================== 1. 数据治理 AI：治理建议 ====================
CREATE TABLE IF NOT EXISTS master_data.mdm_ai_suggestions (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mdm_ai_suggestions_entity
    ON master_data.mdm_ai_suggestions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_mdm_ai_suggestions_tenant
    ON master_data.mdm_ai_suggestions (tenant_id);

-- ==================== 2. 数据治理 AI：模型 ====================
CREATE TABLE IF NOT EXISTS master_data.mdm_ai_models (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    domain TEXT NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL,
    last_trained TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_mdm_ai_models_tenant
    ON master_data.mdm_ai_models (tenant_id);

-- ==================== 3. 智能匹配：规则 ====================
CREATE TABLE IF NOT EXISTS master_data.mdm_match_rules (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    field_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    threshold DOUBLE PRECISION NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_mdm_match_rules_tenant
    ON master_data.mdm_match_rules (tenant_id);

-- ==================== 4. 智能匹配：结果 ====================
CREATE TABLE IF NOT EXISTS master_data.mdm_match_results (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    match_score DOUBLE PRECISION NOT NULL,
    match_type TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL,
    matched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mdm_match_results_tenant
    ON master_data.mdm_match_results (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_match_results_pair
    ON master_data.mdm_match_results (source_id, target_id);

-- ==================== 5. 自动分类：模型 ====================
CREATE TABLE IF NOT EXISTS master_data.mdm_classification_models (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    algorithm TEXT NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mdm_classification_models_tenant
    ON master_data.mdm_classification_models (tenant_id);

-- ==================== 6. 自动分类：结果 ====================
CREATE TABLE IF NOT EXISTS master_data.mdm_classification_results (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    entity_id TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
    classified_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mdm_classification_results_tenant
    ON master_data.mdm_classification_results (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_classification_results_entity
    ON master_data.mdm_classification_results (entity_id);

-- ==================== 7. 自动分类：规则（单行 JSONB 整存） ====================
CREATE TABLE IF NOT EXISTS master_data.mdm_classifier_rules (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    rules JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_mdm_classifier_rules_tenant
    ON master_data.mdm_classifier_rules (tenant_id);

-- ==================== RLS：行级隔离（放行 NULL/''/全零或匹配 tenant_id） ====================
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'mdm_ai_suggestions', 'mdm_ai_models', 'mdm_match_rules',
        'mdm_match_results', 'mdm_classification_models',
        'mdm_classification_results', 'mdm_classifier_rules'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE master_data.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE master_data.%I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON master_data.%I', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON master_data.%I
                USING (tenant_id IS NULL OR tenant_id = '''' OR tenant_id = ''00000000-0000-0000-0000-000000000001'' OR tenant_id = current_setting(''app.tenant_id'')::uuid)
                WITH CHECK (tenant_id IS NULL OR tenant_id = '''' OR tenant_id = ''00000000-0000-0000-0000-000000000001'' OR tenant_id = current_setting(''app.tenant_id'')::uuid)',
            t);
    END LOOP;
END $$;

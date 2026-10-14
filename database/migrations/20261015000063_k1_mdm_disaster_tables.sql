-- K1: disaster_v56 接真表（8 表 + RLS + 回填）
-- 样板对齐：commit e25296c39（K1 核心 3 模块）/ 20261015000062（knowledge）
-- 全程 IF NOT EXISTS；RLS 放行 current_setting('app.tenant_id',true) NULL/''/全零 或匹配列值。

CREATE SCHEMA IF NOT EXISTS master_data;

-- 1. 恢复点
CREATE TABLE IF NOT EXISTS master_data.mdm_recovery_points (
    id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    snapshot_type TEXT NOT NULL DEFAULT 'full',
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    checksum TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT '',
    size_bytes BIGINT NOT NULL DEFAULT 0
);

-- 2. 恢复计划
CREATE TABLE IF NOT EXISTS master_data.mdm_recovery_plans (
    id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    name TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'critical',
    rto_minutes BIGINT NOT NULL DEFAULT 0,
    rpo_minutes BIGINT NOT NULL DEFAULT 0,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft'
);

-- 3. 业务连续性计划
CREATE TABLE IF NOT EXISTS master_data.mdm_continuity_plans (
    id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT '',
    critical_functions JSONB NOT NULL DEFAULT '[]'::jsonb,
    recovery_strategy TEXT NOT NULL DEFAULT 'hot_standby',
    test_frequency TEXT NOT NULL DEFAULT '',
    last_tested TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
);

-- 4. 关键功能
CREATE TABLE IF NOT EXISTS master_data.mdm_critical_functions (
    id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_downtime_minutes BIGINT NOT NULL DEFAULT 0,
    recovery_procedure TEXT NOT NULL DEFAULT ''
);

-- 5. BC 演练
CREATE TABLE IF NOT EXISTS master_data.mdm_bc_tests (
    id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    plan_id TEXT NOT NULL,
    tested_at TEXT NOT NULL DEFAULT '',
    result TEXT NOT NULL DEFAULT '',
    duration_minutes BIGINT NOT NULL DEFAULT 0,
    issues_found JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 6. 地域配置
CREATE TABLE IF NOT EXISTS master_data.mdm_region_configs (
    region_id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    primary_flag BOOLEAN NOT NULL DEFAULT false,
    endpoint TEXT NOT NULL DEFAULT '',
    latency_ms BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'online'
);

-- 7. 复制配置
CREATE TABLE IF NOT EXISTS master_data.mdm_replication_configs (
    id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    source_region TEXT NOT NULL,
    target_region TEXT NOT NULL,
    replication_mode TEXT NOT NULL DEFAULT 'asynchronous',
    lag_max_ms BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'stopped'
);

-- 8. 故障切换记录
CREATE TABLE IF NOT EXISTS master_data.mdm_failover_records (
    id TEXT PRIMARY KEY,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
    from_region TEXT NOT NULL,
    to_region TEXT NOT NULL,
    trigger TEXT NOT NULL DEFAULT 'manual',
    started_at TEXT NOT NULL DEFAULT '',
    completed_at TEXT,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'initiated'
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_mdm_recovery_points_tenant ON master_data.mdm_recovery_points (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_recovery_plans_tenant ON master_data.mdm_recovery_plans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_continuity_plans_tenant ON master_data.mdm_continuity_plans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_critical_functions_tenant ON master_data.mdm_critical_functions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_bc_tests_tenant ON master_data.mdm_bc_tests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_region_configs_tenant ON master_data.mdm_region_configs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_replication_configs_tenant ON master_data.mdm_replication_configs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mdm_failover_records_tenant ON master_data.mdm_failover_records (tenant_id);

-- RLS（8 表统一）
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'master_data.mdm_recovery_points',
        'master_data.mdm_recovery_plans',
        'master_data.mdm_continuity_plans',
        'master_data.mdm_critical_functions',
        'master_data.mdm_bc_tests',
        'master_data.mdm_region_configs',
        'master_data.mdm_replication_configs',
        'master_data.mdm_failover_records'
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

-- 回填（从 mdm_collections 快照）
INSERT INTO master_data.mdm_recovery_points (id, snapshot_type, entity_type, entity_id, data, checksum, created_at, size_bytes)
SELECT elem->>'id', COALESCE(elem->>'snapshot_type', 'full'), elem->>'entity_type', elem->>'entity_id',
       COALESCE(elem->'data', '{}'::jsonb), COALESCE(elem->>'checksum', ''), COALESCE(elem->>'created_at', ''),
       COALESCE((elem->>'size_bytes')::bigint, 0)
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'recovery_points'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_recovery_plans (id, name, priority, rto_minutes, rpo_minutes, steps, status)
SELECT elem->>'id', COALESCE(elem->>'name', ''), COALESCE(elem->>'priority', 'critical'),
       COALESCE((elem->>'rto_minutes')::bigint, 0), COALESCE((elem->>'rpo_minutes')::bigint, 0),
       COALESCE(elem->'steps', '[]'::jsonb), COALESCE(elem->>'status', 'draft')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'recovery_plans'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_continuity_plans (id, name, scope, critical_functions, recovery_strategy, test_frequency, last_tested, status)
SELECT elem->>'id', COALESCE(elem->>'name', ''), COALESCE(elem->>'scope', ''),
       COALESCE(elem->'critical_functions', '[]'::jsonb), COALESCE(elem->>'recovery_strategy', 'hot_standby'),
       COALESCE(elem->>'test_frequency', ''), elem->>'last_tested', COALESCE(elem->>'status', 'draft')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'continuity_plans'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_critical_functions (id, name, description, dependencies, max_downtime_minutes, recovery_procedure)
SELECT elem->>'id', COALESCE(elem->>'name', ''), COALESCE(elem->>'description', ''),
       COALESCE(elem->'dependencies', '[]'::jsonb), COALESCE((elem->>'max_downtime_minutes')::bigint, 0),
       COALESCE(elem->>'recovery_procedure', '')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'critical_functions'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_bc_tests (id, plan_id, tested_at, result, duration_minutes, issues_found)
SELECT elem->>'id', COALESCE(elem->>'plan_id', ''), COALESCE(elem->>'tested_at', ''),
       COALESCE(elem->>'result', ''), COALESCE((elem->>'duration_minutes')::bigint, 0),
       COALESCE(elem->'issues_found', '[]'::jsonb)
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'bc_tests'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_region_configs (region_id, primary_flag, endpoint, latency_ms, status)
SELECT elem->>'region_id', COALESCE((elem->>'primary')::boolean, false), COALESCE(elem->>'endpoint', ''),
       COALESCE((elem->>'latency_ms')::bigint, 0), COALESCE(elem->>'status', 'online')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'region_configs'
ON CONFLICT (region_id) DO NOTHING;

INSERT INTO master_data.mdm_replication_configs (id, source_region, target_region, replication_mode, lag_max_ms, status)
SELECT elem->>'id', COALESCE(elem->>'source_region', ''), COALESCE(elem->>'target_region', ''),
       COALESCE(elem->>'replication_mode', 'asynchronous'), COALESCE((elem->>'lag_max_ms')::bigint, 0),
       COALESCE(elem->>'status', 'stopped')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'replication_configs'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_failover_records (id, from_region, to_region, trigger, started_at, completed_at, reason, status)
SELECT elem->>'id', COALESCE(elem->>'from_region', ''), COALESCE(elem->>'to_region', ''),
       COALESCE(elem->>'trigger', 'manual'), COALESCE(elem->>'started_at', ''), elem->>'completed_at',
       COALESCE(elem->>'reason', ''), COALESCE(elem->>'status', 'initiated')
FROM master_data.mdm_collections c
JOIN LATERAL jsonb_array_elements(c.data) AS elem ON jsonb_typeof(c.data) = 'array'
WHERE c.module = 'disaster_v56' AND c.entity = 'failover_records'
ON CONFLICT (id) DO NOTHING;

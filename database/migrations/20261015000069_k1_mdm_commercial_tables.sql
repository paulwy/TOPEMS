-- 2026-10-15 K1 续：commercial_v55 剩余实体接真表（计量/计费/费率/SLA）。
--
-- 背景：迁移 20261014000060 只挑了 v55 的 api_products/subscriptions 两张表；
--       其余实体（usage_records / billing_records / rate_cards / sla_configs /
--       sla_measurements / sla_incidents）仍走内存 Store + persist 快照。
--       mdm_collections 无 v55 快照 → 本迁移建 6 表，无回填（空表起步，运行时写入）。
-- 风格对齐：master_data schema；tenant_id + RLS FORCE + nil/空/全零豁免；IF NOT EXISTS。

CREATE SCHEMA IF NOT EXISTS master_data;

-- ---------- commercial_v55：用量记录 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_usage_records (
    id                TEXT PRIMARY KEY,
    tenant_id         TEXT NOT NULL DEFAULT '',
    api_product_id    TEXT NOT NULL DEFAULT '',
    endpoint          TEXT NOT NULL DEFAULT '',
    requests          BIGINT NOT NULL DEFAULT 0,
    errors            BIGINT NOT NULL DEFAULT 0,
    data_transferred  DOUBLE PRECISION NOT NULL DEFAULT 0,
    recorded_at       TEXT NOT NULL DEFAULT '',
    tenant_uid        UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_usage_tenant_idx
    ON master_data.mdm_usage_records (tenant_id);

-- ---------- commercial_v55：计费记录 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_billing_records (
    id            TEXT PRIMARY KEY,
    tenant_id     TEXT NOT NULL DEFAULT '',
    period_start  TEXT NOT NULL DEFAULT '',
    period_end    TEXT NOT NULL DEFAULT '',
    tier          TEXT NOT NULL DEFAULT 'free',
    usage_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_amount  DOUBLE PRECISION NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending',
    tenant_uid    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_billing_tenant_idx
    ON master_data.mdm_billing_records (tenant_id);

-- ---------- commercial_v55：费率卡 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_rate_cards (
    id                  TEXT PRIMARY KEY,
    tier                TEXT NOT NULL DEFAULT 'free',
    cost_per_request    DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_per_mb         DOUBLE PRECISION NOT NULL DEFAULT 0,
    overage_multiplier  DOUBLE PRECISION NOT NULL DEFAULT 1,
    currency            TEXT NOT NULL DEFAULT 'CNY',
    tenant_uid          UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- commercial_v55：SLA 配置 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_sla_configs (
    id                 TEXT PRIMARY KEY,
    metric             TEXT NOT NULL DEFAULT 'availability',
    target_value       DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit               TEXT NOT NULL DEFAULT '',
    penalty_per_min    DOUBLE PRECISION NOT NULL DEFAULT 0,
    measurement_window BIGINT NOT NULL DEFAULT 30,
    tenant_uid         UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- commercial_v55：SLA 度量 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_sla_measurements (
    id            TEXT PRIMARY KEY,
    config_id     TEXT NOT NULL DEFAULT '',
    tenant_id     TEXT NOT NULL DEFAULT '',
    measured_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    target_value  DOUBLE PRECISION NOT NULL DEFAULT 0,
    met           BOOLEAN NOT NULL DEFAULT FALSE,
    measured_at   TEXT NOT NULL DEFAULT '',
    window_start  TEXT NOT NULL DEFAULT '',
    window_end    TEXT NOT NULL DEFAULT '',
    tenant_uid    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_sla_meas_config_idx
    ON master_data.mdm_sla_measurements (config_id);

-- ---------- commercial_v55：SLA 事件 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_sla_incidents (
    id                  TEXT PRIMARY KEY,
    config_id           TEXT NOT NULL DEFAULT '',
    tenant_id           TEXT NOT NULL DEFAULT '',
    incident_type       TEXT NOT NULL DEFAULT 'downtime',
    duration_min        BIGINT NOT NULL DEFAULT 0,
    impact_severity     TEXT NOT NULL DEFAULT 'medium',
    compensation_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'open',
    tenant_uid          UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_sla_incident_config_idx
    ON master_data.mdm_sla_incidents (config_id);

-- ---------- RLS ----------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'mdm_usage_records',
        'mdm_billing_records',
        'mdm_rate_cards',
        'mdm_sla_configs',
        'mdm_sla_measurements',
        'mdm_sla_incidents'
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

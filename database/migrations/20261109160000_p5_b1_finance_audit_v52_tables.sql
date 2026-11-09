-- P5 B1：finance 审计 v5.2 表落地
--
-- 依据：docs/quality/prod-column-drift-verified-2026-11-09.md（141 条真阳性）
--       docs/quality/prod-column-drift-workorder-2026-11-09.md §1.2
-- 类型来源：fixtures/full_schema_contract.sql（2026-10-15 整库 dump；
--           本地 topems 库 pg_catalog 42/42 一致，核验日 2026-11-09）
--
-- 生产现状：finance_alert_configs_v / _alert_history_v / _anomaly_alerts_v /
--           _audit_findings_v / _detection_configs_v（以及同形壳表 _audit_rules_v）
--           由 20260725000000_business_base_tables.sql 批量骨架生成，仅 id/deleted_at。
-- 代码现状：svc/finance/src/modules/audit_v52.rs 全程按 <name>_v52 读写（含
--           ON CONFLICT (tenant_id, detection_type)）。
--
-- 处置：不新建第五套表；仅当 <name>_v52 不存在且 <name>_v 存在时改名，随后补列。
--       契约库（fixture/本地）已存在 _v52，改名步骤为 no-op，补列为幂等空操作。
--
-- 幂等：RENAME 带 to_regclass 双重守卫；列/索引/策略全部 IF NOT EXISTS 语义。
-- 回滚（人工评估后执行，仅当反向表名不存在时）：
--   ALTER TABLE finance.finance_alert_configs_v52 RENAME TO finance_alert_configs_v;

DO $$
BEGIN
    IF to_regclass('finance.finance_alert_configs_v52') IS NULL
       AND to_regclass('finance.finance_alert_configs_v') IS NOT NULL THEN
        ALTER TABLE finance.finance_alert_configs_v RENAME TO finance_alert_configs_v52;
    END IF;
    IF to_regclass('finance.finance_alert_history_v52') IS NULL
       AND to_regclass('finance.finance_alert_history_v') IS NOT NULL THEN
        ALTER TABLE finance.finance_alert_history_v RENAME TO finance_alert_history_v52;
    END IF;
    IF to_regclass('finance.finance_anomaly_alerts_v52') IS NULL
       AND to_regclass('finance.finance_anomaly_alerts_v') IS NOT NULL THEN
        ALTER TABLE finance.finance_anomaly_alerts_v RENAME TO finance_anomaly_alerts_v52;
    END IF;
    IF to_regclass('finance.finance_audit_findings_v52') IS NULL
       AND to_regclass('finance.finance_audit_findings_v') IS NOT NULL THEN
        ALTER TABLE finance.finance_audit_findings_v RENAME TO finance_audit_findings_v52;
    END IF;
    IF to_regclass('finance.finance_detection_configs_v52') IS NULL
       AND to_regclass('finance.finance_detection_configs_v') IS NOT NULL THEN
        ALTER TABLE finance.finance_detection_configs_v RENAME TO finance_detection_configs_v52;
    END IF;
    IF to_regclass('finance.finance_audit_rules_v52') IS NULL
       AND to_regclass('finance.finance_audit_rules_v') IS NOT NULL THEN
        ALTER TABLE finance.finance_audit_rules_v RENAME TO finance_audit_rules_v52;
    END IF;
END $$;

-- ---------- 补列（类型/默认值与 2026-10-15 dump 一致） ----------

ALTER TABLE finance.finance_alert_configs_v52
    ADD COLUMN IF NOT EXISTS channel varchar,
    ADD COLUMN IF NOT EXISTS cooldown integer,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS recipients text,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS threshold numeric,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE finance.finance_alert_history_v52
    ADD COLUMN IF NOT EXISTS acknowledged_by varchar,
    ADD COLUMN IF NOT EXISTS alert_type varchar,
    ADD COLUMN IF NOT EXISTS channel varchar,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS entity_id uuid,
    ADD COLUMN IF NOT EXISTS is_acknowledged boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_delivered boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS message text,
    ADD COLUMN IF NOT EXISTS severity varchar,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE finance.finance_anomaly_alerts_v52
    ADD COLUMN IF NOT EXISTS confidence numeric,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS detection_type varchar,
    ADD COLUMN IF NOT EXISTS entity_id uuid,
    ADD COLUMN IF NOT EXISTS entity_type varchar,
    ADD COLUMN IF NOT EXISTS expected_range text,
    ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS metric_value numeric,
    ADD COLUMN IF NOT EXISTS severity varchar,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE finance.finance_audit_findings_v52
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS detected_at timestamptz,
    ADD COLUMN IF NOT EXISTS entity_id uuid,
    ADD COLUMN IF NOT EXISTS entity_type varchar,
    ADD COLUMN IF NOT EXISTS evidence text,
    ADD COLUMN IF NOT EXISTS finding_type varchar,
    ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
    ADD COLUMN IF NOT EXISTS resolved_by varchar,
    ADD COLUMN IF NOT EXISTS rule_id uuid,
    ADD COLUMN IF NOT EXISTS severity varchar,
    ADD COLUMN IF NOT EXISTS status varchar,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE finance.finance_detection_configs_v52
    ADD COLUMN IF NOT EXISTS detection_type varchar,
    ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS parameters text,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE finance.finance_audit_rules_v52
    ADD COLUMN IF NOT EXISTS category varchar,
    ADD COLUMN IF NOT EXISTS condition text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS created_by varchar,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS name varchar,
    ADD COLUMN IF NOT EXISTS schedule text,
    ADD COLUMN IF NOT EXISTS severity varchar,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 骨架壳表遗留的 tenant_id 默认租户必须去掉：默认值会让缺省写入静默落到错误租户，
-- 与 2026-10-15 契约（无默认）不一致。
ALTER TABLE finance.finance_alert_configs_v52 ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE finance.finance_alert_history_v52 ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE finance.finance_anomaly_alerts_v52 ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE finance.finance_audit_findings_v52 ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE finance.finance_detection_configs_v52 ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE finance.finance_audit_rules_v52 ALTER COLUMN tenant_id DROP DEFAULT;

-- ---------- 索引（ON CONFLICT 依赖） ----------

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_detection_configs_v52_tenant_type
    ON finance.finance_detection_configs_v52 (tenant_id, detection_type);

CREATE INDEX IF NOT EXISTS idx_finance_audit_findings_v52_tenant_status
    ON finance.finance_audit_findings_v52 (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_finance_anomaly_alerts_v52_tenant_type
    ON finance.finance_anomaly_alerts_v52 (tenant_id, detection_type);

-- ---------- RLS（沿用既有租户谓词形态，不新增分支） ----------

ALTER TABLE finance.finance_alert_configs_v52 ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_alert_configs_v52 FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_alert_history_v52 ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_alert_history_v52 FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_anomaly_alerts_v52 ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_anomaly_alerts_v52 FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_audit_findings_v52 ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_audit_findings_v52 FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_detection_configs_v52 ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_detection_configs_v52 FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_audit_rules_v52 ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_audit_rules_v52 FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    svc_role text;
BEGIN
    -- 改名后原策略名可能仍带 _v 后缀；只要表上已存在任意策略就不再新建。
    FOREACH t IN ARRAY ARRAY[
        'finance_alert_configs_v52',
        'finance_alert_history_v52',
        'finance_anomaly_alerts_v52',
        'finance_audit_findings_v52',
        'finance_detection_configs_v52',
        'finance_audit_rules_v52'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'finance' AND tablename = t
        ) THEN
            EXECUTE format(
                'CREATE POLICY tenant_isolation ON finance.%I '
                'USING ('
                ' current_setting(''app.tenant_id'', true) IS NULL'
                ' OR current_setting(''app.tenant_id'', true) = '''''
                ' OR current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000'''
                ' OR tenant_id IS NULL'
                ' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid'
                ') WITH CHECK ('
                ' current_setting(''app.tenant_id'', true) IS NULL'
                ' OR current_setting(''app.tenant_id'', true) = '''''
                ' OR current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000'''
                ' OR tenant_id IS NULL'
                ' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid'
                ')', t);
        END IF;
    END LOOP;

    -- owner 归一 + 服务角色授权（这是已经咬过两次的坑）
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P5 B1：未找到服务运行角色（topems_prod/topems_app），跳过 owner/GRANT';
        RETURN;
    END IF;

    FOREACH t IN ARRAY ARRAY[
        'finance_alert_configs_v52',
        'finance_alert_history_v52',
        'finance_anomaly_alerts_v52',
        'finance_audit_findings_v52',
        'finance_detection_configs_v52',
        'finance_audit_rules_v52'
    ] LOOP
        EXECUTE format('ALTER TABLE finance.%I OWNER TO %I', t, svc_role);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON finance.%I TO %I', t, svc_role);
        IF svc_role <> 'topems_app'
           AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON finance.%I TO topems_app', t);
        END IF;
    END LOOP;
END $$;

-- P5 B2：svc/finance 补列（7 表）+ B3 唯一索引 + 例外项 parameters → jsonb
--
-- 依据：docs/quality/prod-column-drift-verified-2026-11-09.md（141 条真阳性）
--       docs/quality/prod-column-drift-workorder-2026-11-09.md §M1
-- 类型来源：fixtures/full_schema_contract.sql（2026-10-15 整库 dump；
--           本地 topems 库 pg_catalog 42/42 一致，核验日 2026-11-09）
--
-- NOT NULL 口径（2026-11-09 裁决）：以 DDL 为准。本批 7 表的缺失列在 DDL 中
-- 全部可空，因此一律按可空落地，不加 DEFAULT 粉饰缺失，也不做整齐化收紧。
--
-- 例外（用户裁决 B，改库不改代码）：
--   finance.finance_prediction_models_v53.parameters 代码按结构化参数使用，
--   DDL 的 text 是历史遗留 → 本迁移将已存在的 text 列转为 jsonb；缺失时直接建 jsonb。
--
-- 幂等：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS；类型转换带
--       information_schema 守卫，重复执行为 no-op。
-- 回滚：
--   ALTER TABLE finance.finance_prediction_models_v53 ALTER COLUMN parameters TYPE text USING parameters::text;

-- ---------- finance.finance_budget_variances_v53 ----------
ALTER TABLE finance.finance_budget_variances_v53
    ADD COLUMN IF NOT EXISTS actual_amount numeric(18,2),
    ADD COLUMN IF NOT EXISTS budget_amount numeric(18,2),
    ADD COLUMN IF NOT EXISTS budget_item_id uuid,
    ADD COLUMN IF NOT EXISTS classification varchar(255),
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS period varchar(255),
    ADD COLUMN IF NOT EXISTS trend text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS variance_amount numeric(18,2),
    ADD COLUMN IF NOT EXISTS variance_percentage numeric(18,2),
    ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- ---------- finance.finance_cash_flow_predictions_v53 ----------
ALTER TABLE finance.finance_cash_flow_predictions_v53
    ADD COLUMN IF NOT EXISTS confidence numeric(18,2),
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS entity_id uuid,
    ADD COLUMN IF NOT EXISTS model_version varchar(255),
    ADD COLUMN IF NOT EXISTS period varchar(255),
    ADD COLUMN IF NOT EXISTS predicted_inflow numeric(18,2),
    ADD COLUMN IF NOT EXISTS predicted_net numeric(18,2),
    ADD COLUMN IF NOT EXISTS predicted_outflow numeric(18,2),
    ADD COLUMN IF NOT EXISTS scenario varchar(255),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- ---------- finance.core_finance_approval_nodes ----------
ALTER TABLE finance.core_finance_approval_nodes
    ADD COLUMN IF NOT EXISTS approval_type varchar DEFAULT 'single'::character varying,
    ADD COLUMN IF NOT EXISTS approver_role varchar,
    ADD COLUMN IF NOT EXISTS approver_users text[],
    ADD COLUMN IF NOT EXISTS notify_users text[],
    ADD COLUMN IF NOT EXISTS conditions jsonb,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS timeout_hours integer DEFAULT 48;

-- ---------- finance.finance_prediction_models_v53 ----------
ALTER TABLE finance.finance_prediction_models_v53
    ADD COLUMN IF NOT EXISTS accuracy numeric(18,2),
    ADD COLUMN IF NOT EXISTS entity_id uuid,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS model_type varchar(255),
    ADD COLUMN IF NOT EXISTS trained_at timestamptz;

-- parameters：例外项，目标类型 jsonb
ALTER TABLE finance.finance_prediction_models_v53
    ADD COLUMN IF NOT EXISTS parameters jsonb;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'finance'
          AND table_name = 'finance_prediction_models_v53'
          AND column_name = 'parameters'
          AND data_type = 'text'
    ) THEN
        -- 空串按 NULL 处理；非法 JSON 会让迁移显式失败而不是静默丢数据。
        ALTER TABLE finance.finance_prediction_models_v53
            ALTER COLUMN parameters TYPE jsonb
            USING NULLIF(parameters, '')::jsonb;
    END IF;
END $$;

-- ---------- finance.finance_voucher_template_lines ----------
ALTER TABLE finance.finance_voucher_template_lines
    ADD COLUMN IF NOT EXISTS account_code varchar(255),
    ADD COLUMN IF NOT EXISTS amount_formula varchar(255),
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS direction varchar(255),
    ADD COLUMN IF NOT EXISTS sort_order integer;

-- ---------- finance.reconciliation_item_snapshots ----------
ALTER TABLE finance.reconciliation_item_snapshots
    ADD COLUMN IF NOT EXISTS match_status varchar(50),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ---------- finance.core_finance_payment_workflow ----------
ALTER TABLE finance.core_finance_payment_workflow
    ADD COLUMN IF NOT EXISTS workflow_instance_id uuid;

-- ---------- B3：ON CONFLICT 依赖的唯一索引 ----------

CREATE UNIQUE INDEX IF NOT EXISTS unique_period
    ON finance.core_finance_periods (tenant_id, year, month);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_voucher_tenant_source
    ON finance.core_finance_vouchers (tenant_id, source_module, source_id)
    WHERE source_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_prediction_models_v53_model_type
    ON finance.finance_prediction_models_v53 (model_type);

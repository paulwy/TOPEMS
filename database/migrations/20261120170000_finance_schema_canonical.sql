-- 20261120170000: finance 66 张运行期表收口（W2-D2 第六个模块）
--
-- 背景：svc/finance/src/models/schema_defense.rs 的 TABLE_DEFS（66 表 / 563 列）
-- 以及 modules/decision_v60.rs、reports_v57.rs、risk_v54.rs、risk_v59.rs、
-- settlement_v55.rs、tax_v56.rs、treasury_v58.rs、services/finance/database.rs
-- 中的启动期 CREATE TABLE/INDEX 共同维护这些表。本迁移以 baseline+forward 库
-- 真实形状固化，删除运行期 DDL 后由迁移链唯一维护。
--
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='finance' AND t.typname='diff_reason') THEN
        CREATE TYPE finance.diff_reason AS ENUM ('time_diff','amount_diff','duplicate','missing','unknown','fee','exchange_rate');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='finance' AND t.typname='item_source') THEN
        CREATE TYPE finance.item_source AS ENUM ('bank','erp');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='finance' AND t.typname='match_status') THEN
        CREATE TYPE finance.match_status AS ENUM ('unmatched','matched','diff','manual');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='finance' AND t.typname='reconciliation_status') THEN
        CREATE TYPE finance.reconciliation_status AS ENUM ('pending','processing','completed','cancelled');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='finance' AND t.typname='reconciliation_type') THEN
        CREATE TYPE finance.reconciliation_type AS ENUM ('bank','receivable','payable');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS finance.core_finance_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    account_type public.account_type NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    balance_direction character varying(20),
    created_by uuid,
    default_currency character varying(10),
    enable_foreign_currency boolean DEFAULT false,
    enable_quantity boolean DEFAULT false,
    full_name character varying(500),
    haschildren boolean DEFAULT false,
    is_cash_flow boolean DEFAULT false,
    is_detail boolean DEFAULT false,
    name_en character varying(255),
    parent_code character varying(50),
    status character varying(20) DEFAULT 'active'::character varying,
    type character varying(20),
    unit character varying(50),
    updated_by uuid,
    category text,
    is_leaf boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS finance.core_finance_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    voucher_no character varying(50) NOT NULL,
    voucher_date timestamp with time zone NOT NULL,
    period character varying(6) NOT NULL,
    voucher_type public.voucher_type NOT NULL,
    total_debit numeric(18,4) DEFAULT 0 NOT NULL,
    total_credit numeric(18,4) DEFAULT 0 NOT NULL,
    status public.voucher_status DEFAULT 'draft'::public.voucher_status NOT NULL,
    description text,
    created_by character varying(100) NOT NULL,
    approved_by character varying(100),
    posted_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    template_id uuid,
    source_module character varying(64),
    source_id character varying(64),
    company_id uuid NOT NULL,
    voucher_number character varying(64),
    year integer,
    month integer,
    total_amount numeric(18,2),
    currency_code character varying(16),
    submitter_id uuid,
    submitter_name character varying(128),
    submitted_at timestamp with time zone,
    approver_id uuid,
    approver_name character varying(128),
    checker_id uuid,
    checker_name character varying(128),
    approved_at timestamp with time zone,
    poster_id uuid,
    poster_name character varying(128),
    bookkeeper_id uuid,
    bookkeeper_name character varying(128),
    posted_at timestamp with time zone,
    is_reversed boolean DEFAULT false,
    reverse_voucher_id uuid,
    reversed_at timestamp with time zone,
    attachment_count integer DEFAULT 0,
    summary text,
    updated_by uuid,
    maker_id uuid,
    maker_name character varying(128)
);

CREATE TABLE IF NOT EXISTS finance.core_finance_voucher_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    line_no integer NOT NULL,
    account_id uuid NOT NULL,
    account_code character varying(50) NOT NULL,
    account_name character varying(255) NOT NULL,
    description text,
    debit numeric(18,4) DEFAULT 0 NOT NULL,
    credit numeric(18,4) DEFAULT 0 NOT NULL,
    project_id uuid,
    department_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    aux_type text,
    aux_id uuid,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    company_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.core_finance_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    account_code character varying(50) NOT NULL,
    account_name character varying(255) NOT NULL,
    voucher_id uuid NOT NULL,
    voucher_no character varying(50) NOT NULL,
    voucher_date timestamp with time zone NOT NULL,
    period character varying(6) NOT NULL,
    description text,
    debit numeric(18,4) DEFAULT 0 NOT NULL,
    credit numeric(18,4) DEFAULT 0 NOT NULL,
    balance numeric(18,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    aux_id uuid,
    company_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.core_finance_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    period_name character varying(20) NOT NULL,
    status public.period_status DEFAULT 'open'::public.period_status NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    closed_at timestamp with time zone,
    closed_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    period text
);

CREATE TABLE IF NOT EXISTS finance.core_finance_approval_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    doc_type public.approval_doc_type NOT NULL,
    doc_id uuid NOT NULL,
    doc_no character varying(100) NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    submitted_by character varying(100) NOT NULL,
    submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved_by character varying(100),
    approved_at timestamp with time zone,
    rejected_by character varying(100),
    rejected_at timestamp with time zone,
    rejection_reason text,
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.core_finance_reconciliation_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    session_no character varying(50) NOT NULL,
    reco_type public.reconciliation_type NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    bank_account_id uuid,
    entity_id uuid,
    status public.reconciliation_status DEFAULT 'pending'::public.reconciliation_status NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    matched_items integer DEFAULT 0 NOT NULL,
    unmatched_items integer DEFAULT 0 NOT NULL,
    diff_items integer DEFAULT 0 NOT NULL,
    created_by character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.core_finance_reconciliation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    source_type public.item_source NOT NULL,
    transaction_date date NOT NULL,
    amount numeric(18,4) NOT NULL,
    direction character varying(10) NOT NULL,
    counterparty_name character varying(255),
    counterparty_account character varying(100),
    reference_no character varying(100),
    description text,
    match_status public.match_status DEFAULT 'unmatched'::public.match_status NOT NULL,
    matched_item_id uuid,
    diff_reason public.diff_reason,
    diff_amount numeric(18,4),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.core_finance_aux_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    aux_type public.aux_type NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    level integer DEFAULT 1 NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    description text,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.core_finance_aux_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    aux_type public.aux_type NOT NULL,
    aux_id uuid NOT NULL,
    period character varying(6) NOT NULL,
    debit_balance numeric(18,4) DEFAULT 0 NOT NULL,
    credit_balance numeric(18,4) DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    company_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_cash_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    pool_type character varying(20) DEFAULT 'physical'::character varying NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    entities text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_pool_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    pool_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    percentage double precision DEFAULT 0 NOT NULL,
    allocated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_pool_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    from_pool uuid NOT NULL,
    to_pool uuid NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    reference character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_forecast_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    scenario_type character varying(30) DEFAULT 'medium_term'::character varying NOT NULL,
    horizon_days integer DEFAULT 90 NOT NULL,
    assumptions jsonb,
    confidence double precision DEFAULT 0.5 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_forecast_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    date date NOT NULL,
    inflow double precision DEFAULT 0 NOT NULL,
    outflow double precision DEFAULT 0 NOT NULL,
    net double precision DEFAULT 0 NOT NULL,
    closing_balance double precision DEFAULT 0 NOT NULL,
    confidence_interval jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_liquidity_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    min_balance double precision DEFAULT 0 NOT NULL,
    max_balance double precision DEFAULT 0 NOT NULL,
    target_balance double precision DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_optimization_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    recommended_actions jsonb,
    projected_savings double precision DEFAULT 0 NOT NULL,
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    form_type character varying(30) DEFAULT 'vat'::character varying NOT NULL,
    jurisdiction character varying(100) DEFAULT 'CN'::character varying NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    total_tax_amount double precision DEFAULT 0 NOT NULL,
    filed_at timestamp with time zone,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    form_id uuid NOT NULL,
    line_no integer NOT NULL,
    description character varying(500) NOT NULL,
    taxable_amount double precision DEFAULT 0 NOT NULL,
    tax_rate double precision DEFAULT 0 NOT NULL,
    tax_amount double precision DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    jurisdiction character varying(100) DEFAULT 'CN'::character varying NOT NULL,
    rate_type character varying(30) DEFAULT 'vat'::character varying NOT NULL,
    rate double precision DEFAULT 0 NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    effective_to timestamp with time zone,
    description text,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_brackets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    rate_id uuid NOT NULL,
    bracket_order integer NOT NULL,
    threshold_from double precision DEFAULT 0 NOT NULL,
    threshold_to double precision,
    rate double precision DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity character varying(255) NOT NULL,
    period character varying(50) NOT NULL,
    strategy character varying(50) DEFAULT 'legal_optimization'::character varying NOT NULL,
    projected_savings double precision DEFAULT 0 NOT NULL,
    risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    description text NOT NULL,
    estimated_savings double precision DEFAULT 0 NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    action_items text[],
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_reconciliation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    match_type character varying(30) DEFAULT 'exact'::character varying NOT NULL,
    tolerance double precision DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    recon_code text
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_reconciliation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bank_transaction_id character varying(100) NOT NULL,
    system_record_id character varying(100) NOT NULL,
    match_status character varying(30) DEFAULT 'unmatched'::character varying NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    difference_amount double precision DEFAULT 0 NOT NULL,
    notes text,
    approved boolean DEFAULT false NOT NULL,
    disputed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    status text DEFAULT 'pending'::text
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number character varying(100) NOT NULL,
    vendor character varying(255) NOT NULL,
    invoice_date timestamp with time zone NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    tax_amount double precision DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    purchase_order_id character varying(100),
    recognized_at timestamp with time zone,
    validated_at timestamp with time zone,
    posted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    project_id uuid
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    description character varying(500) NOT NULL,
    quantity double precision DEFAULT 0 NOT NULL,
    unit_price double precision DEFAULT 0 NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    tax_rate double precision DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    from_account character varying(100) NOT NULL,
    to_account character varying(100) NOT NULL,
    method character varying(30) DEFAULT 'bank_transfer'::character varying NOT NULL,
    reference character varying(255) NOT NULL,
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    status text DEFAULT 'pending'::text
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_payment_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    request_id uuid NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    transaction_ref character varying(255),
    fee double precision DEFAULT 0 NOT NULL,
    processed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_fraud_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    signal_type character varying(30) NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    metadata jsonb,
    detected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_fraud_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    transaction_id character varying(100) NOT NULL,
    risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    action character varying(20) DEFAULT 'approve'::character varying NOT NULL,
    reason text NOT NULL,
    signals jsonb,
    decided_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_device_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    device_id character varying(255) NOT NULL,
    fingerprint character varying(255) NOT NULL,
    trust_score double precision DEFAULT 1.0 NOT NULL,
    last_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_history jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_credit_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    score integer DEFAULT 300 NOT NULL,
    grade character varying(5) DEFAULT 'D'::character varying NOT NULL,
    factors jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_scoring_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(50) NOT NULL,
    features jsonb,
    weights jsonb,
    accuracy double precision DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_stress_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    scenario_type character varying(30) DEFAULT 'market'::character varying NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    assumptions jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_stress_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    impact_value double precision DEFAULT 0 NOT NULL,
    capital_adequacy double precision DEFAULT 0 NOT NULL,
    liquidity_ratio double precision DEFAULT 0 NOT NULL,
    pass_fail boolean DEFAULT true NOT NULL,
    details jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_fraud_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    signal_type character varying(30) NOT NULL,
    threshold double precision DEFAULT 0.5 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_risk_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    current_value double precision DEFAULT 0 NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    unit character varying(20) DEFAULT ''::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_risk_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    indicator_id uuid NOT NULL,
    level character varying(20) NOT NULL,
    message text NOT NULL,
    entity character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged boolean DEFAULT false NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_fraud_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    rule_type character varying(50) NOT NULL,
    condition text NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_fraud_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    transaction_id character varying(100) NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    triggered_rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    risk_level character varying(20) NOT NULL,
    recommendation character varying(20) NOT NULL,
    scored_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_review_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    regulation character varying(50) NOT NULL,
    category character varying(100) NOT NULL,
    severity character varying(20) DEFAULT 'low'::character varying NOT NULL,
    action character varying(20) DEFAULT 'approve'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_review_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100) NOT NULL,
    rule_id uuid NOT NULL,
    passed boolean DEFAULT true NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    reviewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewer character varying(100) NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_review_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    assigned_to character varying(100),
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    report_type character varying(50) DEFAULT 'balance_sheet'::character varying NOT NULL,
    layout character varying(20) DEFAULT 'json'::character varying NOT NULL,
    parameters jsonb,
    schedule character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_generated_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    template_id uuid,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    data jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    format character varying(20) DEFAULT 'json'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_analysis_dimensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    hierarchy text[],
    filters jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_analysis_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    dimensions text[] NOT NULL,
    measures text[] NOT NULL,
    data jsonb,
    aggregations jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_forecast_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    model_type character varying(50) DEFAULT 'linear_regression'::character varying NOT NULL,
    target_metric character varying(100) NOT NULL,
    features text[],
    accuracy double precision,
    trained_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    insight_type character varying(30) DEFAULT 'trend'::character varying NOT NULL,
    description text NOT NULL,
    confidence double precision,
    data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_decision_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    scenario_type character varying(30) DEFAULT 'investment'::character varying NOT NULL,
    parameters jsonb,
    objectives jsonb,
    constraints jsonb,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_decision_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    recommended_action character varying(500) NOT NULL,
    alternatives jsonb,
    expected_impact jsonb,
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    decided_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    metric_name character varying(100) NOT NULL,
    condition character varying(20) DEFAULT 'above'::character varying NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    metric_name character varying(100) NOT NULL,
    current_value double precision DEFAULT 0 NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_alert_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    channel_type character varying(30) DEFAULT 'email'::character varying NOT NULL,
    config jsonb,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_schedule_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    task_type character varying(30) DEFAULT 'recurring'::character varying NOT NULL,
    cron_expression character varying(100),
    action jsonb,
    priority integer DEFAULT 5 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_schedule_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    task_id uuid NOT NULL,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_ms double precision,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    output jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_schedule_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    task_id uuid NOT NULL,
    depends_on uuid NOT NULL,
    condition jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_control_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text NOT NULL,
    category character varying(30) NOT NULL,
    risk_level character varying(30) NOT NULL,
    control_type character varying(30) NOT NULL,
    frequency character varying(30) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_control_matrices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    period character varying(20) NOT NULL,
    controls jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_controls bigint DEFAULT 0 NOT NULL,
    effective_controls bigint DEFAULT 0 NOT NULL,
    compliance_rate double precision DEFAULT 0.0 NOT NULL,
    created_by character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_risk_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    control_point_id uuid NOT NULL,
    likelihood character varying(20) NOT NULL,
    impact character varying(20) NOT NULL,
    risk_score integer NOT NULL,
    risk_level character varying(20) NOT NULL,
    mitigation_strategy text NOT NULL,
    residual_risk character varying(20) NOT NULL,
    assessed_by character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_compliance_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    report_type character varying(30) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    controls_checked bigint DEFAULT 0 NOT NULL,
    issues_found bigint DEFAULT 0 NOT NULL,
    risk_assessments jsonb DEFAULT '[]'::jsonb NOT NULL,
    executive_summary text NOT NULL,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by character varying(100) NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_compliance_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    severity character varying(20) NOT NULL,
    category character varying(50) NOT NULL,
    control_point_code character varying(50) NOT NULL,
    description text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    impact_assessment text NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS finance.reconciliation_settlement_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    reconciliation_id uuid NOT NULL,
    settlement_id uuid NOT NULL,
    link_type character varying(20) NOT NULL,
    amount numeric(15,2),
    status character varying(20) DEFAULT 'linked'::character varying NOT NULL,
    remark text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.settlement_center_dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.difference_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    source_type character varying(20) NOT NULL,
    source_id uuid NOT NULL,
    difference_type character varying(20) NOT NULL,
    difference_amount numeric(15,2) NOT NULL,
    reason character varying(255) NOT NULL,
    adjustment_amount numeric(15,2),
    adjustment_type character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    remark text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_account_parent_id ON finance.core_finance_accounts USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_account_tenant_id ON finance.core_finance_accounts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_aux_account_parent_id ON finance.core_finance_aux_accounts USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_aux_account_tenant_id ON finance.core_finance_aux_accounts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_aux_account_type ON finance.core_finance_aux_accounts USING btree (aux_type);
CREATE INDEX IF NOT EXISTS idx_aux_balance_account_id ON finance.core_finance_aux_balances USING btree (account_id);
CREATE INDEX IF NOT EXISTS idx_aux_balance_aux ON finance.core_finance_aux_balances USING btree (aux_type, aux_id);
CREATE INDEX IF NOT EXISTS idx_aux_balance_period ON finance.core_finance_aux_balances USING btree (period);
CREATE INDEX IF NOT EXISTS idx_aux_balance_tenant_company ON finance.core_finance_aux_balances USING btree (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_aux_balance_tenant_id ON finance.core_finance_aux_balances USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_aux_balance_company ON finance.core_finance_aux_balances USING btree (tenant_id, company_id, account_id, aux_type, aux_id, period);
CREATE INDEX IF NOT EXISTS idx_core_finance_ledger_voucher_id ON finance.core_finance_ledger USING btree (voucher_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON finance.core_finance_ledger USING btree (account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_aux_id ON finance.core_finance_ledger USING btree (aux_id);
CREATE INDEX IF NOT EXISTS idx_ledger_period ON finance.core_finance_ledger USING btree (period);
CREATE INDEX IF NOT EXISTS idx_ledger_tenant_company ON finance.core_finance_ledger USING btree (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tenant_id ON finance.core_finance_ledger USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_period_status ON finance.core_finance_periods USING btree (status);
CREATE INDEX IF NOT EXISTS idx_period_tenant_id ON finance.core_finance_periods USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_period ON finance.core_finance_periods USING btree (tenant_id, year, month);
CREATE UNIQUE INDEX IF NOT EXISTS ux_core_finance_periods_tenant_period ON finance.core_finance_periods USING btree (tenant_id, period) WHERE (period IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_reco_item_amount ON finance.core_finance_reconciliation_items USING btree (amount);
CREATE INDEX IF NOT EXISTS idx_reco_item_date ON finance.core_finance_reconciliation_items USING btree (transaction_date);
CREATE INDEX IF NOT EXISTS idx_reco_item_match_status ON finance.core_finance_reconciliation_items USING btree (match_status);
CREATE INDEX IF NOT EXISTS idx_reco_item_matched ON finance.core_finance_reconciliation_items USING btree (matched_item_id);
CREATE INDEX IF NOT EXISTS idx_reco_item_session_id ON finance.core_finance_reconciliation_items USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_reco_item_tenant_id ON finance.core_finance_reconciliation_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reco_session_period ON finance.core_finance_reconciliation_sessions USING btree (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reco_session_status ON finance.core_finance_reconciliation_sessions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_reco_session_tenant_id ON finance.core_finance_reconciliation_sessions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reco_session_type ON finance.core_finance_reconciliation_sessions USING btree (reco_type);
CREATE INDEX IF NOT EXISTS idx_voucher_line_account_id ON finance.core_finance_voucher_lines USING btree (account_id);
CREATE INDEX IF NOT EXISTS idx_voucher_line_tenant_company ON finance.core_finance_voucher_lines USING btree (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_voucher_line_voucher_id ON finance.core_finance_voucher_lines USING btree (voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_period ON finance.core_finance_vouchers USING btree (period);
CREATE INDEX IF NOT EXISTS idx_voucher_status ON finance.core_finance_vouchers USING btree (status);
CREATE INDEX IF NOT EXISTS idx_voucher_tenant_company ON finance.core_finance_vouchers USING btree (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_voucher_tenant_id ON finance.core_finance_vouchers USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_voucher_tenant_source ON finance.core_finance_vouchers USING btree (tenant_id, source_module, source_id) WHERE ((source_id IS NOT NULL) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS uq_voucher_company_period_no ON finance.core_finance_vouchers USING btree (tenant_id, company_id, period, voucher_no) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_finance_v54_fraud_rules_tenant_id ON finance.finance_v54_fraud_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_fraud_rules_tenant ON finance.finance_v54_fraud_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_fraud_rules_type ON finance.finance_v54_fraud_rules USING btree (rule_type);
CREATE INDEX IF NOT EXISTS idx_finance_v54_fraud_scores_tenant_id ON finance.finance_v54_fraud_scores USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_fraud_scores_tenant ON finance.finance_v54_fraud_scores USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_fraud_scores_transaction ON finance.finance_v54_fraud_scores USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS idx_finance_v54_review_results_tenant_id ON finance.finance_v54_review_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_review_results_entity ON finance.finance_v54_review_results USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_v54_review_results_tenant ON finance.finance_v54_review_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v54_review_rules_tenant_id ON finance.finance_v54_review_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_review_rules_regulation ON finance.finance_v54_review_rules USING btree (regulation);
CREATE INDEX IF NOT EXISTS idx_v54_review_rules_tenant ON finance.finance_v54_review_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v54_review_workflows_tenant_id ON finance.finance_v54_review_workflows USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_review_workflows_status ON finance.finance_v54_review_workflows USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v54_review_workflows_tenant ON finance.finance_v54_review_workflows USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v54_risk_alerts_tenant_id ON finance.finance_v54_risk_alerts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_risk_alerts_entity ON finance.finance_v54_risk_alerts USING btree (entity);
CREATE INDEX IF NOT EXISTS idx_v54_risk_alerts_level ON finance.finance_v54_risk_alerts USING btree (level);
CREATE INDEX IF NOT EXISTS idx_v54_risk_alerts_tenant ON finance.finance_v54_risk_alerts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v54_risk_indicators_tenant_id ON finance.finance_v54_risk_indicators USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v54_risk_indicators_category ON finance.finance_v54_risk_indicators USING btree (category);
CREATE INDEX IF NOT EXISTS idx_v54_risk_indicators_tenant ON finance.finance_v54_risk_indicators USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v55_invoice_items_tenant_id ON finance.finance_v55_invoice_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v55_invoice_items_invoice ON finance.finance_v55_invoice_items USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_v55_invoice_items_tenant ON finance.finance_v55_invoice_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v55_invoices_tenant_id ON finance.finance_v55_invoices USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v55_invoices_number ON finance.finance_v55_invoices USING btree (number);
CREATE INDEX IF NOT EXISTS idx_v55_invoices_status ON finance.finance_v55_invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v55_invoices_tenant ON finance.finance_v55_invoices USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v55_payment_requests_tenant_id ON finance.finance_v55_payment_requests USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v55_payment_requests_method ON finance.finance_v55_payment_requests USING btree (method);
CREATE INDEX IF NOT EXISTS idx_v55_payment_requests_tenant ON finance.finance_v55_payment_requests USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v55_payment_results_tenant_id ON finance.finance_v55_payment_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v55_payment_results_request ON finance.finance_v55_payment_results USING btree (request_id);
CREATE INDEX IF NOT EXISTS idx_v55_payment_results_status ON finance.finance_v55_payment_results USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v55_payment_results_tenant ON finance.finance_v55_payment_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v55_reconciliation_results_tenant_id ON finance.finance_v55_reconciliation_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v55_recon_results_bank_tx ON finance.finance_v55_reconciliation_results USING btree (bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_v55_recon_results_status ON finance.finance_v55_reconciliation_results USING btree (match_status);
CREATE INDEX IF NOT EXISTS idx_v55_recon_results_tenant ON finance.finance_v55_reconciliation_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v55_reconciliation_rules_tenant_id ON finance.finance_v55_reconciliation_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v55_recon_rules_tenant ON finance.finance_v55_reconciliation_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_brackets_tenant_id ON finance.finance_v56_tax_brackets USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_brackets_rate ON finance.finance_v56_tax_brackets USING btree (rate_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_brackets_tenant ON finance.finance_v56_tax_brackets USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_forms_tenant_id ON finance.finance_v56_tax_forms USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_period ON finance.finance_v56_tax_forms USING btree (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_status ON finance.finance_v56_tax_forms USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_tenant ON finance.finance_v56_tax_forms USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_type ON finance.finance_v56_tax_forms USING btree (form_type);
CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_lines_tenant_id ON finance.finance_v56_tax_lines USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_lines_form ON finance.finance_v56_tax_lines USING btree (form_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_lines_tenant ON finance.finance_v56_tax_lines USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_plans_tenant_id ON finance.finance_v56_tax_plans USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_plans_entity ON finance.finance_v56_tax_plans USING btree (entity);
CREATE INDEX IF NOT EXISTS idx_v56_tax_plans_status ON finance.finance_v56_tax_plans USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v56_tax_plans_tenant ON finance.finance_v56_tax_plans USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_rates_tenant_id ON finance.finance_v56_tax_rates USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_rates_jurisdiction ON finance.finance_v56_tax_rates USING btree (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_v56_tax_rates_tenant ON finance.finance_v56_tax_rates USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_rates_type ON finance.finance_v56_tax_rates USING btree (rate_type);
CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_suggestions_tenant_id ON finance.finance_v56_tax_suggestions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_suggestions_plan ON finance.finance_v56_tax_suggestions USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_v56_tax_suggestions_tenant ON finance.finance_v56_tax_suggestions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v57_analysis_dimensions_tenant_id ON finance.finance_v57_analysis_dimensions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_analysis_dim_name ON finance.finance_v57_analysis_dimensions USING btree (name);
CREATE INDEX IF NOT EXISTS idx_v57_analysis_dim_tenant ON finance.finance_v57_analysis_dimensions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v57_analysis_results_tenant_id ON finance.finance_v57_analysis_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_analysis_res_created ON finance.finance_v57_analysis_results USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_v57_analysis_res_tenant ON finance.finance_v57_analysis_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v57_forecast_models_tenant_id ON finance.finance_v57_forecast_models USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_forecast_models_tenant ON finance.finance_v57_forecast_models USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_forecast_models_type ON finance.finance_v57_forecast_models USING btree (model_type);
CREATE INDEX IF NOT EXISTS idx_finance_v57_generated_reports_template_id ON finance.finance_v57_generated_reports USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_finance_v57_generated_reports_tenant_id ON finance.finance_v57_generated_reports USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_gen_reports_period ON finance.finance_v57_generated_reports USING btree (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_v57_gen_reports_status ON finance.finance_v57_generated_reports USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v57_gen_reports_template ON finance.finance_v57_generated_reports USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_v57_gen_reports_tenant ON finance.finance_v57_generated_reports USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v57_insights_tenant_id ON finance.finance_v57_insights USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_insights_created ON finance.finance_v57_insights USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_v57_insights_tenant ON finance.finance_v57_insights USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_insights_type ON finance.finance_v57_insights USING btree (insight_type);
CREATE INDEX IF NOT EXISTS idx_finance_v57_report_templates_tenant_id ON finance.finance_v57_report_templates USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_report_templates_tenant ON finance.finance_v57_report_templates USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v57_report_templates_type ON finance.finance_v57_report_templates USING btree (report_type);
CREATE INDEX IF NOT EXISTS idx_finance_v58_cash_pools_tenant_id ON finance.finance_v58_cash_pools USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_cash_pools_tenant ON finance.finance_v58_cash_pools USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_cash_pools_type ON finance.finance_v58_cash_pools USING btree (pool_type);
CREATE INDEX IF NOT EXISTS idx_finance_v58_forecast_results_scenario_id ON finance.finance_v58_forecast_results USING btree (scenario_id);
CREATE INDEX IF NOT EXISTS idx_finance_v58_forecast_results_tenant_id ON finance.finance_v58_forecast_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_results_date ON finance.finance_v58_forecast_results USING btree (date);
CREATE INDEX IF NOT EXISTS idx_v58_results_scenario ON finance.finance_v58_forecast_results USING btree (scenario_id);
CREATE INDEX IF NOT EXISTS idx_v58_results_tenant ON finance.finance_v58_forecast_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v58_forecast_scenarios_tenant_id ON finance.finance_v58_forecast_scenarios USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_scenarios_tenant ON finance.finance_v58_forecast_scenarios USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_scenarios_type ON finance.finance_v58_forecast_scenarios USING btree (scenario_type);
CREATE INDEX IF NOT EXISTS idx_finance_v58_liquidity_targets_tenant_id ON finance.finance_v58_liquidity_targets USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_targets_entity ON finance.finance_v58_liquidity_targets USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_v58_targets_tenant ON finance.finance_v58_liquidity_targets USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v58_optimization_results_tenant_id ON finance.finance_v58_optimization_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_optimization_created ON finance.finance_v58_optimization_results USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_v58_optimization_entity ON finance.finance_v58_optimization_results USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_v58_optimization_tenant ON finance.finance_v58_optimization_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_allocations_pool_id ON finance.finance_v58_pool_allocations USING btree (pool_id);
CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_allocations_tenant_id ON finance.finance_v58_pool_allocations USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v58_allocations_entity ON finance.finance_v58_pool_allocations USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_v58_allocations_pool ON finance.finance_v58_pool_allocations USING btree (pool_id);
CREATE INDEX IF NOT EXISTS idx_v58_allocations_tenant ON finance.finance_v58_pool_allocations USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_transfers_from_pool ON finance.finance_v58_pool_transfers USING btree (from_pool);
CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_transfers_tenant_id ON finance.finance_v58_pool_transfers USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_transfers_to_pool ON finance.finance_v58_pool_transfers USING btree (to_pool);
CREATE INDEX IF NOT EXISTS idx_v58_transfers_created ON finance.finance_v58_pool_transfers USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_v58_transfers_status ON finance.finance_v58_pool_transfers USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v58_transfers_tenant ON finance.finance_v58_pool_transfers USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v59_credit_profiles_tenant_id ON finance.finance_v59_credit_profiles USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_credit_profiles_grade ON finance.finance_v59_credit_profiles USING btree (grade);
CREATE INDEX IF NOT EXISTS idx_v59_credit_profiles_score ON finance.finance_v59_credit_profiles USING btree (score);
CREATE INDEX IF NOT EXISTS idx_v59_credit_profiles_tenant ON finance.finance_v59_credit_profiles USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v59_device_profiles_tenant_id ON finance.finance_v59_device_profiles USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_device_profiles_tenant ON finance.finance_v59_device_profiles USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_device_profiles_trust ON finance.finance_v59_device_profiles USING btree (trust_score);
CREATE INDEX IF NOT EXISTS idx_finance_v59_fraud_decisions_tenant_id ON finance.finance_v59_fraud_decisions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_decisions_level ON finance.finance_v59_fraud_decisions USING btree (risk_level);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_decisions_tenant ON finance.finance_v59_fraud_decisions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_decisions_transaction ON finance.finance_v59_fraud_decisions USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS idx_finance_v59_fraud_rules_tenant_id ON finance.finance_v59_fraud_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_rules_tenant ON finance.finance_v59_fraud_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_rules_type ON finance.finance_v59_fraud_rules USING btree (signal_type);
CREATE INDEX IF NOT EXISTS idx_finance_v59_fraud_signals_tenant_id ON finance.finance_v59_fraud_signals USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_signals_detected ON finance.finance_v59_fraud_signals USING btree (detected_at);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_signals_tenant ON finance.finance_v59_fraud_signals USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_fraud_signals_type ON finance.finance_v59_fraud_signals USING btree (signal_type);
CREATE INDEX IF NOT EXISTS idx_finance_v59_scoring_models_tenant_id ON finance.finance_v59_scoring_models USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_scoring_models_status ON finance.finance_v59_scoring_models USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v59_scoring_models_tenant ON finance.finance_v59_scoring_models USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v59_stress_results_scenario_id ON finance.finance_v59_stress_results USING btree (scenario_id);
CREATE INDEX IF NOT EXISTS idx_finance_v59_stress_results_tenant_id ON finance.finance_v59_stress_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_stress_results_entity ON finance.finance_v59_stress_results USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_v59_stress_results_scenario ON finance.finance_v59_stress_results USING btree (scenario_id);
CREATE INDEX IF NOT EXISTS idx_v59_stress_results_tenant ON finance.finance_v59_stress_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v59_stress_scenarios_tenant_id ON finance.finance_v59_stress_scenarios USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_stress_scenarios_tenant ON finance.finance_v59_stress_scenarios USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v59_stress_scenarios_type ON finance.finance_v59_stress_scenarios USING btree (scenario_type);
CREATE INDEX IF NOT EXISTS idx_finance_v60_alert_channels_tenant_id ON finance.finance_v60_alert_channels USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_alert_channels_tenant ON finance.finance_v60_alert_channels USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_alert_channels_type ON finance.finance_v60_alert_channels USING btree (channel_type);
CREATE INDEX IF NOT EXISTS idx_finance_v60_alert_rules_tenant_id ON finance.finance_v60_alert_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_alert_rules_enabled ON finance.finance_v60_alert_rules USING btree (enabled);
CREATE INDEX IF NOT EXISTS idx_v60_alert_rules_metric ON finance.finance_v60_alert_rules USING btree (metric_name);
CREATE INDEX IF NOT EXISTS idx_v60_alert_rules_tenant ON finance.finance_v60_alert_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_alerts_rule_id ON finance.finance_v60_alerts USING btree (rule_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_alerts_tenant_id ON finance.finance_v60_alerts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_alerts_rule ON finance.finance_v60_alerts USING btree (rule_id);
CREATE INDEX IF NOT EXISTS idx_v60_alerts_severity ON finance.finance_v60_alerts USING btree (severity);
CREATE INDEX IF NOT EXISTS idx_v60_alerts_status ON finance.finance_v60_alerts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v60_alerts_tenant ON finance.finance_v60_alerts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_decision_results_scenario_id ON finance.finance_v60_decision_results USING btree (scenario_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_decision_results_tenant_id ON finance.finance_v60_decision_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_results_decided ON finance.finance_v60_decision_results USING btree (decided_at);
CREATE INDEX IF NOT EXISTS idx_v60_results_scenario ON finance.finance_v60_decision_results USING btree (scenario_id);
CREATE INDEX IF NOT EXISTS idx_v60_results_tenant ON finance.finance_v60_decision_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_decision_scenarios_tenant_id ON finance.finance_v60_decision_scenarios USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_scenarios_status ON finance.finance_v60_decision_scenarios USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v60_scenarios_tenant ON finance.finance_v60_decision_scenarios USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_scenarios_type ON finance.finance_v60_decision_scenarios USING btree (scenario_type);
CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_dependencies_depends_on ON finance.finance_v60_schedule_dependencies USING btree (depends_on);
CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_dependencies_task_id ON finance.finance_v60_schedule_dependencies USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_dependencies_tenant_id ON finance.finance_v60_schedule_dependencies USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_dependencies_task ON finance.finance_v60_schedule_dependencies USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_v60_dependencies_tenant ON finance.finance_v60_schedule_dependencies USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_executions_task_id ON finance.finance_v60_schedule_executions USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_executions_tenant_id ON finance.finance_v60_schedule_executions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_executions_status ON finance.finance_v60_schedule_executions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v60_executions_task ON finance.finance_v60_schedule_executions USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_v60_executions_tenant ON finance.finance_v60_schedule_executions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_tasks_tenant_id ON finance.finance_v60_schedule_tasks USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_priority ON finance.finance_v60_schedule_tasks USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_status ON finance.finance_v60_schedule_tasks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_tenant ON finance.finance_v60_schedule_tasks USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_type ON finance.finance_v60_schedule_tasks USING btree (task_type);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_accounts'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_accounts ADD CONSTRAINT "core_finance_accounts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_approval_workflows'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_approval_workflows ADD CONSTRAINT "core_finance_approval_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_aux_accounts'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_aux_accounts ADD CONSTRAINT "core_finance_aux_accounts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_aux_balances'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_aux_balances ADD CONSTRAINT "core_finance_aux_balances_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_ledger'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_ledger ADD CONSTRAINT "core_finance_ledger_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_periods'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_periods ADD CONSTRAINT "core_finance_periods_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_reconciliation_items'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_reconciliation_items ADD CONSTRAINT "core_finance_reconciliation_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_reconciliation_sessions'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_reconciliation_sessions ADD CONSTRAINT "core_finance_reconciliation_sessions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_voucher_lines'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_voucher_lines ADD CONSTRAINT "core_finance_voucher_lines_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_vouchers'::regclass AND contype='p') THEN
        ALTER TABLE finance.core_finance_vouchers ADD CONSTRAINT "core_finance_vouchers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.difference_adjustments'::regclass AND contype='p') THEN
        ALTER TABLE finance.difference_adjustments ADD CONSTRAINT "difference_adjustments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_compliance_issues'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_compliance_issues ADD CONSTRAINT "finance_compliance_issues_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_compliance_reports'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_compliance_reports ADD CONSTRAINT "finance_compliance_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_control_matrices'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_control_matrices ADD CONSTRAINT "finance_control_matrices_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_control_points'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_control_points ADD CONSTRAINT "finance_control_points_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_risk_assessments'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_risk_assessments ADD CONSTRAINT "finance_risk_assessments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_fraud_rules'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v54_fraud_rules ADD CONSTRAINT "finance_v54_fraud_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_fraud_scores'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v54_fraud_scores ADD CONSTRAINT "finance_v54_fraud_scores_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_review_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v54_review_results ADD CONSTRAINT "finance_v54_review_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_review_rules'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v54_review_rules ADD CONSTRAINT "finance_v54_review_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_review_workflows'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v54_review_workflows ADD CONSTRAINT "finance_v54_review_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_risk_alerts'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v54_risk_alerts ADD CONSTRAINT "finance_v54_risk_alerts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_risk_indicators'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v54_risk_indicators ADD CONSTRAINT "finance_v54_risk_indicators_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_invoice_items'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v55_invoice_items ADD CONSTRAINT "finance_v55_invoice_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_invoices'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v55_invoices ADD CONSTRAINT "finance_v55_invoices_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_payment_requests'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v55_payment_requests ADD CONSTRAINT "finance_v55_payment_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_payment_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v55_payment_results ADD CONSTRAINT "finance_v55_payment_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_reconciliation_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v55_reconciliation_results ADD CONSTRAINT "finance_v55_reconciliation_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_reconciliation_rules'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v55_reconciliation_rules ADD CONSTRAINT "finance_v55_reconciliation_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_brackets'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v56_tax_brackets ADD CONSTRAINT "finance_v56_tax_brackets_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_forms'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v56_tax_forms ADD CONSTRAINT "finance_v56_tax_forms_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_lines'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v56_tax_lines ADD CONSTRAINT "finance_v56_tax_lines_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_plans'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v56_tax_plans ADD CONSTRAINT "finance_v56_tax_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_rates'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v56_tax_rates ADD CONSTRAINT "finance_v56_tax_rates_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_suggestions'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v56_tax_suggestions ADD CONSTRAINT "finance_v56_tax_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_analysis_dimensions'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v57_analysis_dimensions ADD CONSTRAINT "finance_v57_analysis_dimensions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_analysis_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v57_analysis_results ADD CONSTRAINT "finance_v57_analysis_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_forecast_models'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v57_forecast_models ADD CONSTRAINT "finance_v57_forecast_models_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_generated_reports'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v57_generated_reports ADD CONSTRAINT "finance_v57_generated_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_insights'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v57_insights ADD CONSTRAINT "finance_v57_insights_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_report_templates'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v57_report_templates ADD CONSTRAINT "finance_v57_report_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_cash_pools'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v58_cash_pools ADD CONSTRAINT "finance_v58_cash_pools_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_forecast_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v58_forecast_results ADD CONSTRAINT "finance_v58_forecast_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_forecast_scenarios'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v58_forecast_scenarios ADD CONSTRAINT "finance_v58_forecast_scenarios_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_liquidity_targets'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v58_liquidity_targets ADD CONSTRAINT "finance_v58_liquidity_targets_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_optimization_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v58_optimization_results ADD CONSTRAINT "finance_v58_optimization_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_pool_allocations'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v58_pool_allocations ADD CONSTRAINT "finance_v58_pool_allocations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_pool_transfers'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v58_pool_transfers ADD CONSTRAINT "finance_v58_pool_transfers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_credit_profiles'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_credit_profiles ADD CONSTRAINT "finance_v59_credit_profiles_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_device_profiles'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_device_profiles ADD CONSTRAINT "finance_v59_device_profiles_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_fraud_decisions'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_fraud_decisions ADD CONSTRAINT "finance_v59_fraud_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_fraud_rules'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_fraud_rules ADD CONSTRAINT "finance_v59_fraud_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_fraud_signals'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_fraud_signals ADD CONSTRAINT "finance_v59_fraud_signals_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_scoring_models'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_scoring_models ADD CONSTRAINT "finance_v59_scoring_models_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_stress_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_stress_results ADD CONSTRAINT "finance_v59_stress_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_stress_scenarios'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v59_stress_scenarios ADD CONSTRAINT "finance_v59_stress_scenarios_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alert_channels'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_alert_channels ADD CONSTRAINT "finance_v60_alert_channels_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alert_rules'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_alert_rules ADD CONSTRAINT "finance_v60_alert_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alerts'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_alerts ADD CONSTRAINT "finance_v60_alerts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_decision_results'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_decision_results ADD CONSTRAINT "finance_v60_decision_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_decision_scenarios'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_decision_scenarios ADD CONSTRAINT "finance_v60_decision_scenarios_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_dependencies'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_schedule_dependencies ADD CONSTRAINT "finance_v60_schedule_dependencies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_executions'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_schedule_executions ADD CONSTRAINT "finance_v60_schedule_executions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_tasks'::regclass AND contype='p') THEN
        ALTER TABLE finance.finance_v60_schedule_tasks ADD CONSTRAINT "finance_v60_schedule_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.reconciliation_settlement_links'::regclass AND contype='p') THEN
        ALTER TABLE finance.reconciliation_settlement_links ADD CONSTRAINT "reconciliation_settlement_links_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.settlement_center_dashboards'::regclass AND contype='p') THEN
        ALTER TABLE finance.settlement_center_dashboards ADD CONSTRAINT "settlement_center_dashboards_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_accounts'::regclass AND conname='unique_account_code') THEN
        ALTER TABLE finance.core_finance_accounts ADD CONSTRAINT "unique_account_code" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_credit_profiles'::regclass AND conname='unique_v59_credit_entity') THEN
        ALTER TABLE finance.finance_v59_credit_profiles ADD CONSTRAINT "unique_v59_credit_entity" UNIQUE (tenant_id, entity_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_device_profiles'::regclass AND conname='unique_v59_device_id') THEN
        ALTER TABLE finance.finance_v59_device_profiles ADD CONSTRAINT "unique_v59_device_id" UNIQUE (tenant_id, device_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alerts'::regclass AND conname='ck_finance_v60_alerts_status_standard') THEN
        ALTER TABLE finance.finance_v60_alerts ADD CONSTRAINT "ck_finance_v60_alerts_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,draft,pending,acknowledged,resolved}'::text[]))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.core_finance_vouchers'::regclass AND conname='core_finance_vouchers_tenant_id_fkey') THEN
        ALTER TABLE finance.core_finance_vouchers ADD CONSTRAINT "core_finance_vouchers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_fraud_rules'::regclass AND conname='finance_v54_fraud_rules_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v54_fraud_rules ADD CONSTRAINT "finance_v54_fraud_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_fraud_scores'::regclass AND conname='finance_v54_fraud_scores_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v54_fraud_scores ADD CONSTRAINT "finance_v54_fraud_scores_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_review_results'::regclass AND conname='finance_v54_review_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v54_review_results ADD CONSTRAINT "finance_v54_review_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_review_rules'::regclass AND conname='finance_v54_review_rules_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v54_review_rules ADD CONSTRAINT "finance_v54_review_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_review_workflows'::regclass AND conname='finance_v54_review_workflows_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v54_review_workflows ADD CONSTRAINT "finance_v54_review_workflows_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_risk_alerts'::regclass AND conname='finance_v54_risk_alerts_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v54_risk_alerts ADD CONSTRAINT "finance_v54_risk_alerts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v54_risk_indicators'::regclass AND conname='finance_v54_risk_indicators_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v54_risk_indicators ADD CONSTRAINT "finance_v54_risk_indicators_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_invoice_items'::regclass AND conname='finance_v55_invoice_items_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v55_invoice_items ADD CONSTRAINT "finance_v55_invoice_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_invoices'::regclass AND conname='finance_v55_invoices_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v55_invoices ADD CONSTRAINT "finance_v55_invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_payment_requests'::regclass AND conname='finance_v55_payment_requests_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v55_payment_requests ADD CONSTRAINT "finance_v55_payment_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_payment_results'::regclass AND conname='finance_v55_payment_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v55_payment_results ADD CONSTRAINT "finance_v55_payment_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_reconciliation_results'::regclass AND conname='finance_v55_reconciliation_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v55_reconciliation_results ADD CONSTRAINT "finance_v55_reconciliation_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v55_reconciliation_rules'::regclass AND conname='finance_v55_reconciliation_rules_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v55_reconciliation_rules ADD CONSTRAINT "finance_v55_reconciliation_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_brackets'::regclass AND conname='finance_v56_tax_brackets_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v56_tax_brackets ADD CONSTRAINT "finance_v56_tax_brackets_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_forms'::regclass AND conname='finance_v56_tax_forms_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v56_tax_forms ADD CONSTRAINT "finance_v56_tax_forms_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_lines'::regclass AND conname='finance_v56_tax_lines_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v56_tax_lines ADD CONSTRAINT "finance_v56_tax_lines_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_plans'::regclass AND conname='finance_v56_tax_plans_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v56_tax_plans ADD CONSTRAINT "finance_v56_tax_plans_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_rates'::regclass AND conname='finance_v56_tax_rates_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v56_tax_rates ADD CONSTRAINT "finance_v56_tax_rates_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v56_tax_suggestions'::regclass AND conname='finance_v56_tax_suggestions_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v56_tax_suggestions ADD CONSTRAINT "finance_v56_tax_suggestions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_analysis_dimensions'::regclass AND conname='finance_v57_analysis_dimensions_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v57_analysis_dimensions ADD CONSTRAINT "finance_v57_analysis_dimensions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_analysis_results'::regclass AND conname='finance_v57_analysis_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v57_analysis_results ADD CONSTRAINT "finance_v57_analysis_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_forecast_models'::regclass AND conname='finance_v57_forecast_models_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v57_forecast_models ADD CONSTRAINT "finance_v57_forecast_models_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_generated_reports'::regclass AND conname='finance_v57_generated_reports_template_id_fkey') THEN
        ALTER TABLE finance.finance_v57_generated_reports ADD CONSTRAINT "finance_v57_generated_reports_template_id_fkey" FOREIGN KEY (template_id) REFERENCES finance.finance_v57_report_templates(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_generated_reports'::regclass AND conname='finance_v57_generated_reports_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v57_generated_reports ADD CONSTRAINT "finance_v57_generated_reports_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_insights'::regclass AND conname='finance_v57_insights_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v57_insights ADD CONSTRAINT "finance_v57_insights_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v57_report_templates'::regclass AND conname='finance_v57_report_templates_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v57_report_templates ADD CONSTRAINT "finance_v57_report_templates_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_cash_pools'::regclass AND conname='finance_v58_cash_pools_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v58_cash_pools ADD CONSTRAINT "finance_v58_cash_pools_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_forecast_results'::regclass AND conname='finance_v58_forecast_results_scenario_id_fkey') THEN
        ALTER TABLE finance.finance_v58_forecast_results ADD CONSTRAINT "finance_v58_forecast_results_scenario_id_fkey" FOREIGN KEY (scenario_id) REFERENCES finance.finance_v58_forecast_scenarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_forecast_results'::regclass AND conname='finance_v58_forecast_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v58_forecast_results ADD CONSTRAINT "finance_v58_forecast_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_forecast_scenarios'::regclass AND conname='finance_v58_forecast_scenarios_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v58_forecast_scenarios ADD CONSTRAINT "finance_v58_forecast_scenarios_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_liquidity_targets'::regclass AND conname='finance_v58_liquidity_targets_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v58_liquidity_targets ADD CONSTRAINT "finance_v58_liquidity_targets_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_optimization_results'::regclass AND conname='finance_v58_optimization_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v58_optimization_results ADD CONSTRAINT "finance_v58_optimization_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_pool_allocations'::regclass AND conname='finance_v58_pool_allocations_pool_id_fkey') THEN
        ALTER TABLE finance.finance_v58_pool_allocations ADD CONSTRAINT "finance_v58_pool_allocations_pool_id_fkey" FOREIGN KEY (pool_id) REFERENCES finance.finance_v58_cash_pools(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_pool_allocations'::regclass AND conname='finance_v58_pool_allocations_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v58_pool_allocations ADD CONSTRAINT "finance_v58_pool_allocations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_pool_transfers'::regclass AND conname='finance_v58_pool_transfers_from_pool_fkey') THEN
        ALTER TABLE finance.finance_v58_pool_transfers ADD CONSTRAINT "finance_v58_pool_transfers_from_pool_fkey" FOREIGN KEY (from_pool) REFERENCES finance.finance_v58_cash_pools(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_pool_transfers'::regclass AND conname='finance_v58_pool_transfers_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v58_pool_transfers ADD CONSTRAINT "finance_v58_pool_transfers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v58_pool_transfers'::regclass AND conname='finance_v58_pool_transfers_to_pool_fkey') THEN
        ALTER TABLE finance.finance_v58_pool_transfers ADD CONSTRAINT "finance_v58_pool_transfers_to_pool_fkey" FOREIGN KEY (to_pool) REFERENCES finance.finance_v58_cash_pools(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_credit_profiles'::regclass AND conname='finance_v59_credit_profiles_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_credit_profiles ADD CONSTRAINT "finance_v59_credit_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_device_profiles'::regclass AND conname='finance_v59_device_profiles_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_device_profiles ADD CONSTRAINT "finance_v59_device_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_fraud_decisions'::regclass AND conname='finance_v59_fraud_decisions_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_fraud_decisions ADD CONSTRAINT "finance_v59_fraud_decisions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_fraud_rules'::regclass AND conname='finance_v59_fraud_rules_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_fraud_rules ADD CONSTRAINT "finance_v59_fraud_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_fraud_signals'::regclass AND conname='finance_v59_fraud_signals_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_fraud_signals ADD CONSTRAINT "finance_v59_fraud_signals_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_scoring_models'::regclass AND conname='finance_v59_scoring_models_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_scoring_models ADD CONSTRAINT "finance_v59_scoring_models_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_stress_results'::regclass AND conname='finance_v59_stress_results_scenario_id_fkey') THEN
        ALTER TABLE finance.finance_v59_stress_results ADD CONSTRAINT "finance_v59_stress_results_scenario_id_fkey" FOREIGN KEY (scenario_id) REFERENCES finance.finance_v59_stress_scenarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_stress_results'::regclass AND conname='finance_v59_stress_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_stress_results ADD CONSTRAINT "finance_v59_stress_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v59_stress_scenarios'::regclass AND conname='finance_v59_stress_scenarios_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v59_stress_scenarios ADD CONSTRAINT "finance_v59_stress_scenarios_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alert_channels'::regclass AND conname='finance_v60_alert_channels_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_alert_channels ADD CONSTRAINT "finance_v60_alert_channels_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alert_rules'::regclass AND conname='finance_v60_alert_rules_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_alert_rules ADD CONSTRAINT "finance_v60_alert_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alerts'::regclass AND conname='finance_v60_alerts_rule_id_fkey') THEN
        ALTER TABLE finance.finance_v60_alerts ADD CONSTRAINT "finance_v60_alerts_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES finance.finance_v60_alert_rules(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_alerts'::regclass AND conname='finance_v60_alerts_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_alerts ADD CONSTRAINT "finance_v60_alerts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_decision_results'::regclass AND conname='finance_v60_decision_results_scenario_id_fkey') THEN
        ALTER TABLE finance.finance_v60_decision_results ADD CONSTRAINT "finance_v60_decision_results_scenario_id_fkey" FOREIGN KEY (scenario_id) REFERENCES finance.finance_v60_decision_scenarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_decision_results'::regclass AND conname='finance_v60_decision_results_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_decision_results ADD CONSTRAINT "finance_v60_decision_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_decision_scenarios'::regclass AND conname='finance_v60_decision_scenarios_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_decision_scenarios ADD CONSTRAINT "finance_v60_decision_scenarios_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_dependencies'::regclass AND conname='finance_v60_schedule_dependencies_depends_on_fkey') THEN
        ALTER TABLE finance.finance_v60_schedule_dependencies ADD CONSTRAINT "finance_v60_schedule_dependencies_depends_on_fkey" FOREIGN KEY (depends_on) REFERENCES finance.finance_v60_schedule_tasks(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_dependencies'::regclass AND conname='finance_v60_schedule_dependencies_task_id_fkey') THEN
        ALTER TABLE finance.finance_v60_schedule_dependencies ADD CONSTRAINT "finance_v60_schedule_dependencies_task_id_fkey" FOREIGN KEY (task_id) REFERENCES finance.finance_v60_schedule_tasks(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_dependencies'::regclass AND conname='finance_v60_schedule_dependencies_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_schedule_dependencies ADD CONSTRAINT "finance_v60_schedule_dependencies_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_executions'::regclass AND conname='finance_v60_schedule_executions_task_id_fkey') THEN
        ALTER TABLE finance.finance_v60_schedule_executions ADD CONSTRAINT "finance_v60_schedule_executions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES finance.finance_v60_schedule_tasks(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_executions'::regclass AND conname='finance_v60_schedule_executions_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_schedule_executions ADD CONSTRAINT "finance_v60_schedule_executions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='finance.finance_v60_schedule_tasks'::regclass AND conname='finance_v60_schedule_tasks_tenant_id_fkey') THEN
        ALTER TABLE finance.finance_v60_schedule_tasks ADD CONSTRAINT "finance_v60_schedule_tasks_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;


ALTER TABLE finance.core_finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_vouchers FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_voucher_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_voucher_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_reconciliation_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_reconciliation_items FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_aux_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_aux_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_aux_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_aux_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_cash_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_cash_pools FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_pool_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_pool_allocations FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_pool_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_pool_transfers FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_forecast_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_forecast_scenarios FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_forecast_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_liquidity_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_liquidity_targets FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_optimization_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_forms FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_rates FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_brackets FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_suggestions FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_reconciliation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_reconciliation_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_reconciliation_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_invoice_items FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_payment_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_payment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_payment_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_signals FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_device_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_device_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_credit_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_scoring_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_scoring_models FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_stress_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_stress_scenarios FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_stress_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_stress_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_risk_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_risk_indicators FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_risk_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_fraud_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_fraud_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_fraud_scores FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_report_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_generated_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_analysis_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_analysis_dimensions FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_analysis_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_forecast_models FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_insights FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_decision_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_decision_scenarios FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_decision_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_decision_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alert_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alert_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alert_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_executions FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_dependencies FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_control_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_control_points FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_control_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_control_matrices FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_risk_assessments FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_compliance_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_compliance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_compliance_issues FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.reconciliation_settlement_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.reconciliation_settlement_links FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.difference_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.difference_adjustments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_accounts;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_accounts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_aux_accounts;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_aux_accounts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_aux_balances;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_aux_balances AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_ledger;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_ledger AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_periods;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_periods AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_reconciliation_items;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_reconciliation_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_reconciliation_sessions;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_reconciliation_sessions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_voucher_lines;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_voucher_lines AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.core_finance_vouchers;
CREATE POLICY "rls_tenant_isolation" ON finance.core_finance_vouchers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.difference_adjustments;
CREATE POLICY "rls_tenant_isolation" ON finance.difference_adjustments AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_compliance_issues;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_compliance_issues AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_compliance_reports;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_compliance_reports AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_control_matrices;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_control_matrices AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_control_points;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_control_points AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_risk_assessments;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_risk_assessments AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v54_fraud_rules;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v54_fraud_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v54_fraud_scores;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v54_fraud_scores AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v54_review_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v54_review_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v54_review_rules;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v54_review_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v54_review_workflows;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v54_review_workflows AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v54_risk_alerts;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v54_risk_alerts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v54_risk_indicators;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v54_risk_indicators AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v55_invoice_items;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v55_invoice_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v55_invoices;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v55_invoices AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v55_payment_requests;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v55_payment_requests AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v55_payment_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v55_payment_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v55_reconciliation_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v55_reconciliation_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v55_reconciliation_rules;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v55_reconciliation_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v56_tax_brackets;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v56_tax_brackets AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v56_tax_forms;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v56_tax_forms AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v56_tax_lines;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v56_tax_lines AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v56_tax_plans;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v56_tax_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v56_tax_rates;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v56_tax_rates AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v56_tax_suggestions;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v56_tax_suggestions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v57_analysis_dimensions;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v57_analysis_dimensions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v57_analysis_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v57_analysis_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v57_forecast_models;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v57_forecast_models AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v57_generated_reports;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v57_generated_reports AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v57_insights;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v57_insights AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v57_report_templates;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v57_report_templates AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v58_cash_pools;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v58_cash_pools AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v58_forecast_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v58_forecast_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v58_forecast_scenarios;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v58_forecast_scenarios AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v58_liquidity_targets;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v58_liquidity_targets AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v58_optimization_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v58_optimization_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v58_pool_allocations;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v58_pool_allocations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v58_pool_transfers;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v58_pool_transfers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_credit_profiles;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_credit_profiles AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_device_profiles;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_device_profiles AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_fraud_decisions;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_fraud_decisions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_fraud_rules;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_fraud_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_fraud_signals;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_fraud_signals AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_scoring_models;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_scoring_models AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_stress_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_stress_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v59_stress_scenarios;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v59_stress_scenarios AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_alert_channels;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_alert_channels AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_alert_rules;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_alert_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_alerts;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_alerts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_decision_results;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_decision_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_decision_scenarios;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_decision_scenarios AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_schedule_dependencies;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_schedule_dependencies AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_schedule_executions;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_schedule_executions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.finance_v60_schedule_tasks;
CREATE POLICY "rls_tenant_isolation" ON finance.finance_v60_schedule_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON finance.reconciliation_settlement_links;
CREATE POLICY "rls_tenant_isolation" ON finance.reconciliation_settlement_links AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

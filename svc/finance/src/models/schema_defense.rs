pub const SERVICE_SCHEMA: &str = "finance";

/// Finance 内部事件驱动快照表（plugin_finance schema）
pub const INTERNAL_TABLE_DEFS_PUBLIC: &[(&str, &[(&str, &str)])] = &[];

pub const INTERNAL_TABLE_DEFS_FINANCE: &[(&str, &[(&str, &str)])] = &[];

pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "core_finance_accounts",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("code", "VARCHAR(50) NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("parent_id", "UUID"),
            ("account_type", "account_type NOT NULL"),
            ("level", "INT NOT NULL DEFAULT 1"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("is_enabled", "BOOLEAN NOT NULL DEFAULT true"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ],
    ),
    (
        "core_finance_vouchers",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("voucher_no", "VARCHAR(50) NOT NULL"),
            ("voucher_date", "TIMESTAMP NOT NULL"),
            ("period", "VARCHAR(6) NOT NULL"),
            ("voucher_type", "voucher_type NOT NULL"),
            ("total_debit", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("total_credit", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("status", "voucher_status NOT NULL DEFAULT 'draft'"),
            ("description", "TEXT"),
            ("created_by", "VARCHAR(100) NOT NULL"),
            ("approved_by", "VARCHAR(100)"),
            ("posted_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_finance_voucher_lines",
        &[
            ("voucher_id", "UUID NOT NULL"),
            ("line_no", "INT NOT NULL"),
            ("account_id", "UUID NOT NULL"),
            ("account_code", "VARCHAR(50) NOT NULL"),
            ("account_name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("debit", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("credit", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("project_id", "UUID"),
            ("department_id", "UUID"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ],
    ),
    (
        "core_finance_ledger",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("account_id", "UUID NOT NULL"),
            ("account_code", "VARCHAR(50) NOT NULL"),
            ("account_name", "VARCHAR(255) NOT NULL"),
            ("voucher_id", "UUID NOT NULL"),
            ("voucher_no", "VARCHAR(50) NOT NULL"),
            ("voucher_date", "TIMESTAMP NOT NULL"),
            ("period", "VARCHAR(6) NOT NULL"),
            ("description", "TEXT"),
            ("debit", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("credit", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("balance", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_finance_periods",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("year", "INT NOT NULL"),
            ("month", "INT NOT NULL"),
            ("period_name", "VARCHAR(20) NOT NULL"),
            ("status", "period_status NOT NULL DEFAULT 'open'"),
            ("start_date", "TIMESTAMP NOT NULL"),
            ("end_date", "TIMESTAMP NOT NULL"),
            ("closed_at", "TIMESTAMP"),
            ("closed_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ],
    ),
    (
        "core_finance_approval_workflows",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("doc_type", "approval_doc_type NOT NULL"),
            ("doc_id", "UUID NOT NULL"),
            ("doc_no", "VARCHAR(100) NOT NULL"),
            ("status", "approval_status NOT NULL DEFAULT 'pending'"),
            ("submitted_by", "VARCHAR(100) NOT NULL"),
            (
                "submitted_at",
                "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("approved_by", "VARCHAR(100)"),
            ("approved_at", "TIMESTAMP"),
            ("rejected_by", "VARCHAR(100)"),
            ("rejected_at", "TIMESTAMP"),
            ("rejection_reason", "TEXT"),
            ("comment", "TEXT"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ],
    ),
    (
        "core_finance_reconciliation_sessions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("session_no", "VARCHAR(50) NOT NULL"),
            ("reco_type", "reconciliation_type NOT NULL"),
            ("period_start", "DATE NOT NULL"),
            ("period_end", "DATE NOT NULL"),
            ("bank_account_id", "UUID"),
            ("entity_id", "UUID"),
            ("status", "reconciliation_status NOT NULL DEFAULT 'pending'"),
            ("total_items", "INT NOT NULL DEFAULT 0"),
            ("matched_items", "INT NOT NULL DEFAULT 0"),
            ("unmatched_items", "INT NOT NULL DEFAULT 0"),
            ("diff_items", "INT NOT NULL DEFAULT 0"),
            ("created_by", "VARCHAR(100) NOT NULL"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("completed_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_finance_reconciliation_items",
        &[
            ("session_id", "UUID NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("source_type", "item_source NOT NULL"),
            ("transaction_date", "DATE NOT NULL"),
            ("amount", "NUMERIC(18,4) NOT NULL"),
            ("direction", "VARCHAR(10) NOT NULL"),
            ("counterparty_name", "VARCHAR(255)"),
            ("counterparty_account", "VARCHAR(100)"),
            ("reference_no", "VARCHAR(100)"),
            ("description", "TEXT"),
            ("match_status", "match_status NOT NULL DEFAULT 'unmatched'"),
            ("matched_item_id", "UUID"),
            ("diff_reason", "diff_reason"),
            ("diff_amount", "NUMERIC(18,4)"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ],
    ),
    (
        "core_finance_aux_accounts",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("aux_type", "aux_type NOT NULL"),
            ("code", "VARCHAR(50) NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("parent_id", "UUID"),
            ("level", "INT NOT NULL DEFAULT 1"),
            ("is_enabled", "BOOLEAN NOT NULL DEFAULT true"),
            ("description", "TEXT"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "core_finance_aux_balances",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("account_id", "UUID NOT NULL"),
            ("aux_type", "aux_type NOT NULL"),
            ("aux_id", "UUID NOT NULL"),
            ("period", "VARCHAR(6) NOT NULL"),
            ("debit_balance", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            ("credit_balance", "NUMERIC(18,4) NOT NULL DEFAULT 0"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v58_cash_pools",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("pool_type", "VARCHAR(20) NOT NULL DEFAULT 'physical'"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("balance", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("entities", "TEXT[] NOT NULL DEFAULT '{}'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v58_pool_allocations",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("pool_id", "UUID NOT NULL"),
            ("entity_id", "VARCHAR(100) NOT NULL"),
            ("amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("percentage", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            (
                "allocated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v58_pool_transfers",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("from_pool", "UUID NOT NULL"),
            ("to_pool", "UUID NOT NULL"),
            ("amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("reference", "VARCHAR(255) NOT NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v58_forecast_scenarios",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            (
                "scenario_type",
                "VARCHAR(30) NOT NULL DEFAULT 'medium_term'",
            ),
            ("horizon_days", "INT NOT NULL DEFAULT 90"),
            ("assumptions", "JSONB"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0.5"),
        ],
    ),
    (
        "finance_v58_forecast_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("scenario_id", "UUID NOT NULL"),
            ("date", "DATE NOT NULL"),
            ("inflow", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("outflow", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("net", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("closing_balance", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("confidence_interval", "JSONB"),
        ],
    ),
    (
        "finance_v58_liquidity_targets",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("entity_id", "VARCHAR(100) NOT NULL"),
            ("min_balance", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("max_balance", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("target_balance", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
        ],
    ),
    (
        "finance_v58_optimization_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("entity_id", "VARCHAR(100) NOT NULL"),
            ("recommended_actions", "JSONB"),
            ("projected_savings", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("risk_level", "VARCHAR(20) NOT NULL DEFAULT 'medium'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v56_tax_forms",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("form_type", "VARCHAR(30) NOT NULL DEFAULT 'vat'"),
            ("jurisdiction", "VARCHAR(100) NOT NULL DEFAULT 'CN'"),
            ("period_start", "TIMESTAMPTZ NOT NULL"),
            ("period_end", "TIMESTAMPTZ NOT NULL"),
            ("status", "VARCHAR(30) NOT NULL DEFAULT 'draft'"),
            ("total_tax_amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("filed_at", "TIMESTAMPTZ"),
            ("accepted_at", "TIMESTAMPTZ"),
            ("rejected_at", "TIMESTAMPTZ"),
            ("rejection_reason", "TEXT"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v56_tax_lines",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("form_id", "UUID NOT NULL"),
            ("line_no", "INTEGER NOT NULL"),
            ("description", "VARCHAR(500) NOT NULL"),
            ("taxable_amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("tax_rate", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("tax_amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "finance_v56_tax_rates",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("jurisdiction", "VARCHAR(100) NOT NULL DEFAULT 'CN'"),
            ("rate_type", "VARCHAR(30) NOT NULL DEFAULT 'vat'"),
            ("rate", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("effective_from", "TIMESTAMPTZ NOT NULL"),
            ("effective_to", "TIMESTAMPTZ"),
            ("description", "TEXT"),
        ],
    ),
    (
        "finance_v56_tax_brackets",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("rate_id", "UUID NOT NULL"),
            ("bracket_order", "INTEGER NOT NULL"),
            ("threshold_from", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("threshold_to", "DOUBLE PRECISION"),
            ("rate", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
        ],
    ),
    (
        "finance_v56_tax_plans",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("entity", "VARCHAR(255) NOT NULL"),
            ("period", "VARCHAR(50) NOT NULL"),
            (
                "strategy",
                "VARCHAR(50) NOT NULL DEFAULT 'legal_optimization'",
            ),
            ("projected_savings", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("risk_level", "VARCHAR(20) NOT NULL DEFAULT 'low'"),
            ("status", "VARCHAR(30) NOT NULL DEFAULT 'draft'"),
            ("approved_at", "TIMESTAMPTZ"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v56_tax_suggestions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("plan_id", "UUID NOT NULL"),
            ("category", "VARCHAR(50) NOT NULL"),
            ("description", "TEXT NOT NULL"),
            ("estimated_savings", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("action_items", "TEXT[]"),
        ],
    ),
    (
        "finance_v55_reconciliation_rules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("match_type", "VARCHAR(30) NOT NULL DEFAULT 'exact'"),
            ("tolerance", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT true"),
        ],
    ),
    (
        "finance_v55_reconciliation_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("bank_transaction_id", "VARCHAR(100) NOT NULL"),
            ("system_record_id", "VARCHAR(100) NOT NULL"),
            ("match_status", "VARCHAR(30) NOT NULL DEFAULT 'unmatched'"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("difference_amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("notes", "TEXT"),
            ("approved", "BOOLEAN NOT NULL DEFAULT false"),
            ("disputed", "BOOLEAN NOT NULL DEFAULT false"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v55_invoices",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("number", "VARCHAR(100) NOT NULL"),
            ("vendor", "VARCHAR(255) NOT NULL"),
            ("invoice_date", "TIMESTAMPTZ NOT NULL"),
            ("total_amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("tax_amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(30) NOT NULL DEFAULT 'pending'"),
            ("purchase_order_id", "VARCHAR(100)"),
            ("recognized_at", "TIMESTAMPTZ"),
            ("validated_at", "TIMESTAMPTZ"),
            ("posted_at", "TIMESTAMPTZ"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v55_invoice_items",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("invoice_id", "UUID NOT NULL"),
            ("description", "VARCHAR(500) NOT NULL"),
            ("quantity", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("unit_price", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("tax_rate", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
        ],
    ),
    (
        "finance_v55_payment_requests",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("amount", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("from_account", "VARCHAR(100) NOT NULL"),
            ("to_account", "VARCHAR(100) NOT NULL"),
            ("method", "VARCHAR(30) NOT NULL DEFAULT 'bank_transfer'"),
            ("reference", "VARCHAR(255) NOT NULL"),
            ("scheduled_at", "TIMESTAMPTZ"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v55_payment_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("request_id", "UUID NOT NULL"),
            ("status", "VARCHAR(30) NOT NULL DEFAULT 'pending'"),
            ("transaction_ref", "VARCHAR(255)"),
            ("fee", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("processed_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "finance_v59_fraud_signals",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("signal_type", "VARCHAR(30) NOT NULL"),
            ("score", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("metadata", "JSONB"),
            (
                "detected_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v59_fraud_decisions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("transaction_id", "VARCHAR(100) NOT NULL"),
            ("risk_level", "VARCHAR(20) NOT NULL DEFAULT 'low'"),
            ("action", "VARCHAR(20) NOT NULL DEFAULT 'approve'"),
            ("reason", "TEXT NOT NULL"),
            ("signals", "JSONB"),
            (
                "decided_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v59_device_profiles",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("device_id", "VARCHAR(255) NOT NULL"),
            ("fingerprint", "VARCHAR(255) NOT NULL"),
            ("trust_score", "DOUBLE PRECISION NOT NULL DEFAULT 1.0"),
            (
                "last_seen",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("ip_history", "JSONB"),
        ],
    ),
    (
        "finance_v59_credit_profiles",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("entity_id", "VARCHAR(100) NOT NULL"),
            ("score", "INT NOT NULL DEFAULT 300"),
            ("grade", "VARCHAR(5) NOT NULL DEFAULT 'D'"),
            ("factors", "JSONB"),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v59_scoring_models",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("version", "VARCHAR(50) NOT NULL"),
            ("features", "JSONB"),
            ("weights", "JSONB"),
            ("accuracy", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v59_stress_scenarios",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("scenario_type", "VARCHAR(30) NOT NULL DEFAULT 'market'"),
            ("severity", "VARCHAR(20) NOT NULL DEFAULT 'medium'"),
            ("assumptions", "JSONB"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v59_stress_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("scenario_id", "UUID NOT NULL"),
            ("entity_id", "VARCHAR(100) NOT NULL"),
            ("impact_value", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("capital_adequacy", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("liquidity_ratio", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("pass_fail", "BOOLEAN NOT NULL DEFAULT true"),
            ("details", "JSONB"),
        ],
    ),
    (
        "finance_v59_fraud_rules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("signal_type", "VARCHAR(30) NOT NULL"),
            ("threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0.5"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT true"),
        ],
    ),
    (
        "finance_v54_risk_indicators",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("category", "VARCHAR(50) NOT NULL"),
            ("level", "VARCHAR(20) NOT NULL DEFAULT 'low'"),
            ("current_value", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("unit", "VARCHAR(20) NOT NULL DEFAULT ''"),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v54_risk_alerts",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("indicator_id", "UUID NOT NULL"),
            ("level", "VARCHAR(20) NOT NULL"),
            ("message", "TEXT NOT NULL"),
            ("entity", "VARCHAR(255) NOT NULL"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("acknowledged", "BOOLEAN NOT NULL DEFAULT false"),
            ("resolved", "BOOLEAN NOT NULL DEFAULT false"),
        ],
    ),
    (
        "finance_v54_fraud_rules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("rule_type", "VARCHAR(50) NOT NULL"),
            ("condition", "TEXT NOT NULL"),
            ("threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT true"),
        ],
    ),
    (
        "finance_v54_fraud_scores",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("transaction_id", "VARCHAR(100) NOT NULL"),
            ("score", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("triggered_rules", "JSONB NOT NULL DEFAULT '[]'"),
            ("risk_level", "VARCHAR(20) NOT NULL"),
            ("recommendation", "VARCHAR(20) NOT NULL"),
            (
                "scored_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v54_review_rules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("regulation", "VARCHAR(50) NOT NULL"),
            ("category", "VARCHAR(100) NOT NULL"),
            ("severity", "VARCHAR(20) NOT NULL DEFAULT 'low'"),
            ("action", "VARCHAR(20) NOT NULL DEFAULT 'approve'"),
        ],
    ),
    (
        "finance_v54_review_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("entity_type", "VARCHAR(50) NOT NULL"),
            ("entity_id", "VARCHAR(100) NOT NULL"),
            ("rule_id", "UUID NOT NULL"),
            ("passed", "BOOLEAN NOT NULL DEFAULT true"),
            ("details", "JSONB NOT NULL DEFAULT '{}'"),
            (
                "reviewed_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("reviewer", "VARCHAR(100) NOT NULL"),
        ],
    ),
    (
        "finance_v54_review_workflows",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("entity_type", "VARCHAR(50) NOT NULL"),
            ("entity_id", "VARCHAR(100) NOT NULL"),
            ("status", "VARCHAR(30) NOT NULL DEFAULT 'pending'"),
            ("assigned_to", "VARCHAR(100)"),
            ("steps", "JSONB NOT NULL DEFAULT '[]'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v57_report_templates",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            (
                "report_type",
                "VARCHAR(50) NOT NULL DEFAULT 'balance_sheet'",
            ),
            ("layout", "VARCHAR(20) NOT NULL DEFAULT 'json'"),
            ("parameters", "JSONB"),
            ("schedule", "VARCHAR(20)"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v57_generated_reports",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("template_id", "UUID"),
            ("period_start", "TIMESTAMPTZ NOT NULL"),
            ("period_end", "TIMESTAMPTZ NOT NULL"),
            ("data", "JSONB"),
            (
                "generated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("format", "VARCHAR(20) NOT NULL DEFAULT 'json'"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "finance_v57_analysis_dimensions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(50) NOT NULL"),
            ("hierarchy", "TEXT[]"),
            ("filters", "JSONB"),
        ],
    ),
    (
        "finance_v57_analysis_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("dimensions", "TEXT[] NOT NULL"),
            ("measures", "TEXT[] NOT NULL"),
            ("data", "JSONB"),
            ("aggregations", "JSONB"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v57_forecast_models",
        &[
            ("tenant_id", "UUID NOT NULL"),
            (
                "model_type",
                "VARCHAR(50) NOT NULL DEFAULT 'linear_regression'",
            ),
            ("target_metric", "VARCHAR(100) NOT NULL"),
            ("features", "TEXT[]"),
            ("accuracy", "DOUBLE PRECISION"),
            ("trained_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "finance_v57_insights",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("insight_type", "VARCHAR(30) NOT NULL DEFAULT 'trend'"),
            ("description", "TEXT NOT NULL"),
            ("confidence", "DOUBLE PRECISION"),
            ("data", "JSONB"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v60_decision_scenarios",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("scenario_type", "VARCHAR(30) NOT NULL DEFAULT 'investment'"),
            ("parameters", "JSONB"),
            ("objectives", "JSONB"),
            ("constraints", "JSONB"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v60_decision_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("scenario_id", "UUID NOT NULL"),
            ("recommended_action", "VARCHAR(500) NOT NULL"),
            ("alternatives", "JSONB"),
            ("expected_impact", "JSONB"),
            ("risk_level", "VARCHAR(20) NOT NULL DEFAULT 'medium'"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            (
                "decided_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v60_alert_rules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("metric_name", "VARCHAR(100) NOT NULL"),
            ("condition", "VARCHAR(20) NOT NULL DEFAULT 'above'"),
            ("threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("severity", "VARCHAR(20) NOT NULL DEFAULT 'medium'"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT true"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v60_alerts",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("rule_id", "UUID NOT NULL"),
            ("metric_name", "VARCHAR(100) NOT NULL"),
            ("current_value", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("severity", "VARCHAR(20) NOT NULL DEFAULT 'medium'"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("acknowledged_at", "TIMESTAMPTZ"),
            ("resolved_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "finance_v60_alert_channels",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("channel_type", "VARCHAR(30) NOT NULL DEFAULT 'email'"),
            ("config", "JSONB"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT true"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v60_schedule_tasks",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("task_type", "VARCHAR(30) NOT NULL DEFAULT 'recurring'"),
            ("cron_expression", "VARCHAR(100)"),
            ("action", "JSONB"),
            ("priority", "INT NOT NULL DEFAULT 5"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
        ],
    ),
    (
        "finance_v60_schedule_executions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("task_id", "UUID NOT NULL"),
            ("scheduled_at", "TIMESTAMPTZ"),
            ("started_at", "TIMESTAMPTZ"),
            ("completed_at", "TIMESTAMPTZ"),
            ("duration_ms", "DOUBLE PRECISION"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("output", "JSONB"),
        ],
    ),
    (
        "finance_v60_schedule_dependencies",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("task_id", "UUID NOT NULL"),
            ("depends_on", "UUID NOT NULL"),
            ("condition", "JSONB"),
        ],
    ),
    (
        "finance_control_points",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("code", "VARCHAR(50) NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT NOT NULL"),
            ("category", "VARCHAR(30) NOT NULL"),
            ("risk_level", "VARCHAR(30) NOT NULL"),
            ("control_type", "VARCHAR(30) NOT NULL"),
            ("frequency", "VARCHAR(30) NOT NULL"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_by", "VARCHAR(100) NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "finance_control_matrices",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("period", "VARCHAR(20) NOT NULL"),
            ("controls", "JSONB NOT NULL DEFAULT '[]'::jsonb"),
            ("total_controls", "BIGINT NOT NULL DEFAULT 0"),
            ("effective_controls", "BIGINT NOT NULL DEFAULT 0"),
            ("compliance_rate", "DOUBLE PRECISION NOT NULL DEFAULT 0.0"),
            ("created_by", "VARCHAR(100) NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "finance_risk_assessments",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("control_point_id", "UUID NOT NULL"),
            ("likelihood", "VARCHAR(20) NOT NULL"),
            ("impact", "VARCHAR(20) NOT NULL"),
            ("risk_score", "INT NOT NULL"),
            ("risk_level", "VARCHAR(20) NOT NULL"),
            ("mitigation_strategy", "TEXT NOT NULL"),
            ("residual_risk", "VARCHAR(20) NOT NULL"),
            ("assessed_by", "VARCHAR(100) NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "finance_compliance_reports",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("report_type", "VARCHAR(30) NOT NULL"),
            ("period_start", "TIMESTAMPTZ NOT NULL"),
            ("period_end", "TIMESTAMPTZ NOT NULL"),
            ("generated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("controls_checked", "BIGINT NOT NULL DEFAULT 0"),
            ("issues_found", "BIGINT NOT NULL DEFAULT 0"),
            ("risk_assessments", "JSONB NOT NULL DEFAULT '[]'::jsonb"),
            ("executive_summary", "TEXT NOT NULL"),
            ("recommendations", "JSONB NOT NULL DEFAULT '[]'::jsonb"),
            ("created_by", "VARCHAR(100) NOT NULL"),
        ],
    ),
    (
        "finance_compliance_issues",
        &[
            ("report_id", "UUID NOT NULL"),
            ("severity", "VARCHAR(20) NOT NULL"),
            ("category", "VARCHAR(50) NOT NULL"),
            ("control_point_code", "VARCHAR(50) NOT NULL"),
            ("description", "TEXT NOT NULL"),
            ("evidence", "JSONB NOT NULL DEFAULT '{}'::jsonb"),
            ("impact_assessment", "TEXT NOT NULL"),
        ],
    ),
    (
        "reconciliation_settlement_links",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("reconciliation_id", "UUID NOT NULL"),
            ("settlement_id", "UUID NOT NULL"),
            ("link_type", "VARCHAR(20) NOT NULL"),
            ("amount", "NUMERIC(15, 2)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'linked'"),
            ("remark", "TEXT"),
            ("created_by", "UUID NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "settlement_center_dashboards",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(100) NOT NULL"),
            ("config", "JSONB NOT NULL DEFAULT '{}'::jsonb"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_by", "UUID NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "difference_adjustments",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("source_type", "VARCHAR(20) NOT NULL"),
            ("source_id", "UUID NOT NULL"),
            ("difference_type", "VARCHAR(20) NOT NULL"),
            ("difference_amount", "NUMERIC(15, 2) NOT NULL"),
            ("reason", "VARCHAR(255) NOT NULL"),
            ("adjustment_amount", "NUMERIC(15, 2)"),
            ("adjustment_type", "VARCHAR(20)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("approved_by", "UUID"),
            ("approved_at", "TIMESTAMPTZ"),
            ("remark", "TEXT"),
            ("created_by", "UUID NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    // 财务部门预算（与 pm.budgets 项目预算同名异义；原依赖 public.budgets 遗留，收敛后自建）
    (
        "budgets",
        &[
            ("tenant_id", "UUID"),
            ("department_id", "UUID"),
            ("budget_type", "VARCHAR(50)"),
            ("fiscal_year", "VARCHAR(10)"),
            ("total_budget", "NUMERIC(15,2) NOT NULL DEFAULT 0"),
            ("used_amount", "NUMERIC(15,2) NOT NULL DEFAULT 0"),
            ("remaining_amount", "NUMERIC(15,2) NOT NULL DEFAULT 0"),
            ("usage_rate", "NUMERIC(5,2) NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    // 以下 4 张为 finance 活跃业务表（支付/对账/结算/来源快照），此前误建 public，归位自建
    (
        "core_finance_payments",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("payment_no", "VARCHAR NOT NULL"),
            ("supplier_id", "UUID"),
            ("supplier_name", "VARCHAR"),
            ("payment_method", "VARCHAR NOT NULL"),
            ("bank_account_id", "UUID"),
            ("bank_name", "VARCHAR"),
            ("bank_account_no", "VARCHAR"),
            ("total_amount", "NUMERIC NOT NULL DEFAULT 0"),
            ("currency", "VARCHAR NOT NULL DEFAULT 'CNY'"),
            ("payment_date", "DATE"),
            ("actual_payment_date", "DATE"),
            ("status", "VARCHAR NOT NULL DEFAULT 'draft'"),
            ("remark", "TEXT"),
            ("voucher_id", "UUID"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("bank_transaction_no", "VARCHAR"),
            ("executed_by", "VARCHAR"),
            ("executed_at", "TIMESTAMPTZ"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("exchange_rate", "NUMERIC"),
            ("attachment_url", "TEXT"),
            ("approved_by", "VARCHAR"),
        ],
    ),
    (
        "reconciliation_snapshots",
        &[
            ("created_at", "TIMESTAMPTZ"),
            ("created_by", "VARCHAR"),
            ("description", "TEXT"),
            ("entity_id", "UUID"),
            ("entity_type", "VARCHAR"),
            ("period", "VARCHAR"),
            ("recon_code", "VARCHAR"),
            ("recon_name", "VARCHAR"),
            ("recon_type", "VARCHAR"),
            ("status", "VARCHAR"),
            ("synced_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("updated_at", "TIMESTAMPTZ"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "settlement_snapshots",
        &[
            ("amount", "NUMERIC"),
            ("created_at", "TIMESTAMPTZ"),
            ("created_by", "VARCHAR"),
            ("project_id", "UUID"),
            ("remarks", "VARCHAR"),
            ("settlement_date", "DATE"),
            ("settlement_no", "VARCHAR"),
            ("settlement_type", "VARCHAR"),
            ("status", "VARCHAR"),
            ("synced_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("updated_at", "TIMESTAMPTZ"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "source_amount_snapshots",
        &[
            ("payable_amount", "NUMERIC"),
            ("source_id", "UUID"),
            ("source_type", "VARCHAR"),
            ("updated_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    // 支付链 4 张（payment_items/workflow/approval_config/approval_nodes）此前无前缀 SQL 落 public，归位自建
    (
        "core_finance_payment_items",
        &[
            ("payment_id", "UUID NOT NULL"),
            ("line_no", "INTEGER"),
            ("invoice_id", "UUID"),
            ("invoice_no", "VARCHAR"),
            ("payable_amount", "NUMERIC NOT NULL DEFAULT 0"),
            ("payment_amount", "NUMERIC NOT NULL DEFAULT 0"),
            ("remark", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("payable_id", "UUID"),
            ("write_off_amount", "NUMERIC DEFAULT 0"),
            ("write_off_status", "VARCHAR DEFAULT 'pending'"),
            ("write_off_date", "TIMESTAMP"),
            ("write_off_by", "VARCHAR"),
            ("remaining_amount", "NUMERIC DEFAULT 0"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "core_finance_payment_workflow",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("payment_id", "UUID NOT NULL"),
            ("workflow_id", "UUID"),
            ("workflow_instance_id", "UUID"),
            ("current_approver", "VARCHAR"),
            ("current_level", "INTEGER DEFAULT 1"),
            ("status", "VARCHAR DEFAULT 'pending'"),
            ("approval_history", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "core_finance_payment_approval_config",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR NOT NULL"),
            ("description", "TEXT"),
            ("amount_threshold", "NUMERIC NOT NULL DEFAULT 0"),
            ("max_amount", "NUMERIC"),
            ("workflow_id", "UUID"),
            ("approval_levels", "INTEGER DEFAULT 1"),
            ("node_config", "JSONB"),
            ("priority", "INTEGER DEFAULT 0"),
            ("is_active", "BOOLEAN DEFAULT true"),
            ("created_by", "VARCHAR NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "core_finance_approval_nodes",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("config_id", "UUID NOT NULL"),
            ("node_level", "INTEGER NOT NULL"),
            ("node_name", "VARCHAR NOT NULL"),
            ("approver_type", "VARCHAR NOT NULL DEFAULT 'role'"),
            ("approver_role", "VARCHAR"),
            ("approver_users", "TEXT[]"),
            ("approval_type", "VARCHAR DEFAULT 'single'"),
            ("timeout_hours", "INTEGER DEFAULT 48"),
            ("notify_users", "TEXT[]"),
            ("conditions", "JSONB"),
            ("is_active", "BOOLEAN DEFAULT true"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    // 简版会计科目（accounting_subjects.rs 活跃 CRUD，与 core_finance_accounts 异义；原 public 表缺 organization_id 导致写入失败，归位并补列）
    (
        "accounting_subjects",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("code", "VARCHAR NOT NULL"),
            ("name", "VARCHAR NOT NULL"),
            ("category", "VARCHAR"),
            ("level", "INTEGER"),
            ("parent_code", "VARCHAR"),
            ("description", "TEXT"),
            ("is_cash_flow", "BOOLEAN"),
            ("status", "VARCHAR"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
];

use sqlx::PgPool;
use std::collections::BTreeSet;
use topems_shared_boundary::only_own_schema_query;

async fn add_column_if_missing(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), sqlx::Error> {
    let qualified = match schema {
        Some(s) => format!(r#""{}"."{}""#, s, table),
        None => format!(r#""{}""#, table),
    };
    let ddl = format!(
        r#"ALTER TABLE {} ADD COLUMN IF NOT EXISTS "{}" {}"#,
        qualified, column, definition
    );
    sqlx::query(&ddl).execute(pool).await?;
    Ok(())
}

async fn ensure_table_columns(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    columns: &[(&str, &str)],
) -> Result<usize, sqlx::Error> {
    let mut n = 0usize;
    for (col, def) in columns {
        add_column_if_missing(pool, schema, table, col, def).await?;
        n += 1;
    }
    Ok(n)
}

async fn verify_table_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
    expected: &[&str],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(String,)> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        "#
    ))
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await?;
    let actual: BTreeSet<&str> = rows.iter().map(|(c,)| c.as_str()).collect();
    let mut missing = Vec::new();
    for col in expected {
        if !actual.contains(col) {
            missing.push(*col);
        }
    }
    if !missing.is_empty() {
        tracing::warn!(
            "[finance schema 自检] {}.{} 仍缺失 {} 列: {:?}",
            schema,
            table,
            missing.len(),
            missing
        );
    }
    Ok(())
}

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    let schemas: &[(&str, &[(&str, &[(&str, &str)])])] = &[
        (SERVICE_SCHEMA, TABLE_DEFS),
        ("public", INTERNAL_TABLE_DEFS_PUBLIC),
        ("finance", INTERNAL_TABLE_DEFS_FINANCE),
    ];

    for (schema, defs) in schemas {
        for (tbl, _cols_arr) in *defs {
            let ddl = format!(
                "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (\
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid()\
                )",
                schema, tbl
            );
            sqlx::query(&ddl).execute(pool).await?;
        }
    }

    let mut tables_done = 0usize;
    let mut cols_added = 0usize;
    for (schema, defs) in schemas {
        for (tbl, cols_arr) in *defs {
            let n = ensure_table_columns(pool, Some(schema), tbl, cols_arr).await?;
            tables_done += 1;
            cols_added += n;
        }
    }
    tracing::info!(
        "[finance 增量迁移] 完成 {} 张表 / {} 列 ADD COLUMN IF NOT EXISTS 检查",
        tables_done,
        cols_added
    );

    let mut verified = 0usize;
    for (schema, defs) in schemas {
        for (tbl, cols_arr) in *defs {
            let mut expected = vec!["id"];
            expected.extend(cols_arr.iter().map(|(c, _)| *c));
            verify_table_columns(pool, schema, tbl, &expected).await?;
            verified += 1;
        }
    }
    tracing::info!("[finance schema 自检] 完成 {} 张表结构一致性校验", verified);
    Ok(())
}

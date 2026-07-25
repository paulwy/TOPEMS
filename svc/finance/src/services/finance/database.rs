use sqlx::postgres::PgPool;

use topems_shared::error::TopemsError;

pub async fn init_database(pool: &PgPool) -> Result<(), TopemsError> {
    let create_types = r#"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
                CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense', 'cost');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_type') THEN
                CREATE TYPE voucher_type AS ENUM ('general', 'payment', 'receipt', 'transfer');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_status') THEN
                CREATE TYPE voucher_status AS ENUM ('draft', 'submitted', 'approved', 'posted', 'rejected', 'cancelled');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_status') THEN
                CREATE TYPE period_status AS ENUM ('open', 'closing', 'closed');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_doc_type') THEN
                CREATE TYPE approval_doc_type AS ENUM ('voucher', 'consolidation_report', 'financial_statement', 'journal_entry');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
                CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
            END IF;
        END $$;
    "#;
    sqlx::query(create_types).execute(pool).await?;

    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS core_finance_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            parent_id UUID REFERENCES core_finance_accounts(id),
            account_type account_type NOT NULL,
            level INT NOT NULL DEFAULT 1,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            description TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_account_code UNIQUE (tenant_id, code)
        )",
        "CREATE INDEX IF NOT EXISTS idx_account_tenant_id ON core_finance_accounts(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_account_parent_id ON core_finance_accounts(parent_id)",
        "CREATE TABLE IF NOT EXISTS core_finance_vouchers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            voucher_no VARCHAR(50) NOT NULL,
            voucher_date TIMESTAMP NOT NULL,
            period VARCHAR(6) NOT NULL,
            voucher_type voucher_type NOT NULL,
            total_debit NUMERIC(18,4) NOT NULL DEFAULT 0,
            total_credit NUMERIC(18,4) NOT NULL DEFAULT 0,
            status voucher_status NOT NULL DEFAULT 'draft',
            description TEXT,
            created_by VARCHAR(100) NOT NULL,
            approved_by VARCHAR(100),
            posted_by VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_voucher_tenant_id ON core_finance_vouchers(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_voucher_period ON core_finance_vouchers(period)",
        "CREATE INDEX IF NOT EXISTS idx_voucher_status ON core_finance_vouchers(status)",
        "CREATE TABLE IF NOT EXISTS core_finance_voucher_lines (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id) ON DELETE CASCADE,
            line_no INT NOT NULL,
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            account_code VARCHAR(50) NOT NULL,
            account_name VARCHAR(255) NOT NULL,
            description TEXT,
            debit NUMERIC(18,4) NOT NULL DEFAULT 0,
            credit NUMERIC(18,4) NOT NULL DEFAULT 0,
            project_id UUID,
            department_id UUID,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_voucher_line_voucher_id ON core_finance_voucher_lines(voucher_id)",
        "CREATE INDEX IF NOT EXISTS idx_voucher_line_account_id ON core_finance_voucher_lines(account_id)",
        "CREATE TABLE IF NOT EXISTS core_finance_ledger (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            account_code VARCHAR(50) NOT NULL,
            account_name VARCHAR(255) NOT NULL,
            voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id),
            voucher_no VARCHAR(50) NOT NULL,
            voucher_date TIMESTAMP NOT NULL,
            period VARCHAR(6) NOT NULL,
            description TEXT,
            debit NUMERIC(18,4) NOT NULL DEFAULT 0,
            credit NUMERIC(18,4) NOT NULL DEFAULT 0,
            balance NUMERIC(18,4) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_ledger_tenant_id ON core_finance_ledger(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON core_finance_ledger(account_id)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_period ON core_finance_ledger(period)",
        "CREATE TABLE IF NOT EXISTS core_finance_periods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            year INT NOT NULL,
            month INT NOT NULL,
            period_name VARCHAR(20) NOT NULL,
            status period_status NOT NULL DEFAULT 'open',
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            closed_at TIMESTAMP,
            closed_by VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_period UNIQUE (tenant_id, year, month)
        )",
        "CREATE INDEX IF NOT EXISTS idx_period_tenant_id ON core_finance_periods(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_period_status ON core_finance_periods(status)",
        "CREATE TABLE IF NOT EXISTS core_finance_approval_workflows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            doc_type approval_doc_type NOT NULL,
            doc_id UUID NOT NULL,
            doc_no VARCHAR(100) NOT NULL,
            status approval_status NOT NULL DEFAULT 'pending',
            submitted_by VARCHAR(100) NOT NULL,
            submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            approved_by VARCHAR(100),
            approved_at TIMESTAMP,
            rejected_by VARCHAR(100),
            rejected_at TIMESTAMP,
            rejection_reason TEXT,
            comment TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_doc_approval UNIQUE (tenant_id, doc_type, doc_id)
        )",
        "CREATE INDEX IF NOT EXISTS idx_approval_tenant_id ON core_finance_approval_workflows(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_approval_doc ON core_finance_approval_workflows(doc_type, doc_id)",
        "CREATE INDEX IF NOT EXISTS idx_approval_status ON core_finance_approval_workflows(status)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }

    init_reconciliation_tables(pool).await?;

    crate::modules::risk_v54::init_risk_v54_tables(pool).await?;

    crate::modules::settlement_v55::init_settlement_v55_tables(pool).await?;

    crate::modules::tax_v56::init_tax_v56_tables(pool).await?;

    crate::modules::reports_v57::init_reports_v57_tables(pool).await?;

    crate::modules::treasury_v58::init_treasury_v58_tables(pool).await?;

    crate::modules::risk_v59::init_risk_v59_tables(pool).await?;

    crate::modules::decision_v60::init_decision_v60_tables(pool).await?;

    Ok(())
}

pub async fn init_reconciliation_tables(pool: &PgPool) -> Result<(), TopemsError> {
    let create_types = r#"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_type') THEN
                CREATE TYPE reconciliation_type AS ENUM ('bank', 'receivable', 'payable');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
                CREATE TYPE reconciliation_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status') THEN
                CREATE TYPE match_status AS ENUM ('unmatched', 'matched', 'diff', 'manual');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'diff_reason') THEN
                CREATE TYPE diff_reason AS ENUM ('time_diff', 'amount_diff', 'duplicate', 'missing', 'unknown', 'fee', 'exchange_rate');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_source') THEN
                CREATE TYPE item_source AS ENUM ('bank', 'erp');
            END IF;
        END $$;
    "#;
    sqlx::query(create_types).execute(pool).await?;

    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS core_finance_reconciliation_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            session_no VARCHAR(50) NOT NULL,
            reco_type reconciliation_type NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            bank_account_id UUID,
            entity_id UUID,
            status reconciliation_status NOT NULL DEFAULT 'pending',
            total_items INT NOT NULL DEFAULT 0,
            matched_items INT NOT NULL DEFAULT 0,
            unmatched_items INT NOT NULL DEFAULT 0,
            diff_items INT NOT NULL DEFAULT 0,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            CONSTRAINT unique_session_no UNIQUE (tenant_id, session_no)
        )",
        "CREATE INDEX IF NOT EXISTS idx_reco_session_tenant_id ON core_finance_reconciliation_sessions(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_reco_session_type ON core_finance_reconciliation_sessions(reco_type)",
        "CREATE INDEX IF NOT EXISTS idx_reco_session_status ON core_finance_reconciliation_sessions(status)",
        "CREATE INDEX IF NOT EXISTS idx_reco_session_period ON core_finance_reconciliation_sessions(period_start, period_end)",
        "CREATE TABLE IF NOT EXISTS core_finance_reconciliation_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES core_finance_reconciliation_sessions(id) ON DELETE CASCADE,
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            source_type item_source NOT NULL,
            transaction_date DATE NOT NULL,
            amount NUMERIC(18,4) NOT NULL,
            direction VARCHAR(10) NOT NULL,
            counterparty_name VARCHAR(255),
            counterparty_account VARCHAR(100),
            reference_no VARCHAR(100),
            description TEXT,
            match_status match_status NOT NULL DEFAULT 'unmatched',
            matched_item_id UUID REFERENCES core_finance_reconciliation_items(id),
            diff_reason diff_reason,
            diff_amount NUMERIC(18,4),
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_reco_item_session_id ON core_finance_reconciliation_items(session_id)",
        "CREATE INDEX IF NOT EXISTS idx_reco_item_tenant_id ON core_finance_reconciliation_items(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_reco_item_match_status ON core_finance_reconciliation_items(match_status)",
        "CREATE INDEX IF NOT EXISTS idx_reco_item_matched ON core_finance_reconciliation_items(matched_item_id)",
        "CREATE INDEX IF NOT EXISTS idx_reco_item_amount ON core_finance_reconciliation_items(amount)",
        "CREATE INDEX IF NOT EXISTS idx_reco_item_date ON core_finance_reconciliation_items(transaction_date)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

pub async fn init_aux_tables(pool: &PgPool) -> Result<(), TopemsError> {
    let create_types = r#"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aux_type') THEN
                CREATE TYPE aux_type AS ENUM ('project', 'department', 'customer', 'supplier', 'employee', 'custom1', 'custom2', 'custom3');
            END IF;
        END $$;
    "#;
    sqlx::query(create_types).execute(pool).await?;

    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS core_finance_aux_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            aux_type aux_type NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            parent_id UUID REFERENCES core_finance_aux_accounts(id),
            level INT NOT NULL DEFAULT 1,
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_aux_code UNIQUE (tenant_id, aux_type, code)
        )",
        "CREATE INDEX IF NOT EXISTS idx_aux_account_tenant_id ON core_finance_aux_accounts(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_account_type ON core_finance_aux_accounts(aux_type)",
        "CREATE INDEX IF NOT EXISTS idx_aux_account_parent_id ON core_finance_aux_accounts(parent_id)",
        "CREATE TABLE IF NOT EXISTS core_finance_aux_balances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            aux_type aux_type NOT NULL,
            aux_id UUID NOT NULL,
            period VARCHAR(6) NOT NULL,
            debit_balance NUMERIC(18,4) NOT NULL DEFAULT 0,
            credit_balance NUMERIC(18,4) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_aux_balance UNIQUE (tenant_id, account_id, aux_type, aux_id, period)
        )",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_tenant_id ON core_finance_aux_balances(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_account_id ON core_finance_aux_balances(account_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_aux ON core_finance_aux_balances(aux_type, aux_id)",
        "CREATE INDEX IF NOT EXISTS idx_aux_balance_period ON core_finance_aux_balances(period)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

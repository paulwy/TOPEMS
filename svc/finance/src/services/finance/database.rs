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

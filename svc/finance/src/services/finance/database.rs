use sqlx::postgres::PgPool;

use topems_shared_core::error::TopemsError;

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
    sqlx::raw_sql(create_types).execute(pool).await?;

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
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
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
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
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

    // ============================================================
    // 账户表缺失列补齐（幂等迁移）
    // 背景：Account 模型新增了 name_en/status 等字段，但建表 SQL
    // 未同步更新。此处用 ADD COLUMN IF NOT EXISTS 补齐，兼容已有
    // 数据库（独立部署与模块化单体接入均受益）。
    // ============================================================
    let account_col_migrations = vec![
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS name_en VARCHAR(255)",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS full_name VARCHAR(500)",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS balance_direction VARCHAR(20)",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS \"type\" VARCHAR(20)",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS parent_code VARCHAR(50)",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS haschildren BOOLEAN DEFAULT FALSE",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS is_cash_flow BOOLEAN DEFAULT FALSE",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS enable_quantity BOOLEAN DEFAULT FALSE",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS unit VARCHAR(50)",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS enable_foreign_currency BOOLEAN DEFAULT FALSE",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS default_currency VARCHAR(10)",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS is_detail BOOLEAN DEFAULT FALSE",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS created_by UUID",
        "ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS updated_by UUID",
    ];
    for sql in account_col_migrations {
        sqlx::query(sql).execute(pool).await?;
    }

    // Account 模型使用 DateTime<Utc>（需 TIMESTAMPTZ），但历史建表用 TIMESTAMP。
    // 幂等转换：仅当列仍是 TIMESTAMP 时转为 TIMESTAMPTZ（空数据/开发库安全）。
    let account_ts_migration = r#"
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'core_finance_accounts'
                  AND column_name = 'created_at'
                  AND data_type = 'timestamp without time zone'
            ) THEN
                ALTER TABLE core_finance_accounts
                    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
                ALTER TABLE core_finance_accounts
                    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
            END IF;
        END $$;
    "#;
    sqlx::raw_sql(account_ts_migration).execute(pool).await?;

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
    // NOTE: pg_type existence check MUST be scoped to current_schema() — otherwise a stale
    // type created in another schema (e.g. 'rs' from a misconfigured prior run) causes the
    // DO block to skip creation here, and the subsequent CREATE TABLE referencing the type
    // fails with "type does not exist" because search_path doesn't include that other schema.
    let create_types = r#"
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_namespace n ON t.typnamespace = n.oid
                WHERE t.typname = 'reconciliation_type' AND n.nspname = current_schema()
            ) THEN
                CREATE TYPE reconciliation_type AS ENUM ('bank', 'receivable', 'payable');
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_namespace n ON t.typnamespace = n.oid
                WHERE t.typname = 'reconciliation_status' AND n.nspname = current_schema()
            ) THEN
                CREATE TYPE reconciliation_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_namespace n ON t.typnamespace = n.oid
                WHERE t.typname = 'match_status' AND n.nspname = current_schema()
            ) THEN
                CREATE TYPE match_status AS ENUM ('unmatched', 'matched', 'diff', 'manual');
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_namespace n ON t.typnamespace = n.oid
                WHERE t.typname = 'diff_reason' AND n.nspname = current_schema()
            ) THEN
                CREATE TYPE diff_reason AS ENUM ('time_diff', 'amount_diff', 'duplicate', 'missing', 'unknown', 'fee', 'exchange_rate');
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_namespace n ON t.typnamespace = n.oid
                WHERE t.typname = 'item_source' AND n.nspname = current_schema()
            ) THEN
                CREATE TYPE item_source AS ENUM ('bank', 'erp');
            END IF;
        END $$;
    "#;
    sqlx::raw_sql(create_types).execute(pool).await?;

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
    sqlx::raw_sql(create_types).execute(pool).await?;

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

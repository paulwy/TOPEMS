use sqlx::postgres::PgPool;

use topems_shared_core::error::TopemsError;

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

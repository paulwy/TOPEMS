pub mod handlers;
pub mod models;

use axum::Router;
use sqlx::PgPool;

use crate::AppState;

use self::handlers::*;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            payment_no VARCHAR(50) NOT NULL,
            supplier_id UUID,
            supplier_name VARCHAR(200),
            payment_method VARCHAR(50) NOT NULL,
            bank_account_id UUID,
            bank_name VARCHAR(200),
            bank_account_no VARCHAR(100),
            total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            payment_date DATE,
            actual_payment_date DATE,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            remark TEXT,
            voucher_id UUID,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, payment_no)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_payment_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            payment_id UUID NOT NULL REFERENCES core_finance_payments(id) ON DELETE CASCADE,
            line_no INTEGER,
            invoice_id UUID,
            invoice_no VARCHAR(100),
            payable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
            payment_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
            remark TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            parent_id UUID REFERENCES core_finance_accounts(id),
            account_type VARCHAR(50) NOT NULL,
            level INTEGER NOT NULL DEFAULT 1,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, code)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_account_opening_balances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            period VARCHAR(20) NOT NULL,
            debit DECIMAL(14,2) NOT NULL DEFAULT 0,
            credit DECIMAL(14,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, account_id, period)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_vouchers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            voucher_no VARCHAR(50) NOT NULL,
            voucher_type VARCHAR(50) NOT NULL,
            period VARCHAR(20) NOT NULL,
            voucher_date DATE NOT NULL,
            summary TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, voucher_no)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_voucher_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id) ON DELETE CASCADE,
            line_no INTEGER NOT NULL,
            account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
            account_code VARCHAR(50) NOT NULL,
            account_name VARCHAR(200) NOT NULL,
            debit DECIMAL(14,2) NOT NULL DEFAULT 0,
            credit DECIMAL(14,2) NOT NULL DEFAULT 0,
            summary TEXT,
            department_id UUID,
            project_id UUID,
            counterparty_id UUID
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_voucher_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(200) NOT NULL,
            voucher_type VARCHAR(50) NOT NULL,
            applicable_module VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            is_default BOOLEAN NOT NULL DEFAULT FALSE,
            template_data JSONB NOT NULL,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_finance_periods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            period VARCHAR(20) NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'open',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, period)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_payments_tenant ON core_finance_payments(tenant_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_payments_status ON core_finance_payments(status);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_payment_items_payment ON core_finance_payment_items(payment_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_accounts_tenant ON core_finance_accounts(tenant_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_accounts_parent ON core_finance_accounts(parent_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_vouchers_tenant ON core_finance_vouchers(tenant_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_voucher_entries_voucher ON core_finance_voucher_entries(voucher_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_finance_periods_tenant ON core_finance_periods(tenant_id);",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/payments", axum::routing::get(list_payments))
        .route("/payments", axum::routing::post(create_payment))
        .route("/payments/{id}", axum::routing::get(get_payment))
        .route("/payments/{id}", axum::routing::put(update_payment))
        .route("/payments/{id}", axum::routing::delete(delete_payment))
        .route("/payments/{id}/submit", axum::routing::post(submit_payment))
        .route(
            "/payments/{id}/approve",
            axum::routing::post(approve_payment),
        )
        .route("/payments/{id}/reject", axum::routing::post(reject_payment))
        .route("/accounts", axum::routing::get(list_accounts))
        .route("/accounts", axum::routing::post(create_account))
        .route("/accounts/{id}", axum::routing::get(get_account))
        .route("/accounts/{id}", axum::routing::put(update_account))
        .route("/accounts/{id}", axum::routing::delete(delete_account))
        .route("/accounts/tree", axum::routing::get(get_account_tree))
        .route(
            "/accounts/balances",
            axum::routing::get(get_account_balances),
        )
        .route(
            "/accounts/opening-balances",
            axum::routing::get(get_opening_balances),
        )
        .route(
            "/accounts/{account_id}/opening-balance",
            axum::routing::post(set_opening_balance),
        )
        .route(
            "/accounts/opening-balances/carry-forward",
            axum::routing::post(carry_forward_opening_balance),
        )
        .route("/vouchers", axum::routing::get(list_vouchers))
        .route("/vouchers", axum::routing::post(create_voucher))
        .route("/vouchers/{id}", axum::routing::get(get_voucher))
        .route("/vouchers/{id}", axum::routing::put(update_voucher))
        .route("/vouchers/{id}", axum::routing::delete(delete_voucher))
        .route(
            "/vouchers/{id}/entries",
            axum::routing::get(get_voucher_entries),
        )
        .route("/vouchers/{id}/submit", axum::routing::post(submit_voucher))
        .route(
            "/vouchers/{id}/approve",
            axum::routing::post(approve_voucher),
        )
        .route("/vouchers/{id}/post", axum::routing::post(post_voucher))
        .route(
            "/vouchers/batch-approve",
            axum::routing::post(batch_approve_vouchers),
        )
        .route(
            "/vouchers/batch-post",
            axum::routing::post(batch_post_vouchers),
        )
        .route(
            "/vouchers/batch-delete",
            axum::routing::post(batch_delete_vouchers),
        )
        .route("/vouchers/next-no", axum::routing::get(get_next_voucher_no))
        .route(
            "/voucher-templates",
            axum::routing::get(list_voucher_templates),
        )
        .route(
            "/voucher-templates",
            axum::routing::post(create_voucher_template),
        )
        .route(
            "/voucher-templates/{id}",
            axum::routing::get(get_voucher_template),
        )
        .route(
            "/voucher-templates/{id}",
            axum::routing::put(update_voucher_template),
        )
        .route(
            "/voucher-templates/{id}",
            axum::routing::delete(delete_voucher_template),
        )
        .route(
            "/voucher-templates/{id}/copy",
            axum::routing::post(copy_voucher_template),
        )
        .route(
            "/voucher-templates/{id}/set-default",
            axum::routing::post(set_default_voucher_template),
        )
        .route("/period/current", axum::routing::get(get_current_period))
        .route("/periods", axum::routing::get(list_periods))
        .route("/periods/open", axum::routing::post(open_period))
        .route("/periods/close", axum::routing::post(close_period))
}

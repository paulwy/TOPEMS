//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "public";
pub const SERVICE_TAG: &str = "billing";

/// billing 4 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "core_billing_plans",
        &[
            ("code", "VARCHAR(64) NOT NULL UNIQUE"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("description", "TEXT"),
            ("license_type", "VARCHAR(32) DEFAULT 'subscription'"),
            ("price_cents", "INTEGER NOT NULL DEFAULT 0"),
            ("price_period", "VARCHAR(32) DEFAULT 'monthly'"),
            ("included_users", "INTEGER DEFAULT 5"),
            ("included_storage_gb", "BIGINT DEFAULT 5"),
            ("included_api_calls", "BIGINT DEFAULT 50000"),
            ("included_modules", "TEXT[]"),
            ("overage_users_cents", "INTEGER DEFAULT 500"),
            ("overage_storage_cents", "INTEGER DEFAULT 50"),
            ("overage_api_calls_cents", "INTEGER DEFAULT 10"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("is_trial", "BOOLEAN DEFAULT FALSE"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_subscriptions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("plan_id", "UUID NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("current_period_start", "DATE NOT NULL"),
            ("current_period_end", "DATE NOT NULL"),
            ("is_trial", "BOOLEAN DEFAULT FALSE"),
            ("trial_ends_at", "TIMESTAMP"),
            ("cancelled_at", "TIMESTAMP"),
            ("cancel_at_period_end", "BOOLEAN DEFAULT FALSE"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_billing_invoices",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("subscription_id", "UUID"),
            ("invoice_number", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("subtotal_cents", "INTEGER DEFAULT 0"),
            ("discount_cents", "INTEGER DEFAULT 0"),
            ("tax_cents", "INTEGER DEFAULT 0"),
            ("total_cents", "INTEGER DEFAULT 0"),
            ("period_start", "DATE NOT NULL"),
            ("period_end", "DATE NOT NULL"),
            ("paid_at", "TIMESTAMP"),
            ("payment_method", "VARCHAR(64)"),
            ("payment_reference", "VARCHAR(256)"),
            ("line_items", "JSONB DEFAULT '[]'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_usage_records",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("metric_type", "VARCHAR(64) NOT NULL"),
            ("metric_name", "VARCHAR(128)"),
            ("quantity", "BIGINT NOT NULL DEFAULT 0"),
            ("unit", "VARCHAR(32)"),
            ("period_start", "TIMESTAMP NOT NULL"),
            ("period_end", "TIMESTAMP NOT NULL"),
            ("cost_cents", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 TABLE_DEFS 中所有表的"骨架"都存在（空表仅含 id PK）。
    // 新增的表如果老环境从未 CREATE 过，后续 ALTER TABLE ADD COLUMN 会因为
    // relation does not exist 直接报错。用 IF NOT EXISTS 建最小骨架即可。
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }

    // 阶段 1+2：调用 shared-db 抽象完成增量迁移 + 一致性自检
    //   阶段 1 ensure = 逐列 ALTER TABLE ADD COLUMN IF NOT EXISTS（增量补齐）
    //   阶段 2 verify = information_schema 对比 TABLE_DEFS + id 列
    //                   缺列按 SCHEMA_DEFENSE_VERIFY_STRICT 环境变量决定 warn vs panic
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

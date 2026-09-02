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

// =============================================================================
// Pure functions（无 DB / 无 async / 无外部依赖，仅基于 TABLE_DEFS 做查询与校验）
// =============================================================================

/// 判断给定表名是否在 TABLE_DEFS 中注册。
pub fn is_valid_table_name(name: &str) -> bool {
    TABLE_DEFS.iter().any(|(tbl, _)| *tbl == name)
}

/// 查找某个表的列定义切片。未找到返回 None。
pub fn find_table_def(name: &str) -> Option<&'static [(&'static str, &'static str)]> {
    TABLE_DEFS
        .iter()
        .find(|(tbl, _)| *tbl == name)
        .map(|(_, cols)| *cols)
}

/// 返回 TABLE_DEFS 中注册的表数量。
pub fn count_tables() -> usize {
    TABLE_DEFS.len()
}

/// 判断指定表是否包含某列定义。
pub fn has_column_def(table: &str, column: &str) -> bool {
    match find_table_def(table) {
        Some(cols) => cols.iter().any(|(c, _)| *c == column),
        None => false,
    }
}

/// 返回指定表的列数（不含隐式 id 主键）。未知表返回 0。
pub fn count_columns(table: &str) -> usize {
    find_table_def(table).map(|cols| cols.len()).unwrap_or(0)
}

/// 判断列类型字符串是否以 TABLE_DEFS 中已知的 PG 类型开头。
/// 已知类型前缀：VARCHAR / TEXT / INTEGER / BIGINT / BOOLEAN / TIMESTAMP / DATE / JSONB / UUID。
pub fn is_valid_column_type(t: &str) -> bool {
    let upper = t.trim().to_uppercase();
    const KNOWN: &[&str] = &[
        "VARCHAR",
        "TEXT",
        "INTEGER",
        "BIGINT",
        "BOOLEAN",
        "TIMESTAMP",
        "DATE",
        "JSONB",
        "UUID",
    ];
    KNOWN.iter().any(|k| upper.starts_with(k))
}

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

#[cfg(test)]
mod tests {
    use super::*;

    // ---- is_valid_table_name ----

    #[test]
    fn table_name_known_plans() {
        assert!(is_valid_table_name("core_billing_plans"));
    }

    #[test]
    fn table_name_known_subscriptions() {
        assert!(is_valid_table_name("core_subscriptions"));
    }

    #[test]
    fn table_name_known_invoices() {
        assert!(is_valid_table_name("core_billing_invoices"));
    }

    #[test]
    fn table_name_known_usage() {
        assert!(is_valid_table_name("core_usage_records"));
    }

    #[test]
    fn table_name_unknown() {
        assert!(!is_valid_table_name("core_unknown_table"));
    }

    #[test]
    fn table_name_empty() {
        assert!(!is_valid_table_name(""));
    }

    // ---- find_table_def ----

    #[test]
    fn find_def_plans_returns_some() {
        let def = find_table_def("core_billing_plans");
        assert!(def.is_some());
        assert!(!def.unwrap().is_empty());
    }

    #[test]
    fn find_def_unknown_returns_none() {
        assert!(find_table_def("nonexistent").is_none());
    }

    #[test]
    fn find_def_invoices_has_expected_columns() {
        let def = find_table_def("core_billing_invoices").unwrap();
        let names: Vec<&str> = def.iter().map(|(c, _)| *c).collect();
        assert!(names.contains(&"invoice_number"));
        assert!(names.contains(&"total_cents"));
        assert!(names.contains(&"tenant_id"));
    }

    #[test]
    fn find_def_subscriptions_has_trial_columns() {
        let def = find_table_def("core_subscriptions").unwrap();
        let names: Vec<&str> = def.iter().map(|(c, _)| *c).collect();
        assert!(names.contains(&"is_trial"));
        assert!(names.contains(&"trial_ends_at"));
    }

    // ---- count_tables ----

    #[test]
    fn count_tables_is_four() {
        // billing 服务定义了 4 张表
        assert_eq!(count_tables(), 4);
    }

    #[test]
    fn count_tables_at_least_one() {
        assert!(count_tables() >= 1);
    }

    // ---- has_column_def ----

    #[test]
    fn has_column_existing() {
        assert!(has_column_def("core_billing_plans", "code"));
        assert!(has_column_def("core_billing_plans", "price_cents"));
    }

    #[test]
    fn has_column_missing() {
        assert!(!has_column_def("core_billing_plans", "nonexistent_col"));
    }

    #[test]
    fn has_column_unknown_table_returns_false() {
        assert!(!has_column_def("no_such_table", "code"));
    }

    #[test]
    fn has_column_empty_name_returns_false() {
        assert!(!has_column_def("core_billing_plans", ""));
    }

    #[test]
    fn has_column_usage_records_quantity() {
        assert!(has_column_def("core_usage_records", "quantity"));
        assert!(has_column_def("core_usage_records", "metric_type"));
    }

    // ---- count_columns ----

    #[test]
    fn count_columns_known_table_positive() {
        assert!(count_columns("core_billing_plans") > 0);
    }

    #[test]
    fn count_columns_unknown_table_zero() {
        assert_eq!(count_columns("nonexistent_table"), 0);
    }

    #[test]
    fn count_columns_invoices_more_than_five() {
        // core_billing_invoices 至少有 10+ 列
        assert!(count_columns("core_billing_invoices") > 5);
    }

    #[test]
    fn count_columns_subscriptions_has_trial_fields() {
        // 包含 is_trial / trial_ends_at / cancelled_at / cancel_at_period_end
        assert!(count_columns("core_subscriptions") >= 10);
    }

    // ---- is_valid_column_type ----

    #[test]
    fn column_type_varchar_valid() {
        assert!(is_valid_column_type("VARCHAR(64) NOT NULL UNIQUE"));
    }

    #[test]
    fn column_type_integer_valid() {
        assert!(is_valid_column_type("INTEGER NOT NULL DEFAULT 0"));
    }

    #[test]
    fn column_type_bigint_valid() {
        assert!(is_valid_column_type("BIGINT DEFAULT 5"));
    }

    #[test]
    fn column_type_boolean_valid() {
        assert!(is_valid_column_type("BOOLEAN DEFAULT TRUE"));
    }

    #[test]
    fn column_type_timestamp_valid() {
        assert!(is_valid_column_type("TIMESTAMP DEFAULT NOW()"));
    }

    #[test]
    fn column_type_text_array_valid() {
        assert!(is_valid_column_type("TEXT[]"));
    }

    #[test]
    fn column_type_jsonb_valid() {
        assert!(is_valid_column_type("JSONB DEFAULT '[]'"));
    }

    #[test]
    fn column_type_unknown_invalid() {
        assert!(!is_valid_column_type("FOOBAR(10)"));
    }

    #[test]
    fn column_type_lowercase_normalized() {
        // 内部转大写后比较
        assert!(is_valid_column_type("integer default 0"));
    }

    #[test]
    fn column_type_empty_invalid() {
        assert!(!is_valid_column_type(""));
    }

    #[test]
    fn column_type_whitespace_only_invalid() {
        assert!(!is_valid_column_type("   "));
    }
}

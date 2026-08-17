//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "public";
pub const SERVICE_TAG: &str = "plugin-registry";

// ============================================================================
// Pure validation helpers (no DB / async) — extracted for unit testing
// ============================================================================

/// Validate a plugin id: must be 3..=64 chars, alphanumeric + hyphens,
/// must not start or end with a hyphen, and must not contain consecutive
/// hyphens.
pub fn validate_plugin_id(id: &str) -> bool {
    let len = id.len();
    if !(3..=64).contains(&len) {
        return false;
    }
    if id.starts_with('-') || id.ends_with('-') {
        return false;
    }
    if id.contains("--") {
        return false;
    }
    id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

/// Validate that a SQL type string is one of the recognized types used in
/// TABLE_DEFS (e.g. "VARCHAR(64) NOT NULL", "BOOLEAN DEFAULT FALSE").
/// Returns true if the type contains a known base type token.
pub fn is_valid_column_type(col_type: &str) -> bool {
    let upper = col_type.to_uppercase();
    const KNOWN: &[&str] = &[
        "VARCHAR",
        "TEXT",
        "BOOLEAN",
        "INTEGER",
        "BIGINT",
        "UUID",
        "TIMESTAMP",
        "JSONB",
        "DECIMAL",
    ];
    KNOWN.iter().any(|t| upper.contains(t))
}

/// Check whether a column definition is marked NOT NULL.
pub fn is_not_null(col_type: &str) -> bool {
    col_type.to_uppercase().contains("NOT NULL")
}

/// Check whether a column definition declares a DEFAULT value.
pub fn has_default(col_type: &str) -> bool {
    col_type.to_uppercase().contains("DEFAULT")
}

/// Count the total number of columns defined across all TABLE_DEFS entries.
pub fn count_total_columns(defs: &[(&str, &[(&str, &str)])]) -> usize {
    defs.iter().map(|(_, cols)| cols.len()).sum()
}

/// Look up the column type for a given table + column name in TABLE_DEFS.
pub fn lookup_column_type<'a>(
    defs: &'a [(&'a str, &'a [(&'a str, &'a str)])],
    table: &str,
    column: &str,
) -> Option<&'a str> {
    for (tbl, cols) in defs {
        if *tbl == table {
            for (col, col_type) in *cols {
                if *col == column {
                    return Some(*col_type);
                }
            }
        }
    }
    None
}

/// plugin-registry 8 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "core_plugins",
        &[
            ("code", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("description", "TEXT"),
            ("version", "VARCHAR(32) NOT NULL"),
            ("plugin_type", "VARCHAR(32) DEFAULT 'business'"),
            ("is_installed", "BOOLEAN DEFAULT FALSE"),
            ("installed_at", "TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT FALSE"),
            ("activated_at", "TIMESTAMP"),
            ("is_free", "BOOLEAN DEFAULT TRUE"),
            ("price_cents", "INTEGER DEFAULT 0"),
            ("remote_url", "VARCHAR(512)"),
            ("checksum", "VARCHAR(64)"),
            ("entry_point", "VARCHAR(256)"),
            ("dependencies", "JSONB DEFAULT '[]'"),
            ("install_count", "INTEGER DEFAULT 0"),
            ("rating", "DECIMAL(3,2) DEFAULT 0"),
            ("rating_count", "INTEGER DEFAULT 0"),
            ("is_published", "BOOLEAN DEFAULT FALSE"),
            ("is_featured", "BOOLEAN DEFAULT FALSE"),
            ("is_recommended", "BOOLEAN DEFAULT FALSE"),
            ("author_name", "VARCHAR(128)"),
            ("author_url", "VARCHAR(512)"),
            ("homepage_url", "VARCHAR(512)"),
            ("screenshots", "JSONB DEFAULT '[]'"),
            ("tags", "TEXT[]"),
            ("category", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("published_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_plugin_versions",
        &[
            ("plugin_id", "UUID NOT NULL"),
            ("version", "VARCHAR(32) NOT NULL"),
            ("release_notes", "TEXT"),
            ("is_stable", "BOOLEAN DEFAULT TRUE"),
            ("is_latest", "BOOLEAN DEFAULT FALSE"),
            ("download_url", "VARCHAR(512)"),
            ("checksum", "VARCHAR(64)"),
            ("file_size", "BIGINT"),
            ("min_app_version", "VARCHAR(32)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_plugin_reviews",
        &[
            ("plugin_id", "UUID NOT NULL"),
            ("user_id", "UUID NOT NULL"),
            ("user_name", "VARCHAR(128)"),
            ("rating", "INTEGER"),
            ("title", "VARCHAR(256)"),
            ("content", "TEXT"),
            ("is_verified_purchase", "BOOLEAN DEFAULT FALSE"),
            ("is_featured", "BOOLEAN DEFAULT FALSE"),
            ("helpful_count", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_tenant_plugins",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("plugin_id", "UUID NOT NULL"),
            ("installed_version", "VARCHAR(32)"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("license_type", "VARCHAR(32) DEFAULT 'subscription'"),
            ("license_expires_at", "TIMESTAMP"),
            ("purchase_order_id", "VARCHAR(128)"),
            ("activated_at", "TIMESTAMP DEFAULT NOW()"),
            ("last_used_at", "TIMESTAMP"),
            ("usage_count", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_plugin_categories",
        &[
            ("name", "VARCHAR(64) NOT NULL"),
            ("code", "VARCHAR(64) NOT NULL"),
            ("description", "TEXT"),
            ("icon", "VARCHAR(64)"),
            ("sort_order", "INTEGER DEFAULT 0"),
            ("plugin_count", "INTEGER DEFAULT 0"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_plugin_instances",
        &[
            ("plugin_id", "UUID NOT NULL"),
            ("runtime_url", "VARCHAR(512)"),
            ("runtime_status", "VARCHAR(32) DEFAULT 'stopped'"),
            ("base_path", "VARCHAR(128) DEFAULT '/api/plugins/{code}'"),
            ("last_heartbeat", "TIMESTAMP"),
            ("started_at", "TIMESTAMP"),
            ("stopped_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_plugin_permissions",
        &[
            ("plugin_code", "VARCHAR(64) NOT NULL"),
            ("permission_code", "VARCHAR(100) NOT NULL"),
            ("permission_name", "VARCHAR(255)"),
            ("resource_type", "VARCHAR(50)"),
            ("action", "VARCHAR(50)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_plugin_navigation",
        &[
            ("plugin_code", "VARCHAR(64) NOT NULL"),
            ("nav_config", "JSONB NOT NULL DEFAULT '[]'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 TABLE_DEFS 中所有表的"骨架"都存在
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }
    // 阶段 1+2：调用 shared-db 抽象
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- validate_plugin_id ----

    #[test]
    fn plugin_id_valid_simple() {
        assert!(validate_plugin_id("abc"));
    }

    #[test]
    fn plugin_id_valid_with_hyphens() {
        assert!(validate_plugin_id("my-cool-plugin"));
    }

    #[test]
    fn plugin_id_valid_alphanumeric_mix() {
        assert!(validate_plugin_id("plugin123"));
    }

    #[test]
    fn plugin_id_too_short() {
        assert!(!validate_plugin_id("ab"));
    }

    #[test]
    fn plugin_id_too_long() {
        assert!(!validate_plugin_id(&"a".repeat(65)));
    }

    #[test]
    fn plugin_id_boundary_lengths() {
        assert!(validate_plugin_id(&"a".repeat(3)));
        assert!(validate_plugin_id(&"a".repeat(64)));
    }

    #[test]
    fn plugin_id_leading_hyphen_invalid() {
        assert!(!validate_plugin_id("-abc"));
    }

    #[test]
    fn plugin_id_trailing_hyphen_invalid() {
        assert!(!validate_plugin_id("abc-"));
    }

    #[test]
    fn plugin_id_consecutive_hyphens_invalid() {
        assert!(!validate_plugin_id("a--b"));
    }

    #[test]
    fn plugin_id_special_chars_invalid() {
        assert!(!validate_plugin_id("plugin_underscore"));
        assert!(!validate_plugin_id("plugin.code"));
        assert!(!validate_plugin_id("plugin name"));
    }

    #[test]
    fn plugin_id_empty_invalid() {
        assert!(!validate_plugin_id(""));
    }

    // ---- is_valid_column_type ----

    #[test]
    fn column_type_varchar_valid() {
        assert!(is_valid_column_type("VARCHAR(64) NOT NULL"));
    }

    #[test]
    fn column_type_boolean_valid() {
        assert!(is_valid_column_type("BOOLEAN DEFAULT FALSE"));
    }

    #[test]
    fn column_type_uuid_valid() {
        assert!(is_valid_column_type("UUID NOT NULL"));
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
    fn column_type_case_insensitive() {
        assert!(is_valid_column_type("varchar(32)"));
        assert!(is_valid_column_type("integer default 0"));
    }

    // ---- is_not_null / has_default ----

    #[test]
    fn not_null_detected() {
        assert!(is_not_null("VARCHAR(64) NOT NULL"));
        assert!(!is_not_null("VARCHAR(64)"));
    }

    #[test]
    fn default_detected() {
        assert!(has_default("BOOLEAN DEFAULT FALSE"));
        assert!(!has_default("BOOLEAN"));
    }

    // ---- count_total_columns ----

    #[test]
    fn count_columns_empty() {
        assert_eq!(count_total_columns(&[]), 0);
    }

    #[test]
    fn count_columns_table_defs_nonzero() {
        // TABLE_DEFS has 8 tables each with at least 1 column
        let total = count_total_columns(TABLE_DEFS);
        assert!(total > 0);
        // core_plugins alone has 30 columns
        assert!(total >= 30);
    }

    // ---- lookup_column_type ----

    #[test]
    fn lookup_existing_column() {
        let t = lookup_column_type(TABLE_DEFS, "core_plugins", "code");
        assert_eq!(t, Some("VARCHAR(64) NOT NULL"));
    }

    #[test]
    fn lookup_missing_column_returns_none() {
        assert!(lookup_column_type(TABLE_DEFS, "core_plugins", "nonexistent").is_none());
    }

    #[test]
    fn lookup_missing_table_returns_none() {
        assert!(lookup_column_type(TABLE_DEFS, "nonexistent_table", "code").is_none());
    }

    #[test]
    fn lookup_jsonb_column() {
        let t = lookup_column_type(TABLE_DEFS, "core_plugins", "dependencies");
        assert_eq!(t, Some("JSONB DEFAULT '[]'"));
    }

    #[test]
    fn lookup_timestamp_column() {
        let t = lookup_column_type(TABLE_DEFS, "core_plugin_versions", "created_at");
        assert_eq!(t, Some("TIMESTAMP DEFAULT NOW()"));
    }
}

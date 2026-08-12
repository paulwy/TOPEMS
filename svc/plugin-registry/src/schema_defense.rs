//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "public";
pub const SERVICE_TAG: &str = "plugin-registry";

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

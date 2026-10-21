//! Auto-generated schema defense for the master-data service.
//!
//! Service: master-data | Schema: public | Tables: 7
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）

use sqlx::PgPool;

pub const SERVICE_SCHEMA: &str = "master_data";
pub const SERVICE_TAG: &str = "master-data";

/// master-data 7 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "core_dict_types",
        &[
            ("code", "VARCHAR(100) NOT NULL UNIQUE"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("category", "VARCHAR(100) NOT NULL DEFAULT 'general'"),
            ("description", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_dict_items",
        &[
            ("dict_type_id", "UUID NOT NULL"),
            ("code", "VARCHAR(100) NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("value", "TEXT"),
            ("sort_order", "INTEGER NOT NULL DEFAULT 0"),
            ("parent_id", "UUID"),
            ("extra_data", "JSONB"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "schema_registry",
        &[
            ("name", "VARCHAR(100) NOT NULL UNIQUE"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("schema_json", "JSONB NOT NULL"),
            ("table_name", "VARCHAR(100) NOT NULL"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("version", "INTEGER NOT NULL DEFAULT 1"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "dynamic_data",
        &[
            ("schema_id", "UUID NOT NULL"),
            ("data_json", "JSONB NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "materials",
        &[
            ("tenant_id", "UUID"),
            ("material_code", "VARCHAR(64) NOT NULL"),
            ("material_name", "VARCHAR(200) NOT NULL"),
            ("name_en", "VARCHAR(200)"),
            ("material_type", "VARCHAR(64)"),
            ("specification", "VARCHAR(256)"),
            ("unit", "VARCHAR(32)"),
            ("uom_id", "UUID"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("description", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "uoms",
        &[
            ("tenant_id", "UUID"),
            ("uom_code", "VARCHAR(32) NOT NULL"),
            ("uom_name", "VARCHAR(100) NOT NULL"),
            ("name_en", "VARCHAR(100)"),
            ("uom_type", "VARCHAR(64)"),
            ("category", "VARCHAR(64)"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("description", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "samples",
        &[
            ("tenant_id", "UUID"),
            ("sample_code", "VARCHAR(64) NOT NULL"),
            ("sample_name", "VARCHAR(200) NOT NULL"),
            ("name_en", "VARCHAR(200)"),
            ("sample_type", "VARCHAR(64)"),
            ("source", "VARCHAR(128)"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("description", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }
    topems_shared_db::schema::run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG)
        .await?;
    Ok(())
}

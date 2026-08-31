//! Schema 防御定义 — 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）
//!
//! 服务: analytics | Schema: bi
//! 表来源：bi schema 中实际存在的 19 张表（排除 3 张无 id 列的统计视图：
//!         visualization_stats / report_stats / active_datasource_stats）
//! 列定义依据：psql 查询 information_schema.columns 的实际元数据。

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "bi";
pub const SERVICE_TAG: &str = "analytics";

/// analytics（bi schema）全部含 id 主键表的列定义单一事实源。
/// 不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
/// USER-DEFINED（枚举类型）统一用 VARCHAR 表示，老库已存在的列不受影响。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "dashboards",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("layout", "JSONB NOT NULL"),
            ("filters", "JSONB"),
            ("refresh_interval", "INTEGER DEFAULT 0"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("is_public", "BOOLEAN DEFAULT FALSE"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "dashboard_widgets",
        &[
            ("dashboard_id", "UUID NOT NULL"),
            ("widget_type", "VARCHAR(32) NOT NULL"),
            ("title", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("position", "JSONB NOT NULL"),
            ("size", "JSONB NOT NULL"),
            ("config", "JSONB NOT NULL"),
            ("data_source_id", "UUID"),
            ("visualization_id", "UUID"),
            ("refresh_interval", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "data_sources",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("datasource_type", "VARCHAR(32) NOT NULL"),
            ("connection_config", "JSONB NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'disconnected'"),
            ("last_tested_at", "TIMESTAMPTZ"),
            ("last_error", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "datasource_fields",
        &[
            ("datasource_id", "UUID NOT NULL"),
            ("table_name", "VARCHAR(255) NOT NULL"),
            ("field_name", "VARCHAR(255) NOT NULL"),
            ("field_type", "VARCHAR(255) NOT NULL"),
            ("is_nullable", "BOOLEAN DEFAULT TRUE"),
            ("is_primary_key", "BOOLEAN DEFAULT FALSE"),
            ("default_value", "TEXT"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "datasource_tables",
        &[
            ("datasource_id", "UUID NOT NULL"),
            ("table_name", "VARCHAR(255) NOT NULL"),
            ("table_schema", "VARCHAR(255)"),
            ("table_type", "VARCHAR(50) DEFAULT 'BASE TABLE'"),
            ("row_count", "BIGINT"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "visualizations",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("visualization_type", "VARCHAR(32) NOT NULL"),
            ("data_source_id", "UUID"),
            ("query_config", "JSONB NOT NULL"),
            ("chart_config", "JSONB NOT NULL"),
            ("style_config", "JSONB"),
            ("interaction_config", "JSONB"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("is_public", "BOOLEAN DEFAULT FALSE"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "visualization_data",
        &[
            ("visualization_id", "UUID NOT NULL"),
            ("data", "JSONB NOT NULL"),
            ("metadata", "JSONB"),
            ("generated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("cached", "BOOLEAN DEFAULT FALSE"),
            ("cache_expires_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "reports",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("report_type", "VARCHAR(32) NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("template_id", "UUID"),
            ("data_source_id", "UUID"),
            ("config", "JSONB NOT NULL"),
            ("layout", "JSONB"),
            ("schedule_config", "JSONB"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("last_generated_at", "TIMESTAMPTZ"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "report_data",
        &[
            ("report_id", "UUID NOT NULL"),
            ("data", "JSONB NOT NULL"),
            ("metadata", "JSONB"),
            ("generated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("generated_by", "UUID"),
            ("version", "INTEGER DEFAULT 1"),
            ("file_path", "TEXT"),
            ("file_size", "BIGINT"),
            ("format", "VARCHAR(50)"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "report_schedules",
        &[
            ("report_id", "UUID NOT NULL"),
            ("schedule_type", "VARCHAR(32) NOT NULL"),
            ("cron_expression", "TEXT"),
            ("interval_minutes", "INTEGER"),
            ("next_run_at", "TIMESTAMPTZ"),
            ("last_run_at", "TIMESTAMPTZ"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "report_templates",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("template_type", "VARCHAR(32) NOT NULL"),
            ("template_content", "JSONB NOT NULL"),
            ("default_config", "JSONB"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "analysis_history",
        &[
            ("query_id", "UUID NOT NULL"),
            ("user_id", "UUID"),
            ("executed_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("execution_time_ms", "BIGINT"),
            ("row_count", "BIGINT"),
            ("status", "VARCHAR(50) DEFAULT 'success'"),
            ("error_message", "TEXT"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "analysis_queries",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("query_type", "VARCHAR(32) NOT NULL"),
            ("data_source_id", "UUID NOT NULL"),
            ("sql_query", "TEXT"),
            ("filters", "JSONB"),
            ("group_by", "JSONB"),
            ("aggregations", "JSONB"),
            ("time_range", "JSONB"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "saved_analysis_results",
        &[
            ("query_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("result_data", "JSONB NOT NULL"),
            ("metadata", "JSONB"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "audit_logs",
        &[
            ("user_id", "UUID"),
            ("user_name", "VARCHAR(255)"),
            ("action", "VARCHAR(50) NOT NULL"),
            ("resource_type", "VARCHAR(100) NOT NULL"),
            ("resource_id", "UUID"),
            ("resource_name", "VARCHAR(255)"),
            ("details", "JSONB"),
            ("ip_address", "VARCHAR(50)"),
            ("user_agent", "TEXT"),
            ("request_method", "VARCHAR(10)"),
            ("request_path", "TEXT"),
            ("response_status", "INTEGER"),
            ("execution_time_ms", "BIGINT"),
            ("created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
            ("success", "BOOLEAN DEFAULT TRUE"),
            ("error_message", "TEXT"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 bi schema 与 TABLE_DEFS 中所有表的"骨架"都存在
    // （空表仅含 id PK）。新增的表如果老环境从未 CREATE 过，后续
    // ALTER TABLE ADD COLUMN 会因为 relation does not exist 直接报错。
    // 用 IF NOT EXISTS 建最小骨架即可。
    sqlx::query(&format!(
        "CREATE SCHEMA IF NOT EXISTS \"{}\"",
        SERVICE_SCHEMA
    ))
    .execute(pool)
    .await?;
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
    if let Err(e) = run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await {
        tracing::warn!("[analytics] Schema 防御检查警告（非阻塞）: {:?}", e);
    }
    Ok(())
}

//! Auto-generated schema defense for the integration service.
//!
//! - service: integration
//! - schema:  integration
//! - tables:  9 (conversion_rules, conversion_executions, mes_qms_sync,
//!           integration_configs, integration_events, lims_qms_sync,
//!           mes_erp_sync, mes_erp_sync_logs, wms_scm_sync)
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）

use sqlx::PgPool;

pub const SERVICE_SCHEMA: &str = "integration";
pub const SERVICE_TAG: &str = "integration";

/// integration 9 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "conversion_rules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("code", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("description", "TEXT"),
            ("source_system", "VARCHAR(32) NOT NULL"),
            ("source_entity", "VARCHAR(64) NOT NULL"),
            ("target_system", "VARCHAR(32) NOT NULL"),
            ("target_entity", "VARCHAR(64) NOT NULL"),
            ("trigger_type", "VARCHAR(32) NOT NULL DEFAULT 'event'"),
            ("trigger_condition", "JSONB"),
            ("field_mappings", "JSONB NOT NULL"),
            ("transform_script", "TEXT"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'draft'"),
            ("priority", "INTEGER NOT NULL DEFAULT 100"),
            ("is_enabled", "BOOLEAN NOT NULL DEFAULT true"),
            ("max_retries", "INTEGER NOT NULL DEFAULT 3"),
            ("retry_interval_secs", "INTEGER NOT NULL DEFAULT 60"),
            ("stop_on_failure", "BOOLEAN NOT NULL DEFAULT false"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "conversion_executions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("rule_id", "UUID NOT NULL"),
            ("rule_code", "VARCHAR(64) NOT NULL"),
            ("source_record_id", "VARCHAR(128) NOT NULL"),
            ("target_record_id", "VARCHAR(128)"),
            ("source_data", "JSONB"),
            ("target_data", "JSONB"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("retry_count", "INT NOT NULL DEFAULT 0"),
            ("error_message", "TEXT"),
            ("started_at", "TIMESTAMP"),
            ("completed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "integration_configs",
        &[
            ("config_name", "VARCHAR(100) NOT NULL"),
            ("source_system", "VARCHAR(50) NOT NULL"),
            ("target_system", "VARCHAR(50) NOT NULL"),
            ("config_type", "VARCHAR(50) NOT NULL"),
            ("config_value", "JSONB NOT NULL"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "integration_events",
        &[
            ("source_system", "VARCHAR(50) NOT NULL"),
            ("target_system", "VARCHAR(50) NOT NULL"),
            ("event_type", "VARCHAR(100) NOT NULL"),
            ("source_record_id", "UUID"),
            ("target_record_id", "UUID"),
            ("payload", "JSONB"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
            ("error_message", "TEXT"),
            ("synced_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "lims_qms_sync",
        &[
            ("lims_sample_id", "UUID NOT NULL"),
            ("qms_inspection_id", "UUID"),
            ("sample_name", "VARCHAR(255) NOT NULL"),
            ("inspection_result", "TEXT"),
            ("inspection_notes", "TEXT"),
            ("synced", "BOOLEAN NOT NULL DEFAULT false"),
            ("sync_status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
            ("sync_error", "TEXT"),
            ("last_synced_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "mes_erp_sync",
        &[
            ("mes_order_id", "UUID NOT NULL"),
            ("erp_order_id", "UUID"),
            ("order_number", "VARCHAR(255) NOT NULL"),
            ("product_name", "VARCHAR(255)"),
            ("quantity", "NUMERIC(15,2)"),
            ("synced", "BOOLEAN NOT NULL DEFAULT false"),
            ("sync_status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
            ("sync_error", "TEXT"),
            ("last_synced_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
            ("sync_direction", "VARCHAR(50) DEFAULT 'erp_to_mes'"),
            ("sync_type", "VARCHAR(50) DEFAULT 'create'"),
            ("payload", "JSONB"),
            ("retry_count", "INTEGER DEFAULT 0"),
            ("max_retries", "INTEGER DEFAULT 5"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "mes_erp_sync_logs",
        &[
            ("sync_record_id", "UUID NOT NULL"),
            ("sync_direction", "VARCHAR(50) NOT NULL"),
            ("sync_type", "VARCHAR(50) NOT NULL"),
            ("status", "VARCHAR(50) NOT NULL"),
            ("error_message", "TEXT"),
            ("attempt", "INTEGER NOT NULL DEFAULT 1"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "mes_qms_sync",
        &[
            ("sync_type", "VARCHAR(50) NOT NULL"),
            ("direction", "VARCHAR(30) NOT NULL"),
            ("mes_record_id", "UUID"),
            ("mes_record_type", "VARCHAR(50)"),
            ("qms_inspection_id", "UUID"),
            ("order_id", "UUID"),
            ("order_no", "VARCHAR(64)"),
            ("product_id", "UUID"),
            ("product_name", "VARCHAR(256)"),
            ("product_code", "VARCHAR(64)"),
            ("batch_no", "VARCHAR(64)"),
            ("quantity", "DECIMAL(12,2)"),
            ("synced", "BOOLEAN NOT NULL DEFAULT false"),
            ("sync_status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
            ("sync_error", "TEXT"),
            ("retry_count", "INTEGER NOT NULL DEFAULT 0"),
            ("max_retries", "INTEGER NOT NULL DEFAULT 5"),
            ("payload", "JSONB"),
            ("result_payload", "JSONB"),
            ("last_synced_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "wms_scm_sync",
        &[
            ("wms_inventory_id", "UUID NOT NULL"),
            ("scm_supply_id", "UUID"),
            ("item_name", "VARCHAR(255) NOT NULL"),
            ("quantity", "NUMERIC(15,2)"),
            ("unit", "VARCHAR(50)"),
            ("synced", "BOOLEAN NOT NULL DEFAULT false"),
            ("sync_status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
            ("sync_error", "TEXT"),
            ("last_synced_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 确保 schema 存在
    sqlx::query("CREATE SCHEMA IF NOT EXISTS integration")
        .execute(pool)
        .await?;
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

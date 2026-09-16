//! Auto-generated schema defense for unified-core service.
//!
//! - schema: public
//! - tables: 29
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）

use sqlx::PgPool;

pub const SERVICE_SCHEMA: &str = "public";
pub const SERVICE_TAG: &str = "unified-core";

/// unified-core 29 张表的列定义单一事实源。
/// 标准 `id UUID PRIMARY KEY` 的表不含 id 列（verify 阶段自动拼 "id"）。
/// 复合主键表（core_user_roles / core_role_permissions）含全部列。
/// `core_master_data_refs` 主键为 master_data_id TEXT，已显式包含。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "core_users",
        &[
            ("username", "VARCHAR(64) NOT NULL UNIQUE"),
            ("email", "VARCHAR(255) NOT NULL UNIQUE"),
            ("password_hash", "VARCHAR(255) NOT NULL"),
            ("full_name", "VARCHAR(128)"),
            ("phone", "VARCHAR(32)"),
            ("avatar_url", "VARCHAR(512)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("is_superuser", "BOOLEAN DEFAULT FALSE"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("last_login_at", "TIMESTAMP"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_roles",
        &[
            ("name", "VARCHAR(64) NOT NULL UNIQUE"),
            ("description", "TEXT"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_permissions",
        &[
            ("code", "VARCHAR(128) NOT NULL UNIQUE"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("description", "TEXT"),
            ("resource", "VARCHAR(64)"),
            ("action", "VARCHAR(32)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_user_roles",
        &[
            ("user_id", "UUID NOT NULL"),
            ("role_id", "UUID NOT NULL"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_role_permissions",
        &[
            ("role_id", "UUID NOT NULL"),
            ("permission_id", "UUID NOT NULL"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_workflows",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("description", "TEXT"),
            ("definition", "JSONB NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("version", "INTEGER DEFAULT 1"),
            ("created_by", "UUID NOT NULL"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("published_at", "TIMESTAMP"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_workflow_instances",
        &[
            ("workflow_id", "UUID NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("initiator_id", "UUID NOT NULL"),
            ("current_node_id", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("variables", "JSONB"),
            ("started_at", "TIMESTAMP DEFAULT NOW()"),
            ("completed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_workflow_tasks",
        &[
            ("instance_id", "UUID NOT NULL"),
            ("node_id", "VARCHAR(64) NOT NULL"),
            ("assignee_id", "UUID NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("comment", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("completed_at", "TIMESTAMP"),
            ("priority", "TEXT"),
            ("due_time", "TIMESTAMPTZ"),
            ("claimed_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "core_files",
        &[
            ("name", "VARCHAR(256) NOT NULL"),
            ("original_name", "VARCHAR(256)"),
            ("path", "VARCHAR(512) NOT NULL"),
            ("size", "BIGINT NOT NULL"),
            ("mime_type", "VARCHAR(128)"),
            ("extension", "VARCHAR(32)"),
            ("folder_id", "UUID"),
            ("uploader_id", "UUID NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("deleted_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_file_folders",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("parent_id", "UUID"),
            ("owner_id", "UUID NOT NULL"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_file_permissions",
        &[
            ("file_id", "UUID NOT NULL"),
            ("user_id", "UUID NOT NULL"),
            ("permission", "VARCHAR(16) NOT NULL"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_tenants",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("code", "VARCHAR(64) NOT NULL UNIQUE"),
            ("tenant_type", "VARCHAR(32) DEFAULT 'shared'"),
            ("plan", "VARCHAR(32) DEFAULT 'basic'"),
            ("license_type", "VARCHAR(32) DEFAULT 'subscription'"),
            ("license_expires_at", "TIMESTAMP"),
            ("database_host", "VARCHAR(256)"),
            ("database_port", "INTEGER DEFAULT 5432"),
            ("database_name", "VARCHAR(64)"),
            ("quota_users", "INTEGER DEFAULT 20"),
            ("quota_storage_gb", "BIGINT DEFAULT 10"),
            ("quota_api_calls", "BIGINT DEFAULT 100000"),
            ("quota_plugins", "TEXT[]"),
            ("features", "JSONB DEFAULT '{}'"),
            ("status", "VARCHAR(32) DEFAULT 'trial'"),
            ("trial_expires_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("activated_at", "TIMESTAMP"),
            ("suspended_at", "TIMESTAMP"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_tenant_usage",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("users_count", "INTEGER DEFAULT 0"),
            ("storage_used_mb", "BIGINT DEFAULT 0"),
            ("api_calls_count", "BIGINT DEFAULT 0"),
            ("period_start", "DATE NOT NULL"),
            ("period_end", "DATE NOT NULL"),
            ("base_cost", "DECIMAL(10, 2) DEFAULT 0"),
            ("overage_cost", "DECIMAL(10, 2) DEFAULT 0"),
            ("plugin_cost", "DECIMAL(10, 2) DEFAULT 0"),
            ("total_cost", "DECIMAL(10, 2) DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_tenant_modules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("module_code", "VARCHAR(64) NOT NULL"),
            ("module_name", "VARCHAR(128)"),
            ("tier", "VARCHAR(32) DEFAULT 'basic'"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("activated_at", "TIMESTAMP DEFAULT NOW()"),
            ("expires_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_tenant_settings",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("setting_key", "VARCHAR(128) NOT NULL"),
            ("setting_value", "TEXT"),
            ("is_public", "BOOLEAN DEFAULT FALSE"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_tenant_users",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("user_id", "UUID NOT NULL"),
            ("email", "VARCHAR(256) NOT NULL"),
            ("role", "VARCHAR(32) DEFAULT 'member'"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("last_login", "TIMESTAMP"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_migration_history",
        &[
            ("plugin_name", "VARCHAR(128) NOT NULL"),
            ("version", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("applied_at", "TIMESTAMP"),
            ("duration_ms", "BIGINT"),
            ("success", "BOOLEAN DEFAULT TRUE"),
            ("error_message", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_master_data_refs",
        &[
            ("master_data_id", "TEXT NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("domain", "TEXT NOT NULL"),
            ("code", "TEXT NOT NULL"),
            ("name", "TEXT NOT NULL"),
            ("status", "TEXT NOT NULL DEFAULT 'active'"),
            ("version", "INTEGER NOT NULL DEFAULT 1"),
            ("source_service", "TEXT NOT NULL"),
            ("last_synced_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_master_data_change_log",
        &[
            ("master_data_id", "TEXT NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("action", "TEXT NOT NULL"),
            ("source_service", "TEXT NOT NULL"),
            ("operator", "TEXT"),
            ("changed_fields", "JSONB"),
            ("payload", "JSONB"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_master_data_event_outbox",
        &[
            ("event_id", "UUID NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("domain", "TEXT NOT NULL"),
            ("action", "TEXT NOT NULL"),
            ("master_data_id", "TEXT NOT NULL"),
            ("payload", "JSONB NOT NULL"),
            ("published_at", "TIMESTAMP"),
            ("retry_count", "INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_mdm_reconciliation_log",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("domain", "TEXT NOT NULL"),
            ("master_data_id", "TEXT NOT NULL"),
            ("issue_type", "TEXT NOT NULL"),
            ("description", "TEXT"),
            ("detected_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
            ("resolved", "BOOLEAN NOT NULL DEFAULT false"),
            ("resolved_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_mdm_approvals",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("master_data_id", "TEXT NOT NULL"),
            ("domain", "TEXT NOT NULL"),
            ("action", "TEXT NOT NULL"),
            ("requested_by", "TEXT NOT NULL"),
            ("requested_at", "TIMESTAMP NOT NULL DEFAULT NOW()"),
            ("status", "TEXT NOT NULL DEFAULT 'pending'"),
            ("reviewed_by", "TEXT"),
            ("reviewed_at", "TIMESTAMP"),
            ("review_comment", "TEXT"),
            ("payload", "JSONB"),
        ],
    ),
    (
        "core_menu_groups",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("code", "VARCHAR(100) NOT NULL"),
            ("icon", "VARCHAR(200)"),
            ("sort_order", "INTEGER NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_menus",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("group_id", "UUID NOT NULL"),
            ("parent_id", "UUID"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("code", "VARCHAR(100) NOT NULL"),
            ("path", "VARCHAR(500)"),
            ("icon", "VARCHAR(200)"),
            ("sort_order", "INTEGER NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("permissions", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_login_logs",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("user_id", "UUID"),
            ("username", "VARCHAR(64) NOT NULL"),
            ("ip_address", "VARCHAR(128) NOT NULL"),
            ("user_agent", "TEXT"),
            ("status", "VARCHAR(32) NOT NULL"),
            ("error_message", "TEXT"),
            ("login_time", "TIMESTAMP NOT NULL DEFAULT NOW()"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "core_operation_logs",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("user_id", "UUID"),
            ("user_name", "VARCHAR(128) NOT NULL"),
            ("module", "VARCHAR(64) NOT NULL"),
            ("operation", "VARCHAR(32) NOT NULL"),
            ("resource_type", "VARCHAR(64) NOT NULL"),
            ("resource_id", "VARCHAR(128)"),
            ("description", "TEXT"),
            ("request_data", "JSONB"),
            ("response_status", "INTEGER"),
            ("ip_address", "VARCHAR(128)"),
            ("user_agent", "TEXT"),
            ("trace_id", "VARCHAR(64)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_doc_documents",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("folder_id", "UUID"),
            ("template_id", "UUID"),
            ("content", "TEXT"),
            ("content_type", "VARCHAR(50) DEFAULT 'html'"),
            ("status", "VARCHAR(20) DEFAULT 'draft'"),
            ("version", "INTEGER DEFAULT 1"),
            ("tags", "TEXT[]"),
            ("description", "TEXT"),
            ("file_name", "VARCHAR(200)"),
            ("file_path", "VARCHAR(500)"),
            ("file_size", "BIGINT"),
            ("mime_type", "VARCHAR(100)"),
            ("published_at", "TIMESTAMPTZ"),
            ("published_by", "VARCHAR(100)"),
            ("archived_at", "TIMESTAMPTZ"),
            ("archived_by", "VARCHAR(100)"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_doc_templates",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("category", "VARCHAR(100)"),
            ("description", "TEXT"),
            ("content", "TEXT NOT NULL"),
            ("content_type", "VARCHAR(50) DEFAULT 'html'"),
            ("fields", "JSONB DEFAULT '[]'"),
            ("is_enabled", "BOOLEAN DEFAULT true"),
            ("is_default", "BOOLEAN DEFAULT false"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_doc_folders",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("parent_id", "UUID"),
            ("description", "TEXT"),
            ("sort_order", "INTEGER DEFAULT 0"),
            ("is_enabled", "BOOLEAN DEFAULT true"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    // V69.4 补齐：middleware/versioning.rs 创建的 API 版本配置表
    (
        "core_api_version_configs",
        &[
            ("version", "VARCHAR(50) NOT NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("deprecated_since", "DATE"),
            ("sunset_date", "DATE"),
            ("message", "TEXT"),
            ("migration_guide", "TEXT"),
            ("changes", "TEXT"),
            ("is_current", "BOOLEAN NOT NULL DEFAULT false"),
            ("is_default", "BOOLEAN NOT NULL DEFAULT false"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("deleted_at", "TIMESTAMP"),
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

//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "mobile";
pub const SERVICE_TAG: &str = "mobile";

/// mobile 10 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "patrol_records",
        &[
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("location_lat", "DECIMAL(10,6) NOT NULL"),
            ("location_lng", "DECIMAL(10,6) NOT NULL"),
            ("address", "VARCHAR(500)"),
            ("patrol_type", "VARCHAR(50) NOT NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("checked_by", "VARCHAR(100) NOT NULL"),
            ("checked_at", "TIMESTAMPTZ NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "scan_records",
        &[
            ("barcode", "VARCHAR(100) NOT NULL"),
            ("location_lat", "DECIMAL(10,6) NOT NULL"),
            ("location_lng", "DECIMAL(10,6) NOT NULL"),
            ("item_type", "VARCHAR(50) NOT NULL"),
            ("quantity", "DECIMAL(10,2)"),
            ("operator", "VARCHAR(100) NOT NULL"),
            ("scanned_at", "TIMESTAMPTZ NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "photo_evidences",
        &[
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("location_lat", "DECIMAL(10,6) NOT NULL"),
            ("location_lng", "DECIMAL(10,6) NOT NULL"),
            ("address", "VARCHAR(500)"),
            ("file_url", "VARCHAR(500)"),
            ("recorded_by", "VARCHAR(100) NOT NULL"),
            ("recorded_at", "TIMESTAMPTZ NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "audio_recordings",
        &[
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("location_lat", "DECIMAL(10,6) NOT NULL"),
            ("location_lng", "DECIMAL(10,6) NOT NULL"),
            ("address", "VARCHAR(500)"),
            ("duration_seconds", "INTEGER"),
            ("file_url", "VARCHAR(500)"),
            ("recorded_by", "VARCHAR(100) NOT NULL"),
            ("recorded_at", "TIMESTAMPTZ NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "video_recordings",
        &[
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("start_location_lat", "DECIMAL(10,6) NOT NULL"),
            ("start_location_lng", "DECIMAL(10,6) NOT NULL"),
            ("location_track", "JSONB"),
            ("duration_seconds", "INTEGER"),
            ("file_url", "VARCHAR(500)"),
            ("thumbnail_url", "VARCHAR(500)"),
            ("recorded_by", "VARCHAR(100) NOT NULL"),
            ("recorded_at", "TIMESTAMPTZ NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "mobile_tasks",
        &[
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("task_type", "VARCHAR(50) NOT NULL"),
            ("priority", "VARCHAR(20) NOT NULL DEFAULT 'normal'"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("assignee", "VARCHAR(100)"),
            ("location_lat", "DECIMAL(10,6)"),
            ("location_lng", "DECIMAL(10,6)"),
            ("due_date", "DATE"),
            ("completed_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "mobile_attendance",
        &[
            ("user_id", "VARCHAR(100) NOT NULL"),
            ("date", "VARCHAR(20) NOT NULL"),
            ("check_in_time", "VARCHAR(20)"),
            ("check_out_time", "VARCHAR(20)"),
            ("check_in_lat", "DECIMAL(10,6)"),
            ("check_in_lng", "DECIMAL(10,6)"),
            ("check_in_address", "VARCHAR(500)"),
            ("check_out_lat", "DECIMAL(10,6)"),
            ("check_out_lng", "DECIMAL(10,6)"),
            ("check_out_address", "VARCHAR(500)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'not_checked_in'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "mobile_leave_applications",
        &[
            ("user_id", "VARCHAR(100) NOT NULL"),
            ("leave_type", "VARCHAR(50) NOT NULL"),
            ("start_date", "VARCHAR(20) NOT NULL"),
            ("end_date", "VARCHAR(20) NOT NULL"),
            ("duration_days", "DECIMAL(5,2) NOT NULL"),
            ("reason", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("approved_by", "VARCHAR(100)"),
            ("approved_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "mobile_push_notifications",
        &[
            ("notification_type", "VARCHAR(50) NOT NULL"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("content", "TEXT"),
            ("priority", "VARCHAR(20) NOT NULL DEFAULT 'normal'"),
            ("source_type", "VARCHAR(50)"),
            ("source_id", "UUID"),
            ("target_user", "VARCHAR(100) NOT NULL DEFAULT 'all'"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("push_time", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            (
                "tenant_id",
                "UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'",
            ),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_mobile_offline_records",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("user_id", "UUID NOT NULL"),
            ("module", "VARCHAR(64) NOT NULL"),
            ("action", "VARCHAR(64) NOT NULL"),
            ("data", "JSONB NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("retry_count", "INTEGER DEFAULT 0"),
            ("max_retries", "INTEGER DEFAULT 3"),
            ("error_message", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "offline_operations",
        &[
            ("user_id", "UUID NOT NULL"),
            ("operation_type", "VARCHAR NOT NULL"),
            ("entity_type", "VARCHAR NOT NULL"),
            ("entity_id", "VARCHAR"),
            ("operation_data", "JSONB NOT NULL"),
            ("sync_status", "VARCHAR NOT NULL DEFAULT 'pending'"),
            ("sync_attempts", "INTEGER NOT NULL DEFAULT 0"),
            ("last_sync_error", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("synced_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "sync_policies",
        &[
            ("user_id", "UUID NOT NULL"),
            ("auto_sync_enabled", "BOOLEAN NOT NULL DEFAULT true"),
            ("sync_interval_minutes", "INTEGER NOT NULL DEFAULT 5"),
            ("sync_on_network_change", "BOOLEAN NOT NULL DEFAULT true"),
            ("conflict_strategy", "VARCHAR NOT NULL DEFAULT 'server优先'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "push_notifications",
        &[
            ("title", "VARCHAR NOT NULL"),
            ("body", "TEXT NOT NULL"),
            ("notification_type", "VARCHAR NOT NULL DEFAULT 'info'"),
            ("data", "JSONB"),
            ("target_type", "VARCHAR NOT NULL"),
            ("target_ids", "TEXT[] NOT NULL"),
            ("status", "VARCHAR NOT NULL DEFAULT 'pending'"),
            ("sent_count", "INTEGER NOT NULL DEFAULT 0"),
            ("delivered_count", "INTEGER NOT NULL DEFAULT 0"),
            ("clicked_count", "INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("sent_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "push_devices",
        &[
            ("user_id", "UUID NOT NULL"),
            ("device_token", "VARCHAR NOT NULL"),
            ("platform", "VARCHAR NOT NULL"),
            ("device_model", "VARCHAR NOT NULL"),
            ("app_version", "VARCHAR NOT NULL"),
            ("os_version", "VARCHAR NOT NULL"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "push_templates",
        &[
            ("name", "VARCHAR NOT NULL"),
            ("title_template", "TEXT NOT NULL"),
            ("body_template", "TEXT NOT NULL"),
            ("notification_type", "VARCHAR NOT NULL"),
            ("description", "TEXT"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "photo_uploads",
        &[
            ("user_id", "UUID NOT NULL"),
            ("file_name", "VARCHAR NOT NULL"),
            ("file_path", "VARCHAR NOT NULL"),
            ("file_size", "BIGINT NOT NULL"),
            ("mime_type", "VARCHAR NOT NULL"),
            ("width", "INTEGER"),
            ("height", "INTEGER"),
            ("compression_ratio", "DOUBLE PRECISION"),
            ("has_watermark", "BOOLEAN NOT NULL DEFAULT false"),
            ("watermark_text", "VARCHAR"),
            ("upload_status", "VARCHAR NOT NULL DEFAULT 'uploading'"),
            ("upload_progress", "INTEGER NOT NULL DEFAULT 0"),
            ("thumbnail_url", "VARCHAR"),
            ("location_lat", "DOUBLE PRECISION"),
            ("location_lng", "DOUBLE PRECISION"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("uploaded_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "shortcuts",
        &[
            ("user_id", "UUID NOT NULL"),
            ("name", "VARCHAR NOT NULL"),
            ("icon", "VARCHAR NOT NULL"),
            ("action_type", "VARCHAR NOT NULL"),
            ("action_params", "JSONB"),
            ("sort_order", "INTEGER NOT NULL DEFAULT 0"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "media_files",
        &[
            ("file_name", "VARCHAR NOT NULL"),
            ("file_type", "VARCHAR NOT NULL"),
            ("file_url", "VARCHAR"),
            ("file_size", "BIGINT NOT NULL"),
            ("mime_type", "VARCHAR NOT NULL"),
            ("uploaded_by", "VARCHAR NOT NULL"),
            ("uploaded_by_name", "VARCHAR"),
            ("description", "TEXT"),
            ("tags", "TEXT[]"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "barcode_scans",
        &[
            ("user_id", "UUID NOT NULL"),
            ("barcode", "VARCHAR NOT NULL"),
            ("barcode_type", "VARCHAR NOT NULL"),
            ("decoded_data", "TEXT NOT NULL"),
            ("location_lat", "DOUBLE PRECISION"),
            ("location_lng", "DOUBLE PRECISION"),
            ("result_action", "VARCHAR"),
            ("result_data", "JSONB"),
            ("scanned_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "offline_sync_records",
        &[
            ("user_id", "UUID NOT NULL"),
            ("sync_type", "VARCHAR NOT NULL"),
            ("sync_data", "JSONB NOT NULL"),
            ("status", "VARCHAR NOT NULL DEFAULT 'pending'"),
            ("synced_count", "INTEGER NOT NULL DEFAULT 0"),
            ("failed_count", "INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("completed_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "devices",
        &[
            ("user_id", "UUID NOT NULL"),
            ("device_id", "VARCHAR NOT NULL"),
            ("device_name", "VARCHAR NOT NULL"),
            ("device_type", "VARCHAR NOT NULL"),
            ("os_type", "VARCHAR NOT NULL"),
            ("os_version", "VARCHAR NOT NULL"),
            ("app_version", "VARCHAR NOT NULL"),
            ("push_token", "VARCHAR"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("last_login_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "mobile_users",
        &[
            ("username", "VARCHAR NOT NULL"),
            ("password_hash", "VARCHAR NOT NULL"),
            ("nickname", "VARCHAR"),
            ("phone", "VARCHAR"),
            ("email", "VARCHAR"),
            ("avatar_url", "VARCHAR"),
            ("department", "VARCHAR"),
            ("position", "VARCHAR"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
    (
        "mobile_scan_records",
        &[
            ("user_id", "UUID NOT NULL"),
            ("scan_type", "VARCHAR NOT NULL"),
            ("scan_data", "TEXT NOT NULL"),
            ("result_data", "JSONB"),
            ("location_lat", "DOUBLE PRECISION"),
            ("location_lng", "DOUBLE PRECISION"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ")
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    if SERVICE_SCHEMA != "public" {
        sqlx::query(&format!(
            "CREATE SCHEMA IF NOT EXISTS \"{}\"",
            SERVICE_SCHEMA
        ))
        .execute(pool)
        .await?;
    }
    // 阶段 0：确保 TABLE_DEFS 中所有表的"骨架"都存在（空表仅含 id PK）。
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }

    // 阶段 1+2：调用 shared-db 抽象完成增量迁移 + 一致性自检
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

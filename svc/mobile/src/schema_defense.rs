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

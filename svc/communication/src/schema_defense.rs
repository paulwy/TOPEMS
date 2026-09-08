//! Auto-generated schema defense for the communication service.
//!
//! - Service tag: `communication`
//! - Schema: `public`
//! - Tables: 9
//!
//! This module drives idempotent table creation and column reconciliation via
//! `topems_shared_db::schema::run_schema_defense`, mirroring the pattern used by
//! other TOPEMS services (e.g. billing). Each entry in `TABLE_DEFS` omits the
//! `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` column because it is created
//! up-front by `run_schema_migration_and_verify`.

use sqlx::PgPool;

/// Schema where all communication-service tables live.
const SERVICE_SCHEMA: &str = "communication";

/// Tag used for logging / defense diagnostics.
const SERVICE_TAG: &str = "communication";

/// Static table definitions consumed by the schema defense runner.
///
/// Each tuple is `(table_name, columns)` where `columns` is a `&[(&str, &str)]`
/// of `(column_name, column_ddl)` pairs. The `id` primary-key column is
/// intentionally excluded; it is created by `run_schema_migration_and_verify`.
const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    // 1. core_notifications
    (
        "core_notifications",
        &[
            ("user_id", "UUID NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("content", "TEXT"),
            ("notification_type", "VARCHAR(64) DEFAULT 'info'"),
            ("is_read", "BOOLEAN DEFAULT FALSE"),
            ("priority", "INTEGER DEFAULT 0"),
            ("data", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("read_at", "TIMESTAMP"),
            ("is_archived", "BOOLEAN DEFAULT FALSE"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    // 2. core_notification_templates
    (
        "core_notification_templates",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("title_template", "VARCHAR(256) NOT NULL"),
            ("content_template", "TEXT NOT NULL"),
            ("notification_type", "VARCHAR(64) DEFAULT 'info'"),
            ("description", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    // 6. core_emails
    (
        "core_emails",
        &[
            ("from_email", "VARCHAR(256) NOT NULL"),
            ("to_email", "VARCHAR(256) NOT NULL"),
            ("subject", "VARCHAR(512)"),
            ("body", "TEXT"),
            ("html_body", "TEXT"),
            ("cc", "TEXT[]"),
            ("bcc", "TEXT[]"),
            ("is_read", "BOOLEAN DEFAULT FALSE"),
            ("sent_at", "TIMESTAMP"),
            ("read_at", "TIMESTAMP"),
            ("deleted_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    // 7. core_email_templates
    (
        "core_email_templates",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("subject_template", "VARCHAR(512) NOT NULL"),
            ("body_template", "TEXT NOT NULL"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    // 8. core_location_messages
    (
        "core_location_messages",
        &[
            ("chat_id", "UUID NOT NULL"),
            ("sender_id", "UUID NOT NULL"),
            ("sender_name", "VARCHAR(255)"),
            ("location_type", "VARCHAR(50) NOT NULL"),
            ("coordinates", "JSONB NOT NULL"),
            ("address", "TEXT"),
            ("place_name", "VARCHAR(255)"),
            ("place_id", "VARCHAR(255)"),
            ("gis_location_id", "UUID"),
            ("gis_location_code", "VARCHAR(100)"),
            ("gis_map_id", "UUID"),
            ("gis_map_name", "VARCHAR(255)"),
            ("map_provider", "VARCHAR(50) NOT NULL DEFAULT 'osm'"),
            ("static_map_url", "TEXT"),
            ("map_zoom", "INTEGER DEFAULT 15"),
            ("map_bearing", "DOUBLE PRECISION"),
            ("map_tilt", "DOUBLE PRECISION"),
            ("poi_types", "JSONB"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    // 9. core_geofences
    (
        "core_geofences",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("chat_id", "UUID NOT NULL"),
            ("creator_id", "UUID NOT NULL"),
            ("creator_name", "VARCHAR(255)"),
            ("shape_type", "VARCHAR(50) NOT NULL"),
            ("coordinates", "JSONB NOT NULL"),
            ("radius", "DOUBLE PRECISION"),
            ("event_types", "JSONB DEFAULT '[\"enter\"]'"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("trigger_cooldown", "INTEGER DEFAULT 300"),
            ("notify_channels", "JSONB DEFAULT '[\"notification\"]'"),
            ("notify_users", "JSONB DEFAULT '[]'"),
            ("gis_fence_id", "UUID"),
            ("start_at", "TIMESTAMP WITH TIME ZONE"),
            ("end_at", "TIMESTAMP WITH TIME ZONE"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    // 10. core_chat_rooms
    // 11. core_chat_members
    // 12. core_chat_messages
];

/// Creates the base tables (with only the `id` primary-key column) and then
/// delegates to `topems_shared_db::schema::run_schema_defense` to reconcile the
/// remaining columns for every table in [`TABLE_DEFS`].
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

/// 仅测试用：暴露 TABLE_DEFS 供单元测试断言结构
#[cfg(test)]
pub(crate) fn table_defs_for_test(
) -> &'static [(&'static str, &'static [(&'static str, &'static str)])] {
    TABLE_DEFS
}

/// 仅测试用：暴露 SERVICE_SCHEMA
#[cfg(test)]
pub(crate) fn service_schema_for_test() -> &'static str {
    SERVICE_SCHEMA
}

/// 仅测试用：暴露 SERVICE_TAG
#[cfg(test)]
pub(crate) fn service_tag_for_test() -> &'static str {
    SERVICE_TAG
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_constants() {
        assert_eq!(service_schema_for_test(), "communication");
        assert_eq!(service_tag_for_test(), "communication");
    }

    #[test]
    fn test_table_defs_count_is_six() {
        assert_eq!(table_defs_for_test().len(), 6);
    }

    #[test]
    fn test_table_defs_names_known() {
        let names: Vec<&str> = table_defs_for_test().iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"core_notifications"));
        assert!(names.contains(&"core_notification_templates"));
        assert!(names.contains(&"core_emails"));
        assert!(names.contains(&"core_email_templates"));
        assert!(names.contains(&"core_location_messages"));
        assert!(names.contains(&"core_geofences"));
    }

    #[test]
    fn test_each_table_has_nonempty_columns() {
        for (name, cols) in table_defs_for_test() {
            assert!(!cols.is_empty(), "table {} should have columns", name);
        }
    }

    #[test]
    fn test_core_notifications_has_expected_columns() {
        let notif = table_defs_for_test()
            .iter()
            .find(|(n, _)| *n == "core_notifications")
            .expect("core_notifications present");
        let col_names: Vec<&str> = notif.1.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"user_id"));
        assert!(col_names.contains(&"title"));
        assert!(col_names.contains(&"is_read"));
        assert!(col_names.contains(&"priority"));
        assert!(col_names.contains(&"deleted_at"));
    }

    #[test]
    fn test_core_emails_has_expected_columns() {
        let emails = table_defs_for_test()
            .iter()
            .find(|(n, _)| *n == "core_emails")
            .expect("core_emails present");
        let col_names: Vec<&str> = emails.1.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"from_email"));
        assert!(col_names.contains(&"to_email"));
        assert!(col_names.contains(&"subject"));
        assert!(col_names.contains(&"is_read"));
    }

    #[test]
    fn test_table_names_unique() {
        let names: Vec<&str> = table_defs_for_test().iter().map(|(n, _)| *n).collect();
        let mut sorted = names.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(sorted.len(), names.len(), "table names should be unique");
    }

    #[test]
    fn test_column_ddl_nonempty() {
        for (name, cols) in table_defs_for_test() {
            for (col, ddl) in *cols {
                assert!(!ddl.is_empty(), "table {} col {} has empty DDL", name, col);
                assert!(!col.is_empty(), "table {} has empty column name", name);
            }
        }
    }
}

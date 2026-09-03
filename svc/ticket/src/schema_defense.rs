//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "ticket";
pub const SERVICE_TAG: &str = "ticket";

/// ticket 5 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "core_tickets",
        &[
            ("ticket_no", "TEXT NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("title", "TEXT NOT NULL"),
            ("description", "TEXT"),
            ("ticket_type", "TEXT NOT NULL"),
            ("severity", "TEXT NOT NULL DEFAULT 'medium'"),
            ("status", "TEXT NOT NULL DEFAULT 'open'"),
            ("source_service", "TEXT NOT NULL"),
            ("source_business_id", "TEXT"),
            ("assignee_id", "UUID"),
            ("reporter_id", "UUID"),
            ("sla_due_at", "TIMESTAMPTZ"),
            ("resolved_at", "TIMESTAMPTZ"),
            ("closed_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tags", "TEXT[]"),
            ("metadata", "JSONB"),
        ],
    ),
    (
        "core_ticket_comments",
        &[
            ("ticket_id", "UUID NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("user_id", "UUID NOT NULL"),
            ("user_name", "TEXT"),
            ("content", "TEXT NOT NULL"),
            ("is_internal", "BOOLEAN NOT NULL DEFAULT false"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_ticket_activities",
        &[
            ("ticket_id", "UUID NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("user_id", "UUID"),
            ("action", "TEXT NOT NULL"),
            ("from_value", "TEXT"),
            ("to_value", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_ticket_sla_policies",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "TEXT NOT NULL"),
            ("description", "TEXT"),
            ("ticket_type", "TEXT"),
            ("severity", "TEXT"),
            ("response_hours", "DOUBLE PRECISION NOT NULL DEFAULT 8"),
            ("resolution_hours", "DOUBLE PRECISION NOT NULL DEFAULT 72"),
            ("escalation_levels", "INTEGER NOT NULL DEFAULT 3"),
            ("escalation_hours_1", "DOUBLE PRECISION"),
            ("escalation_hours_2", "DOUBLE PRECISION"),
            ("escalation_hours_3", "DOUBLE PRECISION"),
            ("working_hours_only", "BOOLEAN NOT NULL DEFAULT false"),
            ("business_hours_start", "TEXT"),
            ("business_hours_end", "TEXT"),
            ("weekend_excluded", "BOOLEAN NOT NULL DEFAULT false"),
            ("is_default", "BOOLEAN NOT NULL DEFAULT false"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "core_ticket_sla_escalations",
        &[
            ("ticket_id", "UUID NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("level", "INTEGER NOT NULL"),
            ("escalation_time", "TIMESTAMPTZ NOT NULL"),
            ("escalated_to", "UUID"),
            ("reason", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "ticket_automation_rules",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "TEXT NOT NULL"),
            ("description", "TEXT"),
            ("condition_field", "TEXT NOT NULL"),
            ("condition_value", "TEXT NOT NULL"),
            ("action_type", "TEXT NOT NULL"),
            ("action_value", "TEXT NOT NULL"),
            ("priority", "INTEGER NOT NULL DEFAULT 100"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT true"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "ticket_knowledge_articles",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("title", "TEXT NOT NULL"),
            ("content", "TEXT NOT NULL"),
            ("category", "TEXT"),
            ("keywords", "TEXT[] NOT NULL DEFAULT '{}'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
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

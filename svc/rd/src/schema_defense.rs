//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "rs";
pub const SERVICE_TAG: &str = "rd";

/// rd 4 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "projects",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(100) NOT NULL"),
            ("description", "TEXT"),
            ("project_type", "VARCHAR(100) NOT NULL"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("leader", "VARCHAR(255) NOT NULL"),
            ("team_members", "JSONB"),
            ("start_date", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("end_date", "TIMESTAMPTZ"),
            ("budget", "NUMERIC(15, 2)"),
            ("progress", "INTEGER NOT NULL DEFAULT 0"),
            ("created_by", "VARCHAR(255) NOT NULL"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("project_config", "JSONB"),
            ("benefit_target", "JSONB"),
            ("risk_level", "VARCHAR(50)"),
            ("priority", "INTEGER DEFAULT 3"),
            ("tags", "TEXT[]"),
            ("parent_id", "UUID"),
            ("workspace_id", "UUID"),
            ("source_type", "VARCHAR(50)"),
            ("source_id", "UUID"),
        ],
    ),
    (
        "project_phases",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("project_id", "UUID NOT NULL"),
            ("phase_number", "INT NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("start_date", "TIMESTAMPTZ"),
            ("end_date", "TIMESTAMPTZ"),
            ("planned_duration_days", "INT"),
            ("actual_duration_days", "INT"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED'"),
            ("progress", "INT DEFAULT 0"),
            ("predecessor_id", "UUID"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ],
    ),
    (
        "project_milestones",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("project_id", "UUID NOT NULL"),
            ("phase_id", "UUID"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("target_date", "TIMESTAMPTZ NOT NULL"),
            ("actual_date", "TIMESTAMPTZ"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'PENDING'"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("deliverable_type", "VARCHAR(100)"),
            ("acceptance_criteria", "TEXT"),
            ("acceptance_status", "VARCHAR(50)"),
            ("accepted_by", "VARCHAR(255)"),
            ("accepted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "project_members",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("project_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("role", "VARCHAR(50) NOT NULL DEFAULT 'OTHER'"),
            ("responsibility", "TEXT"),
            ("allocation", "NUMERIC(5,2) DEFAULT 1.0"),
            ("join_date", "TIMESTAMPTZ NOT NULL"),
            ("leave_date", "TIMESTAMPTZ"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'"),
            ("hourly_rate", "NUMERIC(10,2)"),
            ("cost_rate", "NUMERIC(10,2)"),
            ("budgeted_hours", "NUMERIC(10,2)"),
            ("actual_hours", "NUMERIC(10,2)"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ],
    ),
    (
        "change_requests",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("project_id", "UUID"),
            ("title", "TEXT NOT NULL"),
            ("description", "TEXT"),
            ("change_type", "TEXT NOT NULL"),
            ("priority", "TEXT NOT NULL DEFAULT 'medium'"),
            ("status", "TEXT NOT NULL DEFAULT 'submitted'"),
            ("impact_score", "INTEGER NOT NULL DEFAULT 0"),
            ("scope_docs", "INTEGER NOT NULL DEFAULT 0"),
            ("scope_phases", "INTEGER NOT NULL DEFAULT 0"),
            ("proposed_by", "TEXT"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ],
    ),
    (
        "change_orders",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("change_request_id", "UUID NOT NULL"),
            ("title", "TEXT NOT NULL"),
            ("execution_plan", "TEXT"),
            ("status", "TEXT NOT NULL DEFAULT 'planned'"),
            ("executed_by", "TEXT"),
            ("executed_at", "TIMESTAMPTZ"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 schema 和表骨架存在
    if SERVICE_SCHEMA != "public" {
        sqlx::query(&format!(
            "CREATE SCHEMA IF NOT EXISTS \"{}\"",
            SERVICE_SCHEMA
        ))
        .execute(pool)
        .await?;
    }
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

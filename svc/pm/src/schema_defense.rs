//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "pm";
pub const SERVICE_TAG: &str = "pm";

/// pm 17 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "projects",
        &[
            ("name", "VARCHAR(200) NOT NULL"),
            ("code", "VARCHAR(50) NOT NULL"),
            ("description", "TEXT"),
            ("project_type", "VARCHAR(50) NOT NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("leader", "VARCHAR(100)"),
            ("start_date", "TIMESTAMPTZ"),
            ("end_date", "TIMESTAMPTZ"),
            ("budget", "NUMERIC(15,2)"),
            ("progress", "INTEGER NOT NULL DEFAULT 0"),
            ("project_config", "JSONB"),
            ("benefit_target", "JSONB"),
            ("risk_level", "VARCHAR(20)"),
            ("priority", "INTEGER"),
            ("tags", "JSONB"),
            ("parent_id", "UUID"),
            ("workspace_id", "UUID"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_phases",
        &[
            ("project_id", "UUID NOT NULL"),
            ("name", "VARCHAR(100) NOT NULL"),
            ("description", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("start_date", "TIMESTAMPTZ"),
            ("end_date", "TIMESTAMPTZ"),
            ("progress", "INTEGER NOT NULL DEFAULT 0"),
            ("sort_order", "INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_milestones",
        &[
            ("project_id", "UUID NOT NULL"),
            ("phase_id", "UUID"),
            ("name", "VARCHAR(100) NOT NULL"),
            ("description", "TEXT"),
            ("due_date", "TIMESTAMPTZ"),
            ("completed_date", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_members",
        &[
            ("project_id", "UUID NOT NULL"),
            ("user_id", "VARCHAR(100) NOT NULL"),
            ("user_name", "VARCHAR(100) NOT NULL"),
            ("role", "VARCHAR(50) NOT NULL"),
            ("join_date", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("leave_date", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_resources",
        &[
            ("project_id", "UUID NOT NULL"),
            ("resource_type", "VARCHAR(50) NOT NULL"),
            ("resource_name", "VARCHAR(100) NOT NULL"),
            ("quantity", "NUMERIC(10,2)"),
            ("unit", "VARCHAR(20)"),
            ("cost", "NUMERIC(15,2)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'allocated'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_expenses",
        &[
            ("project_id", "UUID NOT NULL"),
            ("expense_type", "VARCHAR(50) NOT NULL"),
            ("amount", "NUMERIC(15,2) NOT NULL"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("expense_date", "TIMESTAMPTZ NOT NULL"),
            ("description", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("approver", "VARCHAR(100)"),
            ("approved_date", "TIMESTAMPTZ"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_benefits",
        &[
            ("project_id", "UUID NOT NULL"),
            ("benefit_type", "VARCHAR(50) NOT NULL"),
            ("amount", "NUMERIC(15,2) NOT NULL"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("benefit_date", "TIMESTAMPTZ NOT NULL"),
            ("description", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "budgets",
        &[
            ("project_id", "UUID NOT NULL"),
            ("budget_type", "VARCHAR(50) NOT NULL"),
            ("planned_amount", "NUMERIC(15,2) NOT NULL"),
            ("actual_amount", "NUMERIC(15,2) DEFAULT 0"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("period", "VARCHAR(20)"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "risks",
        &[
            ("project_id", "UUID NOT NULL"),
            ("risk_type", "VARCHAR(50) NOT NULL"),
            ("risk_name", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("probability", "VARCHAR(20) NOT NULL"),
            ("impact", "VARCHAR(20) NOT NULL"),
            ("risk_level", "VARCHAR(20) NOT NULL"),
            ("mitigation_plan", "TEXT"),
            ("contingency_plan", "TEXT"),
            ("owner", "VARCHAR(100)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'identified'"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_approvals",
        &[
            ("project_id", "UUID NOT NULL"),
            ("approval_type", "VARCHAR(50) NOT NULL"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("applicant", "VARCHAR(100) NOT NULL"),
            ("approver", "VARCHAR(100)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("submitted_at", "TIMESTAMPTZ"),
            ("approved_at", "TIMESTAMPTZ"),
            ("comments", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "contracts",
        &[
            ("project_id", "UUID NOT NULL"),
            ("contract_no", "VARCHAR(50) NOT NULL"),
            ("contract_name", "VARCHAR(200) NOT NULL"),
            ("contract_type", "VARCHAR(50) NOT NULL"),
            ("party_a", "VARCHAR(200) NOT NULL"),
            ("party_b", "VARCHAR(200) NOT NULL"),
            ("amount", "NUMERIC(15,2)"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("sign_date", "TIMESTAMPTZ"),
            ("start_date", "TIMESTAMPTZ"),
            ("end_date", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "quality_checks",
        &[
            ("project_id", "UUID NOT NULL"),
            ("check_type", "VARCHAR(50) NOT NULL"),
            ("check_name", "VARCHAR(200) NOT NULL"),
            ("check_date", "TIMESTAMPTZ NOT NULL"),
            ("checker", "VARCHAR(100) NOT NULL"),
            ("result", "VARCHAR(20) NOT NULL"),
            ("issues", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "acceptances",
        &[
            ("project_id", "UUID NOT NULL"),
            ("acceptance_no", "VARCHAR(50) NOT NULL"),
            ("acceptance_type", "VARCHAR(50) NOT NULL"),
            ("acceptance_date", "TIMESTAMPTZ NOT NULL"),
            ("acceptor", "VARCHAR(100) NOT NULL"),
            ("result", "VARCHAR(20) NOT NULL"),
            ("comments", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "settlements",
        &[
            ("project_id", "UUID NOT NULL"),
            ("settlement_no", "VARCHAR(50) NOT NULL"),
            ("settlement_type", "VARCHAR(50) NOT NULL"),
            ("settlement_date", "TIMESTAMPTZ NOT NULL"),
            ("amount", "NUMERIC(15,2) NOT NULL"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("remarks", "TEXT"),
            ("created_by", "VARCHAR(100)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "documents",
        &[
            ("project_id", "UUID NOT NULL"),
            ("document_type", "VARCHAR(50) NOT NULL"),
            ("document_name", "VARCHAR(200) NOT NULL"),
            ("file_path", "VARCHAR(500)"),
            ("file_size", "INTEGER"),
            ("version", "VARCHAR(20)"),
            ("author", "VARCHAR(100)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "project_type_configs",
        &[
            ("type_name", "VARCHAR(50) NOT NULL"),
            ("type_code", "VARCHAR(20) NOT NULL"),
            ("description", "TEXT"),
            ("default_phases", "JSONB"),
            ("default_milestones", "JSONB"),
            ("default_workflow", "UUID"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "notifications",
        &[
            ("project_id", "UUID"),
            ("notification_type", "VARCHAR(50) NOT NULL"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("content", "TEXT"),
            ("recipient", "VARCHAR(100) NOT NULL"),
            ("sent_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID NOT NULL"),
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

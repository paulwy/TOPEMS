//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "public";
pub const SERVICE_TAG: &str = "feedback";

/// feedback 1 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[(
    "core_feedbacks",
    &[
        ("user_id", "VARCHAR(255) NOT NULL"),
        ("type", "VARCHAR(50) NOT NULL"),
        ("title", "VARCHAR(255) NOT NULL"),
        ("description", "TEXT NOT NULL"),
        ("screenshots", "TEXT[]"),
        ("satisfaction", "INTEGER DEFAULT 3"),
        ("status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
        ("response", "TEXT"),
        ("responded_by", "VARCHAR(255)"),
        ("responded_at", "TIMESTAMPTZ"),
        ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ("deleted_at", "TIMESTAMP"),
    ],
)];

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

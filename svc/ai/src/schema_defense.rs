//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）
//!
//! 服务: ai | Schema: ai
//! 表来源：migrations/*.sql + src/services/db.rs inline
//! 注意：ai 服务跨多 schema（ai / core / plugin_ai）。
//!   - core.* 表由 unified-core 服务管理，此处跳过
//!   - plugin_ai.* 表由插件系统管理，此处跳过
//!   - 仅包含 ai schema 下的表

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "ai";
pub const SERVICE_TAG: &str = "ai";

/// ai schema 下 4 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
/// 列定义合并自 migrations 与 db.rs inline CREATE TABLE，取并集。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "documents",
        &[
            ("organization_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("tenant_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("knowledge_base_id", "UUID"),
            ("title", "VARCHAR(500) NOT NULL"),
            ("file_name", "VARCHAR(500) NOT NULL"),
            ("file_path", "TEXT NOT NULL"),
            ("file_size", "BIGINT"),
            ("mime_type", "VARCHAR(100)"),
            ("content_hash", "VARCHAR(64)"),
            ("category", "VARCHAR(100)"),
            ("tags", "TEXT[]"),
            ("description", "TEXT"),
            ("chunk_count", "INTEGER DEFAULT 0"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
            ("error_message", "TEXT"),
            ("processed_at", "TIMESTAMPTZ"),
            ("created_by", "UUID"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            (
                "updated_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "document_chunks",
        &[
            ("organization_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("tenant_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("document_id", "UUID NOT NULL"),
            ("knowledge_base_id", "UUID"),
            ("chunk_index", "INTEGER NOT NULL DEFAULT 0"),
            ("content", "TEXT NOT NULL"),
            ("content_hash", "VARCHAR(64)"),
            ("embedding", "vector(1536) NOT NULL"),
            ("vector_dimensions", "INTEGER DEFAULT 1536"),
            ("token_count", "INTEGER DEFAULT 0"),
            ("embedding_status", "VARCHAR(50) DEFAULT 'pending'"),
            ("embedding_model", "VARCHAR(255)"),
            ("metadata", "JSONB DEFAULT '{}'"),
            ("created_by", "UUID"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "qa_history",
        &[
            ("organization_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("tenant_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("question", "TEXT NOT NULL"),
            ("answer", "TEXT NOT NULL"),
            ("context", "JSONB DEFAULT '{}'"),
            ("sources", "JSONB DEFAULT '[]'"),
            ("feedback", "TEXT"),
            ("rating", "INTEGER"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "analysis_results",
        &[
            ("organization_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("tenant_id", "UUID NOT NULL DEFAULT gen_random_uuid()"),
            ("analysis_type", "VARCHAR(50) NOT NULL"),
            ("input_text", "TEXT NOT NULL"),
            ("result", "JSONB NOT NULL"),
            ("confidence", "DOUBLE PRECISION"),
            (
                "created_at",
                "TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
            ),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 ai schema 与 TABLE_DEFS 中所有表的"骨架"都存在
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
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

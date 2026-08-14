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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_schema_is_ai() {
        assert_eq!(SERVICE_SCHEMA, "ai");
    }

    #[test]
    fn test_service_tag_is_ai() {
        assert_eq!(SERVICE_TAG, "ai");
    }

    #[test]
    fn test_table_defs_has_four_tables() {
        assert_eq!(TABLE_DEFS.len(), 4, "should have exactly 4 tables");
    }

    #[test]
    fn test_table_defs_contains_expected_tables() {
        let table_names: Vec<&str> = TABLE_DEFS.iter().map(|(name, _)| *name).collect();
        assert!(table_names.contains(&"documents"));
        assert!(table_names.contains(&"document_chunks"));
        assert!(table_names.contains(&"qa_history"));
        assert!(table_names.contains(&"analysis_results"));
    }

    #[test]
    fn test_documents_table_has_tenant_id() {
        let documents_def = TABLE_DEFS
            .iter()
            .find(|(name, _)| *name == "documents")
            .expect("documents table should exist");
        let col_names: Vec<&str> = documents_def.1.iter().map(|(col, _)| *col).collect();
        assert!(col_names.contains(&"tenant_id"));
        assert!(col_names.contains(&"title"));
        assert!(col_names.contains(&"status"));
    }

    #[test]
    fn test_document_chunks_table_has_embedding() {
        let chunks_def = TABLE_DEFS
            .iter()
            .find(|(name, _)| *name == "document_chunks")
            .expect("document_chunks table should exist");
        let col_names: Vec<&str> = chunks_def.1.iter().map(|(col, _)| *col).collect();
        assert!(col_names.contains(&"embedding"));
        assert!(col_names.contains(&"content"));
        assert!(col_names.contains(&"chunk_index"));
    }

    #[test]
    fn test_qa_history_table_has_question_and_answer() {
        let qa_def = TABLE_DEFS
            .iter()
            .find(|(name, _)| *name == "qa_history")
            .expect("qa_history table should exist");
        let col_names: Vec<&str> = qa_def.1.iter().map(|(col, _)| *col).collect();
        assert!(col_names.contains(&"question"));
        assert!(col_names.contains(&"answer"));
        assert!(col_names.contains(&"feedback"));
    }

    #[test]
    fn test_analysis_results_table_has_analysis_type() {
        let analysis_def = TABLE_DEFS
            .iter()
            .find(|(name, _)| *name == "analysis_results")
            .expect("analysis_results table should exist");
        let col_names: Vec<&str> = analysis_def.1.iter().map(|(col, _)| *col).collect();
        assert!(col_names.contains(&"analysis_type"));
        assert!(col_names.contains(&"input_text"));
        assert!(col_names.contains(&"result"));
    }

    #[test]
    fn test_all_tables_have_tenant_id() {
        for (table_name, cols) in TABLE_DEFS.iter() {
            let col_names: Vec<&str> = cols.iter().map(|(col, _)| *col).collect();
            assert!(
                col_names.contains(&"tenant_id"),
                "table '{}' should have tenant_id column",
                table_name
            );
        }
    }

    #[test]
    fn test_all_tables_have_organization_id() {
        for (table_name, cols) in TABLE_DEFS.iter() {
            let col_names: Vec<&str> = cols.iter().map(|(col, _)| *col).collect();
            assert!(
                col_names.contains(&"organization_id"),
                "table '{}' should have organization_id column",
                table_name
            );
        }
    }

    #[test]
    fn test_all_tables_have_created_at() {
        for (table_name, cols) in TABLE_DEFS.iter() {
            let col_names: Vec<&str> = cols.iter().map(|(col, _)| *col).collect();
            assert!(
                col_names.contains(&"created_at"),
                "table '{}' should have created_at column",
                table_name
            );
        }
    }

    #[test]
    fn test_all_tables_have_deleted_at() {
        for (table_name, cols) in TABLE_DEFS.iter() {
            let col_names: Vec<&str> = cols.iter().map(|(col, _)| *col).collect();
            assert!(
                col_names.contains(&"deleted_at"),
                "table '{}' should have deleted_at column",
                table_name
            );
        }
    }

    #[test]
    fn test_column_types_are_non_empty() {
        for (table_name, cols) in TABLE_DEFS.iter() {
            for (col_name, col_type) in cols.iter() {
                assert!(
                    !col_type.is_empty(),
                    "column '{}' in table '{}' has empty type",
                    col_name,
                    table_name
                );
            }
        }
    }
}

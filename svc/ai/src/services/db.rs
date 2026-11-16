use sqlx::postgres::PgPool;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::{Db, DbPoolStats, ScopedTxn};

/// ai 模块的数据库句柄。
///
/// 运行时业务 SQL 统一通过 [`Db`] 的作用域（事务级 `SET LOCAL search_path = ai, public`）
/// 执行，不再暴露底层 `PgPool`。迁移/DDL 仍走 bootstrap 提供的 owner 迁移池。
#[derive(Clone)]
pub struct Database {
    db: Db,
    migrate_pool: Option<PgPool>,
}

impl Database {
    /// `db` 复用 bootstrap 的进程级共享池（仅包裹为 `Db` 并固化 search_path）。
    /// `migrate_pool` 仅用于 DDL（MIGRATE_URL owner）。
    pub fn from_parts(db: Db, migrate_pool: Option<PgPool>) -> Self {
        Self { db, migrate_pool }
    }

    /// 模块级数据库句柄（用于构造其它服务或按需派生作用域）。
    pub fn db(&self) -> &Db {
        &self.db
    }

    /// 复用请求级 RLS 事务：只叠加事务级 search_path，不接管提交/回滚。
    pub async fn scope_with<'a>(
        &self,
        tx: &'a mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> sqlx::Result<ScopedTxn<'a>> {
        self.db.scope_with(tx).await
    }

    /// DDL 走 owner 迁移池（MIGRATE_URL）；未配置时返回 `None`，由调用方跳过 DDL。
    pub fn ddl_pool(&self) -> Option<&PgPool> {
        self.migrate_pool.as_ref()
    }

    /// 池内统计快照（不暴露底层池）。
    pub fn stats(&self) -> DbPoolStats {
        self.db.stats()
    }

    /// 运行数据库迁移
    pub async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        let Some(ddl_pool) = self.ddl_pool() else {
            tracing::warn!("⚠️ 未配置迁移池（migrate_pool），跳过 ai schema DDL");
            return Ok(());
        };
        // 创建 ai schema
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE SCHEMA IF NOT EXISTS ai;"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        // 创建扩展
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp";"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        // 创建 vector 扩展到 ai schema（可选，如果不可用则继续运行）
        let vector_result = sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ai;"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await;

        let mut vector_available = false;
        match vector_result {
            Ok(_) => {
                tracing::info!("✅ pgvector 扩展已启用");
                vector_available = true;
            }
            Err(e) => {
                tracing::warn!("⚠️ pgvector 扩展不可用，AI 向量搜索功能将被禁用: {}", e);
                tracing::warn!("💡 如需启用向量功能，请安装 pgvector 扩展");
            }
        }

        // 文档表统一到 ai schema（收敛 plugin_ai）
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE SCHEMA IF NOT EXISTS ai;"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        // 文档表由迁移链权威创建（C-1：运行时建表已移除），此处保留索引兜底
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON ai.documents(tenant_id);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_status ON ai.documents(status);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_category ON ai.documents(category);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_documents_created_at ON ai.documents(created_at DESC);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_title ON ai.documents(title);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON ai.documents(deleted_at);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        // 文档块表由迁移链权威创建（C-1：运行时建表已移除，含 pgvector 分支）

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id ON ai.document_chunks(tenant_id);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON ai.document_chunks(document_id);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        if vector_available {
            sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON ai.document_chunks USING hnsw (embedding vector_cosine_ops);"#, "plugin_ai"))
                .execute(ddl_pool)
                .await?;
        }

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON ai.document_chunks USING gin(to_tsvector('simple', content));"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON ai.document_chunks(chunk_index);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_deleted_at ON ai.document_chunks(deleted_at);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        // 创建触发器
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            CREATE OR REPLACE FUNCTION ai.update_documents_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            "#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"DROP TRIGGER IF EXISTS update_documents_updated_at ON ai.documents;"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            CREATE TRIGGER update_documents_updated_at
                BEFORE UPDATE ON ai.documents
                FOR EACH ROW
                EXECUTE FUNCTION ai.update_documents_timestamp();
            "#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        // 问答历史表由迁移链权威创建（C-1：运行时建表已移除），此处保留索引兜底
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_qa_history_tenant_id ON ai.qa_history(tenant_id);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_qa_history_created_at ON ai.qa_history(created_at DESC);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_qa_history_rating ON ai.qa_history(rating);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_qa_history_deleted_at ON ai.qa_history(deleted_at);"#,
            "plugin_ai"
        ))
        .execute(ddl_pool)
        .await?;

        // 分析结果表由迁移链权威创建（C-1：运行时建表已移除），此处保留索引兜底
        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_results_tenant_id ON ai.analysis_results(tenant_id);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_type ON ai.analysis_results(analysis_type);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON ai.analysis_results(created_at DESC);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_results_deleted_at ON ai.analysis_results(deleted_at);"#, "plugin_ai"))
            .execute(ddl_pool)
            .await?;

        // ai_training_samples 由迁移链权威创建（C-1：运行时建表已移除）

        tracing::info!("✅ 数据库迁移完成");
        Ok(())
    }
}

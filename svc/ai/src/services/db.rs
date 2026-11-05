use sqlx::postgres::PgPool;
use topems_shared_boundary::only_own_schema_query;

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
    migrate_pool: Option<PgPool>,
}

impl Database {
    /// 复用 bootstrap 的进程级连接池，不再单独建第二个池。
    ///
    /// 连接治理 A：此前 ai 额外建了一个 `max=100 / min=10` 的池，既不计入模块池上限，
    /// 也让进程连接数突破全局预算。`bootstrap_service` 已完成 application_name、
    /// 默认租户上下文（after_connect）与迁移池初始化，这里直接复用其句柄。
    pub fn from_parts(pool: PgPool, migrate_pool: Option<PgPool>) -> Self {
        Self { pool, migrate_pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// DDL 走 owner 迁移池（MIGRATE_URL），未配置时回退运行时池
    pub fn ddl_pool(&self) -> &PgPool {
        self.migrate_pool.as_ref().unwrap_or(&self.pool)
    }

    /// 运行数据库迁移
    pub async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        // 创建 ai schema
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE SCHEMA IF NOT EXISTS ai;"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        // 创建扩展
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp";"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        // 创建 vector 扩展到 ai schema（可选，如果不可用则继续运行）
        let vector_result = sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ai;"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
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
        .execute(self.ddl_pool())
        .await?;

        // 文档表由迁移链权威创建（C-1：运行时建表已移除），此处保留索引兜底
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON ai.documents(tenant_id);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_status ON ai.documents(status);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_category ON ai.documents(category);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_documents_created_at ON ai.documents(created_at DESC);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_title ON ai.documents(title);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON ai.documents(deleted_at);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        // 文档块表由迁移链权威创建（C-1：运行时建表已移除，含 pgvector 分支）

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id ON ai.document_chunks(tenant_id);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON ai.document_chunks(document_id);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        if vector_available {
            sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON ai.document_chunks USING hnsw (embedding vector_cosine_ops);"#, "plugin_ai"))
                .execute(self.ddl_pool())
                .await?;
        }

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON ai.document_chunks USING gin(to_tsvector('simple', content));"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON ai.document_chunks(chunk_index);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_document_chunks_deleted_at ON ai.document_chunks(deleted_at);"#, "plugin_ai"))
            .execute(self.ddl_pool())
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
        .execute(self.ddl_pool())
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"DROP TRIGGER IF EXISTS update_documents_updated_at ON ai.documents;"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
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
        .execute(self.ddl_pool())
        .await?;

        // 问答历史表由迁移链权威创建（C-1：运行时建表已移除），此处保留索引兜底
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_qa_history_tenant_id ON ai.qa_history(tenant_id);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_qa_history_created_at ON ai.qa_history(created_at DESC);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_qa_history_rating ON ai.qa_history(rating);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        sqlx::query(only_own_schema_query!(
            "ai",
            r#"CREATE INDEX IF NOT EXISTS idx_qa_history_deleted_at ON ai.qa_history(deleted_at);"#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        // 分析结果表由迁移链权威创建（C-1：运行时建表已移除），此处保留索引兜底
        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_results_tenant_id ON ai.analysis_results(tenant_id);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_type ON ai.analysis_results(analysis_type);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON ai.analysis_results(created_at DESC);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        sqlx::query(only_own_schema_query!("ai", r#"CREATE INDEX IF NOT EXISTS idx_analysis_results_deleted_at ON ai.analysis_results(deleted_at);"#, "plugin_ai"))
            .execute(self.ddl_pool())
            .await?;

        // ai_training_samples 由迁移链权威创建（C-1：运行时建表已移除）

        tracing::info!("✅ 数据库迁移完成");
        Ok(())
    }
}

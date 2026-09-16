use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::database::create_migrate_pool;

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
    migrate_pool: Option<PgPool>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        // 单租户部署（MULTI_TENANT_ENABLED != true）且配置 DEFAULT_TENANT_ID 时，
        // 连接建立即固定租户上下文：FORCE RLS 下 ai 业务查询（stats/dashboard 等
        // 不经 tenant_middleware txn 的直查路径）仍能按默认租户读到数据。
        // 多租户部署保持逐请求隔离；请求级 txn（set_config(..., true)）可覆盖。
        let default_tenant = std::env::var("DEFAULT_TENANT_ID")
            .ok()
            .filter(|_| {
                !std::env::var("MULTI_TENANT_ENABLED")
                    .map(|v| v == "true" || v == "1")
                    .unwrap_or(false)
            })
            .and_then(|t| t.parse::<uuid::Uuid>().ok())
            .map(|u| u.to_string());

        let pool = PgPoolOptions::new()
            .max_connections(100)
            .min_connections(10)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(1800))
            .after_connect(move |conn, _meta| {
                let dt = default_tenant.clone();
                Box::pin(async move {
                    if let Some(t) = dt {
                        tracing::debug!("[ai-db] setting default tenant context: {}", t);
                        sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                            .bind(&t)
                            .execute(&mut *conn)
                            .await?;
                    }
                    Ok(())
                })
            })
            .connect(database_url)
            .await?;

        let migrate_pool = create_migrate_pool().await.unwrap_or_else(|e| {
            tracing::warn!("⚠️ MIGRATE_URL 迁移池创建失败，DDL 回退运行时池: {}", e);
            None
        });

        Ok(Self { pool, migrate_pool })
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

        // 创建文档表
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            CREATE TABLE IF NOT EXISTS ai.documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
                knowledge_base_id UUID,
                title VARCHAR(500) NOT NULL,
                file_name VARCHAR(500) NOT NULL,
                file_path TEXT NOT NULL,
                file_size BIGINT,
                mime_type VARCHAR(100),
                content_hash VARCHAR(64),
                category VARCHAR(100),
                tags TEXT[],
                description TEXT,
                chunk_count INTEGER DEFAULT 0,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                error_message TEXT,
                processed_at TIMESTAMP WITH TIME ZONE,
                created_by UUID,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );
            "#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        // 创建文档表索引
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

        // 创建文档块表（pgvector 可用时含 embedding 向量列，否则降级为 JSONB 存储）
        if vector_available {
            sqlx::query(only_own_schema_query!(
                "ai",
                r#"
                CREATE TABLE IF NOT EXISTS ai.document_chunks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
                    document_id UUID NOT NULL REFERENCES ai.documents(id) ON DELETE CASCADE,
                    knowledge_base_id UUID,
                    chunk_index INTEGER NOT NULL DEFAULT 0,
                    content TEXT NOT NULL,
                    content_hash VARCHAR(64),
                    embedding vector(1536) NOT NULL,
                    vector_dimensions INTEGER DEFAULT 1536,
                    token_count INTEGER DEFAULT 0,
                    embedding_status VARCHAR(50) DEFAULT 'pending',
                    embedding_model VARCHAR(255),
                    metadata JSONB DEFAULT '{}',
                    created_by UUID,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TIMESTAMP WITH TIME ZONE
                );
                "#,
                "plugin_ai"
            ))
            .execute(self.ddl_pool())
            .await?;
        } else {
            sqlx::query(only_own_schema_query!(
                "ai",
                r#"
                CREATE TABLE IF NOT EXISTS ai.document_chunks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
                    document_id UUID NOT NULL REFERENCES ai.documents(id) ON DELETE CASCADE,
                    knowledge_base_id UUID,
                    chunk_index INTEGER NOT NULL DEFAULT 0,
                    content TEXT NOT NULL,
                    content_hash VARCHAR(64),
                    embedding JSONB NOT NULL DEFAULT '[]',
                    vector_dimensions INTEGER DEFAULT 1536,
                    token_count INTEGER DEFAULT 0,
                    embedding_status VARCHAR(50) DEFAULT 'pending',
                    embedding_model VARCHAR(255),
                    metadata JSONB DEFAULT '{}',
                    created_by UUID,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TIMESTAMP WITH TIME ZONE
                );
                "#,
                "plugin_ai"
            ))
            .execute(self.ddl_pool())
            .await?;
        }

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

        // 创建问答历史表
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            CREATE TABLE IF NOT EXISTS ai.qa_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                context JSONB DEFAULT '{}',
                sources JSONB DEFAULT '[]',
                feedback TEXT,
                rating INTEGER,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );
            "#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

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

        // 创建分析结果表
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            CREATE TABLE IF NOT EXISTS ai.analysis_results (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
                analysis_type VARCHAR(50) NOT NULL,
                input_text TEXT NOT NULL,
                result JSONB NOT NULL,
                confidence DOUBLE PRECISION,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );
            "#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

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

        // ai_training_samples：事件处理器（event_handlers）写入的训练样本表
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            CREATE TABLE IF NOT EXISTS ai.ai_training_samples (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                model_type VARCHAR(100),
                sample_type VARCHAR(100),
                label TEXT,
                source_type VARCHAR(100) NOT NULL,
                source_id VARCHAR(255) NOT NULL,
                features_json JSONB,
                quality_score DOUBLE PRECISION,
                is_used BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                tenant_id UUID NOT NULL,
                UNIQUE (source_type, source_id)
            );
            "#,
            "plugin_ai"
        ))
        .execute(self.ddl_pool())
        .await?;

        tracing::info!("✅ 数据库迁移完成");
        Ok(())
    }
}

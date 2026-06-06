use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(30))
            .connect(database_url)
            .await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// 运行数据库迁移
    pub async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        // 创建向量表（如果不存在）
        sqlx::query(
            r#"
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "vector";

            CREATE TABLE IF NOT EXISTS kb_documents (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                title VARCHAR(500) NOT NULL,
                filename VARCHAR(500) NOT NULL,
                file_path VARCHAR(1000),
                file_size BIGINT,
                mime_type VARCHAR(100),
                content_hash VARCHAR(64),
                category VARCHAR(100),
                tags TEXT[],
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                error_message TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_documents_status ON kb_documents(status);
            CREATE INDEX IF NOT EXISTS idx_documents_category ON kb_documents(category);
            CREATE INDEX IF NOT EXISTS idx_documents_created_at ON kb_documents(created_at DESC);

            CREATE TABLE IF NOT EXISTS kb_document_chunks (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON kb_document_chunks(document_id);

            CREATE TABLE IF NOT EXISTS kb_vector_embeddings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
                chunk_id UUID NOT NULL REFERENCES kb_document_chunks(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding VECTOR(768),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON kb_vector_embeddings
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            CREATE INDEX IF NOT EXISTS idx_vectors_document_id ON kb_vector_embeddings(document_id);
            CREATE INDEX IF NOT EXISTS idx_vectors_chunk_id ON kb_vector_embeddings(chunk_id);

            -- Trigger for updated_at
            CREATE OR REPLACE FUNCTION update_kb_documents_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS update_kb_documents_updated_at ON kb_documents;
            CREATE TRIGGER update_kb_documents_updated_at
                BEFORE UPDATE ON kb_documents
                FOR EACH ROW
                EXECUTE FUNCTION update_kb_documents_timestamp();
            "#,
        )
        .execute(&self.pool)
        .await?;

        tracing::info!("✅ 数据库迁移完成");
        Ok(())
    }
}

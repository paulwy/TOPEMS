//! AI Module for unified-core
//!
//! AI 能力作为核心平台的一部分，提供：
//! - 智能对话
//! - 文档分析
//! - 向量检索
//! - 内容生成

pub mod handlers;
pub mod models;
pub mod service;

pub use handlers::*;
pub use models::*;
pub use service::*;

use sqlx::PgPool;

/// 初始化 AI 数据库表
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 创建 plugin_ai schema（如果不存在）
    sqlx::query("CREATE SCHEMA IF NOT EXISTS plugin_ai")
        .execute(pool)
        .await?;

    // 创建文档表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS plugin_ai.documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            file_name VARCHAR(500) NOT NULL,
            file_path TEXT,
            file_size BIGINT,
            mime_type VARCHAR(100),
            content_hash VARCHAR(64),
            category VARCHAR(100),
            tags TEXT[],
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建文档分块表（带向量扩展）
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS plugin_ai.document_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES plugin_ai.documents(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(768),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(document_id, chunk_index)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建问答历史表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS plugin_ai.qa_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            context JSONB,
            sources JSONB,
            feedback TEXT,
            rating INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建向量索引
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
        ON plugin_ai.document_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        "#,
    )
    .execute(pool)
    .await?;

    // 创建全文检索索引
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_document_chunks_content
        ON plugin_ai.document_chunks
        USING gin(to_tsvector('simple', content))
        "#,
    )
    .execute(pool)
    .await?;

    tracing::info!("✅ AI module database initialized");
    Ok(())
}

//! AI 知识库模块
//!
//! 提供 AI 知识库基础功能：
//! - 知识库管理（CRUD）
//! - 文档管理（上传/解析/分块/向量化）
//! - 语义检索（基于 pgvector 向量相似度）
//! - 智能问答（RAG 检索增强生成）
//!
//! # 架构
//! - `models`：数据模型与 API 请求/响应结构
//! - `document_processor`：文档解析、分块、向量化
//! - `rag`：RAG 检索增强生成
//! - `service`：业务逻辑（CRUD、文档处理流程）
//! - `handlers`：API handlers
//!
//! # 多租户
//! 所有表均带 `tenant_id` 用于多租户隔离，所有查询自动过滤。
//!
//! # 异步处理
//! 文档上传后异步处理（向量化耗时），通过 `status` 字段跟踪状态：
//! - `pending`：待处理
//! - `processing`：处理中
//! - `ready`：就绪（可用于检索与问答）
//! - `failed`：处理失败（`error_message` 记录原因）

pub mod document_processor;
pub mod handlers;
pub mod models;
pub mod rag;
pub mod service;

pub use handlers::{
    ask_question, create_knowledge_base, delete_document, delete_knowledge_base, get_document,
    get_knowledge_base, list_documents, list_knowledge_bases, list_qa_history, reprocess_document,
    semantic_search, submit_feedback, update_document, update_knowledge_base, upload_document,
};

use axum::routing::{delete, get, post, put};
use axum::Router;
use sqlx::PgPool;

use crate::shared::AppState;
use topems_shared_auth::middleware::permission::require_permission;

/// 初始化 AI 知识库数据库表（幂等）
///
/// 创建以下表：
/// - `core.knowledge_bases`：知识库
/// - `core.knowledge_documents`：知识文档
/// - `core.knowledge_chunks`：文档分块（含 pgvector 向量列）
/// - `core.knowledge_qa_history`：问答历史
///
/// 同时启用 pgvector 扩展并创建索引。
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 1. 启用 pgvector 扩展（若未安装则需先在 PostgreSQL 中安装）
    sqlx::query("CREATE EXTENSION IF NOT EXISTS vector")
        .execute(pool)
        .await?;

    // 2. 知识库表
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core.knowledge_bases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            kb_type VARCHAR(50) NOT NULL DEFAULT 'general',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            document_count INTEGER NOT NULL DEFAULT 0,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kb_tenant_id ON core.knowledge_bases(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kb_status ON core.knowledge_bases(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kb_created_by ON core.knowledge_bases(created_by)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kb_kb_type ON core.knowledge_bases(kb_type)")
        .execute(pool)
        .await?;

    // 3. 知识文档表
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core.knowledge_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            kb_id UUID NOT NULL REFERENCES core.knowledge_bases(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            doc_type VARCHAR(20) NOT NULL,
            file_path VARCHAR(500),
            file_size BIGINT,
            chunk_count INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            error_message TEXT,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_kd_tenant_id ON core.knowledge_documents(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kd_kb_id ON core.knowledge_documents(kb_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kd_status ON core.knowledge_documents(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kd_doc_type ON core.knowledge_documents(doc_type)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_kd_created_by ON core.knowledge_documents(created_by)",
    )
    .execute(pool)
    .await?;

    // 4. 文档分块表（含向量）
    // 注意：embedding 列使用 pgvector 的 vector(1536) 类型
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core.knowledge_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            document_id UUID NOT NULL REFERENCES core.knowledge_documents(id) ON DELETE CASCADE,
            kb_id UUID NOT NULL REFERENCES core.knowledge_bases(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            token_count INTEGER,
            embedding vector(1536),
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kc_tenant_id ON core.knowledge_chunks(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_kc_document_id ON core.knowledge_chunks(document_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kc_kb_id ON core.knowledge_chunks(kb_id)")
        .execute(pool)
        .await?;

    // 向量相似度索引（IVFFlat）：注意 - 仅在表非空时才能创建有效索引
    // 此处使用 IF NOT EXISTS 保证幂等
    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_kc_embedding
           ON core.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
           WITH (lists = 100)"#,
    )
    .execute(pool)
    .await?;

    // 5. 问答历史表
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core.knowledge_qa_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            kb_id UUID NOT NULL REFERENCES core.knowledge_bases(id) ON DELETE CASCADE,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            sources JSONB,
            feedback INTEGER,
            user_id UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_tenant_id ON core.knowledge_qa_history(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_kb_id ON core.knowledge_qa_history(kb_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_user_id ON core.knowledge_qa_history(user_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_created_at ON core.knowledge_qa_history(created_at)",
    )
    .execute(pool)
    .await?;

    // 6. updated_at 触发器
    sqlx::query(
        r#"CREATE OR REPLACE FUNCTION core_set_updated_at() RETURNS trigger AS $$
        BEGIN
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql"#,
    )
    .execute(pool)
    .await?;

    sqlx::query("DROP TRIGGER IF EXISTS trg_kb_updated_at ON core.knowledge_bases")
        .execute(pool)
        .await?;
    sqlx::query(
        r#"CREATE TRIGGER trg_kb_updated_at BEFORE UPDATE ON core.knowledge_bases
           FOR EACH ROW EXECUTE FUNCTION core_set_updated_at()"#,
    )
    .execute(pool)
    .await?;

    sqlx::query("DROP TRIGGER IF EXISTS trg_kd_updated_at ON core.knowledge_documents")
        .execute(pool)
        .await?;
    sqlx::query(
        r#"CREATE TRIGGER trg_kd_updated_at BEFORE UPDATE ON core.knowledge_documents
           FOR EACH ROW EXECUTE FUNCTION core_set_updated_at()"#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// 创建 AI 知识库模块路由
///
/// 路由按权限级别分组：
/// - 读取类（`knowledge:read`）：列表、详情、问答历史
/// - 写入类（`knowledge:write`）：创建、更新、上传、重新处理、反馈
/// - 删除类（`knowledge:admin`）：删除
/// - 问答/检索（`knowledge:read`）：智能问答与语义检索
pub fn create_routes() -> Router<AppState> {
    // ===== 读取类路由（需要 knowledge:read 权限）=====
    let read_routes = Router::new()
        .route(
            "/api/core/ai-knowledge/bases",
            get(handlers::list_knowledge_bases),
        )
        .route(
            "/api/core/ai-knowledge/bases/{id}",
            get(handlers::get_knowledge_base),
        )
        .route(
            "/api/core/ai-knowledge/documents",
            get(handlers::list_documents),
        )
        .route(
            "/api/core/ai-knowledge/documents/{id}",
            get(handlers::get_document),
        )
        .route(
            "/api/core/ai-knowledge/qa-history",
            get(handlers::list_qa_history),
        )
        .route("/api/core/ai-knowledge/ask", post(handlers::ask_question))
        .route(
            "/api/core/ai-knowledge/search",
            post(handlers::semantic_search),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "knowledge:read",
        )));

    // ===== 写入类路由（需要 knowledge:write 权限）=====
    let write_routes = Router::new()
        .route(
            "/api/core/ai-knowledge/bases",
            post(handlers::create_knowledge_base),
        )
        .route(
            "/api/core/ai-knowledge/bases/{id}",
            put(handlers::update_knowledge_base),
        )
        .route(
            "/api/core/ai-knowledge/documents",
            post(handlers::upload_document),
        )
        .route(
            "/api/core/ai-knowledge/documents/{id}",
            put(handlers::update_document),
        )
        .route(
            "/api/core/ai-knowledge/documents/{id}/reprocess",
            post(handlers::reprocess_document),
        )
        .route(
            "/api/core/ai-knowledge/qa/{id}/feedback",
            post(handlers::submit_feedback),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "knowledge:write",
        )));

    // ===== 删除类路由（需要 knowledge:admin 权限）=====
    let admin_routes = Router::new()
        .route(
            "/api/core/ai-knowledge/bases/{id}",
            delete(handlers::delete_knowledge_base),
        )
        .route(
            "/api/core/ai-knowledge/documents/{id}",
            delete(handlers::delete_document),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "knowledge:admin",
        )));

    Router::new()
        .merge(read_routes)
        .merge(write_routes)
        .merge(admin_routes)
}

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

use axum::routing::{delete, get, post, put};
use axum::Router;
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;

use crate::shared::AppState;
use topems_shared_auth::middleware::require_permission;

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
    // ddl_pool 用户可能非表 owner（如 MIGRATE_URL=topems vs owner=topems_app）：
    // CREATE TABLE/INDEX IF NOT EXISTS 的权限检查先于存在性判断会报 must be owner，
    // 故先查 pg_tables / pg_indexes 存在性，已存在则跳过 DDL。
    async fn ensure_kb_table(
        pool: &PgPool,
        table_name: &str,
        ddl: &str,
    ) -> Result<(), sqlx::Error> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'core' AND tablename = $1)",
        )
        .bind(table_name)
        .fetch_one(pool)
        .await?;
        if exists {
            return Ok(());
        }
        sqlx::query(ddl).execute(pool).await?;
        Ok(())
    }
    async fn ensure_kb_index(
        pool: &PgPool,
        index_name: &str,
        ddl: &str,
    ) -> Result<(), sqlx::Error> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'core' AND indexname = $1)",
        )
        .bind(index_name)
        .fetch_one(pool)
        .await?;
        if exists {
            return Ok(());
        }
        // 索引属性能优化：创建失败（ddl_pool 非表 owner / 表为空等）仅告警，不阻塞启动
        if let Err(e) = sqlx::query(ddl).execute(pool).await {
            tracing::warn!(
                "[ai] 索引 {} 创建失败（已存在则跳过 / 无 DDL 权限则降级）: {}",
                index_name,
                e
            );
        }
        Ok(())
    }

    async fn ensure_kb_function(
        pool: &PgPool,
        fn_name: &str,
        ddl: &str,
    ) -> Result<(), sqlx::Error> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'core' AND p.proname = $1)",
        )
        .bind(fn_name)
        .fetch_one(pool)
        .await?;
        if exists {
            return Ok(());
        }
        // 增强性对象：创建失败（ddl_pool 无 schema CREATE 权限等）仅告警
        if let Err(e) = sqlx::query(ddl).execute(pool).await {
            tracing::warn!("[ai] 函数 {} 创建失败（降级）: {}", fn_name, e);
        }
        Ok(())
    }
    async fn ensure_kb_trigger(
        pool: &PgPool,
        trigger_name: &str,
        table_name: &str,
        create_ddl: &str,
    ) -> Result<(), sqlx::Error> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'core' AND c.relname = $1 AND t.tgname = $2)",
        )
        .bind(table_name)
        .bind(trigger_name)
        .fetch_one(pool)
        .await?;
        if exists {
            return Ok(());
        }
        // 增强性对象：创建失败（ddl_pool 无表 TRIGGER 权限等）仅告警
        if let Err(e) = sqlx::query(create_ddl).execute(pool).await {
            tracing::warn!(
                "[ai] 触发器 {}@{} 创建失败（降级）: {}",
                trigger_name,
                table_name,
                e
            );
        }
        Ok(())
    }

    // 1. 启用 pgvector 扩展（若未安装则需先在 PostgreSQL 中安装）
    sqlx::query(only_own_schema_query!(
        "ai",
        "CREATE EXTENSION IF NOT EXISTS vector",
        "core"
    ))
    .execute(pool)
    .await?;

    // 2. 知识库表
    ensure_kb_table(
        pool,
        "knowledge_bases",
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
        "#,
    )
    .await?;

    ensure_kb_index(
        pool,
        "idx_kb_tenant_id",
        "CREATE INDEX IF NOT EXISTS idx_kb_tenant_id ON core.knowledge_bases(tenant_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kb_status",
        "CREATE INDEX IF NOT EXISTS idx_kb_status ON core.knowledge_bases(status)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kb_created_by",
        "CREATE INDEX IF NOT EXISTS idx_kb_created_by ON core.knowledge_bases(created_by)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kb_kb_type",
        "CREATE INDEX IF NOT EXISTS idx_kb_kb_type ON core.knowledge_bases(kb_type)",
    )
    .await?;

    // 3. 知识文档表
    ensure_kb_table(
        pool,
        "knowledge_documents",
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
        "#,
    )
    .await?;

    ensure_kb_index(
        pool,
        "idx_kd_tenant_id",
        "CREATE INDEX IF NOT EXISTS idx_kd_tenant_id ON core.knowledge_documents(tenant_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kd_kb_id",
        "CREATE INDEX IF NOT EXISTS idx_kd_kb_id ON core.knowledge_documents(kb_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kd_status",
        "CREATE INDEX IF NOT EXISTS idx_kd_status ON core.knowledge_documents(status)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kd_doc_type",
        "CREATE INDEX IF NOT EXISTS idx_kd_doc_type ON core.knowledge_documents(doc_type)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kd_created_by",
        "CREATE INDEX IF NOT EXISTS idx_kd_created_by ON core.knowledge_documents(created_by)",
    )
    .await?;

    // 4. 文档分块表（含向量）
    // 注意：embedding 列使用 pgvector 的 vector(1536) 类型
    ensure_kb_table(
        pool,
        "knowledge_chunks",
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
        "#,
    )
    .await?;

    ensure_kb_index(
        pool,
        "idx_kc_tenant_id",
        "CREATE INDEX IF NOT EXISTS idx_kc_tenant_id ON core.knowledge_chunks(tenant_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kc_document_id",
        "CREATE INDEX IF NOT EXISTS idx_kc_document_id ON core.knowledge_chunks(document_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_kc_kb_id",
        "CREATE INDEX IF NOT EXISTS idx_kc_kb_id ON core.knowledge_chunks(kb_id)",
    )
    .await?;

    // 向量相似度索引（IVFFlat）：注意 - 仅在表非空时才能创建有效索引
    // 已存在则跳过；创建失败（如 ddl_pool 非表 owner / 表为空）仅告警，不影响功能
    if let Err(e) = ensure_kb_index(
        pool,
        "idx_kc_embedding",
        r#"CREATE INDEX IF NOT EXISTS idx_kc_embedding
           ON core.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
           WITH (lists = 100)"#,
    )
    .await
    {
        tracing::warn!(
            "[ai] 向量索引 idx_kc_embedding 创建失败（语义检索将回退顺序扫描）: {}",
            e
        );
    }

    // 5. 问答历史表
    ensure_kb_table(
        pool,
        "knowledge_qa_history",
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
        "#,
    )
    .await?;

    ensure_kb_index(
        pool,
        "idx_qa_tenant_id",
        "CREATE INDEX IF NOT EXISTS idx_qa_tenant_id ON core.knowledge_qa_history(tenant_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_qa_kb_id",
        "CREATE INDEX IF NOT EXISTS idx_qa_kb_id ON core.knowledge_qa_history(kb_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_qa_user_id",
        "CREATE INDEX IF NOT EXISTS idx_qa_user_id ON core.knowledge_qa_history(user_id)",
    )
    .await?;
    ensure_kb_index(
        pool,
        "idx_qa_created_at",
        "CREATE INDEX IF NOT EXISTS idx_qa_created_at ON core.knowledge_qa_history(created_at)",
    )
    .await?;

    // 6. updated_at 触发器
    ensure_kb_function(
        pool,
        "core_set_updated_at",
        r#"CREATE OR REPLACE FUNCTION core_set_updated_at() RETURNS trigger AS $$
        BEGIN
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql"#,
    )
    .await?;

    ensure_kb_trigger(
        pool,
        "trg_kb_updated_at",
        "knowledge_bases",
        r#"CREATE TRIGGER trg_kb_updated_at BEFORE UPDATE ON core.knowledge_bases
           FOR EACH ROW EXECUTE FUNCTION core_set_updated_at()"#,
    )
    .await?;

    ensure_kb_trigger(
        pool,
        "trg_kd_updated_at",
        "knowledge_documents",
        r#"CREATE TRIGGER trg_kd_updated_at BEFORE UPDATE ON core.knowledge_documents
           FOR EACH ROW EXECUTE FUNCTION core_set_updated_at()"#,
    )
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
        .route("/knowledge/bases", get(handlers::list_knowledge_bases))
        .route("/knowledge/bases/{id}", get(handlers::get_knowledge_base))
        .route("/knowledge/documents", get(handlers::list_documents))
        .route("/knowledge/documents/{id}", get(handlers::get_document))
        .route("/knowledge/qa-history", get(handlers::list_qa_history))
        .route("/knowledge/ask", post(handlers::ask_question))
        .route("/knowledge/search", post(handlers::semantic_search))
        .layer(axum::middleware::from_fn(require_permission(
            "ai:dashboard:read",
        )));

    // ===== 写入类路由（需要 ai:dashboard:write 权限）=====
    let write_routes = Router::new()
        .route("/knowledge/bases", post(handlers::create_knowledge_base))
        .route(
            "/knowledge/bases/{id}",
            put(handlers::update_knowledge_base),
        )
        .route("/knowledge/documents", post(handlers::upload_document))
        .route("/knowledge/documents/{id}", put(handlers::update_document))
        .route(
            "/knowledge/documents/{id}/reprocess",
            post(handlers::reprocess_document),
        )
        .route(
            "/knowledge/qa/{id}/feedback",
            post(handlers::submit_feedback),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "ai:dashboard:write",
        )));

    // ===== 删除类路由（需要 ai:dashboard:admin 权限）=====
    let admin_routes = Router::new()
        .route(
            "/knowledge/bases/{id}",
            delete(handlers::delete_knowledge_base),
        )
        .route(
            "/knowledge/documents/{id}",
            delete(handlers::delete_document),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "ai:dashboard:admin",
        )));

    Router::new()
        .merge(read_routes)
        .merge(write_routes)
        .merge(admin_routes)
}

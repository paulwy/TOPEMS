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
pub mod document_status;
pub mod handlers;
pub mod models;
pub mod rag;
pub mod service;

use axum::routing::{delete, get, post, put};
use axum::Router;

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

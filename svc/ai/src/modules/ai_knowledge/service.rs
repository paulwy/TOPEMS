//! AI 知识库 - 业务逻辑层
//!
//! 提供知识库、文档、分块、问答历史的 CRUD 与业务流程：
//! - 知识库管理（list/get/create/update/delete）
//! - 文档管理（list/get/create_from_content/delete/reprocess）
//! - 文档处理流程（解析 → 分块 → 向量化 → 入库）
//! - 问答历史与反馈

use std::sync::Arc;

use sqlx::PgPool;
use topems_shared::{create_client, AIModelConfig, AIProviderType, UnifiedAIClient};
use uuid::Uuid;

use super::document_processor::{
    self, chunk_document, generate_embeddings, vector_to_pgvector_string, ProcessorError,
};
use super::models::*;
use super::rag::{self, RetrievedChunk};

// ============================================================
// 工具函数
// ============================================================

/// 从 Claims 的 tenant_id 字符串解析为 Uuid
pub fn parse_tenant_id(tenant_id_str: &Option<String>) -> Uuid {
    tenant_id_str
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(|| Uuid::nil())
}

/// 创建 AI 客户端
///
/// 使用 Ollama 本地服务作为默认 embedding/LLM 提供方，
/// 与 ai_form 模块保持一致。
pub fn create_ai_client() -> UnifiedAIClient {
    let config = AIModelConfig {
        provider: AIProviderType::Ollama,
        model_name: "qwen2.5:7b-instruct".to_string(),
        base_url: "http://localhost:11434/v1".to_string(),
        ..Default::default()
    };
    create_client(config)
}

// ============================================================
// 知识库 CRUD
// ============================================================

/// 查询知识库列表（带分页与过滤）
pub async fn list_knowledge_bases(
    pool: &PgPool,
    tenant_id: Uuid,
    query: &KbQuery,
) -> Result<Vec<KnowledgeBase>, sqlx::Error> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let search_like = query.search.as_ref().map(|s| format!("%{}%", s));

    let items: Vec<KnowledgeBase> = sqlx::query_as(
        r#"SELECT id, tenant_id, name, description, kb_type, status,
                  document_count, created_by, created_at, updated_at
           FROM core.knowledge_bases
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR kb_type = $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::text IS NULL OR name ILIKE $4)
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(&query.kb_type)
    .bind(&query.status)
    .bind(&search_like)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(items)
}

/// 获取知识库详情
pub async fn get_knowledge_base(
    pool: &PgPool,
    tenant_id: Uuid,
    kb_id: Uuid,
) -> Result<Option<KnowledgeBase>, sqlx::Error> {
    let item: Option<KnowledgeBase> = sqlx::query_as(
        r#"SELECT id, tenant_id, name, description, kb_type, status,
                  document_count, created_by, created_at, updated_at
           FROM core.knowledge_bases
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(kb_id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await?;

    Ok(item)
}

/// 创建知识库
pub async fn create_knowledge_base(
    pool: &PgPool,
    tenant_id: Uuid,
    req: &CreateKbRequest,
    created_by: Uuid,
) -> Result<KnowledgeBase, sqlx::Error> {
    let item: KnowledgeBase = sqlx::query_as(
        r#"INSERT INTO core.knowledge_bases
            (tenant_id, name, description, kb_type, status, document_count, created_by)
           VALUES ($1, $2, $3, $4, 'active', 0, $5)
           RETURNING id, tenant_id, name, description, kb_type, status,
                     document_count, created_by, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.kb_type)
    .bind(created_by)
    .fetch_one(pool)
    .await?;

    Ok(item)
}

/// 更新知识库
pub async fn update_knowledge_base(
    pool: &PgPool,
    tenant_id: Uuid,
    kb_id: Uuid,
    req: &UpdateKbRequest,
) -> Result<Option<KnowledgeBase>, sqlx::Error> {
    // 先校验存在且属于该租户
    let existing = get_knowledge_base(pool, tenant_id, kb_id).await?;
    if existing.is_none() {
        return Ok(None);
    }

    let item: KnowledgeBase = sqlx::query_as(
        r#"UPDATE core.knowledge_bases
           SET name = COALESCE($3, name),
               description = COALESCE($4, description),
               kb_type = COALESCE($5, kb_type),
               status = COALESCE($6, status),
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, tenant_id, name, description, kb_type, status,
                     document_count, created_by, created_at, updated_at"#,
    )
    .bind(kb_id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.kb_type)
    .bind(&req.status)
    .fetch_one(pool)
    .await?;

    Ok(Some(item))
}

/// 删除知识库（级联删除文档与分块）
pub async fn delete_knowledge_base(
    pool: &PgPool,
    tenant_id: Uuid,
    kb_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"DELETE FROM core.knowledge_bases
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(kb_id)
    .bind(tenant_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

// ============================================================
// 文档管理
// ============================================================

/// 查询文档列表
pub async fn list_documents(
    pool: &PgPool,
    tenant_id: Uuid,
    query: &DocumentQuery,
) -> Result<Vec<KnowledgeDocument>, sqlx::Error> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let search_like = query.search.as_ref().map(|s| format!("%{}%", s));

    let items: Vec<KnowledgeDocument> = sqlx::query_as(
        r#"SELECT id, tenant_id, kb_id, title, content, doc_type, file_path,
                  file_size, chunk_count, status, error_message, created_by,
                  created_at, updated_at
           FROM core.knowledge_documents
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR kb_id = $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::text IS NULL OR doc_type = $4)
             AND ($5::text IS NULL OR title ILIKE $5)
           ORDER BY created_at DESC
           LIMIT $6 OFFSET $7"#,
    )
    .bind(tenant_id)
    .bind(query.kb_id)
    .bind(&query.status)
    .bind(&query.doc_type)
    .bind(&search_like)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(items)
}

/// 获取文档详情（含分块）
pub async fn get_document_detail(
    pool: &PgPool,
    tenant_id: Uuid,
    document_id: Uuid,
) -> Result<Option<DocumentDetail>, sqlx::Error> {
    let document: Option<KnowledgeDocument> = sqlx::query_as(
        r#"SELECT id, tenant_id, kb_id, title, content, doc_type, file_path,
                  file_size, chunk_count, status, error_message, created_by,
                  created_at, updated_at
           FROM core.knowledge_documents
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await?;

    let Some(document) = document else {
        return Ok(None);
    };

    let chunks: Vec<KnowledgeChunk> = sqlx::query_as(
        r#"SELECT id, tenant_id, document_id, kb_id, chunk_index, content,
                  token_count, metadata, created_at
           FROM core.knowledge_chunks
           WHERE document_id = $1 AND tenant_id = $2
           ORDER BY chunk_index"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;

    Ok(Some(DocumentDetail { document, chunks }))
}

/// 通过文本内容创建文档（不走 multipart 上传）
///
/// 流程：
/// 1. 插入文档记录（status=pending）
/// 2. 异步处理：解析 → 分块 → 向量化 → 入库
pub async fn create_document_from_content(
    pool: &PgPool,
    tenant_id: Uuid,
    req: &CreateDocumentRequest,
    created_by: Uuid,
) -> Result<KnowledgeDocument, sqlx::Error> {
    // 校验知识库存在
    let kb_exists = get_knowledge_base(pool, tenant_id, req.kb_id).await?;
    if kb_exists.is_none() {
        return Err(sqlx::Error::RowNotFound);
    }

    // 插入文档记录
    let document: KnowledgeDocument = sqlx::query_as(
        r#"INSERT INTO core.knowledge_documents
            (tenant_id, kb_id, title, content, doc_type, file_size,
             chunk_count, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 0, 'pending', $7)
           RETURNING id, tenant_id, kb_id, title, content, doc_type, file_path,
                     file_size, chunk_count, status, error_message, created_by,
                     created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.kb_id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.doc_type)
    .bind(req.content.len() as i64)
    .bind(created_by)
    .fetch_one(pool)
    .await?;

    Ok(document)
}

/// 通过上传的文件内容创建文档
///
/// 与 create_document_from_content 类似，但保留原始文件路径与大小
pub async fn create_document_from_file(
    pool: &PgPool,
    tenant_id: Uuid,
    kb_id: Uuid,
    title: &str,
    doc_type: &str,
    content_text: Option<&str>,
    file_path: Option<&str>,
    file_size: Option<i64>,
    created_by: Uuid,
) -> Result<KnowledgeDocument, sqlx::Error> {
    // 校验知识库存在
    let kb_exists = get_knowledge_base(pool, tenant_id, kb_id).await?;
    if kb_exists.is_none() {
        return Err(sqlx::Error::RowNotFound);
    }

    let document: KnowledgeDocument = sqlx::query_as(
        r#"INSERT INTO core.knowledge_documents
            (tenant_id, kb_id, title, content, doc_type, file_path, file_size,
             chunk_count, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'pending', $8)
           RETURNING id, tenant_id, kb_id, title, content, doc_type, file_path,
                     file_size, chunk_count, status, error_message, created_by,
                     created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(kb_id)
    .bind(title)
    .bind(content_text)
    .bind(doc_type)
    .bind(file_path)
    .bind(file_size)
    .bind(created_by)
    .fetch_one(pool)
    .await?;

    Ok(document)
}

/// 更新文档
///
/// 更新文档的标题、内容、所属知识库或状态。
/// 如果内容被更新，会将状态重置为 pending 并触发重新处理。
pub async fn update_document(
    pool: &PgPool,
    tenant_id: Uuid,
    document_id: Uuid,
    req: &UpdateDocumentRequest,
) -> Result<Option<KnowledgeDocument>, sqlx::Error> {
    let existing = get_document_detail(pool, tenant_id, document_id).await?;
    if existing.is_none() {
        return Ok(None);
    }

    let content_changed = req.content.is_some();

    let item: KnowledgeDocument = sqlx::query_as(
        r#"UPDATE core.knowledge_documents
           SET title = COALESCE($3, title),
               content = COALESCE($4, content),
               kb_id = COALESCE($5, kb_id),
               status = CASE
                   WHEN $4 IS NOT NULL THEN 'pending'
                   ELSE COALESCE($6, status)
               END,
               error_message = CASE WHEN $4 IS NOT NULL THEN NULL ELSE error_message END,
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, tenant_id, kb_id, title, content, doc_type, file_path,
                     file_size, chunk_count, status, error_message, created_by,
                     created_at, updated_at"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(req.kb_id)
    .bind(&req.status)
    .fetch_one(pool)
    .await?;

    if content_changed {
        let _ = sqlx::query(
            r#"DELETE FROM core.knowledge_chunks
               WHERE document_id = $1 AND tenant_id = $2"#,
        )
        .bind(document_id)
        .bind(tenant_id)
        .execute(pool)
        .await;
    }

    if let Some(new_kb_id) = req.kb_id {
        let old_kb_id = existing
            .as_ref()
            .expect("existing should exist after is_some() check")
            .document
            .kb_id;
        if old_kb_id != new_kb_id {
            let _ = sqlx::query(
                r#"UPDATE core.knowledge_bases
                   SET document_count = (
                       SELECT COUNT(*) FROM core.knowledge_documents
                       WHERE kb_id = $1 AND tenant_id = $2 AND status = 'ready'
                   )
                   WHERE id = $1 AND tenant_id = $2"#,
            )
            .bind(old_kb_id)
            .bind(tenant_id)
            .execute(pool)
            .await;

            let _ = sqlx::query(
                r#"UPDATE core.knowledge_bases
                   SET document_count = (
                       SELECT COUNT(*) FROM core.knowledge_documents
                       WHERE kb_id = $1 AND tenant_id = $2 AND status = 'ready'
                   )
                   WHERE id = $1 AND tenant_id = $2"#,
            )
            .bind(new_kb_id)
            .bind(tenant_id)
            .execute(pool)
            .await;
        }
    }

    Ok(Some(item))
}

/// 删除文档（级联删除分块）
pub async fn delete_document(
    pool: &PgPool,
    tenant_id: Uuid,
    document_id: Uuid,
) -> Result<bool, sqlx::Error> {
    // 先获取文档，以便后续更新知识库的 document_count
    let doc: Option<(Uuid,)> = sqlx::query_as(
        r#"SELECT kb_id FROM core.knowledge_documents
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await?;

    let Some((kb_id,)) = doc else {
        return Ok(false);
    };

    let result = sqlx::query(
        r#"DELETE FROM core.knowledge_documents
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .execute(pool)
    .await?;

    if result.rows_affected() > 0 {
        // 更新知识库的 document_count
        let _ = sqlx::query(
            r#"UPDATE core.knowledge_bases
               SET document_count = (
                   SELECT COUNT(*) FROM core.knowledge_documents
                   WHERE kb_id = $1 AND tenant_id = $2
               )
               WHERE id = $1 AND tenant_id = $2"#,
        )
        .bind(kb_id)
        .bind(tenant_id)
        .execute(pool)
        .await;
    }

    Ok(result.rows_affected() > 0)
}

// ============================================================
// 文档处理流程
// ============================================================

/// 处理文档：解析 → 分块 → 向量化 → 入库
///
/// 此函数为文档处理的核心，可同步调用或异步 spawn。
/// 处理流程：
/// 1. 更新文档状态为 processing
/// 2. 解析文档内容（根据 doc_type）
/// 3. 分块（按 token 数）
/// 4. 批量生成向量
/// 5. 写入 knowledge_chunks 表
/// 6. 更新文档状态为 ready 与 chunk_count
/// 7. 更新知识库 document_count
///
/// 任一步骤失败则记录 error_message 并将状态置为 failed
pub async fn process_document(
    pool: &PgPool,
    ai_client: &Arc<UnifiedAIClient>,
    tenant_id: Uuid,
    document_id: Uuid,
) -> Result<(), ProcessorError> {
    // 1. 标记为 processing
    let _ = sqlx::query(
        r#"UPDATE core.knowledge_documents
           SET status = 'processing', error_message = NULL, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .execute(pool)
    .await;

    // 2. 读取文档
    let doc: Option<(Uuid, String, Option<String>, String)> = sqlx::query_as(
        r#"SELECT kb_id, title, content, doc_type
           FROM core.knowledge_documents
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| ProcessorError::ParseError(format!("读取文档失败: {}", e)))?;

    let Some((kb_id, title, content_opt, _doc_type)) = doc else {
        return Err(ProcessorError::InvalidInput("文档不存在".to_string()));
    };

    let content_text = match content_opt {
        Some(c) if !c.is_empty() => c,
        _ => {
            // 如果数据库中没有 content，则需要从文件加载（此处简化：返回错误）
            return Err(ProcessorError::InvalidInput(
                "文档内容为空，无法处理（若为上传文件，请确保已提取文本）".to_string(),
            ));
        }
    };

    // 3. 分块
    let chunks = chunk_document(&content_text, None, None);
    if chunks.is_empty() {
        let err_msg = "分块结果为空";
        mark_document_failed(pool, tenant_id, document_id, err_msg).await;
        return Err(ProcessorError::ParseError(err_msg.to_string()));
    }

    // 4. 批量生成向量
    let chunk_texts: Vec<String> = chunks.iter().map(|c| c.content.clone()).collect();
    let vectors = match generate_embeddings(ai_client, &chunk_texts).await {
        Ok(v) => v,
        Err(e) => {
            mark_document_failed(pool, tenant_id, document_id, &e.to_string()).await;
            return Err(e);
        }
    };

    if vectors.len() != chunks.len() {
        let err_msg = format!(
            "向量数量 ({}) 与分块数量 ({}) 不匹配",
            vectors.len(),
            chunks.len()
        );
        mark_document_failed(pool, tenant_id, document_id, &err_msg).await;
        return Err(ProcessorError::EmbeddingError(err_msg));
    }

    // 5. 删除旧分块（重新处理场景）
    let _ = sqlx::query(
        r#"DELETE FROM core.knowledge_chunks
           WHERE document_id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .execute(pool)
    .await;

    // 6. 写入分块（带向量）
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| ProcessorError::EmbeddingError(format!("开启事务失败: {}", e)))?;

    for (chunk, vector) in chunks.iter().zip(vectors.iter()) {
        let vector_str = vector_to_pgvector_string(vector);
        let metadata = serde_json::json!({
            "document_title": title,
            "chunk_index": chunk.chunk_index,
            "token_count": chunk.token_count,
        });

        sqlx::query(
            r#"INSERT INTO core.knowledge_chunks
                (tenant_id, document_id, kb_id, chunk_index, content,
                 token_count, embedding, metadata, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, NOW())"#,
        )
        .bind(tenant_id)
        .bind(document_id)
        .bind(kb_id)
        .bind(chunk.chunk_index as i32)
        .bind(&chunk.content)
        .bind(chunk.token_count as i32)
        .bind(&vector_str)
        .bind(&metadata)
        .execute(&mut *tx)
        .await
        .map_err(|e| ProcessorError::EmbeddingError(format!("写入分块失败: {}", e)))?;
    }

    // 7. 更新文档状态为 ready 与 chunk_count
    let chunk_count = chunks.len() as i32;
    sqlx::query(
        r#"UPDATE core.knowledge_documents
           SET status = 'ready', chunk_count = $3, error_message = NULL,
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .bind(chunk_count)
    .execute(&mut *tx)
    .await
    .map_err(|e| ProcessorError::EmbeddingError(format!("更新文档状态失败: {}", e)))?;

    tx.commit()
        .await
        .map_err(|e| ProcessorError::EmbeddingError(format!("提交事务失败: {}", e)))?;

    // 8. 更新知识库 document_count
    let _ = sqlx::query(
        r#"UPDATE core.knowledge_bases
           SET document_count = (
               SELECT COUNT(*) FROM core.knowledge_documents
               WHERE kb_id = $1 AND tenant_id = $2 AND status = 'ready'
           )
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(kb_id)
    .bind(tenant_id)
    .execute(pool)
    .await;

    Ok(())
}

/// 标记文档处理失败
async fn mark_document_failed(pool: &PgPool, tenant_id: Uuid, document_id: Uuid, error_msg: &str) {
    let _ = sqlx::query(
        r#"UPDATE core.knowledge_documents
           SET status = 'failed', error_message = $3, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(document_id)
    .bind(tenant_id)
    .bind(error_msg)
    .execute(pool)
    .await;
}

// ============================================================
// 问答历史与反馈
// ============================================================

/// 查询问答历史
pub async fn list_qa_history(
    pool: &PgPool,
    tenant_id: Uuid,
    user_id: Option<Uuid>,
    query: &QaHistoryQuery,
) -> Result<Vec<QaHistory>, sqlx::Error> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let items: Vec<QaHistory> = sqlx::query_as(
        r#"SELECT id, tenant_id, kb_id, question, answer, sources, feedback,
                  user_id, created_at
           FROM core.knowledge_qa_history
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR kb_id = $2)
             AND ($3::uuid IS NULL OR user_id = $3)
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
    )
    .bind(tenant_id)
    .bind(query.kb_id)
    .bind(user_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(items)
}

/// 更新问答反馈
pub async fn update_qa_feedback(
    pool: &PgPool,
    tenant_id: Uuid,
    qa_id: Uuid,
    feedback: i32,
) -> Result<bool, sqlx::Error> {
    if feedback != 1 && feedback != -1 {
        return Ok(false);
    }

    let result = sqlx::query(
        r#"UPDATE core.knowledge_qa_history
           SET feedback = $3
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(qa_id)
    .bind(tenant_id)
    .bind(feedback)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

// ============================================================
// 检索
// ============================================================

/// 语义检索（不调用 LLM 生成答案，仅返回相关分块）
pub async fn semantic_search(
    pool: &PgPool,
    ai_client: &Arc<UnifiedAIClient>,
    tenant_id: Uuid,
    req: &SearchRequest,
) -> Result<Vec<AnswerSource>, ProcessorError> {
    let chunks: Vec<RetrievedChunk> =
        rag::retrieve_relevant_chunks(pool, ai_client, tenant_id, req.kb_id, &req.query, req.top_k)
            .await?;

    let results: Vec<AnswerSource> = chunks
        .iter()
        .map(|chunk| AnswerSource {
            chunk_id: chunk.chunk_id,
            document_id: chunk.document_id,
            document_title: chunk.document_title.clone(),
            content_snippet: truncate_content(&chunk.content, 200),
            score: chunk.score,
        })
        .collect();

    Ok(results)
}

/// 截断内容到指定长度（按字符）
fn truncate_content(content: &str, max_chars: usize) -> String {
    if content.chars().count() <= max_chars {
        return content.to_string();
    }
    let truncated: String = content.chars().take(max_chars).collect();
    format!("{}...", truncated)
}

// 复用 document_processor::parse_document 以支持文件解析
pub use document_processor::parse_document as parse_file_content;

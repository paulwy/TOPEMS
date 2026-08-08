//! AI 知识库 - RAG（Retrieval-Augmented Generation）检索增强生成
//!
//! 提供完整的 RAG 流程：
//! - `retrieve_relevant_chunks`：基于问题向量检索相关分块（pgvector 余弦相似度）
//! - `generate_answer`：基于检索结果生成答案
//! - `ask_question`：完整 RAG 流程（检索 → 生成 → 记录历史）

use std::sync::Arc;

use sqlx::PgPool;
use topems_shared_ai::ai_client::{ChatMessage, UnifiedAIClient};
use uuid::Uuid;

use super::document_processor::{generate_embedding, vector_to_pgvector_string, ProcessorError};
use super::models::{AnswerSource, AskResponse};

/// RAG 检索结果（包含分块内容与相似度）
#[derive(Debug, Clone)]
pub struct RetrievedChunk {
    pub chunk_id: Uuid,
    pub document_id: Uuid,
    pub document_title: String,
    pub content: String,
    pub score: f64,
}

/// 检索相关分块
///
/// # 流程
/// 1. 调用 AI 客户端生成问题向量
/// 2. 使用 pgvector 的 `<=>` 操作符计算余弦距离
/// 3. 转换为相似度（1 - distance），返回 top_k 个最相关的分块
///
/// # 参数
/// - `pool`：数据库连接池
/// - `ai_client`：AI 客户端（用于生成问题向量）
/// - `tenant_id`：租户 ID（多租户隔离）
/// - `kb_id`：知识库 ID
/// - `question`：用户问题
/// - `top_k`：返回的分块数量
pub async fn retrieve_relevant_chunks(
    pool: &PgPool,
    ai_client: &Arc<UnifiedAIClient>,
    tenant_id: Uuid,
    kb_id: Uuid,
    question: &str,
    top_k: i32,
) -> Result<Vec<RetrievedChunk>, ProcessorError> {
    // 1. 生成问题向量
    let query_vector = generate_embedding(ai_client, question).await?;
    let vector_str = vector_to_pgvector_string(&query_vector);

    // 2. 使用 pgvector 余弦距离查询
    // <=>：余弦距离（0=完全相同，2=完全相反）
    // 相似度 = 1 - 距离
    let rows: Vec<(Uuid, Uuid, String, String, f64)> = sqlx::query_as(
        r#"SELECT
            c.id AS chunk_id,
            c.document_id AS document_id,
            d.title AS document_title,
            c.content AS content,
            (1 - (c.embedding <=> $1::vector))::float8 AS score
           FROM core.knowledge_chunks c
           JOIN core.knowledge_documents d ON d.id = c.document_id
           WHERE c.tenant_id = $2
             AND c.kb_id = $3
             AND c.embedding IS NOT NULL
             AND d.status = 'ready'
           ORDER BY c.embedding <=> $1::vector
           LIMIT $4"#,
    )
    .bind(&vector_str)
    .bind(tenant_id)
    .bind(kb_id)
    .bind(top_k)
    .fetch_all(pool)
    .await
    .map_err(|e| ProcessorError::EmbeddingError(format!("向量检索数据库查询失败: {}", e)))?;

    let results: Vec<RetrievedChunk> = rows
        .into_iter()
        .map(
            |(chunk_id, document_id, document_title, content, score)| RetrievedChunk {
                chunk_id,
                document_id,
                document_title,
                content,
                score,
            },
        )
        .collect();

    Ok(results)
}

/// 基于检索结果生成答案
///
/// # 流程
/// 1. 构建系统提示词（说明角色和约束）
/// 2. 将检索到的分块作为上下文
/// 3. 调用 AI 客户端生成答案
///
/// # 参数
/// - `ai_client`：AI 客户端
/// - `question`：用户问题
/// - `chunks`：检索到的相关分块
pub async fn generate_answer(
    ai_client: &Arc<UnifiedAIClient>,
    question: &str,
    chunks: &[RetrievedChunk],
) -> Result<String, ProcessorError> {
    if chunks.is_empty() {
        return Ok("抱歉，我在知识库中未找到与您问题相关的内容。".to_string());
    }

    // 构建上下文：将每个分块的内容拼接，标注来源
    let context: String = chunks
        .iter()
        .enumerate()
        .map(|(idx, chunk)| {
            format!(
                "[来源{}: {}]\n{}",
                idx + 1,
                chunk.document_title,
                chunk.content
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n");

    let system_prompt = format!(
        "你是一个知识库问答助手。请根据以下检索到的知识库内容回答用户问题。\n\n\
         约束：\n\
         1. 只能基于提供的检索内容回答，不要编造信息。\n\
         2. 如果检索内容无法回答问题，请明确说明 \"知识库中未找到相关信息\"。\n\
         3. 回答要简洁、准确、有条理。\n\
         4. 如适用，引用来源编号（如 [来源1]）。\n\n\
         检索内容：\n\
         {}",
        context
    );

    let messages = vec![
        ChatMessage::system(&system_prompt),
        ChatMessage::user(question),
    ];

    let answer = ai_client
        .chat(messages)
        .await
        .map_err(|e| ProcessorError::EmbeddingError(format!("LLM 生成答案失败: {}", e)))?;

    Ok(answer)
}

/// 完整 RAG 问答流程
///
/// # 流程
/// 1. 检索相关分块
/// 2. 生成答案
/// 3. 记录问答历史到数据库
///
/// # 参数
/// - `pool`：数据库连接池
/// - `ai_client`：AI 客户端
/// - `tenant_id`：租户 ID
/// - `kb_id`：知识库 ID
/// - `user_id`：用户 ID
/// - `question`：用户问题
/// - `top_k`：检索 top_k 个分块
///
/// # 返回
/// `AskResponse`：包含答案、引用来源、置信度、历史记录 ID
pub async fn ask_question(
    pool: &PgPool,
    ai_client: &Arc<UnifiedAIClient>,
    tenant_id: Uuid,
    kb_id: Uuid,
    user_id: Uuid,
    question: &str,
    top_k: i32,
) -> Result<AskResponse, ProcessorError> {
    // 1. 检索相关分块
    let chunks =
        retrieve_relevant_chunks(pool, ai_client, tenant_id, kb_id, question, top_k).await?;

    // 2. 生成答案
    let answer = generate_answer(ai_client, question, &chunks).await?;

    // 3. 计算置信度（基于检索分块的平均相似度）
    let confidence: f64 = if chunks.is_empty() {
        0.0
    } else {
        let sum: f64 = chunks.iter().map(|c| c.score).sum();
        sum / chunks.len() as f64
    };

    // 4. 构建引用来源
    let sources: Vec<AnswerSource> = chunks
        .iter()
        .map(|chunk| AnswerSource {
            chunk_id: chunk.chunk_id,
            document_id: chunk.document_id,
            document_title: chunk.document_title.clone(),
            content_snippet: truncate_content(&chunk.content, 200),
            score: chunk.score,
        })
        .collect();

    // 5. 序列化 sources 为 JSONB
    let sources_json = serde_json::to_value(&sources).unwrap_or(serde_json::Value::Null);

    // 6. 记录问答历史
    let history_row: Option<(Uuid,)> = sqlx::query_as(
        r#"INSERT INTO core.knowledge_qa_history
            (tenant_id, kb_id, question, answer, sources, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id"#,
    )
    .bind(tenant_id)
    .bind(kb_id)
    .bind(question)
    .bind(&answer)
    .bind(&sources_json)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| ProcessorError::EmbeddingError(format!("保存问答历史失败: {}", e)))?;

    let history_id = history_row.map(|(id,)| id).unwrap_or_else(Uuid::new_v4);

    Ok(AskResponse {
        answer,
        sources,
        confidence,
        history_id,
    })
}

/// 截断内容到指定长度（按字符），保留完整字符
fn truncate_content(content: &str, max_chars: usize) -> String {
    if content.chars().count() <= max_chars {
        return content.to_string();
    }
    let truncated: String = content.chars().take(max_chars).collect();
    format!("{}...", truncated)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_content_short() {
        let result = truncate_content("hello", 10);
        assert_eq!(result, "hello");
    }

    #[test]
    fn test_truncate_content_long() {
        let long_text = "这是一个非常长的文本内容，用于测试截断功能是否正常工作。".repeat(10);
        let result = truncate_content(&long_text, 20);
        assert!(result.ends_with("..."));
        assert!(result.chars().count() <= 23); // 20 + "..."
    }
}

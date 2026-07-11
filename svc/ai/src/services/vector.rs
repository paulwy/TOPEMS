use crate::services::db::Database;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub filename: String,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub content_hash: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub document_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub metadata: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorEmbedding {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub document_id: Uuid,
    pub chunk_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Vec<f32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub document_id: Uuid,
    pub chunk_id: Uuid,
    pub content: String,
    pub similarity: f64,
    pub document_title: Option<String>,
}

#[derive(Clone)]
pub struct VectorService {
    db: Database,
}

impl VectorService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &Database {
        &self.db
    }

    /// 创建文档记录
    pub async fn create_document(&self, doc: &CreateDocumentRequest) -> Result<Uuid, sqlx::Error> {
        let id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO plugin_ai.documents (tenant_id, title, file_name, file_path, file_size, mime_type, category, tags, description, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
            "#,
        )
        .bind(doc.tenant_id)
        .bind(&doc.title)
        .bind(&doc.filename)
        .bind(&doc.file_path)
        .bind(doc.file_size)
        .bind(&doc.mime_type)
        .bind(&doc.category)
        .bind(&doc.tags)
        .bind(&doc.description)
        .bind("pending")
        .fetch_one(self.db.pool())
        .await?;

        Ok(id)
    }

    /// 更新文档状态
    pub async fn update_document_status(
        &self,
        id: Uuid,
        status: &str,
        error_message: Option<&str>,
        tenant_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE plugin_ai.documents
            SET status = $1, error_message = $2
            WHERE id = $3 AND tenant_id = $4
            "#,
        )
        .bind(status)
        .bind(error_message)
        .bind(id)
        .bind(tenant_id)
        .execute(self.db.pool())
        .await?;

        Ok(())
    }

    /// 获取文档
    pub async fn get_document(
        &self,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Option<Document>, sqlx::Error> {
        let doc = sqlx::query_as::<_, DocumentRow>(
            r#"
            SELECT id, tenant_id, title, file_name, file_path, file_size, mime_type,
                   content_hash, category, tags, description, status,
                   error_message, created_at, updated_at
            FROM plugin_ai.documents WHERE id = $1 AND tenant_id = $2
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(self.db.pool())
        .await?;

        Ok(doc.map(|r| r.into()))
    }

    /// 获取所有文档
    pub async fn list_documents(&self, tenant_id: Uuid) -> Result<Vec<Document>, sqlx::Error> {
        let docs = sqlx::query_as::<_, DocumentRow>(
            r#"
            SELECT id, tenant_id, title, file_name, file_path, file_size, mime_type,
                   content_hash, category, tags, description, status,
                   error_message, created_at, updated_at
            FROM plugin_ai.documents
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(self.db.pool())
        .await?;

        Ok(docs.into_iter().map(|r| r.into()).collect())
    }

    /// 删除文档（级联删除向量）
    pub async fn delete_document(&self, id: Uuid, tenant_id: Uuid) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("DELETE FROM plugin_ai.documents WHERE id = $1 AND tenant_id = $2")
                .bind(id)
                .bind(tenant_id)
                .execute(self.db.pool())
                .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 保存文档分块
    pub async fn save_chunk(
        &self,
        chunk: &SaveChunkRequest,
        tenant_id: Uuid,
    ) -> Result<Uuid, sqlx::Error> {
        let id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO plugin_ai.document_chunks (tenant_id, document_id, chunk_index, content, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            "#,
        )
        .bind(tenant_id)
        .bind(chunk.document_id)
        .bind(chunk.chunk_index)
        .bind(&chunk.content)
        .bind(&chunk.metadata)
        .fetch_one(self.db.pool())
        .await?;

        Ok(id)
    }

    /// 批量保存向量
    pub async fn save_vectors(
        &self,
        vectors: &[SaveVectorRequest],
        tenant_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        for vector in vectors {
            sqlx::query(
                r#"
                UPDATE plugin_ai.document_chunks
                SET embedding = $1
                WHERE document_id = $2 AND chunk_index = $3 AND tenant_id = $4
                "#,
            )
            .bind(&vector.embedding)
            .bind(vector.document_id)
            .bind(vector.chunk_index)
            .bind(tenant_id)
            .execute(self.db.pool())
            .await?;
        }
        Ok(())
    }

    /// 向量相似度搜索
    pub async fn search_similar(
        &self,
        query_embedding: &[f32],
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<SearchResult>, sqlx::Error> {
        // 构建查询向量字符串
        let embedding_str = format!(
            "[{}]",
            query_embedding
                .iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(",")
        );

        let rows = sqlx::query(
            r#"
            SELECT
                c.document_id,
                c.id AS chunk_id,
                c.content,
                1 - (c.embedding <=> $1::vector) AS similarity,
                d.title AS document_title
            FROM plugin_ai.document_chunks c
            JOIN plugin_ai.documents d ON c.document_id = d.id
            WHERE c.embedding <=> $1::vector < 0.5
              AND c.tenant_id = $3
            ORDER BY c.embedding <=> $1::vector
            LIMIT $2
            "#,
        )
        .bind(&embedding_str)
        .bind(top_k as i64)
        .bind(tenant_id)
        .fetch_all(self.db.pool())
        .await?;

        let results = rows
            .iter()
            .map(|row| SearchResult {
                document_id: row.get("document_id"),
                chunk_id: row.get("chunk_id"),
                content: row.get("content"),
                similarity: row.get("similarity"),
                document_title: row.get("document_title"),
            })
            .collect();

        Ok(results)
    }

    /// 获取统计信息
    pub async fn get_stats(&self) -> Result<VectorStats, sqlx::Error> {
        let doc_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM plugin_ai.documents")
            .fetch_one(self.db.pool())
            .await?;

        let chunk_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM plugin_ai.document_chunks")
            .fetch_one(self.db.pool())
            .await?;

        let vector_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM plugin_ai.document_chunks WHERE embedding IS NOT NULL",
        )
        .fetch_one(self.db.pool())
        .await?;

        let dimension: Option<i64> = sqlx::query_scalar(
            "SELECT vector_dimensions FROM plugin_ai.document_chunks WHERE embedding IS NOT NULL LIMIT 1",
        )
        .fetch_optional(self.db.pool())
        .await?;

        Ok(VectorStats {
            total_documents: doc_count as usize,
            total_chunks: chunk_count as usize,
            total_vectors: vector_count as usize,
            vector_dimension: dimension.unwrap_or(768) as usize,
        })
    }

    /// 清空所有向量数据
    pub async fn clear_all(&self) -> Result<(), sqlx::Error> {
        sqlx::query("TRUNCATE plugin_ai.document_chunks, plugin_ai.documents CASCADE")
            .execute(self.db.pool())
            .await?;
        Ok(())
    }

    /// 关键词搜索（全文检索）
    pub async fn keyword_search(
        &self,
        query: &str,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<SearchResult>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT
                c.document_id,
                c.id AS chunk_id,
                c.content,
                ts_rank_cd(to_tsvector('simple', c.content), query) AS similarity,
                d.title AS document_title
            FROM plugin_ai.document_chunks c
            JOIN plugin_ai.documents d ON c.document_id = d.id,
                 to_tsquery('simple', $1) query
            WHERE to_tsvector('simple', c.content) @@ query
              AND c.tenant_id = $3
            ORDER BY similarity DESC
            LIMIT $2
            "#,
        )
        .bind(query)
        .bind(top_k as i64)
        .bind(tenant_id)
        .fetch_all(self.db.pool())
        .await?;

        let results = rows
            .iter()
            .map(|row| SearchResult {
                document_id: row.get("document_id"),
                chunk_id: row.get("chunk_id"),
                content: row.get("content"),
                similarity: row.get::<f32, _>("similarity") as f64,
                document_title: row.get("document_title"),
            })
            .collect();

        Ok(results)
    }

    /// 混合检索（向量+关键词）
    pub async fn hybrid_search(
        &self,
        query_embedding: &[f32],
        query_text: &str,
        top_k: usize,
        vector_weight: f64,
        keyword_weight: f64,
        tenant_id: Uuid,
    ) -> Result<Vec<crate::modules::models::HybridSearchResult>, sqlx::Error> {
        // 向量搜索
        let vector_results = self
            .search_similar(query_embedding, top_k * 2, tenant_id)
            .await?;

        // 关键词搜索
        let keyword_results = self
            .keyword_search(query_text, top_k * 2, tenant_id)
            .await?;

        // 合并结果
        let mut combined_map: std::collections::HashMap<
            uuid::Uuid,
            crate::modules::models::HybridSearchResult,
        > = std::collections::HashMap::new();

        // 处理向量搜索结果
        for result in vector_results {
            let entry = combined_map.entry(result.chunk_id).or_insert(
                crate::modules::models::HybridSearchResult {
                    document_id: result.document_id,
                    chunk_id: result.chunk_id,
                    content: result.content.clone(),
                    vector_similarity: result.similarity,
                    keyword_score: 0.0,
                    combined_score: 0.0,
                    document_title: result.document_title.clone(),
                },
            );
            entry.vector_similarity = result.similarity;
        }

        // 处理关键词搜索结果
        for result in keyword_results {
            let entry = combined_map.entry(result.chunk_id).or_insert(
                crate::modules::models::HybridSearchResult {
                    document_id: result.document_id,
                    chunk_id: result.chunk_id,
                    content: result.content.clone(),
                    vector_similarity: 0.0,
                    keyword_score: result.similarity,
                    combined_score: 0.0,
                    document_title: result.document_title.clone(),
                },
            );
            entry.keyword_score = result.similarity;
        }

        // 计算综合得分
        for result in combined_map.values_mut() {
            result.combined_score =
                vector_weight * result.vector_similarity + keyword_weight * result.keyword_score;
        }

        // 按综合得分排序
        let mut results: Vec<_> = combined_map.values().cloned().collect();
        results.sort_by(|a, b| {
            b.combined_score
                .partial_cmp(&a.combined_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        results.truncate(top_k);

        Ok(results)
    }

    /// 获取文档的所有分块
    pub async fn get_document_chunks(
        &self,
        document_id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Vec<DocumentChunk>, sqlx::Error> {
        let chunks = sqlx::query_as::<_, DocumentChunkRow>(
            r#"
            SELECT id, tenant_id, document_id, chunk_index, content, metadata, created_at
            FROM plugin_ai.document_chunks
            WHERE document_id = $1 AND tenant_id = $2
            ORDER BY chunk_index
            "#,
        )
        .bind(document_id)
        .bind(tenant_id)
        .fetch_all(self.db.pool())
        .await?;

        Ok(chunks.into_iter().map(|r| r.into()).collect())
    }

    /// 获取单个向量记录
    pub async fn get_vector(
        &self,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Option<VectorEmbedding>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, tenant_id, document_id, chunk_index, content, embedding
            FROM plugin_ai.document_chunks
            WHERE id = $1 AND tenant_id = $2
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(row) = row {
            Ok(Some(VectorEmbedding {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                document_id: row.get("document_id"),
                chunk_id: row.get("id"),
                chunk_index: row.get("chunk_index"),
                content: row.get("content"),
                embedding: row.get("embedding"),
                created_at: chrono::Utc::now(),
            }))
        } else {
            Ok(None)
        }
    }

    /// 删除向量记录
    pub async fn delete_vector(&self, id: Uuid, tenant_id: Uuid) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("DELETE FROM plugin_ai.document_chunks WHERE id = $1 AND tenant_id = $2")
                .bind(id)
                .bind(tenant_id)
                .execute(self.db.pool())
                .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub filename: String,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Clone)]
pub struct SaveChunkRequest {
    pub document_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct SaveVectorRequest {
    pub document_id: Uuid,
    #[allow(dead_code)]
    pub chunk_id: Uuid,
    pub chunk_index: i32,
    #[allow(dead_code)]
    pub content: String,
    pub embedding: Vec<f32>,
}

#[derive(Debug, Serialize)]
pub struct VectorStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub total_vectors: usize,
    pub vector_dimension: usize,
}

// 数据库行映射
#[derive(Debug, sqlx::FromRow)]
struct DocumentRow {
    id: Uuid,
    tenant_id: Uuid,
    title: String,
    file_name: String,
    file_path: Option<String>,
    file_size: Option<i64>,
    mime_type: Option<String>,
    content_hash: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    description: Option<String>,
    status: String,
    error_message: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<DocumentRow> for Document {
    fn from(r: DocumentRow) -> Self {
        Document {
            id: r.id,
            tenant_id: r.tenant_id,
            title: r.title,
            filename: r.file_name,
            file_path: r.file_path,
            file_size: r.file_size,
            mime_type: r.mime_type,
            content_hash: r.content_hash,
            category: r.category,
            tags: r.tags,
            description: r.description,
            status: r.status,
            error_message: r.error_message,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

// 文档分块行映射
#[derive(Debug, sqlx::FromRow)]
struct DocumentChunkRow {
    id: Uuid,
    tenant_id: Uuid,
    document_id: Uuid,
    chunk_index: i32,
    content: String,
    metadata: serde_json::Value,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<DocumentChunkRow> for DocumentChunk {
    fn from(r: DocumentChunkRow) -> Self {
        DocumentChunk {
            id: r.id,
            tenant_id: r.tenant_id,
            document_id: r.document_id,
            chunk_index: r.chunk_index,
            content: r.content,
            metadata: r.metadata,
            created_at: r.created_at,
        }
    }
}

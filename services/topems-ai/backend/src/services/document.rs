use crate::services::pdf::PdfParser;
use crate::services::vector::{CreateDocumentRequest, SaveChunkRequest, VectorService};
use std::sync::Arc;
use tokio::sync::RwLock;

const CHUNK_SIZE: usize = 512;
const CHUNK_OVERLAP: usize = 128;

#[derive(Clone)]
pub struct DocumentService {
    vector_service: Arc<RwLock<VectorService>>,
    pdf_parser: PdfParser,
}

impl DocumentService {
    pub fn new(vector_service: VectorService) -> Self {
        Self {
            vector_service: Arc::new(RwLock::new(vector_service)),
            pdf_parser: PdfParser::new(),
        }
    }

    /// 处理文档上传
    pub async fn process_upload(
        &self,
        title: String,
        filename: String,
        file_path: String,
        file_size: u64,
        mime_type: Option<String>,
    ) -> Result<String, String> {
        let mime = mime_type.as_deref().unwrap_or("application/octet-stream");

        // 创建文档记录
        let doc_request = CreateDocumentRequest {
            title: title.clone(),
            filename: filename.clone(),
            file_path: Some(file_path.clone()),
            file_size: Some(file_size as i64),
            mime_type: mime_type.clone(),
            category: None,
            tags: None,
            description: None,
        };

        let doc_id = {
            let vs = self.vector_service.read().await;
            vs.create_document(&doc_request)
                .await
                .map_err(|e| format!("创建文档记录失败: {}", e))?
        };

        // 提取文本内容
        let content = match mime {
            "text/plain" | "text/markdown" | "text/csv" => {
                tokio::fs::read_to_string(&file_path)
                    .await
                    .map_err(|e| format!("读取文件失败: {}", e))?
            }
            "application/pdf" => {
                self.pdf_parser
                    .extract_text(&file_path)
                    .await
                    .map_err(|e| format!("解析 PDF 失败: {}", e))?
            }
            _ => {
                // 尝试作为纯文本读取
                tokio::fs::read_to_string(&file_path)
                    .await
                    .unwrap_or_else(|_| String::from("[无法解析的文件内容]"))
            }
        };

        // 分块处理
        let chunks = self.split_into_chunks(&content, CHUNK_SIZE, CHUNK_OVERLAP);

        if chunks.is_empty() {
            let vs = self.vector_service.read().await;
            vs.update_document_status(doc_id, "empty", Some("文档内容为空"))
                .await
                .ok();
            return Err("文档内容为空".to_string());
        }

        tracing::info!("📄 文档 '{}' 分割为 {} 个块", filename, chunks.len());

        // 保存分块和向量
        self.save_chunks_and_vectors(doc_id, &chunks).await?;

        // 更新文档状态
        {
            let vs = self.vector_service.read().await;
            vs.update_document_status(doc_id, "processed", None)
                .await
                .ok();
        }

        tracing::info!("✅ 文档 '{}' 处理完成", filename);
        Ok(doc_id.to_string())
    }

    /// 分块文本
    fn split_into_chunks(&self, content: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
        let mut chunks = Vec::new();
        let content_len = content.len();

        if content_len <= chunk_size {
            chunks.push(content.to_string());
            return chunks;
        }

        let mut start = 0;
        while start < content_len {
            let end = std::cmp::min(start + chunk_size, content_len);

            // 尝试在句子边界分割
            let chunk = if end < content_len {
                Self::split_at_sentence_boundary(&content[start..end])
            } else {
                content[start..end].to_string()
            };

            if !chunk.trim().is_empty() {
                chunks.push(chunk);
            }

            if end >= content_len {
                break;
            }

            let step = chunk_size.saturating_sub(overlap);
            if step == 0 {
                break;
            }
            start += step;
        }

        chunks
    }

    /// 在句子边界分割
    fn split_at_sentence_boundary(text: &str) -> String {
        // 尝试在句号、问号、感叹号后分割
        let separators = ['。', '！', '？', '.', '!', '?', '\n'];
        let mut best_pos = text.len();

        for sep in &separators {
            if let Some(pos) = text.rfind(*sep) {
                if pos < text.len() - 1 {
                    best_pos = pos + 1;
                    break;
                }
            }
        }

        text[..best_pos].trim().to_string()
    }

    /// 保存分块和向量
    async fn save_chunks_and_vectors(&self, doc_id: uuid::Uuid, chunks: &[String]) -> Result<(), String> {
        let vs = self.vector_service.read().await;

        for (idx, content) in chunks.iter().enumerate() {
            // 保存分块
            let chunk_request = SaveChunkRequest {
                document_id: doc_id,
                chunk_index: idx as i32,
                content: content.clone(),
                metadata: serde_json::json!({}),
            };

            let chunk_id = vs
                .save_chunk(&chunk_request)
                .await
                .map_err(|e| format!("保存分块失败: {}", e))?;

            // 注意：实际向量生成需要在调用处完成（因为需要调用嵌入模型 API）
            tracing::debug!("📦 分块 {} 已保存 (id: {})", idx, chunk_id);
        }

        Ok(())
    }

    /// 删除文档
    pub async fn delete_document(&self, id: uuid::Uuid) -> Result<bool, String> {
        let vs = self.vector_service.read().await;
        vs.delete_document(id)
            .await
            .map_err(|e| format!("删除文档失败: {}", e))
    }

    /// 列出所有文档
    pub async fn list_documents(&self) -> Result<Vec<crate::services::vector::Document>, String> {
        let vs = self.vector_service.read().await;
        vs.list_documents()
            .await
            .map_err(|e| format!("查询文档列表失败: {}", e))
    }

    /// 获取文档
    pub async fn get_document(&self, id: uuid::Uuid) -> Result<Option<crate::services::vector::Document>, String> {
        let vs = self.vector_service.read().await;
        vs.get_document(id)
            .await
            .map_err(|e| format!("查询文档失败: {}", e))
    }

    /// 获取向量服务（用于外部调用嵌入生成）
    pub fn get_vector_service(&self) -> Arc<RwLock<VectorService>> {
        self.vector_service.clone()
    }
}

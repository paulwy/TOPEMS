#![allow(dead_code)]

use crate::services::pdf::PdfParser;
use crate::services::vector::{
    CreateDocumentRequest, SaveChunkRequest, SearchResult, VectorService,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufReader, Read};
use std::sync::Arc;
use tokio::sync::RwLock;
use topems_shared_ai::file_client::FileServiceClient;
use uuid::Uuid;

const CHUNK_SIZE: usize = 1024;
const CHUNK_OVERLAP: usize = 256;
const MIN_CHUNK_SIZE: usize = 100;

#[derive(Clone)]
pub struct DocumentQAConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
}

#[derive(Clone)]
pub struct DocumentService {
    vector_service: Arc<RwLock<VectorService>>,
    pdf_parser: PdfParser,
    file_client: Option<FileServiceClient>,
    qa_config: Option<DocumentQAConfig>,
    http_client: Client,
}

impl DocumentService {
    pub fn new(vector_service: VectorService) -> Self {
        Self {
            vector_service: Arc::new(RwLock::new(vector_service)),
            pdf_parser: PdfParser::new(),
            file_client: None,
            qa_config: None,
            http_client: Client::new(),
        }
    }

    /// 创建带 File 服务客户端的 DocumentService
    pub fn with_file_client(vector_service: VectorService, file_service_url: &str) -> Self {
        Self {
            vector_service: Arc::new(RwLock::new(vector_service)),
            pdf_parser: PdfParser::new(),
            file_client: Some(FileServiceClient::new(file_service_url)),
            qa_config: None,
            http_client: Client::new(),
        }
    }

    /// 设置文档问答配置
    pub fn with_qa_config(mut self, config: DocumentQAConfig) -> Self {
        self.qa_config = Some(config);
        self
    }

    /// 获取 QA 配置（用于 API 层）
    pub fn get_qa_config(&self) -> Option<&DocumentQAConfig> {
        self.qa_config.as_ref()
    }

    /// 获取文档分块（用于 API 层）
    pub async fn get_document_chunks(
        &self,
        document_id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Vec<crate::services::vector::DocumentChunk>, String> {
        let vs = self.vector_service.read().await;
        vs.get_document_chunks(document_id, tenant_id)
            .await
            .map_err(|e| format!("获取文档分块失败: {}", e))
    }

    pub async fn pool(&self) -> sqlx::PgPool {
        // Get the pool from vector service for health checks
        self.vector_service.read().await.db().pool().clone()
    }

    /// 处理文档上传
    pub async fn process_upload(
        &self,
        title: String,
        filename: String,
        file_path: String,
        file_size: u64,
        mime_type: Option<String>,
        tenant_id: Uuid,
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
            tenant_id,
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
            "text/plain" | "text/markdown" | "text/csv" => tokio::fs::read_to_string(&file_path)
                .await
                .map_err(|e| format!("读取文件失败: {}", e))?,
            "application/pdf" => self
                .pdf_parser
                .extract_text(&file_path)
                .await
                .map_err(|e| format!("解析 PDF 失败: {}", e))?,
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
            vs.update_document_status(doc_id, "empty", Some("文档内容为空"), tenant_id)
                .await
                .ok();
            return Err("文档内容为空".to_string());
        }

        tracing::info!("📄 文档 '{}' 分割为 {} 个块", filename, chunks.len());

        // 保存分块和向量
        self.save_chunks_and_vectors(doc_id, &chunks, tenant_id)
            .await?;

        // 更新文档状态
        {
            let vs = self.vector_service.read().await;
            vs.update_document_status(doc_id, "processed", None, tenant_id)
                .await
                .ok();
        }

        tracing::info!("✅ 文档 '{}' 处理完成", filename);
        Ok(doc_id.to_string())
    }

    /// 分块文本 - 改进版，支持智能段落分割
    fn split_into_chunks(&self, content: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
        let mut chunks = Vec::new();

        let paragraphs = content
            .split("\n\n")
            .filter(|p| !p.trim().is_empty())
            .collect::<Vec<_>>();

        if paragraphs.is_empty() {
            return self.split_by_size(content, chunk_size, overlap);
        }

        let mut current_chunk = String::new();

        for paragraph in paragraphs {
            let trimmed = paragraph.trim();

            if current_chunk.len() + trimmed.len() + 2 <= chunk_size {
                if !current_chunk.is_empty() {
                    current_chunk.push('\n');
                }
                current_chunk.push_str(trimmed);
            } else {
                if !current_chunk.is_empty() && current_chunk.len() >= MIN_CHUNK_SIZE {
                    chunks.push(current_chunk.trim().to_string());
                }

                if trimmed.len() > chunk_size {
                    let sub_chunks = self.split_by_size(trimmed, chunk_size, overlap);
                    chunks.extend(sub_chunks);
                    current_chunk = chunks.pop().unwrap_or_default();
                    if current_chunk.len() < MIN_CHUNK_SIZE {
                        current_chunk = String::new();
                    }
                } else {
                    current_chunk = trimmed.to_string();
                }
            }
        }

        if !current_chunk.is_empty() {
            chunks.push(current_chunk.trim().to_string());
        }

        chunks
    }

    /// 按大小分块（备用方法）
    fn split_by_size(&self, content: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
        let mut chunks = Vec::new();
        let content_len = content.len();

        if content_len <= chunk_size {
            chunks.push(content.to_string());
            return chunks;
        }

        let mut start = 0;
        while start < content_len {
            let end = std::cmp::min(start + chunk_size, content_len);
            let chunk = if end < content_len {
                self.split_at_sentence_boundary(&content[start..end])
            } else {
                content[start..end].to_string()
            };

            if !chunk.trim().is_empty() && chunk.len() >= MIN_CHUNK_SIZE {
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
    fn split_at_sentence_boundary(&self, text: &str) -> String {
        let separators = ['。', '！', '？', '.', '!', '?', '\n', ';', '；'];
        let mut best_pos = text.len();

        for sep in &separators {
            if let Some(pos) = text.rfind(*sep) {
                if pos > text.len() / 2 && pos < text.len() - 1 {
                    best_pos = pos + 1;
                    break;
                }
            }
        }

        text[..best_pos].trim().to_string()
    }

    /// 提取文档元数据
    fn extract_document_metadata(&self, filename: &str, content: &str) -> serde_json::Value {
        let mut metadata = HashMap::new();

        metadata.insert("filename".to_string(), filename.to_string());
        metadata.insert("content_length".to_string(), content.len().to_string());

        let line_count = content.lines().count();
        metadata.insert("line_count".to_string(), line_count.to_string());

        let word_count = content.split_whitespace().count();
        metadata.insert("word_count".to_string(), word_count.to_string());

        let paragraphs = content
            .split("\n\n")
            .filter(|p| !p.trim().is_empty())
            .count();
        metadata.insert("paragraph_count".to_string(), paragraphs.to_string());

        let ext = std::path::Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        metadata.insert("file_type".to_string(), ext);

        serde_json::to_value(metadata).unwrap_or(serde_json::json!({}))
    }

    /// 保存分块和向量
    async fn save_chunks_and_vectors(
        &self,
        doc_id: uuid::Uuid,
        chunks: &[String],
        tenant_id: Uuid,
    ) -> Result<(), String> {
        let vs = self.vector_service.read().await;
        let total_chunks = chunks.len();

        for (idx, content) in chunks.iter().enumerate() {
            let chunk_metadata = serde_json::json!({
                "chunk_index": idx,
                "total_chunks": total_chunks,
                "content_length": content.len(),
                "is_first_chunk": idx == 0,
                "is_last_chunk": idx == total_chunks - 1,
            });

            let chunk_request = SaveChunkRequest {
                document_id: doc_id,
                chunk_index: idx as i32,
                content: content.clone(),
                metadata: chunk_metadata,
            };

            let chunk_id = vs
                .save_chunk(&chunk_request, tenant_id)
                .await
                .map_err(|e| format!("保存分块失败: {}", e))?;

            tracing::debug!("📦 分块 {} 已保存 (id: {})", idx, chunk_id);
        }

        Ok(())
    }

    /// 删除文档
    pub async fn delete_document(&self, id: uuid::Uuid, tenant_id: Uuid) -> Result<bool, String> {
        let vs = self.vector_service.read().await;
        vs.delete_document(id, tenant_id)
            .await
            .map_err(|e| format!("删除文档失败: {}", e))
    }

    /// 列出所有文档
    pub async fn list_documents(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<crate::services::vector::Document>, String> {
        let vs = self.vector_service.read().await;
        vs.list_documents(tenant_id)
            .await
            .map_err(|e| format!("查询文档列表失败: {}", e))
    }

    /// 获取文档
    pub async fn get_document(
        &self,
        id: uuid::Uuid,
        tenant_id: Uuid,
    ) -> Result<Option<crate::services::vector::Document>, String> {
        let vs = self.vector_service.read().await;
        vs.get_document(id, tenant_id)
            .await
            .map_err(|e| format!("查询文档失败: {}", e))
    }

    /// 从 File 服务向量化文档
    pub async fn vectorize_from_file_service(
        &self,
        file_id: Uuid,
        tenant_id: Uuid,
    ) -> Result<VectorizeResult, String> {
        let file_client = self
            .file_client
            .as_ref()
            .ok_or_else(|| "File 服务客户端未初始化".to_string())?;

        // 1. 从 File 服务获取文件元数据
        let file_metadata = file_client
            .get_file(file_id)
            .await
            .map_err(|e| format!("获取文件元数据失败: {}", e))?;

        // 2. 从 File 服务下载文件
        let file_data = file_client
            .download_file(file_id)
            .await
            .map_err(|e| format!("下载文件失败: {}", e))?;

        tracing::info!(
            "📥 从 File 服务获取文件: {} ({} bytes)",
            file_metadata.filename,
            file_metadata.file_size
        );

        // 3. 提取文本
        let text = self.extract_text_from_data(&file_metadata.filename, &file_data)?;

        // 4. 分块
        let chunks = self.split_into_chunks(&text, CHUNK_SIZE, CHUNK_OVERLAP);

        if chunks.is_empty() {
            return Err("文档内容为空".to_string());
        }

        tracing::info!(
            "📄 文档 '{}' 分割为 {} 个块",
            file_metadata.filename,
            chunks.len()
        );

        // 5. 保存分块
        let doc_id = Uuid::new_v4();
        self.save_chunks_and_vectors(doc_id, &chunks, tenant_id)
            .await?;

        Ok(VectorizeResult {
            file_id,
            document_id: doc_id,
            chunks_count: chunks.len(),
        })
    }

    /// 从文件数据提取文本
    fn extract_text_from_data(&self, filename: &str, data: &[u8]) -> Result<String, String> {
        let ext = std::path::Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        match ext.as_str() {
            "txt" | "md" | "markdown" => {
                String::from_utf8(data.to_vec()).map_err(|e| format!("文件编码错误: {}", e))
            }
            "csv" => self
                .extract_text_from_csv(data)
                .map_err(|e| format!("解析 CSV 失败: {}", e)),
            "json" => self
                .extract_text_from_json(data)
                .map_err(|e| format!("解析 JSON 失败: {}", e)),
            "xml" | "html" | "htm" => self
                .extract_text_from_xml_content(data)
                .map_err(|e| format!("解析 XML/HTML 失败: {}", e)),
            "yaml" | "yml" => {
                String::from_utf8(data.to_vec()).map_err(|e| format!("文件编码错误: {}", e))
            }
            "pdf" => {
                let temp_dir = std::env::temp_dir();
                let temp_file = temp_dir.join(format!("{}.pdf", Uuid::new_v4()));
                std::fs::write(&temp_file, data).map_err(|e| format!("保存临时文件失败: {}", e))?;
                let text = PdfParser::extract_text_sync(temp_file.to_str().unwrap_or(""))
                    .map_err(|e| format!("解析 PDF 失败: {}", e))?;
                let _ = std::fs::remove_file(&temp_file);
                Ok(text)
            }
            "docx" => self
                .extract_text_from_docx(data)
                .map_err(|e| format!("解析 DOCX 失败: {}", e)),
            "doc" => self
                .extract_text_from_doc(data)
                .map_err(|e| format!("解析 DOC 失败: {}", e)),
            "xlsx" => self
                .extract_text_from_xlsx(data)
                .map_err(|e| format!("解析 XLSX 失败: {}", e)),
            "xls" => self
                .extract_text_from_xls(data)
                .map_err(|e| format!("解析 XLS 失败: {}", e)),
            "pptx" => self
                .extract_text_from_pptx(data)
                .map_err(|e| format!("解析 PPTX 失败: {}", e)),
            "rtf" => self
                .extract_text_from_rtf(data)
                .map_err(|e| format!("解析 RTF 失败: {}", e)),
            "odt" | "ods" | "odp" => self
                .extract_text_from_opendocument(data, &ext)
                .map_err(|e| format!("解析 OpenDocument 失败: {}", e)),
            _ => Ok(String::from_utf8(data.to_vec()).unwrap_or("[无法解析的文件内容]".to_string())),
        }
    }

    /// 从 CSV 文件提取文本
    fn extract_text_from_csv(&self, data: &[u8]) -> Result<String, String> {
        let content =
            String::from_utf8(data.to_vec()).map_err(|e| format!("CSV 编码错误: {}", e))?;
        let mut result = String::new();

        for (i, line) in content.lines().enumerate() {
            if i == 0 {
                result.push_str("表头: ");
            } else {
                result.push_str(&format!("行 {}: ", i));
            }
            result.push_str(line);
            result.push('\n');
        }

        Ok(result)
    }

    /// 从 JSON 文件提取文本
    fn extract_text_from_json(&self, data: &[u8]) -> Result<String, String> {
        let content =
            String::from_utf8(data.to_vec()).map_err(|e| format!("JSON 编码错误: {}", e))?;
        let value: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| format!("JSON 解析错误: {}", e))?;
        Ok(value.to_string())
    }

    /// 从 XML/HTML 内容提取文本
    fn extract_text_from_xml_content(&self, data: &[u8]) -> Result<String, String> {
        let content =
            String::from_utf8(data.to_vec()).map_err(|e| format!("XML/HTML 编码错误: {}", e))?;
        Ok(self.extract_text_from_xml(&content))
    }

    /// 从 DOC 文件提取文本（简化版，读取纯文本部分）
    fn extract_text_from_doc(&self, data: &[u8]) -> Result<String, String> {
        let mut reader = BufReader::new(data);
        let mut buffer = [0; 1024];
        let mut text = String::new();

        while let Ok(n) = reader.read(&mut buffer) {
            if n == 0 {
                break;
            }
            let part = String::from_utf8_lossy(&buffer[..n]).into_owned();
            text.push_str(&part);
        }

        text = text.replace(
            &[
                '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07', '\x08', '\x0b',
                '\x0c', '\x0e', '\x0f', '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16',
                '\x17', '\x18', '\x19', '\x1a', '\x1b', '\x1c', '\x1d', '\x1e', '\x1f',
            ][..],
            " ",
        );

        Ok(text.trim().to_string())
    }

    /// 从 XLS 文件提取文本（简化版）
    fn extract_text_from_xls(&self, data: &[u8]) -> Result<String, String> {
        let content = String::from_utf8_lossy(data).into_owned();
        let text: String = content
            .chars()
            .filter(|c| c.is_ascii_graphic() || c.is_whitespace())
            .collect();
        Ok(text.trim().to_string())
    }

    /// 从 PPTX 文件提取文本
    fn extract_text_from_pptx(&self, data: &[u8]) -> Result<String, String> {
        use std::io::Cursor;
        use zip::ZipArchive;

        let cursor = Cursor::new(data);
        let mut archive =
            ZipArchive::new(cursor).map_err(|e| format!("无法打开 PPTX 文件: {}", e))?;

        let mut text = String::new();
        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("读取 PPTX 条目失败: {}", e))?;
            if file.name().starts_with("ppt/slides/slide") && file.name().ends_with(".xml") {
                let mut content = String::new();
                file.read_to_string(&mut content)
                    .map_err(|e| format!("读取幻灯片内容失败: {}", e))?;
                text.push_str(&format!("幻灯片 {}:\n", i));
                text.push_str(&self.extract_text_from_xml(&content));
                text.push('\n');
            }
        }

        Ok(text)
    }

    /// 从 RTF 文件提取文本
    fn extract_text_from_rtf(&self, data: &[u8]) -> Result<String, String> {
        let content = String::from_utf8_lossy(data).into_owned();
        let mut text = String::new();
        let mut in_tag = false;

        for c in content.chars() {
            if c == '{' {
                in_tag = true;
            } else if c == '}' {
                in_tag = false;
            } else if !in_tag {
                text.push(c);
            }
        }

        text = text
            .replace("\\par", "\n")
            .replace("\\tab", "\t")
            .replace("\\n", "\n");
        text = text.split_whitespace().collect::<Vec<_>>().join(" ");

        Ok(text)
    }

    /// 从 OpenDocument 文件提取文本
    fn extract_text_from_opendocument(&self, data: &[u8], ext: &str) -> Result<String, String> {
        use std::io::Cursor;
        use zip::ZipArchive;

        let cursor = Cursor::new(data);
        let mut archive =
            ZipArchive::new(cursor).map_err(|e| format!("无法打开 OpenDocument 文件: {}", e))?;

        let mut text = String::new();
        let target_file = match ext {
            "odt" => "content.xml",
            "ods" => "content.xml",
            "odp" => "content.xml",
            _ => "content.xml",
        };

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("读取 OpenDocument 条目失败: {}", e))?;
            if file.name() == target_file {
                let mut content = String::new();
                file.read_to_string(&mut content)
                    .map_err(|e| format!("读取内容失败: {}", e))?;
                text = self.extract_text_from_xml(&content);
                break;
            }
        }

        Ok(text)
    }

    /// 从 DOCX 文件提取文本
    fn extract_text_from_docx(&self, data: &[u8]) -> Result<String, String> {
        use std::io::Cursor;
        use zip::ZipArchive;

        let cursor = Cursor::new(data);
        let mut archive =
            ZipArchive::new(cursor).map_err(|e| format!("无法打开 DOCX 文件: {}", e))?;

        let mut text = String::new();
        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("读取 DOCX 条目失败: {}", e))?;
            if file.name() == "word/document.xml" {
                let mut content = String::new();
                file.read_to_string(&mut content)
                    .map_err(|e| format!("读取文档内容失败: {}", e))?;
                text = self.extract_text_from_xml(&content);
                break;
            }
        }

        Ok(text)
    }

    /// 从 XLSX 文件提取文本
    fn extract_text_from_xlsx(&self, data: &[u8]) -> Result<String, String> {
        use std::io::Cursor;
        use zip::ZipArchive;

        let cursor = Cursor::new(data);
        let mut archive =
            ZipArchive::new(cursor).map_err(|e| format!("无法打开 XLSX 文件: {}", e))?;

        let mut text = String::new();
        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("读取 XLSX 条目失败: {}", e))?;
            if file.name().starts_with("xl/worksheets/sheet") && file.name().ends_with(".xml") {
                let mut content = String::new();
                file.read_to_string(&mut content)
                    .map_err(|e| format!("读取工作表内容失败: {}", e))?;
                text.push_str(&self.extract_text_from_xml(&content));
                text.push('\n');
            }
        }

        Ok(text)
    }

    /// 从 XML 提取纯文本
    fn extract_text_from_xml(&self, xml_content: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for c in xml_content.chars() {
            if c == '<' {
                in_tag = true;
            } else if c == '>' {
                in_tag = false;
            } else if !in_tag {
                result.push(c);
            }
        }

        result
            .replace("\n", " ")
            .replace("\r", "")
            .replace("  ", " ")
            .trim()
            .to_string()
    }

    /// 基于文档进行问答 - 增强版
    pub async fn ask_document_qa(
        &self,
        question: &str,
        document_ids: Option<&[Uuid]>,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<DocumentQAAnswer, String> {
        let config = self.qa_config.as_ref().ok_or("文档问答配置未初始化")?;

        let context_chunks = if let Some(doc_ids) = document_ids {
            self.search_relevant_chunks(question, doc_ids, top_k, tenant_id)
                .await?
        } else {
            self.search_all_relevant_chunks(question, top_k, tenant_id)
                .await?
        };

        if context_chunks.is_empty() {
            return Ok(DocumentQAAnswer {
                answer: "未找到相关文档内容，请先上传并处理文档。".to_string(),
                confidence: 0.0,
                sources: vec![],
                follow_up_questions: vec![],
            });
        }

        let context = context_chunks
            .iter()
            .enumerate()
            .map(|(i, chunk)| {
                let title = chunk.document_title.as_deref().unwrap_or("未知文档");
                format!("【来源 {}: {}】\n{}\n", i + 1, title, chunk.content)
            })
            .collect::<Vec<_>>()
            .join("\n");

        let prompt = format!(
            "你是 TOPEMS 智能文档助手。请根据以下文档内容回答用户的问题。\n\n\
            重要规则：\n\
            1. 必须基于提供的文档内容回答，不要编造信息；\n\
            2. 如果文档中没有相关信息，请明确说明；\n\
            3. 回答要准确、简洁，必要时引用文档中的具体内容；\n\
            4. 对于数字、日期等关键信息，请确保准确无误；\n\n\
            文档内容：\n{}\n\n\
            用户问题：{}\n\n\
            请给出详细的回答。",
            context, question
        );

        let answer = self.call_ai_api(config, &prompt).await?;

        let confidence = self.calculate_confidence_advanced(&answer, &context_chunks);

        let sources = context_chunks
            .into_iter()
            .take(top_k.min(5))
            .map(|chunk| {
                let doc_title = chunk
                    .document_title
                    .unwrap_or_else(|| "未知文档".to_string());
                DocumentQASource {
                    document_id: chunk.document_id,
                    document_title: doc_title,
                    chunk_content: chunk.content,
                    similarity: chunk.similarity,
                }
            })
            .collect();

        let follow_up_questions = if confidence > 0.5 {
            self.generate_follow_up_questions(question, &answer, config)
                .await
                .unwrap_or_default()
        } else {
            vec![]
        };

        Ok(DocumentQAAnswer {
            answer,
            confidence,
            sources,
            follow_up_questions,
        })
    }

    /// 搜索相关文档分块（基于向量相似度）
    async fn search_relevant_chunks(
        &self,
        question: &str,
        document_ids: &[Uuid],
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<SearchResult>, String> {
        let vs = self.vector_service.read().await;
        let mut all_chunks: Vec<SearchResult> = Vec::new();

        for doc_id in document_ids {
            if let Ok(chunks) = vs.get_document_chunks(*doc_id, tenant_id).await {
                if let Ok(doc) = vs.get_document(*doc_id, tenant_id).await {
                    let doc_title = doc.map(|d| d.title);
                    for chunk in chunks {
                        let similarity = self.calculate_text_similarity(question, &chunk.content);
                        if similarity > 0.1 {
                            all_chunks.push(SearchResult {
                                document_id: chunk.document_id,
                                chunk_id: chunk.id,
                                content: chunk.content,
                                similarity,
                                document_title: doc_title.clone(),
                            });
                        }
                    }
                }
            }
        }

        all_chunks.sort_by(|a, b| {
            b.similarity
                .partial_cmp(&a.similarity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        Ok(all_chunks.into_iter().take(top_k).collect())
    }

    /// 搜索所有相关文档分块
    async fn search_all_relevant_chunks(
        &self,
        question: &str,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<SearchResult>, String> {
        let vs = self.vector_service.read().await;

        if let Ok(docs) = vs.list_documents(tenant_id).await {
            let mut all_chunks: Vec<SearchResult> = Vec::new();

            for doc in docs {
                if doc.status != "processed" {
                    continue;
                }

                if let Ok(chunks) = vs.get_document_chunks(doc.id, tenant_id).await {
                    for chunk in chunks {
                        let similarity = self.calculate_text_similarity(question, &chunk.content);
                        if similarity > 0.1 {
                            all_chunks.push(SearchResult {
                                document_id: chunk.document_id,
                                chunk_id: chunk.id,
                                content: chunk.content,
                                similarity,
                                document_title: Some(doc.title.clone()),
                            });
                        }
                    }
                }
            }

            all_chunks.sort_by(|a, b| {
                b.similarity
                    .partial_cmp(&a.similarity)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            return Ok(all_chunks.into_iter().take(top_k).collect());
        }

        Ok(Vec::new())
    }

    /// 计算文本相似度（简单的关键词匹配）
    fn calculate_text_similarity(&self, query: &str, text: &str) -> f64 {
        let query_words: std::collections::HashSet<_> = query.split_whitespace().collect();
        let text_words: std::collections::HashSet<_> = text.split_whitespace().collect();

        if query_words.is_empty() || text_words.is_empty() {
            return 0.0;
        }

        let intersection_size = query_words.intersection(&text_words).count();
        let union_size = query_words.union(&text_words).count();

        intersection_size as f64 / union_size as f64
    }

    /// 高级置信度计算
    fn calculate_confidence_advanced(&self, answer: &str, context_chunks: &[SearchResult]) -> f64 {
        let length_score = if answer.len() > 200 {
            0.9
        } else if answer.len() > 100 {
            0.7
        } else if answer.len() > 50 {
            0.5
        } else {
            0.3
        };

        let uncertainty_phrases = [
            "不知道",
            "不确定",
            "无法",
            "抱歉",
            "没有找到",
            "不清楚",
            "无法确定",
            "未提及",
        ];
        let has_uncertainty = uncertainty_phrases
            .iter()
            .any(|phrase| answer.contains(phrase));

        let uncertainty_penalty = if has_uncertainty { 0.5 } else { 1.0 };

        let context_score = if !context_chunks.is_empty() {
            let avg_similarity = context_chunks.iter().map(|c| c.similarity).sum::<f64>()
                / context_chunks.len() as f64;
            0.5 + 0.5 * avg_similarity
        } else {
            0.3
        };

        (length_score * 0.4 + context_score * 0.4 + uncertainty_penalty * 0.2).clamp(0.0, 1.0)
    }

    /// 生成文档摘要
    pub async fn generate_document_summary(
        &self,
        document_id: Uuid,
        max_length: Option<i32>,
        tenant_id: Uuid,
    ) -> Result<String, String> {
        let config = self.qa_config.as_ref().ok_or("文档问答配置未初始化")?;

        let chunks = self
            .vector_service
            .read()
            .await
            .get_document_chunks(document_id, tenant_id)
            .await
            .map_err(|e| format!("获取文档分块失败: {}", e))?;

        if chunks.is_empty() {
            return Err("文档内容为空".to_string());
        }

        let content = chunks
            .into_iter()
            .map(|c| c.content)
            .collect::<Vec<_>>()
            .join("\n");

        let max_len = max_length.unwrap_or(500);
        let prompt = format!(
            "请为以下文档内容生成摘要，最多 {} 字。\n\n文档内容：\n{}\n\n请生成简明扼要的摘要。",
            max_len, content
        );

        self.call_ai_api(config, &prompt).await
    }

    /// 提取文档关键点
    pub async fn extract_document_key_points(
        &self,
        document_id: Uuid,
        max_points: Option<i32>,
        tenant_id: Uuid,
    ) -> Result<Vec<String>, String> {
        let config = self.qa_config.as_ref().ok_or("文档问答配置未初始化")?;

        let chunks = self
            .vector_service
            .read()
            .await
            .get_document_chunks(document_id, tenant_id)
            .await
            .map_err(|e| format!("获取文档分块失败: {}", e))?;

        if chunks.is_empty() {
            return Err("文档内容为空".to_string());
        }

        let content = chunks
            .into_iter()
            .map(|c| c.content)
            .collect::<Vec<_>>()
            .join("\n");

        let max_p = max_points.unwrap_or(10);
        let prompt = format!(
            "请从以下文档中提取最多 {} 个关键点。\n\n文档内容：\n{}\n\n请以数字列表形式返回关键点。",
            max_p, content
        );

        let response = self.call_ai_api(config, &prompt).await?;

        let points: Vec<String> = response
            .lines()
            .filter(|line| !line.trim().is_empty())
            .filter_map(|line| {
                let trimmed = line.trim();
                if trimmed.starts_with(|c: char| c.is_ascii_digit()) {
                    Some(
                        trimmed
                            .split_once('.')
                            .map(|(_, rest)| rest.trim().to_string())
                            .unwrap_or(trimmed.to_string()),
                    )
                } else {
                    None
                }
            })
            .collect();

        Ok(points)
    }

    /// 调用 AI API
    pub async fn call_ai_api(
        &self,
        config: &DocumentQAConfig,
        prompt: &str,
    ) -> Result<String, String> {
        let api_url = format!("{}/chat/completions", config.base_url);

        #[derive(Serialize)]
        struct OpenAIRequest {
            model: String,
            messages: Vec<OpenAIMessage>,
            temperature: f64,
        }

        #[derive(Serialize, Deserialize)]
        struct OpenAIMessage {
            role: String,
            content: String,
        }

        #[derive(Deserialize)]
        struct OpenAIResponse {
            choices: Vec<OpenAIChoice>,
        }

        #[derive(Deserialize)]
        struct OpenAIChoice {
            message: OpenAIMessage,
        }

        let request = OpenAIRequest {
            model: config.model.clone(),
            messages: vec![OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            temperature: 0.7,
        };

        let mut req_builder = self
            .http_client
            .post(&api_url)
            .header("Content-Type", "application/json");

        if let Some(key) = &config.api_key {
            if key != "ollama" {
                req_builder = req_builder.header("Authorization", format!("Bearer {}", key));
            }
        }

        let response = req_builder
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("调用 AI API 失败: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("AI API 错误: {} - {}", status, error_text));
        }

        let openai_response: OpenAIResponse = response
            .json()
            .await
            .map_err(|e| format!("解析 AI 响应失败: {}", e))?;

        if let Some(choice) = openai_response.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err("AI 未返回有效响应".to_string())
        }
    }

    /// 计算置信度
    fn calculate_confidence(&self, answer: &str) -> f64 {
        let length_score = if answer.len() > 100 {
            0.8
        } else if answer.len() > 50 {
            0.6
        } else {
            0.4
        };

        let uncertainty_phrases = ["不知道", "不确定", "无法", "抱歉", "没有找到"];
        let has_uncertainty = uncertainty_phrases
            .iter()
            .any(|phrase| answer.contains(phrase));

        if has_uncertainty {
            length_score * 0.5
        } else {
            length_score
        }
    }

    /// 生成后续问题建议
    async fn generate_follow_up_questions(
        &self,
        question: &str,
        answer: &str,
        config: &DocumentQAConfig,
    ) -> Result<Vec<String>, String> {
        let prompt = format!(
            "根据以下对话内容，生成3个相关的后续问题，帮助用户深入了解主题。\n\n问题：{}\n\n回答：{}\n\n请生成3个后续问题，每个问题用数字编号。",
            question, answer
        );

        let response = self.call_ai_api(config, &prompt).await?;

        let questions: Vec<String> = response
            .lines()
            .filter(|line| !line.trim().is_empty())
            .filter_map(|line| {
                let trimmed = line.trim();
                if trimmed.starts_with(|c: char| c.is_ascii_digit()) {
                    Some(
                        trimmed
                            .split_once('.')
                            .map(|(_, rest)| rest.trim().to_string())
                            .unwrap_or(trimmed.to_string()),
                    )
                } else {
                    None
                }
            })
            .collect();

        Ok(questions)
    }
}

/// 向量化结果
#[derive(Debug)]
pub struct VectorizeResult {
    pub file_id: Uuid,
    pub document_id: Uuid,
    pub chunks_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentQAAnswer {
    pub answer: String,
    pub confidence: f64,
    pub sources: Vec<DocumentQASource>,
    pub follow_up_questions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentQASource {
    pub document_id: Uuid,
    pub document_title: String,
    pub chunk_content: String,
    pub similarity: f64,
}

#[derive(Debug, Deserialize)]
pub struct DocumentQAQuestion {
    pub question: String,
    pub document_ids: Option<Vec<Uuid>>,
    pub top_k: Option<usize>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_document_qa_source_roundtrip() {
        let item = DocumentQASource {
            document_id: Uuid::new_v4(),
            document_title: "t".into(),
            chunk_content: "c".into(),
            similarity: 0.95,
        };
        roundtrip(&item);
    }

    #[test]
    fn test_document_qa_answer_roundtrip() {
        let item = DocumentQAAnswer {
            answer: "a".into(),
            confidence: 0.8,
            sources: vec![DocumentQASource {
                document_id: Uuid::new_v4(),
                document_title: "t".into(),
                chunk_content: "c".into(),
                similarity: 0.9,
            }],
            follow_up_questions: vec!["q1".into()],
        };
        roundtrip(&item);
    }
}

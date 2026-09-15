// Legacy in-memory embedding & indexing utilities (backward-compatible)
// 使用静态内存存储（VECTORS / CHUNKS / DOCUMENTS）的旧版向量化流水线
#![allow(dead_code)]

use crate::models::{
    Document, DocumentChunk, EmbeddingRequest, EmbeddingResponse, VectorEmbedding, CHUNKS, CLIENT,
    CONFIG, DOCUMENTS, VECTORS,
};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing;
use uuid::Uuid;
use walkdir::WalkDir;

pub async fn load_documents_from_dir(dir: &str) -> Vec<Document> {
    let mut docs = Vec::new();
    let path = Path::new(dir);

    if !path.exists() {
        if let Err(e) = fs::create_dir_all(dir) {
            tracing::warn!(error = %e, "Failed to create documents directory");
        }
        return docs;
    }

    for entry in WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let file_path = entry.path();
        let metadata = entry.metadata().ok();
        let filename = file_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let title = file_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        let ext = file_path
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let mime_type = match ext.as_str() {
            "txt" => Some("text/plain".to_string()),
            "md" => Some("text/markdown".to_string()),
            "json" => Some("application/json".to_string()),
            "pdf" => Some("application/pdf".to_string()),
            "doc" => Some("application/msword".to_string()),
            "docx" => Some(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    .to_string(),
            ),
            _ => None,
        };

        docs.push(Document {
            id: Uuid::new_v4(),
            title,
            filename: filename.clone(),
            file_path: Some(file_path.to_string_lossy().to_string()),
            file_size: metadata.map(|m| m.len()),
            mime_type,
            content_hash: None,
            category: None,
            tags: None,
            description: None,
            created_at: now.clone(),
            updated_at: now,
            status: "processed".to_string(),
            error_message: None,
        });
    }

    docs
}

async fn read_file_content(file_path: &str) -> Option<String> {
    match fs::read_to_string(file_path) {
        Ok(content) => Some(content),
        Err(e) => {
            tracing::error!("Failed to read file {}: {}", file_path, e);
            None
        }
    }
}

fn split_into_chunks(content: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let content_len = content.len();

    if content_len <= chunk_size {
        chunks.push(content.to_string());
        return chunks;
    }

    let mut chunks = Vec::new();
    let chars: Vec<char> = content.chars().collect();
    let char_count = chars.len();
    let mut start = 0;

    while start < char_count {
        let end = std::cmp::min(start + chunk_size, char_count);
        let chunk: String = chars[start..end].iter().collect();
        chunks.push(chunk);

        if end >= char_count {
            break;
        }

        let step = chunk_size - overlap;
        if step == 0 {
            break;
        }
        start += step;
    }

    chunks
}

pub async fn generate_embeddings(
    texts: Vec<String>,
) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error + Send + Sync>> {
    let config = CONFIG.get().ok_or("Config not initialized")?;
    let client = CLIENT.get().ok_or("Client not initialized")?;

    // Ollama 的 OpenAI 兼容嵌入端点是 /v1/embeddings；base_url 为根地址时需补 /v1，
    // 否则会请求到 /embeddings 返回 404（Ollama 无此路径）。
    // 请求/响应为 OpenAI 兼容格式（input + data[].embedding），与 /v1/embeddings 匹配。
    let embedding_url = if config.use_ollama && !config.base_url.ends_with("/v1") {
        format!("{}/v1/embeddings", config.base_url)
    } else {
        format!("{}/embeddings", config.base_url)
    };

    let request = EmbeddingRequest {
        model: config.embedding_model.clone(),
        input: texts,
    };

    let mut req_builder = client
        .post(&embedding_url)
        .header("Content-Type", "application/json");

    if let Some(key) = &config.api_key {
        if key != "ollama" {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", key));
        }
    }

    let response = req_builder.json(&request).send().await?;
    let status = response.status();

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Embedding API error: {} - {}", status, error_text).into());
    }

    let embedding_response: EmbeddingResponse = response.json().await?;

    let embeddings: Vec<Vec<f32>> = embedding_response
        .data
        .into_iter()
        .map(|d| d.embedding)
        .collect();

    Ok(embeddings)
}

pub async fn process_document_for_embedding(
    doc: &Document,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let Some(file_path) = doc.file_path.as_ref() else {
        return Ok(());
    };

    let content = read_file_content(file_path)
        .await
        .ok_or("Failed to read file")?;

    let chunks = split_into_chunks(&content, 512, 128);
    let chunks_count = chunks.len();

    let chunk_contents: Vec<String> = chunks.to_vec();

    let embeddings = generate_embeddings(chunk_contents).await?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string();

    if let (Some(vectors_arc), Some(chunks_arc)) = (VECTORS.get(), CHUNKS.get()) {
        let mut vectors = match vectors_arc.lock() {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("Failed to lock vectors: {}", e);
                return Ok(());
            }
        };
        let mut chunks_storage = match chunks_arc.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock chunks: {}", e);
                return Ok(());
            }
        };

        for (idx, (chunk_content, embedding)) in chunks.into_iter().zip(embeddings).enumerate() {
            let chunk_id = Uuid::new_v4();

            chunks_storage.push(DocumentChunk {
                id: chunk_id,
                document_id: doc.id,
                chunk_index: idx as i32,
                content: chunk_content.clone(),
                created_at: now.clone(),
                metadata: serde_json::json!({
                    "filename": doc.filename,
                    "title": doc.title
                }),
            });

            vectors.push(VectorEmbedding {
                id: chunk_id,
                document_id: doc.id,
                chunk_index: idx as i32,
                content: chunk_content,
                embedding,
                created_at: now.clone(),
            });
        }

        tracing::info!(
            "✅ 文档 '{}' 已向量化，生成 {} 个向量",
            doc.title,
            chunks_count
        );
    }

    Ok(())
}

pub async fn index_all_documents() {
    if let (Some(docs_arc), Some(vectors_arc), Some(chunks_arc)) =
        (DOCUMENTS.get(), VECTORS.get(), CHUNKS.get())
    {
        let docs = match docs_arc.lock() {
            Ok(d) => d.clone(),
            Err(e) => {
                tracing::error!("Failed to lock documents: {}", e);
                return;
            }
        };

        {
            let mut vectors = match vectors_arc.lock() {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("Failed to lock vectors: {}", e);
                    return;
                }
            };
            let mut chunks = match chunks_arc.lock() {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to lock chunks: {}", e);
                    return;
                }
            };
            vectors.clear();
            chunks.clear();
        }

        for doc in docs {
            if doc.status == "processed" {
                match process_document_for_embedding(&doc).await {
                    Ok(_) => tracing::info!("📄 索引文档: {}", doc.title),
                    Err(e) => tracing::error!("❌ 索引文档失败 {}: {}", doc.title, e),
                }
            }
        }

        let vector_count = match vectors_arc.lock() {
            Ok(v) => v.len(),
            Err(e) => {
                tracing::error!("Failed to lock vectors for count: {}", e);
                return;
            }
        };
        tracing::info!("✅ 向量库索引完成，共 {} 个向量", vector_count);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_into_chunks_short_content() {
        let content = "hello world";
        let chunks = split_into_chunks(content, 512, 128);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], "hello world");
    }

    #[test]
    fn test_split_into_chunks_empty_content() {
        let chunks = split_into_chunks("", 512, 128);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], "");
    }

    #[test]
    fn test_split_into_chunks_exact_chunk_size() {
        let content: String = "a".repeat(10);
        let chunks = split_into_chunks(&content, 10, 0);
        assert_eq!(chunks.len(), 1);
    }

    #[test]
    fn test_split_into_chunks_multiple_chunks() {
        let content: String = "abcdefghij".repeat(10); // 100 chars
        let chunks = split_into_chunks(&content, 30, 10);
        assert!(chunks.len() > 1);
        // Each chunk (except possibly last) should be <= 30 chars
        for chunk in &chunks[..chunks.len() - 1] {
            assert!(chunk.chars().count() <= 30);
        }
    }

    #[test]
    fn test_split_into_chunks_no_overlap() {
        let content: String = "abcdefghij".repeat(5); // 50 chars
        let chunks = split_into_chunks(&content, 10, 0);
        assert!(chunks.len() >= 5);
        for chunk in &chunks {
            assert!(chunk.chars().count() <= 10);
        }
    }

    #[test]
    fn test_split_into_chunks_with_overlap() {
        let content: String = "abcdefghij".repeat(5); // 50 chars
        let chunks_no_overlap = split_into_chunks(&content, 10, 0);
        let chunks_with_overlap = split_into_chunks(&content, 10, 3);
        // With overlap, we should get more or equal chunks
        assert!(chunks_with_overlap.len() >= chunks_no_overlap.len());
    }

    #[test]
    fn test_split_into_chunks_unicode_content() {
        let content = "你好世界测试文本".to_string(); // 8 chars
        let chunks = split_into_chunks(&content, 3, 0);
        assert!(chunks.len() >= 2);
        // Verify all characters are preserved
        let combined: String = chunks.concat();
        assert_eq!(combined, content);
    }

    #[test]
    fn test_split_into_chunks_single_char() {
        let chunks = split_into_chunks("x", 512, 128);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], "x");
    }

    #[test]
    fn test_split_into_chunks_preserves_content() {
        let content: String = "abcdefghijklmnopqrstuvwxyz".to_string();
        let chunks = split_into_chunks(&content, 10, 3);
        let combined: String = chunks.concat();
        // With overlap, combined will have duplicated chars; verify every original char is present
        for ch in content.chars() {
            assert!(
                combined.contains(ch),
                "char '{}' should be present in combined chunks",
                ch
            );
        }
        // First chunk should start at the beginning of content
        assert!(combined.starts_with("abcdefghij"));
        // Last chunk should end at the end of content
        assert!(combined.ends_with("vwxyz"));
    }

    #[test]
    fn test_split_into_chunks_chunk_size_larger_than_content() {
        let content = "short";
        let chunks = split_into_chunks(content, 1000, 100);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], "short");
    }
}

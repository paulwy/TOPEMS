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
use uuid::Uuid;
use walkdir::WalkDir;

pub async fn load_documents_from_dir(dir: &str) -> Vec<Document> {
    let mut docs = Vec::new();
    let path = Path::new(dir);

    if !path.exists() {
        if let Err(e) = fs::create_dir_all(dir) {
            eprintln!("Failed to create documents directory: {}", e);
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
            id: filename.clone(),
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

    let embedding_url = format!("{}/embeddings", config.base_url);

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
            let chunk_id = Uuid::new_v4().to_string();

            chunks_storage.push(DocumentChunk {
                id: chunk_id.clone(),
                document_id: doc.id.clone(),
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
                document_id: doc.id.clone(),
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

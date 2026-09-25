use axum::extract::{Json, State};
use serde::{Deserialize, Serialize};
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::shared::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EmbeddingRequest {
    pub texts: Vec<String>,
    pub model: Option<String>,
    pub dimensions: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    pub embeddings: Vec<Vec<f32>>,
    pub model: String,
    pub dimension: usize,
}

pub struct EmbeddingApi;


fn generate_embedding(text: &str, dimension: usize) -> Vec<f32> {
    let mut embedding = Vec::with_capacity(dimension);

    let mut hash = 5381u64;
    for c in text.chars() {
        hash = ((hash << 5).wrapping_add(hash)).wrapping_add(c as u64);
    }

    for i in 0..dimension {
        let seed = hash.wrapping_add(i as u64);
        let val = ((seed ^ (seed >> 15)) as f32) / u64::MAX as f32;
        embedding.push(val * 2.0 - 1.0);
    }

    embedding
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── EmbeddingRequest ──

    #[test]
    fn test_embedding_request_serde_roundtrip() {
        let req = EmbeddingRequest {
            texts: vec!["hello".into(), "world".into()],
            model: Some("text-embedding-3-small".into()),
            dimensions: Some(768),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: EmbeddingRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.texts, vec!["hello".to_string(), "world".to_string()]);
        assert_eq!(back.model.as_deref(), Some("text-embedding-3-small"));
        assert_eq!(back.dimensions, Some(768));
    }

    #[test]
    fn test_embedding_request_minimal() {
        let json = r#"{"texts":["a"]}"#;
        let req: EmbeddingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.texts, vec!["a".to_string()]);
        assert!(req.model.is_none());
        assert!(req.dimensions.is_none());
    }

    #[test]
    fn test_embedding_request_empty_texts() {
        let req: EmbeddingRequest = serde_json::from_str(r#"{"texts":[]}"#).unwrap();
        assert!(req.texts.is_empty());
    }

    #[test]
    fn test_embedding_request_clone() {
        let req = EmbeddingRequest {
            texts: vec!["x".into()],
            model: None,
            dimensions: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.texts, req.texts);
    }

    // ── EmbeddingResponse ──

    #[test]
    fn test_embedding_response_serde_roundtrip() {
        let resp = EmbeddingResponse {
            embeddings: vec![vec![0.1, 0.2, 0.3], vec![0.4, 0.5, 0.6]],
            model: "test-model".into(),
            dimension: 3,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: EmbeddingResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.embeddings.len(), 2);
        assert_eq!(back.dimension, 3);
        assert_eq!(back.model, "test-model");
    }

    #[test]
    fn test_embedding_response_empty_embeddings() {
        let resp = EmbeddingResponse {
            embeddings: vec![],
            model: "m".into(),
            dimension: 0,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"embeddings\":[]"));
    }

    #[test]
    fn test_embedding_response_clone() {
        let resp = EmbeddingResponse {
            embeddings: vec![vec![0.1]],
            model: "m".into(),
            dimension: 1,
        };
        let cloned = resp.clone();
        assert_eq!(cloned.dimension, resp.dimension);
    }
}


/// POST /api/embedding/generate - 生成文本向量
pub async fn generate(
    State(_state): State<AppState>,
    Json(req): Json<EmbeddingRequest>,
) -> Json<ApiResponse<EmbeddingResponse>> {
    let model = req
        .model
        .unwrap_or_else(|| "text-embedding-3-small".to_string());
    let dimension = req.dimensions.unwrap_or(768);

    let mut embeddings: Vec<Vec<f32>> = Vec::new();

    for text in &req.texts {
        let embedding = generate_embedding(text, dimension);
        embeddings.push(embedding);
    }

    Json(ApiResponse::success(
        EmbeddingResponse {
            embeddings,
            model,
            dimension,
        },
        "Success",
    ))
}
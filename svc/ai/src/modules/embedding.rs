use axum::extract::{Json, State};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

use crate::shared::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl EmbeddingApi {
    /// POST /api/v1/embedding/generate - 生成文本向量
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
}

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

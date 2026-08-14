// Legacy in-memory vector search utilities (backward-compatible)

#![allow(dead_code)]

use crate::models::{VectorEmbedding, VECTORS};
use crate::services::embedding::generate_embeddings;

pub fn cosine_similarity(vec1: &[f32], vec2: &[f32]) -> f64 {
    if vec1.is_empty() || vec2.is_empty() || vec1.len() != vec2.len() {
        return 0.0;
    }

    let mut dot_product = 0.0;
    let mut norm_a_sq = 0.0;
    let mut norm_b_sq = 0.0;

    for (a, b) in vec1.iter().zip(vec2.iter()) {
        let a_f64 = *a as f64;
        let b_f64 = *b as f64;
        dot_product += a_f64 * b_f64;
        norm_a_sq += a_f64 * a_f64;
        norm_b_sq += b_f64 * b_f64;
    }

    let norm_a = norm_a_sq.sqrt();
    let norm_b = norm_b_sq.sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_product / (norm_a * norm_b)
}

pub async fn vector_search(query: &str, top_k: usize) -> Vec<(VectorEmbedding, f64)> {
    let query_embedding = match generate_embeddings(vec![query.to_string()]).await {
        Ok(mut embeddings) => embeddings.pop().unwrap_or_default(),
        Err(e) => {
            tracing::error!("生成查询向量失败: {}", e);
            return Vec::new();
        }
    };

    if query_embedding.is_empty() {
        return Vec::new();
    }

    if let Some(vectors_arc) = VECTORS.get() {
        let vectors = match vectors_arc.lock() {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("Failed to lock vectors for search: {}", e);
                return Vec::new();
            }
        };

        let mut results: Vec<(VectorEmbedding, f64)> = vectors
            .iter()
            .map(|vec| {
                let similarity = cosine_similarity(&vec.embedding, &query_embedding);
                (vec.clone(), similarity)
            })
            .filter(|(_, sim)| *sim > 0.3)
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);

        results
    } else {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical_vectors() {
        let v = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&v, &v);
        assert!((sim - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_orthogonal_vectors() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_opposite_vectors() {
        let a = vec![1.0, 1.0];
        let b = vec![-1.0, -1.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - (-1.0)).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_empty_vectors() {
        let a: Vec<f32> = vec![];
        let b: Vec<f32> = vec![];
        assert_eq!(cosine_similarity(&a, &b), 0.0);
    }

    #[test]
    fn test_cosine_similarity_different_lengths() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0, 2.0, 3.0];
        assert_eq!(cosine_similarity(&a, &b), 0.0);
    }

    #[test]
    fn test_cosine_similarity_zero_vectors() {
        let a = vec![0.0, 0.0, 0.0];
        let b = vec![1.0, 2.0, 3.0];
        assert_eq!(cosine_similarity(&a, &b), 0.0);
    }

    #[test]
    fn test_cosine_similarity_partial_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 1.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        // cos(45°) = 1/√2 ≈ 0.7071
        assert!((sim - (1.0 / 2.0_f64.sqrt())).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_negative_values() {
        let a = vec![-1.0, 2.0, -3.0];
        let b = vec![-1.0, 2.0, -3.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_single_element() {
        let a = vec![5.0_f32];
        let b = vec![5.0_f32];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_known_value() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let sim = cosine_similarity(&a, &b);
        // dot = 4+10+18 = 32; |a|=√14, |b|=√77
        let expected = 32.0 / (14.0_f64.sqrt() * 77.0_f64.sqrt());
        assert!((sim - expected).abs() < 1e-6);
    }
}

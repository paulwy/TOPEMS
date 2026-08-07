// AI 服务缓存模块
// 使用 moka 实现带容量限制和 TTL 的缓存，防止内存泄漏
//
// 本模块为 AI 服务的公共 API，部分方法当前仅在测试中使用，
// 后续将接入向量检索、搜索缓存、QA 对话历史等生产路径。
#![allow(dead_code)]

use moka::future::Cache;
use std::time::Duration;

/// AI 服务缓存
pub struct AiCacheService {
    // 文档缓存
    document_cache: Cache<String, serde_json::Value>,
    // 向量缓存
    vector_cache: Cache<String, Vec<f32>>,
    // 搜索结果缓存
    search_cache: Cache<String, serde_json::Value>,
    // QA 历史缓存
    qa_cache: Cache<String, serde_json::Value>,
    // 默认 TTL（秒）
    default_ttl: u64,
}

impl Default for AiCacheService {
    fn default() -> Self {
        Self::new()
    }
}

impl AiCacheService {
    pub fn new() -> Self {
        Self {
            document_cache: Cache::builder()
                .max_capacity(500)
                .time_to_live(Duration::from_secs(3600))
                .build(),
            vector_cache: Cache::builder()
                .max_capacity(1000)
                .time_to_live(Duration::from_secs(3600))
                .build(),
            search_cache: Cache::builder()
                .max_capacity(200)
                .time_to_live(Duration::from_secs(300))
                .build(),
            qa_cache: Cache::builder()
                .max_capacity(100)
                .time_to_live(Duration::from_secs(1800))
                .build(),
            default_ttl: 3600,
        }
    }

    pub fn with_ttl(ttl_seconds: u64) -> Self {
        Self {
            document_cache: Cache::builder()
                .max_capacity(500)
                .time_to_live(Duration::from_secs(ttl_seconds))
                .build(),
            vector_cache: Cache::builder()
                .max_capacity(1000)
                .time_to_live(Duration::from_secs(ttl_seconds))
                .build(),
            search_cache: Cache::builder()
                .max_capacity(200)
                .time_to_live(Duration::from_secs(300))
                .build(),
            qa_cache: Cache::builder()
                .max_capacity(100)
                .time_to_live(Duration::from_secs(1800))
                .build(),
            default_ttl: ttl_seconds,
        }
    }

    // ==================== 文档缓存 ====================

    pub async fn get_document(&self, id: &str) -> Option<serde_json::Value> {
        self.document_cache.get(id).await
    }

    pub async fn set_document(&self, id: &str, document: serde_json::Value) {
        self.document_cache.insert(id.to_string(), document).await;
    }

    pub async fn delete_document(&self, id: &str) {
        self.document_cache.invalidate(id).await;
    }

    pub async fn clear_documents(&self) {
        self.document_cache.invalidate_all();
    }

    // ==================== 向量缓存 ====================

    pub async fn get_vector(&self, id: &str) -> Option<Vec<f32>> {
        self.vector_cache.get(id).await
    }

    pub async fn set_vector(&self, id: &str, vector: Vec<f32>) {
        self.vector_cache.insert(id.to_string(), vector).await;
    }

    pub async fn delete_vector(&self, id: &str) {
        self.vector_cache.invalidate(id).await;
    }

    pub async fn clear_vectors(&self) {
        self.vector_cache.invalidate_all();
    }

    // ==================== 搜索缓存 ====================

    pub async fn get_search(&self, query_hash: &str) -> Option<serde_json::Value> {
        self.search_cache.get(query_hash).await
    }

    pub async fn set_search(&self, query_hash: &str, results: serde_json::Value) {
        self.search_cache
            .insert(query_hash.to_string(), results)
            .await;
    }

    pub async fn clear_search(&self) {
        self.search_cache.invalidate_all();
    }

    // ==================== QA 缓存 ====================

    pub async fn get_qa_history(&self, conversation_id: &str) -> Option<serde_json::Value> {
        self.qa_cache.get(conversation_id).await
    }

    pub async fn set_qa_history(&self, conversation_id: &str, history: serde_json::Value) {
        self.qa_cache
            .insert(conversation_id.to_string(), history)
            .await;
    }

    pub async fn delete_qa_history(&self, conversation_id: &str) {
        self.qa_cache.invalidate(conversation_id).await;
    }

    // ==================== 统计信息 ====================

    pub async fn get_stats(&self) -> CacheStats {
        CacheStats {
            document_count: self.document_cache.entry_count() as usize,
            vector_count: self.vector_cache.entry_count() as usize,
            search_count: self.search_cache.entry_count() as usize,
            qa_count: self.qa_cache.entry_count() as usize,
            default_ttl: self.default_ttl,
        }
    }

    pub async fn clear_all(&self) {
        self.document_cache.invalidate_all();
        self.vector_cache.invalidate_all();
        self.search_cache.invalidate_all();
        self.qa_cache.invalidate_all();
    }
}

/// 缓存统计信息
#[derive(Debug, Clone, serde::Serialize)]
pub struct CacheStats {
    pub document_count: usize,
    pub vector_count: usize,
    pub search_count: usize,
    pub qa_count: usize,
    pub default_ttl: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_document_cache() {
        let cache = AiCacheService::new();

        cache
            .set_document("doc1", serde_json::json!({"title": "Test"}))
            .await;
        let doc = cache.get_document("doc1").await;
        assert!(doc.is_some());

        cache.delete_document("doc1").await;
        let doc = cache.get_document("doc1").await;
        assert!(doc.is_none());
    }

    #[tokio::test]
    async fn test_vector_cache() {
        let cache = AiCacheService::new();

        let vector = vec![1.0, 2.0, 3.0];
        cache.set_vector("vec1", vector.clone()).await;

        let cached = cache.get_vector("vec1").await;
        assert!(cached.is_some());
        assert_eq!(cached.unwrap(), vector);
    }

    #[tokio::test]
    async fn test_cache_stats() {
        let cache = AiCacheService::new();

        cache.set_document("doc1", serde_json::json!({})).await;
        cache.set_vector("vec1", vec![1.0]).await;
        cache.set_search("search1", serde_json::json!({})).await;

        let stats = cache.get_stats().await;
        assert_eq!(stats.document_count, 1);
        assert_eq!(stats.vector_count, 1);
        assert_eq!(stats.search_count, 1);
    }
}

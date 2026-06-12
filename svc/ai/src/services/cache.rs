// AI 服务缓存模块
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};

/// 缓存条目
struct CacheEntry<V> {
    value: V,
    expires_at: Option<Instant>,
}

impl<V> CacheEntry<V> {
    fn new(value: V, ttl_seconds: Option<u64>) -> Self {
        let expires_at = ttl_seconds.map(|ttl| Instant::now() + Duration::from_secs(ttl));
        Self { value, expires_at }
    }

    fn is_expired(&self) -> bool {
        self.expires_at
            .map(|exp| Instant::now() > exp)
            .unwrap_or(false)
    }
}

/// AI 服务缓存
pub struct AiCacheService {
    // 文档缓存
    document_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    // 向量缓存
    vector_cache: Arc<RwLock<HashMap<String, CacheEntry<Vec<f32>>>>>,
    // 搜索结果缓存
    search_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    // QA 历史缓存
    qa_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
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
            document_cache: Arc::new(RwLock::new(HashMap::new())),
            vector_cache: Arc::new(RwLock::new(HashMap::new())),
            search_cache: Arc::new(RwLock::new(HashMap::new())),
            qa_cache: Arc::new(RwLock::new(HashMap::new())),
            default_ttl: 3600, // 默认 1 小时
        }
    }

    #[allow(dead_code)]
    pub fn with_ttl(ttl_seconds: u64) -> Self {
        Self {
            default_ttl: ttl_seconds,
            ..Self::new()
        }
    }

    // ==================== 文档缓存 ====================

    /// 获取文档缓存
    #[allow(dead_code)]
    pub async fn get_document(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.document_cache.read().await;
        cache.get(id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }

    /// 设置文档缓存
    #[allow(dead_code)]
    pub async fn set_document(&self, id: &str, document: serde_json::Value) {
        let mut cache = self.document_cache.write().await;
        cache.insert(
            id.to_string(),
            CacheEntry::new(document, Some(self.default_ttl)),
        );
    }

    /// 删除文档缓存
    #[allow(dead_code)]
    pub async fn delete_document(&self, id: &str) {
        let mut cache = self.document_cache.write().await;
        cache.remove(id);
    }

    /// 清空文档缓存
    #[allow(dead_code)]
    pub async fn clear_documents(&self) {
        let mut cache = self.document_cache.write().await;
        cache.clear();
    }

    // ==================== 向量缓存 ====================

    /// 获取向量缓存
    #[allow(dead_code)]
    pub async fn get_vector(&self, id: &str) -> Option<Vec<f32>> {
        let cache = self.vector_cache.read().await;
        cache.get(id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }

    /// 设置向量缓存
    #[allow(dead_code)]
    pub async fn set_vector(&self, id: &str, vector: Vec<f32>) {
        let mut cache = self.vector_cache.write().await;
        cache.insert(
            id.to_string(),
            CacheEntry::new(vector, Some(self.default_ttl)),
        );
    }

    /// 删除向量缓存
    #[allow(dead_code)]
    pub async fn delete_vector(&self, id: &str) {
        let mut cache = self.vector_cache.write().await;
        cache.remove(id);
    }

    /// 清空向量缓存
    #[allow(dead_code)]
    pub async fn clear_vectors(&self) {
        let mut cache = self.vector_cache.write().await;
        cache.clear();
    }

    // ==================== 搜索缓存 ====================

    /// 获取搜索结果缓存
    #[allow(dead_code)]
    pub async fn get_search(&self, query_hash: &str) -> Option<serde_json::Value> {
        let cache = self.search_cache.read().await;
        cache.get(query_hash).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }

    /// 设置搜索结果缓存
    #[allow(dead_code)]
    pub async fn set_search(&self, query_hash: &str, results: serde_json::Value) {
        let mut cache = self.search_cache.write().await;
        // 搜索缓存默认 5 分钟
        cache.insert(query_hash.to_string(), CacheEntry::new(results, Some(300)));
    }

    /// 清空搜索缓存
    #[allow(dead_code)]
    pub async fn clear_search(&self) {
        let mut cache = self.search_cache.write().await;
        cache.clear();
    }

    // ==================== QA 缓存 ====================

    /// 获取 QA 历史缓存
    #[allow(dead_code)]
    pub async fn get_qa_history(&self, conversation_id: &str) -> Option<serde_json::Value> {
        let cache = self.qa_cache.read().await;
        cache.get(conversation_id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }

    /// 设置 QA 历史缓存
    #[allow(dead_code)]
    pub async fn set_qa_history(&self, conversation_id: &str, history: serde_json::Value) {
        let mut cache = self.qa_cache.write().await;
        // QA 历史缓存默认 30 分钟
        cache.insert(
            conversation_id.to_string(),
            CacheEntry::new(history, Some(1800)),
        );
    }

    /// 删除 QA 历史缓存
    #[allow(dead_code)]
    pub async fn delete_qa_history(&self, conversation_id: &str) {
        let mut cache = self.qa_cache.write().await;
        cache.remove(conversation_id);
    }

    // ==================== 统计信息 ====================

    /// 获取缓存统计
    #[allow(dead_code)]
    pub async fn get_stats(&self) -> CacheStats {
        let doc_cache = self.document_cache.read().await;
        let vec_cache = self.vector_cache.read().await;
        let search_cache = self.search_cache.read().await;
        let qa_cache = self.qa_cache.read().await;

        CacheStats {
            document_count: doc_cache.len(),
            vector_count: vec_cache.len(),
            search_count: search_cache.len(),
            qa_count: qa_cache.len(),
            default_ttl: self.default_ttl,
        }
    }

    /// 清空所有缓存
    #[allow(dead_code)]
    pub async fn clear_all(&self) {
        self.clear_documents().await;
        self.clear_vectors().await;
        self.clear_search().await;
        let mut qa = self.qa_cache.write().await;
        qa.clear();
    }

    /// 清理过期条目
    #[allow(dead_code)]
    pub async fn cleanup_expired(&self) {
        // 清理文档缓存
        {
            let mut cache = self.document_cache.write().await;
            cache.retain(|_, entry| !entry.is_expired());
        }
        // 清理向量缓存
        {
            let mut cache = self.vector_cache.write().await;
            cache.retain(|_, entry| !entry.is_expired());
        }
        // 清理搜索缓存
        {
            let mut cache = self.search_cache.write().await;
            cache.retain(|_, entry| !entry.is_expired());
        }
        // 清理 QA 缓存
        {
            let mut cache = self.qa_cache.write().await;
            cache.retain(|_, entry| !entry.is_expired());
        }
    }
}

/// 缓存统计信息
#[derive(Debug, Clone, serde::Serialize)]
#[allow(dead_code)]
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

        // 测试设置和获取
        cache
            .set_document("doc1", serde_json::json!({"title": "Test"}))
            .await;
        let doc = cache.get_document("doc1").await;
        assert!(doc.is_some());

        // 测试删除
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

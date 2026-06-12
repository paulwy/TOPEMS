// PM 服务缓存模块
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};

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

pub struct PmCacheService {
    project_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    budget_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    milestone_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    risk_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    report_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    default_ttl: u64,
}

impl Default for PmCacheService {
    fn default() -> Self {
        Self::new()
    }
}

impl PmCacheService {
    pub fn new() -> Self {
        Self {
            project_cache: Arc::new(RwLock::new(HashMap::new())),
            budget_cache: Arc::new(RwLock::new(HashMap::new())),
            milestone_cache: Arc::new(RwLock::new(HashMap::new())),
            risk_cache: Arc::new(RwLock::new(HashMap::new())),
            report_cache: Arc::new(RwLock::new(HashMap::new())),
            default_ttl: 3600,
        }
    }

    // 项目缓存
    pub async fn get_project(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.project_cache.read().await;
        cache.get(id).and_then(|e| {
            if e.is_expired() {
                None
            } else {
                Some(e.value.clone())
            }
        })
    }

    pub async fn set_project(&self, id: &str, project: serde_json::Value) {
        let mut cache = self.project_cache.write().await;
        cache.insert(
            id.to_string(),
            CacheEntry::new(project, Some(self.default_ttl)),
        );
    }

    pub async fn delete_project(&self, id: &str) {
        let mut cache = self.project_cache.write().await;
        cache.remove(id);
    }

    // 预算缓存
    pub async fn get_budget(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.budget_cache.read().await;
        cache.get(id).and_then(|e| {
            if e.is_expired() {
                None
            } else {
                Some(e.value.clone())
            }
        })
    }

    pub async fn set_budget(&self, id: &str, budget: serde_json::Value) {
        let mut cache = self.budget_cache.write().await;
        cache.insert(
            id.to_string(),
            CacheEntry::new(budget, Some(self.default_ttl)),
        );
    }

    // 里程碑缓存
    pub async fn get_milestone(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.milestone_cache.read().await;
        cache.get(id).and_then(|e| {
            if e.is_expired() {
                None
            } else {
                Some(e.value.clone())
            }
        })
    }

    pub async fn set_milestone(&self, id: &str, milestone: serde_json::Value) {
        let mut cache = self.milestone_cache.write().await;
        cache.insert(
            id.to_string(),
            CacheEntry::new(milestone, Some(self.default_ttl)),
        );
    }

    // 风险缓存
    pub async fn get_risk(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.risk_cache.read().await;
        cache.get(id).and_then(|e| {
            if e.is_expired() {
                None
            } else {
                Some(e.value.clone())
            }
        })
    }

    pub async fn set_risk(&self, id: &str, risk: serde_json::Value) {
        let mut cache = self.risk_cache.write().await;
        cache.insert(
            id.to_string(),
            CacheEntry::new(risk, Some(self.default_ttl)),
        );
    }

    // 报表缓存（较长 TTL）
    pub async fn get_report(&self, key: &str) -> Option<serde_json::Value> {
        let cache = self.report_cache.read().await;
        cache.get(key).and_then(|e| {
            if e.is_expired() {
                None
            } else {
                Some(e.value.clone())
            }
        })
    }

    pub async fn set_report(&self, key: &str, report: serde_json::Value) {
        let mut cache = self.report_cache.write().await;
        // 报表缓存 10 分钟
        cache.insert(key.to_string(), CacheEntry::new(report, Some(600)));
    }

    pub async fn get_stats(&self) -> CacheStats {
        CacheStats {
            project_count: self.project_cache.read().await.len(),
            budget_count: self.budget_cache.read().await.len(),
            milestone_count: self.milestone_cache.read().await.len(),
            risk_count: self.risk_cache.read().await.len(),
            report_count: self.report_cache.read().await.len(),
            default_ttl: self.default_ttl,
        }
    }

    pub async fn clear_all(&self) {
        self.project_cache.write().await.clear();
        self.budget_cache.write().await.clear();
        self.milestone_cache.write().await.clear();
        self.risk_cache.write().await.clear();
        self.report_cache.write().await.clear();
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CacheStats {
    pub project_count: usize,
    pub budget_count: usize,
    pub milestone_count: usize,
    pub risk_count: usize,
    pub report_count: usize,
    pub default_ttl: u64,
}

// ==================== V40.0 Phase 10: Federation 网关查询优化 ====================
// 拆分自 graphql_schema.rs：实体批量缓存 / 查询计划缓存 / 联邦统计 / 批量解析运行时。

use crate::modules::graphql_cache::LruCache;
use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use futures_util::future::join_all;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::modules::graphql_helpers::{
    service_auth_get, service_request, service_url, FEDERATION_READ_PERMS,
};

// ==================== V40.0 Phase 10: Federation 网关查询优化 ====================

/// V40.0: 实体批量缓存
/// 相同服务的多个实体查询合并为一个批量 REST 请求，
/// 使用批处理缓存避免重复请求。
#[allow(dead_code)]
pub struct EntityBatchCache {
    cache: Mutex<HashMap<String, serde_json::Value>>,
}

#[allow(dead_code)]
impl EntityBatchCache {
    fn new() -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
        }
    }

    fn cache_key(service: &str, entity_type: &str, id: &str) -> String {
        format!("{}:{}:{}", service, entity_type, id)
    }

    fn get(&self, service: &str, entity_type: &str, id: &str) -> Option<serde_json::Value> {
        let key = Self::cache_key(service, entity_type, id);
        let cache = self.cache.lock().unwrap_or_else(|e| e.into_inner());
        cache.get(&key).cloned()
    }

    fn insert(&self, service: &str, entity_type: &str, id: &str, value: serde_json::Value) {
        let key = Self::cache_key(service, entity_type, id);
        let mut cache = self.cache.lock().unwrap_or_else(|e| e.into_inner());
        cache.insert(key, value);
    }

    fn clear(&self) {
        let mut cache = self.cache.lock().unwrap_or_else(|e| e.into_inner());
        cache.clear();
    }
}

static ENTITY_BATCH_CACHE: std::sync::OnceLock<Arc<EntityBatchCache>> = std::sync::OnceLock::new();

pub fn entity_batch_cache() -> &'static Arc<EntityBatchCache> {
    ENTITY_BATCH_CACHE.get_or_init(|| Arc::new(EntityBatchCache::new()))
}

/// V40.0: 缓存实体解析结果
pub fn cache_entity_result(service: &str, entity_type: &str, id: &str, value: serde_json::Value) {
    entity_batch_cache().insert(service, entity_type, id, value);
}

/// V40.0: 从缓存获取实体
pub fn get_cached_entity(service: &str, entity_type: &str, id: &str) -> Option<serde_json::Value> {
    entity_batch_cache().get(service, entity_type, id)
}

/// V40.0: 查询计划
#[allow(dead_code)]
struct QueryPlan {
    query_hash: String,
    plan: serde_json::Value,
    created_at: DateTime<Utc>,
}

/// V40.0: 查询计划缓存
/// 缓存查询计划（解析后的查询 AST），避免重复解析相同查询
static QUERY_PLAN_CACHE: std::sync::OnceLock<Mutex<LruCache<String, QueryPlan>>> =
    std::sync::OnceLock::new();

fn query_plan_cache() -> &'static Mutex<LruCache<String, QueryPlan>> {
    QUERY_PLAN_CACHE.get_or_init(|| Mutex::new(LruCache::new(100)))
}

/// V40.0: 获取缓存的查询计划
pub fn get_cached_query_plan(query_hash: &str) -> Option<serde_json::Value> {
    let mut cache = query_plan_cache().lock().unwrap_or_else(|e| e.into_inner());
    let key = query_hash.to_string();
    cache.get(&key).map(|p| p.plan.clone())
}

/// V40.0: 缓存查询计划
pub fn cache_query_plan(query_hash: &str, plan: serde_json::Value) {
    let mut cache = query_plan_cache().lock().unwrap_or_else(|e| e.into_inner());
    cache.put(
        query_hash.to_string(),
        QueryPlan {
            query_hash: query_hash.to_string(),
            plan,
            created_at: Utc::now(),
        },
    );
}

/// V40.0: 实体关系
#[derive(SimpleObject, Clone)]
pub struct EntityRelationGql {
    pub from_type: String,
    pub to_type: String,
    pub relation_type: String,
    pub from_field: String,
    pub to_field: String,
    pub service: String,
}

/// V40.0: 实体关系图
#[derive(SimpleObject, Clone)]
pub struct EntityRelationshipGraphGql {
    pub entities: Vec<String>,
    pub relations: Vec<EntityRelationGql>,
}

/// V40.0: 联邦网关性能统计
#[derive(SimpleObject, Clone)]
pub struct FederationStatsGql {
    pub total_requests: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub avg_resolution_time_ms: u64,
    pub entities_resolved: u64,
    pub cross_service_joins: u64,
}

/// V40.0: 联邦统计计数器
static FEDERATION_STATS: std::sync::OnceLock<Mutex<FederationStatsInternal>> =
    std::sync::OnceLock::new();

struct FederationStatsInternal {
    total_requests: u64,
    cache_hits: u64,
    cache_misses: u64,
    total_resolution_time_ms: u64,
    resolution_count: u64,
    entities_resolved: u64,
    cross_service_joins: u64,
}

impl FederationStatsInternal {
    fn new() -> Self {
        Self {
            total_requests: 0,
            cache_hits: 0,
            cache_misses: 0,
            total_resolution_time_ms: 0,
            resolution_count: 0,
            entities_resolved: 0,
            cross_service_joins: 0,
        }
    }
}

fn federation_stats_internal() -> &'static Mutex<FederationStatsInternal> {
    FEDERATION_STATS.get_or_init(|| Mutex::new(FederationStatsInternal::new()))
}

pub fn record_federation_request() {
    let mut stats = federation_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.total_requests += 1;
}

pub fn record_cache_hit() {
    let mut stats = federation_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.cache_hits += 1;
}

pub fn record_cache_miss() {
    let mut stats = federation_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.cache_misses += 1;
}

pub fn record_resolution_time(ms: u64) {
    let mut stats = federation_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.total_resolution_time_ms += ms;
    stats.resolution_count += 1;
}

pub fn record_entities_resolved(count: u64) {
    let mut stats = federation_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.entities_resolved += count;
}

pub fn record_cross_service_join() {
    let mut stats = federation_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.cross_service_joins += 1;
}

pub fn get_federation_stats() -> FederationStatsGql {
    let stats = federation_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let avg_resolution_time_ms = if stats.resolution_count > 0 {
        stats.total_resolution_time_ms / stats.resolution_count
    } else {
        0
    };
    FederationStatsGql {
        total_requests: stats.total_requests,
        cache_hits: stats.cache_hits,
        cache_misses: stats.cache_misses,
        avg_resolution_time_ms,
        entities_resolved: stats.entities_resolved,
        cross_service_joins: stats.cross_service_joins,
    }
}

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
/// V40.0: 按服务分组批量解析实体
/// 相同服务的多个实体查询合并为一个批量 REST 请求
pub async fn batch_resolve_entities(
    service: &str,
    entity_type: &str,
    ids: &[String],
) -> Vec<(String, serde_json::Value)> {
    let mut results = Vec::new();
    let mut uncached_ids = Vec::new();

    for id in ids {
        if let Some(cached) = get_cached_entity(service, entity_type, id) {
            record_cache_hit();
            results.push((id.clone(), cached));
        } else {
            record_cache_miss();
            uncached_ids.push(id.clone());
        }
    }

    if uncached_ids.is_empty() {
        return results;
    }

    let base_url = service_url(service);
    let batch_path = match (service, entity_type) {
        ("erp", "customers") => "/api/erp/customers/batch",
        ("erp", "suppliers") => "/api/erp/suppliers/batch",
        ("erp", "materials") => "/api/erp/materials/batch",
        ("crm", "contacts") => "/api/crm/contacts/batch",
        ("hrm", "employees") => "/api/hrm/employees/batch",
        ("hrm", "departments") => "/api/hrm/departments/batch",
        ("finance", "accounts") => "/api/finance/accounts/batch",
        ("finance", "vouchers") => "/api/finance/vouchers/batch",
        ("finance", "expenses") => "/api/finance/expenses/batch",
        _ => "",
    };

    if !batch_path.is_empty() {
        let url = format!("{}{}", base_url, batch_path);
        let client = service_request(reqwest::Method::POST, &url, FEDERATION_READ_PERMS);
        if let Ok(Ok(resp)) = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            client
                .json(&serde_json::json!({ "ids": &uncached_ids }))
                .send(),
        )
        .await
        {
            if resp.status().is_success() {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    let data_list = json
                        .get("data")
                        .and_then(|d| d.as_array())
                        .cloned()
                        .unwrap_or_default();
                    for item in data_list {
                        let id = item
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        cache_entity_result(service, entity_type, &id, item.clone());
                        results.push((id, item));
                    }
                    record_entities_resolved(uncached_ids.len() as u64);
                    return results;
                }
            }
        }
    }

    let futures = uncached_ids.iter().map(|id| {
        let service = service.to_string();
        let entity_type = entity_type.to_string();
        let id = id.clone();
        async move {
            let start = std::time::Instant::now();
            let path = match (service.as_str(), entity_type.as_str()) {
                ("erp", "customers") => format!("/api/erp/customers/{}", id),
                ("erp", "suppliers") => format!("/api/erp/suppliers/{}", id),
                ("erp", "materials") => format!("/api/erp/materials/{}", id),
                ("crm", "contacts") => format!("/api/crm/contacts/{}", id),
                ("crm", "leads") => format!("/api/crm/leads/{}", id),
                ("hrm", "employees") => format!("/api/hrm/employees/{}", id),
                ("hrm", "departments") => format!("/api/hrm/departments/{}", id),
                ("finance", "accounts") => format!("/api/finance/accounts/{}", id),
                ("finance", "vouchers") => format!("/api/finance/vouchers/{}", id),
                ("finance", "expenses") => format!("/api/finance/expenses/{}", id),
                ("erp", "orders") => format!("/api/erp/orders/{}", id),
                _ => format!("/api/{}/{}/{}", service, entity_type, id),
            };
            let url = format!("{}{}", base_url, path);
            let data = match service_auth_get(&url, FEDERATION_READ_PERMS).await {
                Ok(resp) if resp.status().is_success() => resp
                    .json::<serde_json::Value>()
                    .await
                    .unwrap_or(serde_json::json!({"error": "parse error"})),
                _ => serde_json::json!({"error": "entity not found", "service": service, "entity_type": entity_type, "id": id}),
            };
            let elapsed = start.elapsed().as_millis() as u64;
            record_resolution_time(elapsed);
            cache_entity_result(&service, &entity_type, &id, data.clone());
            (id, data)
        }
    });
    let batch_results = join_all(futures).await;
    results.extend(batch_results);
    record_entities_resolved(uncached_ids.len() as u64);
    results
}

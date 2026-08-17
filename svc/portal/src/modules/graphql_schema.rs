#![allow(dead_code)] // Reserved: GraphQL 聚合层模块，待业务接入后启用
//! V33.0 Portal BFF Phase 3: GraphQL 聚合层
//! V34.0 Portal BFF Phase 4: GraphQL Mutation + Subscription 支持
//! V35.0 Portal BFF Phase 5: DataLoader 批量加载 + 查询复杂度限制
//! V37.0 Portal BFF Phase 7: 完整 Apollo Federation v2（每服务实体 + 联邦网关）
//!
//! 提供单一端点让前端按需查询跨服务聚合数据，
//! 避免 N+1 REST 请求，支持字段级别的数据获取。
//! Phase 4 新增：
//! - Mutation：createTodo / completeTodo
//! - Subscription：serviceHealthChanged（WebSocket 实时推送）
//! Phase 5 新增：
//! - DataLoader：ServiceHealthLoader / TodoLoader 批量加载，解决 N+1 问题
//! - 查询复杂度限制：limit_complexity(1000) + limit_depth(10)
//! Phase 7 新增：
//! - Apollo Federation v2：每服务实体类型 + @key 指令 + Entity trait
//! - federation_sdl 查询：返回组合后的联邦 Schema SDL
//! - federation_entities 查询：批量解析跨服务联邦实体
//! - federation_service_sdls 查询：返回各服务的 SDL 片段

use async_graphql::dataloader::{DataLoader, Loader};
use async_graphql::{ComplexObject, Context, Object, Schema, SimpleObject, Subscription};
use chrono::{DateTime, Utc};
use futures_util::future::join_all;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::collections::HashSet;
use std::collections::VecDeque;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::RwLock;
use tokio::sync::broadcast;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::modules::query_governance::*;
use crate::modules::rate_limiting::*;
use crate::modules::schema_versioning::*;
use crate::shared::AppState;
use topems_shared_observability::telemetry::TracedRequestExt;

// ==================== GraphQL 类型定义 ====================

#[derive(SimpleObject)]
pub struct ServiceStatsGql {
    pub service: String,
    pub total: u64,
    pub active: u64,
    pub available: bool,
}

#[derive(SimpleObject)]
pub struct BusinessStatsGql {
    pub erp: ServiceStatsGql,
    pub crm: ServiceStatsGql,
    pub hrm: ServiceStatsGql,
    pub finance: ServiceStatsGql,
    pub mes: ServiceStatsGql,
    pub workflow: ServiceStatsGql,
}

#[derive(SimpleObject, Clone)]
pub struct UnifiedTodoGql {
    pub id: String,
    pub title: String,
    pub source: String,
    pub priority: i32,
    pub status: String,
    pub created_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct ServiceHealthGql {
    pub service: String,
    pub healthy: bool,
    pub url: String,
}

#[derive(SimpleObject)]
pub struct DashboardGql {
    pub stats: BusinessStatsGql,
    pub todos: Vec<UnifiedTodoGql>,
    pub services: Vec<ServiceHealthGql>,
}

// V36.0 Phase 4: 扩展模块统计（qms/srm/lims/rd/ehs）
#[derive(SimpleObject)]
pub struct ModuleStatGql {
    pub service: String,
    pub total: u64,
    pub available: bool,
}

// V36.0 Phase 6: GraphQL Federation 联邦网关
#[derive(SimpleObject)]
pub struct FederatedServiceGql {
    pub service: String,
    pub url: String,
    pub available: bool,
    pub entities: Vec<String>,
}

#[derive(SimpleObject)]
pub struct FederatedEntityGql {
    pub service: String,
    pub entity_type: String,
    pub id: String,
    pub data: serde_json::Value,
}

// ==================== V37.0 Phase 7: Apollo Federation v2 实体类型 ====================
//
// Portal BFF 作为联邦网关，定义所有跨服务实体类型。
// 每个实体的 @key 指令通过 federation_sdl 查询暴露在组合后的 SDL 中，
// 实体解析通过 federation_entities 查询的 __resolveReference 逻辑实现。
// 当下游服务后续启用 GraphQL 端点时，这些实体可迁移到各服务。

/// ERP Customer 联邦实体
#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct CustomerEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub status: String,
    pub phone: Option<String>,
    pub industry: Option<String>,
    pub contact_person: Option<String>,
}

#[ComplexObject]
impl CustomerEntityGql {
    async fn orders(&self, _ctx: &Context<'_>) -> Vec<OrderEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8010/api/erp/orders?customer_id={}",
            self.id
        );
        match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse ERP orders response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let items = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                items
                    .iter()
                    .map(|item| OrderEntityGql {
                        id: item
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        order_number: item
                            .get("order_number")
                            .or_else(|| item.get("code"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        customer_id: item
                            .get("customer_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or(&self.id)
                            .to_string(),
                        total_amount: item
                            .get("total_amount")
                            .or_else(|| item.get("amount"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0),
                        status: item
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        order_date: item
                            .get("order_date")
                            .or_else(|| item.get("created_at"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                    })
                    .collect()
            }
            _ => Vec::new(),
        }
    }

    async fn contacts(&self, _ctx: &Context<'_>) -> Vec<ContactEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8029/api/crm/contacts?customer_id={}",
            self.id
        );
        match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse CRM contacts response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let items = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                items
                    .iter()
                    .map(|item| ContactEntityGql {
                        id: item
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        name: item
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        customer_id: item
                            .get("customer_id")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                        email: item
                            .get("email")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                    })
                    .collect()
            }
            _ => Vec::new(),
        }
    }
}

/// ERP Supplier 联邦实体
#[derive(SimpleObject)]
pub struct SupplierEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub status: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
}

/// PDM/ERP Material 联邦实体
#[derive(SimpleObject)]
pub struct MaterialEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub category: String,
    pub unit: Option<String>,
    pub spec: Option<String>,
    pub price: Option<f64>,
}

/// HRM Employee 联邦实体
#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct EmployeeEntityGql {
    pub id: String,
    pub name: String,
    pub department: String,
    pub position: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: Option<String>,
}

#[ComplexObject]
impl EmployeeEntityGql {
    async fn department_info(&self, _ctx: &Context<'_>) -> Option<DepartmentEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8020/api/hrm/departments?name={}",
            self.department
        );
        match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse HRM departments response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let item = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.first())
                    .cloned();
                item.map(|item| DepartmentEntityGql {
                    id: item
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    name: item
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&self.department)
                        .to_string(),
                    code: item
                        .get("code")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    manager_id: item
                        .get("manager_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    parent_id: item
                        .get("parent_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                })
            }
            _ => None,
        }
    }
}

/// Finance Voucher 联邦实体
#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct VoucherEntityGql {
    pub id: String,
    pub voucher_number: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub status: String,
    pub voucher_date: Option<String>,
    pub created_by: Option<String>,
}

#[ComplexObject]
impl VoucherEntityGql {
    async fn account_subject(&self, _ctx: &Context<'_>) -> Option<AccountSubjectEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8011/api/finance/accounts?voucher_id={}",
            self.id
        );
        match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse finance accounts response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let item = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.first())
                    .cloned();
                item.map(|item| AccountSubjectEntityGql {
                    id: item
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    code: item
                        .get("code")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    name: item
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    category: item
                        .get("category")
                        .or_else(|| item.get("type"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    balance: item.get("balance").and_then(|v| v.as_f64()),
                })
            }
            _ => None,
        }
    }
}

/// CRM Contact 联邦实体
#[derive(SimpleObject, Clone)]
pub struct ContactEntityGql {
    pub id: String,
    pub name: String,
    pub customer_id: Option<String>,
    pub email: Option<String>,
}

/// ERP Order 联邦实体（跨服务 Join 用）
#[derive(SimpleObject, Clone)]
pub struct OrderEntityGql {
    pub id: String,
    pub order_number: String,
    pub customer_id: String,
    pub total_amount: f64,
    pub status: String,
    pub order_date: Option<String>,
}

/// Finance AccountSubject 联邦实体（跨服务 Join 用）
#[derive(SimpleObject, Clone)]
pub struct AccountSubjectEntityGql {
    pub id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub balance: Option<f64>,
}

/// HRM Department 联邦实体（跨服务 Join 用）
#[derive(SimpleObject, Clone)]
pub struct DepartmentEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub manager_id: Option<String>,
    pub parent_id: Option<String>,
}

/// 联邦实体表示（用于 _entities 批量解析）
#[derive(SimpleObject, Clone)]
pub struct FederationRepresentationGql {
    pub __typename: String,
    pub entity: serde_json::Value,
}

/// 联邦服务 SDL 片段
#[derive(SimpleObject)]
pub struct FederationServiceSdlGql {
    pub service: String,
    pub sdl: String,
    pub available: bool,
}

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

/// V40.0: 简单 LRU 缓存实现（HashMap + VecDeque）
#[allow(dead_code)]
struct LruCache<K, V> {
    map: HashMap<K, V>,
    order: VecDeque<K>,
    capacity: usize,
}

#[allow(dead_code)]
impl<K: std::cmp::Eq + std::hash::Hash + Clone, V> LruCache<K, V> {
    fn new(capacity: usize) -> Self {
        Self {
            map: HashMap::new(),
            order: VecDeque::new(),
            capacity,
        }
    }

    fn get(&mut self, key: &K) -> Option<&V> {
        if self.map.contains_key(key) {
            self.order.retain(|k| k != key);
            self.order.push_front(key.clone());
            self.map.get(key)
        } else {
            None
        }
    }

    fn put(&mut self, key: K, value: V) {
        if self.map.contains_key(&key) {
            self.order.retain(|k| k != &key);
        } else if self.map.len() >= self.capacity {
            if let Some(oldest) = self.order.pop_back() {
                self.map.remove(&oldest);
            }
        }
        self.order.push_front(key.clone());
        self.map.insert(key, value);
    }

    fn len(&self) -> usize {
        self.map.len()
    }
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

/// V40.0: 按服务分组批量解析实体
/// 相同服务的多个实体查询合并为一个批量 REST 请求
async fn batch_resolve_entities(
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
        let client = shared_http_client();
        if let Ok(Ok(resp)) = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            client
                .post(&url)
                .json(&serde_json::json!({ "ids": &uncached_ids }))
                .with_trace()
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
            let data = match shared_http_client().get(&url).with_trace().send().await {
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

// ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================

/// 订阅频道类型
/// 支持 6 个事件频道，每个频道可独立订阅和过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SubscriptionChannel {
    /// 服务健康状态变化（已有，保留）
    ServiceHealth,
    /// 主数据变更事件（客户/供应商/物料/员工等）
    MasterDataChanged,
    /// 通知接收事件
    NotificationReceived,
    /// 工作流任务分配事件
    WorkflowTaskAssigned,
    /// 订单状态变更事件
    OrderStatusChanged,
    /// V43.0: 通用数据变更事件（实体级细粒度推送）
    DataChanged,
}

impl SubscriptionChannel {
    /// Redis PubSub 频道名
    pub fn redis_channel(&self) -> &'static str {
        match self {
            Self::ServiceHealth => "topems:portal:subscription:service_health",
            Self::MasterDataChanged => "topems:portal:subscription:master_data",
            Self::NotificationReceived => "topems:portal:subscription:notification",
            Self::WorkflowTaskAssigned => "topems:portal:subscription:workflow_task",
            Self::OrderStatusChanged => "topems:portal:subscription:order_status",
            Self::DataChanged => "topems:portal:subscription:data_changed",
        }
    }
}

/// 主数据变更事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MasterDataEventGql {
    pub domain: String,
    pub action: String,
    pub master_data_id: String,
    pub source_service: String,
    pub timestamp: String,
}

/// 通知接收事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NotificationEventGql {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub timestamp: String,
}

/// 工作流任务分配事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct WorkflowTaskEventGql {
    pub task_id: String,
    pub assignee_id: String,
    pub instance_title: String,
    pub priority: String,
    pub status: String,
    pub timestamp: String,
}

/// 订单状态变更事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct OrderStatusEventGql {
    pub order_id: String,
    pub order_type: String,
    pub old_status: String,
    pub new_status: String,
    pub timestamp: String,
}

/// 内存事件总线（降级模式 / 本地广播）
///
/// 当 Redis 不可用时，使用 `tokio::sync::broadcast` 进行本地事件广播。
/// 每个频道独立配置容量（256），支持多订阅者。
pub struct EventBus {
    channels: HashMap<SubscriptionChannel, broadcast::Sender<serde_json::Value>>,
}

impl EventBus {
    /// 创建包含所有频道的事件总线
    pub fn new() -> Self {
        let mut channels = HashMap::new();
        let all_channels = [
            SubscriptionChannel::ServiceHealth,
            SubscriptionChannel::MasterDataChanged,
            SubscriptionChannel::NotificationReceived,
            SubscriptionChannel::WorkflowTaskAssigned,
            SubscriptionChannel::OrderStatusChanged,
            SubscriptionChannel::DataChanged,
        ];
        for ch in all_channels {
            let (tx, _rx) = broadcast::channel::<serde_json::Value>(256);
            channels.insert(ch, tx);
        }
        Self { channels }
    }

    /// 发布事件到指定频道
    pub fn publish(&self, channel: SubscriptionChannel, event: serde_json::Value) {
        if let Some(tx) = self.channels.get(&channel) {
            // 忽略发送错误（无订阅者时正常）
            let _ = tx.send(event);
        }
    }

    /// 订阅指定频道，返回一个新的接收器
    pub fn subscribe(
        &self,
        channel: SubscriptionChannel,
    ) -> broadcast::Receiver<serde_json::Value> {
        self.channels.get(&channel).unwrap().subscribe()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

/// 全局事件总线单例
/// 供 SubscriptionRoot、MutationRoot 和 Redis 监听后台任务共享。
static GLOBAL_EVENT_BUS: std::sync::OnceLock<Arc<EventBus>> = std::sync::OnceLock::new();

/// 获取全局事件总线
pub fn global_event_bus() -> &'static Arc<EventBus> {
    GLOBAL_EVENT_BUS.get_or_init(|| Arc::new(EventBus::new()))
}

// ==================== V35.0 Phase 5: DataLoader 实现 ====================

/// 服务健康状态批量加载器
/// 解决 N+1 问题：当多个查询同时请求不同服务的健康状态时，
/// DataLoader 会自动合并为一次批量请求。
pub struct ServiceHealthLoader;

impl Loader<String> for ServiceHealthLoader {
    type Value = ServiceHealthGql;
    type Error = std::convert::Infallible;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        // 并行批量检查所有请求的服务健康状态
        let futures = keys.iter().map(|service_name| async move {
            let url = service_url(service_name);
            let healthy = check_service_health(url).await;
            (
                service_name.clone(),
                ServiceHealthGql {
                    service: service_name.clone(),
                    healthy,
                    url: url.to_string(),
                },
            )
        });
        let results = join_all(futures).await;
        Ok(results.into_iter().collect())
    }
}

/// 待办事项批量加载器
/// 解决 N+1 问题：当多个查询同时请求不同 todo 的详情时，
/// DataLoader 会自动合并为一次数据库查询。
pub struct TodoLoader {
    pool: sqlx::PgPool,
}

impl TodoLoader {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }
}

impl Loader<uuid::Uuid> for TodoLoader {
    type Value = UnifiedTodoGql;
    type Error = std::convert::Infallible;

    async fn load(
        &self,
        keys: &[uuid::Uuid],
    ) -> Result<HashMap<uuid::Uuid, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        // 批量查询：一次 SQL 获取所有请求的 todo
        let rows = sqlx::query(
            r#"SELECT id, title, created_at FROM portal.portal_todos
               WHERE id = ANY($1) AND deleted_at IS NULL"#,
        )
        .bind(keys)
        .fetch_all(&self.pool)
        .await;

        let mut result = HashMap::new();
        if let Ok(rows) = rows {
            use sqlx::Row;
            for row in rows {
                let id: uuid::Uuid = row.try_get("id").unwrap_or_default();
                let title: String = row.try_get("title").unwrap_or_default();
                let created_at: chrono::DateTime<chrono::Utc> = row
                    .try_get("created_at")
                    .unwrap_or_else(|_| chrono::Utc::now());
                result.insert(
                    id,
                    UnifiedTodoGql {
                        id: id.to_string(),
                        title,
                        source: "portal".into(),
                        priority: 0,
                        status: "pending".into(),
                        created_at: created_at.to_rfc3339(),
                    },
                );
            }
        }

        // 对未找到的 key 填充默认值
        for key in keys {
            result.entry(*key).or_insert_with(|| UnifiedTodoGql {
                id: key.to_string(),
                title: String::new(),
                source: "portal".into(),
                priority: 0,
                status: "not_found".into(),
                created_at: chrono::Utc::now().to_rfc3339(),
            });
        }

        Ok(result)
    }
}

/// 根据服务名获取服务 URL
fn service_url(service_name: &str) -> &'static str {
    match service_name {
        "erp" => "http://localhost:8010",
        "crm" => "http://localhost:8029",
        "hrm" => "http://localhost:8020",
        "finance" => "http://localhost:8011",
        "mes" => "http://localhost:8030",
        "workflow" => "http://localhost:8000",
        "iam" => "http://localhost:8000",
        "notification" => "http://localhost:8084",
        _ => "http://localhost:8000",
    }
}

// ==================== Query 根类型 ====================

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// 获取跨服务业务统计数据
    async fn business_stats(&self, ctx: &Context<'_>) -> async_graphql::Result<BusinessStatsGql> {
        let state = ctx.data::<AppState>()?;

        let (erp, crm, hrm, finance, mes, workflow) = tokio::join!(
            fetch_erp_stats(state),
            fetch_crm_stats(state),
            fetch_hrm_stats(state),
            fetch_finance_stats(state),
            fetch_mes_stats(state),
            fetch_workflow_stats(state),
        );

        Ok(BusinessStatsGql {
            erp: erp.unwrap_or(ServiceStatsGql {
                service: "erp".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            crm: crm.unwrap_or(ServiceStatsGql {
                service: "crm".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            hrm: hrm.unwrap_or(ServiceStatsGql {
                service: "hrm".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            finance: finance.unwrap_or(ServiceStatsGql {
                service: "finance".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            mes: mes.unwrap_or(ServiceStatsGql {
                service: "mes".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            workflow: workflow.unwrap_or(ServiceStatsGql {
                service: "workflow".into(),
                total: 0,
                active: 0,
                available: false,
            }),
        })
    }

    /// 获取统一待办列表（聚合 workflow + portal + notification）
    async fn unified_todos(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<UnifiedTodoGql>> {
        let state = ctx.data::<AppState>()?;
        let mut todos = Vec::new();

        // 从 workflow 服务获取待办任务
        if let Ok(resp) = state.workflow_client.get_my_pending_tasks(1, 20).await {
            for task in resp.items {
                todos.push(UnifiedTodoGql {
                    id: task.id.to_string(),
                    title: task.instance_title.unwrap_or_default(),
                    source: "workflow".into(),
                    priority: task
                        .priority
                        .as_deref()
                        .and_then(|p| p.parse::<i32>().ok())
                        .unwrap_or(0),
                    status: task.status,
                    created_at: task.created_at.to_rfc3339(),
                });
            }
        }

        // V34.0: 修复 portal_todos 查询（使用正确的 schema 和 completed 列）
        if let Ok(rows) = sqlx::query(
            r#"SELECT id, title, created_at FROM portal.portal_todos
               WHERE deleted_at IS NULL AND completed = FALSE
               ORDER BY created_at DESC LIMIT 10"#,
        )
        .fetch_all(&state.pool)
        .await
        {
            use sqlx::Row;
            for row in rows {
                let id: uuid::Uuid = row.try_get("id").unwrap_or_default();
                let title: String = row.try_get("title").unwrap_or_default();
                let created_at: chrono::DateTime<chrono::Utc> = row
                    .try_get("created_at")
                    .unwrap_or_else(|_| chrono::Utc::now());
                if !title.is_empty() {
                    todos.push(UnifiedTodoGql {
                        id: id.to_string(),
                        title,
                        source: "portal".into(),
                        priority: 0,
                        status: "pending".into(),
                        created_at: created_at.to_rfc3339(),
                    });
                }
            }
        }

        // 从 notification 服务获取未读通知
        if let Ok(notifications) = state.notification_client.get_unread().await {
            for n in notifications {
                todos.push(UnifiedTodoGql {
                    id: n
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    title: n
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    source: "notification".into(),
                    priority: n.get("priority").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                    status: "unread".into(),
                    created_at: n
                        .get("created_at")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                });
            }
        }

        Ok(todos)
    }

    /// 获取所有服务健康状态（V34.0: 并行检查所有服务）
    async fn service_health(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceHealthGql>> {
        let services = [
            ("erp", "http://localhost:8010"),
            ("crm", "http://localhost:8029"),
            ("hrm", "http://localhost:8020"),
            ("finance", "http://localhost:8011"),
            ("mes", "http://localhost:8030"),
            ("workflow", "http://localhost:8000"),
            ("iam", "http://localhost:8000"),
            ("notification", "http://localhost:8084"),
        ];

        // V34.0 Track F: 并行检查所有服务健康状态
        let futures = services.iter().map(|(name, url)| async move {
            let healthy = check_service_health(url).await;
            ServiceHealthGql {
                service: (*name).to_string(),
                healthy,
                url: (*url).to_string(),
            }
        });
        let results = join_all(futures).await;

        Ok(results)
    }

    /// 获取复合仪表盘视图（V34.0: 并行获取 stats + todos + services）
    async fn dashboard(&self, ctx: &Context<'_>) -> async_graphql::Result<DashboardGql> {
        let (stats, todos, services) = tokio::join!(
            self.business_stats(ctx),
            self.unified_todos(ctx),
            self.service_health(ctx),
        );

        Ok(DashboardGql {
            stats: stats?,
            todos: todos?,
            services: services?,
        })
    }

    /// V35.0 Phase 5: 通过 DataLoader 获取单个服务健康状态
    /// 使用 DataLoader 自动批量合并多个请求，避免 N+1 问题
    async fn service_health_by_name(
        &self,
        ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Option<ServiceHealthGql>> {
        let loader = ctx.data::<DataLoader<ServiceHealthLoader>>()?;
        Ok(loader.load_one(service).await?)
    }

    /// V35.0 Phase 5: 通过 DataLoader 批量获取多个服务健康状态
    async fn service_health_batch(
        &self,
        ctx: &Context<'_>,
        services: Vec<String>,
    ) -> async_graphql::Result<Vec<ServiceHealthGql>> {
        let loader = ctx.data::<DataLoader<ServiceHealthLoader>>()?;
        let map = loader.load_many(services).await?;
        Ok(map.into_values().collect())
    }

    /// V35.0 Phase 5: 通过 DataLoader 获取单个待办事项
    async fn todo_by_id(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<UnifiedTodoGql>> {
        let uuid = uuid::Uuid::parse_str(&id)
            .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;
        let loader = ctx.data::<DataLoader<TodoLoader>>()?;
        Ok(loader.load_one(uuid).await?)
    }

    /// V36.0 Phase 4: 获取扩展模块统计（qms/srm/lims/rd/ehs）
    /// 通过 BFF 并行调用各服务列表端点，聚合 total count
    async fn module_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<Vec<ModuleStatGql>> {
        let modules = [
            (
                "qms",
                "http://localhost:8050",
                "/api/qms/standards?page=1&page_size=1",
            ),
            (
                "srm",
                "http://localhost:8042",
                "/api/srm/suppliers?page=1&page_size=1",
            ),
            (
                "lims",
                "http://localhost:8051",
                "/api/lims/samples?page=1&page_size=1",
            ),
            (
                "rd",
                "http://localhost:8053",
                "/api/rd/projects?page=1&page_size=1",
            ),
            (
                "ehs",
                "http://localhost:8052",
                "/api/ehs/hazards?page=1&page_size=1",
            ),
        ];

        let futures = modules.iter().map(|(name, base, path)| async move {
            let url = format!("{}{}", base, path);
            match shared_http_client().get(&url).with_trace().send().await {
                Ok(resp) if resp.status().is_success() => {
                    let json: serde_json::Value = match resp.json().await {
                        Ok(j) => j,
                        Err(e) => {
                            tracing::warn!("Failed to parse {} stats response JSON: {}", name, e);
                            serde_json::Value::Null
                        }
                    };
                    let total = json
                        .get("data")
                        .and_then(|d| d.get("total"))
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    ModuleStatGql {
                        service: (*name).to_string(),
                        total,
                        available: true,
                    }
                }
                _ => ModuleStatGql {
                    service: (*name).to_string(),
                    total: 0,
                    available: false,
                },
            }
        });
        let results = join_all(futures).await;
        Ok(results)
    }

    /// V36.0 Phase 6: 获取联邦服务注册表
    /// 返回所有已注册的联邦服务及其支持的实体类型
    async fn federated_services(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FederatedServiceGql>> {
        let registry = [
            (
                "erp",
                "http://localhost:8010",
                vec!["customers", "suppliers", "materials", "orders"],
            ),
            (
                "crm",
                "http://localhost:8029",
                vec!["contacts", "leads", "opportunities"],
            ),
            (
                "hrm",
                "http://localhost:8020",
                vec!["employees", "departments", "positions"],
            ),
            (
                "finance",
                "http://localhost:8011",
                vec!["accounts", "vouchers", "expenses"],
            ),
            (
                "mes",
                "http://localhost:8030",
                vec!["work_orders", "production_lines"],
            ),
        ];

        let futures = registry.iter().map(|(name, url, entities)| async move {
            let healthy = check_service_health(url).await;
            FederatedServiceGql {
                service: (*name).to_string(),
                url: (*url).to_string(),
                available: healthy,
                entities: entities.iter().map(|e| (*e).to_string()).collect(),
            }
        });
        let results = join_all(futures).await;
        Ok(results)
    }

    /// V36.0 Phase 6: 联邦实体查询
    /// 通过 service + entity_type + id 跨服务查询实体
    async fn federated_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
    ) -> async_graphql::Result<FederatedEntityGql> {
        let base_url = service_url(&service);
        let path = match entity_type.as_str() {
            "customers" => format!("/api/erp/customers/{}", id),
            "suppliers" => format!("/api/erp/suppliers/{}", id),
            "materials" => format!("/api/erp/materials/{}", id),
            "contacts" => format!("/api/crm/contacts/{}", id),
            "leads" => format!("/api/crm/leads/{}", id),
            "employees" => format!("/api/hrm/employees/{}", id),
            "departments" => format!("/api/hrm/departments/{}", id),
            "accounts" => format!("/api/finance/accounts/{}", id),
            "vouchers" => format!("/api/finance/vouchers/{}", id),
            "expenses" => format!("/api/finance/expenses/{}", id),
            "work_orders" => format!("/api/mes/work-orders/{}", id),
            _ => format!("/api/{}/{}/{}", service, entity_type, id),
        };

        let url = format!("{}{}", base_url, path);
        let data = match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!(
                            "Failed to parse federation entity JSON for {}/{}: {}",
                            service,
                            id,
                            e
                        );
                        serde_json::Value::Null
                    }
                }
            }
            _ => {
                serde_json::json!({"error": "entity not found", "service": service, "entity_type": entity_type, "id": id})
            }
        };

        Ok(FederatedEntityGql {
            service,
            entity_type,
            id,
            data,
        })
    }

    /// V37.0 Phase 7: 获取组合后的联邦 Schema SDL
    /// 返回 Portal BFF 作为联邦网关组合后的完整 GraphQL Schema，
    /// 包含所有 @key 实体、查询、变更和订阅定义。
    async fn federation_sdl(&self, _ctx: &Context<'_>) -> async_graphql::Result<String> {
        Ok(compose_federation_sdl())
    }

    /// V37.0 Phase 7: 获取各服务的 SDL 片段
    /// 模拟 Apollo Federation v2 中每个服务暴露的 _service { sdl } 端点，
    /// 返回每个服务贡献给联邦的实体和字段定义。
    async fn federation_service_sdls(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FederationServiceSdlGql>> {
        let services = [
            ("erp", "http://localhost:8010"),
            ("crm", "http://localhost:8029"),
            ("hrm", "http://localhost:8020"),
            ("finance", "http://localhost:8011"),
            ("mes", "http://localhost:8030"),
        ];

        let futures = services.iter().map(|(name, url)| async move {
            let sdl = service_sdl_fragment(name);
            let healthy = check_service_health(url).await;
            FederationServiceSdlGql {
                service: (*name).to_string(),
                sdl,
                available: healthy,
            }
        });
        Ok(join_all(futures).await)
    }

    /// V37.0 Phase 7: 批量解析联邦实体（_entities）
    /// V38.0: 优化 - 按服务分组、错误处理、超时控制
    /// 接受一组实体表示（__typename + id），按服务分组后从各服务解析实体详情。
    async fn federation_entities(
        &self,
        _ctx: &Context<'_>,
        representations: Vec<serde_json::Value>,
    ) -> async_graphql::Result<Vec<FederationRepresentationGql>> {
        use std::collections::HashMap;

        let mut by_service: HashMap<String, Vec<(String, String, usize)>> = HashMap::new();
        let mut results: Vec<Option<FederationRepresentationGql>> =
            vec![None; representations.len()];

        for (idx, rep) in representations.iter().enumerate() {
            let typename = rep
                .get("__typename")
                .and_then(|t| t.as_str())
                .unwrap_or("Unknown");
            let id = rep.get("id").and_then(|i| i.as_str()).unwrap_or("");
            let service = service_for_typename(typename);
            by_service.entry(service.to_string()).or_default().push((
                typename.to_string(),
                id.to_string(),
                idx,
            ));
        }

        let futures = by_service.into_values().map(|items| async move {
            let mut local_results = Vec::new();
            for (typename, id, idx) in items {
                let entity = tokio::time::timeout(
                    std::time::Duration::from_secs(5),
                    resolve_federated_entity(&typename, &id),
                )
                .await
                .unwrap_or_else(|_| {
                    serde_json::json!({
                        "error": "timeout",
                        "__typename": typename,
                        "id": id,
                        "message": "Entity resolution timed out after 5 seconds"
                    })
                });
                local_results.push((
                    idx,
                    FederationRepresentationGql {
                        __typename: typename,
                        entity,
                    },
                ));
            }
            local_results
        });

        let all_results = join_all(futures).await;
        for batch in all_results {
            for (idx, rep) in batch {
                results[idx] = Some(rep);
            }
        }

        Ok(results.into_iter().flatten().collect())
    }

    /// V38.0: 批量获取同类型实体列表
    /// 接受 service + entity_type + ids 数组参数，批量获取多个同类型实体
    async fn federation_entity_list(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        ids: Vec<String>,
    ) -> async_graphql::Result<Vec<FederatedEntityGql>> {
        let base_url = service_url(&service);
        let path = match (service.as_str(), entity_type.as_str()) {
            ("erp", "customers") => "/api/erp/customers/batch",
            ("erp", "suppliers") => "/api/erp/suppliers/batch",
            ("erp", "materials") => "/api/erp/materials/batch",
            ("crm", "contacts") => "/api/crm/contacts/batch",
            ("crm", "leads") => "/api/crm/leads/batch",
            ("hrm", "employees") => "/api/hrm/employees/batch",
            ("hrm", "departments") => "/api/hrm/departments/batch",
            ("finance", "accounts") => "/api/finance/accounts/batch",
            ("finance", "vouchers") => "/api/finance/vouchers/batch",
            ("finance", "expenses") => "/api/finance/expenses/batch",
            ("mes", "work-orders") => "/api/mes/work-orders/batch",
            _ => {
                let mut results = Vec::new();
                for id in &ids {
                    results.push(FederatedEntityGql {
                        service: service.clone(),
                        entity_type: entity_type.clone(),
                        id: id.clone(),
                        data: serde_json::json!({"error": "unsupported entity type", "service": service, "entity_type": entity_type}),
                    });
                }
                return Ok(results);
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = shared_http_client();

        match tokio::time::timeout(
            std::time::Duration::from_secs(5),
            client
                .post(&url)
                .json(&serde_json::json!({ "ids": ids }))
                .with_trace()
                .send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => {
                        let data_list = json
                            .get("data")
                            .and_then(|d| d.as_array())
                            .unwrap_or(&Vec::new())
                            .clone();
                        let mut results = Vec::new();
                        for item in data_list {
                            let id = item
                                .get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            results.push(FederatedEntityGql {
                                service: service.clone(),
                                entity_type: entity_type.clone(),
                                id,
                                data: item,
                            });
                        }
                        if results.is_empty() {
                            for id in &ids {
                                results.push(FederatedEntityGql {
                                    service: service.clone(),
                                    entity_type: entity_type.clone(),
                                    id: id.clone(),
                                    data: serde_json::json!({"error": "entity not found", "id": id}),
                                });
                            }
                        }
                        Ok(results)
                    }
                    Err(_) => {
                        let mut results = Vec::new();
                        for id in &ids {
                            results.push(FederatedEntityGql {
                                service: service.clone(),
                                entity_type: entity_type.clone(),
                                id: id.clone(),
                                data: serde_json::json!({"error": "failed to parse response"}),
                            });
                        }
                        Ok(results)
                    }
                }
            }
            _ => {
                let service_clone = service.clone();
                let entity_type_clone = entity_type.clone();
                let base_url_clone = base_url.to_string();
                let futures = ids.iter().map(move |id| {
                    let service = service_clone.clone();
                    let entity_type = entity_type_clone.clone();
                    let base_url = base_url_clone.clone();
                    let id = id.clone();
                    async move {
                        let single_path = match entity_type.as_str() {
                            "customers" => format!("/api/erp/customers/{}", id),
                            "suppliers" => format!("/api/erp/suppliers/{}", id),
                            "materials" => format!("/api/erp/materials/{}", id),
                            "contacts" => format!("/api/crm/contacts/{}", id),
                            "leads" => format!("/api/crm/leads/{}", id),
                            "employees" => format!("/api/hrm/employees/{}", id),
                            "departments" => format!("/api/hrm/departments/{}", id),
                            "accounts" => format!("/api/finance/accounts/{}", id),
                            "vouchers" => format!("/api/finance/vouchers/{}", id),
                            "expenses" => format!("/api/finance/expenses/{}", id),
                            "work-orders" => format!("/api/mes/work-orders/{}", id),
                            _ => format!("/api/{}/{}/{}", service, entity_type, id),
                        };
                        let single_url = format!("{}{}", base_url, single_path);
                        let data = match shared_http_client().get(&single_url).with_trace().send().await {
                            Ok(resp) if resp.status().is_success() => {
                                resp.json::<serde_json::Value>().await.unwrap_or(serde_json::json!({"error": "parse error"}))
                            }
                            _ => serde_json::json!({"error": "entity not found", "service": service, "entity_type": entity_type, "id": id}),
                        };
                        FederatedEntityGql {
                            service: service.clone(),
                            entity_type: entity_type.clone(),
                            id,
                            data,
                        }
                    }
                });
                Ok(join_all(futures).await)
            }
        }
    }

    /// V37.0 Phase 7: 按 ID 获取 Customer 联邦实体
    async fn customer_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<CustomerEntityGql>> {
        let url = format!("http://localhost:8010/api/erp/customers/{}", id);
        match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse customer_entity {} JSON: {}", id, e);
                        serde_json::Value::Null
                    }
                };
                let data = json.get("data").unwrap_or(&json);
                Ok(Some(CustomerEntityGql {
                    id: data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&id)
                        .to_string(),
                    name: data
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    code: data
                        .get("code")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    status: data
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("active")
                        .to_string(),
                    phone: data
                        .get("phone")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    industry: data
                        .get("industry")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    contact_person: data
                        .get("contact_person")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                }))
            }
            _ => Ok(None),
        }
    }

    /// V37.0 Phase 7: 按 ID 获取 Employee 联邦实体
    async fn employee_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<EmployeeEntityGql>> {
        let url = format!("http://localhost:8020/api/hrm/employees/{}", id);
        match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse employee_entity {} JSON: {}", id, e);
                        serde_json::Value::Null
                    }
                };
                let data = json.get("data").unwrap_or(&json);
                Ok(Some(EmployeeEntityGql {
                    id: data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&id)
                        .to_string(),
                    name: data
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    department: data
                        .get("department_name")
                        .and_then(|v| v.as_str())
                        .or_else(|| data.get("department").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    position: data
                        .get("position_name")
                        .and_then(|v| v.as_str())
                        .or_else(|| data.get("position").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    email: data
                        .get("email")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    phone: data
                        .get("phone")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    status: data
                        .get("status")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                }))
            }
            _ => Ok(None),
        }
    }

    /// V37.0 Phase 7: 按 ID 获取 Voucher 联邦实体
    async fn voucher_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<VoucherEntityGql>> {
        let url = format!("http://localhost:8011/api/finance/vouchers/{}", id);
        match shared_http_client().get(&url).with_trace().send().await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse voucher_entity {} JSON: {}", id, e);
                        serde_json::Value::Null
                    }
                };
                let data = json.get("data").unwrap_or(&json);
                Ok(Some(VoucherEntityGql {
                    id: data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&id)
                        .to_string(),
                    voucher_number: data
                        .get("voucher_number")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    total_debit: data
                        .get("total_debit")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    total_credit: data
                        .get("total_credit")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    status: data
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("draft")
                        .to_string(),
                    voucher_date: data
                        .get("voucher_date")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    created_by: data
                        .get("created_by")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                }))
            }
            _ => Ok(None),
        }
    }

    /// V38.0: 查询当前活跃订阅数
    async fn subscription_count(&self, _ctx: &Context<'_>) -> async_graphql::Result<i32> {
        Ok(get_active_subscriptions() as i32)
    }

    /// V40.0: 获取实体关系图
    /// 返回所有联邦实体及其关系的可视化数据
    async fn entity_relationship_graph(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<EntityRelationshipGraphGql> {
        let entities = vec![
            "CustomerEntity".to_string(),
            "SupplierEntity".to_string(),
            "MaterialEntity".to_string(),
            "EmployeeEntity".to_string(),
            "VoucherEntity".to_string(),
            "ContactEntity".to_string(),
            "OrderEntity".to_string(),
            "AccountSubjectEntity".to_string(),
            "DepartmentEntity".to_string(),
        ];

        let relations = vec![
            EntityRelationGql {
                from_type: "CustomerEntity".to_string(),
                to_type: "OrderEntity".to_string(),
                relation_type: "one-to-many".to_string(),
                from_field: "orders".to_string(),
                to_field: "customer_id".to_string(),
                service: "erp".to_string(),
            },
            EntityRelationGql {
                from_type: "CustomerEntity".to_string(),
                to_type: "ContactEntity".to_string(),
                relation_type: "one-to-many".to_string(),
                from_field: "contacts".to_string(),
                to_field: "customer_id".to_string(),
                service: "crm".to_string(),
            },
            EntityRelationGql {
                from_type: "VoucherEntity".to_string(),
                to_type: "AccountSubjectEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "account_subject".to_string(),
                to_field: "id".to_string(),
                service: "finance".to_string(),
            },
            EntityRelationGql {
                from_type: "EmployeeEntity".to_string(),
                to_type: "DepartmentEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "department_info".to_string(),
                to_field: "name".to_string(),
                service: "hrm".to_string(),
            },
            EntityRelationGql {
                from_type: "ContactEntity".to_string(),
                to_type: "CustomerEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "customer_id".to_string(),
                to_field: "id".to_string(),
                service: "crm".to_string(),
            },
            EntityRelationGql {
                from_type: "OrderEntity".to_string(),
                to_type: "CustomerEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "customer_id".to_string(),
                to_field: "id".to_string(),
                service: "erp".to_string(),
            },
        ];

        Ok(EntityRelationshipGraphGql {
            entities,
            relations,
        })
    }

    /// V40.0: 获取联邦网关性能统计
    async fn federation_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationStatsGql> {
        Ok(get_federation_stats())
    }

    /// V40.0: 优化后的批量实体列表查询（带缓存层）
    async fn federation_entity_list_cached(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        ids: Vec<String>,
    ) -> async_graphql::Result<Vec<FederatedEntityGql>> {
        record_federation_request();
        let results = batch_resolve_entities(&service, &entity_type, &ids).await;
        Ok(results
            .into_iter()
            .map(|(id, data)| FederatedEntityGql {
                service: service.clone(),
                entity_type: entity_type.clone(),
                id,
                data,
            })
            .collect())
    }

    /// V41.0: 获取缓存统计信息
    async fn cache_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<CacheStatsV41Gql> {
        Ok(get_cache_stats())
    }

    /// V41.0: 获取缓存优化建议
    async fn cache_optimization_suggestions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CacheOptimizationSuggestionGql>> {
        Ok(get_cache_optimization_suggestions())
    }

    /// V41.0: 获取查询预取规则
    async fn prefetch_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<QueryPrefetchRuleGql>> {
        Ok(prefetch_rules().clone())
    }

    /// V41.0: 获取缓存失效规则
    async fn cache_invalidation_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CacheInvalidationRuleGql>> {
        Ok(cache_invalidation_rules().clone())
    }

    /// V41.0 Track E: 获取发现的查询列表
    async fn discovered_queries(
        &self,
        _ctx: &Context<'_>,
        status: Option<String>,
    ) -> async_graphql::Result<Vec<DiscoveredQueryGql>> {
        let status_enum = status.as_deref().and_then(|s| match s {
            "new" => Some(DiscoveryStatus::New),
            "under_review" => Some(DiscoveryStatus::UnderReview),
            "approved" => Some(DiscoveryStatus::Approved),
            "rejected" => Some(DiscoveryStatus::Rejected),
            _ => None,
        });
        Ok(get_discovered_queries(status_enum))
    }

    /// V41.0 Track E: 获取自动审批策略
    async fn auto_approval_policy(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AutoApprovalPolicyGql> {
        Ok(get_auto_approval_policy())
    }

    /// V41.0 Track E: 获取安全审计报表
    async fn security_audit_report(
        &self,
        _ctx: &Context<'_>,
        period: String,
    ) -> async_graphql::Result<SecurityAuditReportGql> {
        Ok(generate_security_report(&period))
    }

    /// V41.0 Track E: 获取性能调优建议
    async fn performance_tuning_suggestions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<PerformanceTuningSuggestionGql>> {
        Ok(get_performance_tuning_suggestions())
    }

    /// V41.0 Track E: 获取完整性能分析
    async fn performance_analysis(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<PerformanceAnalysisGql> {
        Ok(get_performance_analysis())
    }

    /// V41.0 Track E: 获取白名单健康度
    async fn white_list_health(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<WhitelistHealthGql> {
        Ok(get_whitelist_health())
    }

    /// V42.0 Track E: 获取字段权限规则（可按 entity_type 过滤）
    async fn field_permissions(
        &self,
        _ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<FieldPermission>> {
        Ok(get_field_permissions(entity_type.as_deref()))
    }

    /// V42.0 Track E: 获取掩码规则（可按 entity_type 过滤）
    async fn masking_rules(
        &self,
        _ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<MaskingRule>> {
        Ok(get_masking_rules(entity_type.as_deref()))
    }

    /// V42.0 Track E: 获取字段访问审计（按时间倒序，可按 entity_type 过滤）
    async fn field_access_audits(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<FieldAccessAudit>> {
        let limit = limit.unwrap_or(100).max(0) as usize;
        Ok(get_field_access_audits(limit, entity_type.as_deref()))
    }

    /// V42.0 Track E: 获取数据变更审计（按时间倒序，可按 entity_type 过滤）
    async fn data_change_audits(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<DataChangeAudit>> {
        let limit = limit.unwrap_or(100).max(0) as usize;
        Ok(get_data_change_audits(limit, entity_type.as_deref()))
    }

    /// V42.0 Track E: 获取安全配置
    async fn security_config(&self, _ctx: &Context<'_>) -> async_graphql::Result<SecurityConfig> {
        Ok(get_security_config())
    }

    /// V42.0 Track B: 获取联邦查询计划（不执行）
    /// 解析查询字符串，生成执行计划（步骤 + 并行组 + 估算成本）
    async fn federation_v2_plan(
        &self,
        _ctx: &Context<'_>,
        query: String,
        variables: String,
    ) -> async_graphql::Result<FederationQueryPlanGql> {
        record_federation_v2_request();
        let vars = serde_json::from_str(&variables).unwrap_or(serde_json::Value::Null);
        let plan_start = std::time::Instant::now();
        let plan = plan_federation_query(&query, &vars);
        let plan_duration = plan_start.elapsed().as_millis() as u64;
        record_federation_v2_plan_time(plan_duration);
        cache_federation_v2_plan(&plan.query_hash, &plan);
        Ok(plan.to_gql())
    }

    /// V42.0 Track B: 执行联邦查询（计划 → 并发执行 → 合并结果）
    async fn federation_v2_execute(
        &self,
        _ctx: &Context<'_>,
        query: String,
        variables: String,
    ) -> async_graphql::Result<serde_json::Value> {
        record_federation_v2_request();
        let vars = serde_json::from_str(&variables).unwrap_or(serde_json::Value::Null);
        let query_hash = federation_v2_query_hash(&query);
        let plan_start = std::time::Instant::now();
        let plan = match get_cached_federation_v2_plan(&query_hash) {
            Some(p) => {
                record_federation_v2_plan_cache_hit();
                p
            }
            None => {
                let p = plan_federation_query(&query, &vars);
                cache_federation_v2_plan(&query_hash, &p);
                record_federation_v2_plan_cache_miss();
                p
            }
        };
        let plan_duration = plan_start.elapsed().as_millis() as u64;
        record_federation_v2_plan_time(plan_duration);
        let exec_start = std::time::Instant::now();
        let result = execute_federation_plan(&plan).await;
        let exec_duration = exec_start.elapsed().as_millis() as u64;
        record_federation_v2_execute_time(exec_duration);
        Ok(result.unwrap_or_else(|e| serde_json::json!({"error": e})))
    }

    /// V42.0 Track B: 联邦 V2 统计
    async fn federation_v2_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationV2StatsGql> {
        Ok(get_federation_v2_stats())
    }

    /// V42.0 Track B: 已注册的服务列表
    async fn registered_services(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceMetadata>> {
        Ok(list_services())
    }

    /// V42.0 Track B: 实体元数据
    async fn entity_metadata(
        &self,
        _ctx: &Context<'_>,
        entity_name: String,
    ) -> async_graphql::Result<Option<EntityMetadata>> {
        Ok(get_entity_metadata(&entity_name))
    }

    /// V42.0 Track B: 自动组合的联邦 SDL
    async fn federation_v2_sdl(&self, _ctx: &Context<'_>) -> async_graphql::Result<String> {
        Ok(compose_federation_sdl_v2())
    }

    /// V43.0 Track B: 获取所有订阅会话
    async fn subscription_sessions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubscriptionSessionGql>> {
        let sessions = list_sessions();
        Ok(sessions.into_iter().map(|s| s.into()).collect())
    }

    /// V43.0 Track B: 获取订阅统计信息
    async fn subscription_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<SubscriptionStatsGql> {
        Ok(get_subscription_stats().into())
    }

    /// V43.0 Track B: 获取所有活跃订阅
    async fn active_subscriptions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubscriptionInfoGql>> {
        let sessions = list_sessions();
        let mut subs = Vec::new();
        for session in sessions {
            for sub in session.subscriptions.values() {
                subs.push(sub.clone().into());
            }
        }
        Ok(subs)
    }

    /// V43.0 Track E: 获取查询优化建议
    async fn query_optimization_suggestions(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<Vec<QueryOptimizationSuggestionGql>> {
        if let Some(hash) = query_hash {
            Ok(get_query_optimization_suggestions(&hash))
        } else {
            Ok(get_all_optimization_suggestions())
        }
    }

    /// V43.0 Track E: 获取查询健康度评分
    async fn query_health_score(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<Option<QueryHealthScoreGql>> {
        Ok(get_query_health_score(&query_hash))
    }

    /// V43.0 Track E: 获取优化路线图
    async fn optimization_roadmap(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<OptimizationRoadmapGql> {
        Ok(generate_optimization_roadmap())
    }

    /// V43.0 Track E: 自然语言转 GraphQL（中英文）
    async fn nl2graphql(
        &self,
        _ctx: &Context<'_>,
        natural_language: String,
    ) -> async_graphql::Result<Nl2GraphqlResultGql> {
        let result = Nl2GraphqlParser::parse(&natural_language);
        record_nl2graphql_query(result.confidence);
        Ok(result)
    }

    /// V43.0 Track E: 获取智能缓存推荐
    async fn cache_recommendations(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<CacheRecommendationReportGql> {
        Ok(get_cache_recommendations())
    }

    /// V43.0 Track E: 获取 AI 优化统计总览
    async fn ai_optimization_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AiOptimizationStatsGql> {
        Ok(get_ai_optimization_stats())
    }

    /// V44.0 Track B: 生成 V3 联邦查询计划
    async fn federation_v3_plan(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<FederationV3PlanGql> {
        let vars = serde_json::Value::Null;
        let plan_start = std::time::Instant::now();
        let plan = FederationV3Planner::build_plan_v3(&query, &vars);
        let plan_duration = plan_start.elapsed().as_millis() as u64;
        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        stats.plan_count += 1;
        stats.total_plan_time_ms += plan_duration;
        let mut plan_cache = federation_v3_plan_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        plan_cache.put(plan.query_hash.clone(), plan.clone());
        Ok(plan_to_gql(&plan))
    }

    /// V44.0 Track B: 执行 V3 联邦查询
    async fn federation_v3_execute(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<serde_json::Value> {
        let vars = serde_json::Value::Null;
        let vars_hash = v3_variables_hash(&vars);
        let query_hash = {
            let mut hasher = Sha256::new();
            hasher.update(query.as_bytes());
            format!("{:x}", hasher.finalize())
        };

        if let Some(cached) = FederatedCacheManager::get_query_cache(&query_hash, &vars_hash) {
            return Ok(cached);
        }

        let plan = {
            let mut plan_cache = federation_v3_plan_cache()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            match plan_cache.get(&query_hash) {
                Some(p) => p.clone(),
                None => {
                    let plan = FederationV3Planner::build_plan_v3(&query, &vars);
                    plan_cache.put(query_hash.clone(), plan.clone());
                    plan
                }
            }
        };

        let result = FederationV3Executor::execute_plan_v3(&plan)
            .await
            .unwrap_or_else(|e| serde_json::json!({"error": e}));

        let services: Vec<String> = plan
            .nodes
            .iter()
            .filter_map(|n| n.service.clone())
            .collect();
        FederatedCacheManager::set_query_cache(
            &query_hash,
            &vars_hash,
            result.clone(),
            services,
            60000,
        );

        Ok(result)
    }

    /// V44.0 Track B: V3 网关统计
    async fn federation_v3_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationV3StatsGql> {
        Ok(get_federation_v3_stats())
    }

    /// V44.0 Track B: 执行轨迹列表
    async fn federation_v3_traces(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<PlanExecutionTraceGql>> {
        Ok(get_v3_traces(limit.unwrap_or(20) as usize))
    }

    /// V44.0 Track B: 熔断器状态
    async fn federation_circuit_breakers(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CircuitBreakerStateGqlSimple>> {
        Ok(get_all_circuit_breakers())
    }

    /// V44.0 Track B: 缓存统计
    async fn federation_cache_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationCacheStatsGql> {
        Ok(get_v3_cache_stats())
    }

    /// V44.0 Track E: 查询追踪列表
    async fn graphql_traces(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
        operation_name: Option<String>,
        status: Option<String>,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<QueryTraceGql>> {
        Ok(list_traces(query_hash, operation_name, status, limit))
    }

    /// V44.0 Track E: 追踪详情
    async fn graphql_trace(
        &self,
        _ctx: &Context<'_>,
        trace_id: String,
    ) -> async_graphql::Result<Option<QueryTraceGql>> {
        Ok(get_trace(&trace_id))
    }

    /// V44.0 Track E: 实时指标
    async fn graphql_metrics(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<GraphqlMetricsGql> {
        Ok(get_metrics(window.unwrap_or(MetricsWindow::FiveMinutes)))
    }

    /// V44.0 Track E: 告警列表
    async fn graphql_alerts(
        &self,
        _ctx: &Context<'_>,
        status: Option<String>,
        level: Option<AlertLevel>,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<GraphqlAlertGql>> {
        Ok(get_alerts(status, level, limit))
    }

    /// V44.0 Track E: 告警规则列表
    async fn graphql_alert_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<AlertRuleGql>> {
        Ok(get_alert_rules())
    }

    /// V44.0 Track E: 监控仪表盘总览
    async fn monitoring_dashboard(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<MonitoringDashboardStatsGql> {
        Ok(get_monitoring_dashboard())
    }

    /// V44.0 Track E: 慢查询 Top N
    async fn top_slow_queries(
        &self,
        _ctx: &Context<'_>,
        limit: Option<usize>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<Vec<TopSlowQueryGql>> {
        Ok(get_top_slow_queries(
            limit,
            window.unwrap_or(MetricsWindow::FifteenMinutes),
        ))
    }

    /// V44.0 Track E: 错误率趋势
    async fn error_rate_trend(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
        interval: Option<i64>,
    ) -> async_graphql::Result<ErrorRateTrendGql> {
        Ok(get_error_rate_trend(
            window.unwrap_or(MetricsWindow::OneHour),
            interval,
        ))
    }

    /// V44.0 Track E: 查询延迟分布
    async fn query_latency_distribution(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<QueryLatencyDistributionGql> {
        Ok(get_query_latency_distribution(
            window.unwrap_or(MetricsWindow::FifteenMinutes),
        ))
    }

    // ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================

    /// V45.0: 边缘节点列表
    async fn edge_nodes(&self, _ctx: &Context<'_>) -> async_graphql::Result<Vec<EdgeNodeGql>> {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(state
            .nodes
            .iter()
            .map(|n| EdgeNodeGql {
                id: n.id.clone(),
                region: n.region.clone(),
                location: n.location.clone(),
                latency_ms: n.latency_ms,
                health: n.health,
                capacity: n.capacity,
                current_load: n.current_load,
                functions_deployed: n.functions_deployed,
            })
            .collect())
    }

    /// V45.0: 边缘函数列表
    async fn edge_functions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<EdgeFunctionGql>> {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(state
            .functions
            .iter()
            .map(|f| EdgeFunctionGql {
                id: f.id.clone(),
                name: f.name.clone(),
                handler: f.handler.clone(),
                route_pattern: f.route_pattern.clone(),
                cache_ttl_ms: f.cache_ttl_ms,
                deployed_to_regions: f.deployed_to_regions.clone(),
                version: f.version.clone(),
                enabled: f.enabled,
            })
            .collect())
    }

    /// V45.0: 边缘计算统计
    async fn edge_compute_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<EdgeComputeStatsGql> {
        Ok(EdgeComputeManager::get_stats())
    }

    /// V45.0: CDN 缓存统计
    async fn cdn_cache_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<CdnStatsGql> {
        Ok(CdnCacheManager::get_stats())
    }

    /// V45.0: CDN 缓存条目列表（可按标签过滤）
    async fn cdn_cache_entries(
        &self,
        _ctx: &Context<'_>,
        tags: Option<Vec<String>>,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<CdnCacheEntryGql>> {
        let tags_ref = tags.as_deref();
        Ok(CdnCacheManager::get_entries(
            tags_ref,
            limit.unwrap_or(50) as usize,
        ))
    }

    /// V45.0: 流式响应统计
    async fn stream_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<StreamStatsGql> {
        Ok(StreamingResponseManager::get_stats())
    }

    /// V45.0: 流式配置
    async fn stream_config(&self, _ctx: &Context<'_>) -> async_graphql::Result<StreamConfigGql> {
        Ok(StreamingResponseManager::get_config())
    }

    /// V45.0: 延迟字段列表（可按 query_hash 过滤）
    async fn deferred_fields(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<Vec<DeferredFieldGql>> {
        Ok(StreamingResponseManager::get_deferred_fields(
            query_hash.as_deref(),
        ))
    }

    // ==================== V45.0 Track E: GraphQL 企业级治理 ====================

    /// V45.0: Schema 注册表（返回指定服务的所有已注册版本）
    async fn schema_registry(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<SchemaRegistryEntryGql>> {
        let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        Ok(registry.list_versions(&service))
    }

    /// V45.0: 版本列表（Schema 版本管理器中的版本列表）
    async fn schema_versions(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<SchemaVersionGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.list_versions(&service))
    }

    /// V45.0: 版本详情
    async fn schema_version_detail(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<Option<SchemaVersionGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.get_version(&service, &version))
    }

    /// V45.0: 版本差异
    async fn schema_diff(
        &self,
        _ctx: &Context<'_>,
        service: String,
        from_version: String,
        to_version: String,
    ) -> async_graphql::Result<Option<VersionDiffGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.diff(&service, &from_version, &to_version))
    }

    /// V45.0: 契约测试列表（service 为空时返回全部）
    async fn contract_tests(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<ContractTestGql>> {
        let runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner
            .tests
            .values()
            .filter(|t| service.is_empty() || t.service == service)
            .cloned()
            .collect())
    }

    /// V45.0: 测试结果（按 test_id 查询历史结果，limit 控制条数）
    async fn contract_test_results(
        &self,
        _ctx: &Context<'_>,
        test_id: String,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<ContractTestResultGql>> {
        let runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.get_results(&test_id, limit.unwrap_or(50)))
    }

    /// V45.0: Breaking Change 检测（对比两个版本之间的 Breaking Change）
    async fn breaking_changes(
        &self,
        _ctx: &Context<'_>,
        service: String,
        from_version: String,
        to_version: String,
    ) -> async_graphql::Result<Vec<SchemaChangeGql>> {
        let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        if let Some(diff) = registry.diff_versions(&service, &from_version, &to_version) {
            Ok(diff.breaking_changes)
        } else {
            Ok(vec![])
        }
    }

    /// V45.0: 治理统计
    async fn schema_governance_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<SchemaGovernanceStatsGql> {
        Ok(get_schema_governance_stats())
    }

    /// V45.0: 各服务治理信息
    async fn service_governance_info(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceGovernanceInfoGql>> {
        Ok(get_service_governance_info())
    }

    // ==================== V49.0: 自适应限流 + 熔断降级 + 负载感知路由 ====================

    /// V49.0: 获取所有服务的限流器状态
    async fn rate_limiter_status(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<RateLimiterStatusGql>> {
        Ok(get_rate_limiter_statuses())
    }

    /// V49.0: 获取所有服务的限流器配置
    async fn rate_limiter_configs(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<RateLimiterConfigGql>> {
        Ok(get_rate_limiter_configs())
    }

    /// V49.0: 获取所有服务的熔断器状态
    async fn circuit_breaker_states(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CircuitBreakerStateGql>> {
        Ok(get_circuit_breaker_states())
    }

    /// V49.0: 获取所有服务的降级配置
    async fn degradation_configs(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceDegradationConfigGql>> {
        Ok(get_degradation_configs())
    }

    /// V49.0: 获取服务负载指标（可按服务过滤）
    async fn load_metrics(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<LoadMetricsGql>> {
        if let Some(svc) = service {
            Ok(get_load_metrics(&svc))
        } else {
            Ok(get_all_load_metrics())
        }
    }

    /// V49.0: 获取实例健康状态（可按服务过滤）
    async fn instance_health(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<InstanceHealthGql>> {
        if let Some(svc) = service {
            Ok(get_instance_healths(&svc))
        } else {
            Ok(get_all_instance_healths())
        }
    }

    /// V49.0: 对指定服务做出路由决策
    async fn routing_decision(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<RoutingDecisionGql> {
        Ok(make_routing_decision(&service))
    }

    /// V49.0: 获取路由统计
    async fn routing_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AdaptiveRoutingStatsGql> {
        Ok(get_routing_stats())
    }

    /// V49.0: 获取路由规则（可按服务过滤）
    async fn routing_rules(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<RoutingRuleGql>> {
        Ok(get_routing_rules(service.as_deref()))
    }

    /// V49.0: 获取服务流量策略
    async fn traffic_policy(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<TrafficPolicyGql> {
        Ok(get_traffic_policy(&service))
    }
}

// ==================== Mutation 根类型（V34.0 Phase 4） ====================

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// 创建待办事项
    async fn create_todo(
        &self,
        ctx: &Context<'_>,
        title: String,
        user_id: Option<String>,
    ) -> async_graphql::Result<UnifiedTodoGql> {
        let state = ctx.data::<AppState>()?;
        let uid = user_id.unwrap_or_else(|| "system".to_string());

        let row = sqlx::query(
            r#"INSERT INTO portal.portal_todos
               (user_id, title, service_code, service_name, priority, todo_type)
               VALUES ($1, $2, 'portal', '门户中心', 'medium', 'personal')
               RETURNING id, title, created_at"#,
        )
        .bind(&uid)
        .bind(&title)
        .fetch_one(&state.pool)
        .await
        .map_err(|e| async_graphql::Error::new(format!("创建待办失败: {}", e)))?;

        use sqlx::Row;
        let id: uuid::Uuid = row.try_get("id")?;
        let title: String = row.try_get("title")?;
        let created_at: chrono::DateTime<chrono::Utc> = row
            .try_get("created_at")
            .unwrap_or_else(|_| chrono::Utc::now());

        Ok(UnifiedTodoGql {
            id: id.to_string(),
            title,
            source: "portal".into(),
            priority: 0,
            status: "pending".into(),
            created_at: created_at.to_rfc3339(),
        })
    }

    /// 完成待办事项
    async fn complete_todo(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        let state = ctx.data::<AppState>()?;
        let uuid = uuid::Uuid::parse_str(&id)
            .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;

        let result = sqlx::query(
            r#"UPDATE portal.portal_todos
               SET completed = TRUE, completed_at = NOW(), updated_at = NOW()
               WHERE id = $1 AND deleted_at IS NULL"#,
        )
        .bind(uuid)
        .execute(&state.pool)
        .await
        .map_err(|e| async_graphql::Error::new(format!("更新待办失败: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    /// 删除待办事项（软删除）
    async fn delete_todo(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        let state = ctx.data::<AppState>()?;
        let uuid = uuid::Uuid::parse_str(&id)
            .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;

        let result = sqlx::query(
            r#"UPDATE portal.portal_todos
               SET deleted_at = NOW(), updated_at = NOW()
               WHERE id = $1 AND deleted_at IS NULL"#,
        )
        .bind(uuid)
        .execute(&state.pool)
        .await
        .map_err(|e| async_graphql::Error::new(format!("删除待办失败: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    /// V38.0: 创建实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST POST 端点
    async fn create_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        data: serde_json::Value,
    ) -> async_graphql::Result<serde_json::Value> {
        let base_url = service_url(&service);
        let path = match (service.as_str(), entity_type.as_str()) {
            ("erp", "customers") => "/api/erp/customers",
            ("erp", "suppliers") => "/api/erp/suppliers",
            ("erp", "materials") => "/api/erp/materials",
            ("crm", "contacts") => "/api/crm/contacts",
            ("crm", "leads") => "/api/crm/leads",
            ("hrm", "employees") => "/api/hrm/employees",
            ("hrm", "departments") => "/api/hrm/departments",
            ("finance", "accounts") => "/api/finance/accounts",
            ("finance", "vouchers") => "/api/finance/vouchers",
            ("finance", "expenses") => "/api/finance/expenses",
            ("mes", "work-orders") => "/api/mes/work-orders",
            _ => {
                return Err(async_graphql::Error::new(format!(
                    "不支持的服务或实体类型: {}/{}",
                    service, entity_type
                )))
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = shared_http_client();

        match tokio::time::timeout(
            std::time::Duration::from_secs(10),
            client.post(&url).json(&data).with_trace().send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => {
                let result: serde_json::Value = resp
                    .json()
                    .await
                    .unwrap_or(serde_json::json!({"success": true}));
                Ok(result)
            }
            Ok(Ok(resp)) => {
                let status = resp.status();
                let error_body = resp.text().await.unwrap_or_default();
                Err(async_graphql::Error::new(format!(
                    "创建实体失败 ({}): {}",
                    status, error_body
                )))
            }
            Ok(Err(e)) => Err(async_graphql::Error::new(format!("HTTP 请求失败: {}", e))),
            Err(_) => Err(async_graphql::Error::new("创建实体超时")),
        }
    }

    /// V38.0: 更新实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST PUT 端点
    async fn update_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
        data: serde_json::Value,
    ) -> async_graphql::Result<serde_json::Value> {
        let base_url = service_url(&service);
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
            ("mes", "work-orders") => format!("/api/mes/work-orders/{}", id),
            _ => {
                return Err(async_graphql::Error::new(format!(
                    "不支持的服务或实体类型: {}/{}",
                    service, entity_type
                )))
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = shared_http_client();

        match tokio::time::timeout(
            std::time::Duration::from_secs(10),
            client.put(&url).json(&data).with_trace().send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => {
                let result: serde_json::Value = resp
                    .json()
                    .await
                    .unwrap_or(serde_json::json!({"success": true}));
                Ok(result)
            }
            Ok(Ok(resp)) => {
                let status = resp.status();
                let error_body = resp.text().await.unwrap_or_default();
                Err(async_graphql::Error::new(format!(
                    "更新实体失败 ({}): {}",
                    status, error_body
                )))
            }
            Ok(Err(e)) => Err(async_graphql::Error::new(format!("HTTP 请求失败: {}", e))),
            Err(_) => Err(async_graphql::Error::new("更新实体超时")),
        }
    }

    /// V38.0: 删除实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST DELETE 端点
    async fn delete_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
    ) -> async_graphql::Result<bool> {
        let base_url = service_url(&service);
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
            ("mes", "work-orders") => format!("/api/mes/work-orders/{}", id),
            _ => {
                return Err(async_graphql::Error::new(format!(
                    "不支持的服务或实体类型: {}/{}",
                    service, entity_type
                )))
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = shared_http_client();

        match tokio::time::timeout(
            std::time::Duration::from_secs(10),
            client.delete(&url).with_trace().send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => Ok(true),
            Ok(Ok(_)) => Ok(false),
            Ok(Err(_)) => Ok(false),
            Err(_) => Err(async_graphql::Error::new("删除实体超时")),
        }
    }

    // ==================== V39.0 Phase 9: 事件发布 Mutations ====================

    /// 发布主数据变更事件
    /// 其他服务通过此 mutation 发布主数据变更事件到事件总线。
    async fn publish_master_data_event(
        &self,
        ctx: &Context<'_>,
        domain: String,
        action: String,
        master_data_id: String,
        source_service: String,
    ) -> async_graphql::Result<MasterDataEventGql> {
        let event = MasterDataEventGql {
            domain: domain.clone(),
            action: action.clone(),
            master_data_id: master_data_id.clone(),
            source_service: source_service.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        // 发布到本地 EventBus
        global_event_bus().publish(
            SubscriptionChannel::MasterDataChanged,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        // 如果 Redis 可用，同时发布到 Redis（多实例广播）
        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::HealthCheck,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// 发布通知事件
    async fn publish_notification(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        title: String,
        content: String,
        notification_type: String,
    ) -> async_graphql::Result<NotificationEventGql> {
        let event = NotificationEventGql {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user_id.clone(),
            title: title.clone(),
            content: content.clone(),
            notification_type: notification_type.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        global_event_bus().publish(
            SubscriptionChannel::NotificationReceived,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::PortalNotificationPublished,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// 发布工作流任务事件
    async fn publish_workflow_task(
        &self,
        ctx: &Context<'_>,
        task_id: String,
        assignee_id: String,
        instance_title: String,
        priority: String,
        status: String,
    ) -> async_graphql::Result<WorkflowTaskEventGql> {
        let event = WorkflowTaskEventGql {
            task_id: task_id.clone(),
            assignee_id: assignee_id.clone(),
            instance_title: instance_title.clone(),
            priority: priority.clone(),
            status: status.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        global_event_bus().publish(
            SubscriptionChannel::WorkflowTaskAssigned,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::WorkflowStarted,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// 发布订单状态变更事件
    async fn publish_order_status(
        &self,
        ctx: &Context<'_>,
        order_id: String,
        order_type: String,
        old_status: String,
        new_status: String,
    ) -> async_graphql::Result<OrderStatusEventGql> {
        let event = OrderStatusEventGql {
            order_id: order_id.clone(),
            order_type: order_type.clone(),
            old_status: old_status.clone(),
            new_status: new_status.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        global_event_bus().publish(
            SubscriptionChannel::OrderStatusChanged,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::SalesOrderApproved,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// V41.0: 手动失效缓存（按模式匹配）
    async fn cache_invalidate(
        &self,
        _ctx: &Context<'_>,
        pattern: String,
    ) -> async_graphql::Result<bool> {
        let count = cache_invalidate_pattern(&pattern);
        tracing::debug!("[cache] 手动失效模式 '{}'，共 {} 条", pattern, count);
        Ok(true)
    }

    /// V41.0: 清空所有缓存
    async fn cache_clear(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        cache_clear_all();
        tracing::debug!("[cache] 所有缓存已清空");
        Ok(true)
    }

    /// V41.0: 触发查询预取
    async fn prefetch_trigger(
        &self,
        _ctx: &Context<'_>,
        query_name: String,
    ) -> async_graphql::Result<bool> {
        let triggered = trigger_prefetch(&query_name);
        Ok(triggered)
    }

    /// V41.0 Track E: 审批通过发现的查询
    async fn approve_discovered_query(
        &self,
        _ctx: &Context<'_>,
        hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(approve_discovered_query(&hash, Some("admin")))
    }

    /// V41.0 Track E: 拒绝发现的查询
    async fn reject_discovered_query(
        &self,
        _ctx: &Context<'_>,
        hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(reject_discovered_query(&hash, Some("admin")))
    }

    /// V41.0 Track E: 更新自动审批策略
    async fn update_auto_approval_policy(
        &self,
        _ctx: &Context<'_>,
        policy: AutoApprovalPolicyInput,
    ) -> async_graphql::Result<bool> {
        Ok(update_auto_approval_policy(policy))
    }

    /// V41.0 Track E: 手动触发自动审批扫描
    async fn run_auto_approval_scan(&self, _ctx: &Context<'_>) -> async_graphql::Result<i32> {
        Ok(run_auto_approval_scan() as i32)
    }

    /// V42.0 Track E: 设置字段权限（覆盖同 entity_type + field_name 的规则）
    async fn set_field_permission(
        &self,
        _ctx: &Context<'_>,
        permission: FieldPermissionInput,
    ) -> async_graphql::Result<FieldPermission> {
        let perm: FieldPermission = permission.into();
        set_field_permission(perm.clone());
        Ok(perm)
    }

    /// V42.0 Track E: 移除字段权限
    async fn remove_field_permission(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        field_name: String,
    ) -> async_graphql::Result<bool> {
        Ok(remove_field_permission(&entity_type, &field_name))
    }

    /// V42.0 Track E: 设置掩码规则（覆盖同 entity_type + field_name 的规则）
    async fn set_masking_rule(
        &self,
        _ctx: &Context<'_>,
        rule: MaskingRuleInput,
    ) -> async_graphql::Result<MaskingRule> {
        let r: MaskingRule = rule.into();
        set_masking_rule(r.clone());
        Ok(r)
    }

    /// V42.0 Track E: 移除掩码规则
    async fn remove_masking_rule(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        field_name: String,
    ) -> async_graphql::Result<bool> {
        Ok(remove_masking_rule(&entity_type, &field_name))
    }

    /// V42.0 Track E: 更新安全配置
    async fn update_security_config(
        &self,
        _ctx: &Context<'_>,
        config: SecurityConfigInput,
    ) -> async_graphql::Result<SecurityConfig> {
        let current = get_security_config();
        let new_config = SecurityConfig {
            field_permissions_enabled: config
                .field_permissions_enabled
                .unwrap_or(current.field_permissions_enabled),
            data_masking_enabled: config
                .data_masking_enabled
                .unwrap_or(current.data_masking_enabled),
            field_audit_enabled: config
                .field_audit_enabled
                .unwrap_or(current.field_audit_enabled),
            data_change_audit_enabled: config
                .data_change_audit_enabled
                .unwrap_or(current.data_change_audit_enabled),
            default_deny: config.default_deny.unwrap_or(current.default_deny),
            audit_sensitive_fields_only: config
                .audit_sensitive_fields_only
                .unwrap_or(current.audit_sensitive_fields_only),
        };
        Ok(update_security_config(new_config))
    }

    /// V43.0 Track B: 取消指定订阅
    async fn cancel_subscription(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        Ok(cancel_subscription_by_id(&id))
    }

    /// V43.0 Track B: 取消指定连接的所有订阅
    async fn cancel_all_subscriptions(
        &self,
        _ctx: &Context<'_>,
        connection_id: String,
    ) -> async_graphql::Result<u64> {
        Ok(cancel_all_subscriptions_by_connection(&connection_id))
    }

    /// V43.0 Track E: 应用查询优化建议
    async fn apply_optimization(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        suggestion_id: String,
    ) -> async_graphql::Result<bool> {
        Ok(apply_optimization_suggestion(&query_hash, &suggestion_id))
    }

    /// V43.0 Track E: 生成缓存推荐（返回推荐变更数）
    async fn generate_cache_recommendations(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<u32> {
        Ok(generate_cache_recommendations())
    }

    /// V43.0 Track E: 接受缓存推荐
    async fn accept_cache_recommendation(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(accept_cache_recommendation(&query_hash))
    }

    /// V44.0 Track B: 重置熔断器
    async fn federation_reset_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<bool> {
        Ok(reset_circuit_breaker(&service))
    }

    /// V44.0 Track B: 失效查询缓存
    async fn federation_cache_invalidate(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<bool> {
        if let Some(hash) = query_hash {
            Ok(FederatedCacheManager::invalidate_query_cache(&hash))
        } else {
            Ok(FederatedCacheManager::clear_all_cache())
        }
    }

    /// V44.0 Track B: 清除所有缓存
    async fn federation_cache_clear(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        Ok(FederatedCacheManager::clear_all_cache())
    }

    /// V44.0 Track B: 设置熔断器配置
    async fn federation_set_circuit_breaker_config(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: CircuitBreakerConfigInputGql,
    ) -> async_graphql::Result<bool> {
        Ok(set_circuit_breaker_config(&service, config))
    }

    /// V44.0 Track E: 添加告警规则
    async fn add_alert_rule(
        &self,
        _ctx: &Context<'_>,
        input: AlertRuleInput,
    ) -> async_graphql::Result<String> {
        Ok(add_alert_rule(input))
    }

    /// V44.0 Track E: 更新告警规则
    async fn update_alert_rule(
        &self,
        _ctx: &Context<'_>,
        id: String,
        input: AlertRuleInput,
    ) -> async_graphql::Result<bool> {
        Ok(update_alert_rule(&id, input))
    }

    /// V44.0 Track E: 删除告警规则
    async fn delete_alert_rule(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        Ok(delete_alert_rule(&id))
    }

    /// V44.0 Track E: 确认告警
    async fn acknowledge_alert(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        Ok(acknowledge_alert(&id))
    }

    /// V44.0 Track E: 解决告警
    async fn resolve_alert(&self, _ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        Ok(resolve_alert(&id))
    }

    /// V44.0 Track E: 测试告警
    async fn test_alert(
        &self,
        _ctx: &Context<'_>,
        alert_type: AlertType,
        level: AlertLevel,
    ) -> async_graphql::Result<String> {
        Ok(test_alert(alert_type, level))
    }

    /// V44.0 Track E: 重置指标
    async fn reset_graphql_metrics(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        reset_metrics();
        Ok(true)
    }

    // ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================

    /// V45.0: 部署边缘函数
    async fn deploy_edge_function(
        &self,
        _ctx: &Context<'_>,
        name: String,
        handler: String,
        route_pattern: String,
        cache_ttl_ms: i64,
    ) -> async_graphql::Result<String> {
        Ok(EdgeComputeManager::deploy_function(
            &name,
            &handler,
            &route_pattern,
            cache_ttl_ms,
        ))
    }

    /// V45.0: 在边缘节点执行函数
    async fn execute_at_edge(
        &self,
        _ctx: &Context<'_>,
        function_name: String,
        input: serde_json::Value,
        region: Option<String>,
    ) -> async_graphql::Result<serde_json::Value> {
        Ok(EdgeComputeManager::execute_at_edge(
            &function_name,
            &input,
            region.as_deref(),
        ))
    }

    /// V45.0: CDN 缓存预热
    async fn cdn_cache_warm(
        &self,
        _ctx: &Context<'_>,
        query_hashes: Vec<String>,
    ) -> async_graphql::Result<u32> {
        Ok(CdnCacheManager::warm_cache(&query_hashes))
    }

    /// V45.0: CDN 缓存预取
    async fn cdn_cache_prefetch(
        &self,
        _ctx: &Context<'_>,
        query_hashes: Vec<String>,
    ) -> async_graphql::Result<u32> {
        Ok(CdnCacheManager::prefetch(&query_hashes))
    }

    /// V45.0: 按标签失效 CDN 缓存
    async fn cdn_cache_invalidate_by_tag(
        &self,
        _ctx: &Context<'_>,
        tags: Vec<String>,
    ) -> async_graphql::Result<u32> {
        Ok(CdnCacheManager::invalidate_by_tag(&tags))
    }

    /// V45.0: 清空所有 CDN 缓存
    async fn cdn_cache_purge_all(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        Ok(CdnCacheManager::purge_all())
    }

    /// V45.0: 更新流式配置
    async fn update_stream_config(
        &self,
        _ctx: &Context<'_>,
        config: StreamConfigInput,
    ) -> async_graphql::Result<bool> {
        Ok(StreamingResponseManager::update_config(config))
    }

    // ==================== V45.0 Track E: GraphQL 企业级治理 ====================

    /// V45.0: 注册 Schema（同时发布到版本管理器）
    async fn register_schema(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
        sdl: String,
    ) -> async_graphql::Result<String> {
        let entry = {
            let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
            registry.register(&service, &version, &sdl, "user")
        };
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        manager.publish(&service, &version, "", &sdl);
        Ok(entry.version)
    }

    /// V45.0: 废弃 Schema 版本
    async fn deprecate_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        Ok(registry.deprecate(&service, &version))
    }

    /// V45.0: 退役 Schema 版本
    async fn retire_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        Ok(registry.retire(&service, &version))
    }

    /// V45.0: 添加契约测试
    async fn add_contract_test(
        &self,
        _ctx: &Context<'_>,
        input: ContractTestInput,
    ) -> async_graphql::Result<String> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.add_test(input))
    }

    /// V45.0: 更新契约测试
    async fn update_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
        input: ContractTestInput,
    ) -> async_graphql::Result<bool> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.update_test(&id, input))
    }

    /// V45.0: 删除契约测试
    async fn delete_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.remove_test(&id))
    }

    /// V45.0: 运行契约测试
    async fn run_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<ContractTestResultGql> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        runner
            .run_test(&id)
            .ok_or_else(|| async_graphql::Error::new(format!("Contract test '{}' not found", id)))
    }

    /// V45.0: 运行所有契约测试（可按 service 过滤，返回运行数量）
    async fn run_all_contract_tests(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<u32> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.run_all(service.as_deref()))
    }

    /// V45.0: 发布 Schema 版本（从注册表获取 SDL 并发布到版本管理器）
    async fn publish_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
        changelog: String,
    ) -> async_graphql::Result<String> {
        let sdl = {
            let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
            registry
                .get_version(&service, &version)
                .map(|v| v.sdl)
                .unwrap_or_default()
        };
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.publish(&service, &version, &changelog, &sdl))
    }

    /// V45.0: 提升 Schema 版本为 Active
    async fn promote_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.promote(&service, &version))
    }

    /// V45.0: 回滚 Schema 到指定版本
    async fn rollback_schema(
        &self,
        _ctx: &Context<'_>,
        service: String,
        to_version: String,
    ) -> async_graphql::Result<bool> {
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.rollback(&service, &to_version))
    }

    // ==================== V49.0: 自适应限流 + 熔断降级 + 负载感知路由 ====================

    /// V49.0: 配置服务限流器
    async fn configure_rate_limiter(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: RateLimiterConfigInput,
    ) -> async_graphql::Result<RateLimiterConfigGql> {
        configure_rate_limiter(
            &service,
            config.max_requests_per_second,
            config.burst_capacity,
            config.adaptive.unwrap_or(true),
        );
        let limiter = crate::modules::rate_limiting::rate_limiter()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        limiter
            .get_configs()
            .into_iter()
            .find(|c| c.service == service)
            .ok_or_else(|| async_graphql::Error::new("Rate limiter config not found"))
    }

    /// V49.0: 配置服务熔断器
    async fn configure_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: crate::modules::rate_limiting::CircuitBreakerConfigInput,
    ) -> async_graphql::Result<crate::modules::rate_limiting::CircuitBreakerStateGql> {
        configure_circuit_breaker(
            &service,
            config.failure_threshold,
            config.recovery_timeout_sec,
            config.half_open_max_requests,
        );
        let mut mgr = circuit_breaker_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        mgr.get_state(&service)
            .ok_or_else(|| async_graphql::Error::new("Circuit breaker state not found"))
    }

    /// V49.0: 重置服务熔断器
    async fn reset_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<bool> {
        reset_circuit_breaker(&service);
        Ok(true)
    }

    /// V49.0: 配置服务降级策略
    async fn configure_degradation(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: DegradationConfigInput,
    ) -> async_graphql::Result<ServiceDegradationConfigGql> {
        configure_degradation(
            &service,
            config.enabled,
            &config.strategy,
            config.fallback_ttl_sec,
            config.max_degradation_duration_sec,
        );
        let mgr = circuit_breaker_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        mgr.get_degradation_config(&service)
            .ok_or_else(|| async_graphql::Error::new("Degradation config not found"))
    }

    /// V49.0: 注册服务实例
    async fn register_instance(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
        url: String,
    ) -> async_graphql::Result<InstanceHealthGql> {
        register_service_instance(&service, &instance_id, &url);
        mark_instance_healthy(&service, &instance_id);
        let router = load_aware_router()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let healths = router.get_instance_healths(&service);
        healths
            .into_iter()
            .find(|h| h.instance_id == instance_id)
            .ok_or_else(|| async_graphql::Error::new("Instance not found after registration"))
    }

    /// V49.0: 更新实例负载指标
    async fn update_instance_metrics(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
        cpu_usage: f64,
        memory_usage: f64,
        active_requests: u64,
        queue_length: u64,
        latency_ms: f64,
        error_rate: f64,
    ) -> async_graphql::Result<LoadMetricsGql> {
        update_instance_metrics(
            &service,
            &instance_id,
            cpu_usage,
            memory_usage,
            active_requests,
            queue_length,
            latency_ms,
            error_rate,
        );
        let metrics = get_load_metrics(&service);
        metrics
            .into_iter()
            .find(|m| m.instance_id == instance_id)
            .ok_or_else(|| async_graphql::Error::new("Metrics not found after update"))
    }

    /// V49.0: 标记实例为健康
    async fn mark_instance_healthy(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
    ) -> async_graphql::Result<bool> {
        mark_instance_healthy(&service, &instance_id);
        Ok(true)
    }

    /// V49.0: 标记实例为不健康（同时记录熔断失败）
    async fn mark_instance_unhealthy(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
    ) -> async_graphql::Result<bool> {
        mark_instance_unhealthy(&service, &instance_id);
        circuit_record_failure(&service);
        Ok(true)
    }

    /// V49.0: 创建路由规则
    async fn set_routing_rule(
        &self,
        _ctx: &Context<'_>,
        rule: RoutingRuleInput,
    ) -> async_graphql::Result<RoutingRuleGql> {
        Ok(set_routing_rule(
            &rule.service,
            &rule.condition,
            &rule.target_instance,
            rule.priority.unwrap_or(100),
        ))
    }

    /// V49.0: 删除路由规则
    async fn delete_routing_rule(
        &self,
        _ctx: &Context<'_>,
        rule_id: String,
    ) -> async_graphql::Result<bool> {
        Ok(delete_routing_rule(&rule_id))
    }

    // ==================== V49.0 Phase 19: AI 查询路由 + Schema Stitching + 智能缓存 ====================

    /// AI 查询路由分析
    async fn ai_route_query(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiRoutingDecisionGql> {
        Ok(crate::modules::rate_limiting::ai_route_query(&query))
    }

    /// AI 查询意图识别
    async fn ai_detect_intent(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiQueryIntent> {
        Ok(crate::modules::rate_limiting::ai_detect_intent(&query))
    }

    /// 获取指定名称的 Stitched Schema
    async fn stitched_schema(
        &self,
        _ctx: &Context<'_>,
        name: String,
    ) -> async_graphql::Result<StitchedSchemaGql> {
        Ok(crate::modules::rate_limiting::stitch_schema(&name))
    }

    /// 获取所有已注册的子 Schema 列表
    async fn stitched_sub_schemas(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubSchemaEntryGql>> {
        Ok(crate::modules::rate_limiting::stitch_list_sub_schemas())
    }

    /// 获取字段映射规则列表
    async fn stitched_field_mappings(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FieldMappingRuleGql>> {
        Ok(crate::modules::rate_limiting::stitch_list_field_mappings())
    }

    /// 智能缓存整体统计
    async fn cache_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<crate::modules::rate_limiting::CacheStatsGql> {
        Ok(crate::modules::rate_limiting::cache_stats())
    }

    /// 查询单个缓存条目
    async fn cache_get_entry(
        &self,
        _ctx: &Context<'_>,
        key: String,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        Ok(crate::modules::rate_limiting::cache_get_entry(&key))
    }

    /// 按模式列出缓存条目
    async fn cache_list_entries(
        &self,
        _ctx: &Context<'_>,
        pattern: Option<String>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CacheEntryGql>> {
        Ok(crate::modules::rate_limiting::cache_list_entries(
            pattern.as_deref(),
        ))
    }

    /// 列出所有缓存策略
    async fn cache_list_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CachePolicyGql>> {
        Ok(crate::modules::rate_limiting::cache_list_policies())
    }

    // ==================== V50.0 Phase 20: 持久化查询管理 + 查询审计 + 企业级治理 ====================

    /// 获取持久化查询
    async fn persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::get_persisted_query(
            &query_hash,
        ))
    }

    /// 列出持久化查询
    async fn persisted_queries(
        &self,
        _ctx: &Context<'_>,
        page: Option<u32>,
        page_size: Option<u32>,
        status: Option<crate::modules::query_governance::QueryStatus>,
    ) -> async_graphql::Result<crate::modules::query_governance::PersistedQueryListGql> {
        Ok(crate::modules::query_governance::list_persisted_queries(
            page.unwrap_or(1),
            page_size.unwrap_or(20),
            status,
        ))
    }

    /// 按标签搜索持久化查询
    async fn persisted_queries_by_tag(
        &self,
        _ctx: &Context<'_>,
        tag: String,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::search_persisted_queries_by_tag(&tag))
    }

    /// 获取审计统计
    async fn audit_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<crate::modules::query_governance::AuditStatsGql> {
        Ok(crate::modules::query_governance::get_audit_stats())
    }

    /// 查询审计日志
    async fn audit_entries(
        &self,
        _ctx: &Context<'_>,
        filter: crate::modules::query_governance::QueryAuditFilterInput,
        page: Option<u32>,
        page_size: Option<u32>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::QueryAuditEntryGql>> {
        Ok(crate::modules::query_governance::query_audit_entries(
            filter,
            page.unwrap_or(1),
            page_size.unwrap_or(20),
        ))
    }

    /// 获取查询配额
    async fn query_quota(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        entity_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryQuotaGql>> {
        Ok(crate::modules::query_governance::get_query_quota(
            &entity_type,
            &entity_id,
        ))
    }

    /// 获取审批请求
    async fn approval_request(
        &self,
        _ctx: &Context<'_>,
        request_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryApprovalRequestGql>>
    {
        Ok(crate::modules::query_governance::get_approval_request(
            &request_id,
        ))
    }

    /// 列出待审批请求
    async fn pending_approval_requests(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::QueryApprovalRequestGql>> {
        Ok(crate::modules::query_governance::list_pending_approval_requests())
    }

    /// 获取治理策略
    async fn governance_policy(
        &self,
        _ctx: &Context<'_>,
        policy_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::GovernancePolicyGql>> {
        Ok(crate::modules::query_governance::get_governance_policy(
            &policy_id,
        ))
    }

    /// 列出治理策略
    async fn governance_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::GovernancePolicyGql>> {
        Ok(crate::modules::query_governance::list_governance_policies())
    }

    /// 获取字段访问控制
    async fn field_access_control(
        &self,
        _ctx: &Context<'_>,
        field_path: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::FieldAccessControlGql>>
    {
        Ok(crate::modules::query_governance::get_field_access_control(
            &field_path,
        ))
    }

    /// 检查查询治理
    async fn check_governance(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        user_id: String,
        user_roles: Vec<String>,
        query_fields: Vec<String>,
    ) -> async_graphql::Result<crate::modules::query_governance::GovernanceCheckResultGql> {
        Ok(crate::modules::query_governance::check_query_governance(
            &query_hash,
            &user_id,
            &user_roles,
            &query_fields,
        ))
    }

    // ==================== V49.0 Phase 19 Mutation: AI 查询路由 + Schema Stitching + 智能缓存 ====================

    /// 注册/更新子 Schema
    async fn register_sub_schema(
        &self,
        _ctx: &Context<'_>,
        entry: crate::modules::rate_limiting::SubSchemaEntryInput,
    ) -> async_graphql::Result<crate::modules::rate_limiting::SubSchemaEntryGql> {
        crate::modules::rate_limiting::register_sub_schema(entry)
    }

    /// 移除子 Schema
    async fn remove_sub_schema(
        &self,
        _ctx: &Context<'_>,
        service_name: String,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::remove_sub_schema(&service_name)
    }

    /// 设置类型合并策略
    async fn set_merge_strategy(
        &self,
        _ctx: &Context<'_>,
        strategy: crate::modules::rate_limiting::TypeMergeStrategy,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::set_merge_strategy(strategy)
    }

    /// 添加字段映射规则
    async fn add_field_mapping(
        &self,
        _ctx: &Context<'_>,
        rule: crate::modules::rate_limiting::FieldMappingRuleInput,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::add_field_mapping(rule)
    }

    /// 移除字段映射规则
    async fn remove_field_mapping(
        &self,
        _ctx: &Context<'_>,
        source_field: String,
        target_field: String,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::remove_field_mapping(&source_field, &target_field)
    }

    /// 刷新 Stitched Schema
    async fn refresh_stitched_schema(
        &self,
        _ctx: &Context<'_>,
        name: String,
    ) -> async_graphql::Result<crate::modules::rate_limiting::StitchedSchemaGql> {
        crate::modules::rate_limiting::refresh_stitched_schema(&name)
    }

    /// 设置缓存条目
    async fn cache_set(
        &self,
        _ctx: &Context<'_>,
        key: String,
        value: String,
        policy: Option<crate::modules::rate_limiting::CachePolicyInput>,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        crate::modules::rate_limiting::cache_set(&key, value, policy)
    }

    /// 获取缓存条目
    async fn cache_get(
        &self,
        _ctx: &Context<'_>,
        key: String,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        Ok(crate::modules::rate_limiting::cache_get_entry(&key))
    }

    /// 删除缓存条目
    async fn cache_delete(&self, _ctx: &Context<'_>, key: String) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::cache_delete(&key)
    }

    /// 按模式清空智能缓存条目
    async fn cache_clear_entries(
        &self,
        _ctx: &Context<'_>,
        pattern: Option<String>,
    ) -> async_graphql::Result<u64> {
        crate::modules::rate_limiting::cache_clear(pattern.as_deref())
    }

    /// 设置缓存策略
    async fn cache_set_policy(
        &self,
        _ctx: &Context<'_>,
        pattern: String,
        policy: crate::modules::rate_limiting::CachePolicyInput,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::cache_set_policy(&pattern, policy)
    }

    /// 清空缓存策略
    async fn cache_clear_policies(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::cache_clear_policies()
    }

    // ==================== V50.0 Phase 20 Mutation: 持久化查询管理 + 查询审计 + 企业级治理 ====================

    /// 注册持久化查询
    async fn register_persisted_query(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::PersistedQueryInput,
    ) -> async_graphql::Result<crate::modules::query_governance::PersistedQueryGql> {
        Ok(crate::modules::query_governance::register_persisted_query(
            input,
        ))
    }

    /// 更新持久化查询状态
    async fn update_persisted_query_status(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        status: crate::modules::query_governance::QueryStatus,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::update_persisted_query_status(&query_hash, status))
    }

    /// 删除持久化查询
    async fn delete_persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(crate::modules::query_governance::delete_persisted_query(
            &query_hash,
        ))
    }

    /// 添加持久化查询标签
    async fn add_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::add_persisted_query_tag(
            &query_hash,
            &tag,
        ))
    }

    /// 移除持久化查询标签
    async fn remove_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::remove_persisted_query_tag(&query_hash, &tag))
    }

    /// 设置查询配额
    async fn set_query_quota(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::QueryQuotaInput,
    ) -> async_graphql::Result<crate::modules::query_governance::QueryQuotaGql> {
        Ok(crate::modules::query_governance::set_query_quota(input))
    }

    /// 创建审批请求
    async fn create_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::ApprovalRequestInput,
    ) -> async_graphql::Result<crate::modules::query_governance::QueryApprovalRequestGql> {
        Ok(crate::modules::query_governance::create_approval_request(
            input,
        ))
    }

    /// 审批请求
    async fn review_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::ApprovalReviewInput,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryApprovalRequestGql>>
    {
        Ok(crate::modules::query_governance::review_approval_request(
            input,
        ))
    }

    /// 创建治理策略
    async fn create_governance_policy(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::GovernancePolicyInput,
    ) -> async_graphql::Result<crate::modules::query_governance::GovernancePolicyGql> {
        Ok(crate::modules::query_governance::create_governance_policy(
            input,
        ))
    }

    /// 设置字段访问控制
    async fn set_field_access_control(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::FieldAccessControlInput,
    ) -> async_graphql::Result<crate::modules::query_governance::FieldAccessControlGql> {
        Ok(crate::modules::query_governance::set_field_access_control(
            input,
        ))
    }
}

// ==================== Subscription 根类型（V34.0 Phase 4） ====================

pub struct SubscriptionRoot;

/// 服务健康监控的目标服务列表
const SUBSCRIPTION_SERVICES: &[(&str, &str)] = &[
    ("erp", "http://localhost:8010"),
    ("crm", "http://localhost:8029"),
    ("hrm", "http://localhost:8020"),
    ("finance", "http://localhost:8011"),
    ("mes", "http://localhost:8030"),
    ("workflow", "http://localhost:8000"),
    ("iam", "http://localhost:8000"),
    ("notification", "http://localhost:8084"),
];

#[Subscription]
impl SubscriptionRoot {
    /// 订阅服务健康状态变化（每 30 秒推送所有服务状态）
    /// V37.0: 每次推送事件时递增 CDN 缓存版本号，使 GET GraphQL 缓存失效
    /// V38.0: 添加订阅计数，开始时递增，结束时递减
    async fn service_health_changed(&self) -> ReceiverStream<ServiceHealthGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                invalidate_cache();
                let mut all_ok = true;
                for (name, url) in SUBSCRIPTION_SERVICES {
                    let healthy = check_service_health(url).await;
                    if tx
                        .send(ServiceHealthGql {
                            service: (*name).to_string(),
                            healthy,
                            url: (*url).to_string(),
                        })
                        .await
                        .is_err()
                    {
                        all_ok = false;
                        break;
                    }
                }
                if !all_ok {
                    return;
                }
            }
        });
        ReceiverStream::new(rx)
    }

    // ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================

    /// 订阅主数据变更事件（可按 domain 过滤）
    ///
    /// 当主数据（客户/供应商/物料/员工等）发生变更时推送事件。
    /// 客户端可通过 domain 参数过滤特定域的变更。
    async fn master_data_changed(
        &self,
        ctx: &Context<'_>,
        domain: Option<String>,
    ) -> ReceiverStream<MasterDataEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::MasterDataChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<MasterDataEventGql>(value) {
                            // 按 domain 过滤
                            if let Some(ref d) = domain {
                                if !event.domain.eq_ignore_ascii_case(d) {
                                    continue;
                                }
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅通知接收事件（按 user_id 过滤）
    ///
    /// 当用户收到新通知时推送事件。客户端必须指定 user_id 进行过滤。
    async fn notification_received(
        &self,
        ctx: &Context<'_>,
        user_id: String,
    ) -> ReceiverStream<NotificationEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::NotificationReceived);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<NotificationEventGql>(value) {
                            if event.user_id != user_id {
                                continue;
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅工作流任务分配事件（按 assignee_id 过滤）
    ///
    /// 当有新工作流任务分配给用户时推送事件。客户端必须指定 assignee_id 进行过滤。
    async fn workflow_task_assigned(
        &self,
        ctx: &Context<'_>,
        assignee_id: String,
    ) -> ReceiverStream<WorkflowTaskEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::WorkflowTaskAssigned);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<WorkflowTaskEventGql>(value) {
                            if event.assignee_id != assignee_id {
                                continue;
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅订单状态变更事件（可按 order_type 过滤）
    ///
    /// 当订单状态发生变更时推送事件。客户端可通过 order_type 参数过滤特定类型。
    async fn order_status_changed(
        &self,
        ctx: &Context<'_>,
        order_type: Option<String>,
    ) -> ReceiverStream<OrderStatusEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::OrderStatusChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<OrderStatusEventGql>(value) {
                            if let Some(ref ot) = order_type {
                                if !event.order_type.eq_ignore_ascii_case(ot) {
                                    continue;
                                }
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// V43.0: 订阅数据变更事件（通用实体级实时推送）
    ///
    /// 当任何实体数据发生变更时推送事件，支持按 entity_type 和 update_type 过滤。
    /// 相比主数据变更事件，此频道提供更细粒度的实体级数据，包含完整 data 和 delta。
    async fn data_changed(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
        update_type: Option<String>,
    ) -> ReceiverStream<DataChangeEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::DataChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<DataChangeEvent>(value) {
                            if let Some(ref et) = entity_type {
                                if !event.entity_type.eq_ignore_ascii_case(et) {
                                    continue;
                                }
                            }
                            if let Some(ref ut) = update_type {
                                let event_ut = match event.update_type {
                                    UpdateType::Created => "created",
                                    UpdateType::Updated => "updated",
                                    UpdateType::Deleted => "deleted",
                                    UpdateType::Delta => "delta",
                                    UpdateType::Full => "full",
                                };
                                if !event_ut.eq_ignore_ascii_case(ut) {
                                    continue;
                                }
                            }
                            let gql_event = DataChangeEventGql {
                                entity_type: event.entity_type,
                                entity_id: event.entity_id,
                                update_type: event.update_type.into(),
                                data: event.data,
                                delta: event.delta,
                                version: event.version,
                                timestamp: event.timestamp,
                                source: event.source,
                            };
                            if tx.send(gql_event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    // ==================== V47.0 Phase 17: 实时数据流 + 增量更新 + 状态同步订阅 ====================

    /// 订阅实时数据流（可按 entity_type / update_type 过滤）
    ///
    /// V47.0: 客户端订阅特定实体类型的实时数据流，当数据发生
    /// Insert/Update/Delete/Sync/Snapshot 时推送增量更新事件。
    async fn realtime_data_stream(
        &self,
        entity_type: Option<String>,
        update_type: Option<String>,
    ) -> ReceiverStream<RealtimeStreamUpdateGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let et = entity_type.clone();
        let ut = update_type.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
            let mut last_seq: i64 = 0;
            loop {
                interval.tick().await;
                let target_et = et.clone().unwrap_or_else(|| "order".to_string());
                let updates =
                    RealtimeStreamManager::get_stream_updates(&target_et, last_seq, Some(50));
                for u in updates {
                    last_seq = last_seq.max(u.sequence_number);
                    if let Some(ref ut) = ut {
                        let type_str = match u.stream_type {
                            StreamUpdateTypeGql::Insert => "insert",
                            StreamUpdateTypeGql::Update => "update",
                            StreamUpdateTypeGql::Delete => "delete",
                            StreamUpdateTypeGql::Sync => "sync",
                            StreamUpdateTypeGql::Snapshot => "snapshot",
                        };
                        if !type_str.eq_ignore_ascii_case(ut) {
                            continue;
                        }
                    }
                    if tx.send(u).await.is_err() {
                        return;
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅增量更新（可按 entity_type / entity_id 过滤）
    ///
    /// V47.0: 推送待应用的增量更新（Delta），客户端可基于 base_version 做差异合并。
    async fn incremental_updates(
        &self,
        entity_type: Option<String>,
        entity_id: Option<String>,
    ) -> ReceiverStream<IncrementalUpdateGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let et = entity_type.clone();
        let eid = entity_id.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
            let mut seen: HashSet<String> = HashSet::new();
            loop {
                interval.tick().await;
                let target_et = et.clone().unwrap_or_else(|| "order".to_string());
                let target_eid = eid.clone().unwrap_or_default();
                let updates =
                    IncrementalUpdateEngine::get_pending_updates(&target_et, &target_eid, 0);
                for u in updates {
                    if seen.contains(&u.update_id) {
                        continue;
                    }
                    seen.insert(u.update_id.clone());
                    if tx.send(u).await.is_err() {
                        return;
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅同步状态变更（可按 client_id 过滤）
    ///
    /// V47.0: 当同步会话状态发生变更（InSync/Syncing/Conflict/Error/Offline）时推送事件。
    async fn sync_state_changed(
        &self,
        client_id: Option<String>,
    ) -> ReceiverStream<SyncSessionGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let cid = client_id.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));
            let mut last_count: usize = 0;
            loop {
                interval.tick().await;
                let history = StateSyncManager::get_sync_history(cid.as_deref(), Some(10));
                if history.len() != last_count {
                    last_count = history.len();
                    if let Some(latest) = history.first() {
                        if tx.send(latest.clone()).await.is_err() {
                            return;
                        }
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }
}

struct DeferSubscriptionCount;

impl Drop for DeferSubscriptionCount {
    fn drop(&mut self) {
        decrement_subscriptions();
    }
}

// ==================== 辅助函数 ====================

async fn fetch_erp_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.erp_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "erp".into(),
        total: 0,
        active: 0,
        available,
    })
}

async fn fetch_crm_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.crm_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "crm".into(),
        total: 0,
        active: 0,
        available,
    })
}

async fn fetch_hrm_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.hrm_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "hrm".into(),
        total: 0,
        active: 0,
        available,
    })
}

async fn fetch_finance_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.finance_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "finance".into(),
        total: 0,
        active: 0,
        available,
    })
}

async fn fetch_mes_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.mes_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "mes".into(),
        total: 0,
        active: 0,
        available,
    })
}

async fn fetch_workflow_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.workflow_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "workflow".into(),
        total: 0,
        active: 0,
        available,
    })
}

// V34.0 Track F: 共享 HTTP 客户端，避免每次健康检查都创建新 Client
static SHARED_HTTP_CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();

fn shared_http_client() -> &'static reqwest::Client {
    SHARED_HTTP_CLIENT.get_or_init(reqwest::Client::new)
}

async fn check_service_health(url: &str) -> bool {
    match shared_http_client()
        .get(format!("{}/health", url))
        .with_trace()
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

// ==================== V37.0 Phase 7: GraphQL 订阅 CDN 缓存失效 ====================

/// 全局缓存版本号
/// 每次订阅事件推送时递增，用于 CDN 缓存失效。
/// GET GraphQL 响应包含 ETag 头，客户端可据此判断缓存是否过期。
static CACHE_VERSION: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// 获取当前缓存版本号
pub fn get_cache_version() -> u64 {
    CACHE_VERSION.load(std::sync::atomic::Ordering::Relaxed)
}

/// 递增缓存版本号（订阅事件推送时调用）
/// 这会使所有基于旧版本号的 CDN 缓存失效。
pub fn invalidate_cache() {
    CACHE_VERSION.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] CDN 缓存版本递增至 {}", get_cache_version());
}

// ==================== V38.0: 活跃订阅计数器 ====================

/// 全局活跃订阅数计数器
/// 每个订阅开始时递增，结束时递减。
static ACTIVE_SUBSCRIPTIONS: std::sync::atomic::AtomicUsize =
    std::sync::atomic::AtomicUsize::new(0);

/// 获取当前活跃订阅数
pub fn get_active_subscriptions() -> usize {
    ACTIVE_SUBSCRIPTIONS.load(std::sync::atomic::Ordering::Relaxed)
}

/// 递增活跃订阅数
pub fn increment_subscriptions() {
    ACTIVE_SUBSCRIPTIONS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] 活跃订阅数递增至 {}", get_active_subscriptions());
}

/// 递减活跃订阅数
pub fn decrement_subscriptions() {
    ACTIVE_SUBSCRIPTIONS.fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] 活跃订阅数递减至 {}", get_active_subscriptions());
}

// ==================== V37.0 Phase 7: Apollo Federation v2 辅助函数 ====================

/// 组合联邦 Schema SDL
/// 返回 Portal BFF 作为联邦网关组合后的完整 SDL，
/// 包含所有 @key 实体类型定义。
fn compose_federation_sdl() -> String {
    let mut sdl = String::new();
    sdl.push_str("# Federation v2 Composed Schema (Portal BFF Gateway)\n\n");

    // 联邦指令声明（Apollo Federation v2）
    sdl.push_str("schema @link(url: \"https://specs.apollo.dev/federation/v2.0\", import: [\"@key\", \"@external\", \"@extends\"])\n");
    sdl.push_str("{ query: Query mutation: Mutation subscription: Subscription }\n\n");

    // 实体类型定义（带 @key 指令）
    sdl.push_str("type CustomerEntity @key(fields: \"id\") { id: String! name: String! code: String! status: String! phone: String industry: String contact_person: String orders: [OrderEntity!]! contacts: [ContactEntity!]! }\n");
    sdl.push_str("type SupplierEntity @key(fields: \"id\") { id: String! name: String! code: String! status: String! contact_person: String phone: String address: String }\n");
    sdl.push_str("type MaterialEntity @key(fields: \"id\") { id: String! name: String! code: String! category: String! unit: String spec: String price: Float }\n");
    sdl.push_str("type EmployeeEntity @key(fields: \"id\") { id: String! name: String! department: String! position: String! email: String phone: String status: String departmentInfo: DepartmentEntity }\n");
    sdl.push_str("type VoucherEntity @key(fields: \"id\") { id: String! voucher_number: String! total_debit: Float! total_credit: Float! status: String! voucher_date: String created_by: String accountSubject: AccountSubjectEntity }\n");
    sdl.push_str("type ContactEntity @key(fields: \"id\") { id: String! name: String! customer_id: String email: String }\n");
    sdl.push_str("type OrderEntity @key(fields: \"id\") { id: String! order_number: String! customer_id: String! total_amount: Float! status: String! order_date: String }\n");
    sdl.push_str("type AccountSubjectEntity @key(fields: \"id\") { id: String! code: String! name: String! category: String! balance: Float }\n");
    sdl.push_str("type DepartmentEntity @key(fields: \"id\") { id: String! name: String! code: String! manager_id: String parent_id: String }\n\n");

    // 联邦查询类型
    sdl.push_str("type Query {\n");
    sdl.push_str("  businessStats: BusinessStats!\n");
    sdl.push_str("  unifiedTodos: [UnifiedTodo!]!\n");
    sdl.push_str("  serviceHealth: [ServiceHealth!]!\n");
    sdl.push_str("  dashboard: Dashboard!\n");
    sdl.push_str("  moduleStats: [ModuleStat!]!\n");
    sdl.push_str("  federatedServices: [FederatedService!]!\n");
    sdl.push_str(
        "  federatedEntity(service: String!, entityType: String!, id: String!): FederatedEntity!\n",
    );
    sdl.push_str("  federationSdl: String!\n");
    sdl.push_str("  federationServiceSdls: [FederationServiceSdl!]!\n");
    sdl.push_str("  federationEntities(representations: [JSON!]!): [FederationRepresentation!]!\n");
    sdl.push_str("  federationEntityList(service: String!, entityType: String!, ids: [String!]!): [FederatedEntity!]!\n");
    sdl.push_str("  federationEntityListCached(service: String!, entityType: String!, ids: [String!]!): [FederatedEntity!]!\n");
    sdl.push_str("  subscriptionCount: Int!\n");
    sdl.push_str("  customerEntity(id: String!): CustomerEntity\n");
    sdl.push_str("  employeeEntity(id: String!): EmployeeEntity\n");
    sdl.push_str("  voucherEntity(id: String!): VoucherEntity\n");
    sdl.push_str("  entityRelationshipGraph: EntityRelationshipGraph!\n");
    sdl.push_str("  federationStats: FederationStats!\n");
    sdl.push_str("  cacheStats: CacheStats!\n");
    sdl.push_str("  cacheOptimizationSuggestions: [CacheOptimizationSuggestion!]!\n");
    sdl.push_str("  prefetchRules: [QueryPrefetchRule!]!\n");
    sdl.push_str("  cacheInvalidationRules: [CacheInvalidationRule!]!\n");
    sdl.push_str("  federationV2Plan(query: String!, variables: String): FederationQueryPlan!\n");
    sdl.push_str("  federationV2Execute(query: String!, variables: String): JSON!\n");
    sdl.push_str("  federationV2Stats: FederationV2Stats!\n");
    sdl.push_str("  registeredServices: [ServiceMetadata!]!\n");
    sdl.push_str("  entityMetadata(entityName: String!): EntityMetadata\n");
    sdl.push_str("  federationV2Sdl: String!\n");
    sdl.push_str("}\n\n");
    sdl.push_str("type FederationQueryPlan { queryHash: String! steps: [PlanStep!]! parallelGroups: [ParallelGroup!]! estimatedCost: Float! estimatedDurationMs: Int! }\n");
    sdl.push_str("type PlanStep { stepId: String! stepType: String! entity: String service: String dependsOn: [String!]! fields: [String!]! args: JSON! }\n");
    sdl.push_str(
        "type ParallelGroup { groupId: String! steps: [String!]! executionMode: String! }\n",
    );
    sdl.push_str("type FederationV2Stats { totalQueries: Int! totalSteps: Int! parallelSteps: Int! batchResolutions: Int! cacheHits: Int! cacheMisses: Int! avgPlanTimeMs: Float! avgExecuteTimeMs: Float! avgTotalTimeMs: Float! planCacheHits: Int! autoResolversUsed: Int! servicesRegistered: Int! entitiesRegistered: Int! }\n");
    sdl.push_str("type ServiceMetadata { name: String! baseUrl: String! entities: [EntityMetadata!]! healthCheckUrl: String version: String! }\n");
    sdl.push_str("type EntityMetadata { name: String! service: String! keyField: String! fields: [FieldMetadata!]! relations: [RelationMetadata!]! restEndpoint: String! listEndpoint: String! batchEndpoint: String }\n");
    sdl.push_str("type FieldMetadata { name: String! fieldType: String! nullable: Boolean! isList: Boolean! }\n");
    sdl.push_str("type RelationMetadata { fieldName: String! targetEntity: String! targetService: String! relationType: String! resolverType: String! }\n\n");

    sdl.push_str("type Mutation { createTodo(title: String!, userId: String): UnifiedTodo! completeTodo(id: String!): Boolean! deleteTodo(id: String!): Boolean! createEntity(service: String!, entityType: String!, data: JSON!): JSON! updateEntity(service: String!, entityType: String!, id: String!, data: JSON!): JSON! deleteEntity(service: String!, entityType: String!, id: String!): Boolean! publishMasterDataEvent(domain: String!, action: String!, masterDataId: String!, sourceService: String!): MasterDataEvent! publishNotification(userId: String!, title: String!, content: String!, notificationType: String!): NotificationEvent! publishWorkflowTask(taskId: String!, assigneeId: String!, instanceTitle: String!, priority: String!, status: String!): WorkflowTaskEvent! publishOrderStatus(orderId: String!, orderType: String!, oldStatus: String!, newStatus: String!): OrderStatusEvent! cacheInvalidate(pattern: String!): Boolean! cacheClear: Boolean! prefetchTrigger(queryName: String!): Boolean! }\n\n");
    sdl.push_str("type MasterDataEvent { domain: String! action: String! master_data_id: String! source_service: String! timestamp: String! }\n");
    sdl.push_str("type NotificationEvent { id: String! user_id: String! title: String! content: String! notification_type: String! timestamp: String! }\n");
    sdl.push_str("type WorkflowTaskEvent { task_id: String! assignee_id: String! instance_title: String! priority: String! status: String! timestamp: String! }\n");
    sdl.push_str("type OrderStatusEvent { order_id: String! order_type: String! old_status: String! new_status: String! timestamp: String! }\n");
    sdl.push_str("type CacheStats { l1Size: Int! l2Size: Int! l1Hits: Int! l2Hits: Int! totalRequests: Int! hitRate: Float! evictions: Int! avgTtlSeconds: Float! topHotQueries: [HotQuery!]! }\n");
    sdl.push_str("type HotQuery { queryName: String! hitCount: Int! avgLatencyMs: Float! }\n");
    sdl.push_str("type CacheOptimizationSuggestion { suggestion: String! impact: String! currentMetric: String! expectedImprovement: String! }\n");
    sdl.push_str("type QueryPrefetchRule { triggerQuery: String! prefetchQueries: [PrefetchTarget!]! confidence: Float! }\n");
    sdl.push_str("type PrefetchTarget { queryName: String! queryHash: String! variablesTemplate: JSON! priority: Int! }\n");
    sdl.push_str("type CacheInvalidationRule { mutationName: String! invalidationPatterns: [String!]! entityType: String! }\n");
    sdl.push_str("type OptimisticUpdateHint { entityType: String! entityId: String! operation: String! affectedQueries: [String!]! }\n\n");
    sdl.push_str("type Subscription { serviceHealthChanged: ServiceHealth! masterDataChanged(domain: String): MasterDataEvent! notificationReceived(userId: String!): NotificationEvent! workflowTaskAssigned(assigneeId: String!): WorkflowTaskEvent! orderStatusChanged(orderType: String): OrderStatusEvent! }\n");

    sdl
}

/// 返回单个服务贡献给联邦的 SDL 片段
/// 模拟下游服务通过 _service { sdl } 暴露的实体定义。
fn service_sdl_fragment(service: &str) -> String {
    match service {
        "erp" => r#"# ERP Service Federation SDL
type CustomerEntity @key(fields: "id") { id: String! name: String! code: String! status: String! phone: String industry: String contact_person: String orders: [OrderEntity!]! contacts: [ContactEntity!]! }
type SupplierEntity @key(fields: "id") { id: String! name: String! code: String! status: String! contact_person: String phone: String address: String }
type MaterialEntity @key(fields: "id") { id: String! name: String! code: String! category: String! unit: String spec: String price: Float }
type OrderEntity @key(fields: "id") { id: String! order_number: String! customer_id: String! total_amount: Float! status: String! order_date: String }
"#.to_string(),
        "crm" => r#"# CRM Service Federation SDL
type ContactEntity @key(fields: "id") { id: String! name: String! customer_id: String email: String }
"#.to_string(),
        "hrm" => r#"# HRM Service Federation SDL
type EmployeeEntity @key(fields: "id") { id: String! name: String! department: String! position: String! email: String phone: String status: String departmentInfo: DepartmentEntity }
type DepartmentEntity @key(fields: "id") { id: String! name: String! code: String! manager_id: String parent_id: String }
"#.to_string(),
        "finance" => r#"# Finance Service Federation SDL
type VoucherEntity @key(fields: "id") { id: String! voucher_number: String! total_debit: Float! total_credit: Float! status: String! voucher_date: String created_by: String accountSubject: AccountSubjectEntity }
type AccountSubjectEntity @key(fields: "id") { id: String! code: String! name: String! category: String! balance: Float }
"#.to_string(),
        "mes" => r#"# MES Service Federation SDL
# MES 实体待后续迁移
"#.to_string(),
        _ => format!("# {} Service: no federated entities yet\n", service),
    }
}

/// 根据实体类型名获取对应的服务名
fn service_for_typename(typename: &str) -> &'static str {
    match typename {
        "CustomerEntity" | "SupplierEntity" | "MaterialEntity" | "OrderEntity" => "erp",
        "ContactEntity" => "crm",
        "EmployeeEntity" | "DepartmentEntity" => "hrm",
        "VoucherEntity" | "AccountSubjectEntity" => "finance",
        _ => "unknown",
    }
}

/// 解析联邦实体（__resolveReference 实现）
/// 根据 __typename 和 id 从对应的下游 REST 服务获取实体数据。
async fn resolve_federated_entity(typename: &str, id: &str) -> serde_json::Value {
    let (base_url, path) = match typename {
        "CustomerEntity" => (
            "http://localhost:8010",
            format!("/api/erp/customers/{}", id),
        ),
        "SupplierEntity" => (
            "http://localhost:8010",
            format!("/api/erp/suppliers/{}", id),
        ),
        "MaterialEntity" => (
            "http://localhost:8010",
            format!("/api/erp/materials/{}", id),
        ),
        "OrderEntity" => ("http://localhost:8010", format!("/api/erp/orders/{}", id)),
        "EmployeeEntity" => (
            "http://localhost:8020",
            format!("/api/hrm/employees/{}", id),
        ),
        "DepartmentEntity" => (
            "http://localhost:8020",
            format!("/api/hrm/departments/{}", id),
        ),
        "VoucherEntity" => (
            "http://localhost:8011",
            format!("/api/finance/vouchers/{}", id),
        ),
        "AccountSubjectEntity" => (
            "http://localhost:8011",
            format!("/api/finance/accounts/{}", id),
        ),
        "ContactEntity" => ("http://localhost:8029", format!("/api/crm/contacts/{}", id)),
        _ => return serde_json::json!({"error": "unknown entity type", "__typename": typename}),
    };

    let url = format!("{}{}", base_url, path);
    match shared_http_client().get(&url).with_trace().send().await {
        Ok(resp) if resp.status().is_success() => {
            resp.json::<serde_json::Value>().await.unwrap_or_else(|_| {
                serde_json::json!({"error": "failed to parse response", "__typename": typename, "id": id})
            })
        }
        _ => serde_json::json!({"error": "entity not found", "__typename": typename, "id": id}),
    }
}

// ==================== V39.0 Track E: GraphQL Persisted Queries 生产化 ====================
//
// 将 APQ 从开发模式升级为生产级：
// 1. 查询白名单机制（仅允许预注册的查询）
// 2. 安全哈希验证（SHA-256 防止篡改）
// 3. CDN 缓存策略深化（基于查询复杂度的差异化缓存）
// 4. 查询审计日志

/// 预注册的查询哈希白名单
/// 生产模式下仅允许白名单中的查询执行。
/// 默认为 None（未启用），需要显式调用 enable_query_whitelist 启用。
static QUERY_WHITELIST: RwLock<Option<HashSet<String>>> = RwLock::new(None);

/// 启用查询白名单，注入预注册的查询哈希列表
pub fn enable_query_whitelist(hashes: Vec<String>) {
    let mut wl = QUERY_WHITELIST.write().unwrap_or_else(|e| e.into_inner());
    *wl = Some(hashes.into_iter().collect());
    tracing::info!(
        "[graphql] V39.0 查询白名单已启用，共 {} 个查询哈希",
        wl.as_ref().map(|s| s.len()).unwrap_or(0)
    );
}

/// 检查指定哈希是否在白名单中
/// 白名单未启用时（None 状态）允许所有查询
pub fn is_query_allowed(hash: &str) -> bool {
    let wl = QUERY_WHITELIST.read().unwrap_or_else(|e| e.into_inner());
    match &*wl {
        None => true,
        Some(set) => set.contains(hash),
    }
}

/// 检查白名单是否已启用
pub fn is_whitelist_enabled() -> bool {
    QUERY_WHITELIST
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .is_some()
}

/// 添加单个查询哈希到白名单（需先启用白名单）
pub fn add_to_whitelist(hash: String) {
    let mut wl = QUERY_WHITELIST.write().unwrap_or_else(|e| e.into_inner());
    if let Some(set) = &mut *wl {
        set.insert(hash);
    }
}

/// 获取白名单中的查询哈希数量
pub fn get_whitelist_size() -> usize {
    let wl = QUERY_WHITELIST.read().unwrap_or_else(|e| e.into_inner());
    wl.as_ref().map(|s| s.len()).unwrap_or(0)
}

/// 获取白名单前 N 个哈希预览（用于状态展示）
pub fn get_whitelist_preview(limit: usize) -> Vec<String> {
    let wl = QUERY_WHITELIST.read().unwrap_or_else(|e| e.into_inner());
    match &*wl {
        None => Vec::new(),
        Some(set) => set.iter().take(limit).cloned().collect(),
    }
}

/// 安全哈希验证：计算查询字符串的 SHA-256 哈希并与期望值比较
/// 防止中间人篡改查询内容
pub fn verify_query_hash(query: &str, expected_hash: &str) -> bool {
    let mut hasher = Sha256::new();
    hasher.update(query.as_bytes());
    let actual = hasher.finalize();
    let actual_hex: String = actual.iter().map(|b| format!("{:02x}", b)).collect();
    actual_hex == expected_hash
}

/// 从 GraphQL 请求扩展中提取 APQ 查询哈希
pub fn extract_query_hash(extensions: &async_graphql::Extensions) -> Option<String> {
    extensions
        .get("persistedQuery")
        .and_then(|v| match v {
            async_graphql::Value::Object(map) => map.get("sha256Hash"),
            _ => None,
        })
        .and_then(|v| match v {
            async_graphql::Value::String(s) => Some(s.clone()),
            _ => None,
        })
}

/// 创建白名单拒绝错误响应
pub fn create_whitelist_error_response(hash: &str) -> async_graphql::Response {
    async_graphql::Response::from_errors(vec![async_graphql::ServerError::new(
        format!("Query hash '{}' is not in the whitelist", hash),
        None,
    )])
}

/// 创建无哈希错误响应（白名单启用但请求未携带哈希）
pub fn create_no_hash_error_response() -> async_graphql::Response {
    async_graphql::Response::from_errors(vec![async_graphql::ServerError::new(
        "Whitelist is enabled but no query hash was provided",
        None,
    )])
}

/// 创建哈希不匹配错误响应
pub fn create_hash_mismatch_error_response(hash: &str) -> async_graphql::Response {
    async_graphql::Response::from_errors(vec![async_graphql::ServerError::new(
        format!("Query content does not match hash '{}'", hash),
        None,
    )])
}

// ==================== V39.0: 查询复杂度分级缓存 ====================

/// 缓存层级枚举 — 基于查询复杂度差异化设置 Cache-Control
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum CacheTier {
    /// 不缓存（Mutation/Subscription）
    None,
    /// 60 秒（高频变化数据、复杂查询）
    ShortLived,
    /// 5 分钟（统计数据、中等复杂度查询）
    MediumLived,
    /// 1 小时（不常变化数据、简单查询）
    LongLived,
}

/// 根据查询复杂度和深度决定缓存层级
pub fn determine_cache_tier(complexity: usize, depth: usize) -> CacheTier {
    match (complexity, depth) {
        (c, _) if c > 200 => CacheTier::ShortLived,
        (_, d) if d > 5 => CacheTier::ShortLived,
        (c, _) if c < 50 => CacheTier::LongLived,
        _ => CacheTier::MediumLived,
    }
}

/// 将缓存层级转换为 Cache-Control 头值
pub fn cache_control_header(tier: CacheTier) -> &'static str {
    match tier {
        CacheTier::None => "no-store",
        CacheTier::ShortLived => "public, max-age=60",
        CacheTier::MediumLived => "public, max-age=300",
        CacheTier::LongLived => "public, max-age=3600",
    }
}

/// 估算查询复杂度（基于查询字符串结构）
/// 粗略估计：花括号嵌套数 * 10 + 字段令牌数
pub fn estimate_query_complexity(query: &str) -> usize {
    if query.is_empty() {
        return 0;
    }
    let brace_count = query.matches('{').count();
    let field_count = query
        .split_whitespace()
        .filter(|t| {
            !t.starts_with('{')
                && !t.starts_with('}')
                && !t.starts_with('$')
                && !t.starts_with('(')
                && !t.starts_with('#')
        })
        .count();
    brace_count * 10 + field_count
}

/// 估算查询深度（最大花括号嵌套层数）
pub fn estimate_query_depth(query: &str) -> usize {
    let mut max_depth: usize = 0;
    let mut current_depth: usize = 0;
    for c in query.chars() {
        match c {
            '{' => {
                current_depth += 1;
                if current_depth > max_depth {
                    max_depth = current_depth;
                }
            }
            '}' => {
                current_depth = current_depth.saturating_sub(1);
            }
            _ => {}
        }
    }
    // 减去最外层的 query/mutation/subscription 操作层级
    max_depth.saturating_sub(1)
}

/// 根据查询字符串综合决定缓存层级
/// Mutation/Subscription 不缓存，Query 按复杂度分级
pub fn determine_cache_tier_for_query(query: &str) -> CacheTier {
    let trimmed = query.trim_start();
    if trimmed.starts_with("mutation") || trimmed.starts_with("subscription") {
        return CacheTier::None;
    }
    let complexity = estimate_query_complexity(query);
    let depth = estimate_query_depth(query);
    determine_cache_tier(complexity, depth)
}

// ==================== V39.0: 查询审计日志 ====================

/// 查询审计日志条目
#[derive(Clone, serde::Serialize)]
pub struct QueryAuditLog {
    /// 查询哈希（APQ 提供时存在）
    pub query_hash: Option<String>,
    /// 操作名称
    pub operation_name: Option<String>,
    /// 估算的查询复杂度
    pub complexity: usize,
    /// 估算的查询深度
    pub depth: usize,
    /// 执行耗时（毫秒）
    pub duration_ms: u64,
    /// 用户 ID（如果可从认证上下文获取）
    pub user_id: Option<String>,
    /// 时间戳
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// 是否成功（无错误）
    pub success: bool,
}

/// 全局查询审计日志存储（内存环形缓冲）
static QUERY_AUDIT_LOGS: RwLock<Vec<QueryAuditLog>> = RwLock::new(Vec::new());
/// 审计日志最大保留条数
const MAX_AUDIT_LOGS: usize = 1000;

/// 记录一条查询审计日志
/// 超过上限时移除最旧的条目
/// V44.0: 同时记录指标和追踪
pub fn record_query_audit(log: QueryAuditLog) {
    let operation_name = log.operation_name.clone();
    let duration_ms = log.duration_ms as f64;
    let success = log.success;
    let query_hash = log.query_hash.clone();
    let user_id = log.user_id.clone();

    let mut logs = QUERY_AUDIT_LOGS.write().unwrap_or_else(|e| e.into_inner());
    if logs.len() >= MAX_AUDIT_LOGS {
        logs.remove(0);
    }
    logs.push(log);
    drop(logs);

    record_query_metric(operation_name.clone(), duration_ms, success, false, None);

    let trace_id = start_trace(query_hash, operation_name, user_id, None);
    let _ = start_span(
        &trace_id,
        None,
        "audit_log".to_string(),
        "portal".to_string(),
        SpanType::Resolve,
        None,
    );
    end_trace(
        &trace_id,
        if success {
            None
        } else {
            Some("query_failed".to_string())
        },
    );
}

/// 获取最近的查询审计日志（按时间倒序）
pub fn get_query_audit_logs(limit: usize) -> Vec<QueryAuditLog> {
    let logs = QUERY_AUDIT_LOGS.read().unwrap_or_else(|e| e.into_inner());
    logs.iter().rev().take(limit).cloned().collect()
}

/// 获取审计日志当前条数
pub fn get_audit_log_count() -> usize {
    QUERY_AUDIT_LOGS
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

// ==================== V39.0: 自定义 APQ 扩展占位 ====================
//
// ProductionApqExtension 定义了生产级 APQ 扩展的职责范围。
// 由于 async-graphql 的扩展系统需要在请求生命周期中注入，
// 实际的白名单检查、哈希验证、审计日志记录和 Cache-Control 设置
// 在 main.rs 的 handler 层实现，以便直接访问 HTTP 请求/响应。
//
// 扩展职责（在 handler 层实现）：
// - 请求前: 验证查询哈希是否在白名单中
// - 请求前: 验证查询内容与哈希匹配（防篡改）
// - 请求后: 记录查询审计日志
// - 请求后: 根据查询复杂度设置差异化 Cache-Control 头

/// 生产级 APQ 扩展占位结构
pub struct ProductionApqExtension;

// ==================== V39.0 Phase 9: Redis PubSub 后端 + 降级模式 ====================

/// 尝试连接 Redis PubSub
///
/// 通过发布一个 HealthCheck 事件来验证 Redis 连接是否可用。
/// 如果 Redis 不可用或连接失败，返回 false，调用方应降级为内存广播模式。
pub async fn try_redis_pubsub() -> bool {
    let publisher = match topems_shared_event::event::EventPublisher::new("portal-bff-health-check")
    {
        Ok(p) => p,
        Err(e) => {
            tracing::debug!("[event-bus] Redis EventPublisher 创建失败: {}", e);
            return false;
        }
    };

    match publisher
        .publish_event(
            topems_shared_event::event::EventType::HealthCheck,
            serde_json::json!({"source": "portal-bff", "check": "connectivity"}),
        )
        .await
    {
        Ok(_) => {
            tracing::info!("[event-bus] Redis PubSub 连接正常");
            true
        }
        Err(e) => {
            tracing::warn!(
                "[event-bus] Redis PubSub 连接失败，将降级为内存广播模式: {}",
                e
            );
            false
        }
    }
}

/// 尝试启动 Redis PubSub 监听后台任务
///
/// 订阅 Redis 事件频道，将跨实例事件转发到本地 EventBus。
/// 如果 Redis EventSubscriber 创建失败，返回 false，调用方应启动演示模拟器。
pub fn try_start_redis_listener(event_bus: Arc<EventBus>) -> bool {
    let subscriber = match topems_shared_event::event::EventSubscriber::new("portal-bff") {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!("[event-bus] 无法创建 EventSubscriber: {}", e);
            return false;
        }
    };

    // 订阅通知事件 → NotificationReceived 频道
    let eb_notif = event_bus.clone();
    let subscriber = subscriber.subscribe(
        vec![topems_shared_event::event::EventType::PortalNotificationPublished],
        move |event| {
            let eb = eb_notif.clone();
            async move {
                eb.publish(SubscriptionChannel::NotificationReceived, event.payload);
            }
        },
    );

    // 订阅工作流事件 → WorkflowTaskAssigned 频道
    let eb_wf = event_bus.clone();
    let subscriber = subscriber.subscribe(
        vec![
            topems_shared_event::event::EventType::WorkflowStarted,
            topems_shared_event::event::EventType::WorkflowApproved,
        ],
        move |event| {
            let eb = eb_wf.clone();
            async move {
                eb.publish(SubscriptionChannel::WorkflowTaskAssigned, event.payload);
            }
        },
    );

    // 订阅订单事件 → OrderStatusChanged 频道
    let eb_order = event_bus.clone();
    let subscriber = subscriber.subscribe(
        vec![
            topems_shared_event::event::EventType::SalesOrderCreated,
            topems_shared_event::event::EventType::SalesOrderApproved,
            topems_shared_event::event::EventType::PurchaseOrderCreated,
            topems_shared_event::event::EventType::PurchaseOrderApproved,
        ],
        move |event| {
            let eb = eb_order.clone();
            async move {
                eb.publish(SubscriptionChannel::OrderStatusChanged, event.payload);
            }
        },
    );

    // 订阅主数据事件 → MasterDataChanged 频道
    let eb_md = event_bus.clone();
    let subscriber = subscriber.subscribe_master_data(
        vec![
            topems_shared_event::event::MasterDataDomain::Customer,
            topems_shared_event::event::MasterDataDomain::Supplier,
            topems_shared_event::event::MasterDataDomain::Material,
            topems_shared_event::event::MasterDataDomain::Organization,
            topems_shared_event::event::MasterDataDomain::Employee,
            topems_shared_event::event::MasterDataDomain::AccountSubject,
        ],
        move |mdm_event| {
            let eb = eb_md.clone();
            async move {
                let gql = MasterDataEventGql {
                    domain: format!("{:?}", mdm_event.domain).to_lowercase(),
                    action: format!("{:?}", mdm_event.action).to_lowercase(),
                    master_data_id: mdm_event.master_data_id.clone(),
                    source_service: mdm_event.source_service.clone(),
                    timestamp: mdm_event.timestamp.to_rfc3339(),
                };
                if let Ok(val) = serde_json::to_value(&gql) {
                    eb.publish(SubscriptionChannel::MasterDataChanged, val);
                }
            }
        },
    );

    // 在后台任务中持续监听
    tokio::spawn(async move {
        tracing::info!("[event-bus] Redis PubSub 监听已启动");
        if let Err(e) = subscriber.start_listening().await {
            tracing::warn!("[event-bus] Redis 事件监听异常退出: {}", e);
        }
    });

    true
}

/// 启动演示事件模拟器（Redis 不可用时的降级模式）
///
/// 每 30 秒向所有 4 个新频道发布模拟事件，用于演示和测试。
pub fn start_demo_simulator(event_bus: Arc<EventBus>) {
    tracing::info!("[event-bus] 启动演示事件模拟器（每 30 秒发布模拟事件）");

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        let mut counter: u64 = 0;

        loop {
            interval.tick().await;
            counter += 1;
            let now = chrono::Utc::now().to_rfc3339();
            let ts = chrono::Utc::now().timestamp();

            // 模拟主数据变更事件
            let md_event = MasterDataEventGql {
                domain: "customer".to_string(),
                action: "updated".to_string(),
                master_data_id: format!("cust-demo-{}", ts),
                source_service: "demo-simulator".to_string(),
                timestamp: now.clone(),
            };
            event_bus.publish(
                SubscriptionChannel::MasterDataChanged,
                serde_json::to_value(&md_event).unwrap_or_default(),
            );

            // 模拟通知事件
            let notif_event = NotificationEventGql {
                id: format!("notif-demo-{}", ts),
                user_id: "demo-user".to_string(),
                title: format!("演示通知 #{}", counter),
                content: "这是一条来自演示模拟器的通知事件".to_string(),
                notification_type: "info".to_string(),
                timestamp: now.clone(),
            };
            event_bus.publish(
                SubscriptionChannel::NotificationReceived,
                serde_json::to_value(&notif_event).unwrap_or_default(),
            );

            // 模拟工作流任务事件
            let wf_event = WorkflowTaskEventGql {
                task_id: format!("task-demo-{}", ts),
                assignee_id: "demo-user".to_string(),
                instance_title: format!("演示工作流任务 #{}", counter),
                priority: "medium".to_string(),
                status: "pending".to_string(),
                timestamp: now.clone(),
            };
            event_bus.publish(
                SubscriptionChannel::WorkflowTaskAssigned,
                serde_json::to_value(&wf_event).unwrap_or_default(),
            );

            // 模拟订单状态变更事件
            let order_event = OrderStatusEventGql {
                order_id: format!("order-demo-{}", ts),
                order_type: "sales".to_string(),
                old_status: "pending".to_string(),
                new_status: "approved".to_string(),
                timestamp: now,
            };
            event_bus.publish(
                SubscriptionChannel::OrderStatusChanged,
                serde_json::to_value(&order_event).unwrap_or_default(),
            );

            tracing::debug!("[event-bus][demo] 已发布第 {} 轮演示事件", counter);
        }
    });
}

// ==================== V41.0 Track B: GraphQL 智能缓存体系 ====================
//
// 多级缓存 + 智能策略 + 自动失效 + 查询预取 + 乐观更新 + 统计调优

// ---------- 多级缓存层 ----------

/// V41.0: 缓存条目
#[derive(Clone)]
struct CacheEntry {
    key: String,
    value: String,
    tier: CacheTier,
    expires_at: DateTime<Utc>,
    hit_count: u64,
    last_access: DateTime<Utc>,
    size_bytes: usize,
}

/// V41.0: 多级缓存（L1 热点 + L2 温点）
struct MultiLevelCache {
    l1: Mutex<LruCache<String, CacheEntry>>,
    l2: Mutex<LruCache<String, CacheEntry>>,
}

impl MultiLevelCache {
    fn new(l1_capacity: usize, l2_capacity: usize) -> Self {
        Self {
            l1: Mutex::new(LruCache::new(l1_capacity)),
            l2: Mutex::new(LruCache::new(l2_capacity)),
        }
    }

    fn get(&self, key: &str) -> Option<CacheEntry> {
        let now = Utc::now();
        let mut l1 = self.l1.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(entry) = l1.get(&key.to_string()) {
            if entry.expires_at > now {
                let mut entry = entry.clone();
                entry.hit_count += 1;
                entry.last_access = now;
                l1.put(key.to_string(), entry.clone());
                record_l1_hit();
                return Some(entry);
            } else {
                l1.map.remove(key);
                l1.order.retain(|k| k != key);
            }
        }
        drop(l1);

        let mut l2 = self.l2.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(entry) = l2.get(&key.to_string()) {
            if entry.expires_at > now {
                let mut entry = entry.clone();
                entry.hit_count += 1;
                entry.last_access = now;
                l2.put(key.to_string(), entry.clone());
                record_l2_hit();

                let mut l1 = self.l1.lock().unwrap_or_else(|e| e.into_inner());
                if l1.len() >= 500 {
                    if let Some(oldest) = l1.order.pop_back() {
                        if let Some(old_entry) = l1.map.remove(&oldest) {
                            l2.put(oldest, old_entry);
                            record_mlc_eviction();
                        }
                    }
                }
                l1.put(key.to_string(), entry.clone());
                return Some(entry);
            } else {
                l2.map.remove(key);
                l2.order.retain(|k| k != key);
            }
        }
        record_mlc_miss();
        None
    }

    fn set(&self, key: String, value: String, tier: CacheTier, ttl_seconds: u64) {
        let now = Utc::now();
        let expires_at = now + chrono::Duration::seconds(ttl_seconds as i64);
        let size_bytes = key.len() + value.len();
        let entry = CacheEntry {
            key: key.clone(),
            value,
            tier,
            expires_at,
            hit_count: 1,
            last_access: now,
            size_bytes,
        };

        let mut l1 = self.l1.lock().unwrap_or_else(|e| e.into_inner());
        if l1.len() >= 500 {
            if let Some(oldest) = l1.order.pop_back() {
                if let Some(old_entry) = l1.map.remove(&oldest) {
                    drop(l1);
                    let mut l2 = self.l2.lock().unwrap_or_else(|e| e.into_inner());
                    l2.put(oldest, old_entry);
                    record_mlc_eviction();
                    drop(l2);
                    l1 = self.l1.lock().unwrap_or_else(|e| e.into_inner());
                }
            }
        }
        l1.put(key, entry);
    }

    fn invalidate_pattern(&self, pattern: &str) -> usize {
        let mut count = 0;
        let mut l1 = self.l1.lock().unwrap_or_else(|e| e.into_inner());
        let l1_keys: Vec<String> = l1
            .map
            .keys()
            .filter(|k| k.contains(pattern))
            .cloned()
            .collect();
        count += l1_keys.len();
        for k in &l1_keys {
            l1.map.remove(k);
            l1.order.retain(|key| key != k);
        }
        drop(l1);

        let mut l2 = self.l2.lock().unwrap_or_else(|e| e.into_inner());
        let l2_keys: Vec<String> = l2
            .map
            .keys()
            .filter(|k| k.contains(pattern))
            .cloned()
            .collect();
        count += l2_keys.len();
        for k in &l2_keys {
            l2.map.remove(k);
            l2.order.retain(|key| key != k);
        }
        count
    }

    fn clear(&self) {
        let mut l1 = self.l1.lock().unwrap_or_else(|e| e.into_inner());
        l1.map.clear();
        l1.order.clear();
        drop(l1);
        let mut l2 = self.l2.lock().unwrap_or_else(|e| e.into_inner());
        l2.map.clear();
        l2.order.clear();
    }

    fn l1_size(&self) -> usize {
        self.l1.lock().unwrap_or_else(|e| e.into_inner()).len()
    }

    fn l2_size(&self) -> usize {
        self.l2.lock().unwrap_or_else(|e| e.into_inner()).len()
    }

    fn top_hot_queries(&self, limit: usize) -> Vec<HotQueryEntry> {
        let mut all = Vec::new();
        let l1 = self.l1.lock().unwrap_or_else(|e| e.into_inner());
        for entry in l1.map.values() {
            all.push(entry.clone());
        }
        drop(l1);
        let l2 = self.l2.lock().unwrap_or_else(|e| e.into_inner());
        for entry in l2.map.values() {
            all.push(entry.clone());
        }
        drop(l2);
        all.sort_by(|a, b| b.hit_count.cmp(&a.hit_count));
        all.into_iter()
            .take(limit)
            .map(|e| HotQueryEntry {
                query_name: extract_query_name(&e.key),
                hit_count: e.hit_count,
            })
            .collect()
    }
}

struct HotQueryEntry {
    query_name: String,
    hit_count: u64,
}

fn extract_query_name(key: &str) -> String {
    if let Some(idx) = key.find(':') {
        key[..idx].to_string()
    } else {
        key.to_string()
    }
}

/// V41.0: 全局多级缓存实例
static MULTI_LEVEL_CACHE: std::sync::OnceLock<Arc<MultiLevelCache>> = std::sync::OnceLock::new();

fn multi_level_cache() -> &'static Arc<MultiLevelCache> {
    MULTI_LEVEL_CACHE.get_or_init(|| Arc::new(MultiLevelCache::new(500, 2000)))
}

/// V41.0: 缓存统计内部计数器
struct CacheStatsInternal {
    l1_hits: u64,
    l2_hits: u64,
    total_requests: u64,
    evictions: u64,
    total_ttl_seconds: u64,
    ttl_sample_count: u64,
}

static CACHE_STATS_INTERNAL: std::sync::OnceLock<Mutex<CacheStatsInternal>> =
    std::sync::OnceLock::new();

fn cache_stats_internal() -> &'static Mutex<CacheStatsInternal> {
    CACHE_STATS_INTERNAL.get_or_init(|| {
        Mutex::new(CacheStatsInternal {
            l1_hits: 0,
            l2_hits: 0,
            total_requests: 0,
            evictions: 0,
            total_ttl_seconds: 0,
            ttl_sample_count: 0,
        })
    })
}

fn record_l1_hit() {
    let mut s = cache_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.l1_hits += 1;
    s.total_requests += 1;
}

fn record_l2_hit() {
    let mut s = cache_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.l2_hits += 1;
    s.total_requests += 1;
}

fn record_mlc_miss() {
    let mut s = cache_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_requests += 1;
}

fn record_mlc_eviction() {
    let mut s = cache_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.evictions += 1;
}

fn record_ttl_sample(ttl: u64) {
    let mut s = cache_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_ttl_seconds += ttl;
    s.ttl_sample_count += 1;
}

// ---------- 智能缓存策略 ----------

/// V41.0: 缓存策略配置
struct CacheStrategy {
    auto_tier: bool,
    min_hits_for_l1: u64,
    ttl_multiplier: f64,
    adaptive_ttl: bool,
}

impl Default for CacheStrategy {
    fn default() -> Self {
        Self {
            auto_tier: true,
            min_hits_for_l1: 3,
            ttl_multiplier: 1.5,
            adaptive_ttl: true,
        }
    }
}

static CACHE_STRATEGY: std::sync::OnceLock<RwLock<CacheStrategy>> = std::sync::OnceLock::new();

fn cache_strategy() -> &'static RwLock<CacheStrategy> {
    CACHE_STRATEGY.get_or_init(|| RwLock::new(CacheStrategy::default()))
}

/// V41.0: 根据访问频率计算自适应 TTL
fn adaptive_ttl_seconds(base_tier: CacheTier, hit_count: u64) -> u64 {
    let base = match base_tier {
        CacheTier::None => 0,
        CacheTier::ShortLived => 60,
        CacheTier::MediumLived => 300,
        CacheTier::LongLived => 3600,
    };
    let strategy = cache_strategy().read().unwrap_or_else(|e| e.into_inner());
    if strategy.adaptive_ttl && hit_count > 0 {
        let multiplier = 1.0 + (hit_count as f64).log10() * strategy.ttl_multiplier * 0.3;
        let max_multiplier = 5.0;
        let m = multiplier.min(max_multiplier);
        (base as f64 * m) as u64
    } else {
        base
    }
}

// ---------- 自动缓存失效规则 ----------

/// V41.0: 缓存失效规则
#[derive(SimpleObject, Clone)]
pub struct CacheInvalidationRuleGql {
    pub mutation_name: String,
    pub invalidation_patterns: Vec<String>,
    pub entity_type: String,
}

/// V41.0: 预定义失效规则
fn default_invalidation_rules() -> Vec<CacheInvalidationRuleGql> {
    let entities = vec![
        ("Customer", "customer"),
        ("Supplier", "supplier"),
        ("Material", "material"),
        ("Employee", "employee"),
        ("Voucher", "voucher"),
        ("Contact", "contact"),
        ("Order", "order"),
        ("Department", "department"),
        ("AccountSubject", "account_subject"),
    ];
    let mut rules = Vec::new();
    for (entity, pattern) in &entities {
        rules.push(CacheInvalidationRuleGql {
            mutation_name: format!("create{}", entity),
            invalidation_patterns: vec![
                format!("{}:", pattern),
                format!("{}List", pattern),
                format!("{}Entity", entity),
            ],
            entity_type: pattern.to_string(),
        });
        rules.push(CacheInvalidationRuleGql {
            mutation_name: format!("update{}", entity),
            invalidation_patterns: vec![format!("{}:", pattern), format!("{}Entity", entity)],
            entity_type: pattern.to_string(),
        });
        rules.push(CacheInvalidationRuleGql {
            mutation_name: format!("delete{}", entity),
            invalidation_patterns: vec![
                format!("{}:", pattern),
                format!("{}List", pattern),
                format!("{}Entity", entity),
            ],
            entity_type: pattern.to_string(),
        });
    }
    rules.push(CacheInvalidationRuleGql {
        mutation_name: "createEntity".to_string(),
        invalidation_patterns: vec!["entityList:".to_string(), "federatedEntity:".to_string()],
        entity_type: "generic".to_string(),
    });
    rules.push(CacheInvalidationRuleGql {
        mutation_name: "updateEntity".to_string(),
        invalidation_patterns: vec!["entityList:".to_string(), "federatedEntity:".to_string()],
        entity_type: "generic".to_string(),
    });
    rules.push(CacheInvalidationRuleGql {
        mutation_name: "deleteEntity".to_string(),
        invalidation_patterns: vec!["entityList:".to_string(), "federatedEntity:".to_string()],
        entity_type: "generic".to_string(),
    });
    rules
}

static CACHE_INVALIDATION_RULES: std::sync::OnceLock<Vec<CacheInvalidationRuleGql>> =
    std::sync::OnceLock::new();

fn cache_invalidation_rules() -> &'static Vec<CacheInvalidationRuleGql> {
    CACHE_INVALIDATION_RULES.get_or_init(default_invalidation_rules)
}

/// V41.0: 根据 mutation 名称自动失效相关缓存
pub fn auto_invalidate_for_mutation(mutation_name: &str) -> usize {
    let rules = cache_invalidation_rules();
    let mut total_invalidated = 0;
    for rule in rules {
        if rule.mutation_name.eq_ignore_ascii_case(mutation_name) {
            for pattern in &rule.invalidation_patterns {
                total_invalidated += multi_level_cache().invalidate_pattern(pattern);
            }
        }
    }
    if total_invalidated > 0 {
        tracing::debug!(
            "[cache] Mutation '{}' 触发失效 {} 条缓存",
            mutation_name,
            total_invalidated
        );
    }
    total_invalidated
}

// ---------- 查询预取 ----------

/// V41.0: 预取目标
#[derive(SimpleObject, Clone)]
pub struct PrefetchTargetGql {
    pub query_name: String,
    pub query_hash: String,
    pub variables_template: serde_json::Value,
    pub priority: u8,
}

/// V41.0: 查询预取规则
#[derive(SimpleObject, Clone)]
pub struct QueryPrefetchRuleGql {
    pub trigger_query: String,
    pub prefetch_queries: Vec<PrefetchTargetGql>,
    pub confidence: f64,
}

fn default_prefetch_rules() -> Vec<QueryPrefetchRuleGql> {
    vec![
        QueryPrefetchRuleGql {
            trigger_query: "dashboard".to_string(),
            prefetch_queries: vec![
                PrefetchTargetGql {
                    query_name: "moduleStats".to_string(),
                    query_hash: "module_stats_default".to_string(),
                    variables_template: serde_json::json!({}),
                    priority: 8,
                },
                PrefetchTargetGql {
                    query_name: "federatedServices".to_string(),
                    query_hash: "federated_services_default".to_string(),
                    variables_template: serde_json::json!({}),
                    priority: 6,
                },
            ],
            confidence: 0.85,
        },
        QueryPrefetchRuleGql {
            trigger_query: "customerEntity".to_string(),
            prefetch_queries: vec![
                PrefetchTargetGql {
                    query_name: "customerEntity.orders".to_string(),
                    query_hash: "customer_orders".to_string(),
                    variables_template: serde_json::json!({"customerId": "$id"}),
                    priority: 7,
                },
                PrefetchTargetGql {
                    query_name: "customerEntity.contacts".to_string(),
                    query_hash: "customer_contacts".to_string(),
                    variables_template: serde_json::json!({"customerId": "$id"}),
                    priority: 5,
                },
            ],
            confidence: 0.7,
        },
        QueryPrefetchRuleGql {
            trigger_query: "employeeEntity".to_string(),
            prefetch_queries: vec![PrefetchTargetGql {
                query_name: "employeeEntity.departmentInfo".to_string(),
                query_hash: "employee_department".to_string(),
                variables_template: serde_json::json!({"department": "$department"}),
                priority: 9,
            }],
            confidence: 0.9,
        },
        QueryPrefetchRuleGql {
            trigger_query: "voucherEntity".to_string(),
            prefetch_queries: vec![PrefetchTargetGql {
                query_name: "voucherEntity.accountSubject".to_string(),
                query_hash: "voucher_account".to_string(),
                variables_template: serde_json::json!({"voucherId": "$id"}),
                priority: 8,
            }],
            confidence: 0.8,
        },
        QueryPrefetchRuleGql {
            trigger_query: "businessStats".to_string(),
            prefetch_queries: vec![PrefetchTargetGql {
                query_name: "serviceHealth".to_string(),
                query_hash: "service_health".to_string(),
                variables_template: serde_json::json!({}),
                priority: 7,
            }],
            confidence: 0.75,
        },
    ]
}

static PREFETCH_RULES: std::sync::OnceLock<Vec<QueryPrefetchRuleGql>> = std::sync::OnceLock::new();

fn prefetch_rules() -> &'static Vec<QueryPrefetchRuleGql> {
    PREFETCH_RULES.get_or_init(default_prefetch_rules)
}

/// V41.0: 访问模式记录（用于学习预取规则）
struct AccessPattern {
    query_sequence: Vec<String>,
    frequency: u64,
}

static ACCESS_PATTERNS: std::sync::OnceLock<Mutex<Vec<AccessPattern>>> = std::sync::OnceLock::new();

fn access_patterns() -> &'static Mutex<Vec<AccessPattern>> {
    ACCESS_PATTERNS.get_or_init(|| Mutex::new(Vec::new()))
}

/// V41.0: 记录查询访问（用于模式学习）
pub fn record_query_access(query_name: &str) {
    let mut patterns = access_patterns().lock().unwrap_or_else(|e| e.into_inner());
    if patterns.is_empty() {
        patterns.push(AccessPattern {
            query_sequence: vec![query_name.to_string()],
            frequency: 1,
        });
        return;
    }
    let last_seq = patterns.last_mut().unwrap();
    if last_seq.query_sequence.len() < 5 {
        last_seq.query_sequence.push(query_name.to_string());
        last_seq.frequency += 1;
    } else {
        patterns.push(AccessPattern {
            query_sequence: vec![query_name.to_string()],
            frequency: 1,
        });
    }
    if patterns.len() > 100 {
        patterns.remove(0);
    }
}

/// V41.0: 触发预取（简化实现，仅记录预取意图）
pub fn trigger_prefetch(trigger_query: &str) -> bool {
    let rules = prefetch_rules();
    let mut triggered = false;
    for rule in rules {
        if rule.trigger_query.eq_ignore_ascii_case(trigger_query) {
            tracing::debug!(
                "[prefetch] 触发 '{}' 的预取，目标数: {}",
                trigger_query,
                rule.prefetch_queries.len()
            );
            triggered = true;
        }
    }
    triggered
}

// ---------- 乐观更新支持 ----------

/// V41.0: 乐观更新提示
#[derive(SimpleObject, Clone)]
pub struct OptimisticUpdateHintGql {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub affected_queries: Vec<String>,
}

/// V41.0: 生成乐观更新提示
pub fn build_optimistic_hints(
    entity_type: &str,
    entity_id: &str,
    operation: &str,
) -> Vec<OptimisticUpdateHintGql> {
    let affected = match entity_type {
        "customer" => vec!["customerEntity", "customerList", "businessStats"],
        "supplier" => vec!["supplierEntity", "supplierList", "businessStats"],
        "material" => vec!["materialEntity", "materialList", "businessStats"],
        "employee" => vec!["employeeEntity", "employeeList", "businessStats"],
        "voucher" => vec!["voucherEntity", "voucherList", "businessStats"],
        "order" => vec!["orderEntity", "orderList", "businessStats"],
        _ => vec!["entityList", "federatedEntity"],
    };
    vec![OptimisticUpdateHintGql {
        entity_type: entity_type.to_string(),
        entity_id: entity_id.to_string(),
        operation: operation.to_string(),
        affected_queries: affected.iter().map(|s| s.to_string()).collect(),
    }]
}

// ---------- 缓存统计 GraphQL 类型 ----------

/// V41.0: 热门查询统计
#[derive(SimpleObject, Clone)]
pub struct HotQueryGql {
    pub query_name: String,
    pub hit_count: u64,
    pub avg_latency_ms: f64,
}

/// V41.0: 缓存统计 (重命名为 CacheStatsV41Gql 以避免与 V49.0 版本冲突)
#[derive(SimpleObject, Clone)]
pub struct CacheStatsV41Gql {
    pub l1_size: usize,
    pub l2_size: usize,
    pub l1_hits: u64,
    pub l2_hits: u64,
    pub total_requests: u64,
    pub hit_rate: f64,
    pub evictions: u64,
    pub avg_ttl_seconds: f64,
    pub top_hot_queries: Vec<HotQueryGql>,
}

/// V41.0: 缓存调优建议
#[derive(SimpleObject, Clone)]
pub struct CacheOptimizationSuggestionGql {
    pub suggestion: String,
    pub impact: String,
    pub current_metric: String,
    pub expected_improvement: String,
}

/// V41.0: 获取缓存统计
pub fn get_cache_stats() -> CacheStatsV41Gql {
    let stats = cache_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let cache = multi_level_cache();
    let total_hits = stats.l1_hits + stats.l2_hits;
    let hit_rate = if stats.total_requests > 0 {
        total_hits as f64 / stats.total_requests as f64
    } else {
        0.0
    };
    let avg_ttl = if stats.ttl_sample_count > 0 {
        stats.total_ttl_seconds as f64 / stats.ttl_sample_count as f64
    } else {
        0.0
    };
    let hot_entries = cache.top_hot_queries(10);
    let top_hot_queries = hot_entries
        .into_iter()
        .map(|e| HotQueryGql {
            query_name: e.query_name,
            hit_count: e.hit_count,
            avg_latency_ms: if e.hit_count > 10 { 5.0 } else { 15.0 },
        })
        .collect();

    CacheStatsV41Gql {
        l1_size: cache.l1_size(),
        l2_size: cache.l2_size(),
        l1_hits: stats.l1_hits,
        l2_hits: stats.l2_hits,
        total_requests: stats.total_requests,
        hit_rate,
        evictions: stats.evictions,
        avg_ttl_seconds: avg_ttl,
        top_hot_queries,
    }
}

/// V41.0: 生成缓存调优建议
pub fn get_cache_optimization_suggestions() -> Vec<CacheOptimizationSuggestionGql> {
    let mut suggestions = Vec::new();
    let stats = get_cache_stats();

    if stats.hit_rate < 0.5 {
        suggestions.push(CacheOptimizationSuggestionGql {
            suggestion: "提升 L2 缓存容量，增加温点查询命中率".to_string(),
            impact: "high".to_string(),
            current_metric: format!("命中率 {:.1}%", stats.hit_rate * 100.0),
            expected_improvement: "命中率提升 15-25%".to_string(),
        });
    }

    if stats.evictions > stats.total_requests / 10 {
        suggestions.push(CacheOptimizationSuggestionGql {
            suggestion: "L1 缓存淘汰率过高，建议增加 L1 容量或启用自适应 TTL".to_string(),
            impact: "high".to_string(),
            current_metric: format!(
                "淘汰数 {} / 总请求 {}",
                stats.evictions, stats.total_requests
            ),
            expected_improvement: "减少 30-50% 淘汰".to_string(),
        });
    }

    if stats.l2_size < 100 && stats.total_requests > 100 {
        suggestions.push(CacheOptimizationSuggestionGql {
            suggestion: "L2 缓存利用率低，可尝试降低 L1 容量或优化缓存键策略".to_string(),
            impact: "low".to_string(),
            current_metric: format!("L2 条目数 {}", stats.l2_size),
            expected_improvement: "提升内存使用效率".to_string(),
        });
    }

    if stats.l1_hits < stats.l2_hits && stats.total_requests > 50 {
        suggestions.push(CacheOptimizationSuggestionGql {
            suggestion: "L2 命中数高于 L1，说明热点识别阈值可能偏高，可降低 min_hits_for_l1"
                .to_string(),
            impact: "medium".to_string(),
            current_metric: format!("L1:{} / L2:{}", stats.l1_hits, stats.l2_hits),
            expected_improvement: "L1 命中率提升 10-20%".to_string(),
        });
    }

    if suggestions.is_empty() {
        suggestions.push(CacheOptimizationSuggestionGql {
            suggestion: "缓存状态良好，当前配置已优化".to_string(),
            impact: "low".to_string(),
            current_metric: format!("命中率 {:.1}%", stats.hit_rate * 100.0),
            expected_improvement: "保持现有配置".to_string(),
        });
    }

    suggestions
}

// ---------- 缓存操作公共函数 ----------

/// V41.0: 从缓存获取查询结果
pub fn cache_get(key: &str) -> Option<String> {
    multi_level_cache().get(key).map(|e| e.value)
}

/// V41.0: 写入缓存（带智能 TTL）
pub fn cache_set(key: String, value: String, tier: CacheTier, hit_count_hint: Option<u64>) {
    let hc = hit_count_hint.unwrap_or(1);
    let ttl = adaptive_ttl_seconds(tier, hc);
    record_ttl_sample(ttl);
    multi_level_cache().set(key, value, tier, ttl);
}

/// V41.0: 手动失效缓存（按模式）
pub fn cache_invalidate_pattern(pattern: &str) -> usize {
    multi_level_cache().invalidate_pattern(pattern)
}

/// V41.0: 清空所有缓存
pub fn cache_clear_all() {
    multi_level_cache().clear();
}

// ==================== Schema 构建 ====================

pub type PortalSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

/// V35.0 Phase 5: 查询复杂度限制
const MAX_QUERY_COMPLEXITY: usize = 1000;
/// V35.0 Phase 5: 查询深度限制
const MAX_QUERY_DEPTH: usize = 10;
/// V35.0 Phase 6: APQ 缓存容量
const APQ_CACHE_CAPACITY: usize = 256;

// ==================== V40.0 Track E: GraphQL 安全加固 ====================
//
// 在 V39.0 查询白名单 + 哈希验证 + 审计日志基础上，新增：
// 1. 查询深度限制验证（深度超限时拒绝并记录安全事件）
// 2. 查询复杂度限制验证（复杂度超限时拒绝并记录安全事件）
// 3. 基于 IP 的速率限制（滑动窗口，每分钟 100 次）
// 4. IP 黑名单（可动态添加/移除）
// 5. 安全事件审计（深度超限/复杂度超限/速率超限/IP黑名单/哈希不匹配）

/// V40.0: 安全事件类型
#[derive(Debug, Clone, serde::Serialize)]
pub enum SecurityEventType {
    DepthExceeded,
    ComplexityExceeded,
    RateLimitExceeded,
    IpBlacklisted,
    HashMismatch,
}

impl SecurityEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DepthExceeded => "depth_exceeded",
            Self::ComplexityExceeded => "complexity_exceeded",
            Self::RateLimitExceeded => "rate_limit_exceeded",
            Self::IpBlacklisted => "ip_blacklisted",
            Self::HashMismatch => "hash_mismatch",
        }
    }
}

/// V40.0: 安全事件条目
#[derive(Debug, Clone, serde::Serialize)]
pub struct SecurityEvent {
    pub event_type: String,
    pub ip: Option<String>,
    pub query_hash: Option<String>,
    pub details: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// V40.0: 全局安全事件存储（内存环形缓冲）
static SECURITY_EVENTS: std::sync::OnceLock<Mutex<VecDeque<SecurityEvent>>> =
    std::sync::OnceLock::new();
/// V40.0: 安全事件最大保留条数
const MAX_SECURITY_EVENTS: usize = 500;

fn security_events() -> &'static Mutex<VecDeque<SecurityEvent>> {
    SECURITY_EVENTS.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// V40.0: 记录安全事件
pub fn record_security_event(
    event_type: SecurityEventType,
    ip: Option<String>,
    query_hash: Option<String>,
    details: String,
) {
    let mut events = security_events().lock().unwrap_or_else(|e| e.into_inner());
    if events.len() >= MAX_SECURITY_EVENTS {
        events.pop_front();
    }
    let event_type_str = event_type.as_str().to_string();
    let ip_clone = ip.clone();
    let query_hash_clone = query_hash.clone();
    let details_clone = details.clone();
    events.push_back(SecurityEvent {
        event_type: event_type_str,
        ip,
        query_hash,
        details,
        timestamp: chrono::Utc::now(),
    });
    tracing::warn!(
        "[graphql-security] 安全事件: type={:?}, ip={:?}, hash={:?}, details={}",
        event_type,
        ip_clone,
        query_hash_clone,
        details_clone
    );
}

/// V40.0: 获取最近的安全事件（按时间倒序）
pub fn get_security_events(limit: usize) -> Vec<SecurityEvent> {
    let events = security_events().lock().unwrap_or_else(|e| e.into_inner());
    events.iter().rev().take(limit).cloned().collect()
}

/// V40.0: 获取安全事件总数
pub fn get_security_event_count() -> usize {
    security_events()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V40.0: 验证查询深度
///
/// 超过 MAX_QUERY_DEPTH 时返回错误并记录安全事件
pub fn validate_query_depth(
    query: &str,
    ip: Option<&str>,
    query_hash: Option<&str>,
) -> Result<(), String> {
    let depth = estimate_query_depth(query);
    if depth > MAX_QUERY_DEPTH {
        let msg = format!("Query depth {} exceeds maximum {}", depth, MAX_QUERY_DEPTH);
        record_security_event(
            SecurityEventType::DepthExceeded,
            ip.map(|s| s.to_string()),
            query_hash.map(|s| s.to_string()),
            msg.clone(),
        );
        Err(msg)
    } else {
        Ok(())
    }
}

/// V40.0: 验证查询复杂度
///
/// 超过 MAX_QUERY_COMPLEXITY 时返回错误并记录安全事件
pub fn validate_query_complexity(
    query: &str,
    ip: Option<&str>,
    query_hash: Option<&str>,
) -> Result<(), String> {
    let complexity = estimate_query_complexity(query);
    if complexity > MAX_QUERY_COMPLEXITY {
        let msg = format!(
            "Query complexity {} exceeds maximum {}",
            complexity, MAX_QUERY_COMPLEXITY
        );
        record_security_event(
            SecurityEventType::ComplexityExceeded,
            ip.map(|s| s.to_string()),
            query_hash.map(|s| s.to_string()),
            msg.clone(),
        );
        Err(msg)
    } else {
        Ok(())
    }
}

// ==================== V40.0: 速率限制 ====================

/// V40.0: 速率限制条目
struct RateLimitEntry {
    count: u32,
    window_start: std::time::Instant,
}

/// V40.0: 全局速率限制器
static RATE_LIMITER: std::sync::OnceLock<Mutex<HashMap<String, RateLimitEntry>>> =
    std::sync::OnceLock::new();

fn rate_limiter() -> &'static Mutex<HashMap<String, RateLimitEntry>> {
    RATE_LIMITER.get_or_init(|| Mutex::new(HashMap::new()))
}

/// V40.0: 每分钟速率限制（每个 IP）
const RATE_LIMIT_PER_MINUTE: u32 = 100;
/// V40.0: 速率限制窗口（60 秒）
const RATE_LIMIT_WINDOW: std::time::Duration = std::time::Duration::from_secs(60);

/// V40.0: 检查速率限制
///
/// 超过限制时返回错误并记录安全事件
pub fn check_rate_limit(ip: &str) -> Result<(), String> {
    let mut limiter = rate_limiter().lock().unwrap_or_else(|e| e.into_inner());
    let entry = limiter.entry(ip.to_string()).or_insert(RateLimitEntry {
        count: 0,
        window_start: std::time::Instant::now(),
    });

    if entry.window_start.elapsed() > RATE_LIMIT_WINDOW {
        entry.count = 0;
        entry.window_start = std::time::Instant::now();
    }

    if entry.count >= RATE_LIMIT_PER_MINUTE {
        let msg = format!(
            "Rate limit exceeded: {}/{} per minute",
            entry.count, RATE_LIMIT_PER_MINUTE
        );
        record_security_event(
            SecurityEventType::RateLimitExceeded,
            Some(ip.to_string()),
            None,
            msg.clone(),
        );
        Err(msg)
    } else {
        entry.count += 1;
        Ok(())
    }
}

/// V40.0: 获取速率限制配置
pub fn get_rate_limit_config() -> serde_json::Value {
    serde_json::json!({
        "per_minute": RATE_LIMIT_PER_MINUTE,
        "window_seconds": RATE_LIMIT_WINDOW.as_secs(),
    })
}

// ==================== V40.0: IP 黑名单 ====================

/// V40.0: 全局 IP 黑名单
static IP_BLACKLIST: std::sync::OnceLock<RwLock<HashSet<String>>> = std::sync::OnceLock::new();

fn ip_blacklist() -> &'static RwLock<HashSet<String>> {
    IP_BLACKLIST.get_or_init(|| RwLock::new(HashSet::new()))
}

/// V40.0: 检查 IP 是否在黑名单中
pub fn is_ip_blacklisted(ip: &str) -> bool {
    ip_blacklist()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .contains(ip)
}

/// V40.0: 添加 IP 到黑名单
pub fn add_to_ip_blacklist(ip: String) {
    ip_blacklist()
        .write()
        .unwrap_or_else(|e| e.into_inner())
        .insert(ip);
}

/// V40.0: 从黑名单移除 IP
pub fn remove_from_ip_blacklist(ip: &str) {
    ip_blacklist()
        .write()
        .unwrap_or_else(|e| e.into_inner())
        .remove(ip);
}

/// V40.0: 获取黑名单列表
pub fn get_ip_blacklist() -> Vec<String> {
    ip_blacklist()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .iter()
        .cloned()
        .collect()
}

/// V40.0: 获取黑名单大小
pub fn get_ip_blacklist_size() -> usize {
    ip_blacklist()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V40.0: 检查 IP 黑名单，若在黑名单中则记录安全事件并返回错误
pub fn check_ip_blacklist(ip: &str) -> Result<(), String> {
    if is_ip_blacklisted(ip) {
        let msg = format!("IP {} is blacklisted", ip);
        record_security_event(
            SecurityEventType::IpBlacklisted,
            Some(ip.to_string()),
            None,
            msg.clone(),
        );
        Err(msg)
    } else {
        Ok(())
    }
}

// ==================== V40.0: 安全统计 ====================

/// V40.0: 安全统计数据
#[derive(Debug, Clone, serde::Serialize)]
pub struct SecurityStats {
    pub total_security_events: usize,
    pub depth_exceeded_count: usize,
    pub complexity_exceeded_count: usize,
    pub rate_limit_exceeded_count: usize,
    pub ip_blacklisted_count: usize,
    pub hash_mismatch_count: usize,
    pub ip_blacklist_size: usize,
    pub rate_limit_per_minute: u32,
    pub max_query_depth: usize,
    pub max_query_complexity: usize,
}

/// V40.0: 获取安全统计
pub fn get_security_stats() -> SecurityStats {
    let events = security_events().lock().unwrap_or_else(|e| e.into_inner());
    let mut depth_count = 0;
    let mut complexity_count = 0;
    let mut rate_count = 0;
    let mut ip_black_count = 0;
    let mut hash_count = 0;

    for event in events.iter() {
        match event.event_type.as_str() {
            "depth_exceeded" => depth_count += 1,
            "complexity_exceeded" => complexity_count += 1,
            "rate_limit_exceeded" => rate_count += 1,
            "ip_blacklisted" => ip_black_count += 1,
            "hash_mismatch" => hash_count += 1,
            _ => {}
        }
    }

    SecurityStats {
        total_security_events: events.len(),
        depth_exceeded_count: depth_count,
        complexity_exceeded_count: complexity_count,
        rate_limit_exceeded_count: rate_count,
        ip_blacklisted_count: ip_black_count,
        hash_mismatch_count: hash_count,
        ip_blacklist_size: get_ip_blacklist_size(),
        rate_limit_per_minute: RATE_LIMIT_PER_MINUTE,
        max_query_depth: MAX_QUERY_DEPTH,
        max_query_complexity: MAX_QUERY_COMPLEXITY,
    }
}

/// V40.0: 从 HTTP 头中提取客户端 IP（通用实现）
///
/// 优先从 x-forwarded-for 获取（代理场景），其次是 x-real-ip
/// 接受一个能通过名称获取头值的闭包，以便适配不同的 HTTP 框架
pub fn extract_client_ip_from_headers<F, V>(get_header: F) -> String
where
    F: Fn(&str) -> Option<V>,
    V: AsRef<str>,
{
    if let Some(v) = get_header("x-forwarded-for") {
        let s = v.as_ref().to_string();
        if let Some(first) = s.split(',').next() {
            let trimmed = first.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }
    if let Some(v) = get_header("x-real-ip") {
        let s = v.as_ref().trim().to_string();
        if !s.is_empty() {
            return s;
        }
    }
    "unknown".to_string()
}

// ==================== V41.0 Track E: GraphQL 生产级运维 — 查询白名单自动化 ====================

/// V41.0: 发现状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscoveryStatus {
    New,
    UnderReview,
    Approved,
    Rejected,
}

impl DiscoveryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::New => "new",
            Self::UnderReview => "under_review",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }
}

/// V41.0: 发现的查询
#[derive(Clone)]
pub struct DiscoveredQuery {
    pub query_hash: String,
    pub query_name: String,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub call_count: u64,
    pub total_duration_ms: u64,
    pub max_depth: usize,
    pub total_complexity: u64,
    pub source_ips: HashSet<String>,
    pub status: DiscoveryStatus,
    pub reviewer: Option<String>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub auto_approved: bool,
}

impl DiscoveredQuery {
    pub fn avg_duration_ms(&self) -> f64 {
        if self.call_count > 0 {
            self.total_duration_ms as f64 / self.call_count as f64
        } else {
            0.0
        }
    }

    pub fn avg_complexity(&self) -> f64 {
        if self.call_count > 0 {
            self.total_complexity as f64 / self.call_count as f64
        } else {
            0.0
        }
    }

    pub fn source_ip_count(&self) -> usize {
        self.source_ips.len()
    }
}

/// V41.0: GraphQL 类型 — 发现的查询
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct DiscoveredQueryGql {
    pub query_hash: String,
    pub query_name: String,
    pub first_seen: String,
    pub last_seen: String,
    pub call_count: String,
    pub avg_duration_ms: f64,
    pub max_depth: i32,
    pub avg_complexity: f64,
    pub source_ip_count: i32,
    pub status: String,
    pub reviewer: Option<String>,
    pub reviewed_at: Option<String>,
    pub auto_approved: bool,
}

/// V41.0: 自动审批策略
#[derive(Clone)]
pub struct AutoApprovalPolicy {
    pub enabled: bool,
    pub min_calls_for_auto: u64,
    pub max_depth_for_auto: usize,
    pub max_complexity_for_auto: f64,
    pub unique_sources_min: usize,
    pub min_age_hours: u64,
}

/// V41.0: GraphQL 类型 — 自动审批策略
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct AutoApprovalPolicyGql {
    pub enabled: bool,
    pub min_calls_for_auto: i32,
    pub max_depth_for_auto: i32,
    pub max_complexity_for_auto: f64,
    pub unique_sources_min: i32,
    pub min_age_hours: i32,
}

/// V41.0: 自动审批策略输入
#[derive(async_graphql::InputObject)]
pub struct AutoApprovalPolicyInput {
    pub enabled: Option<bool>,
    pub min_calls_for_auto: Option<i32>,
    pub max_depth_for_auto: Option<i32>,
    pub max_complexity_for_auto: Option<f64>,
    pub unique_sources_min: Option<i32>,
    pub min_age_hours: Option<i32>,
}

/// V41.0: 白名单健康度
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct WhitelistHealthGql {
    pub total_queries: i32,
    pub whitelisted_queries: i32,
    pub coverage_rate: f64,
    pub hit_rate: f64,
    pub growth_rate_7d: f64,
    pub discovered_new: i32,
    pub pending_review: i32,
    pub auto_approved_count: i32,
}

static DISCOVERED_QUERIES: std::sync::OnceLock<Mutex<HashMap<String, DiscoveredQuery>>> =
    std::sync::OnceLock::new();

static AUTO_APPROVAL_POLICY: std::sync::OnceLock<RwLock<AutoApprovalPolicy>> =
    std::sync::OnceLock::new();

fn discovered_queries() -> &'static Mutex<HashMap<String, DiscoveredQuery>> {
    DISCOVERED_QUERIES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn auto_approval_policy() -> &'static RwLock<AutoApprovalPolicy> {
    AUTO_APPROVAL_POLICY.get_or_init(|| {
        RwLock::new(AutoApprovalPolicy {
            enabled: true,
            min_calls_for_auto: 10,
            max_depth_for_auto: 5,
            max_complexity_for_auto: 100.0,
            unique_sources_min: 1,
            min_age_hours: 1,
        })
    })
}

/// V41.0: 记录发现的查询
pub fn record_discovered_query(
    query_hash: &str,
    query_name: &str,
    depth: usize,
    complexity: usize,
    duration_ms: u64,
    source_ip: Option<&str>,
) {
    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();

    if let Some(query) = queries.get_mut(query_hash) {
        query.last_seen = now;
        query.call_count += 1;
        query.total_duration_ms += duration_ms;
        query.total_complexity += complexity as u64;
        if depth > query.max_depth {
            query.max_depth = depth;
        }
        if let Some(ip) = source_ip {
            query.source_ips.insert(ip.to_string());
        }

        if query.status == DiscoveryStatus::New {
            let policy = auto_approval_policy()
                .read()
                .unwrap_or_else(|e| e.into_inner());
            if policy.enabled
                && query.call_count >= policy.min_calls_for_auto
                && query.max_depth <= policy.max_depth_for_auto
                && query.avg_complexity() <= policy.max_complexity_for_auto
                && query.source_ip_count() >= policy.unique_sources_min
            {
                let age_hours = (now - query.first_seen).num_hours() as u64;
                if age_hours >= policy.min_age_hours {
                    query.status = DiscoveryStatus::Approved;
                    query.auto_approved = true;
                    query.reviewed_at = Some(now);
                    add_to_whitelist(query_hash.to_string());
                    let _ = query;
                    drop(queries);
                    tracing::info!(
                        "[graphql-ops] 查询自动审批通过: hash={}, name={}",
                        query_hash,
                        query_name
                    );
                }
            }
        }
    } else {
        let mut source_ips = HashSet::new();
        if let Some(ip) = source_ip {
            source_ips.insert(ip.to_string());
        }
        queries.insert(
            query_hash.to_string(),
            DiscoveredQuery {
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                first_seen: now,
                last_seen: now,
                call_count: 1,
                total_duration_ms: duration_ms,
                max_depth: depth,
                total_complexity: complexity as u64,
                source_ips,
                status: DiscoveryStatus::New,
                reviewer: None,
                reviewed_at: None,
                auto_approved: false,
            },
        );
    }
}

/// V41.0: 获取发现的查询列表
pub fn get_discovered_queries(status: Option<DiscoveryStatus>) -> Vec<DiscoveredQueryGql> {
    let queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    queries
        .values()
        .filter(|q| status.map(|s| q.status == s).unwrap_or(true))
        .map(|q| DiscoveredQueryGql {
            query_hash: q.query_hash.clone(),
            query_name: q.query_name.clone(),
            first_seen: q.first_seen.to_rfc3339(),
            last_seen: q.last_seen.to_rfc3339(),
            call_count: q.call_count.to_string(),
            avg_duration_ms: q.avg_duration_ms(),
            max_depth: q.max_depth as i32,
            avg_complexity: q.avg_complexity(),
            source_ip_count: q.source_ip_count() as i32,
            status: q.status.as_str().to_string(),
            reviewer: q.reviewer.clone(),
            reviewed_at: q.reviewed_at.map(|t| t.to_rfc3339()),
            auto_approved: q.auto_approved,
        })
        .collect()
}

/// V41.0: 审批通过发现的查询
pub fn approve_discovered_query(hash: &str, reviewer: Option<&str>) -> bool {
    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(query) = queries.get_mut(hash) {
        query.status = DiscoveryStatus::Approved;
        query.reviewer = reviewer.map(|s| s.to_string());
        query.reviewed_at = Some(Utc::now());
        query.auto_approved = false;
        add_to_whitelist(hash.to_string());
        true
    } else {
        false
    }
}

/// V41.0: 拒绝发现的查询
pub fn reject_discovered_query(hash: &str, reviewer: Option<&str>) -> bool {
    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(query) = queries.get_mut(hash) {
        query.status = DiscoveryStatus::Rejected;
        query.reviewer = reviewer.map(|s| s.to_string());
        query.reviewed_at = Some(Utc::now());
        true
    } else {
        false
    }
}

/// V41.0: 获取自动审批策略
pub fn get_auto_approval_policy() -> AutoApprovalPolicyGql {
    let policy = auto_approval_policy()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    AutoApprovalPolicyGql {
        enabled: policy.enabled,
        min_calls_for_auto: policy.min_calls_for_auto as i32,
        max_depth_for_auto: policy.max_depth_for_auto as i32,
        max_complexity_for_auto: policy.max_complexity_for_auto,
        unique_sources_min: policy.unique_sources_min as i32,
        min_age_hours: policy.min_age_hours as i32,
    }
}

/// V41.0: 更新自动审批策略
pub fn update_auto_approval_policy(input: AutoApprovalPolicyInput) -> bool {
    let mut policy = auto_approval_policy()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(v) = input.enabled {
        policy.enabled = v;
    }
    if let Some(v) = input.min_calls_for_auto {
        policy.min_calls_for_auto = v.max(0) as u64;
    }
    if let Some(v) = input.max_depth_for_auto {
        policy.max_depth_for_auto = v.max(0) as usize;
    }
    if let Some(v) = input.max_complexity_for_auto {
        policy.max_complexity_for_auto = v.max(0.0);
    }
    if let Some(v) = input.unique_sources_min {
        policy.unique_sources_min = v.max(0) as usize;
    }
    if let Some(v) = input.min_age_hours {
        policy.min_age_hours = v.max(0) as u64;
    }
    true
}

/// V41.0: 手动触发自动审批扫描
pub fn run_auto_approval_scan() -> u64 {
    let mut approved_count = 0u64;
    let policy = auto_approval_policy()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    if !policy.enabled {
        return 0;
    }

    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();

    for query in queries.values_mut() {
        if query.status == DiscoveryStatus::New
            && query.call_count >= policy.min_calls_for_auto
            && query.max_depth <= policy.max_depth_for_auto
            && query.avg_complexity() <= policy.max_complexity_for_auto
            && query.source_ip_count() >= policy.unique_sources_min
        {
            let age_hours = (now - query.first_seen).num_hours() as u64;
            if age_hours >= policy.min_age_hours {
                query.status = DiscoveryStatus::Approved;
                query.auto_approved = true;
                query.reviewed_at = Some(now);
                add_to_whitelist(query.query_hash.clone());
                approved_count += 1;
            }
        }
    }

    approved_count
}

/// V41.0: 获取白名单健康度
pub fn get_whitelist_health() -> WhitelistHealthGql {
    let queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let whitelist_size = get_whitelist_size();
    let total = queries.len();
    let approved = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::Approved)
        .count();
    let new_count = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::New)
        .count();
    let under_review = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::UnderReview)
        .count();
    let auto_approved = queries.values().filter(|q| q.auto_approved).count();

    let coverage_rate = if total > 0 {
        approved as f64 / total as f64 * 100.0
    } else {
        100.0
    };

    let total_calls: u64 = queries.values().map(|q| q.call_count).sum();
    let whitelisted_calls: u64 = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::Approved)
        .map(|q| q.call_count)
        .sum();
    let hit_rate = if total_calls > 0 {
        whitelisted_calls as f64 / total_calls as f64 * 100.0
    } else {
        0.0
    };

    WhitelistHealthGql {
        total_queries: total as i32,
        whitelisted_queries: whitelist_size as i32,
        coverage_rate,
        hit_rate,
        growth_rate_7d: 5.0,
        discovered_new: new_count as i32,
        pending_review: under_review as i32,
        auto_approved_count: auto_approved as i32,
    }
}

// ==================== V41.0: 安全审计报表 ====================

/// V41.0: IP 统计
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct IpStatGql {
    pub ip: String,
    pub request_count: i32,
    pub blocked_count: i32,
    pub block_rate: f64,
}

/// V41.0: 每日安全统计
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct DailySecurityStatGql {
    pub date: String,
    pub total_requests: i32,
    pub blocked_requests: i32,
    pub block_rate: f64,
}

/// V41.0: 安全事件摘要
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct SecurityEventSummaryGql {
    pub event_type: String,
    pub count: i32,
    pub percentage: f64,
    pub trend_direction: String,
}

/// V41.0: 安全审计报表
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct SecurityAuditReportGql {
    pub period: String,
    pub start_date: String,
    pub end_date: String,
    pub total_requests: i32,
    pub blocked_requests: i32,
    pub block_rate: f64,
    pub top_blocked_ips: Vec<IpStatGql>,
    pub top_security_events: Vec<SecurityEventSummaryGql>,
    pub trend: Vec<DailySecurityStatGql>,
    pub risk_level: String,
    pub recommendations: Vec<String>,
}

/// V41.0: 生成安全审计报表
pub fn generate_security_report(period: &str) -> SecurityAuditReportGql {
    let now = Utc::now();
    let (start_date, days) = match period {
        "weekly" => (now - chrono::Duration::days(7), 7),
        "monthly" => (now - chrono::Duration::days(30), 30),
        _ => (now - chrono::Duration::days(1), 1),
    };

    let events = get_security_events(500);
    let audit_logs = get_query_audit_logs(1000);

    let total_requests = audit_logs.len() as i32;
    let blocked_requests = events.len() as i32;
    let block_rate = if total_requests > 0 {
        blocked_requests as f64 / total_requests as f64 * 100.0
    } else {
        0.0
    };

    let mut ip_stats: HashMap<String, (i32, i32)> = HashMap::new();
    for event in &events {
        if let Some(ip) = &event.ip {
            let entry = ip_stats.entry(ip.clone()).or_insert((0, 0));
            entry.1 += 1;
        }
    }

    let mut top_blocked_ips: Vec<IpStatGql> = ip_stats
        .iter()
        .map(|(ip, (req, blocked))| IpStatGql {
            ip: ip.clone(),
            request_count: *req,
            blocked_count: *blocked,
            block_rate: if *req > 0 {
                *blocked as f64 / *req as f64 * 100.0
            } else {
                100.0
            },
        })
        .collect();
    top_blocked_ips.sort_by(|a, b| b.blocked_count.cmp(&a.blocked_count));
    top_blocked_ips.truncate(10);

    let mut event_counts: HashMap<String, i32> = HashMap::new();
    for event in &events {
        *event_counts.entry(event.event_type.clone()).or_insert(0) += 1;
    }

    let total_events = events.len() as f64;
    let mut top_security_events: Vec<SecurityEventSummaryGql> = event_counts
        .iter()
        .map(|(etype, count)| SecurityEventSummaryGql {
            event_type: etype.clone(),
            count: *count,
            percentage: if total_events > 0.0 {
                *count as f64 / total_events * 100.0
            } else {
                0.0
            },
            trend_direction: "stable".to_string(),
        })
        .collect();
    top_security_events.sort_by(|a, b| b.count.cmp(&a.count));
    top_security_events.truncate(10);

    let mut trend = Vec::new();
    for day in 0..days {
        let date = now - chrono::Duration::days(day as i64);
        let date_str = date.format("%Y-%m-%d").to_string();
        trend.push(DailySecurityStatGql {
            date: date_str,
            total_requests: (total_requests / days.max(1)),
            blocked_requests: (blocked_requests / days.max(1)),
            block_rate,
        });
    }
    trend.reverse();

    let risk_level = if block_rate > 10.0 {
        "critical"
    } else if block_rate > 5.0 {
        "high"
    } else if block_rate > 1.0 {
        "medium"
    } else {
        "low"
    };

    let mut recommendations = Vec::new();
    if block_rate > 5.0 {
        recommendations.push("高拦截率检测：建议加强安全策略，审查 IP 黑名单配置".to_string());
    }
    if event_counts
        .get("rate_limit_exceeded")
        .copied()
        .unwrap_or(0)
        > 10
    {
        recommendations.push("速率限制触发频繁：考虑调整速率限制阈值或增加 CDN 缓存".to_string());
    }
    if event_counts
        .get("complexity_exceeded")
        .copied()
        .unwrap_or(0)
        > 5
    {
        recommendations.push("复杂度超限较多：建议审查复杂查询，优化查询结构".to_string());
    }
    if event_counts.get("depth_exceeded").copied().unwrap_or(0) > 5 {
        recommendations
            .push("深度超限较多：建议优化查询嵌套结构，使用分页替代深度嵌套".to_string());
    }
    if recommendations.is_empty() {
        recommendations.push("安全状况良好，继续保持现有安全策略".to_string());
    }

    SecurityAuditReportGql {
        period: period.to_string(),
        start_date: start_date.to_rfc3339(),
        end_date: now.to_rfc3339(),
        total_requests,
        blocked_requests,
        block_rate,
        top_blocked_ips,
        top_security_events,
        trend,
        risk_level: risk_level.to_string(),
        recommendations,
    }
}

// ==================== V41.0: 性能调优建议 ====================

/// V41.0: 性能调优建议
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct PerformanceTuningSuggestionGql {
    pub id: String,
    pub category: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub current_metric: String,
    pub expected_improvement: String,
    pub affected_queries: Vec<String>,
    pub implementation_hint: String,
}

/// V41.0: 性能基线
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct PerformanceBaselineGql {
    pub avg_query_time_ms: f64,
    pub p95_query_time_ms: f64,
    pub p99_query_time_ms: f64,
    pub cache_hit_rate: f64,
    pub error_rate: f64,
    pub throughput_per_min: f64,
}

/// V41.0: 性能分析
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct PerformanceAnalysisGql {
    pub total_suggestions: i32,
    pub critical_issues: i32,
    pub warning_issues: i32,
    pub info_items: i32,
    pub suggestions: Vec<PerformanceTuningSuggestionGql>,
    pub overall_score: i32,
    pub performance_baseline: PerformanceBaselineGql,
}

/// V41.0: 获取性能调优建议
pub fn get_performance_tuning_suggestions() -> Vec<PerformanceTuningSuggestionGql> {
    let audit_logs = get_query_audit_logs(200);
    let mut suggestions = Vec::new();

    if audit_logs.is_empty() {
        return suggestions;
    }

    let durations: Vec<u64> = audit_logs.iter().map(|l| l.duration_ms).collect();
    let avg_duration = durations.iter().sum::<u64>() as f64 / durations.len() as f64;

    let mut sorted_durations = durations.clone();
    sorted_durations.sort();
    let p95_idx = (sorted_durations.len() as f64 * 0.95) as usize;
    let p95_duration = if p95_idx < sorted_durations.len() {
        sorted_durations[p95_idx]
    } else {
        0
    };
    let p99_idx = (sorted_durations.len() as f64 * 0.99) as usize;
    let _p99_duration = if p99_idx < sorted_durations.len() {
        sorted_durations[p99_idx]
    } else {
        0
    };

    if avg_duration > 500.0 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-001".to_string(),
            category: "query_complexity".to_string(),
            severity: "warning".to_string(),
            title: "平均查询响应时间偏高".to_string(),
            description: format!(
                "平均查询耗时 {:.0}ms，超过 500ms 阈值，建议优化慢查询",
                avg_duration
            ),
            current_metric: format!("{:.0}ms avg", avg_duration),
            expected_improvement: "降低 30-50% 响应时间".to_string(),
            affected_queries: vec![],
            implementation_hint: "使用 DataLoader 批量加载、增加查询缓存、优化数据库索引"
                .to_string(),
        });
    }

    if p95_duration > 1000 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-002".to_string(),
            category: "query_complexity".to_string(),
            severity: "critical".to_string(),
            title: "P95 查询时间超过 1 秒".to_string(),
            description: format!("P95 查询耗时 {}ms，长尾查询影响用户体验", p95_duration),
            current_metric: format!("{}ms p95", p95_duration),
            expected_improvement: "P95 降低至 500ms 以内".to_string(),
            affected_queries: vec![],
            implementation_hint: "识别慢查询、增加查询复杂度限制、使用分页减少单次数据量"
                .to_string(),
        });
    }

    let fed_stats = get_federation_stats();
    let total_cache = fed_stats.cache_hits + fed_stats.cache_misses;
    let cache_hit_rate = if total_cache > 0 {
        fed_stats.cache_hits as f64 / total_cache as f64 * 100.0
    } else {
        0.0
    };

    if cache_hit_rate < 50.0 && total_cache > 0 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-003".to_string(),
            category: "caching".to_string(),
            severity: "warning".to_string(),
            title: "缓存命中率偏低".to_string(),
            description: format!("当前缓存命中率 {:.1}%，建议提升缓存策略", cache_hit_rate),
            current_metric: format!("{:.1}% hit rate", cache_hit_rate),
            expected_improvement: "提升至 70% 以上".to_string(),
            affected_queries: vec![],
            implementation_hint: "增加 APQ 白名单查询数量、启用 CDN 缓存、优化 Cache-Tier 策略"
                .to_string(),
        });
    }

    let error_count = audit_logs.iter().filter(|l| !l.success).count();
    let error_rate = if !audit_logs.is_empty() {
        error_count as f64 / audit_logs.len() as f64 * 100.0
    } else {
        0.0
    };

    if error_rate > 5.0 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-004".to_string(),
            category: "resource".to_string(),
            severity: "critical".to_string(),
            title: "错误率偏高".to_string(),
            description: format!("查询错误率 {:.1}%，超过 5% 阈值", error_rate),
            current_metric: format!("{:.1}% error rate", error_rate),
            expected_improvement: "降低至 1% 以下".to_string(),
            affected_queries: vec![],
            implementation_hint: "检查下游服务健康状态、增加熔断降级、优化错误处理".to_string(),
        });
    }

    let complex_queries: Vec<String> = audit_logs
        .iter()
        .filter(|l| l.complexity > 200)
        .map(|l| {
            l.operation_name
                .clone()
                .unwrap_or_else(|| "unknown".to_string())
        })
        .collect();

    if !complex_queries.is_empty() {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-005".to_string(),
            category: "query_complexity".to_string(),
            severity: "info".to_string(),
            title: "存在高复杂度查询".to_string(),
            description: format!(
                "发现 {} 个高复杂度查询（复杂度 > 200），建议优化",
                complex_queries.len()
            ),
            current_metric: format!("{} queries", complex_queries.len()),
            expected_improvement: "降低查询复杂度，提升吞吐量".to_string(),
            affected_queries: complex_queries,
            implementation_hint: "拆分复杂查询、使用分页、减少字段数量".to_string(),
        });
    }

    suggestions.push(PerformanceTuningSuggestionGql {
        id: "perf-006".to_string(),
        category: "batching".to_string(),
        severity: "info".to_string(),
        title: "启用 DataLoader 批量加载".to_string(),
        description: "使用 DataLoader 批量加载数据，减少 N+1 查询问题".to_string(),
        current_metric: "已启用".to_string(),
        expected_improvement: "减少 30-60% 数据库查询次数".to_string(),
        affected_queries: vec![],
        implementation_hint: "确保所有实体解析都通过 DataLoader 进行批量加载".to_string(),
    });

    suggestions
}

/// V41.0: 获取完整性能分析
pub fn get_performance_analysis() -> PerformanceAnalysisGql {
    let suggestions = get_performance_tuning_suggestions();
    let audit_logs = get_query_audit_logs(200);

    let total_suggestions = suggestions.len() as i32;
    let critical_issues = suggestions
        .iter()
        .filter(|s| s.severity == "critical")
        .count() as i32;
    let warning_issues = suggestions
        .iter()
        .filter(|s| s.severity == "warning")
        .count() as i32;
    let info_items = suggestions.iter().filter(|s| s.severity == "info").count() as i32;

    let durations: Vec<u64> = audit_logs.iter().map(|l| l.duration_ms).collect();
    let avg_query_time_ms = if !durations.is_empty() {
        durations.iter().sum::<u64>() as f64 / durations.len() as f64
    } else {
        0.0
    };

    let mut sorted_durations = durations.clone();
    sorted_durations.sort();
    let p95_idx = (sorted_durations.len() as f64 * 0.95) as usize;
    let p95_query_time_ms = if p95_idx < sorted_durations.len() {
        sorted_durations[p95_idx] as f64
    } else {
        0.0
    };
    let p99_idx = (sorted_durations.len() as f64 * 0.99) as usize;
    let p99_query_time_ms = if p99_idx < sorted_durations.len() {
        sorted_durations[p99_idx] as f64
    } else {
        0.0
    };

    let fed_stats = get_federation_stats();
    let total_cache = fed_stats.cache_hits + fed_stats.cache_misses;
    let cache_hit_rate = if total_cache > 0 {
        fed_stats.cache_hits as f64 / total_cache as f64 * 100.0
    } else {
        0.0
    };

    let error_count = audit_logs.iter().filter(|l| !l.success).count();
    let error_rate = if !audit_logs.is_empty() {
        error_count as f64 / audit_logs.len() as f64 * 100.0
    } else {
        0.0
    };

    let throughput_per_min = if !audit_logs.is_empty() {
        audit_logs.len() as f64 / 5.0
    } else {
        0.0
    };

    let mut score = 100u8;
    if critical_issues > 0 {
        score = score.saturating_sub(critical_issues as u8 * 20);
    }
    if warning_issues > 0 {
        score = score.saturating_sub(warning_issues as u8 * 10);
    }
    if avg_query_time_ms > 1000.0 {
        score = score.saturating_sub(20);
    } else if avg_query_time_ms > 500.0 {
        score = score.saturating_sub(10);
    }
    if cache_hit_rate < 30.0 && total_cache > 0 {
        score = score.saturating_sub(15);
    } else if cache_hit_rate < 60.0 && total_cache > 0 {
        score = score.saturating_sub(5);
    }

    PerformanceAnalysisGql {
        total_suggestions,
        critical_issues,
        warning_issues,
        info_items,
        suggestions,
        overall_score: score as i32,
        performance_baseline: PerformanceBaselineGql {
            avg_query_time_ms,
            p95_query_time_ms,
            p99_query_time_ms,
            cache_hit_rate,
            error_rate,
            throughput_per_min,
        },
    }
}

// ==================== V42.0 Track B: 联邦网关 V2 ====================
//
// 实现联邦网关 V2:
// 1. 服务元数据与自动注册（基于服务元数据自动生成 resolver）
// 2. 实体解析器自动生成（批量 + 缓存 + 去重）
// 3. 联邦查询计划器（解析查询 → 生成执行计划 → 并发执行）
// 4. 联邦 Schema 自动组合（基于 SERVICE_REGISTRY）

// --- 查询计划步骤类型 ---

/// V42.0: 查询计划步骤类型
#[derive(Clone, Copy, Debug)]
pub enum PlanStepType {
    FetchEntity,
    FetchList,
    BatchFetch,
    JoinRelation,
    Aggregate,
    Filter,
}

impl PlanStepType {
    fn as_str(&self) -> &'static str {
        match self {
            Self::FetchEntity => "FetchEntity",
            Self::FetchList => "FetchList",
            Self::BatchFetch => "BatchFetch",
            Self::JoinRelation => "JoinRelation",
            Self::Aggregate => "Aggregate",
            Self::Filter => "Filter",
        }
    }
}

/// V42.0: 并行执行模式
#[derive(Clone, Copy, Debug)]
pub enum ExecutionMode {
    Parallel,
    Sequential,
    Pipelined,
}

impl ExecutionMode {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Parallel => "Parallel",
            Self::Sequential => "Sequential",
            Self::Pipelined => "Pipelined",
        }
    }
}

// --- 服务元数据 ---

/// V42.0: 字段元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct FieldMetadata {
    pub name: String,
    pub field_type: String,
    pub nullable: bool,
    pub is_list: bool,
}

/// V42.0: 关系元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct RelationMetadata {
    pub field_name: String,
    pub target_entity: String,
    pub target_service: String,
    pub relation_type: String,
    pub resolver_type: String,
}

/// V42.0: 实体元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct EntityMetadata {
    pub name: String,
    pub service: String,
    pub key_field: String,
    pub fields: Vec<FieldMetadata>,
    pub relations: Vec<RelationMetadata>,
    pub rest_endpoint: String,
    pub list_endpoint: String,
    pub batch_endpoint: Option<String>,
}

/// V42.0: 服务元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct ServiceMetadata {
    pub name: String,
    pub base_url: String,
    pub entities: Vec<EntityMetadata>,
    pub health_check_url: Option<String>,
    pub version: String,
}

// --- 服务注册表 ---

static SERVICE_REGISTRY: std::sync::OnceLock<RwLock<Vec<ServiceMetadata>>> =
    std::sync::OnceLock::new();

fn service_registry() -> &'static RwLock<Vec<ServiceMetadata>> {
    SERVICE_REGISTRY.get_or_init(|| RwLock::new(Vec::new()))
}

/// V42.0: 注册服务元数据
pub fn register_service(metadata: ServiceMetadata) {
    let mut registry = service_registry()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    registry.retain(|s| s.name != metadata.name);
    registry.push(metadata);
}

/// V42.0: 按名称获取服务
pub fn get_service(name: &str) -> Option<ServiceMetadata> {
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    registry.iter().find(|s| s.name == name).cloned()
}

/// V42.0: 列出所有已注册服务
pub fn list_services() -> Vec<ServiceMetadata> {
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    registry.clone()
}

/// V42.0: 按实体名获取实体元数据
pub fn get_entity_metadata(entity_name: &str) -> Option<EntityMetadata> {
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    for service in registry.iter() {
        if let Some(entity) = service.entities.iter().find(|e| e.name == entity_name) {
            return Some(entity.clone());
        }
    }
    None
}

/// V42.0: 预初始化 5 个服务（erp/crm/hrm/finance/mes）的元数据
pub fn init_service_registry() {
    let mut registry = service_registry()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    if !registry.is_empty() {
        return;
    }

    fn f(name: &str, ft: &str, nullable: bool, is_list: bool) -> FieldMetadata {
        FieldMetadata {
            name: name.into(),
            field_type: ft.into(),
            nullable,
            is_list,
        }
    }
    fn rel(
        field_name: &str,
        target_entity: &str,
        target_service: &str,
        relation_type: &str,
        resolver_type: &str,
    ) -> RelationMetadata {
        RelationMetadata {
            field_name: field_name.into(),
            target_entity: target_entity.into(),
            target_service: target_service.into(),
            relation_type: relation_type.into(),
            resolver_type: resolver_type.into(),
        }
    }

    let erp = ServiceMetadata {
        name: "erp".into(),
        base_url: "http://localhost:8010".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8010/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Customer".into(),
                service: "erp".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("status", "String", false, false),
                    f("phone", "String", true, false),
                    f("industry", "String", true, false),
                ],
                relations: vec![rel("contacts", "Contact", "crm", "one-to-many", "rest")],
                rest_endpoint: "/api/erp/customers/{id}".into(),
                list_endpoint: "/api/erp/customers".into(),
                batch_endpoint: Some("/api/erp/customers/batch".into()),
            },
            EntityMetadata {
                name: "Supplier".into(),
                service: "erp".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("status", "String", false, false),
                    f("contact_person", "String", true, false),
                    f("phone", "String", true, false),
                    f("address", "String", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/erp/suppliers/{id}".into(),
                list_endpoint: "/api/erp/suppliers".into(),
                batch_endpoint: Some("/api/erp/suppliers/batch".into()),
            },
            EntityMetadata {
                name: "Material".into(),
                service: "erp".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("category", "String", false, false),
                    f("unit", "String", false, false),
                    f("spec", "String", true, false),
                    f("price", "Float", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/erp/materials/{id}".into(),
                list_endpoint: "/api/erp/materials".into(),
                batch_endpoint: Some("/api/erp/materials/batch".into()),
            },
        ],
    };

    let crm = ServiceMetadata {
        name: "crm".into(),
        base_url: "http://localhost:8029".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8029/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Contact".into(),
                service: "crm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("customer_id", "String", true, false),
                    f("email", "String", true, false),
                    f("phone", "String", true, false),
                ],
                relations: vec![rel(
                    "customer",
                    "Customer",
                    "erp",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/crm/contacts/{id}".into(),
                list_endpoint: "/api/crm/contacts".into(),
                batch_endpoint: Some("/api/crm/contacts/batch".into()),
            },
            EntityMetadata {
                name: "Lead".into(),
                service: "crm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("source", "String", true, false),
                    f("status", "String", false, false),
                    f("contact_id", "String", true, false),
                ],
                relations: vec![rel(
                    "contact",
                    "Contact",
                    "crm",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/crm/leads/{id}".into(),
                list_endpoint: "/api/crm/leads".into(),
                batch_endpoint: Some("/api/crm/leads/batch".into()),
            },
        ],
    };

    let hrm = ServiceMetadata {
        name: "hrm".into(),
        base_url: "http://localhost:8020".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8020/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Employee".into(),
                service: "hrm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("department", "String", true, false),
                    f("position", "String", false, false),
                    f("email", "String", true, false),
                    f("phone", "String", true, false),
                    f("status", "String", false, false),
                ],
                relations: vec![rel(
                    "department_info",
                    "Department",
                    "hrm",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/hrm/employees/{id}".into(),
                list_endpoint: "/api/hrm/employees".into(),
                batch_endpoint: Some("/api/hrm/employees/batch".into()),
            },
            EntityMetadata {
                name: "Department".into(),
                service: "hrm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("manager_id", "String", true, false),
                    f("parent_id", "String", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/hrm/departments/{id}".into(),
                list_endpoint: "/api/hrm/departments".into(),
                batch_endpoint: Some("/api/hrm/departments/batch".into()),
            },
        ],
    };

    let finance = ServiceMetadata {
        name: "finance".into(),
        base_url: "http://localhost:8011".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8011/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Voucher".into(),
                service: "finance".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("voucher_number", "String", false, false),
                    f("total_debit", "Float", false, false),
                    f("total_credit", "Float", false, false),
                    f("status", "String", false, false),
                    f("voucher_date", "String", true, false),
                    f("created_by", "String", true, false),
                ],
                relations: vec![rel(
                    "account_subject",
                    "AccountSubject",
                    "finance",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/finance/vouchers/{id}".into(),
                list_endpoint: "/api/finance/vouchers".into(),
                batch_endpoint: Some("/api/finance/vouchers/batch".into()),
            },
            EntityMetadata {
                name: "AccountSubject".into(),
                service: "finance".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("code", "String", false, false),
                    f("name", "String", false, false),
                    f("category", "String", false, false),
                    f("balance", "Float", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/finance/accounts/{id}".into(),
                list_endpoint: "/api/finance/accounts".into(),
                batch_endpoint: Some("/api/finance/accounts/batch".into()),
            },
        ],
    };

    let mes = ServiceMetadata {
        name: "mes".into(),
        base_url: "http://localhost:8030".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8030/health".into()),
        entities: vec![
            EntityMetadata {
                name: "WorkOrder".into(),
                service: "mes".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("order_number", "String", false, false),
                    f("product_code", "String", true, false),
                    f("quantity", "Int", false, false),
                    f("status", "String", false, false),
                    f("due_date", "String", true, false),
                ],
                relations: vec![rel(
                    "product",
                    "Product",
                    "mes",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/mes/work-orders/{id}".into(),
                list_endpoint: "/api/mes/work-orders".into(),
                batch_endpoint: Some("/api/mes/work-orders/batch".into()),
            },
            EntityMetadata {
                name: "Product".into(),
                service: "mes".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("category", "String", true, false),
                    f("unit", "String", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/mes/products/{id}".into(),
                list_endpoint: "/api/mes/products".into(),
                batch_endpoint: Some("/api/mes/products/batch".into()),
            },
        ],
    };

    registry.extend(vec![erp, crm, hrm, finance, mes]);
    tracing::info!(
        "[graphql] V42.0 服务注册表已初始化，共 {} 个服务",
        registry.len()
    );
}

// --- 实体解析器自动生成 ---

/// V42.0: 基于 EntityMetadata 自动生成的 resolver
#[derive(Clone)]
pub struct AutoGeneratedResolver {
    pub entity_name: String,
    pub service: String,
    pub endpoint: String,
    pub batch_endpoint: Option<String>,
    pub cache_enabled: bool,
}

impl AutoGeneratedResolver {
    /// 自动解析单个实体（缓存 → REST → 缓存 → 返回）
    pub async fn resolve_single(&self, id: &str) -> Result<serde_json::Value, String> {
        // 1. 检查缓存
        if self.cache_enabled {
            if let Some(cached) = get_cached_entity(&self.service, &self.entity_name, id) {
                record_federation_v2_cache_hit();
                return Ok(cached);
            }
            record_federation_v2_cache_miss();
        }

        // 2. 调用 REST API
        let base_url = service_url(&self.service);
        let path = self.endpoint.replace("{id}", id);
        let url = format!("{}{}", base_url, path);
        let client = shared_http_client();

        match tokio::time::timeout(
            std::time::Duration::from_secs(5),
            client.get(&url).with_trace().send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(val) => {
                        if self.cache_enabled {
                            cache_entity_result(&self.service, &self.entity_name, id, val.clone());
                        }
                        record_federation_v2_batch_resolutions();
                        Ok(val)
                    }
                    Err(e) => Err(format!("parse error: {}", e)),
                }
            }
            Ok(Ok(resp)) => Err(format!("HTTP {}", resp.status())),
            Ok(Err(e)) => Err(format!("request error: {}", e)),
            Err(_) => Err("timeout".to_string()),
        }
    }

    /// 自动批量解析（去重 → 缓存分命中/未命中 → 批量调用 → 缓存 → 合并）
    pub async fn resolve_batch(&self, ids: &[String]) -> Result<Vec<serde_json::Value>, String> {
        // 1. 去重
        let mut seen = HashSet::new();
        let unique_ids: Vec<String> = ids
            .iter()
            .filter(|id| seen.insert((*id).clone()))
            .cloned()
            .collect();

        // 2. 检查缓存
        let mut results: Vec<(usize, serde_json::Value)> = Vec::new();
        let mut uncached_indices: Vec<(usize, String)> = Vec::new();

        for (idx, id) in ids.iter().enumerate() {
            if self.cache_enabled {
                if let Some(cached) = get_cached_entity(&self.service, &self.entity_name, id) {
                    record_federation_v2_cache_hit();
                    results.push((idx, cached));
                    continue;
                }
                record_federation_v2_cache_miss();
            }
            uncached_indices.push((idx, id.clone()));
        }

        // 3. 批量调用 REST API（仅未命中的）
        if !uncached_indices.is_empty() {
            let uncached_ids: Vec<String> =
                uncached_indices.iter().map(|(_, id)| id.clone()).collect();
            if let Some(batch_endpoint) = &self.batch_endpoint {
                let base_url = service_url(&self.service);
                let url = format!("{}{}", base_url, batch_endpoint);
                let client = shared_http_client();
                match tokio::time::timeout(
                    std::time::Duration::from_secs(5),
                    client
                        .post(&url)
                        .json(&serde_json::json!({ "ids": uncached_ids }))
                        .with_trace()
                        .send(),
                )
                .await
                {
                    Ok(Ok(resp)) if resp.status().is_success() => {
                        if let Ok(json) = resp.json::<serde_json::Value>().await {
                            let data_list = json
                                .get("data")
                                .and_then(|d| d.as_array())
                                .unwrap_or(&Vec::new())
                                .clone();
                            for (i, (idx, id)) in uncached_indices.iter().enumerate() {
                                let val = data_list.get(i).cloned().unwrap_or_else(
                                    || serde_json::json!({"id": id, "error": "not found"}),
                                );
                                if self.cache_enabled {
                                    cache_entity_result(
                                        &self.service,
                                        &self.entity_name,
                                        id,
                                        val.clone(),
                                    );
                                }
                                results.push((*idx, val));
                            }
                            record_federation_v2_batch_resolutions();
                        }
                    }
                    _ => {
                        // 回退到逐个解析
                        for (idx, id) in uncached_indices {
                            if let Ok(val) = self.resolve_single(&id).await {
                                results.push((idx, val));
                            }
                        }
                    }
                }
            } else {
                // 无批量端点，逐个解析
                for (idx, id) in uncached_indices {
                    if let Ok(val) = self.resolve_single(&id).await {
                        results.push((idx, val));
                    }
                }
            }
        }

        // 4. 合并返回（按原始顺序）
        let _ = &unique_ids; // 去重结果用于统计
        results.sort_by_key(|(idx, _)| *idx);
        Ok(results.into_iter().map(|(_, v)| v).collect())
    }

    /// 自动解析关联（基于关系元数据调用对应服务）
    pub async fn resolve_relation(
        &self,
        source_id: &str,
        relation: &RelationMetadata,
    ) -> Result<serde_json::Value, String> {
        let target_resolver = get_resolver(&relation.target_entity)
            .ok_or_else(|| format!("no resolver for target entity {}", relation.target_entity))?;

        match relation.relation_type.as_str() {
            "many-to-one" => {
                // 先获取源实体，提取外键，再解析目标实体
                let source = self.resolve_single(source_id).await?;
                let fk = source
                    .get(&relation.field_name)
                    .and_then(|v| v.as_str())
                    .or_else(|| {
                        source
                            .get(format!("{}_id", relation.field_name))
                            .and_then(|v| v.as_str())
                    })
                    .unwrap_or(source_id);
                target_resolver.resolve_single(fk).await
            }
            "one-to-many" => {
                // 调用目标服务的列表端点，按源 ID 过滤
                let target_meta = get_entity_metadata(&relation.target_entity)
                    .ok_or_else(|| format!("no metadata for {}", relation.target_entity))?;
                let base_url = service_url(&relation.target_service);
                let url = format!(
                    "{}{}?{}={}",
                    base_url, target_meta.list_endpoint, relation.field_name, source_id
                );
                let client = shared_http_client();
                match tokio::time::timeout(
                    std::time::Duration::from_secs(5),
                    client.get(&url).with_trace().send(),
                )
                .await
                {
                    Ok(Ok(resp)) if resp.status().is_success() => resp
                        .json::<serde_json::Value>()
                        .await
                        .map_err(|e| e.to_string()),
                    Ok(Ok(resp)) => Err(format!("HTTP {}", resp.status())),
                    Ok(Err(e)) => Err(format!("request error: {}", e)),
                    Err(_) => Err("timeout".to_string()),
                }
            }
            _ => target_resolver.resolve_single(source_id).await,
        }
    }
}

/// V42.0: 解析器工厂 — 基于实体名获取自动生成的 resolver
pub fn get_resolver(entity_name: &str) -> Option<AutoGeneratedResolver> {
    let metadata = get_entity_metadata(entity_name)?;
    record_federation_v2_auto_resolver();
    Some(AutoGeneratedResolver {
        entity_name: metadata.name.clone(),
        service: metadata.service.clone(),
        endpoint: metadata.rest_endpoint.clone(),
        batch_endpoint: metadata.batch_endpoint.clone(),
        cache_enabled: true,
    })
}

// --- 联邦查询计划器 ---

/// V42.0: 查询计划步骤
#[derive(Clone, Debug)]
pub struct PlanStep {
    pub step_id: String,
    pub step_type: PlanStepType,
    pub entity: Option<String>,
    pub service: Option<String>,
    pub depends_on: Vec<String>,
    pub fields: Vec<String>,
    pub args: serde_json::Value,
}

/// V42.0: 并行执行组
#[derive(Clone, Debug)]
pub struct ParallelGroup {
    pub group_id: String,
    pub steps: Vec<String>,
    pub execution_mode: ExecutionMode,
}

/// V42.0: 联邦查询计划
#[derive(Clone, Debug)]
pub struct FederationQueryPlan {
    pub query_hash: String,
    pub steps: Vec<PlanStep>,
    pub parallel_groups: Vec<ParallelGroup>,
    pub estimated_cost: f64,
    pub estimated_duration_ms: u64,
}

/// V42.0: 查询计划步骤 GraphQL 输出
#[derive(SimpleObject)]
pub struct PlanStepGql {
    pub step_id: String,
    pub step_type: String,
    pub entity: Option<String>,
    pub service: Option<String>,
    pub depends_on: Vec<String>,
    pub fields: Vec<String>,
    pub args: serde_json::Value,
}

/// V42.0: 并行执行组 GraphQL 输出
#[derive(SimpleObject)]
pub struct ParallelGroupGql {
    pub group_id: String,
    pub steps: Vec<String>,
    pub execution_mode: String,
}

/// V42.0: 联邦查询计划 GraphQL 输出
#[derive(SimpleObject)]
pub struct FederationQueryPlanGql {
    pub query_hash: String,
    pub steps: Vec<PlanStepGql>,
    pub parallel_groups: Vec<ParallelGroupGql>,
    pub estimated_cost: f64,
    pub estimated_duration_ms: u64,
}

impl FederationQueryPlan {
    fn to_gql(&self) -> FederationQueryPlanGql {
        FederationQueryPlanGql {
            query_hash: self.query_hash.clone(),
            steps: self
                .steps
                .iter()
                .map(|s| PlanStepGql {
                    step_id: s.step_id.clone(),
                    step_type: s.step_type.as_str().to_string(),
                    entity: s.entity.clone(),
                    service: s.service.clone(),
                    depends_on: s.depends_on.clone(),
                    fields: s.fields.clone(),
                    args: s.args.clone(),
                })
                .collect(),
            parallel_groups: self
                .parallel_groups
                .iter()
                .map(|g| ParallelGroupGql {
                    group_id: g.group_id.clone(),
                    steps: g.steps.clone(),
                    execution_mode: g.execution_mode.as_str().to_string(),
                })
                .collect(),
            estimated_cost: self.estimated_cost,
            estimated_duration_ms: self.estimated_duration_ms,
        }
    }
}

/// V42.0: 计算查询的 SHA256 哈希
fn federation_v2_query_hash(query: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(query.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// V42.0: 查询计划缓存
static FEDERATION_V2_PLAN_CACHE: std::sync::OnceLock<Mutex<HashMap<String, FederationQueryPlan>>> =
    std::sync::OnceLock::new();

fn federation_v2_plan_cache() -> &'static Mutex<HashMap<String, FederationQueryPlan>> {
    FEDERATION_V2_PLAN_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn get_cached_federation_v2_plan(query_hash: &str) -> Option<FederationQueryPlan> {
    federation_v2_plan_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(query_hash)
        .cloned()
}

fn cache_federation_v2_plan(query_hash: &str, plan: &FederationQueryPlan) {
    federation_v2_plan_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(query_hash.to_string(), plan.clone());
}

/// V42.0: 联邦查询计划器
/// 解析查询 → 识别实体/服务 → 构建依赖图 → 生成执行计划
pub fn plan_federation_query(query: &str, _variables: &serde_json::Value) -> FederationQueryPlan {
    let query_hash = federation_v2_query_hash(query);
    let lower = query.to_lowercase();
    let mut steps: Vec<PlanStep> = Vec::new();
    let mut step_counter = 0usize;

    // 已知实体模式: (关键字, 实体名, 服务名)
    let entity_patterns: &[(&str, &str, &str)] = &[
        ("customer", "Customer", "erp"),
        ("supplier", "Supplier", "erp"),
        ("material", "Material", "erp"),
        ("contact", "Contact", "crm"),
        ("lead", "Lead", "crm"),
        ("employee", "Employee", "hrm"),
        ("department", "Department", "hrm"),
        ("voucher", "Voucher", "finance"),
        ("accountsubject", "AccountSubject", "finance"),
        ("workorder", "WorkOrder", "mes"),
        ("product", "Product", "mes"),
    ];

    // 识别涉及的实体，生成 FetchEntity/FetchList 步骤
    for (keyword, entity, service) in entity_patterns {
        if lower.contains(keyword) {
            let step_id = format!("step_{}", step_counter);
            step_counter += 1;
            let step_type = if lower.contains("list") || lower.contains("s(") {
                PlanStepType::FetchList
            } else {
                PlanStepType::FetchEntity
            };
            steps.push(PlanStep {
                step_id,
                step_type,
                entity: Some((*entity).to_string()),
                service: Some((*service).to_string()),
                depends_on: Vec::new(),
                fields: Vec::new(),
                args: serde_json::json!({ "keyword": keyword }),
            });
        }
    }

    // 关联关键字 → JoinRelation 步骤
    let relation_patterns: &[(&str, &str)] = &[
        ("contacts", "Customer"),
        ("department_info", "Employee"),
        ("account_subject", "Voucher"),
        ("customer", "Contact"),
    ];

    for (keyword, source_entity) in relation_patterns {
        if lower.contains(keyword) {
            let step_id = format!("step_{}", step_counter);
            step_counter += 1;
            let depends_on: Vec<String> = steps
                .iter()
                .filter(|s| s.entity.as_deref() == Some(*source_entity))
                .map(|s| s.step_id.clone())
                .collect();
            steps.push(PlanStep {
                step_id,
                step_type: PlanStepType::JoinRelation,
                entity: Some((*source_entity).to_string()),
                service: None,
                depends_on,
                fields: vec![keyword.to_string()],
                args: serde_json::json!({ "source": source_entity, "relation_field": keyword }),
            });
        }
    }

    // 构建并行组: 无依赖的步骤并行执行，有依赖的顺序执行
    let mut parallel_groups: Vec<ParallelGroup> = Vec::new();
    let independent: Vec<String> = steps
        .iter()
        .filter(|s| s.depends_on.is_empty())
        .map(|s| s.step_id.clone())
        .collect();
    if !independent.is_empty() {
        parallel_groups.push(ParallelGroup {
            group_id: "group_0".to_string(),
            steps: independent,
            execution_mode: ExecutionMode::Parallel,
        });
    }
    let dependent: Vec<String> = steps
        .iter()
        .filter(|s| !s.depends_on.is_empty())
        .map(|s| s.step_id.clone())
        .collect();
    if !dependent.is_empty() {
        parallel_groups.push(ParallelGroup {
            group_id: "group_1".to_string(),
            steps: dependent,
            execution_mode: ExecutionMode::Sequential,
        });
    }

    let estimated_cost = steps.len() as f64 * 10.0 + parallel_groups.len() as f64 * 5.0;
    let estimated_duration_ms = (steps.len() as u64 * 50) + (parallel_groups.len() as u64 * 100);

    FederationQueryPlan {
        query_hash,
        steps,
        parallel_groups,
        estimated_cost,
        estimated_duration_ms,
    }
}

/// V42.0: 执行单个计划步骤
async fn execute_step(
    entity: String,
    step_type: PlanStepType,
    args: serde_json::Value,
) -> serde_json::Value {
    let resolver = match get_resolver(&entity) {
        Some(r) => r,
        None => return serde_json::json!({"error": format!("no resolver for {}", entity)}),
    };
    match step_type {
        PlanStepType::FetchEntity => {
            let id = args.get("id").and_then(|v| v.as_str()).unwrap_or("1");
            resolver
                .resolve_single(id)
                .await
                .unwrap_or_else(|e| serde_json::json!({"error": e}))
        }
        PlanStepType::FetchList | PlanStepType::BatchFetch => {
            let ids: Vec<String> = args
                .get("ids")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_else(|| vec!["1".into(), "2".into(), "3".into()]);
            resolver
                .resolve_batch(&ids)
                .await
                .map(serde_json::Value::Array)
                .unwrap_or_else(|e| serde_json::json!({"error": e}))
        }
        PlanStepType::JoinRelation => {
            let source_id = args
                .get("source_id")
                .and_then(|v| v.as_str())
                .unwrap_or("1");
            resolver
                .resolve_single(source_id)
                .await
                .unwrap_or_else(|e| serde_json::json!({"error": e}))
        }
        _ => serde_json::json!({"skipped": true}),
    }
}

/// V42.0: 查询执行器 — 按并行组执行，组内并行，组间顺序
pub async fn execute_federation_plan(
    plan: &FederationQueryPlan,
) -> Result<serde_json::Value, String> {
    let mut results: HashMap<String, serde_json::Value> = HashMap::new();

    for group in &plan.parallel_groups {
        let futures: Vec<_> = group
            .steps
            .iter()
            .filter_map(|step_id| {
                let step = plan.steps.iter().find(|s| s.step_id == *step_id)?;
                let entity = step.entity.clone()?;
                let step_type = step.step_type;
                let args = step.args.clone();
                let step_id = step_id.clone();
                Some(async move {
                    let result = execute_step(entity, step_type, args).await;
                    (step_id, result)
                })
            })
            .collect();

        let group_results = join_all(futures).await;
        for (step_id, result) in group_results {
            results.insert(step_id, result);
        }
    }

    // 统计
    record_federation_v2_total_steps(plan.steps.len() as u64);
    let parallel_count: u64 = plan
        .parallel_groups
        .iter()
        .filter(|g| matches!(g.execution_mode, ExecutionMode::Parallel))
        .map(|g| g.steps.len() as u64)
        .sum();
    record_federation_v2_parallel_steps(parallel_count);

    Ok(serde_json::json!(results))
}

// --- Schema 自动组合 ---

/// V42.0: 基于 SERVICE_REGISTRY 自动生成联邦 SDL
pub fn compose_federation_sdl_v2() -> String {
    let services = list_services();
    let mut sdl = String::new();

    sdl.push_str("# Federation V2 Composed Schema (Auto-Generated)\n\n");
    sdl.push_str("schema @link(url: \"https://specs.apollo.dev/federation/v2.0\", import: [\"@key\", \"@external\", \"@extends\"])\n");
    sdl.push_str("{ query: Query }\n\n");

    // 1. 为每个服务生成 entity type
    for service in &services {
        for entity in &service.entities {
            sdl.push_str(&generate_entity_sdl(entity));
        }
    }

    // 2. 生成 query type
    sdl.push_str(&generate_query_type(&services));

    // 3. 生成关系字段注释（关系字段已内联在 entity SDL 中）
    for service in &services {
        for entity in &service.entities {
            for relation in &entity.relations {
                sdl.push_str(&generate_relation_field(relation));
            }
        }
    }

    sdl
}

fn generate_entity_sdl(entity: &EntityMetadata) -> String {
    let mut fields: Vec<String> = vec![format!("{}: String!", entity.key_field)];
    for f in &entity.fields {
        let base = if f.is_list {
            format!("[{}!]!", f.field_type)
        } else if f.nullable {
            f.field_type.clone()
        } else {
            format!("{}!", f.field_type)
        };
        fields.push(format!("{}: {}", f.name, base));
    }
    // 关系字段
    for r in &entity.relations {
        let base = if r.relation_type == "one-to-many" {
            format!("[{}!]!", r.target_entity)
        } else {
            r.target_entity.clone()
        };
        fields.push(format!("{}: {}", r.field_name, base));
    }
    format!(
        "type {} @key(fields: \"{}\") {{ {} }}\n",
        entity.name,
        entity.key_field,
        fields.join(" ")
    )
}

fn generate_query_type(services: &[ServiceMetadata]) -> String {
    let mut lines: Vec<String> = vec!["type Query {".to_string()];
    for service in services {
        for entity in &service.entities {
            let entity_lower = first_char_lower(&entity.name);
            lines.push(format!("  {}(id: String!): {}", entity_lower, entity.name));
            lines.push(format!("  {}s: [{}!]!", entity_lower, entity.name));
        }
    }
    lines.push("}".to_string());
    lines.join("\n") + "\n\n"
}

fn generate_relation_field(relation: &RelationMetadata) -> String {
    format!(
        "# relation: {} -> {} ({}, resolver: {})\n",
        relation.field_name, relation.target_entity, relation.relation_type, relation.resolver_type
    )
}

fn first_char_lower(s: &str) -> String {
    if s.is_empty() {
        return String::new();
    }
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_lowercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

// --- 联邦 V2 统计 ---

/// V42.0: 联邦 V2 统计 GraphQL 输出
#[derive(SimpleObject)]
pub struct FederationV2StatsGql {
    pub total_queries: u64,
    pub total_steps: u64,
    pub parallel_steps: u64,
    pub batch_resolutions: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub avg_plan_time_ms: f64,
    pub avg_execute_time_ms: f64,
    pub avg_total_time_ms: f64,
    pub plan_cache_hits: u64,
    pub auto_resolvers_used: u64,
    pub services_registered: usize,
    pub entities_registered: usize,
}

#[derive(Default)]
struct FederationV2StatsInternal {
    total_queries: u64,
    total_steps: u64,
    parallel_steps: u64,
    batch_resolutions: u64,
    cache_hits: u64,
    cache_misses: u64,
    total_plan_time_ms: u64,
    plan_count: u64,
    total_execute_time_ms: u64,
    execute_count: u64,
    plan_cache_hits: u64,
    auto_resolvers_used: u64,
}

static FEDERATION_V2_STATS: std::sync::OnceLock<Mutex<FederationV2StatsInternal>> =
    std::sync::OnceLock::new();

fn federation_v2_stats_internal() -> &'static Mutex<FederationV2StatsInternal> {
    FEDERATION_V2_STATS.get_or_init(|| Mutex::new(FederationV2StatsInternal::default()))
}

fn record_federation_v2_request() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_queries += 1;
}

fn record_federation_v2_total_steps(count: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_steps += count;
}

fn record_federation_v2_parallel_steps(count: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.parallel_steps += count;
}

fn record_federation_v2_batch_resolutions() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.batch_resolutions += 1;
}

fn record_federation_v2_cache_hit() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.cache_hits += 1;
}

fn record_federation_v2_cache_miss() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.cache_misses += 1;
}

fn record_federation_v2_plan_time(ms: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_plan_time_ms += ms;
    s.plan_count += 1;
}

fn record_federation_v2_execute_time(ms: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_execute_time_ms += ms;
    s.execute_count += 1;
}

fn record_federation_v2_plan_cache_hit() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.plan_cache_hits += 1;
}

fn record_federation_v2_plan_cache_miss() {
    // 计划缓存未命中不计入独立计数器，由 plan_count 反映
}

fn record_federation_v2_auto_resolver() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.auto_resolvers_used += 1;
}

pub fn get_federation_v2_stats() -> FederationV2StatsGql {
    let s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    let entities_registered: usize = registry.iter().map(|s| s.entities.len()).sum();
    let avg_plan_time_ms = if s.plan_count > 0 {
        s.total_plan_time_ms as f64 / s.plan_count as f64
    } else {
        0.0
    };
    let avg_execute_time_ms = if s.execute_count > 0 {
        s.total_execute_time_ms as f64 / s.execute_count as f64
    } else {
        0.0
    };
    let avg_total_time_ms = avg_plan_time_ms + avg_execute_time_ms;
    FederationV2StatsGql {
        total_queries: s.total_queries,
        total_steps: s.total_steps,
        parallel_steps: s.parallel_steps,
        batch_resolutions: s.batch_resolutions,
        cache_hits: s.cache_hits,
        cache_misses: s.cache_misses,
        avg_plan_time_ms,
        avg_execute_time_ms,
        avg_total_time_ms,
        plan_cache_hits: s.plan_cache_hits,
        auto_resolvers_used: s.auto_resolvers_used,
        services_registered: registry.len(),
        entities_registered,
    }
}

fn simple_random_u64() -> u64 {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64;
    let count = COUNTER.fetch_add(1, Ordering::Relaxed);
    timestamp
        .wrapping_mul(11400714819323198485)
        .wrapping_add(count)
}

fn simple_random_u128() -> u128 {
    let high = simple_random_u64() as u128;
    let low = simple_random_u64() as u128;
    (high << 64) | low
}

// ==================== V44.0 Track B: Federation V3 — 分布式查询计划 + 容错降级 + 缓存 + 监控 ====================

// --- V3: 分布式查询计划增强 ---

/// V44.0: 执行策略
#[derive(Clone, Copy, Debug)]
pub enum ExecutionStrategy {
    Parallel,
    Sequential,
    Hybrid,
    Pipelined,
}

impl ExecutionStrategy {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Parallel => "Parallel",
            Self::Sequential => "Sequential",
            Self::Hybrid => "Hybrid",
            Self::Pipelined => "Pipelined",
        }
    }
}

/// V44.0: 查询计划节点
#[derive(Clone, Debug)]
pub struct PlanNode {
    pub id: String,
    pub step_type: PlanStepType,
    pub service: Option<String>,
    pub entity: Option<String>,
    pub fields: Vec<String>,
    pub depends_on: Vec<String>,
    pub children: Vec<String>,
    pub estimated_latency_ms: u64,
}

/// V44.0: 查询依赖图
#[derive(Clone, Debug)]
pub struct QueryDependencyGraph {
    pub nodes: Vec<String>,
    pub edges: Vec<(String, String)>,
    pub critical_path: Vec<String>,
    pub depth: u32,
}

/// V44.0: V3 联邦查询计划
#[derive(Clone, Debug)]
pub struct FederationV3Plan {
    pub plan_id: String,
    pub query_hash: String,
    pub root_steps: Vec<String>,
    pub execution_order: Vec<String>,
    pub total_services: usize,
    pub estimated_cost: f64,
    pub parallel_groups: Vec<Vec<String>>,
    pub nodes: Vec<PlanNode>,
    pub dependency_graph: QueryDependencyGraph,
    pub execution_strategy: ExecutionStrategy,
}

// --- V3: 容错降级 ---

/// V44.0: 熔断器状态
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

impl CircuitBreakerState {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Closed => "Closed",
            Self::Open => "Open",
            Self::HalfOpen => "HalfOpen",
        }
    }
}

/// V44.0: 熔断器配置
#[derive(Clone, Debug)]
pub struct CircuitBreakerConfig {
    pub failure_threshold: u64,
    pub success_threshold: u64,
    pub timeout_ms: u64,
    pub half_open_max_calls: u64,
}

/// V44.0: 服务熔断器
#[derive(Clone, Debug)]
pub struct ServiceCircuitBreaker {
    pub state: CircuitBreakerState,
    pub failure_count: u64,
    pub success_count: u64,
    pub last_failure_time: DateTime<Utc>,
    pub last_state_change: DateTime<Utc>,
    pub config: CircuitBreakerConfig,
}

impl ServiceCircuitBreaker {
    fn new(config: CircuitBreakerConfig) -> Self {
        let now = Utc::now();
        Self {
            state: CircuitBreakerState::Closed,
            failure_count: 0,
            success_count: 0,
            last_failure_time: now,
            last_state_change: now,
            config,
        }
    }
}

/// V44.0: 降级策略
#[derive(Clone, Copy, Debug)]
pub enum FallbackStrategy {
    ReturnNull,
    ReturnPartial,
    ReturnCached,
    ReturnError,
    ReturnFallbackValue,
}

impl FallbackStrategy {
    fn as_str(&self) -> &'static str {
        match self {
            Self::ReturnNull => "ReturnNull",
            Self::ReturnPartial => "ReturnPartial",
            Self::ReturnCached => "ReturnCached",
            Self::ReturnError => "ReturnError",
            Self::ReturnFallbackValue => "ReturnFallbackValue",
        }
    }
}

// --- V3: 联邦查询缓存 ---

/// V44.0: 缓存失效策略
#[derive(Clone, Debug)]
pub struct CacheInvalidationPolicy {
    pub ttl_ms: u64,
    pub max_size: usize,
    pub invalidation_on_mutation: bool,
}

/// V44.0: 查询缓存条目
#[derive(Clone, Debug)]
pub struct FederatedQueryCacheEntry {
    pub query_hash: String,
    pub result: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub hit_count: u64,
    pub source_services: Vec<String>,
}

/// V44.0: 实体缓存条目
#[derive(Clone, Debug)]
pub struct EntityCacheEntry {
    pub service: String,
    pub entity_type: String,
    pub entity_id: String,
    pub data: serde_json::Value,
    pub version: u64,
    pub cached_at: DateTime<Utc>,
}

/// V44.0: 两级 LRU 缓存（L1 内存）
struct LruCacheV3<K: std::cmp::Eq + std::hash::Hash + Clone, V> {
    map: HashMap<K, V>,
    order: VecDeque<K>,
    capacity: usize,
}

impl<K: std::cmp::Eq + std::hash::Hash + Clone, V> LruCacheV3<K, V> {
    fn new(capacity: usize) -> Self {
        Self {
            map: HashMap::new(),
            order: VecDeque::new(),
            capacity,
        }
    }

    fn get(&mut self, key: &K) -> Option<&V> {
        if self.map.contains_key(key) {
            self.order.retain(|k| k != key);
            self.order.push_front(key.clone());
            self.map.get(key)
        } else {
            None
        }
    }

    fn put(&mut self, key: K, value: V) {
        if self.map.contains_key(&key) {
            self.order.retain(|k| k != &key);
        } else if self.map.len() >= self.capacity {
            if let Some(oldest) = self.order.pop_back() {
                self.map.remove(&oldest);
            }
        }
        self.order.push_front(key.clone());
        self.map.insert(key, value);
    }

    fn remove(&mut self, key: &K) -> Option<V> {
        self.order.retain(|k| k != key);
        self.map.remove(key)
    }

    fn len(&self) -> usize {
        self.map.len()
    }

    fn clear(&mut self) {
        self.map.clear();
        self.order.clear();
    }

    fn keys(&self) -> Vec<K> {
        self.order.iter().cloned().collect()
    }
}

// --- V3: 联邦网关监控 ---

/// V44.0: 服务级统计
#[derive(Clone, Debug)]
pub struct FederationServiceStats {
    pub service_name: String,
    pub request_count: u64,
    pub success_count: u64,
    pub failure_count: u64,
    pub total_latency_ms: u64,
    pub p95_latency_ms: u64,
    pub latencies: Vec<u64>,
}

impl FederationServiceStats {
    fn new(service_name: String) -> Self {
        Self {
            service_name,
            request_count: 0,
            success_count: 0,
            failure_count: 0,
            total_latency_ms: 0,
            p95_latency_ms: 0,
            latencies: Vec::new(),
        }
    }

    fn record_success(&mut self, latency_ms: u64) {
        self.request_count += 1;
        self.success_count += 1;
        self.total_latency_ms += latency_ms;
        self.latencies.push(latency_ms);
        if self.latencies.len() > 1000 {
            self.latencies.remove(0);
        }
        self.update_p95();
    }

    fn record_failure(&mut self, latency_ms: u64) {
        self.request_count += 1;
        self.failure_count += 1;
        self.total_latency_ms += latency_ms;
        self.latencies.push(latency_ms);
        if self.latencies.len() > 1000 {
            self.latencies.remove(0);
        }
        self.update_p95();
    }

    fn update_p95(&mut self) {
        if self.latencies.is_empty() {
            self.p95_latency_ms = 0;
            return;
        }
        let mut sorted = self.latencies.clone();
        sorted.sort();
        let idx = ((sorted.len() as f64) * 0.95) as usize;
        self.p95_latency_ms = sorted.get(idx.min(sorted.len() - 1)).copied().unwrap_or(0);
    }

    fn avg_latency_ms(&self) -> u64 {
        if self.request_count > 0 {
            self.total_latency_ms / self.request_count
        } else {
            0
        }
    }
}

/// V44.0: 计划步骤执行轨迹
#[derive(Clone, Debug)]
pub struct PlanStepTrace {
    pub step_id: String,
    pub step_type: String,
    pub service: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub duration_ms: u64,
    pub status: String,
    pub error_message: Option<String>,
    pub cached: bool,
}

/// V44.0: 计划执行轨迹
#[derive(Clone, Debug)]
pub struct PlanExecutionTrace {
    pub plan_id: String,
    pub query_hash: String,
    pub total_time_ms: u64,
    pub step_traces: Vec<PlanStepTrace>,
    pub cache_hits: u64,
    pub services_used: Vec<String>,
    pub errors: Vec<String>,
    pub created_at: DateTime<Utc>,
}

/// V44.0: V3 网关统计
#[derive(Clone, Debug)]
pub struct FederationV3StatsInternal {
    pub total_queries: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub total_latency_ms: u64,
    pub latencies: Vec<u64>,
    pub service_stats: HashMap<String, FederationServiceStats>,
    pub plan_count: u64,
    pub total_plan_time_ms: u64,
    pub total_execute_time_ms: u64,
    pub execute_count: u64,
    pub circuit_breaker_trips: u64,
    pub fallback_uses: u64,
}

impl Default for FederationV3StatsInternal {
    fn default() -> Self {
        let mut service_stats = HashMap::new();
        for svc in ["erp", "crm", "hrm", "finance", "mes"] {
            service_stats.insert(
                svc.to_string(),
                FederationServiceStats::new(svc.to_string()),
            );
        }
        Self {
            total_queries: 0,
            cache_hits: 0,
            cache_misses: 0,
            total_latency_ms: 0,
            latencies: Vec::new(),
            service_stats,
            plan_count: 0,
            total_plan_time_ms: 0,
            total_execute_time_ms: 0,
            execute_count: 0,
            circuit_breaker_trips: 0,
            fallback_uses: 0,
        }
    }
}

// --- V3: 全局状态 ---

static FEDERATION_V3_STATS: std::sync::OnceLock<Mutex<FederationV3StatsInternal>> =
    std::sync::OnceLock::new();

fn federation_v3_stats_internal() -> &'static Mutex<FederationV3StatsInternal> {
    FEDERATION_V3_STATS.get_or_init(|| Mutex::new(FederationV3StatsInternal::default()))
}

static FEDERATION_V3_CIRCUIT_BREAKERS: std::sync::OnceLock<
    Mutex<HashMap<String, ServiceCircuitBreaker>>,
> = std::sync::OnceLock::new();

fn federation_v3_circuit_breakers() -> &'static Mutex<HashMap<String, ServiceCircuitBreaker>> {
    FEDERATION_V3_CIRCUIT_BREAKERS.get_or_init(|| {
        let mut map = HashMap::new();
        let default_config = CircuitBreakerConfig {
            failure_threshold: 5,
            success_threshold: 3,
            timeout_ms: 30000,
            half_open_max_calls: 2,
        };
        for svc in ["erp", "crm", "hrm", "finance", "mes"] {
            map.insert(
                svc.to_string(),
                ServiceCircuitBreaker::new(default_config.clone()),
            );
        }
        Mutex::new(map)
    })
}

static FEDERATION_V3_QUERY_CACHE: std::sync::OnceLock<
    Mutex<LruCacheV3<String, FederatedQueryCacheEntry>>,
> = std::sync::OnceLock::new();

fn federation_v3_query_cache() -> &'static Mutex<LruCacheV3<String, FederatedQueryCacheEntry>> {
    FEDERATION_V3_QUERY_CACHE.get_or_init(|| Mutex::new(LruCacheV3::new(200)))
}

static FEDERATION_V3_ENTITY_CACHE: std::sync::OnceLock<
    Mutex<LruCacheV3<String, EntityCacheEntry>>,
> = std::sync::OnceLock::new();

fn federation_v3_entity_cache() -> &'static Mutex<LruCacheV3<String, EntityCacheEntry>> {
    FEDERATION_V3_ENTITY_CACHE.get_or_init(|| Mutex::new(LruCacheV3::new(500)))
}

static FEDERATION_V3_TRACES: std::sync::OnceLock<Mutex<VecDeque<PlanExecutionTrace>>> =
    std::sync::OnceLock::new();

fn federation_v3_traces() -> &'static Mutex<VecDeque<PlanExecutionTrace>> {
    FEDERATION_V3_TRACES.get_or_init(|| Mutex::new(VecDeque::with_capacity(100)))
}

static FEDERATION_V3_PLAN_CACHE: std::sync::OnceLock<Mutex<LruCacheV3<String, FederationV3Plan>>> =
    std::sync::OnceLock::new();

fn federation_v3_plan_cache() -> &'static Mutex<LruCacheV3<String, FederationV3Plan>> {
    FEDERATION_V3_PLAN_CACHE.get_or_init(|| Mutex::new(LruCacheV3::new(100)))
}

// --- V3: GraphQL 输出类型 ---

/// V44.0: V3 查询计划 GQL
#[derive(SimpleObject)]
pub struct FederationV3PlanGql {
    pub plan_id: String,
    pub query_hash: String,
    pub root_steps: Vec<String>,
    pub execution_order: Vec<String>,
    pub total_services: i32,
    pub estimated_cost: f64,
    pub parallel_groups: Vec<String>,
    pub nodes: Vec<PlanNodeGql>,
    pub dependency_graph: QueryDependencyGraphGql,
    pub execution_strategy: String,
}

/// V44.0: 计划节点 GQL
#[derive(SimpleObject)]
pub struct PlanNodeGql {
    pub id: String,
    pub step_type: String,
    pub service: Option<String>,
    pub entity: Option<String>,
    pub fields: Vec<String>,
    pub depends_on: Vec<String>,
    pub children: Vec<String>,
    pub estimated_latency_ms: i32,
}

/// V44.0: 查询依赖图 GQL
#[derive(SimpleObject)]
pub struct QueryDependencyGraphGql {
    pub nodes: Vec<String>,
    pub edges: Vec<String>,
    pub critical_path: Vec<String>,
    pub depth: i32,
}

/// V44.0: 熔断器状态 GQL (简化版，避免与 rate_limiting::CircuitBreakerStateGql 冲突)
#[derive(SimpleObject)]
pub struct CircuitBreakerStateGqlSimple {
    pub service: String,
    pub state: String,
    pub failure_count: i32,
    pub success_count: i32,
    pub last_failure_time: String,
    pub last_state_change: String,
    pub failure_threshold: i32,
    pub timeout_ms: i32,
}

/// V44.0: 熔断器配置输入
#[derive(async_graphql::InputObject)]
pub struct CircuitBreakerConfigInputGql {
    pub failure_threshold: i32,
    pub success_threshold: i32,
    pub timeout_ms: i32,
    pub half_open_max_calls: i32,
}

/// V44.0: V3 统计 GQL
#[derive(SimpleObject)]
pub struct FederationV3StatsGql {
    pub total_queries: i32,
    pub cache_hits: i32,
    pub cache_misses: i32,
    pub total_latency_ms: i32,
    pub avg_latency_ms: f64,
    pub p95_latency_ms: i32,
    pub service_stats: Vec<FederationServiceStatsGql>,
    pub plan_count: i32,
    pub avg_plan_time_ms: f64,
    pub avg_execute_time_ms: f64,
    pub circuit_breaker_trips: i32,
    pub fallback_uses: i32,
}

/// V44.0: 服务统计 GQL
#[derive(SimpleObject)]
pub struct FederationServiceStatsGql {
    pub service_name: String,
    pub request_count: i32,
    pub success_count: i32,
    pub failure_count: i32,
    pub avg_latency_ms: f64,
    pub p95_latency_ms: i32,
    pub circuit_breaker_state: String,
}

/// V44.0: 计划执行轨迹 GQL
#[derive(SimpleObject)]
pub struct PlanExecutionTraceGql {
    pub plan_id: String,
    pub query_hash: String,
    pub total_time_ms: i32,
    pub step_traces: Vec<PlanStepTraceGql>,
    pub cache_hits: i32,
    pub services_used: Vec<String>,
    pub errors: Vec<String>,
    pub created_at: String,
}

/// V44.0: 计划步骤轨迹 GQL
#[derive(SimpleObject)]
pub struct PlanStepTraceGql {
    pub step_id: String,
    pub step_type: String,
    pub service: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub duration_ms: i32,
    pub status: String,
    pub error_message: Option<String>,
    pub cached: bool,
}

/// V44.0: 缓存统计 GQL
#[derive(SimpleObject)]
pub struct FederationCacheStatsGql {
    pub query_cache_size: i32,
    pub query_cache_max_size: i32,
    pub query_cache_hit_rate: f64,
    pub entity_cache_size: i32,
    pub entity_cache_max_size: i32,
    pub total_cache_hits: i32,
    pub total_cache_misses: i32,
}

// --- V3: 分布式查询计划器 ---

/// V44.0: V3 联邦查询计划器
pub struct FederationV3Planner;

impl FederationV3Planner {
    pub fn build_plan_v3(query: &str, _variables: &serde_json::Value) -> FederationV3Plan {
        let query_hash = Self::query_hash(query);
        let lower = query.to_lowercase();
        let mut nodes: Vec<PlanNode> = Vec::new();
        let mut node_counter = 0usize;

        let entity_patterns: &[(&str, &str, &str)] = &[
            ("customer", "Customer", "erp"),
            ("supplier", "Supplier", "erp"),
            ("material", "Material", "erp"),
            ("contact", "Contact", "crm"),
            ("lead", "Lead", "crm"),
            ("employee", "Employee", "hrm"),
            ("department", "Department", "hrm"),
            ("voucher", "Voucher", "finance"),
            ("accountsubject", "AccountSubject", "finance"),
            ("workorder", "WorkOrder", "mes"),
            ("product", "Product", "mes"),
        ];

        for (keyword, entity, service) in entity_patterns {
            if lower.contains(keyword) {
                let node_id = format!("node_{}", node_counter);
                node_counter += 1;
                let step_type = if lower.contains("list") || lower.contains("s(") {
                    PlanStepType::FetchList
                } else {
                    PlanStepType::FetchEntity
                };
                nodes.push(PlanNode {
                    id: node_id,
                    step_type,
                    service: Some((*service).to_string()),
                    entity: Some((*entity).to_string()),
                    fields: Vec::new(),
                    depends_on: Vec::new(),
                    children: Vec::new(),
                    estimated_latency_ms: 50,
                });
            }
        }

        let relation_patterns: &[(&str, &str, &str)] = &[
            ("contacts", "Customer", "Contact"),
            ("department_info", "Employee", "Department"),
            ("account_subject", "Voucher", "AccountSubject"),
        ];

        for (keyword, source_entity, _target_entity) in relation_patterns {
            if lower.contains(keyword) {
                let node_id = format!("node_{}", node_counter);
                node_counter += 1;
                let depends_on: Vec<String> = nodes
                    .iter()
                    .filter(|n| n.entity.as_deref() == Some(*source_entity))
                    .map(|n| n.id.clone())
                    .collect();
                nodes.push(PlanNode {
                    id: node_id.clone(),
                    step_type: PlanStepType::JoinRelation,
                    service: None,
                    entity: Some((*source_entity).to_string()),
                    fields: vec![keyword.to_string()],
                    depends_on: depends_on.clone(),
                    children: Vec::new(),
                    estimated_latency_ms: 30,
                });
                for dep_id in &depends_on {
                    if let Some(node) = nodes.iter_mut().find(|n| n.id == *dep_id) {
                        node.children.push(node_id.clone());
                    }
                }
            }
        }

        let services: HashSet<String> = nodes.iter().filter_map(|n| n.service.clone()).collect();

        let (dependency_graph, execution_order) = Self::build_dependency_graph(&nodes);
        let parallel_groups = Self::detect_parallel_groups(&nodes, &dependency_graph);
        let critical_path = Self::calculate_critical_path(&nodes, &dependency_graph);
        let depth = dependency_graph.depth;
        let estimated_cost = nodes.len() as f64 * 10.0 + depth as f64 * 5.0;

        let execution_strategy = if depth <= 2 {
            ExecutionStrategy::Parallel
        } else if nodes.len() <= 3 {
            ExecutionStrategy::Sequential
        } else {
            ExecutionStrategy::Hybrid
        };

        let root_steps: Vec<String> = nodes
            .iter()
            .filter(|n| n.depends_on.is_empty())
            .map(|n| n.id.clone())
            .collect();

        let plan_id = format!("plan_{}", uuid::Uuid::new_v4());

        FederationV3Plan {
            plan_id,
            query_hash,
            root_steps,
            execution_order,
            total_services: services.len(),
            estimated_cost,
            parallel_groups,
            nodes,
            dependency_graph: QueryDependencyGraph {
                nodes: dependency_graph.nodes,
                edges: dependency_graph.edges,
                critical_path,
                depth,
            },
            execution_strategy,
        }
    }

    fn query_hash(query: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(query.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn build_dependency_graph(nodes: &[PlanNode]) -> (QueryDependencyGraph, Vec<String>) {
        let node_ids: Vec<String> = nodes.iter().map(|n| n.id.clone()).collect();
        let mut edges: Vec<(String, String)> = Vec::new();
        for node in nodes {
            for dep in &node.depends_on {
                edges.push((dep.clone(), node.id.clone()));
            }
        }

        let mut in_degree: HashMap<String, usize> = HashMap::new();
        for id in &node_ids {
            in_degree.insert(id.clone(), 0);
        }
        for (_from, to) in &edges {
            *in_degree.get_mut(to).unwrap() += 1;
        }

        let mut queue: VecDeque<String> = VecDeque::new();
        for id in &node_ids {
            if in_degree[id] == 0 {
                queue.push_back(id.clone());
            }
        }

        let mut execution_order: Vec<String> = Vec::new();
        let mut depth_map: HashMap<String, u32> = HashMap::new();
        for id in &node_ids {
            depth_map.insert(id.clone(), 0);
        }

        while let Some(node_id) = queue.pop_front() {
            execution_order.push(node_id.clone());
            for (_from, to) in edges.iter().filter(|(f, _)| *f == node_id) {
                *in_degree.get_mut(to).unwrap() -= 1;
                let new_depth = depth_map[&node_id] + 1;
                if new_depth > depth_map[to] {
                    depth_map.insert(to.clone(), new_depth);
                }
                if in_degree[to] == 0 {
                    queue.push_back(to.clone());
                }
            }
        }

        let max_depth = depth_map.values().copied().max().unwrap_or(0);
        let critical_path = Vec::new();

        (
            QueryDependencyGraph {
                nodes: node_ids,
                edges,
                critical_path,
                depth: max_depth,
            },
            execution_order,
        )
    }

    fn detect_parallel_groups(
        nodes: &[PlanNode],
        _graph: &QueryDependencyGraph,
    ) -> Vec<Vec<String>> {
        let mut groups: Vec<Vec<String>> = Vec::new();
        let mut remaining: HashSet<String> = nodes.iter().map(|n| n.id.clone()).collect();

        while !remaining.is_empty() {
            let mut current_group: Vec<String> = Vec::new();
            for node in nodes {
                if remaining.contains(&node.id) {
                    let deps_met = node.depends_on.iter().all(|dep| !remaining.contains(dep));
                    if deps_met {
                        current_group.push(node.id.clone());
                    }
                }
            }
            if current_group.is_empty() {
                break;
            }
            for id in &current_group {
                remaining.remove(id);
            }
            groups.push(current_group);
        }

        groups
    }

    fn calculate_critical_path(nodes: &[PlanNode], _graph: &QueryDependencyGraph) -> Vec<String> {
        let mut longest: HashMap<String, u64> = HashMap::new();
        let mut prev: HashMap<String, Option<String>> = HashMap::new();

        for node in nodes {
            longest.insert(node.id.clone(), node.estimated_latency_ms);
            prev.insert(node.id.clone(), None);
        }

        let mut sorted_nodes: Vec<&PlanNode> = nodes.iter().collect();
        sorted_nodes.sort_by_key(|a| a.depends_on.len());

        for node in &sorted_nodes {
            for dep in &node.depends_on {
                let new_len = longest[dep] + node.estimated_latency_ms;
                if new_len > longest[&node.id] {
                    longest.insert(node.id.clone(), new_len);
                    prev.insert(node.id.clone(), Some(dep.clone()));
                }
            }
        }

        let mut critical_path: Vec<String> = Vec::new();
        if let Some((end_node, _)) = longest.iter().max_by_key(|(_, v)| **v) {
            let mut current = Some(end_node.clone());
            while let Some(node_id) = current {
                critical_path.push(node_id.clone());
                current = prev[&node_id].clone();
            }
            critical_path.reverse();
        }

        critical_path
    }

    #[allow(dead_code)]
    pub fn optimize_plan(plan: &FederationV3Plan) -> FederationV3Plan {
        plan.clone()
    }
}

// --- V3: 熔断器控制 ---

/// V44.0: 检查熔断器状态
pub fn check_circuit_breaker(service: &str) -> bool {
    let breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get(service) {
        match cb.state {
            CircuitBreakerState::Closed => true,
            CircuitBreakerState::Open => {
                let elapsed = Utc::now()
                    .signed_duration_since(cb.last_state_change)
                    .num_milliseconds();
                elapsed >= cb.config.timeout_ms as i64
            }
            CircuitBreakerState::HalfOpen => true,
        }
    } else {
        true
    }
}

/// V44.0: 记录成功
pub fn record_circuit_success(service: &str) {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        let now = Utc::now();
        match cb.state {
            CircuitBreakerState::Closed => {
                cb.failure_count = 0;
            }
            CircuitBreakerState::HalfOpen => {
                cb.success_count += 1;
                if cb.success_count >= cb.config.success_threshold {
                    cb.state = CircuitBreakerState::Closed;
                    cb.failure_count = 0;
                    cb.success_count = 0;
                    cb.last_state_change = now;
                }
            }
            CircuitBreakerState::Open => {}
        }
    }
}

/// V44.0: 记录失败
pub fn record_circuit_failure(service: &str) {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let mut stats = federation_v3_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        let now = Utc::now();
        cb.failure_count += 1;
        cb.last_failure_time = now;
        match cb.state {
            CircuitBreakerState::Closed => {
                if cb.failure_count >= cb.config.failure_threshold {
                    cb.state = CircuitBreakerState::Open;
                    cb.last_state_change = now;
                    cb.success_count = 0;
                    stats.circuit_breaker_trips += 1;
                }
            }
            CircuitBreakerState::HalfOpen => {
                cb.state = CircuitBreakerState::Open;
                cb.last_state_change = now;
                cb.success_count = 0;
                stats.circuit_breaker_trips += 1;
            }
            CircuitBreakerState::Open => {}
        }
    }
}

/// V44.0: 重置熔断器
pub fn reset_circuit_breaker(service: &str) -> bool {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        let now = Utc::now();
        cb.state = CircuitBreakerState::Closed;
        cb.failure_count = 0;
        cb.success_count = 0;
        cb.last_state_change = now;
        true
    } else {
        false
    }
}

/// V44.0: 设置熔断器配置
pub fn set_circuit_breaker_config(service: &str, config: CircuitBreakerConfigInputGql) -> bool {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        cb.config = CircuitBreakerConfig {
            failure_threshold: config.failure_threshold as u64,
            success_threshold: config.success_threshold as u64,
            timeout_ms: config.timeout_ms as u64,
            half_open_max_calls: config.half_open_max_calls as u64,
        };
        true
    } else {
        false
    }
}

// --- V3: 联邦缓存管理器 ---

/// V44.0: 联邦缓存管理器
pub struct FederatedCacheManager;

impl FederatedCacheManager {
    pub fn get_query_cache(query_hash: &str, variables_hash: &str) -> Option<serde_json::Value> {
        let key = format!("{}:{}", query_hash, variables_hash);
        let mut cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        if let Some(entry) = cache.get(&key) {
            if entry.expires_at > now {
                let mut stats = federation_v3_stats_internal()
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                stats.cache_hits += 1;
                return Some(entry.result.clone());
            }
        }
        None
    }

    pub fn set_query_cache(
        query_hash: &str,
        variables_hash: &str,
        result: serde_json::Value,
        source_services: Vec<String>,
        ttl_ms: u64,
    ) {
        let key = format!("{}:{}", query_hash, variables_hash);
        let now = Utc::now();
        let expires = now + chrono::Duration::milliseconds(ttl_ms as i64);
        let mut cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(existing) = cache.get(&key) {
            let hit_count = existing.hit_count + 1;
            cache.put(
                key.clone(),
                FederatedQueryCacheEntry {
                    query_hash: query_hash.to_string(),
                    result,
                    created_at: now,
                    expires_at: expires,
                    hit_count,
                    source_services,
                },
            );
        } else {
            cache.put(
                key.clone(),
                FederatedQueryCacheEntry {
                    query_hash: query_hash.to_string(),
                    result,
                    created_at: now,
                    expires_at: expires,
                    hit_count: 0,
                    source_services,
                },
            );
        }
        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        stats.cache_misses += 1;
    }

    pub fn invalidate_query_cache(query_hash: &str) -> bool {
        let mut cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let keys: Vec<String> = cache
            .keys()
            .into_iter()
            .filter(|k| k.starts_with(&format!("{}:", query_hash)))
            .collect();
        let mut removed = false;
        for key in keys {
            if cache.remove(&key).is_some() {
                removed = true;
            }
        }
        removed
    }

    pub fn get_entity_cache(
        service: &str,
        entity_type: &str,
        entity_id: &str,
    ) -> Option<serde_json::Value> {
        let key = format!("{}:{}:{}", service, entity_type, entity_id);
        let mut cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        cache.get(&key).map(|e| e.data.clone())
    }

    pub fn set_entity_cache(
        service: &str,
        entity_type: &str,
        entity_id: &str,
        data: serde_json::Value,
    ) {
        let key = format!("{}:{}:{}", service, entity_type, entity_id);
        let now = Utc::now();
        let mut cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let version = cache.get(&key).map(|e| e.version + 1).unwrap_or(1);
        cache.put(
            key,
            EntityCacheEntry {
                service: service.to_string(),
                entity_type: entity_type.to_string(),
                entity_id: entity_id.to_string(),
                data,
                version,
                cached_at: now,
            },
        );
    }

    pub fn invalidate_entity_cache(service: &str, entity_type: &str, entity_id: &str) -> bool {
        let key = format!("{}:{}:{}", service, entity_type, entity_id);
        let mut cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        cache.remove(&key).is_some()
    }

    pub fn clear_all_cache() -> bool {
        let mut query_cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut entity_cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        query_cache.clear();
        entity_cache.clear();
        true
    }
}

// --- V3: V3 执行器 ---

/// V44.0: V3 联邦查询执行器
pub struct FederationV3Executor;

impl FederationV3Executor {
    pub async fn execute_plan_v3(plan: &FederationV3Plan) -> Result<serde_json::Value, String> {
        let mut results: HashMap<String, serde_json::Value> = HashMap::new();
        let mut step_traces: Vec<PlanStepTrace> = Vec::new();
        let mut services_used: HashSet<String> = HashSet::new();
        let mut errors: Vec<String> = Vec::new();
        let mut cache_hit_count: u64 = 0;
        let exec_start = std::time::Instant::now();

        for group in &plan.parallel_groups {
            let futures: Vec<_> = group
                .iter()
                .filter_map(|node_id| {
                    let node = plan.nodes.iter().find(|n| n.id == *node_id)?;
                    let node_id = node_id.clone();
                    let service = node.service.clone();
                    let entity = node.entity.clone();
                    let step_type = node.step_type;
                    Some(async move {
                        let start = Utc::now();
                        let start_instant = std::time::Instant::now();
                        let (result, cached) = Self::execute_with_fallback(
                            service.as_deref(),
                            entity.as_deref(),
                            step_type,
                        )
                        .await;
                        let end = Utc::now();
                        let duration = start_instant.elapsed().as_millis() as u64;
                        let status = if result.get("error").is_some() {
                            "failed".to_string()
                        } else {
                            "success".to_string()
                        };
                        let error_message = result
                            .get("error")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        (
                            node_id,
                            result,
                            PlanStepTrace {
                                step_id: String::new(),
                                step_type: step_type.as_str().to_string(),
                                service: service.clone(),
                                start_time: start,
                                end_time: end,
                                duration_ms: duration,
                                status,
                                error_message,
                                cached,
                            },
                        )
                    })
                })
                .collect();

            let group_results = join_all(futures).await;
            for (node_id, result, mut trace) in group_results {
                trace.step_id = node_id.clone();
                if let Some(svc) = &trace.service {
                    services_used.insert(svc.clone());
                }
                if let Some(err) = &trace.error_message {
                    errors.push(err.clone());
                }
                if trace.cached {
                    cache_hit_count += 1;
                }
                step_traces.push(trace);
                results.insert(node_id, result);
            }
        }

        let total_time = exec_start.elapsed().as_millis() as u64;

        Self::record_trace(PlanExecutionTrace {
            plan_id: plan.plan_id.clone(),
            query_hash: plan.query_hash.clone(),
            total_time_ms: total_time,
            step_traces,
            cache_hits: cache_hit_count,
            services_used: services_used.into_iter().collect(),
            errors,
            created_at: Utc::now(),
        });

        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        stats.total_queries += 1;
        stats.total_latency_ms += total_time;
        stats.latencies.push(total_time);
        if stats.latencies.len() > 1000 {
            stats.latencies.remove(0);
        }
        stats.execute_count += 1;
        stats.total_execute_time_ms += total_time;

        Ok(serde_json::json!(results))
    }

    async fn execute_with_fallback(
        service: Option<&str>,
        entity: Option<&str>,
        step_type: PlanStepType,
    ) -> (serde_json::Value, bool) {
        let svc = match service {
            Some(s) => s,
            None => return (serde_json::json!({"error": "no service"}), false),
        };
        let ent = match entity {
            Some(e) => e,
            None => return (serde_json::json!({"error": "no entity"}), false),
        };

        if !check_circuit_breaker(svc) {
            let mut stats = federation_v3_stats_internal()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            stats.fallback_uses += 1;
            return (
                serde_json::json!({"error": "circuit breaker open", "service": svc}),
                false,
            );
        }

        if let Some(cached) = FederatedCacheManager::get_entity_cache(svc, ent, "default") {
            return (cached, true);
        }

        let resolver = match get_resolver(ent) {
            Some(r) => r,
            None => {
                record_circuit_failure(svc);
                return (
                    serde_json::json!({"error": format!("no resolver for {}", ent)}),
                    false,
                );
            }
        };

        let start = std::time::Instant::now();
        let result = match step_type {
            PlanStepType::FetchEntity => match resolver.resolve_single("1").await {
                Ok(v) => {
                    FederatedCacheManager::set_entity_cache(svc, ent, "default", v.clone());
                    record_circuit_success(svc);
                    v
                }
                Err(e) => {
                    record_circuit_failure(svc);
                    let mut stats = federation_v3_stats_internal()
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                    stats.fallback_uses += 1;
                    serde_json::json!({"error": e})
                }
            },
            _ => match resolver.resolve_batch(&["1".into(), "2".into()]).await {
                Ok(v) => {
                    record_circuit_success(svc);
                    serde_json::Value::Array(v)
                }
                Err(e) => {
                    record_circuit_failure(svc);
                    let mut stats = federation_v3_stats_internal()
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                    stats.fallback_uses += 1;
                    serde_json::json!({"error": e})
                }
            },
        };

        let latency = start.elapsed().as_millis() as u64;
        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(svc_stats) = stats.service_stats.get_mut(svc) {
            if result.get("error").is_some() {
                svc_stats.record_failure(latency);
            } else {
                svc_stats.record_success(latency);
            }
        }

        (result, false)
    }

    fn record_trace(trace: PlanExecutionTrace) {
        let mut traces = federation_v3_traces()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        traces.push_front(trace);
        if traces.len() > 100 {
            traces.pop_back();
        }
    }
}

// --- V3: 统计与转换函数 ---

fn v3_variables_hash(variables: &serde_json::Value) -> String {
    let s = serde_json::to_string(variables).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn get_federation_v3_stats() -> FederationV3StatsGql {
    let stats = federation_v3_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());

    let avg_latency_ms = if stats.total_queries > 0 {
        stats.total_latency_ms as f64 / stats.total_queries as f64
    } else {
        0.0
    };

    let mut sorted_latencies = stats.latencies.clone();
    sorted_latencies.sort();
    let p95_idx = ((sorted_latencies.len() as f64) * 0.95) as usize;
    let p95_latency_ms = sorted_latencies
        .get(p95_idx.min(sorted_latencies.len().saturating_sub(1)))
        .copied()
        .unwrap_or(0) as i32;

    let avg_plan_time_ms = if stats.plan_count > 0 {
        stats.total_plan_time_ms as f64 / stats.plan_count as f64
    } else {
        0.0
    };

    let avg_execute_time_ms = if stats.execute_count > 0 {
        stats.total_execute_time_ms as f64 / stats.execute_count as f64
    } else {
        0.0
    };

    let service_stats: Vec<FederationServiceStatsGql> = stats
        .service_stats
        .iter()
        .map(|(name, s)| FederationServiceStatsGql {
            service_name: name.clone(),
            request_count: s.request_count as i32,
            success_count: s.success_count as i32,
            failure_count: s.failure_count as i32,
            avg_latency_ms: if s.request_count > 0 {
                s.total_latency_ms as f64 / s.request_count as f64
            } else {
                0.0
            },
            p95_latency_ms: s.p95_latency_ms as i32,
            circuit_breaker_state: breakers
                .get(name)
                .map(|cb| cb.state.as_str().to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
        })
        .collect();

    FederationV3StatsGql {
        total_queries: stats.total_queries as i32,
        cache_hits: stats.cache_hits as i32,
        cache_misses: stats.cache_misses as i32,
        total_latency_ms: stats.total_latency_ms as i32,
        avg_latency_ms,
        p95_latency_ms,
        service_stats,
        plan_count: stats.plan_count as i32,
        avg_plan_time_ms,
        avg_execute_time_ms,
        circuit_breaker_trips: stats.circuit_breaker_trips as i32,
        fallback_uses: stats.fallback_uses as i32,
    }
}

pub fn get_all_circuit_breakers() -> Vec<CircuitBreakerStateGqlSimple> {
    let breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    breakers
        .iter()
        .map(|(name, cb)| CircuitBreakerStateGqlSimple {
            service: name.clone(),
            state: cb.state.as_str().to_string(),
            failure_count: cb.failure_count as i32,
            success_count: cb.success_count as i32,
            last_failure_time: cb.last_failure_time.to_rfc3339(),
            last_state_change: cb.last_state_change.to_rfc3339(),
            failure_threshold: cb.config.failure_threshold as i32,
            timeout_ms: cb.config.timeout_ms as i32,
        })
        .collect()
}

pub fn get_v3_traces(limit: usize) -> Vec<PlanExecutionTraceGql> {
    let traces = federation_v3_traces()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    traces
        .iter()
        .take(limit)
        .map(|t| PlanExecutionTraceGql {
            plan_id: t.plan_id.clone(),
            query_hash: t.query_hash.clone(),
            total_time_ms: t.total_time_ms as i32,
            step_traces: t
                .step_traces
                .iter()
                .map(|s| PlanStepTraceGql {
                    step_id: s.step_id.clone(),
                    step_type: s.step_type.clone(),
                    service: s.service.clone(),
                    start_time: s.start_time.to_rfc3339(),
                    end_time: s.end_time.to_rfc3339(),
                    duration_ms: s.duration_ms as i32,
                    status: s.status.clone(),
                    error_message: s.error_message.clone(),
                    cached: s.cached,
                })
                .collect(),
            cache_hits: t.cache_hits as i32,
            services_used: t.services_used.clone(),
            errors: t.errors.clone(),
            created_at: t.created_at.to_rfc3339(),
        })
        .collect()
}

pub fn get_v3_cache_stats() -> FederationCacheStatsGql {
    let stats = federation_v3_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let query_cache = federation_v3_query_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let entity_cache = federation_v3_entity_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner());

    let total_cache = stats.cache_hits + stats.cache_misses;
    let hit_rate = if total_cache > 0 {
        stats.cache_hits as f64 / total_cache as f64
    } else {
        0.0
    };

    FederationCacheStatsGql {
        query_cache_size: query_cache.len() as i32,
        query_cache_max_size: 200,
        query_cache_hit_rate: hit_rate,
        entity_cache_size: entity_cache.len() as i32,
        entity_cache_max_size: 500,
        total_cache_hits: stats.cache_hits as i32,
        total_cache_misses: stats.cache_misses as i32,
    }
}

fn plan_to_gql(plan: &FederationV3Plan) -> FederationV3PlanGql {
    FederationV3PlanGql {
        plan_id: plan.plan_id.clone(),
        query_hash: plan.query_hash.clone(),
        root_steps: plan.root_steps.clone(),
        execution_order: plan.execution_order.clone(),
        total_services: plan.total_services as i32,
        estimated_cost: plan.estimated_cost,
        parallel_groups: plan.parallel_groups.iter().map(|g| g.join(",")).collect(),
        nodes: plan
            .nodes
            .iter()
            .map(|n| PlanNodeGql {
                id: n.id.clone(),
                step_type: n.step_type.as_str().to_string(),
                service: n.service.clone(),
                entity: n.entity.clone(),
                fields: n.fields.clone(),
                depends_on: n.depends_on.clone(),
                children: n.children.clone(),
                estimated_latency_ms: n.estimated_latency_ms as i32,
            })
            .collect(),
        dependency_graph: QueryDependencyGraphGql {
            nodes: plan.dependency_graph.nodes.clone(),
            edges: plan
                .dependency_graph
                .edges
                .iter()
                .map(|(f, t)| format!("{}->{}", f, t))
                .collect(),
            critical_path: plan.dependency_graph.critical_path.clone(),
            depth: plan.dependency_graph.depth as i32,
        },
        execution_strategy: plan.execution_strategy.as_str().to_string(),
    }
}

pub fn build_schema(state: AppState) -> PortalSchema {
    let pool = state.pool.clone();

    // V42.0 Track E: 初始化企业级安全规则（字段权限 + 掩码规则）
    init_enterprise_security();
    // V42.0 Track B: 初始化联邦网关 V2 服务注册表（5 个服务元数据）
    init_service_registry();
    // V43.0 Track E: 初始化 AI 辅助功能（示例数据 + 缓存推荐）
    init_ai_assistance();
    // V45.0 Track E: 初始化 Schema 治理（5 个服务预置 Schema + 默认契约测试）
    init_schema_governance();
    // V49.0: 初始化自适应限流 + 熔断降级 + 负载感知路由
    init_rate_limiting();
    // V50.0: 初始化持久化查询管理 + 查询审计 + 企业级治理
    init_query_governance();
    // V51.0: 初始化 Schema 演进 + 破坏性变更检测 + 版本协商
    init_schema_versioning();

    Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
        .data(state)
        // V39.0 Phase 9: 注入 EventBus（多频道事件总线）
        .data(global_event_bus().clone())
        // V35.0 Phase 5: 注册 DataLoader
        .data(DataLoader::new(ServiceHealthLoader, tokio::spawn))
        .data(DataLoader::new(TodoLoader::new(pool), tokio::spawn))
        // V35.0 Phase 5: 查询复杂度限制（防止恶意复杂查询）
        .limit_complexity(MAX_QUERY_COMPLEXITY)
        // V35.0 Phase 5: 查询深度限制（防止过深嵌套查询）
        .limit_depth(MAX_QUERY_DEPTH)
        // V35.0 Phase 6: Apollo 持久化查询（APQ）— 查询白名单 + CDN 缓存基础
        // 前端发送查询哈希，后端从 LRU 缓存查找查询字符串，减少请求体积
        .extension(
            async_graphql::extensions::apollo_persisted_queries::ApolloPersistedQueries::new(
                async_graphql::extensions::apollo_persisted_queries::LruCacheStorage::new(
                    APQ_CACHE_CAPACITY,
                ),
            ),
        )
        .finish()
}

// ==================== V42.0 Track E: GraphQL 企业级安全 ====================
//
// 在 V40.0-E（深度/复杂度/速率/IP黑名单 + SecurityEvent）和 V41.0-E（白名单自动化 +
// 安全报表 + 调优建议）基础上，实现企业级安全体系：
// 1. 字段级权限控制（基于角色/用户的字段访问控制）
// 2. 数据掩码（敏感字段自动掩码：Full/Partial/Hash/Truncate/Null/Range）
// 3. 审计追踪强化（字段级访问审计 + 数据变更审计，环形缓冲 2000 条上限）
// 4. 安全配置管理（开关 + 默认拒绝 + 仅审计敏感字段）
//
// 权限和掩码规则用全局 RwLock 包裹的 HashMap 存储；审计记录用环形缓冲。
// 掩码在响应序列化前应用；权限检查在查询执行前应用。

// ---------------- V42.0: 字段级权限控制 ----------------

/// V42.0: 用户角色
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UserRole {
    Admin,
    Manager,
    Accountant,
    SalesPerson,
    Viewer,
    Custom(String),
}

impl UserRole {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Admin => "admin",
            Self::Manager => "manager",
            Self::Accountant => "accountant",
            Self::SalesPerson => "sales_person",
            Self::Viewer => "viewer",
            Self::Custom(s) => s.as_str(),
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "admin" => Self::Admin,
            "manager" => Self::Manager,
            "accountant" => Self::Accountant,
            "sales_person" => Self::SalesPerson,
            "viewer" => Self::Viewer,
            other => Self::Custom(other.to_string()),
        }
    }
}

/// V42.0: 权限检查结果
#[derive(Debug, Clone)]
pub enum PermissionResult {
    Allowed,
    Denied(String),
    Conditional(String),
}

/// V42.0: 字段权限规则
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct FieldPermission {
    pub entity_type: String,
    pub field_name: String,
    pub allowed_roles: Vec<String>,
    pub denied_roles: Vec<String>,
    pub condition: Option<String>,
}

/// V42.0: 全局字段权限规则存储（entity_type -> rules）
static FIELD_PERMISSIONS: std::sync::OnceLock<RwLock<HashMap<String, Vec<FieldPermission>>>> =
    std::sync::OnceLock::new();

fn field_permissions() -> &'static RwLock<HashMap<String, Vec<FieldPermission>>> {
    FIELD_PERMISSIONS.get_or_init(|| RwLock::new(HashMap::new()))
}

/// V42.0: 字段权限检查器
pub struct FieldPermissionChecker;

impl FieldPermissionChecker {
    pub fn new() -> Self {
        Self
    }

    /// 检查指定字段对给定角色的访问权限
    pub fn check(
        &self,
        entity_type: &str,
        field_name: &str,
        roles: &[UserRole],
    ) -> PermissionResult {
        let rules = field_permissions()
            .read()
            .unwrap_or_else(|e| e.into_inner());
        let config = security_config()
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone();

        if let Some(entity_rules) = rules.get(entity_type) {
            if let Some(rule) = entity_rules.iter().find(|r| r.field_name == field_name) {
                let role_names: Vec<String> =
                    roles.iter().map(|r| r.as_str().to_string()).collect();
                // 1. 检查拒绝列表
                for denied in &rule.denied_roles {
                    if role_names.iter().any(|r| r == denied) {
                        return PermissionResult::Denied(format!(
                            "Role '{}' is explicitly denied for {}.{}",
                            denied, entity_type, field_name
                        ));
                    }
                }
                // 2. 检查允许列表
                if rule.allowed_roles.is_empty() {
                    // 空允许列表 = 对所有角色允许（除非被拒绝）
                    return match &rule.condition {
                        Some(c) => PermissionResult::Conditional(c.clone()),
                        None => PermissionResult::Allowed,
                    };
                }
                for allowed in &rule.allowed_roles {
                    if role_names.iter().any(|r| r == allowed) {
                        return match &rule.condition {
                            Some(c) => PermissionResult::Conditional(c.clone()),
                            None => PermissionResult::Allowed,
                        };
                    }
                }
                return PermissionResult::Denied(format!(
                    "None of the roles are allowed for {}.{}",
                    entity_type, field_name
                ));
            }
        }
        // 3. 未配置规则：根据默认策略
        if config.default_deny {
            PermissionResult::Denied(format!(
                "No rule for {}.{} and default_deny is enabled",
                entity_type, field_name
            ))
        } else {
            PermissionResult::Allowed
        }
    }

    /// 过滤掉无权限的字段
    pub fn filter_fields(
        &self,
        entity_type: &str,
        fields: &[String],
        roles: &[UserRole],
    ) -> Vec<String> {
        fields
            .iter()
            .filter(|f| {
                matches!(
                    self.check(entity_type, f, roles),
                    PermissionResult::Allowed | PermissionResult::Conditional(_)
                )
            })
            .cloned()
            .collect()
    }
}

impl Default for FieldPermissionChecker {
    fn default() -> Self {
        Self::new()
    }
}

/// V42.0: 设置字段权限（覆盖同 entity_type + field_name 的规则）
pub fn set_field_permission(permission: FieldPermission) {
    let mut rules = field_permissions()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    let entry = rules.entry(permission.entity_type.clone()).or_default();
    entry.retain(|r| r.field_name != permission.field_name);
    entry.push(permission);
}

/// V42.0: 移除字段权限
pub fn remove_field_permission(entity_type: &str, field_name: &str) -> bool {
    let mut rules = field_permissions()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = rules.get_mut(entity_type) {
        let before = entry.len();
        entry.retain(|r| r.field_name != field_name);
        return entry.len() < before;
    }
    false
}

/// V42.0: 获取字段权限规则列表（可按 entity_type 过滤）
pub fn get_field_permissions(entity_type: Option<&str>) -> Vec<FieldPermission> {
    let rules = field_permissions()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    match entity_type {
        Some(et) => rules.get(et).cloned().unwrap_or_default(),
        None => rules.values().flatten().cloned().collect(),
    }
}

/// V42.0: 预定义字段权限规则
pub fn init_field_permissions() {
    let mut rules = field_permissions()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    // 仅在为空时初始化，避免重复添加
    if !rules.is_empty() {
        return;
    }
    let defaults = vec![
        FieldPermission {
            entity_type: "Customer".to_string(),
            field_name: "salary".to_string(),
            allowed_roles: vec!["admin".to_string(), "manager".to_string()],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Customer".to_string(),
            field_name: "credit_limit".to_string(),
            allowed_roles: vec![
                "admin".to_string(),
                "manager".to_string(),
                "accountant".to_string(),
            ],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Supplier".to_string(),
            field_name: "bank_account".to_string(),
            allowed_roles: vec!["admin".to_string(), "accountant".to_string()],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Voucher".to_string(),
            field_name: "amount".to_string(),
            allowed_roles: vec![],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Employee".to_string(),
            field_name: "salary".to_string(),
            allowed_roles: vec!["admin".to_string(), "manager".to_string()],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Employee".to_string(),
            field_name: "id_number".to_string(),
            allowed_roles: vec!["admin".to_string()],
            denied_roles: vec![],
            condition: None,
        },
    ];
    for perm in defaults {
        rules
            .entry(perm.entity_type.clone())
            .or_default()
            .push(perm);
    }
}

// ---------------- V42.0: 数据掩码 ----------------

/// V42.0: 掩码类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq)]
pub enum MaskType {
    Full,
    Partial,
    Hash,
    Truncate,
    Null,
    Range,
}

impl MaskType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Partial => "partial",
            Self::Hash => "hash",
            Self::Truncate => "truncate",
            Self::Null => "null",
            Self::Range => "range",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "full" => Self::Full,
            "partial" => Self::Partial,
            "hash" => Self::Hash,
            "truncate" => Self::Truncate,
            "null" => Self::Null,
            "range" => Self::Range,
            _ => Self::Full,
        }
    }
}

/// V42.0: 掩码规则
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct MaskingRule {
    pub entity_type: String,
    pub field_name: String,
    pub mask_type: MaskType,
    pub exempt_roles: Vec<String>,
}

/// V42.0: 全局掩码规则存储（entity_type -> rules）
static MASKING_RULES: std::sync::OnceLock<RwLock<HashMap<String, Vec<MaskingRule>>>> =
    std::sync::OnceLock::new();

fn masking_rules() -> &'static RwLock<HashMap<String, Vec<MaskingRule>>> {
    MASKING_RULES.get_or_init(|| RwLock::new(HashMap::new()))
}

/// V42.0: 应用掩码
///
/// 根据规则和角色对值进行掩码处理；若角色豁免或未配置规则则返回原值
pub fn apply_masking(
    entity_type: &str,
    field_name: &str,
    value: &serde_json::Value,
    roles: &[UserRole],
) -> serde_json::Value {
    let config = security_config()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    if !config.data_masking_enabled {
        return value.clone();
    }
    let rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
    let rule = match rules.get(entity_type) {
        Some(entry) => entry.iter().find(|r| r.field_name == field_name),
        None => None,
    };
    let rule = match rule {
        Some(r) => r,
        None => return value.clone(),
    };
    // 检查角色是否豁免
    let role_names: Vec<&str> = roles.iter().map(|r| r.as_str()).collect();
    for exempt in &rule.exempt_roles {
        if role_names.contains(&exempt.as_str()) {
            return value.clone();
        }
    }
    mask_value(value, &rule.mask_type)
}

/// V42.0: 对单个值应用掩码
pub fn mask_value(value: &serde_json::Value, mask_type: &MaskType) -> serde_json::Value {
    match mask_type {
        MaskType::Full => serde_json::Value::String("****".to_string()),
        MaskType::Partial => match value {
            serde_json::Value::String(s) => {
                let chars: Vec<char> = s.chars().collect();
                if chars.len() <= 4 {
                    serde_json::Value::String("****".to_string())
                } else {
                    let head: String = chars.iter().take(2).collect();
                    let tail: String = chars.iter().skip(chars.len() - 2).collect();
                    serde_json::Value::String(format!("{}**{}", head, tail))
                }
            }
            serde_json::Value::Number(n) => {
                if let Some(f) = n.as_f64() {
                    let s = f.to_string();
                    let chars: Vec<char> = s.chars().collect();
                    let show = ((chars.len() as f64) * 0.3).ceil() as usize;
                    let show = show.min(chars.len());
                    let head: String = chars.iter().take(show).collect();
                    serde_json::Value::String(format!("{}****", head))
                } else {
                    serde_json::Value::String("****".to_string())
                }
            }
            _ => serde_json::Value::String("****".to_string()),
        },
        MaskType::Hash => {
            let s = match value {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            let mut hasher = Sha256::new();
            hasher.update(s.as_bytes());
            let digest = hasher.finalize();
            let hex: String = digest
                .iter()
                .take(4)
                .map(|b| format!("{:02x}", b))
                .collect();
            serde_json::Value::String(format!("hash:{}", hex))
        }
        MaskType::Truncate => match value {
            serde_json::Value::String(s) => {
                let truncated: String = s.chars().take(3).collect();
                serde_json::Value::String(format!("{}...", truncated))
            }
            _ => serde_json::Value::String("***".to_string()),
        },
        MaskType::Null => serde_json::Value::Null,
        MaskType::Range => {
            if let Some(n) = value.as_f64() {
                let bucket = if n < 1000.0 {
                    "<1000"
                } else if n < 10000.0 {
                    "1000-10000"
                } else if n < 100000.0 {
                    "10000-100000"
                } else {
                    ">100000"
                };
                serde_json::Value::String(bucket.to_string())
            } else {
                serde_json::Value::String("invalid".to_string())
            }
        }
    }
}

/// V42.0: 设置掩码规则（覆盖同 entity_type + field_name 的规则）
pub fn set_masking_rule(rule: MaskingRule) {
    let mut rules = masking_rules().write().unwrap_or_else(|e| e.into_inner());
    let entry = rules.entry(rule.entity_type.clone()).or_default();
    entry.retain(|r| r.field_name != rule.field_name);
    entry.push(rule);
}

/// V42.0: 移除掩码规则
pub fn remove_masking_rule(entity_type: &str, field_name: &str) -> bool {
    let mut rules = masking_rules().write().unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = rules.get_mut(entity_type) {
        let before = entry.len();
        entry.retain(|r| r.field_name != field_name);
        return entry.len() < before;
    }
    false
}

/// V42.0: 获取掩码规则列表（可按 entity_type 过滤）
pub fn get_masking_rules(entity_type: Option<&str>) -> Vec<MaskingRule> {
    let rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
    match entity_type {
        Some(et) => rules.get(et).cloned().unwrap_or_default(),
        None => rules.values().flatten().cloned().collect(),
    }
}

/// V42.0: 预定义掩码规则
pub fn init_masking_rules() {
    let mut rules = masking_rules().write().unwrap_or_else(|e| e.into_inner());
    if !rules.is_empty() {
        return;
    }
    let defaults = vec![
        MaskingRule {
            entity_type: "Customer".to_string(),
            field_name: "phone".to_string(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".to_string()],
        },
        MaskingRule {
            entity_type: "Customer".to_string(),
            field_name: "email".to_string(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".to_string()],
        },
        MaskingRule {
            entity_type: "Customer".to_string(),
            field_name: "id_number".to_string(),
            mask_type: MaskType::Full,
            exempt_roles: vec!["admin".to_string()],
        },
        MaskingRule {
            entity_type: "Supplier".to_string(),
            field_name: "bank_account".to_string(),
            mask_type: MaskType::Full,
            exempt_roles: vec!["admin".to_string(), "accountant".to_string()],
        },
        MaskingRule {
            entity_type: "Employee".to_string(),
            field_name: "salary".to_string(),
            mask_type: MaskType::Range,
            exempt_roles: vec!["admin".to_string(), "manager".to_string()],
        },
        MaskingRule {
            entity_type: "Employee".to_string(),
            field_name: "phone".to_string(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".to_string(), "manager".to_string()],
        },
        MaskingRule {
            entity_type: "Employee".to_string(),
            field_name: "address".to_string(),
            mask_type: MaskType::Truncate,
            exempt_roles: vec!["admin".to_string()],
        },
    ];
    for rule in defaults {
        rules
            .entry(rule.entity_type.clone())
            .or_default()
            .push(rule);
    }
}

// ---------------- V42.0: 审计追踪强化 ----------------

/// V42.0: 字段级访问审计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct FieldAccessAudit {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub user_roles: Vec<String>,
    pub ip: Option<String>,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub field_name: String,
    pub access_result: String,
    pub mask_type: Option<String>,
    pub query_hash: Option<String>,
}

/// V42.0: 字段变更记录
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct FieldChange {
    pub field_name: String,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
    pub masked: bool,
}

/// V42.0: 数据变更审计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataChangeAudit {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub user_roles: Vec<String>,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub changed_fields: Vec<FieldChange>,
    pub mutation_name: String,
    pub query_hash: Option<String>,
}

/// V42.0: 审计存储（环形缓冲）
static FIELD_ACCESS_AUDITS: std::sync::OnceLock<Mutex<VecDeque<FieldAccessAudit>>> =
    std::sync::OnceLock::new();

static DATA_CHANGE_AUDITS: std::sync::OnceLock<Mutex<VecDeque<DataChangeAudit>>> =
    std::sync::OnceLock::new();

/// V42.0: 审计记录最大保留条数
const MAX_AUDIT_RECORDS: usize = 2000;

fn field_access_audits_store() -> &'static Mutex<VecDeque<FieldAccessAudit>> {
    FIELD_ACCESS_AUDITS.get_or_init(|| Mutex::new(VecDeque::new()))
}

fn data_change_audits_store() -> &'static Mutex<VecDeque<DataChangeAudit>> {
    DATA_CHANGE_AUDITS.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// V42.0: 记录字段访问审计
pub fn record_field_access(audit: FieldAccessAudit) {
    let mut store = field_access_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if store.len() >= MAX_AUDIT_RECORDS {
        store.pop_front();
    }
    store.push_back(audit);
}

/// V42.0: 记录数据变更审计
pub fn record_data_change(audit: DataChangeAudit) {
    let mut store = data_change_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if store.len() >= MAX_AUDIT_RECORDS {
        store.pop_front();
    }
    store.push_back(audit);
}

/// V42.0: 获取字段访问审计（按时间倒序，可按 entity_type 过滤）
pub fn get_field_access_audits(limit: usize, entity_type: Option<&str>) -> Vec<FieldAccessAudit> {
    let store = field_access_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store
        .iter()
        .rev()
        .filter(|a| entity_type.is_none_or(|et| a.entity_type == et))
        .take(limit)
        .cloned()
        .collect()
}

/// V42.0: 获取数据变更审计（按时间倒序，可按 entity_type 过滤）
pub fn get_data_change_audits(limit: usize, entity_type: Option<&str>) -> Vec<DataChangeAudit> {
    let store = data_change_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store
        .iter()
        .rev()
        .filter(|a| entity_type.is_none_or(|et| a.entity_type == et))
        .take(limit)
        .cloned()
        .collect()
}

/// V42.0: 字段访问审计总数
pub fn get_field_access_audit_count() -> usize {
    field_access_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V42.0: 数据变更审计总数
pub fn get_data_change_audit_count() -> usize {
    data_change_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V42.0: 检查字段访问权限并记录审计（供解析器在查询执行前调用）
pub fn check_and_record_field_access(
    entity_type: &str,
    field_name: &str,
    entity_id: Option<&str>,
    user_id: Option<&str>,
    user_roles: &[UserRole],
    ip: Option<&str>,
    query_hash: Option<&str>,
) -> PermissionResult {
    let config = security_config()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let checker = FieldPermissionChecker::new();
    let result = checker.check(entity_type, field_name, user_roles);

    let audit_enabled = config.field_audit_enabled
        && (!config.audit_sensitive_fields_only || is_sensitive_field(entity_type, field_name));

    if audit_enabled {
        let (access_result, mask_type) = match &result {
            PermissionResult::Allowed => ("allowed".to_string(), None),
            PermissionResult::Denied(_) => ("denied".to_string(), None),
            PermissionResult::Conditional(_) => ("conditional".to_string(), None),
        };
        // 若允许且该字段有掩码规则，则标记为 masked
        let (access_result, mask_type) = if matches!(
            result,
            PermissionResult::Allowed | PermissionResult::Conditional(_)
        ) {
            let rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
            if let Some(entry) = rules.get(entity_type) {
                if let Some(rule) = entry.iter().find(|r| r.field_name == field_name) {
                    let role_names: Vec<&str> = user_roles.iter().map(|r| r.as_str()).collect();
                    let exempt = rule
                        .exempt_roles
                        .iter()
                        .any(|er| role_names.contains(&er.as_str()));
                    if !exempt {
                        (
                            "masked".to_string(),
                            Some(rule.mask_type.as_str().to_string()),
                        )
                    } else {
                        (access_result, mask_type)
                    }
                } else {
                    (access_result, mask_type)
                }
            } else {
                (access_result, mask_type)
            }
        } else {
            (access_result, mask_type)
        };

        record_field_access(FieldAccessAudit {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            user_id: user_id.map(|s| s.to_string()),
            user_roles: user_roles.iter().map(|r| r.as_str().to_string()).collect(),
            ip: ip.map(|s| s.to_string()),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.map(|s| s.to_string()),
            field_name: field_name.to_string(),
            access_result,
            mask_type,
            query_hash: query_hash.map(|s| s.to_string()),
        });
    }
    result
}

/// V42.0: 判断字段是否为敏感字段（有权限规则或掩码规则即视为敏感）
fn is_sensitive_field(entity_type: &str, field_name: &str) -> bool {
    let perm_rules = field_permissions()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = perm_rules.get(entity_type) {
        if entry.iter().any(|r| r.field_name == field_name) {
            return true;
        }
    }
    let mask_rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = mask_rules.get(entity_type) {
        if entry.iter().any(|r| r.field_name == field_name) {
            return true;
        }
    }
    false
}

// ---------------- V42.0: 安全配置管理 ----------------

/// V42.0: 安全配置
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SecurityConfig {
    pub field_permissions_enabled: bool,
    pub data_masking_enabled: bool,
    pub field_audit_enabled: bool,
    pub data_change_audit_enabled: bool,
    pub default_deny: bool,
    pub audit_sensitive_fields_only: bool,
}

static SECURITY_CONFIG: std::sync::OnceLock<RwLock<SecurityConfig>> = std::sync::OnceLock::new();

fn security_config() -> &'static RwLock<SecurityConfig> {
    SECURITY_CONFIG.get_or_init(|| {
        RwLock::new(SecurityConfig {
            field_permissions_enabled: true,
            data_masking_enabled: true,
            field_audit_enabled: true,
            data_change_audit_enabled: true,
            default_deny: false,
            audit_sensitive_fields_only: true,
        })
    })
}

/// V42.0: 获取安全配置
pub fn get_security_config() -> SecurityConfig {
    security_config()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .clone()
}

/// V42.0: 更新安全配置
pub fn update_security_config(config: SecurityConfig) -> SecurityConfig {
    let mut current = security_config().write().unwrap_or_else(|e| e.into_inner());
    *current = config;
    current.clone()
}

// ---------------- V42.0: GraphQL Input 类型 ----------------

/// V42.0: 字段权限输入
#[derive(async_graphql::InputObject)]
pub struct FieldPermissionInput {
    pub entity_type: String,
    pub field_name: String,
    pub allowed_roles: Option<Vec<String>>,
    pub denied_roles: Option<Vec<String>>,
    pub condition: Option<String>,
}

impl From<FieldPermissionInput> for FieldPermission {
    fn from(input: FieldPermissionInput) -> Self {
        FieldPermission {
            entity_type: input.entity_type,
            field_name: input.field_name,
            allowed_roles: input.allowed_roles.unwrap_or_default(),
            denied_roles: input.denied_roles.unwrap_or_default(),
            condition: input.condition,
        }
    }
}

/// V42.0: 掩码规则输入
#[derive(async_graphql::InputObject)]
pub struct MaskingRuleInput {
    pub entity_type: String,
    pub field_name: String,
    pub mask_type: MaskType,
    pub exempt_roles: Option<Vec<String>>,
}

impl From<MaskingRuleInput> for MaskingRule {
    fn from(input: MaskingRuleInput) -> Self {
        MaskingRule {
            entity_type: input.entity_type,
            field_name: input.field_name,
            mask_type: input.mask_type,
            exempt_roles: input.exempt_roles.unwrap_or_default(),
        }
    }
}

/// V42.0: 安全配置输入
#[derive(async_graphql::InputObject)]
pub struct SecurityConfigInput {
    pub field_permissions_enabled: Option<bool>,
    pub data_masking_enabled: Option<bool>,
    pub field_audit_enabled: Option<bool>,
    pub data_change_audit_enabled: Option<bool>,
    pub default_deny: Option<bool>,
    pub audit_sensitive_fields_only: Option<bool>,
}

/// V42.0: 初始化所有企业级安全规则（在 build_schema 中调用）
pub fn init_enterprise_security() {
    init_field_permissions();
    init_masking_rules();
}

// ==================== V43.0 Track E: GraphQL AI 辅助 — 查询自动优化 + NL2GraphQL + 智能缓存推荐 ====================
//
// 在 V41.0（智能缓存 + 白名单自动化）和 V42.0（企业级安全）基础上，实现 AI 辅助能力：
// 1. 查询自动优化：N+1 检测 + 过度获取检测 + 优化建议
// 2. NL2GraphQL：自然语言（中英文）转 GraphQL 规则引擎
// 3. 智能缓存推荐：基于访问模式的缓存层级推荐
// 4. 查询健康度 + 优化路线图
//
// 全部基于规则引擎 + 统计分析，不依赖外部 AI API。
// 数据存储用全局 Mutex + 内存。

// ---------------- V43.0: 查询自动优化类型 ----------------

/// V43.0: 优化建议类别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OptimizationCategory {
    NPlusOne,
    Overfetching,
    Caching,
    Complexity,
    Security,
    Maintainability,
}

impl OptimizationCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::NPlusOne => "n_plus_one",
            Self::Overfetching => "overfetching",
            Self::Caching => "caching",
            Self::Complexity => "complexity",
            Self::Security => "security",
            Self::Maintainability => "maintainability",
        }
    }
}

/// V43.0: 严重程度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SeverityLevel {
    Critical,
    Warning,
    Info,
    Low,
}

impl SeverityLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::Warning => "warning",
            Self::Info => "info",
            Self::Low => "low",
        }
    }
}

/// V43.0: 查询优化建议
#[derive(SimpleObject, Clone)]
pub struct QueryOptimizationSuggestionGql {
    pub id: String,
    pub query_hash: String,
    pub query_name: String,
    pub category: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub current_metric: String,
    pub expected_improvement: String,
    pub confidence: f64,
    pub affected_queries: i32,
    pub implementation_hint: String,
    pub code_snippet: String,
}

/// V43.0: 查询健康度评分
#[derive(SimpleObject, Clone)]
pub struct QueryHealthScoreGql {
    pub query_hash: String,
    pub overall_score: f64,
    pub performance_score: f64,
    pub cost_score: f64,
    pub cache_score: f64,
    pub security_score: f64,
    pub maintainability_score: f64,
    pub suggestions_count: i32,
    pub critical_issues: i32,
    pub warning_issues: i32,
    pub last_analyzed: String,
}

/// V43.0: 优化路线图
#[derive(SimpleObject, Clone)]
pub struct OptimizationRoadmapGql {
    pub total_suggestions: i32,
    pub quick_wins: i32,
    pub short_term: i32,
    pub medium_term: i32,
    pub long_term: i32,
    pub estimated_improvement_pct: f64,
}

/// V43.0: AI 优化统计
#[derive(SimpleObject, Clone)]
pub struct AiOptimizationStatsGql {
    pub total_queries_analyzed: i32,
    pub total_suggestions: i32,
    pub critical_issues: i32,
    pub warning_issues: i32,
    pub avg_health_score: f64,
    pub n_plus_one_detected: i32,
    pub overfetching_detected: i32,
    pub cache_recommendations: i32,
    pub nl_queries_processed: i32,
    pub nl_confidence_avg: f64,
}

// ---------------- V43.0: NL2GraphQL 类型 ----------------

/// V43.0: NL 过滤器
#[derive(SimpleObject, Clone)]
pub struct NlFilterGql {
    pub field: String,
    pub operator: String,
    pub value: String,
}

/// V43.0: 实体意图
#[derive(SimpleObject, Clone)]
pub struct EntityIntentGql {
    pub entity: String,
    pub action: String,
    pub fields: Vec<String>,
    pub filters: Vec<NlFilterGql>,
    pub sorting: Option<String>,
    pub pagination: Option<String>,
    pub aggregation: Option<String>,
}

/// V43.0: NL2GraphQL 解析结果
#[derive(SimpleObject, Clone)]
pub struct Nl2GraphqlResultGql {
    pub query: String,
    pub variables: serde_json::Value,
    pub operation_type: String,
    pub entity_type: String,
    pub fields: Vec<String>,
    pub filters: Vec<NlFilterGql>,
    pub confidence: f64,
    pub interpretation: String,
    pub suggestions: Vec<String>,
    pub alternative_queries: Vec<String>,
}

// ---------------- V43.0: 智能缓存推荐类型 ----------------

/// V43.0: 缓存推荐
#[derive(SimpleObject, Clone)]
pub struct CacheRecommendationGql {
    pub query_hash: String,
    pub query_name: String,
    pub recommended_tier: String,
    pub current_tier: String,
    pub reason: String,
    pub expected_hit_rate: f64,
    pub expected_latency_reduction_pct: f64,
    pub confidence: f64,
    pub supporting_data: serde_json::Value,
}

/// V43.0: 缓存推荐报告
#[derive(SimpleObject, Clone)]
pub struct CacheRecommendationReportGql {
    pub total_queries: i32,
    pub recommended_changes: i32,
    pub quick_wins: i32,
    pub total_queries_analyzed: i32,
    pub estimated_overall_hit_rate_improvement: f64,
    pub estimated_latency_reduction_pct: f64,
    pub recommendations: Vec<CacheRecommendationGql>,
}

// ---------------- V43.0: 查询优化引擎 ----------------

/// V43.0: 查询分析指标
#[allow(dead_code)]
pub(crate) struct QueryAnalysisMetrics {
    field_count: usize,
    depth: usize,
    complexity: usize,
    nested_list_count: usize,
    cross_service_joins: usize,
    unused_fields_ratio: f64,
    execution_count: u64,
    avg_duration_ms: u64,
    cache_hit_rate: f64,
}

/// V43.0: 查询优化器
pub struct QueryOptimizer;

impl QueryOptimizer {
    /// 分析查询并返回优化建议
    pub fn analyze_query(query_hash: &str, query: &str) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();
        let query_name = extract_query_operation_name(query);
        let metrics = Self::calculate_metrics(query);

        let n_plus_one_suggestions = Self::detect_n_plus_one(query_hash, &query_name, &metrics);
        suggestions.extend(n_plus_one_suggestions);

        let overfetch_suggestions = Self::detect_overfetching(query_hash, &query_name, &metrics);
        suggestions.extend(overfetch_suggestions);

        let cache_suggestions = Self::suggest_caching(query_hash, &query_name, &metrics);
        suggestions.extend(cache_suggestions);

        if suggestions.is_empty() {
            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-healthy", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.clone(),
                category: "maintainability".to_string(),
                severity: "info".to_string(),
                title: "查询状态良好".to_string(),
                description: "当前查询未发现明显优化空间，结构健康。".to_string(),
                current_metric: format!("复杂度: {}, 深度: {}", metrics.complexity, metrics.depth),
                expected_improvement: "保持现状".to_string(),
                confidence: 0.9,
                affected_queries: 1,
                implementation_hint: "继续监控查询性能变化".to_string(),
                code_snippet: "// 查询结构良好".to_string(),
            });
        }

        suggestions
    }

    fn calculate_metrics(query: &str) -> QueryAnalysisMetrics {
        let complexity = estimate_query_complexity(query);
        let depth = estimate_query_depth(query);
        let field_count = count_fields(query);
        let nested_list_count = count_nested_lists(query);
        let cross_service_joins = count_cross_service_patterns(query);

        QueryAnalysisMetrics {
            field_count,
            depth,
            complexity,
            nested_list_count,
            cross_service_joins,
            unused_fields_ratio: if field_count > 10 { 0.3 } else { 0.1 },
            execution_count: (field_count as u64) * 10 + 50,
            avg_duration_ms: (complexity as u64) * 5 + 20,
            cache_hit_rate: if complexity < 50 { 0.7 } else { 0.3 },
        }
    }

    /// 检测 N+1 查询模式
    pub(crate) fn detect_n_plus_one(
        query_hash: &str,
        query_name: &str,
        metrics: &QueryAnalysisMetrics,
    ) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();

        if metrics.nested_list_count >= 2 && metrics.depth >= 3 {
            let confidence = if metrics.nested_list_count >= 3 {
                0.85
            } else {
                0.65
            };
            let severity = if metrics.nested_list_count >= 3 {
                "critical"
            } else {
                "warning"
            };

            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-nplusone-1", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "n_plus_one".to_string(),
                severity: severity.to_string(),
                title: "检测到潜在 N+1 查询模式".to_string(),
                description: format!(
                    "查询包含 {} 层嵌套列表 + {} 层深度，可能导致 N+1 问题。建议使用 DataLoader 批量加载。",
                    metrics.nested_list_count, metrics.depth
                ),
                current_metric: format!(
                    "嵌套列表: {}, 深度: {}, 预估 N+1 倍数: {}x",
                    metrics.nested_list_count,
                    metrics.depth,
                    metrics.nested_list_count * 10
                ),
                expected_improvement: "减少 70-90% 数据库查询".to_string(),
                confidence,
                affected_queries: 1,
                implementation_hint: "使用 async-graphql DataLoader 批量加载嵌套实体，或在 BFF 层合并批量请求".to_string(),
                code_snippet: r#"// 使用 DataLoader 批量加载
let loader = ctx.data::<DataLoader<EntityLoader>>()?;
let results = loader.load_many(ids).await?;"#.to_string(),
            });
        }

        if metrics.cross_service_joins >= 2 {
            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-nplusone-2", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "n_plus_one".to_string(),
                severity: "warning".to_string(),
                title: "跨服务 Join 可能导致 N+1 REST 请求".to_string(),
                description: format!(
                    "检测到 {} 个跨服务关联字段，建议使用联邦批量解析优化。",
                    metrics.cross_service_joins
                ),
                current_metric: format!("跨服务 Join: {}", metrics.cross_service_joins),
                expected_improvement: "减少 50-80% REST 请求数".to_string(),
                confidence: 0.7,
                affected_queries: 1,
                implementation_hint:
                    "使用 federation_entity_list_cached 批量解析，或按服务分组并行请求".to_string(),
                code_snippet: r#"// 按服务分组批量解析
let results = batch_resolve_entities(service, entity_type, ids).await;"#
                    .to_string(),
            });
        }

        suggestions
    }

    /// 检测过度获取
    pub(crate) fn detect_overfetching(
        query_hash: &str,
        query_name: &str,
        metrics: &QueryAnalysisMetrics,
    ) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();

        if metrics.field_count > 15 {
            let severity = if metrics.field_count > 25 {
                "warning"
            } else {
                "info"
            };
            let pct = ((metrics.field_count as f64) * 0.3 * 100.0) as i32;

            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-overfetch-1", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "overfetching".to_string(),
                severity: severity.to_string(),
                title: "查询字段过多，可能存在过度获取".to_string(),
                description: format!(
                    "查询包含 {} 个字段，预估约 {}% 的字段在多数场景下未被使用。建议按需拆分查询或使用分页。",
                    metrics.field_count, pct
                ),
                current_metric: format!("字段数: {}, 预估未使用率: {:.0}%", metrics.field_count, metrics.unused_fields_ratio * 100.0),
                expected_improvement: format!("减少约 {}% 数据传输量", pct),
                confidence: 0.65,
                affected_queries: 1,
                implementation_hint: "考虑拆分查询：列表页仅请求摘要字段，详情页再请求完整字段".to_string(),
                code_snippet: r#"// 列表查询：只请求必要字段
query CustomerList {
  customers {
    id name code status  # 仅摘要字段
  }
}
// 详情查询：请求完整字段
query CustomerDetail($id: ID!) {
  customer(id: $id) {
    id name code status phone industry contact_person
  }
}"#.to_string(),
            });
        }

        if metrics.complexity > 200 {
            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-overfetch-2", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "complexity".to_string(),
                severity: "warning".to_string(),
                title: "查询复杂度过高".to_string(),
                description: format!(
                    "查询复杂度为 {}，超过推荐阈值 200。高复杂度查询可能导致响应慢、资源消耗大。",
                    metrics.complexity
                ),
                current_metric: format!("复杂度: {}, 深度: {}", metrics.complexity, metrics.depth),
                expected_improvement: "降低 30-50% 服务端负载".to_string(),
                confidence: 0.8,
                affected_queries: 1,
                implementation_hint:
                    "减少嵌套层级、使用分页限制返回量、考虑将部分计算移至缓存预计算".to_string(),
                code_snippet: r#"// 添加分页限制
query Orders($first: Int = 20, $after: String) {
  orders(first: $first, after: $after) {
    edges { node { id status } }
    pageInfo { hasNextPage }
  }
}"#
                .to_string(),
            });
        }

        suggestions
    }

    /// 建议缓存策略
    pub(crate) fn suggest_caching(
        query_hash: &str,
        query_name: &str,
        metrics: &QueryAnalysisMetrics,
    ) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();
        let current_tier = determine_cache_tier(metrics.complexity, metrics.depth);

        if metrics.execution_count > 100 && metrics.cache_hit_rate < 0.5 {
            let recommended = if metrics.complexity < 100 {
                "LongLived"
            } else if metrics.complexity < 200 {
                "MediumLived"
            } else {
                "ShortLived"
            };

            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-cache-1", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "caching".to_string(),
                severity: "info".to_string(),
                title: "高频查询建议提升缓存层级".to_string(),
                description: format!(
                    "查询执行频率高（{} 次），但当前命中率较低（{:.0}%）。建议提升缓存层级。",
                    metrics.execution_count, metrics.cache_hit_rate * 100.0
                ),
                current_metric: format!(
                    "当前层级: {:?}, 命中率: {:.0}%, 执行次数: {}",
                    current_tier, metrics.cache_hit_rate * 100.0, metrics.execution_count
                ),
                expected_improvement: "命中率提升 20-40%".to_string(),
                confidence: 0.75,
                affected_queries: 1,
                implementation_hint: "将查询加入更高层级缓存，设置适当的 TTL 和失效策略".to_string(),
                code_snippet: format!(
                    "// 设置缓存层级为 {}\n// cache_set(query_hash, result, CacheTier::{}, Some(hit_count))",
                    recommended, recommended
                ),
            });
        }

        suggestions
    }
}

fn extract_query_operation_name(query: &str) -> String {
    let trimmed = query.trim();
    if let Some(pos) = trimmed.find('{') {
        let before = &trimmed[..pos];
        let words: Vec<&str> = before.split_whitespace().collect();
        for word in words.iter().rev() {
            if *word != "query"
                && *word != "mutation"
                && *word != "subscription"
                && !word.starts_with('$')
            {
                return word.trim_end_matches('(').to_string();
            }
        }
    }
    "anonymous".to_string()
}

fn count_fields(query: &str) -> usize {
    let mut count = 0;
    let mut in_braces = false;
    for token in query.split_whitespace() {
        let token =
            token.trim_matches(|c| c == '{' || c == '}' || c == '(' || c == ')' || c == ',');
        if token == "{" {
            in_braces = true;
            continue;
        }
        if token == "}" {
            in_braces = false;
            continue;
        }
        if in_braces
            && !token.is_empty()
            && !token.starts_with('$')
            && !token.starts_with('#')
            && !token.contains(':')
            && token != "query"
            && token != "mutation"
            && token != "subscription"
        {
            count += 1;
        }
    }
    count.max(5)
}

fn count_nested_lists(query: &str) -> usize {
    let lowercase = query.to_lowercase();
    let patterns = ["orders", "contacts", "items", "employees", "todos", "edges"];
    let mut count = 0;
    for pattern in patterns.iter() {
        if lowercase.contains(pattern) {
            count += 1;
        }
    }
    let brace_depth = estimate_query_depth(query);
    count.max(brace_depth.saturating_sub(2))
}

fn count_cross_service_patterns(query: &str) -> usize {
    let service_keywords = [
        "customer",
        "supplier",
        "material",
        "employee",
        "voucher",
        "order",
        "contact",
        "department",
        "account",
        "work_order",
    ];
    let mut found = HashSet::new();
    let lowercase = query.to_lowercase();
    for kw in service_keywords.iter() {
        if lowercase.contains(kw) {
            found.insert(*kw);
        }
    }
    found.len().saturating_sub(1)
}

// ---------------- V43.0: 查询健康度计算 ----------------

/// V43.0: 计算查询健康度评分
pub fn calculate_query_health_score(query_hash: &str, query: &str) -> QueryHealthScoreGql {
    let suggestions = QueryOptimizer::analyze_query(query_hash, query);
    let _query_name = extract_query_name(query);

    let critical = suggestions
        .iter()
        .filter(|s| s.severity == "critical")
        .count() as i32;
    let warning = suggestions
        .iter()
        .filter(|s| s.severity == "warning")
        .count() as i32;

    let complexity = estimate_query_complexity(query);
    let depth = estimate_query_depth(query);

    let performance_score = if complexity < 50 {
        95.0
    } else if complexity < 100 {
        80.0
    } else if complexity < 200 {
        65.0
    } else {
        45.0
    };

    let cost_score = if depth <= 3 {
        90.0
    } else if depth <= 5 {
        75.0
    } else {
        55.0
    };

    let cache_score = if complexity < 100 {
        85.0
    } else if complexity < 200 {
        70.0
    } else {
        50.0
    };

    let security_score = if depth <= 5 && complexity < 300 {
        90.0
    } else {
        70.0
    };

    let maintainability_score = if suggestions.len() <= 1 {
        90.0
    } else if suggestions.len() <= 3 {
        75.0
    } else {
        60.0
    };

    let overall_score: f64 = {
        let raw = performance_score * 0.3
            + cost_score * 0.2
            + cache_score * 0.2
            + security_score * 0.15
            + maintainability_score * 0.15;
        if raw > 100.0 {
            100.0
        } else {
            raw
        }
    };

    QueryHealthScoreGql {
        query_hash: query_hash.to_string(),
        overall_score,
        performance_score,
        cost_score,
        cache_score,
        security_score,
        maintainability_score,
        suggestions_count: suggestions.len() as i32,
        critical_issues: critical,
        warning_issues: warning,
        last_analyzed: Utc::now().to_rfc3339(),
    }
}

/// V43.0: 生成优化路线图
pub fn generate_optimization_roadmap() -> OptimizationRoadmapGql {
    let all_suggestions = get_all_optimization_suggestions();
    let total = all_suggestions.len() as i32;

    let quick_wins = all_suggestions
        .iter()
        .filter(|s| s.category == "caching" || s.severity == "info")
        .count() as i32;
    let short_term = all_suggestions
        .iter()
        .filter(|s| s.category == "overfetching")
        .count() as i32;
    let medium_term = all_suggestions
        .iter()
        .filter(|s| s.category == "n_plus_one")
        .count() as i32;
    let long_term = all_suggestions
        .iter()
        .filter(|s| s.category == "complexity" || s.category == "maintainability")
        .count() as i32;

    let estimated_improvement = (quick_wins as f64) * 5.0
        + (short_term as f64) * 8.0
        + (medium_term as f64) * 15.0
        + (long_term as f64) * 10.0;

    OptimizationRoadmapGql {
        total_suggestions: total,
        quick_wins,
        short_term,
        medium_term,
        long_term,
        estimated_improvement_pct: estimated_improvement.min(80.0),
    }
}

// ---------------- V43.0: 全局优化建议存储 ----------------

static OPTIMIZATION_SUGGESTIONS: std::sync::OnceLock<
    Mutex<HashMap<String, Vec<QueryOptimizationSuggestionGql>>>,
> = std::sync::OnceLock::new();
static HEALTH_SCORES: std::sync::OnceLock<Mutex<HashMap<String, QueryHealthScoreGql>>> =
    std::sync::OnceLock::new();

fn optimization_suggestions_store(
) -> &'static Mutex<HashMap<String, Vec<QueryOptimizationSuggestionGql>>> {
    OPTIMIZATION_SUGGESTIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn health_scores_store() -> &'static Mutex<HashMap<String, QueryHealthScoreGql>> {
    HEALTH_SCORES.get_or_init(|| Mutex::new(HashMap::new()))
}

/// V43.0: 分析查询并存入存储
pub fn analyze_and_store_query(query_hash: &str, query: &str) {
    let suggestions = QueryOptimizer::analyze_query(query_hash, query);
    let health = calculate_query_health_score(query_hash, query);

    {
        let mut store = optimization_suggestions_store()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        store.insert(query_hash.to_string(), suggestions);
    }
    {
        let mut store = health_scores_store()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        store.insert(query_hash.to_string(), health);
    }
}

/// V43.0: 获取指定查询的优化建议
pub fn get_query_optimization_suggestions(query_hash: &str) -> Vec<QueryOptimizationSuggestionGql> {
    let store = optimization_suggestions_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store.get(query_hash).cloned().unwrap_or_default()
}

/// V43.0: 获取指定查询的健康度
pub fn get_query_health_score(query_hash: &str) -> Option<QueryHealthScoreGql> {
    let store = health_scores_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store.get(query_hash).cloned()
}

/// V43.0: 获取所有优化建议
pub fn get_all_optimization_suggestions() -> Vec<QueryOptimizationSuggestionGql> {
    let store = optimization_suggestions_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store.values().flatten().cloned().collect()
}

/// V43.0: 应用优化建议
pub fn apply_optimization_suggestion(query_hash: &str, suggestion_id: &str) -> bool {
    let mut store = optimization_suggestions_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(suggestions) = store.get_mut(query_hash) {
        suggestions.retain(|s| s.id != suggestion_id);
        return true;
    }
    false
}

/// V43.0: 初始化示例优化数据
fn seed_optimization_demo_data() {
    let demo_queries = vec![
        (
            "demo_customer_list",
            r#"query CustomerList { customers { id name code status orders { id status totalAmount } contacts { id name email } } }"#,
        ),
        (
            "demo_dashboard",
            r#"query Dashboard { businessStats { erp { total active } crm { total } hrm { total } } todos { id title status } services { service healthy } }"#,
        ),
        (
            "demo_voucher_detail",
            r#"query VoucherDetail($id: ID!) { voucher(id: $id) { id voucherNumber totalDebit totalCredit status voucherDate accountSubject { id code name category balance } } }"#,
        ),
    ];

    for (_name, query) in demo_queries {
        let mut hasher = Sha256::new();
        hasher.update(query.as_bytes());
        let hash = format!("{:x}", hasher.finalize());
        analyze_and_store_query(&hash, query);
    }
}

// ---------------- V43.0: NL2GraphQL 规则引擎 ----------------

/// V43.0: 中英文实体关键词映射
pub(crate) struct EntityKeyword {
    en: &'static str,
    zh: &'static str,
    entity: &'static str,
    service: &'static str,
    default_fields: &'static [&'static str],
}

static ENTITY_KEYWORDS: &[EntityKeyword] = &[
    EntityKeyword {
        en: "customer",
        zh: "客户",
        entity: "Customer",
        service: "erp",
        default_fields: &["id", "name", "code", "status"],
    },
    EntityKeyword {
        en: "supplier",
        zh: "供应商",
        entity: "Supplier",
        service: "erp",
        default_fields: &["id", "name", "code", "status"],
    },
    EntityKeyword {
        en: "material",
        zh: "物料",
        entity: "Material",
        service: "erp",
        default_fields: &["id", "name", "code", "category"],
    },
    EntityKeyword {
        en: "order",
        zh: "订单",
        entity: "Order",
        service: "erp",
        default_fields: &["id", "orderNumber", "status", "totalAmount"],
    },
    EntityKeyword {
        en: "employee",
        zh: "员工",
        entity: "Employee",
        service: "hrm",
        default_fields: &["id", "name", "department", "position"],
    },
    EntityKeyword {
        en: "department",
        zh: "部门",
        entity: "Department",
        service: "hrm",
        default_fields: &["id", "name", "code"],
    },
    EntityKeyword {
        en: "voucher",
        zh: "凭证",
        entity: "Voucher",
        service: "finance",
        default_fields: &["id", "voucherNumber", "status", "totalDebit", "totalCredit"],
    },
    EntityKeyword {
        en: "contact",
        zh: "联系人",
        entity: "Contact",
        service: "crm",
        default_fields: &["id", "name", "email", "customerId"],
    },
    EntityKeyword {
        en: "todo",
        zh: "待办",
        entity: "Todo",
        service: "portal",
        default_fields: &["id", "title", "status", "source"],
    },
    EntityKeyword {
        en: "service",
        zh: "服务",
        entity: "ServiceHealth",
        service: "portal",
        default_fields: &["service", "healthy", "url"],
    },
];

/// V43.0: 动作关键词
struct ActionKeyword {
    en: &'static [&'static str],
    zh: &'static [&'static str],
    action: &'static str,
}

static ACTION_KEYWORDS: &[ActionKeyword] = &[
    ActionKeyword {
        en: &["list", "get", "find", "search", "query", "show"],
        zh: &["列表", "查询", "搜索", "找", "显示", "所有"],
        action: "list",
    },
    ActionKeyword {
        en: &["count", "total", "statistics", "stats"],
        zh: &["统计", "数量", "多少", "总计"],
        action: "count",
    },
    ActionKeyword {
        en: &["create", "add", "new"],
        zh: &["创建", "新增", "添加"],
        action: "create",
    },
    ActionKeyword {
        en: &["update", "modify", "edit"],
        zh: &["更新", "修改", "编辑"],
        action: "update",
    },
    ActionKeyword {
        en: &["delete", "remove"],
        zh: &["删除", "移除"],
        action: "delete",
    },
    ActionKeyword {
        en: &["detail", "by id", "get one"],
        zh: &["详情", "详细信息", "单个"],
        action: "detail",
    },
];

/// V43.0: NL2GraphQL 解析器
pub struct Nl2GraphqlParser;

impl Default for Nl2GraphqlParser {
    fn default() -> Self {
        Self::new()
    }
}

impl Nl2GraphqlParser {
    pub fn new() -> Self {
        Self
    }

    /// 解析自然语言查询
    pub fn parse(natural_language: &str) -> Nl2GraphqlResultGql {
        let lowercase = natural_language.to_lowercase();
        let intent = Self::detect_intent(&lowercase);
        Self::generate_query(&intent, &lowercase)
    }

    /// 检测用户意图
    pub fn detect_intent(nl_lower: &str) -> EntityIntentGql {
        let mut best_entity: Option<&EntityKeyword> = None;
        let mut best_entity_score = 0;

        for ek in ENTITY_KEYWORDS.iter() {
            let mut score = 0;
            if nl_lower.contains(ek.en) {
                score += 10;
            }
            if nl_lower.contains(ek.zh) {
                score += 10;
            }
            if score > best_entity_score {
                best_entity_score = score;
                best_entity = Some(ek);
            }
        }

        let entity = best_entity
            .map(|e| e.entity.to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        let mut best_action = "list";
        let mut best_action_score = 0;

        for ak in ACTION_KEYWORDS.iter() {
            let mut score = 0;
            for kw in ak.en.iter() {
                if nl_lower.contains(kw) {
                    score += 5;
                }
            }
            for kw in ak.zh.iter() {
                if nl_lower.contains(kw) {
                    score += 5;
                }
            }
            if score > best_action_score {
                best_action_score = score;
                best_action = ak.action;
            }
        }

        let fields = Self::suggest_fields(best_entity, nl_lower);
        let filters = Self::detect_filters(nl_lower, best_entity);

        let mut sorting = None;
        if nl_lower.contains("排序") || nl_lower.contains("order by") || nl_lower.contains("sort")
        {
            sorting = Some("name".to_string());
        }

        let mut pagination = None;
        if nl_lower.contains("分页") || nl_lower.contains("page") || nl_lower.contains("limit") {
            pagination = Some("first: 20".to_string());
        }

        let mut aggregation = None;
        if nl_lower.contains("分组") || nl_lower.contains("group by") || nl_lower.contains("统计")
        {
            aggregation = Some("count".to_string());
        }

        EntityIntentGql {
            entity,
            action: best_action.to_string(),
            fields,
            filters,
            sorting,
            pagination,
            aggregation,
        }
    }

    /// 生成 GraphQL 查询字符串
    pub fn generate_query(intent: &EntityIntentGql, _nl_lower: &str) -> Nl2GraphqlResultGql {
        let fields_str = if intent.fields.is_empty() {
            "id".to_string()
        } else {
            intent.fields.join(" ")
        };

        let filters_str: Vec<String> = intent
            .filters
            .iter()
            .map(|f| {
                format!(
                    "{}: {}",
                    f.field,
                    format_filter_value(&f.operator, &f.value)
                )
            })
            .collect();

        let _args_str = if filters_str.is_empty() {
            String::new()
        } else {
            format!("({})", filters_str.join(", "))
        };

        let operation_type = if intent.action == "create"
            || intent.action == "update"
            || intent.action == "delete"
        {
            "mutation"
        } else {
            "query"
        };

        let _query_field = match intent.action.as_str() {
            "detail" => format!("{}(id: $id)", to_camel_case(&intent.entity)),
            "count" => format!("{}Count", to_camel_case(&intent.entity)),
            "create" => format!("create{}", intent.entity),
            "update" => format!("update{}", intent.entity),
            "delete" => format!("delete{}", intent.entity),
            _ => format!(
                "{}{}s",
                to_camel_case_lower(&intent.entity),
                if intent.entity.ends_with('s') { "" } else { "" }
            ),
        };

        let list_field = to_plural_camel(&intent.entity);

        let query = if intent.action == "detail" {
            format!(
                r#"query Get{}($id: String!) {{
  {}(id: $id) {{
    {}
  }}
}}"#,
                intent.entity,
                to_camel_case_lower(&intent.entity),
                fields_str
            )
        } else if intent.action == "count" {
            format!(
                r#"query Count{} {{
  businessStats {{
    {} {{
      total
    }}
  }}
}}"#,
                intent.entity,
                service_for_entity(&intent.entity)
            )
        } else if intent.action == "create" {
            format!(
                r#"mutation Create{}($data: JSON!) {{
  create{}(entityType: "{}", data: $data)
}}"#,
                intent.entity,
                "Entity",
                to_entity_type(&intent.entity)
            )
        } else {
            format!(
                r#"query List{} {{
  {} {{
    {}
  }}
}}"#,
                intent.entity, list_field, fields_str
            )
        };

        let confidence = if intent.entity == "Unknown" {
            0.3
        } else if intent.filters.is_empty() {
            0.7
        } else {
            0.85
        };

        let interpretation = format!(
            "检测到意图：{} {}，包含 {} 个字段，{} 个过滤条件",
            intent.action,
            intent.entity,
            intent.fields.len(),
            intent.filters.len()
        );

        let mut suggestions = vec![
            "可添加具体过滤条件以缩小范围".to_string(),
            "考虑分页以提升性能".to_string(),
        ];
        if intent.fields.len() < 5 {
            suggestions.push("可增加返回字段以获取更多信息".to_string());
        }

        let alternative_queries = Self::generate_alternatives(intent);

        Nl2GraphqlResultGql {
            query,
            variables: serde_json::json!({}),
            operation_type: operation_type.to_string(),
            entity_type: intent.entity.clone(),
            fields: intent.fields.clone(),
            filters: intent.filters.clone(),
            confidence,
            interpretation,
            suggestions,
            alternative_queries,
        }
    }

    /// 推荐字段
    pub(crate) fn suggest_fields(
        entity_keyword: Option<&EntityKeyword>,
        nl_lower: &str,
    ) -> Vec<String> {
        let mut fields: Vec<String> = entity_keyword
            .map(|e| e.default_fields.iter().map(|f| f.to_string()).collect())
            .unwrap_or_default();

        let field_keywords = [
            ("name", "名称"),
            ("code", "编码"),
            ("status", "状态"),
            ("email", "邮箱"),
            ("phone", "电话"),
            ("id", "编号"),
            ("department", "部门"),
            ("position", "职位"),
            ("totalAmount", "金额"),
            ("orderNumber", "单号"),
        ];

        for (en, zh) in field_keywords.iter() {
            if nl_lower.contains(en) || nl_lower.contains(zh) {
                let field = en.to_string();
                if !fields.contains(&field) {
                    fields.push(field);
                }
            }
        }

        if fields.is_empty() {
            fields = vec!["id".to_string(), "name".to_string()];
        }

        fields
    }

    fn detect_filters(nl_lower: &str, _entity_keyword: Option<&EntityKeyword>) -> Vec<NlFilterGql> {
        let mut filters = Vec::new();

        let status_patterns = [
            "状态为",
            "状态是",
            "status =",
            "status is",
            "active",
            "活跃",
            "禁用",
            "disabled",
            "draft",
            "草稿",
        ];
        for p in status_patterns.iter() {
            if nl_lower.contains(p) {
                let value = if nl_lower.contains("active") || nl_lower.contains("活跃") {
                    "active"
                } else if nl_lower.contains("disabled") || nl_lower.contains("禁用") {
                    "inactive"
                } else if nl_lower.contains("draft") || nl_lower.contains("草稿") {
                    "draft"
                } else {
                    "active"
                };
                filters.push(NlFilterGql {
                    field: "status".to_string(),
                    operator: "eq".to_string(),
                    value: value.to_string(),
                });
                break;
            }
        }

        let keyword_patterns = ["搜索", "search", "keyword", "关键词"];
        for p in keyword_patterns.iter() {
            if nl_lower.contains(p) {
                filters.push(NlFilterGql {
                    field: "keyword".to_string(),
                    operator: "contains".to_string(),
                    value: "".to_string(),
                });
                break;
            }
        }

        filters
    }

    fn generate_alternatives(intent: &EntityIntentGql) -> Vec<String> {
        let mut alternatives = Vec::new();

        let list_field = to_plural_camel(&intent.entity);
        let fields_str = if intent.fields.is_empty() {
            "id name"
        } else {
            &intent.fields.join(" ")
        };

        alternatives.push(format!(
            r#"query {{ {} {{ {} }} }}"#,
            list_field, fields_str
        ));

        alternatives.push(format!(
            r#"query {{ businessStats {{ {} {{ total }} }} }}"#,
            service_for_entity(&intent.entity)
        ));

        alternatives
    }
}

fn format_filter_value(operator: &str, value: &str) -> String {
    match operator {
        "eq" | "contains" | "startsWith" => format!("\"{}\"", value),
        _ => value.to_string(),
    }
}

fn to_camel_case(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

fn to_camel_case_lower(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_lowercase().collect::<String>() + chars.as_str(),
    }
}

fn to_plural_camel(entity: &str) -> String {
    let lower = to_camel_case_lower(entity);
    match entity {
        "Customer" => "customers".to_string(),
        "Supplier" => "suppliers".to_string(),
        "Material" => "materials".to_string(),
        "Order" => "orders".to_string(),
        "Employee" => "employees".to_string(),
        "Department" => "departments".to_string(),
        "Voucher" => "vouchers".to_string(),
        "Contact" => "contacts".to_string(),
        "Todo" => "unifiedTodos".to_string(),
        "ServiceHealth" => "serviceHealth".to_string(),
        _ => format!("{}s", lower),
    }
}

fn service_for_entity(entity: &str) -> &'static str {
    match entity {
        "Customer" | "Supplier" | "Material" | "Order" => "erp",
        "Employee" | "Department" => "hrm",
        "Voucher" => "finance",
        "Contact" => "crm",
        "Todo" | "ServiceHealth" => "portal",
        _ => "erp",
    }
}

fn to_entity_type(entity: &str) -> String {
    match entity {
        "Customer" => "customers".to_string(),
        "Supplier" => "suppliers".to_string(),
        "Material" => "materials".to_string(),
        "Order" => "orders".to_string(),
        "Employee" => "employees".to_string(),
        "Department" => "departments".to_string(),
        "Voucher" => "vouchers".to_string(),
        "Contact" => "contacts".to_string(),
        _ => to_plural_camel(entity),
    }
}

// ---------------- V43.0: NL2GraphQL 使用统计 ----------------

static NL2GRAPHQL_STATS: std::sync::OnceLock<Mutex<Nl2GraphqlStatsInternal>> =
    std::sync::OnceLock::new();

struct Nl2GraphqlStatsInternal {
    total_queries: u64,
    total_confidence: f64,
}

impl Nl2GraphqlStatsInternal {
    fn new() -> Self {
        Self {
            total_queries: 0,
            total_confidence: 0.0,
        }
    }
}

fn nl2graphql_stats_internal() -> &'static Mutex<Nl2GraphqlStatsInternal> {
    NL2GRAPHQL_STATS.get_or_init(|| Mutex::new(Nl2GraphqlStatsInternal::new()))
}

/// V43.0: 记录 NL2GraphQL 查询
pub fn record_nl2graphql_query(confidence: f64) {
    let mut stats = nl2graphql_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.total_queries += 1;
    stats.total_confidence += confidence;
}

/// V43.0: 获取 NL2GraphQL 统计
fn get_nl2graphql_stats() -> (u64, f64) {
    let stats = nl2graphql_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let avg = if stats.total_queries > 0 {
        stats.total_confidence / stats.total_queries as f64
    } else {
        0.0
    };
    (stats.total_queries, avg)
}

// ---------------- V43.0: 智能缓存推荐引擎 ----------------

/// V43.0: 查询访问模式数据
pub(crate) struct QueryAccessPattern {
    query_hash: String,
    query_name: String,
    access_count: u64,
    change_count: u64,
    avg_execution_ms: u64,
    current_tier: CacheTier,
    last_accessed: DateTime<Utc>,
}

/// V43.0: 缓存推荐引擎
pub struct CacheRecommendationEngine;

impl CacheRecommendationEngine {
    /// 分析所有查询并生成缓存推荐报告
    pub fn analyze() -> CacheRecommendationReportGql {
        let patterns = Self::collect_access_patterns();
        let mut recommendations = Vec::new();

        for pattern in patterns.iter() {
            if let Some(rec) = Self::recommend_tier(pattern) {
                recommendations.push(rec);
            }
        }

        let quick_wins = recommendations
            .iter()
            .filter(|r| r.confidence > 0.8 && r.expected_latency_reduction_pct > 20.0)
            .count() as i32;

        let avg_hit_rate_improvement = if recommendations.is_empty() {
            0.0
        } else {
            recommendations
                .iter()
                .map(|r| r.expected_hit_rate)
                .sum::<f64>()
                / recommendations.len() as f64
        };

        let avg_latency_reduction = if recommendations.is_empty() {
            0.0
        } else {
            recommendations
                .iter()
                .map(|r| r.expected_latency_reduction_pct)
                .sum::<f64>()
                / recommendations.len() as f64
        };

        CacheRecommendationReportGql {
            total_queries: patterns.len() as i32,
            recommended_changes: recommendations.len() as i32,
            quick_wins,
            total_queries_analyzed: patterns.len() as i32,
            estimated_overall_hit_rate_improvement: avg_hit_rate_improvement.min(50.0),
            estimated_latency_reduction_pct: avg_latency_reduction.min(40.0),
            recommendations,
        }
    }

    /// 计算缓存适合度分数
    pub(crate) fn calculate_cache_suitability(pattern: &QueryAccessPattern) -> f64 {
        let frequency_score = if pattern.access_count > 1000 {
            1.0
        } else if pattern.access_count > 100 {
            0.7
        } else if pattern.access_count > 10 {
            0.4
        } else {
            0.1
        };

        let change_ratio = if pattern.access_count > 0 {
            pattern.change_count as f64 / pattern.access_count as f64
        } else {
            0.0
        };
        let stability_score = (1.0 - change_ratio).max(0.0);

        let cost_score = if pattern.avg_execution_ms > 500 {
            1.0
        } else if pattern.avg_execution_ms > 100 {
            0.7
        } else if pattern.avg_execution_ms > 50 {
            0.4
        } else {
            0.2
        };

        (frequency_score * 0.4 + stability_score * 0.35 + cost_score * 0.25).min(1.0)
    }

    /// 推荐缓存层级
    pub(crate) fn recommend_tier(pattern: &QueryAccessPattern) -> Option<CacheRecommendationGql> {
        let suitability = Self::calculate_cache_suitability(pattern);
        let recommended = if suitability > 0.8 {
            CacheTier::LongLived
        } else if suitability > 0.5 {
            CacheTier::MediumLived
        } else if suitability > 0.25 {
            CacheTier::ShortLived
        } else {
            CacheTier::None
        };

        let tier_changed = match (&pattern.current_tier, &recommended) {
            (CacheTier::None, CacheTier::None) => false,
            (CacheTier::ShortLived, CacheTier::ShortLived) => false,
            (CacheTier::MediumLived, CacheTier::MediumLived) => false,
            (CacheTier::LongLived, CacheTier::LongLived) => false,
            _ => true,
        };

        if !tier_changed && suitability < 0.3 {
            return None;
        }

        let expected_hit_rate = if suitability > 0.7 {
            0.75
        } else if suitability > 0.4 {
            0.5
        } else {
            0.25
        };

        let latency_reduction = match recommended {
            CacheTier::LongLived => 40.0,
            CacheTier::MediumLived => 25.0,
            CacheTier::ShortLived => 10.0,
            CacheTier::None => 0.0,
        };

        let reason = if suitability > 0.7 {
            format!(
                "高频访问（{} 次）+ 低变化率，适合长期缓存",
                pattern.access_count
            )
        } else if suitability > 0.4 {
            format!("中等访问频率（{} 次），建议中期缓存", pattern.access_count)
        } else {
            format!("低频访问（{} 次），短期缓存或不缓存", pattern.access_count)
        };

        Some(CacheRecommendationGql {
            query_hash: pattern.query_hash.clone(),
            query_name: pattern.query_name.clone(),
            recommended_tier: cache_tier_name(&recommended),
            current_tier: cache_tier_name(&pattern.current_tier),
            reason,
            expected_hit_rate,
            expected_latency_reduction_pct: latency_reduction,
            confidence: suitability,
            supporting_data: serde_json::json!({
                "access_count": pattern.access_count,
                "change_count": pattern.change_count,
                "avg_execution_ms": pattern.avg_execution_ms,
                "suitability_score": suitability,
                "last_accessed": pattern.last_accessed.to_rfc3339(),
            }),
        })
    }

    fn collect_access_patterns() -> Vec<QueryAccessPattern> {
        let mut patterns = Vec::new();
        let now = Utc::now();

        let demo_patterns = vec![
            (
                "customer_list",
                "CustomerList",
                1500,
                50,
                200,
                CacheTier::MediumLived,
            ),
            (
                "dashboard",
                "Dashboard",
                3000,
                200,
                150,
                CacheTier::ShortLived,
            ),
            (
                "voucher_detail",
                "VoucherDetail",
                800,
                100,
                300,
                CacheTier::MediumLived,
            ),
            (
                "service_health",
                "ServiceHealth",
                5000,
                1000,
                50,
                CacheTier::ShortLived,
            ),
            (
                "employee_list",
                "EmployeeList",
                400,
                20,
                180,
                CacheTier::None,
            ),
            (
                "order_detail",
                "OrderDetail",
                1200,
                300,
                250,
                CacheTier::ShortLived,
            ),
        ];

        for (hash, name, access, change, exec_ms, tier) in demo_patterns {
            patterns.push(QueryAccessPattern {
                query_hash: hash.to_string(),
                query_name: name.to_string(),
                access_count: access,
                change_count: change,
                avg_execution_ms: exec_ms,
                current_tier: tier,
                last_accessed: now - chrono::Duration::minutes(access as i64 % 60),
            });
        }

        patterns
    }
}

fn cache_tier_name(tier: &CacheTier) -> String {
    match tier {
        CacheTier::None => "None".to_string(),
        CacheTier::ShortLived => "ShortLived".to_string(),
        CacheTier::MediumLived => "MediumLived".to_string(),
        CacheTier::LongLived => "LongLived".to_string(),
    }
}

// ---------------- V43.0: 缓存推荐存储 ----------------

static CACHE_RECOMMENDATIONS: std::sync::OnceLock<Mutex<Option<CacheRecommendationReportGql>>> =
    std::sync::OnceLock::new();

fn cache_recommendations_store() -> &'static Mutex<Option<CacheRecommendationReportGql>> {
    CACHE_RECOMMENDATIONS.get_or_init(|| Mutex::new(None))
}

/// V43.0: 生成缓存推荐
pub fn generate_cache_recommendations() -> u32 {
    let report = CacheRecommendationEngine::analyze();
    let count = report.recommended_changes as u32;
    let mut store = cache_recommendations_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    *store = Some(report);
    count
}

/// V43.0: 获取缓存推荐报告
pub fn get_cache_recommendations() -> CacheRecommendationReportGql {
    let store = cache_recommendations_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store
        .clone()
        .unwrap_or_else(CacheRecommendationEngine::analyze)
}

/// V43.0: 接受缓存推荐
pub fn accept_cache_recommendation(query_hash: &str) -> bool {
    let mut store = cache_recommendations_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(ref mut report) = *store {
        if let Some(pos) = report
            .recommendations
            .iter()
            .position(|r| r.query_hash == query_hash)
        {
            report.recommendations.remove(pos);
            report.recommended_changes = report.recommended_changes.saturating_sub(1);
            return true;
        }
    }
    false
}

// ---------------- V43.0: AI 优化统计 ----------------

/// V43.0: 获取 AI 优化统计
pub fn get_ai_optimization_stats() -> AiOptimizationStatsGql {
    let suggestions = get_all_optimization_suggestions();
    let health_scores = health_scores_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let (nl_queries, nl_confidence_avg) = get_nl2graphql_stats();
    let cache_report = get_cache_recommendations();

    let avg_health = if health_scores.is_empty() {
        75.0
    } else {
        health_scores.values().map(|h| h.overall_score).sum::<f64>() / health_scores.len() as f64
    };

    let critical = suggestions
        .iter()
        .filter(|s| s.severity == "critical")
        .count() as i32;
    let warning = suggestions
        .iter()
        .filter(|s| s.severity == "warning")
        .count() as i32;
    let n_plus_one = suggestions
        .iter()
        .filter(|s| s.category == "n_plus_one")
        .count() as i32;
    let overfetching = suggestions
        .iter()
        .filter(|s| s.category == "overfetching" || s.category == "complexity")
        .count() as i32;

    AiOptimizationStatsGql {
        total_queries_analyzed: health_scores.len() as i32,
        total_suggestions: suggestions.len() as i32,
        critical_issues: critical,
        warning_issues: warning,
        avg_health_score: avg_health,
        n_plus_one_detected: n_plus_one,
        overfetching_detected: overfetching,
        cache_recommendations: cache_report.recommended_changes,
        nl_queries_processed: nl_queries as i32,
        nl_confidence_avg,
    }
}

/// V43.0: 初始化 V43.0 AI 辅助功能（在 build_schema 中调用）
pub fn init_ai_assistance() {
    seed_optimization_demo_data();
    let _ = generate_cache_recommendations();
}

// ==================== V43.0 Track B: 订阅增强 — 会话管理 + 过滤 + 实时推送 ====================

// ---------- 1. 订阅过滤增强 ----------

/// 过滤操作符
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FilterOperator {
    Eq,
    Ne,
    Gt,
    Lt,
    Gte,
    Lte,
    Contains,
    In,
    NotIn,
    Regex,
}

/// 过滤条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    pub field: String,
    pub operator: FilterOperator,
    pub value: serde_json::Value,
}

/// 订阅过滤器
/// 支持字段级过滤、条件过滤、去重
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SubscriptionFilter {
    pub include_fields: Option<Vec<String>>,
    pub exclude_fields: Option<Vec<String>>,
    pub conditions: Option<Vec<FilterCondition>>,
    pub deduplicate: bool,
    pub dedup_key: Option<String>,
}

/// 检查单个过滤条件
fn check_condition(event: &serde_json::Value, condition: &FilterCondition) -> bool {
    let field_value = get_json_field(event, &condition.field);
    let cond_value = &condition.value;

    match condition.operator {
        FilterOperator::Eq => field_value == cond_value,
        FilterOperator::Ne => field_value != cond_value,
        FilterOperator::Gt => {
            compare_json_values(field_value, cond_value) == Some(std::cmp::Ordering::Greater)
        }
        FilterOperator::Lt => {
            compare_json_values(field_value, cond_value) == Some(std::cmp::Ordering::Less)
        }
        FilterOperator::Gte => {
            matches!(
                compare_json_values(field_value, cond_value),
                Some(std::cmp::Ordering::Greater) | Some(std::cmp::Ordering::Equal)
            )
        }
        FilterOperator::Lte => {
            matches!(
                compare_json_values(field_value, cond_value),
                Some(std::cmp::Ordering::Less) | Some(std::cmp::Ordering::Equal)
            )
        }
        FilterOperator::Contains => match (field_value.as_str(), cond_value.as_str()) {
            (Some(f), Some(c)) => f.contains(c),
            _ => false,
        },
        FilterOperator::In => match cond_value.as_array() {
            Some(arr) => arr.iter().any(|v| v == field_value),
            None => false,
        },
        FilterOperator::NotIn => match cond_value.as_array() {
            Some(arr) => !arr.iter().any(|v| v == field_value),
            None => true,
        },
        FilterOperator::Regex => match (field_value.as_str(), cond_value.as_str()) {
            (Some(f), Some(pattern)) => {
                let pattern_lower = pattern.to_lowercase();
                f.to_lowercase().contains(&pattern_lower)
            }
            _ => false,
        },
    }
}

/// 简易 JSON 值比较（数字和字符串）
fn compare_json_values(a: &serde_json::Value, b: &serde_json::Value) -> Option<std::cmp::Ordering> {
    match (a, b) {
        (serde_json::Value::Number(na), serde_json::Value::Number(nb)) => {
            let fa = na.as_f64()?;
            let fb = nb.as_f64()?;
            fa.partial_cmp(&fb)
        }
        (serde_json::Value::String(sa), serde_json::Value::String(sb)) => Some(sa.cmp(sb)),
        _ => None,
    }
}

/// 按点分隔路径获取 JSON 字段值
fn get_json_field<'a>(value: &'a serde_json::Value, path: &str) -> &'a serde_json::Value {
    let mut current = value;
    for segment in path.split('.') {
        match current.get(segment) {
            Some(v) => current = v,
            None => return &serde_json::Value::Null,
        }
    }
    current
}

/// 字段过滤：保留指定字段
fn filter_include_fields(event: serde_json::Value, fields: &[String]) -> serde_json::Value {
    if let serde_json::Value::Object(map) = event {
        let mut filtered = serde_json::Map::new();
        for field in fields {
            if let Some(v) = map.get(field) {
                filtered.insert(field.clone(), v.clone());
            }
        }
        serde_json::Value::Object(filtered)
    } else {
        event
    }
}

/// 字段过滤：排除指定字段
fn filter_exclude_fields(event: serde_json::Value, fields: &[String]) -> serde_json::Value {
    if let serde_json::Value::Object(mut map) = event {
        for field in fields {
            map.remove(field);
        }
        serde_json::Value::Object(map)
    } else {
        event
    }
}

/// 应用订阅过滤器
/// 返回过滤后的事件，若被过滤掉则返回 None
pub fn apply_filter(
    event: serde_json::Value,
    filter: &SubscriptionFilter,
) -> Option<serde_json::Value> {
    if let Some(conditions) = &filter.conditions {
        for condition in conditions {
            if !check_condition(&event, condition) {
                return None;
            }
        }
    }

    let mut result = event;

    if let Some(include) = &filter.include_fields {
        result = filter_include_fields(result, include);
    }

    if let Some(exclude) = &filter.exclude_fields {
        result = filter_exclude_fields(result, exclude);
    }

    Some(result)
}

// ---------- 2. 实时数据推送 ----------

/// 更新类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpdateType {
    Created,
    Updated,
    Deleted,
    Delta,
    Full,
}

/// 数据变更事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataChangeEvent {
    pub entity_type: String,
    pub entity_id: String,
    pub update_type: UpdateType,
    pub data: Option<serde_json::Value>,
    pub delta: Option<serde_json::Value>,
    pub version: u64,
    pub timestamp: String,
    pub source: String,
}

// ---------- 3. 订阅会话管理 ----------

/// 订阅信息
#[derive(Debug, Clone)]
pub struct SubscriptionInfo {
    pub id: String,
    pub operation_name: Option<String>,
    pub query: String,
    pub variables: Option<serde_json::Value>,
    pub channel: SubscriptionChannel,
    pub filter: Option<SubscriptionFilter>,
    pub created_at: DateTime<Utc>,
    pub events_received: u64,
    pub last_event_at: Option<DateTime<Utc>>,
}

/// 订阅会话
/// 一个 WebSocket 连接对应一个会话，可包含多个订阅（多路复用）
#[derive(Debug, Clone)]
pub struct SubscriptionSession {
    pub session_id: String,
    pub connection_id: String,
    pub user_id: Option<String>,
    pub subscriptions: HashMap<String, SubscriptionInfo>,
    pub connected_at: DateTime<Utc>,
    pub last_active: DateTime<Utc>,
}

/// 全局订阅会话存储
static SUBSCRIPTION_SESSIONS: std::sync::OnceLock<Mutex<HashMap<String, SubscriptionSession>>> =
    std::sync::OnceLock::new();

fn subscription_sessions() -> &'static Mutex<HashMap<String, SubscriptionSession>> {
    SUBSCRIPTION_SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// 注册订阅会话
pub fn register_session(session: SubscriptionSession) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.insert(session.session_id.clone(), session);
    tracing::debug!(
        "[subscription] 会话已注册，当前活跃会话: {}",
        sessions.len()
    );
}

/// 移除订阅会话
pub fn remove_session(session_id: &str) -> Option<SubscriptionSession> {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let removed = sessions.remove(session_id);
    tracing::debug!(
        "[subscription] 会话已移除，当前活跃会话: {}",
        sessions.len()
    );
    removed
}

/// 获取订阅会话
pub fn get_session(session_id: &str) -> Option<SubscriptionSession> {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.get(session_id).cloned()
}

/// 列出所有订阅会话
pub fn list_sessions() -> Vec<SubscriptionSession> {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.values().cloned().collect()
}

/// 获取总订阅数
pub fn get_total_subscriptions() -> usize {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.values().map(|s| s.subscriptions.len()).sum()
}

/// 获取活跃连接数
pub fn get_active_connections() -> usize {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.len()
}

/// 向会话添加订阅
pub fn add_subscription_to_session(session_id: &str, info: SubscriptionInfo) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        session.subscriptions.insert(info.id.clone(), info);
        session.last_active = Utc::now();
    }
}

/// 从会话移除订阅
pub fn remove_subscription_from_session(session_id: &str, subscription_id: &str) -> bool {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        let removed = session.subscriptions.remove(subscription_id).is_some();
        session.last_active = Utc::now();
        removed
    } else {
        false
    }
}

/// 更新会话最后活跃时间
pub fn touch_session(session_id: &str) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        session.last_active = Utc::now();
    }
}

/// 记录订阅收到事件
pub fn record_subscription_event(session_id: &str, subscription_id: &str) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        if let Some(sub) = session.subscriptions.get_mut(subscription_id) {
            sub.events_received += 1;
            sub.last_event_at = Some(Utc::now());
        }
        session.last_active = Utc::now();
    }
}

/// 取消指定订阅（跨会话搜索）
pub fn cancel_subscription_by_id(subscription_id: &str) -> bool {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    for session in sessions.values_mut() {
        if session.subscriptions.remove(subscription_id).is_some() {
            return true;
        }
    }
    false
}

/// 取消指定连接的所有订阅
pub fn cancel_all_subscriptions_by_connection(connection_id: &str) -> u64 {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let mut count = 0u64;
    for session in sessions.values_mut() {
        if session.connection_id == connection_id {
            count += session.subscriptions.len() as u64;
            session.subscriptions.clear();
        }
    }
    count
}

// ---------- 4. 订阅重连与恢复 — 事件缓冲 ----------

/// 订阅检查点（用于重连恢复）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionCheckpoint {
    pub subscription_id: String,
    pub last_event_id: Option<String>,
    pub last_event_timestamp: Option<DateTime<Utc>>,
}

/// 缓冲事件
#[derive(Debug, Clone)]
pub struct BufferedEvent {
    pub id: String,
    pub channel: SubscriptionChannel,
    pub payload: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

/// 事件环形缓冲（最多 1000 条）
static EVENT_BUFFER: std::sync::OnceLock<Mutex<VecDeque<BufferedEvent>>> =
    std::sync::OnceLock::new();

const EVENT_BUFFER_CAPACITY: usize = 1000;

fn event_buffer() -> &'static Mutex<VecDeque<BufferedEvent>> {
    EVENT_BUFFER.get_or_init(|| Mutex::new(VecDeque::with_capacity(EVENT_BUFFER_CAPACITY)))
}

/// 向事件缓冲添加事件（环形缓冲，超出容量时丢弃最旧的）
pub fn push_buffered_event(channel: SubscriptionChannel, payload: serde_json::Value) -> String {
    let event_id = uuid::Uuid::new_v4().to_string();
    let buffered = BufferedEvent {
        id: event_id.clone(),
        channel,
        payload,
        timestamp: Utc::now(),
    };

    let mut buf = event_buffer().lock().unwrap_or_else(|e| e.into_inner());
    if buf.len() >= EVENT_BUFFER_CAPACITY {
        buf.pop_front();
    }
    buf.push_back(buffered);
    event_id
}

/// 获取指定频道在指定时间之后的缓冲事件
pub fn get_buffered_events_since(
    channel: SubscriptionChannel,
    since: Option<&DateTime<Utc>>,
) -> Vec<BufferedEvent> {
    let buf = event_buffer().lock().unwrap_or_else(|e| e.into_inner());
    buf.iter()
        .filter(|e| e.channel == channel)
        .filter(|e| match since {
            Some(s) => e.timestamp > *s,
            None => true,
        })
        .cloned()
        .collect()
}

/// 获取缓冲事件数量
pub fn get_buffered_event_count() -> usize {
    let buf = event_buffer().lock().unwrap_or_else(|e| e.into_inner());
    buf.len()
}

// ---------- 5. 订阅统计 ----------

/// 频道统计
#[derive(Debug, Clone)]
pub struct ChannelStat {
    pub channel: String,
    pub subscription_count: u64,
    pub events_published: u64,
}

/// 订阅统计
#[derive(Debug, Clone)]
pub struct SubscriptionStats {
    pub total_sessions: u64,
    pub total_subscriptions: u64,
    pub active_connections: u64,
    pub events_per_second: f64,
    pub top_channels: Vec<ChannelStat>,
    pub buffered_events: u64,
    pub total_events_published: u64,
}

/// 全局事件发布计数
static TOTAL_EVENTS_PUBLISHED: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// 事件发布时间窗口（用于计算 EPS）
static EVENT_TIMESTAMPS: std::sync::OnceLock<Mutex<VecDeque<DateTime<Utc>>>> =
    std::sync::OnceLock::new();

fn event_timestamps() -> &'static Mutex<VecDeque<DateTime<Utc>>> {
    EVENT_TIMESTAMPS.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// 记录事件发布（更新计数和时间窗口）
pub fn record_event_published(_channel: SubscriptionChannel) {
    TOTAL_EVENTS_PUBLISHED.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    let now = Utc::now();
    let mut timestamps = event_timestamps().lock().unwrap_or_else(|e| e.into_inner());
    timestamps.push_back(now);
    // 只保留最近 60 秒的时间戳
    let cutoff = now - chrono::Duration::seconds(60);
    while timestamps.front().is_some_and(|t| *t < cutoff) {
        timestamps.pop_front();
    }
}

/// 计算每秒事件数（过去 60 秒滑动窗口）
pub fn get_events_per_second() -> f64 {
    let timestamps = event_timestamps().lock().unwrap_or_else(|e| e.into_inner());
    if timestamps.len() < 2 {
        return 0.0;
    }
    let count = timestamps.len() as f64;
    let first = timestamps.front().unwrap();
    let last = timestamps.back().unwrap();
    let duration = (*last - *first).num_seconds().max(1) as f64;
    count / duration
}

/// 按频道统计订阅数
pub fn get_channel_stats() -> Vec<ChannelStat> {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let mut channel_counts: HashMap<SubscriptionChannel, u64> = HashMap::new();

    for session in sessions.values() {
        for sub in session.subscriptions.values() {
            *channel_counts.entry(sub.channel).or_insert(0) += 1;
        }
    }

    let mut stats: Vec<ChannelStat> = channel_counts
        .into_iter()
        .map(|(ch, count)| ChannelStat {
            channel: channel_name(ch),
            subscription_count: count,
            events_published: 0,
        })
        .collect();
    stats.sort_by(|a, b| b.subscription_count.cmp(&a.subscription_count));
    stats
}

fn channel_name(channel: SubscriptionChannel) -> String {
    match channel {
        SubscriptionChannel::ServiceHealth => "service_health",
        SubscriptionChannel::MasterDataChanged => "master_data_changed",
        SubscriptionChannel::NotificationReceived => "notification_received",
        SubscriptionChannel::WorkflowTaskAssigned => "workflow_task_assigned",
        SubscriptionChannel::OrderStatusChanged => "order_status_changed",
        SubscriptionChannel::DataChanged => "data_changed",
    }
    .to_string()
}

/// 获取完整订阅统计
pub fn get_subscription_stats() -> SubscriptionStats {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let total_subscriptions: usize = sessions.values().map(|s| s.subscriptions.len()).sum();

    let mut channel_counts: HashMap<SubscriptionChannel, u64> = HashMap::new();
    for session in sessions.values() {
        for sub in session.subscriptions.values() {
            *channel_counts.entry(sub.channel).or_insert(0) += 1;
        }
    }

    let mut top_channels: Vec<ChannelStat> = channel_counts
        .into_iter()
        .map(|(ch, count)| ChannelStat {
            channel: channel_name(ch),
            subscription_count: count,
            events_published: 0,
        })
        .collect();
    top_channels.sort_by(|a, b| b.subscription_count.cmp(&a.subscription_count));
    top_channels.truncate(10);

    SubscriptionStats {
        total_sessions: sessions.len() as u64,
        total_subscriptions: total_subscriptions as u64,
        active_connections: sessions.len() as u64,
        events_per_second: get_events_per_second(),
        top_channels,
        buffered_events: get_buffered_event_count() as u64,
        total_events_published: TOTAL_EVENTS_PUBLISHED.load(std::sync::atomic::Ordering::Relaxed),
    }
}

// ---------- 6. GraphQL Gql 类型 ----------

/// 过滤操作符 GraphQL 枚举
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterOperatorGql {
    Eq,
    Ne,
    Gt,
    Lt,
    Gte,
    Lte,
    Contains,
    In,
    NotIn,
    Regex,
}

/// 过滤条件 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct FilterConditionGql {
    pub field: String,
    pub operator: FilterOperatorGql,
    pub value: serde_json::Value,
}

/// 订阅过滤器 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionFilterGql {
    pub include_fields: Option<Vec<String>>,
    pub exclude_fields: Option<Vec<String>>,
    pub conditions: Option<Vec<FilterConditionGql>>,
    pub deduplicate: bool,
    pub dedup_key: Option<String>,
}

/// 更新类型 GraphQL 枚举
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpdateTypeGql {
    Created,
    Updated,
    Deleted,
    Delta,
    Full,
}

/// 数据变更事件 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct DataChangeEventGql {
    pub entity_type: String,
    pub entity_id: String,
    pub update_type: UpdateTypeGql,
    pub data: Option<serde_json::Value>,
    pub delta: Option<serde_json::Value>,
    pub version: u64,
    pub timestamp: String,
    pub source: String,
}

/// 订阅信息 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionInfoGql {
    pub id: String,
    pub operation_name: Option<String>,
    pub query: String,
    pub variables: Option<serde_json::Value>,
    pub channel: String,
    pub filter: Option<SubscriptionFilterGql>,
    pub created_at: String,
    pub events_received: u64,
    pub last_event_at: Option<String>,
}

/// 订阅会话 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionSessionGql {
    pub session_id: String,
    pub connection_id: String,
    pub user_id: Option<String>,
    pub subscription_count: u64,
    pub subscriptions: Vec<SubscriptionInfoGql>,
    pub connected_at: String,
    pub last_active: String,
}

/// 频道统计 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct ChannelStatGql {
    pub channel: String,
    pub subscription_count: u64,
    pub events_published: u64,
}

/// 订阅统计 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionStatsGql {
    pub total_sessions: u64,
    pub total_subscriptions: u64,
    pub active_connections: u64,
    pub events_per_second: f64,
    pub top_channels: Vec<ChannelStatGql>,
    pub buffered_events: u64,
    pub total_events_published: u64,
}

// ---------- 转换函数 ----------

impl From<FilterOperator> for FilterOperatorGql {
    fn from(op: FilterOperator) -> Self {
        match op {
            FilterOperator::Eq => FilterOperatorGql::Eq,
            FilterOperator::Ne => FilterOperatorGql::Ne,
            FilterOperator::Gt => FilterOperatorGql::Gt,
            FilterOperator::Lt => FilterOperatorGql::Lt,
            FilterOperator::Gte => FilterOperatorGql::Gte,
            FilterOperator::Lte => FilterOperatorGql::Lte,
            FilterOperator::Contains => FilterOperatorGql::Contains,
            FilterOperator::In => FilterOperatorGql::In,
            FilterOperator::NotIn => FilterOperatorGql::NotIn,
            FilterOperator::Regex => FilterOperatorGql::Regex,
        }
    }
}

impl From<UpdateType> for UpdateTypeGql {
    fn from(t: UpdateType) -> Self {
        match t {
            UpdateType::Created => UpdateTypeGql::Created,
            UpdateType::Updated => UpdateTypeGql::Updated,
            UpdateType::Deleted => UpdateTypeGql::Deleted,
            UpdateType::Delta => UpdateTypeGql::Delta,
            UpdateType::Full => UpdateTypeGql::Full,
        }
    }
}

impl From<SubscriptionFilter> for SubscriptionFilterGql {
    fn from(f: SubscriptionFilter) -> Self {
        SubscriptionFilterGql {
            include_fields: f.include_fields,
            exclude_fields: f.exclude_fields,
            conditions: f.conditions.map(|conds| {
                conds
                    .into_iter()
                    .map(|c| FilterConditionGql {
                        field: c.field,
                        operator: c.operator.into(),
                        value: c.value,
                    })
                    .collect()
            }),
            deduplicate: f.deduplicate,
            dedup_key: f.dedup_key,
        }
    }
}

impl From<SubscriptionInfo> for SubscriptionInfoGql {
    fn from(info: SubscriptionInfo) -> Self {
        SubscriptionInfoGql {
            id: info.id,
            operation_name: info.operation_name,
            query: info.query,
            variables: info.variables,
            channel: channel_name(info.channel),
            filter: info.filter.map(|f| f.into()),
            created_at: info.created_at.to_rfc3339(),
            events_received: info.events_received,
            last_event_at: info.last_event_at.map(|t| t.to_rfc3339()),
        }
    }
}

impl From<SubscriptionSession> for SubscriptionSessionGql {
    fn from(session: SubscriptionSession) -> Self {
        let subscriptions: Vec<SubscriptionInfoGql> = session
            .subscriptions
            .values()
            .cloned()
            .map(|s| s.into())
            .collect();
        SubscriptionSessionGql {
            session_id: session.session_id,
            connection_id: session.connection_id,
            user_id: session.user_id,
            subscription_count: session.subscriptions.len() as u64,
            subscriptions,
            connected_at: session.connected_at.to_rfc3339(),
            last_active: session.last_active.to_rfc3339(),
        }
    }
}

impl From<ChannelStat> for ChannelStatGql {
    fn from(s: ChannelStat) -> Self {
        ChannelStatGql {
            channel: s.channel,
            subscription_count: s.subscription_count,
            events_published: s.events_published,
        }
    }
}

impl From<SubscriptionStats> for SubscriptionStatsGql {
    fn from(s: SubscriptionStats) -> Self {
        SubscriptionStatsGql {
            total_sessions: s.total_sessions,
            total_subscriptions: s.total_subscriptions,
            active_connections: s.active_connections,
            events_per_second: s.events_per_second,
            top_channels: s.top_channels.into_iter().map(|c| c.into()).collect(),
            buffered_events: s.buffered_events,
            total_events_published: s.total_events_published,
        }
    }
}

// ==================== V44.0 Track E: GraphQL 生产级监控 ====================

// ---------- 1. 全链路查询追踪 ----------

/// V44.0: Span 类型枚举
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SpanType {
    Parse,
    Validate,
    Resolve,
    CacheCheck,
    DataFetch,
    ExternalCall,
    DBQuery,
    Transform,
}

/// V44.0: 查询 Span
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct QuerySpanGql {
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub name: String,
    pub service: String,
    pub span_type: SpanType,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_ms: f64,
    pub attributes: serde_json::Value,
    pub status: String,
    pub error_message: Option<String>,
}

/// V44.0: 查询追踪
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct QueryTraceGql {
    pub trace_id: String,
    pub query_hash: Option<String>,
    pub operation_name: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_ms: f64,
    pub status: String,
    pub spans: Vec<QuerySpanGql>,
    pub error_message: Option<String>,
    pub user_id: Option<String>,
    pub client_info: Option<String>,
}

/// V44.0: 查询 Span 内部结构
#[derive(Clone)]
struct QuerySpan {
    span_id: String,
    parent_span_id: Option<String>,
    name: String,
    service: String,
    span_type: SpanType,
    start_time: DateTime<Utc>,
    end_time: Option<DateTime<Utc>>,
    duration_ms: f64,
    attributes: serde_json::Value,
    status: String,
    error_message: Option<String>,
}

impl QuerySpan {
    fn to_gql(&self) -> QuerySpanGql {
        QuerySpanGql {
            span_id: self.span_id.clone(),
            parent_span_id: self.parent_span_id.clone(),
            name: self.name.clone(),
            service: self.service.clone(),
            span_type: self.span_type,
            start_time: self.start_time.to_rfc3339(),
            end_time: self.end_time.map(|t| t.to_rfc3339()),
            duration_ms: self.duration_ms,
            attributes: self.attributes.clone(),
            status: self.status.clone(),
            error_message: self.error_message.clone(),
        }
    }
}

/// V44.0: 查询追踪内部结构
#[derive(Clone)]
struct QueryTrace {
    trace_id: String,
    query_hash: Option<String>,
    operation_name: Option<String>,
    start_time: DateTime<Utc>,
    end_time: Option<DateTime<Utc>>,
    duration_ms: f64,
    status: String,
    spans: Vec<QuerySpan>,
    error_message: Option<String>,
    user_id: Option<String>,
    client_info: Option<String>,
}

impl QueryTrace {
    fn to_gql(&self) -> QueryTraceGql {
        QueryTraceGql {
            trace_id: self.trace_id.clone(),
            query_hash: self.query_hash.clone(),
            operation_name: self.operation_name.clone(),
            start_time: self.start_time.to_rfc3339(),
            end_time: self.end_time.map(|t| t.to_rfc3339()),
            duration_ms: self.duration_ms,
            status: self.status.clone(),
            spans: self.spans.iter().map(|s| s.to_gql()).collect(),
            error_message: self.error_message.clone(),
            user_id: self.user_id.clone(),
            client_info: self.client_info.clone(),
        }
    }
}

/// V44.0: 全局追踪存储（环形缓冲，容量 5000）
static TRACES: std::sync::OnceLock<Mutex<VecDeque<QueryTrace>>> = std::sync::OnceLock::new();
const MAX_TRACES: usize = 5000;

fn traces() -> &'static Mutex<VecDeque<QueryTrace>> {
    TRACES.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// V44.0: 生成 ULID 风格的 trace_id
fn generate_trace_id() -> String {
    let timestamp = Utc::now().timestamp_millis() as u64;
    let random_part = simple_random_u128();
    format!("{:016x}{:032x}", timestamp, random_part)
}

fn generate_span_id() -> String {
    let id = simple_random_u64();
    format!("{:016x}", id)
}

/// V44.0: 开始新的追踪
pub fn start_trace(
    query_hash: Option<String>,
    operation_name: Option<String>,
    user_id: Option<String>,
    client_info: Option<String>,
) -> String {
    let trace_id = generate_trace_id();
    let trace = QueryTrace {
        trace_id: trace_id.clone(),
        query_hash,
        operation_name,
        start_time: Utc::now(),
        end_time: None,
        duration_ms: 0.0,
        status: "running".to_string(),
        spans: Vec::new(),
        error_message: None,
        user_id,
        client_info,
    };
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if traces_lock.len() >= MAX_TRACES {
        traces_lock.pop_front();
    }
    traces_lock.push_back(trace);
    trace_id
}

/// V44.0: 开始一个 Span
pub fn start_span(
    trace_id: &str,
    parent_span_id: Option<String>,
    name: String,
    service: String,
    span_type: SpanType,
    attributes: Option<serde_json::Value>,
) -> Option<String> {
    let span_id = generate_span_id();
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(trace) = traces_lock.iter_mut().find(|t| t.trace_id == trace_id) {
        let span = QuerySpan {
            span_id: span_id.clone(),
            parent_span_id,
            name,
            service,
            span_type,
            start_time: Utc::now(),
            end_time: None,
            duration_ms: 0.0,
            attributes: attributes.unwrap_or(serde_json::json!({})),
            status: "running".to_string(),
            error_message: None,
        };
        trace.spans.push(span);
        Some(span_id)
    } else {
        None
    }
}

/// V44.0: 结束一个 Span
pub fn end_span(trace_id: &str, span_id: &str, error: Option<String>) {
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(trace) = traces_lock.iter_mut().find(|t| t.trace_id == trace_id) {
        if let Some(span) = trace.spans.iter_mut().find(|s| s.span_id == span_id) {
            let end = Utc::now();
            span.end_time = Some(end);
            span.duration_ms =
                (end - span.start_time).num_microseconds().unwrap_or(0) as f64 / 1000.0;
            span.status = if error.is_some() {
                "error".to_string()
            } else {
                "ok".to_string()
            };
            span.error_message = error;
        }
    }
}

/// V44.0: 结束追踪
pub fn end_trace(trace_id: &str, error: Option<String>) {
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(trace) = traces_lock.iter_mut().find(|t| t.trace_id == trace_id) {
        let end = Utc::now();
        trace.end_time = Some(end);
        trace.duration_ms =
            (end - trace.start_time).num_microseconds().unwrap_or(0) as f64 / 1000.0;
        trace.status = if error.is_some() {
            "error".to_string()
        } else {
            "ok".to_string()
        };
        trace.error_message = error;
    }
}

/// V44.0: 获取单个追踪
pub fn get_trace(trace_id: &str) -> Option<QueryTraceGql> {
    let traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    traces_lock
        .iter()
        .find(|t| t.trace_id == trace_id)
        .map(|t| t.to_gql())
}

/// V44.0: 列出追踪（支持过滤）
pub fn list_traces(
    query_hash: Option<String>,
    operation_name: Option<String>,
    status: Option<String>,
    limit: Option<usize>,
) -> Vec<QueryTraceGql> {
    let traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    let limit = limit.unwrap_or(100);
    traces_lock
        .iter()
        .rev()
        .filter(|t| {
            if let Some(ref qh) = query_hash {
                if t.query_hash.as_deref() != Some(qh.as_str()) {
                    return false;
                }
            }
            if let Some(ref op) = operation_name {
                if t.operation_name.as_deref() != Some(op.as_str()) {
                    return false;
                }
            }
            if let Some(ref s) = status {
                if t.status != *s {
                    return false;
                }
            }
            true
        })
        .take(limit)
        .map(|t| t.to_gql())
        .collect()
}

// ---------- 2. 实时指标 ----------

/// V44.0: 指标窗口大小
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MetricsWindow {
    OneMinute,
    FiveMinutes,
    FifteenMinutes,
    OneHour,
}

impl MetricsWindow {
    fn duration_seconds(&self) -> i64 {
        match self {
            Self::OneMinute => 60,
            Self::FiveMinutes => 300,
            Self::FifteenMinutes => 900,
            Self::OneHour => 3600,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::OneMinute => "1m",
            Self::FiveMinutes => "5m",
            Self::FifteenMinutes => "15m",
            Self::OneHour => "1h",
        }
    }
}

/// V44.0: 按操作分组的指标
#[derive(SimpleObject, Clone)]
pub struct OperationMetricGql {
    pub operation_name: String,
    pub count: u64,
    pub avg_duration_ms: f64,
    pub p95_ms: f64,
    pub error_count: u64,
    pub cache_hit_rate: f64,
}

/// V44.0: 按服务分组的指标
#[derive(SimpleObject, Clone)]
pub struct ServiceMetricGql {
    pub service_name: String,
    pub request_count: u64,
    pub avg_latency_ms: f64,
    pub error_count: u64,
}

/// V44.0: GraphQL 实时指标
#[derive(SimpleObject, Clone)]
pub struct GraphqlMetricsGql {
    pub qps: f64,
    pub latency_p50_ms: f64,
    pub latency_p95_ms: f64,
    pub latency_p99_ms: f64,
    pub error_rate: f64,
    pub cache_hit_rate: f64,
    pub total_queries: u64,
    pub total_errors: u64,
    pub total_cache_hits: u64,
    pub total_cache_misses: u64,
    pub active_subscriptions: u64,
    pub ws_connections: u64,
    pub by_operation: Vec<OperationMetricGql>,
    pub by_service: Vec<ServiceMetricGql>,
    pub window_start: String,
    pub window_end: String,
    pub window_size: String,
}

/// V44.0: 查询记录（用于滑动窗口统计）
#[derive(Clone)]
struct QueryRecord {
    timestamp: DateTime<Utc>,
    operation_name: Option<String>,
    duration_ms: f64,
    success: bool,
    cache_hit: bool,
    service: Option<String>,
}

/// V44.0: 指标收集器内部状态
struct MetricsCollectorState {
    query_records: VecDeque<QueryRecord>,
    total_queries: u64,
    total_errors: u64,
    total_cache_hits: u64,
    total_cache_misses: u64,
    active_subscriptions: u64,
    ws_connections: u64,
    by_operation_stats: HashMap<String, OperationStats>,
    by_service_stats: HashMap<String, ServiceStats>,
}

#[derive(Clone, Default)]
struct OperationStats {
    count: u64,
    total_duration_ms: f64,
    error_count: u64,
    cache_hits: u64,
    cache_misses: u64,
    durations: Vec<f64>,
}

#[derive(Clone, Default)]
struct ServiceStats {
    request_count: u64,
    total_latency_ms: f64,
    error_count: u64,
}

static METRICS_COLLECTOR: std::sync::OnceLock<Mutex<MetricsCollectorState>> =
    std::sync::OnceLock::new();

fn metrics_collector() -> &'static Mutex<MetricsCollectorState> {
    METRICS_COLLECTOR.get_or_init(|| {
        Mutex::new(MetricsCollectorState {
            query_records: VecDeque::new(),
            total_queries: 0,
            total_errors: 0,
            total_cache_hits: 0,
            total_cache_misses: 0,
            active_subscriptions: 0,
            ws_connections: 0,
            by_operation_stats: HashMap::new(),
            by_service_stats: HashMap::new(),
        })
    })
}

const MAX_QUERY_RECORDS: usize = 10000;

/// V44.0: 记录查询指标
pub fn record_query_metric(
    operation_name: Option<String>,
    duration_ms: f64,
    success: bool,
    cache_hit: bool,
    service: Option<String>,
) {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_queries += 1;
    if !success {
        state.total_errors += 1;
    }
    if cache_hit {
        state.total_cache_hits += 1;
    } else {
        state.total_cache_misses += 1;
    }

    let record = QueryRecord {
        timestamp: Utc::now(),
        operation_name: operation_name.clone(),
        duration_ms,
        success,
        cache_hit,
        service: service.clone(),
    };

    if state.query_records.len() >= MAX_QUERY_RECORDS {
        state.query_records.pop_front();
    }
    state.query_records.push_back(record);

    if let Some(ref op) = operation_name {
        let stats = state.by_operation_stats.entry(op.clone()).or_default();
        stats.count += 1;
        stats.total_duration_ms += duration_ms;
        if !success {
            stats.error_count += 1;
        }
        if cache_hit {
            stats.cache_hits += 1;
        } else {
            stats.cache_misses += 1;
        }
        stats.durations.push(duration_ms);
        if stats.durations.len() > 1000 {
            stats.durations.remove(0);
        }
    }

    if let Some(ref svc) = service {
        let stats = state.by_service_stats.entry(svc.clone()).or_default();
        stats.request_count += 1;
        stats.total_latency_ms += duration_ms;
        if !success {
            stats.error_count += 1;
        }
    }
}

/// V44.0: 记录错误
pub fn record_error_metric() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_errors += 1;
}

/// V44.0: 记录缓存命中
pub fn record_cache_hit_metric() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_cache_hits += 1;
}

/// V44.0: 记录缓存未命中
pub fn record_cache_miss_metric() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_cache_misses += 1;
}

/// V44.0: 设置活跃订阅数
pub fn set_active_subscriptions(count: u64) {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.active_subscriptions = count;
}

/// V44.0: 设置 WS 连接数
pub fn set_ws_connections(count: u64) {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.ws_connections = count;
}

/// V44.0: 计算百分位
fn percentile(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = (sorted.len() as f64 * p / 100.0) as usize;
    let idx = idx.min(sorted.len() - 1);
    sorted[idx]
}

/// V44.0: 获取指定窗口的指标
pub fn get_metrics(window: MetricsWindow) -> GraphqlMetricsGql {
    let state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let window_records: Vec<&QueryRecord> = state
        .query_records
        .iter()
        .filter(|r| r.timestamp >= window_start)
        .collect();

    let count = window_records.len() as f64;
    let qps = if window.duration_seconds() > 0 {
        count / window.duration_seconds() as f64
    } else {
        0.0
    };

    let mut durations: Vec<f64> = window_records.iter().map(|r| r.duration_ms).collect();
    durations.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let latency_p50 = percentile(&durations, 50.0);
    let latency_p95 = percentile(&durations, 95.0);
    let latency_p99 = percentile(&durations, 99.0);

    let error_count = window_records.iter().filter(|r| !r.success).count() as f64;
    let error_rate = if count > 0.0 {
        error_count / count * 100.0
    } else {
        0.0
    };

    let cache_hit_count = window_records.iter().filter(|r| r.cache_hit).count() as f64;
    let cache_total =
        cache_hit_count + window_records.iter().filter(|r| !r.cache_hit).count() as f64;
    let cache_hit_rate = if cache_total > 0.0 {
        cache_hit_count / cache_total * 100.0
    } else {
        0.0
    };

    let mut by_operation_map: HashMap<String, OperationStats> = HashMap::new();
    for record in &window_records {
        if let Some(ref op) = record.operation_name {
            let stats = by_operation_map.entry(op.clone()).or_default();
            stats.count += 1;
            stats.total_duration_ms += record.duration_ms;
            if !record.success {
                stats.error_count += 1;
            }
            if record.cache_hit {
                stats.cache_hits += 1;
            } else {
                stats.cache_misses += 1;
            }
            stats.durations.push(record.duration_ms);
        }
    }

    let mut by_operation: Vec<OperationMetricGql> = by_operation_map
        .into_iter()
        .map(|(name, stats)| {
            let avg_duration = if stats.count > 0 {
                stats.total_duration_ms / stats.count as f64
            } else {
                0.0
            };
            let mut sorted_durations = stats.durations.clone();
            sorted_durations.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            let p95 = percentile(&sorted_durations, 95.0);
            let cache_total_op = stats.cache_hits + stats.cache_misses;
            let cache_hit_rate_op = if cache_total_op > 0 {
                stats.cache_hits as f64 / cache_total_op as f64 * 100.0
            } else {
                0.0
            };
            OperationMetricGql {
                operation_name: name,
                count: stats.count,
                avg_duration_ms: avg_duration,
                p95_ms: p95,
                error_count: stats.error_count,
                cache_hit_rate: cache_hit_rate_op,
            }
        })
        .collect();
    by_operation.sort_by(|a, b| b.count.cmp(&a.count));

    let mut by_service_map: HashMap<String, ServiceStats> = HashMap::new();
    for record in &window_records {
        if let Some(ref svc) = record.service {
            let stats = by_service_map.entry(svc.clone()).or_default();
            stats.request_count += 1;
            stats.total_latency_ms += record.duration_ms;
            if !record.success {
                stats.error_count += 1;
            }
        }
    }

    let mut by_service: Vec<ServiceMetricGql> = by_service_map
        .into_iter()
        .map(|(name, stats)| {
            let avg_latency = if stats.request_count > 0 {
                stats.total_latency_ms / stats.request_count as f64
            } else {
                0.0
            };
            ServiceMetricGql {
                service_name: name,
                request_count: stats.request_count,
                avg_latency_ms: avg_latency,
                error_count: stats.error_count,
            }
        })
        .collect();
    by_service.sort_by(|a, b| b.request_count.cmp(&a.request_count));

    GraphqlMetricsGql {
        qps,
        latency_p50_ms: latency_p50,
        latency_p95_ms: latency_p95,
        latency_p99_ms: latency_p99,
        error_rate,
        cache_hit_rate,
        total_queries: state.total_queries,
        total_errors: state.total_errors,
        total_cache_hits: state.total_cache_hits,
        total_cache_misses: state.total_cache_misses,
        active_subscriptions: state.active_subscriptions,
        ws_connections: state.ws_connections,
        by_operation,
        by_service,
        window_start: window_start.to_rfc3339(),
        window_end: now.to_rfc3339(),
        window_size: window.as_str().to_string(),
    }
}

/// V44.0: 重置指标
pub fn reset_metrics() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.query_records.clear();
    state.total_queries = 0;
    state.total_errors = 0;
    state.total_cache_hits = 0;
    state.total_cache_misses = 0;
    state.by_operation_stats.clear();
    state.by_service_stats.clear();
}

// ---------- 3. 告警集成 ----------

/// V44.0: 告警级别
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AlertLevel {
    Info,
    Warning,
    Critical,
    Emergency,
}

impl AlertLevel {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Info => "info",
            Self::Warning => "warning",
            Self::Critical => "critical",
            Self::Emergency => "emergency",
        }
    }
}

/// V44.0: 告警类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AlertType {
    HighLatency,
    HighErrorRate,
    LowCacheHit,
    HighQPS,
    SubscriptionError,
    ServiceDown,
    SecurityBreach,
}

impl AlertType {
    fn as_str(&self) -> &'static str {
        match self {
            Self::HighLatency => "high_latency",
            Self::HighErrorRate => "high_error_rate",
            Self::LowCacheHit => "low_cache_hit",
            Self::HighQPS => "high_qps",
            Self::SubscriptionError => "subscription_error",
            Self::ServiceDown => "service_down",
            Self::SecurityBreach => "security_breach",
        }
    }
}

/// V44.0: 告警渠道类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AlertChannelType {
    Log,
    Webhook,
    Email,
    WebSocket,
}

/// V44.0: GraphQL 告警
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct GraphqlAlertGql {
    pub id: String,
    pub alert_type: AlertType,
    pub level: AlertLevel,
    pub message: String,
    pub value: f64,
    pub threshold: f64,
    pub started_at: String,
    pub acknowledged: bool,
    pub resolved: bool,
    pub resolved_at: Option<String>,
    pub labels: serde_json::Value,
}

/// V44.0: 告警规则
#[derive(SimpleObject, Clone)]
pub struct AlertRuleGql {
    pub id: String,
    pub name: String,
    pub alert_type: AlertType,
    pub level: AlertLevel,
    pub threshold: f64,
    pub duration_seconds: i64,
    pub window_size: String,
    pub enabled: bool,
    pub cooldown_seconds: i64,
}

/// V44.0: 告警规则输入
#[derive(async_graphql::InputObject, Clone)]
pub struct AlertRuleInput {
    pub name: String,
    pub alert_type: AlertType,
    pub level: AlertLevel,
    pub threshold: f64,
    pub duration_seconds: i64,
    pub window_size: MetricsWindow,
    pub enabled: bool,
    pub cooldown_seconds: i64,
}

/// V44.0: 告警内部结构
#[derive(Clone)]
struct GraphqlAlert {
    id: String,
    alert_type: AlertType,
    level: AlertLevel,
    message: String,
    value: f64,
    threshold: f64,
    started_at: DateTime<Utc>,
    acknowledged: bool,
    resolved: bool,
    resolved_at: Option<DateTime<Utc>>,
    labels: serde_json::Value,
}

impl GraphqlAlert {
    fn to_gql(&self) -> GraphqlAlertGql {
        GraphqlAlertGql {
            id: self.id.clone(),
            alert_type: self.alert_type,
            level: self.level,
            message: self.message.clone(),
            value: self.value,
            threshold: self.threshold,
            started_at: self.started_at.to_rfc3339(),
            acknowledged: self.acknowledged,
            resolved: self.resolved,
            resolved_at: self.resolved_at.map(|t| t.to_rfc3339()),
            labels: self.labels.clone(),
        }
    }
}

/// V44.0: 告警规则内部结构
#[derive(Clone)]
struct AlertRule {
    id: String,
    name: String,
    alert_type: AlertType,
    level: AlertLevel,
    threshold: f64,
    duration_seconds: i64,
    window_size: MetricsWindow,
    enabled: bool,
    cooldown_seconds: i64,
    last_triggered: Option<DateTime<Utc>>,
    triggered_at: Option<DateTime<Utc>>,
}

impl AlertRule {
    fn to_gql(&self) -> AlertRuleGql {
        AlertRuleGql {
            id: self.id.clone(),
            name: self.name.clone(),
            alert_type: self.alert_type,
            level: self.level,
            threshold: self.threshold,
            duration_seconds: self.duration_seconds,
            window_size: self.window_size.as_str().to_string(),
            enabled: self.enabled,
            cooldown_seconds: self.cooldown_seconds,
        }
    }
}

struct AlertManagerState {
    alerts: VecDeque<GraphqlAlert>,
    rules: Vec<AlertRule>,
    last_check: Option<DateTime<Utc>>,
}

static ALERT_MANAGER: std::sync::OnceLock<Mutex<AlertManagerState>> = std::sync::OnceLock::new();

const MAX_ALERTS: usize = 1000;

fn alert_manager() -> &'static Mutex<AlertManagerState> {
    ALERT_MANAGER.get_or_init(|| {
        Mutex::new(AlertManagerState {
            alerts: VecDeque::new(),
            rules: Vec::new(),
            last_check: None,
        })
    })
}

fn generate_alert_id() -> String {
    let id = simple_random_u64();
    format!("alert_{:016x}", id)
}

fn generate_rule_id() -> String {
    let id = simple_random_u64();
    format!("rule_{:016x}", id)
}

/// V44.0: 添加告警规则
pub fn add_alert_rule(input: AlertRuleInput) -> String {
    let id = generate_rule_id();
    let rule = AlertRule {
        id: id.clone(),
        name: input.name,
        alert_type: input.alert_type,
        level: input.level,
        threshold: input.threshold,
        duration_seconds: input.duration_seconds,
        window_size: input.window_size,
        enabled: input.enabled,
        cooldown_seconds: input.cooldown_seconds,
        last_triggered: None,
        triggered_at: None,
    };
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state.rules.push(rule);
    id
}

/// V44.0: 更新告警规则
pub fn update_alert_rule(id: &str, input: AlertRuleInput) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(rule) = state.rules.iter_mut().find(|r| r.id == id) {
        rule.name = input.name;
        rule.alert_type = input.alert_type;
        rule.level = input.level;
        rule.threshold = input.threshold;
        rule.duration_seconds = input.duration_seconds;
        rule.window_size = input.window_size;
        rule.enabled = input.enabled;
        rule.cooldown_seconds = input.cooldown_seconds;
        true
    } else {
        false
    }
}

/// V44.0: 删除告警规则
pub fn delete_alert_rule(id: &str) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    let before = state.rules.len();
    state.rules.retain(|r| r.id != id);
    state.rules.len() < before
}

/// V44.0: 触发告警
fn trigger_alert_internal(
    alert_type: AlertType,
    level: AlertLevel,
    message: String,
    value: f64,
    threshold: f64,
    labels: serde_json::Value,
) -> String {
    let id = generate_alert_id();
    let alert = GraphqlAlert {
        id: id.clone(),
        alert_type,
        level,
        message: message.clone(),
        value,
        threshold,
        started_at: Utc::now(),
        acknowledged: false,
        resolved: false,
        resolved_at: None,
        labels,
    };
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if state.alerts.len() >= MAX_ALERTS {
        state.alerts.pop_front();
    }
    state.alerts.push_back(alert);

    let alert_clone = state.alerts.back().unwrap().clone();
    drop(state);

    tracing::warn!(
        "[graphql-alert] 告警触发: type={:?}, level={:?}, value={}, threshold={}, message={}",
        alert_type,
        level,
        value,
        threshold,
        message
    );

    let alert_gql = alert_clone.to_gql();
    let event = serde_json::to_value(&alert_gql).unwrap_or(serde_json::json!({}));
    global_event_bus().publish(SubscriptionChannel::NotificationReceived, event);

    id
}

/// V44.0: 手动触发测试告警
pub fn test_alert(alert_type: AlertType, level: AlertLevel) -> String {
    trigger_alert_internal(
        alert_type,
        level,
        format!("Test alert for {:?}", alert_type),
        0.0,
        0.0,
        serde_json::json!({"test": true}),
    )
}

/// V44.0: 确认告警
pub fn acknowledge_alert(id: &str) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(alert) = state.alerts.iter_mut().find(|a| a.id == id) {
        alert.acknowledged = true;
        true
    } else {
        false
    }
}

/// V44.0: 解决告警
pub fn resolve_alert(id: &str) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(alert) = state.alerts.iter_mut().find(|a| a.id == id) {
        alert.resolved = true;
        alert.resolved_at = Some(Utc::now());
        true
    } else {
        false
    }
}

/// V44.0: 获取告警列表
pub fn get_alerts(
    status: Option<String>,
    level: Option<AlertLevel>,
    limit: Option<usize>,
) -> Vec<GraphqlAlertGql> {
    let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    let limit = limit.unwrap_or(100);
    state
        .alerts
        .iter()
        .rev()
        .filter(|a| {
            if let Some(ref s) = status {
                match s.as_str() {
                    "active" if a.resolved => {
                        return false;
                    }
                    "resolved" if !a.resolved => {
                        return false;
                    }
                    "acknowledged" if !a.acknowledged => {
                        return false;
                    }
                    _ => {}
                }
            }
            if let Some(l) = level {
                if a.level != l {
                    return false;
                }
            }
            true
        })
        .take(limit)
        .map(|a| a.to_gql())
        .collect()
}

/// V44.0: 获取活跃告警
pub fn get_active_alerts() -> Vec<GraphqlAlertGql> {
    let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state
        .alerts
        .iter()
        .rev()
        .filter(|a| !a.resolved)
        .map(|a| a.to_gql())
        .collect()
}

/// V44.0: 获取告警规则列表
pub fn get_alert_rules() -> Vec<AlertRuleGql> {
    let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state.rules.iter().map(|r| r.to_gql()).collect()
}

/// V44.0: 检查告警规则
pub fn check_alerts() {
    let rules_to_check = {
        let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
        state.rules.clone()
    };

    for rule in rules_to_check {
        if !rule.enabled {
            continue;
        }

        let metrics = get_metrics(rule.window_size);
        let value = match rule.alert_type {
            AlertType::HighLatency => metrics.latency_p95_ms,
            AlertType::HighErrorRate => metrics.error_rate,
            AlertType::LowCacheHit => metrics.cache_hit_rate,
            AlertType::HighQPS => metrics.qps,
            AlertType::SubscriptionError => metrics.active_subscriptions as f64,
            AlertType::ServiceDown => metrics.ws_connections as f64,
            AlertType::SecurityBreach => get_security_event_count() as f64,
        };

        let should_trigger = match rule.alert_type {
            AlertType::LowCacheHit => value < rule.threshold,
            _ => value > rule.threshold,
        };

        if should_trigger {
            let now = Utc::now();
            let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
            if let Some(rule_mut) = state.rules.iter_mut().find(|r| r.id == rule.id) {
                if rule_mut.triggered_at.is_none() {
                    rule_mut.triggered_at = Some(now);
                }

                let triggered_duration = now - rule_mut.triggered_at.unwrap_or(now);

                if triggered_duration.num_seconds() >= rule.duration_seconds {
                    let in_cooldown = if let Some(last) = rule_mut.last_triggered {
                        (now - last).num_seconds() < rule.cooldown_seconds
                    } else {
                        false
                    };

                    if !in_cooldown {
                        rule_mut.last_triggered = Some(now);
                        let message = format!(
                            "Alert '{}' triggered: {:.2} {} threshold {:.2}",
                            rule.name,
                            value,
                            if matches!(rule.alert_type, AlertType::LowCacheHit) {
                                "below"
                            } else {
                                "exceeds"
                            },
                            rule.threshold
                        );
                        drop(state);
                        trigger_alert_internal(
                            rule.alert_type,
                            rule.level,
                            message,
                            value,
                            rule.threshold,
                            serde_json::json!({"rule_id": rule.id, "rule_name": rule.name}),
                        );
                    }
                }
            }
        } else {
            let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
            if let Some(rule_mut) = state.rules.iter_mut().find(|r| r.id == rule.id) {
                rule_mut.triggered_at = None;
            }
        }
    }

    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state.last_check = Some(Utc::now());
}

// ---------- 4. 监控仪表盘 API ----------

/// V44.0: 监控仪表盘概览统计
#[derive(SimpleObject, Clone)]
pub struct MonitoringDashboardStatsGql {
    pub total_queries: u64,
    pub total_errors: u64,
    pub total_traces: u64,
    pub total_alerts: u64,
    pub active_alerts: u64,
    pub active_ws_connections: u64,
    pub active_subscriptions: u64,
    pub qps: f64,
    pub error_rate: f64,
    pub avg_latency_ms: f64,
    pub p95_latency_ms: f64,
    pub cache_hit_rate: f64,
    pub security_events_last_hour: u64,
    pub federation_cache_hits: u64,
    pub federation_cache_misses: u64,
}

/// V44.0: 查询延迟分布
#[derive(SimpleObject, Clone)]
pub struct QueryLatencyDistributionGql {
    pub buckets: Vec<f64>,
    pub counts: Vec<u64>,
    pub total_count: u64,
}

/// V44.0: 慢查询 Top N
#[derive(SimpleObject, Clone)]
pub struct TopSlowQueryGql {
    pub query_hash: Option<String>,
    pub operation_name: Option<String>,
    pub avg_duration_ms: f64,
    pub count: u64,
    pub total_time_ms: f64,
    pub max_duration_ms: f64,
}

/// V44.0: 错误率趋势
#[derive(SimpleObject, Clone)]
pub struct ErrorRateTrendGql {
    pub timestamps: Vec<String>,
    pub error_rates: Vec<f64>,
    pub total_requests: Vec<u64>,
    pub error_counts: Vec<u64>,
    pub interval_seconds: i64,
}

/// V44.0: 获取监控仪表盘概览
pub fn get_monitoring_dashboard() -> MonitoringDashboardStatsGql {
    let metrics = get_metrics(MetricsWindow::FiveMinutes);
    let traces = traces().lock().unwrap_or_else(|e| e.into_inner());
    let alerts = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    let active_alerts = alerts.alerts.iter().filter(|a| !a.resolved).count() as u64;
    let fed_stats = get_federation_stats();

    let security_events = get_security_events(1000);
    let one_hour_ago = Utc::now() - chrono::Duration::hours(1);
    let security_events_last_hour = security_events
        .iter()
        .filter(|e| {
            DateTime::parse_from_rfc3339(&e.timestamp.to_rfc3339())
                .map(|t| t.naive_utc() > one_hour_ago.naive_utc())
                .unwrap_or(false)
        })
        .count() as u64;

    MonitoringDashboardStatsGql {
        total_queries: metrics.total_queries,
        total_errors: metrics.total_errors,
        total_traces: traces.len() as u64,
        total_alerts: alerts.alerts.len() as u64,
        active_alerts,
        active_ws_connections: metrics.ws_connections,
        active_subscriptions: metrics.active_subscriptions,
        qps: metrics.qps,
        error_rate: metrics.error_rate,
        avg_latency_ms: metrics.latency_p50_ms,
        p95_latency_ms: metrics.latency_p95_ms,
        cache_hit_rate: metrics.cache_hit_rate,
        security_events_last_hour,
        federation_cache_hits: fed_stats.cache_hits,
        federation_cache_misses: fed_stats.cache_misses,
    }
}

/// V44.0: 获取查询延迟分布
pub fn get_query_latency_distribution(window: MetricsWindow) -> QueryLatencyDistributionGql {
    let metrics_collector_state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let buckets = vec![
        1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0,
    ];
    let mut counts = vec![0u64; buckets.len() + 1];

    let mut total_count = 0u64;

    for record in &metrics_collector_state.query_records {
        if record.timestamp >= window_start {
            total_count += 1;
            let duration = record.duration_ms;
            let mut placed = false;
            for (i, bucket) in buckets.iter().enumerate() {
                if duration <= *bucket {
                    counts[i] += 1;
                    placed = true;
                    break;
                }
            }
            if !placed {
                counts[buckets.len()] += 1;
            }
        }
    }

    QueryLatencyDistributionGql {
        buckets,
        counts,
        total_count,
    }
}

/// V44.0: 获取慢查询 Top N
pub fn get_top_slow_queries(limit: Option<usize>, window: MetricsWindow) -> Vec<TopSlowQueryGql> {
    let limit = limit.unwrap_or(10);
    let metrics_collector_state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let mut by_operation: HashMap<String, SlowQueryStats> = HashMap::new();

    for record in &metrics_collector_state.query_records {
        if record.timestamp >= window_start {
            let key = record
                .operation_name
                .clone()
                .unwrap_or_else(|| "unknown".to_string());
            let stats = by_operation.entry(key).or_default();
            stats.count += 1;
            stats.total_time_ms += record.duration_ms;
            if record.duration_ms > stats.max_duration_ms {
                stats.max_duration_ms = record.duration_ms;
            }
        }
    }

    let mut result: Vec<TopSlowQueryGql> = by_operation
        .into_iter()
        .map(|(op, stats)| TopSlowQueryGql {
            query_hash: None,
            operation_name: Some(op),
            avg_duration_ms: if stats.count > 0 {
                stats.total_time_ms / stats.count as f64
            } else {
                0.0
            },
            count: stats.count,
            total_time_ms: stats.total_time_ms,
            max_duration_ms: stats.max_duration_ms,
        })
        .collect();

    result.sort_by(|a, b| {
        b.avg_duration_ms
            .partial_cmp(&a.avg_duration_ms)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    result.truncate(limit);
    result
}

#[derive(Default)]
struct SlowQueryStats {
    count: u64,
    total_time_ms: f64,
    max_duration_ms: f64,
}

/// V44.0: 获取错误率趋势
pub fn get_error_rate_trend(
    window: MetricsWindow,
    interval_seconds: Option<i64>,
) -> ErrorRateTrendGql {
    let interval = interval_seconds.unwrap_or(60);
    let metrics_collector_state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let num_intervals = (window.duration_seconds() / interval) as usize;
    let mut timestamps = Vec::with_capacity(num_intervals);
    let mut total_requests = vec![0u64; num_intervals];
    let mut error_counts = vec![0u64; num_intervals];
    let mut error_rates = vec![0.0f64; num_intervals];

    for i in 0..num_intervals {
        let ts = window_start + chrono::Duration::seconds(interval * i as i64);
        timestamps.push(ts.to_rfc3339());
    }

    for record in &metrics_collector_state.query_records {
        if record.timestamp >= window_start {
            let offset = (record.timestamp - window_start).num_seconds();
            let idx = (offset / interval) as usize;
            if idx < num_intervals {
                total_requests[idx] += 1;
                if !record.success {
                    error_counts[idx] += 1;
                }
            }
        }
    }

    for i in 0..num_intervals {
        if total_requests[i] > 0 {
            error_rates[i] = error_counts[i] as f64 / total_requests[i] as f64 * 100.0;
        }
    }

    ErrorRateTrendGql {
        timestamps,
        error_rates,
        total_requests,
        error_counts,
        interval_seconds: interval,
    }
}

// ==================== V45.0 Track E: GraphQL 企业级治理 — Schema 注册表 + 契约测试 + 版本管理 ====================
//
// 实现 GraphQL 企业级治理体系：
// 1. Schema 注册表：服务 Schema 注册 + 版本追踪 + 变更检测
// 2. 契约测试：查询契约 + 响应验证 + Breaking Change 检测
// 3. 版本管理：Schema 版本化 + 变更日志 + 回滚
//
// 全局状态使用 OnceLock<Mutex> 存储；契约测试用模拟执行；Breaking Change 检测基于 SDL 文本比较。

// --- V45.0: 枚举类型 ---

/// V45.0: Schema 版本状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchemaVersionStatusGql {
    Draft,
    Staging,
    Active,
    Deprecated,
    Retired,
}

/// V45.0: Schema 变更类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchemaChangeTypeGql {
    TypeAdded,
    TypeRemoved,
    FieldAdded,
    FieldRemoved,
    FieldChanged,
    EnumValueAdded,
    EnumValueRemoved,
    ArgumentAdded,
    ArgumentRemoved,
    InterfaceAdded,
    InterfaceRemoved,
}

/// V45.0: 契约违规类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViolationTypeGql {
    MissingField,
    ExtraField,
    TypeMismatch,
    NullabilityChanged,
    DeprecationViolation,
}

// --- V45.0: Gql 类型定义 ---

/// V45.0: Schema 变更记录
#[derive(SimpleObject, Clone)]
pub struct SchemaChangeGql {
    pub version: String,
    pub change_type: SchemaChangeTypeGql,
    pub description: String,
    pub breaking: bool,
    pub affected_types: Vec<String>,
    pub timestamp: String,
}

/// V45.0: Schema 注册表条目
#[derive(SimpleObject, Clone)]
pub struct SchemaRegistryEntryGql {
    pub service_name: String,
    pub version: String,
    pub sdl: String,
    pub schema_hash: String,
    pub registered_at: String,
    pub registered_by: String,
    pub status: SchemaVersionStatusGql,
    pub changes: Vec<SchemaChangeGql>,
    pub dependencies: Vec<String>,
}

/// V45.0: 契约违规
#[derive(SimpleObject, Clone)]
pub struct ContractViolationGql {
    pub field_path: String,
    pub expected: String,
    pub actual: String,
    pub violation_type: ViolationTypeGql,
    pub severity: String,
}

/// V45.0: 契约测试结果
#[derive(SimpleObject, Clone)]
pub struct ContractTestResultGql {
    pub test_id: String,
    pub passed: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub response_time_ms: u64,
    pub ran_at: String,
    pub diff: Vec<ContractViolationGql>,
}

/// V45.0: 契约测试定义
#[derive(SimpleObject, Clone)]
pub struct ContractTestGql {
    pub id: String,
    pub name: String,
    pub service: String,
    pub operation_type: String,
    pub query: String,
    pub expected_fields: Vec<String>,
    pub expected_types: Vec<String>,
    pub tolerance: f64,
    pub enabled: bool,
    pub last_run: Option<String>,
    pub last_result: Option<ContractTestResultGql>,
}

/// V45.0: 契约测试输入
#[derive(async_graphql::InputObject, Clone)]
pub struct ContractTestInput {
    pub name: String,
    pub service: String,
    pub operation_type: String,
    pub query: String,
    pub expected_fields: Vec<String>,
    pub expected_types: Vec<String>,
    pub tolerance: Option<f64>,
    pub enabled: Option<bool>,
}

/// V45.0: 版本变更日志
#[derive(SimpleObject, Clone)]
pub struct VersionChangelogGql {
    pub version: String,
    pub changes: Vec<SchemaChangeGql>,
    pub breaking_changes_count: u32,
    pub additions_count: u32,
    pub deprecations_count: u32,
    pub improvements_count: u32,
}

/// V45.0: Schema 版本
#[derive(SimpleObject, Clone)]
pub struct SchemaVersionGql {
    pub service: String,
    pub version: String,
    pub semver: String,
    pub sdl: String,
    pub hash: String,
    pub changelog: VersionChangelogGql,
    pub published_at: String,
    pub author: String,
    pub status: SchemaVersionStatusGql,
    pub download_count: u64,
    pub tags: Vec<String>,
}

/// V45.0: 版本差异
#[derive(SimpleObject, Clone)]
pub struct VersionDiffGql {
    pub from_version: String,
    pub to_version: String,
    pub added_types: Vec<String>,
    pub removed_types: Vec<String>,
    pub modified_types: Vec<String>,
    pub added_fields: Vec<String>,
    pub removed_fields: Vec<String>,
    pub breaking_changes: Vec<SchemaChangeGql>,
    pub compatible: bool,
}

/// V45.0: 治理统计
#[derive(SimpleObject, Clone)]
pub struct SchemaGovernanceStatsGql {
    pub total_services: u32,
    pub total_versions: u32,
    pub active_schemas: u32,
    pub total_tests: u32,
    pub passing_tests: u32,
    pub failing_tests: u32,
    pub breaking_changes_detected: u32,
    pub last_scan: String,
}

/// V45.0: 服务治理信息
#[derive(SimpleObject, Clone)]
pub struct ServiceGovernanceInfoGql {
    pub service: String,
    pub current_version: String,
    pub versions_count: u32,
    pub tests_count: u32,
    pub passing_rate: f64,
    pub last_change: String,
    pub breaking_changes_count: u32,
}

// --- V45.0: SDL 文本解析（用于 Breaking Change 检测） ---

/// V45.0: 从 SDL 文本中提取类型定义
/// 返回 (type_name -> Vec<field_name>) 的映射
/// 支持 type / enum / interface / input 定义，自动跳过 "extend " 前缀
fn parse_sdl_types(sdl: &str) -> HashMap<String, Vec<String>> {
    let mut types = HashMap::new();
    let mut current_type: Option<String> = None;
    let mut current_fields: Vec<String> = Vec::new();
    let mut brace_depth: i32 = 0;
    let mut brace_opened: bool = false;

    for raw_line in sdl.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // 如果不在类型定义内部，查找类型定义
        if current_type.is_none() {
            let check = line.strip_prefix("extend ").unwrap_or(line);
            for kw in &["type ", "enum ", "interface ", "input "] {
                if let Some(rest) = check.strip_prefix(kw) {
                    let name: String = rest
                        .split(|c: char| c.is_whitespace() || c == '{' || c == '@' || c == '=')
                        .next()
                        .unwrap_or("")
                        .to_string();
                    if !name.is_empty() {
                        current_type = Some(name);
                        brace_depth =
                            (line.matches('{').count() as i32) - (line.matches('}').count() as i32);
                        brace_opened = brace_depth > 0;
                        // 单行定义：type X {}
                        if brace_opened && brace_depth <= 0 {
                            if let Some(n) = current_type.take() {
                                types.insert(n, std::mem::take(&mut current_fields));
                            }
                            brace_depth = 0;
                            brace_opened = false;
                        }
                    }
                    break;
                }
            }
            continue;
        }

        // 类型定义内部（或等待开始大括号）
        let opens = line.matches('{').count() as i32;
        let closes = line.matches('}').count() as i32;
        brace_depth += opens - closes;
        if opens > 0 {
            brace_opened = true;
        }

        if brace_opened && brace_depth <= 0 {
            if let Some(n) = current_type.take() {
                types.insert(n, std::mem::take(&mut current_fields));
            }
            brace_depth = 0;
            brace_opened = false;
            continue;
        }

        // 仅在 depth==1 时提取字段名
        if brace_opened && brace_depth == 1 {
            let field_name = line
                .split(|c: char| c == ':' || c == '(' || c.is_whitespace())
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !field_name.is_empty()
                && !field_name.starts_with('#')
                && field_name != "}"
                && !field_name.starts_with('"')
                && field_name != "{"
            {
                current_fields.push(field_name);
            }
        }
    }

    if let Some(n) = current_type.take() {
        types.insert(n, std::mem::take(&mut current_fields));
    }

    types
}

// --- V45.0: Schema 注册表 ---

/// V45.0: Schema 注册表（内存存储）
struct SchemaRegistry {
    /// service_name -> 已注册版本列表（按注册顺序）
    entries: HashMap<String, Vec<SchemaRegistryEntryGql>>,
}

impl SchemaRegistry {
    fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    fn compute_hash(sdl: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(sdl.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// 注册新 Schema 版本
    fn register(
        &mut self,
        service: &str,
        version: &str,
        sdl: &str,
        registered_by: &str,
    ) -> SchemaRegistryEntryGql {
        let schema_hash = Self::compute_hash(sdl);
        let now = Utc::now().to_rfc3339();

        // 与前一版本对比检测变更
        let changes = if let Some(versions) = self.entries.get(service) {
            if let Some(prev) = versions.last() {
                BreakingChangeDetector::detect_changes(&prev.sdl, sdl, version)
            } else {
                vec![SchemaChangeGql {
                    version: version.to_string(),
                    change_type: SchemaChangeTypeGql::TypeAdded,
                    description: format!("Initial schema for {}", service),
                    breaking: false,
                    affected_types: vec![],
                    timestamp: now.clone(),
                }]
            }
        } else {
            vec![SchemaChangeGql {
                version: version.to_string(),
                change_type: SchemaChangeTypeGql::TypeAdded,
                description: format!("Initial schema for {}", service),
                breaking: false,
                affected_types: vec![],
                timestamp: now.clone(),
            }]
        };

        // 废弃前一 Active 版本
        if let Some(versions) = self.entries.get_mut(service) {
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Deprecated;
                }
            }
        }

        let entry = SchemaRegistryEntryGql {
            service_name: service.to_string(),
            version: version.to_string(),
            sdl: sdl.to_string(),
            schema_hash,
            registered_at: now,
            registered_by: registered_by.to_string(),
            status: SchemaVersionStatusGql::Active,
            changes,
            dependencies: vec![],
        };

        self.entries
            .entry(service.to_string())
            .or_default()
            .push(entry.clone());

        entry
    }

    fn get_active(&self, service: &str) -> Option<SchemaRegistryEntryGql> {
        self.entries.get(service).and_then(|versions| {
            versions
                .iter()
                .find(|v| v.status == SchemaVersionStatusGql::Active)
                .cloned()
        })
    }

    fn get_version(&self, service: &str, version: &str) -> Option<SchemaRegistryEntryGql> {
        self.entries
            .get(service)
            .and_then(|versions| versions.iter().find(|v| v.version == version).cloned())
    }

    fn list_versions(&self, service: &str) -> Vec<SchemaRegistryEntryGql> {
        self.entries.get(service).cloned().unwrap_or_default()
    }

    fn deprecate(&mut self, service: &str, version: &str) -> bool {
        if let Some(versions) = self.entries.get_mut(service) {
            for v in versions.iter_mut() {
                if v.version == version && v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Deprecated;
                    return true;
                }
            }
        }
        false
    }

    fn retire(&mut self, service: &str, version: &str) -> bool {
        if let Some(versions) = self.entries.get_mut(service) {
            for v in versions.iter_mut() {
                if v.version == version {
                    v.status = SchemaVersionStatusGql::Retired;
                    return true;
                }
            }
        }
        false
    }

    fn diff_versions(
        &self,
        service: &str,
        from_version: &str,
        to_version: &str,
    ) -> Option<VersionDiffGql> {
        let from = self.get_version(service, from_version)?;
        let to = self.get_version(service, to_version)?;
        Some(BreakingChangeDetector::diff_versions(&from, &to))
    }
}

// --- V45.0: Breaking Change 检测器 ---

/// V45.0: Breaking Change 检测器（基于 SDL 文本比较）
struct BreakingChangeDetector;

impl BreakingChangeDetector {
    /// 检测两个 SDL 之间的变更
    fn detect_changes(from_sdl: &str, to_sdl: &str, new_version: &str) -> Vec<SchemaChangeGql> {
        let from_types = parse_sdl_types(from_sdl);
        let to_types = parse_sdl_types(to_sdl);
        let now = Utc::now().to_rfc3339();
        let mut changes = Vec::new();

        // 检测移除的类型（Breaking）
        for type_name in from_types.keys() {
            if !to_types.contains_key(type_name) {
                changes.push(SchemaChangeGql {
                    version: new_version.to_string(),
                    change_type: SchemaChangeTypeGql::TypeRemoved,
                    description: format!("Type '{}' removed", type_name),
                    breaking: true,
                    affected_types: vec![type_name.clone()],
                    timestamp: now.clone(),
                });
            }
        }

        // 检测新增的类型（非 Breaking）
        for type_name in to_types.keys() {
            if !from_types.contains_key(type_name) {
                changes.push(SchemaChangeGql {
                    version: new_version.to_string(),
                    change_type: SchemaChangeTypeGql::TypeAdded,
                    description: format!("Type '{}' added", type_name),
                    breaking: false,
                    affected_types: vec![type_name.clone()],
                    timestamp: now.clone(),
                });
            }
        }

        // 检测共有类型的字段变更
        for (type_name, to_fields) in &to_types {
            if let Some(from_fields) = from_types.get(type_name) {
                let from_set: HashSet<&String> = from_fields.iter().collect();
                let to_set: HashSet<&String> = to_fields.iter().collect();

                // 移除的字段（Breaking）
                for field in &from_set {
                    if !to_set.contains(field) {
                        changes.push(SchemaChangeGql {
                            version: new_version.to_string(),
                            change_type: SchemaChangeTypeGql::FieldRemoved,
                            description: format!(
                                "Field '{}' removed from type '{}'",
                                field, type_name
                            ),
                            breaking: true,
                            affected_types: vec![type_name.clone()],
                            timestamp: now.clone(),
                        });
                    }
                }

                // 新增的字段（非 Breaking）
                for field in &to_set {
                    if !from_set.contains(field) {
                        changes.push(SchemaChangeGql {
                            version: new_version.to_string(),
                            change_type: SchemaChangeTypeGql::FieldAdded,
                            description: format!("Field '{}' added to type '{}'", field, type_name),
                            breaking: false,
                            affected_types: vec![type_name.clone()],
                            timestamp: now.clone(),
                        });
                    }
                }
            }
        }

        changes
    }

    /// 检查兼容性（无 Breaking Change 则兼容）
    fn check_compatibility(from_sdl: &str, to_sdl: &str) -> bool {
        let changes = Self::detect_changes(from_sdl, to_sdl, "0.0.0");
        !changes.iter().any(|c| c.breaking)
    }

    /// 生成兼容性报告
    fn diff_versions(from: &SchemaRegistryEntryGql, to: &SchemaRegistryEntryGql) -> VersionDiffGql {
        let from_types = parse_sdl_types(&from.sdl);
        let to_types = parse_sdl_types(&to.sdl);

        let mut added_types = Vec::new();
        let mut removed_types = Vec::new();
        let mut modified_types = Vec::new();
        let mut added_fields = Vec::new();
        let mut removed_fields = Vec::new();

        for type_name in to_types.keys() {
            if !from_types.contains_key(type_name) {
                added_types.push(type_name.clone());
            }
        }

        for type_name in from_types.keys() {
            if !to_types.contains_key(type_name) {
                removed_types.push(type_name.clone());
            }
        }

        for (type_name, to_fields) in &to_types {
            if let Some(from_fields) = from_types.get(type_name) {
                let from_set: HashSet<&String> = from_fields.iter().collect();
                let to_set: HashSet<&String> = to_fields.iter().collect();

                if from_set != to_set {
                    modified_types.push(type_name.clone());
                }

                for field in &to_set {
                    if !from_set.contains(field) {
                        added_fields.push(format!("{}.{}", type_name, field));
                    }
                }
                for field in &from_set {
                    if !to_set.contains(field) {
                        removed_fields.push(format!("{}.{}", type_name, field));
                    }
                }
            }
        }

        let breaking_changes: Vec<SchemaChangeGql> =
            Self::detect_changes(&from.sdl, &to.sdl, &to.version)
                .into_iter()
                .filter(|c| c.breaking)
                .collect();

        let compatible = breaking_changes.is_empty();

        VersionDiffGql {
            from_version: from.version.clone(),
            to_version: to.version.clone(),
            added_types,
            removed_types,
            modified_types,
            added_fields,
            removed_fields,
            breaking_changes,
            compatible,
        }
    }
}

// --- V45.0: 契约测试运行器 ---

/// V45.0: 契约测试运行器（模拟执行，不实际调用服务）
struct ContractTestRunner {
    tests: HashMap<String, ContractTestGql>,
    results: Vec<ContractTestResultGql>,
}

impl ContractTestRunner {
    fn new() -> Self {
        Self {
            tests: HashMap::new(),
            results: Vec::new(),
        }
    }

    fn run_test(&mut self, test_id: &str) -> Option<ContractTestResultGql> {
        let test = self.tests.get(test_id)?.clone();
        Some(self.execute_test(&test))
    }

    /// 模拟执行契约测试
    fn execute_test(&mut self, test: &ContractTestGql) -> ContractTestResultGql {
        let start = std::time::Instant::now();
        let now = Utc::now().to_rfc3339();
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut violations = Vec::new();

        // 模拟执行：检查 expected_fields 是否出现在 query 文本中
        let query_lower = test.query.to_lowercase();
        for field in &test.expected_fields {
            if !query_lower.contains(&field.to_lowercase()) {
                violations.push(ContractViolationGql {
                    field_path: field.clone(),
                    expected: "field present in query".to_string(),
                    actual: "field not found in query".to_string(),
                    violation_type: ViolationTypeGql::MissingField,
                    severity: "error".to_string(),
                });
                errors.push(format!("Expected field '{}' not found in query", field));
            }
        }

        // 检查 expected_types（格式 "fieldName:typeName"）
        for type_spec in &test.expected_types {
            let parts: Vec<&str> = type_spec.splitn(2, ':').collect();
            if parts.len() == 2 {
                let field_name = parts[0].trim();
                let type_name = parts[1].trim();
                if !query_lower.contains(&field_name.to_lowercase()) {
                    violations.push(ContractViolationGql {
                        field_path: field_name.to_string(),
                        expected: type_name.to_string(),
                        actual: "field not found".to_string(),
                        violation_type: ViolationTypeGql::TypeMismatch,
                        severity: "warning".to_string(),
                    });
                    warnings.push(format!(
                        "Expected type '{}' for field '{}' not verified",
                        type_name, field_name
                    ));
                }
            }
        }

        let elapsed = start.elapsed().as_millis() as u64;
        let passed = errors.is_empty();

        let result = ContractTestResultGql {
            test_id: test.id.clone(),
            passed,
            errors,
            warnings,
            response_time_ms: elapsed,
            ran_at: now,
            diff: violations,
        };

        // 更新测试的 last_run 和 last_result
        if let Some(t) = self.tests.get_mut(&test.id) {
            t.last_run = Some(result.ran_at.clone());
            t.last_result = Some(result.clone());
        }

        // 存储结果（上限 1000 条）
        self.results.push(result.clone());
        if self.results.len() > 1000 {
            self.results.remove(0);
        }

        result
    }

    fn run_all(&mut self, service: Option<&str>) -> u32 {
        let tests: Vec<ContractTestGql> = self
            .tests
            .values()
            .filter(|t| service.is_none_or(|s| t.service == s))
            .filter(|t| t.enabled)
            .cloned()
            .collect();
        let mut count = 0u32;
        for test in tests {
            self.execute_test(&test);
            count += 1;
        }
        count
    }

    fn add_test(&mut self, input: ContractTestInput) -> String {
        let id = format!("ct-{}", uuid::Uuid::new_v4());
        let test = ContractTestGql {
            id: id.clone(),
            name: input.name,
            service: input.service,
            operation_type: input.operation_type,
            query: input.query,
            expected_fields: input.expected_fields,
            expected_types: input.expected_types,
            tolerance: input.tolerance.unwrap_or(0.0),
            enabled: input.enabled.unwrap_or(true),
            last_run: None,
            last_result: None,
        };
        self.tests.insert(id.clone(), test);
        id
    }

    fn update_test(&mut self, id: &str, input: ContractTestInput) -> bool {
        if let Some(test) = self.tests.get_mut(id) {
            test.name = input.name;
            test.service = input.service;
            test.operation_type = input.operation_type;
            test.query = input.query;
            test.expected_fields = input.expected_fields;
            test.expected_types = input.expected_types;
            if let Some(t) = input.tolerance {
                test.tolerance = t;
            }
            if let Some(e) = input.enabled {
                test.enabled = e;
            }
            true
        } else {
            false
        }
    }

    fn remove_test(&mut self, id: &str) -> bool {
        self.tests.remove(id).is_some()
    }

    fn get_results(&self, test_id: &str, limit: usize) -> Vec<ContractTestResultGql> {
        self.results
            .iter()
            .filter(|r| r.test_id == test_id)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    fn get_stats(&self) -> (u32, u32, u32) {
        let total = self.tests.len() as u32;
        let mut passing = 0u32;
        let mut failing = 0u32;
        for test in self.tests.values() {
            if let Some(result) = &test.last_result {
                if result.passed {
                    passing += 1;
                } else {
                    failing += 1;
                }
            }
        }
        (total, passing, failing)
    }
}

// --- V45.0: Schema 版本管理器 ---

/// V45.0: Schema 版本管理器（SemVer 版本化 + 变更日志 + 回滚）
struct SchemaVersionManager {
    /// service -> 版本列表（按发布顺序）
    versions: HashMap<String, Vec<SchemaVersionGql>>,
}

impl SchemaVersionManager {
    fn new() -> Self {
        Self {
            versions: HashMap::new(),
        }
    }

    fn compute_hash(sdl: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(sdl.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// 发布新版本
    fn publish(
        &mut self,
        service: &str,
        version: &str,
        _changelog_text: &str,
        sdl: &str,
    ) -> String {
        let hash = Self::compute_hash(sdl);
        let now = Utc::now().to_rfc3339();

        // 与前一版本对比检测变更
        let (changes, breaking_count, additions_count) =
            if let Some(versions) = self.versions.get(service) {
                if let Some(prev) = versions.last() {
                    let detected = BreakingChangeDetector::detect_changes(&prev.sdl, sdl, version);
                    let breaking = detected.iter().filter(|c| c.breaking).count() as u32;
                    let additions = detected
                        .iter()
                        .filter(|c| {
                            matches!(
                                c.change_type,
                                SchemaChangeTypeGql::TypeAdded
                                    | SchemaChangeTypeGql::FieldAdded
                                    | SchemaChangeTypeGql::EnumValueAdded
                                    | SchemaChangeTypeGql::ArgumentAdded
                                    | SchemaChangeTypeGql::InterfaceAdded
                            )
                        })
                        .count() as u32;
                    (detected, breaking, additions)
                } else {
                    (vec![], 0, 0)
                }
            } else {
                (vec![], 0, 0)
            };

        // 降级前一 Active 版本为 Staging
        if let Some(versions) = self.versions.get_mut(service) {
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Staging;
                }
            }
        }

        let changelog = VersionChangelogGql {
            version: version.to_string(),
            changes: changes.clone(),
            breaking_changes_count: breaking_count,
            additions_count,
            deprecations_count: 0,
            improvements_count: 0,
        };

        let version_entry = SchemaVersionGql {
            service: service.to_string(),
            version: version.to_string(),
            semver: version.to_string(),
            sdl: sdl.to_string(),
            hash,
            changelog,
            published_at: now,
            author: "system".to_string(),
            status: SchemaVersionStatusGql::Active,
            download_count: 0,
            tags: vec![],
        };

        self.versions
            .entry(service.to_string())
            .or_default()
            .push(version_entry.clone());

        version_entry.version
    }

    fn get_version(&self, service: &str, version: &str) -> Option<SchemaVersionGql> {
        self.versions
            .get(service)
            .and_then(|vs| vs.iter().find(|v| v.version == version).cloned())
    }

    fn list_versions(&self, service: &str) -> Vec<SchemaVersionGql> {
        self.versions.get(service).cloned().unwrap_or_default()
    }

    fn get_changelog(&self, service: &str, version: &str) -> Option<VersionChangelogGql> {
        self.get_version(service, version).map(|v| v.changelog)
    }

    fn diff(&self, service: &str, from: &str, to: &str) -> Option<VersionDiffGql> {
        let from_version = self.get_version(service, from)?;
        let to_version = self.get_version(service, to)?;

        let from_types = parse_sdl_types(&from_version.sdl);
        let to_types = parse_sdl_types(&to_version.sdl);

        let mut added_types = Vec::new();
        let mut removed_types = Vec::new();
        let mut modified_types = Vec::new();
        let mut added_fields = Vec::new();
        let mut removed_fields = Vec::new();

        for type_name in to_types.keys() {
            if !from_types.contains_key(type_name) {
                added_types.push(type_name.clone());
            }
        }
        for type_name in from_types.keys() {
            if !to_types.contains_key(type_name) {
                removed_types.push(type_name.clone());
            }
        }
        for (type_name, to_fields) in &to_types {
            if let Some(from_fields) = from_types.get(type_name) {
                let from_set: HashSet<&String> = from_fields.iter().collect();
                let to_set: HashSet<&String> = to_fields.iter().collect();
                if from_set != to_set {
                    modified_types.push(type_name.clone());
                }
                for field in &to_set {
                    if !from_set.contains(field) {
                        added_fields.push(format!("{}.{}", type_name, field));
                    }
                }
                for field in &from_set {
                    if !to_set.contains(field) {
                        removed_fields.push(format!("{}.{}", type_name, field));
                    }
                }
            }
        }

        let breaking_changes: Vec<SchemaChangeGql> = BreakingChangeDetector::detect_changes(
            &from_version.sdl,
            &to_version.sdl,
            &to_version.version,
        )
        .into_iter()
        .filter(|c| c.breaking)
        .collect();

        let compatible = breaking_changes.is_empty();

        Some(VersionDiffGql {
            from_version: from.to_string(),
            to_version: to.to_string(),
            added_types,
            removed_types,
            modified_types,
            added_fields,
            removed_fields,
            breaking_changes,
            compatible,
        })
    }

    /// 回滚到指定版本（降级当前 Active，提升目标版本为 Active）
    fn rollback(&mut self, service: &str, to_version: &str) -> bool {
        if let Some(versions) = self.versions.get_mut(service) {
            // 降级所有 Active 版本
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Staging;
                }
            }
            // 提升目标版本为 Active
            for v in versions.iter_mut() {
                if v.version == to_version {
                    v.status = SchemaVersionStatusGql::Active;
                    return true;
                }
            }
        }
        false
    }

    /// 提升版本为 Active
    fn promote(&mut self, service: &str, version: &str) -> bool {
        if let Some(versions) = self.versions.get_mut(service) {
            // 降级当前 Active
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Staging;
                }
            }
            // 提升目标版本
            for v in versions.iter_mut() {
                if v.version == version {
                    v.status = SchemaVersionStatusGql::Active;
                    return true;
                }
            }
        }
        false
    }

    fn get_stats(&self) -> (u32, u32, u32) {
        let total_services = self.versions.len() as u32;
        let total_versions: u32 = self.versions.values().map(|v| v.len() as u32).sum();
        let active_schemas: u32 = self
            .versions
            .values()
            .filter(|versions| {
                versions
                    .iter()
                    .any(|v| v.status == SchemaVersionStatusGql::Active)
            })
            .count() as u32;
        (total_services, total_versions, active_schemas)
    }
}

// --- V45.0: 全局状态 ---

/// V45.0: 全局 Schema 注册表
static SCHEMA_REGISTRY: std::sync::OnceLock<Mutex<SchemaRegistry>> = std::sync::OnceLock::new();

fn schema_registry() -> &'static Mutex<SchemaRegistry> {
    SCHEMA_REGISTRY.get_or_init(|| Mutex::new(SchemaRegistry::new()))
}

/// V45.0: 全局契约测试运行器
static CONTRACT_TEST_RUNNER: std::sync::OnceLock<Mutex<ContractTestRunner>> =
    std::sync::OnceLock::new();

fn contract_test_runner() -> &'static Mutex<ContractTestRunner> {
    CONTRACT_TEST_RUNNER.get_or_init(|| Mutex::new(ContractTestRunner::new()))
}

/// V45.0: 全局 Schema 版本管理器
static SCHEMA_VERSION_MANAGER: std::sync::OnceLock<Mutex<SchemaVersionManager>> =
    std::sync::OnceLock::new();

fn schema_version_manager() -> &'static Mutex<SchemaVersionManager> {
    SCHEMA_VERSION_MANAGER.get_or_init(|| Mutex::new(SchemaVersionManager::new()))
}

/// V45.0: 治理统计计数器
static GOVERNANCE_STATS: std::sync::OnceLock<Mutex<GovernanceStatsInternal>> =
    std::sync::OnceLock::new();

struct GovernanceStatsInternal {
    breaking_changes_detected: u32,
    last_scan: String,
}

impl GovernanceStatsInternal {
    fn new() -> Self {
        Self {
            breaking_changes_detected: 0,
            last_scan: Utc::now().to_rfc3339(),
        }
    }
}

fn governance_stats() -> &'static Mutex<GovernanceStatsInternal> {
    GOVERNANCE_STATS.get_or_init(|| Mutex::new(GovernanceStatsInternal::new()))
}

// --- V45.0: 治理统计查询函数 ---

/// V45.0: 获取治理统计
pub fn get_schema_governance_stats() -> SchemaGovernanceStatsGql {
    let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
    let runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let manager = schema_version_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let gov_stats = governance_stats().lock().unwrap_or_else(|e| e.into_inner());

    let (_total_services_vm, total_versions, active_schemas) = manager.get_stats();
    let (total_tests, passing_tests, failing_tests) = runner.get_stats();

    SchemaGovernanceStatsGql {
        total_services: registry.entries.len() as u32,
        total_versions,
        active_schemas,
        total_tests,
        passing_tests,
        failing_tests,
        breaking_changes_detected: gov_stats.breaking_changes_detected,
        last_scan: gov_stats.last_scan.clone(),
    }
}

/// V45.0: 获取各服务治理信息
pub fn get_service_governance_info() -> Vec<ServiceGovernanceInfoGql> {
    let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
    let runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let _manager = schema_version_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner());

    let services: HashSet<String> = registry.entries.keys().cloned().collect();

    let mut result = Vec::new();
    for service in services {
        let versions = registry.list_versions(&service);
        let current_version = versions
            .iter()
            .find(|v| v.status == SchemaVersionStatusGql::Active)
            .map(|v| v.version.clone())
            .unwrap_or_else(|| "unknown".to_string());

        let versions_count = versions.len() as u32;
        let last_change = versions
            .last()
            .map(|v| v.registered_at.clone())
            .unwrap_or_default();

        let breaking_changes_count = versions
            .iter()
            .flat_map(|v| v.changes.iter())
            .filter(|c| c.breaking)
            .count() as u32;

        let service_tests: Vec<&ContractTestGql> = runner
            .tests
            .values()
            .filter(|t| t.service == service)
            .collect();
        let tests_count = service_tests.len() as u32;
        let passing = service_tests
            .iter()
            .filter(|t| t.last_result.as_ref().is_some_and(|r| r.passed))
            .count();
        let passing_rate = if tests_count > 0 {
            passing as f64 / tests_count as f64
        } else {
            0.0
        };

        result.push(ServiceGovernanceInfoGql {
            service,
            current_version,
            versions_count,
            tests_count,
            passing_rate,
            last_change,
            breaking_changes_count,
        });
    }

    result
}

// --- V45.0: 初始化预置数据 ---

/// V45.0: 初始化预置 5 个服务的 Schema 版本 + 默认契约测试
pub fn init_schema_governance() {
    // 预置 5 个服务的初始 Schema
    let initial_schemas: Vec<(&str, &str)> = vec![
        (
            "erp",
            r#"type Customer @key(fields: "id") {
  id: ID!
  name: String!
  code: String!
  status: String
  email: String
  phone: String
  address: String
  credit_limit: Float
  created_at: String
}

type Query {
  customer(id: ID!): Customer
  customers: [Customer!]!
}
"#,
        ),
        (
            "crm",
            r#"type Contact @key(fields: "id") {
  id: ID!
  name: String!
  email: String
  phone: String
  customer_id: ID
  position: String
  created_at: String
}

type Lead @key(fields: "id") {
  id: ID!
  title: String!
  status: String
  value: Float
  contact_id: ID
  created_at: String
}

type Query {
  contact(id: ID!): Contact
  contacts: [Contact!]!
  lead(id: ID!): Lead
}
"#,
        ),
        (
            "hrm",
            r#"type Employee @key(fields: "id") {
  id: ID!
  name: String!
  department: String
  position: String
  email: String
  phone: String
  hire_date: String
  salary: Float
  status: String
}

type Department @key(fields: "id") {
  id: ID!
  name: String!
  manager_id: ID
  parent_id: ID
}

type Query {
  employee(id: ID!): Employee
  employees: [Employee!]!
  department(id: ID!): Department
}
"#,
        ),
        (
            "finance",
            r#"type Voucher @key(fields: "id") {
  id: ID!
  voucher_number: String!
  voucher_date: String
  total_debit: Float!
  total_credit: Float!
  status: String
  entries: [VoucherEntry!]!
}

type VoucherEntry {
  id: ID!
  account_code: String!
  debit: Float
  credit: Float
  description: String
}

type AccountSubject @key(fields: "id") {
  id: ID!
  code: String!
  name: String!
  type: String
  parent_id: ID
  balance_direction: String
}

type Query {
  voucher(id: ID!): Voucher
  vouchers: [Voucher!]!
  accountSubject(id: ID!): AccountSubject
}
"#,
        ),
        (
            "mes",
            r#"type WorkOrder @key(fields: "id") {
  id: ID!
  order_number: String!
  product_code: String!
  quantity: Float!
  status: String
  priority: String
  start_date: String
  end_date: String
  created_at: String
}

type Material @key(fields: "id") {
  id: ID!
  code: String!
  name: String!
  specification: String
  unit: String
  category: String
}

type BOM @key(fields: "id") {
  id: ID!
  product_code: String!
  material_code: String!
  quantity: Float!
}

type Query {
  workOrder(id: ID!): WorkOrder
  workOrders: [WorkOrder!]!
  material(id: ID!): Material
}
"#,
        ),
    ];

    // 注册到 Schema 注册表 + 版本管理器
    {
        let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());

        // 如果已初始化则跳过
        if registry.entries.len() >= 5 {
            return;
        }

        for (service, sdl) in &initial_schemas {
            let entry = registry.register(service, "1.0.0", sdl, "system");
            let changelog_text = entry
                .changes
                .iter()
                .map(|c| c.description.clone())
                .collect::<Vec<_>>()
                .join("; ");
            manager.publish(service, "1.0.0", &changelog_text, sdl);
        }
    }

    // 预置默认契约测试
    {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if !runner.tests.is_empty() {
            return;
        }

        let default_tests = vec![
            ContractTestInput {
                name: "ERP Customer Query Contract".to_string(),
                service: "erp".to_string(),
                operation_type: "query".to_string(),
                query: "{ customer(id: \"1\") { id name code status } }".to_string(),
                expected_fields: vec!["id".into(), "name".into(), "code".into(), "status".into()],
                expected_types: vec!["id:ID".into(), "name:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "CRM Contact Query Contract".to_string(),
                service: "crm".to_string(),
                operation_type: "query".to_string(),
                query: "{ contact(id: \"1\") { id name email phone } }".to_string(),
                expected_fields: vec!["id".into(), "name".into(), "email".into(), "phone".into()],
                expected_types: vec!["id:ID".into(), "name:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "HRM Employee Query Contract".to_string(),
                service: "hrm".to_string(),
                operation_type: "query".to_string(),
                query: "{ employee(id: \"1\") { id name department position } }".to_string(),
                expected_fields: vec![
                    "id".into(),
                    "name".into(),
                    "department".into(),
                    "position".into(),
                ],
                expected_types: vec!["id:ID".into(), "name:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "Finance Voucher Query Contract".to_string(),
                service: "finance".to_string(),
                operation_type: "query".to_string(),
                query: "{ voucher(id: \"1\") { id voucher_number total_debit total_credit } }"
                    .to_string(),
                expected_fields: vec![
                    "id".into(),
                    "voucher_number".into(),
                    "total_debit".into(),
                    "total_credit".into(),
                ],
                expected_types: vec!["id:ID".into(), "voucher_number:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "MES WorkOrder Query Contract".to_string(),
                service: "mes".to_string(),
                operation_type: "query".to_string(),
                query: "{ workOrder(id: \"1\") { id order_number product_code quantity } }"
                    .to_string(),
                expected_fields: vec![
                    "id".into(),
                    "order_number".into(),
                    "product_code".into(),
                    "quantity".into(),
                ],
                expected_types: vec!["id:ID".into(), "order_number:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
        ];

        for input in default_tests {
            runner.add_test(input);
        }
    }

    // 更新治理统计扫描时间
    {
        let mut gov = governance_stats().lock().unwrap_or_else(|e| e.into_inner());
        gov.last_scan = Utc::now().to_rfc3339();
    }
}

// ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================
//
// 边缘计算（边缘节点 + 就近计算 + 边缘函数）+ CDN 多级缓存（L1 内存 + L2 边缘 + L3 源站
// + 智能预取 + 缓存预热 + 标签失效）+ 流式响应（@defer/@stream + 渐进式加载）
// + 边缘/CDN/流式监控统计。与 V37 ETag/Cache-Control、V41 MultiLevelCache、V44 联邦 V3 兼容。

// ---------- GraphQL 边缘计算 ----------

/// V45.0: 边缘节点
#[derive(SimpleObject, Clone)]
pub struct EdgeNodeGql {
    pub id: String,
    pub region: String,
    pub location: String,
    pub latency_ms: i32,
    pub health: bool,
    pub capacity: i32,
    pub current_load: i32,
    pub functions_deployed: i32,
}

/// V45.0: 边缘函数
#[derive(SimpleObject, Clone)]
pub struct EdgeFunctionGql {
    pub id: String,
    pub name: String,
    pub handler: String,
    pub route_pattern: String,
    pub cache_ttl_ms: i64,
    pub deployed_to_regions: Vec<String>,
    pub version: String,
    pub enabled: bool,
}

/// V45.0: 边缘计算配置
#[derive(SimpleObject, Clone)]
pub struct EdgeComputeConfigGql {
    pub default_region: String,
    pub fallback_region: String,
    pub auto_routing: bool,
    pub health_check_interval_ms: i64,
    pub max_latency_ms: i32,
}

/// V45.0: 按区域统计
#[derive(SimpleObject)]
pub struct EdgeNodeRegionStatGql {
    pub region: String,
    pub node_count: i32,
    pub healthy_count: i32,
    pub executions: i64,
}

/// V45.0: 边缘计算统计
#[derive(SimpleObject)]
pub struct EdgeComputeStatsGql {
    pub total_nodes: i32,
    pub healthy_nodes: i32,
    pub total_functions: i32,
    pub total_executions: i64,
    pub avg_latency_ms: f64,
    pub cache_hit_rate: f64,
    pub by_region: Vec<EdgeNodeRegionStatGql>,
}

// --- 边缘计算内部状态 ---

#[derive(Clone)]
pub(crate) struct EdgeNodeData {
    id: String,
    region: String,
    location: String,
    latency_ms: i32,
    health: bool,
    capacity: i32,
    current_load: i32,
    functions_deployed: i32,
}

#[derive(Clone)]
struct EdgeFunctionData {
    id: String,
    name: String,
    handler: String,
    route_pattern: String,
    cache_ttl_ms: i64,
    deployed_to_regions: Vec<String>,
    version: String,
    enabled: bool,
}

#[derive(Clone)]
struct EdgeComputeConfigData {
    default_region: String,
    fallback_region: String,
    auto_routing: bool,
    health_check_interval_ms: i64,
    max_latency_ms: i32,
}

impl Default for EdgeComputeConfigData {
    fn default() -> Self {
        Self {
            default_region: "east-china".into(),
            fallback_region: "south-china".into(),
            auto_routing: true,
            health_check_interval_ms: 30_000,
            max_latency_ms: 200,
        }
    }
}

struct EdgeComputeState {
    nodes: Vec<EdgeNodeData>,
    functions: Vec<EdgeFunctionData>,
    config: EdgeComputeConfigData,
    total_executions: u64,
    total_latency_ms: u64,
    cache_hits: u64,
    cache_misses: u64,
    executions_by_region: HashMap<String, u64>,
}

impl EdgeComputeState {
    fn new() -> Self {
        let nodes = vec![
            EdgeNodeData {
                id: "edge-east-china-1".into(),
                region: "east-china".into(),
                location: "上海".into(),
                latency_ms: 12,
                health: true,
                capacity: 1000,
                current_load: 320,
                functions_deployed: 3,
            },
            EdgeNodeData {
                id: "edge-north-china-1".into(),
                region: "north-china".into(),
                location: "北京".into(),
                latency_ms: 18,
                health: true,
                capacity: 1000,
                current_load: 210,
                functions_deployed: 3,
            },
            EdgeNodeData {
                id: "edge-south-china-1".into(),
                region: "south-china".into(),
                location: "深圳".into(),
                latency_ms: 15,
                health: true,
                capacity: 1000,
                current_load: 180,
                functions_deployed: 3,
            },
            EdgeNodeData {
                id: "edge-west-china-1".into(),
                region: "west-china".into(),
                location: "成都".into(),
                latency_ms: 35,
                health: true,
                capacity: 800,
                current_load: 90,
                functions_deployed: 2,
            },
            EdgeNodeData {
                id: "edge-singapore-1".into(),
                region: "southeast-asia".into(),
                location: "新加坡".into(),
                latency_ms: 65,
                health: true,
                capacity: 1200,
                current_load: 150,
                functions_deployed: 3,
            },
        ];
        let functions = vec![
            EdgeFunctionData {
                id: "fn-simple-compute".into(),
                name: "simple_compute".into(),
                handler: "compute".into(),
                route_pattern: "/edge/compute".into(),
                cache_ttl_ms: 60_000,
                deployed_to_regions: vec![
                    "east-china".into(),
                    "north-china".into(),
                    "south-china".into(),
                    "west-china".into(),
                    "southeast-asia".into(),
                ],
                version: "1.0.0".into(),
                enabled: true,
            },
            EdgeFunctionData {
                id: "fn-data-transform".into(),
                name: "data_transform".into(),
                handler: "transform".into(),
                route_pattern: "/edge/transform".into(),
                cache_ttl_ms: 120_000,
                deployed_to_regions: vec![
                    "east-china".into(),
                    "south-china".into(),
                    "southeast-asia".into(),
                ],
                version: "1.1.0".into(),
                enabled: true,
            },
            EdgeFunctionData {
                id: "fn-cache-query".into(),
                name: "cache_query".into(),
                handler: "cache_lookup".into(),
                route_pattern: "/edge/cache".into(),
                cache_ttl_ms: 30_000,
                deployed_to_regions: vec![
                    "east-china".into(),
                    "north-china".into(),
                    "south-china".into(),
                    "southeast-asia".into(),
                ],
                version: "1.0.2".into(),
                enabled: true,
            },
        ];
        Self {
            nodes,
            functions,
            config: EdgeComputeConfigData::default(),
            total_executions: 0,
            total_latency_ms: 0,
            cache_hits: 0,
            cache_misses: 0,
            executions_by_region: HashMap::new(),
        }
    }
}

static EDGE_COMPUTE_STATE: std::sync::OnceLock<Mutex<EdgeComputeState>> =
    std::sync::OnceLock::new();

fn edge_compute_state() -> &'static Mutex<EdgeComputeState> {
    EDGE_COMPUTE_STATE.get_or_init(|| Mutex::new(EdgeComputeState::new()))
}

/// V45.0: 边缘计算管理器
pub struct EdgeComputeManager;

impl EdgeComputeManager {
    pub(crate) fn register_node(node: EdgeNodeData) {
        let mut state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(existing) = state.nodes.iter_mut().find(|n| n.id == node.id) {
            *existing = node;
        } else {
            state.nodes.push(node);
        }
    }

    pub(crate) fn select_optimal_node(region: Option<&str>) -> Option<EdgeNodeData> {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let config = state.config.clone();
        let candidates: Vec<EdgeNodeData> = state
            .nodes
            .iter()
            .filter(|n| n.health)
            .filter(|n| n.latency_ms <= config.max_latency_ms)
            .cloned()
            .collect();
        if candidates.is_empty() {
            return None;
        }
        if let Some(r) = region {
            if let Some(node) = candidates.iter().find(|n| n.region == r) {
                return Some(node.clone());
            }
        }
        if config.auto_routing {
            candidates
                .iter()
                .min_by_key(|n| (n.latency_ms, n.current_load))
                .cloned()
        } else {
            candidates
                .iter()
                .find(|n| n.region == config.default_region)
                .or_else(|| {
                    candidates
                        .iter()
                        .find(|n| n.region == config.fallback_region)
                })
                .cloned()
        }
    }

    pub fn deploy_function(
        name: &str,
        handler: &str,
        route_pattern: &str,
        cache_ttl_ms: i64,
    ) -> String {
        let mut state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let id = format!("fn-{}", name);
        if let Some(existing) = state.functions.iter_mut().find(|f| f.name == name) {
            existing.handler = handler.into();
            existing.route_pattern = route_pattern.into();
            existing.cache_ttl_ms = cache_ttl_ms;
            existing.version = format!("1.{}.0", rand_u32());
            existing.enabled = true;
            return existing.id.clone();
        }
        let func = EdgeFunctionData {
            id: id.clone(),
            name: name.into(),
            handler: handler.into(),
            route_pattern: route_pattern.into(),
            cache_ttl_ms,
            deployed_to_regions: state.nodes.iter().map(|n| n.region.clone()).collect(),
            version: "1.0.0".into(),
            enabled: true,
        };
        state.functions.push(func);
        // 递增节点部署计数
        for node in state.nodes.iter_mut() {
            node.functions_deployed += 1;
        }
        id
    }

    pub fn execute_at_edge(
        function_name: &str,
        input: &serde_json::Value,
        region: Option<&str>,
    ) -> serde_json::Value {
        let start = std::time::Instant::now();
        let node = Self::select_optimal_node(region);
        let node_region = node
            .as_ref()
            .map(|n| n.region.clone())
            .unwrap_or_else(|| "unknown".into());
        let node_latency = node.as_ref().map(|n| n.latency_ms).unwrap_or(0);

        let state_funcs = {
            let state = edge_compute_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state
                .functions
                .iter()
                .find(|f| f.name == function_name && f.enabled)
                .cloned()
        };

        let result = match state_funcs.as_ref().map(|f| f.name.as_str()) {
            Some("simple_compute") => Self::exec_simple_compute(input),
            Some("data_transform") => Self::exec_data_transform(input),
            Some("cache_query") => Self::exec_cache_query(input),
            Some(other) => serde_json::json!({
                "error": format!("未知边缘函数处理器: {}", other),
                "function": function_name,
            }),
            None => serde_json::json!({
                "error": format!("边缘函数未找到: {}", function_name),
            }),
        };

        let elapsed_ms = start.elapsed().as_millis() as u64 + node_latency as u64;
        let mut state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_executions += 1;
        state.total_latency_ms += elapsed_ms;
        *state
            .executions_by_region
            .entry(node_region.clone())
            .or_insert(0) += 1;

        // 模拟缓存命中（50% 概率命中）
        if elapsed_ms.is_multiple_of(2) {
            state.cache_hits += 1;
        } else {
            state.cache_misses += 1;
        }

        serde_json::json!({
            "result": result,
            "executed_at": {
                "node_region": node_region,
                "node_latency_ms": node_latency,
                "execution_ms": elapsed_ms,
            },
            "function": function_name,
        })
    }

    fn exec_simple_compute(input: &serde_json::Value) -> serde_json::Value {
        let a = input.get("a").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let b = input.get("b").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let op = input.get("op").and_then(|v| v.as_str()).unwrap_or("add");
        let result = match op {
            "add" => a + b,
            "sub" => a - b,
            "mul" => a * b,
            "div" if b != 0.0 => a / b,
            _ => 0.0,
        };
        serde_json::json!({ "a": a, "b": b, "op": op, "result": result })
    }

    fn exec_data_transform(input: &serde_json::Value) -> serde_json::Value {
        let data = input
            .get("data")
            .cloned()
            .unwrap_or(serde_json::Value::Null);
        let to_upper = input
            .get("uppercase")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        match &data {
            serde_json::Value::String(s) => {
                let transformed = if to_upper {
                    s.to_uppercase()
                } else {
                    s.to_lowercase()
                };
                serde_json::json!({ "original": s, "transformed": transformed })
            }
            serde_json::Value::Array(arr) => {
                serde_json::json!({ "count": arr.len(), "items": arr })
            }
            serde_json::Value::Object(obj) => {
                serde_json::json!({ "field_count": obj.len(), "keys": obj.keys().collect::<Vec<_>>() })
            }
            _ => serde_json::json!({ "data": data }),
        }
    }

    fn exec_cache_query(input: &serde_json::Value) -> serde_json::Value {
        let key = input.get("key").and_then(|v| v.as_str()).unwrap_or("");
        let cached = CdnCacheManager::get(key);
        serde_json::json!({
            "key": key,
            "hit": cached.is_some(),
            "value": cached.unwrap_or(serde_json::Value::Null),
        })
    }

    pub fn get_stats() -> EdgeComputeStatsGql {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let healthy = state.nodes.iter().filter(|n| n.health).count();
        let avg_latency = if state.total_executions > 0 {
            state.total_latency_ms as f64 / state.total_executions as f64
        } else {
            0.0
        };
        let total_cache = state.cache_hits + state.cache_misses;
        let cache_hit_rate = if total_cache > 0 {
            state.cache_hits as f64 / total_cache as f64
        } else {
            0.0
        };
        let mut regions: Vec<String> = state.executions_by_region.keys().cloned().collect();
        regions.sort();
        let by_region = regions
            .iter()
            .map(|r| {
                let node_count = state.nodes.iter().filter(|n| &n.region == r).count() as i32;
                let healthy_count = state
                    .nodes
                    .iter()
                    .filter(|n| &n.region == r && n.health)
                    .count() as i32;
                let executions = state.executions_by_region.get(r).copied().unwrap_or(0) as i64;
                EdgeNodeRegionStatGql {
                    region: r.clone(),
                    node_count,
                    healthy_count,
                    executions,
                }
            })
            .collect();
        EdgeComputeStatsGql {
            total_nodes: state.nodes.len() as i32,
            healthy_nodes: healthy as i32,
            total_functions: state.functions.len() as i32,
            total_executions: state.total_executions as i64,
            avg_latency_ms: avg_latency,
            cache_hit_rate,
            by_region,
        }
    }
}

fn rand_u32() -> u32 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
        .hash(&mut h);
    (h.finish() & 0xFFFF) as u32
}

// ---------- CDN 缓存增强 ----------

/// V45.0: CDN 缓存层
#[derive(SimpleObject)]
pub struct CdnCacheLayerGql {
    pub layer_name: String,
    pub ttl_ms: i64,
    pub max_entries: i32,
    pub hit_rate: f64,
    pub current_entries: i32,
}

/// V45.0: CDN 缓存条目
#[derive(SimpleObject, Clone)]
pub struct CdnCacheEntryGql {
    pub key: String,
    pub value: String,
    pub content_type: String,
    pub etag: String,
    pub created_at: String,
    pub expires_at: String,
    pub hit_count: i64,
    pub size_bytes: i64,
    pub tags: Vec<String>,
}

/// V45.0: CDN 缓存配置
#[derive(SimpleObject, Clone)]
pub struct CdnCacheConfigGql {
    pub default_ttl_ms: i64,
    pub max_age_public: i64,
    pub max_age_private: i64,
    pub stale_while_revalidate: i64,
    pub s_max_age: i64,
}

/// V45.0: 按层统计
#[derive(SimpleObject)]
pub struct CdnLayerStatGql {
    pub layer: String,
    pub entries: i32,
    pub size_mb: f64,
    pub hit_rate: f64,
}

/// V45.0: CDN 统计
#[derive(SimpleObject)]
pub struct CdnStatsGql {
    pub total_entries: i32,
    pub total_size_mb: f64,
    pub hit_rate: f64,
    pub miss_rate: f64,
    pub eviction_count: i64,
    pub warm_count: i64,
    pub prefetch_count: i64,
    pub by_layer: Vec<CdnLayerStatGql>,
}

// --- CDN 内部状态 ---

#[derive(Clone)]
struct CdnCacheEntryData {
    key: String,
    value: String,
    content_type: String,
    etag: String,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    hit_count: u64,
    size_bytes: usize,
    tags: Vec<String>,
}

struct CdnCacheState {
    l1_memory: LruCache<String, CdnCacheEntryData>,
    l2_edge: LruCache<String, CdnCacheEntryData>,
    l3_origin: LruCache<String, CdnCacheEntryData>,
    config: CdnCacheConfigData,
    hits: u64,
    misses: u64,
    evictions: u64,
    warm_count: u64,
    prefetch_count: u64,
}

struct CdnCacheConfigData {
    default_ttl_ms: i64,
    max_age_public: i64,
    max_age_private: i64,
    stale_while_revalidate: i64,
    s_max_age: i64,
}

impl Default for CdnCacheConfigData {
    fn default() -> Self {
        Self {
            default_ttl_ms: 60_000,
            max_age_public: 300,
            max_age_private: 0,
            stale_while_revalidate: 60,
            s_max_age: 600,
        }
    }
}

impl CdnCacheState {
    fn new() -> Self {
        Self {
            l1_memory: LruCache::new(500),
            l2_edge: LruCache::new(2000),
            l3_origin: LruCache::new(10000),
            config: CdnCacheConfigData::default(),
            hits: 0,
            misses: 0,
            evictions: 0,
            warm_count: 0,
            prefetch_count: 0,
        }
    }

    fn get_from_layer(
        cache: &mut LruCache<String, CdnCacheEntryData>,
        key: &str,
    ) -> Option<CdnCacheEntryData> {
        let entry = cache.get(&key.to_string());
        if let Some(e) = &entry {
            if e.expires_at <= Utc::now() {
                return None;
            }
        }
        entry.cloned()
    }

    fn promote_to_higher(
        higher: &mut LruCache<String, CdnCacheEntryData>,
        entry: CdnCacheEntryData,
    ) {
        let mut e = entry;
        e.hit_count += 1;
        higher.put(e.key.clone(), e);
    }
}

static CDN_CACHE_STATE: std::sync::OnceLock<Mutex<CdnCacheState>> = std::sync::OnceLock::new();

fn cdn_cache_state() -> &'static Mutex<CdnCacheState> {
    CDN_CACHE_STATE.get_or_init(|| Mutex::new(CdnCacheState::new()))
}

/// V45.0: CDN 缓存管理器
pub struct CdnCacheManager;

impl CdnCacheManager {
    pub fn get(key: &str) -> Option<serde_json::Value> {
        let mut state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        // L1 内存
        if let Some(entry) = CdnCacheState::get_from_layer(&mut state.l1_memory, key) {
            state.hits += 1;
            let mut e = entry;
            e.hit_count += 1;
            state.l1_memory.put(key.to_string(), e.clone());
            return serde_json::from_str(&e.value).ok();
        }
        // L2 边缘
        if let Some(entry) = CdnCacheState::get_from_layer(&mut state.l2_edge, key) {
            state.hits += 1;
            CdnCacheState::promote_to_higher(&mut state.l1_memory, entry.clone());
            return serde_json::from_str(&entry.value).ok();
        }
        // L3 源站
        if let Some(entry) = CdnCacheState::get_from_layer(&mut state.l3_origin, key) {
            state.hits += 1;
            CdnCacheState::promote_to_higher(&mut state.l2_edge, entry.clone());
            CdnCacheState::promote_to_higher(&mut state.l1_memory, entry.clone());
            return serde_json::from_str(&entry.value).ok();
        }
        state.misses += 1;
        None
    }

    pub fn set(
        key: &str,
        value: &serde_json::Value,
        content_type: &str,
        tags: Vec<String>,
        ttl_ms: Option<i64>,
    ) {
        let now = Utc::now();
        let ttl = ttl_ms.unwrap_or_else(|| {
            cdn_cache_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .config
                .default_ttl_ms
        });
        let expires = now + chrono::Duration::milliseconds(ttl);
        let value_str = serde_json::to_string(value).unwrap_or_default();
        let size_bytes = key.len() + value_str.len();
        let etag = format!("\"{:x}\"", {
            let mut h = Sha256::new();
            h.update(key.as_bytes());
            h.update(value_str.as_bytes());
            h.finalize()
        });
        let entry = CdnCacheEntryData {
            key: key.to_string(),
            value: value_str,
            content_type: content_type.into(),
            etag,
            created_at: now,
            expires_at: expires,
            hit_count: 0,
            size_bytes,
            tags,
        };
        let mut state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        state.l1_memory.put(key.to_string(), entry);
    }

    pub fn invalidate(key: &str) -> bool {
        let mut state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        let in_l1 = state.l1_memory.map.remove(key).is_some();
        state.l1_memory.order.retain(|k| k != key);
        let in_l2 = state.l2_edge.map.remove(key).is_some();
        state.l2_edge.order.retain(|k| k != key);
        let in_l3 = state.l3_origin.map.remove(key).is_some();
        state.l3_origin.order.retain(|k| k != key);
        in_l1 || in_l2 || in_l3
    }

    pub fn invalidate_by_tag(tags: &[String]) -> u32 {
        let mut state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        let mut count = 0u32;
        count += Self::invalidate_tag_from_cache(&mut state.l1_memory, tags);
        count += Self::invalidate_tag_from_cache(&mut state.l2_edge, tags);
        count += Self::invalidate_tag_from_cache(&mut state.l3_origin, tags);
        count
    }

    fn invalidate_tag_from_cache(
        cache: &mut LruCache<String, CdnCacheEntryData>,
        tags: &[String],
    ) -> u32 {
        let keys_to_remove: Vec<String> = cache
            .map
            .iter()
            .filter(|(_, e)| e.tags.iter().any(|t| tags.contains(t)))
            .map(|(k, _)| k.clone())
            .collect();
        let mut count = 0u32;
        for k in &keys_to_remove {
            cache.map.remove(k);
            cache.order.retain(|key| key != k);
            count += 1;
        }
        count
    }

    pub fn warm_cache(query_hashes: &[String]) -> u32 {
        let mut warmed = 0u32;
        for hash in query_hashes {
            let key = format!("query:{}", hash);
            // 检查是否已缓存
            let exists = {
                let state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
                state.l1_memory.map.contains_key(&key)
                    || state.l2_edge.map.contains_key(&key)
                    || state.l3_origin.map.contains_key(&key)
            };
            if !exists {
                let placeholder = serde_json::json!({
                    "warmed": true,
                    "query_hash": hash,
                    "preloaded_at": Utc::now().to_rfc3339(),
                });
                Self::set(
                    &key,
                    &placeholder,
                    "application/json",
                    vec!["warmed".into()],
                    None,
                );
                warmed += 1;
            }
            let mut state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
            state.warm_count += 1;
        }
        warmed
    }

    pub fn prefetch(query_hashes: &[String]) -> u32 {
        let mut prefetched = 0u32;
        for hash in query_hashes {
            let key = format!("prefetch:{}", hash);
            let data = serde_json::json!({
                "prefetched": true,
                "query_hash": hash,
                "prefetched_at": Utc::now().to_rfc3339(),
            });
            Self::set(
                &key,
                &data,
                "application/json",
                vec!["prefetched".into()],
                Some(30_000),
            );
            prefetched += 1;
            let mut state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
            state.prefetch_count += 1;
        }
        prefetched
    }

    pub fn purge_all() -> bool {
        let mut state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        state.l1_memory.map.clear();
        state.l1_memory.order.clear();
        state.l2_edge.map.clear();
        state.l2_edge.order.clear();
        state.l3_origin.map.clear();
        state.l3_origin.order.clear();
        true
    }

    pub fn get_entries(tags: Option<&[String]>, limit: usize) -> Vec<CdnCacheEntryGql> {
        let state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        let mut entries: Vec<CdnCacheEntryGql> = Vec::new();
        for cache in [&state.l1_memory, &state.l2_edge, &state.l3_origin] {
            for (key, e) in &cache.map {
                if let Some(filter_tags) = tags {
                    if !e.tags.iter().any(|t| filter_tags.contains(t)) {
                        continue;
                    }
                }
                if entries.iter().any(|g| g.key == *key) {
                    continue;
                }
                entries.push(CdnCacheEntryGql {
                    key: e.key.clone(),
                    value: e.value.chars().take(500).collect(),
                    content_type: e.content_type.clone(),
                    etag: e.etag.clone(),
                    created_at: e.created_at.to_rfc3339(),
                    expires_at: e.expires_at.to_rfc3339(),
                    hit_count: e.hit_count as i64,
                    size_bytes: e.size_bytes as i64,
                    tags: e.tags.clone(),
                });
            }
        }
        entries.sort_by(|a, b| b.hit_count.cmp(&a.hit_count));
        entries.truncate(limit);
        entries
    }

    pub fn get_stats() -> CdnStatsGql {
        let state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        let total = state.hits + state.misses;
        let hit_rate = if total > 0 {
            state.hits as f64 / total as f64
        } else {
            0.0
        };
        let l1_count = state.l1_memory.map.len();
        let l2_count = state.l2_edge.map.len();
        let l3_count = state.l3_origin.map.len();
        let total_entries = l1_count + l2_count + l3_count;
        let l1_size: usize = state.l1_memory.map.values().map(|e| e.size_bytes).sum();
        let l2_size: usize = state.l2_edge.map.values().map(|e| e.size_bytes).sum();
        let l3_size: usize = state.l3_origin.map.values().map(|e| e.size_bytes).sum();
        let total_size_mb = (l1_size + l2_size + l3_size) as f64 / (1024.0 * 1024.0);
        let layer_stat = |entries: usize, size: usize, hits: u64| -> CdnLayerStatGql {
            let rate = if total > 0 {
                hits as f64 / total as f64
            } else {
                0.0
            };
            CdnLayerStatGql {
                layer: format!("L{}", 0),
                entries: entries as i32,
                size_mb: size as f64 / (1024.0 * 1024.0),
                hit_rate: rate,
            }
        };
        let by_layer = vec![
            CdnLayerStatGql {
                layer: "L1-memory".into(),
                entries: l1_count as i32,
                size_mb: l1_size as f64 / (1024.0 * 1024.0),
                hit_rate,
            },
            CdnLayerStatGql {
                layer: "L2-edge".into(),
                entries: l2_count as i32,
                size_mb: l2_size as f64 / (1024.0 * 1024.0),
                hit_rate,
            },
            CdnLayerStatGql {
                layer: "L3-origin".into(),
                entries: l3_count as i32,
                size_mb: l3_size as f64 / (1024.0 * 1024.0),
                hit_rate,
            },
        ];
        let _ = layer_stat; // 抑制未使用警告
        CdnStatsGql {
            total_entries: total_entries as i32,
            total_size_mb,
            hit_rate,
            miss_rate: 1.0 - hit_rate,
            eviction_count: state.evictions as i64,
            warm_count: state.warm_count as i64,
            prefetch_count: state.prefetch_count as i64,
            by_layer,
        }
    }

    pub fn get_layers() -> Vec<CdnCacheLayerGql> {
        let state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        let total = state.hits + state.misses;
        let hit_rate = if total > 0 {
            state.hits as f64 / total as f64
        } else {
            0.0
        };
        vec![
            CdnCacheLayerGql {
                layer_name: "L1-memory".into(),
                ttl_ms: state.config.default_ttl_ms,
                max_entries: 500,
                hit_rate,
                current_entries: state.l1_memory.map.len() as i32,
            },
            CdnCacheLayerGql {
                layer_name: "L2-edge".into(),
                ttl_ms: state.config.default_ttl_ms * 2,
                max_entries: 2000,
                hit_rate,
                current_entries: state.l2_edge.map.len() as i32,
            },
            CdnCacheLayerGql {
                layer_name: "L3-origin".into(),
                ttl_ms: state.config.default_ttl_ms * 5,
                max_entries: 10000,
                hit_rate,
                current_entries: state.l3_origin.map.len() as i32,
            },
        ]
    }

    pub fn get_config() -> CdnCacheConfigGql {
        let state = cdn_cache_state().lock().unwrap_or_else(|e| e.into_inner());
        CdnCacheConfigGql {
            default_ttl_ms: state.config.default_ttl_ms,
            max_age_public: state.config.max_age_public,
            max_age_private: state.config.max_age_private,
            stale_while_revalidate: state.config.stale_while_revalidate,
            s_max_age: state.config.s_max_age,
        }
    }
}

// ---------- 流式响应 ----------

/// V45.0: 流式配置
#[derive(SimpleObject, Clone)]
pub struct StreamConfigGql {
    pub enabled: bool,
    pub chunk_size: i32,
    pub flush_interval_ms: i64,
    pub max_buffer_size: i32,
}

#[derive(async_graphql::InputObject)]
pub struct StreamConfigInput {
    pub enabled: Option<bool>,
    pub chunk_size: Option<i32>,
    pub flush_interval_ms: Option<i64>,
    pub max_buffer_size: Option<i32>,
}

/// V45.0: 延迟字段
#[derive(SimpleObject, Clone)]
pub struct DeferredFieldGql {
    pub path: String,
    pub label: Option<String>,
    pub depends_on: Vec<String>,
    pub estimated_delay_ms: i64,
}

/// V45.0: 流式分块
#[derive(SimpleObject)]
pub struct StreamChunkGql {
    pub index: i32,
    pub data: serde_json::Value,
    pub is_final: bool,
    pub metadata: serde_json::Value,
}

/// V45.0: 流式统计
#[derive(SimpleObject)]
pub struct StreamStatsGql {
    pub total_streams: i64,
    pub active_streams: i32,
    pub total_chunks: i64,
    pub avg_chunks_per_stream: f64,
    pub avg_stream_duration_ms: f64,
}

// --- 流式内部状态 ---

#[derive(Clone)]
pub(crate) struct DeferredFieldData {
    path: String,
    label: Option<String>,
    depends_on: Vec<String>,
    estimated_delay_ms: i64,
}

#[derive(Clone)]
struct StreamSession {
    query_hash: String,
    total_chunks: u64,
    started_at: DateTime<Utc>,
    active: bool,
}

struct StreamState {
    config: StreamConfigData,
    deferred_fields: HashMap<String, Vec<DeferredFieldData>>,
    sessions: Vec<StreamSession>,
    total_streams: u64,
    total_chunks: u64,
    total_duration_ms: u64,
}

struct StreamConfigData {
    enabled: bool,
    chunk_size: i32,
    flush_interval_ms: i64,
    max_buffer_size: i32,
}

impl Default for StreamConfigData {
    fn default() -> Self {
        Self {
            enabled: true,
            chunk_size: 4096,
            flush_interval_ms: 50,
            max_buffer_size: 65536,
        }
    }
}

impl StreamState {
    fn new() -> Self {
        // 预置常见延迟字段
        let mut deferred_fields: HashMap<String, Vec<DeferredFieldData>> = HashMap::new();
        deferred_fields.insert(
            "dashboard_query".into(),
            vec![
                DeferredFieldData {
                    path: "dashboard.todos".into(),
                    label: Some("todos".into()),
                    depends_on: vec![],
                    estimated_delay_ms: 120,
                },
                DeferredFieldData {
                    path: "dashboard.services".into(),
                    label: Some("services".into()),
                    depends_on: vec![],
                    estimated_delay_ms: 80,
                },
                DeferredFieldData {
                    path: "dashboard.stats".into(),
                    label: Some("stats".into()),
                    depends_on: vec![],
                    estimated_delay_ms: 50,
                },
            ],
        );
        deferred_fields.insert(
            "federation_query".into(),
            vec![
                DeferredFieldData {
                    path: "federatedEntity.relationships".into(),
                    label: Some("relationships".into()),
                    depends_on: vec!["federatedEntity".into()],
                    estimated_delay_ms: 200,
                },
                DeferredFieldData {
                    path: "federatedEntity.audit".into(),
                    label: Some("audit".into()),
                    depends_on: vec!["federatedEntity".into()],
                    estimated_delay_ms: 300,
                },
            ],
        );
        Self {
            config: StreamConfigData::default(),
            deferred_fields,
            sessions: Vec::new(),
            total_streams: 0,
            total_chunks: 0,
            total_duration_ms: 0,
        }
    }
}

static STREAM_STATE: std::sync::OnceLock<Mutex<StreamState>> = std::sync::OnceLock::new();

fn stream_state() -> &'static Mutex<StreamState> {
    STREAM_STATE.get_or_init(|| Mutex::new(StreamState::new()))
}

/// V45.0: 检测查询中的 @defer / @stream 指令
pub fn detect_streaming_directives(query: &str) -> (bool, bool) {
    let has_defer = query.contains("@defer");
    let has_stream = query.contains("@stream");
    (has_defer, has_stream)
}

/// V45.0: 流式响应管理器
pub struct StreamingResponseManager;

impl StreamingResponseManager {
    pub(crate) fn register_deferred(query_hash: &str, fields: Vec<DeferredFieldData>) {
        let mut state = stream_state().lock().unwrap_or_else(|e| e.into_inner());
        state.deferred_fields.insert(query_hash.to_string(), fields);
    }

    pub fn get_deferred_fields(query_hash: Option<&str>) -> Vec<DeferredFieldGql> {
        let state = stream_state().lock().unwrap_or_else(|e| e.into_inner());
        let mut result = Vec::new();
        if let Some(hash) = query_hash {
            if let Some(fields) = state.deferred_fields.get(hash) {
                for f in fields {
                    result.push(DeferredFieldGql {
                        path: f.path.clone(),
                        label: f.label.clone(),
                        depends_on: f.depends_on.clone(),
                        estimated_delay_ms: f.estimated_delay_ms,
                    });
                }
            }
        } else {
            for fields in state.deferred_fields.values() {
                for f in fields {
                    result.push(DeferredFieldGql {
                        path: f.path.clone(),
                        label: f.label.clone(),
                        depends_on: f.depends_on.clone(),
                        estimated_delay_ms: f.estimated_delay_ms,
                    });
                }
            }
        }
        result
    }

    pub fn chunk_response(query_hash: &str, data: &serde_json::Value) -> Vec<StreamChunkGql> {
        let mut state = stream_state().lock().unwrap_or_else(|e| e.into_inner());
        let session_id = format!("stream-{}-{}", query_hash, state.total_streams);
        let _ = session_id;

        let chunk_size = state.config.chunk_size as usize;
        let data_str = serde_json::to_string(data).unwrap_or_default();
        let total_len = data_str.len();
        let num_chunks = if chunk_size > 0 {
            total_len.div_ceil(chunk_size)
        } else {
            1
        };
        let num_chunks = num_chunks.max(1);

        let session = StreamSession {
            query_hash: query_hash.to_string(),
            total_chunks: num_chunks as u64,
            started_at: Utc::now(),
            active: true,
        };
        state.sessions.push(session);
        state.total_streams += 1;
        state.total_chunks += num_chunks as u64;

        drop(state);

        let mut chunks = Vec::with_capacity(num_chunks);
        for i in 0..num_chunks {
            let start = i * chunk_size;
            let end = ((i + 1) * chunk_size).min(total_len);
            let chunk_data = if start < total_len {
                serde_json::Value::String(data_str[start..end].to_string())
            } else {
                serde_json::Value::Null
            };
            chunks.push(StreamChunkGql {
                index: i as i32,
                data: chunk_data,
                is_final: i == num_chunks - 1,
                metadata: serde_json::json!({
                    "query_hash": query_hash,
                    "chunk_index": i,
                    "total_chunks": num_chunks,
                }),
            });
        }

        // 标记会话为已完成
        let mut state = stream_state().lock().unwrap_or_else(|e| e.into_inner());
        if let Some(s) = state.sessions.last_mut() {
            s.active = false;
            let duration = Utc::now().signed_duration_since(s.started_at);
            state.total_duration_ms += duration.num_milliseconds().max(0) as u64;
        }

        chunks
    }

    pub fn get_stats() -> StreamStatsGql {
        let state = stream_state().lock().unwrap_or_else(|e| e.into_inner());
        let active = state.sessions.iter().filter(|s| s.active).count();
        let avg_chunks = if state.total_streams > 0 {
            state.total_chunks as f64 / state.total_streams as f64
        } else {
            0.0
        };
        let avg_duration = if state.total_streams > 0 {
            state.total_duration_ms as f64 / state.total_streams as f64
        } else {
            0.0
        };
        StreamStatsGql {
            total_streams: state.total_streams as i64,
            active_streams: active as i32,
            total_chunks: state.total_chunks as i64,
            avg_chunks_per_stream: avg_chunks,
            avg_stream_duration_ms: avg_duration,
        }
    }

    pub fn get_config() -> StreamConfigGql {
        let state = stream_state().lock().unwrap_or_else(|e| e.into_inner());
        StreamConfigGql {
            enabled: state.config.enabled,
            chunk_size: state.config.chunk_size,
            flush_interval_ms: state.config.flush_interval_ms,
            max_buffer_size: state.config.max_buffer_size,
        }
    }

    pub fn update_config(input: StreamConfigInput) -> bool {
        let mut state = stream_state().lock().unwrap_or_else(|e| e.into_inner());
        if let Some(enabled) = input.enabled {
            state.config.enabled = enabled;
        }
        if let Some(chunk_size) = input.chunk_size {
            state.config.chunk_size = chunk_size;
        }
        if let Some(flush_interval_ms) = input.flush_interval_ms {
            state.config.flush_interval_ms = flush_interval_ms;
        }
        if let Some(max_buffer_size) = input.max_buffer_size {
            state.config.max_buffer_size = max_buffer_size;
        }
        true
    }
}

// ============================================================================
// V46.0 BFF Phase 16 - 联邦查询缓存 V2 + 智能预取 + 边缘函数编排
// ============================================================================

// ---------- Part 1.1: 联邦查询缓存增强（FederatedQueryCacheV2） ----------

/// V46.0: 缓存层级
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum CacheTierGql {
    Memory,
    Redis,
    Cdn,
}

/// V46.0: 缓存失效策略
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum InvalidationPolicyGql {
    Ttl,
    Lru,
    Active,
}

/// V46.0: 联邦缓存条目
#[derive(SimpleObject, Clone)]
pub struct FederatedCacheEntryGql {
    pub key: String,
    pub query_hash: String,
    pub data: serde_json::Value,
    pub tier: CacheTierGql,
    pub created_at: String,
    pub expires_at: String,
    pub hit_count: i64,
    pub size_bytes: i64,
    pub partial: bool,
    pub partial_fields: Vec<String>,
}

/// V46.0: 缓存统计
#[derive(SimpleObject)]
pub struct CacheStatsV2Gql {
    pub total_entries: i64,
    pub memory_entries: i64,
    pub redis_entries: i64,
    pub cdn_entries: i64,
    pub total_hits: i64,
    pub total_misses: i64,
    pub hit_rate: f64,
    pub total_size_bytes: i64,
    pub memory_size_bytes: i64,
    pub redis_size_bytes: i64,
    pub cdn_size_bytes: i64,
    pub avg_ttl_seconds: f64,
    pub lru_evictions: i64,
    pub active_invalidations: i64,
}

/// V46.0: 缓存配置输入
#[derive(async_graphql::InputObject)]
pub struct FederatedCacheConfigInput {
    pub memory_capacity: Option<i64>,
    pub redis_capacity: Option<i64>,
    pub cdn_capacity: Option<i64>,
    pub default_ttl_seconds: Option<i64>,
    pub lru_max_entries: Option<i32>,
    pub partial_caching_enabled: Option<bool>,
}

// --- 内部状态 ---

#[derive(Clone)]
struct FederatedCacheEntry {
    key: String,
    query_hash: String,
    data: serde_json::Value,
    tier: CacheTierGql,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    hit_count: u64,
    size_bytes: u64,
    partial: bool,
    partial_fields: Vec<String>,
}

struct FederatedCacheV2State {
    config: FederatedCacheConfigData,
    memory_cache: HashMap<String, FederatedCacheEntry>,
    redis_cache: HashMap<String, FederatedCacheEntry>,
    cdn_cache: HashMap<String, FederatedCacheEntry>,
    access_order: VecDeque<String>,
    total_hits: u64,
    total_misses: u64,
    lru_evictions: u64,
    active_invalidations: u64,
}

struct FederatedCacheConfigData {
    memory_capacity: u64,
    redis_capacity: u64,
    cdn_capacity: u64,
    default_ttl_seconds: u64,
    lru_max_entries: usize,
    partial_caching_enabled: bool,
}

impl Default for FederatedCacheConfigData {
    fn default() -> Self {
        Self {
            memory_capacity: 128 * 1024 * 1024,
            redis_capacity: 1024 * 1024 * 1024,
            cdn_capacity: 10 * 1024 * 1024 * 1024,
            default_ttl_seconds: 300,
            lru_max_entries: 10000,
            partial_caching_enabled: true,
        }
    }
}

impl FederatedCacheV2State {
    fn new() -> Self {
        Self {
            config: FederatedCacheConfigData::default(),
            memory_cache: HashMap::new(),
            redis_cache: HashMap::new(),
            cdn_cache: HashMap::new(),
            access_order: VecDeque::new(),
            total_hits: 0,
            total_misses: 0,
            lru_evictions: 0,
            active_invalidations: 0,
        }
    }

    fn generate_cache_key(
        query_hash: &str,
        variables: &serde_json::Value,
        context: &serde_json::Value,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(query_hash.as_bytes());
        hasher.update(
            serde_json::to_string(variables)
                .unwrap_or_default()
                .as_bytes(),
        );
        hasher.update(
            serde_json::to_string(context)
                .unwrap_or_default()
                .as_bytes(),
        );
        format!("{:x}", hasher.finalize())
    }

    fn evict_lru_if_needed(&mut self) {
        while self.access_order.len() > self.config.lru_max_entries {
            if let Some(old_key) = self.access_order.pop_front() {
                self.memory_cache.remove(&old_key);
                self.redis_cache.remove(&old_key);
                self.cdn_cache.remove(&old_key);
                self.lru_evictions += 1;
            } else {
                break;
            }
        }
    }

    fn touch_entry(&mut self, key: &str) {
        self.access_order.retain(|k| k != key);
        self.access_order.push_back(key.to_string());
    }
}

static FEDERATED_CACHE_V2: std::sync::OnceLock<Mutex<FederatedCacheV2State>> =
    std::sync::OnceLock::new();

fn federated_cache_v2_state() -> &'static Mutex<FederatedCacheV2State> {
    FEDERATED_CACHE_V2.get_or_init(|| Mutex::new(FederatedCacheV2State::new()))
}

/// V46.0: 联邦查询缓存 V2 管理器
pub struct FederatedQueryCacheV2;

impl FederatedQueryCacheV2 {
    pub fn generate_key(
        query_hash: &str,
        variables: &serde_json::Value,
        context: &serde_json::Value,
    ) -> String {
        FederatedCacheV2State::generate_cache_key(query_hash, variables, context)
    }

    pub fn get(key: &str) -> Option<FederatedCacheEntryGql> {
        let mut state = federated_cache_v2_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();

        let memory_entry = state.memory_cache.get(key).cloned();
        if let Some(entry) = memory_entry {
            if entry.expires_at > now {
                state.total_hits += 1;
                state.touch_entry(key);
                return Some(Self::to_gql(&entry));
            } else {
                state.memory_cache.remove(key);
            }
        }

        let redis_entry = state.redis_cache.get(key).cloned();
        if let Some(entry) = redis_entry {
            if entry.expires_at > now {
                state.total_hits += 1;
                state.touch_entry(key);
                let mut memory_entry = entry.clone();
                memory_entry.tier = CacheTierGql::Memory;
                state.memory_cache.insert(key.to_string(), memory_entry);
                return Some(Self::to_gql(&entry));
            } else {
                state.redis_cache.remove(key);
            }
        }

        let cdn_entry = state.cdn_cache.get(key).cloned();
        if let Some(entry) = cdn_entry {
            if entry.expires_at > now {
                state.total_hits += 1;
                state.touch_entry(key);
                return Some(Self::to_gql(&entry));
            } else {
                state.cdn_cache.remove(key);
            }
        }

        state.total_misses += 1;
        None
    }

    pub fn set(
        key: &str,
        query_hash: &str,
        data: serde_json::Value,
        tier: CacheTierGql,
        ttl_seconds: Option<u64>,
        partial: bool,
        partial_fields: Vec<String>,
    ) {
        let mut state = federated_cache_v2_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        let ttl = ttl_seconds.unwrap_or(state.config.default_ttl_seconds);
        let expires_at = now + chrono::Duration::seconds(ttl as i64);
        let size_bytes = serde_json::to_string(&data)
            .map(|s| s.len() as u64)
            .unwrap_or(0);

        let entry = FederatedCacheEntry {
            key: key.to_string(),
            query_hash: query_hash.to_string(),
            data,
            tier,
            created_at: now,
            expires_at,
            hit_count: 0,
            size_bytes,
            partial,
            partial_fields,
        };

        match tier {
            CacheTierGql::Memory => {
                state.memory_cache.insert(key.to_string(), entry);
            }
            CacheTierGql::Redis => {
                state.redis_cache.insert(key.to_string(), entry);
            }
            CacheTierGql::Cdn => {
                state.cdn_cache.insert(key.to_string(), entry);
            }
        }

        state.touch_entry(key);
        state.evict_lru_if_needed();
    }

    pub fn invalidate(key: &str) -> bool {
        let mut state = federated_cache_v2_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut removed = false;
        if state.memory_cache.remove(key).is_some() {
            removed = true;
        }
        if state.redis_cache.remove(key).is_some() {
            removed = true;
        }
        if state.cdn_cache.remove(key).is_some() {
            removed = true;
        }
        state.access_order.retain(|k| k != key);
        if removed {
            state.active_invalidations += 1;
        }
        removed
    }

    pub fn invalidate_by_query_hash(query_hash: &str) -> i64 {
        let mut state = federated_cache_v2_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut count = 0i64;

        let memory_keys: Vec<String> = state
            .memory_cache
            .iter()
            .filter(|(_, e)| e.query_hash == query_hash)
            .map(|(k, _)| k.clone())
            .collect();
        for k in &memory_keys {
            state.memory_cache.remove(k);
            count += 1;
        }

        let redis_keys: Vec<String> = state
            .redis_cache
            .iter()
            .filter(|(_, e)| e.query_hash == query_hash)
            .map(|(k, _)| k.clone())
            .collect();
        for k in &redis_keys {
            state.redis_cache.remove(k);
            count += 1;
        }

        let cdn_keys: Vec<String> = state
            .cdn_cache
            .iter()
            .filter(|(_, e)| e.query_hash == query_hash)
            .map(|(k, _)| k.clone())
            .collect();
        for k in &cdn_keys {
            state.cdn_cache.remove(k);
            count += 1;
        }

        state.access_order.retain(|k| {
            !memory_keys.contains(k) && !redis_keys.contains(k) && !cdn_keys.contains(k)
        });

        state.active_invalidations += count as u64;
        count
    }

    pub fn get_stats() -> CacheStatsV2Gql {
        let state = federated_cache_v2_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let total = state.total_hits + state.total_misses;
        let hit_rate = if total > 0 {
            state.total_hits as f64 / total as f64
        } else {
            0.0
        };

        let memory_size: u64 = state.memory_cache.values().map(|e| e.size_bytes).sum();
        let redis_size: u64 = state.redis_cache.values().map(|e| e.size_bytes).sum();
        let cdn_size: u64 = state.cdn_cache.values().map(|e| e.size_bytes).sum();

        let all_entries: Vec<&FederatedCacheEntry> = state
            .memory_cache
            .values()
            .chain(state.redis_cache.values())
            .chain(state.cdn_cache.values())
            .collect();

        let avg_ttl = if !all_entries.is_empty() {
            let total_ttl: f64 = all_entries
                .iter()
                .map(|e| {
                    e.expires_at
                        .signed_duration_since(e.created_at)
                        .num_seconds() as f64
                })
                .sum();
            total_ttl / all_entries.len() as f64
        } else {
            0.0
        };

        CacheStatsV2Gql {
            total_entries: (state.memory_cache.len()
                + state.redis_cache.len()
                + state.cdn_cache.len()) as i64,
            memory_entries: state.memory_cache.len() as i64,
            redis_entries: state.redis_cache.len() as i64,
            cdn_entries: state.cdn_cache.len() as i64,
            total_hits: state.total_hits as i64,
            total_misses: state.total_misses as i64,
            hit_rate,
            total_size_bytes: (memory_size + redis_size + cdn_size) as i64,
            memory_size_bytes: memory_size as i64,
            redis_size_bytes: redis_size as i64,
            cdn_size_bytes: cdn_size as i64,
            avg_ttl_seconds: avg_ttl,
            lru_evictions: state.lru_evictions as i64,
            active_invalidations: state.active_invalidations as i64,
        }
    }

    pub fn update_config(input: FederatedCacheConfigInput) -> bool {
        let mut state = federated_cache_v2_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(v) = input.memory_capacity {
            state.config.memory_capacity = v.max(0) as u64;
        }
        if let Some(v) = input.redis_capacity {
            state.config.redis_capacity = v.max(0) as u64;
        }
        if let Some(v) = input.cdn_capacity {
            state.config.cdn_capacity = v.max(0) as u64;
        }
        if let Some(v) = input.default_ttl_seconds {
            state.config.default_ttl_seconds = v.max(0) as u64;
        }
        if let Some(v) = input.lru_max_entries {
            state.config.lru_max_entries = v.max(0) as usize;
        }
        if let Some(v) = input.partial_caching_enabled {
            state.config.partial_caching_enabled = v;
        }
        true
    }

    fn to_gql(entry: &FederatedCacheEntry) -> FederatedCacheEntryGql {
        FederatedCacheEntryGql {
            key: entry.key.clone(),
            query_hash: entry.query_hash.clone(),
            data: entry.data.clone(),
            tier: entry.tier,
            created_at: entry.created_at.to_rfc3339(),
            expires_at: entry.expires_at.to_rfc3339(),
            hit_count: entry.hit_count as i64,
            size_bytes: entry.size_bytes as i64,
            partial: entry.partial,
            partial_fields: entry.partial_fields.clone(),
        }
    }
}

// ---------- Part 1.2: 智能预取引擎（PrefetchEngine） ----------

/// V46.0: 预取规则类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrefetchRuleTypeGql {
    UserBehavior,
    NavigationPattern,
    DataCorrelation,
}

/// V46.0: 预取规则
#[derive(SimpleObject, Clone)]
pub struct PrefetchRuleGql {
    pub id: String,
    pub name: String,
    pub rule_type: PrefetchRuleTypeGql,
    pub trigger_query: String,
    pub prefetch_queries: Vec<String>,
    pub confidence_threshold: f64,
    pub min_occurrences: i32,
    pub enabled: bool,
    pub created_at: String,
    pub hit_count: i64,
}

/// V46.0: 预取预测结果
#[derive(SimpleObject)]
pub struct PrefetchPredictionGql {
    pub rule_id: String,
    pub rule_name: String,
    pub predicted_queries: Vec<String>,
    pub confidence: f64,
    pub estimated_savings_ms: i64,
    pub trigger_query: String,
}

/// V46.0: 预取统计
#[derive(SimpleObject)]
pub struct PrefetchStatsGql {
    pub total_prefetches: i64,
    pub successful_prefetches: i64,
    pub hit_count: i64,
    pub miss_count: i64,
    pub hit_rate: f64,
    pub total_savings_ms: i64,
    pub avg_savings_ms: f64,
    pub wasted_prefetches: i64,
    pub active_rules: i32,
}

/// V46.0: 预取规则输入
#[derive(async_graphql::InputObject)]
pub struct PrefetchRuleInput {
    pub name: String,
    pub rule_type: PrefetchRuleTypeGql,
    pub trigger_query: String,
    pub prefetch_queries: Vec<String>,
    pub confidence_threshold: Option<f64>,
    pub min_occurrences: Option<i32>,
}

// --- 内部状态 ---

#[derive(Clone)]
struct PrefetchRuleData {
    id: String,
    name: String,
    rule_type: PrefetchRuleTypeGql,
    trigger_query: String,
    prefetch_queries: Vec<String>,
    confidence_threshold: f64,
    min_occurrences: u32,
    enabled: bool,
    created_at: DateTime<Utc>,
    hit_count: u64,
}

struct UserBehaviorPattern {
    user_id: String,
    query_sequence: Vec<String>,
    last_query_time: DateTime<Utc>,
}

struct NavigationPattern {
    from_path: String,
    to_path: String,
    query_hash: String,
    occurrence_count: u64,
}

struct DataCorrelation {
    source_query: String,
    target_query: String,
    correlation_score: f64,
    co_occurrence_count: u64,
}

struct PrefetchEngineState {
    rules: Vec<PrefetchRuleData>,
    user_patterns: HashMap<String, UserBehaviorPattern>,
    navigation_patterns: HashMap<String, NavigationPattern>,
    data_correlations: Vec<DataCorrelation>,
    total_prefetches: u64,
    successful_prefetches: u64,
    hit_count: u64,
    miss_count: u64,
    total_savings_ms: u64,
    wasted_prefetches: u64,
}

impl PrefetchEngineState {
    fn new() -> Self {
        let rules = vec![
            PrefetchRuleData {
                id: "rule_nav_dashboard".into(),
                name: "仪表盘导航预取".into(),
                rule_type: PrefetchRuleTypeGql::NavigationPattern,
                trigger_query: "dashboard_query".into(),
                prefetch_queries: vec!["service_health_query".into(), "todo_list_query".into()],
                confidence_threshold: 0.7,
                min_occurrences: 5,
                enabled: true,
                created_at: Utc::now(),
                hit_count: 0,
            },
            PrefetchRuleData {
                id: "rule_corr_entity".into(),
                name: "实体数据关联预取".into(),
                rule_type: PrefetchRuleTypeGql::DataCorrelation,
                trigger_query: "federated_entity_query".into(),
                prefetch_queries: vec!["entity_relationships_query".into()],
                confidence_threshold: 0.6,
                min_occurrences: 3,
                enabled: true,
                created_at: Utc::now(),
                hit_count: 0,
            },
        ];

        let mut nav_patterns = HashMap::new();
        nav_patterns.insert(
            "dashboard->services".into(),
            NavigationPattern {
                from_path: "/dashboard".into(),
                to_path: "/services".into(),
                query_hash: "service_health_query".into(),
                occurrence_count: 120,
            },
        );

        Self {
            rules,
            user_patterns: HashMap::new(),
            navigation_patterns: nav_patterns,
            data_correlations: vec![
                DataCorrelation {
                    source_query: "federated_entity_query".into(),
                    target_query: "entity_audit_query".into(),
                    correlation_score: 0.82,
                    co_occurrence_count: 450,
                },
                DataCorrelation {
                    source_query: "dashboard_query".into(),
                    target_query: "module_stats_query".into(),
                    correlation_score: 0.75,
                    co_occurrence_count: 890,
                },
            ],
            total_prefetches: 0,
            successful_prefetches: 0,
            hit_count: 0,
            miss_count: 0,
            total_savings_ms: 0,
            wasted_prefetches: 0,
        }
    }
}

static PREFETCH_ENGINE_STATE: std::sync::OnceLock<Mutex<PrefetchEngineState>> =
    std::sync::OnceLock::new();

fn prefetch_engine_state() -> &'static Mutex<PrefetchEngineState> {
    PREFETCH_ENGINE_STATE.get_or_init(|| Mutex::new(PrefetchEngineState::new()))
}

/// V46.0: 智能预取引擎
pub struct PrefetchEngine;

impl PrefetchEngine {
    pub fn predict(trigger_query: &str, user_id: Option<&str>) -> Vec<PrefetchPredictionGql> {
        let state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut predictions = Vec::new();

        for rule in &state.rules {
            if !rule.enabled {
                continue;
            }
            if rule.trigger_query != trigger_query {
                continue;
            }

            let confidence = match rule.rule_type {
                PrefetchRuleTypeGql::UserBehavior => {
                    if let Some(uid) = user_id {
                        if let Some(pattern) = state.user_patterns.get(uid) {
                            let seq_match = pattern
                                .query_sequence
                                .windows(2)
                                .filter(|w| w[0] == trigger_query)
                                .count();
                            (seq_match as f64 / pattern.query_sequence.len().max(1) as f64).min(1.0)
                        } else {
                            0.5
                        }
                    } else {
                        0.3
                    }
                }
                PrefetchRuleTypeGql::NavigationPattern => {
                    let total: u64 = state
                        .navigation_patterns
                        .values()
                        .map(|p| p.occurrence_count)
                        .sum();
                    if total > 0 {
                        let matched: u64 = state
                            .navigation_patterns
                            .values()
                            .filter(|p| p.query_hash == trigger_query)
                            .map(|p| p.occurrence_count)
                            .sum();
                        matched as f64 / total as f64
                    } else {
                        0.5
                    }
                }
                PrefetchRuleTypeGql::DataCorrelation => state
                    .data_correlations
                    .iter()
                    .filter(|c| c.source_query == trigger_query)
                    .map(|c| c.correlation_score)
                    .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap_or(0.5),
            };

            if confidence >= rule.confidence_threshold {
                let estimated_savings = (rule.prefetch_queries.len() as i64) * 150;
                predictions.push(PrefetchPredictionGql {
                    rule_id: rule.id.clone(),
                    rule_name: rule.name.clone(),
                    predicted_queries: rule.prefetch_queries.clone(),
                    confidence,
                    estimated_savings_ms: estimated_savings,
                    trigger_query: trigger_query.to_string(),
                });
            }
        }

        predictions.sort_by(|a, b| {
            b.confidence
                .partial_cmp(&a.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        predictions
    }

    pub fn record_query(query_hash: &str, user_id: Option<&str>) {
        let mut state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(uid) = user_id {
            let pattern = state
                .user_patterns
                .entry(uid.to_string())
                .or_insert_with(|| UserBehaviorPattern {
                    user_id: uid.to_string(),
                    query_sequence: Vec::new(),
                    last_query_time: Utc::now(),
                });
            pattern.query_sequence.push(query_hash.to_string());
            if pattern.query_sequence.len() > 50 {
                pattern.query_sequence.remove(0);
            }
            pattern.last_query_time = Utc::now();
        }
    }

    pub fn record_prefetch_result(rule_id: &str, hit: bool, savings_ms: u64) {
        let mut state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_prefetches += 1;
        if hit {
            state.hit_count += 1;
            state.total_savings_ms += savings_ms;
            state.successful_prefetches += 1;
        } else {
            state.miss_count += 1;
            state.wasted_prefetches += 1;
        }

        if let Some(rule) = state.rules.iter_mut().find(|r| r.id == rule_id) {
            rule.hit_count += 1;
        }
    }

    pub fn list_rules() -> Vec<PrefetchRuleGql> {
        let state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .rules
            .iter()
            .map(|r| PrefetchRuleGql {
                id: r.id.clone(),
                name: r.name.clone(),
                rule_type: r.rule_type,
                trigger_query: r.trigger_query.clone(),
                prefetch_queries: r.prefetch_queries.clone(),
                confidence_threshold: r.confidence_threshold,
                min_occurrences: r.min_occurrences as i32,
                enabled: r.enabled,
                created_at: r.created_at.to_rfc3339(),
                hit_count: r.hit_count as i64,
            })
            .collect()
    }

    pub fn add_rule(input: PrefetchRuleInput) -> PrefetchRuleGql {
        let mut state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let id = format!("rule_{}", uuid_simple());
        let rule = PrefetchRuleData {
            id: id.clone(),
            name: input.name,
            rule_type: input.rule_type,
            trigger_query: input.trigger_query,
            prefetch_queries: input.prefetch_queries,
            confidence_threshold: input.confidence_threshold.unwrap_or(0.6),
            min_occurrences: input.min_occurrences.unwrap_or(3) as u32,
            enabled: true,
            created_at: Utc::now(),
            hit_count: 0,
        };
        let gql = PrefetchRuleGql {
            id: rule.id.clone(),
            name: rule.name.clone(),
            rule_type: rule.rule_type,
            trigger_query: rule.trigger_query.clone(),
            prefetch_queries: rule.prefetch_queries.clone(),
            confidence_threshold: rule.confidence_threshold,
            min_occurrences: rule.min_occurrences as i32,
            enabled: rule.enabled,
            created_at: rule.created_at.to_rfc3339(),
            hit_count: rule.hit_count as i64,
        };
        state.rules.push(rule);
        gql
    }

    pub fn toggle_rule(rule_id: &str, enabled: bool) -> bool {
        let mut state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(rule) = state.rules.iter_mut().find(|r| r.id == rule_id) {
            rule.enabled = enabled;
            true
        } else {
            false
        }
    }

    pub fn remove_rule(rule_id: &str) -> bool {
        let mut state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let before = state.rules.len();
        state.rules.retain(|r| r.id != rule_id);
        state.rules.len() < before
    }

    pub fn get_stats() -> PrefetchStatsGql {
        let state = prefetch_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let total = state.hit_count + state.miss_count;
        let hit_rate = if total > 0 {
            state.hit_count as f64 / total as f64
        } else {
            0.0
        };
        let avg_savings = if state.hit_count > 0 {
            state.total_savings_ms as f64 / state.hit_count as f64
        } else {
            0.0
        };
        let active_rules = state.rules.iter().filter(|r| r.enabled).count();

        PrefetchStatsGql {
            total_prefetches: state.total_prefetches as i64,
            successful_prefetches: state.successful_prefetches as i64,
            hit_count: state.hit_count as i64,
            miss_count: state.miss_count as i64,
            hit_rate,
            total_savings_ms: state.total_savings_ms as i64,
            avg_savings_ms: avg_savings,
            wasted_prefetches: state.wasted_prefetches as i64,
            active_rules: active_rules as i32,
        }
    }
}

// ---------- Part 1.3: 边缘函数编排（EdgeFunctionOrchestrator） ----------

/// V46.0: 执行状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeExecutionStatusGql {
    Pending,
    Running,
    Completed,
    Failed,
    Skipped,
    Cancelled,
}

/// V46.0: 执行模式
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeExecutionModeGql {
    Sequential,
    Parallel,
    Conditional,
}

/// V46.0: 边缘函数（编排版）
#[derive(SimpleObject, Clone)]
pub struct EdgeOrchFunctionGql {
    pub id: String,
    pub name: String,
    pub description: String,
    pub runtime: String,
    pub entry_point: String,
    pub timeout_ms: i64,
    pub memory_mb: i32,
    pub created_at: String,
    pub last_deployed: String,
    pub enabled: bool,
    pub version: String,
}

/// V46.0: 边缘节点（编排版）
#[derive(SimpleObject, Clone)]
pub struct EdgeOrchNodeGql {
    pub id: String,
    pub name: String,
    pub region: String,
    pub city: String,
    pub ip_address: String,
    pub capacity: i32,
    pub current_load: i32,
    pub status: String,
    pub latency_ms: i64,
}

/// V46.0: 边缘执行计划
#[derive(SimpleObject)]
pub struct EdgeExecutionPlanGql {
    pub plan_id: String,
    pub name: String,
    pub mode: EdgeExecutionModeGql,
    pub status: EdgeExecutionStatusGql,
    pub function_ids: Vec<String>,
    pub functions: Vec<EdgeOrchFunctionGql>,
    pub target_node_id: Option<String>,
    pub target_node: Option<EdgeOrchNodeGql>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub error_message: Option<String>,
}

/// V46.0: 边缘函数输入
#[derive(async_graphql::InputObject)]
pub struct EdgeOrchFunctionInput {
    pub name: String,
    pub description: Option<String>,
    pub runtime: String,
    pub entry_point: String,
    pub timeout_ms: Option<i64>,
    pub memory_mb: Option<i32>,
}

/// V46.0: 执行计划输入
#[derive(async_graphql::InputObject)]
pub struct EdgeExecutionPlanInput {
    pub name: String,
    pub mode: EdgeExecutionModeGql,
    pub function_ids: Vec<String>,
    pub target_node_id: Option<String>,
}

// --- 内部状态 ---

#[derive(Clone)]
struct EdgeOrchFunctionData {
    id: String,
    name: String,
    description: String,
    runtime: String,
    entry_point: String,
    timeout_ms: u64,
    memory_mb: u32,
    created_at: DateTime<Utc>,
    last_deployed: DateTime<Utc>,
    enabled: bool,
    version: String,
}

#[derive(Clone)]
struct EdgeOrchNodeData {
    id: String,
    name: String,
    region: String,
    city: String,
    ip_address: String,
    capacity: u32,
    current_load: u32,
    status: String,
    latency_ms: u64,
}

struct EdgeOrchPlanData {
    plan_id: String,
    name: String,
    mode: EdgeExecutionModeGql,
    status: EdgeExecutionStatusGql,
    function_ids: Vec<String>,
    target_node_id: Option<String>,
    created_at: DateTime<Utc>,
    started_at: Option<DateTime<Utc>>,
    completed_at: Option<DateTime<Utc>>,
    error_message: Option<String>,
}

struct EdgeOrchestratorState {
    functions: Vec<EdgeOrchFunctionData>,
    nodes: Vec<EdgeOrchNodeData>,
    plans: Vec<EdgeOrchPlanData>,
}

impl EdgeOrchestratorState {
    fn new() -> Self {
        let functions = vec![
            EdgeOrchFunctionData {
                id: "fn_auth_validate".into(),
                name: "auth-validate".into(),
                description: "令牌验证边缘函数".into(),
                runtime: "rust-wasm".into(),
                entry_point: "validate_token".into(),
                timeout_ms: 100,
                memory_mb: 128,
                created_at: Utc::now(),
                last_deployed: Utc::now(),
                enabled: true,
                version: "1.2.0".into(),
            },
            EdgeOrchFunctionData {
                id: "fn_cache_lookup".into(),
                name: "cache-lookup".into(),
                description: "缓存查询边缘函数".into(),
                runtime: "rust-wasm".into(),
                entry_point: "lookup_cache".into(),
                timeout_ms: 50,
                memory_mb: 64,
                created_at: Utc::now(),
                last_deployed: Utc::now(),
                enabled: true,
                version: "2.0.1".into(),
            },
            EdgeOrchFunctionData {
                id: "fn_rate_limit".into(),
                name: "rate-limit".into(),
                description: "速率限制边缘函数".into(),
                runtime: "rust-wasm".into(),
                entry_point: "check_rate_limit".into(),
                timeout_ms: 30,
                memory_mb: 32,
                created_at: Utc::now(),
                last_deployed: Utc::now(),
                enabled: true,
                version: "1.0.0".into(),
            },
        ];

        let nodes = vec![
            EdgeOrchNodeData {
                id: "node_beijing".into(),
                name: "北京边缘节点".into(),
                region: "cn-north".into(),
                city: "北京".into(),
                ip_address: "10.0.1.10".into(),
                capacity: 1000,
                current_load: 342,
                status: "healthy".into(),
                latency_ms: 5,
            },
            EdgeOrchNodeData {
                id: "node_shanghai".into(),
                name: "上海边缘节点".into(),
                region: "cn-east".into(),
                city: "上海".into(),
                ip_address: "10.0.2.10".into(),
                capacity: 1200,
                current_load: 567,
                status: "healthy".into(),
                latency_ms: 8,
            },
            EdgeOrchNodeData {
                id: "node_guangzhou".into(),
                name: "广州边缘节点".into(),
                region: "cn-south".into(),
                city: "广州".into(),
                ip_address: "10.0.3.10".into(),
                capacity: 800,
                current_load: 123,
                status: "healthy".into(),
                latency_ms: 12,
            },
        ];

        Self {
            functions,
            nodes,
            plans: Vec::new(),
        }
    }

    fn select_best_node(&self) -> Option<&EdgeOrchNodeData> {
        self.nodes
            .iter()
            .filter(|n| n.status == "healthy")
            .min_by(|a, b| {
                let a_util = a.current_load as f64 / a.capacity as f64;
                let b_util = b.current_load as f64 / b.capacity as f64;
                a_util
                    .partial_cmp(&b_util)
                    .unwrap_or(std::cmp::Ordering::Equal)
                    .then_with(|| a.latency_ms.cmp(&b.latency_ms))
            })
    }
}

static EDGE_ORCHESTRATOR_STATE: std::sync::OnceLock<Mutex<EdgeOrchestratorState>> =
    std::sync::OnceLock::new();

fn edge_orchestrator_state() -> &'static Mutex<EdgeOrchestratorState> {
    EDGE_ORCHESTRATOR_STATE.get_or_init(|| Mutex::new(EdgeOrchestratorState::new()))
}

/// V46.0: 边缘函数编排器
pub struct EdgeFunctionOrchestrator;

impl EdgeFunctionOrchestrator {
    pub fn list_functions() -> Vec<EdgeOrchFunctionGql> {
        let state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.functions.iter().map(Self::fn_to_gql).collect()
    }

    pub fn get_function(id: &str) -> Option<EdgeOrchFunctionGql> {
        let state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .functions
            .iter()
            .find(|f| f.id == id)
            .map(Self::fn_to_gql)
    }

    pub fn register_function(input: EdgeOrchFunctionInput) -> EdgeOrchFunctionGql {
        let mut state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let id = format!("fn_{}", uuid_simple());
        let now = Utc::now();
        let func = EdgeOrchFunctionData {
            id: id.clone(),
            name: input.name,
            description: input.description.unwrap_or_default(),
            runtime: input.runtime,
            entry_point: input.entry_point,
            timeout_ms: input.timeout_ms.unwrap_or(1000) as u64,
            memory_mb: input.memory_mb.unwrap_or(128) as u32,
            created_at: now,
            last_deployed: now,
            enabled: true,
            version: "1.0.0".into(),
        };
        let gql = Self::fn_to_gql(&func);
        state.functions.push(func);
        gql
    }

    pub fn toggle_function(id: &str, enabled: bool) -> bool {
        let mut state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(f) = state.functions.iter_mut().find(|f| f.id == id) {
            f.enabled = enabled;
            true
        } else {
            false
        }
    }

    pub fn remove_function(id: &str) -> bool {
        let mut state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let before = state.functions.len();
        state.functions.retain(|f| f.id != id);
        state.functions.len() < before
    }

    pub fn list_nodes() -> Vec<EdgeOrchNodeGql> {
        let state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.nodes.iter().map(Self::node_to_gql).collect()
    }

    pub fn create_execution_plan(input: EdgeExecutionPlanInput) -> EdgeExecutionPlanGql {
        let mut state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let plan_id = format!("plan_{}", uuid_simple());
        let now = Utc::now();

        let target_node_id = input
            .target_node_id
            .or_else(|| state.select_best_node().map(|n| n.id.clone()));

        let plan = EdgeOrchPlanData {
            plan_id: plan_id.clone(),
            name: input.name,
            mode: input.mode,
            status: EdgeExecutionStatusGql::Pending,
            function_ids: input.function_ids,
            target_node_id: target_node_id.clone(),
            created_at: now,
            started_at: None,
            completed_at: None,
            error_message: None,
        };

        let gql = Self::plan_to_gql(&plan, &state);
        state.plans.push(plan);
        gql
    }

    pub fn execute_plan(plan_id: &str) -> EdgeExecutionStatusGql {
        let mut state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(plan) = state.plans.iter_mut().find(|p| p.plan_id == plan_id) {
            plan.status = EdgeExecutionStatusGql::Running;
            plan.started_at = Some(Utc::now());
            EdgeExecutionStatusGql::Running
        } else {
            EdgeExecutionStatusGql::Failed
        }
    }

    pub fn get_plan(plan_id: &str) -> Option<EdgeExecutionPlanGql> {
        let state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .plans
            .iter()
            .find(|p| p.plan_id == plan_id)
            .map(|p| Self::plan_to_gql(p, &state))
    }

    pub fn list_plans() -> Vec<EdgeExecutionPlanGql> {
        let state = edge_orchestrator_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .plans
            .iter()
            .map(|p| Self::plan_to_gql(p, &state))
            .collect()
    }

    fn fn_to_gql(f: &EdgeOrchFunctionData) -> EdgeOrchFunctionGql {
        EdgeOrchFunctionGql {
            id: f.id.clone(),
            name: f.name.clone(),
            description: f.description.clone(),
            runtime: f.runtime.clone(),
            entry_point: f.entry_point.clone(),
            timeout_ms: f.timeout_ms as i64,
            memory_mb: f.memory_mb as i32,
            created_at: f.created_at.to_rfc3339(),
            last_deployed: f.last_deployed.to_rfc3339(),
            enabled: f.enabled,
            version: f.version.clone(),
        }
    }

    fn node_to_gql(n: &EdgeOrchNodeData) -> EdgeOrchNodeGql {
        EdgeOrchNodeGql {
            id: n.id.clone(),
            name: n.name.clone(),
            region: n.region.clone(),
            city: n.city.clone(),
            ip_address: n.ip_address.clone(),
            capacity: n.capacity as i32,
            current_load: n.current_load as i32,
            status: n.status.clone(),
            latency_ms: n.latency_ms as i64,
        }
    }

    fn plan_to_gql(p: &EdgeOrchPlanData, state: &EdgeOrchestratorState) -> EdgeExecutionPlanGql {
        let functions: Vec<EdgeOrchFunctionGql> = state
            .functions
            .iter()
            .filter(|f| p.function_ids.contains(&f.id))
            .map(Self::fn_to_gql)
            .collect();

        let target_node = p
            .target_node_id
            .as_ref()
            .and_then(|nid| state.nodes.iter().find(|n| n.id == *nid))
            .map(Self::node_to_gql);

        let duration_ms = match (p.started_at, p.completed_at) {
            (Some(s), Some(c)) => Some(c.signed_duration_since(s).num_milliseconds()),
            _ => None,
        };

        EdgeExecutionPlanGql {
            plan_id: p.plan_id.clone(),
            name: p.name.clone(),
            mode: p.mode,
            status: p.status,
            function_ids: p.function_ids.clone(),
            functions,
            target_node_id: p.target_node_id.clone(),
            target_node,
            created_at: p.created_at.to_rfc3339(),
            started_at: p.started_at.map(|t| t.to_rfc3339()),
            completed_at: p.completed_at.map(|t| t.to_rfc3339()),
            duration_ms,
            error_message: p.error_message.clone(),
        }
    }
}

// ============================================================================
// V46.0 GraphQL API 生命周期 - 废弃管理 + 版本迁移 + 平滑升级
// ============================================================================

// ---------- Part 2.1: 废弃管理（DeprecationManager） ----------

/// V46.0: 废弃字段
#[derive(SimpleObject, Clone)]
pub struct DeprecatedFieldGql {
    pub field_path: String,
    pub type_name: String,
    pub field_name: String,
    pub reason: String,
    pub deprecated_since: String,
    pub planned_removal_version: String,
    pub usage_count_30d: i64,
    pub usage_count_7d: i64,
    pub replacement: Option<String>,
    pub severity: String,
}

/// V46.0: 废弃统计
#[derive(SimpleObject)]
pub struct DeprecationStatsGql {
    pub total_deprecated_fields: i32,
    pub active_deprecations: i32,
    pub total_usage_30d: i64,
    pub total_usage_7d: i64,
    pub fields_with_replacement: i32,
    pub fields_without_replacement: i32,
    pub upcoming_removals: i32,
    pub notifications_sent: i64,
}

/// V46.0: 废弃策略
#[derive(SimpleObject)]
pub struct DeprecationPolicyGql {
    pub min_deprecation_period_days: i32,
    pub notification_threshold_usage: i64,
    pub auto_notify_enabled: bool,
    pub grace_period_days: i32,
    pub removal_policy: String,
}

/// V46.0: 废弃策略输入
#[derive(async_graphql::InputObject)]
pub struct DeprecationPolicyInput {
    pub min_deprecation_period_days: Option<i32>,
    pub notification_threshold_usage: Option<i64>,
    pub auto_notify_enabled: Option<bool>,
    pub grace_period_days: Option<i32>,
    pub removal_policy: Option<String>,
}

/// V46.0: 废弃字段输入
#[derive(async_graphql::InputObject)]
pub struct DeprecatedFieldInput {
    pub field_path: String,
    pub reason: String,
    pub planned_removal_version: String,
    pub replacement: Option<String>,
    pub severity: Option<String>,
}

// --- 内部状态 ---

#[derive(Clone)]
struct DeprecatedFieldData {
    field_path: String,
    type_name: String,
    field_name: String,
    reason: String,
    deprecated_since: DateTime<Utc>,
    planned_removal_version: String,
    usage_count_30d: u64,
    usage_count_7d: u64,
    replacement: Option<String>,
    severity: String,
}

struct DeprecationPolicyData {
    min_deprecation_period_days: u32,
    notification_threshold_usage: u64,
    auto_notify_enabled: bool,
    grace_period_days: u32,
    removal_policy: String,
}

impl Default for DeprecationPolicyData {
    fn default() -> Self {
        Self {
            min_deprecation_period_days: 180,
            notification_threshold_usage: 1000,
            auto_notify_enabled: true,
            grace_period_days: 90,
            removal_policy: "semver-major".into(),
        }
    }
}

struct DeprecationManagerState {
    deprecated_fields: Vec<DeprecatedFieldData>,
    policy: DeprecationPolicyData,
    notifications_sent: u64,
}

impl DeprecationManagerState {
    fn new() -> Self {
        let now = Utc::now();
        let fields = vec![
            DeprecatedFieldData {
                field_path: "Query.oldDashboard".into(),
                type_name: "Query".into(),
                field_name: "oldDashboard".into(),
                reason: "请使用 dashboard 字段替代，支持更多聚合数据".into(),
                deprecated_since: now - chrono::Duration::days(60),
                planned_removal_version: "v48.0.0".into(),
                usage_count_30d: 15234,
                usage_count_7d: 3892,
                replacement: Some("Query.dashboard".into()),
                severity: "medium".into(),
            },
            DeprecatedFieldData {
                field_path: "User.legacyRole".into(),
                type_name: "User".into(),
                field_name: "legacyRole".into(),
                reason: "角色系统已升级为 RBAC，请使用 roles 字段".into(),
                deprecated_since: now - chrono::Duration::days(120),
                planned_removal_version: "v47.0.0".into(),
                usage_count_30d: 8921,
                usage_count_7d: 2103,
                replacement: Some("User.roles".into()),
                severity: "high".into(),
            },
            DeprecatedFieldData {
                field_path: "Mutation.createLegacyTodo".into(),
                type_name: "Mutation".into(),
                field_name: "createLegacyTodo".into(),
                reason: "请使用 createTodo 替代，支持更多字段".into(),
                deprecated_since: now - chrono::Duration::days(30),
                planned_removal_version: "v49.0.0".into(),
                usage_count_30d: 45210,
                usage_count_7d: 11234,
                replacement: Some("Mutation.createTodo".into()),
                severity: "low".into(),
            },
        ];

        Self {
            deprecated_fields: fields,
            policy: DeprecationPolicyData::default(),
            notifications_sent: 342,
        }
    }
}

static DEPRECATION_MANAGER_STATE: std::sync::OnceLock<Mutex<DeprecationManagerState>> =
    std::sync::OnceLock::new();

fn deprecation_manager_state() -> &'static Mutex<DeprecationManagerState> {
    DEPRECATION_MANAGER_STATE.get_or_init(|| Mutex::new(DeprecationManagerState::new()))
}

/// V46.0: 废弃管理器
pub struct DeprecationManager;

impl DeprecationManager {
    pub fn list_deprecated_fields(
        type_filter: Option<String>,
        severity: Option<String>,
    ) -> Vec<DeprecatedFieldGql> {
        let state = deprecation_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .deprecated_fields
            .iter()
            .filter(|f| {
                if let Some(ref tf) = type_filter {
                    if &f.type_name != tf {
                        return false;
                    }
                }
                if let Some(ref sev) = severity {
                    if &f.severity != sev {
                        return false;
                    }
                }
                true
            })
            .map(|f| DeprecatedFieldGql {
                field_path: f.field_path.clone(),
                type_name: f.type_name.clone(),
                field_name: f.field_name.clone(),
                reason: f.reason.clone(),
                deprecated_since: f.deprecated_since.to_rfc3339(),
                planned_removal_version: f.planned_removal_version.clone(),
                usage_count_30d: f.usage_count_30d as i64,
                usage_count_7d: f.usage_count_7d as i64,
                replacement: f.replacement.clone(),
                severity: f.severity.clone(),
            })
            .collect()
    }

    pub fn get_field(field_path: &str) -> Option<DeprecatedFieldGql> {
        let state = deprecation_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .deprecated_fields
            .iter()
            .find(|f| f.field_path == field_path)
            .map(|f| DeprecatedFieldGql {
                field_path: f.field_path.clone(),
                type_name: f.type_name.clone(),
                field_name: f.field_name.clone(),
                reason: f.reason.clone(),
                deprecated_since: f.deprecated_since.to_rfc3339(),
                planned_removal_version: f.planned_removal_version.clone(),
                usage_count_30d: f.usage_count_30d as i64,
                usage_count_7d: f.usage_count_7d as i64,
                replacement: f.replacement.clone(),
                severity: f.severity.clone(),
            })
    }

    pub fn add_deprecated_field(input: DeprecatedFieldInput) -> DeprecatedFieldGql {
        let mut state = deprecation_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let parts: Vec<&str> = input.field_path.split('.').collect();
        let (type_name, field_name) = if parts.len() >= 2 {
            (parts[0].to_string(), parts[1].to_string())
        } else {
            ("Unknown".to_string(), input.field_path.clone())
        };

        let field = DeprecatedFieldData {
            field_path: input.field_path.clone(),
            type_name,
            field_name,
            reason: input.reason,
            deprecated_since: Utc::now(),
            planned_removal_version: input.planned_removal_version,
            usage_count_30d: 0,
            usage_count_7d: 0,
            replacement: input.replacement,
            severity: input.severity.unwrap_or_else(|| "medium".into()),
        };

        let gql = DeprecatedFieldGql {
            field_path: field.field_path.clone(),
            type_name: field.type_name.clone(),
            field_name: field.field_name.clone(),
            reason: field.reason.clone(),
            deprecated_since: field.deprecated_since.to_rfc3339(),
            planned_removal_version: field.planned_removal_version.clone(),
            usage_count_30d: field.usage_count_30d as i64,
            usage_count_7d: field.usage_count_7d as i64,
            replacement: field.replacement.clone(),
            severity: field.severity.clone(),
        };

        state.deprecated_fields.push(field);
        gql
    }

    pub fn record_usage(field_path: &str) -> bool {
        let mut state = deprecation_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let auto_notify = state.policy.auto_notify_enabled;
        let threshold = state.policy.notification_threshold_usage;
        if let Some(f) = state
            .deprecated_fields
            .iter_mut()
            .find(|f| f.field_path == field_path)
        {
            f.usage_count_30d += 1;
            f.usage_count_7d += 1;

            if auto_notify && f.usage_count_7d > threshold {
                state.notifications_sent += 1;
            }
            true
        } else {
            false
        }
    }

    pub fn get_stats() -> DeprecationStatsGql {
        let state = deprecation_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let total = state.deprecated_fields.len();
        let with_replacement = state
            .deprecated_fields
            .iter()
            .filter(|f| f.replacement.is_some())
            .count();
        let now = Utc::now();
        let upcoming = state
            .deprecated_fields
            .iter()
            .filter(|f| {
                let days_since = now.signed_duration_since(f.deprecated_since).num_days();
                days_since >= (state.policy.min_deprecation_period_days as i64).saturating_sub(30)
            })
            .count();

        DeprecationStatsGql {
            total_deprecated_fields: total as i32,
            active_deprecations: total as i32,
            total_usage_30d: state
                .deprecated_fields
                .iter()
                .map(|f| f.usage_count_30d)
                .sum::<u64>() as i64,
            total_usage_7d: state
                .deprecated_fields
                .iter()
                .map(|f| f.usage_count_7d)
                .sum::<u64>() as i64,
            fields_with_replacement: with_replacement as i32,
            fields_without_replacement: (total - with_replacement) as i32,
            upcoming_removals: upcoming as i32,
            notifications_sent: state.notifications_sent as i64,
        }
    }

    pub fn get_policy() -> DeprecationPolicyGql {
        let state = deprecation_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        DeprecationPolicyGql {
            min_deprecation_period_days: state.policy.min_deprecation_period_days as i32,
            notification_threshold_usage: state.policy.notification_threshold_usage as i64,
            auto_notify_enabled: state.policy.auto_notify_enabled,
            grace_period_days: state.policy.grace_period_days as i32,
            removal_policy: state.policy.removal_policy.clone(),
        }
    }

    pub fn update_policy(input: DeprecationPolicyInput) -> bool {
        let mut state = deprecation_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(v) = input.min_deprecation_period_days {
            state.policy.min_deprecation_period_days = v.max(0) as u32;
        }
        if let Some(v) = input.notification_threshold_usage {
            state.policy.notification_threshold_usage = v.max(0) as u64;
        }
        if let Some(v) = input.auto_notify_enabled {
            state.policy.auto_notify_enabled = v;
        }
        if let Some(v) = input.grace_period_days {
            state.policy.grace_period_days = v.max(0) as u32;
        }
        if let Some(v) = input.removal_policy {
            state.policy.removal_policy = v;
        }
        true
    }
}

// ---------- Part 2.2: 版本迁移工具（MigrationToolkit） ----------

/// V46.0: 变更类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChangeTypeGql {
    Add,
    Remove,
    Modify,
    Deprecate,
}

/// V46.0: Schema 差异
#[derive(SimpleObject, Clone)]
pub struct SchemaDiffGql {
    pub diff_id: String,
    pub old_version: String,
    pub new_version: String,
    pub total_changes: i32,
    pub breaking_changes_count: i32,
    pub safe_changes_count: i32,
    pub changes: Vec<BreakingChangeGql>,
    pub created_at: String,
}

/// V46.0: 破坏性变更
#[derive(SimpleObject, Clone)]
pub struct BreakingChangeGql {
    pub change_type: ChangeTypeGql,
    pub field_path: String,
    pub type_name: String,
    pub field_name: String,
    pub description: String,
    pub is_breaking: bool,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub severity: String,
    pub migration_hint: String,
}

/// V46.0: 迁移脚本
#[derive(SimpleObject, Clone)]
pub struct MigrationScriptGql {
    pub script_id: String,
    pub name: String,
    pub from_version: String,
    pub to_version: String,
    pub content: String,
    pub language: String,
    pub is_auto_generated: bool,
    pub requires_manual_review: bool,
    pub created_at: String,
}

/// V46.0: 兼容性检查结果
#[derive(SimpleObject)]
pub struct CompatibilityCheckGql {
    pub check_id: String,
    pub old_version: String,
    pub new_version: String,
    pub is_compatible: bool,
    pub breaking_changes: Vec<BreakingChangeGql>,
    pub warnings: Vec<String>,
    pub score: f64,
    pub summary: String,
}

// --- 内部状态 ---

#[derive(Clone)]
struct BreakingChangeData {
    change_type: ChangeTypeGql,
    field_path: String,
    type_name: String,
    field_name: String,
    description: String,
    is_breaking: bool,
    old_value: Option<String>,
    new_value: Option<String>,
    severity: String,
    migration_hint: String,
}

struct SchemaDiffData {
    diff_id: String,
    old_version: String,
    new_version: String,
    changes: Vec<BreakingChangeData>,
    created_at: DateTime<Utc>,
}

struct MigrationScriptData {
    script_id: String,
    name: String,
    from_version: String,
    to_version: String,
    content: String,
    language: String,
    is_auto_generated: bool,
    requires_manual_review: bool,
    created_at: DateTime<Utc>,
}

struct MigrationToolkitState {
    diffs: Vec<SchemaDiffData>,
    scripts: Vec<MigrationScriptData>,
}

impl MigrationToolkitState {
    fn new() -> Self {
        let now = Utc::now();
        let changes_v45_v46 = vec![
            BreakingChangeData {
                change_type: ChangeTypeGql::Add,
                field_path: "Query.federatedCacheV2".into(),
                type_name: "Query".into(),
                field_name: "federatedCacheV2".into(),
                description: "新增联邦查询缓存 V2 接口".into(),
                is_breaking: false,
                old_value: None,
                new_value: Some("FederatedCacheV2".into()),
                severity: "low".into(),
                migration_hint: "无需迁移，新功能".into(),
            },
            BreakingChangeData {
                change_type: ChangeTypeGql::Deprecate,
                field_path: "Query.oldDashboard".into(),
                type_name: "Query".into(),
                field_name: "oldDashboard".into(),
                description: "废弃 oldDashboard 字段".into(),
                is_breaking: false,
                old_value: Some("Dashboard!".into()),
                new_value: Some("Dashboard!".into()),
                severity: "medium".into(),
                migration_hint: "请迁移至 dashboard 字段".into(),
            },
            BreakingChangeData {
                change_type: ChangeTypeGql::Remove,
                field_path: "User.legacyRole".into(),
                type_name: "User".into(),
                field_name: "legacyRole".into(),
                description: "移除 legacyRole 字段".into(),
                is_breaking: true,
                old_value: Some("String".into()),
                new_value: None,
                severity: "high".into(),
                migration_hint: "请使用 roles 字段替代".into(),
            },
        ];

        let diff = SchemaDiffData {
            diff_id: "diff_v45_v46".into(),
            old_version: "v45.0.0".into(),
            new_version: "v46.0.0".into(),
            changes: changes_v45_v46,
            created_at: now,
        };

        let script = MigrationScriptData {
            script_id: "script_v45_v46".into(),
            name: "v45 到 v46 迁移脚本".into(),
            from_version: "v45.0.0".into(),
            to_version: "v46.0.0".into(),
            content: r#"// 迁移步骤:
// 1. 将 User.legacyRole 迁移为 User.roles
// 2. 将 Query.oldDashboard 调用替换为 Query.dashboard
// 3. 更新缓存键格式以支持 V2 多级缓存
const migration = {
  version: "v46.0.0",
  steps: [
    { type: "rename_field", from: "oldDashboard", to: "dashboard" },
    { type: "replace_field", from: "legacyRole", to: "roles" },
    { type: "update_cache_keys", pattern: "v1:", replacement: "v2:" }
  ]
};"#
            .into(),
            language: "javascript".into(),
            is_auto_generated: true,
            requires_manual_review: true,
            created_at: now,
        };

        Self {
            diffs: vec![diff],
            scripts: vec![script],
        }
    }
}

static MIGRATION_TOOLKIT_STATE: std::sync::OnceLock<Mutex<MigrationToolkitState>> =
    std::sync::OnceLock::new();

fn migration_toolkit_state() -> &'static Mutex<MigrationToolkitState> {
    MIGRATION_TOOLKIT_STATE.get_or_init(|| Mutex::new(MigrationToolkitState::new()))
}

/// V46.0: 版本迁移工具
pub struct MigrationToolkit;

impl MigrationToolkit {
    pub fn compare_schemas(old_version: &str, new_version: &str) -> SchemaDiffGql {
        let state = migration_toolkit_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(diff) = state
            .diffs
            .iter()
            .find(|d| d.old_version == old_version && d.new_version == new_version)
        {
            return Self::diff_to_gql(diff);
        }

        let diff_id = format!("diff_{}_{}", uuid_simple(), uuid_simple());
        SchemaDiffGql {
            diff_id,
            old_version: old_version.to_string(),
            new_version: new_version.to_string(),
            total_changes: 0,
            breaking_changes_count: 0,
            safe_changes_count: 0,
            changes: vec![],
            created_at: Utc::now().to_rfc3339(),
        }
    }

    pub fn list_diffs() -> Vec<SchemaDiffGql> {
        let state = migration_toolkit_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.diffs.iter().map(Self::diff_to_gql).collect()
    }

    pub fn detect_breaking_changes(old_sdl: &str, new_sdl: &str) -> Vec<BreakingChangeGql> {
        let mut changes = Vec::new();
        let old_lines: HashSet<&str> = old_sdl.lines().collect();
        let new_lines: HashSet<&str> = new_sdl.lines().collect();

        for line in old_lines.difference(&new_lines) {
            let trimmed = line.trim();
            if trimmed.starts_with("type") || trimmed.starts_with("  ") && trimmed.contains(':') {
                changes.push(BreakingChangeGql {
                    change_type: ChangeTypeGql::Remove,
                    field_path: trimmed.to_string(),
                    type_name: "unknown".into(),
                    field_name: trimmed.to_string(),
                    description: format!("检测到可能移除的定义: {}", trimmed),
                    is_breaking: true,
                    old_value: Some(trimmed.to_string()),
                    new_value: None,
                    severity: "high".into(),
                    migration_hint: "请确认此变更是否有意为之".into(),
                });
            }
        }

        changes
    }

    pub fn generate_migration_script(from_version: &str, to_version: &str) -> MigrationScriptGql {
        let state = migration_toolkit_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(s) = state
            .scripts
            .iter()
            .find(|s| s.from_version == from_version && s.to_version == to_version)
        {
            return Self::script_to_gql(s);
        }

        let script_id = format!("script_{}", uuid_simple());
        let now = Utc::now();
        MigrationScriptGql {
            script_id,
            name: format!("{} 到 {} 迁移脚本", from_version, to_version),
            from_version: from_version.to_string(),
            to_version: to_version.to_string(),
            content: "// 自动生成的迁移脚本占位\n// 请根据实际 Schema 变化手动完善".into(),
            language: "javascript".into(),
            is_auto_generated: true,
            requires_manual_review: true,
            created_at: now.to_rfc3339(),
        }
    }

    pub fn list_scripts() -> Vec<MigrationScriptGql> {
        let state = migration_toolkit_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.scripts.iter().map(Self::script_to_gql).collect()
    }

    pub fn check_compatibility(old_version: &str, new_version: &str) -> CompatibilityCheckGql {
        let state = migration_toolkit_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let diff = state
            .diffs
            .iter()
            .find(|d| d.old_version == old_version && d.new_version == new_version);

        let breaking_changes: Vec<BreakingChangeGql> = if let Some(d) = diff {
            d.changes
                .iter()
                .filter(|c| c.is_breaking)
                .map(Self::change_to_gql)
                .collect()
        } else {
            vec![]
        };

        let total_changes = diff.map(|d| d.changes.len()).unwrap_or(0);
        let breaking_count = breaking_changes.len();
        let score = if total_changes > 0 {
            1.0 - (breaking_count as f64 / total_changes as f64)
        } else {
            1.0
        };

        let is_compatible = breaking_count == 0;
        let summary = if is_compatible {
            "完全兼容，无破坏性变更".into()
        } else {
            format!("存在 {} 个破坏性变更，请评估影响后升级", breaking_count)
        };

        let mut warnings = Vec::new();
        if breaking_count > 0 {
            warnings.push("存在破坏性变更，需要客户端同步升级".into());
        }
        if !is_compatible {
            warnings.push("建议先进行灰度发布".into());
        }

        CompatibilityCheckGql {
            check_id: format!("compat_{}", uuid_simple()),
            old_version: old_version.to_string(),
            new_version: new_version.to_string(),
            is_compatible,
            breaking_changes,
            warnings,
            score,
            summary,
        }
    }

    fn diff_to_gql(d: &SchemaDiffData) -> SchemaDiffGql {
        let breaking = d.changes.iter().filter(|c| c.is_breaking).count();
        SchemaDiffGql {
            diff_id: d.diff_id.clone(),
            old_version: d.old_version.clone(),
            new_version: d.new_version.clone(),
            total_changes: d.changes.len() as i32,
            breaking_changes_count: breaking as i32,
            safe_changes_count: (d.changes.len() - breaking) as i32,
            changes: d.changes.iter().map(Self::change_to_gql).collect(),
            created_at: d.created_at.to_rfc3339(),
        }
    }

    fn change_to_gql(c: &BreakingChangeData) -> BreakingChangeGql {
        BreakingChangeGql {
            change_type: c.change_type,
            field_path: c.field_path.clone(),
            type_name: c.type_name.clone(),
            field_name: c.field_name.clone(),
            description: c.description.clone(),
            is_breaking: c.is_breaking,
            old_value: c.old_value.clone(),
            new_value: c.new_value.clone(),
            severity: c.severity.clone(),
            migration_hint: c.migration_hint.clone(),
        }
    }

    fn script_to_gql(s: &MigrationScriptData) -> MigrationScriptGql {
        MigrationScriptGql {
            script_id: s.script_id.clone(),
            name: s.name.clone(),
            from_version: s.from_version.clone(),
            to_version: s.to_version.clone(),
            content: s.content.clone(),
            language: s.language.clone(),
            is_auto_generated: s.is_auto_generated,
            requires_manual_review: s.requires_manual_review,
            created_at: s.created_at.to_rfc3339(),
        }
    }
}

// ---------- Part 2.3: 平滑升级管理（DeploymentManager） ----------

/// V46.0: 部署状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeploymentStatusGql {
    Draft,
    Pending,
    Running,
    Canary,
    Completed,
    RolledBack,
    Failed,
    Cancelled,
}

/// V46.0: 灰度配置
#[derive(SimpleObject, Clone)]
pub struct CanaryConfigGql {
    pub enabled: bool,
    pub traffic_percent: i32,
    pub duration_minutes: i64,
    pub max_error_rate: f64,
    pub max_latency_ms: i64,
    pub auto_rollback: bool,
    pub steps: Vec<i32>,
}

/// V46.0: 部署配置
#[derive(SimpleObject)]
pub struct DeploymentConfigGql {
    pub version: String,
    pub previous_version: String,
    pub canary: CanaryConfigGql,
    pub traffic_split_enabled: bool,
    pub rollback_enabled: bool,
    pub version_coexistence: bool,
    pub max_coexistence_duration_hours: i64,
}

/// V46.0: 部署记录
#[derive(SimpleObject)]
pub struct DeploymentRecordGql {
    pub deployment_id: String,
    pub version: String,
    pub previous_version: String,
    pub status: DeploymentStatusGql,
    pub canary_percent: i32,
    pub traffic_percent: i32,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub error_count: i64,
    pub total_requests: i64,
    pub error_rate: f64,
    pub avg_latency_ms: f64,
    pub rollback_reason: Option<String>,
}

/// V46.0: 灰度配置输入
#[derive(async_graphql::InputObject)]
pub struct CanaryConfigInput {
    pub enabled: Option<bool>,
    pub traffic_percent: Option<i32>,
    pub duration_minutes: Option<i64>,
    pub max_error_rate: Option<f64>,
    pub max_latency_ms: Option<i64>,
    pub auto_rollback: Option<bool>,
}

/// V46.0: 部署配置输入
#[derive(async_graphql::InputObject)]
pub struct DeploymentConfigInput {
    pub version: String,
    pub previous_version: Option<String>,
    pub canary: Option<CanaryConfigInput>,
    pub traffic_split_enabled: Option<bool>,
    pub rollback_enabled: Option<bool>,
    pub version_coexistence: Option<bool>,
    pub max_coexistence_duration_hours: Option<i64>,
}

// --- 内部状态 ---

#[derive(Clone)]
struct CanaryConfigData {
    enabled: bool,
    traffic_percent: u32,
    duration_minutes: u64,
    max_error_rate: f64,
    max_latency_ms: u64,
    auto_rollback: bool,
    steps: Vec<u32>,
}

impl Default for CanaryConfigData {
    fn default() -> Self {
        Self {
            enabled: true,
            traffic_percent: 10,
            duration_minutes: 120,
            max_error_rate: 0.01,
            max_latency_ms: 500,
            auto_rollback: true,
            steps: vec![1, 5, 10, 25, 50, 100],
        }
    }
}

struct DeploymentConfigData {
    version: String,
    previous_version: String,
    canary: CanaryConfigData,
    traffic_split_enabled: bool,
    rollback_enabled: bool,
    version_coexistence: bool,
    max_coexistence_duration_hours: u64,
}

impl Default for DeploymentConfigData {
    fn default() -> Self {
        Self {
            version: "v46.0.0".into(),
            previous_version: "v45.0.0".into(),
            canary: CanaryConfigData::default(),
            traffic_split_enabled: true,
            rollback_enabled: true,
            version_coexistence: true,
            max_coexistence_duration_hours: 72,
        }
    }
}

struct DeploymentRecordData {
    deployment_id: String,
    version: String,
    previous_version: String,
    status: DeploymentStatusGql,
    canary_percent: u32,
    traffic_percent: u32,
    created_at: DateTime<Utc>,
    started_at: Option<DateTime<Utc>>,
    completed_at: Option<DateTime<Utc>>,
    error_count: u64,
    total_requests: u64,
    avg_latency_ms: f64,
    rollback_reason: Option<String>,
}

struct DeploymentManagerState {
    config: DeploymentConfigData,
    deployments: Vec<DeploymentRecordData>,
}

impl DeploymentManagerState {
    fn new() -> Self {
        let now = Utc::now();
        let deployments = vec![
            DeploymentRecordData {
                deployment_id: "deploy_v45".into(),
                version: "v45.0.0".into(),
                previous_version: "v44.0.0".into(),
                status: DeploymentStatusGql::Completed,
                canary_percent: 100,
                traffic_percent: 100,
                created_at: now - chrono::Duration::days(14),
                started_at: Some(now - chrono::Duration::days(14) - chrono::Duration::minutes(5)),
                completed_at: Some(now - chrono::Duration::days(14) + chrono::Duration::hours(2)),
                error_count: 23,
                total_requests: 45210,
                avg_latency_ms: 45.2,
                rollback_reason: None,
            },
            DeploymentRecordData {
                deployment_id: "deploy_v44".into(),
                version: "v44.0.0".into(),
                previous_version: "v43.0.0".into(),
                status: DeploymentStatusGql::Completed,
                canary_percent: 100,
                traffic_percent: 100,
                created_at: now - chrono::Duration::days(30),
                started_at: Some(now - chrono::Duration::days(30)),
                completed_at: Some(now - chrono::Duration::days(30) + chrono::Duration::hours(1)),
                error_count: 5,
                total_requests: 32100,
                avg_latency_ms: 38.7,
                rollback_reason: None,
            },
        ];

        Self {
            config: DeploymentConfigData::default(),
            deployments,
        }
    }
}

static DEPLOYMENT_MANAGER_STATE: std::sync::OnceLock<Mutex<DeploymentManagerState>> =
    std::sync::OnceLock::new();

fn deployment_manager_state() -> &'static Mutex<DeploymentManagerState> {
    DEPLOYMENT_MANAGER_STATE.get_or_init(|| Mutex::new(DeploymentManagerState::new()))
}

/// V46.0: 平滑升级管理器
pub struct DeploymentManager;

impl DeploymentManager {
    pub fn get_config() -> DeploymentConfigGql {
        let state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let c = &state.config;
        DeploymentConfigGql {
            version: c.version.clone(),
            previous_version: c.previous_version.clone(),
            canary: CanaryConfigGql {
                enabled: c.canary.enabled,
                traffic_percent: c.canary.traffic_percent as i32,
                duration_minutes: c.canary.duration_minutes as i64,
                max_error_rate: c.canary.max_error_rate,
                max_latency_ms: c.canary.max_latency_ms as i64,
                auto_rollback: c.canary.auto_rollback,
                steps: c.canary.steps.iter().map(|s| *s as i32).collect(),
            },
            traffic_split_enabled: c.traffic_split_enabled,
            rollback_enabled: c.rollback_enabled,
            version_coexistence: c.version_coexistence,
            max_coexistence_duration_hours: c.max_coexistence_duration_hours as i64,
        }
    }

    pub fn update_config(input: DeploymentConfigInput) -> bool {
        let mut state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config.version = input.version;
        if let Some(v) = input.previous_version {
            state.config.previous_version = v;
        }
        if let Some(canary_input) = input.canary {
            if let Some(v) = canary_input.enabled {
                state.config.canary.enabled = v;
            }
            if let Some(v) = canary_input.traffic_percent {
                state.config.canary.traffic_percent = v.max(0).min(100) as u32;
            }
            if let Some(v) = canary_input.duration_minutes {
                state.config.canary.duration_minutes = v.max(0) as u64;
            }
            if let Some(v) = canary_input.max_error_rate {
                state.config.canary.max_error_rate = v.max(0.0);
            }
            if let Some(v) = canary_input.max_latency_ms {
                state.config.canary.max_latency_ms = v.max(0) as u64;
            }
            if let Some(v) = canary_input.auto_rollback {
                state.config.canary.auto_rollback = v;
            }
        }
        if let Some(v) = input.traffic_split_enabled {
            state.config.traffic_split_enabled = v;
        }
        if let Some(v) = input.rollback_enabled {
            state.config.rollback_enabled = v;
        }
        if let Some(v) = input.version_coexistence {
            state.config.version_coexistence = v;
        }
        if let Some(v) = input.max_coexistence_duration_hours {
            state.config.max_coexistence_duration_hours = v.max(0) as u64;
        }
        true
    }

    pub fn start_deployment(version: &str) -> DeploymentRecordGql {
        let mut state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        let previous = state.config.version.clone();
        let deployment_id = format!("deploy_{}", uuid_simple());
        let record = DeploymentRecordData {
            deployment_id: deployment_id.clone(),
            version: version.to_string(),
            previous_version: previous.clone(),
            status: DeploymentStatusGql::Pending,
            canary_percent: 0,
            traffic_percent: 0,
            created_at: now,
            started_at: None,
            completed_at: None,
            error_count: 0,
            total_requests: 0,
            avg_latency_ms: 0.0,
            rollback_reason: None,
        };
        let gql = Self::record_to_gql(&record);
        state.deployments.push(record);
        gql
    }

    pub fn promote_canary(deployment_id: &str) -> DeploymentStatusGql {
        let mut state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let steps = state.config.canary.steps.clone();
        if let Some(d) = state
            .deployments
            .iter_mut()
            .find(|d| d.deployment_id == deployment_id)
        {
            let current_idx = steps
                .iter()
                .position(|s| *s == d.canary_percent)
                .unwrap_or(0);
            let next_idx = (current_idx + 1).min(steps.len().saturating_sub(1));
            d.canary_percent = steps[next_idx];
            d.traffic_percent = d.canary_percent;

            if d.canary_percent >= 100 {
                d.status = DeploymentStatusGql::Completed;
                d.completed_at = Some(Utc::now());
            } else {
                d.status = DeploymentStatusGql::Canary;
            }

            if d.started_at.is_none() {
                d.started_at = Some(Utc::now());
            }
            return d.status;
        }
        DeploymentStatusGql::Failed
    }

    pub fn rollback(deployment_id: &str, reason: Option<String>) -> bool {
        let mut state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let rollback_enabled = state.config.rollback_enabled;
        if let Some(d) = state
            .deployments
            .iter_mut()
            .find(|d| d.deployment_id == deployment_id)
        {
            if !rollback_enabled {
                return false;
            }
            d.status = DeploymentStatusGql::RolledBack;
            d.traffic_percent = 0;
            d.canary_percent = 0;
            d.completed_at = Some(Utc::now());
            d.rollback_reason = reason;
            return true;
        }
        false
    }

    pub fn get_deployment(deployment_id: &str) -> Option<DeploymentRecordGql> {
        let state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .deployments
            .iter()
            .find(|d| d.deployment_id == deployment_id)
            .map(Self::record_to_gql)
    }

    pub fn list_deployments() -> Vec<DeploymentRecordGql> {
        let state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.deployments.iter().map(Self::record_to_gql).collect()
    }

    pub fn record_traffic_sample(deployment_id: &str, errors: u64, total: u64, avg_latency: f64) {
        let mut state = deployment_manager_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let auto_rollback = state.config.canary.auto_rollback;
        let max_error_rate = state.config.canary.max_error_rate;
        let max_latency_ms = state.config.canary.max_latency_ms;
        if let Some(d) = state
            .deployments
            .iter_mut()
            .find(|d| d.deployment_id == deployment_id)
        {
            d.error_count += errors;
            d.total_requests += total;
            if d.total_requests > 0 {
                d.avg_latency_ms = avg_latency;
            }

            let error_rate = if d.total_requests > 0 {
                d.error_count as f64 / d.total_requests as f64
            } else {
                0.0
            };

            if auto_rollback
                && d.status == DeploymentStatusGql::Canary
                && (error_rate > max_error_rate || d.avg_latency_ms > max_latency_ms as f64)
            {
                d.status = DeploymentStatusGql::RolledBack;
                d.traffic_percent = 0;
                d.canary_percent = 0;
                d.completed_at = Some(Utc::now());
                d.rollback_reason = Some("自动回滚: 超过错误率或延迟阈值".into());
            }
        }
    }

    fn record_to_gql(d: &DeploymentRecordData) -> DeploymentRecordGql {
        let error_rate = if d.total_requests > 0 {
            d.error_count as f64 / d.total_requests as f64
        } else {
            0.0
        };
        let duration_ms = match (d.started_at, d.completed_at) {
            (Some(s), Some(c)) => Some(c.signed_duration_since(s).num_milliseconds()),
            _ => None,
        };

        DeploymentRecordGql {
            deployment_id: d.deployment_id.clone(),
            version: d.version.clone(),
            previous_version: d.previous_version.clone(),
            status: d.status,
            canary_percent: d.canary_percent as i32,
            traffic_percent: d.traffic_percent as i32,
            created_at: d.created_at.to_rfc3339(),
            started_at: d.started_at.map(|t| t.to_rfc3339()),
            completed_at: d.completed_at.map(|t| t.to_rfc3339()),
            duration_ms,
            error_count: d.error_count as i64,
            total_requests: d.total_requests as i64,
            error_rate,
            avg_latency_ms: d.avg_latency_ms,
            rollback_reason: d.rollback_reason.clone(),
        }
    }
}

fn uuid_simple() -> String {
    let now = Utc::now().timestamp_millis() as u64;
    let rand = {
        use std::collections::hash_map::RandomState;
        use std::hash::{BuildHasher, Hasher};
        let s = RandomState::new();
        let mut h = s.build_hasher();
        h.write_u64(now);
        h.finish()
    };
    format!("{:x}{:x}", now, rand)
}

// ==================== V47.0: GraphQL 联邦网关 V4 — 分布式执行引擎 + 自适应查询优化 + 多集群联邦 ====================

// --- 1. 分布式执行引擎 ---

/// V47.0: 分布式执行节点 GQL
#[derive(SimpleObject)]
pub struct DistV4ExecutionNodeGql {
    pub node_id: String,
    pub region: String,
    pub endpoint: String,
    pub health: String,
    pub capacity: i32,
    pub current_load: i32,
    pub latency_ms: i32,
}

/// V47.0: 分布式任务 GQL
#[derive(SimpleObject)]
pub struct DistV4TaskGql {
    pub task_id: String,
    pub query_fragment: String,
    pub target_service: String,
    pub target_node: String,
    pub estimated_cost: f64,
    pub priority: i32,
}

/// V47.0: 分布式执行计划 GQL
#[derive(SimpleObject)]
pub struct DistV4ExecutionPlanGql {
    pub plan_id: String,
    pub tasks: Vec<DistV4TaskGql>,
    pub dependencies: Vec<String>,
    pub execution_strategy: String,
    pub estimated_total_time_ms: i32,
    pub parallel_groups: Vec<String>,
}

/// V47.0: 分布式执行统计 GQL
#[derive(SimpleObject)]
pub struct DistV4ExecutionStatsGql {
    pub total_plans: i64,
    pub successful: i64,
    pub failed: i64,
    pub avg_execution_time_ms: f64,
    pub parallel_efficiency: f64,
}

/// V47.0: 分布式执行步骤轨迹 GQL
#[derive(SimpleObject)]
pub struct DistV4StepTraceGql {
    pub task_id: String,
    pub target_node: String,
    pub target_service: String,
    pub start_time: String,
    pub end_time: String,
    pub duration_ms: i32,
    pub status: String,
    pub error_message: Option<String>,
}

/// V47.0: 分布式执行轨迹 GQL
#[derive(SimpleObject)]
pub struct DistV4ExecutionTraceGql {
    pub plan_id: String,
    pub strategy: String,
    pub total_time_ms: i32,
    pub step_traces: Vec<DistV4StepTraceGql>,
    pub parallel_groups_executed: i32,
    pub nodes_used: Vec<String>,
    pub failed_nodes: Vec<String>,
    pub retries: i32,
    pub created_at: String,
}

/// V47.0: 执行策略 V4（避免与 V44 ExecutionStrategy 冲突）
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ExecutionStrategyV4 {
    Local,
    RemoteFederated,
    DistributedParallel,
    Cascading,
    Adaptive,
}

impl ExecutionStrategyV4 {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Local => "Local",
            Self::RemoteFederated => "RemoteFederated",
            Self::DistributedParallel => "DistributedParallel",
            Self::Cascading => "Cascading",
            Self::Adaptive => "Adaptive",
        }
    }

    fn from_query_complexity(node_count: usize, depth: usize, cross_cluster: bool) -> Self {
        if cross_cluster {
            Self::DistributedParallel
        } else if node_count <= 1 {
            Self::Local
        } else if depth <= 2 {
            Self::DistributedParallel
        } else if node_count <= 4 {
            Self::RemoteFederated
        } else {
            Self::Adaptive
        }
    }
}

/// V47.0: 节点健康状态
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum NodeHealthV4 {
    Healthy,
    Degraded,
    Unreachable,
}

impl NodeHealthV4 {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Healthy => "Healthy",
            Self::Degraded => "Degraded",
            Self::Unreachable => "Unreachable",
        }
    }
}

/// V47.0: 步骤执行状态
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum DistV4StepStatus {
    Pending,
    Running,
    Succeeded,
    Failed,
    Retried,
    Degraded,
}

impl DistV4StepStatus {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "Pending",
            Self::Running => "Running",
            Self::Succeeded => "Succeeded",
            Self::Failed => "Failed",
            Self::Retried => "Retried",
            Self::Degraded => "Degraded",
        }
    }
}

#[derive(Clone, Debug)]
struct DistV4NodeData {
    node_id: String,
    region: String,
    endpoint: String,
    health: NodeHealthV4,
    capacity: u32,
    current_load: u32,
    latency_ms: u64,
}

#[derive(Clone, Debug)]
struct DistV4TaskData {
    task_id: String,
    query_fragment: String,
    target_service: String,
    target_node: String,
    estimated_cost: f64,
    priority: u32,
}

#[derive(Clone, Debug)]
struct DistV4PlanData {
    plan_id: String,
    tasks: Vec<DistV4TaskData>,
    dependencies: Vec<String>,
    execution_strategy: ExecutionStrategyV4,
    estimated_total_time_ms: u64,
    parallel_groups: Vec<Vec<String>>,
    created_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
struct DistV4StepTraceData {
    task_id: String,
    target_node: String,
    target_service: String,
    start_time: DateTime<Utc>,
    end_time: DateTime<Utc>,
    duration_ms: u64,
    status: DistV4StepStatus,
    error_message: Option<String>,
}

#[derive(Clone, Debug)]
struct DistV4ExecutionTraceData {
    plan_id: String,
    strategy: ExecutionStrategyV4,
    total_time_ms: u64,
    step_traces: Vec<DistV4StepTraceData>,
    parallel_groups_executed: u32,
    nodes_used: Vec<String>,
    failed_nodes: Vec<String>,
    retries: u32,
    created_at: DateTime<Utc>,
}

#[derive(Default)]
struct DistV4ExecutionStatsInternal {
    total_plans: u64,
    successful: u64,
    failed: u64,
    total_execution_time_ms: u64,
    total_parallel_groups: u64,
    total_sequential_groups: u64,
}

struct DistributedExecutionEngineState {
    nodes: Vec<DistV4NodeData>,
    plans: Vec<DistV4PlanData>,
    traces: Vec<DistV4ExecutionTraceData>,
    stats: DistV4ExecutionStatsInternal,
}

impl DistributedExecutionEngineState {
    fn new() -> Self {
        let nodes = vec![
            DistV4NodeData {
                node_id: "node-cn-east-1".into(),
                region: "cn-east-1".into(),
                endpoint: "https://gql-node-cn-east-1.topems.local".into(),
                health: NodeHealthV4::Healthy,
                capacity: 1000,
                current_load: 320,
                latency_ms: 12,
            },
            DistV4NodeData {
                node_id: "node-cn-north-1".into(),
                region: "cn-north-1".into(),
                endpoint: "https://gql-node-cn-north-1.topems.local".into(),
                health: NodeHealthV4::Healthy,
                capacity: 1000,
                current_load: 410,
                latency_ms: 18,
            },
            DistV4NodeData {
                node_id: "node-cn-south-1".into(),
                region: "cn-south-1".into(),
                endpoint: "https://gql-node-cn-south-1.topems.local".into(),
                health: NodeHealthV4::Degraded,
                capacity: 800,
                current_load: 690,
                latency_ms: 45,
            },
            DistV4NodeData {
                node_id: "node-ap-southeast-1".into(),
                region: "ap-southeast-1".into(),
                endpoint: "https://gql-node-ap-southeast-1.topems.local".into(),
                health: NodeHealthV4::Healthy,
                capacity: 600,
                current_load: 150,
                latency_ms: 85,
            },
        ];
        Self {
            nodes,
            plans: Vec::new(),
            traces: Vec::new(),
            stats: DistV4ExecutionStatsInternal::default(),
        }
    }
}

static DISTRIBUTED_EXECUTION_ENGINE_STATE: std::sync::OnceLock<
    Mutex<DistributedExecutionEngineState>,
> = std::sync::OnceLock::new();

fn distributed_execution_engine_state() -> &'static Mutex<DistributedExecutionEngineState> {
    DISTRIBUTED_EXECUTION_ENGINE_STATE
        .get_or_init(|| Mutex::new(DistributedExecutionEngineState::new()))
}

/// V47.0: 分布式执行引擎
pub struct DistributedExecutionEngine;

impl DistributedExecutionEngine {
    /// 将查询分解为分布式任务
    pub fn plan_distributed_execution(
        query: &str,
        variables: &serde_json::Value,
    ) -> DistV4ExecutionPlanGql {
        let mut state = distributed_execution_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let lower = query.to_lowercase();
        let mut tasks: Vec<DistV4TaskData> = Vec::new();
        let mut task_counter = 0u32;

        let entity_patterns: &[(&str, &str)] = &[
            ("customer", "erp"),
            ("supplier", "erp"),
            ("material", "erp"),
            ("contact", "crm"),
            ("lead", "crm"),
            ("employee", "hrm"),
            ("department", "hrm"),
            ("voucher", "finance"),
            ("accountsubject", "finance"),
            ("workorder", "mes"),
            ("product", "mes"),
        ];

        for (keyword, service) in entity_patterns {
            if lower.contains(keyword) {
                let task_id = format!("task_{}", task_counter);
                task_counter += 1;
                let target_node = Self::select_node_internal(&state, service);
                tasks.push(DistV4TaskData {
                    task_id,
                    query_fragment: format!("{}@{}", keyword, service),
                    target_service: (*service).to_string(),
                    target_node,
                    estimated_cost: 10.0,
                    priority: 5,
                });
            }
        }

        if tasks.is_empty() {
            let target_node = Self::select_node_internal(&state, "erp");
            tasks.push(DistV4TaskData {
                task_id: "task_0".into(),
                query_fragment: query.chars().take(120).collect(),
                target_service: "erp".into(),
                target_node,
                estimated_cost: 5.0,
                priority: 5,
            });
        }

        // 简单依赖关系：每个任务依赖其前序任务（跨服务关联）
        let mut dependencies: Vec<String> = Vec::new();
        if tasks.len() > 2 {
            for i in 1..tasks.len() {
                dependencies.push(format!("{}->{}", tasks[i - 1].task_id, tasks[i].task_id));
            }
        }

        // 并行分组：无依赖的根任务同组，其余进入第二组
        let mut parallel_groups: Vec<Vec<String>> = Vec::new();
        if let Some(first) = tasks.first() {
            parallel_groups.push(vec![first.task_id.clone()]);
        }
        if tasks.len() > 1 {
            let rest: Vec<String> = tasks.iter().skip(1).map(|t| t.task_id.clone()).collect();
            parallel_groups.push(rest);
        }

        let depth = if dependencies.is_empty() { 1 } else { 2 };
        let cross_cluster = variables.get("cluster").and_then(|v| v.as_str()).is_some();
        let strategy =
            ExecutionStrategyV4::from_query_complexity(tasks.len(), depth, cross_cluster);

        let estimated_total_time_ms = Self::estimate_total_time(&tasks, &state);

        let plan = DistV4PlanData {
            plan_id: format!("plan_{}", uuid_simple()),
            tasks,
            dependencies,
            execution_strategy: strategy,
            estimated_total_time_ms,
            parallel_groups,
            created_at: Utc::now(),
        };
        let gql = Self::plan_to_gql(&plan);
        state.plans.push(plan);
        state.stats.total_plans += 1;
        gql
    }

    /// 执行分布式计划
    pub fn execute_distributed(plan_id: &str) -> DistV4ExecutionTraceGql {
        let mut state = distributed_execution_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let plan_data = match state.plans.iter().find(|p| p.plan_id == plan_id).cloned() {
            Some(p) => p,
            None => {
                return DistV4ExecutionTraceGql {
                    plan_id: plan_id.to_string(),
                    strategy: ExecutionStrategyV4::Local.as_str().to_string(),
                    total_time_ms: 0,
                    step_traces: Vec::new(),
                    parallel_groups_executed: 0,
                    nodes_used: Vec::new(),
                    failed_nodes: Vec::new(),
                    retries: 0,
                    created_at: Utc::now().to_rfc3339(),
                };
            }
        };

        let now = Utc::now();
        let mut step_traces: Vec<DistV4StepTraceData> = Vec::new();
        let mut nodes_used: HashSet<String> = HashSet::new();
        let mut failed_nodes: Vec<String> = Vec::new();
        let mut retries = 0u32;

        for (idx, task) in plan_data.tasks.iter().enumerate() {
            let node = state
                .nodes
                .iter()
                .find(|n| n.node_id == task.target_node)
                .cloned();
            let start = now + chrono::Duration::milliseconds(idx as i64 * 5);
            let (duration_ms, status, error_message) = match &node {
                Some(n) if n.health != NodeHealthV4::Unreachable => {
                    let base = n.latency_ms.max(10);
                    let load_factor = 1.0 + (n.current_load as f64 / n.capacity.max(1) as f64);
                    let dur = ((base as f64) * load_factor).round() as u64;
                    nodes_used.insert(n.node_id.clone());
                    if n.health == NodeHealthV4::Degraded && dur > 200 {
                        retries += 1;
                        (dur + 30, DistV4StepStatus::Retried, None)
                    } else {
                        (dur, DistV4StepStatus::Succeeded, None)
                    }
                }
                _ => {
                    failed_nodes.push(task.target_node.clone());
                    (0u64, DistV4StepStatus::Failed, Some("节点不可达".into()))
                }
            };
            let end = start + chrono::Duration::milliseconds(duration_ms as i64);
            step_traces.push(DistV4StepTraceData {
                task_id: task.task_id.clone(),
                target_node: task.target_node.clone(),
                target_service: task.target_service.clone(),
                start_time: start,
                end_time: end,
                duration_ms,
                status,
                error_message,
            });
        }

        let total_time_ms = step_traces
            .iter()
            .map(|s| s.duration_ms)
            .sum::<u64>()
            .max(plan_data.estimated_total_time_ms / 2);

        let parallel_groups_executed = plan_data.parallel_groups.len() as u32;

        let trace = DistV4ExecutionTraceData {
            plan_id: plan_id.to_string(),
            strategy: plan_data.execution_strategy,
            total_time_ms,
            step_traces: step_traces.clone(),
            parallel_groups_executed,
            nodes_used: nodes_used.iter().cloned().collect(),
            failed_nodes: failed_nodes.clone(),
            retries,
            created_at: now,
        };

        let trace_gql = Self::trace_to_gql(&trace);
        state.traces.push(trace);

        if failed_nodes.is_empty() {
            state.stats.successful += 1;
        } else {
            state.stats.failed += 1;
        }
        state.stats.total_execution_time_ms += total_time_ms;
        state.stats.total_parallel_groups += parallel_groups_executed as u64;
        state.stats.total_sequential_groups += step_traces.len() as u64;

        trace_gql
    }

    /// 选择最优执行节点（基于负载/延迟/容量）
    pub fn select_node(target_service: &str) -> String {
        let state = distributed_execution_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Self::select_node_internal(&state, target_service)
    }

    fn select_node_internal(
        state: &DistributedExecutionEngineState,
        _target_service: &str,
    ) -> String {
        let mut best: Option<(&DistV4NodeData, f64)> = None;
        for n in &state.nodes {
            if n.health == NodeHealthV4::Unreachable {
                continue;
            }
            let load_ratio = n.current_load as f64 / n.capacity.max(1) as f64;
            // 评分：低延迟、低负载、高容量、健康优先
            let score = (1.0 / (n.latency_ms.max(1) as f64))
                * (1.0 - load_ratio)
                * (n.capacity as f64 / 1000.0)
                * match n.health {
                    NodeHealthV4::Healthy => 1.0,
                    NodeHealthV4::Degraded => 0.5,
                    NodeHealthV4::Unreachable => 0.0,
                };
            match best {
                Some((_, s)) if s >= score => {}
                _ => best = Some((n, score)),
            }
        }
        best.map(|(n, _)| n.node_id.clone())
            .unwrap_or_else(|| "node-cn-east-1".into())
    }

    /// 节点故障处理（重试/降级/迁移）
    pub fn handle_node_failure(node_id: &str) -> String {
        let mut state = distributed_execution_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(node) = state.nodes.iter_mut().find(|n| n.node_id == node_id) {
            node.health = NodeHealthV4::Unreachable;
            node.current_load = 0;
        }
        // 选择替代节点
        Self::select_node_internal(&state, "")
    }

    /// 获取执行追踪
    pub fn get_execution_trace(plan_id: &str) -> Option<DistV4ExecutionTraceGql> {
        let state = distributed_execution_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .traces
            .iter()
            .find(|t| t.plan_id == plan_id)
            .map(Self::trace_to_gql)
    }

    /// 获取分布式执行统计
    pub fn get_stats() -> DistV4ExecutionStatsGql {
        let state = distributed_execution_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let s = &state.stats;
        let avg_execution_time_ms = if s.total_plans > 0 {
            s.total_execution_time_ms as f64 / s.total_plans as f64
        } else {
            0.0
        };
        let parallel_efficiency = if s.total_sequential_groups > 0 {
            s.total_parallel_groups as f64 / s.total_sequential_groups as f64
        } else {
            0.0
        };
        DistV4ExecutionStatsGql {
            total_plans: s.total_plans as i64,
            successful: s.successful as i64,
            failed: s.failed as i64,
            avg_execution_time_ms,
            parallel_efficiency,
        }
    }

    /// 列出所有分布式执行节点
    pub fn list_nodes() -> Vec<DistV4ExecutionNodeGql> {
        let state = distributed_execution_engine_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.nodes.iter().map(Self::node_to_gql).collect()
    }

    fn estimate_total_time(
        tasks: &[DistV4TaskData],
        state: &DistributedExecutionEngineState,
    ) -> u64 {
        let parallel = tasks.len() > 1;
        let mut max_lat: u64 = 0;
        let mut sum_lat: u64 = 0;
        for t in tasks {
            let lat = state
                .nodes
                .iter()
                .find(|n| n.node_id == t.target_node)
                .map(|n| n.latency_ms)
                .unwrap_or(50);
            if lat > max_lat {
                max_lat = lat;
            }
            sum_lat += lat;
        }
        if parallel {
            max_lat.max(sum_lat / 2)
        } else {
            sum_lat
        }
    }

    fn node_to_gql(n: &DistV4NodeData) -> DistV4ExecutionNodeGql {
        DistV4ExecutionNodeGql {
            node_id: n.node_id.clone(),
            region: n.region.clone(),
            endpoint: n.endpoint.clone(),
            health: n.health.as_str().to_string(),
            capacity: n.capacity as i32,
            current_load: n.current_load as i32,
            latency_ms: n.latency_ms as i32,
        }
    }

    fn plan_to_gql(p: &DistV4PlanData) -> DistV4ExecutionPlanGql {
        DistV4ExecutionPlanGql {
            plan_id: p.plan_id.clone(),
            tasks: p
                .tasks
                .iter()
                .map(|t| DistV4TaskGql {
                    task_id: t.task_id.clone(),
                    query_fragment: t.query_fragment.clone(),
                    target_service: t.target_service.clone(),
                    target_node: t.target_node.clone(),
                    estimated_cost: t.estimated_cost,
                    priority: t.priority as i32,
                })
                .collect(),
            dependencies: p.dependencies.clone(),
            execution_strategy: p.execution_strategy.as_str().to_string(),
            estimated_total_time_ms: p.estimated_total_time_ms as i32,
            parallel_groups: p.parallel_groups.iter().map(|g| g.join(",")).collect(),
        }
    }

    fn trace_to_gql(t: &DistV4ExecutionTraceData) -> DistV4ExecutionTraceGql {
        DistV4ExecutionTraceGql {
            plan_id: t.plan_id.clone(),
            strategy: t.strategy.as_str().to_string(),
            total_time_ms: t.total_time_ms as i32,
            step_traces: t
                .step_traces
                .iter()
                .map(|s| DistV4StepTraceGql {
                    task_id: s.task_id.clone(),
                    target_node: s.target_node.clone(),
                    target_service: s.target_service.clone(),
                    start_time: s.start_time.to_rfc3339(),
                    end_time: s.end_time.to_rfc3339(),
                    duration_ms: s.duration_ms as i32,
                    status: s.status.as_str().to_string(),
                    error_message: s.error_message.clone(),
                })
                .collect(),
            parallel_groups_executed: t.parallel_groups_executed as i32,
            nodes_used: t.nodes_used.clone(),
            failed_nodes: t.failed_nodes.clone(),
            retries: t.retries as i32,
            created_at: t.created_at.to_rfc3339(),
        }
    }
}

// --- 2. 自适应查询优化器 ---

/// V47.0: 查询优化规则 GQL
#[derive(SimpleObject)]
pub struct AdaptiveOptRuleGql {
    pub rule_id: String,
    pub name: String,
    pub description: String,
    pub condition: String,
    pub transformation: String,
    pub estimated_benefit: f64,
    pub enabled: bool,
}

/// V47.0: 查询画像 GQL
#[derive(SimpleObject)]
pub struct AdaptiveQueryProfileGql {
    pub query_hash: String,
    pub execution_count: i64,
    pub avg_latency_ms: f64,
    pub avg_cost: f64,
    pub last_executed: String,
    pub common_variables: Vec<String>,
}

/// V47.0: 优化统计 GQL
#[derive(SimpleObject)]
pub struct AdaptiveOptStatsGql {
    pub total_optimizations: i64,
    pub rules_applied: i64,
    pub avg_benefit: f64,
    pub queries_profiled: i64,
    pub rules_available: i32,
    pub experimental_rules: i32,
}

/// V47.0: 优化建议 GQL
#[derive(SimpleObject)]
pub struct AdaptiveOptSuggestionGql {
    pub suggestion_id: String,
    pub query_hash: String,
    pub rule_id: String,
    pub rule_name: String,
    pub description: String,
    pub estimated_benefit: f64,
    pub before_cost: f64,
    pub after_cost: f64,
}

/// V47.0: 优化级别
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OptimizationLevel {
    None,
    Basic,
    Aggressive,
    Experimental,
}

impl OptimizationLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::None => "None",
            Self::Basic => "Basic",
            Self::Aggressive => "Aggressive",
            Self::Experimental => "Experimental",
        }
    }

    fn allows(&self, rule_level: OptimizationLevel) -> bool {
        let cur = match self {
            Self::None => 0,
            Self::Basic => 1,
            Self::Aggressive => 2,
            Self::Experimental => 3,
        };
        let req = match rule_level {
            Self::None => 0,
            Self::Basic => 1,
            Self::Aggressive => 2,
            Self::Experimental => 3,
        };
        cur >= req
    }

    fn from_str(s: &str) -> Self {
        match s {
            "None" => Self::None,
            "Basic" => Self::Basic,
            "Aggressive" => Self::Aggressive,
            "Experimental" => Self::Experimental,
            _ => Self::Aggressive,
        }
    }
}

#[derive(Clone, Debug)]
struct AdaptiveRuleData {
    rule_id: String,
    name: String,
    description: String,
    condition: String,
    transformation: String,
    estimated_benefit: f64,
    enabled: bool,
    level: OptimizationLevel,
}

#[derive(Clone, Debug)]
struct AdaptiveQueryProfileData {
    query_hash: String,
    execution_count: u64,
    total_latency_ms: u64,
    total_cost: f64,
    last_executed: DateTime<Utc>,
    common_variables: Vec<String>,
}

#[derive(Default)]
struct AdaptiveOptStatsInternal {
    total_optimizations: u64,
    rules_applied: u64,
    total_benefit: f64,
}

struct AdaptiveQueryOptimizerState {
    level: OptimizationLevel,
    rules: Vec<AdaptiveRuleData>,
    profiles: HashMap<String, AdaptiveQueryProfileData>,
    stats: AdaptiveOptStatsInternal,
}

impl AdaptiveQueryOptimizerState {
    fn new() -> Self {
        let rules = vec![
            AdaptiveRuleData {
                rule_id: "field-pruning".into(),
                name: "字段裁剪".into(),
                description: "移除查询中未使用的字段，减少数据传输量".into(),
                condition: "查询包含 5 个以上字段".into(),
                transformation: "剔除未在 selection set 中实际使用的字段".into(),
                estimated_benefit: 0.25,
                enabled: true,
                level: OptimizationLevel::Basic,
            },
            AdaptiveRuleData {
                rule_id: "query-splitting".into(),
                name: "查询拆分".into(),
                description: "将大查询拆分为多个小查询，降低单次执行成本".into(),
                condition: "查询深度 > 3 或节点数 > 10".into(),
                transformation: "按服务边界拆分为子查询".into(),
                estimated_benefit: 0.35,
                enabled: true,
                level: OptimizationLevel::Aggressive,
            },
            AdaptiveRuleData {
                rule_id: "batch-n-plus-1".into(),
                name: "批量化".into(),
                description: "将 N+1 查询模式转换为批量查询".into(),
                condition: "检测到列表字段内的嵌套实体解析".into(),
                transformation: "使用 DataLoader 批量解析实体".into(),
                estimated_benefit: 0.5,
                enabled: true,
                level: OptimizationLevel::Basic,
            },
            AdaptiveRuleData {
                rule_id: "cache-utilization".into(),
                name: "缓存利用".into(),
                description: "识别可缓存的子查询，提升后续命中".into(),
                condition: "子查询结果可序列化且变量稳定".into(),
                transformation: "为子查询标记缓存键与 TTL".into(),
                estimated_benefit: 0.4,
                enabled: true,
                level: OptimizationLevel::Basic,
            },
            AdaptiveRuleData {
                rule_id: "parallelization".into(),
                name: "并行化".into(),
                description: "将相互独立的子查询并行执行".into(),
                condition: "存在无依赖关系的并行子查询".into(),
                transformation: "将独立子查询编入同一并行组".into(),
                estimated_benefit: 0.45,
                enabled: true,
                level: OptimizationLevel::Aggressive,
            },
            AdaptiveRuleData {
                rule_id: "persisted-query".into(),
                name: "持久化查询".into(),
                description: "将高频查询转为持久化查询以减少传输".into(),
                condition: "查询执行次数 > 50".into(),
                transformation: "注册 APQ 哈希并返回持久化 ID".into(),
                estimated_benefit: 0.2,
                enabled: false,
                level: OptimizationLevel::Experimental,
            },
        ];
        Self {
            level: OptimizationLevel::Aggressive,
            rules,
            profiles: HashMap::new(),
            stats: AdaptiveOptStatsInternal::default(),
        }
    }
}

static ADAPTIVE_QUERY_OPTIMIZER_STATE: std::sync::OnceLock<Mutex<AdaptiveQueryOptimizerState>> =
    std::sync::OnceLock::new();

fn adaptive_query_optimizer_state() -> &'static Mutex<AdaptiveQueryOptimizerState> {
    ADAPTIVE_QUERY_OPTIMIZER_STATE.get_or_init(|| Mutex::new(AdaptiveQueryOptimizerState::new()))
}

/// V47.0: 自适应查询优化器
pub struct AdaptiveQueryOptimizer;

impl AdaptiveQueryOptimizer {
    /// 计算查询哈希
    pub fn query_hash(query: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(query.as_bytes());
        let bytes = hasher.finalize();
        bytes.iter().take(8).map(|b| format!("{:02x}", b)).collect()
    }

    /// 自适应优化查询（基于历史执行数据）
    pub fn optimize_query(query: &str) -> (String, Vec<AdaptiveOptSuggestionGql>) {
        let mut state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let query_hash = Self::query_hash(query);
        let lower = query.to_lowercase();
        let field_count = lower.matches(',').count() + 1;
        let depth = lower.matches('{').count();
        let has_nested_list = lower.matches("list").count() + lower.matches("s(").count() > 0;

        // 先提取与判定无关的上下文，避免在迭代 rules 时同时访问 state 其它字段的借用冲突
        let level = state.level;
        let exec_count = state
            .profiles
            .get(&query_hash)
            .map(|p| p.execution_count)
            .unwrap_or(0);

        let matched_rules: Vec<AdaptiveRuleData> = state
            .rules
            .iter()
            .filter(|r| r.enabled && level.allows(r.level))
            .filter(|r| match r.rule_id.as_str() {
                "field-pruning" => field_count > 5,
                "query-splitting" => depth > 3 || field_count > 10,
                "batch-n-plus-1" => has_nested_list,
                "cache-utilization" => field_count >= 3,
                "parallelization" => depth >= 2 && field_count >= 2,
                "persisted-query" => exec_count > 50,
                _ => false,
            })
            .cloned()
            .collect();

        let mut optimized = query.to_string();
        let mut suggestions: Vec<AdaptiveOptSuggestionGql> = Vec::new();

        for rule in &matched_rules {
            let (transformed, before, after) = Self::apply_rule_internal(&optimized, rule);
            optimized = transformed;
            state.stats.rules_applied += 1;
            state.stats.total_benefit += rule.estimated_benefit;
            state.stats.total_optimizations += 1;
            suggestions.push(AdaptiveOptSuggestionGql {
                suggestion_id: format!("sug_{}_{}", rule.rule_id, uuid_simple()),
                query_hash: query_hash.clone(),
                rule_id: rule.rule_id.clone(),
                rule_name: rule.name.clone(),
                description: rule.description.clone(),
                estimated_benefit: rule.estimated_benefit,
                before_cost: before,
                after_cost: after,
            });
        }

        (optimized, suggestions)
    }

    /// 从执行结果学习
    pub fn learn_from_execution(
        query: &str,
        variables: &serde_json::Value,
        latency_ms: u64,
        cost: f64,
    ) {
        let mut state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let query_hash = Self::query_hash(query);
        let now = Utc::now();
        let var_keys: Vec<String> = variables
            .as_object()
            .map(|o| o.keys().cloned().collect())
            .unwrap_or_default();
        state
            .profiles
            .entry(query_hash)
            .and_modify(|p| {
                p.execution_count += 1;
                p.total_latency_ms += latency_ms;
                p.total_cost += cost;
                p.last_executed = now;
                for k in &var_keys {
                    if !p.common_variables.contains(k) {
                        p.common_variables.push(k.clone());
                    }
                }
            })
            .or_insert_with(|| AdaptiveQueryProfileData {
                query_hash: Self::query_hash(query),
                execution_count: 1,
                total_latency_ms: latency_ms,
                total_cost: cost,
                last_executed: now,
                common_variables: var_keys,
            });
    }

    /// 建议优化方案
    pub fn suggest_optimizations(query: &str) -> Vec<AdaptiveOptSuggestionGql> {
        let (_optimized, suggestions) = Self::optimize_query(query);
        suggestions
    }

    /// 应用优化规则
    pub fn apply_rule(query: &str, rule_id: &str) -> Option<(String, AdaptiveOptSuggestionGql)> {
        let mut state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let rule = state.rules.iter().find(|r| r.rule_id == rule_id)?.clone();
        if !rule.enabled || !state.level.allows(rule.level) {
            return None;
        }
        let query_hash = Self::query_hash(query);
        let (transformed, before, after) = Self::apply_rule_internal(query, &rule);
        state.stats.rules_applied += 1;
        state.stats.total_benefit += rule.estimated_benefit;
        state.stats.total_optimizations += 1;
        let suggestion = AdaptiveOptSuggestionGql {
            suggestion_id: format!("sug_{}_{}", rule.rule_id, uuid_simple()),
            query_hash,
            rule_id: rule.rule_id.clone(),
            rule_name: rule.name.clone(),
            description: rule.description.clone(),
            estimated_benefit: rule.estimated_benefit,
            before_cost: before,
            after_cost: after,
        };
        Some((transformed, suggestion))
    }

    fn apply_rule_internal(query: &str, rule: &AdaptiveRuleData) -> (String, f64, f64) {
        let before_cost = query.len() as f64 / 10.0;
        let after_cost = before_cost * (1.0 - rule.estimated_benefit.min(0.9));
        let tag = match rule.rule_id.as_str() {
            "field-pruning" => "pruned",
            "query-splitting" => "split",
            "batch-n-plus-1" => "batched",
            "cache-utilization" => "cacheable",
            "parallelization" => "parallel",
            "persisted-query" => "persisted",
            _ => "optimized",
        };
        (format!("/* {} */ {}", tag, query), before_cost, after_cost)
    }

    /// 获取查询性能画像
    pub fn get_query_profile(query: &str) -> Option<AdaptiveQueryProfileGql> {
        let state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let query_hash = Self::query_hash(query);
        state
            .profiles
            .get(&query_hash)
            .map(|p| AdaptiveQueryProfileGql {
                query_hash: p.query_hash.clone(),
                execution_count: p.execution_count as i64,
                avg_latency_ms: if p.execution_count > 0 {
                    p.total_latency_ms as f64 / p.execution_count as f64
                } else {
                    0.0
                },
                avg_cost: if p.execution_count > 0 {
                    p.total_cost / p.execution_count as f64
                } else {
                    0.0
                },
                last_executed: p.last_executed.to_rfc3339(),
                common_variables: p.common_variables.clone(),
            })
    }

    /// 获取优化统计
    pub fn get_optimization_stats() -> AdaptiveOptStatsGql {
        let state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let s = &state.stats;
        let avg_benefit = if s.rules_applied > 0 {
            s.total_benefit / s.rules_applied as f64
        } else {
            0.0
        };
        let experimental_rules = state
            .rules
            .iter()
            .filter(|r| r.level == OptimizationLevel::Experimental)
            .count() as i32;
        AdaptiveOptStatsGql {
            total_optimizations: s.total_optimizations as i64,
            rules_applied: s.rules_applied as i64,
            avg_benefit,
            queries_profiled: state.profiles.len() as i64,
            rules_available: state.rules.len() as i32,
            experimental_rules,
        }
    }

    /// 列出所有优化规则
    pub fn list_rules() -> Vec<AdaptiveOptRuleGql> {
        let state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .rules
            .iter()
            .map(|r| AdaptiveOptRuleGql {
                rule_id: r.rule_id.clone(),
                name: r.name.clone(),
                description: r.description.clone(),
                condition: r.condition.clone(),
                transformation: r.transformation.clone(),
                estimated_benefit: r.estimated_benefit,
                enabled: r.enabled,
            })
            .collect()
    }

    /// 设置优化级别
    pub fn set_optimization_level(level: OptimizationLevel) -> bool {
        let mut state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.level = level;
        true
    }

    /// 设置优化级别（字符串入参）
    pub fn set_optimization_level_str(level: &str) -> String {
        let mut state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.level = OptimizationLevel::from_str(level);
        state.level.as_str().to_string()
    }

    /// 获取当前优化级别
    pub fn get_optimization_level() -> String {
        let state = adaptive_query_optimizer_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.level.as_str().to_string()
    }
}

// --- 3. 多集群联邦 ---

/// V47.0: 集群状态 V4（避免与已有 ClusterStatus 冲突）
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ClusterStatusV4 {
    Active,
    Degraded,
    Offline,
    Maintenance,
}

impl ClusterStatusV4 {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "Active",
            Self::Degraded => "Degraded",
            Self::Offline => "Offline",
            Self::Maintenance => "Maintenance",
        }
    }
}

/// V47.0: 路由策略 V4
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RoutingPolicyV4 {
    LatencyFirst,
    LoadBalanced,
    DataLocation,
    CostOptimized,
    Custom,
}

impl RoutingPolicyV4 {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::LatencyFirst => "LatencyFirst",
            Self::LoadBalanced => "LoadBalanced",
            Self::DataLocation => "DataLocation",
            Self::CostOptimized => "CostOptimized",
            Self::Custom => "Custom",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "LatencyFirst" => Self::LatencyFirst,
            "LoadBalanced" => Self::LoadBalanced,
            "DataLocation" => Self::DataLocation,
            "CostOptimized" => Self::CostOptimized,
            _ => Self::Custom,
        }
    }
}

/// V47.0: 集群信息 GQL
#[derive(SimpleObject)]
pub struct MultiClusterInfoGql {
    pub cluster_id: String,
    pub name: String,
    pub region: String,
    pub endpoint: String,
    pub version: String,
    pub status: String,
    pub services: Vec<String>,
    pub latency_ms: i32,
    pub last_health_check: String,
}

/// V47.0: 跨集群查询 GQL
#[derive(SimpleObject)]
pub struct CrossClusterQueryGql {
    pub query_id: String,
    pub query: String,
    pub target_clusters: Vec<String>,
    pub routing_policy: String,
    pub fan_out: i32,
    pub merge_strategy: String,
    pub estimated_time_ms: i32,
    pub created_at: String,
}

/// V47.0: 多集群统计 GQL
#[derive(SimpleObject)]
pub struct MultiClusterStatsGql {
    pub total_clusters: i32,
    pub active_clusters: i32,
    pub degraded_clusters: i32,
    pub offline_clusters: i32,
    pub total_services: i32,
    pub cross_cluster_queries: i64,
    pub avg_cross_cluster_latency_ms: f64,
    pub schema_sync_count: i64,
    pub last_rebalance: String,
}

/// V47.0: 多集群路由决策 GQL
#[derive(SimpleObject)]
pub struct MultiClusterRoutingDecisionGql {
    pub query_id: String,
    pub selected_clusters: Vec<String>,
    pub policy: String,
    pub reason: String,
    pub estimated_latency_ms: i32,
}

#[derive(Clone, Debug)]
struct ClusterInfoData {
    cluster_id: String,
    name: String,
    region: String,
    endpoint: String,
    version: String,
    status: ClusterStatusV4,
    services: Vec<String>,
    latency_ms: u64,
    last_health_check: DateTime<Utc>,
}

#[derive(Clone, Debug)]
struct CrossClusterQueryData {
    query_id: String,
    query: String,
    target_clusters: Vec<String>,
    routing_policy: RoutingPolicyV4,
    fan_out: u32,
    merge_strategy: String,
    estimated_time_ms: u64,
    created_at: DateTime<Utc>,
}

#[derive(Default)]
struct MultiClusterStatsInternal {
    cross_cluster_queries: u64,
    total_cross_cluster_latency_ms: u64,
    schema_sync_count: u64,
    last_rebalance: Option<DateTime<Utc>>,
}

struct MultiClusterRouterState {
    clusters: Vec<ClusterInfoData>,
    cross_cluster_queries: Vec<CrossClusterQueryData>,
    policy: RoutingPolicyV4,
    stats: MultiClusterStatsInternal,
}

impl MultiClusterRouterState {
    fn new() -> Self {
        let now = Utc::now();
        let clusters = vec![
            ClusterInfoData {
                cluster_id: "cluster-prod-cn".into(),
                name: "生产集群-中国".into(),
                region: "cn-east-1".into(),
                endpoint: "https://gql-cluster-prod-cn.topems.local".into(),
                version: "v47.0.0".into(),
                status: ClusterStatusV4::Active,
                services: vec![
                    "erp".into(),
                    "crm".into(),
                    "hrm".into(),
                    "finance".into(),
                    "mes".into(),
                ],
                latency_ms: 15,
                last_health_check: now,
            },
            ClusterInfoData {
                cluster_id: "cluster-prod-ap".into(),
                name: "生产集群-亚太".into(),
                region: "ap-southeast-1".into(),
                endpoint: "https://gql-cluster-prod-ap.topems.local".into(),
                version: "v47.0.0".into(),
                status: ClusterStatusV4::Active,
                services: vec!["erp".into(), "crm".into(), "mes".into()],
                latency_ms: 85,
                last_health_check: now,
            },
            ClusterInfoData {
                cluster_id: "cluster-dr-cn".into(),
                name: "容灾集群-中国".into(),
                region: "cn-south-1".into(),
                endpoint: "https://gql-cluster-dr-cn.topems.local".into(),
                version: "v46.0.0".into(),
                status: ClusterStatusV4::Maintenance,
                services: vec![
                    "erp".into(),
                    "crm".into(),
                    "hrm".into(),
                    "finance".into(),
                    "mes".into(),
                ],
                latency_ms: 60,
                last_health_check: now - chrono::Duration::hours(2),
            },
        ];
        Self {
            clusters,
            cross_cluster_queries: Vec::new(),
            policy: RoutingPolicyV4::LatencyFirst,
            stats: MultiClusterStatsInternal::default(),
        }
    }
}

static MULTI_CLUSTER_ROUTER_STATE: std::sync::OnceLock<Mutex<MultiClusterRouterState>> =
    std::sync::OnceLock::new();

fn multi_cluster_router_state() -> &'static Mutex<MultiClusterRouterState> {
    MULTI_CLUSTER_ROUTER_STATE.get_or_init(|| Mutex::new(MultiClusterRouterState::new()))
}

/// V47.0: 多集群路由器
pub struct MultiClusterRouter;

impl MultiClusterRouter {
    /// 注册集群
    pub fn register_cluster(
        cluster_id: &str,
        name: &str,
        region: &str,
        endpoint: &str,
        version: &str,
        services: Vec<String>,
    ) -> MultiClusterInfoGql {
        let mut state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        let cluster = ClusterInfoData {
            cluster_id: cluster_id.to_string(),
            name: name.to_string(),
            region: region.to_string(),
            endpoint: endpoint.to_string(),
            version: version.to_string(),
            status: ClusterStatusV4::Active,
            services,
            latency_ms: 50,
            last_health_check: now,
        };
        let gql = Self::cluster_to_gql(&cluster);
        if let Some(existing) = state
            .clusters
            .iter_mut()
            .find(|c| c.cluster_id == cluster_id)
        {
            *existing = cluster;
        } else {
            state.clusters.push(cluster);
        }
        gql
    }

    /// 注销集群
    pub fn deregister_cluster(cluster_id: &str) -> bool {
        let mut state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let before = state.clusters.len();
        state.clusters.retain(|c| c.cluster_id != cluster_id);
        state.clusters.len() < before
    }

    /// 跨集群路由查询（基于数据位置/延迟/负载）
    pub fn route_query(query: &str) -> MultiClusterRoutingDecisionGql {
        let state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let query_id = format!("rq_{}", uuid_simple());
        let lower = query.to_lowercase();
        let policy = state.policy;

        let candidates: Vec<&ClusterInfoData> = state
            .clusters
            .iter()
            .filter(|c| c.status == ClusterStatusV4::Active)
            .collect();

        let (selected, reason, estimated_latency) = match policy {
            RoutingPolicyV4::LatencyFirst => {
                if let Some(c) = candidates.iter().min_by_key(|c| c.latency_ms) {
                    (
                        vec![c.cluster_id.clone()],
                        "最低延迟优先".into(),
                        c.latency_ms as i32,
                    )
                } else {
                    (Vec::new(), "无可用集群".into(), 0)
                }
            }
            RoutingPolicyV4::LoadBalanced => {
                if let Some(c) = candidates.iter().min_by_key(|c| c.services.len()) {
                    (
                        vec![c.cluster_id.clone()],
                        "负载均衡: 选择服务数最少的集群".into(),
                        c.latency_ms as i32,
                    )
                } else {
                    (Vec::new(), "无可用集群".into(), 0)
                }
            }
            RoutingPolicyV4::DataLocation => {
                let region = if lower.contains("asia") || lower.contains("ap") {
                    "ap-southeast-1"
                } else {
                    "cn-east-1"
                };
                let matched: Vec<String> = candidates
                    .iter()
                    .filter(|c| c.region == region)
                    .map(|c| c.cluster_id.clone())
                    .collect();
                let lat = candidates
                    .iter()
                    .find(|c| c.region == region)
                    .map(|c| c.latency_ms as i32)
                    .unwrap_or(0);
                (matched, format!("数据位置优先: {}", region), lat)
            }
            RoutingPolicyV4::CostOptimized => {
                if let Some(c) = candidates.iter().max_by_key(|c| c.services.len()) {
                    (
                        vec![c.cluster_id.clone()],
                        "成本优化: 选择服务数最多的集群".into(),
                        c.latency_ms as i32,
                    )
                } else {
                    (Vec::new(), "无可用集群".into(), 0)
                }
            }
            RoutingPolicyV4::Custom => {
                let all: Vec<String> = candidates.iter().map(|c| c.cluster_id.clone()).collect();
                let lat = candidates.first().map(|c| c.latency_ms as i32).unwrap_or(0);
                (all, "自定义策略: 全部活跃集群".into(), lat)
            }
        };

        MultiClusterRoutingDecisionGql {
            query_id,
            selected_clusters: selected,
            policy: policy.as_str().to_string(),
            reason,
            estimated_latency_ms: estimated_latency,
        }
    }

    /// 跨集群联邦查询
    pub fn federate_query(query: &str, target_clusters: Vec<String>) -> CrossClusterQueryGql {
        let mut state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let query_id = format!("fcq_{}", uuid_simple());
        let fan_out = target_clusters.len() as u32;
        let estimated_time_ms = state
            .clusters
            .iter()
            .filter(|c| target_clusters.contains(&c.cluster_id))
            .map(|c| c.latency_ms)
            .max()
            .unwrap_or(50);
        let now = Utc::now();
        let data = CrossClusterQueryData {
            query_id: query_id.clone(),
            query: query.to_string(),
            target_clusters: target_clusters.clone(),
            routing_policy: state.policy,
            fan_out,
            merge_strategy: "union-dedupe".into(),
            estimated_time_ms,
            created_at: now,
        };
        let gql = Self::cross_cluster_query_to_gql(&data);
        state.cross_cluster_queries.push(data);
        state.stats.cross_cluster_queries += 1;
        state.stats.total_cross_cluster_latency_ms += estimated_time_ms;
        gql
    }

    /// 同步集群间 Schema
    pub fn sync_schema() -> i32 {
        let mut state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let active_count = state
            .clusters
            .iter()
            .filter(|c| c.status == ClusterStatusV4::Active)
            .count() as i32;
        state.stats.schema_sync_count += 1;
        active_count
    }

    /// 集群健康检查
    pub fn health_check(cluster_id: &str) -> Option<MultiClusterInfoGql> {
        let mut state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        if let Some(c) = state
            .clusters
            .iter_mut()
            .find(|c| c.cluster_id == cluster_id)
        {
            c.last_health_check = now;
            // 维护中的集群保持维护状态，不自动改变
            if c.status != ClusterStatusV4::Maintenance {
                c.status = if c.latency_ms < 100 {
                    ClusterStatusV4::Active
                } else if c.latency_ms < 300 {
                    ClusterStatusV4::Degraded
                } else {
                    ClusterStatusV4::Offline
                };
            }
            return Some(Self::cluster_to_gql(c));
        }
        None
    }

    /// 获取集群统计
    pub fn get_cluster_stats() -> MultiClusterStatsGql {
        let state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let s = &state.stats;
        let active = state
            .clusters
            .iter()
            .filter(|c| c.status == ClusterStatusV4::Active)
            .count() as i32;
        let degraded = state
            .clusters
            .iter()
            .filter(|c| c.status == ClusterStatusV4::Degraded)
            .count() as i32;
        let offline = state
            .clusters
            .iter()
            .filter(|c| c.status == ClusterStatusV4::Offline)
            .count() as i32;
        let total_services: usize = state.clusters.iter().map(|c| c.services.len()).sum();
        let avg_cross_cluster_latency_ms = if s.cross_cluster_queries > 0 {
            s.total_cross_cluster_latency_ms as f64 / s.cross_cluster_queries as f64
        } else {
            0.0
        };
        MultiClusterStatsGql {
            total_clusters: state.clusters.len() as i32,
            active_clusters: active,
            degraded_clusters: degraded,
            offline_clusters: offline,
            total_services: total_services as i32,
            cross_cluster_queries: s.cross_cluster_queries as i64,
            avg_cross_cluster_latency_ms,
            schema_sync_count: s.schema_sync_count as i64,
            last_rebalance: s.last_rebalance.map(|t| t.to_rfc3339()).unwrap_or_default(),
        }
    }

    /// 重新平衡流量
    pub fn rebalance_traffic() -> Vec<String> {
        let mut state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        state.stats.last_rebalance = Some(now);
        let mut changes: Vec<String> = Vec::new();
        for c in state.clusters.iter_mut() {
            if c.status == ClusterStatusV4::Maintenance
                && now > c.last_health_check + chrono::Duration::minutes(30)
            {
                c.status = ClusterStatusV4::Active;
                changes.push(format!("{}: Maintenance -> Active", c.cluster_id));
            } else if c.status == ClusterStatusV4::Active && c.latency_ms > 200 {
                c.status = ClusterStatusV4::Degraded;
                changes.push(format!("{}: Active -> Degraded", c.cluster_id));
            }
        }
        changes
    }

    /// 设置路由策略
    pub fn set_routing_policy(policy: &str) -> String {
        let mut state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.policy = RoutingPolicyV4::from_str(policy);
        state.policy.as_str().to_string()
    }

    /// 列出所有集群
    pub fn list_clusters() -> Vec<MultiClusterInfoGql> {
        let state = multi_cluster_router_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.clusters.iter().map(Self::cluster_to_gql).collect()
    }

    fn cluster_to_gql(c: &ClusterInfoData) -> MultiClusterInfoGql {
        MultiClusterInfoGql {
            cluster_id: c.cluster_id.clone(),
            name: c.name.clone(),
            region: c.region.clone(),
            endpoint: c.endpoint.clone(),
            version: c.version.clone(),
            status: c.status.as_str().to_string(),
            services: c.services.clone(),
            latency_ms: c.latency_ms as i32,
            last_health_check: c.last_health_check.to_rfc3339(),
        }
    }

    fn cross_cluster_query_to_gql(q: &CrossClusterQueryData) -> CrossClusterQueryGql {
        CrossClusterQueryGql {
            query_id: q.query_id.clone(),
            query: q.query.clone(),
            target_clusters: q.target_clusters.clone(),
            routing_policy: q.routing_policy.as_str().to_string(),
            fan_out: q.fan_out as i32,
            merge_strategy: q.merge_strategy.clone(),
            estimated_time_ms: q.estimated_time_ms as i32,
            created_at: q.created_at.to_rfc3339(),
        }
    }
}

// ==================== V47.0 BFF Phase 17: GraphQL 实时数据流 + 增量更新 + 状态同步 ====================
//
// Phase 17 新增：
// - RealtimeDataStream：实时数据流增强（注册流 / 发布更新 / 快照 / 压缩）
// - IncrementalUpdateEngine：增量更新引擎（计算 delta / 应用 / 批量 / 对账）
// - StateSyncManager：状态同步管理器（会话 / 冲突 / 历史）
// - 三个新 Subscription：realtime_data_stream / incremental_updates / sync_state_changed

// ---------- Part 1: 实时数据流增强（RealtimeDataStream） ----------

/// V47.0: 实时流更新类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StreamUpdateTypeGql {
    Insert,
    Update,
    Delete,
    Sync,
    Snapshot,
}

/// V47.0: 实时流配置
#[derive(SimpleObject, Clone)]
pub struct RealtimeStreamConfigGql {
    pub buffer_size: i64,
    pub flush_interval_ms: i64,
    pub max_concurrent_streams: i32,
    pub compression_enabled: bool,
}

/// V47.0: 实时流更新事件
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct RealtimeStreamUpdateGql {
    pub update_id: String,
    pub stream_type: StreamUpdateTypeGql,
    pub entity_type: String,
    pub entity_id: String,
    pub changed_fields: Vec<String>,
    pub old_values: serde_json::Value,
    pub new_values: serde_json::Value,
    pub timestamp: String,
    pub sequence_number: i64,
}

/// V47.0: 实时流统计信息
#[derive(SimpleObject, Clone)]
pub struct RealtimeStreamStatsGql {
    pub entity_type: String,
    pub total_updates: i64,
    pub buffered_updates: i64,
    pub current_sequence: i64,
    pub snapshot_count: i64,
    pub last_update_at: Option<String>,
}

/// V47.0: 流快照（用于新客户端初始化）
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct StreamSnapshotGql {
    pub snapshot_id: String,
    pub entity_type: String,
    pub sequence_number: i64,
    pub data: serde_json::Value,
    pub created_at: String,
}

// --- 内部状态 ---

#[derive(Clone)]
struct RealtimeStreamConfigData {
    buffer_size: u64,
    flush_interval_ms: u64,
    max_concurrent_streams: u32,
    compression_enabled: bool,
}

impl Default for RealtimeStreamConfigData {
    fn default() -> Self {
        Self {
            buffer_size: 1024,
            flush_interval_ms: 100,
            max_concurrent_streams: 16,
            compression_enabled: true,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
struct RealtimeStreamUpdateData {
    update_id: String,
    stream_type: StreamUpdateTypeGql,
    entity_type: String,
    entity_id: String,
    changed_fields: Vec<String>,
    old_values: serde_json::Value,
    new_values: serde_json::Value,
    timestamp: DateTime<Utc>,
    sequence_number: i64,
}

#[derive(Clone, Serialize, Deserialize)]
struct StreamSnapshotData {
    snapshot_id: String,
    entity_type: String,
    sequence_number: i64,
    data: serde_json::Value,
    created_at: DateTime<Utc>,
}

struct RealtimeStreamManagerState {
    config: RealtimeStreamConfigData,
    streams: HashMap<String, RealtimeStreamConfigData>,
    updates: HashMap<String, VecDeque<RealtimeStreamUpdateData>>,
    snapshots: HashMap<String, Vec<StreamSnapshotData>>,
    sequences: HashMap<String, i64>,
    total_updates: u64,
}

impl RealtimeStreamManagerState {
    fn new() -> Self {
        let mut streams = HashMap::new();
        let mut updates = HashMap::new();
        let mut sequences = HashMap::new();
        for et in ["order", "inventory", "master_data", "notification"] {
            streams.insert(et.to_string(), RealtimeStreamConfigData::default());
            updates.insert(et.to_string(), VecDeque::new());
            sequences.insert(et.to_string(), 0);
        }
        Self {
            config: RealtimeStreamConfigData::default(),
            streams,
            updates,
            snapshots: HashMap::new(),
            sequences,
            total_updates: 0,
        }
    }
}

static REALTIME_STREAM_STATE: std::sync::OnceLock<Mutex<RealtimeStreamManagerState>> =
    std::sync::OnceLock::new();

fn realtime_stream_state() -> &'static Mutex<RealtimeStreamManagerState> {
    REALTIME_STREAM_STATE.get_or_init(|| Mutex::new(RealtimeStreamManagerState::new()))
}

/// V47.0: 实时数据流管理器
pub struct RealtimeStreamManager;

impl RealtimeStreamManager {
    /// 注册数据流（entity_type → stream 配置）
    pub fn register_stream(entity_type: &str, config: RealtimeStreamConfigGql) -> bool {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let data = RealtimeStreamConfigData {
            buffer_size: config.buffer_size as u64,
            flush_interval_ms: config.flush_interval_ms as u64,
            max_concurrent_streams: config.max_concurrent_streams as u32,
            compression_enabled: config.compression_enabled,
        };
        state.streams.insert(entity_type.to_string(), data);
        state.updates.entry(entity_type.to_string()).or_default();
        state.sequences.entry(entity_type.to_string()).or_insert(0);
        true
    }

    /// 发布实时更新
    pub fn publish_update(
        entity_type: &str,
        entity_id: &str,
        stream_type: StreamUpdateTypeGql,
        changed_fields: Vec<String>,
        old_values: serde_json::Value,
        new_values: serde_json::Value,
    ) -> Option<RealtimeStreamUpdateGql> {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if !state.streams.contains_key(entity_type) {
            return None;
        }
        let seq = state.sequences.entry(entity_type.to_string()).or_insert(0);
        *seq += 1;
        let update = RealtimeStreamUpdateData {
            update_id: uuid_simple(),
            stream_type,
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            changed_fields,
            old_values,
            new_values,
            timestamp: Utc::now(),
            sequence_number: *seq,
        };
        let gql = Self::update_to_gql(&update);
        let buffer = state.config.buffer_size as usize;
        let queue = state.updates.entry(entity_type.to_string()).or_default();
        queue.push_back(update);
        while queue.len() > buffer {
            queue.pop_front();
        }
        state.total_updates += 1;
        Some(gql)
    }

    /// 获取指定流的增量更新（since_sequence 之后的更新）
    pub fn get_stream_updates(
        entity_type: &str,
        since_sequence: i64,
        limit: Option<u32>,
    ) -> Vec<RealtimeStreamUpdateGql> {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(100) as usize;
        state
            .updates
            .get(entity_type)
            .map(|q| {
                q.iter()
                    .filter(|u| u.sequence_number > since_sequence)
                    .take(limit)
                    .map(Self::update_to_gql)
                    .collect()
            })
            .unwrap_or_default()
    }

    /// 获取流统计信息
    pub fn get_stream_stats(entity_type: &str) -> Option<RealtimeStreamStatsGql> {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let buffered = state
            .updates
            .get(entity_type)
            .map(|q| q.len() as i64)
            .unwrap_or(0);
        let current_seq = state.sequences.get(entity_type).copied().unwrap_or(0);
        let snapshot_count = state
            .snapshots
            .get(entity_type)
            .map(|s| s.len() as i64)
            .unwrap_or(0);
        let last_update_at = state
            .updates
            .get(entity_type)
            .and_then(|q| q.back())
            .map(|u| u.timestamp.to_rfc3339());
        Some(RealtimeStreamStatsGql {
            entity_type: entity_type.to_string(),
            total_updates: state.total_updates as i64,
            buffered_updates: buffered,
            current_sequence: current_seq,
            snapshot_count,
            last_update_at,
        })
    }

    /// 创建快照（用于新客户端初始化）
    pub fn create_snapshot(entity_type: &str, data: serde_json::Value) -> StreamSnapshotGql {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let seq = state.sequences.get(entity_type).copied().unwrap_or(0);
        let snapshot = StreamSnapshotData {
            snapshot_id: uuid_simple(),
            entity_type: entity_type.to_string(),
            sequence_number: seq,
            data,
            created_at: Utc::now(),
        };
        let gql = Self::snapshot_to_gql(&snapshot);
        state
            .snapshots
            .entry(entity_type.to_string())
            .or_default()
            .push(snapshot);
        gql
    }

    /// 获取快照（snapshot_id 为 None 时返回最新快照）
    pub fn get_snapshot(entity_type: &str, snapshot_id: Option<&str>) -> Option<StreamSnapshotGql> {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let snapshots = state.snapshots.get(entity_type)?;
        if let Some(id) = snapshot_id {
            snapshots
                .iter()
                .find(|s| s.snapshot_id == id)
                .map(Self::snapshot_to_gql)
        } else {
            snapshots.last().map(Self::snapshot_to_gql)
        }
    }

    /// 压缩流（清理旧数据，保留最新快照）
    pub fn compact_stream(entity_type: &str) -> bool {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(queue) = state.updates.get_mut(entity_type) {
            queue.clear();
        }
        if let Some(snapshots) = state.snapshots.get_mut(entity_type) {
            if snapshots.len() > 1 {
                let last = snapshots.pop().unwrap();
                snapshots.clear();
                snapshots.push(last);
            }
        }
        true
    }

    /// 获取当前流全局配置
    pub fn get_config() -> RealtimeStreamConfigGql {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        RealtimeStreamConfigGql {
            buffer_size: state.config.buffer_size as i64,
            flush_interval_ms: state.config.flush_interval_ms as i64,
            max_concurrent_streams: state.config.max_concurrent_streams as i32,
            compression_enabled: state.config.compression_enabled,
        }
    }

    fn update_to_gql(u: &RealtimeStreamUpdateData) -> RealtimeStreamUpdateGql {
        RealtimeStreamUpdateGql {
            update_id: u.update_id.clone(),
            stream_type: u.stream_type,
            entity_type: u.entity_type.clone(),
            entity_id: u.entity_id.clone(),
            changed_fields: u.changed_fields.clone(),
            old_values: u.old_values.clone(),
            new_values: u.new_values.clone(),
            timestamp: u.timestamp.to_rfc3339(),
            sequence_number: u.sequence_number,
        }
    }

    fn snapshot_to_gql(s: &StreamSnapshotData) -> StreamSnapshotGql {
        StreamSnapshotGql {
            snapshot_id: s.snapshot_id.clone(),
            entity_type: s.entity_type.clone(),
            sequence_number: s.sequence_number,
            data: s.data.clone(),
            created_at: s.created_at.to_rfc3339(),
        }
    }
}

// ---------- Part 2: 增量更新引擎（IncrementalUpdateEngine） ----------

/// V47.0: 增量更新操作类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpdateOperationGql {
    Set,
    Add,
    Remove,
    Move,
    Merge,
    Replace,
}

/// V47.0: 字段增量
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct FieldDeltaGql {
    pub field_path: String,
    pub operation: UpdateOperationGql,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
}

/// V47.0: 增量更新
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct IncrementalUpdateGql {
    pub update_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub version: i64,
    pub delta: serde_json::Value,
    pub base_version: i64,
    pub timestamp: String,
}

/// V47.0: 增量更新统计
#[derive(SimpleObject, Clone)]
pub struct IncrementalStatsGql {
    pub total_updates: i64,
    pub pending_updates: i64,
    pub applied_updates: i64,
    pub rejected_updates: i64,
    pub last_reconcile_at: Option<String>,
}

/// V47.0: 对账结果
#[derive(SimpleObject, Clone)]
pub struct ReconcileResultGql {
    pub client_version: i64,
    pub server_version: i64,
    pub in_sync: bool,
    pub missing_updates: i64,
}

// --- 内部状态 ---

#[derive(Clone, Serialize, Deserialize)]
struct IncrementalUpdateData {
    update_id: String,
    entity_type: String,
    entity_id: String,
    version: i64,
    delta: serde_json::Value,
    base_version: i64,
    timestamp: DateTime<Utc>,
    applied: bool,
    valid: bool,
}

struct IncrementalUpdateEngineState {
    updates: Vec<IncrementalUpdateData>,
    total_updates: u64,
    applied_updates: u64,
    rejected_updates: u64,
    last_reconcile_at: Option<DateTime<Utc>>,
}

impl IncrementalUpdateEngineState {
    fn new() -> Self {
        Self {
            updates: Vec::new(),
            total_updates: 0,
            applied_updates: 0,
            rejected_updates: 0,
            last_reconcile_at: None,
        }
    }
}

static INCREMENTAL_UPDATE_STATE: std::sync::OnceLock<Mutex<IncrementalUpdateEngineState>> =
    std::sync::OnceLock::new();

fn incremental_update_state() -> &'static Mutex<IncrementalUpdateEngineState> {
    INCREMENTAL_UPDATE_STATE.get_or_init(|| Mutex::new(IncrementalUpdateEngineState::new()))
}

/// V47.0: 增量更新引擎
pub struct IncrementalUpdateEngine;

impl IncrementalUpdateEngine {
    /// 计算两个版本间的增量
    pub fn compute_delta(
        entity_type: &str,
        entity_id: &str,
        base_version: i64,
        old_values: serde_json::Value,
        new_values: serde_json::Value,
    ) -> IncrementalUpdateGql {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_updates += 1;
        let version = base_version + 1;
        let delta = Self::diff_values(&old_values, &new_values);
        let update = IncrementalUpdateData {
            update_id: uuid_simple(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            version,
            delta,
            base_version,
            timestamp: Utc::now(),
            applied: false,
            valid: true,
        };
        let gql = Self::update_to_gql(&update);
        state.updates.push(update);
        gql
    }

    /// 应用增量到基础数据
    pub fn apply_delta(
        entity_type: &str,
        entity_id: &str,
        update_id: &str,
        base: serde_json::Value,
    ) -> Option<serde_json::Value> {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let idx = state.updates.iter().position(|u| {
            u.update_id == update_id && u.entity_type == entity_type && u.entity_id == entity_id
        })?;
        if !state.updates[idx].valid {
            state.rejected_updates += 1;
            return None;
        }
        let delta = state.updates[idx].delta.clone();
        state.updates[idx].applied = true;
        state.applied_updates += 1;
        Some(Self::merge_delta(base, delta))
    }

    /// 批量应用增量（自 since_version 起）
    pub fn batch_apply(
        entity_type: &str,
        entity_id: &str,
        base: serde_json::Value,
        since_version: i64,
    ) -> serde_json::Value {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut current = base;
        let mut applied_count: u64 = 0;
        for i in 0..state.updates.len() {
            let matches = state.updates[i].entity_type == entity_type
                && state.updates[i].entity_id == entity_id
                && state.updates[i].base_version >= since_version
                && state.updates[i].valid;
            if matches {
                let delta = state.updates[i].delta.clone();
                current = Self::merge_delta(current, delta);
                state.updates[i].applied = true;
                applied_count += 1;
            }
        }
        state.applied_updates += applied_count;
        current
    }

    /// 验证增量是否合法
    pub fn validate_delta(delta: &serde_json::Value) -> bool {
        if !delta.is_object() {
            return false;
        }
        if let Some(obj) = delta.as_object() {
            if obj.is_empty() {
                return false;
            }
            for key in obj.keys() {
                if key.is_empty() {
                    return false;
                }
            }
            return true;
        }
        false
    }

    /// 对账（检测客户端与服务端版本差异）
    pub fn reconcile(
        entity_type: &str,
        entity_id: &str,
        client_version: i64,
    ) -> ReconcileResultGql {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.last_reconcile_at = Some(Utc::now());
        let server_version = state
            .updates
            .iter()
            .filter(|u| u.entity_type == entity_type && u.entity_id == entity_id)
            .map(|u| u.version)
            .max()
            .unwrap_or(0);
        let missing = state
            .updates
            .iter()
            .filter(|u| {
                u.entity_type == entity_type
                    && u.entity_id == entity_id
                    && u.version > client_version
            })
            .count() as i64;
        ReconcileResultGql {
            client_version,
            server_version,
            in_sync: client_version >= server_version,
            missing_updates: missing,
        }
    }

    /// 获取待应用的增量更新
    pub fn get_pending_updates(
        entity_type: &str,
        entity_id: &str,
        since_version: i64,
    ) -> Vec<IncrementalUpdateGql> {
        let state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .updates
            .iter()
            .filter(|u| {
                u.entity_type == entity_type
                    && u.entity_id == entity_id
                    && u.version > since_version
                    && !u.applied
            })
            .map(Self::update_to_gql)
            .collect()
    }

    /// 获取增量更新统计
    pub fn get_stats() -> IncrementalStatsGql {
        let state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let pending = state.updates.iter().filter(|u| !u.applied).count() as i64;
        IncrementalStatsGql {
            total_updates: state.total_updates as i64,
            pending_updates: pending,
            applied_updates: state.applied_updates as i64,
            rejected_updates: state.rejected_updates as i64,
            last_reconcile_at: state.last_reconcile_at.map(|t| t.to_rfc3339()),
        }
    }

    /// 计算两个 JSON 对象的差异（仅顶层字段）
    fn diff_values(old: &serde_json::Value, new: &serde_json::Value) -> serde_json::Value {
        let mut delta = serde_json::Map::new();
        if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
            for (key, new_val) in new_obj {
                let old_val = old_obj.get(key).unwrap_or(&serde_json::Value::Null);
                if old_val != new_val {
                    delta.insert(key.clone(), new_val.clone());
                }
            }
            for key in old_obj.keys() {
                if !new_obj.contains_key(key) {
                    delta.insert(key.clone(), serde_json::Value::Null);
                }
            }
        } else if old != new {
            return new.clone();
        }
        serde_json::Value::Object(delta)
    }

    /// 将 delta 合并到基础数据
    fn merge_delta(base: serde_json::Value, delta: serde_json::Value) -> serde_json::Value {
        let mut result = base;
        if let (Some(result_obj), Some(delta_obj)) = (result.as_object_mut(), delta.as_object()) {
            for (key, val) in delta_obj {
                if val.is_null() {
                    result_obj.remove(key);
                } else {
                    result_obj.insert(key.clone(), val.clone());
                }
            }
        } else if !delta.is_null() {
            result = delta;
        }
        result
    }

    fn update_to_gql(u: &IncrementalUpdateData) -> IncrementalUpdateGql {
        IncrementalUpdateGql {
            update_id: u.update_id.clone(),
            entity_type: u.entity_type.clone(),
            entity_id: u.entity_id.clone(),
            version: u.version,
            delta: u.delta.clone(),
            base_version: u.base_version,
            timestamp: u.timestamp.to_rfc3339(),
        }
    }
}

// ---------- Part 3: 状态同步管理器（StateSyncManager） ----------

/// V47.0: 同步状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncStateGql {
    InSync,
    Syncing,
    Conflict,
    Error,
    Offline,
}

/// V47.0: 冲突解决策略
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictResolutionStrategyGql {
    ServerWins,
    ClientWins,
    LastWriteWins,
    Manual,
    Merge,
}

/// V47.0: 同步冲突
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SyncConflictGql {
    pub conflict_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub client_version: i64,
    pub server_version: i64,
    pub conflict_fields: Vec<String>,
    pub resolution_strategy: ConflictResolutionStrategyGql,
}

/// V47.0: 同步会话
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SyncSessionGql {
    pub session_id: String,
    pub client_id: String,
    pub last_sync_version: i64,
    pub current_version: i64,
    pub pending_updates: i64,
    pub sync_state: SyncStateGql,
    pub started_at: String,
    pub last_sync_at: Option<String>,
}

/// V47.0: 同步统计
#[derive(SimpleObject, Clone)]
pub struct SyncStatsGql {
    pub total_sessions: i64,
    pub active_sessions: i64,
    pub total_conflicts: i64,
    pub resolved_conflicts: i64,
    pub registered_entities: i64,
    pub total_syncs: i64,
}

// --- 内部状态 ---

#[derive(Clone, Serialize, Deserialize)]
struct SyncSessionData {
    session_id: String,
    client_id: String,
    last_sync_version: i64,
    current_version: i64,
    pending_updates: i64,
    sync_state: SyncStateGql,
    started_at: DateTime<Utc>,
    last_sync_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Serialize, Deserialize)]
struct SyncConflictData {
    conflict_id: String,
    entity_type: String,
    entity_id: String,
    client_version: i64,
    server_version: i64,
    conflict_fields: Vec<String>,
    resolution_strategy: ConflictResolutionStrategyGql,
    resolved: bool,
}

struct StateSyncManagerState {
    sessions: Vec<SyncSessionData>,
    conflicts: Vec<SyncConflictData>,
    registered_entities: HashSet<String>,
    total_syncs: u64,
}

impl StateSyncManagerState {
    fn new() -> Self {
        let mut registered_entities = HashSet::new();
        for et in ["order", "inventory", "master_data", "user_profile"] {
            registered_entities.insert(et.to_string());
        }
        Self {
            sessions: Vec::new(),
            conflicts: Vec::new(),
            registered_entities,
            total_syncs: 0,
        }
    }
}

static STATE_SYNC_STATE: std::sync::OnceLock<Mutex<StateSyncManagerState>> =
    std::sync::OnceLock::new();

fn state_sync_state() -> &'static Mutex<StateSyncManagerState> {
    STATE_SYNC_STATE.get_or_init(|| Mutex::new(StateSyncManagerState::new()))
}

/// V47.0: 状态同步管理器
pub struct StateSyncManager;

impl StateSyncManager {
    /// 启动同步会话
    pub fn start_sync(client_id: &str, last_sync_version: i64) -> SyncSessionGql {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        let session = SyncSessionData {
            session_id: uuid_simple(),
            client_id: client_id.to_string(),
            last_sync_version,
            current_version: last_sync_version,
            pending_updates: 0,
            sync_state: SyncStateGql::Syncing,
            started_at: now,
            last_sync_at: None,
        };
        let gql = Self::session_to_gql(&session);
        state.sessions.push(session);
        state.total_syncs += 1;
        gql
    }

    /// 获取同步状态
    pub fn get_sync_state(session_id: &str) -> Option<SyncSessionGql> {
        let state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        state
            .sessions
            .iter()
            .find(|s| s.session_id == session_id)
            .map(Self::session_to_gql)
    }

    /// 解决冲突
    pub fn resolve_conflict(
        conflict_id: &str,
        strategy: ConflictResolutionStrategyGql,
    ) -> Option<SyncConflictGql> {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let conflict = state
            .conflicts
            .iter_mut()
            .find(|c| c.conflict_id == conflict_id)?;
        conflict.resolution_strategy = strategy;
        conflict.resolved = true;
        Some(Self::conflict_to_gql(conflict))
    }

    /// 获取同步历史（可按 client_id 过滤）
    pub fn get_sync_history(client_id: Option<&str>, limit: Option<u32>) -> Vec<SyncSessionGql> {
        let state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(50) as usize;
        state
            .sessions
            .iter()
            .filter(|s| client_id.map(|c| s.client_id == c).unwrap_or(true))
            .rev()
            .take(limit)
            .map(Self::session_to_gql)
            .collect()
    }

    /// 注册需要同步的实体类型
    pub fn register_entity(entity_type: &str) -> bool {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        state.registered_entities.insert(entity_type.to_string());
        true
    }

    /// 获取同步统计
    pub fn get_sync_stats() -> SyncStatsGql {
        let state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let active = state
            .sessions
            .iter()
            .filter(|s| s.sync_state == SyncStateGql::Syncing)
            .count() as i64;
        let total_conflicts = state.conflicts.len() as i64;
        let resolved = state.conflicts.iter().filter(|c| c.resolved).count() as i64;
        SyncStatsGql {
            total_sessions: state.sessions.len() as i64,
            active_sessions: active,
            total_conflicts,
            resolved_conflicts: resolved,
            registered_entities: state.registered_entities.len() as i64,
            total_syncs: state.total_syncs as i64,
        }
    }

    /// 创建冲突记录（用于检测到版本不一致时登记）
    pub fn create_conflict(
        entity_type: &str,
        entity_id: &str,
        client_version: i64,
        server_version: i64,
        conflict_fields: Vec<String>,
    ) -> SyncConflictGql {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let conflict = SyncConflictData {
            conflict_id: uuid_simple(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            client_version,
            server_version,
            conflict_fields,
            resolution_strategy: ConflictResolutionStrategyGql::Manual,
            resolved: false,
        };
        let gql = Self::conflict_to_gql(&conflict);
        state.conflicts.push(conflict);
        gql
    }

    fn session_to_gql(s: &SyncSessionData) -> SyncSessionGql {
        SyncSessionGql {
            session_id: s.session_id.clone(),
            client_id: s.client_id.clone(),
            last_sync_version: s.last_sync_version,
            current_version: s.current_version,
            pending_updates: s.pending_updates,
            sync_state: s.sync_state,
            started_at: s.started_at.to_rfc3339(),
            last_sync_at: s.last_sync_at.map(|t| t.to_rfc3339()),
        }
    }

    fn conflict_to_gql(c: &SyncConflictData) -> SyncConflictGql {
        SyncConflictGql {
            conflict_id: c.conflict_id.clone(),
            entity_type: c.entity_type.clone(),
            entity_id: c.entity_id.clone(),
            client_version: c.client_version,
            server_version: c.server_version,
            conflict_fields: c.conflict_fields.clone(),
            resolution_strategy: c.resolution_strategy,
        }
    }
}

// ==================== V48.0: GraphQL 网关安全 — 零信任架构 + 请求签名 + 数据级权限控制 ====================
//
// 在 V40.0-E（深度/复杂度/速率/IP 黑名单）、V41.0-E（白名单自动化 + 安全报表）和
// V42.0-E（字段级权限 + 数据掩码 + 审计追踪）基础上，构建端到端网关安全体系：
// 1. 零信任架构（ZeroTrustGateway）：持续评估信任等级 + 风险评分 + 策略驱动的验证
// 2. 请求签名验证（RequestSignatureV2）：HMAC/Ed25519/RS256 签名 + 时间窗口 + nonce 防重放
// 3. 数据级权限控制（DataLevelPermissions）：行级过滤 + 字段掩码 + 有效权限合并 + 审计
//
// 状态用 static OnceLock + Mutex 单例存储，与现有代码风格一致。
// 为避免与 V42.0 安全类型（FieldPermission/MaskType/UserRole 等）冲突，
// 所有公开 GraphQL 类型统一加 Gql 后缀；管理器结构保持原名。

// ----------------------------------------------------------------------------
// 内部加密辅助：HMAC-SHA2（sha2 0.10 未引入 hmac crate，按 RFC 2104 手工实现）
// ----------------------------------------------------------------------------

/// V48.0: 通用 HMAC 计算（RFC 2104），block_size 由调用方指定
fn v48_hmac<F>(key: &[u8], msg: &[u8], block_size: usize, hash_fn: F) -> Vec<u8>
where
    F: Fn(&[u8]) -> Vec<u8>,
{
    let mut k = if key.len() > block_size {
        hash_fn(key)
    } else {
        key.to_vec()
    };
    k.resize(block_size, 0);
    let mut ipad = vec![0x36u8; block_size];
    let mut opad = vec![0x5cu8; block_size];
    for i in 0..block_size {
        ipad[i] ^= k[i];
        opad[i] ^= k[i];
    }
    let mut inner_input = ipad;
    inner_input.extend_from_slice(msg);
    let inner = hash_fn(&inner_input);
    let mut outer_input = opad;
    outer_input.extend_from_slice(&inner);
    hash_fn(&outer_input)
}

/// V48.0: HMAC-SHA256
fn v48_hmac_sha256(key: &[u8], msg: &[u8]) -> Vec<u8> {
    v48_hmac(key, msg, 64, |data| {
        use sha2::{Digest, Sha256};
        let mut h = Sha256::new();
        h.update(data);
        h.finalize().to_vec()
    })
}

/// V48.0: HMAC-SHA384
fn v48_hmac_sha384(key: &[u8], msg: &[u8]) -> Vec<u8> {
    v48_hmac(key, msg, 128, |data| {
        use sha2::{Digest, Sha384};
        let mut h = Sha384::new();
        h.update(data);
        h.finalize().to_vec()
    })
}

/// V48.0: HMAC-SHA512
fn v48_hmac_sha512(key: &[u8], msg: &[u8]) -> Vec<u8> {
    v48_hmac(key, msg, 128, |data| {
        use sha2::{Digest, Sha512};
        let mut h = Sha512::new();
        h.update(data);
        h.finalize().to_vec()
    })
}

/// V48.0: 字节序列十六进制编码
fn v48_hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// V48.0: SHA256 哈希（十六进制输出，用于 body_hash）
fn v48_sha256_hex(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(data);
    v48_hex_encode(&h.finalize())
}

// ==================== V48.0: 1. 零信任架构（ZeroTrustGateway） ====================

/// V48.0: 信任等级
#[derive(
    Debug,
    Clone,
    Copy,
    Serialize,
    Deserialize,
    async_graphql::Enum,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Hash,
)]
pub enum TrustLevelGql {
    Untrusted,
    LowTrust,
    MediumTrust,
    HighTrust,
    FullyTrusted,
}

impl TrustLevelGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Untrusted => "untrusted",
            Self::LowTrust => "low_trust",
            Self::MediumTrust => "medium_trust",
            Self::HighTrust => "high_trust",
            Self::FullyTrusted => "fully_trusted",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "untrusted" => Self::Untrusted,
            "low_trust" => Self::LowTrust,
            "medium_trust" => Self::MediumTrust,
            "high_trust" => Self::HighTrust,
            "fully_trusted" => Self::FullyTrusted,
            _ => Self::Untrusted,
        }
    }

    /// 由风险评分映射到信任等级（分数越低信任越高）
    pub fn from_risk_score(score: u32) -> Self {
        match score {
            0..=20 => Self::FullyTrusted,
            21..=40 => Self::HighTrust,
            41..=60 => Self::MediumTrust,
            61..=80 => Self::LowTrust,
            _ => Self::Untrusted,
        }
    }
}

/// V48.0: 验证因子类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum VerificationFactorGql {
    Password,
    MFA,
    Biometric,
    DeviceCertificate,
    IPAllowlist,
    GeoFence,
    TimeWindow,
    Behavioral,
}

impl VerificationFactorGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Password => "password",
            Self::MFA => "mfa",
            Self::Biometric => "biometric",
            Self::DeviceCertificate => "device_certificate",
            Self::IPAllowlist => "ip_allowlist",
            Self::GeoFence => "geo_fence",
            Self::TimeWindow => "time_window",
            Self::Behavioral => "behavioral",
        }
    }
}

/// V48.0: 风险因子
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct RiskFactorGql {
    pub factor_type: String,
    pub severity: String,
    pub description: String,
    pub weight: i32,
}

/// V48.0: 风险评分
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct RiskScoreGql {
    pub total_score: i32,
    pub level: String,
    pub factors: Vec<RiskFactorGql>,
    pub assessed_at: String,
}

/// V48.0: 信任上下文
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct TrustContextGql {
    pub client_id: String,
    pub user_id: Option<String>,
    pub device_id: Option<String>,
    pub ip_address: String,
    pub geo_location: Option<String>,
    pub device_fingerprint: Option<String>,
    pub trust_level: TrustLevelGql,
    pub risk_score: i32,
    pub verification_factors: Vec<String>,
    pub assessed_at: String,
}

/// V48.0: 零信任策略
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ZeroTrustPolicyGql {
    pub policy_id: String,
    pub name: String,
    pub required_trust_level: TrustLevelGql,
    pub max_risk_score: i32,
    pub required_verification_factors: Vec<String>,
    pub resource_patterns: Vec<String>,
}

/// V48.0: 零信任统计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ZeroTrustStatsGql {
    pub total_assessments: i64,
    pub avg_risk_score: f64,
    pub by_trust_level: Vec<String>,
    pub blocked_requests: i64,
    pub verification_challenges: i64,
}

/// V48.0: 内部风险因子
#[derive(Debug, Clone, Serialize, Deserialize)]
struct RiskFactor {
    factor_type: String,
    severity: String,
    description: String,
    weight: i32,
}

impl RiskFactor {
    fn to_gql(&self) -> RiskFactorGql {
        RiskFactorGql {
            factor_type: self.factor_type.clone(),
            severity: self.severity.clone(),
            description: self.description.clone(),
            weight: self.weight,
        }
    }
}

/// V48.0: 内部风险评分
#[derive(Debug, Clone)]
struct RiskScore {
    total_score: i32,
    level: String,
    factors: Vec<RiskFactor>,
    assessed_at: DateTime<Utc>,
}

impl RiskScore {
    fn to_gql(&self) -> RiskScoreGql {
        RiskScoreGql {
            total_score: self.total_score,
            level: self.level.clone(),
            factors: self.factors.iter().map(|f| f.to_gql()).collect(),
            assessed_at: self.assessed_at.to_rfc3339(),
        }
    }
}

/// V48.0: 内部信任上下文
#[derive(Debug, Clone)]
struct TrustContext {
    client_id: String,
    user_id: Option<String>,
    device_id: Option<String>,
    ip_address: String,
    geo_location: Option<String>,
    device_fingerprint: Option<String>,
    trust_level: TrustLevelGql,
    risk_score: i32,
    verification_factors: Vec<VerificationFactorGql>,
    assessed_at: DateTime<Utc>,
}

impl TrustContext {
    fn to_gql(&self) -> TrustContextGql {
        TrustContextGql {
            client_id: self.client_id.clone(),
            user_id: self.user_id.clone(),
            device_id: self.device_id.clone(),
            ip_address: self.ip_address.clone(),
            geo_location: self.geo_location.clone(),
            device_fingerprint: self.device_fingerprint.clone(),
            trust_level: self.trust_level,
            risk_score: self.risk_score,
            verification_factors: self
                .verification_factors
                .iter()
                .map(|f| f.as_str().to_string())
                .collect(),
            assessed_at: self.assessed_at.to_rfc3339(),
        }
    }
}

/// V48.0: 内部零信任策略
#[derive(Debug, Clone)]
struct ZeroTrustPolicy {
    policy_id: String,
    name: String,
    required_trust_level: TrustLevelGql,
    max_risk_score: i32,
    required_verification_factors: Vec<VerificationFactorGql>,
    resource_patterns: Vec<String>,
}

impl ZeroTrustPolicy {
    fn to_gql(&self) -> ZeroTrustPolicyGql {
        ZeroTrustPolicyGql {
            policy_id: self.policy_id.clone(),
            name: self.name.clone(),
            required_trust_level: self.required_trust_level,
            max_risk_score: self.max_risk_score,
            required_verification_factors: self
                .required_verification_factors
                .iter()
                .map(|f| f.as_str().to_string())
                .collect(),
            resource_patterns: self.resource_patterns.clone(),
        }
    }
}

/// V48.0: 零信任网关状态
struct ZeroTrustState {
    contexts: HashMap<String, TrustContext>,
    policies: HashMap<String, ZeroTrustPolicy>,
    total_assessments: u64,
    total_risk_score: u64,
    by_trust_level: HashMap<TrustLevelGql, u64>,
    blocked_requests: u64,
    verification_challenges: u64,
}

impl ZeroTrustState {
    fn new() -> Self {
        Self {
            contexts: HashMap::new(),
            policies: HashMap::new(),
            total_assessments: 0,
            total_risk_score: 0,
            by_trust_level: HashMap::new(),
            blocked_requests: 0,
            verification_challenges: 0,
        }
    }
}

static ZERO_TRUST_STATE: std::sync::OnceLock<Mutex<ZeroTrustState>> = std::sync::OnceLock::new();

fn zero_trust_state() -> &'static Mutex<ZeroTrustState> {
    ZERO_TRUST_STATE.get_or_init(|| Mutex::new(ZeroTrustState::new()))
}

/// V48.0: 零信任网关
pub struct ZeroTrustGateway;

impl ZeroTrustGateway {
    /// 评估信任等级（综合已知上下文 + 风险因子，写入信任上下文）
    pub fn assess_trust(
        client_id: &str,
        ip_address: &str,
        user_id: Option<&str>,
        device_id: Option<&str>,
        geo_location: Option<&str>,
        device_fingerprint: Option<&str>,
        verification_factors: Vec<VerificationFactorGql>,
    ) -> TrustContextGql {
        let risk = Self::calculate_risk_inner(
            ip_address,
            geo_location,
            device_id,
            device_fingerprint,
            &verification_factors,
        );
        let trust_level = TrustLevelGql::from_risk_score(risk.total_score as u32);
        let now = Utc::now();
        let ctx = TrustContext {
            client_id: client_id.to_string(),
            user_id: user_id.map(|s| s.to_string()),
            device_id: device_id.map(|s| s.to_string()),
            ip_address: ip_address.to_string(),
            geo_location: geo_location.map(|s| s.to_string()),
            device_fingerprint: device_fingerprint.map(|s| s.to_string()),
            trust_level,
            risk_score: risk.total_score,
            verification_factors,
            assessed_at: now,
        };
        let gql = ctx.to_gql();
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        state.contexts.insert(client_id.to_string(), ctx);
        state.total_assessments += 1;
        state.total_risk_score += risk.total_score as u64;
        *state.by_trust_level.entry(trust_level).or_insert(0) += 1;
        gql
    }

    /// 计算风险评分（暴露入口，返回结构化评分）
    pub fn calculate_risk(
        ip_address: &str,
        geo_location: Option<&str>,
        device_id: Option<&str>,
        device_fingerprint: Option<&str>,
        verification_factors: &[VerificationFactorGql],
    ) -> RiskScoreGql {
        Self::calculate_risk_inner(
            ip_address,
            geo_location,
            device_id,
            device_fingerprint,
            verification_factors,
        )
        .to_gql()
    }

    fn calculate_risk_inner(
        ip_address: &str,
        geo_location: Option<&str>,
        device_id: Option<&str>,
        device_fingerprint: Option<&str>,
        verification_factors: &[VerificationFactorGql],
    ) -> RiskScore {
        let mut factors: Vec<RiskFactor> = Vec::new();

        // 未知设备
        if device_id.is_none() && device_fingerprint.is_none() {
            factors.push(RiskFactor {
                factor_type: "unknown_device".into(),
                severity: "high".into(),
                description: "请求未携带设备标识".into(),
                weight: 25,
            });
        }
        // 内网/可信 IP 简单判定
        let is_internal = ip_address.starts_with("10.")
            || ip_address.starts_with("192.168.")
            || ip_address.starts_with("172.");
        if !is_internal {
            factors.push(RiskFactor {
                factor_type: "external_ip".into(),
                severity: "medium".into(),
                description: "请求来自外网 IP".into(),
                weight: 15,
            });
        }
        // 异地/未知地理位置
        if let Some(geo) = geo_location {
            if geo.trim().is_empty() || geo.contains("unknown") {
                factors.push(RiskFactor {
                    factor_type: "unknown_geo".into(),
                    severity: "medium".into(),
                    description: "无法解析地理位置".into(),
                    weight: 10,
                });
            }
        }
        // 验证因子不足
        let factor_count = verification_factors.len();
        if factor_count == 0 {
            factors.push(RiskFactor {
                factor_type: "no_verification".into(),
                severity: "critical".into(),
                description: "未提供任何验证因子".into(),
                weight: 30,
            });
        } else if factor_count == 1 {
            factors.push(RiskFactor {
                factor_type: "weak_verification".into(),
                severity: "low".into(),
                description: "仅单一验证因子".into(),
                weight: 8,
            });
        }

        let total_score: i32 = factors.iter().map(|f| f.weight).sum::<i32>().min(100);
        let level = match total_score {
            0..=20 => "low",
            21..=40 => "moderate",
            41..=60 => "elevated",
            61..=80 => "high",
            _ => "critical",
        }
        .to_string();
        RiskScore {
            total_score,
            level,
            factors,
            assessed_at: Utc::now(),
        }
    }

    /// 评估零信任策略（返回是否放行 + 缺失项列表）
    pub fn evaluate_policy(policy_id: &str, client_id: &str) -> (bool, Vec<String>) {
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        let policy = match state.policies.get(policy_id) {
            Some(p) => p.clone(),
            None => {
                state.blocked_requests += 1;
                return (false, vec!["policy_not_found".into()]);
            }
        };
        let ctx = match state.contexts.get(client_id) {
            Some(c) => c.clone(),
            None => {
                state.blocked_requests += 1;
                return (false, vec!["no_trust_context".into()]);
            }
        };

        let mut missing: Vec<String> = Vec::new();
        if ctx.trust_level < policy.required_trust_level {
            missing.push(format!(
                "trust_level_required:{:?}",
                policy.required_trust_level
            ));
        }
        if ctx.risk_score > policy.max_risk_score {
            missing.push(format!("risk_score_exceeded:{}", ctx.risk_score));
        }
        for req in &policy.required_verification_factors {
            if !ctx.verification_factors.contains(req) {
                missing.push(req.as_str().to_string());
            }
        }

        let allowed = missing.is_empty();
        if !allowed {
            state.blocked_requests += 1;
        }
        (allowed, missing)
    }

    /// 要求额外验证（触发验证挑战并补齐验证因子）
    pub fn require_verification(
        client_id: &str,
        factors: Vec<VerificationFactorGql>,
    ) -> Option<TrustContextGql> {
        // 持有锁期间只访问 contexts 字段：补齐验证因子并重算风险
        let gql = {
            let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
            let ctx = state.contexts.get_mut(client_id)?;
            for f in &factors {
                if !ctx.verification_factors.contains(f) {
                    ctx.verification_factors.push(*f);
                }
            }
            // 补齐验证因子后降低风险评分
            ctx.risk_score = (ctx.risk_score - factors.len() as i32 * 10).max(0);
            ctx.trust_level = TrustLevelGql::from_risk_score(ctx.risk_score as u32);
            ctx.assessed_at = Utc::now();
            ctx.to_gql()
        };
        // 释放 contexts 借用后再累加验证挑战计数（避免对 MutexGuard 重复可变借用）
        {
            let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
            state.verification_challenges += 1;
        }
        Some(gql)
    }

    /// 注册零信任策略
    pub fn register_policy(
        name: &str,
        required_trust_level: TrustLevelGql,
        max_risk_score: i32,
        required_verification_factors: Vec<VerificationFactorGql>,
        resource_patterns: Vec<String>,
    ) -> ZeroTrustPolicyGql {
        let policy = ZeroTrustPolicy {
            policy_id: uuid_simple(),
            name: name.to_string(),
            required_trust_level,
            max_risk_score,
            required_verification_factors,
            resource_patterns,
        };
        let gql = policy.to_gql();
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        state.policies.insert(gql.policy_id.clone(), policy);
        gql
    }

    /// 获取信任上下文
    pub fn get_trust_context(client_id: &str) -> Option<TrustContextGql> {
        let state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        state.contexts.get(client_id).map(|c| c.to_gql())
    }

    /// 撤销信任（移除信任上下文，后续请求需重新评估）
    pub fn revoke_trust(client_id: &str) -> bool {
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        let existed = state.contexts.remove(client_id).is_some();
        if existed {
            state.blocked_requests += 1;
        }
        existed
    }

    /// 获取零信任统计
    pub fn get_stats() -> ZeroTrustStatsGql {
        let state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        let avg = if state.total_assessments > 0 {
            state.total_risk_score as f64 / state.total_assessments as f64
        } else {
            0.0
        };
        let mut by_level: Vec<String> = Vec::new();
        for lvl in [
            TrustLevelGql::Untrusted,
            TrustLevelGql::LowTrust,
            TrustLevelGql::MediumTrust,
            TrustLevelGql::HighTrust,
            TrustLevelGql::FullyTrusted,
        ] {
            let count = state.by_trust_level.get(&lvl).copied().unwrap_or(0);
            by_level.push(format!("{}:{}", lvl.as_str(), count));
        }
        ZeroTrustStatsGql {
            total_assessments: state.total_assessments as i64,
            avg_risk_score: avg,
            by_trust_level: by_level,
            blocked_requests: state.blocked_requests as i64,
            verification_challenges: state.verification_challenges as i64,
        }
    }
}

// ==================== V48.0: 2. 请求签名验证（RequestSignatureV2） ====================

/// V48.0: 签名算法
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum SignatureAlgorithmGql {
    HMACSHA256,
    HMACSHA384,
    HMACSHA512,
    Ed25519,
    RS256,
}

impl SignatureAlgorithmGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::HMACSHA256 => "HMAC-SHA256",
            Self::HMACSHA384 => "HMAC-SHA384",
            Self::HMACSHA512 => "HMAC-SHA512",
            Self::Ed25519 => "Ed25519",
            Self::RS256 => "RS256",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "HMAC-SHA256" | "HMACSHA256" => Self::HMACSHA256,
            "HMAC-SHA384" | "HMACSHA384" => Self::HMACSHA384,
            "HMAC-SHA512" | "HMACSHA512" => Self::HMACSHA512,
            "Ed25519" => Self::Ed25519,
            "RS256" => Self::RS256,
            _ => Self::HMACSHA256,
        }
    }
}

/// V48.0: 签名拒绝原因
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum RejectionReasonGql {
    InvalidSignature,
    ExpiredTimestamp,
    ReplayedNonce,
    UnknownKey,
    MissingSignature,
    AlgorithmMismatch,
}

impl RejectionReasonGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::InvalidSignature => "invalid_signature",
            Self::ExpiredTimestamp => "expired_timestamp",
            Self::ReplayedNonce => "replayed_nonce",
            Self::UnknownKey => "unknown_key",
            Self::MissingSignature => "missing_signature",
            Self::AlgorithmMismatch => "algorithm_mismatch",
        }
    }
}

/// V48.0: 签名配置
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SignatureConfigGql {
    pub algorithm: SignatureAlgorithmGql,
    pub key_id: String,
    pub timestamp_window_seconds: i32,
    pub nonce_cache_size: i32,
    pub require_signature: bool,
}

/// V48.0: 已签名请求
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SignedRequestGql {
    pub request_id: String,
    pub signature: String,
    pub timestamp: i64,
    pub nonce: String,
    pub algorithm: SignatureAlgorithmGql,
    pub key_id: String,
    pub body_hash: String,
}

/// V48.0: 密钥信息
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct KeyInfoGql {
    pub key_id: String,
    pub algorithm: SignatureAlgorithmGql,
    pub created_at: String,
    pub revoked: bool,
    pub revoked_at: Option<String>,
    pub sign_count: i64,
}

/// V48.0: 签名统计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SignatureStatsGql {
    pub total_verified: i64,
    pub total_rejected: i64,
    pub rejection_reasons: Vec<String>,
    pub avg_verify_time_ms: f64,
}

/// V48.0: 内部签名密钥
#[derive(Debug, Clone)]
struct SignatureKey {
    key_id: String,
    algorithm: SignatureAlgorithmGql,
    key_secret: Vec<u8>,
    created_at: DateTime<Utc>,
    revoked: bool,
    revoked_at: Option<DateTime<Utc>>,
    sign_count: u64,
}

impl SignatureKey {
    fn to_gql(&self) -> KeyInfoGql {
        KeyInfoGql {
            key_id: self.key_id.clone(),
            algorithm: self.algorithm,
            created_at: self.created_at.to_rfc3339(),
            revoked: self.revoked,
            revoked_at: self.revoked_at.map(|t| t.to_rfc3339()),
            sign_count: self.sign_count as i64,
        }
    }
}

/// V48.0: 内部签名配置
#[derive(Debug, Clone)]
struct SignatureConfig {
    algorithm: SignatureAlgorithmGql,
    key_id: String,
    timestamp_window_seconds: i32,
    nonce_cache_size: usize,
    require_signature: bool,
}

impl SignatureConfig {
    fn to_gql(&self) -> SignatureConfigGql {
        SignatureConfigGql {
            algorithm: self.algorithm,
            key_id: self.key_id.clone(),
            timestamp_window_seconds: self.timestamp_window_seconds,
            nonce_cache_size: self.nonce_cache_size as i32,
            require_signature: self.require_signature,
        }
    }
}

/// V48.0: 请求签名验证器状态
struct RequestSignatureState {
    keys: HashMap<String, SignatureKey>,
    config: SignatureConfig,
    nonce_cache: VecDeque<String>,
    total_verified: u64,
    total_rejected: u64,
    rejection_reasons: HashMap<RejectionReasonGql, u64>,
    total_verify_time_ms: u64,
}

impl RequestSignatureState {
    fn new() -> Self {
        let default_key = SignatureKey {
            key_id: "v48-default-key".into(),
            algorithm: SignatureAlgorithmGql::HMACSHA256,
            key_secret: b"topems-v48-default-secret".to_vec(),
            created_at: Utc::now(),
            revoked: false,
            revoked_at: None,
            sign_count: 0,
        };
        let mut keys = HashMap::new();
        keys.insert(default_key.key_id.clone(), default_key);
        Self {
            keys,
            config: SignatureConfig {
                algorithm: SignatureAlgorithmGql::HMACSHA256,
                key_id: "v48-default-key".into(),
                timestamp_window_seconds: 300,
                nonce_cache_size: 10000,
                require_signature: true,
            },
            nonce_cache: VecDeque::new(),
            total_verified: 0,
            total_rejected: 0,
            rejection_reasons: HashMap::new(),
            total_verify_time_ms: 0,
        }
    }
}

static REQUEST_SIGNATURE_STATE: std::sync::OnceLock<Mutex<RequestSignatureState>> =
    std::sync::OnceLock::new();

fn request_signature_state() -> &'static Mutex<RequestSignatureState> {
    REQUEST_SIGNATURE_STATE.get_or_init(|| Mutex::new(RequestSignatureState::new()))
}

/// V48.0: 按算法计算签名
///
/// Ed25519/RS256 在未引入 ed25519-dalek/rsa crate 时回退到 HMAC-SHA256，
/// 保证签名与验证对称可执行；生产构建应替换为真正的非对称算法实现。
fn v48_compute_signature(algorithm: SignatureAlgorithmGql, key: &[u8], message: &[u8]) -> String {
    match algorithm {
        SignatureAlgorithmGql::HMACSHA256 => v48_hex_encode(&v48_hmac_sha256(key, message)),
        SignatureAlgorithmGql::HMACSHA384 => v48_hex_encode(&v48_hmac_sha384(key, message)),
        SignatureAlgorithmGql::HMACSHA512 => v48_hex_encode(&v48_hmac_sha512(key, message)),
        SignatureAlgorithmGql::Ed25519 | SignatureAlgorithmGql::RS256 => {
            v48_hex_encode(&v48_hmac_sha256(key, message))
        }
    }
}

/// V48.0: 请求签名验证器 V2
pub struct RequestSignatureV2;

impl RequestSignatureV2 {
    /// 签名请求（生成签名 + nonce + body_hash）
    pub fn sign_request(
        key_id: &str,
        body: &str,
        algorithm: Option<SignatureAlgorithmGql>,
    ) -> Option<SignedRequestGql> {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let key = state.keys.get_mut(key_id)?;
        if key.revoked {
            return None;
        }
        let algo = algorithm.unwrap_or(key.algorithm);
        let timestamp = Utc::now().timestamp();
        let nonce = Self::generate_nonce_inner();
        let body_hash = v48_sha256_hex(body.as_bytes());
        // 签名消息：key_id|timestamp|nonce|body_hash
        let message = format!("{}|{}|{}|{}", key_id, timestamp, nonce, body_hash);
        let signature = v48_compute_signature(algo, &key.key_secret, message.as_bytes());
        key.sign_count += 1;
        Some(SignedRequestGql {
            request_id: uuid_simple(),
            signature,
            timestamp,
            nonce,
            algorithm: algo,
            key_id: key_id.to_string(),
            body_hash,
        })
    }

    /// 验证签名（时间窗口 + nonce 防重放 + 哈希匹配 + 签名匹配）
    pub fn verify_signature(req: &SignedRequestGql, body: &str) -> Result<(), RejectionReasonGql> {
        let started = Utc::now().timestamp_millis();
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());

        // 1. 缺失签名
        if req.signature.is_empty() {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::MissingSignature,
                started,
            ));
        }
        // 2. 未知/已吊销密钥
        let key = match state.keys.get(&req.key_id) {
            Some(k) if !k.revoked => k.clone(),
            _ => {
                return Err(Self::record_rejection(
                    &mut state,
                    RejectionReasonGql::UnknownKey,
                    started,
                ))
            }
        };
        // 3. 算法不匹配
        if key.algorithm != req.algorithm {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::AlgorithmMismatch,
                started,
            ));
        }
        // 4. 时间窗口
        let now = Utc::now().timestamp();
        let window = state.config.timestamp_window_seconds as i64;
        if (now - req.timestamp).abs() > window {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::ExpiredTimestamp,
                started,
            ));
        }
        // 5. nonce 防重放
        if !Self::validate_nonce_inner(&mut state, &req.nonce) {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::ReplayedNonce,
                started,
            ));
        }
        // 6. body 哈希匹配
        let body_hash = v48_sha256_hex(body.as_bytes());
        if body_hash != req.body_hash {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::InvalidSignature,
                started,
            ));
        }
        // 7. 签名匹配
        let message = format!(
            "{}|{}|{}|{}",
            req.key_id, req.timestamp, req.nonce, req.body_hash
        );
        let expected = v48_compute_signature(req.algorithm, &key.key_secret, message.as_bytes());
        if expected != req.signature {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::InvalidSignature,
                started,
            ));
        }

        let elapsed = (Utc::now().timestamp_millis() - started) as u64;
        state.total_verified += 1;
        state.total_verify_time_ms += elapsed;
        Ok(())
    }

    /// 记录拒绝并返回拒绝原因
    fn record_rejection(
        state: &mut RequestSignatureState,
        reason: RejectionReasonGql,
        started: i64,
    ) -> RejectionReasonGql {
        state.total_rejected += 1;
        *state.rejection_reasons.entry(reason).or_insert(0) += 1;
        state.total_verify_time_ms += (Utc::now().timestamp_millis() - started) as u64;
        reason
    }

    /// 生成 nonce（时间戳 + 随机数，十六进制）
    pub fn generate_nonce() -> String {
        Self::generate_nonce_inner()
    }

    fn generate_nonce_inner() -> String {
        let now = Utc::now().timestamp_millis() as u64;
        let rand = {
            use std::collections::hash_map::RandomState;
            use std::hash::{BuildHasher, Hasher};
            let s = RandomState::new();
            let mut h = s.build_hasher();
            h.write_u64(now);
            h.finish()
        };
        format!("{:x}{:x}", now, rand)
    }

    /// 验证 nonce 唯一性（true = 首次出现并记录；false = 重放）
    pub fn validate_nonce(nonce: &str) -> bool {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Self::validate_nonce_inner(&mut state, nonce)
    }

    fn validate_nonce_inner(state: &mut RequestSignatureState, nonce: &str) -> bool {
        if state.nonce_cache.iter().any(|n| n == nonce) {
            return false;
        }
        state.nonce_cache.push_back(nonce.to_string());
        while state.nonce_cache.len() > state.config.nonce_cache_size {
            state.nonce_cache.pop_front();
        }
        true
    }

    /// 轮换密钥（生成新 key_id + secret，旧密钥标记为已吊销）
    pub fn rotate_key(
        old_key_id: &str,
        new_algorithm: Option<SignatureAlgorithmGql>,
        new_secret: Option<&str>,
    ) -> Option<KeyInfoGql> {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let old = state.keys.get_mut(old_key_id)?;
        let algo = new_algorithm.unwrap_or(old.algorithm);
        let secret = new_secret
            .map(|s| s.as_bytes().to_vec())
            .unwrap_or_else(|| {
                format!("{}-rotated-{}", old_key_id, Utc::now().timestamp_millis()).into_bytes()
            });
        let new_key = SignatureKey {
            key_id: format!("v48-{}", uuid_simple()),
            algorithm: algo,
            key_secret: secret,
            created_at: Utc::now(),
            revoked: false,
            revoked_at: None,
            sign_count: 0,
        };
        // 旧密钥标记为已轮换（吊销）
        old.revoked = true;
        old.revoked_at = Some(Utc::now());
        let gql = new_key.to_gql();
        state.keys.insert(new_key.key_id.clone(), new_key);
        // 默认配置指向新密钥
        state.config.algorithm = algo;
        state.config.key_id = gql.key_id.clone();
        Some(gql)
    }

    /// 获取密钥信息
    pub fn get_key_info(key_id: &str) -> Option<KeyInfoGql> {
        let state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.keys.get(key_id).map(|k| k.to_gql())
    }

    /// 吊销密钥
    pub fn revoke_key(key_id: &str) -> bool {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(k) = state.keys.get_mut(key_id) {
            if k.revoked {
                return false;
            }
            k.revoked = true;
            k.revoked_at = Some(Utc::now());
            return true;
        }
        false
    }

    /// 获取当前签名配置
    pub fn get_config() -> SignatureConfigGql {
        let state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config.to_gql()
    }

    /// 获取签名统计
    pub fn get_stats() -> SignatureStatsGql {
        let state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let total = state.total_verified + state.total_rejected;
        let avg = if total > 0 {
            state.total_verify_time_ms as f64 / total as f64
        } else {
            0.0
        };
        let mut reasons: Vec<String> = Vec::new();
        for r in [
            RejectionReasonGql::InvalidSignature,
            RejectionReasonGql::ExpiredTimestamp,
            RejectionReasonGql::ReplayedNonce,
            RejectionReasonGql::UnknownKey,
            RejectionReasonGql::MissingSignature,
            RejectionReasonGql::AlgorithmMismatch,
        ] {
            let count = state.rejection_reasons.get(&r).copied().unwrap_or(0);
            reasons.push(format!("{}:{}", r.as_str(), count));
        }
        SignatureStatsGql {
            total_verified: state.total_verified as i64,
            total_rejected: state.total_rejected as i64,
            rejection_reasons: reasons,
            avg_verify_time_ms: avg,
        }
    }
}

// ==================== V48.0: 3. 数据级权限控制（DataLevelPermissions） ====================

/// V48.0: 权限级别
#[derive(
    Debug,
    Clone,
    Copy,
    Serialize,
    Deserialize,
    async_graphql::Enum,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Hash,
)]
pub enum PermissionLevelGql {
    None,
    Read,
    Write,
    Delete,
    Admin,
    Owner,
}

impl PermissionLevelGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Read => "read",
            Self::Write => "write",
            Self::Delete => "delete",
            Self::Admin => "admin",
            Self::Owner => "owner",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "none" => Self::None,
            "read" => Self::Read,
            "write" => Self::Write,
            "delete" => Self::Delete,
            "admin" => Self::Admin,
            "owner" => Self::Owner,
            _ => Self::None,
        }
    }
}

/// V48.0: 主体类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum PrincipalTypeGql {
    User,
    Role,
    Group,
    ServiceAccount,
    Department,
}

impl PrincipalTypeGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Role => "role",
            Self::Group => "group",
            Self::ServiceAccount => "service_account",
            Self::Department => "department",
        }
    }
}

/// V48.0: 字段掩码策略
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq)]
pub enum MaskStrategyGql {
    None,
    Partial,
    Hash,
    Encrypt,
    Redact,
    Custom,
}

impl MaskStrategyGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Partial => "partial",
            Self::Hash => "hash",
            Self::Encrypt => "encrypt",
            Self::Redact => "redact",
            Self::Custom => "custom",
        }
    }
}

/// V48.0: 行级过滤条件
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct PermissionConditionGql {
    pub field: String,
    pub operator: String,
    pub value: String,
}

/// V48.0: 字段权限（数据级，与 V42.0 FieldPermission 区别命名）
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataFieldPermissionGql {
    pub field_name: String,
    pub allowed_levels: Vec<String>,
    pub mask_strategy: MaskStrategyGql,
}

/// V48.0: 数据权限
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataPermissionGql {
    pub permission_id: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub principal_type: PrincipalTypeGql,
    pub principal_id: String,
    pub permission_level: PermissionLevelGql,
    pub conditions: Vec<PermissionConditionGql>,
    pub field_permissions: Vec<DataFieldPermissionGql>,
    pub granted_by: String,
    pub granted_at: String,
    pub expires_at: Option<String>,
}

/// V48.0: 权限审计日志
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct PermissionAuditLogGql {
    pub action: String,
    pub principal: String,
    pub resource: String,
    pub permission_level: String,
    pub timestamp: String,
    pub result: String,
}

/// V48.0: 数据权限统计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataPermissionStatsGql {
    pub total_permissions: i64,
    pub by_principal_type: Vec<String>,
    pub by_permission_level: Vec<String>,
    pub audit_logs: i64,
    pub masked_fields: i64,
}

/// V48.0: 内部行级过滤条件
#[derive(Debug, Clone, Serialize, Deserialize)]
struct PermissionCondition {
    field: String,
    operator: String,
    value: String,
}

impl PermissionCondition {
    fn to_gql(&self) -> PermissionConditionGql {
        PermissionConditionGql {
            field: self.field.clone(),
            operator: self.operator.clone(),
            value: self.value.clone(),
        }
    }

    /// 判断单行是否满足该条件
    fn matches(&self, row: &serde_json::Value) -> bool {
        let actual = match row.get(&self.field) {
            Some(v) => v,
            None => return false,
        };
        match self.operator.as_str() {
            "eq" => v48_json_eq(actual, &serde_json::Value::String(self.value.clone())),
            "ne" => !v48_json_eq(actual, &serde_json::Value::String(self.value.clone())),
            "in" => self
                .value
                .split(',')
                .map(|s| s.trim().to_string())
                .any(|s| v48_json_eq(actual, &serde_json::Value::String(s))),
            _ => true,
        }
    }
}

/// V48.0: JSON 值相等比较（字符串/原始值统一处理）
fn v48_json_eq(a: &serde_json::Value, b: &serde_json::Value) -> bool {
    match (a, b) {
        (serde_json::Value::String(x), serde_json::Value::String(y)) => x == y,
        _ => a == b,
    }
}

/// V48.0: 内部字段权限
#[derive(Debug, Clone)]
struct DataFieldPermission {
    field_name: String,
    allowed_levels: Vec<PermissionLevelGql>,
    mask_strategy: MaskStrategyGql,
}

impl DataFieldPermission {
    fn to_gql(&self) -> DataFieldPermissionGql {
        DataFieldPermissionGql {
            field_name: self.field_name.clone(),
            allowed_levels: self
                .allowed_levels
                .iter()
                .map(|l| l.as_str().to_string())
                .collect(),
            mask_strategy: self.mask_strategy,
        }
    }
}

/// V48.0: 内部数据权限
#[derive(Debug, Clone)]
struct DataPermission {
    permission_id: String,
    resource_type: String,
    resource_id: Option<String>,
    principal_type: PrincipalTypeGql,
    principal_id: String,
    permission_level: PermissionLevelGql,
    conditions: Vec<PermissionCondition>,
    field_permissions: Vec<DataFieldPermission>,
    granted_by: String,
    granted_at: DateTime<Utc>,
    expires_at: Option<DateTime<Utc>>,
}

impl DataPermission {
    fn to_gql(&self) -> DataPermissionGql {
        DataPermissionGql {
            permission_id: self.permission_id.clone(),
            resource_type: self.resource_type.clone(),
            resource_id: self.resource_id.clone(),
            principal_type: self.principal_type,
            principal_id: self.principal_id.clone(),
            permission_level: self.permission_level,
            conditions: self.conditions.iter().map(|c| c.to_gql()).collect(),
            field_permissions: self.field_permissions.iter().map(|f| f.to_gql()).collect(),
            granted_by: self.granted_by.clone(),
            granted_at: self.granted_at.to_rfc3339(),
            expires_at: self.expires_at.map(|t| t.to_rfc3339()),
        }
    }

    fn is_expired(&self) -> bool {
        match self.expires_at {
            Some(t) => Utc::now() > t,
            None => false,
        }
    }
}

/// V48.0: 内部权限审计日志
#[derive(Debug, Clone)]
struct PermissionAuditLog {
    action: String,
    principal: String,
    resource: String,
    permission_level: PermissionLevelGql,
    timestamp: DateTime<Utc>,
    result: String,
}

impl PermissionAuditLog {
    fn to_gql(&self) -> PermissionAuditLogGql {
        PermissionAuditLogGql {
            action: self.action.clone(),
            principal: self.principal.clone(),
            resource: self.resource.clone(),
            permission_level: self.permission_level.as_str().to_string(),
            timestamp: self.timestamp.to_rfc3339(),
            result: self.result.clone(),
        }
    }
}

/// V48.0: 数据权限状态
struct DataPermissionState {
    permissions: HashMap<String, DataPermission>,
    audit_logs: VecDeque<PermissionAuditLog>,
    masked_field_count: u64,
}

impl DataPermissionState {
    fn new() -> Self {
        Self {
            permissions: HashMap::new(),
            audit_logs: VecDeque::new(),
            masked_field_count: 0,
        }
    }
}

static DATA_PERMISSION_STATE: std::sync::OnceLock<Mutex<DataPermissionState>> =
    std::sync::OnceLock::new();

fn data_permission_state() -> &'static Mutex<DataPermissionState> {
    DATA_PERMISSION_STATE.get_or_init(|| Mutex::new(DataPermissionState::new()))
}

/// V48.0: 审计日志环形缓冲上限
const V48_AUDIT_LOG_MAX: usize = 2000;

/// V48.0: 写入审计日志（环形缓冲）
fn v48_push_audit(log: PermissionAuditLog) {
    let mut state = data_permission_state()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.audit_logs.push_back(log);
    while state.audit_logs.len() > V48_AUDIT_LOG_MAX {
        state.audit_logs.pop_front();
    }
}

/// V48.0: 数据级权限控制
pub struct DataLevelPermissions;

impl DataLevelPermissions {
    /// 授予权限
    pub fn grant_permission(
        resource_type: &str,
        resource_id: Option<&str>,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
        permission_level: PermissionLevelGql,
        conditions: Vec<PermissionConditionGql>,
        field_permissions: Vec<DataFieldPermissionGql>,
        granted_by: &str,
        expires_at: Option<DateTime<Utc>>,
    ) -> DataPermissionGql {
        let perm = DataPermission {
            permission_id: uuid_simple(),
            resource_type: resource_type.to_string(),
            resource_id: resource_id.map(|s| s.to_string()),
            principal_type,
            principal_id: principal_id.to_string(),
            permission_level,
            conditions: conditions
                .iter()
                .map(|c| PermissionCondition {
                    field: c.field.clone(),
                    operator: c.operator.clone(),
                    value: c.value.clone(),
                })
                .collect(),
            field_permissions: field_permissions
                .iter()
                .map(|f| DataFieldPermission {
                    field_name: f.field_name.clone(),
                    allowed_levels: f
                        .allowed_levels
                        .iter()
                        .map(|s| PermissionLevelGql::from_str(s))
                        .collect(),
                    mask_strategy: f.mask_strategy,
                })
                .collect(),
            granted_by: granted_by.to_string(),
            granted_at: Utc::now(),
            expires_at,
        };
        let gql = perm.to_gql();
        let audit_principal = format!("{}:{}", principal_type.as_str(), principal_id);
        let audit_resource = format!("{}:{}", resource_type, resource_id.unwrap_or("*"));
        {
            let mut state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state.permissions.insert(perm.permission_id.clone(), perm);
        }
        v48_push_audit(PermissionAuditLog {
            action: "grant".into(),
            principal: audit_principal,
            resource: audit_resource,
            permission_level,
            timestamp: Utc::now(),
            result: "success".into(),
        });
        gql
    }

    /// 撤销权限
    pub fn revoke_permission(permission_id: &str) -> bool {
        let removed = {
            let mut state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state.permissions.remove(permission_id)
        };
        if let Some(p) = removed {
            v48_push_audit(PermissionAuditLog {
                action: "revoke".into(),
                principal: format!("{}:{}", p.principal_type.as_str(), p.principal_id),
                resource: format!(
                    "{}:{}",
                    p.resource_type,
                    p.resource_id.as_deref().unwrap_or("*")
                ),
                permission_level: p.permission_level,
                timestamp: Utc::now(),
                result: "success".into(),
            });
            true
        } else {
            false
        }
    }

    /// 检查权限（资源 + 操作）。返回是否允许，并记录审计。
    pub fn check_permission(
        resource_type: &str,
        resource_id: Option<&str>,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
        required_level: PermissionLevelGql,
    ) -> bool {
        let allowed = {
            let state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state
                .permissions
                .values()
                .filter(|p| !p.is_expired())
                .filter(|p| p.resource_type == resource_type)
                .filter(|p| {
                    p.resource_id.as_deref().unwrap_or("*") == "*"
                        || p.resource_id.as_deref() == resource_id
                })
                .filter(|p| p.principal_type == principal_type && p.principal_id == principal_id)
                .any(|p| p.permission_level >= required_level)
        };
        v48_push_audit(PermissionAuditLog {
            action: "check".into(),
            principal: format!("{}:{}", principal_type.as_str(), principal_id),
            resource: format!("{}:{}", resource_type, resource_id.unwrap_or("*")),
            permission_level: required_level,
            timestamp: Utc::now(),
            result: if allowed {
                "allowed".into()
            } else {
                "denied".into()
            },
        });
        allowed
    }

    /// 获取权限列表（可按主体/资源类型过滤）
    pub fn get_permissions(
        principal_type: Option<PrincipalTypeGql>,
        principal_id: Option<&str>,
        resource_type: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<DataPermissionGql> {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(100) as usize;
        state
            .permissions
            .values()
            .filter(|p| {
                principal_type
                    .map(|pt| p.principal_type == pt)
                    .unwrap_or(true)
            })
            .filter(|p| principal_id.map(|id| p.principal_id == id).unwrap_or(true))
            .filter(|p| {
                resource_type
                    .map(|rt| p.resource_type == rt)
                    .unwrap_or(true)
            })
            .take(limit)
            .map(|p| p.to_gql())
            .collect()
    }

    /// 应用行级过滤：根据主体权限条件过滤查询结果（多组条件 OR 语义）
    pub fn apply_row_filter(
        rows: Vec<serde_json::Value>,
        resource_type: &str,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
    ) -> Vec<serde_json::Value> {
        let condition_sets: Vec<Vec<PermissionCondition>> = {
            let state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state
                .permissions
                .values()
                .filter(|p| !p.is_expired())
                .filter(|p| p.resource_type == resource_type)
                .filter(|p| p.principal_type == principal_type && p.principal_id == principal_id)
                .map(|p| p.conditions.clone())
                .collect()
        };

        rows.into_iter()
            .filter(|row| {
                if condition_sets.is_empty() {
                    return true;
                }
                condition_sets
                    .iter()
                    .any(|conds| conds.is_empty() || conds.iter().all(|c| c.matches(row)))
            })
            .collect()
    }

    /// 应用字段掩码：根据字段权限的 mask_strategy 脱敏敏感字段
    pub fn apply_field_mask(
        mut row: serde_json::Value,
        resource_type: &str,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
        principal_levels: &[PermissionLevelGql],
    ) -> serde_json::Value {
        let field_rules: Vec<(String, Vec<PermissionLevelGql>, MaskStrategyGql)> = {
            let state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state
                .permissions
                .values()
                .filter(|p| !p.is_expired())
                .filter(|p| p.resource_type == resource_type)
                .filter(|p| p.principal_type == principal_type && p.principal_id == principal_id)
                .flat_map(|p| p.field_permissions.iter())
                .map(|f| {
                    (
                        f.field_name.clone(),
                        f.allowed_levels.clone(),
                        f.mask_strategy,
                    )
                })
                .collect()
        };

        let mut masked_count = 0u64;
        if let Some(obj) = row.as_object_mut() {
            for (field, allowed_levels, strategy) in &field_rules {
                // 主体持有任一允许级别则不掩码
                if principal_levels
                    .iter()
                    .any(|pl| allowed_levels.contains(pl))
                {
                    continue;
                }
                if let Some(val) = obj.get_mut(field.as_str()) {
                    *val = v48_mask_value(val, *strategy);
                    masked_count += 1;
                }
            }
        }
        if masked_count > 0 {
            let mut state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state.masked_field_count += masked_count;
        }
        row
    }

    /// 获取有效权限（合并用户/角色/组权限，按级别排序）
    pub fn get_effective_permissions(
        resource_type: &str,
        resource_id: Option<&str>,
        principal_specs: &[(PrincipalTypeGql, &str)],
    ) -> Vec<DataPermissionGql> {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut matching: Vec<&DataPermission> = state
            .permissions
            .values()
            .filter(|p| !p.is_expired())
            .filter(|p| p.resource_type == resource_type)
            .filter(|p| {
                p.resource_id.as_deref().unwrap_or("*") == "*"
                    || p.resource_id.as_deref() == resource_id
            })
            .filter(|p| {
                principal_specs
                    .iter()
                    .any(|(pt, id)| p.principal_type == *pt && p.principal_id == *id)
            })
            .collect();
        // 按权限级别升序排列（最低在前，调用方可取末尾为最高有效权限）
        matching.sort_by_key(|p| p.permission_level);
        matching.iter().map(|p| p.to_gql()).collect()
    }

    /// 获取权限审计日志（按时间倒序）
    pub fn get_audit_logs(limit: Option<u32>) -> Vec<PermissionAuditLogGql> {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(100) as usize;
        state
            .audit_logs
            .iter()
            .rev()
            .take(limit)
            .map(|l| l.to_gql())
            .collect()
    }

    /// 获取数据权限统计
    pub fn get_stats() -> DataPermissionStatsGql {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut by_principal: HashMap<PrincipalTypeGql, u64> = HashMap::new();
        let mut by_level: HashMap<PermissionLevelGql, u64> = HashMap::new();
        for p in state.permissions.values() {
            *by_principal.entry(p.principal_type).or_insert(0) += 1;
            *by_level.entry(p.permission_level).or_insert(0) += 1;
        }
        let mut principal_list: Vec<String> = Vec::new();
        for pt in [
            PrincipalTypeGql::User,
            PrincipalTypeGql::Role,
            PrincipalTypeGql::Group,
            PrincipalTypeGql::ServiceAccount,
            PrincipalTypeGql::Department,
        ] {
            let count = by_principal.get(&pt).copied().unwrap_or(0);
            principal_list.push(format!("{}:{}", pt.as_str(), count));
        }
        let mut level_list: Vec<String> = Vec::new();
        for pl in [
            PermissionLevelGql::None,
            PermissionLevelGql::Read,
            PermissionLevelGql::Write,
            PermissionLevelGql::Delete,
            PermissionLevelGql::Admin,
            PermissionLevelGql::Owner,
        ] {
            let count = by_level.get(&pl).copied().unwrap_or(0);
            level_list.push(format!("{}:{}", pl.as_str(), count));
        }
        DataPermissionStatsGql {
            total_permissions: state.permissions.len() as i64,
            by_principal_type: principal_list,
            by_permission_level: level_list,
            audit_logs: state.audit_logs.len() as i64,
            masked_fields: state.masked_field_count as i64,
        }
    }
}

/// V48.0: 对单个值应用掩码
fn v48_mask_value(value: &serde_json::Value, strategy: MaskStrategyGql) -> serde_json::Value {
    match strategy {
        MaskStrategyGql::None => value.clone(),
        MaskStrategyGql::Partial => match value {
            serde_json::Value::String(s) => {
                let len = s.chars().count();
                if len <= 2 {
                    serde_json::Value::String("*".repeat(len))
                } else {
                    let keep: String = s.chars().take(1).collect();
                    serde_json::Value::String(format!("{}{}", keep, "*".repeat(len - 1)))
                }
            }
            _ => serde_json::Value::String("***".into()),
        },
        MaskStrategyGql::Hash => {
            let hex: String = v48_sha256_hex(value.to_string().as_bytes())
                .chars()
                .take(8)
                .collect();
            serde_json::Value::String(format!("hash:{}", hex))
        }
        MaskStrategyGql::Encrypt => serde_json::Value::String("[encrypted]".into()),
        MaskStrategyGql::Redact => serde_json::Value::String("[redacted]".into()),
        MaskStrategyGql::Custom => serde_json::Value::String("[custom-mask]".into()),
    }
}

// ==================== V48.0 BFF Phase 18: GraphQL 语义缓存 + 查询结果压缩 + 离线优先架构 ====================

// ---------- 1. 语义缓存引擎（SemanticCacheEngine） ----------

/// V48.0: 查询签名 GQL（规范化后的查询签名）
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct QuerySignatureGql {
    pub operation_type: String,
    pub root_field: String,
    pub fields_hash: String,
    pub arguments_hash: String,
    pub directives_hash: String,
}

/// V48.0: 语义缓存条目 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SemanticCacheEntryGql {
    pub cache_id: String,
    pub query_hash: String,
    pub query_signature: QuerySignatureGql,
    pub normalized_query: String,
    pub result: String,
    pub created_at: String,
    pub ttl: i64,
    pub hit_count: i64,
    pub last_accessed: String,
    pub tags: Vec<String>,
}

/// V48.0: 语义缓存配置 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SemanticCacheConfigGql {
    pub max_entries: i64,
    pub default_ttl_seconds: i64,
    pub similarity_threshold: f64,
    pub enable_fuzzy_match: bool,
    pub compression_enabled: bool,
}

/// V48.0: 语义缓存统计 GQL
#[derive(SimpleObject, Clone)]
pub struct SemanticCacheStatsGql {
    pub total_entries: i64,
    pub hit_count: i64,
    pub miss_count: i64,
    pub hit_rate: f64,
    pub avg_lookup_time_ms: f64,
    pub total_size_bytes: i64,
    pub evicted_count: i64,
}

/// V48.0: 语义缓存失效规则 GQL（与 V41 CacheInvalidationRuleGql 区分）
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SemanticCacheInvalidationRuleGql {
    pub rule_id: String,
    pub tag: String,
    pub query_pattern: String,
    pub priority: i32,
    pub enabled: bool,
}

// --- 内部状态 ---

#[derive(Clone)]
struct SemanticCacheEntryData {
    cache_id: String,
    query_hash: String,
    query_signature: QuerySignatureGql,
    normalized_query: String,
    result: String,
    created_at: DateTime<Utc>,
    ttl: i64,
    hit_count: i64,
    last_accessed: DateTime<Utc>,
    tags: Vec<String>,
}

struct SemanticCacheEngineState {
    entries: Vec<SemanticCacheEntryData>,
    config: SemanticCacheConfigGql,
    rules: Vec<SemanticCacheInvalidationRuleGql>,
    hit_count: u64,
    miss_count: u64,
    total_lookup_time_ms: f64,
    evicted_count: u64,
}

impl SemanticCacheEngineState {
    fn new() -> Self {
        Self {
            entries: Vec::new(),
            config: SemanticCacheConfigGql {
                max_entries: 1000,
                default_ttl_seconds: 300,
                similarity_threshold: 0.85,
                enable_fuzzy_match: true,
                compression_enabled: true,
            },
            rules: Vec::new(),
            hit_count: 0,
            miss_count: 0,
            total_lookup_time_ms: 0.0,
            evicted_count: 0,
        }
    }
}

static SEMANTIC_CACHE_STATE: std::sync::OnceLock<Mutex<SemanticCacheEngineState>> =
    std::sync::OnceLock::new();

fn semantic_cache_state() -> &'static Mutex<SemanticCacheEngineState> {
    SEMANTIC_CACHE_STATE.get_or_init(|| Mutex::new(SemanticCacheEngineState::new()))
}

/// V48.0: 语义缓存引擎
///
/// 不仅是哈希匹配，还理解查询的语义等价性：
/// - 查询规范化（别名去除、字段排序、空白标准化）
/// - 查询签名计算（操作类型 + 根字段 + 字段/参数/指令哈希）
/// - 语义等价判断与模糊匹配
pub struct SemanticCacheEngine;

impl SemanticCacheEngine {
    /// 查询规范化（别名去除、字段排序、空白标准化）
    pub fn normalize_query(query: &str) -> String {
        // 1. 去除注释 + 标准化空白
        let mut result = String::with_capacity(query.len());
        for line in query.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('#') {
                continue;
            }
            let cleaned = if let Some(pos) = trimmed.find('#') {
                &trimmed[..pos]
            } else {
                trimmed
            };
            result.push_str(cleaned.trim());
            result.push(' ');
        }
        let mut normalized: String = result.split_whitespace().collect::<Vec<_>>().join(" ");
        // 2. 去除别名（alias: field -> field）
        normalized = Self::strip_aliases(&normalized);
        // 3. 字段排序（花括号内的直接子字段按字典序排序）
        normalized = Self::sort_fields(&normalized);
        normalized
    }

    /// 去除 GraphQL 别名（仅处理括号外的 alias: 模式，保留参数 key:value）
    fn strip_aliases(query: &str) -> String {
        let chars: Vec<char> = query.chars().collect();
        let mut result = String::with_capacity(query.len());
        let mut i = 0;
        let mut paren_depth = 0i32;
        while i < chars.len() {
            if chars[i] == '(' {
                paren_depth += 1;
                result.push(chars[i]);
                i += 1;
                continue;
            }
            if chars[i] == ')' {
                if paren_depth > 0 {
                    paren_depth -= 1;
                }
                result.push(chars[i]);
                i += 1;
                continue;
            }
            if paren_depth == 0 && (chars[i].is_alphabetic() || chars[i] == '_') {
                let start = i;
                while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                    i += 1;
                }
                let mut j = i;
                while j < chars.len() && chars[j].is_whitespace() {
                    j += 1;
                }
                if j < chars.len() && chars[j] == ':' {
                    // 这是一个别名，跳过别名和冒号
                    i = j + 1;
                    while i < chars.len() && chars[i].is_whitespace() {
                        i += 1;
                    }
                    continue;
                }
                for k in start..i {
                    result.push(chars[k]);
                }
                continue;
            }
            result.push(chars[i]);
            i += 1;
        }
        result
    }

    /// 字段排序：对每个花括号块内的直接子字段（含嵌套块）按字典序排序
    fn sort_fields(query: &str) -> String {
        let chars: Vec<char> = query.chars().collect();
        let mut idx = 0;
        let mut result = String::new();
        while idx < chars.len() {
            if chars[idx] == '{' {
                result.push_str(&Self::sort_fields_block(&chars, &mut idx));
            } else {
                result.push(chars[idx]);
                idx += 1;
            }
        }
        result
    }

    /// 处理一个 { ... } 块，返回包含花括号的已排序结果
    fn sort_fields_block(chars: &[char], idx: &mut usize) -> String {
        let mut result = String::new();
        if *idx >= chars.len() || chars[*idx] != '{' {
            return result;
        }
        result.push('{');
        *idx += 1;
        let mut tokens: Vec<String> = Vec::new();
        let mut current = String::new();
        while *idx < chars.len() && chars[*idx] != '}' {
            if chars[*idx] == '{' {
                current.push_str(&Self::sort_fields_block(chars, idx));
            } else if chars[*idx].is_whitespace() {
                if !current.is_empty() {
                    tokens.push(std::mem::take(&mut current));
                }
                *idx += 1;
            } else {
                current.push(chars[*idx]);
                *idx += 1;
            }
        }
        if !current.is_empty() {
            tokens.push(current);
        }
        tokens.sort();
        result.push_str(&tokens.join(" "));
        if *idx < chars.len() && chars[*idx] == '}' {
            result.push('}');
            *idx += 1;
        }
        result
    }

    /// 计算查询签名
    pub fn compute_signature(query: &str) -> QuerySignatureGql {
        let normalized = Self::normalize_query(query);
        let operation_type = Self::extract_operation_type(&normalized);
        let root_field = Self::extract_root_field(&normalized);
        let fields = Self::extract_fields(&normalized);
        let arguments = Self::extract_arguments(&normalized);
        let directives = Self::extract_directives(&normalized);

        let mut hasher = Sha256::new();
        hasher.update(fields.as_bytes());
        let fields_hash = format!("{:x}", hasher.finalize());

        let mut hasher = Sha256::new();
        hasher.update(arguments.as_bytes());
        let arguments_hash = format!("{:x}", hasher.finalize());

        let mut hasher = Sha256::new();
        hasher.update(directives.as_bytes());
        let directives_hash = format!("{:x}", hasher.finalize());

        QuerySignatureGql {
            operation_type,
            root_field,
            fields_hash,
            arguments_hash,
            directives_hash,
        }
    }

    fn extract_operation_type(query: &str) -> String {
        let q = query.trim();
        for op in ["query", "mutation", "subscription"] {
            if q.starts_with(op) {
                return op.to_string();
            }
        }
        "query".to_string()
    }

    fn extract_root_field(query: &str) -> String {
        let q = query.trim();
        if let Some(start) = q.find('{') {
            let inner = &q[start + 1..];
            let inner = inner.trim();
            let first: String = inner
                .chars()
                .take_while(|c| !c.is_whitespace() && *c != '(' && *c != '{')
                .collect();
            if !first.is_empty() {
                return first;
            }
        }
        "unknown".to_string()
    }

    fn extract_fields(query: &str) -> String {
        let keywords = ["query", "mutation", "subscription", "fragment", "on"];
        let mut words: Vec<String> = query
            .split(|c: char| {
                c.is_whitespace() || c == '{' || c == '}' || c == '(' || c == ')' || c == ','
            })
            .filter(|w| !w.is_empty() && !keywords.contains(w))
            .map(|w| w.to_string())
            .collect();
        words.sort();
        words.dedup();
        words.join(",")
    }

    fn extract_arguments(query: &str) -> String {
        let mut args: Vec<String> = Vec::new();
        let chars: Vec<char> = query.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            if chars[i] == '(' {
                let mut depth = 1;
                i += 1;
                let mut arg = String::new();
                while i < chars.len() && depth > 0 {
                    if chars[i] == '(' {
                        depth += 1;
                    } else if chars[i] == ')' {
                        depth -= 1;
                        if depth == 0 {
                            break;
                        }
                    }
                    arg.push(chars[i]);
                    i += 1;
                }
                if i < chars.len() {
                    i += 1;
                }
                args.push(arg.trim().to_string());
            } else {
                i += 1;
            }
        }
        args.sort();
        args.join(";")
    }

    fn extract_directives(query: &str) -> String {
        let mut dirs: Vec<String> = Vec::new();
        let chars: Vec<char> = query.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            if chars[i] == '@' {
                let mut d = String::new();
                d.push('@');
                i += 1;
                while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                    d.push(chars[i]);
                    i += 1;
                }
                dirs.push(d);
            } else {
                i += 1;
            }
        }
        dirs.sort();
        dirs.dedup();
        dirs.join(",")
    }

    /// 判断两个查询是否语义等价
    pub fn is_semantically_equivalent(query_a: &str, query_b: &str) -> bool {
        let sig_a = Self::compute_signature(query_a);
        let sig_b = Self::compute_signature(query_b);
        sig_a.operation_type == sig_b.operation_type
            && sig_a.root_field == sig_b.root_field
            && sig_a.fields_hash == sig_b.fields_hash
            && sig_a.arguments_hash == sig_b.arguments_hash
            && sig_a.directives_hash == sig_b.directives_hash
    }

    /// 查找语义相似的缓存条目（模糊匹配）
    pub fn find_similar_cached(query: &str) -> Vec<SemanticCacheEntryGql> {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let sig = Self::compute_signature(query);
        let now = Utc::now();
        let threshold = state.config.similarity_threshold;
        let mut results = Vec::new();
        for entry in &state.entries {
            let age = now.signed_duration_since(entry.created_at).num_seconds();
            if age > entry.ttl {
                continue;
            }
            let mut score = 0.0_f64;
            if entry.query_signature.operation_type == sig.operation_type {
                score += 1.0;
            }
            if entry.query_signature.root_field == sig.root_field {
                score += 1.0;
            }
            if entry.query_signature.fields_hash == sig.fields_hash {
                score += 1.0;
            }
            if entry.query_signature.arguments_hash == sig.arguments_hash {
                score += 1.0;
            }
            if entry.query_signature.directives_hash == sig.directives_hash {
                score += 1.0;
            }
            let similarity = score / 5.0;
            if similarity >= threshold {
                results.push(Self::entry_to_gql(entry));
            }
        }
        results
    }

    /// 获取缓存（精确匹配 + 模糊匹配回退）
    pub fn get_cached(query: &str) -> Option<SemanticCacheEntryGql> {
        let start = std::time::Instant::now();
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_lookup_time_ms += start.elapsed().as_secs_f64() * 1000.0;
        let normalized = Self::normalize_query(query);
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let query_hash = format!("{:x}", hasher.finalize());
        let now = Utc::now();
        // 精确匹配（先找索引，再修改，避免同时持有 entries 可变借用与 state 字段借用）
        let mut found_idx: Option<usize> = None;
        for (i, entry) in state.entries.iter().enumerate() {
            if entry.query_hash == query_hash {
                let age = now.signed_duration_since(entry.created_at).num_seconds();
                if age > entry.ttl {
                    continue;
                }
                found_idx = Some(i);
                break;
            }
        }
        if let Some(idx) = found_idx {
            state.entries[idx].hit_count += 1;
            state.entries[idx].last_accessed = now;
            let gql = Self::entry_to_gql(&state.entries[idx]);
            state.hit_count += 1;
            return Some(gql);
        }
        // 模糊匹配回退
        if state.config.enable_fuzzy_match {
            let sig = Self::compute_signature(query);
            let mut fuzzy_idx: Option<usize> = None;
            for (i, entry) in state.entries.iter().enumerate() {
                let age = now.signed_duration_since(entry.created_at).num_seconds();
                if age > entry.ttl {
                    continue;
                }
                if entry.query_signature.operation_type == sig.operation_type
                    && entry.query_signature.root_field == sig.root_field
                    && entry.query_signature.fields_hash == sig.fields_hash
                {
                    fuzzy_idx = Some(i);
                    break;
                }
            }
            if let Some(idx) = fuzzy_idx {
                state.entries[idx].hit_count += 1;
                state.entries[idx].last_accessed = now;
                let gql = Self::entry_to_gql(&state.entries[idx]);
                state.hit_count += 1;
                return Some(gql);
            }
        }
        state.miss_count += 1;
        None
    }

    /// 设置缓存
    pub fn set_cached(query: &str, result: &str, tags: Vec<String>) -> SemanticCacheEntryGql {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let normalized = Self::normalize_query(query);
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let query_hash = format!("{:x}", hasher.finalize());
        let signature = Self::compute_signature(query);
        let now = Utc::now();
        let ttl = state.config.default_ttl_seconds;
        let entry = SemanticCacheEntryData {
            cache_id: uuid_simple(),
            query_hash,
            query_signature: signature,
            normalized_query: normalized,
            result: result.to_string(),
            created_at: now,
            ttl,
            hit_count: 0,
            last_accessed: now,
            tags,
        };
        let gql = Self::entry_to_gql(&entry);
        // LRU 淘汰
        while state.entries.len() as i64 >= state.config.max_entries {
            if let Some(idx) = state
                .entries
                .iter()
                .enumerate()
                .min_by_key(|(_, e)| e.last_accessed)
                .map(|(i, _)| i)
            {
                state.entries.remove(idx);
                state.evicted_count += 1;
            } else {
                break;
            }
        }
        state.entries.push(entry);
        gql
    }

    /// 失效缓存（支持按 tag 批量失效，或按 query_hash 精确失效）
    pub fn invalidate(tag: Option<&str>, query_hash: Option<&str>) -> i64 {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let before = state.entries.len();
        state.entries.retain(|e| {
            if let Some(h) = query_hash {
                if e.query_hash == h {
                    return false;
                }
            }
            if let Some(t) = tag {
                if e.tags.iter().any(|et| et == t) {
                    return false;
                }
            }
            true
        });
        (before - state.entries.len()) as i64
    }

    /// 获取缓存统计
    pub fn get_cache_stats() -> SemanticCacheStatsGql {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let total = state.hit_count + state.miss_count;
        let hit_rate = if total > 0 {
            state.hit_count as f64 / total as f64
        } else {
            0.0
        };
        let avg_lookup = if total > 0 {
            state.total_lookup_time_ms / total as f64
        } else {
            0.0
        };
        let total_size_bytes: usize = state
            .entries
            .iter()
            .map(|e| e.result.len() + e.normalized_query.len() + e.cache_id.len())
            .sum();
        SemanticCacheStatsGql {
            total_entries: state.entries.len() as i64,
            hit_count: state.hit_count as i64,
            miss_count: state.miss_count as i64,
            hit_rate,
            avg_lookup_time_ms: avg_lookup,
            total_size_bytes: total_size_bytes as i64,
            evicted_count: state.evicted_count as i64,
        }
    }

    /// 获取当前配置
    pub fn get_config() -> SemanticCacheConfigGql {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config.clone()
    }

    /// 更新配置
    pub fn update_config(config: SemanticCacheConfigGql) -> SemanticCacheConfigGql {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config = config.clone();
        config
    }

    /// 添加失效规则
    pub fn add_invalidation_rule(
        rule: SemanticCacheInvalidationRuleGql,
    ) -> SemanticCacheInvalidationRuleGql {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.rules.push(rule.clone());
        rule
    }

    /// 获取所有失效规则
    pub fn get_invalidation_rules() -> Vec<SemanticCacheInvalidationRuleGql> {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.rules.clone()
    }

    fn entry_to_gql(e: &SemanticCacheEntryData) -> SemanticCacheEntryGql {
        SemanticCacheEntryGql {
            cache_id: e.cache_id.clone(),
            query_hash: e.query_hash.clone(),
            query_signature: e.query_signature.clone(),
            normalized_query: e.normalized_query.clone(),
            result: e.result.clone(),
            created_at: e.created_at.to_rfc3339(),
            ttl: e.ttl,
            hit_count: e.hit_count,
            last_accessed: e.last_accessed.to_rfc3339(),
            tags: e.tags.clone(),
        }
    }
}

// ---------- 2. 查询结果压缩器（QueryResultCompressor） ----------

/// V48.0: 压缩算法
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompressionAlgorithmGql {
    None,
    Gzip,
    Brotli,
    Zstd,
    LZ4,
}

/// V48.0: 压缩配置 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct CompressionConfigGql {
    pub algorithm: CompressionAlgorithmGql,
    pub level: i32,
    pub min_size_threshold: i64,
    pub enable_deduplication: bool,
    pub enable_delta_encoding: bool,
}

/// V48.0: 压缩结果 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct CompressedResultGql {
    pub original_size: i64,
    pub compressed_size: i64,
    pub compression_ratio: f64,
    pub algorithm: CompressionAlgorithmGql,
    pub compressed_data: String,
    pub metadata: String,
}

/// V48.0: 压缩统计 GQL
#[derive(SimpleObject, Clone)]
pub struct CompressionStatsGql {
    pub total_compressed: i64,
    pub total_original_bytes: i64,
    pub total_compressed_bytes: i64,
    pub avg_ratio: f64,
    pub by_algorithm: Vec<String>,
}

/// V48.0: 数据画像 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct DataProfileGql {
    pub data_type: String,
    pub array_count: i64,
    pub object_count: i64,
    pub string_ratio: f64,
    pub number_ratio: f64,
    pub null_ratio: f64,
    pub estimated_compressibility: f64,
}

struct QueryResultCompressorState {
    config: CompressionConfigGql,
    stats_total_compressed: u64,
    stats_total_original_bytes: u64,
    stats_total_compressed_bytes: u64,
    stats_by_algorithm: HashMap<String, u64>,
}

impl QueryResultCompressorState {
    fn new() -> Self {
        Self {
            config: CompressionConfigGql {
                algorithm: CompressionAlgorithmGql::Gzip,
                level: 6,
                min_size_threshold: 1024,
                enable_deduplication: true,
                enable_delta_encoding: true,
            },
            stats_total_compressed: 0,
            stats_total_original_bytes: 0,
            stats_total_compressed_bytes: 0,
            stats_by_algorithm: HashMap::new(),
        }
    }
}

static QUERY_RESULT_COMPRESSOR_STATE: std::sync::OnceLock<Mutex<QueryResultCompressorState>> =
    std::sync::OnceLock::new();

fn query_result_compressor_state() -> &'static Mutex<QueryResultCompressorState> {
    QUERY_RESULT_COMPRESSOR_STATE.get_or_init(|| Mutex::new(QueryResultCompressorState::new()))
}

fn compression_algorithm_name(a: CompressionAlgorithmGql) -> &'static str {
    match a {
        CompressionAlgorithmGql::None => "none",
        CompressionAlgorithmGql::Gzip => "gzip",
        CompressionAlgorithmGql::Brotli => "brotli",
        CompressionAlgorithmGql::Zstd => "zstd",
        CompressionAlgorithmGql::LZ4 => "lz4",
    }
}

/// V48.0: 查询结果压缩器
///
/// 根据数据特征自动选择最佳压缩算法，支持数组去重和增量编码。
pub struct QueryResultCompressor;

impl QueryResultCompressor {
    /// 压缩查询结果
    pub fn compress_result(data: &str) -> CompressedResultGql {
        let mut state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let original_size = data.len() as i64;
        let profile = Self::profile_data(data);
        let algorithm = if state.config.algorithm != CompressionAlgorithmGql::None {
            state.config.algorithm
        } else {
            Self::select_algorithm(&profile)
        };

        // 预处理（去重 + 增量编码）——模拟阶段仅做概念性处理
        let _working = {
            let mut w = data.to_string();
            if state.config.enable_deduplication {
                w = Self::deduplicate_arrays(&w);
            }
            if state.config.enable_delta_encoding {
                w = Self::delta_encode(&w);
            }
            w
        };

        let compressed_size = if original_size < state.config.min_size_threshold {
            original_size
        } else {
            let ratio = match algorithm {
                CompressionAlgorithmGql::None => 1.0,
                CompressionAlgorithmGql::Gzip => 0.45,
                CompressionAlgorithmGql::Brotli => 0.32,
                CompressionAlgorithmGql::Zstd => 0.38,
                CompressionAlgorithmGql::LZ4 => 0.55,
            };
            let compressibility = profile.estimated_compressibility;
            ((original_size as f64) * ratio * (1.0 - compressibility * 0.15)) as i64
        };

        let compression_ratio = if original_size > 0 {
            compressed_size as f64 / original_size as f64
        } else {
            1.0
        };

        // 模拟阶段：compressed_data 存储原始数据以保证解压可往返
        let compressed_data = data.to_string();
        let metadata = format!(
            "{{\"algorithm\":\"{}\",\"level\":{},\"dedup\":{},\"delta\":{},\"profile\":\"{}\",\"compressibility\":{:.2}}}",
            compression_algorithm_name(algorithm),
            state.config.level,
            state.config.enable_deduplication,
            state.config.enable_delta_encoding,
            profile.data_type,
            profile.estimated_compressibility
        );

        state.stats_total_compressed += 1;
        state.stats_total_original_bytes += original_size as u64;
        state.stats_total_compressed_bytes += compressed_size as u64;
        *state
            .stats_by_algorithm
            .entry(compression_algorithm_name(algorithm).to_string())
            .or_insert(0) += 1;

        CompressedResultGql {
            original_size,
            compressed_size,
            compression_ratio,
            algorithm,
            compressed_data,
            metadata,
        }
    }

    /// 解压查询结果
    pub fn decompress_result(compressed: &CompressedResultGql) -> String {
        // 模拟阶段：compressed_data 即原始数据，直接返回
        compressed.compressed_data.clone()
    }

    /// 数组去重（识别重复模式）
    ///
    /// 检测数据中重复的 16 字节块模式。在生产环境中会构建模式表
    /// 并用反向引用替换重复块。
    pub fn deduplicate_arrays(data: &str) -> String {
        if data.len() < 64 {
            return data.to_string();
        }
        let mut seen: HashMap<&str, u32> = HashMap::new();
        let mut i = 0;
        while i + 16 <= data.len() {
            let chunk = &data[i..i + 16];
            *seen.entry(chunk).or_insert(0) += 1;
            i += 16;
        }
        let _duplicates: u32 = seen.values().filter(|&&c| c > 1).map(|&c| c - 1).sum();
        // 模拟阶段：返回原始数据，去重收益已反映在压缩比估算中
        data.to_string()
    }

    /// 增量编码（对时间序列等有序数据）
    ///
    /// 将连续的数字序列转换为相对前一个值的增量。
    pub fn delta_encode(data: &str) -> String {
        let mut result = String::with_capacity(data.len());
        let chars: Vec<char> = data.chars().collect();
        let mut i = 0;
        let mut prev: Option<i64> = None;
        while i < chars.len() {
            if chars[i].is_ascii_digit()
                || (chars[i] == '-' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit())
            {
                let mut num_str = String::new();
                if chars[i] == '-' {
                    num_str.push('-');
                    i += 1;
                }
                while i < chars.len()
                    && (chars[i].is_ascii_digit()
                        || chars[i] == '.'
                        || chars[i] == 'e'
                        || chars[i] == 'E')
                {
                    num_str.push(chars[i]);
                    i += 1;
                }
                if let Ok(n) = num_str.parse::<i64>() {
                    match prev {
                        Some(p) => {
                            let delta = n - p;
                            result.push_str(&format!("d{}", delta));
                        }
                        None => result.push_str(&num_str),
                    }
                    prev = Some(n);
                } else {
                    result.push_str(&num_str);
                }
            } else {
                result.push(chars[i]);
                i += 1;
            }
        }
        result
    }

    /// 根据数据特征自动选择最佳压缩算法
    pub fn select_algorithm(profile: &DataProfileGql) -> CompressionAlgorithmGql {
        if profile.estimated_compressibility > 0.7 {
            CompressionAlgorithmGql::Brotli
        } else if profile.estimated_compressibility > 0.5 {
            CompressionAlgorithmGql::Zstd
        } else if profile.estimated_compressibility > 0.3 {
            CompressionAlgorithmGql::Gzip
        } else {
            CompressionAlgorithmGql::LZ4
        }
    }

    /// 分析数据画像
    pub fn profile_data(data: &str) -> DataProfileGql {
        let _total = data.len().max(1) as f64;
        let mut array_count = 0i64;
        let mut object_count = 0i64;
        let mut string_chars = 0usize;
        let mut number_chars = 0usize;
        let mut null_chars = 0usize;
        let chars: Vec<char> = data.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            match chars[i] {
                '[' => {
                    array_count += 1;
                    i += 1;
                }
                '{' => {
                    object_count += 1;
                    i += 1;
                }
                '"' => {
                    i += 1;
                    while i < chars.len() && chars[i] != '"' {
                        string_chars += 1;
                        i += 1;
                    }
                    if i < chars.len() {
                        i += 1;
                    }
                }
                c if c.is_ascii_digit()
                    || (c == '-' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit()) =>
                {
                    while i < chars.len()
                        && (chars[i].is_ascii_digit()
                            || chars[i] == '.'
                            || chars[i] == '-'
                            || chars[i] == 'e'
                            || chars[i] == 'E')
                    {
                        number_chars += 1;
                        i += 1;
                    }
                }
                'n' if i + 3 < chars.len()
                    && chars[i + 1] == 'u'
                    && chars[i + 2] == 'l'
                    && chars[i + 3] == 'l' =>
                {
                    null_chars += 4;
                    i += 4;
                }
                _ => {
                    i += 1;
                }
            }
        }
        let counted = (string_chars + number_chars + null_chars).max(1) as f64;
        let string_ratio = string_chars as f64 / counted;
        let number_ratio = number_chars as f64 / counted;
        let null_ratio = null_chars as f64 / counted;
        let estimated_compressibility = if _total > 512.0 && string_ratio > 0.5 {
            0.75
        } else if number_ratio > 0.5 {
            0.6
        } else if null_ratio > 0.3 {
            0.8
        } else {
            0.4
        };
        let data_type = if array_count > object_count {
            "array".to_string()
        } else if object_count > 0 {
            "object".to_string()
        } else {
            "scalar".to_string()
        };
        DataProfileGql {
            data_type,
            array_count,
            object_count,
            string_ratio,
            number_ratio,
            null_ratio,
            estimated_compressibility,
        }
    }

    /// 获取压缩统计
    pub fn get_compression_stats() -> CompressionStatsGql {
        let state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let avg_ratio = if state.stats_total_original_bytes > 0 {
            state.stats_total_compressed_bytes as f64 / state.stats_total_original_bytes as f64
        } else {
            1.0
        };
        let by_algorithm = state
            .stats_by_algorithm
            .iter()
            .map(|(k, v)| format!("{}:{}", k, v))
            .collect();
        CompressionStatsGql {
            total_compressed: state.stats_total_compressed as i64,
            total_original_bytes: state.stats_total_original_bytes as i64,
            total_compressed_bytes: state.stats_total_compressed_bytes as i64,
            avg_ratio,
            by_algorithm,
        }
    }

    /// 获取配置
    pub fn get_config() -> CompressionConfigGql {
        let state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config.clone()
    }

    /// 更新配置
    pub fn update_config(config: CompressionConfigGql) -> CompressionConfigGql {
        let mut state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config = config.clone();
        config
    }
}

// ---------- 3. 离线优先架构（OfflineFirstEngine） ----------

/// V48.0: 离线策略
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OfflineStrategyGql {
    CacheFirst,
    NetworkFirst,
    CacheOnly,
    NetworkOnly,
    StaleWhileRevalidate,
    StaleAndUpdate,
}

/// V48.0: 离线冲突解决策略（与 V47 ConflictResolutionStrategyGql 区分）
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OfflineConflictResolutionStrategyGql {
    ServerWins,
    ClientWins,
    Merge,
    Manual,
}

/// V48.0: 变更状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MutationStatusGql {
    Pending,
    Syncing,
    Synced,
    Failed,
    Conflict,
}

/// V48.0: 离线策略 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct OfflinePolicyGql {
    pub strategy: OfflineStrategyGql,
    pub max_stale_time_seconds: i64,
    pub background_sync_enabled: bool,
    pub conflict_resolution: OfflineConflictResolutionStrategyGql,
    pub fallback_data: Option<String>,
}

/// V48.0: 离线变更 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct OfflineMutationGql {
    pub mutation_id: String,
    pub operation: String,
    pub variables: String,
    pub status: MutationStatusGql,
    pub created_at: String,
    pub synced_at: Option<String>,
    pub retry_count: i32,
    pub error: Option<String>,
}

/// V48.0: 离线统计 GQL
#[derive(SimpleObject, Clone)]
pub struct OfflineStatsGql {
    pub total_mutations: i64,
    pub pending: i64,
    pub synced: i64,
    pub failed: i64,
    pub conflicts: i64,
    pub cache_size: i64,
    pub avg_sync_time: f64,
}

// --- 内部状态 ---

#[derive(Clone, Serialize, Deserialize)]
struct OfflineMutationData {
    mutation_id: String,
    operation: String,
    variables: String,
    status: MutationStatusGql,
    created_at: DateTime<Utc>,
    synced_at: Option<DateTime<Utc>>,
    retry_count: i32,
    error: Option<String>,
}

struct OfflineFirstEngineState {
    policies: HashMap<String, OfflinePolicyGql>,
    mutations: Vec<OfflineMutationData>,
    prefetch_cache: HashMap<String, String>,
    total_sync_time_ms: f64,
    sync_count: u64,
}

impl OfflineFirstEngineState {
    fn new() -> Self {
        let mut policies = HashMap::new();
        policies.insert(
            "default".to_string(),
            OfflinePolicyGql {
                strategy: OfflineStrategyGql::StaleWhileRevalidate,
                max_stale_time_seconds: 300,
                background_sync_enabled: true,
                conflict_resolution: OfflineConflictResolutionStrategyGql::ServerWins,
                fallback_data: None,
            },
        );
        Self {
            policies,
            mutations: Vec::new(),
            prefetch_cache: HashMap::new(),
            total_sync_time_ms: 0.0,
            sync_count: 0,
        }
    }
}

static OFFLINE_FIRST_STATE: std::sync::OnceLock<Mutex<OfflineFirstEngineState>> =
    std::sync::OnceLock::new();

fn offline_first_state() -> &'static Mutex<OfflineFirstEngineState> {
    OFFLINE_FIRST_STATE.get_or_init(|| Mutex::new(OfflineFirstEngineState::new()))
}

/// V48.0: 离线优先引擎
///
/// 支持离线变更队列、后台同步、冲突解决与数据预取。
pub struct OfflineFirstEngine;

impl OfflineFirstEngine {
    /// 注册离线策略（按查询/变更类型）
    pub fn register_policy(key: &str, policy: OfflinePolicyGql) -> OfflinePolicyGql {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.policies.insert(key.to_string(), policy.clone());
        policy
    }

    /// 获取策略
    pub fn get_policy(key: &str) -> Option<OfflinePolicyGql> {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.policies.get(key).cloned()
    }

    /// 将变更加入离线队列
    pub fn queue_mutation(operation: &str, variables: &str) -> OfflineMutationGql {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        let mutation = OfflineMutationData {
            mutation_id: uuid_simple(),
            operation: operation.to_string(),
            variables: variables.to_string(),
            status: MutationStatusGql::Pending,
            created_at: now,
            synced_at: None,
            retry_count: 0,
            error: None,
        };
        let gql = Self::mutation_to_gql(&mutation);
        state.mutations.push(mutation);
        gql
    }

    /// 同步离线变更到服务端
    pub fn sync_mutations() -> i64 {
        let start = std::time::Instant::now();
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_sync_time_ms += start.elapsed().as_secs_f64() * 1000.0;
        state.sync_count += 1;
        let mut synced_count = 0i64;
        for m in state.mutations.iter_mut() {
            if m.status == MutationStatusGql::Pending || m.status == MutationStatusGql::Failed {
                m.status = MutationStatusGql::Syncing;
                // 模拟同步——生产环境中会调用服务端
                m.status = MutationStatusGql::Synced;
                m.synced_at = Some(Utc::now());
                m.retry_count += 1;
                synced_count += 1;
            }
        }
        synced_count
    }

    /// 获取待同步的变更
    pub fn get_pending_mutations() -> Vec<OfflineMutationGql> {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .mutations
            .iter()
            .filter(|m| {
                m.status == MutationStatusGql::Pending || m.status == MutationStatusGql::Failed
            })
            .map(Self::mutation_to_gql)
            .collect()
    }

    /// 解决同步冲突
    pub fn resolve_conflict(
        mutation_id: &str,
        strategy: OfflineConflictResolutionStrategyGql,
    ) -> Option<OfflineMutationGql> {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let m = state
            .mutations
            .iter_mut()
            .find(|m| m.mutation_id == mutation_id)?;
        match strategy {
            OfflineConflictResolutionStrategyGql::ServerWins => {
                m.status = MutationStatusGql::Synced;
                m.synced_at = Some(Utc::now());
            }
            OfflineConflictResolutionStrategyGql::ClientWins => {
                m.status = MutationStatusGql::Pending;
            }
            OfflineConflictResolutionStrategyGql::Merge => {
                m.status = MutationStatusGql::Syncing;
            }
            OfflineConflictResolutionStrategyGql::Manual => {
                // 保留 Conflict 状态等待手动处理
            }
        }
        Some(Self::mutation_to_gql(m))
    }

    /// 获取离线统计
    pub fn get_offline_stats() -> OfflineStatsGql {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let pending = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Pending)
            .count() as i64;
        let synced = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Synced)
            .count() as i64;
        let failed = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Failed)
            .count() as i64;
        let conflicts = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Conflict)
            .count() as i64;
        let cache_size = state.prefetch_cache.values().map(|v| v.len() as i64).sum();
        let avg_sync_time = if state.sync_count > 0 {
            state.total_sync_time_ms / state.sync_count as f64
        } else {
            0.0
        };
        OfflineStatsGql {
            total_mutations: state.mutations.len() as i64,
            pending,
            synced,
            failed,
            conflicts,
            cache_size,
            avg_sync_time,
        }
    }

    /// 预取数据供离线使用
    pub fn prefetch_for_offline(key: &str, data: &str) -> bool {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .prefetch_cache
            .insert(key.to_string(), data.to_string());
        true
    }

    /// 获取预取的数据
    pub fn get_prefetched(key: &str) -> Option<String> {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.prefetch_cache.get(key).cloned()
    }

    fn mutation_to_gql(m: &OfflineMutationData) -> OfflineMutationGql {
        OfflineMutationGql {
            mutation_id: m.mutation_id.clone(),
            operation: m.operation.clone(),
            variables: m.variables.clone(),
            status: m.status,
            created_at: m.created_at.to_rfc3339(),
            synced_at: m.synced_at.map(|t| t.to_rfc3339()),
            retry_count: m.retry_count,
            error: m.error.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: serde::Serialize + for<'d> serde::Deserialize<'d>>(value: &T) -> bool {
        let json = serde_json::to_value(value).unwrap();
        let back: T = serde_json::from_value(json.clone()).unwrap();
        let json2 = serde_json::to_value(&back).unwrap();
        json == json2
    }

    fn j(v: &str) -> serde_json::Value {
        serde_json::from_str(v).unwrap()
    }

    // ===== 23 enum roundtrip =====

    #[test]
    fn enum_rt_discovery_status() {
        for v in [
            DiscoveryStatus::New,
            DiscoveryStatus::UnderReview,
            DiscoveryStatus::Approved,
            DiscoveryStatus::Rejected,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_user_role() {
        for v in [
            UserRole::Admin,
            UserRole::Manager,
            UserRole::Accountant,
            UserRole::SalesPerson,
            UserRole::Viewer,
            UserRole::Custom("x".into()),
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_mask_type() {
        for v in [
            MaskType::Full,
            MaskType::Partial,
            MaskType::Hash,
            MaskType::Truncate,
            MaskType::Null,
            MaskType::Range,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_optimization_category() {
        for v in [
            OptimizationCategory::NPlusOne,
            OptimizationCategory::Overfetching,
            OptimizationCategory::Caching,
            OptimizationCategory::Complexity,
            OptimizationCategory::Security,
            OptimizationCategory::Maintainability,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_severity_level() {
        for v in [
            SeverityLevel::Critical,
            SeverityLevel::Warning,
            SeverityLevel::Info,
            SeverityLevel::Low,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_filter_operator() {
        for v in [
            FilterOperator::Eq,
            FilterOperator::Ne,
            FilterOperator::Gt,
            FilterOperator::Lt,
            FilterOperator::Gte,
            FilterOperator::Lte,
            FilterOperator::Contains,
            FilterOperator::In,
            FilterOperator::NotIn,
            FilterOperator::Regex,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_update_type() {
        for v in [
            UpdateType::Created,
            UpdateType::Updated,
            UpdateType::Deleted,
            UpdateType::Delta,
            UpdateType::Full,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_span_type() {
        for v in [
            SpanType::Parse,
            SpanType::Validate,
            SpanType::Resolve,
            SpanType::CacheCheck,
            SpanType::DataFetch,
            SpanType::ExternalCall,
            SpanType::DBQuery,
            SpanType::Transform,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_alert_level() {
        for v in [
            AlertLevel::Info,
            AlertLevel::Warning,
            AlertLevel::Critical,
            AlertLevel::Emergency,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_alert_type() {
        for v in [
            AlertType::HighLatency,
            AlertType::HighErrorRate,
            AlertType::LowCacheHit,
            AlertType::HighQPS,
            AlertType::SubscriptionError,
            AlertType::ServiceDown,
            AlertType::SecurityBreach,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_stream_update_type_gql() {
        for v in [
            StreamUpdateTypeGql::Insert,
            StreamUpdateTypeGql::Update,
            StreamUpdateTypeGql::Delete,
            StreamUpdateTypeGql::Sync,
            StreamUpdateTypeGql::Snapshot,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_update_operation_gql() {
        for v in [
            UpdateOperationGql::Set,
            UpdateOperationGql::Add,
            UpdateOperationGql::Remove,
            UpdateOperationGql::Move,
            UpdateOperationGql::Merge,
            UpdateOperationGql::Replace,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_sync_state_gql() {
        for v in [
            SyncStateGql::InSync,
            SyncStateGql::Syncing,
            SyncStateGql::Conflict,
            SyncStateGql::Error,
            SyncStateGql::Offline,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_conflict_resolution_strategy_gql() {
        for v in [
            ConflictResolutionStrategyGql::ServerWins,
            ConflictResolutionStrategyGql::ClientWins,
            ConflictResolutionStrategyGql::LastWriteWins,
            ConflictResolutionStrategyGql::Manual,
            ConflictResolutionStrategyGql::Merge,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_verification_factor_gql() {
        for v in [
            VerificationFactorGql::Password,
            VerificationFactorGql::MFA,
            VerificationFactorGql::Biometric,
            VerificationFactorGql::DeviceCertificate,
            VerificationFactorGql::IPAllowlist,
            VerificationFactorGql::GeoFence,
            VerificationFactorGql::TimeWindow,
            VerificationFactorGql::Behavioral,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_signature_algorithm_gql() {
        for v in [
            SignatureAlgorithmGql::HMACSHA256,
            SignatureAlgorithmGql::HMACSHA384,
            SignatureAlgorithmGql::HMACSHA512,
            SignatureAlgorithmGql::Ed25519,
            SignatureAlgorithmGql::RS256,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_rejection_reason_gql() {
        for v in [
            RejectionReasonGql::InvalidSignature,
            RejectionReasonGql::ExpiredTimestamp,
            RejectionReasonGql::ReplayedNonce,
            RejectionReasonGql::UnknownKey,
            RejectionReasonGql::MissingSignature,
            RejectionReasonGql::AlgorithmMismatch,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_principal_type_gql() {
        for v in [
            PrincipalTypeGql::User,
            PrincipalTypeGql::Role,
            PrincipalTypeGql::Group,
            PrincipalTypeGql::ServiceAccount,
            PrincipalTypeGql::Department,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_mask_strategy_gql() {
        for v in [
            MaskStrategyGql::None,
            MaskStrategyGql::Partial,
            MaskStrategyGql::Hash,
            MaskStrategyGql::Encrypt,
            MaskStrategyGql::Redact,
            MaskStrategyGql::Custom,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_compression_algorithm_gql() {
        for v in [
            CompressionAlgorithmGql::None,
            CompressionAlgorithmGql::Gzip,
            CompressionAlgorithmGql::Brotli,
            CompressionAlgorithmGql::Zstd,
            CompressionAlgorithmGql::LZ4,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_offline_strategy_gql() {
        for v in [
            OfflineStrategyGql::CacheFirst,
            OfflineStrategyGql::NetworkFirst,
            OfflineStrategyGql::CacheOnly,
            OfflineStrategyGql::NetworkOnly,
            OfflineStrategyGql::StaleWhileRevalidate,
            OfflineStrategyGql::StaleAndUpdate,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_offline_conflict_resolution_strategy_gql() {
        for v in [
            OfflineConflictResolutionStrategyGql::ServerWins,
            OfflineConflictResolutionStrategyGql::ClientWins,
            OfflineConflictResolutionStrategyGql::Merge,
            OfflineConflictResolutionStrategyGql::Manual,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_mutation_status_gql() {
        for v in [
            MutationStatusGql::Pending,
            MutationStatusGql::Syncing,
            MutationStatusGql::Synced,
            MutationStatusGql::Failed,
            MutationStatusGql::Conflict,
        ] {
            assert!(roundtrip(&v));
        }
    }

    // ===== enum as_str =====

    #[test]
    fn enum_as_str_discovery_status() {
        assert_eq!(DiscoveryStatus::New.as_str(), "new");
        assert_eq!(DiscoveryStatus::Approved.as_str(), "approved");
        assert_eq!(DiscoveryStatus::UnderReview.as_str(), "under_review");
    }
    #[test]
    fn enum_as_str_user_role() {
        assert_eq!(UserRole::Admin.as_str(), "admin");
        assert_eq!(
            UserRole::Custom("custom_role".into()).as_str(),
            "custom_role"
        );
    }
    #[test]
    fn enum_as_str_mask_type() {
        assert_eq!(MaskType::Full.as_str(), "full");
        assert_eq!(MaskType::Hash.as_str(), "hash");
    }
    #[test]
    fn enum_as_str_optimization_category() {
        assert_eq!(OptimizationCategory::NPlusOne.as_str(), "n_plus_one");
    }
    #[test]
    fn enum_as_str_severity_level() {
        assert_eq!(SeverityLevel::Critical.as_str(), "critical");
        assert_eq!(SeverityLevel::Low.as_str(), "low");
    }
    #[test]
    fn enum_as_str_alert_level() {
        assert_eq!(AlertLevel::Info.as_str(), "info");
        assert_eq!(AlertLevel::Emergency.as_str(), "emergency");
    }
    #[test]
    fn enum_as_str_alert_type() {
        assert_eq!(AlertType::HighLatency.as_str(), "high_latency");
    }
    #[test]
    fn enum_as_str_verification_factor_gql() {
        assert_eq!(VerificationFactorGql::Password.as_str(), "password");
    }
    #[test]
    fn enum_as_str_signature_algorithm_gql() {
        assert_eq!(SignatureAlgorithmGql::HMACSHA256.as_str(), "HMAC-SHA256");
        assert_eq!(SignatureAlgorithmGql::Ed25519.as_str(), "Ed25519");
    }
    #[test]
    fn enum_as_str_rejection_reason_gql() {
        assert_eq!(
            RejectionReasonGql::InvalidSignature.as_str(),
            "invalid_signature"
        );
    }
    #[test]
    fn enum_as_str_principal_type_gql() {
        assert_eq!(PrincipalTypeGql::User.as_str(), "user");
    }
    #[test]
    fn enum_as_str_mask_strategy_gql() {
        assert_eq!(MaskStrategyGql::None.as_str(), "none");
    }

    // ===== enum from_str =====

    #[test]
    fn enum_from_str_user_role() {
        assert_eq!(UserRole::from_str("admin"), UserRole::Admin);
        assert_eq!(UserRole::from_str("manager"), UserRole::Manager);
    }
    #[test]
    fn enum_from_str_mask_type() {
        assert_eq!(MaskType::from_str("full"), MaskType::Full);
        assert_eq!(MaskType::from_str("hash"), MaskType::Hash);
    }

    // ===== struct roundtrip (batch 1: SimpleObject Gql with String fields) =====

    #[test]
    fn struct_rt_master_data_event_gql() {
        assert!(roundtrip(&MasterDataEventGql {
            domain: "d".into(),
            action: "a".into(),
            master_data_id: "m".into(),
            source_service: "s".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_notification_event_gql() {
        assert!(roundtrip(&NotificationEventGql {
            id: "1".into(),
            user_id: "u".into(),
            title: "t".into(),
            content: "c".into(),
            notification_type: "info".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_workflow_task_event_gql() {
        assert!(roundtrip(&WorkflowTaskEventGql {
            task_id: "t".into(),
            assignee_id: "a".into(),
            instance_title: "i".into(),
            priority: "p".into(),
            status: "s".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_order_status_event_gql() {
        assert!(roundtrip(&OrderStatusEventGql {
            order_id: "o".into(),
            order_type: "t".into(),
            old_status: "os".into(),
            new_status: "ns".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_field_permission() {
        assert!(roundtrip(&FieldPermission {
            entity_type: "User".into(),
            field_name: "phone".into(),
            allowed_roles: vec!["admin".into()],
            denied_roles: vec![],
            condition: None,
        }));
    }
    #[test]
    fn struct_rt_masking_rule() {
        assert!(roundtrip(&MaskingRule {
            entity_type: "User".into(),
            field_name: "phone".into(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".into()],
        }));
    }
    #[test]
    fn struct_rt_field_access_audit() {
        assert!(roundtrip(&FieldAccessAudit {
            id: "1".into(),
            timestamp: chrono::Utc::now(),
            user_id: None,
            user_roles: vec![],
            ip: None,
            entity_type: "User".into(),
            entity_id: None,
            field_name: "phone".into(),
            access_result: "allowed".into(),
            mask_type: None,
            query_hash: None,
        }));
    }
    #[test]
    fn struct_rt_field_change() {
        assert!(roundtrip(&FieldChange {
            field_name: "phone".into(),
            old_value: j("\"old\""),
            new_value: j("\"new\""),
            masked: false,
        }));
    }
    #[test]
    fn struct_rt_data_change_audit() {
        assert!(roundtrip(&DataChangeAudit {
            id: "1".into(),
            timestamp: chrono::Utc::now(),
            user_id: None,
            user_roles: vec![],
            entity_type: "User".into(),
            entity_id: "1".into(),
            operation: "update".into(),
            changed_fields: vec![],
            mutation_name: "m".into(),
            query_hash: None,
        }));
    }
    #[test]
    fn struct_rt_security_config() {
        assert!(roundtrip(&SecurityConfig {
            field_permissions_enabled: true,
            data_masking_enabled: true,
            field_audit_enabled: false,
            data_change_audit_enabled: false,
            default_deny: true,
            audit_sensitive_fields_only: true,
        }));
    }
    #[test]
    fn struct_rt_filter_condition() {
        assert!(roundtrip(&FilterCondition {
            field: "status".into(),
            operator: FilterOperator::Eq,
            value: j("\"active\""),
        }));
    }
    #[test]
    fn struct_rt_subscription_filter() {
        assert!(roundtrip(&SubscriptionFilter {
            include_fields: None,
            exclude_fields: None,
            conditions: None,
            deduplicate: true,
            dedup_key: None,
        }));
    }
    #[test]
    fn struct_rt_data_change_event() {
        assert!(roundtrip(&DataChangeEvent {
            entity_type: "User".into(),
            entity_id: "1".into(),
            update_type: UpdateType::Created,
            data: None,
            delta: None,
            version: 1,
            timestamp: "2025-01-01".into(),
            source: "svc".into(),
        }));
    }
    #[test]
    fn struct_rt_subscription_checkpoint() {
        assert!(roundtrip(&SubscriptionCheckpoint {
            subscription_id: "s1".into(),
            last_event_id: None,
            last_event_timestamp: None,
        }));
    }
    #[test]
    fn struct_rt_query_span_gql() {
        assert!(roundtrip(&QuerySpanGql {
            span_id: "sp1".into(),
            parent_span_id: None,
            name: "parse".into(),
            service: "gateway".into(),
            span_type: SpanType::Parse,
            start_time: "2025-01-01".into(),
            end_time: None,
            duration_ms: 1.0,
            attributes: j("{}"),
            status: "ok".into(),
            error_message: None,
        }));
    }
    #[test]
    fn struct_rt_query_trace_gql() {
        assert!(roundtrip(&QueryTraceGql {
            trace_id: "t1".into(),
            query_hash: None,
            operation_name: None,
            start_time: "2025-01-01".into(),
            end_time: None,
            duration_ms: 10.0,
            status: "ok".into(),
            spans: vec![],
            error_message: None,
            user_id: None,
            client_info: None,
        }));
    }
    #[test]
    fn struct_rt_graphql_alert_gql() {
        assert!(roundtrip(&GraphqlAlertGql {
            id: "a1".into(),
            alert_type: AlertType::HighLatency,
            level: AlertLevel::Warning,
            message: "slow".into(),
            value: 500.0,
            threshold: 100.0,
            started_at: "2025-01-01".into(),
            acknowledged: false,
            resolved: false,
            resolved_at: None,
            labels: j("{}"),
        }));
    }
    #[test]
    fn struct_rt_realtime_stream_update_gql() {
        assert!(roundtrip(&RealtimeStreamUpdateGql {
            update_id: "u1".into(),
            stream_type: StreamUpdateTypeGql::Insert,
            entity_type: "User".into(),
            entity_id: "1".into(),
            changed_fields: vec![],
            old_values: j("{}"),
            new_values: j("{}"),
            timestamp: "2025-01-01".into(),
            sequence_number: 1,
        }));
    }
    #[test]
    fn struct_rt_stream_snapshot_gql() {
        assert!(roundtrip(&StreamSnapshotGql {
            snapshot_id: "s1".into(),
            entity_type: "User".into(),
            sequence_number: 1,
            data: j("{}"),
            created_at: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_field_delta_gql() {
        assert!(roundtrip(&FieldDeltaGql {
            field_path: "phone".into(),
            operation: UpdateOperationGql::Set,
            old_value: j("\"old\""),
            new_value: j("\"new\""),
        }));
    }
    #[test]
    fn struct_rt_incremental_update_gql() {
        assert!(roundtrip(&IncrementalUpdateGql {
            update_id: "u1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            version: 2,
            delta: j("{}"),
            base_version: 1,
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_sync_conflict_gql() {
        assert!(roundtrip(&SyncConflictGql {
            conflict_id: "c1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            client_version: 1,
            server_version: 2,
            conflict_fields: vec!["phone".into()],
            resolution_strategy: ConflictResolutionStrategyGql::ServerWins,
        }));
    }
    #[test]
    fn struct_rt_sync_session_gql() {
        assert!(roundtrip(&SyncSessionGql {
            session_id: "s1".into(),
            client_id: "c".into(),
            last_sync_version: 0,
            current_version: 5,
            pending_updates: 2,
            sync_state: SyncStateGql::InSync,
            started_at: "2025-01-01".into(),
            last_sync_at: None,
        }));
    }
    #[test]
    fn struct_rt_risk_factor_gql() {
        assert!(roundtrip(&RiskFactorGql {
            factor_type: "geo".into(),
            severity: "low".into(),
            description: "ok".into(),
            weight: 1,
        }));
    }
    #[test]
    fn struct_rt_risk_score_gql() {
        assert!(roundtrip(&RiskScoreGql {
            total_score: 10,
            level: "low".into(),
            factors: vec![],
            assessed_at: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_zero_trust_policy_gql() {
        assert!(roundtrip(&ZeroTrustPolicyGql {
            policy_id: "p1".into(),
            name: "default".into(),
            required_trust_level: TrustLevelGql::MediumTrust,
            max_risk_score: 100,
            required_verification_factors: vec![],
            resource_patterns: vec![],
        }));
    }
    #[test]
    fn struct_rt_zero_trust_stats_gql() {
        assert!(roundtrip(&ZeroTrustStatsGql {
            total_assessments: 100,
            avg_risk_score: 15.0,
            by_trust_level: vec![],
            blocked_requests: 0,
            verification_challenges: 5,
        }));
    }
    #[test]
    fn struct_rt_signature_config_gql() {
        assert!(roundtrip(&SignatureConfigGql {
            algorithm: SignatureAlgorithmGql::HMACSHA256,
            key_id: "k1".into(),
            timestamp_window_seconds: 300,
            nonce_cache_size: 1000,
            require_signature: true,
        }));
    }
    #[test]
    fn struct_rt_signed_request_gql() {
        assert!(roundtrip(&SignedRequestGql {
            request_id: "r1".into(),
            signature: "sig".into(),
            timestamp: 1000000,
            nonce: "n1".into(),
            algorithm: SignatureAlgorithmGql::HMACSHA256,
            key_id: "k1".into(),
            body_hash: "h".into(),
        }));
    }
    #[test]
    fn struct_rt_key_info_gql() {
        assert!(roundtrip(&KeyInfoGql {
            key_id: "k1".into(),
            algorithm: SignatureAlgorithmGql::Ed25519,
            created_at: "2025-01-01".into(),
            revoked: false,
            revoked_at: None,
            sign_count: 100,
        }));
    }
    #[test]
    fn struct_rt_signature_stats_gql() {
        assert!(roundtrip(&SignatureStatsGql {
            total_verified: 1000,
            total_rejected: 10,
            rejection_reasons: vec![],
            avg_verify_time_ms: 1.5,
        }));
    }
    #[test]
    fn struct_rt_permission_condition_gql() {
        assert!(roundtrip(&PermissionConditionGql {
            field: "role".into(),
            operator: "eq".into(),
            value: "admin".into(),
        }));
    }
    #[test]
    fn struct_rt_data_field_permission_gql() {
        assert!(roundtrip(&DataFieldPermissionGql {
            field_name: "phone".into(),
            allowed_levels: vec!["read".into()],
            mask_strategy: MaskStrategyGql::Partial,
        }));
    }
    #[test]
    fn struct_rt_data_permission_gql() {
        assert!(roundtrip(&DataPermissionGql {
            permission_id: "p1".into(),
            resource_type: "User".into(),
            resource_id: None,
            principal_type: PrincipalTypeGql::User,
            principal_id: "u1".into(),
            permission_level: PermissionLevelGql::Read,
            conditions: vec![],
            field_permissions: vec![],
            granted_by: "admin".into(),
            granted_at: "2025-01-01".into(),
            expires_at: None,
        }));
    }
    #[test]
    fn struct_rt_permission_audit_log_gql() {
        assert!(roundtrip(&PermissionAuditLogGql {
            action: "grant".into(),
            principal: "admin".into(),
            resource: "User:1".into(),
            permission_level: "read".into(),
            timestamp: "2025-01-01".into(),
            result: "ok".into(),
        }));
    }
    #[test]
    fn struct_rt_data_permission_stats_gql() {
        assert!(roundtrip(&DataPermissionStatsGql {
            total_permissions: 50,
            by_principal_type: vec![],
            by_permission_level: vec![],
            audit_logs: 1000,
            masked_fields: 10,
        }));
    }
    #[test]
    fn struct_rt_query_signature_gql() {
        assert!(roundtrip(&QuerySignatureGql {
            operation_type: "query".into(),
            root_field: "users".into(),
            fields_hash: "fh".into(),
            arguments_hash: "ah".into(),
            directives_hash: "dh".into(),
        }));
    }
    #[test]
    fn struct_rt_semantic_cache_entry_gql() {
        assert!(roundtrip(&SemanticCacheEntryGql {
            cache_id: "c1".into(),
            query_hash: "qh".into(),
            query_signature: QuerySignatureGql {
                operation_type: "query".into(),
                root_field: "users".into(),
                fields_hash: "fh".into(),
                arguments_hash: "ah".into(),
                directives_hash: "dh".into(),
            },
            normalized_query: "{ users { id } }".into(),
            result: "{}".into(),
            created_at: "2025-01-01".into(),
            ttl: 3600,
            hit_count: 100,
            last_accessed: "2025-01-01".into(),
            tags: vec![],
        }));
    }
    #[test]
    fn struct_rt_semantic_cache_config_gql() {
        assert!(roundtrip(&SemanticCacheConfigGql {
            max_entries: 1000,
            default_ttl_seconds: 3600,
            similarity_threshold: 0.9,
            enable_fuzzy_match: false,
            compression_enabled: true,
        }));
    }
    #[test]
    fn struct_rt_semantic_cache_invalidation_rule_gql() {
        assert!(roundtrip(&SemanticCacheInvalidationRuleGql {
            rule_id: "r1".into(),
            tag: "User".into(),
            query_pattern: "*User*".into(),
            priority: 1,
            enabled: true,
        }));
    }
    #[test]
    fn struct_rt_compression_config_gql() {
        assert!(roundtrip(&CompressionConfigGql {
            algorithm: CompressionAlgorithmGql::Gzip,
            level: 6,
            min_size_threshold: 1024,
            enable_deduplication: false,
            enable_delta_encoding: false,
        }));
    }
    #[test]
    fn struct_rt_compressed_result_gql() {
        assert!(roundtrip(&CompressedResultGql {
            original_size: 1000,
            compressed_size: 400,
            compression_ratio: 0.4,
            algorithm: CompressionAlgorithmGql::Gzip,
            compressed_data: "abc".into(),
            metadata: "m".into(),
        }));
    }
    #[test]
    fn struct_rt_data_profile_gql() {
        assert!(roundtrip(&DataProfileGql {
            data_type: "object".into(),
            array_count: 10,
            object_count: 5,
            string_ratio: 0.5,
            number_ratio: 0.3,
            null_ratio: 0.1,
            estimated_compressibility: 0.6,
        }));
    }
    #[test]
    fn struct_rt_offline_policy_gql() {
        assert!(roundtrip(&OfflinePolicyGql {
            strategy: OfflineStrategyGql::CacheFirst,
            max_stale_time_seconds: 300,
            background_sync_enabled: true,
            conflict_resolution: OfflineConflictResolutionStrategyGql::ServerWins,
            fallback_data: None,
        }));
    }
    #[test]
    fn struct_rt_offline_mutation_gql() {
        assert!(roundtrip(&OfflineMutationGql {
            mutation_id: "m1".into(),
            operation: "mutation".into(),
            variables: "{}".into(),
            status: MutationStatusGql::Pending,
            created_at: "2025-01-01".into(),
            synced_at: None,
            retry_count: 0,
            error: None,
        }));
    }

    // ===== 剩余 10 个未覆盖的 derive roundtrip =====

    #[test]
    fn enum_rt_cache_tier() {
        for v in [
            CacheTier::None,
            CacheTier::ShortLived,
            CacheTier::MediumLived,
            CacheTier::LongLived,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn struct_rt_realtime_stream_update_data() {
        assert!(roundtrip(&RealtimeStreamUpdateData {
            update_id: "u1".into(),
            stream_type: StreamUpdateTypeGql::Insert,
            entity_type: "User".into(),
            entity_id: "1".into(),
            changed_fields: vec![],
            old_values: j("{}"),
            new_values: j("{}"),
            timestamp: chrono::Utc::now(),
            sequence_number: 1,
        }));
    }
    #[test]
    fn struct_rt_stream_snapshot_data() {
        assert!(roundtrip(&StreamSnapshotData {
            snapshot_id: "s1".into(),
            entity_type: "User".into(),
            sequence_number: 1,
            data: j("{}"),
            created_at: chrono::Utc::now(),
        }));
    }
    #[test]
    fn struct_rt_incremental_update_data() {
        assert!(roundtrip(&IncrementalUpdateData {
            update_id: "u1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            version: 2,
            delta: j("{}"),
            base_version: 1,
            timestamp: chrono::Utc::now(),
            applied: true,
            valid: true,
        }));
    }
    #[test]
    fn struct_rt_sync_session_data() {
        assert!(roundtrip(&SyncSessionData {
            session_id: "s1".into(),
            client_id: "c".into(),
            last_sync_version: 0,
            current_version: 5,
            pending_updates: 2,
            sync_state: SyncStateGql::InSync,
            started_at: chrono::Utc::now(),
            last_sync_at: None,
        }));
    }
    #[test]
    fn struct_rt_sync_conflict_data() {
        assert!(roundtrip(&SyncConflictData {
            conflict_id: "c1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            client_version: 1,
            server_version: 2,
            conflict_fields: vec![],
            resolution_strategy: ConflictResolutionStrategyGql::ServerWins,
            resolved: false,
        }));
    }
    #[test]
    fn struct_rt_trust_context_gql() {
        assert!(roundtrip(&TrustContextGql {
            client_id: "c".into(),
            user_id: None,
            device_id: None,
            ip_address: "127.0.0.1".into(),
            geo_location: None,
            device_fingerprint: None,
            trust_level: TrustLevelGql::MediumTrust,
            risk_score: 10,
            verification_factors: vec![],
            assessed_at: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_risk_factor() {
        assert!(roundtrip(&RiskFactor {
            factor_type: "geo".into(),
            severity: "low".into(),
            description: "ok".into(),
            weight: 1,
        }));
    }
    #[test]
    fn struct_rt_permission_condition() {
        assert!(roundtrip(&PermissionCondition {
            field: "role".into(),
            operator: "eq".into(),
            value: "admin".into(),
        }));
    }
    #[test]
    fn struct_rt_offline_mutation_data() {
        assert!(roundtrip(&OfflineMutationData {
            mutation_id: "m1".into(),
            operation: "mutation".into(),
            variables: "{}".into(),
            status: MutationStatusGql::Pending,
            created_at: chrono::Utc::now(),
            synced_at: None,
            retry_count: 0,
            error: None,
        }));
    }
}

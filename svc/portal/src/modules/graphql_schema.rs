#![allow(dead_code)] // Reserved: GraphQL 聚合层模块，待业务接入后启用
#![allow(ambiguous_glob_reexports, hidden_glob_reexports)] // portal 模块级 glob re-export 设计模式
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

use async_graphql::dataloader::DataLoader;
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

pub use crate::modules::graphql_ai_assist::*;
pub use crate::modules::graphql_cache::*;
pub use crate::modules::graphql_dataloader::*;
pub use crate::modules::graphql_edge_computing::*;
pub use crate::modules::graphql_edge_v2::*;
pub use crate::modules::graphql_enterprise_security::*;
pub use crate::modules::graphql_federation::*;
pub use crate::modules::graphql_federation_v4::*;
pub use crate::modules::graphql_gateway_security::*;
pub use crate::modules::graphql_governance::*;
pub use crate::modules::graphql_helpers::*;
pub use crate::modules::graphql_realtime_stream::*;
pub use crate::modules::graphql_monitoring::*;
pub use crate::modules::graphql_security::*;
pub use crate::modules::graphql_semantic_cache::*;
pub use crate::modules::graphql_subscription_enhanced::*;
pub use crate::modules::graphql_types::*;
pub use crate::modules::query_governance::*;
pub use crate::modules::rate_limiting::*;
pub use crate::modules::schema_versioning::*;
// V44.0 拆分后：显式导入消歧（graphql_federation 与 rate_limiting 均定义 reset_circuit_breaker，
// 原 schema 本地副本为 `-> bool` 版本，与 graphql_federation 一致，故显式指向该版本）
use crate::modules::graphql_federation::reset_circuit_breaker;
use crate::shared::AppState;
use topems_shared_observability::telemetry::TracedRequestExt;

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

        // 模块化单体模式（MONOLITH_SERVICE_URL）：所有服务进程内嵌于 topems-server，
        // 统一探测 server 聚合 /health（200 = 服务所在进程存活）；
        // 独立部署模式：逐服务独立端口探测。
        let futures = services.iter().map(|(name, url)| async move {
            let healthy = probe_service_health(name, url).await;
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
            let healthy = probe_service_health(name, url).await;
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
            let healthy = probe_service_health(name, url).await;
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
                    let healthy = probe_service_health(name, url).await;
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

// ==================== Schema 构建 ====================

pub type PortalSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

/// V35.0 Phase 5: 查询复杂度限制
pub const MAX_QUERY_COMPLEXITY: usize = 1000;
/// V35.0 Phase 5: 查询深度限制
pub const MAX_QUERY_DEPTH: usize = 10;
/// V35.0 Phase 6: APQ 缓存容量
const APQ_CACHE_CAPACITY: usize = 256;
/// V40.0: 全局安全事件存储（内存环形缓冲）
static SECURITY_EVENTS: std::sync::OnceLock<Mutex<VecDeque<SecurityEvent>>> =
    std::sync::OnceLock::new();
/// V40.0: 安全事件最大保留条数
const MAX_SECURITY_EVENTS: usize = 500;

fn security_events() -> &'static Mutex<VecDeque<SecurityEvent>> {
    SECURITY_EVENTS.get_or_init(|| Mutex::new(VecDeque::new()))
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
// ==================== V40.0: IP 黑名单 ====================

/// V40.0: 全局 IP 黑名单
static IP_BLACKLIST: std::sync::OnceLock<RwLock<HashSet<String>>> = std::sync::OnceLock::new();

fn ip_blacklist() -> &'static RwLock<HashSet<String>> {
    IP_BLACKLIST.get_or_init(|| RwLock::new(HashSet::new()))
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
// ==================== V41.0: 安全审计报表 ====================
// ==================== V41.0: 性能调优建议 ====================
// ==================== V42.0 Track B: 联邦网关 V2 ====================
//
// 实现联邦网关 V2:
// 1. 服务元数据与自动注册（基于服务元数据自动生成 resolver）
// 2. 实体解析器自动生成（批量 + 缓存 + 去重）
// 3. 联邦查询计划器（解析查询 → 生成执行计划 → 并发执行）
// 4. 联邦 Schema 自动组合（基于 SERVICE_REGISTRY）
// --- 服务元数据 ---
// --- 服务注册表 ---

static SERVICE_REGISTRY: std::sync::OnceLock<RwLock<Vec<ServiceMetadata>>> =
    std::sync::OnceLock::new();

fn service_registry() -> &'static RwLock<Vec<ServiceMetadata>> {
    SERVICE_REGISTRY.get_or_init(|| RwLock::new(Vec::new()))
}
/// V42.0: 查询计划缓存
static FEDERATION_V2_PLAN_CACHE: std::sync::OnceLock<Mutex<HashMap<String, FederationQueryPlan>>> =
    std::sync::OnceLock::new();

fn federation_v2_plan_cache() -> &'static Mutex<HashMap<String, FederationQueryPlan>> {
    FEDERATION_V2_PLAN_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
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
// --- Schema 自动组合 ---
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
fn record_federation_v2_auto_resolver() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.auto_resolvers_used += 1;
}
// ==================== V44.0 Track B: Federation V3 — 分布式查询计划 + 容错降级 + 缓存 + 监控 ====================
// --- V3: 全局状态 ---

static FEDERATION_V3_STATS: std::sync::OnceLock<Mutex<FederationV3StatsInternal>> =
    std::sync::OnceLock::new();
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
// --- V3: GraphQL 输出类型 ---
// --- V3: 分布式查询计划器 ---
// --- V3: 熔断器控制 ---
// --- V3: 联邦缓存管理器 ---
// --- V3: V3 执行器 ---
// --- V3: 统计与转换函数 ---
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::graphql_cache::CacheTier;

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

//! V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应（自 graphql_schema.rs 拆分）
//!
//! 1. 边缘计算：EdgeComputeManager（节点注册 / 函数部署 / 区域统计 / 边缘路由）
//! 2. CDN 缓存增强：CdnCacheManager（多层缓存 / 缓存条目 / 配置 / 统计）
//! 3. 流式响应：StreamingResponseManager（StreamConfig / DeferredField / StreamChunk / 指令检测 / 统计）
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_edge_computing::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;

use crate::modules::graphql_cache::LruCache;

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
pub struct EdgeNodeData {
    pub id: String,
    pub region: String,
    pub location: String,
    pub latency_ms: i32,
    pub health: bool,
    pub capacity: i32,
    pub current_load: i32,
    pub functions_deployed: i32,
}

#[derive(Clone)]
pub struct EdgeFunctionData {
    pub id: String,
    pub name: String,
    pub handler: String,
    pub route_pattern: String,
    pub cache_ttl_ms: i64,
    pub deployed_to_regions: Vec<String>,
    pub version: String,
    pub enabled: bool,
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

pub struct EdgeComputeState {
    pub nodes: Vec<EdgeNodeData>,
    pub functions: Vec<EdgeFunctionData>,
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

    pub fn edge_compute_state() -> &'static Mutex<EdgeComputeState> {
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
    pub enabled: bool,
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


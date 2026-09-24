//! V46.0: GraphQL 联邦缓存增强 + 智能预取 + 边缘编排 + Deprecation 管理（自 graphql_schema.rs 拆分）
//!
//! Part 1：缓存与编排
//! 1.1 联邦查询缓存增强：FederatedQueryCacheV2（多级缓存 / 缓存条目 / 统计）
//! 1.2 智能预取引擎：PrefetchEngine（预取查询 / 命中预测 / 预取统计）
//! 1.3 边缘函数编排：EdgeFunctionOrchestrator（函数编排 / 依赖调度 / 编排统计）
//! Part 2：生命周期管理
//! 2.1 废弃管理：DeprecationManager（废弃字段 / 迁移计划）
//! 2.2 版本迁移工具：MigrationToolkit（版本迁移 / 迁移步骤）
//! 2.3 平滑升级管理：DeploymentManager（部署 / 回滚 / 金丝雀）
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_edge_v2::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Mutex;

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

pub fn uuid_simple() -> String {
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

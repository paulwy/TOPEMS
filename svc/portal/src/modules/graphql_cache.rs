//! GraphQL 缓存体系模块
//!
//! 从 graphql_schema.rs 拆分出来的独立模块。
//! 包含：LRU 缓存工具、缓存层级枚举、智能缓存体系。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex, RwLock};

/// V40.0: 简单 LRU 缓存实现（HashMap + VecDeque）
#[allow(dead_code)]
pub struct LruCache<K, V> {
    pub map: HashMap<K, V>,
    pub order: VecDeque<K>,
    capacity: usize,
}

#[allow(dead_code)]
impl<K: std::cmp::Eq + std::hash::Hash + Clone, V> LruCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        Self {
            map: HashMap::new(),
            order: VecDeque::new(),
            capacity,
        }
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        if self.map.contains_key(key) {
            self.order.retain(|k| k != key);
            self.order.push_front(key.clone());
            self.map.get(key)
        } else {
            None
        }
    }

    pub fn put(&mut self, key: K, value: V) {
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

    pub fn len(&self) -> usize {
        self.map.len()
    }
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


// ==================== V41.0 Track B: GraphQL 智能缓存体系 ====================

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

pub fn extract_query_name(key: &str) -> String {
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

pub fn cache_invalidation_rules() -> &'static Vec<CacheInvalidationRuleGql> {
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

pub fn prefetch_rules() -> &'static Vec<QueryPrefetchRuleGql> {
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


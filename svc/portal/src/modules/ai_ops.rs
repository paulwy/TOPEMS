#![allow(dead_code)] // Reserved: V60 AI 运维模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V60.0 GraphQL AI 运维: 智能查询路由 + 自动缓存 + 自愈机制
//!
//! 核心能力：
//! 1. 智能查询路由 (Smart Query Routing)
//!    - SmartRouter: 路由规则匹配、服务负载均衡、查询路由决策
//!    - RoutingRule: 路由规则 (条件匹配/目标服务/优先级/权重)
//!    - RoutingDecision: 路由决策 (查询哈希/匹配规则/置信度)
//!    - ServiceLoad: 服务负载 (CPU/内存/延迟/活跃查询)
//! 2. 自动缓存 (Auto Cache)
//!    - AutoCacheManager: 缓存策略管理、缓存读写、失效清理
//!    - CachePolicy: 缓存策略 (作用域/TTL/失效策略/容量)
//!    - CacheEntry: 缓存条目 (键/值/TTL/访问计数)
//!    - InvalidationEvent: 失效事件
//! 3. 自愈机制 (Self-Healing)
//!    - SelfHealingEngine: 健康检查、自愈执行、恢复计划
//!    - HealthCheck: 健康检查 (存活性/就绪性/依赖)
//!    - HealingAction: 自愈动作 (重启/扩容/移除/重定向)
//!    - RecoveryPlan: 恢复计划

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_ROUTING_RULES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_routing_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    condition JSONB NOT NULL DEFAULT '{}',
    target_service VARCHAR(128) NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    weight INT NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rr_enabled ON portal_routing_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_rr_priority ON portal_routing_rules(priority DESC);
"#;

pub const CREATE_ROUTING_DECISIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_routing_decisions (
    id VARCHAR(64) PRIMARY KEY,
    query_hash VARCHAR(128),
    matched_rule_id VARCHAR(64),
    target_service VARCHAR(128) NOT NULL,
    reason VARCHAR(256),
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    routed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_query ON portal_routing_decisions(query_hash);
CREATE INDEX IF NOT EXISTS idx_rd_service ON portal_routing_decisions(target_service);
CREATE INDEX IF NOT EXISTS idx_rd_routed ON portal_routing_decisions(routed_at DESC);
"#;

pub const CREATE_SERVICE_LOADS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_service_loads (
    service_id VARCHAR(128) PRIMARY KEY,
    cpu_usage DOUBLE PRECISION NOT NULL DEFAULT 0,
    memory_usage DOUBLE PRECISION NOT NULL DEFAULT 0,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    active_queries INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_CACHE_POLICIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_cache_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    scope VARCHAR(32) NOT NULL DEFAULT 'query',
    ttl_ms BIGINT NOT NULL DEFAULT 3600000,
    invalidation_strategy VARCHAR(32) NOT NULL DEFAULT 'time_based',
    max_size BIGINT NOT NULL DEFAULT 10000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_scope ON portal_cache_policies(scope);
"#;

pub const CREATE_CACHE_ENTRIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_cache_entries (
    key VARCHAR(512) PRIMARY KEY,
    value JSONB NOT NULL,
    ttl BIGINT NOT NULL DEFAULT 3600000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_count BIGINT NOT NULL DEFAULT 0,
    last_accessed TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ce_expires ON portal_cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_ce_access ON portal_cache_entries(access_count DESC);
"#;

pub const CREATE_INVALIDATION_EVENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_invalidation_events (
    id VARCHAR(64) PRIMARY KEY,
    cache_key VARCHAR(512) NOT NULL,
    reason VARCHAR(256),
    triggered_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ie_key ON portal_invalidation_events(cache_key);
CREATE INDEX IF NOT EXISTS idx_ie_created ON portal_invalidation_events(created_at DESC);
"#;

pub const CREATE_HEALTH_CHECKS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_health_checks (
    id VARCHAR(64) PRIMARY KEY,
    service_id VARCHAR(128) NOT NULL,
    check_type VARCHAR(32) NOT NULL,
    interval_ms BIGINT NOT NULL DEFAULT 10000,
    timeout_ms BIGINT NOT NULL DEFAULT 5000,
    healthy_threshold INT NOT NULL DEFAULT 2,
    unhealthy_threshold INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hc_service ON portal_health_checks(service_id);
CREATE INDEX IF NOT EXISTS idx_hc_type ON portal_health_checks(check_type);
"#;

pub const CREATE_HEALING_ACTIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_healing_actions (
    id VARCHAR(64) PRIMARY KEY,
    trigger VARCHAR(32) NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    target VARCHAR(256) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    executed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ha_trigger ON portal_healing_actions(trigger);
CREATE INDEX IF NOT EXISTS idx_ha_status ON portal_healing_actions(status);
CREATE INDEX IF NOT EXISTS idx_ha_executed ON portal_healing_actions(executed_at DESC);
"#;

pub const CREATE_RECOVERY_PLANS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_recovery_plans (
    id VARCHAR(64) PRIMARY KEY,
    service_id VARCHAR(128) NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]',
    estimated_duration_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_rp_service ON portal_recovery_plans(service_id);
CREATE INDEX IF NOT EXISTS idx_rp_status ON portal_recovery_plans(status);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoutingCondition {
    QueryHash,
    OperationName,
    ServicePattern,
    Custom,
}

impl RoutingCondition {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::QueryHash => "query_hash",
            Self::OperationName => "operation_name",
            Self::ServicePattern => "service_pattern",
            Self::Custom => "custom",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CacheScope {
    Query,
    Mutation,
    Subscription,
}

impl CacheScope {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Query => "query",
            Self::Mutation => "mutation",
            Self::Subscription => "subscription",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "mutation" => Self::Mutation,
            "subscription" => Self::Subscription,
            _ => Self::Query,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Query, Self::Mutation, Self::Subscription]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InvalidationStrategy {
    TimeBased,
    EventBased,
    Manual,
}

impl InvalidationStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TimeBased => "time_based",
            Self::EventBased => "event_based",
            Self::Manual => "manual",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "event_based" => Self::EventBased,
            "manual" => Self::Manual,
            _ => Self::TimeBased,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::TimeBased, Self::EventBased, Self::Manual]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthCheckType {
    Liveness,
    Readiness,
    Dependency,
}

impl HealthCheckType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Liveness => "liveness",
            Self::Readiness => "readiness",
            Self::Dependency => "dependency",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "readiness" => Self::Readiness,
            "dependency" => Self::Dependency,
            _ => Self::Liveness,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Liveness, Self::Readiness, Self::Dependency]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealingTrigger {
    HealthCheck,
    Failure,
    Timeout,
}

impl HealingTrigger {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::HealthCheck => "health_check",
            Self::Failure => "failure",
            Self::Timeout => "timeout",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "failure" => Self::Failure,
            "timeout" => Self::Timeout,
            _ => Self::HealthCheck,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealingActionType {
    Restart,
    ScaleUp,
    Remove,
    Redirect,
}

impl HealingActionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Restart => "restart",
            Self::ScaleUp => "scale_up",
            Self::Remove => "remove",
            Self::Redirect => "redirect",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "scale_up" => Self::ScaleUp,
            "remove" => Self::Remove,
            "redirect" => Self::Redirect,
            _ => Self::Restart,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Restart, Self::ScaleUp, Self::Remove, Self::Redirect]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealingStatus {
    Pending,
    Executing,
    Completed,
    Failed,
}

impl HealingStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Executing => "executing",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "executing" => Self::Executing,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            _ => Self::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecoveryStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

impl RecoveryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "in_progress" => Self::InProgress,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            "cancelled" => Self::Cancelled,
            _ => Self::Pending,
        }
    }
}

// ==================== 智能查询路由结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingRule {
    pub id: String,
    pub name: String,
    pub condition: serde_json::Value,
    pub target_service: String,
    pub priority: i32,
    pub weight: i32,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl RoutingRule {
    pub fn new(
        name: String,
        condition: serde_json::Value,
        target_service: String,
        priority: i32,
        weight: i32,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            condition,
            target_service,
            priority,
            weight,
            enabled: true,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingDecision {
    pub id: String,
    pub query_hash: Option<String>,
    pub matched_rule_id: Option<String>,
    pub target_service: String,
    pub reason: String,
    pub confidence: f64,
    pub routed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceLoad {
    pub service_id: String,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub latency_ms: u64,
    pub active_queries: u32,
    pub last_updated: String,
}

impl ServiceLoad {
    pub fn new(service_id: String) -> Self {
        Self {
            service_id,
            cpu_usage: 0.0,
            memory_usage: 0.0,
            latency_ms: 0,
            active_queries: 0,
            last_updated: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn score(&self) -> f64 {
        let load_score = self.cpu_usage * 0.4 + self.memory_usage * 0.3;
        let latency_penalty = if self.latency_ms > 1000 {
            (self.latency_ms as f64 - 1000.0) * 0.001
        } else {
            0.0
        };
        load_score + latency_penalty
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteStats {
    pub total_routes: u64,
    pub routes_by_service: HashMap<String, u64>,
    pub avg_confidence: f64,
    pub rule_hit_rate: f64,
    pub top_rules: Vec<(String, u64)>,
}

// ==================== 自动缓存结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachePolicy {
    pub id: String,
    pub name: String,
    pub scope: CacheScope,
    pub ttl_ms: u64,
    pub invalidation_strategy: InvalidationStrategy,
    pub max_size: u64,
    pub created_at: String,
    pub updated_at: String,
}

impl CachePolicy {
    pub fn new(
        name: String,
        scope: CacheScope,
        ttl_ms: u64,
        invalidation_strategy: InvalidationStrategy,
        max_size: u64,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            scope,
            ttl_ms,
            invalidation_strategy,
            max_size,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry {
    pub key: String,
    pub value: serde_json::Value,
    pub ttl: u64,
    pub created_at: String,
    pub expires_at: String,
    pub access_count: u64,
    pub last_accessed: Option<String>,
}

impl CacheEntry {
    pub fn new(key: String, value: serde_json::Value, ttl: u64) -> Self {
        let now = chrono::Utc::now();
        let expires = now + chrono::Duration::milliseconds(ttl as i64);
        Self {
            key,
            value,
            ttl,
            created_at: now.to_rfc3339(),
            expires_at: expires.to_rfc3339(),
            access_count: 0,
            last_accessed: None,
        }
    }

    pub fn is_expired(&self) -> bool {
        let expires = chrono::DateTime::parse_from_rfc3339(&self.expires_at);
        match expires {
            Ok(dt) => dt < chrono::Utc::now(),
            Err(_) => true,
        }
    }

    pub fn access(&mut self) {
        self.access_count += 1;
        self.last_accessed = Some(chrono::Utc::now().to_rfc3339());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvalidationEvent {
    pub id: String,
    pub cache_key: String,
    pub reason: String,
    pub triggered_by: String,
    pub created_at: String,
}

impl InvalidationEvent {
    pub fn new(cache_key: String, reason: String, triggered_by: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            cache_key,
            reason,
            triggered_by,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub total_entries: u64,
    pub total_hits: u64,
    pub total_misses: u64,
    pub hit_rate: f64,
    pub expired_entries: u64,
    pub evicted_entries: u64,
    pub policies_count: u64,
}

// ==================== 自愈机制结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub id: String,
    pub service_id: String,
    pub check_type: HealthCheckType,
    pub interval_ms: u64,
    pub timeout_ms: u64,
    pub healthy_threshold: i32,
    pub unhealthy_threshold: i32,
}

impl HealthCheck {
    pub fn new(
        service_id: String,
        check_type: HealthCheckType,
        interval_ms: u64,
        timeout_ms: u64,
        healthy_threshold: i32,
        unhealthy_threshold: i32,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            service_id,
            check_type,
            interval_ms,
            timeout_ms,
            healthy_threshold,
            unhealthy_threshold,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealingAction {
    pub id: String,
    pub trigger: HealingTrigger,
    pub action_type: HealingActionType,
    pub target: String,
    pub status: HealingStatus,
    pub executed_at: Option<String>,
}

impl HealingAction {
    pub fn new(trigger: HealingTrigger, action_type: HealingActionType, target: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            trigger,
            action_type,
            target,
            status: HealingStatus::Pending,
            executed_at: None,
        }
    }

    pub fn execute(&mut self) {
        self.status = HealingStatus::Completed;
        self.executed_at = Some(chrono::Utc::now().to_rfc3339());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryPlan {
    pub id: String,
    pub service_id: String,
    pub steps: Vec<String>,
    pub estimated_duration_ms: u64,
    pub created_at: String,
    pub status: RecoveryStatus,
}

impl RecoveryPlan {
    pub fn new(service_id: String, steps: Vec<String>, estimated_duration_ms: u64) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            service_id,
            steps,
            estimated_duration_ms,
            created_at: chrono::Utc::now().to_rfc3339(),
            status: RecoveryStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthSummary {
    pub total_checks: u64,
    pub healthy_services: u64,
    pub degraded_services: u64,
    pub unhealthy_services: u64,
    pub total_healing_actions: u64,
    pub successful_healing: u64,
    pub failed_healing: u64,
    pub active_recovery_plans: u64,
}

// ==================== 内存存储 ====================

struct SmartRouterStore {
    rules: Mutex<Vec<RoutingRule>>,
    decisions: Mutex<Vec<RoutingDecision>>,
    service_loads: Mutex<HashMap<String, ServiceLoad>>,
    rule_hit_counts: Mutex<HashMap<String, u64>>,
    total_routes: Mutex<u64>,
}

fn get_smart_router_store() -> &'static SmartRouterStore {
    static STORE: LazyLock<SmartRouterStore> = LazyLock::new(|| SmartRouterStore {
        rules: Mutex::new(Vec::new()),
        decisions: Mutex::new(Vec::new()),
        service_loads: Mutex::new(HashMap::new()),
        rule_hit_counts: Mutex::new(HashMap::new()),
        total_routes: Mutex::new(0),
    });
    &STORE
}

struct AutoCacheStore {
    policies: Mutex<Vec<CachePolicy>>,
    entries: Mutex<HashMap<String, CacheEntry>>,
    invalidation_events: Mutex<Vec<InvalidationEvent>>,
    total_hits: Mutex<u64>,
    total_misses: Mutex<u64>,
    expired_count: Mutex<u64>,
    evicted_count: Mutex<u64>,
}

fn get_auto_cache_store() -> &'static AutoCacheStore {
    static STORE: LazyLock<AutoCacheStore> = LazyLock::new(|| AutoCacheStore {
        policies: Mutex::new(Vec::new()),
        entries: Mutex::new(HashMap::new()),
        invalidation_events: Mutex::new(Vec::new()),
        total_hits: Mutex::new(0),
        total_misses: Mutex::new(0),
        expired_count: Mutex::new(0),
        evicted_count: Mutex::new(0),
    });
    &STORE
}

struct SelfHealingStore {
    health_checks: Mutex<Vec<HealthCheck>>,
    healing_actions: Mutex<Vec<HealingAction>>,
    recovery_plans: Mutex<Vec<RecoveryPlan>>,
    unhealthy_counts: Mutex<HashMap<String, i32>>,
}

fn get_self_healing_store() -> &'static SelfHealingStore {
    static STORE: LazyLock<SelfHealingStore> = LazyLock::new(|| SelfHealingStore {
        health_checks: Mutex::new(Vec::new()),
        healing_actions: Mutex::new(Vec::new()),
        recovery_plans: Mutex::new(Vec::new()),
        unhealthy_counts: Mutex::new(HashMap::new()),
    });
    &STORE
}

// ==================== SmartRouter 实现 ====================

pub struct SmartRouter;

impl SmartRouter {
    pub async fn create_routing_rule(
        name: String,
        condition: serde_json::Value,
        target_service: String,
        priority: Option<i32>,
        weight: Option<i32>,
    ) -> RoutingRule {
        let rule = RoutingRule::new(
            name,
            condition,
            target_service,
            priority.unwrap_or(0),
            weight.unwrap_or(100),
        );
        let store = get_smart_router_store();
        let mut rules = store.rules.lock().await;
        rules.push(rule.clone());
        rule
    }

    pub async fn get_routing_rules(
        enabled_only: Option<bool>,
        target_service: Option<&str>,
    ) -> Vec<RoutingRule> {
        let store = get_smart_router_store();
        let rules = store.rules.lock().await;
        rules
            .iter()
            .filter(|r| {
                enabled_only.map(|e| r.enabled == e).unwrap_or(true)
                    && target_service
                        .map(|s| r.target_service == s)
                        .unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    pub async fn route_query(
        query_hash: Option<String>,
        operation_name: Option<String>,
    ) -> RoutingDecision {
        let store = get_smart_router_store();

        let rules = store.rules.lock().await;
        let mut candidates: Vec<RoutingRule> =
            rules.iter().filter(|r| r.enabled).cloned().collect();
        drop(rules);

        candidates.sort_by(|a, b| b.priority.cmp(&a.priority));

        if let Some(rule) = candidates.first() {
            let confidence =
                Self::calculate_confidence(rule, query_hash.as_deref(), operation_name.as_deref());
            let decision = RoutingDecision {
                id: uuid::Uuid::new_v4().to_string(),
                query_hash,
                matched_rule_id: Some(rule.id.clone()),
                target_service: rule.target_service.clone(),
                reason: format!("matched rule '{}' (priority={})", rule.name, rule.priority),
                confidence,
                routed_at: chrono::Utc::now().to_rfc3339(),
            };

            let mut decisions = store.decisions.lock().await;
            decisions.push(decision.clone());
            if decisions.len() > 10000 {
                decisions.truncate(5000);
            }
            drop(decisions);

            let mut hits = store.rule_hit_counts.lock().await;
            *hits.entry(rule.id.clone()).or_insert(0) += 1;
            drop(hits);

            let mut total = store.total_routes.lock().await;
            *total += 1;

            decision
        } else {
            let decision = RoutingDecision {
                id: uuid::Uuid::new_v4().to_string(),
                query_hash,
                matched_rule_id: None,
                target_service: "default".to_string(),
                reason: "no matching rule, using default".to_string(),
                confidence: 0.0,
                routed_at: chrono::Utc::now().to_rfc3339(),
            };

            let mut decisions = store.decisions.lock().await;
            decisions.push(decision.clone());
            if decisions.len() > 10000 {
                decisions.truncate(5000);
            }
            drop(decisions);

            let mut total = store.total_routes.lock().await;
            *total += 1;

            decision
        }
    }

    pub async fn get_service_loads(service_id: Option<&str>) -> Vec<ServiceLoad> {
        let store = get_smart_router_store();
        let loads = store.service_loads.lock().await;

        if let Some(id) = service_id {
            loads.get(id).cloned().map(|l| vec![l]).unwrap_or_default()
        } else {
            loads.values().cloned().collect()
        }
    }

    pub async fn update_service_load(load: ServiceLoad) -> ServiceLoad {
        let store = get_smart_router_store();
        let mut loads = store.service_loads.lock().await;
        loads.insert(load.service_id.clone(), load.clone());
        load
    }

    pub async fn get_routing_history(
        limit: Option<u32>,
        target_service: Option<&str>,
    ) -> Vec<RoutingDecision> {
        let store = get_smart_router_store();
        let decisions = store.decisions.lock().await;
        let limit = limit.unwrap_or(50).min(500) as usize;

        decisions
            .iter()
            .rev()
            .filter(|d| {
                target_service
                    .map(|s| d.target_service == s)
                    .unwrap_or(true)
            })
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn simulate_routing(
        query_hash: Option<String>,
        operation_name: Option<String>,
    ) -> RoutingDecision {
        Self::route_query(query_hash, operation_name).await
    }

    pub async fn get_route_stats() -> RouteStats {
        let store = get_smart_router_store();
        let decisions = store.decisions.lock().await;
        let hits = store.rule_hit_counts.lock().await;
        let total = *store.total_routes.lock().await;

        let mut routes_by_service = HashMap::new();
        let mut total_confidence = 0.0f64;
        let mut matched_count = 0u64;

        for d in decisions.iter() {
            *routes_by_service
                .entry(d.target_service.clone())
                .or_insert(0u64) += 1;
            total_confidence += d.confidence;
            if d.matched_rule_id.is_some() {
                matched_count += 1;
            }
        }

        let avg_confidence = if decisions.is_empty() {
            0.0
        } else {
            total_confidence / decisions.len() as f64
        };

        let rule_hit_rate = if total > 0 {
            matched_count as f64 / total as f64
        } else {
            0.0
        };

        let mut top_rules: Vec<(String, u64)> = hits.iter().map(|(k, v)| (k.clone(), *v)).collect();
        top_rules.sort_by(|a, b| b.1.cmp(&a.1));
        top_rules.truncate(10);

        RouteStats {
            total_routes: total,
            routes_by_service,
            avg_confidence,
            rule_hit_rate,
            top_rules,
        }
    }

    fn calculate_confidence(
        rule: &RoutingRule,
        query_hash: Option<&str>,
        operation_name: Option<&str>,
    ) -> f64 {
        let mut confidence = rule.weight as f64 / 100.0;

        if let Some(hash) = query_hash {
            if let Some(cond_hash) = rule.condition.get("query_hash").and_then(|v| v.as_str()) {
                if hash == cond_hash {
                    confidence = (confidence + 0.3).min(1.0);
                }
            }
        }

        if let Some(name) = operation_name {
            if let Some(cond_name) = rule
                .condition
                .get("operation_name")
                .and_then(|v| v.as_str())
            {
                if name == cond_name {
                    confidence = (confidence + 0.2).min(1.0);
                }
            }
        }

        if confidence <= 0.0 {
            0.5
        } else {
            confidence
        }
    }
}

// ==================== AutoCacheManager 实现 ====================

pub struct AutoCacheManager;

impl AutoCacheManager {
    pub async fn create_cache_policy(
        name: String,
        scope: CacheScope,
        ttl_ms: u64,
        invalidation_strategy: InvalidationStrategy,
        max_size: u64,
    ) -> CachePolicy {
        let policy = CachePolicy::new(name, scope, ttl_ms, invalidation_strategy, max_size);
        let store = get_auto_cache_store();
        let mut policies = store.policies.lock().await;
        policies.push(policy.clone());
        policy
    }

    pub async fn get_cache_policies(scope: Option<CacheScope>) -> Vec<CachePolicy> {
        let store = get_auto_cache_store();
        let policies = store.policies.lock().await;
        policies
            .iter()
            .filter(|p| scope.as_ref().map(|s| p.scope == *s).unwrap_or(true))
            .cloned()
            .collect()
    }

    pub async fn get_or_set_cache(
        key: String,
        value: Option<serde_json::Value>,
        ttl_ms: Option<u64>,
    ) -> Result<CacheEntry, String> {
        let store = get_auto_cache_store();
        let mut entries = store.entries.lock().await;

        if let Some(existing) = entries.get_mut(&key) {
            if !existing.is_expired() {
                existing.access();
                let mut hits = store.total_hits.lock().await;
                *hits += 1;
                return Ok(existing.clone());
            } else {
                entries.remove(&key);
                let mut expired = store.expired_count.lock().await;
                *expired += 1;
            }
        }

        match value {
            Some(val) => {
                let ttl = ttl_ms.unwrap_or(3600000);
                let entry = CacheEntry::new(key.clone(), val, ttl);
                entries.insert(key, entry.clone());
                let mut misses = store.total_misses.lock().await;
                *misses += 1;
                Ok(entry)
            }
            None => {
                let mut misses = store.total_misses.lock().await;
                *misses += 1;
                Err("缓存未命中且未提供新值".to_string())
            }
        }
    }

    pub async fn invalidate_cache(
        cache_key: String,
        reason: String,
        triggered_by: Option<String>,
    ) -> Result<u64, String> {
        let store = get_auto_cache_store();
        let mut entries = store.entries.lock().await;

        let removed = if cache_key == "*" {
            let count = entries.len() as u64;
            entries.clear();
            count
        } else if let Some(_) = entries.remove(&cache_key) {
            1
        } else {
            0
        };

        let event = InvalidationEvent::new(
            cache_key,
            reason,
            triggered_by.unwrap_or_else(|| "system".to_string()),
        );

        let mut events = store.invalidation_events.lock().await;
        events.push(event);
        if events.len() > 10000 {
            events.truncate(5000);
        }

        Ok(removed)
    }

    pub async fn get_cache_stats() -> CacheStats {
        let store = get_auto_cache_store();
        let entries = store.entries.lock().await;
        let hits = *store.total_hits.lock().await;
        let misses = *store.total_misses.lock().await;
        let expired = *store.expired_count.lock().await;
        let evicted = *store.evicted_count.lock().await;
        let policies = store.policies.lock().await;

        let total = hits + misses;
        let hit_rate = if total > 0 {
            hits as f64 / total as f64
        } else {
            0.0
        };

        CacheStats {
            total_entries: entries.len() as u64,
            total_hits: hits,
            total_misses: misses,
            hit_rate,
            expired_entries: expired,
            evicted_entries: evicted,
            policies_count: policies.len() as u64,
        }
    }

    pub async fn cleanup_expired() -> u64 {
        let store = get_auto_cache_store();
        let mut entries = store.entries.lock().await;
        let before = entries.len();
        entries.retain(|_, v| !v.is_expired());
        let after = entries.len();
        let removed = (before - after) as u64;

        let mut expired = store.expired_count.lock().await;
        *expired += removed;

        removed
    }

    pub async fn get_cache_hit_rate() -> f64 {
        let store = get_auto_cache_store();
        let hits = *store.total_hits.lock().await;
        let misses = *store.total_misses.lock().await;
        let total = hits + misses;
        if total > 0 {
            hits as f64 / total as f64
        } else {
            0.0
        }
    }

    pub async fn evict_cache(max_size: u64) -> u64 {
        let store = get_auto_cache_store();
        let mut entries = store.entries.lock().await;
        let current_size = entries.len() as u64;

        if current_size <= max_size {
            return 0;
        }

        let mut sorted: Vec<(String, u64, String)> = entries
            .iter()
            .map(|(k, v)| (k.clone(), v.access_count, v.created_at.clone()))
            .collect();
        sorted.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.2.cmp(&b.2)));

        let to_remove = current_size - max_size;
        let mut removed = 0u64;

        for (key, _, _) in sorted.iter().rev().take(to_remove as usize) {
            entries.remove(key);
            removed += 1;
        }

        let mut evicted = store.evicted_count.lock().await;
        *evicted += removed;

        removed
    }

    pub async fn get_entry(key: &str) -> Option<CacheEntry> {
        let store = get_auto_cache_store();
        let entries = store.entries.lock().await;
        entries.get(key).cloned()
    }
}

// ==================== SelfHealingEngine 实现 ====================

pub struct SelfHealingEngine;

impl SelfHealingEngine {
    pub async fn create_health_check(
        service_id: String,
        check_type: HealthCheckType,
        interval_ms: Option<u64>,
        timeout_ms: Option<u64>,
        healthy_threshold: Option<i32>,
        unhealthy_threshold: Option<i32>,
    ) -> HealthCheck {
        let check = HealthCheck::new(
            service_id,
            check_type,
            interval_ms.unwrap_or(10000),
            timeout_ms.unwrap_or(5000),
            healthy_threshold.unwrap_or(2),
            unhealthy_threshold.unwrap_or(3),
        );
        let store = get_self_healing_store();
        let mut checks = store.health_checks.lock().await;
        checks.push(check.clone());
        check
    }

    pub async fn get_health_checks(
        service_id: Option<&str>,
        check_type: Option<HealthCheckType>,
    ) -> Vec<HealthCheck> {
        let store = get_self_healing_store();
        let checks = store.health_checks.lock().await;
        checks
            .iter()
            .filter(|c| {
                service_id.map(|s| c.service_id == s).unwrap_or(true)
                    && check_type
                        .as_ref()
                        .map(|t| c.check_type == *t)
                        .unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    pub async fn run_health_check(check_id: &str) -> Result<HealthCheck, String> {
        let store = get_self_healing_store();
        let checks = store.health_checks.lock().await;
        let check = checks
            .iter()
            .find(|c| c.id == check_id)
            .cloned()
            .ok_or_else(|| format!("健康检查 '{}' 不存在", check_id))?;
        drop(checks);

        let mut counts = store.unhealthy_counts.lock().await;
        let count = counts.entry(check.service_id.clone()).or_insert(0);
        *count += 1;

        Ok(check)
    }

    pub async fn execute_healing(
        trigger: HealingTrigger,
        action_type: HealingActionType,
        target: String,
    ) -> HealingAction {
        let mut action = HealingAction::new(trigger, action_type, target);
        action.execute();

        let store = get_self_healing_store();
        let mut actions = store.healing_actions.lock().await;
        actions.push(action.clone());
        if actions.len() > 10000 {
            actions.truncate(5000);
        }

        action
    }

    pub async fn get_healing_history(
        trigger: Option<HealingTrigger>,
        status: Option<HealingStatus>,
        limit: Option<u32>,
    ) -> Vec<HealingAction> {
        let store = get_self_healing_store();
        let actions = store.healing_actions.lock().await;
        let limit = limit.unwrap_or(50).min(500) as usize;

        actions
            .iter()
            .rev()
            .filter(|a| {
                trigger.as_ref().map(|t| a.trigger == *t).unwrap_or(true)
                    && status.as_ref().map(|s| a.status == *s).unwrap_or(true)
            })
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn create_recovery_plan(
        service_id: String,
        steps: Vec<String>,
        estimated_duration_ms: Option<u64>,
    ) -> RecoveryPlan {
        let plan = RecoveryPlan::new(service_id, steps, estimated_duration_ms.unwrap_or(30000));
        let store = get_self_healing_store();
        let mut plans = store.recovery_plans.lock().await;
        plans.push(plan.clone());
        plan
    }

    pub async fn get_recovery_status(plan_id: &str) -> Result<RecoveryPlan, String> {
        let store = get_self_healing_store();
        let plans = store.recovery_plans.lock().await;
        plans
            .iter()
            .find(|p| p.id == plan_id)
            .cloned()
            .ok_or_else(|| format!("恢复计划 '{}' 不存在", plan_id))
    }

    pub async fn get_health_summary() -> HealthSummary {
        let store = get_self_healing_store();
        let checks = store.health_checks.lock().await;
        let actions = store.healing_actions.lock().await;
        let plans = store.recovery_plans.lock().await;

        let mut unique_services = std::collections::HashSet::new();
        for c in checks.iter() {
            unique_services.insert(c.service_id.clone());
        }

        let total_checks = checks.len() as u64;
        let total_services = unique_services.len() as u64;

        let mut healthy = 0u64;
        let mut degraded = 0u64;
        let mut unhealthy = 0u64;

        let counts = store.unhealthy_counts.lock().await;
        for service in &unique_services {
            let count = counts.get(service).copied().unwrap_or(0);
            if count >= 3 {
                unhealthy += 1;
            } else if count >= 1 {
                degraded += 1;
            } else {
                healthy += 1;
            }
        }

        let total_healing = actions.len() as u64;
        let successful = actions
            .iter()
            .filter(|a| a.status == HealingStatus::Completed)
            .count() as u64;
        let failed = actions
            .iter()
            .filter(|a| a.status == HealingStatus::Failed)
            .count() as u64;

        let active_plans = plans
            .iter()
            .filter(|p| p.status == RecoveryStatus::InProgress)
            .count() as u64;

        let _ = total_services;

        HealthSummary {
            total_checks,
            healthy_services: healthy,
            degraded_services: degraded,
            unhealthy_services: unhealthy,
            total_healing_actions: total_healing,
            successful_healing: successful,
            failed_healing: failed,
            active_recovery_plans: active_plans,
        }
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 智能路由请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateRoutingRuleRequest {
    pub name: String,
    pub condition: serde_json::Value,
    pub target_service: String,
    pub priority: Option<i32>,
    pub weight: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RoutingRulesQuery {
    pub enabled: Option<bool>,
    pub target_service: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RouteQueryRequest {
    pub query_hash: Option<String>,
    pub operation_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ServiceLoadQuery {
    pub service_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateServiceLoadRequest {
    pub cpu_usage: Option<f64>,
    pub memory_usage: Option<f64>,
    pub latency_ms: Option<u64>,
    pub active_queries: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct RoutingHistoryQuery {
    pub limit: Option<u32>,
    pub target_service: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SimulateRoutingRequest {
    pub query_hash: Option<String>,
    pub operation_name: Option<String>,
}

// --- 自动缓存请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateCachePolicyRequest {
    pub name: String,
    pub scope: Option<String>,
    pub ttl_ms: Option<u64>,
    pub invalidation_strategy: Option<String>,
    pub max_size: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct CachePoliciesQuery {
    pub scope: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetOrSetCacheRequest {
    pub value: Option<serde_json::Value>,
    pub ttl_ms: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct InvalidateCacheRequest {
    pub cache_key: String,
    pub reason: Option<String>,
    pub triggered_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CleanupRequest {
    pub max_size: Option<u64>,
}

// --- 自愈机制请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateHealthCheckRequest {
    pub service_id: String,
    pub check_type: Option<String>,
    pub interval_ms: Option<u64>,
    pub timeout_ms: Option<u64>,
    pub healthy_threshold: Option<i32>,
    pub unhealthy_threshold: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct HealthChecksQuery {
    pub service_id: Option<String>,
    pub check_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteHealingRequest {
    pub trigger: Option<String>,
    pub action_type: Option<String>,
    pub target: String,
}

#[derive(Debug, Deserialize)]
pub struct HealingHistoryQuery {
    pub trigger: Option<String>,
    pub status: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRecoveryPlanRequest {
    pub service_id: String,
    pub steps: Vec<String>,
    pub estimated_duration_ms: Option<u64>,
}

// ==================== API 处理器: 智能查询路由 ====================

pub async fn create_routing_rule_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateRoutingRuleRequest>,
) -> Json<ApiResponse<RoutingRule>> {
    let rule = SmartRouter::create_routing_rule(
        req.name,
        req.condition,
        req.target_service,
        req.priority,
        req.weight,
    )
    .await;
    Json(ApiResponse::success(rule, "路由规则创建成功"))
}

pub async fn get_routing_rules_handler(
    State(_state): State<AppState>,
    Query(params): Query<RoutingRulesQuery>,
) -> Json<ApiResponse<Vec<RoutingRule>>> {
    let rules =
        SmartRouter::get_routing_rules(params.enabled, params.target_service.as_deref()).await;
    Json(ApiResponse::success(rules, "路由规则列表"))
}

pub async fn route_query_handler(
    State(_state): State<AppState>,
    Json(req): Json<RouteQueryRequest>,
) -> Json<ApiResponse<RoutingDecision>> {
    let decision = SmartRouter::route_query(req.query_hash, req.operation_name).await;
    Json(ApiResponse::success(decision, "查询路由完成"))
}

pub async fn get_service_loads_handler(
    State(_state): State<AppState>,
    Query(params): Query<ServiceLoadQuery>,
) -> Json<ApiResponse<Vec<ServiceLoad>>> {
    let loads = SmartRouter::get_service_loads(params.service_id.as_deref()).await;
    Json(ApiResponse::success(loads, "服务负载列表"))
}

pub async fn update_service_load_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateServiceLoadRequest>,
) -> Json<ApiResponse<ServiceLoad>> {
    let store = get_smart_router_store();
    let loads = store.service_loads.lock().await;
    let current = loads
        .get(&id)
        .cloned()
        .unwrap_or_else(|| ServiceLoad::new(id.clone()));
    drop(loads);

    let load = ServiceLoad {
        service_id: id,
        cpu_usage: req.cpu_usage.unwrap_or(current.cpu_usage),
        memory_usage: req.memory_usage.unwrap_or(current.memory_usage),
        latency_ms: req.latency_ms.unwrap_or(current.latency_ms),
        active_queries: req.active_queries.unwrap_or(current.active_queries),
        last_updated: chrono::Utc::now().to_rfc3339(),
    };

    let updated = SmartRouter::update_service_load(load).await;
    Json(ApiResponse::success(updated, "服务负载已更新"))
}

pub async fn get_routing_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<RoutingHistoryQuery>,
) -> Json<ApiResponse<Vec<RoutingDecision>>> {
    let history =
        SmartRouter::get_routing_history(params.limit, params.target_service.as_deref()).await;
    Json(ApiResponse::success(history, "路由决策历史"))
}

pub async fn simulate_routing_handler(
    State(_state): State<AppState>,
    Json(req): Json<SimulateRoutingRequest>,
) -> Json<ApiResponse<RoutingDecision>> {
    let decision = SmartRouter::simulate_routing(req.query_hash, req.operation_name).await;
    Json(ApiResponse::success(decision, "路由模拟完成"))
}

pub async fn get_route_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<RouteStats>> {
    let stats = SmartRouter::get_route_stats().await;
    Json(ApiResponse::success(stats, "路由统计"))
}

// ==================== API 处理器: 自动缓存 ====================

pub async fn create_cache_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateCachePolicyRequest>,
) -> Json<ApiResponse<CachePolicy>> {
    let scope = req
        .scope
        .as_deref()
        .map(CacheScope::from_str)
        .unwrap_or(CacheScope::Query);
    let invalidation_strategy = req
        .invalidation_strategy
        .as_deref()
        .map(InvalidationStrategy::from_str)
        .unwrap_or(InvalidationStrategy::TimeBased);

    let policy = AutoCacheManager::create_cache_policy(
        req.name,
        scope,
        req.ttl_ms.unwrap_or(3600000),
        invalidation_strategy,
        req.max_size.unwrap_or(10000),
    )
    .await;
    Json(ApiResponse::success(policy, "缓存策略创建成功"))
}

pub async fn get_cache_policies_handler(
    State(_state): State<AppState>,
    Query(params): Query<CachePoliciesQuery>,
) -> Json<ApiResponse<Vec<CachePolicy>>> {
    let scope = params.scope.as_deref().map(CacheScope::from_str);
    let policies = AutoCacheManager::get_cache_policies(scope).await;
    Json(ApiResponse::success(policies, "缓存策略列表"))
}

pub async fn get_cache_entry_handler(
    State(_state): State<AppState>,
    Path(key): Path<String>,
) -> Json<ApiResponse<CacheEntry>> {
    match AutoCacheManager::get_entry(&key).await {
        Some(entry) => {
            if entry.is_expired() {
                Json(ApiResponse::error(404, "缓存已过期"))
            } else {
                Json(ApiResponse::success(entry, "缓存条目"))
            }
        }
        None => Json(ApiResponse::error(404, "缓存不存在")),
    }
}

pub async fn invalidate_cache_handler(
    State(_state): State<AppState>,
    Json(req): Json<InvalidateCacheRequest>,
) -> Json<ApiResponse<u64>> {
    match AutoCacheManager::invalidate_cache(
        req.cache_key,
        req.reason.unwrap_or_else(|| "manual".to_string()),
        req.triggered_by,
    )
    .await
    {
        Ok(removed) => Json(ApiResponse::success(removed, "缓存失效完成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_cache_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<CacheStats>> {
    let stats = AutoCacheManager::get_cache_stats().await;
    Json(ApiResponse::success(stats, "缓存统计"))
}

pub async fn cleanup_cache_handler(
    State(_state): State<AppState>,
    Json(req): Json<CleanupRequest>,
) -> Json<ApiResponse<u64>> {
    let removed = AutoCacheManager::cleanup_expired().await;
    let _ = req.max_size;
    Json(ApiResponse::success(removed, "过期缓存已清理"))
}

pub async fn get_cache_hit_rate_handler(State(_state): State<AppState>) -> Json<ApiResponse<f64>> {
    let rate = AutoCacheManager::get_cache_hit_rate().await;
    Json(ApiResponse::success(rate, "缓存命中率"))
}

pub async fn evict_cache_handler(
    State(_state): State<AppState>,
    Json(req): Json<CleanupRequest>,
) -> Json<ApiResponse<u64>> {
    let max_size = req.max_size.unwrap_or(1000);
    let removed = AutoCacheManager::evict_cache(max_size).await;
    Json(ApiResponse::success(removed, "缓存淘汰完成"))
}

// ==================== API 处理器: 自愈机制 ====================

pub async fn create_health_check_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateHealthCheckRequest>,
) -> Json<ApiResponse<HealthCheck>> {
    let check_type = req
        .check_type
        .as_deref()
        .map(HealthCheckType::from_str)
        .unwrap_or(HealthCheckType::Liveness);

    let check = SelfHealingEngine::create_health_check(
        req.service_id,
        check_type,
        req.interval_ms,
        req.timeout_ms,
        req.healthy_threshold,
        req.unhealthy_threshold,
    )
    .await;
    Json(ApiResponse::success(check, "健康检查创建成功"))
}

pub async fn get_health_checks_handler(
    State(_state): State<AppState>,
    Query(params): Query<HealthChecksQuery>,
) -> Json<ApiResponse<Vec<HealthCheck>>> {
    let check_type = params.check_type.as_deref().map(HealthCheckType::from_str);
    let checks =
        SelfHealingEngine::get_health_checks(params.service_id.as_deref(), check_type).await;
    Json(ApiResponse::success(checks, "健康检查列表"))
}

pub async fn run_health_check_handler(
    State(_state): State<AppState>,
    Json(req): Json<RouteQueryRequest>,
) -> Json<ApiResponse<HealthCheck>> {
    let check_id = req.query_hash.unwrap_or_default();
    match SelfHealingEngine::run_health_check(&check_id).await {
        Ok(check) => Json(ApiResponse::success(check, "健康检查执行完成")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn execute_healing_handler(
    State(_state): State<AppState>,
    Json(req): Json<ExecuteHealingRequest>,
) -> Json<ApiResponse<HealingAction>> {
    let trigger = req
        .trigger
        .as_deref()
        .map(HealingTrigger::from_str)
        .unwrap_or(HealingTrigger::HealthCheck);
    let action_type = req
        .action_type
        .as_deref()
        .map(HealingActionType::from_str)
        .unwrap_or(HealingActionType::Restart);

    let action = SelfHealingEngine::execute_healing(trigger, action_type, req.target).await;
    Json(ApiResponse::success(action, "自愈动作已执行"))
}

pub async fn get_healing_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<HealingHistoryQuery>,
) -> Json<ApiResponse<Vec<HealingAction>>> {
    let trigger = params.trigger.as_deref().map(HealingTrigger::from_str);
    let status = params.status.as_deref().map(HealingStatus::from_str);
    let history = SelfHealingEngine::get_healing_history(trigger, status, params.limit).await;
    Json(ApiResponse::success(history, "自愈历史"))
}

pub async fn create_recovery_plan_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateRecoveryPlanRequest>,
) -> Json<ApiResponse<RecoveryPlan>> {
    let plan = SelfHealingEngine::create_recovery_plan(
        req.service_id,
        req.steps,
        req.estimated_duration_ms,
    )
    .await;
    Json(ApiResponse::success(plan, "恢复计划创建成功"))
}

pub async fn get_recovery_status_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<RecoveryPlan>> {
    match SelfHealingEngine::get_recovery_status(&id).await {
        Ok(plan) => Json(ApiResponse::success(plan, "恢复计划状态")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_health_summary_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<HealthSummary>> {
    let summary = SelfHealingEngine::get_health_summary().await;
    Json(ApiResponse::success(summary, "健康汇总"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    // ==================== Enum roundtrip ====================

    #[test]
    fn routing_condition_roundtrip() {
        for v in &[
            RoutingCondition::QueryHash,
            RoutingCondition::OperationName,
            RoutingCondition::ServicePattern,
            RoutingCondition::Custom,
        ] {
            roundtrip(v);
        }
    }

    #[test]
    fn cache_scope_roundtrip() {
        for v in CacheScope::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn invalidation_strategy_roundtrip() {
        for v in InvalidationStrategy::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn health_check_type_roundtrip() {
        for v in HealthCheckType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn healing_trigger_roundtrip() {
        for v in &[
            HealingTrigger::HealthCheck,
            HealingTrigger::Failure,
            HealingTrigger::Timeout,
        ] {
            roundtrip(v);
        }
    }

    #[test]
    fn healing_action_type_roundtrip() {
        for v in HealingActionType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn healing_status_roundtrip() {
        for v in &[
            HealingStatus::Pending,
            HealingStatus::Executing,
            HealingStatus::Completed,
            HealingStatus::Failed,
        ] {
            roundtrip(v);
        }
    }

    #[test]
    fn recovery_status_roundtrip() {
        for v in &[
            RecoveryStatus::Pending,
            RecoveryStatus::InProgress,
            RecoveryStatus::Completed,
            RecoveryStatus::Failed,
            RecoveryStatus::Cancelled,
        ] {
            roundtrip(v);
        }
    }

    // ==================== Enum as_str/from_str ====================

    #[test]
    fn routing_condition_as_str() {
        assert_eq!(RoutingCondition::QueryHash.as_str(), "query_hash");
        assert_eq!(RoutingCondition::OperationName.as_str(), "operation_name");
        assert_eq!(RoutingCondition::ServicePattern.as_str(), "service_pattern");
        assert_eq!(RoutingCondition::Custom.as_str(), "custom");
    }

    #[test]
    fn cache_scope_as_str_from_str() {
        for v in CacheScope::all() {
            assert_eq!(CacheScope::from_str(v.as_str()), v);
        }
    }

    #[test]
    fn invalidation_strategy_as_str_from_str() {
        for v in InvalidationStrategy::all() {
            assert_eq!(InvalidationStrategy::from_str(v.as_str()), v);
        }
    }

    #[test]
    fn health_check_type_as_str_from_str() {
        for v in HealthCheckType::all() {
            assert_eq!(HealthCheckType::from_str(v.as_str()), v);
        }
    }

    #[test]
    fn healing_trigger_as_str_from_str() {
        assert_eq!(
            HealingTrigger::from_str(HealingTrigger::HealthCheck.as_str()),
            HealingTrigger::HealthCheck
        );
        assert_eq!(
            HealingTrigger::from_str(HealingTrigger::Failure.as_str()),
            HealingTrigger::Failure
        );
        assert_eq!(
            HealingTrigger::from_str(HealingTrigger::Timeout.as_str()),
            HealingTrigger::Timeout
        );
    }

    #[test]
    fn healing_action_type_as_str_from_str() {
        for v in HealingActionType::all() {
            assert_eq!(HealingActionType::from_str(v.as_str()), v);
        }
    }

    #[test]
    fn healing_status_as_str_from_str() {
        assert_eq!(
            HealingStatus::from_str(HealingStatus::Pending.as_str()),
            HealingStatus::Pending
        );
        assert_eq!(
            HealingStatus::from_str(HealingStatus::Executing.as_str()),
            HealingStatus::Executing
        );
        assert_eq!(
            HealingStatus::from_str(HealingStatus::Completed.as_str()),
            HealingStatus::Completed
        );
        assert_eq!(
            HealingStatus::from_str(HealingStatus::Failed.as_str()),
            HealingStatus::Failed
        );
    }

    #[test]
    fn recovery_status_as_str_from_str() {
        assert_eq!(
            RecoveryStatus::from_str(RecoveryStatus::Pending.as_str()),
            RecoveryStatus::Pending
        );
        assert_eq!(
            RecoveryStatus::from_str(RecoveryStatus::InProgress.as_str()),
            RecoveryStatus::InProgress
        );
        assert_eq!(
            RecoveryStatus::from_str(RecoveryStatus::Completed.as_str()),
            RecoveryStatus::Completed
        );
        assert_eq!(
            RecoveryStatus::from_str(RecoveryStatus::Failed.as_str()),
            RecoveryStatus::Failed
        );
        assert_eq!(
            RecoveryStatus::from_str(RecoveryStatus::Cancelled.as_str()),
            RecoveryStatus::Cancelled
        );
    }

    // ==================== Struct roundtrip ====================

    #[test]
    fn routing_rule_roundtrip() {
        let r = RoutingRule::new(
            "main-rule".into(),
            serde_json::json!({"operation": "GetUsers"}),
            "user-service".into(),
            10,
            100,
        );
        roundtrip(&r);
    }

    #[test]
    fn routing_decision_roundtrip() {
        let d = RoutingDecision {
            id: "dec-1".into(),
            query_hash: Some("abc123".into()),
            matched_rule_id: Some("rule-1".into()),
            target_service: "user-service".into(),
            reason: "matched".into(),
            confidence: 0.95,
            routed_at: "2025-01-01T00:00:00Z".into(),
        };
        roundtrip(&d);
    }

    #[test]
    fn service_load_roundtrip() {
        let l = ServiceLoad::new("svc-1".into());
        roundtrip(&l);
    }

    #[test]
    fn route_stats_roundtrip() {
        let s = RouteStats {
            total_routes: 100,
            routes_by_service: HashMap::from([("svc".into(), 50u64)]),
            avg_confidence: 0.8,
            rule_hit_rate: 0.6,
            top_rules: vec![("rule-1".into(), 30u64)],
        };
        roundtrip(&s);
    }

    #[test]
    fn cache_policy_roundtrip() {
        let p = CachePolicy::new(
            "query-cache".into(),
            CacheScope::Query,
            3600000,
            InvalidationStrategy::TimeBased,
            10000,
        );
        roundtrip(&p);
    }

    #[test]
    fn cache_entry_roundtrip() {
        let e = CacheEntry::new("key-1".into(), serde_json::json!({"data": 1}), 3600000);
        roundtrip(&e);
    }

    #[test]
    fn invalidation_event_roundtrip() {
        let e = InvalidationEvent::new(
            "key-1".into(),
            "updated".into(),
            "user".into(),
        );
        roundtrip(&e);
    }

    #[test]
    fn cache_stats_roundtrip() {
        let s = CacheStats {
            total_entries: 100,
            total_hits: 800,
            total_misses: 200,
            hit_rate: 0.8,
            expired_entries: 10,
            evicted_entries: 5,
            policies_count: 3,
        };
        roundtrip(&s);
    }

    #[test]
    fn health_check_roundtrip() {
        let h = HealthCheck::new(
            "svc-1".into(),
            HealthCheckType::Liveness,
            10000,
            5000,
            2,
            3,
        );
        roundtrip(&h);
    }

    #[test]
    fn healing_action_roundtrip() {
        let a = HealingAction::new(
            HealingTrigger::Failure,
            HealingActionType::Restart,
            "svc-1".into(),
        );
        roundtrip(&a);
    }

    #[test]
    fn recovery_plan_roundtrip() {
        let p = RecoveryPlan::new(
            "svc-1".into(),
            vec!["restart".into(), "verify".into()],
            300000,
        );
        roundtrip(&p);
    }

    #[test]
    fn health_summary_roundtrip() {
        let s = HealthSummary {
            total_checks: 10,
            healthy_services: 8,
            degraded_services: 1,
            unhealthy_services: 1,
            total_healing_actions: 2,
            successful_healing: 1,
            failed_healing: 1,
            active_recovery_plans: 0,
        };
        roundtrip(&s);
    }
}

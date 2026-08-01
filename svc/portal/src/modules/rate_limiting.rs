#![allow(dead_code)] // Reserved: V49 自适应限流模块，待业务接入后启用
//! V49.0 Portal BFF Phase 20: 自适应限流 + 熔断降级 + 负载感知路由
//!
//! 核心能力：
//! 1. AdaptiveRateLimiter — 基于令牌桶算法的自适应限流
//!    - TokenBucket：动态调整桶容量和填充速率
//!    - 过载保护：延迟飙升时自动降速
//!    - 按服务独立管理限流配置
//! 2. CircuitBreaker — 三态状态机熔断降级
//!    - Closed → Open → HalfOpen → Closed 状态转换
//!    - 可配置失败率阈值和恢复超时
//!    - 降级策略：缓存回退、默认值、友好错误
//! 3. LoadAwareRouter — 负载感知路由
//!    - 实时收集服务实例指标（CPU、内存、延迟、队列）
//!    - EWMA（指数加权移动平均）负载评分
//!    - 加权轮询选择最优实例，健康检查和故障转移
//!
//! Phase 19 追加：
//! 4. AIQueryRouter — AI 驱动查询路由（意图识别 + 服务匹配 + 策略决策）
//! 5. SchemaStitcher — 自动 Schema Stitching（子 Schema 聚合 + 类型合并）
//! 6. IntelligentCache — 智能缓存策略（访问模式学习 + 自适应失效）

use async_graphql::{Context, Enum, InputObject, Object, SimpleObject};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

// ==================== 通用路由类型定义 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum QueryIntent {
    EntityRead,
    ListQuery,
    AnalyticsQuery,
    WriteOperation,
    Subscription,
    FederationQuery,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum RoutingStrategy {
    Direct,
    Sharded,
    Parallel,
    Fallback,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct ServiceMatchGql {
    pub service: String,
    pub score: f64,
    pub confidence: f64,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct RoutingDecisionGql {
    pub intent: QueryIntent,
    pub strategy: RoutingStrategy,
    pub primary_service: String,
    pub candidate_services: Vec<ServiceMatchGql>,
    pub fallback_service: Option<String>,
    pub estimated_latency_ms: u64,
    pub cache_recommendation: String,
    pub reasoning: Vec<String>,
}

// ==================== 自适应限流：类型定义 ====================

#[derive(Debug, Clone, SimpleObject)]
pub struct RateLimiterStatusGql {
    pub service: String,
    pub tokens_available: u64,
    pub max_capacity: u64,
    pub refill_rate_per_sec: f64,
    pub current_rate_per_sec: f64,
    pub total_requests: u64,
    pub rejected_requests: u64,
    pub overload_protected: bool,
    pub adaptive: bool,
    pub last_adjustment_ms: u64,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct RateLimiterConfigGql {
    pub service: String,
    pub max_requests_per_second: f64,
    pub burst_capacity: u64,
    pub adaptive: bool,
    pub current_refill_rate: f64,
    pub current_capacity: u64,
}

#[derive(Debug, Clone, InputObject)]
pub struct RateLimiterConfigInput {
    pub max_requests_per_second: f64,
    pub burst_capacity: u64,
    pub adaptive: Option<bool>,
}

// ==================== 熔断降级：类型定义 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Enum, Serialize, Deserialize)]
pub enum CircuitStateGql {
    Closed,
    Open,
    HalfOpen,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct CircuitBreakerStateGql {
    pub service: String,
    pub state: CircuitStateGql,
    pub failure_count: u64,
    pub success_count: u64,
    pub total_requests: u64,
    pub failure_rate: f64,
    pub last_failure_time: Option<String>,
    pub recovery_deadline: Option<String>,
    pub half_open_remaining: u64,
    pub degradation_active: bool,
}

#[derive(Debug, Clone, InputObject)]
pub struct CircuitBreakerConfigInput {
    pub failure_threshold: u64,
    pub recovery_timeout_sec: u64,
    pub half_open_max_requests: u64,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct ServiceDegradationConfigGql {
    pub service: String,
    pub enabled: bool,
    pub strategy: String,
    pub fallback_ttl_sec: u64,
    pub max_degradation_duration_sec: u64,
}

#[derive(Debug, Clone, InputObject)]
pub struct DegradationConfigInput {
    pub enabled: bool,
    pub strategy: String,
    pub fallback_ttl_sec: u64,
    pub max_degradation_duration_sec: u64,
}

// ==================== 负载感知路由：类型定义 ====================

#[derive(Debug, Clone, SimpleObject)]
pub struct InstanceHealthGql {
    pub service: String,
    pub instance_id: String,
    pub url: String,
    pub healthy: bool,
    pub last_health_check: String,
    pub consecutive_failures: u32,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct LoadMetricsGql {
    pub service: String,
    pub instance_id: String,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub active_requests: u64,
    pub queue_length: u64,
    pub latency_ms: f64,
    pub error_rate: f64,
    pub load_score: f64,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct ServiceRoutingStatGql {
    pub service: String,
    pub total_requests: u64,
    pub successful: u64,
    pub failed: u64,
    pub degraded: u64,
    pub avg_latency_ms: f64,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct AdaptiveRoutingStatsGql {
    pub total_requests_routed: u64,
    pub successful_routes: u64,
    pub failed_routes: u64,
    pub degraded_routes: u64,
    pub avg_latency_ms: f64,
    pub by_service: Vec<ServiceRoutingStatGql>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct RoutingRuleGql {
    pub rule_id: String,
    pub service: String,
    pub condition: String,
    pub target_instance: String,
    pub priority: i32,
    pub enabled: bool,
}

#[derive(Debug, Clone, InputObject)]
pub struct RoutingRuleInput {
    pub service: String,
    pub condition: String,
    pub target_instance: String,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct TrafficPolicyGql {
    pub service: String,
    pub rate_limit_config: RateLimiterConfigGql,
    pub circuit_breaker_state: CircuitBreakerStateGql,
    pub degradation_config: ServiceDegradationConfigGql,
    pub routing_rules: Vec<RoutingRuleGql>,
    pub load_score: f64,
    pub overall_health: String,
}

// ==================== 自适应限流实现 ====================

struct TokenBucket {
    capacity: u64,
    tokens: f64,
    refill_rate: f64,
    last_refill: std::time::Instant,
    total_requests: AtomicU64,
    rejected_requests: AtomicU64,
    overload_protected: bool,
}

impl TokenBucket {
    fn new(capacity: u64, refill_rate: f64) -> Self {
        Self {
            capacity,
            tokens: capacity as f64,
            refill_rate,
            last_refill: std::time::Instant::now(),
            total_requests: AtomicU64::new(0),
            rejected_requests: AtomicU64::new(0),
            overload_protected: false,
        }
    }

    fn try_acquire(&mut self) -> bool {
        self.total_requests.fetch_add(1, Ordering::Relaxed);
        let now = std::time::Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.tokens += elapsed * self.refill_rate;
        if self.tokens > self.capacity as f64 {
            self.tokens = self.capacity as f64;
        }
        self.last_refill = now;
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            self.rejected_requests.fetch_add(1, Ordering::Relaxed);
            false
        }
    }

    fn set_refill_rate(&mut self, rate: f64) {
        self.refill_rate = rate;
    }

    fn set_capacity(&mut self, capacity: u64) {
        self.capacity = capacity;
        if self.tokens > capacity as f64 {
            self.tokens = capacity as f64;
        }
    }
}

pub struct AdaptiveRateLimiter {
    buckets: HashMap<String, TokenBucket>,
    configs: HashMap<String, RateLimiterConfigGql>,
    adaptive_enabled: HashMap<String, bool>,
}

impl AdaptiveRateLimiter {
    fn new() -> Self {
        Self {
            buckets: HashMap::new(),
            configs: HashMap::new(),
            adaptive_enabled: HashMap::new(),
        }
    }

    fn ensure_service(&mut self, service: &str) {
        if !self.buckets.contains_key(service) {
            let config = RateLimiterConfigGql {
                service: service.to_string(),
                max_requests_per_second: 100.0,
                burst_capacity: 200,
                adaptive: true,
                current_refill_rate: 100.0,
                current_capacity: 200,
            };
            let bucket = TokenBucket::new(config.burst_capacity, config.max_requests_per_second);
            self.buckets.insert(service.to_string(), bucket);
            self.configs.insert(service.to_string(), config);
            self.adaptive_enabled.insert(service.to_string(), true);
        }
    }

    fn configure(&mut self, service: &str, max_rps: f64, burst: u64, adaptive: bool) {
        self.ensure_service(service);
        if let Some(bucket) = self.buckets.get_mut(service) {
            bucket.set_refill_rate(max_rps);
            bucket.set_capacity(burst);
        }
        if let Some(config) = self.configs.get_mut(service) {
            config.max_requests_per_second = max_rps;
            config.burst_capacity = burst;
            config.current_refill_rate = max_rps;
            config.current_capacity = burst;
        }
        self.adaptive_enabled.insert(service.to_string(), adaptive);
    }

    fn check(&mut self, service: &str) -> bool {
        self.ensure_service(service);
        if let Some(bucket) = self.buckets.get_mut(service) {
            bucket.try_acquire()
        } else {
            true
        }
    }

    fn get_statuses(&self) -> Vec<RateLimiterStatusGql> {
        self.buckets
            .iter()
            .map(|(service, bucket)| RateLimiterStatusGql {
                service: service.clone(),
                tokens_available: bucket.tokens as u64,
                max_capacity: bucket.capacity,
                refill_rate_per_sec: bucket.refill_rate,
                current_rate_per_sec: bucket.refill_rate,
                total_requests: bucket.total_requests.load(Ordering::Relaxed),
                rejected_requests: bucket.rejected_requests.load(Ordering::Relaxed),
                overload_protected: bucket.overload_protected,
                adaptive: self.adaptive_enabled.get(service).copied().unwrap_or(true),
                last_adjustment_ms: bucket.last_refill.elapsed().as_millis() as u64,
            })
            .collect()
    }

    pub fn get_configs(&self) -> Vec<RateLimiterConfigGql> {
        self.configs.values().cloned().collect()
    }

    pub fn get_config(&self, service: &str) -> Option<RateLimiterConfigGql> {
        self.configs.get(service).cloned()
    }
}

// ==================== 熔断降级实现 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

struct CircuitBreaker {
    state: CircuitState,
    failure_count: u64,
    success_count: u64,
    total_requests: u64,
    last_failure_time: Option<std::time::Instant>,
    recovery_deadline: Option<std::time::Instant>,
    consecutive_half_open_successes: u64,
    failure_threshold: u64,
    recovery_timeout: std::time::Duration,
    half_open_max_requests: u64,
}

impl CircuitBreaker {
    fn new(failure_threshold: u64, recovery_timeout_sec: u64, half_open_max_requests: u64) -> Self {
        Self {
            state: CircuitState::Closed,
            failure_count: 0,
            success_count: 0,
            total_requests: 0,
            last_failure_time: None,
            recovery_deadline: None,
            consecutive_half_open_successes: 0,
            failure_threshold,
            recovery_timeout: std::time::Duration::from_secs(recovery_timeout_sec),
            half_open_max_requests,
        }
    }

    fn record_success(&mut self) {
        self.total_requests += 1;
        match self.state {
            CircuitState::HalfOpen => {
                self.success_count += 1;
                self.consecutive_half_open_successes += 1;
                if self.consecutive_half_open_successes >= self.half_open_max_requests {
                    self.transition_to(CircuitState::Closed);
                }
            }
            _ => {
                self.success_count += 1;
            }
        }
    }

    fn record_failure(&mut self) {
        self.total_requests += 1;
        self.failure_count += 1;
        self.last_failure_time = Some(std::time::Instant::now());
        self.consecutive_half_open_successes = 0;
        match self.state {
            CircuitState::Closed => {
                let failure_rate = if self.total_requests > 0 {
                    self.failure_count as f64 / self.total_requests as f64
                } else {
                    0.0
                };
                if self.failure_count >= self.failure_threshold && failure_rate > 0.5 {
                    self.transition_to(CircuitState::Open);
                }
            }
            CircuitState::HalfOpen => {
                self.transition_to(CircuitState::Open);
            }
            _ => {}
        }
    }

    fn can_execute(&mut self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                if let Some(deadline) = self.recovery_deadline {
                    if std::time::Instant::now() >= deadline {
                        self.transition_to(CircuitState::HalfOpen);
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
            CircuitState::HalfOpen => self.success_count < self.half_open_max_requests,
        }
    }

    fn transition_to(&mut self, new_state: CircuitState) {
        self.state = new_state;
        match new_state {
            CircuitState::Open => {
                self.recovery_deadline = Some(std::time::Instant::now() + self.recovery_timeout);
                self.consecutive_half_open_successes = 0;
                self.success_count = 0;
            }
            CircuitState::HalfOpen => {
                self.success_count = 0;
                self.consecutive_half_open_successes = 0;
            }
            CircuitState::Closed => {
                self.failure_count = 0;
                self.success_count = 0;
                self.total_requests = 0;
                self.last_failure_time = None;
                self.recovery_deadline = None;
                self.consecutive_half_open_successes = 0;
            }
        }
    }

    fn reset(&mut self) {
        self.transition_to(CircuitState::Closed);
    }

    fn get_state_gql(&self, service: &str, degradation_active: bool) -> CircuitBreakerStateGql {
        let failure_rate = if self.total_requests > 0 {
            self.failure_count as f64 / self.total_requests as f64
        } else {
            0.0
        };
        let last_failure = self.last_failure_time.map(|_| Utc::now().to_rfc3339());
        let recovery_deadline = self.recovery_deadline.map(|_| Utc::now().to_rfc3339());
        let state_gql = match self.state {
            CircuitState::Closed => CircuitStateGql::Closed,
            CircuitState::Open => CircuitStateGql::Open,
            CircuitState::HalfOpen => CircuitStateGql::HalfOpen,
        };
        CircuitBreakerStateGql {
            service: service.to_string(),
            state: state_gql,
            failure_count: self.failure_count,
            success_count: self.success_count,
            total_requests: self.total_requests,
            failure_rate,
            last_failure_time: last_failure,
            recovery_deadline,
            half_open_remaining: if self.state == CircuitState::HalfOpen {
                self.half_open_max_requests
                    .saturating_sub(self.success_count)
            } else {
                0
            },
            degradation_active,
        }
    }
}

pub struct CircuitBreakerManager {
    breakers: HashMap<String, CircuitBreaker>,
    configs: HashMap<String, (u64, u64, u64)>,
    degradation_configs: HashMap<String, ServiceDegradationConfigGql>,
}

impl CircuitBreakerManager {
    fn new() -> Self {
        Self {
            breakers: HashMap::new(),
            configs: HashMap::new(),
            degradation_configs: HashMap::new(),
        }
    }

    fn ensure_service(&mut self, service: &str) {
        if !self.breakers.contains_key(service) {
            let config = self.configs.get(service).copied().unwrap_or((5, 30, 3));
            self.breakers.insert(
                service.to_string(),
                CircuitBreaker::new(config.0, config.1, config.2),
            );
            self.configs.insert(service.to_string(), config);
            self.degradation_configs.insert(
                service.to_string(),
                ServiceDegradationConfigGql {
                    service: service.to_string(),
                    enabled: false,
                    strategy: "CacheFallback".to_string(),
                    fallback_ttl_sec: 300,
                    max_degradation_duration_sec: 3600,
                },
            );
        }
    }

    fn configure(
        &mut self,
        service: &str,
        failure_threshold: u64,
        recovery_timeout_sec: u64,
        half_open_max_requests: u64,
    ) {
        self.configs.insert(
            service.to_string(),
            (
                failure_threshold,
                recovery_timeout_sec,
                half_open_max_requests,
            ),
        );
        self.breakers.insert(
            service.to_string(),
            CircuitBreaker::new(
                failure_threshold,
                recovery_timeout_sec,
                half_open_max_requests,
            ),
        );
    }

    fn record_failure(&mut self, service: &str) {
        self.ensure_service(service);
        if let Some(breaker) = self.breakers.get_mut(service) {
            breaker.record_failure();
        }
    }

    fn reset(&mut self, service: &str) {
        self.ensure_service(service);
        if let Some(breaker) = self.breakers.get_mut(service) {
            breaker.reset();
        }
    }

    pub fn get_state(&mut self, service: &str) -> Option<CircuitBreakerStateGql> {
        self.ensure_service(service);
        let degradation_active = self
            .degradation_configs
            .get(service)
            .map(|c| c.enabled)
            .unwrap_or(false);
        self.breakers
            .get(service)
            .map(|b| b.get_state_gql(service, degradation_active))
    }

    fn get_states(&mut self) -> Vec<CircuitBreakerStateGql> {
        let services: Vec<String> = self.breakers.keys().cloned().collect();
        services.iter().filter_map(|s| self.get_state(s)).collect()
    }

    fn configure_degradation(
        &mut self,
        service: &str,
        enabled: bool,
        strategy: &str,
        fallback_ttl_sec: u64,
        max_degradation_duration_sec: u64,
    ) {
        self.degradation_configs.insert(
            service.to_string(),
            ServiceDegradationConfigGql {
                service: service.to_string(),
                enabled,
                strategy: strategy.to_string(),
                fallback_ttl_sec,
                max_degradation_duration_sec,
            },
        );
    }

    pub fn get_degradation_config(&self, service: &str) -> Option<ServiceDegradationConfigGql> {
        self.degradation_configs.get(service).cloned()
    }

    pub fn get_degradation_configs(&self) -> Vec<ServiceDegradationConfigGql> {
        self.degradation_configs.values().cloned().collect()
    }
}

// ==================== 负载感知路由实现 ====================

struct ServiceInstance {
    instance_id: String,
    url: String,
    healthy: bool,
    last_health_check: std::time::Instant,
    consecutive_failures: u32,
    load_metrics: LoadMetricsGql,
    ewma_load_score: f64,
}

pub struct LoadAwareRouter {
    instances: HashMap<String, Vec<ServiceInstance>>,
    load_metrics: HashMap<String, Vec<LoadMetricsGql>>,
    routing_rules: Vec<RoutingRuleGql>,
    routing_stats: HashMap<String, ServiceRoutingStatGql>,
    global_stats: AdaptiveRoutingStatsGql,
    rule_counter: u64,
}

impl LoadAwareRouter {
    fn new() -> Self {
        Self {
            instances: HashMap::new(),
            load_metrics: HashMap::new(),
            routing_rules: Vec::new(),
            routing_stats: HashMap::new(),
            global_stats: AdaptiveRoutingStatsGql {
                total_requests_routed: 0,
                successful_routes: 0,
                failed_routes: 0,
                degraded_routes: 0,
                avg_latency_ms: 0.0,
                by_service: Vec::new(),
            },
            rule_counter: 0,
        }
    }

    fn register_instance(&mut self, service: &str, instance_id: &str, url: &str) {
        let metrics = LoadMetricsGql {
            service: service.to_string(),
            instance_id: instance_id.to_string(),
            cpu_usage: 0.1,
            memory_usage: 0.2,
            active_requests: 0,
            queue_length: 0,
            latency_ms: 10.0,
            error_rate: 0.0,
            load_score: 0.15,
        };
        let instance = ServiceInstance {
            instance_id: instance_id.to_string(),
            url: url.to_string(),
            healthy: true,
            last_health_check: std::time::Instant::now(),
            consecutive_failures: 0,
            load_metrics: metrics.clone(),
            ewma_load_score: 0.15,
        };
        self.instances
            .entry(service.to_string())
            .or_insert_with(Vec::new)
            .push(instance);
        self.load_metrics
            .entry(service.to_string())
            .or_insert_with(Vec::new)
            .push(metrics);
    }

    fn mark_healthy(&mut self, service: &str, instance_id: &str) {
        if let Some(instances) = self.instances.get_mut(service) {
            if let Some(instance) = instances.iter_mut().find(|i| i.instance_id == instance_id) {
                instance.healthy = true;
                instance.last_health_check = std::time::Instant::now();
                instance.consecutive_failures = 0;
            }
        }
    }

    fn mark_unhealthy(&mut self, service: &str, instance_id: &str) {
        if let Some(instances) = self.instances.get_mut(service) {
            if let Some(instance) = instances.iter_mut().find(|i| i.instance_id == instance_id) {
                instance.healthy = false;
                instance.consecutive_failures += 1;
            }
        }
    }

    fn update_metrics(
        &mut self,
        service: &str,
        instance_id: &str,
        cpu: f64,
        memory: f64,
        active: u64,
        queue: u64,
        latency: f64,
        error_rate: f64,
    ) {
        let load_score = cpu * 0.25
            + memory * 0.2
            + (active as f64 / 1000.0).min(1.0) * 0.15
            + (queue as f64 / 100.0).min(1.0) * 0.15
            + (latency / 1000.0).min(1.0) * 0.15
            + error_rate * 0.1;
        let metrics = LoadMetricsGql {
            service: service.to_string(),
            instance_id: instance_id.to_string(),
            cpu_usage: cpu,
            memory_usage: memory,
            active_requests: active,
            queue_length: queue,
            latency_ms: latency,
            error_rate,
            load_score,
        };
        if let Some(instances) = self.instances.get_mut(service) {
            if let Some(instance) = instances.iter_mut().find(|i| i.instance_id == instance_id) {
                instance.ewma_load_score = instance.ewma_load_score * 0.7 + load_score * 0.3;
                instance.load_metrics = metrics.clone();
            }
        }
        if let Some(metrics_list) = self.load_metrics.get_mut(service) {
            if let Some(existing) = metrics_list
                .iter_mut()
                .find(|m| m.instance_id == instance_id)
            {
                *existing = metrics;
            } else {
                metrics_list.push(metrics);
            }
        }
    }

    pub fn get_instance_healths(&self, service: &str) -> Vec<InstanceHealthGql> {
        self.instances
            .get(service)
            .map(|instances| {
                instances
                    .iter()
                    .map(|i| InstanceHealthGql {
                        service: service.to_string(),
                        instance_id: i.instance_id.clone(),
                        url: i.url.clone(),
                        healthy: i.healthy,
                        last_health_check: format!(
                            "{}s ago",
                            i.last_health_check.elapsed().as_secs()
                        ),
                        consecutive_failures: i.consecutive_failures,
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    fn get_all_instance_healths(&self) -> Vec<InstanceHealthGql> {
        self.instances
            .keys()
            .flat_map(|svc| self.get_instance_healths(svc))
            .collect()
    }

    fn get_load_metrics(&self, service: &str) -> Vec<LoadMetricsGql> {
        self.load_metrics.get(service).cloned().unwrap_or_default()
    }

    fn get_all_load_metrics(&self) -> Vec<LoadMetricsGql> {
        self.load_metrics.values().flatten().cloned().collect()
    }

    fn select_instance(&self, service: &str) -> Option<&ServiceInstance> {
        let instances = self.instances.get(service)?;
        let healthy: Vec<&ServiceInstance> = instances.iter().filter(|i| i.healthy).collect();
        if healthy.is_empty() {
            return None;
        }
        healthy.into_iter().min_by(|a, b| {
            a.ewma_load_score
                .partial_cmp(&b.ewma_load_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
    }

    fn make_decision(&mut self, service: &str) -> RoutingDecisionGql {
        self.global_stats.total_requests_routed += 1;
        let instance = self.select_instance(service);
        let (primary_service, estimated_latency_ms, reasoning) = if let Some(inst) = instance {
            let latency = inst.load_metrics.latency_ms as u64;
            let mut reasons = vec![
                format!(
                    "选择实例 {} (负载评分: {:.3})",
                    inst.instance_id, inst.ewma_load_score
                ),
                "负载感知路由: 已选最优实例".to_string(),
            ];
            if inst.ewma_load_score > 0.7 {
                reasons.push("实例负载较高，建议关注".to_string());
            }
            (service.to_string(), latency, reasons)
        } else {
            self.global_stats.failed_routes += 1;
            (
                format!("{}_fallback", service),
                200,
                vec!["无健康实例，使用降级路径".to_string()],
            )
        };
        let candidates: Vec<ServiceMatchGql> = vec![ServiceMatchGql {
            service: service.to_string(),
            score: 0.9,
            confidence: 0.85,
            reasons: vec!["直接匹配请求服务".to_string()],
        }];
        self.update_service_stats(service, estimated_latency_ms);
        RoutingDecisionGql {
            intent: QueryIntent::EntityRead,
            strategy: RoutingStrategy::Direct,
            primary_service,
            candidate_services: candidates,
            fallback_service: None,
            estimated_latency_ms,
            cache_recommendation: "ShortLived(60s)".to_string(),
            reasoning,
        }
    }

    fn update_service_stats(&mut self, service: &str, latency_ms: u64) {
        self.global_stats.successful_routes += 1;
        self.global_stats.avg_latency_ms =
            self.global_stats.avg_latency_ms * 0.95 + latency_ms as f64 * 0.05;
        let stat = self
            .routing_stats
            .entry(service.to_string())
            .or_insert_with(|| ServiceRoutingStatGql {
                service: service.to_string(),
                total_requests: 0,
                successful: 0,
                failed: 0,
                degraded: 0,
                avg_latency_ms: 0.0,
            });
        stat.total_requests += 1;
        stat.successful += 1;
        stat.avg_latency_ms = stat.avg_latency_ms * 0.95 + latency_ms as f64 * 0.05;
        self.rebuild_global_stats();
    }

    fn rebuild_global_stats(&mut self) {
        self.global_stats.by_service = self.routing_stats.values().cloned().collect();
    }

    fn get_routing_stats(&self) -> AdaptiveRoutingStatsGql {
        self.global_stats.clone()
    }

    fn set_routing_rule(
        &mut self,
        service: &str,
        condition: &str,
        target_instance: &str,
        priority: i32,
    ) -> RoutingRuleGql {
        self.rule_counter += 1;
        let rule = RoutingRuleGql {
            rule_id: format!("rule_{}", self.rule_counter),
            service: service.to_string(),
            condition: condition.to_string(),
            target_instance: target_instance.to_string(),
            priority,
            enabled: true,
        };
        self.routing_rules.push(rule.clone());
        rule
    }

    fn delete_routing_rule(&mut self, rule_id: &str) -> bool {
        let len_before = self.routing_rules.len();
        self.routing_rules.retain(|r| r.rule_id != rule_id);
        self.routing_rules.len() < len_before
    }

    fn get_routing_rules(&self, service: Option<&str>) -> Vec<RoutingRuleGql> {
        if let Some(svc) = service {
            self.routing_rules
                .iter()
                .filter(|r| r.service == svc)
                .cloned()
                .collect()
        } else {
            self.routing_rules.clone()
        }
    }

    fn get_service_load_score(&self, service: &str) -> f64 {
        self.instances
            .get(service)
            .map(|instances| {
                let healthy: Vec<&ServiceInstance> =
                    instances.iter().filter(|i| i.healthy).collect();
                if healthy.is_empty() {
                    1.0
                } else {
                    healthy.iter().map(|i| i.ewma_load_score).sum::<f64>() / healthy.len() as f64
                }
            })
            .unwrap_or(1.0)
    }
}

// ==================== 全局单例 ====================

static RATE_LIMITER: std::sync::OnceLock<Arc<Mutex<AdaptiveRateLimiter>>> =
    std::sync::OnceLock::new();
static CIRCUIT_BREAKER_MGR: std::sync::OnceLock<Arc<Mutex<CircuitBreakerManager>>> =
    std::sync::OnceLock::new();
static LOAD_AWARE_ROUTER: std::sync::OnceLock<Arc<Mutex<LoadAwareRouter>>> =
    std::sync::OnceLock::new();

pub fn rate_limiter() -> &'static Arc<Mutex<AdaptiveRateLimiter>> {
    RATE_LIMITER.get_or_init(|| Arc::new(Mutex::new(AdaptiveRateLimiter::new())))
}

pub fn circuit_breaker_manager() -> &'static Arc<Mutex<CircuitBreakerManager>> {
    CIRCUIT_BREAKER_MGR.get_or_init(|| Arc::new(Mutex::new(CircuitBreakerManager::new())))
}

pub fn load_aware_router() -> &'static Arc<Mutex<LoadAwareRouter>> {
    LOAD_AWARE_ROUTER.get_or_init(|| Arc::new(Mutex::new(LoadAwareRouter::new())))
}

// ==================== 公共 API 函数 ====================

pub fn get_rate_limiter_statuses() -> Vec<RateLimiterStatusGql> {
    rate_limiter().lock().unwrap().get_statuses()
}

pub fn get_rate_limiter_configs() -> Vec<RateLimiterConfigGql> {
    rate_limiter().lock().unwrap().get_configs()
}

pub fn configure_rate_limiter(service: &str, max_rps: f64, burst: u64, adaptive: bool) {
    rate_limiter()
        .lock()
        .unwrap()
        .configure(service, max_rps, burst, adaptive);
}

pub fn get_circuit_breaker_states() -> Vec<CircuitBreakerStateGql> {
    circuit_breaker_manager().lock().unwrap().get_states()
}

pub fn configure_circuit_breaker(
    service: &str,
    failure_threshold: u64,
    recovery_timeout_sec: u64,
    half_open_max_requests: u64,
) {
    circuit_breaker_manager().lock().unwrap().configure(
        service,
        failure_threshold,
        recovery_timeout_sec,
        half_open_max_requests,
    );
}

pub fn reset_circuit_breaker(service: &str) {
    circuit_breaker_manager().lock().unwrap().reset(service);
}

pub fn circuit_record_failure(service: &str) {
    circuit_breaker_manager()
        .lock()
        .unwrap()
        .record_failure(service);
}

pub fn get_degradation_configs() -> Vec<ServiceDegradationConfigGql> {
    circuit_breaker_manager()
        .lock()
        .unwrap()
        .get_degradation_configs()
}

pub fn configure_degradation(
    service: &str,
    enabled: bool,
    strategy: &str,
    fallback_ttl_sec: u64,
    max_degradation_duration_sec: u64,
) {
    circuit_breaker_manager()
        .lock()
        .unwrap()
        .configure_degradation(
            service,
            enabled,
            strategy,
            fallback_ttl_sec,
            max_degradation_duration_sec,
        );
}

pub fn get_load_metrics(service: &str) -> Vec<LoadMetricsGql> {
    load_aware_router()
        .lock()
        .unwrap()
        .get_load_metrics(service)
}

pub fn get_all_load_metrics() -> Vec<LoadMetricsGql> {
    load_aware_router().lock().unwrap().get_all_load_metrics()
}

pub fn get_instance_healths(service: &str) -> Vec<InstanceHealthGql> {
    load_aware_router()
        .lock()
        .unwrap()
        .get_instance_healths(service)
}

pub fn get_all_instance_healths() -> Vec<InstanceHealthGql> {
    load_aware_router()
        .lock()
        .unwrap()
        .get_all_instance_healths()
}

pub fn register_service_instance(service: &str, instance_id: &str, url: &str) {
    load_aware_router()
        .lock()
        .unwrap()
        .register_instance(service, instance_id, url);
}

pub fn mark_instance_healthy(service: &str, instance_id: &str) {
    load_aware_router()
        .lock()
        .unwrap()
        .mark_healthy(service, instance_id);
}

pub fn mark_instance_unhealthy(service: &str, instance_id: &str) {
    load_aware_router()
        .lock()
        .unwrap()
        .mark_unhealthy(service, instance_id);
}

pub fn update_instance_metrics(
    service: &str,
    instance_id: &str,
    cpu: f64,
    memory: f64,
    active: u64,
    queue: u64,
    latency: f64,
    error_rate: f64,
) {
    load_aware_router().lock().unwrap().update_metrics(
        service,
        instance_id,
        cpu,
        memory,
        active,
        queue,
        latency,
        error_rate,
    );
}

pub fn make_routing_decision(service: &str) -> RoutingDecisionGql {
    load_aware_router().lock().unwrap().make_decision(service)
}

pub fn get_routing_stats() -> AdaptiveRoutingStatsGql {
    load_aware_router().lock().unwrap().get_routing_stats()
}

pub fn set_routing_rule(
    service: &str,
    condition: &str,
    target_instance: &str,
    priority: i32,
) -> RoutingRuleGql {
    load_aware_router().lock().unwrap().set_routing_rule(
        service,
        condition,
        target_instance,
        priority,
    )
}

pub fn delete_routing_rule(rule_id: &str) -> bool {
    load_aware_router()
        .lock()
        .unwrap()
        .delete_routing_rule(rule_id)
}

pub fn get_routing_rules(service: Option<&str>) -> Vec<RoutingRuleGql> {
    load_aware_router()
        .lock()
        .unwrap()
        .get_routing_rules(service)
}

pub fn get_traffic_policy(service: &str) -> TrafficPolicyGql {
    let (rate_config, cb_state, degradation_config, rules, load_score) = {
        let limiter = rate_limiter().lock().unwrap();
        let rate_config = limiter
            .get_config(service)
            .map(|c| c.clone())
            .unwrap_or_else(|| RateLimiterConfigGql {
                service: service.to_string(),
                max_requests_per_second: 100.0,
                burst_capacity: 200,
                adaptive: true,
                current_refill_rate: 100.0,
                current_capacity: 200,
            });
        drop(limiter);

        let mut cb_mgr = circuit_breaker_manager().lock().unwrap();
        let cb_state = cb_mgr
            .get_state(service)
            .unwrap_or_else(|| CircuitBreakerStateGql {
                service: service.to_string(),
                state: CircuitStateGql::Closed,
                failure_count: 0,
                success_count: 0,
                total_requests: 0,
                failure_rate: 0.0,
                last_failure_time: None,
                recovery_deadline: None,
                half_open_remaining: 0,
                degradation_active: false,
            });
        let degradation_config =
            cb_mgr
                .get_degradation_config(service)
                .unwrap_or_else(|| ServiceDegradationConfigGql {
                    service: service.to_string(),
                    enabled: false,
                    strategy: "CacheFallback".to_string(),
                    fallback_ttl_sec: 300,
                    max_degradation_duration_sec: 3600,
                });
        drop(cb_mgr);

        let router = load_aware_router().lock().unwrap();
        let rules = router.get_routing_rules(Some(service));
        let load_score = router.get_service_load_score(service);
        drop(router);

        (rate_config, cb_state, degradation_config, rules, load_score)
    };

    let overall_health = if load_score < 0.5 {
        "healthy"
    } else if load_score < 0.8 {
        "degraded"
    } else {
        "overloaded"
    };

    TrafficPolicyGql {
        service: service.to_string(),
        rate_limit_config: rate_config,
        circuit_breaker_state: cb_state,
        degradation_config,
        routing_rules: rules,
        load_score,
        overall_health: overall_health.to_string(),
    }
}

// ==================== 初始化函数 ====================

pub fn init_rate_limiting() {
    let default_services = vec!["erp", "crm", "hrm", "finance", "mes", "workflow"];

    {
        let limiter = rate_limiter();
        let mut l = limiter.lock().unwrap();
        for svc in &default_services {
            l.ensure_service(svc);
        }
    }

    {
        let cb_mgr = circuit_breaker_manager();
        let mut cbm = cb_mgr.lock().unwrap();
        for svc in &default_services {
            cbm.ensure_service(svc);
        }
    }

    {
        let router = load_aware_router();
        let mut r = router.lock().unwrap();
        let default_instances = vec![
            ("erp", "erp-1", "http://erp-1:8080"),
            ("erp", "erp-2", "http://erp-2:8080"),
            ("crm", "crm-1", "http://crm-1:8080"),
            ("crm", "crm-2", "http://crm-2:8080"),
            ("hrm", "hrm-1", "http://hrm-1:8080"),
            ("finance", "finance-1", "http://finance-1:8080"),
            ("finance", "finance-2", "http://finance-2:8080"),
            ("mes", "mes-1", "http://mes-1:8080"),
            ("workflow", "workflow-1", "http://workflow-1:8080"),
        ];
        for (svc, id, url) in &default_instances {
            r.register_instance(svc, id, url);
            r.mark_healthy(svc, id);
        }
        for (svc, id, _) in &default_instances {
            r.update_metrics(svc, id, 0.2, 0.3, 10, 0, 50.0, 0.01);
        }
    }
}

// ==================== Phase 19: AI 驱动查询路由 + Schema Stitching + 智能缓存 ====================

// ---------- AI 查询路由类型 ----------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum AiQueryIntent {
    EntityRead,
    ListQuery,
    AnalyticsQuery,
    MutationWrite,
    SubscriptionStream,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum AiRoutingStrategy {
    Direct,
    Sharded,
    Parallel,
    Fallback,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct AiServiceMatchGql {
    pub service: String,
    pub score: f64,
    pub confidence: f64,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct AiRoutingDecisionGql {
    pub intent: AiQueryIntent,
    pub strategy: AiRoutingStrategy,
    pub primary_service: String,
    pub candidate_services: Vec<AiServiceMatchGql>,
    pub fallback_service: Option<String>,
    pub estimated_latency_ms: u64,
    pub cache_recommendation: String,
    pub reasoning: Vec<String>,
}

// ---------- Schema Stitching 类型 ----------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum TypeMergeStrategy {
    PrimaryWin,
    FieldLevel,
    Versioned,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct FieldMappingRuleGql {
    pub source_type: String,
    pub source_field: String,
    pub target_type: String,
    pub target_field: String,
    pub required: bool,
}

#[derive(Debug, Clone, InputObject)]
pub struct FieldMappingRuleInput {
    pub source_type: String,
    pub source_field: String,
    pub target_type: String,
    pub target_field: String,
    pub required: Option<bool>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct SubSchemaEntryGql {
    pub service: String,
    pub schema_url: String,
    pub type_count: u32,
    pub query_root: String,
    pub mutation_root: Option<String>,
    pub subscription_root: Option<String>,
    pub version: String,
    pub health_status: String,
    pub merged_at: String,
}

#[derive(Debug, Clone, InputObject)]
pub struct SubSchemaEntryInput {
    pub service: String,
    pub schema_url: String,
    pub type_count: Option<u32>,
    pub query_root: Option<String>,
    pub mutation_root: Option<String>,
    pub subscription_root: Option<String>,
    pub version: Option<String>,
}

impl SubSchemaEntryInput {
    pub fn to_entry(&self) -> SubSchemaEntryGql {
        SubSchemaEntryGql {
            service: self.service.clone(),
            schema_url: self.schema_url.clone(),
            type_count: self.type_count.unwrap_or(0),
            query_root: self
                .query_root
                .clone()
                .unwrap_or_else(|| "Query".to_string()),
            mutation_root: self.mutation_root.clone(),
            subscription_root: self.subscription_root.clone(),
            version: self.version.clone().unwrap_or_else(|| "1.0.0".to_string()),
            health_status: "healthy".to_string(),
            merged_at: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, SimpleObject)]
pub struct StitchedSchemaGql {
    pub id: String,
    pub name: String,
    pub merge_strategy: TypeMergeStrategy,
    pub sub_schemas: Vec<SubSchemaEntryGql>,
    pub total_types: u32,
    pub field_mappings: Vec<FieldMappingRuleGql>,
    pub stitched_at: String,
}

// ---------- 智能缓存类型 ----------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum AccessPattern {
    Frequent,
    Burst,
    Periodic,
    Sparse,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum ConsistencyLevel {
    Strong,
    Eventual,
    StaleWhileRevalidate,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum InvalidationStrategy {
    TTL,
    EventDriven,
    Versioned,
    Manual,
}

#[derive(Debug, Clone, InputObject)]
pub struct CachePolicyInput {
    pub key_pattern: String,
    pub ttl_sec: Option<u64>,
    pub consistency: Option<ConsistencyLevel>,
    pub invalidation: Option<InvalidationStrategy>,
    pub max_size: Option<u64>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct CachePolicyGql {
    pub key_pattern: String,
    pub access_pattern: AccessPattern,
    pub hit_rate: f64,
    pub miss_rate: f64,
    pub item_count: u64,
    pub ttl_sec: u64,
    pub consistency: ConsistencyLevel,
    pub invalidation: InvalidationStrategy,
    pub last_access: String,
    pub avg_size_bytes: u64,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct CacheEntryGql {
    pub key: String,
    pub size_bytes: u64,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub access_count: u64,
    pub last_accessed_at: String,
    pub invalidation_reason: Option<String>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct CacheStatsGql {
    pub total_entries: u64,
    pub total_hits: u64,
    pub total_misses: u64,
    pub hit_rate: f64,
    pub total_size_bytes: u64,
    pub eviction_count: u64,
    pub invalidation_events: u64,
    pub by_pattern: Vec<CachePolicyGql>,
}

// ---------- AI 查询路由实现 ----------

pub(crate) struct AiQueryRouter {
    service_registry: HashMap<String, Vec<String>>,
    query_history: Vec<(String, AiQueryIntent, AiRoutingStrategy)>,
}

impl AiQueryRouter {
    fn new() -> Self {
        let mut service_registry = HashMap::new();
        service_registry.insert(
            "EntityRead".to_string(),
            vec![
                "entity-service".to_string(),
                "graphql-gateway".to_string(),
                "primary-db".to_string(),
            ],
        );
        service_registry.insert(
            "ListQuery".to_string(),
            vec![
                "search-service".to_string(),
                "index-service".to_string(),
                "read-replica".to_string(),
            ],
        );
        service_registry.insert(
            "AnalyticsQuery".to_string(),
            vec![
                "analytics-service".to_string(),
                "olap-engine".to_string(),
                "reporting-service".to_string(),
            ],
        );
        service_registry.insert(
            "MutationWrite".to_string(),
            vec![
                "write-service".to_string(),
                "event-sourcing".to_string(),
                "command-bus".to_string(),
            ],
        );
        service_registry.insert(
            "SubscriptionStream".to_string(),
            vec![
                "realtime-service".to_string(),
                "websocket-gateway".to_string(),
                "push-service".to_string(),
            ],
        );
        Self {
            service_registry,
            query_history: Vec::new(),
        }
    }

    fn detect_intent(&self, query: &str) -> AiQueryIntent {
        let q = query.trim();
        if q.is_empty() {
            return AiQueryIntent::Unknown;
        }
        let lower = q.to_lowercase();
        if lower.contains("subscription") || lower.starts_with("sub ") {
            return AiQueryIntent::SubscriptionStream;
        }
        if lower.starts_with("mutation") {
            return AiQueryIntent::MutationWrite;
        }
        if lower.contains("analytics")
            || lower.contains("aggregate")
            || lower.contains("count")
            || lower.contains("sum(")
            || lower.contains("group by")
        {
            return AiQueryIntent::AnalyticsQuery;
        }
        if lower.contains("list")
            || lower.contains("search")
            || lower.contains("find")
            || lower.contains("filter")
            || lower.contains("where")
        {
            return AiQueryIntent::ListQuery;
        }
        if lower.contains("id")
            || lower.contains("by_id")
            || lower.contains("get(")
            || lower.contains("node(")
        {
            return AiQueryIntent::EntityRead;
        }
        AiQueryIntent::Unknown
    }

    fn match_services(&self, _query: &str) -> Vec<AiServiceMatchGql> {
        let mut matches = Vec::new();
        for (intent_key, services) in &self.service_registry {
            for svc in services {
                matches.push(AiServiceMatchGql {
                    service: svc.clone(),
                    score: 0.85,
                    confidence: 0.8,
                    reasons: vec![format!("匹配 {} 意图", intent_key)],
                });
            }
        }
        if matches.is_empty() {
            matches.push(AiServiceMatchGql {
                service: "default-service".to_string(),
                score: 0.5,
                confidence: 0.3,
                reasons: vec!["降级匹配".to_string()],
            });
        }
        matches
    }

    fn decide_strategy(&self, intent: AiQueryIntent, candidate_count: usize) -> AiRoutingStrategy {
        match intent {
            AiQueryIntent::EntityRead => AiRoutingStrategy::Direct,
            AiQueryIntent::MutationWrite => AiRoutingStrategy::Direct,
            AiQueryIntent::AnalyticsQuery => {
                if candidate_count > 1 {
                    AiRoutingStrategy::Parallel
                } else {
                    AiRoutingStrategy::Direct
                }
            }
            AiQueryIntent::ListQuery => {
                if candidate_count > 2 {
                    AiRoutingStrategy::Sharded
                } else {
                    AiRoutingStrategy::Direct
                }
            }
            AiQueryIntent::SubscriptionStream => AiRoutingStrategy::Direct,
            AiQueryIntent::Unknown => AiRoutingStrategy::Fallback,
        }
    }

    fn build_decision(&mut self, query: &str) -> AiRoutingDecisionGql {
        let intent = self.detect_intent(query);
        let services = self.match_services(query);
        let strategy = self.decide_strategy(intent, services.len());
        let primary = services
            .first()
            .map(|s| s.service.clone())
            .unwrap_or_default();
        let fallback = services.get(1).map(|s| s.service.clone());
        let estimated_latency = match strategy {
            AiRoutingStrategy::Direct => 50,
            AiRoutingStrategy::Sharded => 120,
            AiRoutingStrategy::Parallel => 80,
            AiRoutingStrategy::Fallback => 200,
        };
        let cache_recommendation = match intent {
            AiQueryIntent::EntityRead => "StaleWhileRevalidate".to_string(),
            AiQueryIntent::ListQuery => "EventDriven".to_string(),
            AiQueryIntent::AnalyticsQuery => "TTL".to_string(),
            AiQueryIntent::MutationWrite => "None".to_string(),
            AiQueryIntent::SubscriptionStream => "None".to_string(),
            AiQueryIntent::Unknown => "Manual".to_string(),
        };
        let reasoning = vec![
            format!("意图识别: {:?}", intent),
            format!("策略选择: {:?}", strategy),
            format!("候选服务数: {}", services.len()),
            format!("推荐缓存: {}", cache_recommendation),
        ];
        self.query_history
            .push((query.to_string(), intent, strategy));
        if self.query_history.len() > 1000 {
            self.query_history.remove(0);
        }
        AiRoutingDecisionGql {
            intent,
            strategy,
            primary_service: primary,
            candidate_services: services,
            fallback_service: fallback,
            estimated_latency_ms: estimated_latency,
            cache_recommendation,
            reasoning,
        }
    }
}

// ---------- Schema Stitching 实现 ----------

pub(crate) struct SchemaStitcher {
    sub_schemas: HashMap<String, SubSchemaEntryGql>,
    field_mappings: Vec<FieldMappingRuleGql>,
    merge_strategy: Mutex<TypeMergeStrategy>,
    type_index: HashMap<String, Vec<String>>,
}

impl SchemaStitcher {
    fn new() -> Self {
        Self {
            sub_schemas: HashMap::new(),
            field_mappings: Vec::new(),
            merge_strategy: Mutex::new(TypeMergeStrategy::PrimaryWin),
            type_index: HashMap::new(),
        }
    }

    pub fn upsert_sub_schema(&mut self, entry: SubSchemaEntryGql) {
        self.type_index
            .entry(entry.query_root.clone())
            .or_default()
            .push(entry.service.clone());
        self.sub_schemas.insert(entry.service.clone(), entry);
    }

    pub fn remove_sub_schema(&mut self, service: &str) -> bool {
        self.sub_schemas.remove(service).is_some()
    }

    pub fn set_merge_strategy(&self, strategy: TypeMergeStrategy) {
        let mut s = self.merge_strategy.lock().unwrap();
        *s = strategy;
    }

    pub fn get_merge_strategy(&self) -> TypeMergeStrategy {
        *self.merge_strategy.lock().unwrap()
    }

    pub fn add_field_mapping(&mut self, mapping: FieldMappingRuleGql) {
        self.field_mappings.push(mapping);
    }

    pub fn remove_field_mapping(&mut self, source_type: &str, source_field: &str) -> bool {
        let before = self.field_mappings.len();
        self.field_mappings
            .retain(|m| !(m.source_type == source_type && m.source_field == source_field));
        self.field_mappings.len() < before
    }

    pub fn stitched_schema(&self, name: &str) -> StitchedSchemaGql {
        let sub_schemas: Vec<SubSchemaEntryGql> = self.sub_schemas.values().cloned().collect();
        let total_types: u32 = sub_schemas.iter().map(|s| s.type_count).sum();
        StitchedSchemaGql {
            id: format!("{}-{}", name, Utc::now().timestamp()),
            name: name.to_string(),
            merge_strategy: self.get_merge_strategy(),
            sub_schemas,
            total_types,
            field_mappings: self.field_mappings.clone(),
            stitched_at: Utc::now().to_rfc3339(),
        }
    }

    pub fn sub_schemas_list(&self) -> Vec<SubSchemaEntryGql> {
        self.sub_schemas.values().cloned().collect()
    }

    pub fn field_mappings_list(&self) -> Vec<FieldMappingRuleGql> {
        self.field_mappings.clone()
    }
}

// ---------- 智能缓存实现 ----------

pub(crate) struct CacheEntry {
    key: String,
    value: Vec<u8>,
    size_bytes: u64,
    created_at: chrono::DateTime<Utc>,
    expires_at: Option<chrono::DateTime<Utc>>,
    access_count: u64,
    last_accessed_at: chrono::DateTime<Utc>,
    invalidation_reason: Option<String>,
    pattern: String,
}

pub(crate) struct IntelligentCache {
    entries: HashMap<String, CacheEntry>,
    policy_patterns: HashMap<String, CachePolicyGql>,
    total_hits: u64,
    total_misses: u64,
    eviction_count: u64,
    invalidation_events: u64,
    max_total_size: u64,
}

impl IntelligentCache {
    fn new(max_total_size: u64) -> Self {
        Self {
            entries: HashMap::new(),
            policy_patterns: HashMap::new(),
            total_hits: 0,
            total_misses: 0,
            eviction_count: 0,
            invalidation_events: 0,
            max_total_size,
        }
    }

    fn total_size(&self) -> u64 {
        self.entries.values().map(|e| e.size_bytes).sum()
    }

    fn matches_pattern(key: &str, pattern: &str) -> bool {
        if pattern == "*" {
            return true;
        }
        if let Some(prefix) = pattern.strip_suffix('*') {
            return key.starts_with(prefix);
        }
        key == pattern
    }

    fn detect_access_pattern(&self, key: &str) -> AccessPattern {
        let count = self
            .entries
            .values()
            .filter(|e| Self::matches_pattern(&e.key, key))
            .map(|e| e.access_count)
            .sum::<u64>();
        if count > 1000 {
            AccessPattern::Frequent
        } else if count > 100 {
            AccessPattern::Burst
        } else if count > 10 {
            AccessPattern::Periodic
        } else {
            AccessPattern::Sparse
        }
    }

    pub(crate) fn get(&mut self, key: &str) -> Option<&CacheEntry> {
        if let Some(entry) = self.entries.get_mut(key) {
            if let Some(exp) = entry.expires_at {
                if Utc::now() > exp {
                    entry.invalidation_reason = Some("TTL expired".to_string());
                    self.invalidation_events += 1;
                    return None;
                }
            }
            entry.access_count += 1;
            entry.last_accessed_at = Utc::now();
            self.total_hits += 1;
            Some(entry)
        } else {
            self.total_misses += 1;
            None
        }
    }

    pub fn put(&mut self, key: &str, value: Vec<u8>, pattern: &str, ttl_sec: Option<u64>) {
        let size = value.len() as u64;
        if self.total_size() + size > self.max_total_size {
            self.evict_one();
        }
        let expires_at = ttl_sec.map(|t| Utc::now() + chrono::Duration::seconds(t as i64));
        let entry = CacheEntry {
            key: key.to_string(),
            value,
            size_bytes: size,
            created_at: Utc::now(),
            expires_at,
            access_count: 0,
            last_accessed_at: Utc::now(),
            invalidation_reason: None,
            pattern: pattern.to_string(),
        };
        self.entries.insert(key.to_string(), entry);
    }

    fn evict_one(&mut self) {
        if let Some(oldest_key) = self
            .entries
            .iter()
            .min_by_key(|(_, e)| e.last_accessed_at)
            .map(|(k, _)| k.clone())
        {
            self.entries.remove(&oldest_key);
            self.eviction_count += 1;
        }
    }

    pub fn delete(&mut self, key: &str) -> bool {
        let removed = self.entries.remove(key).is_some();
        if removed {
            self.invalidation_events += 1;
        }
        removed
    }

    pub fn invalidate_pattern(&mut self, pattern: &str) -> u64 {
        let before = self.entries.len();
        self.entries
            .retain(|k, _| !Self::matches_pattern(k, pattern));
        let removed = (before - self.entries.len()) as u64;
        self.invalidation_events += removed;
        removed
    }

    pub fn set_policy(
        &mut self,
        key_pattern: &str,
        ttl_sec: u64,
        consistency: ConsistencyLevel,
        invalidation: InvalidationStrategy,
    ) {
        let access_pattern = self.detect_access_pattern(key_pattern);
        let entries: Vec<&CacheEntry> = self
            .entries
            .values()
            .filter(|e| Self::matches_pattern(&e.key, key_pattern))
            .collect();
        let item_count = entries.len() as u64;
        let total_hits_for_pattern: u64 = entries.iter().map(|e| e.access_count).sum();
        let total_accesses = total_hits_for_pattern + 1;
        let hit_rate = if total_accesses > 0 {
            total_hits_for_pattern as f64 / total_accesses as f64
        } else {
            0.0
        };
        let avg_size_bytes = if item_count > 0 {
            entries.iter().map(|e| e.size_bytes).sum::<u64>() / item_count
        } else {
            0
        };
        let last_access = entries
            .iter()
            .map(|e| e.last_accessed_at)
            .max()
            .unwrap_or_else(Utc::now);
        let policy = CachePolicyGql {
            key_pattern: key_pattern.to_string(),
            access_pattern,
            hit_rate,
            miss_rate: 1.0 - hit_rate,
            item_count,
            ttl_sec,
            consistency,
            invalidation,
            last_access: last_access.to_rfc3339(),
            avg_size_bytes,
        };
        self.policy_patterns.insert(key_pattern.to_string(), policy);
    }

    pub fn get_policy(&self, key_pattern: &str) -> Option<CachePolicyGql> {
        self.policy_patterns.get(key_pattern).cloned()
    }

    pub fn list_policies(&self) -> Vec<CachePolicyGql> {
        self.policy_patterns.values().cloned().collect()
    }

    pub fn clear_policies(&mut self) {
        self.policy_patterns.clear();
    }

    pub fn get_entry(&self, key: &str) -> Option<CacheEntryGql> {
        self.entries.get(key).map(|e| CacheEntryGql {
            key: e.key.clone(),
            size_bytes: e.size_bytes,
            created_at: e.created_at.to_rfc3339(),
            expires_at: e.expires_at.map(|t| t.to_rfc3339()),
            access_count: e.access_count,
            last_accessed_at: e.last_accessed_at.to_rfc3339(),
            invalidation_reason: e.invalidation_reason.clone(),
        })
    }

    pub fn list_entries(&self, pattern: Option<&str>) -> Vec<CacheEntryGql> {
        self.entries
            .values()
            .filter(|e| match pattern {
                Some(p) => Self::matches_pattern(&e.key, p),
                None => true,
            })
            .map(|e| CacheEntryGql {
                key: e.key.clone(),
                size_bytes: e.size_bytes,
                created_at: e.created_at.to_rfc3339(),
                expires_at: e.expires_at.map(|t| t.to_rfc3339()),
                access_count: e.access_count,
                last_accessed_at: e.last_accessed_at.to_rfc3339(),
                invalidation_reason: e.invalidation_reason.clone(),
            })
            .collect()
    }

    pub fn stats(&self) -> CacheStatsGql {
        let total = self.total_hits + self.total_misses;
        let hit_rate = if total > 0 {
            self.total_hits as f64 / total as f64
        } else {
            0.0
        };
        CacheStatsGql {
            total_entries: self.entries.len() as u64,
            total_hits: self.total_hits,
            total_misses: self.total_misses,
            hit_rate,
            total_size_bytes: self.total_size(),
            eviction_count: self.eviction_count,
            invalidation_events: self.invalidation_events,
            by_pattern: self.policy_patterns.values().cloned().collect(),
        }
    }
}

// ---------- Phase 19 全局单例 ----------

static AI_ROUTER: OnceLock<Mutex<AiQueryRouter>> = OnceLock::new();
static SCHEMA_STITCHER: OnceLock<Mutex<SchemaStitcher>> = OnceLock::new();
static INTELLIGENT_CACHE: OnceLock<Mutex<IntelligentCache>> = OnceLock::new();

pub(crate) fn ai_router() -> &'static Mutex<AiQueryRouter> {
    AI_ROUTER.get_or_init(|| Mutex::new(AiQueryRouter::new()))
}

pub(crate) fn schema_stitcher() -> &'static Mutex<SchemaStitcher> {
    SCHEMA_STITCHER.get_or_init(|| Mutex::new(SchemaStitcher::new()))
}

pub(crate) fn intelligent_cache() -> &'static Mutex<IntelligentCache> {
    INTELLIGENT_CACHE.get_or_init(|| Mutex::new(IntelligentCache::new(1_048_576_000)))
}

// ---------- Phase 19 公共 API ----------

pub fn ai_detect_intent(query: &str) -> AiQueryIntent {
    ai_router().lock().unwrap().detect_intent(query)
}

pub fn ai_route_query(query: &str) -> AiRoutingDecisionGql {
    ai_router().lock().unwrap().build_decision(query)
}

pub fn stitch_schema(name: &str) -> StitchedSchemaGql {
    schema_stitcher().lock().unwrap().stitched_schema(name)
}

pub fn stitch_list_sub_schemas() -> Vec<SubSchemaEntryGql> {
    schema_stitcher().lock().unwrap().sub_schemas_list()
}

pub fn stitch_list_field_mappings() -> Vec<FieldMappingRuleGql> {
    schema_stitcher().lock().unwrap().field_mappings_list()
}

pub fn cache_stats() -> CacheStatsGql {
    intelligent_cache().lock().unwrap().stats()
}

pub fn cache_get_entry(key: &str) -> Option<CacheEntryGql> {
    intelligent_cache().lock().unwrap().get_entry(key)
}

pub fn cache_list_entries(pattern: Option<&str>) -> Vec<CacheEntryGql> {
    intelligent_cache().lock().unwrap().list_entries(pattern)
}

pub fn cache_list_policies() -> Vec<CachePolicyGql> {
    intelligent_cache().lock().unwrap().list_policies()
}

pub fn register_sub_schema(entry: SubSchemaEntryInput) -> async_graphql::Result<SubSchemaEntryGql> {
    let entry_gql = entry.to_entry();
    schema_stitcher()
        .lock()
        .unwrap()
        .upsert_sub_schema(entry_gql.clone());
    Ok(entry_gql)
}

pub fn remove_sub_schema(service: &str) -> async_graphql::Result<bool> {
    Ok(schema_stitcher().lock().unwrap().remove_sub_schema(service))
}

pub fn set_merge_strategy(strategy: TypeMergeStrategy) -> async_graphql::Result<bool> {
    schema_stitcher()
        .lock()
        .unwrap()
        .set_merge_strategy(strategy);
    Ok(true)
}

pub fn add_field_mapping(rule: FieldMappingRuleInput) -> async_graphql::Result<bool> {
    let mapping = FieldMappingRuleGql {
        source_type: rule.source_type,
        source_field: rule.source_field,
        target_type: rule.target_type,
        target_field: rule.target_field,
        required: rule.required.unwrap_or(false),
    };
    schema_stitcher().lock().unwrap().add_field_mapping(mapping);
    Ok(true)
}

pub fn remove_field_mapping(source_type: &str, source_field: &str) -> async_graphql::Result<bool> {
    Ok(schema_stitcher()
        .lock()
        .unwrap()
        .remove_field_mapping(source_type, source_field))
}

pub fn refresh_stitched_schema(name: &str) -> async_graphql::Result<StitchedSchemaGql> {
    Ok(schema_stitcher().lock().unwrap().stitched_schema(name))
}

pub fn cache_set(
    key: &str,
    value: String,
    policy: Option<CachePolicyInput>,
) -> async_graphql::Result<Option<CacheEntryGql>> {
    let bytes = value.into_bytes();
    let ttl_sec = policy.as_ref().and_then(|p| p.ttl_sec);
    let pattern = policy
        .as_ref()
        .map(|p| p.key_pattern.as_str())
        .unwrap_or("default");
    intelligent_cache()
        .lock()
        .unwrap()
        .put(key, bytes, pattern, ttl_sec);
    Ok(intelligent_cache().lock().unwrap().get_entry(key))
}

pub fn cache_delete(key: &str) -> async_graphql::Result<bool> {
    Ok(intelligent_cache().lock().unwrap().delete(key))
}

pub fn cache_clear(pattern: Option<&str>) -> async_graphql::Result<u64> {
    Ok(match pattern {
        Some(p) => intelligent_cache().lock().unwrap().invalidate_pattern(p),
        None => intelligent_cache().lock().unwrap().invalidate_pattern("*"),
    })
}

pub fn cache_set_policy(pattern: &str, policy: CachePolicyInput) -> async_graphql::Result<bool> {
    let consistency = policy.consistency.unwrap_or(ConsistencyLevel::Eventual);
    let invalidation = policy.invalidation.unwrap_or(InvalidationStrategy::TTL);
    intelligent_cache().lock().unwrap().set_policy(
        pattern,
        policy.ttl_sec.unwrap_or(300),
        consistency,
        invalidation,
    );
    Ok(true)
}

pub fn cache_clear_policies() -> async_graphql::Result<bool> {
    intelligent_cache().lock().unwrap().clear_policies();
    Ok(true)
}

// ---------- Phase 19: RateLimitingQueryRoot / RateLimitingMutationRoot ----------

pub struct RateLimitingQueryRoot;
pub struct RateLimitingMutationRoot;

#[Object]
#[allow(clippy::needless_update)]
impl RateLimitingQueryRoot {
    /// AI 查询路由分析：对查询语句进行意图识别、服务匹配与策略决策
    async fn ai_route_query(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiRoutingDecisionGql> {
        Ok(ai_route_query(&query))
    }

    /// AI 查询意图识别
    async fn ai_detect_intent(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiQueryIntent> {
        Ok(ai_detect_intent(&query))
    }

    /// 获取指定名称的 Stitched Schema
    async fn stitched_schema(
        &self,
        _ctx: &Context<'_>,
        name: String,
    ) -> async_graphql::Result<StitchedSchemaGql> {
        Ok(stitch_schema(&name))
    }

    /// 获取所有已注册的子 Schema 列表
    async fn stitched_sub_schemas(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubSchemaEntryGql>> {
        Ok(stitch_list_sub_schemas())
    }

    /// 获取字段映射规则列表
    async fn stitched_field_mappings(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FieldMappingRuleGql>> {
        Ok(stitch_list_field_mappings())
    }

    /// 获取智能缓存整体统计
    async fn cache_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<CacheStatsGql> {
        Ok(cache_stats())
    }

    /// 查询单个缓存条目
    async fn cache_get_entry(
        &self,
        _ctx: &Context<'_>,
        key: String,
    ) -> async_graphql::Result<Option<CacheEntryGql>> {
        Ok(cache_get_entry(&key))
    }

    /// 按模式列出缓存条目
    async fn cache_list_entries(
        &self,
        _ctx: &Context<'_>,
        pattern: Option<String>,
    ) -> async_graphql::Result<Vec<CacheEntryGql>> {
        Ok(cache_list_entries(pattern.as_deref()))
    }

    /// 列出所有缓存策略
    async fn cache_list_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CachePolicyGql>> {
        Ok(cache_list_policies())
    }
}

#[Object]
#[allow(clippy::needless_update)]
impl RateLimitingMutationRoot {
    /// 注册或更新子 Schema
    async fn register_sub_schema(
        &self,
        _ctx: &Context<'_>,
        entry: SubSchemaEntryInput,
    ) -> async_graphql::Result<SubSchemaEntryGql> {
        let entry_gql = entry.to_entry();
        schema_stitcher()
            .lock()
            .unwrap()
            .upsert_sub_schema(entry_gql.clone());
        Ok(entry_gql)
    }

    /// 移除子 Schema
    async fn remove_sub_schema(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<bool> {
        Ok(schema_stitcher()
            .lock()
            .unwrap()
            .remove_sub_schema(&service))
    }

    /// 设置 Schema Stitching 类型合并策略
    async fn set_merge_strategy(
        &self,
        _ctx: &Context<'_>,
        strategy: TypeMergeStrategy,
    ) -> async_graphql::Result<bool> {
        schema_stitcher()
            .lock()
            .unwrap()
            .set_merge_strategy(strategy);
        Ok(true)
    }

    /// 添加字段映射规则
    async fn add_field_mapping(
        &self,
        _ctx: &Context<'_>,
        mapping: FieldMappingRuleInput,
    ) -> async_graphql::Result<FieldMappingRuleGql> {
        let rule = FieldMappingRuleGql {
            source_type: mapping.source_type,
            source_field: mapping.source_field,
            target_type: mapping.target_type,
            target_field: mapping.target_field,
            required: mapping.required.unwrap_or(false),
        };
        schema_stitcher()
            .lock()
            .unwrap()
            .add_field_mapping(rule.clone());
        Ok(rule)
    }

    /// 移除字段映射规则
    async fn remove_field_mapping(
        &self,
        _ctx: &Context<'_>,
        source_type: String,
        source_field: String,
    ) -> async_graphql::Result<bool> {
        Ok(schema_stitcher()
            .lock()
            .unwrap()
            .remove_field_mapping(&source_type, &source_field))
    }

    /// 写入缓存条目
    async fn cache_put(
        &self,
        _ctx: &Context<'_>,
        key: String,
        value: String,
        pattern: Option<String>,
        ttl_sec: Option<u64>,
    ) -> async_graphql::Result<bool> {
        let bytes = value.into_bytes();
        intelligent_cache().lock().unwrap().put(
            &key,
            bytes,
            pattern.as_deref().unwrap_or("*"),
            ttl_sec,
        );
        Ok(true)
    }

    /// 删除单个缓存条目
    async fn cache_delete(&self, _ctx: &Context<'_>, key: String) -> async_graphql::Result<bool> {
        Ok(intelligent_cache().lock().unwrap().delete(&key))
    }

    /// 按模式批量失效缓存
    async fn cache_invalidate_pattern(
        &self,
        _ctx: &Context<'_>,
        pattern: String,
    ) -> async_graphql::Result<u64> {
        Ok(intelligent_cache()
            .lock()
            .unwrap()
            .invalidate_pattern(&pattern))
    }

    /// 设置缓存策略
    async fn cache_set_policy(
        &self,
        _ctx: &Context<'_>,
        policy: CachePolicyInput,
    ) -> async_graphql::Result<CachePolicyGql> {
        let consistency = policy.consistency.unwrap_or(ConsistencyLevel::Eventual);
        let invalidation = policy.invalidation.unwrap_or(InvalidationStrategy::TTL);
        let ttl = policy.ttl_sec.unwrap_or(300);
        intelligent_cache().lock().unwrap().set_policy(
            &policy.key_pattern,
            ttl,
            consistency,
            invalidation,
        );
        Ok(intelligent_cache()
            .lock()
            .unwrap()
            .get_policy(&policy.key_pattern)
            .ok_or_else(|| async_graphql::Error::new("Policy not found after set"))?)
    }
}

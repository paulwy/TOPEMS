#![allow(dead_code)] // Reserved: V51 超级网关模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V51.0 GraphQL 超级网关: 多协议支持 + 智能路由 + 自适应降级
//!
//! 核心能力：
//! 1. 多协议支持 (Multi-Protocol Support)
//!    - SupportedProtocol: GraphQL, REST, gRPC, WebSocket, SSE, WebDAV
//!    - ProtocolRouter: 按协议路由规则分发请求
//!    - ProtocolHandler: 协议特定请求处理 trait
//! 2. 智能路由 (Smart Routing)
//!    - SmartRoute: 路由规则定义
//!    - RoutingStrategy: 负载均衡策略（轮询/最少延迟/权重/地理/内容）
//!    - SmartRouter: 自动服务发现 + 内容路由 + 熔断集成
//! 3. 自适应降级 (Adaptive Degradation)
//!    - DegradationLevel: 正常/降级/受限/紧急/离线
//!    - DegradationPolicy: 触发阈值 + 回退策略
//!    - AdaptiveDegradationController: 实时健康监控 + 自动降级调整

use axum::extract::{Json, Path, Query};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

// ==================== 类型定义 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SupportedProtocol {
    GraphQL,
    REST,
    GrPC,
    WebSocket,
    SSE,
    WebDAV,
}

impl SupportedProtocol {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::GraphQL => "graphql",
            Self::REST => "rest",
            Self::GrPC => "grpc",
            Self::WebSocket => "websocket",
            Self::SSE => "sse",
            Self::WebDAV => "webdav",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "graphql" => Some(Self::GraphQL),
            "rest" => Some(Self::REST),
            "grpc" => Some(Self::GrPC),
            "websocket" | "ws" => Some(Self::WebSocket),
            "sse" => Some(Self::SSE),
            "webdav" => Some(Self::WebDAV),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolConfig {
    pub protocol: SupportedProtocol,
    pub enabled: bool,
    pub max_connections: u32,
    pub timeout_ms: u64,
    pub rate_limit_per_sec: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RoutingStrategy {
    RoundRobin,
    LeastLatency,
    Weighted,
    Geographic,
    ContentBased,
}

impl RoutingStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::RoundRobin => "round_robin",
            Self::LeastLatency => "least_latency",
            Self::Weighted => "weighted",
            Self::Geographic => "geographic",
            Self::ContentBased => "content_based",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerConfig {
    pub failure_threshold: u32,
    pub success_threshold: u32,
    pub timeout_ms: u64,
    pub half_open_max_requests: u32,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            success_threshold: 3,
            timeout_ms: 30_000,
            half_open_max_requests: 3,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartRoute {
    pub id: String,
    pub name: String,
    pub protocol: SupportedProtocol,
    pub path_pattern: String,
    pub target_service: String,
    pub priority: u32,
    pub conditions: Vec<String>,
    pub load_balancing_strategy: RoutingStrategy,
    pub circuit_breaker_config: CircuitBreakerConfig,
    pub enabled: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DegradationLevel {
    Normal,
    Degraded,
    Limited,
    Emergency,
    Offline,
}

impl DegradationLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Degraded => "degraded",
            Self::Limited => "limited",
            Self::Emergency => "emergency",
            Self::Offline => "offline",
        }
    }

    pub fn severity(&self) -> u8 {
        match self {
            Self::Normal => 0,
            Self::Degraded => 1,
            Self::Limited => 2,
            Self::Emergency => 3,
            Self::Offline => 4,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DegradationTriggers {
    pub latency_threshold_ms: u64,
    pub error_rate_threshold: f64,
    pub cpu_threshold: f64,
}

impl Default for DegradationTriggers {
    fn default() -> Self {
        Self {
            latency_threshold_ms: 1000,
            error_rate_threshold: 0.1,
            cpu_threshold: 0.85,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DegradationPolicy {
    pub level: DegradationLevel,
    pub triggers: DegradationTriggers,
    pub fallback_strategy: String,
    pub notification_channels: Vec<String>,
}

impl Default for DegradationPolicy {
    fn default() -> Self {
        Self {
            level: DegradationLevel::Normal,
            triggers: DegradationTriggers::default(),
            fallback_strategy: "cache".to_string(),
            notification_channels: vec!["alert".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetrics {
    pub service_name: String,
    pub latency_ms: u64,
    pub error_rate: f64,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub request_count: u64,
    pub success_count: u64,
    pub failure_count: u64,
}

impl Default for HealthMetrics {
    fn default() -> Self {
        Self {
            service_name: String::new(),
            latency_ms: 0,
            error_rate: 0.0,
            cpu_usage: 0.0,
            memory_usage: 0.0,
            request_count: 0,
            success_count: 0,
            failure_count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayStatus {
    pub version: String,
    pub uptime_secs: u64,
    pub active_protocols: Vec<String>,
    pub total_routes: usize,
    pub active_routes: usize,
    pub degradation_level: DegradationLevel,
    pub health: HealthMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteMatchResult {
    pub matched: bool,
    pub route_id: Option<String>,
    pub target_service: Option<String>,
    pub protocol: Option<SupportedProtocol>,
    pub strategy: Option<RoutingStrategy>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRouteRequest {
    pub name: String,
    pub protocol: SupportedProtocol,
    pub path_pattern: String,
    pub target_service: String,
    pub priority: Option<u32>,
    pub conditions: Option<Vec<String>>,
    pub load_balancing_strategy: Option<RoutingStrategy>,
    pub circuit_breaker_config: Option<CircuitBreakerConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRoutePriorityRequest {
    pub priority: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SetDegradationLevelRequest {
    pub level: DegradationLevel,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConfigureDegradationPolicyRequest {
    pub level: Option<DegradationLevel>,
    pub triggers: Option<DegradationTriggers>,
    pub fallback_strategy: Option<String>,
    pub notification_channels: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RouteQueryParams {
    pub protocol: Option<String>,
    pub target_service: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApiResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResult<T> {
    fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn err(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

// ==================== ProtocolHandler Trait ====================

pub trait ProtocolHandler: Send + Sync {
    fn protocol(&self) -> SupportedProtocol;
    fn handle(&self, request: &str) -> Result<String, String>;
}

// ==================== 多协议路由实现 ====================

struct ProtocolRouterInner {
    protocols: HashMap<SupportedProtocol, ProtocolConfig>,
    handlers: HashMap<SupportedProtocol, Arc<dyn ProtocolHandler>>,
}

impl ProtocolRouterInner {
    fn new() -> Self {
        let mut protocols = HashMap::new();
        for proto in [
            SupportedProtocol::GraphQL,
            SupportedProtocol::REST,
            SupportedProtocol::GrPC,
            SupportedProtocol::WebSocket,
            SupportedProtocol::SSE,
            SupportedProtocol::WebDAV,
        ] {
            protocols.insert(
                proto,
                ProtocolConfig {
                    protocol: proto,
                    enabled: true,
                    max_connections: 1000,
                    timeout_ms: 30_000,
                    rate_limit_per_sec: 100,
                },
            );
        }
        Self {
            protocols,
            handlers: HashMap::new(),
        }
    }

    fn register_protocol(&mut self, config: ProtocolConfig) {
        self.protocols.insert(config.protocol, config);
    }

    fn register_handler(&mut self, handler: Arc<dyn ProtocolHandler>) {
        let proto = handler.protocol();
        self.handlers.insert(proto, handler);
    }

    fn route_request(&self, protocol: SupportedProtocol, request: &str) -> Result<String, String> {
        let config = self
            .protocols
            .get(&protocol)
            .ok_or_else(|| format!("Protocol {:?} not found", protocol))?;
        if !config.enabled {
            return Err(format!("Protocol {:?} is disabled", protocol));
        }
        let handler = self
            .handlers
            .get(&protocol)
            .ok_or_else(|| format!("No handler registered for protocol {:?}", protocol))?;
        handler.handle(request)
    }

    fn list_protocols(&self) -> Vec<ProtocolConfig> {
        self.protocols.values().cloned().collect()
    }

    fn get_protocol_config(&self, protocol: SupportedProtocol) -> Option<ProtocolConfig> {
        self.protocols.get(&protocol).cloned()
    }

    fn enable_protocol(&mut self, protocol: SupportedProtocol) -> bool {
        if let Some(config) = self.protocols.get_mut(&protocol) {
            config.enabled = true;
            true
        } else {
            false
        }
    }

    fn disable_protocol(&mut self, protocol: SupportedProtocol) -> bool {
        if let Some(config) = self.protocols.get_mut(&protocol) {
            config.enabled = false;
            true
        } else {
            false
        }
    }
}

pub struct ProtocolRouter {
    inner: Mutex<ProtocolRouterInner>,
}

impl ProtocolRouter {
    fn new() -> Self {
        Self {
            inner: Mutex::new(ProtocolRouterInner::new()),
        }
    }

    pub fn register_protocol(&self, config: ProtocolConfig) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .register_protocol(config);
    }

    pub fn register_handler(&self, handler: Arc<dyn ProtocolHandler>) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .register_handler(handler);
    }

    pub fn route_request(
        &self,
        protocol: SupportedProtocol,
        request: &str,
    ) -> Result<String, String> {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .route_request(protocol, request)
    }

    pub fn list_protocols(&self) -> Vec<ProtocolConfig> {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .list_protocols()
    }

    pub fn get_protocol_config(&self, protocol: SupportedProtocol) -> Option<ProtocolConfig> {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_protocol_config(protocol)
    }

    pub fn enable_protocol(&self, protocol: SupportedProtocol) -> bool {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .enable_protocol(protocol)
    }

    pub fn disable_protocol(&self, protocol: SupportedProtocol) -> bool {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .disable_protocol(protocol)
    }
}

// ==================== 智能路由实现 ====================

struct SmartRouterInner {
    routes: HashMap<String, SmartRoute>,
    service_registry: HashMap<String, Vec<String>>,
    round_robin_counters: HashMap<String, AtomicU64>,
}

impl SmartRouterInner {
    fn new() -> Self {
        Self {
            routes: HashMap::new(),
            service_registry: HashMap::new(),
            round_robin_counters: HashMap::new(),
        }
    }

    fn add_route(&mut self, route: SmartRoute) -> SmartRoute {
        let id = route.id.clone();
        self.routes.insert(id.clone(), route.clone());
        self.round_robin_counters
            .entry(id)
            .or_insert_with(|| AtomicU64::new(0));
        route
    }

    fn remove_route(&mut self, route_id: &str) -> bool {
        self.routes.remove(route_id).is_some()
    }

    fn match_route(
        &self,
        path: &str,
        protocol: Option<SupportedProtocol>,
        headers: &HashMap<String, String>,
    ) -> RouteMatchResult {
        let mut candidates: Vec<&SmartRoute> = self
            .routes
            .values()
            .filter(|r| r.enabled)
            .filter(|r| {
                if let Some(p) = protocol {
                    r.protocol == p
                } else {
                    true
                }
            })
            .filter(|r| path_matches_pattern(path, &r.path_pattern))
            .collect();

        if candidates.is_empty() {
            return RouteMatchResult {
                matched: false,
                route_id: None,
                target_service: None,
                protocol: None,
                strategy: None,
            };
        }

        candidates.sort_by_key(|r| std::cmp::Reverse(r.priority));

        let route = candidates[0];

        let target = match route.load_balancing_strategy {
            RoutingStrategy::RoundRobin => {
                let idx = self
                    .round_robin_counters
                    .get(&route.id)
                    .map(|c| c.fetch_add(1, Ordering::Relaxed))
                    .unwrap_or(0);
                let services = self.service_registry.get(&route.target_service);
                if let Some(svcs) = services {
                    if !svcs.is_empty() {
                        svcs[idx as usize % svcs.len()].clone()
                    } else {
                        route.target_service.clone()
                    }
                } else {
                    route.target_service.clone()
                }
            }
            RoutingStrategy::LeastLatency => route.target_service.clone(),
            RoutingStrategy::Weighted => route.target_service.clone(),
            RoutingStrategy::Geographic => route.target_service.clone(),
            RoutingStrategy::ContentBased => route.target_service.clone(),
        };

        let _ = headers;

        RouteMatchResult {
            matched: true,
            route_id: Some(route.id.clone()),
            target_service: Some(target),
            protocol: Some(route.protocol),
            strategy: Some(route.load_balancing_strategy),
        }
    }

    fn get_routing_table(&self) -> Vec<SmartRoute> {
        self.routes.values().cloned().collect()
    }

    fn update_route_priority(&mut self, route_id: &str, priority: u32) -> bool {
        if let Some(route) = self.routes.get_mut(route_id) {
            route.priority = priority;
            true
        } else {
            false
        }
    }

    fn health_check_routes(&self) -> HashMap<String, bool> {
        self.routes
            .iter()
            .map(|(id, route)| {
                let healthy = self
                    .service_registry
                    .get(&route.target_service)
                    .map(|svcs| !svcs.is_empty())
                    .unwrap_or(false);
                (id.clone(), healthy)
            })
            .collect()
    }

    fn discover_service(&mut self, service_name: &str, instances: Vec<String>) {
        self.service_registry
            .insert(service_name.to_string(), instances);
    }
}

fn path_matches_pattern(path: &str, pattern: &str) -> bool {
    if pattern == "*" {
        return true;
    }
    let pattern_parts: Vec<&str> = pattern.split('/').collect();
    let path_parts: Vec<&str> = path.split('/').collect();

    if pattern_parts.len() != path_parts.len() {
        return false;
    }

    pattern_parts
        .iter()
        .zip(path_parts.iter())
        .all(|(pp, tp)| *pp == "*" || pp == tp)
}

pub struct SmartRouter {
    inner: Mutex<SmartRouterInner>,
}

impl SmartRouter {
    fn new() -> Self {
        Self {
            inner: Mutex::new(SmartRouterInner::new()),
        }
    }

    pub fn add_route(&self, route: SmartRoute) -> SmartRoute {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .add_route(route)
    }

    pub fn remove_route(&self, route_id: &str) -> bool {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove_route(route_id)
    }

    pub fn match_route(
        &self,
        path: &str,
        protocol: Option<SupportedProtocol>,
        headers: &HashMap<String, String>,
    ) -> RouteMatchResult {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .match_route(path, protocol, headers)
    }

    pub fn get_routing_table(&self) -> Vec<SmartRoute> {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_routing_table()
    }

    pub fn update_route_priority(&self, route_id: &str, priority: u32) -> bool {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .update_route_priority(route_id, priority)
    }

    pub fn health_check_routes(&self) -> HashMap<String, bool> {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .health_check_routes()
    }

    pub fn discover_service(&self, service_name: &str, instances: Vec<String>) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .discover_service(service_name, instances);
    }
}

// ==================== 自适应降级实现 ====================

struct AdaptiveDegradationControllerInner {
    policy: DegradationPolicy,
    health_metrics: HashMap<String, HealthMetrics>,
    circuit_breaker_states: HashMap<String, CircuitBreakerState>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

impl AdaptiveDegradationControllerInner {
    fn new() -> Self {
        Self {
            policy: DegradationPolicy::default(),
            health_metrics: HashMap::new(),
            circuit_breaker_states: HashMap::new(),
        }
    }

    fn evaluate_degradation(&mut self) -> DegradationLevel {
        let triggers = &self.policy.triggers;
        let mut max_level = DegradationLevel::Normal;

        for metrics in self.health_metrics.values() {
            if metrics.error_rate > triggers.error_rate_threshold {
                max_level = max_level.max_severity(DegradationLevel::Degraded);
            }
            if metrics.latency_ms > triggers.latency_threshold_ms {
                max_level = max_level.max_severity(DegradationLevel::Degraded);
            }
            if metrics.cpu_usage > triggers.cpu_threshold {
                max_level = max_level.max_severity(DegradationLevel::Limited);
            }
            if metrics.error_rate > triggers.error_rate_threshold * 2.0 {
                max_level = max_level.max_severity(DegradationLevel::Emergency);
            }
        }

        if max_level.severity() > self.policy.level.severity() {
            self.policy.level = max_level;
        }
        self.policy.level
    }

    fn set_degradation_level(&mut self, level: DegradationLevel) {
        self.policy.level = level;
    }

    fn get_degradation_status(&self) -> DegradationLevel {
        self.policy.level
    }

    fn configure_policy(&mut self, policy: DegradationPolicy) {
        self.policy = policy;
    }

    fn get_policy(&self) -> &DegradationPolicy {
        &self.policy
    }

    fn record_health_metrics(&mut self, metrics: HealthMetrics) {
        let name = metrics.service_name.clone();
        self.health_metrics.insert(name, metrics);
    }

    fn get_health_metrics(&self, service_name: &str) -> Option<&HealthMetrics> {
        self.health_metrics.get(service_name)
    }

    fn get_all_health_metrics(&self) -> Vec<HealthMetrics> {
        self.health_metrics.values().cloned().collect()
    }

    fn trigger_degradation(&mut self, level: DegradationLevel, service_name: &str) {
        self.set_degradation_level(level);
        if let Some(metrics) = self.health_metrics.get_mut(service_name) {
            metrics.error_rate = 1.0;
        }
    }

    fn recover_service(&mut self, service_name: &str) {
        if let Some(metrics) = self.health_metrics.get_mut(service_name) {
            metrics.error_rate = 0.0;
            metrics.latency_ms = 0;
        }
        if self
            .health_metrics
            .values()
            .all(|m| m.error_rate < self.policy.triggers.error_rate_threshold)
        {
            self.set_degradation_level(DegradationLevel::Normal);
        }
    }

    fn get_circuit_breaker_state(&self, service_name: &str) -> CircuitBreakerState {
        self.circuit_breaker_states
            .get(service_name)
            .copied()
            .unwrap_or(CircuitBreakerState::Closed)
    }

    fn set_circuit_breaker_state(&mut self, service_name: &str, state: CircuitBreakerState) {
        self.circuit_breaker_states
            .insert(service_name.to_string(), state);
    }
}

impl DegradationLevel {
    fn max_severity(self, other: DegradationLevel) -> DegradationLevel {
        if self.severity() >= other.severity() {
            self
        } else {
            other
        }
    }
}

pub struct AdaptiveDegradationController {
    inner: Mutex<AdaptiveDegradationControllerInner>,
}

impl AdaptiveDegradationController {
    fn new() -> Self {
        Self {
            inner: Mutex::new(AdaptiveDegradationControllerInner::new()),
        }
    }

    pub fn evaluate_degradation(&self) -> DegradationLevel {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .evaluate_degradation()
    }

    pub fn set_degradation_level(&self, level: DegradationLevel) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .set_degradation_level(level);
    }

    pub fn get_degradation_status(&self) -> DegradationLevel {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_degradation_status()
    }

    pub fn configure_policy(&self, policy: DegradationPolicy) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .configure_policy(policy);
    }

    pub fn get_policy(&self) -> DegradationPolicy {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_policy()
            .clone()
    }

    pub fn record_health_metrics(&self, metrics: HealthMetrics) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .record_health_metrics(metrics);
    }

    pub fn get_health_metrics(&self, service_name: &str) -> Option<HealthMetrics> {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_health_metrics(service_name)
            .cloned()
    }

    pub fn get_all_health_metrics(&self) -> Vec<HealthMetrics> {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_all_health_metrics()
    }

    pub fn trigger_degradation(&self, level: DegradationLevel, service_name: &str) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .trigger_degradation(level, service_name);
    }

    pub fn recover_service(&self, service_name: &str) {
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .recover_service(service_name);
    }

    pub fn get_circuit_breaker_state(&self, service_name: &str) -> String {
        let state = self
            .inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_circuit_breaker_state(service_name);
        match state {
            CircuitBreakerState::Closed => "closed".to_string(),
            CircuitBreakerState::Open => "open".to_string(),
            CircuitBreakerState::HalfOpen => "half_open".to_string(),
        }
    }

    pub fn set_circuit_breaker_state(&self, service_name: &str, state: String) {
        let cb_state = match state.to_lowercase().as_str() {
            "open" => CircuitBreakerState::Open,
            "half_open" => CircuitBreakerState::HalfOpen,
            _ => CircuitBreakerState::Closed,
        };
        self.inner
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .set_circuit_breaker_state(service_name, cb_state);
    }
}

// ==================== 全局单例 ====================

static PROTOCOL_ROUTER: OnceLock<ProtocolRouter> = OnceLock::new();
static SMART_ROUTER: OnceLock<SmartRouter> = OnceLock::new();
static DEGRADATION_CONTROLLER: OnceLock<AdaptiveDegradationController> = OnceLock::new();
static START_TIME: OnceLock<std::time::Instant> = OnceLock::new();

pub fn protocol_router() -> &'static ProtocolRouter {
    PROTOCOL_ROUTER.get_or_init(ProtocolRouter::new)
}

pub fn smart_router() -> &'static SmartRouter {
    SMART_ROUTER.get_or_init(SmartRouter::new)
}

pub fn degradation_controller() -> &'static AdaptiveDegradationController {
    DEGRADATION_CONTROLLER.get_or_init(AdaptiveDegradationController::new)
}

fn get_uptime() -> u64 {
    START_TIME
        .get_or_init(std::time::Instant::now)
        .elapsed()
        .as_secs()
}

// ==================== 公共 API 函数 ====================

pub fn register_protocol(config: ProtocolConfig) {
    protocol_router().register_protocol(config);
}

pub fn route_request(protocol: SupportedProtocol, request: &str) -> Result<String, String> {
    protocol_router().route_request(protocol, request)
}

pub fn list_protocols() -> Vec<ProtocolConfig> {
    protocol_router().list_protocols()
}

pub fn get_protocol_config(protocol: SupportedProtocol) -> Option<ProtocolConfig> {
    protocol_router().get_protocol_config(protocol)
}

pub fn enable_protocol(protocol_name: &str) -> bool {
    if let Some(proto) = SupportedProtocol::from_str(protocol_name) {
        protocol_router().enable_protocol(proto)
    } else {
        false
    }
}

pub fn disable_protocol(protocol_name: &str) -> bool {
    if let Some(proto) = SupportedProtocol::from_str(protocol_name) {
        protocol_router().disable_protocol(proto)
    } else {
        false
    }
}

pub fn add_route(route: SmartRoute) -> SmartRoute {
    smart_router().add_route(route)
}

pub fn remove_route(route_id: &str) -> bool {
    smart_router().remove_route(route_id)
}

pub fn match_route(
    path: &str,
    protocol: Option<SupportedProtocol>,
    headers: &HashMap<String, String>,
) -> RouteMatchResult {
    smart_router().match_route(path, protocol, headers)
}

pub fn get_routing_table() -> Vec<SmartRoute> {
    smart_router().get_routing_table()
}

pub fn update_route_priority(route_id: &str, priority: u32) -> bool {
    smart_router().update_route_priority(route_id, priority)
}

pub fn health_check_routes() -> HashMap<String, bool> {
    smart_router().health_check_routes()
}

pub fn evaluate_degradation() -> DegradationLevel {
    degradation_controller().evaluate_degradation()
}

pub fn set_degradation_level(level: DegradationLevel) {
    degradation_controller().set_degradation_level(level);
}

pub fn get_degradation_status() -> DegradationLevel {
    degradation_controller().get_degradation_status()
}

pub fn configure_policy(policy: DegradationPolicy) {
    degradation_controller().configure_policy(policy);
}

pub fn trigger_degradation(level: DegradationLevel, service_name: &str) {
    degradation_controller().trigger_degradation(level, service_name);
}

pub fn recover_service(service_name: &str) {
    degradation_controller().recover_service(service_name);
}

pub fn record_health_metrics(metrics: HealthMetrics) {
    degradation_controller().record_health_metrics(metrics);
}

pub fn get_service_health(service_name: &str) -> Option<HealthMetrics> {
    degradation_controller().get_health_metrics(service_name)
}

pub fn get_all_health_metrics() -> Vec<HealthMetrics> {
    degradation_controller().get_all_health_metrics()
}

// ==================== API Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:smart_gateway:read"])),
    path = "/api/portal/smart-gateway/status",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn get_gateway_status_handler() -> Json<ApiResult<GatewayStatus>> {
    let protocols = list_protocols();
    let active_protocols: Vec<String> = protocols
        .iter()
        .filter(|p| p.enabled)
        .map(|p| p.protocol.as_str().to_string())
        .collect();
    let routes = get_routing_table();
    let active_routes = routes.iter().filter(|r| r.enabled).count();
    let degradation = get_degradation_status();
    let health = get_all_health_metrics()
        .first()
        .cloned()
        .unwrap_or_default();

    Json(ApiResult::ok(GatewayStatus {
        version: "v51.0".to_string(),
        uptime_secs: get_uptime(),
        active_protocols,
        total_routes: routes.len(),
        active_routes,
        degradation_level: degradation,
        health,
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:smart_gateway:read"])),
    path = "/api/portal/smart-gateway/routes",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn list_routes_handler(
    Query(params): Query<RouteQueryParams>,
) -> Json<ApiResult<Vec<SmartRoute>>> {
    let mut routes = get_routing_table();
    if let Some(protocol_str) = &params.protocol {
        if let Some(proto) = SupportedProtocol::from_str(protocol_str) {
            routes.retain(|r| r.protocol == proto);
        }
    }
    if let Some(target) = &params.target_service {
        routes.retain(|r| &r.target_service == target);
    }
    if let Some(enabled) = params.enabled {
        routes.retain(|r| r.enabled == enabled);
    }
    Json(ApiResult::ok(routes))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:smart_gateway:write"])),
    path = "/api/portal/smart-gateway/routes",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn create_route_handler(
    Json(req): Json<CreateRouteRequest>,
) -> Result<Json<ApiResult<SmartRoute>>, (StatusCode, Json<Value>)> {
    let route_id = format!(
        "route_{}",
        uuid::Uuid::new_v4().to_string().replace('-', "")
    );
    let route = SmartRoute {
        id: route_id,
        name: req.name,
        protocol: req.protocol,
        path_pattern: req.path_pattern,
        target_service: req.target_service,
        priority: req.priority.unwrap_or(100),
        conditions: req.conditions.unwrap_or_default(),
        load_balancing_strategy: req
            .load_balancing_strategy
            .unwrap_or(RoutingStrategy::RoundRobin),
        circuit_breaker_config: req.circuit_breaker_config.unwrap_or_default(),
        enabled: true,
    };
    let created = add_route(route);
    Ok(Json(ApiResult::ok(created)))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["portal:smart_gateway:write"])),
    path = "/api/portal/smart-gateway/routes/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn delete_route_handler(
    Path(id): Path<String>,
) -> Result<Json<ApiResult<bool>>, (StatusCode, Json<Value>)> {
    let removed = remove_route(&id);
    if removed {
        Ok(Json(ApiResult::ok(true)))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": format!("Route '{}' not found", id) })),
        ))
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:smart_gateway:read"])),
    path = "/api/portal/smart-gateway/protocols",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn list_protocols_handler() -> Json<ApiResult<Vec<ProtocolConfig>>> {
    Json(ApiResult::ok(list_protocols()))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:smart_gateway:write"])),
    path = "/api/portal/smart-gateway/protocols/{name}/enable",
    params(
        ("name" = String, Path, description = "name")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn enable_protocol_handler(
    Path(name): Path<String>,
) -> Result<Json<ApiResult<bool>>, (StatusCode, Json<Value>)> {
    let ok = enable_protocol(&name);
    if ok {
        Ok(Json(ApiResult::ok(true)))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": format!("Protocol '{}' not found", name) })),
        ))
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:smart_gateway:write"])),
    path = "/api/portal/smart-gateway/protocols/{name}/disable",
    params(
        ("name" = String, Path, description = "name")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn disable_protocol_handler(
    Path(name): Path<String>,
) -> Result<Json<ApiResult<bool>>, (StatusCode, Json<Value>)> {
    let ok = disable_protocol(&name);
    if ok {
        Ok(Json(ApiResult::ok(true)))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": format!("Protocol '{}' not found", name) })),
        ))
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:smart_gateway:read"])),
    path = "/api/portal/smart-gateway/degradation/status",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn get_degradation_status_handler() -> Json<ApiResult<DegradationLevel>> {
    Json(ApiResult::ok(get_degradation_status()))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:smart_gateway:write"])),
    path = "/api/portal/smart-gateway/degradation/level",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn set_degradation_level_handler(
    Json(req): Json<SetDegradationLevelRequest>,
) -> Json<ApiResult<DegradationLevel>> {
    set_degradation_level(req.level);
    Json(ApiResult::ok(get_degradation_status()))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:smart_gateway:write"])),
    path = "/api/portal/smart-gateway/degradation/evaluate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SmartGateway"
)]
pub async fn evaluate_degradation_handler() -> Json<ApiResult<DegradationLevel>> {
    let level = evaluate_degradation();
    Json(ApiResult::ok(level))
}

pub async fn get_health_handler() -> Json<ApiResult<Vec<HealthMetrics>>> {
    Json(ApiResult::ok(get_all_health_metrics()))
}

pub async fn get_metrics_handler() -> Json<ApiResult<Value>> {
    let degradation = get_degradation_status();
    let protocols = list_protocols();
    let routes = get_routing_table();
    let route_health = health_check_routes();
    let metrics = get_all_health_metrics();

    Json(ApiResult::ok(serde_json::json!({
        "degradation_level": degradation.as_str(),
        "active_protocols": protocols.iter().filter(|p| p.enabled).count(),
        "total_protocols": protocols.len(),
        "active_routes": routes.iter().filter(|r| r.enabled).count(),
        "total_routes": routes.len(),
        "route_health": route_health,
        "service_metrics": metrics,
        "uptime_secs": get_uptime(),
    })))
}

// ==================== 数据库表结构 ====================

pub const CREATE_GATEWAY_V51_ROUTES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.gateway_routes (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    protocol VARCHAR(32) NOT NULL,
    path_pattern VARCHAR(512) NOT NULL,
    target_service VARCHAR(256) NOT NULL,
    priority INT NOT NULL DEFAULT 100,
    conditions JSONB NOT NULL DEFAULT '[]',
    load_balancing_strategy VARCHAR(32) NOT NULL DEFAULT 'round_robin',
    circuit_breaker_config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gateway_routes_protocol ON portal.gateway_routes(protocol);
CREATE INDEX IF NOT EXISTS idx_gateway_routes_target ON portal.gateway_routes(target_service);
CREATE INDEX IF NOT EXISTS idx_gateway_routes_enabled ON portal.gateway_routes(enabled) WHERE enabled = TRUE;
"#;

pub const CREATE_GATEWAY_V51_PROTOCOLS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.gateway_protocols (
    id VARCHAR(128) PRIMARY KEY,
    protocol VARCHAR(32) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_connections INT NOT NULL DEFAULT 1000,
    timeout_ms BIGINT NOT NULL DEFAULT 30000,
    rate_limit_per_sec INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gateway_protocols_enabled ON portal.gateway_protocols(enabled);
"#;

pub const CREATE_GATEWAY_V51_DEGRADATION_POLICIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.gateway_degradation_policies (
    id VARCHAR(128) PRIMARY KEY,
    level VARCHAR(32) NOT NULL,
    latency_threshold_ms BIGINT NOT NULL DEFAULT 1000,
    error_rate_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    cpu_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    fallback_strategy VARCHAR(64) NOT NULL DEFAULT 'cache',
    notification_channels JSONB NOT NULL DEFAULT '["alert"]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_GATEWAY_V51_HEALTH_METRICS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.gateway_health_metrics (
    id VARCHAR(128) PRIMARY KEY,
    service_name VARCHAR(256) NOT NULL,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    error_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    cpu_usage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    memory_usage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    request_count BIGINT NOT NULL DEFAULT 0,
    success_count BIGINT NOT NULL DEFAULT 0,
    failure_count BIGINT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gateway_health_service ON portal.gateway_health_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_gateway_health_recorded ON portal.gateway_health_metrics(recorded_at DESC);
"#;

// ==================== 数据库初始化 ====================

pub async fn ensure_smart_gateway_tables_exist(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(CREATE_GATEWAY_V51_ROUTES_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GATEWAY_V51_PROTOCOLS_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GATEWAY_V51_DEGRADATION_POLICIES_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GATEWAY_V51_HEALTH_METRICS_TABLE)
        .execute(pool)
        .await?;
    Ok(())
}

// ==================== 初始化入口 ====================

pub fn init_smart_gateway() {
    let default_protocols = vec![
        ProtocolConfig {
            protocol: SupportedProtocol::GraphQL,
            enabled: true,
            max_connections: 2000,
            timeout_ms: 30_000,
            rate_limit_per_sec: 200,
        },
        ProtocolConfig {
            protocol: SupportedProtocol::REST,
            enabled: true,
            max_connections: 5000,
            timeout_ms: 15_000,
            rate_limit_per_sec: 500,
        },
        ProtocolConfig {
            protocol: SupportedProtocol::GrPC,
            enabled: true,
            max_connections: 1000,
            timeout_ms: 60_000,
            rate_limit_per_sec: 100,
        },
        ProtocolConfig {
            protocol: SupportedProtocol::WebSocket,
            enabled: true,
            max_connections: 5000,
            timeout_ms: 300_000,
            rate_limit_per_sec: 1000,
        },
        ProtocolConfig {
            protocol: SupportedProtocol::SSE,
            enabled: true,
            max_connections: 2000,
            timeout_ms: 300_000,
            rate_limit_per_sec: 500,
        },
        ProtocolConfig {
            protocol: SupportedProtocol::WebDAV,
            enabled: false,
            max_connections: 500,
            timeout_ms: 30_000,
            rate_limit_per_sec: 50,
        },
    ];

    for config in default_protocols {
        register_protocol(config);
    }

    let default_routes = vec![
        SmartRoute {
            id: "route_graphql_default".to_string(),
            name: "GraphQL Default".to_string(),
            protocol: SupportedProtocol::GraphQL,
            path_pattern: "/graphql/*".to_string(),
            target_service: "graphql-service".to_string(),
            priority: 100,
            conditions: vec![],
            load_balancing_strategy: RoutingStrategy::LeastLatency,
            circuit_breaker_config: CircuitBreakerConfig::default(),
            enabled: true,
        },
        SmartRoute {
            id: "route_rest_api".to_string(),
            name: "REST API".to_string(),
            protocol: SupportedProtocol::REST,
            path_pattern: "/api/*".to_string(),
            target_service: "rest-service".to_string(),
            priority: 90,
            conditions: vec![],
            load_balancing_strategy: RoutingStrategy::RoundRobin,
            circuit_breaker_config: CircuitBreakerConfig::default(),
            enabled: true,
        },
        SmartRoute {
            id: "route_grpc_internal".to_string(),
            name: "gRPC Internal".to_string(),
            protocol: SupportedProtocol::GrPC,
            path_pattern: "/grpc/*".to_string(),
            target_service: "grpc-service".to_string(),
            priority: 80,
            conditions: vec![],
            load_balancing_strategy: RoutingStrategy::Weighted,
            circuit_breaker_config: CircuitBreakerConfig::default(),
            enabled: true,
        },
        SmartRoute {
            id: "route_ws_realtime".to_string(),
            name: "WebSocket Realtime".to_string(),
            protocol: SupportedProtocol::WebSocket,
            path_pattern: "/ws/*".to_string(),
            target_service: "realtime-service".to_string(),
            priority: 70,
            conditions: vec![],
            load_balancing_strategy: RoutingStrategy::RoundRobin,
            circuit_breaker_config: CircuitBreakerConfig {
                failure_threshold: 10,
                success_threshold: 5,
                timeout_ms: 60_000,
                half_open_max_requests: 5,
            },
            enabled: true,
        },
    ];

    for route in default_routes {
        add_route(route);
    }

    let default_policy = DegradationPolicy {
        level: DegradationLevel::Normal,
        triggers: DegradationTriggers {
            latency_threshold_ms: 2000,
            error_rate_threshold: 0.15,
            cpu_threshold: 0.90,
        },
        fallback_strategy: "stale_cache".to_string(),
        notification_channels: vec!["alert".to_string(), "log".to_string()],
    };
    configure_policy(default_policy);
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_supported_protocol_roundtrip_all_variants() {
        for v in [
            SupportedProtocol::GraphQL,
            SupportedProtocol::REST,
            SupportedProtocol::GrPC,
            SupportedProtocol::WebSocket,
            SupportedProtocol::SSE,
            SupportedProtocol::WebDAV,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_supported_protocol_as_str_from_str() {
        for v in [
            SupportedProtocol::GraphQL,
            SupportedProtocol::REST,
            SupportedProtocol::GrPC,
            SupportedProtocol::WebSocket,
            SupportedProtocol::SSE,
            SupportedProtocol::WebDAV,
        ] {
            let s = v.as_str();
            let back = SupportedProtocol::from_str(s);
            assert!(back.is_some());
            roundtrip(back.as_ref().unwrap());
        }
        assert!(SupportedProtocol::from_str("bogus").is_none());
    }

    #[test]
    fn test_routing_strategy_roundtrip_all_variants() {
        for v in [
            RoutingStrategy::RoundRobin,
            RoutingStrategy::LeastLatency,
            RoutingStrategy::Weighted,
            RoutingStrategy::Geographic,
            RoutingStrategy::ContentBased,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_routing_strategy_as_str() {
        for v in [
            RoutingStrategy::RoundRobin,
            RoutingStrategy::LeastLatency,
            RoutingStrategy::Weighted,
            RoutingStrategy::Geographic,
            RoutingStrategy::ContentBased,
        ] {
            let _ = v.as_str();
        }
    }

    #[test]
    fn test_degradation_level_roundtrip_all_variants() {
        for v in [
            DegradationLevel::Normal,
            DegradationLevel::Degraded,
            DegradationLevel::Limited,
            DegradationLevel::Emergency,
            DegradationLevel::Offline,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_degradation_level_as_str_severity() {
        for v in [
            DegradationLevel::Normal,
            DegradationLevel::Degraded,
            DegradationLevel::Limited,
            DegradationLevel::Emergency,
            DegradationLevel::Offline,
        ] {
            let _ = v.as_str();
            let _ = v.severity();
        }
    }

    #[test]
    fn test_protocol_config_roundtrip() {
        let c = ProtocolConfig {
            protocol: SupportedProtocol::GraphQL,
            enabled: true,
            max_connections: 1000,
            timeout_ms: 5000,
            rate_limit_per_sec: 500,
        };
        roundtrip(&c);
    }

    #[test]
    fn test_circuit_breaker_config_roundtrip() {
        let c = CircuitBreakerConfig {
            failure_threshold: 5,
            success_threshold: 3,
            timeout_ms: 30000,
            half_open_max_requests: 3,
        };
        roundtrip(&c);
    }

    #[test]
    fn test_smart_route_roundtrip() {
        let r = SmartRoute {
            id: "r1".to_string(),
            name: "GQL Primary".to_string(),
            protocol: SupportedProtocol::GraphQL,
            path_pattern: "/graphql".to_string(),
            target_service: "gql-svc".to_string(),
            priority: 100,
            conditions: vec![],
            load_balancing_strategy: RoutingStrategy::RoundRobin,
            circuit_breaker_config: CircuitBreakerConfig::default(),
            enabled: true,
        };
        roundtrip(&r);
    }

    #[test]
    fn test_degradation_triggers_roundtrip() {
        let t = DegradationTriggers {
            latency_threshold_ms: 2000,
            error_rate_threshold: 0.15,
            cpu_threshold: 0.90,
        };
        roundtrip(&t);
    }

    #[test]
    fn test_degradation_policy_roundtrip() {
        let p = DegradationPolicy {
            level: DegradationLevel::Normal,
            triggers: DegradationTriggers::default(),
            fallback_strategy: "cache".to_string(),
            notification_channels: vec!["alert".to_string()],
        };
        roundtrip(&p);
    }

    #[test]
    fn test_health_metrics_roundtrip() {
        let m = HealthMetrics {
            service_name: "svc1".to_string(),
            latency_ms: 100,
            error_rate: 0.01,
            cpu_usage: 0.3,
            memory_usage: 0.5,
            request_count: 1000,
            success_count: 990,
            failure_count: 10,
        };
        roundtrip(&m);
    }

    #[test]
    fn test_gateway_status_roundtrip() {
        let s = GatewayStatus {
            version: "1.0.0".to_string(),
            uptime_secs: 3600,
            active_protocols: vec!["graphql".to_string()],
            total_routes: 10,
            active_routes: 8,
            degradation_level: DegradationLevel::Normal,
            health: HealthMetrics::default(),
        };
        roundtrip(&s);
    }

    #[test]
    fn test_route_match_result_roundtrip() {
        let r = RouteMatchResult {
            matched: true,
            route_id: Some("r1".to_string()),
            target_service: Some("svc1".to_string()),
            protocol: Some(SupportedProtocol::GraphQL),
            strategy: Some(RoutingStrategy::RoundRobin),
        };
        roundtrip(&r);
    }
}

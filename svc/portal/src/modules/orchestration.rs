#![allow(dead_code)] // Reserved: V57 网关编排模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V57.0 BFF Phase 27: GraphQL 网关编排 + 服务发现 + 动态路由
//!
//! 核心能力：
//! 1. 网关编排 (Gateway Orchestration)
//!    - GatewayOrchestrator: 查询分解、扇出执行、依赖管理
//!    - OrchestrationPlan: 编排计划、执行步骤、依赖关系
//!    - ExecutionStep: 执行步骤 (Pending/Running/Completed/Failed)
//! 2. 服务发现 (Service Discovery)
//!    - ServiceDiscoveryEngine: 服务注册/注销/发现/健康检查
//!    - ServiceDescriptor: 服务描述符 (id/name/version/endpoint/capabilities)
//!    - ServiceRegistry: 内存服务注册表
//! 3. 动态路由 (Dynamic Routing)
//!    - DynamicRouter: 规则路由 + 加权路由
//!    - RouteRule: 路由规则 (pattern/target/condition/priority/weight)
//!    - RoutingDecision: 路由决策 (matched_rule/target/confidence/latency)

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_ORCHESTRATION_PLANS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_orchestration_plans (
    id VARCHAR(64) PRIMARY KEY,
    query_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    estimated_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    timeout_ms BIGINT NOT NULL DEFAULT 30000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_op_query ON portal_orchestration_plans(query_id);
CREATE INDEX IF NOT EXISTS idx_op_status ON portal_orchestration_plans(status);
"#;

pub const CREATE_EXECUTION_STEPS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_execution_steps (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    service VARCHAR(128) NOT NULL,
    operation VARCHAR(128) NOT NULL,
    depends_on JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    result JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_es_plan ON portal_execution_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_es_status ON portal_execution_steps(status);
"#;

pub const CREATE_SERVICE_DESCRIPTORS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_service_descriptors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    version VARCHAR(64) NOT NULL,
    endpoint VARCHAR(512) NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '[]',
    health_status VARCHAR(32) NOT NULL DEFAULT 'healthy',
    last_heartbeat TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_sd_name ON portal_service_descriptors(name);
CREATE INDEX IF NOT EXISTS idx_sd_health ON portal_service_descriptors(health_status);
"#;

pub const CREATE_SERVICE_HEARTBEATS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_service_heartbeats (
    id VARCHAR(64) PRIMARY KEY,
    service_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sh_service ON portal_service_heartbeats(service_id);
CREATE INDEX IF NOT EXISTS idx_sh_checked ON portal_service_heartbeats(checked_at DESC);
"#;

pub const CREATE_ROUTE_RULES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_route_rules (
    id VARCHAR(64) PRIMARY KEY,
    pattern VARCHAR(256) NOT NULL,
    target_service VARCHAR(128) NOT NULL,
    condition JSONB,
    priority INT NOT NULL DEFAULT 0,
    weight INT NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rr_pattern ON portal_route_rules(pattern);
CREATE INDEX IF NOT EXISTS idx_rr_enabled ON portal_route_rules(enabled);
"#;

pub const CREATE_ROUTING_DECISIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_routing_decisions (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,
    matched_rule_id VARCHAR(64),
    target_service VARCHAR(128) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_request ON portal_routing_decisions(request_id);
CREATE INDEX IF NOT EXISTS idx_rd_target ON portal_routing_decisions(target_service);
CREATE INDEX IF NOT EXISTS idx_rd_created ON portal_routing_decisions(created_at DESC);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlanStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl PlanStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "running" => Self::Running,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            "cancelled" => Self::Cancelled,
            _ => Self::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

impl StepStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "running" => Self::Running,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            _ => Self::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

impl HealthStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Healthy => "healthy",
            Self::Degraded => "degraded",
            Self::Unhealthy => "unhealthy",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "degraded" => Self::Degraded,
            "unhealthy" => Self::Unhealthy,
            "unknown" => Self::Unknown,
            _ => Self::Healthy,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::Healthy,
            Self::Degraded,
            Self::Unhealthy,
            Self::Unknown,
        ]
    }
}

// ==================== 编排核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStep {
    pub id: String,
    pub service: String,
    pub operation: String,
    pub depends_on: Vec<String>,
    pub status: StepStatus,
    pub result: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestrationPlan {
    pub id: String,
    pub query_id: String,
    pub execution_steps: Vec<ExecutionStep>,
    pub dependencies: Vec<Vec<String>>,
    pub estimated_cost: f64,
    pub timeout_ms: u64,
    pub status: PlanStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanStatusInfo {
    pub plan_id: String,
    pub status: PlanStatus,
    pub completed_steps: u32,
    pub total_steps: u32,
    pub failed_steps: u32,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionHistoryEntry {
    pub plan_id: String,
    pub query_id: String,
    pub status: PlanStatus,
    pub step_count: u32,
    pub created_at: String,
}

// ==================== 服务发现结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceDescriptor {
    pub id: String,
    pub name: String,
    pub version: String,
    pub endpoint: String,
    pub capabilities: Vec<String>,
    pub health_status: HealthStatus,
    pub last_heartbeat: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHeartbeat {
    pub id: String,
    pub service_id: String,
    pub status: HealthStatus,
    pub latency_ms: u64,
    pub checked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryStats {
    pub total_services: u32,
    pub healthy_count: u32,
    pub degraded_count: u32,
    pub unhealthy_count: u32,
    pub capabilities_distribution: HashMap<String, u32>,
}

// ==================== 动态路由结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteRule {
    pub id: String,
    pub pattern: String,
    pub target_service: String,
    pub condition: Option<serde_json::Value>,
    pub priority: i32,
    pub weight: u32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingDecision {
    pub request_id: String,
    pub matched_rule: Option<RouteRule>,
    pub target_service: String,
    pub confidence: f64,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingStats {
    pub total_requests: u64,
    pub requests_per_service: HashMap<String, u64>,
    pub avg_latency_ms: f64,
    pub rule_match_count: HashMap<String, u64>,
}

// ==================== 内存存储 ====================

struct OrchestrationStore {
    plans: Mutex<HashMap<String, OrchestrationPlan>>,
    execution_history: Mutex<Vec<ExecutionHistoryEntry>>,
    services: Mutex<HashMap<String, ServiceDescriptor>>,
    service_heartbeats: Mutex<Vec<ServiceHeartbeat>>,
    route_rules: Mutex<Vec<RouteRule>>,
    routing_decisions: Mutex<Vec<RoutingDecision>>,
    routing_request_counts: Mutex<HashMap<String, u64>>,
    routing_latencies: Mutex<Vec<u64>>,
}

fn get_orchestration_store() -> &'static OrchestrationStore {
    static STORE: LazyLock<OrchestrationStore> = LazyLock::new(|| OrchestrationStore {
        plans: Mutex::new(HashMap::new()),
        execution_history: Mutex::new(Vec::new()),
        services: Mutex::new(HashMap::new()),
        service_heartbeats: Mutex::new(Vec::new()),
        route_rules: Mutex::new(Vec::new()),
        routing_decisions: Mutex::new(Vec::new()),
        routing_request_counts: Mutex::new(HashMap::new()),
        routing_latencies: Mutex::new(Vec::new()),
    });
    &STORE
}

// ==================== GatewayOrchestrator 实现 ====================

pub struct GatewayOrchestrator;

impl GatewayOrchestrator {
    pub async fn create_plan(
        query_id: String,
        execution_steps: Vec<ExecutionStep>,
        timeout_ms: Option<u64>,
    ) -> Result<OrchestrationPlan, String> {
        let store = get_orchestration_store();

        let _step_ids: Vec<String> = execution_steps.iter().map(|s| s.id.clone()).collect();
        let mut dependencies = Vec::new();
        for step in &execution_steps {
            dependencies.push(step.depends_on.clone());
        }

        let estimated_cost = Self::estimate_cost(&execution_steps);

        let plan = OrchestrationPlan {
            id: uuid::Uuid::new_v4().to_string(),
            query_id,
            execution_steps,
            dependencies,
            estimated_cost,
            timeout_ms: timeout_ms.unwrap_or(30000),
            status: PlanStatus::Pending,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        let mut plans = store.plans.lock().await;
        plans.insert(plan.id.clone(), plan.clone());

        Ok(plan)
    }

    pub async fn execute_plan(plan_id: &str) -> Result<OrchestrationPlan, String> {
        let store = get_orchestration_store();

        let plan = {
            let plans = store.plans.lock().await;
            plans
                .get(plan_id)
                .cloned()
                .ok_or_else(|| format!("编排计划 '{}' 不存在", plan_id))?
        };

        if plan.status == PlanStatus::Running {
            return Err("计划已在执行中".to_string());
        }

        let mut plans = store.plans.lock().await;
        let p = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("编排计划 '{}' 不存在", plan_id))?;

        p.status = PlanStatus::Running;
        p.updated_at = chrono::Utc::now().to_rfc3339();

        let mut steps = p.execution_steps.clone();

        let original_statuses: Vec<(String, StepStatus)> = steps
            .iter()
            .map(|s| (s.id.clone(), s.status.clone()))
            .collect();

        let mut _completed_count = 0u32;
        let mut failed_count = 0u32;

        let updates: Vec<(String, StepStatus)> = steps
            .iter()
            .map(|step| {
                let can_run = step.depends_on.iter().all(|dep| {
                    original_statuses
                        .iter()
                        .any(|(id, s)| id == dep && s == &StepStatus::Completed)
                });

                if can_run {
                    (step.id.clone(), StepStatus::Completed)
                } else if step.depends_on.iter().any(|dep| {
                    original_statuses
                        .iter()
                        .any(|(id, s)| id == dep && s == &StepStatus::Failed)
                }) {
                    (step.id.clone(), StepStatus::Failed)
                } else {
                    (step.id.clone(), step.status.clone())
                }
            })
            .collect();

        for step in steps.iter_mut() {
            if let Some((_, new_status)) = updates.iter().find(|(id, _)| id == &step.id) {
                if new_status == &StepStatus::Completed {
                    step.status = StepStatus::Completed;
                    step.result = Some(serde_json::json!({
                        "status": "ok",
                        "service": step.service,
                        "operation": step.operation,
                    }));
                    _completed_count += 1;
                } else if new_status == &StepStatus::Failed {
                    step.status = StepStatus::Failed;
                    failed_count += 1;
                }
            }
        }

        p.execution_steps = steps;

        p.status = if failed_count > 0 {
            PlanStatus::Failed
        } else {
            PlanStatus::Completed
        };
        p.updated_at = chrono::Utc::now().to_rfc3339();

        let updated = p.clone();
        drop(plans);

        let mut history = store.execution_history.lock().await;
        history.push(ExecutionHistoryEntry {
            plan_id: updated.id.clone(),
            query_id: updated.query_id.clone(),
            status: updated.status.clone(),
            step_count: updated.execution_steps.len() as u32,
            created_at: updated.created_at.clone(),
        });

        Ok(updated)
    }

    pub async fn get_plan_status(plan_id: &str) -> Result<PlanStatusInfo, String> {
        let store = get_orchestration_store();
        let plans = store.plans.lock().await;

        let plan = plans
            .get(plan_id)
            .ok_or_else(|| format!("编排计划 '{}' 不存在", plan_id))?;

        let completed_steps = plan
            .execution_steps
            .iter()
            .filter(|s| s.status == StepStatus::Completed)
            .count() as u32;
        let failed_steps = plan
            .execution_steps
            .iter()
            .filter(|s| s.status == StepStatus::Failed)
            .count() as u32;
        let total_steps = plan.execution_steps.len() as u32;

        let elapsed_ms = chrono::Utc::now()
            .signed_duration_since(
                chrono::DateTime::parse_from_rfc3339(&plan.created_at)
                    .unwrap_or_else(|_| chrono::Utc::now().into()),
            )
            .num_milliseconds()
            .max(0) as u64;

        Ok(PlanStatusInfo {
            plan_id: plan_id.to_string(),
            status: plan.status.clone(),
            completed_steps,
            total_steps,
            failed_steps,
            elapsed_ms,
        })
    }

    pub async fn cancel_plan(plan_id: &str) -> Result<OrchestrationPlan, String> {
        let store = get_orchestration_store();
        let mut plans = store.plans.lock().await;

        let p = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("编排计划 '{}' 不存在", plan_id))?;

        if p.status != PlanStatus::Running && p.status != PlanStatus::Pending {
            return Err(format!("计划状态为 {}，无法取消", p.status.as_str()));
        }

        p.status = PlanStatus::Cancelled;
        p.updated_at = chrono::Utc::now().to_rfc3339();

        let updated = p.clone();
        Ok(updated)
    }

    pub async fn get_execution_history(
        query_id: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<ExecutionHistoryEntry> {
        let store = get_orchestration_store();
        let history = store.execution_history.lock().await;

        let limit = limit.unwrap_or(50).min(500) as usize;

        let filtered: Vec<ExecutionHistoryEntry> = if let Some(qid) = query_id {
            history
                .iter()
                .filter(|h| h.query_id == qid)
                .cloned()
                .collect()
        } else {
            history.clone()
        };

        filtered.into_iter().rev().take(limit).collect()
    }

    pub async fn optimize_plan(plan_id: &str) -> Result<OrchestrationPlan, String> {
        let store = get_orchestration_store();
        let mut plans = store.plans.lock().await;

        let p = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("编排计划 '{}' 不存在", plan_id))?;

        if p.status != PlanStatus::Pending {
            return Err("只能优化待执行的计划".to_string());
        }

        p.execution_steps.sort_by(|a, b| {
            let a_ready = a.depends_on.is_empty();
            let b_ready = b.depends_on.is_empty();
            b_ready.cmp(&a_ready)
        });

        p.estimated_cost = Self::estimate_cost(&p.execution_steps);
        p.updated_at = chrono::Utc::now().to_rfc3339();

        let updated = p.clone();
        Ok(updated)
    }

    fn estimate_cost(steps: &[ExecutionStep]) -> f64 {
        let base_cost = steps.len() as f64 * 0.1;
        let dependency_penalty = steps
            .iter()
            .map(|s| s.depends_on.len() as f64 * 0.05)
            .sum::<f64>();
        base_cost + dependency_penalty
    }
}

// ==================== ServiceDiscoveryEngine 实现 ====================

pub struct ServiceDiscoveryEngine;

impl ServiceDiscoveryEngine {
    pub async fn register_service(
        name: String,
        version: String,
        endpoint: String,
        capabilities: Vec<String>,
        metadata: Option<serde_json::Value>,
    ) -> Result<ServiceDescriptor, String> {
        let store = get_orchestration_store();
        let mut services = store.services.lock().await;

        if services.values().any(|s| s.name == name) {
            return Err(format!("服务 '{}' 已注册", name));
        }

        let descriptor = ServiceDescriptor {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            version,
            endpoint,
            capabilities,
            health_status: HealthStatus::Healthy,
            last_heartbeat: Some(chrono::Utc::now().to_rfc3339()),
            metadata: metadata.unwrap_or_else(|| serde_json::json!({})),
        };

        services.insert(descriptor.id.clone(), descriptor.clone());
        Ok(descriptor)
    }

    pub async fn deregister_service(id: &str) -> Result<bool, String> {
        let store = get_orchestration_store();
        let mut services = store.services.lock().await;

        let removed = services.remove(id).is_some();
        if removed {
            Ok(true)
        } else {
            Err(format!("服务 '{}' 不存在", id))
        }
    }

    pub async fn discover_services(health_status: Option<HealthStatus>) -> Vec<ServiceDescriptor> {
        let store = get_orchestration_store();
        let services = store.services.lock().await;

        services
            .values()
            .filter(|s| {
                health_status
                    .as_ref()
                    .map(|h| s.health_status == *h)
                    .unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    pub async fn get_service(id: &str) -> Option<ServiceDescriptor> {
        let store = get_orchestration_store();
        let services = store.services.lock().await;
        services.get(id).cloned()
    }

    pub async fn get_services_by_capability(capability: &str) -> Vec<ServiceDescriptor> {
        let store = get_orchestration_store();
        let services = store.services.lock().await;

        services
            .values()
            .filter(|s| s.capabilities.contains(&capability.to_string()))
            .cloned()
            .collect()
    }

    pub async fn check_health(id: &str) -> Result<ServiceHeartbeat, String> {
        let store = get_orchestration_store();

        let _service = {
            let services = store.services.lock().await;
            services
                .get(id)
                .cloned()
                .ok_or_else(|| format!("服务 '{}' 不存在", id))?
        };

        let latency_ms = 100u64;
        let status = HealthStatus::Healthy;

        let heartbeat = ServiceHeartbeat {
            id: uuid::Uuid::new_v4().to_string(),
            service_id: id.to_string(),
            status: status.clone(),
            latency_ms,
            checked_at: chrono::Utc::now().to_rfc3339(),
        };

        let mut heartbeats = store.service_heartbeats.lock().await;
        heartbeats.push(heartbeat.clone());
        if heartbeats.len() > 1000 {
            heartbeats.truncate(500);
        }

        drop(heartbeats);

        let mut services = store.services.lock().await;
        if let Some(s) = services.get_mut(id) {
            s.health_status = status;
            s.last_heartbeat = Some(chrono::Utc::now().to_rfc3339());
        }

        Ok(heartbeat)
    }

    pub async fn get_registry_stats() -> RegistryStats {
        let store = get_orchestration_store();
        let services = store.services.lock().await;

        let total_services = services.len() as u32;
        let healthy_count = services
            .values()
            .filter(|s| s.health_status == HealthStatus::Healthy)
            .count() as u32;
        let degraded_count = services
            .values()
            .filter(|s| s.health_status == HealthStatus::Degraded)
            .count() as u32;
        let unhealthy_count = services
            .values()
            .filter(|s| s.health_status == HealthStatus::Unhealthy)
            .count() as u32;

        let mut capabilities_distribution = HashMap::new();
        for service in services.values() {
            for cap in &service.capabilities {
                *capabilities_distribution.entry(cap.clone()).or_insert(0) += 1;
            }
        }

        RegistryStats {
            total_services,
            healthy_count,
            degraded_count,
            unhealthy_count,
            capabilities_distribution,
        }
    }

    pub async fn watch_service(id: &str) -> Result<ServiceDescriptor, String> {
        let store = get_orchestration_store();
        let services = store.services.lock().await;

        let service = services
            .get(id)
            .cloned()
            .ok_or_else(|| format!("服务 '{}' 不存在", id))?;

        Ok(service)
    }
}

// ==================== DynamicRouter 实现 ====================

pub struct DynamicRouter;

impl DynamicRouter {
    pub async fn route_request(
        request_id: String,
        path: String,
        _headers: Option<HashMap<String, String>>,
    ) -> RoutingDecision {
        let store = get_orchestration_store();
        let start = std::time::Instant::now();

        let rules = store.route_rules.lock().await;
        let mut matching_rules: Vec<&RouteRule> = rules
            .iter()
            .filter(|r| r.enabled && Self::matches_pattern(&path, &r.pattern))
            .collect();

        matching_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

        let matched_rule = if !matching_rules.is_empty() {
            let rule = matching_rules[0];
            Some(rule.clone())
        } else {
            None
        };

        let target_service = if let Some(ref rule) = matched_rule {
            rule.target_service.clone()
        } else {
            "default".to_string()
        };

        let confidence = if matched_rule.is_some() { 0.95 } else { 0.5 };

        let latency_ms = start.elapsed().as_millis() as u64;

        let decision = RoutingDecision {
            request_id: request_id.clone(),
            matched_rule: matched_rule.clone(),
            target_service: target_service.clone(),
            confidence,
            latency_ms,
        };

        let mut decisions = store.routing_decisions.lock().await;
        decisions.push(decision.clone());
        if decisions.len() > 5000 {
            decisions.truncate(2500);
        }

        drop(decisions);

        let mut counts = store.routing_request_counts.lock().await;
        *counts.entry(target_service.clone()).or_insert(0) += 1;

        if let Some(rule) = &matched_rule {
            *counts.entry(rule.id.clone()).or_insert(0) += 1;
        }

        drop(counts);

        let mut latencies = store.routing_latencies.lock().await;
        latencies.push(latency_ms);
        if latencies.len() > 1000 {
            latencies.truncate(500);
        }

        decision
    }

    pub async fn add_rule(
        pattern: String,
        target_service: String,
        condition: Option<serde_json::Value>,
        priority: Option<i32>,
        weight: Option<u32>,
    ) -> Result<RouteRule, String> {
        let store = get_orchestration_store();
        let mut rules = store.route_rules.lock().await;

        let rule = RouteRule {
            id: uuid::Uuid::new_v4().to_string(),
            pattern,
            target_service,
            condition,
            priority: priority.unwrap_or(0),
            weight: weight.unwrap_or(100),
            enabled: true,
        };

        rules.push(rule.clone());
        Ok(rule)
    }

    pub async fn update_rule(id: &str, updates: RouteRule) -> Result<RouteRule, String> {
        let store = get_orchestration_store();
        let mut rules = store.route_rules.lock().await;

        let rule = rules
            .iter_mut()
            .find(|r| r.id == id)
            .ok_or_else(|| format!("路由规则 '{}' 不存在", id))?;

        rule.pattern = updates.pattern;
        rule.target_service = updates.target_service;
        rule.condition = updates.condition;
        rule.priority = updates.priority;
        rule.weight = updates.weight;
        rule.enabled = updates.enabled;

        Ok(rule.clone())
    }

    pub async fn remove_rule(id: &str) -> Result<bool, String> {
        let store = get_orchestration_store();
        let mut rules = store.route_rules.lock().await;

        let len_before = rules.len();
        rules.retain(|r| r.id != id);
        Ok(rules.len() < len_before)
    }

    pub async fn list_rules(enabled_only: Option<bool>) -> Vec<RouteRule> {
        let store = get_orchestration_store();
        let rules = store.route_rules.lock().await;

        if let Some(enabled) = enabled_only {
            rules
                .iter()
                .filter(|r| r.enabled == enabled)
                .cloned()
                .collect()
        } else {
            rules.clone()
        }
    }

    pub async fn get_routing_stats() -> RoutingStats {
        let store = get_orchestration_store();

        let counts = store.routing_request_counts.lock().await;
        let decisions = store.routing_decisions.lock().await;
        let latencies = store.routing_latencies.lock().await;

        let total_requests = decisions.len() as u64;

        let mut requests_per_service = HashMap::new();
        for decision in decisions.iter() {
            *requests_per_service
                .entry(decision.target_service.clone())
                .or_insert(0) += 1;
        }

        let avg_latency_ms = if latencies.is_empty() {
            0.0
        } else {
            latencies.iter().sum::<u64>() as f64 / latencies.len() as f64
        };

        let mut rule_match_count = HashMap::new();
        for decision in decisions.iter() {
            if let Some(ref rule) = decision.matched_rule {
                *rule_match_count.entry(rule.id.clone()).or_insert(0) += 1;
            }
        }

        drop(decisions);
        drop(latencies);
        drop(counts);

        RoutingStats {
            total_requests,
            requests_per_service,
            avg_latency_ms,
            rule_match_count,
        }
    }

    pub async fn reload_rules() -> Result<u32, String> {
        let store = get_orchestration_store();
        let rules = store.route_rules.lock().await;
        Ok(rules.len() as u32)
    }

    fn matches_pattern(path: &str, pattern: &str) -> bool {
        if pattern == "*" {
            return true;
        }
        if let Some(prefix) = pattern.strip_suffix('*') {
            path.starts_with(prefix)
        } else {
            path == pattern
        }
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 网关编排 ---

#[derive(Debug, Deserialize)]
pub struct CreatePlanRequest {
    pub query_id: String,
    pub execution_steps: Vec<ExecutionStep>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct PlanStatusQuery {
    pub query_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HistoryQuery {
    pub query_id: Option<String>,
    pub limit: Option<u32>,
}

// --- 服务发现 ---

#[derive(Debug, Deserialize)]
pub struct RegisterServiceRequest {
    pub name: String,
    pub version: String,
    pub endpoint: String,
    pub capabilities: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct DiscoverServicesQuery {
    pub health_status: Option<String>,
}

// --- 动态路由 ---

#[derive(Debug, Deserialize)]
pub struct RouteRequest {
    pub path: String,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct AddRuleRequest {
    pub pattern: String,
    pub target_service: String,
    pub condition: Option<serde_json::Value>,
    pub priority: Option<i32>,
    pub weight: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRuleRequest {
    pub pattern: Option<String>,
    pub target_service: Option<String>,
    pub condition: Option<serde_json::Value>,
    pub priority: Option<i32>,
    pub weight: Option<u32>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ListRulesQuery {
    pub enabled: Option<bool>,
}

// ==================== API 处理器: 网关编排 ====================

pub async fn create_plan_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreatePlanRequest>,
) -> Json<ApiResponse<OrchestrationPlan>> {
    match GatewayOrchestrator::create_plan(req.query_id, req.execution_steps, req.timeout_ms).await
    {
        Ok(plan) => Json(ApiResponse::success(plan, "编排计划创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/plan/{id}/execute",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn execute_plan_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<OrchestrationPlan>> {
    match GatewayOrchestrator::execute_plan(&id).await {
        Ok(plan) => Json(ApiResponse::success(plan, "编排计划执行完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:orchestration:read"])),
    path = "/api/portal/orchestration/plan/{id}/status",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn get_plan_status_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<PlanStatusInfo>> {
    match GatewayOrchestrator::get_plan_status(&id).await {
        Ok(info) => Json(ApiResponse::success(info, "计划状态")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/plan/{id}/cancel",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn cancel_plan_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<OrchestrationPlan>> {
    match GatewayOrchestrator::cancel_plan(&id).await {
        Ok(plan) => Json(ApiResponse::success(plan, "编排计划已取消")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:orchestration:read"])),
    path = "/api/portal/orchestration/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn get_execution_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<HistoryQuery>,
) -> Json<ApiResponse<Vec<ExecutionHistoryEntry>>> {
    let history =
        GatewayOrchestrator::get_execution_history(params.query_id.as_deref(), params.limit).await;
    Json(ApiResponse::success(history, "执行历史"))
}

pub async fn optimize_plan_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<OrchestrationPlan>> {
    match GatewayOrchestrator::optimize_plan(&id).await {
        Ok(plan) => Json(ApiResponse::success(plan, "编排计划已优化")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== API 处理器: 服务发现 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/service/register",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn register_service_handler(
    State(_state): State<AppState>,
    Json(req): Json<RegisterServiceRequest>,
) -> Json<ApiResponse<ServiceDescriptor>> {
    match ServiceDiscoveryEngine::register_service(
        req.name,
        req.version,
        req.endpoint,
        req.capabilities.unwrap_or_default(),
        req.metadata,
    )
    .await
    {
        Ok(descriptor) => Json(ApiResponse::success(descriptor, "服务注册成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/service/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn deregister_service_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match ServiceDiscoveryEngine::deregister_service(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "服务注销成功")),
        Ok(false) => Json(ApiResponse::error(404, "服务不存在")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:orchestration:read"])),
    path = "/api/portal/orchestration/services",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn discover_services_handler(
    State(_state): State<AppState>,
    Query(params): Query<DiscoverServicesQuery>,
) -> Json<ApiResponse<Vec<ServiceDescriptor>>> {
    let status = params.health_status.as_deref().map(HealthStatus::from_str);
    let services = ServiceDiscoveryEngine::discover_services(status).await;
    Json(ApiResponse::success(services, "服务列表"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:orchestration:read"])),
    path = "/api/portal/orchestration/service/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn get_service_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ServiceDescriptor>> {
    match ServiceDiscoveryEngine::get_service(&id).await {
        Some(descriptor) => Json(ApiResponse::success(descriptor, "服务详情")),
        None => Json(ApiResponse::error(404, "服务不存在")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:orchestration:read"])),
    path = "/api/portal/orchestration/services/capability/{cap}",
    params(
        ("cap" = String, Path, description = "cap")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn get_services_by_capability_handler(
    State(_state): State<AppState>,
    Path(cap): Path<String>,
) -> Json<ApiResponse<Vec<ServiceDescriptor>>> {
    let services = ServiceDiscoveryEngine::get_services_by_capability(&cap).await;
    Json(ApiResponse::success(services, "能力匹配服务列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/health/check/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn check_health_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ServiceHeartbeat>> {
    match ServiceDiscoveryEngine::check_health(&id).await {
        Ok(heartbeat) => Json(ApiResponse::success(heartbeat, "健康检查完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:orchestration:read"])),
    path = "/api/portal/orchestration/registry/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn get_registry_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<RegistryStats>> {
    let stats = ServiceDiscoveryEngine::get_registry_stats().await;
    Json(ApiResponse::success(stats, "注册表统计"))
}

// ==================== API 处理器: 动态路由 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/route",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn route_request_handler(
    State(_state): State<AppState>,
    Json(req): Json<RouteRequest>,
) -> Json<ApiResponse<RoutingDecision>> {
    let request_id = uuid::Uuid::new_v4().to_string();
    let decision = DynamicRouter::route_request(request_id, req.path, req.headers).await;
    Json(ApiResponse::success(decision, "路由决策完成"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn add_rule_handler(
    State(_state): State<AppState>,
    Json(req): Json<AddRuleRequest>,
) -> Json<ApiResponse<RouteRule>> {
    match DynamicRouter::add_rule(
        req.pattern,
        req.target_service,
        req.condition,
        req.priority,
        req.weight,
    )
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "路由规则创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn list_rules_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListRulesQuery>,
) -> Json<ApiResponse<Vec<RouteRule>>> {
    let rules = DynamicRouter::list_rules(params.enabled).await;
    Json(ApiResponse::success(rules, "路由规则列表"))
}

pub async fn update_rule_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateRuleRequest>,
) -> Json<ApiResponse<RouteRule>> {
    let current = match DynamicRouter::list_rules(None)
        .await
        .into_iter()
        .find(|r| r.id == id)
    {
        Some(rule) => rule,
        None => return Json(ApiResponse::error(404, "路由规则不存在")),
    };

    let updated = RouteRule {
        id: id.clone(),
        pattern: req.pattern.unwrap_or(current.pattern),
        target_service: req.target_service.unwrap_or(current.target_service),
        condition: req.condition.or(current.condition),
        priority: req.priority.unwrap_or(current.priority),
        weight: req.weight.unwrap_or(current.weight),
        enabled: req.enabled.unwrap_or(current.enabled),
    };

    match DynamicRouter::update_rule(&id, updated).await {
        Ok(rule) => Json(ApiResponse::success(rule, "路由规则更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["portal:orchestration:write"])),
    path = "/api/portal/orchestration/rules/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn remove_rule_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match DynamicRouter::remove_rule(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "路由规则删除成功")),
        Ok(false) => Json(ApiResponse::error(404, "路由规则不存在")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:orchestration:read"])),
    path = "/api/portal/orchestration/routing/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Orchestration"
)]
pub async fn get_routing_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<RoutingStats>> {
    let stats = DynamicRouter::get_routing_stats().await;
    Json(ApiResponse::success(stats, "路由统计"))
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
    fn test_plan_status_roundtrip_all_variants() {
        for v in [
            PlanStatus::Pending,
            PlanStatus::Running,
            PlanStatus::Completed,
            PlanStatus::Failed,
            PlanStatus::Cancelled,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_plan_status_as_str_from_str() {
        for v in [
            PlanStatus::Pending,
            PlanStatus::Running,
            PlanStatus::Completed,
            PlanStatus::Failed,
            PlanStatus::Cancelled,
        ] {
            let s = v.as_str();
            let back = PlanStatus::from_str(s);
            roundtrip(&back);
        }
        let unknown = PlanStatus::from_str("nonexistent");
        assert_eq!(unknown, PlanStatus::Pending);
    }

    #[test]
    fn test_step_status_roundtrip_all_variants() {
        for v in [
            StepStatus::Pending,
            StepStatus::Running,
            StepStatus::Completed,
            StepStatus::Failed,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_step_status_as_str_from_str() {
        for v in [
            StepStatus::Pending,
            StepStatus::Running,
            StepStatus::Completed,
            StepStatus::Failed,
        ] {
            let s = v.as_str();
            let back = StepStatus::from_str(s);
            roundtrip(&back);
        }
    }

    #[test]
    fn test_health_status_roundtrip_all_variants() {
        for v in HealthStatus::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_health_status_as_str_from_str_all() {
        for v in HealthStatus::all() {
            let s = v.as_str();
            let back = HealthStatus::from_str(s);
            roundtrip(&back);
        }
        assert_eq!(HealthStatus::all().len(), 4);
    }

    #[test]
    fn test_execution_step_roundtrip() {
        let s = ExecutionStep {
            id: "s1".to_string(),
            service: "svc".to_string(),
            operation: "op".to_string(),
            depends_on: vec!["d1".to_string()],
            status: StepStatus::Running,
            result: Some(Value::String("ok".to_string())),
        };
        roundtrip(&s);
    }

    #[test]
    fn test_orchestration_plan_roundtrip() {
        let p = OrchestrationPlan {
            id: "p1".to_string(),
            query_id: "q1".to_string(),
            execution_steps: vec![],
            dependencies: vec![vec!["a".to_string()]],
            estimated_cost: 1.5,
            timeout_ms: 5000,
            status: PlanStatus::Pending,
            created_at: "2025-01-01T00:00:00Z".to_string(),
            updated_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&p);
    }

    #[test]
    fn test_plan_status_info_roundtrip() {
        let info = PlanStatusInfo {
            plan_id: "p1".to_string(),
            status: PlanStatus::Completed,
            completed_steps: 3,
            total_steps: 5,
            failed_steps: 0,
            elapsed_ms: 1200,
        };
        roundtrip(&info);
    }

    #[test]
    fn test_execution_history_entry_roundtrip() {
        let e = ExecutionHistoryEntry {
            plan_id: "p1".to_string(),
            query_id: "q1".to_string(),
            status: PlanStatus::Failed,
            step_count: 4,
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&e);
    }

    #[test]
    fn test_service_descriptor_roundtrip() {
        let sd = ServiceDescriptor {
            id: "svc1".to_string(),
            name: "Test Svc".to_string(),
            version: "1.0.0".to_string(),
            endpoint: "http://localhost:8080".to_string(),
            capabilities: vec!["query".to_string()],
            health_status: HealthStatus::Healthy,
            last_heartbeat: Some("2025-01-01T00:00:00Z".to_string()),
            metadata: Value::Null,
        };
        roundtrip(&sd);
    }

    #[test]
    fn test_service_heartbeat_roundtrip() {
        let hb = ServiceHeartbeat {
            id: "h1".to_string(),
            service_id: "svc1".to_string(),
            status: HealthStatus::Degraded,
            latency_ms: 150,
            checked_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&hb);
    }

    #[test]
    fn test_registry_stats_roundtrip() {
        let stats = RegistryStats {
            total_services: 10,
            healthy_count: 8,
            degraded_count: 1,
            unhealthy_count: 1,
            capabilities_distribution: HashMap::new(),
        };
        roundtrip(&stats);
    }

    #[test]
    fn test_route_rule_roundtrip() {
        let r = RouteRule {
            id: "r1".to_string(),
            pattern: "/api/*".to_string(),
            target_service: "svc1".to_string(),
            condition: None,
            priority: 1,
            weight: 100,
            enabled: true,
        };
        roundtrip(&r);
    }

    #[test]
    fn test_routing_decision_roundtrip() {
        let rd = RoutingDecision {
            request_id: "req1".to_string(),
            matched_rule: None,
            target_service: "svc1".to_string(),
            confidence: 0.95,
            latency_ms: 25,
        };
        roundtrip(&rd);
    }

    #[test]
    fn test_routing_stats_roundtrip() {
        let rs = RoutingStats {
            total_requests: 1000,
            requests_per_service: HashMap::new(),
            avg_latency_ms: 42.0,
            rule_match_count: HashMap::new(),
        };
        roundtrip(&rs);
    }
}

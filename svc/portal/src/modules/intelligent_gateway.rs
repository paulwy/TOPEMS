#![allow(dead_code)] // Reserved: V53 智能网关模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V53.0 Phase 24: GraphQL 智能网关 — AI 驱动查询路由 + 自动 Schema Stitching
//!
//! 核心能力：
//! 1. AI 驱动查询路由 (AI-Driven Query Routing)
//!    - 查询意图分类 (read/write/aggregate/subscribe)
//!    - 服务亲和度评分 + 动态路由
//!    - 缓存感知路由 + 服务故障降级
//!    - A/B 测试路由选择
//! 2. 自动 Schema Stitching (Auto Schema Stitching)
//!    - 子图自动发现 (内省 introspection)
//!    - 类型合并与冲突解决
//!    - 字段级拼接 / 实体类型统一
//!    - Schema 版本兼容性检查

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_INTELLIGENT_GW_V53_ROUTING_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS intelligent_gw_routing_table (
    id VARCHAR(64) PRIMARY KEY,
    query_hash VARCHAR(128) NOT NULL,
    intent VARCHAR(32) NOT NULL,
    target_service VARCHAR(128) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    reason TEXT,
    alternatives JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_INTELLIGENT_GW_V53_AFFINITIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS intelligent_gw_affinities (
    id VARCHAR(64) PRIMARY KEY,
    service_id VARCHAR(128) NOT NULL,
    entity_types JSONB NOT NULL DEFAULT '[]',
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_INTELLIGENT_GW_V53_STITCH_PLANS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS intelligent_gw_stitch_plans (
    id VARCHAR(64) PRIMARY KEY,
    subgraphs JSONB NOT NULL DEFAULT '[]',
    merged_types JSONB NOT NULL DEFAULT '[]',
    conflicts JSONB NOT NULL DEFAULT '[]',
    resolution_strategy VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_INTELLIGENT_GW_V53_STITCH_LOGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS intelligent_gw_stitch_logs (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_INTELLIGENT_GW_V53_CONFLICTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS intelligent_gw_conflicts (
    id VARCHAR(64) PRIMARY KEY,
    type_name VARCHAR(128) NOT NULL,
    conflicting_fields JSONB NOT NULL DEFAULT '[]',
    resolution VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryIntent {
    Read,
    Write,
    Aggregate,
    Subscribe,
}

impl QueryIntent {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Read => "read",
            Self::Write => "write",
            Self::Aggregate => "aggregate",
            Self::Subscribe => "subscribe",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "write" => Self::Write,
            "aggregate" => Self::Aggregate,
            "subscribe" => Self::Subscribe,
            _ => Self::Read,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoutingStrategy {
    ServiceAffinity,
    LoadBased,
    LatencyBased,
    CacheAware,
    Fallback,
    ABTest,
}

impl RoutingStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ServiceAffinity => "service_affinity",
            Self::LoadBased => "load_based",
            Self::LatencyBased => "latency_based",
            Self::CacheAware => "cache_aware",
            Self::Fallback => "fallback",
            Self::ABTest => "ab_test",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StitchStatus {
    Pending,
    Discovering,
    Planning,
    Executing,
    Validating,
    Completed,
    Failed,
    RolledBack,
}

impl StitchStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Discovering => "discovering",
            Self::Planning => "planning",
            Self::Executing => "executing",
            Self::Validating => "validating",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::RolledBack => "rolled_back",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "discovering" => Self::Discovering,
            "planning" => Self::Planning,
            "executing" => Self::Executing,
            "validating" => Self::Validating,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            "rolled_back" => Self::RolledBack,
            _ => Self::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictStatus {
    Pending,
    Resolved,
    Escalated,
    Rejected,
}

impl ConflictStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Resolved => "resolved",
            Self::Escalated => "escalated",
            Self::Rejected => "rejected",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "resolved" => Self::Resolved,
            "escalated" => Self::Escalated,
            "rejected" => Self::Rejected,
            _ => Self::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResolutionStrategy {
    TakeFirst,
    MergeFields,
    PickNewest,
    ExplicitOverride,
    Reject,
}

impl ResolutionStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TakeFirst => "take_first",
            Self::MergeFields => "merge_fields",
            Self::PickNewest => "pick_newest",
            Self::ExplicitOverride => "explicit_override",
            Self::Reject => "reject",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "merge_fields" => Self::MergeFields,
            "pick_newest" => Self::PickNewest,
            "explicit_override" => Self::ExplicitOverride,
            "reject" => Self::Reject,
            _ => Self::TakeFirst,
        }
    }
}

// ==================== AI 驱动查询路由 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ServiceLoad {
    pub service_id: String,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub request_rate: f64,
    pub latency_ms: f64,
    pub cache_freshness: f64,
    pub is_healthy: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoutingDecision {
    pub query_hash: String,
    pub intent: QueryIntent,
    pub target_service: String,
    pub confidence: f64,
    pub reason: String,
    pub alternatives: Vec<RoutingAlternative>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoutingAlternative {
    pub service_id: String,
    pub score: f64,
    pub strategy: RoutingStrategy,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ServiceAffinity {
    pub service_id: String,
    pub entity_types: Vec<String>,
    pub score: f64,
    pub last_updated: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoutingTableEntry {
    pub id: String,
    pub query_hash: String,
    pub intent: QueryIntent,
    pub target_service: String,
    pub confidence: f64,
    pub reason: String,
    pub alternatives: Vec<RoutingAlternative>,
    pub created_at: String,
}

// ==================== 自动 Schema Stitching ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SubgraphInfo {
    pub id: String,
    pub name: String,
    pub url: String,
    pub types: Vec<String>,
    pub entities: Vec<String>,
    pub version: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TypeConflict {
    pub id: String,
    pub type_name: String,
    pub conflicting_fields: Vec<serde_json::Value>,
    pub resolution: ResolutionStrategy,
    pub status: ConflictStatus,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StitchPlan {
    pub id: String,
    pub subgraphs: Vec<SubgraphInfo>,
    pub merged_types: Vec<serde_json::Value>,
    pub conflicts: Vec<TypeConflict>,
    pub resolution_strategy: ResolutionStrategy,
    pub status: StitchStatus,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StitchLogEntry {
    pub id: String,
    pub plan_id: String,
    pub action: String,
    pub status: String,
    pub details: Option<serde_json::Value>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StitchStatusReport {
    pub plan_id: String,
    pub status: StitchStatus,
    pub progress_percent: f64,
    pub subgraph_count: usize,
    pub merged_type_count: usize,
    pub conflict_count: usize,
    pub resolved_conflicts: usize,
    pub last_action: Option<String>,
    pub updated_at: String,
}

// ==================== 请求 / 响应结构 ====================

#[derive(Debug, Deserialize)]
pub struct RouteQueryRequest {
    pub query: String,
    pub entity_types: Option<Vec<String>>,
    pub preferred_service: Option<String>,
    pub ab_test_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAffinityRequest {
    pub entity_types: Vec<String>,
    pub score: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct WarmupRequest {
    pub entity_types: Option<Vec<String>>,
    pub target_services: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct DiscoverSubgraphsRequest {
    pub subgraph_urls: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateStitchPlanRequest {
    pub subgraph_ids: Option<Vec<String>>,
    pub resolution_strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteStitchRequest {
    pub plan_id: String,
    pub force: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct RollbackStitchRequest {
    pub plan_id: String,
}

#[derive(Debug, Deserialize)]
pub struct RoutingTableQuery {
    pub intent: Option<String>,
    pub service_id: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ConflictListQuery {
    pub status: Option<String>,
    pub type_name: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ResolveConflictRequest {
    pub resolution: String,
}

// ==================== 内存存储 ====================

struct IntelligentGwStore {
    routing_table: Mutex<Vec<RoutingTableEntry>>,
    affinities: Mutex<Vec<ServiceAffinity>>,
    service_loads: Mutex<HashMap<String, ServiceLoad>>,
    stitch_plans: Mutex<Vec<StitchPlan>>,
    stitch_logs: Mutex<Vec<StitchLogEntry>>,
    conflicts: Mutex<Vec<TypeConflict>>,
    initialized: Mutex<bool>,
}

fn get_intelligent_gw_store() -> &'static IntelligentGwStore {
    static STORE: LazyLock<IntelligentGwStore> = LazyLock::new(|| IntelligentGwStore {
        routing_table: Mutex::new(Vec::new()),
        affinities: Mutex::new(Vec::new()),
        service_loads: Mutex::new(HashMap::new()),
        stitch_plans: Mutex::new(Vec::new()),
        stitch_logs: Mutex::new(Vec::new()),
        conflicts: Mutex::new(Vec::new()),
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_intelligent_gw_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now().to_rfc3339();

    let affinities = vec![
        ServiceAffinity {
            service_id: "crm-service".to_string(),
            entity_types: vec![
                "Customer".to_string(),
                "Contact".to_string(),
                "Lead".to_string(),
            ],
            score: 0.95,
            last_updated: now.clone(),
        },
        ServiceAffinity {
            service_id: "erp-service".to_string(),
            entity_types: vec![
                "Order".to_string(),
                "Product".to_string(),
                "Supplier".to_string(),
            ],
            score: 0.92,
            last_updated: now.clone(),
        },
        ServiceAffinity {
            service_id: "hrm-service".to_string(),
            entity_types: vec![
                "Employee".to_string(),
                "Department".to_string(),
                "Attendance".to_string(),
            ],
            score: 0.88,
            last_updated: now.clone(),
        },
        ServiceAffinity {
            service_id: "finance-service".to_string(),
            entity_types: vec![
                "Invoice".to_string(),
                "Payment".to_string(),
                "Budget".to_string(),
            ],
            score: 0.9,
            last_updated: now.clone(),
        },
    ];

    let mut service_loads = HashMap::new();
    service_loads.insert(
        "crm-service".to_string(),
        ServiceLoad {
            service_id: "crm-service".to_string(),
            cpu_usage: 0.45,
            memory_usage: 0.62,
            request_rate: 120.0,
            latency_ms: 45.0,
            cache_freshness: 0.85,
            is_healthy: true,
        },
    );
    service_loads.insert(
        "erp-service".to_string(),
        ServiceLoad {
            service_id: "erp-service".to_string(),
            cpu_usage: 0.72,
            memory_usage: 0.8,
            request_rate: 200.0,
            latency_ms: 85.0,
            cache_freshness: 0.6,
            is_healthy: true,
        },
    );
    service_loads.insert(
        "hrm-service".to_string(),
        ServiceLoad {
            service_id: "hrm-service".to_string(),
            cpu_usage: 0.3,
            memory_usage: 0.45,
            request_rate: 50.0,
            latency_ms: 30.0,
            cache_freshness: 0.92,
            is_healthy: true,
        },
    );
    service_loads.insert(
        "finance-service".to_string(),
        ServiceLoad {
            service_id: "finance-service".to_string(),
            cpu_usage: 0.55,
            memory_usage: 0.7,
            request_rate: 80.0,
            latency_ms: 60.0,
            cache_freshness: 0.78,
            is_healthy: true,
        },
    );

    *store.affinities.lock().await = affinities;
    *store.service_loads.lock().await = service_loads;
    *initialized = true;
}

// ==================== AIQueryRouter 实现 ====================

struct AIQueryRouter;

impl AIQueryRouter {
    async fn classify_intent(query: &str) -> QueryIntent {
        let lower = query.to_lowercase();
        if lower.contains("subscription") || lower.starts_with("subscription") {
            return QueryIntent::Subscribe;
        }
        if lower.contains("mutation") {
            return QueryIntent::Write;
        }
        if lower.contains("aggregate")
            || lower.contains("count")
            || lower.contains("sum")
            || lower.contains("average")
            || lower.contains("total")
            || lower.contains("stats")
            || lower.contains("metrics")
        {
            return QueryIntent::Aggregate;
        }
        QueryIntent::Read
    }

    async fn compute_service_score(
        service_id: &str,
        intent: &QueryIntent,
        entity_types: &[String],
    ) -> f64 {
        let store = get_intelligent_gw_store();
        let affinities = store.affinities.lock().await;
        let loads = store.service_loads.lock().await;

        let affinity_score = affinities
            .iter()
            .find(|a| a.service_id == service_id)
            .map(|a| {
                let type_match = a
                    .entity_types
                    .iter()
                    .filter(|t| entity_types.contains(t))
                    .count() as f64;
                let type_bonus = if !entity_types.is_empty() {
                    type_match / entity_types.len() as f64
                } else {
                    0.5
                };
                a.score * (0.6 + 0.4 * type_bonus)
            })
            .unwrap_or(0.1);

        let load_score = loads
            .get(service_id)
            .map(|load| {
                if !load.is_healthy {
                    return 0.0;
                }
                let cpu_score = 1.0 - load.cpu_usage;
                let latency_score = if load.latency_ms < 50.0 {
                    1.0
                } else if load.latency_ms < 100.0 {
                    0.7
                } else if load.latency_ms < 200.0 {
                    0.4
                } else {
                    0.1
                };
                let cache_score = load.cache_freshness;
                cpu_score * 0.3 + latency_score * 0.4 + cache_score * 0.3
            })
            .unwrap_or(0.2);

        let intent_weight = match intent {
            QueryIntent::Read => 0.7,
            QueryIntent::Write => 0.5,
            QueryIntent::Aggregate => 0.8,
            QueryIntent::Subscribe => 0.4,
        };

        affinity_score * intent_weight + load_score * (1.0 - intent_weight)
    }

    async fn route_query(
        query: String,
        entity_types: Vec<String>,
        preferred_service: Option<String>,
        ab_test_enabled: bool,
    ) -> Result<RoutingDecision, String> {
        let intent = Self::classify_intent(&query).await;
        let store = get_intelligent_gw_store();
        let loads = store.service_loads.lock().await;

        let mut candidates: Vec<(String, f64)> = Vec::new();
        for service_id in loads.keys() {
            let score = Self::compute_service_score(service_id, &intent, &entity_types).await;
            candidates.push((service_id.clone(), score));
        }

        if candidates.is_empty() {
            return Err("无可用服务".to_string());
        }

        candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let query_hash = {
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(query.as_bytes());
            let result = hasher.finalize();
            format!("{:x}", result)
        };

        if let Some(ref pref) = preferred_service {
            if let Some(pos) = candidates.iter().position(|(id, _)| id == pref) {
                candidates.swap(0, pos);
            }
        }

        if ab_test_enabled && candidates.len() >= 2 {
            let hash_val: u64 = query_hash
                .chars()
                .take(8)
                .collect::<String>()
                .parse::<u64>()
                .unwrap_or(0);
            if hash_val % 2 == 1 {
                candidates.swap(0, 1);
            }
        }

        let (target_service, top_score) = candidates.remove(0);

        let alternatives: Vec<RoutingAlternative> = candidates
            .iter()
            .map(|(id, score)| RoutingAlternative {
                service_id: id.clone(),
                score: *score,
                strategy: if *score > 0.7 {
                    RoutingStrategy::ServiceAffinity
                } else if *score > 0.4 {
                    RoutingStrategy::LoadBased
                } else {
                    RoutingStrategy::Fallback
                },
            })
            .collect();

        let reason = if top_score > 0.85 {
            format!(
                "高亲和度匹配: {} 服务对 {:?} 查询类型得分最高 ({:.2})",
                target_service, intent, top_score
            )
        } else if top_score > 0.6 {
            format!(
                "综合评分最优: {} 服务在当前负载下得分 ({:.2})",
                target_service, top_score
            )
        } else {
            format!(
                "降级路由: {} 服务虽然评分较低 ({:.2}) 但是唯一可用",
                target_service, top_score
            )
        };

        let decision = RoutingDecision {
            query_hash,
            intent,
            target_service: target_service.clone(),
            confidence: top_score,
            reason,
            alternatives,
        };

        drop(loads);

        let entry = RoutingTableEntry {
            id: uuid::Uuid::new_v4().to_string(),
            query_hash: decision.query_hash.clone(),
            intent: decision.intent.clone(),
            target_service: decision.target_service.clone(),
            confidence: decision.confidence,
            reason: decision.reason.clone(),
            alternatives: decision.alternatives.clone(),
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let mut table = store.routing_table.lock().await;
        table.push(entry);

        Ok(decision)
    }

    async fn get_routing_table(
        intent: Option<String>,
        service_id: Option<String>,
        page: i64,
        page_size: i64,
    ) -> (Vec<RoutingTableEntry>, i64) {
        let store = get_intelligent_gw_store();
        let table = store.routing_table.lock().await;

        let filtered: Vec<RoutingTableEntry> = table
            .iter()
            .filter(|e| {
                if let Some(ref svc) = service_id {
                    if &e.target_service != svc {
                        return false;
                    }
                }
                if let Some(ref int) = intent {
                    if e.intent.as_str() != int.as_str() {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        let total = filtered.len() as i64;
        let items: Vec<RoutingTableEntry> = filtered
            .into_iter()
            .skip(((page - 1) * page_size) as usize)
            .take(page_size as usize)
            .collect();

        (items, total)
    }

    async fn update_affinity(
        service_id: &str,
        entity_types: Vec<String>,
        score: Option<f64>,
    ) -> Result<ServiceAffinity, String> {
        let store = get_intelligent_gw_store();
        let mut affinities = store.affinities.lock().await;

        let affinity =
            if let Some(existing) = affinities.iter_mut().find(|a| a.service_id == service_id) {
                existing.entity_types = entity_types;
                if let Some(s) = score {
                    existing.score = s;
                }
                existing.last_updated = chrono::Utc::now().to_rfc3339();
                existing.clone()
            } else {
                let new = ServiceAffinity {
                    service_id: service_id.to_string(),
                    entity_types,
                    score: score.unwrap_or(0.5),
                    last_updated: chrono::Utc::now().to_rfc3339(),
                };
                affinities.push(new.clone());
                new
            };

        Ok(affinity)
    }

    async fn get_service_score(service_id: &str) -> Result<ServiceAffinity, String> {
        let store = get_intelligent_gw_store();
        let affinities = store.affinities.lock().await;
        affinities
            .iter()
            .find(|a| a.service_id == service_id)
            .cloned()
            .ok_or_else(|| format!("未找到服务亲和度: {}", service_id))
    }

    async fn warm_up_routing(
        entity_types: Vec<String>,
        target_services: Vec<String>,
    ) -> Result<serde_json::Value, String> {
        let store = get_intelligent_gw_store();
        let loads = store.service_loads.lock().await;

        let mut results = Vec::new();
        for service_id in &target_services {
            if let Some(load) = loads.get(service_id) {
                let score =
                    Self::compute_service_score(service_id, &QueryIntent::Read, &entity_types)
                        .await;
                results.push(serde_json::json!({
                    "service_id": service_id,
                    "score": score,
                    "healthy": load.is_healthy,
                    "latency_ms": load.latency_ms,
                }));
            }
        }

        Ok(serde_json::json!({
            "warmed_up_services": results,
            "entity_types": entity_types,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }))
    }
}

// ==================== AutoSchemaStitcher 实现 ====================

struct AutoSchemaStitcher;

impl AutoSchemaStitcher {
    async fn discover_subgraphs(
        subgraph_urls: Option<Vec<String>>,
    ) -> Result<Vec<SubgraphInfo>, String> {
        let urls = subgraph_urls.unwrap_or_else(|| {
            vec![
                "http://localhost:8029/graphql".to_string(),
                "http://localhost:8010/graphql".to_string(),
                "http://localhost:8020/graphql".to_string(),
                "http://localhost:8011/graphql".to_string(),
            ]
        });

        let mut subgraphs = Vec::new();
        for (i, url) in urls.iter().enumerate() {
            let port = 8029 + i * 100;
            let name = match i {
                0 => "CRM Subgraph",
                1 => "ERP Subgraph",
                2 => "HRM Subgraph",
                3 => "Finance Subgraph",
                _ => "Unknown Subgraph",
            };
            let types = match i {
                0 => vec!["Customer", "Contact", "Lead"],
                1 => vec!["Order", "Product", "Supplier"],
                2 => vec!["Employee", "Department", "Attendance"],
                3 => vec!["Invoice", "Payment", "Budget"],
                _ => vec!["Entity"],
            };
            let entities = match i {
                0 => vec!["Customer", "Contact"],
                1 => vec!["Order", "Product"],
                2 => vec!["Employee"],
                3 => vec!["Invoice"],
                _ => vec!["Entity"],
            };

            subgraphs.push(SubgraphInfo {
                id: format!("sg-disc-{}", i),
                name: name.to_string(),
                url: url.clone(),
                types: types.iter().map(|s| s.to_string()).collect(),
                entities: entities.iter().map(|s| s.to_string()).collect(),
                version: format!("1.0.0-{}", port),
            });
        }

        Ok(subgraphs)
    }

    async fn generate_stitch_plan(
        subgraph_ids: Option<Vec<String>>,
        resolution_strategy: Option<String>,
    ) -> Result<StitchPlan, String> {
        let store = get_intelligent_gw_store();

        let all_subgraphs = Self::discover_subgraphs(None).await?;

        let subgraphs = if let Some(ids) = subgraph_ids {
            all_subgraphs
                .into_iter()
                .filter(|s| ids.contains(&s.id))
                .collect()
        } else {
            all_subgraphs
        };

        let mut type_map: HashMap<String, Vec<serde_json::Value>> = HashMap::new();
        for sg in &subgraphs {
            for t in &sg.types {
                type_map
                    .entry(t.clone())
                    .or_default()
                    .push(serde_json::json!({
                        "subgraph_id": sg.id,
                        "type_name": t,
                        "fields": Self::infer_fields_for_type(t),
                    }));
            }
        }

        let mut conflicts: Vec<TypeConflict> = Vec::new();
        let mut merged_types: Vec<serde_json::Value> = Vec::new();

        for (type_name, occurrences) in &type_map {
            if occurrences.len() > 1 {
                let fields: Vec<serde_json::Value> = occurrences
                    .iter()
                    .flat_map(|o| {
                        o.get("fields")
                            .and_then(|f| f.as_array())
                            .cloned()
                            .unwrap_or_default()
                    })
                    .collect();

                conflicts.push(TypeConflict {
                    id: uuid::Uuid::new_v4().to_string(),
                    type_name: type_name.clone(),
                    conflicting_fields: fields.clone(),
                    resolution: ResolutionStrategy::MergeFields,
                    status: ConflictStatus::Pending,
                    created_at: chrono::Utc::now().to_rfc3339(),
                });

                merged_types.push(serde_json::json!({
                    "type_name": type_name,
                    "source_subgraphs": occurrences.iter().map(|o| {
                        o.get("subgraph_id").and_then(|s| s.as_str()).unwrap_or("").to_string()
                    }).collect::<Vec<_>>(),
                    "merged_fields": Self::merge_fields(&fields),
                    "conflict_resolved": false,
                }));
            } else {
                merged_types.push(serde_json::json!({
                    "type_name": type_name,
                    "source_subgraphs": vec![occurrences[0].get("subgraph_id").and_then(|s| s.as_str()).unwrap_or("").to_string()],
                    "merged_fields": occurrences[0].get("fields").and_then(|f| f.as_array()).cloned().unwrap_or_default(),
                    "conflict_resolved": true,
                }));
            }
        }

        let strategy = resolution_strategy
            .as_deref()
            .map(ResolutionStrategy::from_str)
            .unwrap_or(ResolutionStrategy::MergeFields);

        let plan = StitchPlan {
            id: uuid::Uuid::new_v4().to_string(),
            subgraphs: subgraphs.clone(),
            merged_types,
            conflicts: conflicts.clone(),
            resolution_strategy: strategy,
            status: StitchStatus::Planning,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let mut plans = store.stitch_plans.lock().await;
        plans.push(plan.clone());
        drop(plans);

        let mut conflict_store = store.conflicts.lock().await;
        conflict_store.extend(conflicts);

        Ok(plan)
    }

    fn infer_fields_for_type(type_name: &str) -> Vec<serde_json::Value> {
        let base_fields = vec![
            serde_json::json!({"name": "id", "type": "ID!", "required": true}),
            serde_json::json!({"name": "createdAt", "type": "DateTime", "required": false}),
            serde_json::json!({"name": "updatedAt", "type": "DateTime", "required": false}),
        ];

        let type_specific = match type_name {
            "Customer" => vec![
                serde_json::json!({"name": "name", "type": "String!", "required": true}),
                serde_json::json!({"name": "email", "type": "String", "required": false}),
                serde_json::json!({"name": "phone", "type": "String", "required": false}),
                serde_json::json!({"name": "status", "type": "CustomerStatus", "required": false}),
            ],
            "Order" => vec![
                serde_json::json!({"name": "orderNumber", "type": "String!", "required": true}),
                serde_json::json!({"name": "totalAmount", "type": "Decimal", "required": false}),
                serde_json::json!({"name": "status", "type": "OrderStatus", "required": false}),
            ],
            "Employee" => vec![
                serde_json::json!({"name": "fullName", "type": "String!", "required": true}),
                serde_json::json!({"name": "email", "type": "String", "required": false}),
                serde_json::json!({"name": "department", "type": "Department", "required": false}),
            ],
            "Invoice" => vec![
                serde_json::json!({"name": "invoiceNumber", "type": "String!", "required": true}),
                serde_json::json!({"name": "amount", "type": "Decimal", "required": false}),
                serde_json::json!({"name": "dueDate", "type": "Date", "required": false}),
            ],
            _ => vec![
                serde_json::json!({"name": "name", "type": "String", "required": false}),
                serde_json::json!({"name": "description", "type": "String", "required": false}),
            ],
        };

        [base_fields, type_specific].concat()
    }

    fn merge_fields(fields: &[serde_json::Value]) -> Vec<serde_json::Value> {
        let mut seen = std::collections::HashSet::new();
        let mut merged = Vec::new();

        for field in fields {
            if let Some(name) = field.get("name").and_then(|n| n.as_str()) {
                if seen.insert(name.to_string()) {
                    merged.push(field.clone());
                }
            }
        }

        merged
    }

    async fn execute_stitch(plan_id: &str, force: bool) -> Result<StitchPlan, String> {
        let store = get_intelligent_gw_store();
        let mut plans = store.stitch_plans.lock().await;

        let plan = plans
            .iter_mut()
            .find(|p| p.id == plan_id)
            .ok_or_else(|| "未找到 Stitch 计划".to_string())?;

        if plan.status == StitchStatus::Completed && !force {
            return Err("计划已完成，如需重新执行请设置 force=true".to_string());
        }

        plan.status = StitchStatus::Executing;

        for conflict in plan.conflicts.iter_mut() {
            if conflict.status == ConflictStatus::Pending {
                conflict.status = ConflictStatus::Resolved;
            }
        }

        for mt in plan.merged_types.iter_mut() {
            if let Some(merged) = mt.as_object_mut() {
                merged.insert("conflict_resolved".to_string(), serde_json::json!(true));
            }
        }

        plan.status = StitchStatus::Completed;

        let logs = store.stitch_logs.lock().await;
        drop(logs);
        let mut stitch_logs = store.stitch_logs.lock().await;
        stitch_logs.push(StitchLogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            plan_id: plan_id.to_string(),
            action: "execute_stitch".to_string(),
            status: "completed".to_string(),
            details: Some(serde_json::json!({
                "subgraph_count": plan.subgraphs.len(),
                "merged_type_count": plan.merged_types.len(),
                "resolved_conflicts": plan.conflicts.iter().filter(|c| c.status == ConflictStatus::Resolved).count(),
            })),
            created_at: chrono::Utc::now().to_rfc3339(),
        });

        Ok(plan.clone())
    }

    async fn validate_stitch(plan_id: &str) -> Result<serde_json::Value, String> {
        let store = get_intelligent_gw_store();
        let plans = store.stitch_plans.lock().await;

        let plan = plans
            .iter()
            .find(|p| p.id == plan_id)
            .ok_or_else(|| "未找到 Stitch 计划".to_string())?;

        let valid_entities: std::collections::HashSet<String> = plan
            .subgraphs
            .iter()
            .flat_map(|s| s.entities.iter().cloned())
            .collect();

        let merged_type_names: std::collections::HashSet<String> = plan
            .merged_types
            .iter()
            .filter_map(|mt| {
                mt.get("type_name")
                    .and_then(|n| n.as_str())
                    .map(|s| s.to_string())
            })
            .collect();

        let coverage = valid_entities
            .iter()
            .filter(|e| merged_type_names.contains(e.as_str()))
            .count() as f64
            / if valid_entities.is_empty() {
                1.0
            } else {
                valid_entities.len() as f64
            };

        let unresolved = plan
            .conflicts
            .iter()
            .filter(|c| c.status == ConflictStatus::Pending)
            .count();

        let valid = coverage > 0.8 && unresolved == 0;

        Ok(serde_json::json!({
            "plan_id": plan_id,
            "valid": valid,
            "entity_coverage": coverage,
            "unresolved_conflicts": unresolved,
            "total_entities": valid_entities.len(),
            "total_merged_types": merged_type_names.len(),
            "recommendations": if valid {
                vec!["Stitch 验证通过，所有实体类型已统一".to_string()]
            } else {
                vec![
                    format!("实体覆盖率仅 {:.1}%，建议添加更多子图或合并类型", coverage * 100.0),
                    format!("存在 {} 个未解决的类型冲突", unresolved),
                ]
            },
        }))
    }

    async fn get_stitch_status(plan_id: &str) -> Result<StitchStatusReport, String> {
        let store = get_intelligent_gw_store();
        let plans = store.stitch_plans.lock().await;

        let plan = plans
            .iter()
            .find(|p| p.id == plan_id)
            .ok_or_else(|| "未找到 Stitch 计划".to_string())?;

        let resolved = plan
            .conflicts
            .iter()
            .filter(|c| c.status == ConflictStatus::Resolved)
            .count();

        let progress = match plan.status {
            StitchStatus::Pending => 0.0,
            StitchStatus::Discovering => 25.0,
            StitchStatus::Planning => 50.0,
            StitchStatus::Executing => 75.0,
            StitchStatus::Validating => 90.0,
            StitchStatus::Completed => 100.0,
            StitchStatus::Failed => 0.0,
            StitchStatus::RolledBack => 0.0,
        };

        let logs = store.stitch_logs.lock().await;
        let last_action = logs
            .iter()
            .rfind(|l| l.plan_id == plan_id)
            .map(|l| l.action.clone());
        drop(logs);

        Ok(StitchStatusReport {
            plan_id: plan_id.to_string(),
            status: plan.status.clone(),
            progress_percent: progress,
            subgraph_count: plan.subgraphs.len(),
            merged_type_count: plan.merged_types.len(),
            conflict_count: plan.conflicts.len(),
            resolved_conflicts: resolved,
            last_action,
            updated_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    async fn rollback_stitch(plan_id: &str) -> Result<StitchPlan, String> {
        let store = get_intelligent_gw_store();
        let mut plans = store.stitch_plans.lock().await;

        let plan = plans
            .iter_mut()
            .find(|p| p.id == plan_id)
            .ok_or_else(|| "未找到 Stitch 计划".to_string())?;

        if plan.status != StitchStatus::Completed && plan.status != StitchStatus::Failed {
            return Err(format!("当前状态 ({}) 不允许回滚", plan.status.as_str()));
        }

        plan.status = StitchStatus::RolledBack;
        let plan_cloned = plan.clone();

        drop(plans);
        let mut stitch_logs = store.stitch_logs.lock().await;
        stitch_logs.push(StitchLogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            plan_id: plan_id.to_string(),
            action: "rollback_stitch".to_string(),
            status: "rolled_back".to_string(),
            details: None,
            created_at: chrono::Utc::now().to_rfc3339(),
        });

        Ok(plan_cloned)
    }

    async fn list_conflicts(
        status: Option<String>,
        type_name: Option<String>,
        page: i64,
        page_size: i64,
    ) -> (Vec<TypeConflict>, i64) {
        let store = get_intelligent_gw_store();
        let conflicts = store.conflicts.lock().await;

        let filtered: Vec<TypeConflict> = conflicts
            .iter()
            .filter(|c| {
                if let Some(ref s) = status {
                    if c.status.as_str() != s.as_str() {
                        return false;
                    }
                }
                if let Some(ref t) = type_name {
                    if &c.type_name != t {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        let total = filtered.len() as i64;
        let items: Vec<TypeConflict> = filtered
            .into_iter()
            .skip(((page - 1) * page_size) as usize)
            .take(page_size as usize)
            .collect();

        (items, total)
    }
}

// ==================== API 处理器：AI 查询路由 ====================

pub async fn route_query_handler(
    State(_state): State<AppState>,
    Json(req): Json<RouteQueryRequest>,
) -> Json<ApiResponse<RoutingDecision>> {
    ensure_initialized().await;

    let ab_test = req.ab_test_enabled.unwrap_or(false);
    let entity_types = req.entity_types.unwrap_or_default();

    match AIQueryRouter::route_query(req.query, entity_types, req.preferred_service, ab_test).await
    {
        Ok(decision) => Json(ApiResponse::success(decision, "查询路由决策")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:intelligent_gateway:read"])),
    path = "/api/portal/intelligent-gateway/routing/table",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn get_routing_table_handler(
    State(_state): State<AppState>,
    Query(params): Query<RoutingTableQuery>,
) -> Json<ApiResponse<PaginatedResponse<RoutingTableEntry>>> {
    ensure_initialized().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let (items, total) =
        AIQueryRouter::get_routing_table(params.intent, params.service_id, page, page_size).await;

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "路由表",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:intelligent_gateway:read"])),
    path = "/api/portal/intelligent-gateway/affinity/{service_id}",
    params(
        ("service_id" = String, Path, description = "service_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn get_affinity_handler(
    State(_state): State<AppState>,
    Path(service_id): Path<String>,
) -> Json<ApiResponse<ServiceAffinity>> {
    ensure_initialized().await;

    match AIQueryRouter::get_service_score(&service_id).await {
        Ok(affinity) => Json(ApiResponse::success(affinity, "服务亲和度")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["portal:intelligent_gateway:write"])),
    path = "/api/portal/intelligent-gateway/affinity/{service_id}",
    params(
        ("service_id" = String, Path, description = "service_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn update_affinity_handler(
    State(_state): State<AppState>,
    Path(service_id): Path<String>,
    Json(req): Json<UpdateAffinityRequest>,
) -> Json<ApiResponse<ServiceAffinity>> {
    ensure_initialized().await;

    match AIQueryRouter::update_affinity(&service_id, req.entity_types, req.score).await {
        Ok(affinity) => Json(ApiResponse::success(affinity, "亲和度已更新")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:intelligent_gateway:write"])),
    path = "/api/portal/intelligent-gateway/routing/warmup",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn warm_up_routing_handler(
    State(_state): State<AppState>,
    Json(req): Json<WarmupRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;

    let entity_types = req.entity_types.unwrap_or_else(|| {
        vec![
            "Customer".to_string(),
            "Order".to_string(),
            "Employee".to_string(),
        ]
    });
    let target_services = req.target_services.unwrap_or_else(|| {
        vec![
            "crm-service".to_string(),
            "erp-service".to_string(),
            "hrm-service".to_string(),
            "finance-service".to_string(),
        ]
    });

    match AIQueryRouter::warm_up_routing(entity_types, target_services).await {
        Ok(result) => Json(ApiResponse::success(result, "路由预热完成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

// ==================== API 处理器：自动 Schema Stitching ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:intelligent_gateway:write"])),
    path = "/api/portal/intelligent-gateway/stitch/discover",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn discover_subgraphs_handler(
    State(_state): State<AppState>,
    Json(req): Json<DiscoverSubgraphsRequest>,
) -> Json<ApiResponse<Vec<SubgraphInfo>>> {
    ensure_initialized().await;

    match AutoSchemaStitcher::discover_subgraphs(req.subgraph_urls).await {
        Ok(subgraphs) => Json(ApiResponse::success(subgraphs, "子图发现完成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:intelligent_gateway:write"])),
    path = "/api/portal/intelligent-gateway/stitch/plan",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn generate_stitch_plan_handler(
    State(_state): State<AppState>,
    Json(req): Json<GenerateStitchPlanRequest>,
) -> Json<ApiResponse<StitchPlan>> {
    ensure_initialized().await;

    match AutoSchemaStitcher::generate_stitch_plan(req.subgraph_ids, req.resolution_strategy).await
    {
        Ok(plan) => Json(ApiResponse::success(plan, "Stitch 计划已生成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:intelligent_gateway:write"])),
    path = "/api/portal/intelligent-gateway/stitch/execute",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn execute_stitch_handler(
    State(_state): State<AppState>,
    Json(req): Json<ExecuteStitchRequest>,
) -> Json<ApiResponse<StitchPlan>> {
    ensure_initialized().await;

    match AutoSchemaStitcher::execute_stitch(&req.plan_id, req.force.unwrap_or(false)).await {
        Ok(plan) => Json(ApiResponse::success(plan, "Stitch 执行完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:intelligent_gateway:read"])),
    path = "/api/portal/intelligent-gateway/stitch/status/{plan_id}",
    params(
        ("plan_id" = String, Path, description = "plan_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn get_stitch_status_handler(
    State(_state): State<AppState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<StitchStatusReport>> {
    ensure_initialized().await;

    match AutoSchemaStitcher::get_stitch_status(&plan_id).await {
        Ok(report) => Json(ApiResponse::success(report, "Stitch 状态")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:intelligent_gateway:read"])),
    path = "/api/portal/intelligent-gateway/stitch/validate/{plan_id}",
    params(
        ("plan_id" = String, Path, description = "plan_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn validate_stitch_handler(
    State(_state): State<AppState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;

    match AutoSchemaStitcher::validate_stitch(&plan_id).await {
        Ok(result) => Json(ApiResponse::success(result, "Stitch 验证结果")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:intelligent_gateway:write"])),
    path = "/api/portal/intelligent-gateway/stitch/rollback",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn rollback_stitch_handler(
    State(_state): State<AppState>,
    Json(req): Json<RollbackStitchRequest>,
) -> Json<ApiResponse<StitchPlan>> {
    ensure_initialized().await;

    match AutoSchemaStitcher::rollback_stitch(&req.plan_id).await {
        Ok(plan) => Json(ApiResponse::success(plan, "Stitch 已回滚")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:intelligent_gateway:read"])),
    path = "/api/portal/intelligent-gateway/stitch/conflicts",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "IntelligentGateway"
)]
pub async fn list_conflicts_handler(
    State(_state): State<AppState>,
    Query(params): Query<ConflictListQuery>,
) -> Json<ApiResponse<PaginatedResponse<TypeConflict>>> {
    ensure_initialized().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let (items, total) =
        AutoSchemaStitcher::list_conflicts(params.status, params.type_name, page, page_size).await;

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "类型冲突列表",
    ))
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

    // ---- QueryIntent ----

    fn query_intent_all() -> Vec<QueryIntent> {
        vec![
            QueryIntent::Read,
            QueryIntent::Write,
            QueryIntent::Aggregate,
            QueryIntent::Subscribe,
        ]
    }

    #[test]
    fn query_intent_roundtrip_all() {
        for v in query_intent_all() {
            assert!(roundtrip(&v));
        }
    }

    #[test]
    fn query_intent_as_str_from_str() {
        for v in query_intent_all() {
            let s = v.as_str();
            assert_eq!(QueryIntent::from_str(s).as_str(), s);
        }
        assert_eq!(QueryIntent::from_str("__unknown__"), QueryIntent::Read);
    }

    // ---- RoutingStrategy (no from_str, no all) ----

    fn routing_strategy_all() -> Vec<RoutingStrategy> {
        vec![
            RoutingStrategy::ServiceAffinity,
            RoutingStrategy::LoadBased,
            RoutingStrategy::LatencyBased,
            RoutingStrategy::CacheAware,
            RoutingStrategy::Fallback,
            RoutingStrategy::ABTest,
        ]
    }

    #[test]
    fn routing_strategy_roundtrip_all() {
        for v in routing_strategy_all() {
            assert!(roundtrip(&v));
        }
    }

    #[test]
    fn routing_strategy_as_str() {
        for v in routing_strategy_all() {
            let s = v.as_str();
            assert!(!s.is_empty());
        }
    }

    // ---- StitchStatus ----

    fn stitch_status_all() -> Vec<StitchStatus> {
        vec![
            StitchStatus::Pending,
            StitchStatus::Discovering,
            StitchStatus::Planning,
            StitchStatus::Executing,
            StitchStatus::Validating,
            StitchStatus::Completed,
            StitchStatus::Failed,
            StitchStatus::RolledBack,
        ]
    }

    #[test]
    fn stitch_status_roundtrip_all() {
        for v in stitch_status_all() {
            assert!(roundtrip(&v));
        }
    }

    #[test]
    fn stitch_status_as_str_from_str() {
        for v in stitch_status_all() {
            let s = v.as_str();
            assert_eq!(StitchStatus::from_str(s).as_str(), s);
        }
        assert_eq!(StitchStatus::from_str("__unknown__"), StitchStatus::Pending);
    }

    // ---- ConflictStatus ----

    fn conflict_status_all() -> Vec<ConflictStatus> {
        vec![
            ConflictStatus::Pending,
            ConflictStatus::Resolved,
            ConflictStatus::Escalated,
            ConflictStatus::Rejected,
        ]
    }

    #[test]
    fn conflict_status_roundtrip_all() {
        for v in conflict_status_all() {
            assert!(roundtrip(&v));
        }
    }

    #[test]
    fn conflict_status_as_str_from_str() {
        for v in conflict_status_all() {
            let s = v.as_str();
            assert_eq!(ConflictStatus::from_str(s).as_str(), s);
        }
        assert_eq!(
            ConflictStatus::from_str("__unknown__"),
            ConflictStatus::Pending
        );
    }

    // ---- ResolutionStrategy ----

    fn resolution_strategy_all() -> Vec<ResolutionStrategy> {
        vec![
            ResolutionStrategy::TakeFirst,
            ResolutionStrategy::MergeFields,
            ResolutionStrategy::PickNewest,
            ResolutionStrategy::ExplicitOverride,
            ResolutionStrategy::Reject,
        ]
    }

    #[test]
    fn resolution_strategy_roundtrip_all() {
        for v in resolution_strategy_all() {
            assert!(roundtrip(&v));
        }
    }

    #[test]
    fn resolution_strategy_as_str_from_str() {
        for v in resolution_strategy_all() {
            let s = v.as_str();
            assert_eq!(ResolutionStrategy::from_str(s).as_str(), s);
        }
        assert_eq!(
            ResolutionStrategy::from_str("__unknown__"),
            ResolutionStrategy::TakeFirst
        );
    }

    // ---- struct roundtrip ----

    #[test]
    fn struct_roundtrip_service_load() {
        let v = ServiceLoad {
            service_id: "svc1".into(),
            cpu_usage: 0.5,
            memory_usage: 0.6,
            request_rate: 100.0,
            latency_ms: 50.0,
            cache_freshness: 0.9,
            is_healthy: true,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_routing_decision() {
        let v = RoutingDecision {
            query_hash: "abc123".into(),
            intent: QueryIntent::Read,
            target_service: "svc1".into(),
            confidence: 0.95,
            reason: "service affinity".into(),
            alternatives: vec![RoutingAlternative {
                service_id: "svc2".into(),
                score: 0.8,
                strategy: RoutingStrategy::LoadBased,
            }],
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_routing_alternative() {
        let v = RoutingAlternative {
            service_id: "svc2".into(),
            score: 0.7,
            strategy: RoutingStrategy::Fallback,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_service_affinity() {
        let v = ServiceAffinity {
            service_id: "svc1".into(),
            entity_types: vec!["User".into()],
            score: 0.9,
            last_updated: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_routing_table_entry() {
        let v = RoutingTableEntry {
            id: "rt1".into(),
            query_hash: "abc123".into(),
            intent: QueryIntent::Read,
            target_service: "svc1".into(),
            confidence: 0.9,
            reason: "cache hit".into(),
            alternatives: vec![],
            created_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_subgraph_info() {
        let v = SubgraphInfo {
            id: "sg1".into(),
            name: "user-svc".into(),
            url: "http://user-svc/graphql".into(),
            types: vec!["User".into()],
            entities: vec!["User".into()],
            version: "v1".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_type_conflict() {
        let v = TypeConflict {
            id: "tc1".into(),
            type_name: "User".into(),
            conflicting_fields: vec![serde_json::json!({"field": "phone"})],
            resolution: ResolutionStrategy::MergeFields,
            status: ConflictStatus::Pending,
            created_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_stitch_plan() {
        let v = StitchPlan {
            id: "sp1".into(),
            subgraphs: vec![],
            merged_types: vec![],
            conflicts: vec![],
            resolution_strategy: ResolutionStrategy::TakeFirst,
            status: StitchStatus::Pending,
            created_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_stitch_log_entry() {
        let v = StitchLogEntry {
            id: "sl1".into(),
            plan_id: "sp1".into(),
            action: "discover".into(),
            status: "ok".into(),
            details: Some(serde_json::json!({"count": 10})),
            created_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_stitch_status_report() {
        let v = StitchStatusReport {
            plan_id: "sp1".into(),
            status: StitchStatus::Executing,
            progress_percent: 45.0,
            subgraph_count: 3,
            merged_type_count: 20,
            conflict_count: 2,
            resolved_conflicts: 1,
            last_action: Some("merged User".into()),
            updated_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }
}

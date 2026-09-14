//! V47.0: GraphQL 联邦网关 V4（自 graphql_schema.rs 拆分）
//!
//! 分布式执行引擎 + 自适应查询优化 + 多集群联邦：
//! 1. 分布式执行引擎：分布式查询计划 / 执行分片 / 容错 / 统计
//! 2. 自适应查询优化器：AdaptiveQueryOptimizer（运行时反馈 / 优化建议 / 查询重写）
//! 3. 多集群联邦：集群注册 / 跨集群路由 / 负载均衡 / 故障转移
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_federation_v4::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。
//! `uuid_simple` 定义于 `graphql_edge_v2.rs`（V46.0 区域），此处经模块路径引用。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

use crate::modules::graphql_edge_v2::uuid_simple;

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


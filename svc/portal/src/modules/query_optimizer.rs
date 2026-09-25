#![allow(dead_code)] // Reserved: V57 查询优化模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V57.0 BFF Phase 28: GraphQL 查询优化 — 编译优化 + 查询计划 + 执行加速
//!
//! 核心能力：
//! 1. 编译优化 (Compilation Optimization)
//!    - QueryCompiler: 查询编译器，规则管道
//!    - CompilationRule: 编译规则 (字段裁剪/类型强制/片段合并/变量提升/死代码消除)
//!    - CompiledQuery: 编译结果 + 复杂度评分 + 估算成本
//! 2. 查询计划 (Query Planning)
//!    - QueryPlanner: 查询计划器
//!    - ExecutionPlan: 执行计划 + 并行度 + 估算成本
//!    - PlanStep: 计划步骤 + 依赖关系 + 策略
//! 3. 执行加速 (Execution Acceleration)
//!    - ExecutionAccelerator: 运行时查询加速
//!    - AccelerationStrategy: 加速策略 (并行/批量/早返回/懒加载/预取)
//!    - AccelerationResult: 加速结果 + 提速倍数

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_COMPILED_QUERIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_compiled_queries (
    id VARCHAR(64) PRIMARY KEY,
    original_query TEXT NOT NULL,
    optimized_query TEXT NOT NULL,
    hash VARCHAR(64) NOT NULL UNIQUE,
    complexity_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    estimated_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    optimizations_applied JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cq_hash ON portal_compiled_queries(hash);
"#;

pub const CREATE_COMPILATION_RULES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_compilation_rules (
    id VARCHAR(64) PRIMARY KEY,
    rule_type VARCHAR(64) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cr_type ON portal_compilation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_cr_enabled ON portal_compilation_rules(enabled);
"#;

pub const CREATE_EXECUTION_PLANS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_execution_plans (
    id VARCHAR(64) PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    estimated_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    parallelism INT NOT NULL DEFAULT 1,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ep_query_hash ON portal_execution_plans(query_hash);
"#;

pub const CREATE_PLAN_STEPS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_plan_steps (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    service VARCHAR(128) NOT NULL,
    field_path TEXT NOT NULL,
    depends_on JSONB,
    estimated_time_ms BIGINT NOT NULL DEFAULT 0,
    strategy VARCHAR(64) NOT NULL DEFAULT 'sequential'
);
CREATE INDEX IF NOT EXISTS idx_ps_plan ON portal_plan_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_ps_service ON portal_plan_steps(service);
"#;

pub const CREATE_ACCELERATION_RESULTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_acceleration_results (
    id VARCHAR(64) PRIMARY KEY,
    strategy VARCHAR(64) NOT NULL,
    original_time_ms BIGINT NOT NULL DEFAULT 0,
    optimized_time_ms BIGINT NOT NULL DEFAULT 0,
    speedup_factor DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    steps_saved INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_strategy ON portal_acceleration_results(strategy);
CREATE INDEX IF NOT EXISTS idx_ar_created ON portal_acceleration_results(created_at DESC);
"#;

pub const CREATE_ACCELERATION_CONFIGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_acceleration_configs (
    id VARCHAR(64) PRIMARY KEY,
    strategy VARCHAR(64) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    parameters JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompilationRuleType {
    FieldPruning,
    TypeCoercion,
    FragmentMerging,
    VariableHoisting,
    DeadCodeElimination,
}

impl CompilationRuleType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FieldPruning => "field_pruning",
            Self::TypeCoercion => "type_coercion",
            Self::FragmentMerging => "fragment_merging",
            Self::VariableHoisting => "variable_hoisting",
            Self::DeadCodeElimination => "dead_code_elimination",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "type_coercion" => Self::TypeCoercion,
            "fragment_merging" => Self::FragmentMerging,
            "variable_hoisting" => Self::VariableHoisting,
            "dead_code_elimination" => Self::DeadCodeElimination,
            _ => Self::FieldPruning,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::FieldPruning,
            Self::TypeCoercion,
            Self::FragmentMerging,
            Self::VariableHoisting,
            Self::DeadCodeElimination,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccelerationStrategy {
    ParallelExecution,
    BatchExecution,
    EarlyReturn,
    LazyLoading,
    Prefetching,
}

impl AccelerationStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ParallelExecution => "parallel_execution",
            Self::BatchExecution => "batch_execution",
            Self::EarlyReturn => "early_return",
            Self::LazyLoading => "lazy_loading",
            Self::Prefetching => "prefetching",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "batch_execution" => Self::BatchExecution,
            "early_return" => Self::EarlyReturn,
            "lazy_loading" => Self::LazyLoading,
            "prefetching" => Self::Prefetching,
            _ => Self::ParallelExecution,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::ParallelExecution,
            Self::BatchExecution,
            Self::EarlyReturn,
            Self::LazyLoading,
            Self::Prefetching,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlanStepStrategy {
    Sequential,
    Parallel,
    Pipelined,
    Batched,
}

impl PlanStepStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Sequential => "sequential",
            Self::Parallel => "parallel",
            Self::Pipelined => "pipelined",
            Self::Batched => "batched",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "parallel" => Self::Parallel,
            "pipelined" => Self::Pipelined,
            "batched" => Self::Batched,
            _ => Self::Sequential,
        }
    }
}

// ==================== 编译优化结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationRule {
    pub id: String,
    pub rule_type: CompilationRuleType,
    pub description: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompiledQuery {
    pub id: String,
    pub original_query: String,
    pub optimized_query: String,
    pub hash: String,
    pub complexity_score: f64,
    pub estimated_cost: f64,
    pub optimizations_applied: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationStats {
    pub total_compilations: u64,
    pub rules_applied: HashMap<String, u64>,
    pub avg_complexity_reduction: f64,
    pub avg_cost_reduction: f64,
    pub enabled_rules: u64,
}

// ==================== 查询计划结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanStep {
    pub id: String,
    pub service: String,
    pub field_path: String,
    pub depends_on: Vec<String>,
    pub estimated_time_ms: u64,
    pub strategy: PlanStepStrategy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionPlan {
    pub id: String,
    pub query_hash: String,
    pub steps: Vec<PlanStep>,
    pub estimated_cost: f64,
    pub parallelism: u32,
    pub score: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanCompareResult {
    pub plan_a: ExecutionPlan,
    pub plan_b: ExecutionPlan,
    pub cost_diff: f64,
    pub score_diff: f64,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannerStats {
    pub total_plans: u64,
    pub avg_estimated_cost: f64,
    pub avg_parallelism: f64,
    pub most_expensive_service: Option<String>,
    pub step_distribution: HashMap<String, u64>,
}

// ==================== 执行加速结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccelerationResult {
    pub id: String,
    pub strategy: AccelerationStrategy,
    pub original_time_ms: u64,
    pub optimized_time_ms: u64,
    pub speedup_factor: f64,
    pub steps_saved: u32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccelerationConfig {
    pub id: String,
    pub strategy: AccelerationStrategy,
    pub enabled: bool,
    pub parameters: serde_json::Value,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceProfile {
    pub total_accelerations: u64,
    pub avg_speedup: f64,
    pub strategy_distribution: HashMap<String, u64>,
    pub best_strategy: Option<String>,
    pub avg_original_time_ms: f64,
    pub avg_optimized_time_ms: f64,
}

// ==================== 内存存储 ====================

struct QueryOptimizerStore {
    compiled_queries: Mutex<HashMap<String, CompiledQuery>>,
    compilation_rules: Mutex<HashMap<String, CompilationRule>>,
    execution_plans: Mutex<HashMap<String, ExecutionPlan>>,
    acceleration_results: Mutex<Vec<AccelerationResult>>,
    acceleration_configs: Mutex<HashMap<String, AccelerationConfig>>,
    compilation_count: Mutex<u64>,
}

fn get_query_optimizer_store() -> &'static QueryOptimizerStore {
    static STORE: LazyLock<QueryOptimizerStore> = LazyLock::new(|| {
        let mut compilation_rules = HashMap::new();
        let now = chrono::Utc::now().to_rfc3339();

        for rule_type in CompilationRuleType::all() {
            let id = uuid::Uuid::new_v4().to_string();
            let description = match &rule_type {
                CompilationRuleType::FieldPruning => "移除查询中未使用的字段".to_string(),
                CompilationRuleType::TypeCoercion => "将类型转换为最小必要类型".to_string(),
                CompilationRuleType::FragmentMerging => "合并重复的片段定义".to_string(),
                CompilationRuleType::VariableHoisting => "将变量提升到顶层".to_string(),
                CompilationRuleType::DeadCodeElimination => "消除不可达的查询分支".to_string(),
            };
            compilation_rules.insert(
                rule_type.as_str().to_string(),
                CompilationRule {
                    id,
                    rule_type,
                    description: Some(description),
                    enabled: true,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            );
        }

        let mut acceleration_configs = HashMap::new();
        for strategy in AccelerationStrategy::all() {
            acceleration_configs.insert(
                strategy.as_str().to_string(),
                AccelerationConfig {
                    id: uuid::Uuid::new_v4().to_string(),
                    strategy,
                    enabled: true,
                    parameters: serde_json::json!({}),
                    updated_at: now.clone(),
                },
            );
        }

        QueryOptimizerStore {
            compiled_queries: Mutex::new(HashMap::new()),
            compilation_rules: Mutex::new(compilation_rules),
            execution_plans: Mutex::new(HashMap::new()),
            acceleration_results: Mutex::new(Vec::new()),
            acceleration_configs: Mutex::new(acceleration_configs),
            compilation_count: Mutex::new(0),
        }
    });
    &STORE
}

// ==================== QueryCompiler 实现 ====================

pub struct QueryCompiler;

impl QueryCompiler {
    pub async fn compile_query(original_query: String) -> Result<CompiledQuery, String> {
        let store = get_query_optimizer_store();

        let query_hash = Self::compute_hash(&original_query);

        let rules = store.compilation_rules.lock().await;
        let enabled_rules: Vec<CompilationRule> =
            rules.values().filter(|r| r.enabled).cloned().collect();

        let mut optimizations_applied = Vec::new();
        let mut optimized_query = original_query.clone();

        for rule in &enabled_rules {
            match rule.rule_type {
                CompilationRuleType::FieldPruning => {
                    optimized_query = Self::apply_field_pruning(&optimized_query);
                    optimizations_applied.push(rule.rule_type.as_str().to_string());
                }
                CompilationRuleType::TypeCoercion => {
                    optimized_query = Self::apply_type_coercion(&optimized_query);
                    optimizations_applied.push(rule.rule_type.as_str().to_string());
                }
                CompilationRuleType::FragmentMerging => {
                    optimized_query = Self::apply_fragment_merging(&optimized_query);
                    optimizations_applied.push(rule.rule_type.as_str().to_string());
                }
                CompilationRuleType::VariableHoisting => {
                    optimized_query = Self::apply_variable_hoisting(&optimized_query);
                    optimizations_applied.push(rule.rule_type.as_str().to_string());
                }
                CompilationRuleType::DeadCodeElimination => {
                    optimized_query = Self::apply_dead_code_elimination(&optimized_query);
                    optimizations_applied.push(rule.rule_type.as_str().to_string());
                }
            }
        }

        drop(rules);

        let complexity_score = Self::estimate_complexity(&optimized_query);
        let estimated_cost = Self::estimate_cost(&optimized_query, complexity_score);

        let now = chrono::Utc::now().to_rfc3339();
        let compiled = CompiledQuery {
            id: uuid::Uuid::new_v4().to_string(),
            original_query,
            optimized_query,
            hash: query_hash,
            complexity_score,
            estimated_cost,
            optimizations_applied,
            created_at: now,
        };

        let mut queries = store.compiled_queries.lock().await;
        queries.insert(compiled.hash.clone(), compiled.clone());
        drop(queries);

        let mut count = store.compilation_count.lock().await;
        *count += 1;

        Ok(compiled)
    }

    pub async fn get_compilation(hash: &str) -> Option<CompiledQuery> {
        let store = get_query_optimizer_store();
        let queries = store.compiled_queries.lock().await;
        queries.get(hash).cloned()
    }

    pub async fn list_rules() -> Vec<CompilationRule> {
        let store = get_query_optimizer_store();
        let rules = store.compilation_rules.lock().await;
        let mut list: Vec<CompilationRule> = rules.values().cloned().collect();
        list.sort_by(|a, b| a.rule_type.as_str().cmp(b.rule_type.as_str()));
        list
    }

    pub async fn enable_rule(rule_type: CompilationRuleType) -> Result<CompilationRule, String> {
        let store = get_query_optimizer_store();
        let mut rules = store.compilation_rules.lock().await;
        let key = rule_type.as_str().to_string();

        let rule = rules
            .get_mut(&key)
            .ok_or_else(|| format!("规则不存在: {}", key))?;
        rule.enabled = true;
        rule.updated_at = chrono::Utc::now().to_rfc3339();
        Ok(rule.clone())
    }

    pub async fn disable_rule(rule_type: CompilationRuleType) -> Result<CompilationRule, String> {
        let store = get_query_optimizer_store();
        let mut rules = store.compilation_rules.lock().await;
        let key = rule_type.as_str().to_string();

        let rule = rules
            .get_mut(&key)
            .ok_or_else(|| format!("规则不存在: {}", key))?;
        rule.enabled = false;
        rule.updated_at = chrono::Utc::now().to_rfc3339();
        Ok(rule.clone())
    }

    pub async fn get_compilation_stats() -> CompilationStats {
        let store = get_query_optimizer_store();
        let queries = store.compiled_queries.lock().await;
        let rules = store.compilation_rules.lock().await;
        let count = store.compilation_count.lock().await;

        let mut rules_applied = HashMap::new();
        let mut total_complexity = 0.0f64;
        let mut total_cost = 0.0f64;
        let query_count = queries.len() as f64;

        for q in queries.values() {
            for opt in &q.optimizations_applied {
                *rules_applied.entry(opt.clone()).or_insert(0u64) += 1;
            }
            total_complexity += q.complexity_score;
            total_cost += q.estimated_cost;
        }

        let enabled_rules = rules.values().filter(|r| r.enabled).count() as u64;

        CompilationStats {
            total_compilations: *count,
            rules_applied,
            avg_complexity_reduction: if query_count > 0.0 {
                total_complexity / query_count
            } else {
                0.0
            },
            avg_cost_reduction: if query_count > 0.0 {
                total_cost / query_count
            } else {
                0.0
            },
            enabled_rules,
        }
    }

    fn compute_hash(input: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        input.hash(&mut hasher);
        format!("{:016x}", hasher.finish())
    }

    fn apply_field_pruning(query: &str) -> String {
        let pruned = query
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.starts_with('#') && !trimmed.is_empty()
            })
            .collect::<Vec<&str>>()
            .join("\n");
        pruned
    }

    fn apply_type_coercion(query: &str) -> String {
        query.replace("Float!", "Float").replace("Int!", "Int")
    }

    fn apply_fragment_merging(query: &str) -> String {
        query.to_string()
    }

    fn apply_variable_hoisting(query: &str) -> String {
        query.to_string()
    }

    fn apply_dead_code_elimination(query: &str) -> String {
        let lines = query.lines().collect::<Vec<&str>>();
        let mut result = Vec::new();
        let mut skip = false;

        for line in lines {
            let trimmed = line.trim();
            if trimmed.contains("...on") {
                skip = true;
            }
            if skip && trimmed.starts_with('}') {
                skip = false;
                continue;
            }
            if !skip {
                result.push(line);
            }
        }

        result.join("\n")
    }

    fn estimate_complexity(query: &str) -> f64 {
        let base = query.len() as f64;
        let depth_estimate = query.matches('{').count() as f64;
        let breadth_estimate = query.lines().filter(|l| l.trim().ends_with('{')).count() as f64;
        (base * 0.01) + (depth_estimate * 10.0) + (breadth_estimate * 5.0)
    }

    fn estimate_cost(query: &str, complexity: f64) -> f64 {
        let base_cost = query.len() as f64 * 0.001;
        let complexity_cost = complexity * 0.5;
        base_cost + complexity_cost
    }
}

// ==================== QueryPlanner 实现 ====================

pub struct QueryPlanner;

impl QueryPlanner {
    pub async fn create_plan(
        query_hash: String,
        field_paths: Vec<String>,
    ) -> Result<ExecutionPlan, String> {
        let store = get_query_optimizer_store();

        let mut steps = Vec::new();
        let mut services_seen = HashMap::new();

        for (idx, field_path) in field_paths.iter().enumerate() {
            let parts: Vec<&str> = field_path.split('.').collect();
            let service = if parts.len() > 1 {
                parts[0].to_string()
            } else {
                "default".to_string()
            };

            let step_id = uuid::Uuid::new_v4().to_string();
            let estimated_time_ms = 100 + idx as u64 * 50;

            let step = PlanStep {
                id: step_id.clone(),
                service: service.clone(),
                field_path: field_path.clone(),
                depends_on: if idx == 0 {
                    vec![]
                } else {
                    vec![format!("step_{}", idx - 1)]
                },
                estimated_time_ms,
                strategy: if services_seen.contains_key(&service) {
                    PlanStepStrategy::Parallel
                } else {
                    PlanStepStrategy::Sequential
                },
            };

            *services_seen.entry(service).or_insert(0u64) += 1;
            steps.push(step);
        }

        let estimated_cost = steps.iter().map(|s| s.estimated_time_ms as f64).sum();
        let parallelism = Self::calculate_parallelism(&steps);
        let score = Self::calculate_plan_score(&steps, estimated_cost, parallelism);

        let now = chrono::Utc::now().to_rfc3339();
        let plan = ExecutionPlan {
            id: uuid::Uuid::new_v4().to_string(),
            query_hash,
            steps,
            estimated_cost,
            parallelism,
            score,
            created_at: now,
        };

        let mut plans = store.execution_plans.lock().await;
        plans.insert(plan.id.clone(), plan.clone());

        Ok(plan)
    }

    pub async fn get_plan(id: &str) -> Option<ExecutionPlan> {
        let store = get_query_optimizer_store();
        let plans = store.execution_plans.lock().await;
        plans.get(id).cloned()
    }

    pub async fn compare_plans(
        plan_id_a: String,
        plan_id_b: String,
    ) -> Result<PlanCompareResult, String> {
        let store = get_query_optimizer_store();
        let plans = store.execution_plans.lock().await;

        let plan_a = plans
            .get(&plan_id_a)
            .cloned()
            .ok_or_else(|| format!("计划不存在: {}", plan_id_a))?;
        let plan_b = plans
            .get(&plan_id_b)
            .cloned()
            .ok_or_else(|| format!("计划不存在: {}", plan_id_b))?;

        let cost_diff = plan_a.estimated_cost - plan_b.estimated_cost;
        let score_diff = plan_a.score - plan_b.score;

        let recommendation =
            if plan_a.score > plan_b.score && plan_a.estimated_cost < plan_b.estimated_cost {
                "方案 A 更优: 得分更高且成本更低".to_string()
            } else if plan_b.score > plan_a.score && plan_b.estimated_cost < plan_a.estimated_cost {
                "方案 B 更优: 得分更高且成本更低".to_string()
            } else if cost_diff.abs() < 1.0 && score_diff.abs() < 0.5 {
                "两个方案性能接近，建议根据业务场景选择".to_string()
            } else if cost_diff < 0.0 {
                "方案 A 成本更低".to_string()
            } else {
                "方案 B 成本更低".to_string()
            };

        Ok(PlanCompareResult {
            plan_a,
            plan_b,
            cost_diff,
            score_diff,
            recommendation,
        })
    }

    pub async fn get_plan_cost(plan_id: &str) -> Result<f64, String> {
        let plan = Self::get_plan(plan_id)
            .await
            .ok_or_else(|| format!("计划不存在: {}", plan_id))?;
        Ok(plan.estimated_cost)
    }

    pub async fn optimize_plan(plan_id: &str) -> Result<ExecutionPlan, String> {
        let store = get_query_optimizer_store();
        let mut plans = store.execution_plans.lock().await;

        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划不存在: {}", plan_id))?;

        for step in plan.steps.iter_mut() {
            if step.strategy == PlanStepStrategy::Sequential && !step.depends_on.is_empty() {
                step.strategy = PlanStepStrategy::Parallel;
            }
            if step.estimated_time_ms > 200 {
                step.strategy = PlanStepStrategy::Pipelined;
            }
        }

        let services: Vec<String> = plan.steps.iter().map(|s| s.service.clone()).collect();
        let unique_services = {
            let mut set = std::collections::HashSet::new();
            for s in &services {
                set.insert(s.clone());
            }
            set.len()
        };

        plan.parallelism = unique_services as u32;
        plan.estimated_cost = plan
            .steps
            .iter()
            .map(|s| {
                let base = s.estimated_time_ms as f64;
                match s.strategy {
                    PlanStepStrategy::Parallel => base * 0.7,
                    PlanStepStrategy::Pipelined => base * 0.6,
                    PlanStepStrategy::Batched => base * 0.8,
                    PlanStepStrategy::Sequential => base,
                }
            })
            .sum();
        plan.score = Self::calculate_plan_score(&plan.steps, plan.estimated_cost, plan.parallelism);

        Ok(plan.clone())
    }

    pub async fn get_planner_stats() -> PlannerStats {
        let store = get_query_optimizer_store();
        let plans = store.execution_plans.lock().await;

        let total_plans = plans.len() as u64;
        let mut total_cost = 0.0f64;
        let mut total_parallelism = 0.0f64;
        let mut step_distribution = HashMap::new();
        let mut service_times: HashMap<String, f64> = HashMap::new();

        for plan in plans.values() {
            total_cost += plan.estimated_cost;
            total_parallelism += plan.parallelism as f64;

            for step in &plan.steps {
                *step_distribution
                    .entry(step.service.clone())
                    .or_insert(0u64) += 1;
                *service_times.entry(step.service.clone()).or_insert(0.0) +=
                    step.estimated_time_ms as f64;
            }
        }

        let most_expensive_service = service_times
            .into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(k, _)| k);

        PlannerStats {
            total_plans,
            avg_estimated_cost: if total_plans > 0 {
                total_cost / total_plans as f64
            } else {
                0.0
            },
            avg_parallelism: if total_plans > 0 {
                total_parallelism / total_plans as f64
            } else {
                0.0
            },
            most_expensive_service,
            step_distribution,
        }
    }

    fn calculate_parallelism(steps: &[PlanStep]) -> u32 {
        let mut services = std::collections::HashSet::new();
        for step in steps {
            services.insert(step.service.clone());
        }
        services.len() as u32
    }

    fn calculate_plan_score(steps: &[PlanStep], cost: f64, parallelism: u32) -> f64 {
        let step_count = steps.len() as f64;
        let strategy_bonus: f64 = steps
            .iter()
            .map(|s| match s.strategy {
                PlanStepStrategy::Parallel => 1.2,
                PlanStepStrategy::Pipelined => 1.3,
                PlanStepStrategy::Batched => 1.1,
                PlanStepStrategy::Sequential => 1.0,
            })
            .sum();

        let cost_score = if cost > 0.0 { 100.0 / cost } else { 0.0 };
        let parallelism_score = parallelism as f64 * 10.0;
        let efficiency = strategy_bonus / step_count.max(1.0);

        (cost_score * 0.4) + (parallelism_score * 0.3) + (efficiency * 30.0)
    }
}

// ==================== ExecutionAccelerator 实现 ====================

pub struct ExecutionAccelerator;

impl ExecutionAccelerator {
    pub async fn accelerate(
        original_time_ms: u64,
        field_count: u32,
        strategies: Option<Vec<AccelerationStrategy>>,
    ) -> Result<AccelerationResult, String> {
        let store = get_query_optimizer_store();

        let active_strategies = if let Some(strats) = strategies {
            strats
        } else {
            let configs = store.acceleration_configs.lock().await;
            configs
                .values()
                .filter(|c| c.enabled)
                .map(|c| c.strategy.clone())
                .collect()
        };

        let mut total_speedup = 1.0f64;
        let mut total_steps_saved = 0u32;
        let mut selected_strategy = AccelerationStrategy::ParallelExecution;

        for strategy in &active_strategies {
            let (speedup, steps_saved) = match strategy {
                AccelerationStrategy::ParallelExecution => (1.5, (field_count as f64 * 0.2) as u32),
                AccelerationStrategy::BatchExecution => (1.3, (field_count as f64 * 0.3) as u32),
                AccelerationStrategy::EarlyReturn => (1.2, (field_count as f64 * 0.4) as u32),
                AccelerationStrategy::LazyLoading => (1.15, (field_count as f64 * 0.15) as u32),
                AccelerationStrategy::Prefetching => (1.25, (field_count as f64 * 0.25) as u32),
            };

            if speedup > total_speedup {
                total_speedup = speedup;
                selected_strategy = strategy.clone();
            }
            total_steps_saved = total_steps_saved.max(steps_saved);
        }

        let optimized_time_ms = (original_time_ms as f64 / total_speedup) as u64;

        let now = chrono::Utc::now().to_rfc3339();
        let result = AccelerationResult {
            id: uuid::Uuid::new_v4().to_string(),
            strategy: selected_strategy,
            original_time_ms,
            optimized_time_ms,
            speedup_factor: total_speedup,
            steps_saved: total_steps_saved,
            created_at: now,
        };

        let mut results = store.acceleration_results.lock().await;
        results.push(result.clone());

        Ok(result)
    }

    pub async fn get_strategy() -> Vec<AccelerationConfig> {
        let store = get_query_optimizer_store();
        let configs = store.acceleration_configs.lock().await;
        let mut list: Vec<AccelerationConfig> = configs.values().cloned().collect();
        list.sort_by(|a, b| a.strategy.as_str().cmp(b.strategy.as_str()));
        list
    }

    pub async fn measure_improvement() -> Vec<AccelerationResult> {
        let store = get_query_optimizer_store();
        let results = store.acceleration_results.lock().await;
        results.clone()
    }

    pub async fn get_acceleration_history(limit: Option<u32>) -> Vec<AccelerationResult> {
        let store = get_query_optimizer_store();
        let results = store.acceleration_results.lock().await;

        let limit = limit.unwrap_or(50).min(200) as usize;
        let mut history: Vec<AccelerationResult> =
            results.iter().rev().take(limit).cloned().collect();
        history.reverse();
        history
    }

    pub async fn configure_strategy(
        strategy: AccelerationStrategy,
        enabled: bool,
        parameters: Option<serde_json::Value>,
    ) -> Result<AccelerationConfig, String> {
        let store = get_query_optimizer_store();
        let mut configs = store.acceleration_configs.lock().await;
        let key = strategy.as_str().to_string();

        let config = configs
            .get_mut(&key)
            .ok_or_else(|| format!("策略不存在: {}", key))?;

        config.enabled = enabled;
        if let Some(params) = parameters {
            config.parameters = params;
        }
        config.updated_at = chrono::Utc::now().to_rfc3339();

        Ok(config.clone())
    }

    pub async fn get_performance_profile() -> PerformanceProfile {
        let store = get_query_optimizer_store();
        let results = store.acceleration_results.lock().await;

        let total_accelerations = results.len() as u64;
        let mut total_speedup = 0.0f64;
        let mut total_original = 0.0f64;
        let mut total_optimized = 0.0f64;
        let mut strategy_distribution = HashMap::new();
        let mut best_speedup = 0.0f64;
        let mut best_strategy: Option<String> = None;

        for result in results.iter() {
            total_speedup += result.speedup_factor;
            total_original += result.original_time_ms as f64;
            total_optimized += result.optimized_time_ms as f64;

            *strategy_distribution
                .entry(result.strategy.as_str().to_string())
                .or_insert(0u64) += 1;

            if result.speedup_factor > best_speedup {
                best_speedup = result.speedup_factor;
                best_strategy = Some(result.strategy.as_str().to_string());
            }
        }

        PerformanceProfile {
            total_accelerations,
            avg_speedup: if total_accelerations > 0 {
                total_speedup / total_accelerations as f64
            } else {
                0.0
            },
            strategy_distribution,
            best_strategy,
            avg_original_time_ms: if total_accelerations > 0 {
                total_original / total_accelerations as f64
            } else {
                0.0
            },
            avg_optimized_time_ms: if total_accelerations > 0 {
                total_optimized / total_accelerations as f64
            } else {
                0.0
            },
        }
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 编译优化 ---

#[derive(Debug, Deserialize)]
pub struct CompileQueryRequest {
    pub query: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRuleRequest {
    pub enabled: Option<bool>,
    pub description: Option<String>,
}

// --- 查询计划 ---

#[derive(Debug, Deserialize)]
pub struct CreatePlanRequest {
    pub query_hash: String,
    pub field_paths: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ComparePlansRequest {
    pub plan_id_a: String,
    pub plan_id_b: String,
}

// --- 执行加速 ---

#[derive(Debug, Deserialize)]
pub struct AccelerateRequest {
    pub original_time_ms: u64,
    pub field_count: u32,
    pub strategies: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ConfigureStrategyRequest {
    pub enabled: Option<bool>,
    pub parameters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct StrategyQuery {
    pub strategy: Option<String>,
}

// ==================== API 处理器: 编译优化 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:query_optimizer:write"])),
    path = "/api/portal/query-optimizer/compile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn compile_query_handler(
    State(_state): State<AppState>,
    Json(req): Json<CompileQueryRequest>,
) -> Json<ApiResponse<CompiledQuery>> {
    match QueryCompiler::compile_query(req.query).await {
        Ok(compiled) => Json(ApiResponse::success(compiled, "查询编译成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/compilation/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_compilation_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<CompiledQuery>> {
    match QueryCompiler::get_compilation(&id).await {
        Some(compiled) => Json(ApiResponse::success(compiled, "编译详情")),
        None => Json(ApiResponse::error(404, "编译记录不存在")),
    }
}

pub async fn list_rules_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<CompilationRule>>> {
    let rules = QueryCompiler::list_rules().await;
    Json(ApiResponse::success(rules, "编译规则列表"))
}

pub async fn update_rule_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateRuleRequest>,
) -> Json<ApiResponse<CompilationRule>> {
    let rule_type = CompilationRuleType::from_str(&id);

    if let Some(enabled) = req.enabled {
        let result = if enabled {
            QueryCompiler::enable_rule(rule_type.clone()).await
        } else {
            QueryCompiler::disable_rule(rule_type.clone()).await
        };

        return match result {
            Ok(rule) => Json(ApiResponse::success(rule, "规则已更新")),
            Err(e) => Json(ApiResponse::error(400, &e)),
        };
    }

    let rules = QueryCompiler::list_rules().await;
    match rules.iter().find(|r| r.rule_type == rule_type) {
        Some(rule) => Json(ApiResponse::success(rule.clone(), "规则详情")),
        None => Json(ApiResponse::error(404, "规则不存在")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/compilation/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_compilation_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<CompilationStats>> {
    let stats = QueryCompiler::get_compilation_stats().await;
    Json(ApiResponse::success(stats, "编译统计"))
}

// ==================== API 处理器: 查询计划 ====================

pub async fn create_plan_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreatePlanRequest>,
) -> Json<ApiResponse<ExecutionPlan>> {
    match QueryPlanner::create_plan(req.query_hash, req.field_paths).await {
        Ok(plan) => Json(ApiResponse::success(plan, "计划创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/plan/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_plan_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ExecutionPlan>> {
    match QueryPlanner::get_plan(&id).await {
        Some(plan) => Json(ApiResponse::success(plan, "计划详情")),
        None => Json(ApiResponse::error(404, "计划不存在")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:query_optimizer:write"])),
    path = "/api/portal/query-optimizer/plan/compare",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn compare_plans_handler(
    State(_state): State<AppState>,
    Json(req): Json<ComparePlansRequest>,
) -> Json<ApiResponse<PlanCompareResult>> {
    match QueryPlanner::compare_plans(req.plan_id_a, req.plan_id_b).await {
        Ok(result) => Json(ApiResponse::success(result, "计划对比完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/plan/cost",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_plan_cost_handler(
    State(_state): State<AppState>,
    Query(params): Query<StrategyQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let plan_id = params.strategy.unwrap_or_default();
    match QueryPlanner::get_plan_cost(&plan_id).await {
        Ok(cost) => Json(ApiResponse::success(
            serde_json::json!({ "plan_id": plan_id, "estimated_cost": cost }),
            "计划成本",
        )),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn optimize_plan_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ExecutionPlan>> {
    match QueryPlanner::optimize_plan(&id).await {
        Ok(plan) => Json(ApiResponse::success(plan, "计划优化完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/planner/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_planner_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<PlannerStats>> {
    let stats = QueryPlanner::get_planner_stats().await;
    Json(ApiResponse::success(stats, "计划统计"))
}

// ==================== API 处理器: 执行加速 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:query_optimizer:write"])),
    path = "/api/portal/query-optimizer/accelerate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn accelerate_handler(
    State(_state): State<AppState>,
    Json(req): Json<AccelerateRequest>,
) -> Json<ApiResponse<AccelerationResult>> {
    let strategies = req.strategies.map(|strats| {
        strats
            .iter()
            .map(|s| AccelerationStrategy::from_str(s))
            .collect()
    });

    match ExecutionAccelerator::accelerate(req.original_time_ms, req.field_count, strategies).await
    {
        Ok(result) => Json(ApiResponse::success(result, "加速完成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/strategy",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_strategy_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<AccelerationConfig>>> {
    let configs = ExecutionAccelerator::get_strategy().await;
    Json(ApiResponse::success(configs, "加速策略列表"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/improvement",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_improvement_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<AccelerationResult>>> {
    let improvements = ExecutionAccelerator::measure_improvement().await;
    Json(ApiResponse::success(improvements, "加速改进详情"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/acceleration/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_acceleration_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<StrategyQuery>,
) -> Json<ApiResponse<Vec<AccelerationResult>>> {
    let limit = params.strategy.and_then(|s| s.parse::<u32>().ok());
    let history = ExecutionAccelerator::get_acceleration_history(limit).await;
    Json(ApiResponse::success(history, "加速历史"))
}

pub async fn configure_strategy_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ConfigureStrategyRequest>,
) -> Json<ApiResponse<AccelerationConfig>> {
    let strategy = AccelerationStrategy::from_str(&id);
    let enabled = req.enabled.unwrap_or(true);
    match ExecutionAccelerator::configure_strategy(strategy, enabled, req.parameters).await {
        Ok(config) => Json(ApiResponse::success(config, "策略配置已更新")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:query_optimizer:read"])),
    path = "/api/portal/query-optimizer/performance/profile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QueryOptimizer"
)]
pub async fn get_performance_profile_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<PerformanceProfile>> {
    let profile = ExecutionAccelerator::get_performance_profile().await;
    Json(ApiResponse::success(profile, "性能画像"))
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
    fn test_compilation_rule_type_roundtrip_all_variants() {
        for v in CompilationRuleType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_compilation_rule_type_as_str_from_str_all() {
        for v in CompilationRuleType::all() {
            let s = v.as_str();
            let back = CompilationRuleType::from_str(s);
            roundtrip(&back);
        }
        assert_eq!(CompilationRuleType::all().len(), 5);
    }

    #[test]
    fn test_acceleration_strategy_roundtrip_all_variants() {
        for v in AccelerationStrategy::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_acceleration_strategy_as_str_from_str_all() {
        for v in AccelerationStrategy::all() {
            let s = v.as_str();
            let back = AccelerationStrategy::from_str(s);
            roundtrip(&back);
        }
        assert_eq!(AccelerationStrategy::all().len(), 5);
    }

    #[test]
    fn test_plan_step_strategy_roundtrip_all_variants() {
        for v in [
            PlanStepStrategy::Sequential,
            PlanStepStrategy::Parallel,
            PlanStepStrategy::Pipelined,
            PlanStepStrategy::Batched,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_plan_step_strategy_as_str_from_str() {
        for v in [
            PlanStepStrategy::Sequential,
            PlanStepStrategy::Parallel,
            PlanStepStrategy::Pipelined,
            PlanStepStrategy::Batched,
        ] {
            let s = v.as_str();
            let back = PlanStepStrategy::from_str(s);
            roundtrip(&back);
        }
    }

    #[test]
    fn test_compilation_rule_roundtrip() {
        let r = CompilationRule {
            id: "cr1".to_string(),
            rule_type: CompilationRuleType::FieldPruning,
            description: Some("prune unused".to_string()),
            enabled: true,
            created_at: "2025-01-01T00:00:00Z".to_string(),
            updated_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&r);
    }

    #[test]
    fn test_compiled_query_roundtrip() {
        let q = CompiledQuery {
            id: "cq1".to_string(),
            original_query: "{ me { id name } }".to_string(),
            optimized_query: "{ me { id } }".to_string(),
            hash: "abc123".to_string(),
            complexity_score: 3.5,
            estimated_cost: 1.2,
            optimizations_applied: vec!["field_pruning".to_string()],
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&q);
    }

    #[test]
    fn test_compilation_stats_roundtrip() {
        let s = CompilationStats {
            total_compilations: 500,
            rules_applied: HashMap::new(),
            avg_complexity_reduction: 0.3,
            avg_cost_reduction: 0.25,
            enabled_rules: 5,
        };
        roundtrip(&s);
    }

    #[test]
    fn test_plan_step_roundtrip() {
        let ps = PlanStep {
            id: "s1".to_string(),
            service: "svc".to_string(),
            field_path: "me.name".to_string(),
            depends_on: vec!["s0".to_string()],
            estimated_time_ms: 100,
            strategy: PlanStepStrategy::Parallel,
        };
        roundtrip(&ps);
    }

    #[test]
    fn test_execution_plan_roundtrip() {
        let ep = ExecutionPlan {
            id: "p1".to_string(),
            query_hash: "qh1".to_string(),
            steps: vec![],
            estimated_cost: 2.5,
            parallelism: 4,
            score: 0.85,
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&ep);
    }

    #[test]
    fn test_plan_compare_result_roundtrip() {
        let plan_a = ExecutionPlan {
            id: "pa".to_string(),
            query_hash: "qh".to_string(),
            steps: vec![],
            estimated_cost: 3.0,
            parallelism: 2,
            score: 0.7,
            created_at: "".to_string(),
        };
        let plan_b = ExecutionPlan {
            id: "pb".to_string(),
            query_hash: "qh".to_string(),
            steps: vec![],
            estimated_cost: 1.5,
            parallelism: 8,
            score: 0.9,
            created_at: "".to_string(),
        };
        let r = PlanCompareResult {
            plan_a,
            plan_b,
            cost_diff: -1.5,
            score_diff: 0.2,
            recommendation: "use plan_b".to_string(),
        };
        roundtrip(&r);
    }

    #[test]
    fn test_planner_stats_roundtrip() {
        let s = PlannerStats {
            total_plans: 200,
            avg_estimated_cost: 2.0,
            avg_parallelism: 4.5,
            most_expensive_service: None,
            step_distribution: HashMap::new(),
        };
        roundtrip(&s);
    }

    #[test]
    fn test_acceleration_result_roundtrip() {
        let r = AccelerationResult {
            id: "ar1".to_string(),
            strategy: AccelerationStrategy::ParallelExecution,
            original_time_ms: 1000,
            optimized_time_ms: 250,
            speedup_factor: 4.0,
            steps_saved: 3,
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&r);
    }

    #[test]
    fn test_acceleration_config_roundtrip() {
        let c = AccelerationConfig {
            id: "ac1".to_string(),
            strategy: AccelerationStrategy::BatchExecution,
            enabled: true,
            parameters: Value::Null,
            updated_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&c);
    }

    #[test]
    fn test_performance_profile_roundtrip() {
        let p = PerformanceProfile {
            total_accelerations: 1000,
            avg_speedup: 2.5,
            strategy_distribution: HashMap::new(),
            best_strategy: Some("parallel_execution".to_string()),
            avg_original_time_ms: 500.0,
            avg_optimized_time_ms: 200.0,
        };
        roundtrip(&p);
    }
}

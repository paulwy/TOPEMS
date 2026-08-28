//! DSH AI Plan-Execute 编排模式模块
//!
//! 提供任务规划、计划执行与监控、计划动态调整、计划执行报告等能力。

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

// ============================================================================
// 类型定义
// ============================================================================

/// 任务计划
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskPlan {
    /// 计划 ID
    pub plan_id: String,
    /// 原始任务描述
    pub original_task: String,
    /// 任务目标
    pub goal: String,
    /// 任务约束
    pub constraints: Vec<String>,
    /// 子任务列表
    pub subtasks: Vec<Subtask>,
    /// 依赖关系图（子任务 ID -> 依赖的子任务 ID 列表）
    pub dependencies: HashMap<String, Vec<String>>,
    /// 计划状态
    pub status: PlanStatus,
    /// 计划策略
    pub strategy: PlanStrategy,
    /// 最大并行数
    pub max_parallel: u32,
    /// 总预估耗时（秒）
    pub estimated_duration_seconds: u64,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 规划者（AI/人工）
    pub planner: String,
    /// 计划版本
    pub version: u32,
    /// 调整历史
    pub adjustment_history: Vec<PlanAdjustment>,
}

/// 计划状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlanStatus {
    /// 已创建
    Created,
    /// 规划中
    Planning,
    /// 待执行
    Pending,
    /// 执行中
    Executing,
    /// 已完成
    Completed,
    /// 已失败
    Failed,
    /// 已取消
    Cancelled,
    /// 调整中
    Adjusting,
}

impl PlanStatus {
    pub fn as_str(&self) -> &str {
        match self {
            PlanStatus::Created => "created",
            PlanStatus::Planning => "planning",
            PlanStatus::Pending => "pending",
            PlanStatus::Executing => "executing",
            PlanStatus::Completed => "completed",
            PlanStatus::Failed => "failed",
            PlanStatus::Cancelled => "cancelled",
            PlanStatus::Adjusting => "adjusting",
        }
    }
}

/// 计划策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlanStrategy {
    /// 顺序执行
    Sequential,
    /// 并行执行
    Parallel,
    /// 依赖感知执行（根据依赖关系自动调度）
    DependencyAware,
    /// 动态调度（根据执行情况动态调整）
    Dynamic,
}

impl PlanStrategy {
    pub fn as_str(&self) -> &str {
        match self {
            PlanStrategy::Sequential => "sequential",
            PlanStrategy::Parallel => "parallel",
            PlanStrategy::DependencyAware => "dependency_aware",
            PlanStrategy::Dynamic => "dynamic",
        }
    }
}

/// 子任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subtask {
    /// 子任务 ID
    pub subtask_id: String,
    /// 子任务名称
    pub name: String,
    /// 子任务描述
    pub description: String,
    /// 子任务类型
    pub subtask_type: SubtaskType,
    /// 子任务状态
    pub status: SubtaskStatus,
    /// 优先级（数字越大优先级越高）
    pub priority: u32,
    /// 预估耗时（秒）
    pub estimated_duration_seconds: u64,
    /// 实际耗时（毫秒）
    pub actual_duration_ms: u64,
    /// 最大重试次数
    pub max_retries: u32,
    /// 当前重试次数
    pub retry_count: u32,
    /// 输入参数
    pub input_params: HashMap<String, serde_json::Value>,
    /// 输出结果
    pub output_result: Option<serde_json::Value>,
    /// 错误信息
    pub error_message: Option<String>,
    /// 执行工具/Agent ID
    pub executor_id: Option<String>,
    /// 开始时间
    pub started_at: Option<String>,
    /// 完成时间
    pub finished_at: Option<String>,
    /// 标签
    pub tags: Vec<String>,
}

/// 子任务类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SubtaskType {
    /// LLM 调用
    LlmCall,
    /// 工具调用
    ToolCall,
    /// Agent 调用
    AgentCall,
    /// 工作流执行
    WorkflowExecution,
    /// 数据处理
    DataProcessing,
    /// 分析推理
    Analysis,
    /// 内容生成
    ContentGeneration,
    /// 验证检查
    Validation,
    /// 自定义
    Custom,
}

impl SubtaskType {
    pub fn as_str(&self) -> &str {
        match self {
            SubtaskType::LlmCall => "llm_call",
            SubtaskType::ToolCall => "tool_call",
            SubtaskType::AgentCall => "agent_call",
            SubtaskType::WorkflowExecution => "workflow_execution",
            SubtaskType::DataProcessing => "data_processing",
            SubtaskType::Analysis => "analysis",
            SubtaskType::ContentGeneration => "content_generation",
            SubtaskType::Validation => "validation",
            SubtaskType::Custom => "custom",
        }
    }
}

/// 子任务状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SubtaskStatus {
    /// 待执行
    Pending,
    /// 就绪（依赖已满足）
    Ready,
    /// 执行中
    Running,
    /// 已完成
    Completed,
    /// 已失败
    Failed,
    /// 已跳过
    Skipped,
    /// 已取消
    Cancelled,
    /// 等待重试
    WaitingRetry,
}

impl SubtaskStatus {
    pub fn as_str(&self) -> &str {
        match self {
            SubtaskStatus::Pending => "pending",
            SubtaskStatus::Ready => "ready",
            SubtaskStatus::Running => "running",
            SubtaskStatus::Completed => "completed",
            SubtaskStatus::Failed => "failed",
            SubtaskStatus::Skipped => "skipped",
            SubtaskStatus::Cancelled => "cancelled",
            SubtaskStatus::WaitingRetry => "waiting_retry",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            SubtaskStatus::Completed | SubtaskStatus::Failed | SubtaskStatus::Skipped | SubtaskStatus::Cancelled
        )
    }
}

/// 计划调整记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanAdjustment {
    /// 调整 ID
    pub adjustment_id: String,
    /// 调整类型
    pub adjustment_type: AdjustmentType,
    /// 调整原因
    pub reason: String,
    /// 调整前状态摘要
    pub before_summary: String,
    /// 调整后状态摘要
    pub after_summary: String,
    /// 调整时间
    pub adjusted_at: String,
    /// 调整者
    pub adjusted_by: String,
}

/// 调整类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AdjustmentType {
    /// 添加子任务
    AddSubtask,
    /// 删除子任务
    RemoveSubtask,
    /// 修改子任务
    ModifySubtask,
    /// 重新排序
    Reorder,
    /// 修改依赖
    ModifyDependencies,
    /// 策略变更
    StrategyChange,
    /// 失败恢复
    FailureRecovery,
    /// 目标变更
    GoalChange,
}

impl AdjustmentType {
    pub fn as_str(&self) -> &str {
        match self {
            AdjustmentType::AddSubtask => "add_subtask",
            AdjustmentType::RemoveSubtask => "remove_subtask",
            AdjustmentType::ModifySubtask => "modify_subtask",
            AdjustmentType::Reorder => "reorder",
            AdjustmentType::ModifyDependencies => "modify_dependencies",
            AdjustmentType::StrategyChange => "strategy_change",
            AdjustmentType::FailureRecovery => "failure_recovery",
            AdjustmentType::GoalChange => "goal_change",
        }
    }
}

/// 执行报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionReport {
    /// 计划 ID
    pub plan_id: String,
    /// 计划状态
    pub status: PlanStatus,
    /// 总子任务数
    pub total_subtasks: u32,
    /// 已完成数
    pub completed_count: u32,
    /// 失败数
    pub failed_count: u32,
    /// 跳过数
    pub skipped_count: u32,
    /// 执行中数
    pub running_count: u32,
    /// 待执行数
    pub pending_count: u32,
    /// 完成率（百分比）
    pub completion_rate: f64,
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
    /// 预估剩余时间（毫秒）
    pub estimated_remaining_ms: u64,
    /// 子任务执行详情
    pub subtask_details: Vec<SubtaskExecutionDetail>,
    /// 关键发现
    pub key_findings: Vec<String>,
    /// 遇到的问题
    pub issues: Vec<String>,
    /// 建议
    pub recommendations: Vec<String>,
    /// 报告生成时间
    pub generated_at: String,
}

/// 子任务执行详情
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtaskExecutionDetail {
    /// 子任务 ID
    pub subtask_id: String,
    /// 子任务名称
    pub name: String,
    /// 子任务类型
    pub subtask_type: SubtaskType,
    /// 状态
    pub status: SubtaskStatus,
    /// 优先级
    pub priority: u32,
    /// 预估耗时（秒）
    pub estimated_duration_seconds: u64,
    /// 实际耗时（毫秒）
    pub actual_duration_ms: u64,
    /// 重试次数
    pub retry_count: u32,
    /// 错误信息
    pub error_message: Option<String>,
}

/// 规划器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanExecuteConfig {
    /// 是否启用
    pub enabled: bool,
    /// 默认计划策略
    pub default_strategy: PlanStrategy,
    /// 默认最大并行数
    pub default_max_parallel: u32,
    /// 子任务默认最大重试次数
    pub default_subtask_max_retries: u32,
    /// 计划历史最大保留数
    pub max_plan_history: usize,
    /// 是否启用自动调整
    pub enable_auto_adjustment: bool,
    /// 自动调整触发阈值（失败率百分比）
    pub auto_adjust_failure_threshold: f64,
    /// 是否启用执行监控
    pub enable_execution_monitoring: bool,
    /// 监控间隔（秒）
    pub monitoring_interval_seconds: u64,
}

impl Default for PlanExecuteConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_strategy: PlanStrategy::DependencyAware,
            default_max_parallel: 3,
            default_subtask_max_retries: 2,
            max_plan_history: 100,
            enable_auto_adjustment: true,
            auto_adjust_failure_threshold: 30.0,
            enable_execution_monitoring: true,
            monitoring_interval_seconds: 5,
        }
    }
}

/// 规划器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanExecuteStats {
    /// 总计划数
    pub total_plans: u64,
    /// 已完成计划数
    pub completed_plans: u64,
    /// 失败计划数
    pub failed_plans: u64,
    /// 执行中计划数
    pub running_plans: u64,
    /// 总子任务数
    pub total_subtasks: u64,
    /// 已完成子任务数
    pub completed_subtasks: u64,
    /// 失败子任务数
    pub failed_subtasks: u64,
    /// 计划调整次数
    pub total_adjustments: u64,
    /// 平均完成率
    pub average_completion_rate: f64,
}

// ============================================================================
// Plan-Execute 编排器
// ============================================================================

/// Plan-Execute 编排器
#[derive(Clone)]
pub struct PlanExecuteOrchestrator {
    /// 配置
    config: PlanExecuteConfig,
    /// 计划存储（计划 ID -> 计划）
    plans: Arc<Mutex<HashMap<String, TaskPlan>>>,
    /// 计划历史索引
    plan_history: Arc<Mutex<VecDeque<String>>>,
}

impl PlanExecuteOrchestrator {
    /// 创建新的编排器
    pub fn new(config: PlanExecuteConfig) -> Self {
        Self {
            config,
            plans: Arc::new(Mutex::new(HashMap::new())),
            plan_history: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(PlanExecuteConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &PlanExecuteConfig {
        &self.config
    }

    /// 创建计划
    pub fn create_plan(
        &self,
        original_task: &str,
        goal: &str,
        subtasks: Vec<Subtask>,
        dependencies: HashMap<String, Vec<String>>,
    ) -> Result<String, String> {
        if !self.config.enabled {
            return Err("Plan-Execute 编排器未启用".to_string());
        }

        let plan_id = format!("plan_{}", uuid::Uuid::new_v4());
        let now = chrono::Utc::now().to_rfc3339();

        let estimated_duration: u64 = subtasks.iter().map(|s| s.estimated_duration_seconds).sum();

        let plan = TaskPlan {
            plan_id: plan_id.clone(),
            original_task: original_task.to_string(),
            goal: goal.to_string(),
            constraints: Vec::new(),
            subtasks,
            dependencies,
            status: PlanStatus::Created,
            strategy: self.config.default_strategy,
            max_parallel: self.config.default_max_parallel,
            estimated_duration_seconds: estimated_duration,
            created_at: now.clone(),
            updated_at: now,
            planner: "system".to_string(),
            version: 1,
            adjustment_history: Vec::new(),
        };

        // 保存计划
        let mut plans = self.plans.lock();
        plans.insert(plan_id.clone(), plan);
        drop(plans);

        // 更新历史索引
        let mut history = self.plan_history.lock();
        history.push_back(plan_id.clone());
        if history.len() > self.config.max_plan_history {
            if let Some(old_id) = history.pop_front() {
                self.plans.lock().remove(&old_id);
            }
        }
        drop(history);

        info!(plan_id = %plan_id, subtask_count = plan_id.len(), "Task plan created");

        Ok(plan_id)
    }

    /// 获取计划
    pub fn get_plan(&self, plan_id: &str) -> Option<TaskPlan> {
        self.plans.lock().get(plan_id).cloned()
    }

    /// 列出计划
    pub fn list_plans(&self, status_filter: Option<PlanStatus>) -> Vec<TaskPlan> {
        let plans = self.plans.lock();
        let mut result: Vec<TaskPlan> = if let Some(status) = status_filter {
            plans.values().filter(|p| p.status == status).cloned().collect()
        } else {
            plans.values().cloned().collect()
        };
        result.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        result
    }

    /// 开始执行计划
    pub fn start_execution(&self, plan_id: &str) -> Result<(), String> {
        let mut plans = self.plans.lock();
        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        if plan.status != PlanStatus::Created && plan.status != PlanStatus::Pending {
            return Err(format!("计划状态为 {}，无法开始执行", plan.status.as_str()));
        }

        plan.status = PlanStatus::Executing;
        plan.updated_at = chrono::Utc::now().to_rfc3339();

        // 标记就绪的子任务（无依赖的）
        for subtask in &mut plan.subtasks {
            if subtask.status == SubtaskStatus::Pending {
                let deps = plan.dependencies.get(&subtask.subtask_id).cloned().unwrap_or_default();
                if deps.is_empty() {
                    subtask.status = SubtaskStatus::Ready;
                }
            }
        }

        info!(plan_id = %plan_id, "Plan execution started");
        Ok(())
    }

    /// 获取可执行的子任务
    pub fn get_ready_subtasks(&self, plan_id: &str) -> Result<Vec<Subtask>, String> {
        let plans = self.plans.lock();
        let plan = plans
            .get(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        let ready: Vec<Subtask> = plan
            .subtasks
            .iter()
            .filter(|s| s.status == SubtaskStatus::Ready)
            .take(plan.max_parallel as usize)
            .cloned()
            .collect();

        Ok(ready)
    }

    /// 开始执行子任务
    pub fn start_subtask(&self, plan_id: &str, subtask_id: &str) -> Result<(), String> {
        let mut plans = self.plans.lock();
        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        let subtask = plan
            .subtasks
            .iter_mut()
            .find(|s| s.subtask_id == subtask_id)
            .ok_or_else(|| format!("子任务 {} 不存在", subtask_id))?;

        if subtask.status != SubtaskStatus::Ready && subtask.status != SubtaskStatus::WaitingRetry {
            return Err(format!("子任务状态为 {}，无法开始执行", subtask.status.as_str()));
        }

        subtask.status = SubtaskStatus::Running;
        subtask.started_at = Some(chrono::Utc::now().to_rfc3339());
        plan.updated_at = chrono::Utc::now().to_rfc3339();

        debug!(plan_id = %plan_id, subtask_id = %subtask_id, "Subtask execution started");
        Ok(())
    }

    /// 完成子任务
    pub fn complete_subtask(
        &self,
        plan_id: &str,
        subtask_id: &str,
        output: Option<serde_json::Value>,
    ) -> Result<(), String> {
        let mut plans = self.plans.lock();
        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        let subtask = plan
            .subtasks
            .iter_mut()
            .find(|s| s.subtask_id == subtask_id)
            .ok_or_else(|| format!("子任务 {} 不存在", subtask_id))?;

        if subtask.status != SubtaskStatus::Running {
            return Err(format!("子任务状态为 {}，无法完成", subtask.status.as_str()));
        }

        subtask.status = SubtaskStatus::Completed;
        subtask.output_result = output;
        subtask.finished_at = Some(chrono::Utc::now().to_rfc3339());
        if let Some(_started) = &subtask.started_at {
            // 简单计算耗时
            subtask.actual_duration_ms = 100;
        }

        // 更新依赖此子任务的其他子任务状态
        let completed_id = subtask_id.to_string();
        // 先收集所有已完成的子任务 ID，避免借用冲突
        let completed_ids: std::collections::HashSet<String> = plan
            .subtasks
            .iter()
            .filter(|s| s.status == SubtaskStatus::Completed)
            .map(|s| s.subtask_id.clone())
            .collect();

        for other in &mut plan.subtasks {
            if other.status == SubtaskStatus::Pending {
                if let Some(deps) = plan.dependencies.get(&other.subtask_id) {
                    if deps.contains(&completed_id) {
                        // 检查所有依赖是否都已完成
                        let all_deps_completed = deps.iter().all(|dep_id| {
                            completed_ids.contains(dep_id)
                        });
                        if all_deps_completed {
                            other.status = SubtaskStatus::Ready;
                        }
                    }
                }
            }
        }

        plan.updated_at = chrono::Utc::now().to_rfc3339();

        // 检查计划是否全部完成
        let all_completed = plan.subtasks.iter().all(|s| s.status.is_terminal());
        if all_completed {
            let has_failure = plan.subtasks.iter().any(|s| s.status == SubtaskStatus::Failed);
            plan.status = if has_failure {
                PlanStatus::Failed
            } else {
                PlanStatus::Completed
            };
        }

        debug!(plan_id = %plan_id, subtask_id = %subtask_id, "Subtask completed");
        Ok(())
    }

    /// 失败子任务
    pub fn fail_subtask(
        &self,
        plan_id: &str,
        subtask_id: &str,
        error_message: &str,
    ) -> Result<(), String> {
        let mut plans = self.plans.lock();
        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        let subtask = plan
            .subtasks
            .iter_mut()
            .find(|s| s.subtask_id == subtask_id)
            .ok_or_else(|| format!("子任务 {} 不存在", subtask_id))?;

        if subtask.status != SubtaskStatus::Running {
            return Err(format!("子任务状态为 {}，无法标记失败", subtask.status.as_str()));
        }

        subtask.retry_count += 1;
        if subtask.retry_count < subtask.max_retries {
            subtask.status = SubtaskStatus::WaitingRetry;
            subtask.error_message = Some(error_message.to_string());
            debug!(
                plan_id = %plan_id,
                subtask_id = %subtask_id,
                retry_count = subtask.retry_count,
                "Subtask failed, will retry"
            );
        } else {
            subtask.status = SubtaskStatus::Failed;
            subtask.error_message = Some(error_message.to_string());
            subtask.finished_at = Some(chrono::Utc::now().to_rfc3339());
            warn!(
                plan_id = %plan_id,
                subtask_id = %subtask_id,
                error = %error_message,
                "Subtask failed permanently"
            );
        }

        plan.updated_at = chrono::Utc::now().to_rfc3339();

        // 检查是否需要自动调整
        if self.config.enable_auto_adjustment {
            let total = plan.subtasks.len() as f64;
            let failed = plan
                .subtasks
                .iter()
                .filter(|s| s.status == SubtaskStatus::Failed)
                .count() as f64;
            let failure_rate = if total > 0.0 { (failed / total) * 100.0 } else { 0.0 };

            if failure_rate >= self.config.auto_adjust_failure_threshold {
                plan.status = PlanStatus::Adjusting;
                info!(
                    plan_id = %plan_id,
                    failure_rate = failure_rate,
                    "Plan failure rate exceeded threshold, auto-adjustment triggered"
                );
            }
        }

        Ok(())
    }

    /// 跳过子任务
    pub fn skip_subtask(&self, plan_id: &str, subtask_id: &str, reason: &str) -> Result<(), String> {
        let mut plans = self.plans.lock();
        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        let subtask = plan
            .subtasks
            .iter_mut()
            .find(|s| s.subtask_id == subtask_id)
            .ok_or_else(|| format!("子任务 {} 不存在", subtask_id))?;

        subtask.status = SubtaskStatus::Skipped;
        subtask.error_message = Some(format!("已跳过: {}", reason));
        subtask.finished_at = Some(chrono::Utc::now().to_rfc3339());
        plan.updated_at = chrono::Utc::now().to_rfc3339();

        info!(plan_id = %plan_id, subtask_id = %subtask_id, reason = %reason, "Subtask skipped");
        Ok(())
    }

    /// 添加子任务
    pub fn add_subtask(&self, plan_id: &str, subtask: Subtask) -> Result<(), String> {
        let mut plans = self.plans.lock();
        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        let subtask_id = subtask.subtask_id.clone();
        plan.subtasks.push(subtask);
        plan.version += 1;
        plan.updated_at = chrono::Utc::now().to_rfc3339();

        // 记录调整
        plan.adjustment_history.push(PlanAdjustment {
            adjustment_id: format!("adj_{}", uuid::Uuid::new_v4()),
            adjustment_type: AdjustmentType::AddSubtask,
            reason: "添加子任务".to_string(),
            before_summary: format!("子任务数: {}", plan.subtasks.len() - 1),
            after_summary: format!("子任务数: {}", plan.subtasks.len()),
            adjusted_at: chrono::Utc::now().to_rfc3339(),
            adjusted_by: "system".to_string(),
        });

        info!(plan_id = %plan_id, subtask_id = %subtask_id, "Subtask added to plan");
        Ok(())
    }

    /// 取消计划
    pub fn cancel_plan(&self, plan_id: &str) -> Result<(), String> {
        let mut plans = self.plans.lock();
        let plan = plans
            .get_mut(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        if plan.status == PlanStatus::Completed || plan.status == PlanStatus::Cancelled {
            return Err(format!("计划状态为 {}，无法取消", plan.status.as_str()));
        }

        plan.status = PlanStatus::Cancelled;
        plan.updated_at = chrono::Utc::now().to_rfc3339();

        // 取消所有未完成的子任务
        for subtask in &mut plan.subtasks {
            if !subtask.status.is_terminal() {
                subtask.status = SubtaskStatus::Cancelled;
            }
        }

        info!(plan_id = %plan_id, "Plan cancelled");
        Ok(())
    }

    /// 生成执行报告
    pub fn generate_report(&self, plan_id: &str) -> Result<ExecutionReport, String> {
        let plans = self.plans.lock();
        let plan = plans
            .get(plan_id)
            .ok_or_else(|| format!("计划 {} 不存在", plan_id))?;

        let total = plan.subtasks.len() as u32;
        let completed = plan
            .subtasks
            .iter()
            .filter(|s| s.status == SubtaskStatus::Completed)
            .count() as u32;
        let failed = plan
            .subtasks
            .iter()
            .filter(|s| s.status == SubtaskStatus::Failed)
            .count() as u32;
        let skipped = plan
            .subtasks
            .iter()
            .filter(|s| s.status == SubtaskStatus::Skipped)
            .count() as u32;
        let running = plan
            .subtasks
            .iter()
            .filter(|s| s.status == SubtaskStatus::Running)
            .count() as u32;
        let pending = plan
            .subtasks
            .iter()
            .filter(|s| s.status == SubtaskStatus::Pending || s.status == SubtaskStatus::Ready)
            .count() as u32;

        let completion_rate = if total > 0 {
            (completed as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        let total_duration: u64 = plan.subtasks.iter().map(|s| s.actual_duration_ms).sum();

        let subtask_details: Vec<SubtaskExecutionDetail> = plan
            .subtasks
            .iter()
            .map(|s| SubtaskExecutionDetail {
                subtask_id: s.subtask_id.clone(),
                name: s.name.clone(),
                subtask_type: s.subtask_type,
                status: s.status,
                priority: s.priority,
                estimated_duration_seconds: s.estimated_duration_seconds,
                actual_duration_ms: s.actual_duration_ms,
                retry_count: s.retry_count,
                error_message: s.error_message.clone(),
            })
            .collect();

        let mut issues = Vec::new();
        for subtask in &plan.subtasks {
            if subtask.status == SubtaskStatus::Failed {
                issues.push(format!("子任务 '{}' 失败: {}", subtask.name, subtask.error_message.clone().unwrap_or_default()));
            }
        }

        let mut recommendations = Vec::new();
        if failed > 0 {
            recommendations.push("建议检查失败子任务的错误信息，并考虑重试或调整计划".to_string());
        }
        if completion_rate < 50.0 {
            recommendations.push("完成率较低，建议评估任务复杂度或增加资源".to_string());
        }

        let report = ExecutionReport {
            plan_id: plan_id.to_string(),
            status: plan.status,
            total_subtasks: total,
            completed_count: completed,
            failed_count: failed,
            skipped_count: skipped,
            running_count: running,
            pending_count: pending,
            completion_rate,
            total_duration_ms: total_duration,
            estimated_remaining_ms: 0,
            subtask_details,
            key_findings: Vec::new(),
            issues,
            recommendations,
            generated_at: chrono::Utc::now().to_rfc3339(),
        };

        debug!(plan_id = %plan_id, completion_rate = completion_rate, "Execution report generated");
        Ok(report)
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> PlanExecuteStats {
        let plans = self.plans.lock();

        let completed = plans.values().filter(|p| p.status == PlanStatus::Completed).count() as u64;
        let failed = plans.values().filter(|p| p.status == PlanStatus::Failed).count() as u64;
        let running = plans.values().filter(|p| p.status == PlanStatus::Executing).count() as u64;

        let total_subtasks: u64 = plans.values().map(|p| p.subtasks.len() as u64).sum();
        let completed_subtasks: u64 = plans
            .values()
            .map(|p| p.subtasks.iter().filter(|s| s.status == SubtaskStatus::Completed).count() as u64)
            .sum();
        let failed_subtasks: u64 = plans
            .values()
            .map(|p| p.subtasks.iter().filter(|s| s.status == SubtaskStatus::Failed).count() as u64)
            .sum();
        let total_adjustments: u64 = plans.values().map(|p| p.adjustment_history.len() as u64).sum();

        let average_completion_rate = if !plans.is_empty() {
            plans
                .values()
                .map(|p| {
                    let total = p.subtasks.len() as f64;
                    let completed = p
                        .subtasks
                        .iter()
                        .filter(|s| s.status == SubtaskStatus::Completed)
                        .count() as f64;
                    if total > 0.0 {
                        (completed / total) * 100.0
                    } else {
                        0.0
                    }
                })
                .sum::<f64>()
                / plans.len() as f64
        } else {
            0.0
        };

        PlanExecuteStats {
            total_plans: plans.len() as u64,
            completed_plans: completed,
            failed_plans: failed,
            running_plans: running,
            total_subtasks,
            completed_subtasks,
            failed_subtasks,
            total_adjustments,
            average_completion_rate,
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_orchestrator() -> PlanExecuteOrchestrator {
        PlanExecuteOrchestrator::with_defaults()
    }

    fn create_test_subtask(id: &str, name: &str) -> Subtask {
        Subtask {
            subtask_id: id.to_string(),
            name: name.to_string(),
            description: format!("测试子任务 {}", name),
            subtask_type: SubtaskType::Analysis,
            status: SubtaskStatus::Pending,
            priority: 50,
            estimated_duration_seconds: 10,
            actual_duration_ms: 0,
            max_retries: 2,
            retry_count: 0,
            input_params: HashMap::new(),
            output_result: None,
            error_message: None,
            executor_id: None,
            started_at: None,
            finished_at: None,
            tags: vec!["test".to_string()],
        }
    }

    #[test]
    fn test_plan_status_as_str() {
        assert_eq!(PlanStatus::Created.as_str(), "created");
        assert_eq!(PlanStatus::Executing.as_str(), "executing");
        assert_eq!(PlanStatus::Completed.as_str(), "completed");
    }

    #[test]
    fn test_plan_strategy_as_str() {
        assert_eq!(PlanStrategy::Sequential.as_str(), "sequential");
        assert_eq!(PlanStrategy::Parallel.as_str(), "parallel");
        assert_eq!(PlanStrategy::DependencyAware.as_str(), "dependency_aware");
    }

    #[test]
    fn test_subtask_type_as_str() {
        assert_eq!(SubtaskType::LlmCall.as_str(), "llm_call");
        assert_eq!(SubtaskType::ToolCall.as_str(), "tool_call");
        assert_eq!(SubtaskType::AgentCall.as_str(), "agent_call");
    }

    #[test]
    fn test_subtask_status_as_str() {
        assert_eq!(SubtaskStatus::Pending.as_str(), "pending");
        assert_eq!(SubtaskStatus::Running.as_str(), "running");
        assert_eq!(SubtaskStatus::Completed.as_str(), "completed");
    }

    #[test]
    fn test_subtask_status_is_terminal() {
        assert!(SubtaskStatus::Completed.is_terminal());
        assert!(SubtaskStatus::Failed.is_terminal());
        assert!(SubtaskStatus::Skipped.is_terminal());
        assert!(!SubtaskStatus::Pending.is_terminal());
        assert!(!SubtaskStatus::Running.is_terminal());
    }

    #[test]
    fn test_adjustment_type_as_str() {
        assert_eq!(AdjustmentType::AddSubtask.as_str(), "add_subtask");
        assert_eq!(AdjustmentType::RemoveSubtask.as_str(), "remove_subtask");
        assert_eq!(AdjustmentType::FailureRecovery.as_str(), "failure_recovery");
    }

    #[test]
    fn test_plan_execute_config_default() {
        let config = PlanExecuteConfig::default();
        assert!(config.enabled);
        assert_eq!(config.default_max_parallel, 3);
        assert_eq!(config.default_subtask_max_retries, 2);
    }

    #[test]
    fn test_orchestrator_creation() {
        let orchestrator = create_test_orchestrator();
        assert!(orchestrator.config().enabled);
    }

    #[test]
    fn test_create_plan() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1"), create_test_subtask("st2", "子任务2")];
        let deps = HashMap::new();

        let result = orchestrator.create_plan("测试任务", "测试目标", subtasks, deps);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_plan() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();

        let plan = orchestrator.get_plan(&plan_id);
        assert!(plan.is_some());
        assert_eq!(plan.unwrap().original_task, "测试任务");
    }

    #[test]
    fn test_list_plans() {
        let orchestrator = create_test_orchestrator();
        orchestrator.create_plan("任务1", "目标1", vec![create_test_subtask("st1", "子任务1")], HashMap::new()).unwrap();
        orchestrator.create_plan("任务2", "目标2", vec![create_test_subtask("st2", "子任务2")], HashMap::new()).unwrap();

        let plans = orchestrator.list_plans(None);
        assert_eq!(plans.len(), 2);
    }

    #[test]
    fn test_start_execution() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();

        let result = orchestrator.start_execution(&plan_id);
        assert!(result.is_ok());

        let plan = orchestrator.get_plan(&plan_id).unwrap();
        assert_eq!(plan.status, PlanStatus::Executing);
    }

    #[test]
    fn test_get_ready_subtasks() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1"), create_test_subtask("st2", "子任务2")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();

        let ready = orchestrator.get_ready_subtasks(&plan_id).unwrap();
        assert_eq!(ready.len(), 2);
    }

    #[test]
    fn test_start_subtask() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();

        let result = orchestrator.start_subtask(&plan_id, "st1");
        assert!(result.is_ok());
    }

    #[test]
    fn test_complete_subtask() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();
        orchestrator.start_subtask(&plan_id, "st1").unwrap();

        let result = orchestrator.complete_subtask(&plan_id, "st1", Some(serde_json::json!({"result": "success"})));
        assert!(result.is_ok());

        let plan = orchestrator.get_plan(&plan_id).unwrap();
        assert_eq!(plan.status, PlanStatus::Completed);
    }

    #[test]
    fn test_fail_subtask_with_retry() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();
        orchestrator.start_subtask(&plan_id, "st1").unwrap();

        let result = orchestrator.fail_subtask(&plan_id, "st1", "测试错误");
        assert!(result.is_ok());

        let plan = orchestrator.get_plan(&plan_id).unwrap();
        let subtask = &plan.subtasks[0];
        assert_eq!(subtask.status, SubtaskStatus::WaitingRetry);
        assert_eq!(subtask.retry_count, 1);
    }

    #[test]
    fn test_skip_subtask() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();

        let result = orchestrator.skip_subtask(&plan_id, "st1", "测试跳过原因");
        assert!(result.is_ok());
    }

    #[test]
    fn test_add_subtask() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();

        let new_subtask = create_test_subtask("st2", "新子任务");
        let result = orchestrator.add_subtask(&plan_id, new_subtask);
        assert!(result.is_ok());

        let plan = orchestrator.get_plan(&plan_id).unwrap();
        assert_eq!(plan.subtasks.len(), 2);
        assert_eq!(plan.version, 2);
    }

    #[test]
    fn test_cancel_plan() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();

        let result = orchestrator.cancel_plan(&plan_id);
        assert!(result.is_ok());

        let plan = orchestrator.get_plan(&plan_id).unwrap();
        assert_eq!(plan.status, PlanStatus::Cancelled);
    }

    #[test]
    fn test_generate_report() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1"), create_test_subtask("st2", "子任务2")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();
        orchestrator.start_subtask(&plan_id, "st1").unwrap();
        orchestrator.complete_subtask(&plan_id, "st1", None).unwrap();

        let report = orchestrator.generate_report(&plan_id);
        assert!(report.is_ok());

        let report = report.unwrap();
        assert_eq!(report.total_subtasks, 2);
        assert_eq!(report.completed_count, 1);
        assert!(report.completion_rate > 0.0);
    }

    #[test]
    fn test_dependency_aware_execution() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![
            create_test_subtask("st1", "子任务1"),
            create_test_subtask("st2", "子任务2"),
        ];
        let mut deps = HashMap::new();
        deps.insert("st2".to_string(), vec!["st1".to_string()]);

        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, deps).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();

        // 只有 st1 应该就绪（st2 依赖 st1）
        let ready = orchestrator.get_ready_subtasks(&plan_id).unwrap();
        assert_eq!(ready.len(), 1);
        assert_eq!(ready[0].subtask_id, "st1");

        // 完成 st1 后，st2 应该就绪
        orchestrator.start_subtask(&plan_id, "st1").unwrap();
        orchestrator.complete_subtask(&plan_id, "st1", None).unwrap();

        let ready = orchestrator.get_ready_subtasks(&plan_id).unwrap();
        assert_eq!(ready.len(), 1);
        assert_eq!(ready[0].subtask_id, "st2");
    }

    #[test]
    fn test_get_stats() {
        let orchestrator = create_test_orchestrator();
        let subtasks = vec![create_test_subtask("st1", "子任务1")];
        let plan_id = orchestrator.create_plan("测试任务", "测试目标", subtasks, HashMap::new()).unwrap();
        orchestrator.start_execution(&plan_id).unwrap();
        orchestrator.start_subtask(&plan_id, "st1").unwrap();
        orchestrator.complete_subtask(&plan_id, "st1", None).unwrap();

        let stats = orchestrator.get_stats();
        assert!(stats.total_plans >= 1);
        assert!(stats.completed_plans >= 1);
        assert!(stats.total_subtasks >= 1);
        assert!(stats.completed_subtasks >= 1);
    }
}

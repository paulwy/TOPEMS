//! DSH AI Workflow Engine（DSH-native 工作流引擎）
//!
//! 提供工作流定义、节点执行、状态机驱动、版本管理、模板库等能力。

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

// ============================================================================
// 类型定义
// ============================================================================

/// 工作流定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    /// 工作流 ID
    pub id: String,
    /// 工作流名称
    pub name: String,
    /// 工作流描述
    pub description: String,
    /// 工作流版本
    pub version: String,
    /// 起始节点 ID
    pub start_node_id: String,
    /// 节点列表
    pub nodes: Vec<WorkflowNode>,
    /// 边（连接关系）
    pub edges: Vec<WorkflowEdge>,
    /// 输入参数定义
    pub input_schema: HashMap<String, ParameterDefinition>,
    /// 输出参数定义
    pub output_schema: HashMap<String, ParameterDefinition>,
    /// 全局变量
    pub global_vars: HashMap<String, serde_json::Value>,
    /// 超时时间（秒）
    pub timeout_seconds: u64,
    /// 最大重试次数
    pub max_retries: u32,
    /// 标签
    pub tags: Vec<String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 是否启用
    pub enabled: bool,
}

/// 参数定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterDefinition {
    /// 参数类型（string/number/boolean/object/array）
    pub param_type: String,
    /// 参数描述
    pub description: String,
    /// 是否必填
    pub required: bool,
    /// 默认值
    pub default_value: Option<serde_json::Value>,
    /// 枚举值（可选）
    pub enum_values: Option<Vec<serde_json::Value>>,
}

/// 工作流节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    /// 节点 ID
    pub id: String,
    /// 节点名称
    pub name: String,
    /// 节点类型
    pub node_type: NodeType,
    /// 节点配置
    pub config: NodeConfig,
    /// 输入映射（从上下文/全局变量映射到节点输入）
    pub input_mapping: HashMap<String, String>,
    /// 输出映射（从节点输出映射到上下文/全局变量）
    pub output_mapping: HashMap<String, String>,
    /// 超时时间（秒，None 表示使用工作流默认）
    pub timeout_seconds: Option<u64>,
    /// 最大重试次数（None 表示使用工作流默认）
    pub max_retries: Option<u32>,
    /// 错误处理策略
    pub error_strategy: ErrorStrategy,
    /// 节点描述
    pub description: String,
}

/// 节点类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeType {
    /// 起始节点
    Start,
    /// 结束节点
    End,
    /// LLM 调用节点
    LlmCall,
    /// 工具调用节点
    ToolCall,
    /// 条件分支节点
    Condition,
    /// 循环节点
    Loop,
    /// 并行节点
    Parallel,
    /// 变量赋值节点
    VariableAssignment,
    /// HTTP 请求节点
    HttpRequest,
    /// 等待节点
    Wait,
    /// 自定义节点
    Custom,
}

impl NodeType {
    pub fn as_str(&self) -> &str {
        match self {
            NodeType::Start => "start",
            NodeType::End => "end",
            NodeType::LlmCall => "llm_call",
            NodeType::ToolCall => "tool_call",
            NodeType::Condition => "condition",
            NodeType::Loop => "loop",
            NodeType::Parallel => "parallel",
            NodeType::VariableAssignment => "variable_assignment",
            NodeType::HttpRequest => "http_request",
            NodeType::Wait => "wait",
            NodeType::Custom => "custom",
        }
    }
}

/// 节点配置
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct NodeConfig {
    /// LLM 模型（LLM 调用节点）
    pub llm_model: Option<String>,
    /// LLM 提示词模板（LLM 调用节点）
    pub llm_prompt: Option<String>,
    /// LLM 温度参数
    pub llm_temperature: Option<f32>,
    /// LLM 最大 token 数
    pub llm_max_tokens: Option<u32>,
    /// 工具名称（工具调用节点）
    pub tool_name: Option<String>,
    /// 工具参数（工具调用节点）
    pub tool_params: Option<serde_json::Value>,
    /// 条件表达式（条件分支节点）
    pub condition_expression: Option<String>,
    /// 条件为真时的下一个节点 ID
    pub true_branch: Option<String>,
    /// 条件为假时的下一个节点 ID
    pub false_branch: Option<String>,
    /// 循环变量名（循环节点）
    pub loop_variable: Option<String>,
    /// 循环集合表达式（循环节点）
    pub loop_collection: Option<String>,
    /// 循环体节点 ID（循环节点）
    pub loop_body_node: Option<String>,
    /// 最大循环次数
    pub max_iterations: Option<u32>,
    /// 并行子节点 ID 列表（并行节点）
    pub parallel_nodes: Option<Vec<String>>,
    /// 变量赋值映射（变量赋值节点）
    pub assignments: Option<HashMap<String, String>>,
    /// HTTP URL（HTTP 请求节点）
    pub http_url: Option<String>,
    /// HTTP 方法
    pub http_method: Option<String>,
    /// HTTP 请求头
    pub http_headers: Option<HashMap<String, String>>,
    /// HTTP 请求体
    pub http_body: Option<String>,
    /// 等待时间（秒，等待节点）
    pub wait_seconds: Option<u64>,
    /// 自定义节点类型名称
    pub custom_type: Option<String>,
    /// 自定义配置
    pub custom_config: Option<serde_json::Value>,
}

/// 错误处理策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorStrategy {
    /// 停止工作流
    Stop,
    /// 重试
    Retry,
    /// 跳过继续
    Skip,
    /// 跳转到指定节点
    Goto,
    /// 使用默认值
    DefaultValue,
}

impl Default for ErrorStrategy {
    fn default() -> Self {
        ErrorStrategy::Stop
    }
}

/// 工作流边（连接关系）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    /// 边 ID
    pub id: String,
    /// 源节点 ID
    pub source_node_id: String,
    /// 目标节点 ID
    pub target_node_id: String,
    /// 条件表达式（可选，满足条件才走这条边）
    pub condition: Option<String>,
    /// 边标签
    pub label: Option<String>,
}

/// 工作流执行状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WorkflowExecutionStatus {
    /// 等待执行
    Pending,
    /// 执行中
    Running,
    /// 执行成功
    Completed,
    /// 执行失败
    Failed,
    /// 已取消
    Cancelled,
    /// 等待中（等待外部输入或事件）
    Waiting,
}

impl WorkflowExecutionStatus {
    pub fn as_str(&self) -> &str {
        match self {
            WorkflowExecutionStatus::Pending => "pending",
            WorkflowExecutionStatus::Running => "running",
            WorkflowExecutionStatus::Completed => "completed",
            WorkflowExecutionStatus::Failed => "failed",
            WorkflowExecutionStatus::Cancelled => "cancelled",
            WorkflowExecutionStatus::Waiting => "waiting",
        }
    }
}

/// 工作流执行实例
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecution {
    /// 执行实例 ID
    pub execution_id: String,
    /// 工作流 ID
    pub workflow_id: String,
    /// 工作流版本
    pub workflow_version: String,
    /// 执行状态
    pub status: WorkflowExecutionStatus,
    /// 当前节点 ID
    pub current_node_id: Option<String>,
    /// 已执行节点列表
    pub executed_nodes: Vec<ExecutedNode>,
    /// 执行上下文（变量存储）
    pub context: HashMap<String, serde_json::Value>,
    /// 输入参数
    pub input_params: HashMap<String, serde_json::Value>,
    /// 输出结果
    pub output_result: Option<serde_json::Value>,
    /// 错误信息
    pub error_message: Option<String>,
    /// 开始时间
    pub started_at: String,
    /// 结束时间
    pub finished_at: Option<String>,
    /// 总耗时（毫秒）
    pub duration_ms: u64,
    /// 重试次数
    pub retry_count: u32,
    /// 触发者
    pub triggered_by: String,
}

/// 已执行节点记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutedNode {
    /// 节点 ID
    pub node_id: String,
    /// 节点名称
    pub node_name: String,
    /// 节点类型
    pub node_type: NodeType,
    /// 执行状态
    pub status: NodeExecutionStatus,
    /// 开始时间
    pub started_at: String,
    /// 结束时间
    pub finished_at: String,
    /// 耗时（毫秒）
    pub duration_ms: u64,
    /// 重试次数
    pub retry_count: u32,
    /// 输入数据
    pub input_data: Option<serde_json::Value>,
    /// 输出数据
    pub output_data: Option<serde_json::Value>,
    /// 错误信息
    pub error_message: Option<String>,
}

/// 节点执行状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeExecutionStatus {
    /// 成功
    Success,
    /// 失败
    Failed,
    /// 跳过
    Skipped,
    /// 超时
    Timeout,
}

/// 工作流模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTemplate {
    /// 模板 ID
    pub template_id: String,
    /// 模板名称
    pub name: String,
    /// 模板描述
    pub description: String,
    /// 模板分类
    pub category: String,
    /// 工作流定义
    pub definition: WorkflowDefinition,
    /// 使用次数
    pub usage_count: u64,
    /// 是否为系统模板
    pub is_system: bool,
    /// 创建时间
    pub created_at: String,
}

/// 工作流引擎配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEngineConfig {
    /// 是否启用
    pub enabled: bool,
    /// 最大并发执行数
    pub max_concurrent_executions: usize,
    /// 默认超时时间（秒）
    pub default_timeout_seconds: u64,
    /// 默认最大重试次数
    pub default_max_retries: u32,
    /// 执行历史最大保留数
    pub max_execution_history: usize,
    /// 是否启用节点级超时
    pub enable_node_timeout: bool,
    /// 是否启用执行审计
    pub enable_audit: bool,
}

impl Default for WorkflowEngineConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_concurrent_executions: 100,
            default_timeout_seconds: 300,
            default_max_retries: 3,
            max_execution_history: 1000,
            enable_node_timeout: true,
            enable_audit: true,
        }
    }
}

/// 工作流引擎统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEngineStats {
    /// 工作流定义数
    pub total_workflows: u64,
    /// 启用的工作流数
    pub enabled_workflows: u64,
    /// 总执行次数
    pub total_executions: u64,
    /// 成功执行次数
    pub successful_executions: u64,
    /// 失败执行次数
    pub failed_executions: u64,
    /// 当前运行中的执行数
    pub running_executions: u64,
    /// 模板数
    pub total_templates: u64,
    /// 平均执行耗时（毫秒）
    pub average_duration_ms: u64,
}

// ============================================================================
// 工作流引擎
// ============================================================================

/// DSH-native 工作流引擎
#[derive(Clone)]
pub struct WorkflowEngine {
    /// 配置
    config: WorkflowEngineConfig,
    /// 工作流定义存储（工作流 ID -> 定义）
    workflows: Arc<Mutex<HashMap<String, WorkflowDefinition>>>,
    /// 工作流版本历史（工作流 ID -> 版本列表）
    version_history: Arc<Mutex<HashMap<String, Vec<WorkflowDefinition>>>>,
    /// 执行实例存储（执行 ID -> 实例）
    executions: Arc<Mutex<HashMap<String, WorkflowExecution>>>,
    /// 执行历史（按时间排序）
    execution_history: Arc<Mutex<VecDeque<String>>>,
    /// 模板库（模板 ID -> 模板）
    templates: Arc<Mutex<HashMap<String, WorkflowTemplate>>>,
}

use std::collections::VecDeque;

impl WorkflowEngine {
    /// 创建新的工作流引擎
    pub fn new(config: WorkflowEngineConfig) -> Self {
        let engine = Self {
            config,
            workflows: Arc::new(Mutex::new(HashMap::new())),
            version_history: Arc::new(Mutex::new(HashMap::new())),
            executions: Arc::new(Mutex::new(HashMap::new())),
            execution_history: Arc::new(Mutex::new(VecDeque::new())),
            templates: Arc::new(Mutex::new(HashMap::new())),
        };

        // 初始化默认模板
        engine.init_default_templates();

        engine
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(WorkflowEngineConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &WorkflowEngineConfig {
        &self.config
    }

    /// 初始化默认模板
    fn init_default_templates(&self) {
        // 简单的 LLM 问答模板
        let llm_qa_workflow = WorkflowDefinition {
            id: "template_llm_qa".to_string(),
            name: "LLM 问答工作流".to_string(),
            description: "简单的 LLM 问答工作流模板".to_string(),
            version: "1.0".to_string(),
            start_node_id: "start".to_string(),
            nodes: vec![
                WorkflowNode {
                    id: "start".to_string(),
                    name: "开始".to_string(),
                    node_type: NodeType::Start,
                    config: NodeConfig::default(),
                    input_mapping: HashMap::new(),
                    output_mapping: HashMap::new(),
                    timeout_seconds: None,
                    max_retries: None,
                    error_strategy: ErrorStrategy::Stop,
                    description: "工作流起始节点".to_string(),
                },
                WorkflowNode {
                    id: "llm_call".to_string(),
                    name: "LLM 调用".to_string(),
                    node_type: NodeType::LlmCall,
                    config: NodeConfig {
                        llm_model: Some("gpt-4".to_string()),
                        llm_prompt: Some("请回答以下问题：{{question}}".to_string()),
                        llm_temperature: Some(0.7),
                        llm_max_tokens: Some(2000),
                        ..Default::default()
                    },
                    input_mapping: HashMap::new(),
                    output_mapping: HashMap::new(),
                    timeout_seconds: Some(60),
                    max_retries: Some(2),
                    error_strategy: ErrorStrategy::Retry,
                    description: "调用 LLM 生成回答".to_string(),
                },
                WorkflowNode {
                    id: "end".to_string(),
                    name: "结束".to_string(),
                    node_type: NodeType::End,
                    config: NodeConfig::default(),
                    input_mapping: HashMap::new(),
                    output_mapping: HashMap::new(),
                    timeout_seconds: None,
                    max_retries: None,
                    error_strategy: ErrorStrategy::Stop,
                    description: "工作流结束节点".to_string(),
                },
            ],
            edges: vec![
                WorkflowEdge {
                    id: "edge1".to_string(),
                    source_node_id: "start".to_string(),
                    target_node_id: "llm_call".to_string(),
                    condition: None,
                    label: None,
                },
                WorkflowEdge {
                    id: "edge2".to_string(),
                    source_node_id: "llm_call".to_string(),
                    target_node_id: "end".to_string(),
                    condition: None,
                    label: None,
                },
            ],
            input_schema: HashMap::new(),
            output_schema: HashMap::new(),
            global_vars: HashMap::new(),
            timeout_seconds: 120,
            max_retries: 3,
            tags: vec!["llm".to_string(), "qa".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            enabled: true,
        };

        let template = WorkflowTemplate {
            template_id: "llm_qa".to_string(),
            name: "LLM 问答模板".to_string(),
            description: "简单的 LLM 问答工作流模板".to_string(),
            category: "ai".to_string(),
            definition: llm_qa_workflow,
            usage_count: 0,
            is_system: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        self.templates.lock().insert(template.template_id.clone(), template);
        info!("Default workflow templates initialized");
    }

    /// 注册工作流
    pub fn register_workflow(&self, definition: WorkflowDefinition) -> Result<String, String> {
        if !self.config.enabled {
            return Err("工作流引擎未启用".to_string());
        }

        let workflow_id = definition.id.clone();
        let version = definition.version.clone();

        // 验证工作流定义
        self.validate_workflow(&definition)?;

        // 保存版本历史
        let mut version_history = self.version_history.lock();
        version_history
            .entry(workflow_id.clone())
            .or_insert_with(Vec::new)
            .push(definition.clone());
        drop(version_history);

        // 保存当前版本
        self.workflows.lock().insert(workflow_id.clone(), definition);

        info!(
            workflow_id = %workflow_id,
            version = %version,
            "Workflow registered"
        );

        Ok(workflow_id)
    }

    /// 验证工作流定义
    fn validate_workflow(&self, definition: &WorkflowDefinition) -> Result<(), String> {
        if definition.id.is_empty() {
            return Err("工作流 ID 不能为空".to_string());
        }
        if definition.name.is_empty() {
            return Err("工作流名称不能为空".to_string());
        }
        if definition.nodes.is_empty() {
            return Err("工作流至少需要一个节点".to_string());
        }

        // 检查起始节点是否存在
        let has_start = definition.nodes.iter().any(|n| n.node_type == NodeType::Start);
        if !has_start {
            return Err("工作流必须包含一个起始节点".to_string());
        }

        // 检查节点 ID 唯一性
        let mut node_ids = std::collections::HashSet::new();
        for node in &definition.nodes {
            if !node_ids.insert(node.id.clone()) {
                return Err(format!("节点 ID 重复: {}", node.id));
            }
        }

        Ok(())
    }

    /// 获取工作流定义
    pub fn get_workflow(&self, workflow_id: &str) -> Option<WorkflowDefinition> {
        self.workflows.lock().get(workflow_id).cloned()
    }

    /// 获取工作流版本历史
    pub fn get_version_history(&self, workflow_id: &str) -> Vec<WorkflowDefinition> {
        self.version_history
            .lock()
            .get(workflow_id)
            .cloned()
            .unwrap_or_default()
    }

    /// 列出所有工作流
    pub fn list_workflows(&self, tag_filter: Option<&str>) -> Vec<WorkflowDefinition> {
        let workflows = self.workflows.lock();
        let mut result: Vec<WorkflowDefinition> = if let Some(tag) = tag_filter {
            workflows
                .values()
                .filter(|w| w.tags.contains(&tag.to_string()))
                .cloned()
                .collect()
        } else {
            workflows.values().cloned().collect()
        };
        result.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        result
    }

    /// 删除工作流
    pub fn delete_workflow(&self, workflow_id: &str) -> bool {
        let removed = self.workflows.lock().remove(workflow_id).is_some();
        if removed {
            self.version_history.lock().remove(workflow_id);
            info!(workflow_id = %workflow_id, "Workflow deleted");
        }
        removed
    }

    /// 执行工作流（同步模拟执行）
    pub fn execute_workflow(
        &self,
        workflow_id: &str,
        input_params: HashMap<String, serde_json::Value>,
        triggered_by: &str,
    ) -> Result<WorkflowExecution, String> {
        if !self.config.enabled {
            return Err("工作流引擎未启用".to_string());
        }

        let workflow = self
            .get_workflow(workflow_id)
            .ok_or_else(|| format!("工作流 {} 不存在", workflow_id))?;

        if !workflow.enabled {
            return Err(format!("工作流 {} 未启用", workflow_id));
        }

        let execution_id = format!("exec_{}", uuid::Uuid::new_v4());
        let start_time = Instant::now();

        let mut execution = WorkflowExecution {
            execution_id: execution_id.clone(),
            workflow_id: workflow_id.to_string(),
            workflow_version: workflow.version.clone(),
            status: WorkflowExecutionStatus::Running,
            current_node_id: Some(workflow.start_node_id.clone()),
            executed_nodes: Vec::new(),
            context: workflow.global_vars.clone(),
            input_params: input_params.clone(),
            output_result: None,
            error_message: None,
            started_at: chrono::Utc::now().to_rfc3339(),
            finished_at: None,
            duration_ms: 0,
            retry_count: 0,
            triggered_by: triggered_by.to_string(),
        };

        // 将输入参数加入上下文
        for (key, value) in &input_params {
            execution.context.insert(key.clone(), value.clone());
        }

        // 模拟执行节点（实际实现中会异步执行）
        let node_map: HashMap<String, &WorkflowNode> =
            workflow.nodes.iter().map(|n| (n.id.clone(), n)).collect();

        let mut current_node_id = workflow.start_node_id.clone();
        let max_steps = 100; // 防止无限循环
        let mut step = 0;

        while step < max_steps {
            step += 1;

            let node = match node_map.get(&current_node_id) {
                Some(n) => n,
                None => {
                    execution.status = WorkflowExecutionStatus::Failed;
                    execution.error_message = Some(format!("节点 {} 不存在", current_node_id));
                    break;
                }
            };

            // 执行节点
            let node_result = self.execute_node(node, &mut execution);

            let (status, output_data, error_message) = match node_result {
                Ok(output) => (NodeExecutionStatus::Success, Some(output), None),
                Err(err) => (NodeExecutionStatus::Failed, None, Some(err)),
            };

            let executed_node = ExecutedNode {
                node_id: node.id.clone(),
                node_name: node.name.clone(),
                node_type: node.node_type,
                status,
                started_at: chrono::Utc::now().to_rfc3339(),
                finished_at: chrono::Utc::now().to_rfc3339(),
                duration_ms: 1,
                retry_count: 0,
                input_data: None,
                output_data,
                error_message,
            };

            execution.executed_nodes.push(executed_node);

            // 检查是否为结束节点
            if node.node_type == NodeType::End {
                execution.status = WorkflowExecutionStatus::Completed;
                break;
            }

            // 查找下一个节点
            let next_edges: Vec<&WorkflowEdge> = workflow
                .edges
                .iter()
                .filter(|e| e.source_node_id == current_node_id)
                .collect();

            if next_edges.is_empty() {
                execution.status = WorkflowExecutionStatus::Completed;
                break;
            }

            // 简单选择第一条边（实际实现中会根据条件选择）
            current_node_id = next_edges[0].target_node_id.clone();
            execution.current_node_id = Some(current_node_id.clone());
        }

        if step >= max_steps {
            execution.status = WorkflowExecutionStatus::Failed;
            execution.error_message = Some("工作流执行步数超过上限".to_string());
        }

        execution.finished_at = Some(chrono::Utc::now().to_rfc3339());
        execution.duration_ms = start_time.elapsed().as_millis() as u64;

        // 保存执行实例
        let mut executions = self.executions.lock();
        executions.insert(execution_id.clone(), execution.clone());
        drop(executions);

        // 更新执行历史
        let mut history = self.execution_history.lock();
        history.push_back(execution_id.clone());
        if history.len() > self.config.max_execution_history {
            if let Some(old_id) = history.pop_front() {
                self.executions.lock().remove(&old_id);
            }
        }
        drop(history);

        info!(
            execution_id = %execution_id,
            workflow_id = %workflow_id,
            status = %execution.status.as_str(),
            duration_ms = execution.duration_ms,
            "Workflow execution completed"
        );

        Ok(execution)
    }

    /// 执行单个节点
    fn execute_node(
        &self,
        node: &WorkflowNode,
        execution: &mut WorkflowExecution,
    ) -> Result<serde_json::Value, String> {
        match node.node_type {
            NodeType::Start => {
                debug!(node_id = %node.id, "Start node executed");
                Ok(serde_json::Value::Null)
            }
            NodeType::End => {
                // 设置输出结果
                if let Some(output_expr) = node.output_mapping.get("result") {
                    if let Some(value) = execution.context.get(output_expr) {
                        execution.output_result = Some(value.clone());
                    }
                }
                debug!(node_id = %node.id, "End node executed");
                Ok(serde_json::Value::Null)
            }
            NodeType::LlmCall => {
                // 模拟 LLM 调用（实际实现中会调用 LLM Provider）
                let prompt = node
                    .config
                    .llm_prompt
                    .clone()
                    .unwrap_or_else(|| "默认提示词".to_string());

                // 简单的变量替换
                let mut rendered_prompt = prompt;
                for (key, value) in &execution.context {
                    if let Some(str_value) = value.as_str() {
                        rendered_prompt =
                            rendered_prompt.replace(&format!("{{{{{}}}}}", key), str_value);
                    }
                }

                let result = serde_json::json!({
                    "response": format!("LLM 响应（模拟）: {}", rendered_prompt),
                    "model": node.config.llm_model.clone().unwrap_or_else(|| "default".to_string()),
                    "usage": {
                        "prompt_tokens": 100,
                        "completion_tokens": 50,
                        "total_tokens": 150
                    }
                });

                // 将结果加入上下文
                execution
                    .context
                    .insert("llm_response".to_string(), result.clone());

                debug!(node_id = %node.id, "LLM call node executed (simulated)");
                Ok(result)
            }
            NodeType::ToolCall => {
                let tool_name = node
                    .config
                    .tool_name
                    .clone()
                    .unwrap_or_else(|| "unknown_tool".to_string());

                let result = serde_json::json!({
                    "tool": tool_name,
                    "result": "工具调用成功（模拟）",
                    "success": true
                });

                execution
                    .context
                    .insert("tool_result".to_string(), result.clone());

                debug!(node_id = %node.id, tool_name = %tool_name, "Tool call node executed (simulated)");
                Ok(result)
            }
            NodeType::Condition => {
                // 简单条件评估（实际实现中会使用表达式引擎）
                let condition = node
                    .config
                    .condition_expression
                    .clone()
                    .unwrap_or_else(|| "true".to_string());

                let result = serde_json::json!({
                    "condition": condition,
                    "result": true,
                    "branch": "true"
                });

                debug!(node_id = %node.id, condition = %condition, "Condition node executed");
                Ok(result)
            }
            NodeType::VariableAssignment => {
                // 变量赋值
                if let Some(assignments) = &node.config.assignments {
                    for (var_name, expr) in assignments {
                        if let Some(value) = execution.context.get(expr) {
                            execution.context.insert(var_name.clone(), value.clone());
                        } else {
                            execution.context.insert(
                                var_name.clone(),
                                serde_json::Value::String(expr.clone()),
                            );
                        }
                    }
                }

                debug!(node_id = %node.id, "Variable assignment node executed");
                Ok(serde_json::Value::Null)
            }
            NodeType::Wait => {
                let wait_seconds = node.config.wait_seconds.unwrap_or(1);
                debug!(node_id = %node.id, wait_seconds = wait_seconds, "Wait node executed (simulated)");
                Ok(serde_json::json!({ "waited_seconds": wait_seconds }))
            }
            _ => {
                debug!(node_id = %node.id, node_type = %node.node_type.as_str(), "Node executed (default)");
                Ok(serde_json::Value::Null)
            }
        }
    }

    /// 获取执行实例
    pub fn get_execution(&self, execution_id: &str) -> Option<WorkflowExecution> {
        self.executions.lock().get(execution_id).cloned()
    }

    /// 列出执行实例
    pub fn list_executions(
        &self,
        workflow_id_filter: Option<&str>,
        status_filter: Option<WorkflowExecutionStatus>,
    ) -> Vec<WorkflowExecution> {
        let executions = self.executions.lock();
        let mut result: Vec<WorkflowExecution> = executions
            .values()
            .filter(|e| {
                if let Some(wf_id) = workflow_id_filter {
                    if e.workflow_id != wf_id {
                        return false;
                    }
                }
                if let Some(status) = status_filter {
                    if e.status != status {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        result.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        result
    }

    /// 取消执行
    pub fn cancel_execution(&self, execution_id: &str) -> Result<(), String> {
        let mut executions = self.executions.lock();
        let execution = executions
            .get_mut(execution_id)
            .ok_or_else(|| format!("执行实例 {} 不存在", execution_id))?;

        if execution.status == WorkflowExecutionStatus::Running
            || execution.status == WorkflowExecutionStatus::Pending
        {
            execution.status = WorkflowExecutionStatus::Cancelled;
            execution.finished_at = Some(chrono::Utc::now().to_rfc3339());
            info!(execution_id = %execution_id, "Workflow execution cancelled");
            Ok(())
        } else {
            Err(format!("执行实例 {} 状态为 {}，无法取消", execution_id, execution.status.as_str()))
        }
    }

    /// 获取模板
    pub fn get_template(&self, template_id: &str) -> Option<WorkflowTemplate> {
        self.templates.lock().get(template_id).cloned()
    }

    /// 列出模板
    pub fn list_templates(&self, category_filter: Option<&str>) -> Vec<WorkflowTemplate> {
        let templates = self.templates.lock();
        let mut result: Vec<WorkflowTemplate> = if let Some(category) = category_filter {
            templates
                .values()
                .filter(|t| t.category == category)
                .cloned()
                .collect()
        } else {
            templates.values().cloned().collect()
        };
        result.sort_by(|a, b| b.usage_count.cmp(&a.usage_count));
        result
    }

    /// 从模板创建工作流
    pub fn create_from_template(
        &self,
        template_id: &str,
        new_workflow_id: &str,
        new_name: &str,
    ) -> Result<String, String> {
        let mut templates = self.templates.lock();
        let template = templates
            .get_mut(template_id)
            .ok_or_else(|| format!("模板 {} 不存在", template_id))?;

        template.usage_count += 1;

        let mut definition = template.definition.clone();
        definition.id = new_workflow_id.to_string();
        definition.name = new_name.to_string();
        definition.created_at = chrono::Utc::now().to_rfc3339();
        definition.updated_at = chrono::Utc::now().to_rfc3339();

        drop(templates);

        self.register_workflow(definition)
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> WorkflowEngineStats {
        let workflows = self.workflows.lock();
        let executions = self.executions.lock();
        let templates = self.templates.lock();

        let enabled_workflows = workflows.values().filter(|w| w.enabled).count() as u64;
        let successful_executions = executions
            .values()
            .filter(|e| e.status == WorkflowExecutionStatus::Completed)
            .count() as u64;
        let failed_executions = executions
            .values()
            .filter(|e| e.status == WorkflowExecutionStatus::Failed)
            .count() as u64;
        let running_executions = executions
            .values()
            .filter(|e| e.status == WorkflowExecutionStatus::Running)
            .count() as u64;

        let total_duration: u64 = executions.values().map(|e| e.duration_ms).sum();
        let average_duration_ms = if !executions.is_empty() {
            total_duration / executions.len() as u64
        } else {
            0
        };

        WorkflowEngineStats {
            total_workflows: workflows.len() as u64,
            enabled_workflows,
            total_executions: executions.len() as u64,
            successful_executions,
            failed_executions,
            running_executions,
            total_templates: templates.len() as u64,
            average_duration_ms,
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_engine() -> WorkflowEngine {
        WorkflowEngine::with_defaults()
    }

    fn create_test_workflow(id: &str, name: &str) -> WorkflowDefinition {
        WorkflowDefinition {
            id: id.to_string(),
            name: name.to_string(),
            description: format!("测试工作流 {}", name),
            version: "1.0".to_string(),
            start_node_id: "start".to_string(),
            nodes: vec![
                WorkflowNode {
                    id: "start".to_string(),
                    name: "开始".to_string(),
                    node_type: NodeType::Start,
                    config: NodeConfig::default(),
                    input_mapping: HashMap::new(),
                    output_mapping: HashMap::new(),
                    timeout_seconds: None,
                    max_retries: None,
                    error_strategy: ErrorStrategy::Stop,
                    description: "开始节点".to_string(),
                },
                WorkflowNode {
                    id: "llm_call".to_string(),
                    name: "LLM 调用".to_string(),
                    node_type: NodeType::LlmCall,
                    config: NodeConfig {
                        llm_model: Some("test-model".to_string()),
                        llm_prompt: Some("测试提示词".to_string()),
                        ..Default::default()
                    },
                    input_mapping: HashMap::new(),
                    output_mapping: HashMap::new(),
                    timeout_seconds: Some(30),
                    max_retries: Some(2),
                    error_strategy: ErrorStrategy::Retry,
                    description: "LLM 调用节点".to_string(),
                },
                WorkflowNode {
                    id: "end".to_string(),
                    name: "结束".to_string(),
                    node_type: NodeType::End,
                    config: NodeConfig::default(),
                    input_mapping: HashMap::new(),
                    output_mapping: HashMap::new(),
                    timeout_seconds: None,
                    max_retries: None,
                    error_strategy: ErrorStrategy::Stop,
                    description: "结束节点".to_string(),
                },
            ],
            edges: vec![
                WorkflowEdge {
                    id: "edge1".to_string(),
                    source_node_id: "start".to_string(),
                    target_node_id: "llm_call".to_string(),
                    condition: None,
                    label: None,
                },
                WorkflowEdge {
                    id: "edge2".to_string(),
                    source_node_id: "llm_call".to_string(),
                    target_node_id: "end".to_string(),
                    condition: None,
                    label: None,
                },
            ],
            input_schema: HashMap::new(),
            output_schema: HashMap::new(),
            global_vars: HashMap::new(),
            timeout_seconds: 120,
            max_retries: 3,
            tags: vec!["test".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            enabled: true,
        }
    }

    #[test]
    fn test_node_type_as_str() {
        assert_eq!(NodeType::Start.as_str(), "start");
        assert_eq!(NodeType::End.as_str(), "end");
        assert_eq!(NodeType::LlmCall.as_str(), "llm_call");
        assert_eq!(NodeType::ToolCall.as_str(), "tool_call");
    }

    #[test]
    fn test_workflow_execution_status_as_str() {
        assert_eq!(WorkflowExecutionStatus::Pending.as_str(), "pending");
        assert_eq!(WorkflowExecutionStatus::Running.as_str(), "running");
        assert_eq!(WorkflowExecutionStatus::Completed.as_str(), "completed");
        assert_eq!(WorkflowExecutionStatus::Failed.as_str(), "failed");
    }

    #[test]
    fn test_error_strategy_default() {
        assert_eq!(ErrorStrategy::default(), ErrorStrategy::Stop);
    }

    #[test]
    fn test_workflow_engine_config_default() {
        let config = WorkflowEngineConfig::default();
        assert!(config.enabled);
        assert_eq!(config.max_concurrent_executions, 100);
        assert_eq!(config.default_timeout_seconds, 300);
    }

    #[test]
    fn test_engine_creation() {
        let engine = create_test_engine();
        assert!(engine.config().enabled);
    }

    #[test]
    fn test_register_workflow() {
        let engine = create_test_engine();
        let workflow = create_test_workflow("wf1", "测试工作流");
        let result = engine.register_workflow(workflow);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "wf1");
    }

    #[test]
    fn test_register_invalid_workflow() {
        let engine = create_test_engine();
        let mut workflow = create_test_workflow("wf1", "测试工作流");
        workflow.id = "".to_string(); // 空 ID
        let result = engine.register_workflow(workflow);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_workflow() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "测试工作流")).unwrap();

        let workflow = engine.get_workflow("wf1");
        assert!(workflow.is_some());
        assert_eq!(workflow.unwrap().name, "测试工作流");
    }

    #[test]
    fn test_list_workflows() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "工作流1")).unwrap();
        engine.register_workflow(create_test_workflow("wf2", "工作流2")).unwrap();

        let workflows = engine.list_workflows(None);
        assert_eq!(workflows.len(), 2);
    }

    #[test]
    fn test_list_workflows_by_tag() {
        let engine = create_test_engine();
        let mut wf1 = create_test_workflow("wf1", "工作流1");
        wf1.tags = vec!["test".to_string()];
        engine.register_workflow(wf1).unwrap();

        let mut wf2 = create_test_workflow("wf2", "工作流2");
        wf2.tags = vec!["production".to_string()];
        engine.register_workflow(wf2).unwrap();

        let test_workflows = engine.list_workflows(Some("test"));
        assert_eq!(test_workflows.len(), 1);
        assert_eq!(test_workflows[0].id, "wf1");
    }

    #[test]
    fn test_delete_workflow() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "测试工作流")).unwrap();

        assert!(engine.delete_workflow("wf1"));
        assert!(engine.get_workflow("wf1").is_none());
    }

    #[test]
    fn test_execute_workflow() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "测试工作流")).unwrap();

        let mut input_params = HashMap::new();
        input_params.insert("question".to_string(), serde_json::json!("测试问题"));

        let execution = engine.execute_workflow("wf1", input_params, "test_user");
        assert!(execution.is_ok());

        let execution = execution.unwrap();
        assert_eq!(execution.status, WorkflowExecutionStatus::Completed);
        assert_eq!(execution.executed_nodes.len(), 3); // start, llm_call, end
        assert!(execution.duration_ms >= 0);
    }

    #[test]
    fn test_execute_nonexistent_workflow() {
        let engine = create_test_engine();
        let result = engine.execute_workflow("nonexistent", HashMap::new(), "test_user");
        assert!(result.is_err());
    }

    #[test]
    fn test_get_execution() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "测试工作流")).unwrap();

        let execution = engine
            .execute_workflow("wf1", HashMap::new(), "test_user")
            .unwrap();

        let retrieved = engine.get_execution(&execution.execution_id);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().workflow_id, "wf1");
    }

    #[test]
    fn test_list_executions() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "测试工作流")).unwrap();

        engine.execute_workflow("wf1", HashMap::new(), "user1").unwrap();
        engine.execute_workflow("wf1", HashMap::new(), "user2").unwrap();

        let executions = engine.list_executions(None, None);
        assert_eq!(executions.len(), 2);
    }

    #[test]
    fn test_list_executions_by_workflow() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "工作流1")).unwrap();
        engine.register_workflow(create_test_workflow("wf2", "工作流2")).unwrap();

        engine.execute_workflow("wf1", HashMap::new(), "user1").unwrap();
        engine.execute_workflow("wf2", HashMap::new(), "user1").unwrap();

        let wf1_executions = engine.list_executions(Some("wf1"), None);
        assert_eq!(wf1_executions.len(), 1);
    }

    #[test]
    fn test_version_history() {
        let engine = create_test_engine();

        let mut v1 = create_test_workflow("wf1", "工作流 v1");
        v1.version = "1.0".to_string();
        engine.register_workflow(v1).unwrap();

        let mut v2 = create_test_workflow("wf1", "工作流 v2");
        v2.version = "2.0".to_string();
        engine.register_workflow(v2).unwrap();

        let history = engine.get_version_history("wf1");
        assert_eq!(history.len(), 2);
    }

    #[test]
    fn test_default_templates() {
        let engine = create_test_engine();
        let templates = engine.list_templates(None);
        assert!(!templates.is_empty());
    }

    #[test]
    fn test_create_from_template() {
        let engine = create_test_engine();
        let result = engine.create_from_template("llm_qa", "new_wf", "新工作流");
        assert!(result.is_ok());
        assert!(engine.get_workflow("new_wf").is_some());
    }

    #[test]
    fn test_get_stats() {
        let engine = create_test_engine();
        engine.register_workflow(create_test_workflow("wf1", "测试工作流")).unwrap();
        engine.execute_workflow("wf1", HashMap::new(), "test_user").unwrap();

        let stats = engine.get_stats();
        assert!(stats.total_workflows >= 1);
        assert!(stats.total_executions >= 1);
        assert!(stats.successful_executions >= 1);
        assert!(stats.total_templates >= 1);
    }
}

//! DSH AI 多 Agent 协作模块
//!
//! 提供多 Agent 协作能力，包括：
//! - Agent 之间的消息传递
//! - 任务分解和分配
//! - 结果汇总和整合
//! - 主从模式（Master-Worker）
//! - 协作模式（Peer-to-Peer）
//! - Agent 角色和能力定义

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tracing::info;

use crate::dsh::agent::{AgentExecuteRequest, AgentOrchestrator};

// ============================================================================
// 类型定义
// ============================================================================

/// Agent 角色
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentRole {
    /// 协调者（负责任务分解和结果汇总）
    Coordinator,
    /// 专家（负责特定领域的任务）
    Specialist,
    /// 执行者（负责具体任务执行）
    Worker,
    /// 审核者（负责结果审核和质量控制）
    Reviewer,
    /// 通用角色
    General,
}

impl AgentRole {
    /// 获取角色名称
    pub fn as_str(&self) -> &'static str {
        match self {
            AgentRole::Coordinator => "coordinator",
            AgentRole::Specialist => "specialist",
            AgentRole::Worker => "worker",
            AgentRole::Reviewer => "reviewer",
            AgentRole::General => "general",
        }
    }
}

/// Agent 能力描述
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCapability {
    /// 能力名称
    pub name: String,
    /// 能力描述
    pub description: String,
    /// 能力标签（用于任务匹配）
    pub tags: Vec<String>,
    /// 能力评分（0-1，越高越擅长）
    pub proficiency: f64,
}

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// Agent ID
    pub agent_id: String,
    /// Agent 名称
    pub name: String,
    /// Agent 角色
    pub role: AgentRole,
    /// Agent 描述
    pub description: String,
    /// Agent 能力列表
    pub capabilities: Vec<AgentCapability>,
    /// 最大并发任务数
    pub max_concurrent_tasks: usize,
    /// 任务超时时间（秒）
    pub task_timeout_secs: u64,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            agent_id: uuid::Uuid::new_v4().to_string(),
            name: "Agent".to_string(),
            role: AgentRole::General,
            description: "通用 Agent".to_string(),
            capabilities: Vec::new(),
            max_concurrent_tasks: 5,
            task_timeout_secs: 60,
        }
    }
}

/// 任务状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskStatus {
    /// 待处理
    Pending,
    /// 已分配
    Assigned,
    /// 执行中
    Running,
    /// 已完成
    Completed,
    /// 失败
    Failed,
    /// 已取消
    Cancelled,
    /// 超时
    Timeout,
}

impl TaskStatus {
    /// 获取状态名称
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskStatus::Pending => "pending",
            TaskStatus::Assigned => "assigned",
            TaskStatus::Running => "running",
            TaskStatus::Completed => "completed",
            TaskStatus::Failed => "failed",
            TaskStatus::Cancelled => "cancelled",
            TaskStatus::Timeout => "timeout",
        }
    }
}

/// 任务定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDefinition {
    /// 任务 ID
    pub task_id: String,
    /// 任务名称
    pub name: String,
    /// 任务描述
    pub description: String,
    /// 任务类型（用于 Agent 匹配）
    pub task_type: String,
    /// 任务标签（用于能力匹配）
    pub tags: Vec<String>,
    /// 任务优先级（0-10，越高越优先）
    pub priority: u8,
    /// 任务输入
    pub input: serde_json::Value,
    /// 父任务 ID（如果是子任务）
    pub parent_task_id: Option<String>,
    /// 子任务 ID 列表
    pub subtask_ids: Vec<String>,
    /// 任务状态
    pub status: TaskStatus,
    /// 分配的 Agent ID
    pub assigned_agent_id: Option<String>,
    /// 创建时间
    pub created_at: String,
    /// 开始时间
    pub started_at: Option<String>,
    /// 完成时间
    pub completed_at: Option<String>,
    /// 任务结果
    pub result: Option<serde_json::Value>,
    /// 错误信息
    pub error: Option<String>,
}

impl TaskDefinition {
    /// 创建新任务
    pub fn new(name: &str, description: &str, task_type: &str, input: serde_json::Value) -> Self {
        Self {
            task_id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            description: description.to_string(),
            task_type: task_type.to_string(),
            tags: Vec::new(),
            priority: 5,
            input,
            parent_task_id: None,
            subtask_ids: Vec::new(),
            status: TaskStatus::Pending,
            assigned_agent_id: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            started_at: None,
            completed_at: None,
            result: None,
            error: None,
        }
    }
}

/// Agent 间消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    /// 消息 ID
    pub message_id: String,
    /// 发送者 Agent ID
    pub sender_id: String,
    /// 接收者 Agent ID
    pub receiver_id: String,
    /// 消息类型
    pub message_type: MessageType,
    /// 消息内容
    pub content: serde_json::Value,
    /// 关联的任务 ID
    pub task_id: Option<String>,
    /// 时间戳
    pub timestamp: String,
}

/// 消息类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MessageType {
    /// 任务分配
    TaskAssignment,
    /// 任务结果
    TaskResult,
    /// 任务请求
    TaskRequest,
    /// 状态查询
    StatusQuery,
    /// 状态更新
    StatusUpdate,
    /// 协作请求
    CollaborationRequest,
    /// 协作响应
    CollaborationResponse,
    /// 通知
    Notification,
    /// 错误
    Error,
    /// 通用消息
    General,
}

/// 协作模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CollaborationMode {
    /// 主从模式（一个协调者，多个执行者）
    MasterWorker,
    /// 对等模式（Agent 之间平等协作）
    PeerToPeer,
    /// 流水线模式（任务按顺序传递）
    Pipeline,
    /// 投票模式（多个 Agent 投票决策）
    Voting,
}

/// 协作组配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationGroupConfig {
    /// 组 ID
    pub group_id: String,
    /// 组名称
    pub name: String,
    /// 协作模式
    pub mode: CollaborationMode,
    /// 协调者 Agent ID（主从模式）
    pub coordinator_id: Option<String>,
    /// 成员 Agent ID 列表
    pub member_ids: Vec<String>,
    /// 最大任务数
    pub max_tasks: usize,
    /// 任务超时时间（秒）
    pub task_timeout_secs: u64,
}

/// 协作组统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationGroupStats {
    /// 组 ID
    pub group_id: String,
    /// 总任务数
    pub total_tasks: u64,
    /// 已完成任务数
    pub completed_tasks: u64,
    /// 失败任务数
    pub failed_tasks: u64,
    /// 进行中任务数
    pub running_tasks: u64,
    /// 待处理任务数
    pub pending_tasks: u64,
    /// 平均任务耗时（毫秒）
    pub avg_task_duration_ms: f64,
    /// 成功率（0-1）
    pub success_rate: f64,
}

// ============================================================================
// Agent 运行时实例
// ============================================================================

/// Agent 运行时实例
pub struct AgentRuntime {
    /// Agent 配置
    config: AgentConfig,
    /// Agent 编排器
    orchestrator: AgentOrchestrator,
    /// 当前任务数
    current_tasks: Arc<Mutex<usize>>,
    /// 消息接收通道
    message_receiver: Arc<Mutex<Option<mpsc::UnboundedReceiver<AgentMessage>>>>,
    /// 消息发送通道（用于发送消息给其他 Agent）
    message_senders: Arc<Mutex<HashMap<String, mpsc::UnboundedSender<AgentMessage>>>>,
}

impl AgentRuntime {
    /// 创建新的 Agent 运行时
    pub fn new(config: AgentConfig, orchestrator: AgentOrchestrator) -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        let mut senders = HashMap::new();
        senders.insert(config.agent_id.clone(), sender);

        Self {
            config,
            orchestrator,
            current_tasks: Arc::new(Mutex::new(0)),
            message_receiver: Arc::new(Mutex::new(Some(receiver))),
            message_senders: Arc::new(Mutex::new(senders)),
        }
    }

    /// 获取 Agent ID
    pub fn agent_id(&self) -> &str {
        &self.config.agent_id
    }

    /// 获取 Agent 配置
    pub fn config(&self) -> &AgentConfig {
        &self.config
    }

    /// 获取 Agent 编排器
    pub fn orchestrator(&self) -> &AgentOrchestrator {
        &self.orchestrator
    }

    /// 检查是否可以接受新任务
    pub fn can_accept_task(&self) -> bool {
        let current = *self.current_tasks.lock();
        current < self.config.max_concurrent_tasks
    }

    /// 执行任务
    pub async fn execute_task(&self, task: &TaskDefinition) -> Result<serde_json::Value, String> {
        // 增加当前任务数
        {
            let mut current = self.current_tasks.lock();
            *current += 1;
        }

        let result = self.do_execute(task).await;

        // 减少当前任务数
        {
            let mut current = self.current_tasks.lock();
            *current = current.saturating_sub(1);
        }

        result
    }

    /// 实际执行任务
    async fn do_execute(&self, task: &TaskDefinition) -> Result<serde_json::Value, String> {
        info!(
            agent_id = %self.config.agent_id,
            task_id = %task.task_id,
            task_name = %task.name,
            "Agent executing task"
        );

        // 构建 Agent 请求
        let query = if let Some(q) = task.input.get("query").and_then(|v| v.as_str()) {
            q.to_string()
        } else {
            task.description.clone()
        };

        let request = AgentExecuteRequest {
            query,
            session_id: Some(format!("{}-{}", self.config.agent_id, task.task_id)),
            available_tools: None,
            max_iterations: Some(5),
            stream: Some(false),
            context_variables: None,
        };

        // 执行 Agent
        let response = self.orchestrator.execute(request).await;

        if response.success {
            Ok(serde_json::json!({
                "answer": response.answer,
                "steps": response.steps.len(),
                "tools_used": response.tools_used,
                "duration_ms": response.total_duration_ms,
            }))
        } else {
            Err(response
                .error
                .unwrap_or_else(|| "Unknown error".to_string()))
        }
    }

    /// 发送消息给另一个 Agent
    pub fn send_message(
        &self,
        receiver_id: &str,
        message_type: MessageType,
        content: serde_json::Value,
        task_id: Option<String>,
    ) -> Result<(), String> {
        let senders = self.message_senders.lock();
        if let Some(sender) = senders.get(receiver_id) {
            let message = AgentMessage {
                message_id: uuid::Uuid::new_v4().to_string(),
                sender_id: self.config.agent_id.clone(),
                receiver_id: receiver_id.to_string(),
                message_type,
                content,
                task_id,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };
            sender
                .send(message)
                .map_err(|e| format!("Failed to send message: {}", e))?;
            Ok(())
        } else {
            Err(format!("Receiver agent {} not found", receiver_id))
        }
    }

    /// 注册消息发送通道（用于 Agent 间通信）
    pub fn register_message_sender(
        &self,
        agent_id: &str,
        sender: mpsc::UnboundedSender<AgentMessage>,
    ) {
        let mut senders = self.message_senders.lock();
        senders.insert(agent_id.to_string(), sender);
    }
}

// ============================================================================
// 多 Agent 协调器
// ============================================================================

/// 多 Agent 协调器
#[derive(Clone)]
pub struct MultiAgentCoordinator {
    /// 协调器配置
    config: CollaborationGroupConfig,
    /// Agent 运行时实例映射
    agents: Arc<Mutex<HashMap<String, Arc<AgentRuntime>>>>,
    /// 任务映射
    tasks: Arc<Mutex<HashMap<String, TaskDefinition>>>,
    /// 任务队列（按优先级排序）
    task_queue: Arc<Mutex<Vec<String>>>,
    /// 任务总耗时（用于计算平均）
    total_task_duration_ms: Arc<Mutex<u64>>,
}

impl MultiAgentCoordinator {
    /// 创建新的多 Agent 协调器
    pub fn new(config: CollaborationGroupConfig) -> Self {
        Self {
            config,
            agents: Arc::new(Mutex::new(HashMap::new())),
            tasks: Arc::new(Mutex::new(HashMap::new())),
            task_queue: Arc::new(Mutex::new(Vec::new())),
            total_task_duration_ms: Arc::new(Mutex::new(0)),
        }
    }

    /// 获取协调器配置
    pub fn config(&self) -> &CollaborationGroupConfig {
        &self.config
    }

    /// 注册 Agent
    pub fn register_agent(&self, runtime: Arc<AgentRuntime>) {
        let agent_id = runtime.agent_id().to_string();
        info!(agent_id = %agent_id, "Agent registered to collaboration group");

        let mut agents = self.agents.lock();
        agents.insert(agent_id, runtime);
    }

    /// 注销 Agent
    pub fn unregister_agent(&self, agent_id: &str) {
        let mut agents = self.agents.lock();
        agents.remove(agent_id);
        info!(agent_id = %agent_id, "Agent unregistered from collaboration group");
    }

    /// 获取所有已注册的 Agent ID
    pub fn list_agents(&self) -> Vec<String> {
        self.agents.lock().keys().cloned().collect()
    }

    /// 获取 Agent 数量
    pub fn agent_count(&self) -> usize {
        self.agents.lock().len()
    }

    /// 提交任务
    pub fn submit_task(&self, task: TaskDefinition) -> String {
        let task_id = task.task_id.clone();
        info!(task_id = %task_id, task_name = %task.name, "Task submitted");

        // 添加到任务映射
        {
            let mut tasks = self.tasks.lock();
            tasks.insert(task_id.clone(), task);
        }

        // 添加到任务队列（按优先级排序）
        {
            let mut queue = self.task_queue.lock();
            queue.push(task_id.clone());
            // 简单排序：优先级高的在前
            queue.sort_by(|a, b| {
                let tasks = self.tasks.lock();
                let pa = tasks.get(a).map(|t| t.priority).unwrap_or(0);
                let pb = tasks.get(b).map(|t| t.priority).unwrap_or(0);
                pb.cmp(&pa)
            });
        }

        task_id
    }

    /// 分配任务给最合适的 Agent
    pub fn assign_task(&self, task_id: &str) -> Result<String, String> {
        let agents = self.agents.lock();

        // 找到可以接受任务的 Agent
        let mut best_agent: Option<&Arc<AgentRuntime>> = None;
        let mut best_score = 0.0;

        for agent in agents.values() {
            if !agent.can_accept_task() {
                continue;
            }

            // 计算匹配分数（基于能力标签）
            let score = self.calculate_match_score(agent, task_id);
            if score > best_score {
                best_score = score;
                best_agent = Some(agent);
            }
        }

        if let Some(agent) = best_agent {
            let agent_id = agent.agent_id().to_string();

            // 更新任务状态
            {
                let mut tasks = self.tasks.lock();
                if let Some(task) = tasks.get_mut(task_id) {
                    task.status = TaskStatus::Assigned;
                    task.assigned_agent_id = Some(agent_id.clone());
                    task.started_at = Some(chrono::Utc::now().to_rfc3339());
                }
            }

            info!(task_id = %task_id, agent_id = %agent_id, "Task assigned to agent");
            Ok(agent_id)
        } else {
            Err("No available agent to assign task".to_string())
        }
    }

    /// 计算 Agent 与任务的匹配分数
    fn calculate_match_score(&self, agent: &AgentRuntime, task_id: &str) -> f64 {
        let tasks = self.tasks.lock();
        let task = match tasks.get(task_id) {
            Some(t) => t,
            None => return 0.0,
        };

        let config = agent.config();
        let mut score = 0.0;

        // 角色匹配
        match config.role {
            AgentRole::Worker => score += 0.3,
            AgentRole::Specialist => score += 0.2,
            _ => score += 0.1,
        }

        // 能力标签匹配
        for capability in &config.capabilities {
            for tag in &task.tags {
                if capability.tags.contains(tag) {
                    score += capability.proficiency * 0.5;
                }
            }
        }

        // 任务类型匹配
        for capability in &config.capabilities {
            if capability.name == task.task_type {
                score += capability.proficiency * 0.3;
            }
        }

        score
    }

    /// 执行任务（分配 + 执行）
    pub async fn execute_task(&self, task_id: &str) -> Result<serde_json::Value, String> {
        // 分配任务
        let agent_id = self.assign_task(task_id)?;

        // 获取 Agent
        let agent = {
            let agents = self.agents.lock();
            agents.get(&agent_id).cloned()
        };

        let agent = match agent {
            Some(a) => a,
            None => return Err("Agent not found after assignment".to_string()),
        };

        // 获取任务
        let task = {
            let tasks = self.tasks.lock();
            tasks.get(task_id).cloned()
        };

        let task = match task {
            Some(t) => t,
            None => return Err("Task not found".to_string()),
        };

        // 更新任务状态为运行中
        {
            let mut tasks = self.tasks.lock();
            if let Some(t) = tasks.get_mut(task_id) {
                t.status = TaskStatus::Running;
            }
        }

        let start_time = Instant::now();

        // 执行任务
        let result = agent.execute_task(&task).await;

        let duration_ms = start_time.elapsed().as_millis() as u64;

        // 更新任务状态
        {
            let mut tasks = self.tasks.lock();
            if let Some(t) = tasks.get_mut(task_id) {
                match &result {
                    Ok(r) => {
                        t.status = TaskStatus::Completed;
                        t.result = Some(r.clone());
                        t.completed_at = Some(chrono::Utc::now().to_rfc3339());
                    }
                    Err(e) => {
                        t.status = TaskStatus::Failed;
                        t.error = Some(e.clone());
                        t.completed_at = Some(chrono::Utc::now().to_rfc3339());
                    }
                }
            }
        }

        // 累计任务耗时
        {
            let mut total = self.total_task_duration_ms.lock();
            *total += duration_ms;
        }

        info!(
            task_id = %task_id,
            agent_id = %agent_id,
            duration_ms = duration_ms,
            success = result.is_ok(),
            "Task execution completed"
        );

        result
    }

    /// 分解任务为子任务
    pub fn decompose_task(
        &self,
        parent_task_id: &str,
        subtasks: Vec<TaskDefinition>,
    ) -> Vec<String> {
        let mut subtask_ids = Vec::new();

        for mut subtask in subtasks {
            subtask.parent_task_id = Some(parent_task_id.to_string());
            let id = self.submit_task(subtask);
            subtask_ids.push(id);
        }

        // 更新父任务的子任务列表
        {
            let mut tasks = self.tasks.lock();
            if let Some(parent) = tasks.get_mut(parent_task_id) {
                parent.subtask_ids = subtask_ids.clone();
            }
        }

        info!(
            parent_task_id = %parent_task_id,
            subtask_count = subtask_ids.len(),
            "Task decomposed into subtasks"
        );

        subtask_ids
    }

    /// 汇总子任务结果
    pub fn aggregate_results(&self, parent_task_id: &str) -> Result<serde_json::Value, String> {
        let tasks = self.tasks.lock();

        let parent = tasks
            .get(parent_task_id)
            .ok_or_else(|| "Parent task not found".to_string())?;

        let mut subtask_results = Vec::new();
        let mut all_completed = true;

        for subtask_id in &parent.subtask_ids {
            if let Some(subtask) = tasks.get(subtask_id) {
                if subtask.status != TaskStatus::Completed {
                    all_completed = false;
                }
                if let Some(result) = &subtask.result {
                    subtask_results.push(serde_json::json!({
                        "task_id": subtask_id,
                        "task_name": subtask.name,
                        "status": subtask.status.as_str(),
                        "result": result,
                    }));
                }
            }
        }

        if !all_completed {
            return Err("Not all subtasks completed".to_string());
        }

        Ok(serde_json::json!({
            "parent_task_id": parent_task_id,
            "subtask_count": parent.subtask_ids.len(),
            "subtasks": subtask_results,
            "summary": format!("All {} subtasks completed successfully", parent.subtask_ids.len()),
        }))
    }

    /// 获取任务
    pub fn get_task(&self, task_id: &str) -> Option<TaskDefinition> {
        self.tasks.lock().get(task_id).cloned()
    }

    /// 获取所有任务
    pub fn list_tasks(&self) -> Vec<TaskDefinition> {
        self.tasks.lock().values().cloned().collect()
    }

    /// 获取任务数量
    pub fn task_count(&self) -> usize {
        self.tasks.lock().len()
    }

    /// 获取协调器统计
    pub fn get_stats(&self) -> CollaborationGroupStats {
        let tasks = self.tasks.lock();
        let total = tasks.len() as u64;

        let mut completed = 0u64;
        let mut failed = 0u64;
        let mut running = 0u64;
        let mut pending = 0u64;

        for task in tasks.values() {
            match task.status {
                TaskStatus::Completed => completed += 1,
                TaskStatus::Failed => failed += 1,
                TaskStatus::Running => running += 1,
                TaskStatus::Pending | TaskStatus::Assigned => pending += 1,
                _ => {}
            }
        }

        let total_duration = *self.total_task_duration_ms.lock();
        let avg_duration = if completed > 0 {
            total_duration as f64 / completed as f64
        } else {
            0.0
        };

        let success_rate = if total > 0 {
            completed as f64 / total as f64
        } else {
            0.0
        };

        CollaborationGroupStats {
            group_id: self.config.group_id.clone(),
            total_tasks: total,
            completed_tasks: completed,
            failed_tasks: failed,
            running_tasks: running,
            pending_tasks: pending,
            avg_task_duration_ms: avg_duration,
            success_rate,
        }
    }

    /// 取消任务
    pub fn cancel_task(&self, task_id: &str) -> Result<(), String> {
        let mut tasks = self.tasks.lock();
        if let Some(task) = tasks.get_mut(task_id) {
            if matches!(task.status, TaskStatus::Pending | TaskStatus::Assigned) {
                task.status = TaskStatus::Cancelled;
                info!(task_id = %task_id, "Task cancelled");
                Ok(())
            } else {
                Err("Task cannot be cancelled in current state".to_string())
            }
        } else {
            Err("Task not found".to_string())
        }
    }

    /// 清除已完成的任务
    pub fn cleanup_completed_tasks(&self) -> usize {
        let mut tasks = self.tasks.lock();
        let before = tasks.len();
        tasks.retain(|_, task| {
            !matches!(
                task.status,
                TaskStatus::Completed | TaskStatus::Failed | TaskStatus::Cancelled
            )
        });
        let removed = before - tasks.len();
        info!(removed = removed, "Completed tasks cleaned up");
        removed
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_agent_config(id: &str, role: AgentRole) -> AgentConfig {
        AgentConfig {
            agent_id: id.to_string(),
            name: format!("Agent {}", id),
            role,
            description: format!("Test agent {}", id),
            capabilities: vec![AgentCapability {
                name: "general".to_string(),
                description: "General capability".to_string(),
                tags: vec!["general".to_string()],
                proficiency: 0.8,
            }],
            max_concurrent_tasks: 5,
            task_timeout_secs: 60,
        }
    }

    fn create_test_coordinator() -> MultiAgentCoordinator {
        let config = CollaborationGroupConfig {
            group_id: "test-group".to_string(),
            name: "Test Group".to_string(),
            mode: CollaborationMode::MasterWorker,
            coordinator_id: Some("coordinator".to_string()),
            member_ids: vec!["worker1".to_string(), "worker2".to_string()],
            max_tasks: 100,
            task_timeout_secs: 60,
        };
        MultiAgentCoordinator::new(config)
    }

    #[test]
    fn test_agent_role_as_str() {
        assert_eq!(AgentRole::Coordinator.as_str(), "coordinator");
        assert_eq!(AgentRole::Specialist.as_str(), "specialist");
        assert_eq!(AgentRole::Worker.as_str(), "worker");
        assert_eq!(AgentRole::Reviewer.as_str(), "reviewer");
        assert_eq!(AgentRole::General.as_str(), "general");
    }

    #[test]
    fn test_task_status_as_str() {
        assert_eq!(TaskStatus::Pending.as_str(), "pending");
        assert_eq!(TaskStatus::Assigned.as_str(), "assigned");
        assert_eq!(TaskStatus::Running.as_str(), "running");
        assert_eq!(TaskStatus::Completed.as_str(), "completed");
        assert_eq!(TaskStatus::Failed.as_str(), "failed");
        assert_eq!(TaskStatus::Cancelled.as_str(), "cancelled");
        assert_eq!(TaskStatus::Timeout.as_str(), "timeout");
    }

    #[test]
    fn test_task_definition_new() {
        let task = TaskDefinition::new(
            "Test Task",
            "Test description",
            "test_type",
            serde_json::json!({"query": "test"}),
        );

        assert_eq!(task.name, "Test Task");
        assert_eq!(task.description, "Test description");
        assert_eq!(task.task_type, "test_type");
        assert_eq!(task.status, TaskStatus::Pending);
        assert!(task.parent_task_id.is_none());
        assert!(task.subtask_ids.is_empty());
    }

    #[test]
    fn test_agent_config_default() {
        let config = AgentConfig::default();
        assert_eq!(config.role, AgentRole::General);
        assert_eq!(config.max_concurrent_tasks, 5);
        assert_eq!(config.task_timeout_secs, 60);
    }

    #[test]
    fn test_multi_agent_coordinator_creation() {
        let coordinator = create_test_coordinator();
        assert_eq!(coordinator.config().group_id, "test-group");
        assert_eq!(coordinator.agent_count(), 0);
        assert_eq!(coordinator.task_count(), 0);
    }

    #[test]
    fn test_submit_and_get_task() {
        let coordinator = create_test_coordinator();

        let task = TaskDefinition::new(
            "Test Task",
            "Test description",
            "test_type",
            serde_json::json!({"query": "test"}),
        );

        let task_id = coordinator.submit_task(task);
        assert_eq!(coordinator.task_count(), 1);

        let retrieved = coordinator.get_task(&task_id);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "Test Task");
    }

    #[test]
    fn test_list_tasks() {
        let coordinator = create_test_coordinator();

        for i in 0..3 {
            let task = TaskDefinition::new(
                &format!("Task {}", i),
                &format!("Description {}", i),
                "test_type",
                serde_json::json!({"index": i}),
            );
            coordinator.submit_task(task);
        }

        assert_eq!(coordinator.task_count(), 3);
        assert_eq!(coordinator.list_tasks().len(), 3);
    }

    #[test]
    fn test_cancel_task() {
        let coordinator = create_test_coordinator();

        let task = TaskDefinition::new(
            "Cancel Task",
            "Task to cancel",
            "test_type",
            serde_json::json!({}),
        );

        let task_id = coordinator.submit_task(task);
        assert!(coordinator.cancel_task(&task_id).is_ok());

        let cancelled = coordinator.get_task(&task_id).unwrap();
        assert_eq!(cancelled.status, TaskStatus::Cancelled);
    }

    #[test]
    fn test_decompose_task() {
        let coordinator = create_test_coordinator();

        let parent = TaskDefinition::new(
            "Parent Task",
            "Parent task to decompose",
            "parent_type",
            serde_json::json!({}),
        );

        let parent_id = coordinator.submit_task(parent);

        let subtasks: Vec<TaskDefinition> = (0..3)
            .map(|i| {
                TaskDefinition::new(
                    &format!("Subtask {}", i),
                    &format!("Subtask {}", i),
                    "subtask_type",
                    serde_json::json!({"index": i}),
                )
            })
            .collect();

        let subtask_ids = coordinator.decompose_task(&parent_id, subtasks);
        assert_eq!(subtask_ids.len(), 3);

        let parent = coordinator.get_task(&parent_id).unwrap();
        assert_eq!(parent.subtask_ids.len(), 3);
    }

    #[test]
    fn test_coordinator_stats() {
        let coordinator = create_test_coordinator();

        // 提交一些任务
        for i in 0..5 {
            let task = TaskDefinition::new(
                &format!("Task {}", i),
                &format!("Description {}", i),
                "test_type",
                serde_json::json!({"index": i}),
            );
            coordinator.submit_task(task);
        }

        let stats = coordinator.get_stats();
        assert_eq!(stats.group_id, "test-group");
        assert_eq!(stats.total_tasks, 5);
        assert_eq!(stats.pending_tasks, 5);
        assert_eq!(stats.completed_tasks, 0);
        assert_eq!(stats.success_rate, 0.0);
    }

    #[test]
    fn test_cleanup_completed_tasks() {
        let coordinator = create_test_coordinator();

        // 提交任务
        let task_id = coordinator.submit_task(TaskDefinition::new(
            "Task",
            "Description",
            "test_type",
            serde_json::json!({}),
        ));

        // 手动标记为完成
        {
            let mut tasks = coordinator.tasks.lock();
            if let Some(task) = tasks.get_mut(&task_id) {
                task.status = TaskStatus::Completed;
            }
        }

        assert_eq!(coordinator.task_count(), 1);
        let removed = coordinator.cleanup_completed_tasks();
        assert_eq!(removed, 1);
        assert_eq!(coordinator.task_count(), 0);
    }

    #[test]
    fn test_collaboration_mode() {
        assert_eq!(CollaborationMode::MasterWorker as u8, 0);
        assert_eq!(CollaborationMode::PeerToPeer as u8, 1);
        assert_eq!(CollaborationMode::Pipeline as u8, 2);
        assert_eq!(CollaborationMode::Voting as u8, 3);
    }

    #[test]
    fn test_agent_capability() {
        let capability = AgentCapability {
            name: "test".to_string(),
            description: "Test capability".to_string(),
            tags: vec!["tag1".to_string(), "tag2".to_string()],
            proficiency: 0.9,
        };

        assert_eq!(capability.name, "test");
        assert_eq!(capability.proficiency, 0.9);
        assert_eq!(capability.tags.len(), 2);
    }
}

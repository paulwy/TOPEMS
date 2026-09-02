//! Agent 编排器模块。
//!
//! 提供增强版的 Agent 编排能力，集成：
//! - MCP 工具注册中心
//! - 上下文管理
//! - 流式响应
//! - 错误恢复机制
//! - 多轮对话管理

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc, RwLock};
use tracing::{debug, error, info, warn};

use super::context::{AgentContext, AgentMessage, ContextManager, MessageRole};
use super::performance::AgentPerformanceMonitor;
use super::streaming::{StreamChunk, StreamingResponse};
use crate::dsh::alerting::AlertManager;
use crate::dsh::cache::CacheManager;
use crate::dsh::mcp::tools::{ToolExecutionError, ToolRegistry};
use crate::dsh::provider::{LlmProvider, LlmRequest};

/// Agent 编排器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOrchestratorConfig {
    /// 最大迭代次数
    pub max_iterations: usize,
    /// 最大上下文 Token 数
    pub max_context_tokens: usize,
    /// 默认系统提示词
    pub system_prompt: String,
    /// 是否启用流式响应
    pub enable_streaming: bool,
    /// 是否启用工具调用
    pub enable_tools: bool,
    /// 工具调用超时（秒）
    pub tool_timeout_seconds: u64,
    /// 错误恢复最大重试次数
    pub max_error_retries: usize,
}

impl Default for AgentOrchestratorConfig {
    fn default() -> Self {
        Self {
            max_iterations: 10,
            max_context_tokens: 8192,
            system_prompt:
                "你是 TOPEMS 智能助手，帮助用户完成各种任务。你可以使用工具来获取信息和执行操作。"
                    .to_string(),
            enable_streaming: true,
            enable_tools: true,
            tool_timeout_seconds: 30,
            max_error_retries: 3,
        }
    }
}

/// 执行步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStep {
    /// 步骤序号
    pub step_number: usize,
    /// 步骤类型
    pub step_type: String,
    /// 步骤描述
    pub description: String,
    /// 工具名称（如果是工具调用）
    pub tool_name: Option<String>,
    /// 工具参数（如果是工具调用）
    pub tool_arguments: Option<serde_json::Value>,
    /// 工具结果（如果是工具调用）
    pub tool_result: Option<serde_json::Value>,
    /// 是否成功
    pub success: bool,
    /// 错误信息（如果失败）
    pub error: Option<String>,
    /// 持续时间（毫秒）
    pub duration_ms: u64,
}

/// Agent 执行请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExecuteRequest {
    /// 用户查询
    pub query: String,
    /// 会话 ID（可选，用于多轮对话）
    pub session_id: Option<String>,
    /// 可用工具列表（可选，为空则使用所有已注册工具）
    pub available_tools: Option<Vec<String>>,
    /// 最大迭代次数（可选，覆盖默认配置）
    pub max_iterations: Option<usize>,
    /// 是否启用流式响应
    pub stream: Option<bool>,
    /// 额外的上下文变量
    pub context_variables: Option<HashMap<String, String>>,
}

/// Agent 执行响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExecuteResponse {
    /// 会话 ID
    pub session_id: String,
    /// 最终答案
    pub answer: String,
    /// 执行步骤
    pub steps: Vec<ExecutionStep>,
    /// 使用的工具列表
    pub tools_used: Vec<String>,
    /// 总迭代次数
    pub total_iterations: usize,
    /// 总持续时间（毫秒）
    pub total_duration_ms: u64,
    /// 置信度
    pub confidence: f64,
    /// 是否成功
    pub success: bool,
    /// 错误信息（如果失败）
    pub error: Option<String>,
}

/// Agent 编排器
///
/// 增强版的 Agent 编排器，集成 MCP 工具、上下文管理、流式响应和 LLM Provider。
#[derive(Clone)]
pub struct AgentOrchestrator {
    /// 配置
    config: AgentOrchestratorConfig,
    /// 工具注册中心
    tool_registry: ToolRegistry,
    /// 上下文管理器
    context_manager: ContextManager,
    /// LLM Provider（可选，用于真正的 AI 决策）
    llm_provider: Option<Arc<dyn LlmProvider>>,
    /// 活跃的流式响应会话
    streaming_sessions: Arc<RwLock<HashMap<String, mpsc::UnboundedSender<StreamChunk>>>>,
    /// 性能监控器（可选）
    performance_monitor: Option<AgentPerformanceMonitor>,
    /// 告警管理器（可选）
    alert_manager: Option<AlertManager>,
    /// 缓存管理器（可选）
    cache_manager: Option<CacheManager>,
}

impl AgentOrchestrator {
    /// 创建新的 Agent 编排器
    pub fn new(tool_registry: ToolRegistry) -> Self {
        let config = AgentOrchestratorConfig::default();
        let context_manager = ContextManager::new()
            .with_default_system_prompt(&config.system_prompt)
            .with_default_max_tokens(config.max_context_tokens);

        Self {
            config,
            tool_registry,
            context_manager,
            llm_provider: None,
            streaming_sessions: Arc::new(RwLock::new(HashMap::new())),
            performance_monitor: None,
            alert_manager: None,
            cache_manager: None,
        }
    }

    /// 使用 LLM Provider 创建 Agent 编排器
    pub fn with_llm_provider(
        tool_registry: ToolRegistry,
        llm_provider: Arc<dyn LlmProvider>,
    ) -> Self {
        let mut orchestrator = Self::new(tool_registry);
        orchestrator.llm_provider = Some(llm_provider);
        orchestrator
    }

    /// 使用「路由 + 故障降级」的 Provider 组合创建 Agent 编排器（3.1b/3.1c）
    ///
    /// Provider 由环境变量配置（`ProviderFactory::build_resilient_provider`）：
    /// - 简单任务 → 本地 Provider（DSH_SIMPLE_PROVIDER，默认 ollama）
    /// - 复杂任务 → 云端 Provider（DSH_COMPLEX_PROVIDER，默认 deepseek）
    /// - 各分支自动故障降级（DSH_FALLBACK_PROVIDER，默认 mock）
    pub fn with_resilient_provider(tool_registry: ToolRegistry) -> Self {
        let provider = crate::dsh::provider::ProviderFactory::build_resilient_provider();
        Self::with_llm_provider(tool_registry, provider)
    }

    /// 设置 LLM Provider
    pub fn set_llm_provider(&mut self, llm_provider: Arc<dyn LlmProvider>) {
        self.llm_provider = Some(llm_provider);
    }

    /// 设置性能监控器
    pub fn set_performance_monitor(&mut self, monitor: AgentPerformanceMonitor) {
        self.performance_monitor = Some(monitor);
    }

    /// 使用性能监控器创建 Agent 编排器
    pub fn with_performance_monitor(mut self, monitor: AgentPerformanceMonitor) -> Self {
        self.performance_monitor = Some(monitor);
        self
    }

    /// 获取性能监控器
    pub fn performance_monitor(&self) -> Option<&AgentPerformanceMonitor> {
        self.performance_monitor.as_ref()
    }

    /// 设置告警管理器
    pub fn set_alert_manager(&mut self, manager: AlertManager) {
        self.alert_manager = Some(manager);
    }

    /// 使用告警管理器创建 Agent 编排器
    pub fn with_alert_manager(mut self, manager: AlertManager) -> Self {
        self.alert_manager = Some(manager);
        self
    }

    /// 获取告警管理器
    pub fn alert_manager(&self) -> Option<&AlertManager> {
        self.alert_manager.as_ref()
    }

    /// 设置缓存管理器
    pub fn set_cache_manager(&mut self, manager: CacheManager) {
        self.cache_manager = Some(manager);
    }

    /// 使用缓存管理器创建 Agent 编排器
    pub fn with_cache_manager(mut self, manager: CacheManager) -> Self {
        self.cache_manager = Some(manager);
        self
    }

    /// 获取缓存管理器
    pub fn cache_manager(&self) -> Option<&CacheManager> {
        self.cache_manager.as_ref()
    }

    /// 使用自定义配置创建 Agent 编排器
    pub fn with_config(mut self, config: AgentOrchestratorConfig) -> Self {
        self.config = config.clone();
        self.context_manager = ContextManager::new()
            .with_default_system_prompt(&config.system_prompt)
            .with_default_max_tokens(config.max_context_tokens);
        self
    }

    /// 获取配置
    pub fn config(&self) -> &AgentOrchestratorConfig {
        &self.config
    }

    /// 获取工具注册中心
    pub fn tool_registry(&self) -> &ToolRegistry {
        &self.tool_registry
    }

    /// 获取上下文管理器
    pub fn context_manager(&self) -> &ContextManager {
        &self.context_manager
    }

    /// 执行 Agent 请求（非流式）
    pub async fn execute(&self, request: AgentExecuteRequest) -> AgentExecuteResponse {
        let start_time = Instant::now();
        let session_id = request
            .session_id
            .clone()
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        // 启动性能监控计时器
        let mut perf_timer = self
            .performance_monitor
            .as_ref()
            .map(|m| m.record_start(&session_id));

        info!(
            session_id = %session_id,
            query = %request.query,
            "Starting agent execution"
        );

        let mut steps: Vec<ExecutionStep> = Vec::new();
        let mut tools_used: Vec<String> = Vec::new();
        let mut error_retries = 0;

        // 获取或创建上下文
        let mut context = self
            .context_manager
            .get_or_create_context(&session_id)
            .await;

        // 添加用户消息
        context.add_message(AgentMessage::user(&request.query));

        // 设置上下文变量
        if let Some(variables) = &request.context_variables {
            for (key, value) in variables {
                context.set_variable(key, value);
            }
        }

        let max_iterations = request.max_iterations.unwrap_or(self.config.max_iterations);
        let available_tools = request.available_tools.clone();

        let mut final_answer = String::new();
        let mut success = true;
        let mut error_msg: Option<String> = None;

        // 主循环：思考 -> 工具调用 -> 观察
        for iteration in 1..=max_iterations {
            info!(
                session_id = %session_id,
                iteration = iteration,
                "Agent iteration"
            );

            // 增加迭代计数
            if let Some(timer) = &mut perf_timer {
                timer.increment_iterations();
            }

            // 步骤 1：思考（决定下一步行动）
            let think_step = self.think_step(&context, iteration, &available_tools).await;
            steps.push(think_step.clone());

            // 如果思考步骤表明不需要工具调用，生成最终答案
            if think_step.step_type == "final_answer" {
                final_answer = think_step.description.clone();
                break;
            }

            // 步骤 2：工具调用
            if let Some(tool_name) = &think_step.tool_name {
                if !tools_used.contains(tool_name) {
                    tools_used.push(tool_name.clone());
                }

                // 检查缓存
                let tool_args = think_step
                    .tool_arguments
                    .clone()
                    .unwrap_or(serde_json::Value::Null);
                let mut cached_value: Option<serde_json::Value> = None;
                let mut cache_hit = false;
                if let Some(cache) = &self.cache_manager {
                    if let Some(cached) = cache.get_cached_tool_call(tool_name, &tool_args) {
                        if cached.success {
                            cached_value = Some(cached.result.clone());
                            cache_hit = true;
                            debug!(tool = %tool_name, "Cache hit for tool call");
                        }
                    }
                }

                // 记录工具调用开始时间
                let tool_start = Instant::now();

                let tool_step = if let Some(cached) = cached_value {
                    // 使用缓存结果
                    ExecutionStep {
                        step_number: iteration,
                        step_type: "tool_call".to_string(),
                        description: format!("工具调用（缓存命中）: {}", tool_name),
                        tool_name: Some(tool_name.clone()),
                        tool_arguments: Some(tool_args.clone()),
                        success: true,
                        tool_result: Some(cached),
                        error: None,
                        duration_ms: 0,
                    }
                } else {
                    // 执行工具调用
                    self.execute_tool_step(
                        &context,
                        iteration,
                        tool_name,
                        think_step.tool_arguments.as_ref(),
                    )
                    .await
                };

                // 记录工具调用性能指标
                let tool_duration_ms = tool_start.elapsed().as_millis() as u64;
                if let Some(monitor) = &self.performance_monitor {
                    monitor.record_tool_call(tool_name, tool_duration_ms, tool_step.success);
                }

                // 缓存工具调用结果
                if !cache_hit && tool_step.success {
                    if let Some(cache) = &self.cache_manager {
                        if let Some(result) = &tool_step.tool_result {
                            cache.cache_tool_call(
                                tool_name,
                                &tool_args,
                                result.clone(),
                                true,
                                tool_duration_ms,
                            );
                        }
                    }
                }

                // 工具调用失败告警
                if !tool_step.success {
                    if let Some(alert_mgr) = &self.alert_manager {
                        let mut metadata = std::collections::HashMap::new();
                        metadata.insert("tool_name".to_string(), tool_name.clone());
                        metadata.insert("session_id".to_string(), session_id.clone());
                        metadata.insert("iteration".to_string(), iteration.to_string());
                        alert_mgr.trigger_alert(
                            crate::dsh::alerting::AlertType::ToolCallFailure,
                            crate::dsh::alerting::AlertLevel::Warning,
                            &format!("工具调用失败: {}", tool_name),
                            &format!("工具 {} 调用失败，错误: {:?}", tool_name, tool_step.error),
                            "agent_orchestrator",
                            metadata,
                        );
                    }
                }

                // 增加工具调用计数
                if let Some(timer) = &mut perf_timer {
                    timer.increment_tool_calls();
                }

                // 处理工具调用失败
                if !tool_step.success {
                    error_retries += 1;
                    warn!(
                        session_id = %session_id,
                        tool = tool_name,
                        retry = error_retries,
                        "Tool execution failed"
                    );

                    if error_retries >= self.config.max_error_retries {
                        error_msg = tool_step.error.clone();
                        success = false;
                        break;
                    }

                    // 添加错误消息到上下文，让 Agent 可以重试
                    context.add_message(AgentMessage::tool_result(
                        tool_name,
                        format!("Error: {}", tool_step.error.clone().unwrap_or_default()),
                    ));
                } else {
                    // 添加工具结果到上下文
                    if let Some(result) = &tool_step.tool_result {
                        context.add_message(AgentMessage::tool_result(
                            tool_name,
                            serde_json::to_string(result).unwrap_or_default(),
                        ));
                    }
                }

                steps.push(tool_step);
            }
        }

        // 如果还没有最终答案，生成一个
        if final_answer.is_empty() && success {
            final_answer = self.generate_final_answer(&context).await;
        }

        // 添加助手消息到上下文
        context.add_message(AgentMessage::assistant(&final_answer));

        // 更新上下文
        self.context_manager
            .update_context(&session_id, context)
            .await;

        let total_duration_ms = start_time.elapsed().as_millis() as u64;

        // 记录性能监控指标
        if let Some(timer) = perf_timer {
            if success {
                timer.finish_success();
            } else {
                timer.finish_failure();
            }
        }

        // 慢查询告警评估
        if let Some(alert_mgr) = &self.alert_manager {
            alert_mgr.evaluate_slow_query(total_duration_ms, &session_id, &request.query);
        }

        info!(
            session_id = %session_id,
            iterations = steps.len(),
            duration_ms = total_duration_ms,
            success = success,
            "Agent execution completed"
        );

        AgentExecuteResponse {
            session_id,
            answer: final_answer,
            steps,
            tools_used,
            total_iterations: max_iterations,
            total_duration_ms,
            confidence: if success { 0.85 } else { 0.0 },
            success,
            error: error_msg,
        }
    }

    /// 执行 Agent 请求（流式）
    pub async fn execute_streaming(
        &self,
        request: AgentExecuteRequest,
    ) -> Result<StreamingResponse, String> {
        let session_id = request
            .session_id
            .clone()
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        info!(
            session_id = %session_id,
            "Starting streaming agent execution"
        );

        let streaming_response = StreamingResponse::new(&session_id);
        let sender = streaming_response.sender();

        // 存储流式响应会话
        {
            let mut sessions = self.streaming_sessions.write().await;
            sessions.insert(session_id.clone(), sender.clone());
        }

        // 发送会话开始事件
        let _ = sender.send(StreamChunk::session_start(&session_id));

        // 克隆必要的数据用于异步任务
        let orchestrator = self.clone();
        let request_clone = request.clone();
        let sender_clone = sender.clone();

        // 在后台执行 Agent 逻辑
        tokio::spawn(async move {
            let result = orchestrator
                .execute_streaming_internal(request_clone, sender_clone.clone())
                .await;

            match result {
                Ok(response) => {
                    // 发送内容完成事件
                    let _ = sender_clone.send(StreamChunk::content_complete(
                        &response.session_id,
                        &response.answer,
                    ));
                }
                Err(e) => {
                    error!(error = %e, "Streaming execution failed");
                    let _ = sender_clone.send(StreamChunk::error(&session_id, e));
                }
            }

            // 发送会话结束事件
            let _ = sender_clone.send(StreamChunk::session_end(&session_id));

            // 清理会话
            let mut sessions = orchestrator.streaming_sessions.write().await;
            sessions.remove(&session_id);
        });

        Ok(streaming_response)
    }

    /// 流式执行内部逻辑
    async fn execute_streaming_internal(
        &self,
        request: AgentExecuteRequest,
        sender: tokio::sync::mpsc::UnboundedSender<StreamChunk>,
    ) -> Result<AgentExecuteResponse, String> {
        // 这里复用非流式的执行逻辑，但在关键节点发送流式事件
        // 为了简化，我们直接调用 execute 方法
        let response = self.execute(request).await;

        // 发送思考事件
        for step in &response.steps {
            if step.step_type == "thinking" {
                let _ = sender.send(StreamChunk::thinking(
                    &response.session_id,
                    &step.description,
                ));
            } else if step.step_type == "tool_call" {
                if let Some(tool_name) = &step.tool_name {
                    let _ = sender.send(StreamChunk::tool_call_start(
                        &response.session_id,
                        tool_name,
                        step.tool_arguments.clone().unwrap_or(serde_json::json!({})),
                    ));

                    let _ = sender.send(StreamChunk::tool_call_complete(
                        &response.session_id,
                        tool_name,
                        step.tool_result.clone().unwrap_or(serde_json::json!({})),
                        step.success,
                    ));
                }
            }
        }

        // 发送内容增量（模拟流式输出）
        for chunk in response.answer.chars().collect::<Vec<char>>().chunks(10) {
            let delta: String = chunk.iter().collect();
            let _ = sender.send(StreamChunk::content_delta(&response.session_id, delta));
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        }

        Ok(response)
    }

    /// 思考步骤
    async fn think_step(
        &self,
        context: &AgentContext,
        iteration: usize,
        available_tools: &Option<Vec<String>>,
    ) -> ExecutionStep {
        let start_time = Instant::now();

        // 简单的思考逻辑：根据上下文决定是否需要工具调用
        // 在实际实现中，这里应该调用 LLM 进行决策
        let user_messages = context.get_user_messages();
        let last_query = user_messages
            .last()
            .map(|m| m.content.clone())
            .unwrap_or_default();

        let tool_names = self
            .tool_registry
            .list_tools()
            .await
            .into_iter()
            .map(|tool| tool.name)
            .filter(|name| {
                if let Some(available) = available_tools {
                    available.contains(name)
                } else {
                    true
                }
            })
            .collect::<Vec<_>>();

        // 决策逻辑：如果有 LLM Provider，使用 LLM 进行决策；否则使用简单的规则匹配
        let (tool_name, tool_arguments, description) = if let Some(llm) = &self.llm_provider {
            self.think_with_llm(llm, context, iteration, &tool_names)
                .await
        } else {
            self.think_with_rules(&last_query, iteration, &tool_names)
                .await
        };

        let step_type = if tool_name.is_some() {
            "tool_call"
        } else {
            "final_answer"
        };

        ExecutionStep {
            step_number: iteration,
            step_type: step_type.to_string(),
            description,
            tool_name,
            tool_arguments,
            tool_result: None,
            success: true,
            error: None,
            duration_ms: start_time.elapsed().as_millis() as u64,
        }
    }

    /// 使用 LLM 进行思考决策
    async fn think_with_llm(
        &self,
        llm: &Arc<dyn LlmProvider>,
        context: &AgentContext,
        iteration: usize,
        tool_names: &[String],
    ) -> (Option<String>, Option<serde_json::Value>, String) {
        // 构建对话历史
        let history: Vec<crate::dsh::provider::ChatMessage> = context
            .get_recent_messages(10)
            .iter()
            .map(|m| crate::dsh::provider::ChatMessage {
                role: m.role.as_str().to_string(),
                content: m.content.clone(),
            })
            .collect();

        // 构建工具列表描述
        let tools_description = if tool_names.is_empty() {
            "无可用工具".to_string()
        } else {
            tool_names
                .iter()
                .enumerate()
                .map(|(i, name)| format!("{}. {}", i + 1, name))
                .collect::<Vec<_>>()
                .join("\n")
        };

        // 构建决策提示词
        let system_prompt = format!(
            "你是一个 AI Agent 决策引擎。根据对话历史和可用工具，决定下一步行动。\n\n\
             可用工具：\n{}\n\n\
             决策规则：\n\
             1. 如果需要获取信息或执行操作，选择调用工具\n\
             2. 如果已有足够信息回答用户问题，选择生成最终答案\n\
             3. 达到最大迭代次数时必须生成最终答案\n\n\
             请以 JSON 格式返回决策：\n\
             {{\n  \
               \"action\": \"tool_call\" 或 \"final_answer\",\n  \
               \"tool_name\": \"工具名称\"（如果 action 是 tool_call）,\n  \
               \"tool_arguments\": {{\"参数名\": \"参数值\"}}（如果 action 是 tool_call）,\n  \
               \"reasoning\": \"决策理由\"\n\
             }}",
            tools_description
        );

        let user_message = format!(
            "当前迭代：{}/{}\n\n对话历史：\n{}\n\n请做出决策。",
            iteration,
            self.config.max_iterations,
            history
                .iter()
                .map(|m| format!("{}: {}", m.role, m.content))
                .collect::<Vec<_>>()
                .join("\n")
        );

        let request = LlmRequest {
            system_prompt: Some(system_prompt),
            user_message,
            history: None,
            model: None,
            temperature: Some(0.1),
            max_tokens: Some(500),
        };

        match llm.ask(request).await {
            Ok(response) => {
                // 尝试解析 LLM 返回的 JSON
                let content = response.content.trim();
                // 尝试提取 JSON 部分
                let json_start = content.find('{').unwrap_or(0);
                let json_end = content.rfind('}').map(|i| i + 1).unwrap_or(content.len());
                let json_str = &content[json_start..json_end];

                match serde_json::from_str::<serde_json::Value>(json_str) {
                    Ok(decision) => {
                        let action = decision
                            .get("action")
                            .and_then(|v| v.as_str())
                            .unwrap_or("final_answer");
                        let reasoning = decision
                            .get("reasoning")
                            .and_then(|v| v.as_str())
                            .unwrap_or("基于 LLM 决策")
                            .to_string();

                        if action == "tool_call" {
                            let tool_name = decision
                                .get("tool_name")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());
                            let tool_arguments = decision.get("tool_arguments").cloned();

                            if let Some(name) = tool_name {
                                if tool_names.contains(&name) {
                                    return (Some(name), tool_arguments, reasoning);
                                }
                            }
                        }

                        (None, None, reasoning)
                    }
                    Err(e) => {
                        warn!(error = %e, "Failed to parse LLM decision JSON");
                        (
                            None,
                            None,
                            format!("LLM 返回格式解析失败，使用默认决策: {}", content),
                        )
                    }
                }
            }
            Err(e) => {
                warn!(error = %e, "LLM decision failed, falling back to rules");
                // LLM 调用失败，使用规则匹配作为后备
                let last_query = context
                    .get_user_messages()
                    .last()
                    .map(|m| m.content.clone())
                    .unwrap_or_default();
                self.think_with_rules(&last_query, iteration, tool_names)
                    .await
            }
        }
    }

    /// 使用简单规则进行思考决策（后备方案）
    async fn think_with_rules(
        &self,
        last_query: &str,
        iteration: usize,
        tool_names: &[String],
    ) -> (Option<String>, Option<serde_json::Value>, String) {
        if last_query.contains("搜索")
            || last_query.contains("search")
            || last_query.contains("查找")
        {
            // 尝试调用搜索工具
            let search_tool = tool_names
                .iter()
                .find(|n| n.contains("search") || n.contains("crm") || n.contains("query"))
                .cloned();

            if let Some(tool) = search_tool {
                return (
                    Some(tool.clone()),
                    Some(serde_json::json!({"query": last_query})),
                    format!("需要调用工具 {} 来获取信息", tool),
                );
            }
        }

        if iteration >= self.config.max_iterations {
            return (None, None, "达到最大迭代次数，生成最终答案".to_string());
        }

        (None, None, "基于已有信息生成答案".to_string())
    }

    /// 执行工具步骤
    async fn execute_tool_step(
        &self,
        _context: &AgentContext,
        iteration: usize,
        tool_name: &str,
        arguments: Option<&serde_json::Value>,
    ) -> ExecutionStep {
        let start_time = Instant::now();

        let args = arguments.cloned().unwrap_or(serde_json::json!({}));

        info!(tool = tool_name, iteration = iteration, "Executing tool");

        match self.tool_registry.call_tool(tool_name, args).await {
            Ok(result) => {
                let result_value = serde_json::to_value(&result).unwrap_or(serde_json::json!({}));
                ExecutionStep {
                    step_number: iteration,
                    step_type: "tool_execution".to_string(),
                    description: format!("工具 {} 执行成功", tool_name),
                    tool_name: Some(tool_name.to_string()),
                    tool_arguments: arguments.cloned(),
                    tool_result: Some(result_value),
                    success: true,
                    error: None,
                    duration_ms: start_time.elapsed().as_millis() as u64,
                }
            }
            Err(e) => {
                let error_msg = match e {
                    ToolExecutionError::NotFound(msg) => format!("Tool not found: {}", msg),
                    ToolExecutionError::Validation(msg) => format!("Validation error: {}", msg),
                    ToolExecutionError::Execution(msg) => format!("Execution error: {}", msg),
                    ToolExecutionError::PermissionDenied(msg) => {
                        format!("Permission denied: {}", msg)
                    }
                };

                warn!(
                    tool = tool_name,
                    error = %error_msg,
                    "Tool execution failed"
                );

                ExecutionStep {
                    step_number: iteration,
                    step_type: "tool_execution".to_string(),
                    description: format!("工具 {} 执行失败", tool_name),
                    tool_name: Some(tool_name.to_string()),
                    tool_arguments: arguments.cloned(),
                    tool_result: None,
                    success: false,
                    error: Some(error_msg),
                    duration_ms: start_time.elapsed().as_millis() as u64,
                }
            }
        }
    }

    /// 生成最终答案
    async fn generate_final_answer(&self, context: &AgentContext) -> String {
        // 如果有 LLM Provider，使用 LLM 生成最终答案
        if let Some(llm) = &self.llm_provider {
            return self.generate_answer_with_llm(llm, context).await;
        }

        // 否则使用简单的模板作为后备
        let user_messages = context.get_user_messages();
        let last_query = user_messages
            .last()
            .map(|m| m.content.clone())
            .unwrap_or_default();

        let tool_results = context
            .messages
            .iter()
            .filter(|m| m.role == MessageRole::ToolResult)
            .collect::<Vec<_>>();

        if tool_results.is_empty() {
            format!("根据您的问题「{}」，我已经整理了相关信息。由于没有调用工具，这是基于已有知识的回答。", last_query)
        } else {
            format!(
                "根据您的问题「{}」，我已经调用了 {} 个工具获取信息，并整理了相关回答。",
                last_query,
                tool_results.len()
            )
        }
    }

    /// 使用 LLM 生成最终答案
    async fn generate_answer_with_llm(
        &self,
        llm: &Arc<dyn LlmProvider>,
        context: &AgentContext,
    ) -> String {
        // 构建对话历史
        let history: Vec<crate::dsh::provider::ChatMessage> = context
            .get_recent_messages(20)
            .iter()
            .map(|m| crate::dsh::provider::ChatMessage {
                role: m.role.as_str().to_string(),
                content: m.content.clone(),
            })
            .collect();

        let system_prompt = "你是 TOPEMS 智能助手。请根据对话历史和工具执行结果，给出最终答案。回答要自然、友好、准确。如果信息不足，请说明需要哪些额外信息。".to_string();

        let user_message = "请根据以上对话历史和工具结果，给出最终答案。".to_string();

        let request = LlmRequest {
            system_prompt: Some(system_prompt),
            user_message,
            history: Some(history),
            model: None,
            temperature: Some(0.7),
            max_tokens: Some(2000),
        };

        match llm.ask(request).await {
            Ok(response) => response.content,
            Err(e) => {
                warn!(error = %e, "LLM answer generation failed, using fallback");
                format!("抱歉，生成答案时出现问题：{}。请稍后重试。", e)
            }
        }
    }

    /// 获取会话上下文
    pub async fn get_session_context(&self, session_id: &str) -> Option<AgentContext> {
        self.context_manager.get_context(session_id).await
    }

    /// 清除会话上下文
    pub async fn clear_session(&self, session_id: &str) -> bool {
        self.context_manager.delete_context(session_id).await
    }

    /// 获取活跃会话数
    pub async fn active_sessions(&self) -> usize {
        self.context_manager.active_sessions().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_orchestrator_config_default() {
        let config = AgentOrchestratorConfig::default();
        assert_eq!(config.max_iterations, 10);
        assert_eq!(config.max_context_tokens, 8192);
        assert!(config.enable_streaming);
        assert!(config.enable_tools);
    }

    #[test]
    fn test_execution_step_creation() {
        let step = ExecutionStep {
            step_number: 1,
            step_type: "thinking".to_string(),
            description: "test".to_string(),
            tool_name: None,
            tool_arguments: None,
            tool_result: None,
            success: true,
            error: None,
            duration_ms: 100,
        };
        assert_eq!(step.step_number, 1);
        assert!(step.success);
    }

    #[test]
    fn test_agent_execute_request_creation() {
        let request = AgentExecuteRequest {
            query: "test query".to_string(),
            session_id: None,
            available_tools: None,
            max_iterations: None,
            stream: None,
            context_variables: None,
        };
        assert_eq!(request.query, "test query");
    }

    #[tokio::test]
    async fn test_agent_orchestrator_creation() {
        let registry = ToolRegistry::new();
        let orchestrator = AgentOrchestrator::new(registry);
        assert_eq!(orchestrator.config().max_iterations, 10);
    }

    #[tokio::test]
    async fn test_agent_orchestrator_execute_simple() {
        let registry = ToolRegistry::new();
        let orchestrator = AgentOrchestrator::new(registry);

        let request = AgentExecuteRequest {
            query: "你好".to_string(),
            session_id: None,
            available_tools: None,
            max_iterations: Some(1),
            stream: Some(false),
            context_variables: None,
        };

        let response = orchestrator.execute(request).await;
        assert!(response.success);
        assert!(!response.answer.is_empty());
        assert_eq!(response.total_iterations, 1);
    }

    #[tokio::test]
    async fn test_agent_orchestrator_session_persistence() {
        let registry = ToolRegistry::new();
        let orchestrator = AgentOrchestrator::new(registry);

        // 第一次请求
        let request1 = AgentExecuteRequest {
            query: "你好".to_string(),
            session_id: Some("session1".to_string()),
            available_tools: None,
            max_iterations: Some(1),
            stream: Some(false),
            context_variables: None,
        };
        orchestrator.execute(request1).await;

        // 第二次请求（同一会话）
        let request2 = AgentExecuteRequest {
            query: "再见".to_string(),
            session_id: Some("session1".to_string()),
            available_tools: None,
            max_iterations: Some(1),
            stream: Some(false),
            context_variables: None,
        };
        orchestrator.execute(request2).await;

        // 验证会话上下文存在
        let context = orchestrator.get_session_context("session1").await;
        assert!(context.is_some());
        assert_eq!(context.unwrap().messages.len(), 4); // 2 user + 2 assistant
    }

    #[tokio::test]
    async fn test_agent_orchestrator_clear_session() {
        let registry = ToolRegistry::new();
        let orchestrator = AgentOrchestrator::new(registry);

        let request = AgentExecuteRequest {
            query: "test".to_string(),
            session_id: Some("session1".to_string()),
            available_tools: None,
            max_iterations: Some(1),
            stream: Some(false),
            context_variables: None,
        };
        orchestrator.execute(request).await;

        assert_eq!(orchestrator.active_sessions().await, 1);

        let cleared = orchestrator.clear_session("session1").await;
        assert!(cleared);
        assert_eq!(orchestrator.active_sessions().await, 0);
    }
}

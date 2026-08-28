//! Agent 上下文管理模块。
//!
//! 提供对话历史管理、上下文窗口控制、消息角色管理等功能。

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::info;

/// 消息角色
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    /// 系统消息
    System,
    /// 用户消息
    User,
    /// 助手消息
    Assistant,
    /// 工具调用消息
    ToolCall,
    /// 工具结果消息
    ToolResult,
}

impl MessageRole {
    /// 转换为字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            MessageRole::System => "system",
            MessageRole::User => "user",
            MessageRole::Assistant => "assistant",
            MessageRole::ToolCall => "tool_call",
            MessageRole::ToolResult => "tool_result",
        }
    }
}

/// Agent 消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    /// 消息角色
    pub role: MessageRole,
    /// 消息内容
    pub content: String,
    /// 工具名称（如果是工具调用或结果）
    pub tool_name: Option<String>,
    /// 工具调用 ID
    pub tool_call_id: Option<String>,
    /// 消息时间戳
    pub timestamp: String,
    /// 消息元数据
    pub metadata: HashMap<String, String>,
}

impl AgentMessage {
    /// 创建新消息
    pub fn new(role: MessageRole, content: impl Into<String>) -> Self {
        Self {
            role,
            content: content.into(),
            tool_name: None,
            tool_call_id: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
            metadata: HashMap::new(),
        }
    }

    /// 创建系统消息
    pub fn system(content: impl Into<String>) -> Self {
        Self::new(MessageRole::System, content)
    }

    /// 创建用户消息
    pub fn user(content: impl Into<String>) -> Self {
        Self::new(MessageRole::User, content)
    }

    /// 创建助手消息
    pub fn assistant(content: impl Into<String>) -> Self {
        Self::new(MessageRole::Assistant, content)
    }

    /// 创建工具调用消息
    pub fn tool_call(tool_name: impl Into<String>, content: impl Into<String>) -> Self {
        let mut msg = Self::new(MessageRole::ToolCall, content);
        msg.tool_name = Some(tool_name.into());
        msg
    }

    /// 创建工具结果消息
    pub fn tool_result(tool_name: impl Into<String>, content: impl Into<String>) -> Self {
        let mut msg = Self::new(MessageRole::ToolResult, content);
        msg.tool_name = Some(tool_name.into());
        msg
    }

    /// 估算消息的 Token 数（简单估算）
    pub fn estimate_tokens(&self) -> usize {
        // 简单估算：英文约 4 字符/token，中文约 1.5 字符/token
        let content = &self.content;
        let char_count = content.chars().count();
        let ascii_count = content.chars().filter(|c| c.is_ascii()).count();
        let non_ascii_count = char_count - ascii_count;

        let estimated = (ascii_count as f64 / 4.0) + (non_ascii_count as f64 / 1.5);
        estimated.max(1.0) as usize
    }
}

/// Agent 上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentContext {
    /// 会话 ID
    pub session_id: String,
    /// 系统提示词
    pub system_prompt: String,
    /// 消息历史
    pub messages: Vec<AgentMessage>,
    /// 最大上下文 Token 数
    pub max_context_tokens: usize,
    /// 当前上下文 Token 数
    pub current_tokens: usize,
    /// 上下文变量
    pub variables: HashMap<String, String>,
    /// 创建时间
    pub created_at: String,
    /// 最后更新时间
    pub updated_at: String,
}

impl AgentContext {
    /// 创建新的上下文
    pub fn new(session_id: impl Into<String>, system_prompt: impl Into<String>) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            session_id: session_id.into(),
            system_prompt: system_prompt.into(),
            messages: Vec::new(),
            max_context_tokens: 8192,
            current_tokens: 0,
            variables: HashMap::new(),
            created_at: now.clone(),
            updated_at: now,
        }
    }

    /// 添加消息
    pub fn add_message(&mut self, message: AgentMessage) {
        self.current_tokens += message.estimate_tokens();
        self.messages.push(message);
        self.updated_at = chrono::Utc::now().to_rfc3339();

        // 如果超出上下文窗口，进行截断
        self.truncate_if_needed();
    }

    /// 获取最近的消息（不包括系统消息）
    pub fn get_recent_messages(&self, limit: usize) -> Vec<&AgentMessage> {
        self.messages
            .iter()
            .filter(|m| m.role != MessageRole::System)
            .rev()
            .take(limit)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    }

    /// 获取所有消息（包括系统提示词）
    pub fn get_all_messages(&self) -> Vec<&AgentMessage> {
        let mut all = Vec::new();
        // 系统提示词作为第一条消息
        if !self.system_prompt.is_empty() {
            // 系统提示词不存储在 messages 中，而是单独处理
        }
        all.extend(self.messages.iter());
        all
    }

    /// 获取用户消息
    pub fn get_user_messages(&self) -> Vec<&AgentMessage> {
        self.messages
            .iter()
            .filter(|m| m.role == MessageRole::User)
            .collect()
    }

    /// 获取助手消息
    pub fn get_assistant_messages(&self) -> Vec<&AgentMessage> {
        self.messages
            .iter()
            .filter(|m| m.role == MessageRole::Assistant)
            .collect()
    }

    /// 截断上下文（如果超出最大 Token 数）
    fn truncate_if_needed(&mut self) {
        if self.current_tokens <= self.max_context_tokens {
            return;
        }

        info!(
            session_id = %self.session_id,
            current_tokens = self.current_tokens,
            max_tokens = self.max_context_tokens,
            "Truncating context"
        );

        // 保留最近的消息，删除较早的消息（但保留系统消息）
        let mut removed_tokens = 0;
        while self.current_tokens > self.max_context_tokens && self.messages.len() > 1 {
            // 找到第一条非系统消息并删除
            if let Some(pos) = self
                .messages
                .iter()
                .position(|m| m.role != MessageRole::System)
            {
                removed_tokens += self.messages[pos].estimate_tokens();
                self.messages.remove(pos);
            } else {
                break;
            }
        }

        self.current_tokens = self.current_tokens.saturating_sub(removed_tokens);
    }

    /// 清空上下文
    pub fn clear(&mut self) {
        self.messages.clear();
        self.current_tokens = 0;
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }

    /// 设置上下文变量
    pub fn set_variable(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.variables.insert(key.into(), value.into());
    }

    /// 获取上下文变量
    pub fn get_variable(&self, key: &str) -> Option<&String> {
        self.variables.get(key)
    }

    /// 格式化消息为 LLM 输入格式
    pub fn format_for_llm(&self) -> Vec<serde_json::Value> {
        let mut formatted = Vec::new();

        // 系统提示词
        if !self.system_prompt.is_empty() {
            formatted.push(serde_json::json!({
                "role": "system",
                "content": self.system_prompt
            }));
        }

        // 消息历史
        for msg in &self.messages {
            let role = match msg.role {
                MessageRole::System => "system",
                MessageRole::User => "user",
                MessageRole::Assistant => "assistant",
                MessageRole::ToolCall => "assistant",
                MessageRole::ToolResult => "tool",
            };

            let mut entry = serde_json::json!({
                "role": role,
                "content": msg.content
            });

            if let Some(tool_name) = &msg.tool_name {
                entry["name"] = serde_json::Value::String(tool_name.clone());
            }

            if let Some(tool_call_id) = &msg.tool_call_id {
                entry["tool_call_id"] = serde_json::Value::String(tool_call_id.clone());
            }

            formatted.push(entry);
        }

        formatted
    }
}

/// 上下文管理器
///
/// 管理多个会话的上下文，支持上下文的创建、获取、更新和删除。
#[derive(Clone)]
pub struct ContextManager {
    /// 会话上下文存储
    contexts: Arc<RwLock<HashMap<String, AgentContext>>>,
    /// 默认系统提示词
    default_system_prompt: String,
    /// 默认最大上下文 Token 数
    default_max_tokens: usize,
    /// 最大会话数
    max_sessions: usize,
}

impl Default for ContextManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ContextManager {
    /// 创建新的上下文管理器
    pub fn new() -> Self {
        Self {
            contexts: Arc::new(RwLock::new(HashMap::new())),
            default_system_prompt: "你是 TOPEMS 智能助手，帮助用户完成各种任务。".to_string(),
            default_max_tokens: 8192,
            max_sessions: 1000,
        }
    }

    /// 设置默认系统提示词
    pub fn with_default_system_prompt(mut self, prompt: impl Into<String>) -> Self {
        self.default_system_prompt = prompt.into();
        self
    }

    /// 设置默认最大上下文 Token 数
    pub fn with_default_max_tokens(mut self, max_tokens: usize) -> Self {
        self.default_max_tokens = max_tokens;
        self
    }

    /// 创建或获取会话上下文
    pub async fn get_or_create_context(&self, session_id: &str) -> AgentContext {
        let mut contexts = self.contexts.write().await;

        if let Some(context) = contexts.get(session_id) {
            return context.clone();
        }

        // 如果超出最大会话数，删除最旧的会话
        if contexts.len() >= self.max_sessions {
            if let Some(oldest_id) = contexts
                .iter()
                .min_by_key(|(_, ctx)| ctx.created_at.clone())
                .map(|(id, _)| id.clone())
            {
                contexts.remove(&oldest_id);
                info!(session_id = %oldest_id, "Removed oldest session context");
            }
        }

        let context = AgentContext::new(session_id, &self.default_system_prompt);
        contexts.insert(session_id.to_string(), context.clone());
        info!(session_id = %session_id, "Created new session context");
        context
    }

    /// 获取会话上下文
    pub async fn get_context(&self, session_id: &str) -> Option<AgentContext> {
        let contexts = self.contexts.read().await;
        contexts.get(session_id).cloned()
    }

    /// 更新会话上下文
    pub async fn update_context(&self, session_id: &str, context: AgentContext) {
        let mut contexts = self.contexts.write().await;
        contexts.insert(session_id.to_string(), context);
    }

    /// 添加消息到会话上下文
    pub async fn add_message(&self, session_id: &str, message: AgentMessage) {
        let mut contexts = self.contexts.write().await;
        if let Some(context) = contexts.get_mut(session_id) {
            context.add_message(message);
        }
    }

    /// 删除会话上下文
    pub async fn delete_context(&self, session_id: &str) -> bool {
        let mut contexts = self.contexts.write().await;
        contexts.remove(session_id).is_some()
    }

    /// 获取活跃会话数
    pub async fn active_sessions(&self) -> usize {
        let contexts = self.contexts.read().await;
        contexts.len()
    }

    /// 清空所有会话上下文
    pub async fn clear_all(&self) {
        let mut contexts = self.contexts.write().await;
        contexts.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_role_as_str() {
        assert_eq!(MessageRole::System.as_str(), "system");
        assert_eq!(MessageRole::User.as_str(), "user");
        assert_eq!(MessageRole::Assistant.as_str(), "assistant");
        assert_eq!(MessageRole::ToolCall.as_str(), "tool_call");
        assert_eq!(MessageRole::ToolResult.as_str(), "tool_result");
    }

    #[test]
    fn test_agent_message_creation() {
        let msg = AgentMessage::user("Hello");
        assert_eq!(msg.role, MessageRole::User);
        assert_eq!(msg.content, "Hello");
        assert!(msg.tool_name.is_none());
    }

    #[test]
    fn test_agent_message_tool_call() {
        let msg = AgentMessage::tool_call("search", "query");
        assert_eq!(msg.role, MessageRole::ToolCall);
        assert_eq!(msg.tool_name, Some("search".to_string()));
    }

    #[test]
    fn test_agent_message_estimate_tokens() {
        let msg = AgentMessage::user("Hello, world!");
        let tokens = msg.estimate_tokens();
        assert!(tokens > 0);
    }

    #[test]
    fn test_agent_context_creation() {
        let ctx = AgentContext::new("session1", "You are helpful");
        assert_eq!(ctx.session_id, "session1");
        assert_eq!(ctx.system_prompt, "You are helpful");
        assert!(ctx.messages.is_empty());
    }

    #[test]
    fn test_agent_context_add_message() {
        let mut ctx = AgentContext::new("session1", "system");
        ctx.add_message(AgentMessage::user("Hello"));
        assert_eq!(ctx.messages.len(), 1);
        assert!(ctx.current_tokens > 0);
    }

    #[test]
    fn test_agent_context_get_recent_messages() {
        let mut ctx = AgentContext::new("session1", "system");
        ctx.add_message(AgentMessage::user("msg1"));
        ctx.add_message(AgentMessage::assistant("reply1"));
        ctx.add_message(AgentMessage::user("msg2"));

        let recent = ctx.get_recent_messages(2);
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].content, "reply1");
        assert_eq!(recent[1].content, "msg2");
    }

    #[test]
    fn test_agent_context_format_for_llm() {
        let mut ctx = AgentContext::new("session1", "system prompt");
        ctx.add_message(AgentMessage::user("Hello"));
        ctx.add_message(AgentMessage::assistant("Hi there"));

        let formatted = ctx.format_for_llm();
        assert_eq!(formatted.len(), 3); // system + user + assistant
        assert_eq!(formatted[0]["role"], "system");
        assert_eq!(formatted[1]["role"], "user");
        assert_eq!(formatted[2]["role"], "assistant");
    }

    #[test]
    fn test_agent_context_variables() {
        let mut ctx = AgentContext::new("session1", "system");
        ctx.set_variable("key", "value");
        assert_eq!(ctx.get_variable("key"), Some(&"value".to_string()));
    }

    #[tokio::test]
    async fn test_context_manager_get_or_create() {
        let manager = ContextManager::new();
        let ctx = manager.get_or_create_context("session1").await;
        assert_eq!(ctx.session_id, "session1");

        // 再次获取应该是同一个上下文
        let ctx2 = manager.get_or_create_context("session1").await;
        assert_eq!(ctx2.session_id, "session1");
        assert_eq!(manager.active_sessions().await, 1);
    }

    #[tokio::test]
    async fn test_context_manager_add_message() {
        let manager = ContextManager::new();
        manager.get_or_create_context("session1").await;
        manager
            .add_message("session1", AgentMessage::user("Hello"))
            .await;

        let ctx = manager.get_context("session1").await.unwrap();
        assert_eq!(ctx.messages.len(), 1);
    }

    #[tokio::test]
    async fn test_context_manager_delete() {
        let manager = ContextManager::new();
        manager.get_or_create_context("session1").await;
        assert_eq!(manager.active_sessions().await, 1);

        let deleted = manager.delete_context("session1").await;
        assert!(deleted);
        assert_eq!(manager.active_sessions().await, 0);
    }
}

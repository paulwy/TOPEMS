//! LlmProvider trait 定义。
//!
//! 提供统一的 LLM 调用接口，支持同步问答、流式响应、嵌入向量等能力。
//! 所有 Provider 实现（DeepSeek、Ollama、Mock）都需实现此 trait。

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::fmt;

/// Provider 类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum ProviderType {
    /// DeepSeek API（云端大模型）
    DeepSeek,
    /// Ollama（本地小模型）
    #[default]
    Ollama,
    /// Dify（Dify 代理层）
    Dify,
    /// Mock（测试用）
    Mock,
}

impl fmt::Display for ProviderType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DeepSeek => write!(f, "deepseek"),
            Self::Ollama => write!(f, "ollama"),
            Self::Dify => write!(f, "dify"),
            Self::Mock => write!(f, "mock"),
        }
    }
}

/// Provider 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    /// Provider 类型
    pub provider_type: ProviderType,
    /// API 端点 URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_url: Option<String>,
    /// API 密钥
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
    /// 默认模型名称
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_model: Option<String>,
    /// 请求超时（秒）
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    /// 最大重试次数
    #[serde(default = "default_max_retries")]
    pub max_retries: u32,
    /// 温度参数（0.0-2.0）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// 最大生成 token 数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

fn default_timeout() -> u64 {
    60
}

fn default_max_retries() -> u32 {
    3
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            provider_type: ProviderType::default(),
            api_url: None,
            api_key: None,
            default_model: None,
            timeout_secs: default_timeout(),
            max_retries: default_max_retries(),
            temperature: None,
            max_tokens: None,
        }
    }
}

impl ProviderConfig {
    /// 从环境变量创建配置
    pub fn from_env() -> Self {
        let provider_type = std::env::var("DSH_PROVIDER")
            .ok()
            .and_then(|v| match v.to_lowercase().as_str() {
                "deepseek" => Some(ProviderType::DeepSeek),
                "ollama" => Some(ProviderType::Ollama),
                "dify" => Some(ProviderType::Dify),
                "mock" => Some(ProviderType::Mock),
                _ => None,
            })
            .unwrap_or_default();

        let api_url = std::env::var("DSH_API_URL").ok();
        let api_key = std::env::var("DSH_API_KEY").ok();
        let default_model = std::env::var("DSH_MODEL").ok();

        let timeout_secs = std::env::var("DSH_TIMEOUT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or_else(default_timeout);

        let max_retries = std::env::var("DSH_MAX_RETRIES")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or_else(default_max_retries);

        let temperature = std::env::var("DSH_TEMPERATURE")
            .ok()
            .and_then(|v| v.parse().ok());

        let max_tokens = std::env::var("DSH_MAX_TOKENS")
            .ok()
            .and_then(|v| v.parse().ok());

        Self {
            provider_type,
            api_url,
            api_key,
            default_model,
            timeout_secs,
            max_retries,
            temperature,
            max_tokens,
        }
    }
}

/// LLM 调用请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmRequest {
    /// 系统提示词
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    /// 用户消息
    pub user_message: String,
    /// 对话历史
    #[serde(skip_serializing_if = "Option::is_none")]
    pub history: Option<Vec<ChatMessage>>,
    /// 模型名称（覆盖默认）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    /// 温度参数（覆盖配置）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// 最大生成 token 数（覆盖配置）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

impl LlmRequest {
    /// 创建简单的问答请求
    pub fn simple(user_message: impl Into<String>) -> Self {
        Self {
            system_prompt: None,
            user_message: user_message.into(),
            history: None,
            model: None,
            temperature: None,
            max_tokens: None,
        }
    }

    /// 带系统提示词的请求
    pub fn with_system(system_prompt: impl Into<String>, user_message: impl Into<String>) -> Self {
        Self {
            system_prompt: Some(system_prompt.into()),
            user_message: user_message.into(),
            history: None,
            model: None,
            temperature: None,
            max_tokens: None,
        }
    }
}

/// 聊天消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    /// 角色（system/user/assistant）
    pub role: String,
    /// 消息内容
    pub content: String,
}

/// LLM 调用响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmResponse {
    /// 生成的文本内容
    pub content: String,
    /// 使用的模型
    pub model: String,
    /// 输入 token 数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_tokens: Option<u32>,
    /// 输出 token 数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completion_tokens: Option<u32>,
    /// 总 token 数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<u32>,
    /// 调用耗时（毫秒）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u64>,
}

/// 流式响应 chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmStreamChunk {
    /// 增量文本内容
    pub delta: String,
    /// 是否为最后一个 chunk
    pub done: bool,
}

/// 嵌入向量请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    /// 文本列表
    pub texts: Vec<String>,
    /// 模型名称
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

/// 嵌入向量响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    /// 嵌入向量列表
    pub embeddings: Vec<Vec<f32>>,
    /// 使用的模型
    pub model: String,
}

/// LLM Provider 错误
#[derive(Debug, Clone, thiserror::Error)]
pub enum LlmProviderError {
    /// 网络错误
    #[error("Network error: {0}")]
    Network(String),
    /// API 错误
    #[error("API error: {status} - {message}")]
    Api {
        /// HTTP 状态码
        status: u16,
        /// 错误消息
        message: String,
    },
    /// 超时错误
    #[error("Timeout after {0}s")]
    Timeout(u64),
    /// 限流错误
    #[error("Rate limit exceeded")]
    RateLimit,
    /// 认证错误
    #[error("Authentication failed: {0}")]
    Authentication(String),
    /// 序列化错误
    #[error("Serialization error: {0}")]
    Serialization(String),
    /// 配置错误
    #[error("Configuration error: {0}")]
    Configuration(String),
    /// 不支持的功能
    #[error("Feature not supported: {0}")]
    Unsupported(String),
    /// 内部错误
    #[error("Internal error: {0}")]
    Internal(String),
}

/// LlmProvider trait
///
/// 所有 LLM Provider 实现都需实现此 trait，
/// 提供统一的问答、流式响应、嵌入向量等接口。
#[async_trait]
pub trait LlmProvider: Send + Sync + 'static {
    /// 获取 Provider 类型
    fn provider_type(&self) -> ProviderType;

    /// 获取 Provider 配置
    fn config(&self) -> &ProviderConfig;

    /// 同步问答
    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError>;

    /// 流式问答（返回 chunk 流）
    ///
    /// 默认实现为不支持流式，返回 Unsupported 错误。
    /// 支持流式的 Provider 应重写此方法。
    async fn ask_stream(
        &self,
        _request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        Err(LlmProviderError::Unsupported("streaming".to_string()))
    }

    /// 生成嵌入向量
    ///
    /// 默认实现为不支持嵌入，返回 Unsupported 错误。
    /// 支持嵌入的 Provider 应重写此方法。
    async fn embed(
        &self,
        _request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, LlmProviderError> {
        Err(LlmProviderError::Unsupported("embedding".to_string()))
    }

    /// 健康检查
    async fn health_check(&self) -> Result<(), LlmProviderError>;

    /// 获取支持的模型列表
    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_type_display() {
        assert_eq!(ProviderType::DeepSeek.to_string(), "deepseek");
        assert_eq!(ProviderType::Ollama.to_string(), "ollama");
        assert_eq!(ProviderType::Mock.to_string(), "mock");
    }

    #[test]
    fn test_provider_config_default() {
        let config = ProviderConfig::default();
        assert_eq!(config.provider_type, ProviderType::Ollama);
        assert_eq!(config.timeout_secs, 60);
        assert_eq!(config.max_retries, 3);
    }

    #[test]
    fn test_llm_request_simple() {
        let req = LlmRequest::simple("hello");
        assert_eq!(req.user_message, "hello");
        assert!(req.system_prompt.is_none());
    }

    #[test]
    fn test_llm_request_with_system() {
        let req = LlmRequest::with_system("you are helpful", "hello");
        assert_eq!(req.system_prompt.as_deref(), Some("you are helpful"));
        assert_eq!(req.user_message, "hello");
    }

    #[test]
    fn test_llm_provider_error_display() {
        let err = LlmProviderError::Timeout(30);
        assert_eq!(err.to_string(), "Timeout after 30s");
    }
}

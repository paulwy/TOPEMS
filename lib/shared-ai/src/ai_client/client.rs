//! AI 客户端接口定义

use anyhow::Result;
use async_trait::async_trait;
use futures::StreamExt;
use reqwest::Client;
use std::pin::Pin;
use std::sync::Arc;

use super::config::AIModelConfig;
use super::models::*;
use super::providers::{AzureOpenAIClient, GeminiClient, OllamaClient, OpenAIClient};

type AIStream =
    Pin<Box<dyn futures::Stream<Item = Result<String, AIClientError>> + Send + 'static>>;

/// AI 客户端错误类型
#[derive(Debug)]
pub enum AIClientError {
    /// 网络错误
    NetworkError(String),
    /// API 错误
    ApiError(String),
    /// 解析错误
    ParseError(String),
    /// 配置错误
    ConfigError(String),
    /// 超时错误
    TimeoutError(String),
    /// 认证错误
    AuthError(String),
    /// 服务不可用
    ServiceUnavailable(String),
    /// 未实现
    NotImplemented(String),
}

impl std::fmt::Display for AIClientError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIClientError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            AIClientError::ApiError(msg) => write!(f, "API error: {}", msg),
            AIClientError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            AIClientError::ConfigError(msg) => write!(f, "Config error: {}", msg),
            AIClientError::TimeoutError(msg) => write!(f, "Timeout error: {}", msg),
            AIClientError::AuthError(msg) => write!(f, "Auth error: {}", msg),
            AIClientError::ServiceUnavailable(msg) => write!(f, "Service unavailable: {}", msg),
            AIClientError::NotImplemented(msg) => write!(f, "Not implemented: {}", msg),
        }
    }
}

impl std::error::Error for AIClientError {}

impl From<reqwest::Error> for AIClientError {
    fn from(e: reqwest::Error) -> Self {
        if e.is_timeout() {
            AIClientError::TimeoutError(e.to_string())
        } else {
            AIClientError::NetworkError(e.to_string())
        }
    }
}

impl From<serde_json::Error> for AIClientError {
    fn from(e: serde_json::Error) -> Self {
        AIClientError::ParseError(e.to_string())
    }
}

/// AI 客户端接口（非 dyn 安全版本）
#[async_trait]
pub trait AIClient: Send + Sync {
    /// 聊天完成
    async fn chat_completion(
        &self,
        request: ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, AIClientError>;

    /// 流式聊天完成
    async fn chat_completion_stream(
        &self,
        request: ChatCompletionRequest,
    ) -> Result<
        Pin<
            Box<dyn futures::Stream<Item = Result<StreamingChunk, AIClientError>> + Send + 'static>,
        >,
        AIClientError,
    >;

    /// 生成嵌入
    async fn embeddings(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, AIClientError>;

    /// 获取模型列表
    async fn list_models(&self) -> Result<ModelListResponse, AIClientError>;

    /// 健康检查
    async fn health_check(&self) -> Result<bool, AIClientError>;

    /// 获取配置
    fn get_config(&self) -> &AIModelConfig;
}

/// 统一 AI 客户端包装器 - 使用枚举包装不同客户端类型
#[derive(Clone)]
pub enum UnifiedAIClient {
    OpenAI(Arc<OpenAIClient>),
    Gemini(Arc<GeminiClient>),
    Ollama(Arc<OllamaClient>),
    AzureOpenAI(Arc<AzureOpenAIClient>),
}

impl UnifiedAIClient {
    /// 创建聊天请求
    pub fn create_chat_request(&self, messages: Vec<ChatMessage>) -> ChatCompletionRequest {
        let config = self.get_config();
        ChatCompletionRequest {
            model: config.model_name.clone(),
            messages,
            temperature: Some(config.get_temperature()),
            max_tokens: Some(config.get_max_tokens()),
            stream: Some(false),
            ..Default::default()
        }
    }

    /// 创建流式聊天请求
    pub fn create_streaming_chat_request(
        &self,
        messages: Vec<ChatMessage>,
    ) -> ChatCompletionRequest {
        let config = self.get_config();
        ChatCompletionRequest {
            model: config.model_name.clone(),
            messages,
            temperature: Some(config.get_temperature()),
            max_tokens: Some(config.get_max_tokens()),
            stream: Some(true),
            ..Default::default()
        }
    }

    /// 简单聊天接口
    pub async fn chat(&self, messages: Vec<ChatMessage>) -> Result<String, AIClientError> {
        let request = self.create_chat_request(messages);
        let response = match self {
            UnifiedAIClient::OpenAI(client) => client.chat_completion(request).await,
            UnifiedAIClient::Gemini(client) => client.chat_completion(request).await,
            UnifiedAIClient::Ollama(client) => client.chat_completion(request).await,
            UnifiedAIClient::AzureOpenAI(client) => client.chat_completion(request).await,
        }?;

        if let Some(choice) = response.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err(AIClientError::ApiError("No response choices".to_string()))
        }
    }

    /// 简单流式聊天接口
    pub async fn chat_stream(&self, messages: Vec<ChatMessage>) -> Result<AIStream, AIClientError> {
        let request = self.create_streaming_chat_request(messages);

        let result: Result<AIStream, AIClientError>;

        match self {
            UnifiedAIClient::OpenAI(client) => {
                let stream = client.chat_completion_stream(request).await?;
                result = Ok(process_stream(stream));
            }
            UnifiedAIClient::Gemini(_) => {
                result = Err(AIClientError::NotImplemented(
                    "Gemini streaming not implemented".to_string(),
                ));
            }
            UnifiedAIClient::Ollama(client) => {
                let stream = client.chat_completion_stream(request).await?;
                result = Ok(process_stream(stream));
            }
            UnifiedAIClient::AzureOpenAI(client) => {
                let stream = client.chat_completion_stream(request).await?;
                result = Ok(process_stream(stream));
            }
        }

        result
    }

    /// 简单嵌入接口
    pub async fn embed(&self, text: &str) -> Result<Vec<f32>, AIClientError> {
        let config = self.get_config();
        let request = EmbeddingRequest {
            model: config.model_name.clone(),
            input: vec![text.to_string()],
            ..Default::default()
        };

        let response = match self {
            UnifiedAIClient::OpenAI(client) => client.embeddings(request).await,
            UnifiedAIClient::Gemini(client) => client.embeddings(request).await,
            UnifiedAIClient::Ollama(client) => client.embeddings(request).await,
            UnifiedAIClient::AzureOpenAI(client) => client.embeddings(request).await,
        }?;

        if let Some(data) = response.data.first() {
            Ok(data.embedding.clone())
        } else {
            Err(AIClientError::ApiError("No embedding data".to_string()))
        }
    }

    /// 批量嵌入接口
    pub async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, AIClientError> {
        let config = self.get_config();
        let request = EmbeddingRequest {
            model: config.model_name.clone(),
            input: texts.to_vec(),
            ..Default::default()
        };

        let response = match self {
            UnifiedAIClient::OpenAI(client) => client.embeddings(request).await,
            UnifiedAIClient::Gemini(client) => client.embeddings(request).await,
            UnifiedAIClient::Ollama(client) => client.embeddings(request).await,
            UnifiedAIClient::AzureOpenAI(client) => client.embeddings(request).await,
        }?;

        Ok(response.data.into_iter().map(|d| d.embedding).collect())
    }

    /// 健康检查
    pub async fn health_check(&self) -> Result<bool, AIClientError> {
        match self {
            UnifiedAIClient::OpenAI(client) => client.health_check().await,
            UnifiedAIClient::Gemini(client) => client.health_check().await,
            UnifiedAIClient::Ollama(client) => client.health_check().await,
            UnifiedAIClient::AzureOpenAI(client) => client.health_check().await,
        }
    }

    /// 获取配置
    pub fn get_config(&self) -> &AIModelConfig {
        match self {
            UnifiedAIClient::OpenAI(client) => client.get_config(),
            UnifiedAIClient::Gemini(client) => client.get_config(),
            UnifiedAIClient::Ollama(client) => client.get_config(),
            UnifiedAIClient::AzureOpenAI(client) => client.get_config(),
        }
    }
}

fn process_stream<S>(
    stream: S,
) -> Pin<Box<dyn futures::Stream<Item = Result<String, AIClientError>> + Send + 'static>>
where
    S: futures::Stream<Item = Result<StreamingChunk, AIClientError>> + Send + 'static,
{
    Box::pin(stream.map(|result| {
        result.map(|chunk| {
            chunk
                .choices
                .first()
                .and_then(|c| c.delta.content.clone())
                .unwrap_or_default()
        })
    }))
}

/// 创建 HTTP 客户端
pub fn create_http_client(timeout: std::time::Duration) -> Client {
    Client::builder()
        .timeout(timeout)
        .connect_timeout(timeout / 2)
        .build()
        .expect("Failed to create HTTP client")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = AIClientError::NetworkError("test".to_string());
        assert!(error.to_string().contains("Network error"));

        let error = AIClientError::TimeoutError("timeout".to_string());
        assert!(error.to_string().contains("Timeout error"));
    }

    #[test]
    fn test_create_http_client() {
        let client = create_http_client(std::time::Duration::from_secs(30));
        let _ = client;
    }

    #[test]
    fn test_all_error_variants_display() {
        // NetworkError
        let s = AIClientError::NetworkError("boom".to_string()).to_string();
        assert!(s.contains("Network error"), "{}", s);
        assert!(s.contains("boom"), "{}", s);

        // ApiError
        let s = AIClientError::ApiError("bad status".to_string()).to_string();
        assert!(s.contains("API error"), "{}", s);
        assert!(s.contains("bad status"), "{}", s);

        // ParseError
        let s = AIClientError::ParseError("invalid json".to_string()).to_string();
        assert!(s.contains("Parse error"), "{}", s);
        assert!(s.contains("invalid json"), "{}", s);

        // ConfigError
        let s = AIClientError::ConfigError("missing field".to_string()).to_string();
        assert!(s.contains("Config error"), "{}", s);
        assert!(s.contains("missing field"), "{}", s);

        // TimeoutError
        let s = AIClientError::TimeoutError("30s".to_string()).to_string();
        assert!(s.contains("Timeout error"), "{}", s);
        assert!(s.contains("30s"), "{}", s);

        // AuthError
        let s = AIClientError::AuthError("invalid key".to_string()).to_string();
        assert!(s.contains("Auth error"), "{}", s);
        assert!(s.contains("invalid key"), "{}", s);

        // ServiceUnavailable
        let s = AIClientError::ServiceUnavailable("503".to_string()).to_string();
        assert!(s.contains("Service unavailable"), "{}", s);
        assert!(s.contains("503"), "{}", s);

        // NotImplemented
        let s = AIClientError::NotImplemented("todo".to_string()).to_string();
        assert!(s.contains("Not implemented"), "{}", s);
        assert!(s.contains("todo"), "{}", s);
    }

    #[test]
    fn test_error_trait_implementation() {
        // 验证 AIClientError 实现了 std::error::Error trait
        fn assert_error<T: std::error::Error>(_: &T) {}

        let errors: Vec<AIClientError> = vec![
            AIClientError::NetworkError("a".to_string()),
            AIClientError::ApiError("b".to_string()),
            AIClientError::ParseError("c".to_string()),
            AIClientError::ConfigError("d".to_string()),
            AIClientError::TimeoutError("e".to_string()),
            AIClientError::AuthError("f".to_string()),
            AIClientError::ServiceUnavailable("g".to_string()),
            AIClientError::NotImplemented("h".to_string()),
        ];
        for err in &errors {
            assert_error(err);
        }
    }

    #[test]
    fn test_from_serde_json_error() {
        let bad_json = "{ this is not valid json";
        let result: Result<serde_json::Value, _> = serde_json::from_str(bad_json);
        assert!(result.is_err());
        let json_err = result.unwrap_err();
        let ai_err: AIClientError = json_err.into();
        match &ai_err {
            AIClientError::ParseError(msg) => {
                assert!(!msg.is_empty());
            }
            other => panic!("expected ParseError, got {:?}", other),
        }
        // ParseError 的 Display 应包含 "Parse error"
        assert!(ai_err.to_string().contains("Parse error"));
    }
}

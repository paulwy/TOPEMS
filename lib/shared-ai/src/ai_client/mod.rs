//! 统一 AI 客户端抽象层
//!
//! 提供统一的接口访问多种 AI 服务：OpenAI、Gemini、Ollama 等

pub mod client;
pub mod config;
pub mod models;
pub mod providers;

pub use client::{AIClient, AIClientError, UnifiedAIClient};
pub use config::{AIModelConfig, AIProviderType, ModelType};
pub use models::{
    ChatCompletionRequest, ChatCompletionResponse, ChatMessage, EmbeddingRequest,
    EmbeddingResponse, FunctionCall, FunctionDefinition,
};
pub use providers::{create_client, get_supported_models};

//! # TOPEMS Shared AI
//!
//! AI 能力模块，提供向量存储、嵌入服务、AI 客户端、Ollama 集成等能力。
//!
//! 包含：向量存储（Redis/Postgres）、嵌入服务、AI 客户端（统一接口）、
//! Ollama 客户端、File 服务客户端等。

pub mod ai_client;
pub mod embedding;
pub mod file_client;
pub mod ollama_client;
pub mod vector_store;

// 从各模块 re-export 关键类型
pub use ai_client::{
    create_client, get_supported_models, AIClient, AIClientError, AIModelConfig, AIProviderType,
    ChatCompletionRequest, ChatCompletionResponse, ChatMessage, EmbeddingRequest,
    EmbeddingResponse, UnifiedAIClient,
};
pub use embedding::{
    create_embedding_service, preprocess_text, EmbeddingConfig, EmbeddingResult, EmbeddingUsage,
};
pub use file_client::{FileServiceClient, UploadResponse};
pub use ollama_client::{
    create_embedder, create_ollama_client, Embedder, MockEmbedder, OllamaClient, OllamaConfig,
    OllamaEmbedder,
};
pub use vector_store::{
    create_vector_store, RedisVectorStore, SearchResult, VectorMetadata, VectorStore,
};

// 为了兼容性，提供 ollama 别名
pub mod ollama {
    pub use crate::ollama_client::*;
}

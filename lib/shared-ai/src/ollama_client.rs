//! Ollama 集成 API
//!
//! 提供基于 Ollama 的嵌入和聊天功能

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::embedding::{EmbeddingResult, EmbeddingService, EmbeddingUsage};

/// Ollama 配置
#[derive(Debug, Clone, Deserialize)]
pub struct OllamaConfig {
    /// Ollama 服务地址
    pub base_url: String,
    /// 模型名称
    pub model: String,
    /// 向量维度
    pub dimension: usize,
}

impl Default for OllamaConfig {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:11434".to_string(),
            model: "nomic-embed-text".to_string(),
            dimension: 768,
        }
    }
}

/// Ollama 聊天请求
#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

/// Ollama 聊天响应
#[derive(Debug, Deserialize)]
struct ChatResponse {
    message: ChatMessageResponse,
}

#[derive(Debug, Deserialize)]
struct ChatMessageResponse {
    content: String,
}

/// Ollama 嵌入请求
#[derive(Debug, Serialize)]
struct EmbedRequest {
    model: String,
    prompt: String,
}

/// Ollama 嵌入响应
#[derive(Debug, Deserialize)]
struct EmbedResponse {
    embedding: Vec<f32>,
}

/// Ollama 客户端
#[derive(Clone)]
pub struct OllamaClient {
    base_url: String,
    model: String,
    #[allow(dead_code)]
    dimension: usize,
    client: reqwest::Client,
}

impl OllamaClient {
    pub fn new(config: OllamaConfig) -> Self {
        Self {
            base_url: config.base_url,
            model: config.model,
            dimension: config.dimension,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .build()
                .unwrap_or_default(),
        }
    }

    /// 健康检查
    pub async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/api/tags", self.base_url);
        match self.client.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    /// 生成文本嵌入
    pub async fn embed(&self, text: &str) -> Result<Vec<f32>> {
        let url = format!("{}/api/embeddings", self.base_url);

        let request = EmbedRequest {
            model: self.model.clone(),
            prompt: text.to_string(),
        };

        let response = self.client.post(&url).json(&request).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Ollama embed error: {} - {}", status, body);
        }

        let embed_response: EmbedResponse = response.json().await?;

        Ok(embed_response.embedding)
    }

    /// 聊天
    pub async fn chat(&self, prompt: &str) -> Result<String> {
        let url = format!("{}/api/chat", self.base_url);

        let request = ChatRequest {
            model: self.model.clone(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            stream: false,
        };

        let response = self.client.post(&url).json(&request).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Ollama chat error: {} - {}", status, body);
        }

        let chat_response: ChatResponse = response.json().await?;

        Ok(chat_response.message.content)
    }

    /// 获取模型信息
    pub async fn get_model_info(&self) -> Result<serde_json::Value> {
        let url = format!("{}/api/show", self.base_url);
        let response = self
            .client
            .post(&url)
            .json(&serde_json::json!({ "name": self.model }))
            .send()
            .await?;

        Ok(response.json().await?)
    }
}

/// 嵌入 trait
#[async_trait]
pub trait Embedder: Send + Sync {
    async fn embed(&self, text: &str) -> Result<Vec<f32>>;
}

/// Ollama 嵌入实现
pub struct OllamaEmbedder {
    client: OllamaClient,
}

impl OllamaEmbedder {
    pub fn new(client: OllamaClient) -> Self {
        Self { client }
    }
}

#[async_trait]
impl Embedder for OllamaEmbedder {
    async fn embed(&self, text: &str) -> Result<Vec<f32>> {
        self.client.embed(text).await
    }
}

/// 实现 EmbeddingService trait
#[async_trait]
impl EmbeddingService for OllamaEmbedder {
    async fn embed(&self, text: &str) -> Result<EmbeddingResult> {
        let embedding = self.client.embed(text).await?;
        Ok(EmbeddingResult {
            embedding,
            model: self.client.model.clone(),
            usage: EmbeddingUsage {
                prompt_tokens: text.len() / 4,
                total_tokens: text.len() / 4,
            },
        })
    }

    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<EmbeddingResult>> {
        let mut results = Vec::new();
        for text in texts {
            results.push(EmbeddingService::embed(self, text).await?);
        }
        Ok(results)
    }
}

/// Mock 嵌入实现（用于测试）
pub struct MockEmbedder {
    dimension: usize,
}

impl MockEmbedder {
    pub fn new(dimension: usize) -> Self {
        Self { dimension }
    }
}

#[async_trait]
impl Embedder for MockEmbedder {
    async fn embed(&self, text: &str) -> Result<Vec<f32>> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        text.hash(&mut hasher);
        let hash = hasher.finish();

        let mut rng = SimpleRng::new(hash);
        let embedding: Vec<f32> = (0..self.dimension).map(|_| rng.next_f32()).collect();

        // 归一化
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        let embedding: Vec<f32> = embedding.iter().map(|x| x / norm).collect();

        Ok(embedding)
    }
}

/// 简单随机数生成器
struct SimpleRng {
    state: u64,
}

impl SimpleRng {
    fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_u64(&mut self) -> u64 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }

    fn next_f32(&mut self) -> f32 {
        (self.next_u64() as f32) / (u64::MAX as f32)
    }
}

/// 工厂函数
pub fn create_embedder(use_ollama: bool, config: Option<OllamaConfig>) -> Arc<dyn Embedder> {
    if use_ollama {
        if let Some(cfg) = config {
            let client = OllamaClient::new(cfg);
            return Arc::new(OllamaEmbedder::new(client));
        }
    }

    // 默认使用 Mock
    Arc::new(MockEmbedder::new(3584))
}

/// 创建 Ollama 客户端
pub fn create_ollama_client(config: OllamaConfig) -> OllamaClient {
    OllamaClient::new(config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_embedder() {
        let embedder = MockEmbedder::new(3584);

        let result = embedder
            .embed("Hello world")
            .await
            .expect("Failed to embed text");
        assert_eq!(result.len(), 3584);

        // 相同文本应产生相同结果
        let result2 = embedder
            .embed("Hello world")
            .await
            .expect("Failed to embed text");
        assert_eq!(result, result2);
    }

    #[tokio::test]
    async fn test_ollama_embedder() {
        let client = OllamaClient::new(OllamaConfig::default());
        let healthy = client
            .health_check()
            .await
            .expect("Failed to check Ollama health");
        println!("Ollama healthy: {}", healthy);

        if healthy {
            let embedding = client
                .embed("Hello world")
                .await
                .expect("Failed to embed text");
            println!("Embedding length: {}", embedding.len());
            assert!(!embedding.is_empty(), "Embedding should not be empty");
        }
    }
}

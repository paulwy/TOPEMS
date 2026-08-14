//! 嵌入生成服务
//!
//! 支持 OpenAI API、本地 BGE 模型和 Ollama

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// 嵌入配置
#[derive(Debug, Clone, Deserialize)]
pub struct EmbeddingConfig {
    /// 提供者: openai, local, mock, ollama
    pub provider: String,
    /// 模型名称
    pub model: String,
    /// 向量维度
    pub dimension: usize,
    /// API 密钥环境变量名
    pub api_key_env: Option<String>,
    /// 本地服务端点
    pub endpoint: Option<String>,
    /// Ollama 配置
    pub ollama_url: Option<String>,
}

impl Default for EmbeddingConfig {
    fn default() -> Self {
        Self {
            provider: "ollama".to_string(), // 默认使用 Ollama
            model: "qwen2.5:7b-instruct".to_string(),
            dimension: 3584, // Qwen2.5 维度
            api_key_env: Some("OPENAI_API_KEY".to_string()),
            endpoint: None,
            ollama_url: Some("http://localhost:11434".to_string()),
        }
    }
}

/// 嵌入结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResult {
    pub embedding: Vec<f32>,
    pub model: String,
    pub usage: EmbeddingUsage,
}

/// 使用量统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingUsage {
    pub prompt_tokens: usize,
    pub total_tokens: usize,
}

/// 嵌入服务 trait
#[async_trait]
pub trait EmbeddingService: Send + Sync {
    /// 生成单个文本的嵌入
    async fn embed(&self, text: &str) -> Result<EmbeddingResult>;

    /// 批量生成嵌入
    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<EmbeddingResult>>;
}

/// OpenAI 嵌入服务
#[derive(Clone)]
pub struct OpenAIEmbedding {
    api_key: String,
    model: String,
    #[allow(dead_code)]
    dimension: usize,
    client: reqwest::Client,
}

impl OpenAIEmbedding {
    pub fn new(api_key: String, model: String, dimension: usize) -> Self {
        Self {
            api_key,
            model,
            dimension,
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    input: Vec<String>,
    model: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    data: Vec<OpenAIData>,
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
struct OpenAIData {
    embedding: Vec<f32>,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: u32,
    total_tokens: u32,
}

#[async_trait]
impl EmbeddingService for OpenAIEmbedding {
    async fn embed(&self, text: &str) -> Result<EmbeddingResult> {
        self.embed_batch(&[text.to_string()])
            .await
            .map(|mut results| results.remove(0))
    }

    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<EmbeddingResult>> {
        let request = OpenAIRequest {
            input: texts.to_vec(),
            model: self.model.clone(),
        };

        let response = self
            .client
            .post("https://api.openai.com/v1/embeddings")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("OpenAI API error: {} - {}", status, body);
        }

        let openai_response: OpenAIResponse = response.json().await?;

        let results = openai_response
            .data
            .into_iter()
            .map(|data| EmbeddingResult {
                embedding: data.embedding,
                model: self.model.clone(),
                usage: EmbeddingUsage {
                    prompt_tokens: openai_response.usage.prompt_tokens as usize,
                    total_tokens: openai_response.usage.total_tokens as usize,
                },
            })
            .collect();

        Ok(results)
    }
}

/// 本地 BGE 嵌入服务
#[derive(Clone)]
pub struct LocalEmbedding {
    endpoint: String,
    #[allow(dead_code)]
    dimension: usize,
    client: reqwest::Client,
}

impl LocalEmbedding {
    pub fn new(endpoint: String, dimension: usize) -> Self {
        Self {
            endpoint,
            dimension,
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Debug, Serialize)]
struct LocalRequest {
    texts: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct LocalResponse {
    embeddings: Vec<Vec<f32>>,
}

#[async_trait]
impl EmbeddingService for LocalEmbedding {
    async fn embed(&self, text: &str) -> Result<EmbeddingResult> {
        self.embed_batch(&[text.to_string()])
            .await
            .map(|mut results| results.remove(0))
    }

    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<EmbeddingResult>> {
        let request = LocalRequest {
            texts: texts.to_vec(),
        };

        let response = self
            .client
            .post(&self.endpoint)
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            anyhow::bail!("Local embedding error: {}", response.status());
        }

        let local_response: LocalResponse = response.json().await?;

        let results = local_response
            .embeddings
            .into_iter()
            .map(|embedding| EmbeddingResult {
                embedding,
                model: "local".to_string(),
                usage: EmbeddingUsage {
                    prompt_tokens: 0,
                    total_tokens: 0,
                },
            })
            .collect();

        Ok(results)
    }
}

/// Mock 嵌入服务（用于测试）
#[derive(Clone)]
pub struct MockEmbedding {
    dimension: usize,
}

impl MockEmbedding {
    pub fn new(dimension: usize) -> Self {
        Self { dimension }
    }
}

#[async_trait]
impl EmbeddingService for MockEmbedding {
    async fn embed(&self, text: &str) -> Result<EmbeddingResult> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        // 使用文本的哈希生成确定性的随机向量
        let mut hasher = DefaultHasher::new();
        text.hash(&mut hasher);
        let hash = hasher.finish();

        let mut rng = SimpleRng::new(hash);

        let embedding: Vec<f32> = (0..self.dimension).map(|_| rng.next_f32()).collect();

        // 归一化
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        let embedding: Vec<f32> = embedding.iter().map(|x| x / norm).collect();

        Ok(EmbeddingResult {
            embedding,
            model: "mock".to_string(),
            usage: EmbeddingUsage {
                prompt_tokens: text.len() / 4,
                total_tokens: text.len() / 4,
            },
        })
    }

    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<EmbeddingResult>> {
        let mut results = Vec::new();
        for text in texts {
            results.push(self.embed(text).await?);
        }
        Ok(results)
    }
}

/// 简单的确定性随机数生成器
struct SimpleRng {
    state: u64,
}

impl SimpleRng {
    fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_u64(&mut self) -> u64 {
        // xorshift64
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }

    fn next_f32(&mut self) -> f32 {
        (self.next_u64() as f32) / (u64::MAX as f32)
    }
}

/// 工厂函数：根据配置创建嵌入服务
pub fn create_embedding_service(config: &EmbeddingConfig) -> Result<Arc<dyn EmbeddingService>> {
    match config.provider.as_str() {
        "ollama" => {
            // 使用 Ollama（Qwen2.5:7b-instruct 等）
            let ollama_config = crate::ollama_client::OllamaConfig {
                base_url: config
                    .ollama_url
                    .clone()
                    .unwrap_or_else(|| "http://localhost:11434".to_string()),
                model: config.model.clone(),
                dimension: config.dimension,
            };
            Ok(Arc::new(crate::ollama_client::OllamaEmbedder::new(
                crate::ollama_client::OllamaClient::new(ollama_config),
            )))
        }
        "openai" => {
            let api_key = std::env::var(config.api_key_env.as_deref().unwrap_or("OPENAI_API_KEY"))
                .map_err(|_| anyhow::anyhow!("OpenAI API key not found"))?;

            Ok(Arc::new(OpenAIEmbedding::new(
                api_key,
                config.model.clone(),
                config.dimension,
            )))
        }
        "local" => {
            let endpoint = config
                .endpoint
                .clone()
                .unwrap_or_else(|| "http://localhost:8080/embed".to_string());

            Ok(Arc::new(LocalEmbedding::new(endpoint, config.dimension)))
        }
        "mock" => Ok(Arc::new(MockEmbedding::new(config.dimension))),
        _ => anyhow::bail!("Unknown embedding provider: {}", config.provider),
    }
}

/// 文本预处理
pub fn preprocess_text(text: &str, max_length: usize) -> String {
    let text = text.trim();

    // 截断过长文本
    if text.len() > max_length {
        let truncated = &text[..max_length];
        // 尽量在句子边界截断
        if let Some(last_newline) = truncated.rfind('\n') {
            truncated[..last_newline].to_string()
        } else if let Some(last_space) = truncated.rfind(' ') {
            truncated[..last_space].to_string()
        } else {
            truncated.to_string()
        }
    } else {
        text.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preprocess_text() {
        let short = "Hello world";
        assert_eq!(preprocess_text(short, 100), short);

        let long = "a".repeat(200);
        let result = preprocess_text(&long, 100);
        assert!(result.len() <= 100);
    }

    #[tokio::test]
    async fn test_mock_embedding() {
        let service = MockEmbedding::new(1536);

        let result = service.embed("Hello world").await.unwrap();
        assert_eq!(result.embedding.len(), 1536);

        // 相同文本应产生相同结果
        let result2 = service.embed("Hello world").await.unwrap();
        assert_eq!(result.embedding, result2.embedding);
    }

    #[test]
    fn test_embedding_config_default() {
        let config = EmbeddingConfig::default();
        assert_eq!(config.provider, "ollama");
        assert_eq!(config.model, "qwen2.5:7b-instruct");
        assert_eq!(config.dimension, 3584);
        assert_eq!(config.api_key_env.as_deref(), Some("OPENAI_API_KEY"));
        assert_eq!(config.ollama_url.as_deref(), Some("http://localhost:11434"));
        assert!(config.endpoint.is_none());
    }

    #[test]
    fn test_embedding_config_deserialize() {
        let json = r#"{
            "provider": "openai",
            "model": "text-embedding-3-small",
            "dimension": 1536,
            "api_key_env": "OPENAI_API_KEY",
            "endpoint": "http://localhost:8080/embed",
            "ollama_url": null
        }"#;
        let config: EmbeddingConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.provider, "openai");
        assert_eq!(config.model, "text-embedding-3-small");
        assert_eq!(config.dimension, 1536);
        assert_eq!(config.api_key_env.as_deref(), Some("OPENAI_API_KEY"));
        assert_eq!(config.endpoint.as_deref(), Some("http://localhost:8080/embed"));
        assert!(config.ollama_url.is_none());
    }

    #[test]
    fn test_embedding_result_serde_roundtrip() {
        let result = EmbeddingResult {
            embedding: vec![0.1, 0.2, 0.3],
            model: "mock".to_string(),
            usage: EmbeddingUsage {
                prompt_tokens: 5,
                total_tokens: 5,
            },
        };
        let json = serde_json::to_string(&result).unwrap();
        let deserialized: EmbeddingResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.embedding, vec![0.1, 0.2, 0.3]);
        assert_eq!(deserialized.model, "mock");
        assert_eq!(deserialized.usage.prompt_tokens, 5);
        assert_eq!(deserialized.usage.total_tokens, 5);
    }

    #[test]
    fn test_embedding_usage_serde_roundtrip() {
        let usage = EmbeddingUsage {
            prompt_tokens: 42,
            total_tokens: 100,
        };
        let json = serde_json::to_string(&usage).unwrap();
        let deserialized: EmbeddingUsage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.prompt_tokens, 42);
        assert_eq!(deserialized.total_tokens, 100);
    }

    #[tokio::test]
    async fn test_mock_embedding_batch() {
        let service = MockEmbedding::new(8);
        let texts = vec![
            "hello".to_string(),
            "world".to_string(),
            "foo".to_string(),
        ];
        let results = service.embed_batch(&texts).await.unwrap();
        assert_eq!(results.len(), 3);
        for r in &results {
            assert_eq!(r.embedding.len(), 8);
            assert_eq!(r.model, "mock");
        }
        // 不同文本应产生不同嵌入
        assert_ne!(results[0].embedding, results[1].embedding);
    }

    #[tokio::test]
    async fn test_mock_embedding_is_normalized() {
        let service = MockEmbedding::new(64);
        let result = service.embed("normalize me").await.unwrap();
        let norm: f32 = result.embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!(
            (norm - 1.0).abs() < 1e-5,
            "expected unit norm, got {}",
            norm
        );
    }

    #[tokio::test]
    async fn test_mock_embedding_usage_proportional_to_length() {
        let service = MockEmbedding::new(4);
        let short = service.embed("ab").await.unwrap();
        let long = service.embed("abcdefghijklmnopqrst").await.unwrap();
        // prompt_tokens = text.len() / 4
        assert!(long.usage.prompt_tokens >= short.usage.prompt_tokens);
    }

    #[test]
    fn test_preprocess_text_short_untouched() {
        let text = "  hello world  ";
        assert_eq!(preprocess_text(text, 100), "hello world");
    }

    #[test]
    fn test_preprocess_text_truncate_at_newline() {
        let mut text = "first line\n".to_string();
        text.push_str(&"b".repeat(200));
        let result = preprocess_text(&text, 50);
        // 应在换行符处截断
        assert_eq!(result, "first line");
    }

    #[test]
    fn test_preprocess_text_truncate_at_space() {
        let text = format!("{}{}", "a".repeat(40), " the rest");
        let result = preprocess_text(&text, 45);
        // 截断后不应包含完整 "the rest"
        assert!(!result.contains("the rest"));
        assert!(result.len() <= 45);
    }

    #[test]
    fn test_preprocess_text_truncate_no_boundary() {
        let text = "a".repeat(200);
        let result = preprocess_text(&text, 50);
        assert_eq!(result.len(), 50);
    }

    #[test]
    fn test_create_embedding_service_mock() {
        let config = EmbeddingConfig {
            provider: "mock".to_string(),
            model: "mock-model".to_string(),
            dimension: 16,
            api_key_env: None,
            endpoint: None,
            ollama_url: None,
        };
        let service = create_embedding_service(&config).unwrap();
        // 仅验证可以创建（不调用网络）
        let _ = service;
    }

    #[test]
    fn test_create_embedding_service_unknown_provider() {
        let config = EmbeddingConfig {
            provider: "unknown_provider".to_string(),
            model: "x".to_string(),
            dimension: 16,
            api_key_env: None,
            endpoint: None,
            ollama_url: None,
        };
        let result = create_embedding_service(&config);
        assert!(result.is_err());
    }
}

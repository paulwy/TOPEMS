//! Mock Provider 实现（测试用）。
//!
//! 返回固定的响应，不依赖外部 API，用于单元测试和集成测试。

use async_trait::async_trait;

use super::trait_::{
    EmbeddingRequest, EmbeddingResponse, LlmProvider, LlmProviderError, LlmRequest, LlmResponse,
    LlmStreamChunk, ProviderConfig, ProviderType,
};

/// Mock Provider
#[derive(Clone)]
pub struct MockProvider {
    config: ProviderConfig,
    /// 固定响应内容
    fixed_response: String,
}

impl Default for MockProvider {
    fn default() -> Self {
        Self {
            config: ProviderConfig::default(),
            fixed_response: "This is a mock response from DSH MockProvider.".to_string(),
        }
    }
}

impl MockProvider {
    /// 创建新的 Mock Provider
    pub fn new(config: ProviderConfig) -> Self {
        Self {
            config,
            fixed_response: "This is a mock response from DSH MockProvider.".to_string(),
        }
    }

    /// 创建带自定义响应的 Mock Provider
    pub fn with_response(config: ProviderConfig, response: impl Into<String>) -> Self {
        Self {
            config,
            fixed_response: response.into(),
        }
    }
}

#[async_trait]
impl LlmProvider for MockProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Mock
    }

    fn config(&self) -> &ProviderConfig {
        &self.config
    }

    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| "mock-model".to_string());

        Ok(LlmResponse {
            content: self.fixed_response.clone(),
            model,
            prompt_tokens: Some(10),
            completion_tokens: Some(20),
            total_tokens: Some(30),
            latency_ms: Some(1),
        })
    }

    async fn ask_stream(
        &self,
        _request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        let (tx, rx) = tokio::sync::mpsc::channel(10);
        let response = self.fixed_response.clone();

        tokio::spawn(async move {
            // 模拟流式输出，每次发送一个字符
            for ch in response.chars() {
                let _ = tx
                    .send(LlmStreamChunk {
                        delta: ch.to_string(),
                        done: false,
                    })
                    .await;
                tokio::time::sleep(std::time::Duration::from_millis(1)).await;
            }

            let _ = tx
                .send(LlmStreamChunk {
                    delta: String::new(),
                    done: true,
                })
                .await;
        });

        Ok(rx)
    }

    async fn embed(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, LlmProviderError> {
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| "mock-embed".to_string());

        // 返回固定的 768 维零向量
        let embeddings = request.texts.iter().map(|_| vec![0.0f32; 768]).collect();

        Ok(EmbeddingResponse { embeddings, model })
    }

    async fn health_check(&self) -> Result<(), LlmProviderError> {
        Ok(())
    }

    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
        Ok(vec![
            "mock-model".to_string(),
            "mock-model-large".to_string(),
        ])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_ask() {
        let provider = MockProvider::default();
        let request = LlmRequest::simple("hello");
        let response = provider.ask(request).await.unwrap();

        assert!(!response.content.is_empty());
        assert_eq!(response.model, "mock-model");
        assert_eq!(response.prompt_tokens, Some(10));
    }

    #[tokio::test]
    async fn test_mock_health_check() {
        let provider = MockProvider::default();
        assert!(provider.health_check().await.is_ok());
    }

    #[tokio::test]
    async fn test_mock_list_models() {
        let provider = MockProvider::default();
        let models = provider.list_models().await.unwrap();
        assert_eq!(models.len(), 2);
    }

    #[tokio::test]
    async fn test_mock_embed() {
        let provider = MockProvider::default();
        let request = EmbeddingRequest {
            texts: vec!["hello".to_string(), "world".to_string()],
            model: None,
        };
        let response = provider.embed(request).await.unwrap();
        assert_eq!(response.embeddings.len(), 2);
        assert_eq!(response.embeddings[0].len(), 768);
    }

    #[test]
    fn test_mock_provider_type() {
        let provider = MockProvider::default();
        assert_eq!(provider.provider_type(), ProviderType::Mock);
    }

    #[test]
    fn test_mock_with_custom_response() {
        let config = ProviderConfig::default();
        let provider = MockProvider::with_response(config, "custom response");
        assert_eq!(provider.fixed_response, "custom response");
    }
}

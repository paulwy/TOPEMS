//! ProviderFactory — 配置驱动的 Provider 创建工厂。
//!
//! 根据 ProviderConfig 中的 provider_type 自动创建对应的 Provider 实例。
//! 支持 DeepSeek、Ollama、Mock 三种 Provider。

use std::sync::Arc;

use super::deepseek::DeepSeekProvider;
use super::mock::MockProvider;
use super::ollama::OllamaProvider;
use super::trait_::{LlmProvider, ProviderConfig, ProviderType};

/// Provider 工厂
pub struct ProviderFactory;

impl ProviderFactory {
    /// 根据配置创建 Provider 实例
    ///
    /// # 示例
    ///
    /// ```
    /// use topems_ai::dsh::provider::{ProviderFactory, ProviderConfig, ProviderType};
    ///
    /// let config = ProviderConfig {
    ///     provider_type: ProviderType::Mock,
    ///     ..Default::default()
    /// };
    /// let provider = ProviderFactory::create(config);
    /// ```
    pub fn create(config: ProviderConfig) -> Arc<dyn LlmProvider> {
        match config.provider_type {
            ProviderType::DeepSeek => Arc::new(DeepSeekProvider::new(config)),
            ProviderType::Ollama => Arc::new(OllamaProvider::new(config)),
            ProviderType::Dify => {
                // Dify 暂未实现，回退到 Mock
                tracing::warn!("Dify provider not implemented yet, falling back to Mock");
                Arc::new(MockProvider::new(config))
            }
            ProviderType::Mock => Arc::new(MockProvider::new(config)),
        }
    }

    /// 从环境变量创建 Provider 实例
    pub fn from_env() -> Arc<dyn LlmProvider> {
        let config = ProviderConfig::from_env();
        Self::create(config)
    }

    /// 创建默认的 Ollama Provider（本地开发用）
    pub fn default_ollama() -> Arc<dyn LlmProvider> {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            ..Default::default()
        };
        Self::create(config)
    }

    /// 创建默认的 Mock Provider（测试用）
    pub fn default_mock() -> Arc<dyn LlmProvider> {
        let config = ProviderConfig {
            provider_type: ProviderType::Mock,
            ..Default::default()
        };
        Self::create(config)
    }

    /// 创建 DeepSeek Provider（需配置 API Key）
    pub fn deepseek(api_key: impl Into<String>, model: Option<String>) -> Arc<dyn LlmProvider> {
        let config = ProviderConfig {
            provider_type: ProviderType::DeepSeek,
            api_key: Some(api_key.into()),
            default_model: model,
            ..Default::default()
        };
        Self::create(config)
    }

    /// 创建 Ollama Provider（可选自定义 URL 和模型）
    pub fn ollama(api_url: Option<String>, model: Option<String>) -> Arc<dyn LlmProvider> {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            api_url,
            default_model: model,
            ..Default::default()
        };
        Self::create(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_mock_provider() {
        let config = ProviderConfig {
            provider_type: ProviderType::Mock,
            ..Default::default()
        };
        let provider = ProviderFactory::create(config);
        assert_eq!(provider.provider_type(), ProviderType::Mock);
    }

    #[test]
    fn test_create_deepseek_provider() {
        let config = ProviderConfig {
            provider_type: ProviderType::DeepSeek,
            api_key: Some("test-key".to_string()),
            ..Default::default()
        };
        let provider = ProviderFactory::create(config);
        assert_eq!(provider.provider_type(), ProviderType::DeepSeek);
    }

    #[test]
    fn test_create_ollama_provider() {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            ..Default::default()
        };
        let provider = ProviderFactory::create(config);
        assert_eq!(provider.provider_type(), ProviderType::Ollama);
    }

    #[test]
    fn test_default_mock() {
        let provider = ProviderFactory::default_mock();
        assert_eq!(provider.provider_type(), ProviderType::Mock);
    }

    #[test]
    fn test_default_ollama() {
        let provider = ProviderFactory::default_ollama();
        assert_eq!(provider.provider_type(), ProviderType::Ollama);
    }

    #[test]
    fn test_deepseek_factory_method() {
        let provider = ProviderFactory::deepseek("test-key", Some("deepseek-chat".to_string()));
        assert_eq!(provider.provider_type(), ProviderType::DeepSeek);
        assert_eq!(provider.config().api_key.as_deref(), Some("test-key"));
    }

    #[test]
    fn test_ollama_factory_method() {
        let provider = ProviderFactory::ollama(
            Some("http://localhost:11434".to_string()),
            Some("llama3".to_string()),
        );
        assert_eq!(provider.provider_type(), ProviderType::Ollama);
    }

    #[test]
    fn test_dify_falls_back_to_mock() {
        let config = ProviderConfig {
            provider_type: ProviderType::Dify,
            ..Default::default()
        };
        let provider = ProviderFactory::create(config);
        // Dify 未实现，回退到 Mock
        assert_eq!(provider.provider_type(), ProviderType::Mock);
    }
}

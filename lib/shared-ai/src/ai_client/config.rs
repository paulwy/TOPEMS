//! AI 客户端配置模块

use serde::{Deserialize, Serialize};

/// AI 服务提供者类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum AIProviderType {
    OpenAI,
    Gemini,
    #[default]
    Ollama,
    AzureOpenAI,
    Custom,
}

impl std::fmt::Display for AIProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIProviderType::OpenAI => write!(f, "openai"),
            AIProviderType::Gemini => write!(f, "gemini"),
            AIProviderType::Ollama => write!(f, "ollama"),
            AIProviderType::AzureOpenAI => write!(f, "azure_openai"),
            AIProviderType::Custom => write!(f, "custom"),
        }
    }
}

/// 模型类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelType {
    Chat,
    Embedding,
    Multimodal,
}

/// AI 模型配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIModelConfig {
    /// 提供者类型
    pub provider: AIProviderType,
    /// 模型名称
    pub model_name: String,
    /// API 基础 URL
    pub base_url: String,
    /// API 密钥
    pub api_key: Option<String>,
    /// API 密钥环境变量名
    pub api_key_env: Option<String>,
    /// 模型类型
    pub model_type: ModelType,
    /// 向量维度（仅嵌入模型）
    pub dimension: Option<usize>,
    /// 最大令牌数
    pub max_tokens: Option<usize>,
    /// 温度参数
    pub temperature: Option<f64>,
    /// 请求超时时间（秒）
    pub timeout: Option<u64>,
    /// 组织 ID（OpenAI/Azure）
    pub organization: Option<String>,
    /// 部署名称（Azure）
    pub deployment_name: Option<String>,
}

impl Default for AIModelConfig {
    fn default() -> Self {
        Self {
            provider: AIProviderType::Ollama,
            model_name: "qwen2.5:7b-instruct".to_string(),
            base_url: "http://localhost:11434/v1".to_string(),
            api_key: None,
            api_key_env: None,
            model_type: ModelType::Chat,
            dimension: None,
            max_tokens: Some(4096),
            temperature: Some(0.7),
            timeout: Some(120),
            organization: None,
            deployment_name: None,
        }
    }
}

impl AIModelConfig {
    /// 获取实际的 API 密钥
    pub fn get_api_key(&self) -> Option<String> {
        if let Some(key) = &self.api_key {
            Some(key.clone())
        } else if let Some(env_name) = &self.api_key_env {
            std::env::var(env_name).ok()
        } else {
            None
        }
    }

    /// 获取基础 URL
    pub fn get_base_url(&self) -> String {
        self.base_url.clone()
    }

    /// 获取温度参数
    pub fn get_temperature(&self) -> f64 {
        self.temperature.unwrap_or(0.7)
    }

    /// 获取最大令牌数
    pub fn get_max_tokens(&self) -> usize {
        self.max_tokens.unwrap_or(4096)
    }

    /// 获取超时时间
    pub fn get_timeout(&self) -> std::time::Duration {
        std::time::Duration::from_secs(self.timeout.unwrap_or(120))
    }
}

/// AI 客户端全局配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIClientConfig {
    /// 聊天模型配置
    pub chat_model: AIModelConfig,
    /// 嵌入模型配置
    pub embedding_model: AIModelConfig,
    /// 多模态模型配置（可选）
    pub multimodal_model: Option<AIModelConfig>,
    /// 是否启用流式响应
    pub enable_streaming: bool,
    /// 默认温度
    pub default_temperature: f64,
    /// 默认最大令牌数
    pub default_max_tokens: usize,
}

impl Default for AIClientConfig {
    fn default() -> Self {
        Self {
            chat_model: AIModelConfig {
                model_type: ModelType::Chat,
                ..Default::default()
            },
            embedding_model: AIModelConfig {
                provider: AIProviderType::Ollama,
                model_name: "nomic-embed-text".to_string(),
                base_url: "http://localhost:11434/api".to_string(),
                model_type: ModelType::Embedding,
                dimension: Some(768),
                ..Default::default()
            },
            multimodal_model: None,
            enable_streaming: true,
            default_temperature: 0.7,
            default_max_tokens: 4096,
        }
    }
}

/// 从环境变量加载配置
pub fn load_config_from_env() -> AIClientConfig {
    let mut config = AIClientConfig::default();

    // 聊天模型配置
    if let Ok(provider) = std::env::var("AI_PROVIDER") {
        config.chat_model.provider = match provider.as_str() {
            "openai" => AIProviderType::OpenAI,
            "gemini" => AIProviderType::Gemini,
            "ollama" => AIProviderType::Ollama,
            "azure" => AIProviderType::AzureOpenAI,
            _ => AIProviderType::Custom,
        };
    }

    if let Ok(model) = std::env::var("AI_MODEL") {
        config.chat_model.model_name = model;
    }

    if let Ok(url) = std::env::var("AI_BASE_URL") {
        config.chat_model.base_url = url;
    }

    if let Ok(key) = std::env::var("AI_API_KEY") {
        config.chat_model.api_key = Some(key);
    }

    if let Ok(temp) = std::env::var("AI_TEMPERATURE") {
        if let Ok(temp_val) = temp.parse::<f64>() {
            config.chat_model.temperature = Some(temp_val);
        }
    }

    if let Ok(max_tokens) = std::env::var("AI_MAX_TOKENS") {
        if let Ok(max_tokens_val) = max_tokens.parse::<usize>() {
            config.chat_model.max_tokens = Some(max_tokens_val);
        }
    }

    // 嵌入模型配置
    if let Ok(embed_model) = std::env::var("EMBEDDING_MODEL") {
        config.embedding_model.model_name = embed_model;
    }

    if let Ok(embed_url) = std::env::var("EMBEDDING_BASE_URL") {
        config.embedding_model.base_url = embed_url;
    }

    if let Ok(embed_dim) = std::env::var("EMBEDDING_DIMENSION") {
        if let Ok(dim_val) = embed_dim.parse::<usize>() {
            config.embedding_model.dimension = Some(dim_val);
        }
    }

    config
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_defaults() {
        let config = AIModelConfig::default();
        assert_eq!(config.provider, AIProviderType::Ollama);
        assert_eq!(config.model_name, "qwen2.5:7b-instruct");
        assert_eq!(config.base_url, "http://localhost:11434/v1");
        assert_eq!(config.get_temperature(), 0.7);
        assert_eq!(config.get_max_tokens(), 4096);
    }

    #[test]
    fn test_provider_display() {
        assert_eq!(AIProviderType::OpenAI.to_string(), "openai");
        assert_eq!(AIProviderType::Gemini.to_string(), "gemini");
        assert_eq!(AIProviderType::Ollama.to_string(), "ollama");
        assert_eq!(AIProviderType::AzureOpenAI.to_string(), "azure_openai");
    }

    #[test]
    fn test_provider_display_custom() {
        assert_eq!(AIProviderType::Custom.to_string(), "custom");
    }

    #[test]
    fn test_ai_provider_type_default() {
        assert_eq!(AIProviderType::default(), AIProviderType::Ollama);
    }

    #[test]
    fn test_ai_provider_type_serde_roundtrip() {
        for provider in [
            AIProviderType::OpenAI,
            AIProviderType::Gemini,
            AIProviderType::Ollama,
            AIProviderType::AzureOpenAI,
            AIProviderType::Custom,
        ] {
            let json = serde_json::to_string(&provider).unwrap();
            let deserialized: AIProviderType = serde_json::from_str(&json).unwrap();
            assert_eq!(
                deserialized, provider,
                "roundtrip failed for {:?}",
                provider
            );
        }
    }

    #[test]
    fn test_ai_model_config_serde_roundtrip() {
        let config = AIModelConfig {
            provider: AIProviderType::OpenAI,
            model_name: "gpt-4".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: Some("sk-test".to_string()),
            api_key_env: None,
            model_type: ModelType::Chat,
            dimension: None,
            max_tokens: Some(2048),
            temperature: Some(0.3),
            timeout: Some(60),
            organization: Some("org-123".to_string()),
            deployment_name: None,
        };
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: AIModelConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.provider, AIProviderType::OpenAI);
        assert_eq!(deserialized.model_name, "gpt-4");
        assert_eq!(deserialized.base_url, "https://api.openai.com/v1");
        assert_eq!(deserialized.api_key.as_deref(), Some("sk-test"));
        assert_eq!(deserialized.max_tokens, Some(2048));
        assert_eq!(deserialized.temperature, Some(0.3));
        assert_eq!(deserialized.timeout, Some(60));
        assert_eq!(deserialized.organization.as_deref(), Some("org-123"));
    }

    #[test]
    fn test_ai_model_config_get_api_key_direct() {
        let config = AIModelConfig {
            api_key: Some("sk-direct".to_string()),
            ..Default::default()
        };
        assert_eq!(config.get_api_key().as_deref(), Some("sk-direct"));
    }

    #[test]
    fn test_ai_model_config_get_api_key_from_env() {
        std::env::set_var("TEST_AI_API_KEY", "sk-from-env");
        let config = AIModelConfig {
            api_key: None,
            api_key_env: Some("TEST_AI_API_KEY".to_string()),
            ..Default::default()
        };
        assert_eq!(config.get_api_key().as_deref(), Some("sk-from-env"));
        std::env::remove_var("TEST_AI_API_KEY");
    }

    #[test]
    fn test_ai_model_config_get_api_key_none() {
        let config = AIModelConfig {
            api_key: None,
            api_key_env: None,
            ..Default::default()
        };
        assert!(config.get_api_key().is_none());
    }

    #[test]
    fn test_ai_model_config_get_api_key_direct_takes_priority() {
        // api_key 优先于 api_key_env
        std::env::set_var("TEST_AI_API_KEY_2", "sk-env");
        let config = AIModelConfig {
            api_key: Some("sk-direct".to_string()),
            api_key_env: Some("TEST_AI_API_KEY_2".to_string()),
            ..Default::default()
        };
        assert_eq!(config.get_api_key().as_deref(), Some("sk-direct"));
        std::env::remove_var("TEST_AI_API_KEY_2");
    }

    #[test]
    fn test_get_base_url() {
        let config = AIModelConfig {
            base_url: "https://example.com".to_string(),
            ..Default::default()
        };
        assert_eq!(config.get_base_url(), "https://example.com");
    }

    #[test]
    fn test_get_temperature_with_value() {
        let config = AIModelConfig {
            temperature: Some(0.9),
            ..Default::default()
        };
        assert_eq!(config.get_temperature(), 0.9);
    }

    #[test]
    fn test_get_temperature_default_when_none() {
        let config = AIModelConfig {
            temperature: None,
            ..Default::default()
        };
        assert_eq!(config.get_temperature(), 0.7);
    }

    #[test]
    fn test_get_max_tokens_with_value() {
        let config = AIModelConfig {
            max_tokens: Some(8192),
            ..Default::default()
        };
        assert_eq!(config.get_max_tokens(), 8192);
    }

    #[test]
    fn test_get_max_tokens_default_when_none() {
        let config = AIModelConfig {
            max_tokens: None,
            ..Default::default()
        };
        assert_eq!(config.get_max_tokens(), 4096);
    }

    #[test]
    fn test_get_timeout_with_value() {
        let config = AIModelConfig {
            timeout: Some(30),
            ..Default::default()
        };
        assert_eq!(config.get_timeout(), std::time::Duration::from_secs(30));
    }

    #[test]
    fn test_get_timeout_default_when_none() {
        let config = AIModelConfig {
            timeout: None,
            ..Default::default()
        };
        assert_eq!(config.get_timeout(), std::time::Duration::from_secs(120));
    }

    #[test]
    fn test_ai_client_config_default() {
        let config = AIClientConfig::default();
        assert_eq!(config.chat_model.provider, AIProviderType::Ollama);
        assert_eq!(config.chat_model.model_name, "qwen2.5:7b-instruct");
        assert_eq!(config.embedding_model.model_name, "nomic-embed-text");
        assert_eq!(config.embedding_model.dimension, Some(768));
        assert!(config.multimodal_model.is_none());
        assert!(config.enable_streaming);
        assert_eq!(config.default_temperature, 0.7);
        assert_eq!(config.default_max_tokens, 4096);
    }

    #[test]
    fn test_ai_client_config_serde_roundtrip() {
        let config = AIClientConfig {
            chat_model: AIModelConfig::default(),
            embedding_model: AIModelConfig {
                provider: AIProviderType::OpenAI,
                model_name: "text-embedding-3-small".to_string(),
                base_url: "https://api.openai.com/v1".to_string(),
                api_key: Some("sk-test".to_string()),
                api_key_env: None,
                model_type: ModelType::Embedding,
                dimension: Some(1536),
                max_tokens: None,
                temperature: None,
                timeout: Some(60),
                organization: None,
                deployment_name: None,
            },
            multimodal_model: None,
            enable_streaming: false,
            default_temperature: 0.5,
            default_max_tokens: 2048,
        };
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: AIClientConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.chat_model.model_name, "qwen2.5:7b-instruct");
        assert_eq!(
            deserialized.embedding_model.model_name,
            "text-embedding-3-small"
        );
        assert_eq!(deserialized.embedding_model.dimension, Some(1536));
        assert!(!deserialized.enable_streaming);
        assert_eq!(deserialized.default_temperature, 0.5);
        assert_eq!(deserialized.default_max_tokens, 2048);
    }
}

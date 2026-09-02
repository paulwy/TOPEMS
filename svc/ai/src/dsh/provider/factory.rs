//! ProviderFactory — 配置驱动的 Provider 创建工厂。
//!
//! 根据 ProviderConfig 中的 provider_type 自动创建对应的 Provider 实例。
//! 支持 Dify、DeepSeek、Ollama、Mock 四种 Provider，
//! 以及组合构建：路由策略（Router）+ 故障降级（Failover）。

use std::sync::Arc;

use super::deepseek::DeepSeekProvider;
use super::dify::DifyProvider;
use super::failover::FailoverProvider;
use super::mock::MockProvider;
use super::ollama::OllamaProvider;
use super::router::ProviderRouter;
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
            ProviderType::Dify => Arc::new(DifyProvider::new(config)),
            ProviderType::Mock => Arc::new(MockProvider::new(config)),
        }
    }

    /// 从环境变量创建 Provider 实例
    pub fn from_env() -> Arc<dyn LlmProvider> {
        let config = ProviderConfig::from_env();
        Self::create(config)
    }

    /// 从环境变量创建「带故障降级」的 Provider 实例
    ///
    /// 主 Provider 由 `DSH_PROVIDER` 指定，备用 Provider 由 `DSH_FALLBACK_PROVIDER`
    /// （取值同上，默认 mock）指定；主失败时自动切备。
    pub fn from_env_with_failover() -> Arc<dyn LlmProvider> {
        let primary = Self::from_env();

        let fallback_type =
            parse_provider_env("DSH_FALLBACK_PROVIDER").unwrap_or(ProviderType::Mock);

        let mut fallback_config = ProviderConfig::from_env();
        fallback_config.provider_type = fallback_type;
        apply_env_overrides(&mut fallback_config, "DSH_FALLBACK");

        let backup = Self::create(fallback_config);
        Arc::new(FailoverProvider::new(primary, backup))
    }

    /// 从环境变量创建「路由 + 故障降级」的 Provider 组合
    ///
    /// - 简单任务 → 本地 Provider（`DSH_SIMPLE_PROVIDER`，默认 ollama）
    /// - 复杂任务 → 云端 Provider（`DSH_COMPLEX_PROVIDER`，默认 deepseek）
    /// - 每个路由分支再包一层故障降级（`DSH_FALLBACK_PROVIDER`，默认 mock）
    /// - `DSH_ROUTING=false` 可关闭路由（全部走复杂 Provider）
    /// - 最终整体包一层记录器（3.2c：AI 调用写入真实日志 → 治理仪表盘统计）
    pub fn build_resilient_provider() -> Arc<dyn LlmProvider> {
        let simple = Self::from_env_with_failover_for("DSH_SIMPLE_PROVIDER", ProviderType::Ollama);
        let complex =
            Self::from_env_with_failover_for("DSH_COMPLEX_PROVIDER", ProviderType::DeepSeek);

        let routing_enabled = std::env::var("DSH_ROUTING")
            .ok()
            .map(|v| v != "false" && v != "0")
            .unwrap_or(true);

        let inner: Arc<dyn LlmProvider> = if routing_enabled {
            Arc::new(ProviderRouter::new(simple, complex))
        } else {
            // 路由关闭：全部走复杂 Provider
            Arc::new(ProviderRouter::disabled(simple, complex))
        };

        Arc::new(super::recorded::RecordingProvider::new(inner))
    }

    /// 为指定 env 变量创建「带故障降级」的 Provider
    fn from_env_with_failover_for(
        env_var: &str,
        default_type: ProviderType,
    ) -> Arc<dyn LlmProvider> {
        let provider_type = parse_provider_env(env_var).unwrap_or(default_type);

        // 该分支的主 Provider 配置（继承通用 DSH_API_URL / DSH_API_KEY / DSH_MODEL）
        let mut config = ProviderConfig::from_env();
        config.provider_type = provider_type;
        // 分支专用覆盖：{env_var}_API_URL / _API_KEY / _MODEL
        apply_env_overrides(&mut config, env_var);

        let primary = Self::create(config);

        let fallback_type =
            parse_provider_env("DSH_FALLBACK_PROVIDER").unwrap_or(ProviderType::Mock);
        let mut fallback_config = ProviderConfig::from_env();
        fallback_config.provider_type = fallback_type;
        apply_env_overrides(&mut fallback_config, "DSH_FALLBACK");

        let backup = Self::create(fallback_config);
        Arc::new(FailoverProvider::new(primary, backup))
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

    /// 创建 Dify Provider（需配置 API Key / 可选 URL）
    pub fn dify(api_url: Option<String>, api_key: Option<String>) -> Arc<dyn LlmProvider> {
        let config = ProviderConfig {
            provider_type: ProviderType::Dify,
            api_url,
            api_key,
            ..Default::default()
        };
        Self::create(config)
    }
}

/// 解析 Provider 类型环境变量（deepseek/ollama/dify/mock）
fn parse_provider_env(env_var: &str) -> Option<ProviderType> {
    std::env::var(env_var)
        .ok()
        .and_then(|v| match v.to_lowercase().as_str() {
            "deepseek" => Some(ProviderType::DeepSeek),
            "ollama" => Some(ProviderType::Ollama),
            "dify" => Some(ProviderType::Dify),
            "mock" => Some(ProviderType::Mock),
            _ => None,
        })
}

/// 将 `{prefix}_API_URL` / `{prefix}_API_KEY` / `{prefix}_MODEL` 覆盖到配置
fn apply_env_overrides(config: &mut ProviderConfig, prefix: &str) {
    if let Ok(url) = std::env::var(format!("{prefix}_API_URL")) {
        config.api_url = Some(url);
    }
    if let Ok(key) = std::env::var(format!("{prefix}_API_KEY")) {
        config.api_key = Some(key);
    }
    if let Ok(model) = std::env::var(format!("{prefix}_MODEL")) {
        config.default_model = Some(model);
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
    fn test_create_dify_provider() {
        // 3.1a：Dify 不再回退 Mock，创建真实 DifyProvider
        let config = ProviderConfig {
            provider_type: ProviderType::Dify,
            api_url: Some("http://dify.test".to_string()),
            api_key: Some("app-test".to_string()),
            ..Default::default()
        };
        let provider = ProviderFactory::create(config);
        assert_eq!(provider.provider_type(), ProviderType::Dify);
    }

    #[test]
    fn test_dify_factory_method() {
        let provider = ProviderFactory::dify(
            Some("http://dify.test".to_string()),
            Some("app-test".to_string()),
        );
        assert_eq!(provider.provider_type(), ProviderType::Dify);
    }

    #[tokio::test]
    async fn test_failover_when_primary_unreachable() {
        // 主 Provider 指向不可达地址 → 自动降级到 mock 备用
        let config = ProviderConfig {
            provider_type: ProviderType::DeepSeek,
            api_url: Some("http://127.0.0.1:1".to_string()), // 不可达端口
            api_key: Some("test-key".to_string()),
            timeout_secs: 1,
            ..Default::default()
        };
        let primary = ProviderFactory::create(config);
        let backup = ProviderFactory::default_mock();
        let provider = Arc::new(FailoverProvider::new(primary, backup));

        let resp = provider
            .ask(crate::dsh::provider::LlmRequest::simple("hello"))
            .await
            .unwrap();
        assert!(resp.content.contains("mock"), "应降级到 mock");
    }

    #[tokio::test]
    async fn test_build_resilient_provider_with_mock_routes() {
        // 显式把简单/复杂路由都指向 mock，验证组合 Provider 可正常 ask
        std::env::set_var("DSH_SIMPLE_PROVIDER", "mock");
        std::env::set_var("DSH_COMPLEX_PROVIDER", "mock");
        std::env::set_var("DSH_FALLBACK_PROVIDER", "mock");

        let provider = ProviderFactory::build_resilient_provider();
        let resp = provider
            .ask(crate::dsh::provider::LlmRequest::simple("你好"))
            .await
            .unwrap();
        assert!(resp.content.contains("mock"));

        // 清理，避免污染其他测试
        std::env::remove_var("DSH_SIMPLE_PROVIDER");
        std::env::remove_var("DSH_COMPLEX_PROVIDER");
        std::env::remove_var("DSH_FALLBACK_PROVIDER");
    }
}

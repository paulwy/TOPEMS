//! Provider 故障降级（3.1c）。
//!
//! `FailoverProvider` 包装主/备两个 Provider：主 Provider 调用失败时
//! 自动切换到备用 Provider，实现高可用。
//!
//! 降级触发条件（可恢复性错误）：网络错误、超时、限流（429）、5xx 服务端错误。
//! 不触发降级（配置/调用方问题，切备无意义）：认证失败、配置错误、序列化错误、Unsupported。

use std::sync::Arc;

use async_trait::async_trait;

use super::trait_::{
    EmbeddingRequest, EmbeddingResponse, LlmProvider, LlmProviderError, LlmRequest, LlmResponse,
    LlmStreamChunk, ProviderConfig, ProviderType,
};

/// 判断错误是否应触发降级到备用 Provider
fn should_failover(err: &LlmProviderError) -> bool {
    match err {
        LlmProviderError::Network(_) => true,
        LlmProviderError::Timeout(_) => true,
        LlmProviderError::RateLimit => true,
        LlmProviderError::Api { status, .. } => *status >= 500,
        // 认证/配置/序列化等错误切备也无法解决，直接返回
        LlmProviderError::Authentication(_) => false,
        LlmProviderError::Configuration(_) => false,
        LlmProviderError::Serialization(_) => false,
        LlmProviderError::Unsupported(_) => false,
        LlmProviderError::Internal(_) => true,
    }
}

/// Provider 故障降级包装器
#[derive(Clone)]
pub struct FailoverProvider {
    /// 主 Provider
    primary: Arc<dyn LlmProvider>,
    /// 备用 Provider
    backup: Arc<dyn LlmProvider>,
    /// 标识用配置
    config: ProviderConfig,
}

impl FailoverProvider {
    /// 创建主备降级 Provider
    pub fn new(primary: Arc<dyn LlmProvider>, backup: Arc<dyn LlmProvider>) -> Self {
        Self {
            primary,
            backup,
            config: ProviderConfig::default(),
        }
    }
}

/// 调用主 Provider，失败时按降级规则切换到备用
async fn ask_with_failover(
    primary: &Arc<dyn LlmProvider>,
    backup: &Arc<dyn LlmProvider>,
    request: LlmRequest,
) -> Result<LlmResponse, LlmProviderError> {
    match primary.ask(request.clone()).await {
        Ok(resp) => Ok(resp),
        Err(e) => {
            if should_failover(&e) {
                tracing::warn!(
                    "Provider failover: primary {:?} failed ({}), switching to backup {:?}",
                    primary.provider_type(),
                    e,
                    backup.provider_type()
                );
                backup.ask(request).await
            } else {
                Err(e)
            }
        }
    }
}

#[async_trait]
impl LlmProvider for FailoverProvider {
    fn provider_type(&self) -> ProviderType {
        // 主 Provider 的类型作为对外类型（降级发生在内部）
        self.primary.provider_type()
    }

    fn config(&self) -> &ProviderConfig {
        &self.config
    }

    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
        ask_with_failover(&self.primary, &self.backup, request).await
    }

    async fn ask_stream(
        &self,
        request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        match self.primary.ask_stream(request.clone()).await {
            Ok(rx) => Ok(rx),
            Err(e) => {
                if should_failover(&e) {
                    tracing::warn!(
                        "Provider failover (stream): primary {:?} failed ({}), switching to backup {:?}",
                        self.primary.provider_type(),
                        e,
                        self.backup.provider_type()
                    );
                    self.backup.ask_stream(request).await
                } else {
                    Err(e)
                }
            }
        }
    }

    async fn embed(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, LlmProviderError> {
        match self.primary.embed(request.clone()).await {
            Ok(resp) => Ok(resp),
            Err(e) => {
                if should_failover(&e) {
                    self.backup.embed(request).await
                } else {
                    Err(e)
                }
            }
        }
    }

    async fn health_check(&self) -> Result<(), LlmProviderError> {
        match self.primary.health_check().await {
            Ok(()) => Ok(()),
            Err(_) => self.backup.health_check().await,
        }
    }

    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
        match self.primary.list_models().await {
            Ok(models) => Ok(models),
            Err(_) => self.backup.list_models().await,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsh::provider::MockProvider;

    /// 测试用：可控失败的 Provider（ask 返回指定错误）
    struct FailingProvider {
        error: LlmProviderError,
    }

    impl FailingProvider {
        fn new(error: LlmProviderError) -> Self {
            Self { error }
        }
    }

    #[async_trait]
    impl LlmProvider for FailingProvider {
        fn provider_type(&self) -> ProviderType {
            ProviderType::Mock
        }
        fn config(&self) -> &ProviderConfig {
            static C: ProviderConfig = ProviderConfig {
                provider_type: ProviderType::Mock,
                api_url: None,
                api_key: None,
                default_model: None,
                timeout_secs: 60,
                max_retries: 3,
                temperature: None,
                max_tokens: None,
            };
            &C
        }
        async fn ask(&self, _r: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
            Err(self.error.clone())
        }
        async fn health_check(&self) -> Result<(), LlmProviderError> {
            Err(self.error.clone())
        }
        async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
            Err(self.error.clone())
        }
    }

    fn mock(tag: &str) -> Arc<dyn LlmProvider> {
        Arc::new(MockProvider::with_response(
            ProviderConfig::default(),
            tag.to_string(),
        ))
    }

    #[test]
    fn test_should_failover_cases() {
        assert!(should_failover(&LlmProviderError::Network("x".into())));
        assert!(should_failover(&LlmProviderError::Timeout(5)));
        assert!(should_failover(&LlmProviderError::RateLimit));
        assert!(should_failover(&LlmProviderError::Api {
            status: 500,
            message: "".into()
        }));
        assert!(!should_failover(&LlmProviderError::Api {
            status: 400,
            message: "".into()
        }));
        assert!(!should_failover(&LlmProviderError::Authentication(
            "x".into()
        )));
        assert!(!should_failover(&LlmProviderError::Configuration(
            "x".into()
        )));
    }

    #[tokio::test]
    async fn test_primary_success_no_failover() {
        let primary = mock("primary-ok");
        let backup = mock("backup");
        let fo = FailoverProvider::new(primary, backup);
        let resp = fo.ask(LlmRequest::simple("hi")).await.unwrap();
        assert_eq!(resp.content, "primary-ok");
    }

    #[tokio::test]
    async fn test_primary_network_error_failover() {
        let primary: Arc<dyn LlmProvider> = Arc::new(FailingProvider::new(
            LlmProviderError::Network("boom".into()),
        ));
        let backup = mock("backup-ok");
        let fo = FailoverProvider::new(primary, backup);
        let resp = fo.ask(LlmRequest::simple("hi")).await.unwrap();
        assert_eq!(resp.content, "backup-ok");
    }

    #[tokio::test]
    async fn test_primary_timeout_failover() {
        let primary: Arc<dyn LlmProvider> =
            Arc::new(FailingProvider::new(LlmProviderError::Timeout(30)));
        let backup = mock("backup-ok");
        let fo = FailoverProvider::new(primary, backup);
        let resp = fo.ask(LlmRequest::simple("hi")).await.unwrap();
        assert_eq!(resp.content, "backup-ok");
    }

    #[tokio::test]
    async fn test_primary_rate_limit_failover() {
        let primary: Arc<dyn LlmProvider> =
            Arc::new(FailingProvider::new(LlmProviderError::RateLimit));
        let backup = mock("backup-ok");
        let fo = FailoverProvider::new(primary, backup);
        let resp = fo.ask(LlmRequest::simple("hi")).await.unwrap();
        assert_eq!(resp.content, "backup-ok");
    }

    #[tokio::test]
    async fn test_primary_5xx_failover() {
        let primary: Arc<dyn LlmProvider> = Arc::new(FailingProvider::new(LlmProviderError::Api {
            status: 503,
            message: "down".into(),
        }));
        let backup = mock("backup-ok");
        let fo = FailoverProvider::new(primary, backup);
        let resp = fo.ask(LlmRequest::simple("hi")).await.unwrap();
        assert_eq!(resp.content, "backup-ok");
    }

    #[tokio::test]
    async fn test_primary_auth_error_no_failover() {
        let primary: Arc<dyn LlmProvider> = Arc::new(FailingProvider::new(
            LlmProviderError::Authentication("bad key".into()),
        ));
        let backup = mock("backup-ok");
        let fo = FailoverProvider::new(primary, backup);
        let err = fo.ask(LlmRequest::simple("hi")).await.unwrap_err();
        assert!(matches!(err, LlmProviderError::Authentication(_)));
    }

    #[tokio::test]
    async fn test_backup_also_fails_returns_error() {
        let primary: Arc<dyn LlmProvider> = Arc::new(FailingProvider::new(
            LlmProviderError::Network("boom".into()),
        ));
        let backup: Arc<dyn LlmProvider> = Arc::new(FailingProvider::new(
            LlmProviderError::Network("also down".into()),
        ));
        let fo = FailoverProvider::new(primary, backup);
        assert!(fo.ask(LlmRequest::simple("hi")).await.is_err());
    }

    #[tokio::test]
    async fn test_health_check_falls_back() {
        let primary: Arc<dyn LlmProvider> = Arc::new(FailingProvider::new(
            LlmProviderError::Network("down".into()),
        ));
        let backup = mock("backup");
        let fo = FailoverProvider::new(primary, backup);
        assert!(fo.health_check().await.is_ok());
    }
}

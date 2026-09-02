//! 记录型 Provider（3.2c：真实 AI 调用日志）
//!
//! 包装任意 LlmProvider，在每次 `ask` 调用后向 `CostMeter` 写入调用记录
//! （成功/失败、token、耗时），作为治理仪表盘「真实 AI 调用日志」的数据来源。
//!
//! 所有通过 `ProviderFactory::build_resilient_provider` 创建的 Provider 组合
//! （路由 + 降级）都会被本包装器记录，实现全量 AI 调用计量。

use std::sync::Arc;
use std::time::Instant;

use async_trait::async_trait;

use super::trait_::{
    EmbeddingRequest, EmbeddingResponse, LlmProvider, LlmProviderError, LlmRequest, LlmResponse,
    LlmStreamChunk, ProviderConfig, ProviderType,
};
use crate::dsh::governance::cost_metering::{global_cost_meter, AiCallRecord, CostMeter};

/// 记录型 Provider 包装器
#[derive(Clone)]
pub struct RecordingProvider {
    /// 被包装的内部 Provider
    inner: Arc<dyn LlmProvider>,
    /// 成本计量器（默认使用全局实例）
    meter: Arc<CostMeter>,
}

impl RecordingProvider {
    /// 包装一个 Provider（使用全局成本计量器）
    pub fn new(inner: Arc<dyn LlmProvider>) -> Self {
        Self {
            inner,
            meter: global_cost_meter(),
        }
    }

    /// 包装一个 Provider（注入独立成本计量器，测试用）
    pub fn with_meter(inner: Arc<dyn LlmProvider>, meter: Arc<CostMeter>) -> Self {
        Self { inner, meter }
    }

    /// 记录一次调用
    async fn record(
        &self,
        model: &str,
        duration_ms: u64,
        result: &Result<LlmResponse, LlmProviderError>,
    ) {
        let record = match result {
            Ok(resp) => AiCallRecord::new(
                "system",
                "tenant-default",
                model,
                resp.prompt_tokens.unwrap_or(0),
                resp.completion_tokens.unwrap_or(0),
                estimate_cost(
                    resp.prompt_tokens.unwrap_or(0),
                    resp.completion_tokens.unwrap_or(0),
                ),
                duration_ms,
            ),
            Err(e) => AiCallRecord::new("system", "tenant-default", model, 0, 0, 0.0, duration_ms)
                .with_error(e.to_string()),
        };
        self.meter.record_call(record).await;
    }
}

/// 简单成本估算（每 1K token 固定单价，真实环境应接入模型定价表）
fn estimate_cost(input_tokens: u32, output_tokens: u32) -> f64 {
    const INPUT_PER_1K: f64 = 0.001;
    const OUTPUT_PER_1K: f64 = 0.002;
    (input_tokens as f64 / 1000.0) * INPUT_PER_1K + (output_tokens as f64 / 1000.0) * OUTPUT_PER_1K
}

#[async_trait]
impl LlmProvider for RecordingProvider {
    fn provider_type(&self) -> ProviderType {
        self.inner.provider_type()
    }

    fn config(&self) -> &ProviderConfig {
        self.inner.config()
    }

    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
        let model = request
            .model
            .clone()
            .or_else(|| self.inner.config().default_model.clone())
            .unwrap_or_else(|| "unknown".to_string());
        let start = Instant::now();
        let result = self.inner.ask(request).await;
        let duration_ms = start.elapsed().as_millis() as u64;
        self.record(&model, duration_ms, &result).await;
        result
    }

    async fn ask_stream(
        &self,
        request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        let model = request
            .model
            .clone()
            .or_else(|| self.inner.config().default_model.clone())
            .unwrap_or_else(|| "unknown".to_string());
        let start = Instant::now();
        let result = self.inner.ask_stream(request).await;
        let duration_ms = start.elapsed().as_millis() as u64;
        let outcome = if result.is_ok() {
            Ok(LlmResponse {
                content: String::new(),
                model: model.clone(),
                prompt_tokens: None,
                completion_tokens: None,
                total_tokens: None,
                latency_ms: Some(duration_ms),
            })
        } else {
            Err(result.as_ref().unwrap_err().clone())
        };
        self.record(&model, duration_ms, &outcome).await;
        result
    }

    async fn embed(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, LlmProviderError> {
        self.inner.embed(request).await
    }

    async fn health_check(&self) -> Result<(), LlmProviderError> {
        self.inner.health_check().await
    }

    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
        self.inner.list_models().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsh::governance::cost_metering::CostMeter;
    use crate::dsh::provider::MockProvider;

    #[tokio::test]
    async fn test_record_success_call() {
        let meter = Arc::new(CostMeter::new());
        let inner = Arc::new(MockProvider::default()) as Arc<dyn LlmProvider>;
        let recorded = RecordingProvider::with_meter(inner, meter.clone());

        let resp = recorded.ask(LlmRequest::simple("hello")).await.unwrap();
        assert!(!resp.content.is_empty());

        let stats = meter.get_global_statistics().await;
        assert_eq!(stats.total_calls, 1);
        assert_eq!(stats.successful_calls, 1);
    }

    #[tokio::test]
    async fn test_record_failure_call() {
        let meter = Arc::new(CostMeter::new());
        // 指向不可达端口的 DeepSeek → 网络错误
        let inner = Arc::new(crate::dsh::provider::DeepSeekProvider::new(
            ProviderConfig {
                provider_type: ProviderType::DeepSeek,
                api_url: Some("http://127.0.0.1:1".to_string()),
                api_key: Some("k".to_string()),
                timeout_secs: 1,
                ..Default::default()
            },
        )) as Arc<dyn LlmProvider>;
        let recorded = RecordingProvider::with_meter(inner, meter.clone());

        assert!(recorded.ask(LlmRequest::simple("hi")).await.is_err());

        let stats = meter.get_global_statistics().await;
        assert_eq!(stats.total_calls, 1);
        assert_eq!(stats.failed_calls, 1);
    }

    #[test]
    fn test_estimate_cost() {
        let cost = estimate_cost(1000, 1000);
        assert!((cost - 0.003).abs() < 1e-9);
    }

    #[tokio::test]
    async fn test_record_to_dashboard_roundtrip() {
        // 3.2c 闭环：AI 调用（RecordingProvider 写入）→ 治理仪表盘读取真实统计
        let meter = Arc::new(CostMeter::new());
        let inner = Arc::new(MockProvider::default()) as Arc<dyn LlmProvider>;
        let recorded = Arc::new(RecordingProvider::with_meter(inner, meter.clone()));

        // 2 次调用（1 成功 + 1 失败）
        recorded.ask(LlmRequest::simple("hello")).await.unwrap();
        let failing = Arc::new(crate::dsh::provider::DeepSeekProvider::new(
            ProviderConfig {
                provider_type: ProviderType::DeepSeek,
                api_url: Some("http://127.0.0.1:1".to_string()),
                api_key: Some("k".to_string()),
                timeout_secs: 1,
                ..Default::default()
            },
        )) as Arc<dyn LlmProvider>;
        let recorded2 = RecordingProvider::with_meter(failing, meter.clone());
        assert!(recorded2.ask(LlmRequest::simple("hi")).await.is_err());

        // 仪表盘从同一 CostMeter 读取真实统计
        let generator =
            crate::dsh::governance_dashboard::GovernanceDashboardGenerator::with_defaults()
                .with_cost_meter(meter);
        let dashboard = generator.generate_dashboard(None);
        let metrics = dashboard.key_metrics;
        assert_eq!(metrics.total_requests, 2, "仪表盘应反映真实 AI 调用次数");
        assert_eq!(metrics.successful_requests, 1);
        assert_eq!(metrics.failed_requests, 1);
        assert!((metrics.success_rate - 50.0).abs() < 0.01);
    }
}

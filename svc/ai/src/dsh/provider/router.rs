//! Provider 路由策略（3.1b）。
//!
//! 根据任务复杂度在多个 Provider 之间路由：
//! - 简单任务（问候、简短问答、格式化等）→ 本地小模型（Ollama）：快、免费、数据不出内网
//! - 复杂任务（分析、总结、规划、对比、代码、长文本等）→ 云端大模型（DeepSeek）：强
//!
//! `ProviderRouter` 自身实现 `LlmProvider`，可作为单一入口注入 AgentOrchestrator，
//! 与故障降级（`FailoverProvider`）组合使用。

use std::sync::Arc;

use async_trait::async_trait;

use super::trait_::{
    EmbeddingRequest, EmbeddingResponse, LlmProvider, LlmProviderError, LlmRequest, LlmResponse,
    LlmStreamChunk, ProviderConfig, ProviderType,
};

/// 任务复杂度
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskComplexity {
    /// 简单任务（本地小模型）
    Simple,
    /// 复杂任务（云端大模型）
    Complex,
}

/// 标记复杂任务的关键词（命中任一即视为复杂）
const COMPLEX_KEYWORDS: &[&str] = &[
    "分析",
    "总结",
    "规划",
    "对比",
    "比较",
    "评估",
    "推荐",
    "优化",
    "方案",
    "报告",
    "代码",
    "调试",
    "修复",
    "解释",
    "步骤",
    "计划",
    "评审",
    "设计",
    "重构",
    "预测",
    "统计",
    "总结一下",
    "analyze",
    "summarize",
    "plan",
    "compare",
    "evaluate",
    "recommend",
    "optimize",
    "code",
    "debug",
    "review",
    "explain",
    "refactor",
    "design",
    "predict",
];

/// 标记简单任务的关键词（命中任一即视为简单，优先于复杂关键词之外的默认判定）
const SIMPLE_KEYWORDS: &[&str] = &[
    "你好", "您好", "嗨", "hello", "hi", "hey", "谢谢", "再见", "yes", "no", "ok", "好的",
];

/// 复杂任务判定阈值：超过该字符数视为复杂（长上下文）
const COMPLEX_LENGTH_THRESHOLD: usize = 200;

/// Provider 路由策略
///
/// 持有两个 Provider 实例（简单/复杂），根据 `classify` 结果路由请求。
#[derive(Clone)]
pub struct ProviderRouter {
    /// 简单任务 Provider（如本地 Ollama）
    simple: Arc<dyn LlmProvider>,
    /// 复杂任务 Provider（如云端 DeepSeek）
    complex: Arc<dyn LlmProvider>,
    /// 路由是否启用；禁用时所有请求走复杂 Provider（兼容旧行为）
    enabled: bool,
    /// 标识用配置
    config: ProviderConfig,
}

impl ProviderRouter {
    /// 创建新的路由策略
    pub fn new(simple: Arc<dyn LlmProvider>, complex: Arc<dyn LlmProvider>) -> Self {
        Self {
            simple,
            complex,
            enabled: true,
            config: ProviderConfig::default(),
        }
    }

    /// 创建禁用路由的实例（全部走复杂 Provider）
    pub fn disabled(simple: Arc<dyn LlmProvider>, complex: Arc<dyn LlmProvider>) -> Self {
        Self {
            simple,
            complex,
            enabled: false,
            config: ProviderConfig::default(),
        }
    }

    /// 判断任务复杂度
    ///
    /// 规则（优先级从高到低）：
    /// 1. 带系统提示词/历史 → 复杂（结构化/受控任务）
    /// 2. 命中复杂关键词 → 复杂
    /// 3. 用户消息超过长度阈值 → 复杂
    /// 4. 命中简单关键词 → 简单
    /// 5. 默认 → 简单
    pub fn classify(request: &LlmRequest) -> TaskComplexity {
        if request.system_prompt.is_some()
            || request.history.as_ref().map(|h| !h.is_empty()) == Some(true)
        {
            return TaskComplexity::Complex;
        }

        let text = request.user_message.to_lowercase();

        if COMPLEX_KEYWORDS.iter().any(|k| text.contains(k)) {
            return TaskComplexity::Complex;
        }
        if request.user_message.chars().count() > COMPLEX_LENGTH_THRESHOLD {
            return TaskComplexity::Complex;
        }
        if SIMPLE_KEYWORDS.iter().any(|k| text.contains(k)) {
            return TaskComplexity::Simple;
        }
        TaskComplexity::Simple
    }

    /// 根据请求选择 Provider
    pub fn route(&self, request: &LlmRequest) -> Arc<dyn LlmProvider> {
        if !self.enabled {
            return self.complex.clone();
        }
        match Self::classify(request) {
            TaskComplexity::Simple => self.simple.clone(),
            TaskComplexity::Complex => self.complex.clone(),
        }
    }
}

#[async_trait]
impl LlmProvider for ProviderRouter {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Mock
    }

    fn config(&self) -> &ProviderConfig {
        &self.config
    }

    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
        let provider = self.route(&request);
        provider.ask(request).await
    }

    async fn ask_stream(
        &self,
        request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        let provider = self.route(&request);
        provider.ask_stream(request).await
    }

    async fn embed(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, LlmProviderError> {
        // 嵌入统一走复杂 Provider（通常本地不支持高质量嵌入）
        self.complex.embed(request).await
    }

    async fn health_check(&self) -> Result<(), LlmProviderError> {
        // 任一路由可达即认为路由健康
        match self.simple.health_check().await {
            Ok(()) => Ok(()),
            Err(_) => self.complex.health_check().await,
        }
    }

    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
        let mut models = Vec::new();
        if let Ok(simple) = self.simple.list_models().await {
            models.extend(simple);
        }
        if let Ok(complex) = self.complex.list_models().await {
            models.extend(complex);
        }
        Ok(models)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsh::provider::MockProvider;

    fn mock_with_response(tag: &str) -> Arc<dyn LlmProvider> {
        Arc::new(MockProvider::with_response(
            ProviderConfig::default(),
            tag.to_string(),
        ))
    }

    fn router() -> ProviderRouter {
        ProviderRouter::new(mock_with_response("simple"), mock_with_response("complex"))
    }

    #[test]
    fn test_classify_simple_keyword() {
        assert_eq!(
            ProviderRouter::classify(&LlmRequest::simple("你好，今天天气如何")),
            TaskComplexity::Simple
        );
        assert_eq!(
            ProviderRouter::classify(&LlmRequest::simple("hi there")),
            TaskComplexity::Simple
        );
    }

    #[test]
    fn test_classify_complex_keyword() {
        assert_eq!(
            ProviderRouter::classify(&LlmRequest::simple("请分析一下这个季度销售数据")),
            TaskComplexity::Complex
        );
        assert_eq!(
            ProviderRouter::classify(&LlmRequest::simple("帮我总结这份文档并对比优缺点")),
            TaskComplexity::Complex
        );
        assert_eq!(
            ProviderRouter::classify(&LlmRequest::simple("写一段 rust 代码处理并发")),
            TaskComplexity::Complex
        );
    }

    #[test]
    fn test_classify_long_text() {
        let long = "x".repeat(COMPLEX_LENGTH_THRESHOLD + 10);
        assert_eq!(
            ProviderRouter::classify(&LlmRequest::simple(long)),
            TaskComplexity::Complex
        );
    }

    #[test]
    fn test_classify_with_system_prompt() {
        let req = LlmRequest::with_system("you are an expert", "hello");
        assert_eq!(ProviderRouter::classify(&req), TaskComplexity::Complex);
    }

    #[test]
    fn test_classify_short_default_simple() {
        assert_eq!(
            ProviderRouter::classify(&LlmRequest::simple("早上好呀")),
            TaskComplexity::Simple
        );
    }

    #[tokio::test]
    async fn test_route_simple_to_simple_provider() {
        let r = router();
        let resp = r.ask(LlmRequest::simple("你好")).await.unwrap();
        assert_eq!(resp.content, "simple");
    }

    #[tokio::test]
    async fn test_route_complex_to_complex_provider() {
        let r = router();
        let resp = r
            .ask(LlmRequest::simple("请分析对比这两个方案的优劣"))
            .await
            .unwrap();
        assert_eq!(resp.content, "complex");
    }

    #[tokio::test]
    async fn test_disabled_router_always_complex() {
        let r =
            ProviderRouter::disabled(mock_with_response("simple"), mock_with_response("complex"));
        let resp = r.ask(LlmRequest::simple("你好")).await.unwrap();
        assert_eq!(resp.content, "complex");
    }

    #[tokio::test]
    async fn test_router_health_check() {
        let r = router();
        assert!(r.health_check().await.is_ok());
    }

    #[tokio::test]
    async fn test_router_list_models() {
        let r = router();
        let models = r.list_models().await.unwrap();
        assert!(models.iter().any(|m| m.contains("mock")));
    }
}

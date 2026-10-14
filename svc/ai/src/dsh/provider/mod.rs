//! LLM Provider 抽象层模块。
//!
//! 提供统一的 LLM Provider 接口，支持 Dify、DeepSeek、Ollama、Mock 等多种实现，
//! 以及 Provider 路由策略（3.1b）与故障降级（3.1c）。
//!
//! ## 双轨分工（P2-c 收敛决策，2026-10-14）
//!
//! 本模块与 `topems_shared_ai::ai_client::UnifiedAIClient` 并存而非冗余合并：
//! - **本模块（dsh/provider）**：DSH Agent 编排层的**多模型路由 + 故障降级 + 请求记录**。
//!   `ProviderRouter` 按任务复杂度路由 simple→Ollama / complex→DeepSeek（factory.rs:74 build_resilient_provider）；
//!   `FailoverProvider` 提供故障降级；`RecordingProvider` 记录请求。
//!   三消费方（orchestrator/smart_forms/business_copilot）通过 `LlmProvider::ask()` 调用，
//!   此路由+降级能力是 UnifiedAIClient（单客户端）不具备的。
//! - **UnifiedAIClient**：底层单模型客户端，用于 embedding 生成（ai_knowledge/rag.rs + P2-c RagEngine）
//!   与 ai_knowledge 模块的直接 chat。不做多模型路由/failover。
//!
//! 两者 HTTP 调用虽有重叠（DeepSeekProvider/OllamaProvider 各自 reqwest），但 ask_stream 的 SSE 流式
//! 与 UnifiedAIClient.chat_stream 实现路径不同，强行合并风险高于收益，故保留分工。
//!
//! ## 架构
//!
//! ```text
//! provider/
//! ├── mod.rs      # Provider 模块入口
//! ├── trait_.rs   # LlmProvider trait 定义
//! ├── dify.rs     # Dify 实现（3.1a）
//! ├── deepseek.rs # DeepSeek API 实现
//! ├── ollama.rs   # Ollama 本地实现
//! ├── mock.rs     # Mock 实现（测试用）
//! ├── router.rs   # Provider 路由策略（3.1b）
//! ├── failover.rs # Provider 故障降级（3.1c）
//! └── factory.rs  # ProviderFactory（配置驱动创建）
//! ```

#![allow(unused_imports)]

pub mod deepseek;
pub mod dify;
pub mod factory;
pub mod failover;
pub mod mock;
pub mod ollama;
pub mod recorded;
pub mod router;
pub mod trait_;

pub use deepseek::DeepSeekProvider;
pub use dify::DifyProvider;
pub use factory::ProviderFactory;
pub use failover::FailoverProvider;
pub use mock::MockProvider;
pub use ollama::OllamaProvider;
pub use recorded::RecordingProvider;
pub use router::{ProviderRouter, TaskComplexity};
pub use trait_::{
    ChatMessage, LlmProvider, LlmProviderError, LlmRequest, LlmResponse, LlmStreamChunk,
    ProviderConfig, ProviderType,
};

//! LLM Provider 抽象层模块。
//!
//! 提供统一的 LLM Provider 接口，支持 Dify、DeepSeek、Ollama、Mock 等多种实现，
//! 以及 Provider 路由策略（3.1b）与故障降级（3.1c）。
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

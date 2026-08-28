//! LLM Provider 抽象层模块。
//!
//! 提供统一的 LLM Provider 接口，支持 DeepSeek、Ollama、Mock 等多种实现。
//!
//! ## 架构
//!
//! ```text
//! provider/
//! ├── mod.rs      # Provider 模块入口
//! ├── trait_.rs   # LlmProvider trait 定义
//! ├── deepseek.rs # DeepSeek API 实现
//! ├── ollama.rs   # Ollama 本地实现
//! ├── mock.rs     # Mock 实现（测试用）
//! └── factory.rs  # ProviderFactory（配置驱动创建）
//! ```

#![allow(unused_imports)]

pub mod deepseek;
pub mod factory;
pub mod mock;
pub mod ollama;
pub mod trait_;

pub use deepseek::DeepSeekProvider;
pub use factory::ProviderFactory;
pub use mock::MockProvider;
pub use ollama::OllamaProvider;
pub use trait_::{
    ChatMessage, LlmProvider, LlmProviderError, LlmRequest, ProviderConfig, ProviderType,
};

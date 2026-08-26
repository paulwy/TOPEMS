//! LLM Provider 抽象层模块。
//!
//! 提供统一的 LLM Provider 接口，支持 DeepSeek、Ollama、Mock 等多种实现。
//!
//! ## 架构
//!
//! ```text
//! provider/
//! ├── mod.rs      # Provider 模块入口
//! ├── trait.rs    # LlmProvider trait 定义
//! ├── deepseek.rs # DeepSeek API 实现（待实现）
//! ├── ollama.rs   # Ollama 本地实现（待实现）
//! ├── mock.rs     # Mock 实现（测试用，待实现）
//! └── factory.rs  # ProviderFactory（配置驱动创建，待实现）
//! ```

pub mod trait_;

pub use trait_::{LlmProvider, LlmProviderError, ProviderConfig, ProviderType};

//! DSH Agent 编排模块。
//!
//! 提供增强版的 Agent 编排能力，包括：
//! - MCP 工具集成
//! - 上下文管理
//! - 流式响应支持
//! - 错误恢复机制
//! - 多轮对话管理

#![allow(unused_imports)]

pub mod context;
pub mod orchestrator;
pub mod performance;
pub mod streaming;

pub use context::{AgentContext, ContextManager, MessageRole};
pub use orchestrator::{
    AgentExecuteRequest, AgentOrchestrator, AgentOrchestratorConfig,
    ExecutionStep,
};
pub use performance::AgentPerformanceMonitor;
pub use streaming::{StreamChunk, StreamingResponse};

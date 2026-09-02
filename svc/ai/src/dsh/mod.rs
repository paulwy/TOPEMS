//! DSH (Data-Driven Service Hub) AI 中间层模块。
//!
//! 基于 TOPEMS_Architecture_Improvement_Plan v1.1 + MCP_Architecture_Amendment_Plan v1.0
//! 提供 LLM Provider 抽象、Agent 编排、Tool Registry、AI 治理、MCP 协议适配等能力。
//!
//! ## 架构
//!
//! ```text
//! dsh/
//! ├── mod.rs          # DSH 模块入口
//! ├── provider/       # LLM Provider 抽象层
//! │   ├── mod.rs      # Provider 模块入口
//! │   ├── trait.rs    # LlmProvider trait 定义
//! │   ├── deepseek.rs # DeepSeek API 实现（待实现）
//! │   ├── ollama.rs   # Ollama 本地实现（待实现）
//! │   ├── mock.rs     # Mock 实现（测试用，待实现）
//! │   └── factory.rs  # ProviderFactory（待实现）
//! ├── agent/          # Agent 编排（待实现）
//! ├── tools/          # Tool Registry（待实现）
//! ├── governance/     # AI 治理（待实现）
//! ├── context/        # 上下文工程（待实现）
//! └── mcp/            # MCP 协议适配层（待实现，依赖 shared-mcp）
//! ```

#![allow(
    unknown_lints,
    renamed_and_removed_lints,
    clippy::too_many_arguments,
    clippy::type_complexity,
    clippy::module_inception,
    clippy::new_without_default
)]

pub mod agent;
pub mod alerting;
pub mod business_copilot;
pub mod business_intelligence;
pub mod business_modules;
pub mod cache;
pub mod config_center;
pub mod document_intelligence;
pub mod event_trigger;
pub mod governance;
pub mod governance_dashboard;
pub mod knowledge_graph;
pub mod knowledge_management;
pub mod mcp;
pub mod mcp_resource;
pub mod mcp_security;
pub mod mcp_transport;
pub mod memory;
pub mod multi_agent;
pub mod permission;
pub mod plan_execute;
pub mod predictive_analytics;
pub mod prompt;
pub mod provider;
pub mod rag;
pub mod resilience;
pub mod smart_forms;
pub mod standardization;
pub mod tool_schema;
pub mod workflow;

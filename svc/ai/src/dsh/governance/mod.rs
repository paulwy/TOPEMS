//! AI 治理模块。
//!
//! 提供 AI 调用的安全治理、权限控制、审计日志、安全护栏等功能。
//!
//! ## 架构
//!
//! ```text
//! governance/
//! ├── mod.rs          # 治理模块入口
//! ├── guard.rs        # 安全护栏（输入/输出安全检查）
//! └── mcp_security.rs # MCP 安全治理专项
//! ```

#![allow(unused_imports)]

pub mod cost_metering;
pub mod guard;
pub mod mcp_security;

pub use cost_metering::CostMeter;
pub use guard::AiSecurityGuard;
pub use mcp_security::McpSecurityGovernance;

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
//! └── cost_metering.rs # 成本计量
//! ```
//!
//! > P2-5：`mcp_security.rs`（McpSecurityGovernance）与 `dsh/mcp_security/`（McpSecurityEngine）
//! > 为未接入生产路径的死代码，已删除；MCP 协议面的安全能力由 `dsh/mcp/security.rs`
//! > （McpSecurityMiddleware：输入校验/权限/限流/脱敏）承担并已接入请求链路。

#![allow(unused_imports)]

pub mod cost_metering;
pub mod guard;

pub use cost_metering::CostMeter;
pub use guard::AiSecurityGuard;

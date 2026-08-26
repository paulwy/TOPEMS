//! MCP (Model Context Protocol) 协议适配层。
//!
//! 基于 topems-shared-mcp 库，提供 MCP Server 核心实现，
//! 支持 initialize/tools/list/tools/call 等标准 MCP 方法。
//!
//! ## 架构
//!
//! ```text
//! mcp/
//! ├── mod.rs     # MCP 模块入口
//! ├── server.rs  # McpServer 核心（请求路由、初始化管理）
//! ├── tools.rs   # ToolRegistry（工具注册和执行）
//! └── handler.rs # axum handler（SSE/HTTP 传输，待实现）
//! ```

pub mod server;
pub mod tools;

pub use server::{McpServer, ServerState};
pub use tools::{ToolExecutionError, ToolRegistry};

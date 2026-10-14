//! # TOPEMS Shared MCP
//!
//! MCP (Model Context Protocol) 协议核心库，提供 JSON-RPC 2.0 实现、
//! JSON Schema 生成工具等能力。
//!
//! 包含：协议常量与类型、JSON-RPC 2.0 请求/响应/错误、JSON Schema 生成工具。
//!
//! ## 架构
//!
//! ```text
//! topems-shared-mcp/
//! ├── protocol.rs   # MCP 协议常量与类型
//! ├── jsonrpc.rs    # JSON-RPC 2.0 实现
//! └── schema.rs     # JSON Schema 生成工具
//! ```

pub mod jsonrpc;
pub mod protocol;
pub mod schema;

pub use jsonrpc::{JsonRpcError, JsonRpcRequest, JsonRpcResponse};
pub use protocol::{McpCapability, McpProtocolVersion};

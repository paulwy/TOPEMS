//! # TOPEMS Shared MCP
//!
//! MCP (Model Context Protocol) 协议核心库，提供 JSON-RPC 2.0 实现、
//! 传输层抽象、JSON Schema 生成工具等能力。
//!
//! 包含：协议常量与类型、JSON-RPC 2.0 请求/响应/错误、传输层抽象（stdio/SSE/HTTP）、
//! JSON Schema 生成工具。
//!
//! ## 架构
//!
//! ```text
//! topems-shared-mcp/
//! ├── protocol.rs   # MCP 协议常量与类型
//! ├── jsonrpc.rs    # JSON-RPC 2.0 实现
//! ├── transport.rs  # 传输层抽象
//! └── schema.rs     # JSON Schema 生成工具
//! ```

#![allow(
    unknown_lints,
    renamed_and_removed_lints,
    clippy::too_many_arguments,
    clippy::type_complexity,
    clippy::module_inception
)]

pub mod jsonrpc;
pub mod protocol;
pub mod schema;
pub mod transport;

pub use jsonrpc::{JsonRpcError, JsonRpcRequest, JsonRpcResponse};
pub use protocol::{McpCapability, McpProtocolVersion};
pub use transport::{McpTransport, TransportError, TransportType};

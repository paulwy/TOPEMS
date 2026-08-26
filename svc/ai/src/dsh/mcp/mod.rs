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
//! ├── handler.rs # axum handler（HTTP/SSE 传输）
//! └── tools/     # ToolRegistry + 业务工具
//!     ├── mod.rs  # ToolRegistry（工具注册和执行）
//!     ├── crm.rs  # CRM 业务工具
//!     └── erp.rs  # ERP 业务工具
//! ```

pub mod handler;
pub mod server;
pub mod tools;

pub use handler::{create_mcp_routes, handle_mcp_request, handle_mcp_sse, McpServerState};
pub use server::{McpServer, ServerState};
pub use tools::{register_aps_tools, register_bi_tools, register_crm_tools, register_cs_tools, register_ehs_tools, register_erp_tools, register_finance_tools, register_hr_tools, register_lims_tools, register_mes_tools, register_pm_tools, register_qms_tools, register_scm_tools, register_wms_tools, ToolExecutionError, ToolRegistry};

#![allow(dead_code)]
//! # [DEPRECATED] Ticket 模块已迁移为独立微服务
//!
//! 本模块已废弃，请使用独立服务 `svc/ticket`（端口 8086）。
//!
//! ## 迁移说明
//! - 独立服务路径：`svc/ticket/`
//! - API 路由：`/api/ticket/*`
//! - 旧路由别名：`/api/core/ticket/*`（通过反向代理兼容）
//!
//! 本模块代码保留用于参考，将在未来版本中移除。

pub mod handlers;
pub mod models;
pub mod sla_service;

pub use handlers::{init_sla_tables, init_ticket_tables, ticket_routes, TicketService};
pub use models::*;
pub use sla_service::TicketSlaService;

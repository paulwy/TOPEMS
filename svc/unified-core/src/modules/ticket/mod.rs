//! V15 Phase 4: 工单体系 MVP
//!
//! 统一工单（Ticket）服务：为对账差异、流程异常、系统告警等场景提供工单闭环。
//! 核心字段：工单号、来源、类型、严重级别、状态、SLA 截止、负责人、关联业务单据。

pub mod handlers;
pub mod models;
pub mod sla_service;

pub use handlers::{init_sla_tables, init_ticket_tables, ticket_routes, TicketService};
pub use models::*;
pub use sla_service::TicketSlaService;

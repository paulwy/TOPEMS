//! 通信模块：保留 WebSocket（实时通信），HTTP API 已外迁到 svc/communication 服务
//!
//! U1-b2：投影 handlers.rs（跨读 communication.core_notifications/emails 的只读列表）
//! 已随业务投影下架删除——生产由独立 svc/communication 提供，:8000 无入向流量。

pub mod ws;
pub mod ws_event_bridge;

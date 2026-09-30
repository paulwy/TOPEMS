//! 通信模块：保留 WebSocket（实时通信），HTTP API 已外迁到 svc/communication 服务

pub mod handlers;
pub mod ws;
pub mod ws_event_bridge;

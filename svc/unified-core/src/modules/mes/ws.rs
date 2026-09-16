//! MES WebSocket 处理器

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    Json,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde_json::json;
use std::time::Duration;
use tokio::time::interval;

use super::service::MesService;

/// MES 仪表盘 WebSocket 端点
pub async fn mes_dashboard_ws(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_mes_dashboard_socket)
}

async fn handle_mes_dashboard_socket(mut socket: WebSocket) {
    let mut ticker = interval(Duration::from_secs(5)); // 每 5 秒推送一次数据

    loop {
        tokio::select! {
            // 推送仪表盘数据
            _ = ticker.tick() => {
                // 获取数据后立即释放锁，避免 MutexGuard 跨 await 导致不 Send
                let stats = {
                    let service = MesService::instance().lock().unwrap();
                    service.get_dashboard_stats()
                };
                
                let message = json!({
                    "type": "dashboard_update",
                    "data": stats,
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                });

                if socket.send(Message::Text(message.to_string().into())).await.is_err() {
                    break;
                }
            }
            // 接收客户端消息
            result = socket.next() => {
                match result {
                    Some(Ok(Message::Text(text))) => {
                        // 处理客户端消息（如订阅特定设备）
                        if let Ok(msg) = serde_json::from_str::<serde_json::Value>(&text) {
                            if msg["type"] == "subscribe_equipment" {
                                // 可以在这里处理特定设备的订阅
                                let response = json!({
                                    "type": "subscribed",
                                    "equipment_id": msg["equipment_id"],
                                });
                                if socket.send(Message::Text(response.to_string().into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        break;
                    }
                    _ => {}
                }
            }
        }
    }
}

/// MES 仪表盘初始数据（HTTP 端点，用于首次加载）
pub async fn mes_dashboard_initial() -> Json<serde_json::Value> {
    let service = MesService::instance().lock().unwrap();
    let stats = service.get_dashboard_stats();
    let wip = service.get_wip_statistics();
    
    Json(json!({
        "success": true,
        "data": {
            "dashboard": stats,
            "wip_statistics": wip,
        }
    }))
}

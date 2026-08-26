//! MCP HTTP Handler — axum endpoint 处理 JSON-RPC 请求和 SSE 传输。
//!
//! 提供两个端点：
//! - POST /mcp — JSON-RPC 请求端点（请求-响应模式）
//! - GET /mcp/sse — SSE 流式端点（服务端推送模式）
//!
//! ## SSE 传输流程
//! 1. 客户端发送 GET /mcp/sse
//! 2. 服务器返回 SSE 流（Content-Type: text/event-stream）
//! 3. 服务器发送 endpoint 事件，包含 POST /mcp?session_id=xxx 的 URL
//! 4. 客户端通过 POST /mcp?session_id=xxx 发送 JSON-RPC 请求
//! 5. 服务器通过 SSE 流推送响应和通知
//!
//! 支持：
//! - 单个 JSON-RPC 请求
//! - JSON-RPC 通知（无响应，返回 202 Accepted）
//! - SSE 流式传输（endpoint 事件 + 心跳）

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{sse::{Event, KeepAlive, Sse}, IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

use super::server::McpServer;

/// MCP Server 共享状态
pub type McpServerState = Arc<McpServer>;

/// SSE 会话管理器
///
/// 管理活动的 SSE 会话，将 POST /mcp 的响应路由到对应的 SSE 连接。
#[derive(Clone, Default)]
pub struct SseSessionManager {
    sessions: Arc<RwLock<HashMap<String, mpsc::UnboundedSender<Value>>>>,
}

impl SseSessionManager {
    /// 创建新的会话管理器
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 注册新会话，返回 session_id 和接收端
    pub async fn register(&self) -> (String, mpsc::UnboundedReceiver<Value>) {
        let session_id = uuid::Uuid::new_v4().to_string();
        let (tx, rx) = mpsc::unbounded_channel();
        self.sessions.write().await.insert(session_id.clone(), tx);
        tracing::info!(session_id = %session_id, "SSE session registered");
        (session_id, rx)
    }

    /// 向会话发送消息
    pub async fn send(&self, session_id: &str, message: Value) -> bool {
        if let Some(tx) = self.sessions.read().await.get(session_id) {
            tx.send(message).is_ok()
        } else {
            false
        }
    }

    /// 注销会话
    pub async fn unregister(&self, session_id: &str) {
        self.sessions.write().await.remove(session_id);
        tracing::info!(session_id = %session_id, "SSE session unregistered");
    }

    /// 获取活动会话数
    pub async fn active_count(&self) -> usize {
        self.sessions.read().await.len()
    }
}

/// MCP 应用状态（包含 Server 和 SSE 会话管理器）
#[derive(Clone)]
pub struct McpAppState {
    pub server: McpServerState,
    pub sse_manager: SseSessionManager,
}

impl McpAppState {
    /// 创建新的应用状态
    pub fn new(server: McpServerState) -> Self {
        Self {
            server,
            sse_manager: SseSessionManager::new(),
        }
    }
}

/// POST /mcp 查询参数
#[derive(Debug, Deserialize, Default)]
pub struct McpQueryParams {
    /// SSE 会话 ID（可选，用于将响应路由到 SSE 连接）
    pub session_id: Option<String>,
}

/// 处理 MCP JSON-RPC 请求
///
/// POST /mcp
/// Content-Type: application/json
/// Body: JSON-RPC 2.0 Request
///
/// 查询参数：
/// - session_id（可选）：如果提供，响应将通过对应的 SSE 连接推送，HTTP 返回 202 Accepted
///
/// 返回：
/// - 200 OK + JSON-RPC Response（请求有 ID，无 session_id）
/// - 202 Accepted（通知，无 ID；或有 session_id 时响应通过 SSE 推送）
/// - 400 Bad Request（无效 JSON）
pub async fn handle_mcp_request(
    State(state): State<McpAppState>,
    Query(params): Query<McpQueryParams>,
    Json(body): Json<Value>,
) -> Response {
    // 解析 JSON-RPC 请求
    let request = match serde_json::from_value::<topems_shared_mcp::jsonrpc::JsonRpcRequest>(body) {
        Ok(req) => req,
        Err(e) => {
            let error_response = topems_shared_mcp::jsonrpc::JsonRpcResponse::error(
                serde_json::json!(null),
                topems_shared_mcp::jsonrpc::JsonRpcError::parse_error(Some(
                    serde_json::json!({"error": e.to_string()}),
                )),
            );
            return (StatusCode::BAD_REQUEST, Json(error_response)).into_response();
        }
    };

    // 处理请求
    match state.server.handle_request(request).await {
        Some(response) => {
            let response_value = serde_json::to_value(&response).unwrap_or(serde_json::json!({}));

            // 如果有 session_id，通过 SSE 推送响应
            if let Some(session_id) = &params.session_id {
                if state.sse_manager.send(session_id, response_value).await {
                    return StatusCode::ACCEPTED.into_response();
                }
                // 如果会话不存在，回退到 HTTP 响应
                tracing::warn!(session_id = %session_id, "SSE session not found, falling back to HTTP response");
            }

            (StatusCode::OK, Json(response)).into_response()
        }
        None => {
            // 通知（无 ID），返回 202 Accepted
            StatusCode::ACCEPTED.into_response()
        }
    }
}

/// 处理 MCP SSE 连接
///
/// GET /mcp/sse
///
/// 返回 SSE 流，用于服务端推送通知和响应。
///
/// SSE 事件：
/// - endpoint：包含 POST /mcp?session_id=xxx 的 URL
/// - message：JSON-RPC 响应或通知
/// - 心跳注释（: keep-alive）
pub async fn handle_mcp_sse(
    State(state): State<McpAppState>,
) -> Sse<impl futures::stream::Stream<Item = Result<Event, std::convert::Infallible>>> {
    // 注册新会话
    let (session_id, mut rx) = state.sse_manager.register().await;
    let session_id_clone = session_id.clone();
    let manager = state.sse_manager.clone();

    // 构建 SSE 流
    let stream = async_stream::stream! {
        // 1. 发送 endpoint 事件
        let endpoint_url = format!("/mcp?session_id={}", session_id);
        yield Ok(Event::default().event("endpoint").data(endpoint_url));

        // 2. 心跳间隔
        let mut heartbeat = tokio::time::interval(Duration::from_secs(30));

        loop {
            tokio::select! {
                // 接收来自 POST /mcp 的响应
                msg = rx.recv() => {
                    match msg {
                        Some(value) => {
                            yield Ok(Event::default().event("message").data(value.to_string()));
                        }
                        None => {
                            // 通道关闭，结束流
                            break;
                        }
                    }
                }
                // 心跳
                _ = heartbeat.tick() => {
                    yield Ok(Event::default().comment("keep-alive"));
                }
            }
        }

        // 清理会话
        manager.unregister(&session_id_clone).await;
    };

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// 创建 MCP 路由
///
/// 路由：
/// - POST /mcp — JSON-RPC 请求端点
/// - GET /mcp/sse — SSE 连接端点
pub fn create_mcp_routes(server: McpServerState) -> axum::Router {
    let state = McpAppState::new(server);
    axum::Router::new()
        .route("/mcp", axum::routing::post(handle_mcp_request))
        .route("/mcp/sse", axum::routing::get(handle_mcp_sse))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_handle_mcp_request_ping() {
        let server = Arc::new(McpServer::new("test", "1.0.0"));

        // initialize first
        let init_request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "test", "version": "1.0" }
            }
        });

        let app = create_mcp_routes(server.clone());

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .body(Body::from(init_request.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        // initialized notification
        let notif = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        });

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .body(Body::from(notif.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::ACCEPTED);

        // ping
        let ping = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "ping"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .body(Body::from(ping.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_handle_mcp_request_invalid_json() {
        let server = Arc::new(McpServer::new("test", "1.0.0"));
        let app = create_mcp_routes(server);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .body(Body::from("invalid json"))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_handle_mcp_sse_returns_stream() {
        let server = Arc::new(McpServer::new("test", "1.0.0"));
        let app = create_mcp_routes(server);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/mcp/sse")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // SSE 端点应返回 200 OK 和 text/event-stream Content-Type
        assert_eq!(response.status(), StatusCode::OK);
        let content_type = response.headers().get("content-type").unwrap().to_str().unwrap();
        assert!(content_type.contains("text/event-stream"));
    }

    #[tokio::test]
    async fn test_handle_mcp_request_before_init() {
        let server = Arc::new(McpServer::new("test", "1.0.0"));
        let app = create_mcp_routes(server);

        // tools/list before initialize should return error
        let request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .body(Body::from(request.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        // 未初始化时应返回 200 OK（JSON-RPC 错误响应在 body 中）
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_sse_session_manager_register_and_send() {
        let manager = SseSessionManager::new();
        assert_eq!(manager.active_count().await, 0);

        let (session_id, mut rx) = manager.register().await;
        assert_eq!(manager.active_count().await, 1);
        assert!(!session_id.is_empty());

        // 发送消息
        let msg = serde_json::json!({"jsonrpc": "2.0", "id": 1, "result": {}});
        assert!(manager.send(&session_id, msg.clone()).await);

        // 接收消息
        let received = rx.recv().await.unwrap();
        assert_eq!(received, msg);

        // 注销会话
        manager.unregister(&session_id).await;
        assert_eq!(manager.active_count().await, 0);

        // 向不存在的会话发送消息应返回 false
        assert!(!manager.send(&session_id, msg).await);
    }
}

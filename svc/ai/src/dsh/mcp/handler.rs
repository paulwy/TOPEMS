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
use axum::response::{
    sse::{Event, KeepAlive, Sse},
    IntoResponse, Response,
};
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
    pub jwt_secret: String,
}

impl McpAppState {
    /// 创建新的应用状态
    pub fn new(server: McpServerState, jwt_secret: impl Into<String>) -> Self {
        Self {
            server,
            sse_manager: SseSessionManager::new(),
            jwt_secret: jwt_secret.into(),
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/mcp",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/mcp/sse",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
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
pub fn create_mcp_routes(server: McpServerState, jwt_secret: impl Into<String>) -> axum::Router {
    let jwt_secret = jwt_secret.into();
    let state = McpAppState::new(server, jwt_secret);
    axum::Router::new()
        .route("/mcp", axum::routing::post(handle_mcp_request))
        .route("/mcp/sse", axum::routing::get(handle_mcp_sse))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mcp_auth_middleware,
        ))
        .with_state(state)
}

/// MCP 认证中间件：从 Authorization 头解析 Bearer JWT 建立用户上下文。
/// 强制认证——无/无效 Bearer 一律 401 拒绝（含 system.* 工具），有效 token 放行。
/// （P3 安全强化：MCP 端点不再允许匿名访问）
async fn mcp_auth_middleware(
    State(state): State<McpAppState>,
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    if !state.server.apply_auth(req.headers()).await {
        return Response::builder()
            .status(axum::http::StatusCode::UNAUTHORIZED)
            .header("content-type", "application/json")
            .body(axum::body::Body::from(
                r#"{"jsonrpc":"2.0","error":{"code":-32001,"message":"Authentication required: valid Bearer JWT"},"id":null}"#,
            ))
            .unwrap();
    }
    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    /// 强制认证模式下测试需携带有效 Bearer。
    /// test-jwt-secret 签发的长寿命 token（exp=2099，test-only 固定密钥）。
    const TEST_JWT_ADMIN: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJ1c2VybmFtZSI6InRlc3QtYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiIsInVzZXIiXSwicGVybWlzc2lvbnMiOlsiaWFtOmFkbWluIl0sImlzX3N1cGVydXNlciI6dHJ1ZSwiZXhwIjo0MTAyNDQ0ODAwLCJpYXQiOjAsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInRlbmFudF9pZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSJ9.OrgKY9U6d3yDK5V3-qvybf8ltZJCLuBsQWJMta6i82s";

    #[tokio::test]
    async fn test_handle_mcp_request_ping() {
        let server = Arc::new(McpServer::new("test", "1.0.0", "test-jwt-secret"));

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

        let app = create_mcp_routes(server.clone(), "test-jwt-secret");

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
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
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
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
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
                    .body(Body::from(ping.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_handle_mcp_request_invalid_json() {
        let server = Arc::new(McpServer::new("test", "1.0.0", "test-jwt-secret"));
        let app = create_mcp_routes(server, "test-jwt-secret");

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
                    .body(Body::from("invalid json"))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_handle_mcp_sse_returns_stream() {
        let server = Arc::new(McpServer::new("test", "1.0.0", "test-jwt-secret"));
        let app = create_mcp_routes(server, "test-jwt-secret");

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/mcp/sse")
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // SSE 端点应返回 200 OK 和 text/event-stream Content-Type
        assert_eq!(response.status(), StatusCode::OK);
        let content_type = response
            .headers()
            .get("content-type")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(content_type.contains("text/event-stream"));
    }

    #[tokio::test]
    async fn test_handle_mcp_request_before_init() {
        let server = Arc::new(McpServer::new("test", "1.0.0", "test-jwt-secret"));
        let app = create_mcp_routes(server, "test-jwt-secret");

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
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
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

    #[tokio::test]
    async fn test_full_runtime_tools_call_repro() {
        // 模拟 routes.rs 完整初始化：系统工具 + 业务工具注册 + AgentOrchestrator
        let server = Arc::new(McpServer::new("topems-ai-mcp", "0.1.0", "test-jwt-secret"));
        server.register_system_tools().await;
        crate::dsh::mcp::tools::crm::register_crm_tools(&server, "test-secret").await;
        let _agent = crate::dsh::agent::AgentOrchestrator::new(server.tool_registry().clone());

        let app = create_mcp_routes(server.clone(), "test-jwt-secret");

        // 1. initialize
        let resp = app.clone().oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp")
                .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
                .body(Body::from(
                    r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
        println!("repro initialize status: {}", resp.status());

        // 2. initialized 通知
        let resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/mcp")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
                    .body(Body::from(
                        r#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        println!("repro notification status: {}", resp.status());

        // 3. tools/call system.ping（无权限要求的系统工具）
        let resp = app.clone().oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp")
                .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
                .body(Body::from(
                    r#"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"system.ping","arguments":{}}}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
        println!("repro tools/call status: {}", resp.status());
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let text = String::from_utf8_lossy(&body).to_string();
        println!("repro tools/call body: {}", &text[..text.len().min(200)]);
        assert!(
            text.contains("pong"),
            "tools/call system.ping 应返回 pong，实际: {}",
            text
        );

        // 4. tools/call 不存在的工具（应返回 JSON-RPC error，非空回复）
        let resp = app.clone().oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp")
                .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", TEST_JWT_ADMIN))
                .body(Body::from(
                    r#"{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"system.nonexist","arguments":{}}}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
        println!("repro nonexist status: {}", resp.status());
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let text = String::from_utf8_lossy(&body).to_string();
        println!("repro nonexist body: {}", &text[..text.len().min(200)]);
        assert!(
            text.contains("error"),
            "tools/call 不存在工具应返回 error JSON，实际: {}",
            text
        );
    }
}

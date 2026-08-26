//! MCP HTTP Handler — axum endpoint 处理 JSON-RPC 请求。
//!
//! 提供 POST /mcp 端点，接收 MCP 客户端的 JSON-RPC 请求，
//! 路由到 McpServer 处理，并返回 JSON-RPC 响应。
//!
//! 支持：
//! - 单个 JSON-RPC 请求
//! - JSON-RPC 通知（无响应，返回 202 Accepted）
//! - 批量请求（JSON 数组，待实现）

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::Value;
use std::sync::Arc;

use super::server::McpServer;

/// MCP Server 共享状态
pub type McpServerState = Arc<McpServer>;

/// 处理 MCP JSON-RPC 请求
///
/// POST /mcp
/// Content-Type: application/json
/// Body: JSON-RPC 2.0 Request
///
/// 返回：
/// - 200 OK + JSON-RPC Response（请求有 ID）
/// - 202 Accepted（通知，无 ID，无响应 body）
/// - 400 Bad Request（无效 JSON）
pub async fn handle_mcp_request(
    State(server): State<McpServerState>,
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
    match server.handle_request(request).await {
        Some(response) => (StatusCode::OK, Json(response)).into_response(),
        None => {
            // 通知（无 ID），返回 202 Accepted
            StatusCode::ACCEPTED.into_response()
        }
    }
}

/// 处理 MCP SSE 连接（待实现）
///
/// GET /mcp/sse
///
/// 返回 SSE 流，用于服务端推送通知和响应。
/// 目前返回 501 Not Implemented。
pub async fn handle_mcp_sse() -> Response {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "error": "SSE transport not implemented yet",
            "message": "Use POST /mcp for JSON-RPC requests"
        })),
    )
        .into_response()
}

/// 创建 MCP 路由
///
/// 路由：
/// - POST /mcp — JSON-RPC 请求端点
/// - GET /mcp/sse — SSE 连接端点（待实现）
pub fn create_mcp_routes(server: McpServerState) -> axum::Router {
    axum::Router::new()
        .route("/mcp", axum::routing::post(handle_mcp_request))
        .route("/mcp/sse", axum::routing::get(handle_mcp_sse))
        .with_state(server)
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
    async fn test_handle_mcp_sse_not_implemented() {
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

        assert_eq!(response.status(), StatusCode::NOT_IMPLEMENTED);
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

        assert_eq!(response.status(), StatusCode::OK);
        // response should contain error
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(json["error"].is_object());
    }
}

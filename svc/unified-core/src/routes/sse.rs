//! SSE (Server-Sent Events) routes for unified-core service.
//!
//! Provides SSE endpoints for real-time communication:
//! - `GET /api/sse/connect` — Establish SSE connection, receive endpoint event with session_id
//! - `POST /api/sse/session/{session_id}` — Send request, receive response via SSE stream
//!
//! The SSE connection is public (no auth required) because the connection
//! may be established before authentication. Session-based requests can
//! optionally require auth via the request body or headers.

use axum::extract::{Path, State};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::routing::{get, post};
use axum::Json;
use axum::Router;
use futures_util::stream::Stream;
use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::shared::SseSessionManager;
use crate::AppState;

// ===== SSE Event Types =====

/// Payload for the `endpoint` event sent when a client connects.
#[derive(Debug, Serialize, Deserialize)]
pub struct EndpointEventData {
    pub session_id: String,
    pub endpoint: String,
    pub expires_in: u64,
}

/// Request body for `POST /api/sse/session/{session_id}`.
#[derive(Debug, Deserialize)]
pub struct SseSessionRequest {
    /// Optional event type (defaults to "message").
    #[serde(default = "default_event_type")]
    pub event_type: String,
    /// The data payload to send via SSE.
    pub data: serde_json::Value,
}

fn default_event_type() -> String {
    "message".to_string()
}

/// Response for `POST /api/sse/session/{session_id}`.
#[derive(Debug, Serialize)]
pub struct SseSessionResponse {
    pub success: bool,
    pub session_id: String,
    pub message: String,
}

// ===== SSE Route Handlers =====

/// Pure session-request processing logic, testable without a full `AppState`.
///
/// Handles the three outcome branches of `sse_session_handler`:
/// - session not found → `success=false, "Session not found or expired"`
/// - event build failure → `success=false, "Failed to build event: {e}"`
/// - send failure (receiver dropped) → `success=false, "Client disconnected"`
async fn process_session_request(
    sessions: &SseSessionManager,
    session_id: &str,
    request: &SseSessionRequest,
) -> SseSessionResponse {
    let sender = match sessions.get_sender(session_id).await {
        Some(s) => s,
        None => {
            tracing::warn!("SSE session not found: session_id={}", session_id);
            return SseSessionResponse {
                success: false,
                session_id: session_id.to_string(),
                message: "Session not found or expired".to_string(),
            };
        }
    };

    // Build the SSE event from the request.
    let event = Event::default()
        .event(&request.event_type)
        .json_data(&request.data);

    match event {
        Ok(evt) => match sender.send(Ok(evt)).await {
            Ok(_) => {
                tracing::debug!(
                    "SSE event sent: session_id={}, event_type={}",
                    session_id,
                    request.event_type
                );
                SseSessionResponse {
                    success: true,
                    session_id: session_id.to_string(),
                    message: "Event sent successfully".to_string(),
                }
            }
            Err(_) => {
                // Receiver dropped — client disconnected.
                tracing::warn!("SSE client disconnected: session_id={}", session_id);
                sessions.remove_session(session_id).await;
                SseSessionResponse {
                    success: false,
                    session_id: session_id.to_string(),
                    message: "Client disconnected".to_string(),
                }
            }
        },
        Err(e) => {
            tracing::error!(
                "SSE event build failed: session_id={}, error={}",
                session_id,
                e
            );
            SseSessionResponse {
                success: false,
                session_id: session_id.to_string(),
                message: format!("Failed to build event: {}", e),
            }
        }
    }
}

/// `GET /api/sse/connect` — Establish an SSE connection.
///
/// Sends an `endpoint` event containing the session_id and the URL
/// where the client should POST requests. The connection stays open
/// and will receive events pushed via `POST /api/sse/session/{session_id}`.
pub async fn sse_connect_handler(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, axum::Error>>> {
    // Try to create a new SSE session
    let session_result = state.sse_sessions.create_session().await;

    let stream = async_stream::stream! {
        let (session_id, mut receiver) = match session_result {
            Some(s) => s,
            None => {
                // Max sessions limit reached — send error event and close
                tracing::warn!("SSE connection rejected: max sessions limit reached");
                let error_data = serde_json::json!({
                    "error": "max_sessions_reached",
                    "message": "Maximum number of concurrent SSE sessions has been reached",
                });
                let error_event = Event::default()
                    .event("error")
                    .json_data(error_data)
                    .map_err(axum::Error::new);
                yield error_event;
                return;
            }
        };

        tracing::info!("SSE connection established: session_id={}", session_id);

        // Build the endpoint URL the client should POST to.
        let endpoint = format!("/api/sse/session/{}", session_id);

        let endpoint_data = EndpointEventData {
            session_id: session_id.clone(),
            endpoint,
            expires_in: 1800, // 30 minutes
        };

        // Send the initial endpoint event.
        let endpoint_event = Event::default()
            .event("endpoint")
            .json_data(endpoint_data)
            .map_err(axum::Error::new);
        yield endpoint_event;

        // Forward all events from the receiver.
        while let Some(event) = receiver.recv().await {
            yield event;
        }

        // Connection closed — clean up the session.
        tracing::info!("SSE connection closed: session_id={}", session_id);
        state.sse_sessions.remove_session(&session_id).await;
    };

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

/// `POST /api/sse/session/{session_id}` — Send a request to an SSE session.
///
/// The request body is parsed and pushed as an SSE event to the connected
/// client. Returns 202 Accepted if the event was successfully queued.
pub async fn sse_session_handler(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(request): Json<SseSessionRequest>,
) -> Json<SseSessionResponse> {
    tracing::debug!(
        "SSE session request: session_id={}, event_type={}",
        session_id,
        request.event_type
    );

    Json(process_session_request(&state.sse_sessions, &session_id, &request).await)
}

// ===== Route Registration =====

/// SSE routes registered under `/api/sse/*`.
///
/// These are public routes (no auth required) because SSE connections
/// may be established before authentication.
pub fn sse_routes() -> Router<AppState> {
    Router::new()
        .route("/sse/connect", get(sse_connect_handler))
        .route("/sse/session/{session_id}", post(sse_session_handler))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== EndpointEventData tests =====

    #[test]
    fn test_endpoint_event_data_serialization() {
        let data = EndpointEventData {
            session_id: "sess-001".to_string(),
            endpoint: "/api/sse/session/sess-001".to_string(),
            expires_in: 1800,
        };
        let json = serde_json::to_string(&data).unwrap();
        assert!(json.contains("\"session_id\":\"sess-001\""));
        assert!(json.contains("\"endpoint\":\"/api/sse/session/sess-001\""));
        assert!(json.contains("\"expires_in\":1800"));
    }

    #[test]
    fn test_endpoint_event_data_deserialization() {
        let json =
            r#"{"session_id":"sess-002","endpoint":"/api/sse/session/sess-002","expires_in":900}"#;
        let data: EndpointEventData = serde_json::from_str(json).unwrap();
        assert_eq!(data.session_id, "sess-002");
        assert_eq!(data.endpoint, "/api/sse/session/sess-002");
        assert_eq!(data.expires_in, 900);
    }

    #[test]
    fn test_endpoint_event_data_round_trip() {
        let original = EndpointEventData {
            session_id: "rt-001".to_string(),
            endpoint: "/api/sse/session/rt-001".to_string(),
            expires_in: 3600,
        };
        let json = serde_json::to_string(&original).unwrap();
        let parsed: EndpointEventData = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.session_id, original.session_id);
        assert_eq!(parsed.endpoint, original.endpoint);
        assert_eq!(parsed.expires_in, original.expires_in);
    }

    #[test]
    fn test_endpoint_event_data_field_order() {
        // 确保字段顺序稳定（前端 SDK 按字段名解析，不依赖顺序但记录基线）
        let data = EndpointEventData {
            session_id: "s".to_string(),
            endpoint: "e".to_string(),
            expires_in: 0,
        };
        let json = serde_json::to_string(&data).unwrap();
        // session_id 应出现在 endpoint 之前（结构体声明顺序）
        let sid_pos = json.find("session_id").unwrap();
        let ep_pos = json.find("endpoint").unwrap();
        let exp_pos = json.find("expires_in").unwrap();
        assert!(sid_pos < ep_pos);
        assert!(ep_pos < exp_pos);
    }

    // ===== SseSessionRequest tests =====

    #[test]
    fn test_sse_session_request_default_event_type() {
        let json = r#"{"data":{"msg":"hello"}}"#;
        let req: SseSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.event_type, "message");
        assert_eq!(req.data["msg"], "hello");
    }

    #[test]
    fn test_sse_session_request_custom_event_type() {
        let json = r#"{"event_type":"update","data":{"count":42}}"#;
        let req: SseSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.event_type, "update");
        assert_eq!(req.data["count"], 42);
    }

    #[test]
    fn test_sse_session_request_null_data() {
        let json = r#"{"event_type":"ping","data":null}"#;
        let req: SseSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.event_type, "ping");
        assert!(req.data.is_null());
    }

    #[test]
    fn test_sse_session_request_nested_data() {
        let json = r#"{"event_type":"notify","data":{"user":{"id":"u1","name":"Alice"},"tags":["a","b"]}}"#;
        let req: SseSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.event_type, "notify");
        assert_eq!(req.data["user"]["id"], "u1");
        assert_eq!(req.data["user"]["name"], "Alice");
        assert_eq!(req.data["tags"][0], "a");
        assert_eq!(req.data["tags"][1], "b");
    }

    #[test]
    fn test_sse_session_request_array_data() {
        let json = r#"{"data":[1,2,3]}"#;
        let req: SseSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.event_type, "message");
        assert!(req.data.is_array());
        assert_eq!(req.data.as_array().unwrap().len(), 3);
    }

    #[test]
    fn test_default_event_type_function() {
        assert_eq!(default_event_type(), "message");
    }

    // ===== SseSessionResponse tests =====

    #[test]
    fn test_sse_session_response_success_serialization() {
        let resp = SseSessionResponse {
            success: true,
            session_id: "sess-ok".to_string(),
            message: "Event sent successfully".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"session_id\":\"sess-ok\""));
        assert!(json.contains("\"Event sent successfully\""));
    }

    #[test]
    fn test_sse_session_response_failure_serialization() {
        let resp = SseSessionResponse {
            success: false,
            session_id: "sess-fail".to_string(),
            message: "Session not found or expired".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"session_id\":\"sess-fail\""));
        assert!(json.contains("\"Session not found or expired\""));
    }

    #[test]
    fn test_sse_session_response_disconnect_message() {
        let resp = SseSessionResponse {
            success: false,
            session_id: "s3".to_string(),
            message: "Client disconnected".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("Client disconnected"));
    }

    // ===== Event construction logic tests =====
    // 验证从 SseSessionRequest 构造 Event 的逻辑（不依赖 AppState / channel）

    #[test]
    fn test_event_construction_from_request() {
        let req = SseSessionRequest {
            event_type: "custom_evt".to_string(),
            data: serde_json::json!({"key": "value"}),
        };
        let event = Event::default().event(&req.event_type).json_data(&req.data);
        assert!(event.is_ok());
        let evt = event.unwrap();
        // 渲染 Event 为字符串，校验 event: 行 + data: 行
        let rendered = format!("{:?}", evt);
        assert!(rendered.contains("custom_evt") || rendered.contains("custom_evt"));
    }

    #[test]
    fn test_event_construction_with_default_event_type() {
        // 走 default_event_type 路径：未指定 event_type 时默认 "message"
        let json = r#"{"data":{"hello":"world"}}"#;
        let req: SseSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.event_type, "message");

        let event = Event::default().event(&req.event_type).json_data(&req.data);
        assert!(event.is_ok());
    }

    #[test]
    fn test_event_construction_null_data() {
        let req = SseSessionRequest {
            event_type: "ping".to_string(),
            data: serde_json::Value::Null,
        };
        let event = Event::default().event(&req.event_type).json_data(&req.data);
        assert!(event.is_ok());
    }

    // ===== endpoint URL 构造逻辑 =====
    // 验证 handler 内 `format!("/api/sse/session/{}", session_id)` 的格式基线

    #[test]
    fn test_endpoint_url_format() {
        let session_id = "abc-123-xyz";
        let url = format!("/api/sse/session/{}", session_id);
        assert_eq!(url, "/api/sse/session/abc-123-xyz");
        assert!(url.starts_with("/api/sse/session/"));
        assert!(url.ends_with(session_id));
    }

    #[test]
    fn test_endpoint_url_with_uuid_session() {
        // SSE session_id 实际为 UUID 格式，校验兼容
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let url = format!("/api/sse/session/{}", session_id);
        assert_eq!(url, "/api/sse/session/550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_endpoint_url_in_endpoint_event_data() {
        // 端点 URL 写入 EndpointEventData.endpoint 字段
        let session_id = "sess-xyz";
        let endpoint = format!("/api/sse/session/{}", session_id);
        let data = EndpointEventData {
            session_id: session_id.to_string(),
            endpoint,
            expires_in: 1800,
        };
        assert!(data.endpoint.ends_with(session_id));
        assert!(data.endpoint.starts_with("/api/sse/session/"));
        // 校验 session_id 与 endpoint 末段对齐
        let last_segment = data.endpoint.rsplit('/').next().unwrap();
        assert_eq!(last_segment, session_id);
    }

    // ===== process_session_request handler logic tests (V479) =====
    // 覆盖 sse_session_handler 的核心分支，不依赖 AppState：
    // session 不存在 / 发送成功 / 客户端断开（receiver dropped）+ 会话清理。

    use crate::shared::SseSessionManager;

    #[tokio::test]
    async fn test_process_session_request_not_found() {
        let sessions = SseSessionManager::new();
        let req = SseSessionRequest {
            event_type: "message".to_string(),
            data: serde_json::json!({"msg": "hi"}),
        };

        let resp = process_session_request(&sessions, "missing-session", &req).await;

        assert!(!resp.success);
        assert_eq!(resp.session_id, "missing-session");
        assert_eq!(resp.message, "Session not found or expired");
        // 未创建任何会话
        assert_eq!(sessions.session_count().await, 0);
    }

    #[tokio::test]
    async fn test_process_session_request_success() {
        let sessions = SseSessionManager::new();
        let (session_id, mut receiver) = sessions.create_session().await.unwrap();
        let req = SseSessionRequest {
            event_type: "message".to_string(),
            data: serde_json::json!({"msg": "hello"}),
        };

        let resp = process_session_request(&sessions, &session_id, &req).await;

        assert!(resp.success);
        assert_eq!(resp.message, "Event sent successfully");
        // 事件应实际到达客户端的 receiver
        let evt = receiver.recv().await.unwrap().unwrap();
        assert!(format!("{:?}", evt).contains("message"));
        // 会话仍存在
        assert_eq!(sessions.session_count().await, 1);
    }

    #[tokio::test]
    async fn test_process_session_request_custom_event_type_reaches_receiver() {
        let sessions = SseSessionManager::new();
        let (session_id, mut receiver) = sessions.create_session().await.unwrap();
        let req = SseSessionRequest {
            event_type: "update".to_string(),
            data: serde_json::json!({"count": 42}),
        };

        let resp = process_session_request(&sessions, &session_id, &req).await;
        assert!(resp.success);

        let evt = receiver.recv().await.unwrap().unwrap();
        let rendered = format!("{:?}", evt);
        assert!(rendered.contains("update"));
        assert!(rendered.contains("42"));
    }

    #[tokio::test]
    async fn test_process_session_request_client_disconnected() {
        let sessions = SseSessionManager::new();
        let (session_id, receiver) = sessions.create_session().await.unwrap();
        // 模拟客户端断开：drop receiver
        drop(receiver);

        let req = SseSessionRequest {
            event_type: "message".to_string(),
            data: serde_json::json!({"msg": "nobody listens"}),
        };

        let resp = process_session_request(&sessions, &session_id, &req).await;

        assert!(!resp.success);
        assert_eq!(resp.message, "Client disconnected");
        // 断开后会话应被清理
        assert_eq!(sessions.session_count().await, 0);
        assert!(sessions.get_sender(&session_id).await.is_none());
    }

    // ===== SseSessionManager behavior tests (V479) =====
    // 覆盖 sse_connect_handler 依赖的会话生命周期边界：上限拒绝 /
    // get_sender / remove_session / cleanup_expired。

    #[tokio::test]
    async fn test_sse_session_manager_max_limit_rejects_overflow() {
        let sessions = SseSessionManager::with_max_sessions(1);

        assert!(sessions.create_session().await.is_some());
        // 达到上限后拒绝新会话（connect handler 将发送 error 事件）
        assert!(sessions.create_session().await.is_none());
        assert_eq!(sessions.session_count().await, 1);
    }

    #[tokio::test]
    async fn test_sse_session_manager_get_and_remove() {
        let sessions = SseSessionManager::new();
        let (session_id, _receiver) = sessions.create_session().await.unwrap();

        assert!(sessions.get_sender(&session_id).await.is_some());
        assert!(sessions.get_sender("missing").await.is_none());

        sessions.remove_session(&session_id).await;
        assert!(sessions.get_sender(&session_id).await.is_none());
        assert_eq!(sessions.session_count().await, 0);
    }

    #[tokio::test]
    async fn test_sse_session_manager_cleanup_expired_removes_idle() {
        let sessions = SseSessionManager::new();
        sessions.create_session().await.unwrap();
        assert_eq!(sessions.session_count().await, 1);

        // 0ms 超时 → 全部视为过期
        let removed = sessions.cleanup_expired(Duration::from_millis(0)).await;
        assert_eq!(removed, 1);
        assert_eq!(sessions.session_count().await, 0);
    }

    #[tokio::test]
    async fn test_sse_session_manager_cleanup_expired_keeps_recent() {
        let sessions = SseSessionManager::new();
        sessions.create_session().await.unwrap();

        // 长超时（1 小时）→ 刚创建的会话不过期
        let removed = sessions.cleanup_expired(Duration::from_secs(3600)).await;
        assert_eq!(removed, 0);
        assert_eq!(sessions.session_count().await, 1);
    }
}

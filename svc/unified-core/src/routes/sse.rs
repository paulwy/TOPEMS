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

    let sender = match state.sse_sessions.get_sender(&session_id).await {
        Some(s) => s,
        None => {
            tracing::warn!("SSE session not found: session_id={}", session_id);
            return Json(SseSessionResponse {
                success: false,
                session_id,
                message: "Session not found or expired".to_string(),
            });
        }
    };

    // Build the SSE event from the request.
    let event = Event::default()
        .event(&request.event_type)
        .json_data(&request.data);

    match event {
        Ok(evt) => {
            match sender.send(Ok(evt)).await {
                Ok(_) => {
                    tracing::debug!(
                        "SSE event sent: session_id={}, event_type={}",
                        session_id,
                        request.event_type
                    );
                    Json(SseSessionResponse {
                        success: true,
                        session_id,
                        message: "Event sent successfully".to_string(),
                    })
                }
                Err(_) => {
                    // Receiver dropped — client disconnected.
                    tracing::warn!("SSE client disconnected: session_id={}", session_id);
                    state.sse_sessions.remove_session(&session_id).await;
                    Json(SseSessionResponse {
                        success: false,
                        session_id,
                        message: "Client disconnected".to_string(),
                    })
                }
            }
        }
        Err(e) => {
            tracing::error!(
                "SSE event build failed: session_id={}, error={}",
                session_id,
                e
            );
            Json(SseSessionResponse {
                success: false,
                session_id,
                message: format!("Failed to build event: {}", e),
            })
        }
    }
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

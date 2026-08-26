//! Shared module for unified-core service
//! Contains unified types and utilities for all core modules

pub mod service_client;
pub mod consul_service_discovery;
pub mod etcd_service_discovery;
pub mod zookeeper_service_discovery;
pub mod util;

use axum::extract::FromRef;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use topems_shared::AuthState;
use topems_shared_auth::security::{
    AuditLoggerMiddleware, BodyLimitMiddleware, FieldEncryptionService, SecurityHeadersLayer,
};
use topems_shared_core::{
    compression::CompressionMiddleware,
    feature_flag::FeatureFlagService,
    health::{SimpleHealthConfig, SystemMetrics},
};
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

use crate::middleware::input_validation::InputValidationConfig;
use crate::middleware::rate_limit::RateLimitMiddleware;
use crate::middleware::versioning::VersionMiddleware;
use crate::modules::communication::ws::WsState;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub ws_state: Arc<WsState>,
    pub http_client: Client,
    pub rate_limit_middleware: Arc<RateLimitMiddleware>,
    pub versioning_middleware: Arc<VersionMiddleware>,
    pub security_headers_layer: Arc<SecurityHeadersLayer>,
    pub compression_middleware: Arc<CompressionMiddleware>,
    pub body_limit_middleware: Arc<BodyLimitMiddleware>,
    pub audit_logger_middleware: Arc<AuditLoggerMiddleware>,
    pub input_validation_config: InputValidationConfig,
    pub metrics: Arc<SystemMetrics>,
    pub encryption: Option<Arc<FieldEncryptionService>>,
    pub feature_flag_service: Arc<FeatureFlagService>,
    /// V430: SSE session manager for real-time communication endpoints.
    pub sse_sessions: Arc<SseSessionManager>,
    /// V436: Business tool registry for connecting to real services.
    pub business_tool_registry: crate::modules::business_tools::BusinessToolRegistry,
    /// V444: Permission store for persisting tenant-based permission configurations.
    pub permission_store: Arc<dyn crate::routes::business_tools::permission_store::PermissionStore>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for Arc<WsState> {
    fn from_ref(state: &AppState) -> Self {
        state.ws_state.clone()
    }
}

impl FromRef<AppState> for Arc<RateLimitMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.rate_limit_middleware.clone()
    }
}

impl FromRef<AppState> for Arc<SecurityHeadersLayer> {
    fn from_ref(state: &AppState) -> Self {
        state.security_headers_layer.clone()
    }
}

impl FromRef<AppState> for Arc<CompressionMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.compression_middleware.clone()
    }
}

impl FromRef<AppState> for Arc<BodyLimitMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.body_limit_middleware.clone()
    }
}

impl FromRef<AppState> for InputValidationConfig {
    fn from_ref(state: &AppState) -> Self {
        state.input_validation_config.clone()
    }
}

impl FromRef<AppState> for Arc<AuditLoggerMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.audit_logger_middleware.clone()
    }
}

impl FromRef<AppState> for Arc<SseSessionManager> {
    fn from_ref(state: &AppState) -> Self {
        state.sse_sessions.clone()
    }
}

/// Unified API response type for all core modules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> CoreResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

pub use topems_shared_core::response::{total_pages_of, PaginatedResponse};

// ===== V430: SSE Session Manager =====

/// A single SSE session, holding the sender for pushing events to the client.
#[derive(Clone)]
pub struct SseSession {
    /// Sender for pushing SSE events to the connected client.
    pub sender: mpsc::Sender<Result<axum::response::sse::Event, axum::Error>>,
    /// When the session was created.
    pub created_at: Instant,
    /// Last activity timestamp (for timeout cleanup).
    pub last_active: Instant,
}

/// Manages all active SSE sessions.
///
/// Stored in `AppState` as `Arc<SseSessionManager>`.
#[derive(Clone)]
pub struct SseSessionManager {
    sessions: Arc<Mutex<HashMap<String, SseSession>>>,
    /// Maximum number of concurrent SSE sessions.
    max_sessions: usize,
}

impl Default for SseSessionManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SseSessionManager {
    /// Default maximum number of concurrent SSE sessions.
    pub const DEFAULT_MAX_SESSIONS: usize = 1000;

    /// Create a new session manager with the default max sessions limit.
    pub fn new() -> Self {
        Self::with_max_sessions(Self::DEFAULT_MAX_SESSIONS)
    }

    /// Create a new session manager with a custom max sessions limit.
    pub fn with_max_sessions(max_sessions: usize) -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            max_sessions,
        }
    }

    /// Create a new SSE session, returning the session_id and a receiver
    /// that yields SSE events for the client stream.
    ///
    /// Returns `None` if the maximum number of sessions has been reached.
    pub async fn create_session(
        &self,
    ) -> Option<(
        String,
        mpsc::Receiver<Result<axum::response::sse::Event, axum::Error>>,
    )> {
        let mut sessions = self.sessions.lock().await;

        // Check max sessions limit
        if sessions.len() >= self.max_sessions {
            tracing::warn!(
                "SSE session limit reached: {}/{}",
                sessions.len(),
                self.max_sessions
            );
            return None;
        }

        let session_id = Uuid::new_v4().to_string();
        let (sender, receiver) = mpsc::channel(64);

        let session = SseSession {
            sender,
            created_at: Instant::now(),
            last_active: Instant::now(),
        };

        sessions.insert(session_id.clone(), session);
        drop(sessions);

        tracing::info!("SSE session created: {} (total: {})", session_id, self.session_count().await);

        Some((session_id, receiver))
    }

    /// Get the maximum number of concurrent sessions.
    pub fn max_sessions(&self) -> usize {
        self.max_sessions
    }

    /// Get the sender for a given session_id, if it exists.
    /// Also updates the last_active timestamp.
    pub async fn get_sender(
        &self,
        session_id: &str,
    ) -> Option<mpsc::Sender<Result<axum::response::sse::Event, axum::Error>>> {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.last_active = Instant::now();
            Some(session.sender.clone())
        } else {
            None
        }
    }

    /// Remove a session by session_id.
    pub async fn remove_session(&self, session_id: &str) {
        let mut sessions = self.sessions.lock().await;
        sessions.remove(session_id);
    }

    /// Get the number of active sessions.
    pub async fn session_count(&self) -> usize {
        let sessions = self.sessions.lock().await;
        sessions.len()
    }

    /// Remove sessions that have been inactive for longer than `timeout`.
    pub async fn cleanup_expired(&self, timeout: Duration) -> usize {
        let mut sessions = self.sessions.lock().await;
        let before = sessions.len();
        sessions.retain(|_, session| session.last_active.elapsed() < timeout);
        before - sessions.len()
    }
}

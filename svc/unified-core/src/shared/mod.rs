//! Shared module for unified-core service
//! Contains unified types and utilities for all core modules

pub mod util;

use axum::extract::FromRef;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_auth::security::{
    AuditLoggerMiddleware, BodyLimitMiddleware, FieldEncryptionService, SecurityHeadersLayer,
};
use topems_shared_core::{
    compression::CompressionMiddleware,
    feature_flag::FeatureFlagService,
    health::{SimpleHealthConfig, SystemMetrics},
};

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

/// Pagination parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub search: Option<String>,
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(20),
            search: None,
        }
    }
}

/// Paginated response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

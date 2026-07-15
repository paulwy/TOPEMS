//! Shared module for unified-core service
//! Contains unified types and utilities for all core modules

use axum::extract::FromRef;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::{AuthState, SimpleHealthConfig};

use crate::middleware::rate_limit::RateLimitMiddleware;
use crate::middleware::versioning::VersionMiddleware;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub rate_limit_middleware: Arc<RateLimitMiddleware>,
    pub versioning_middleware: Arc<VersionMiddleware>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for Arc<RateLimitMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.rate_limit_middleware.clone()
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

pub mod middleware;
pub mod util;

use axum::extract::FromRef;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SystemMetrics;
use topems_shared_db::scope::Db;

#[derive(Clone)]
pub struct AppState {
    // 连接治理 B：模块唯一可见的数据库句柄（作用域事务，不暴露池）
    pub db: Db,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

/// 兼容旧 unified-core CoreResponse 短路径（所有 plugin handlers import `crate::CoreResponse`）
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

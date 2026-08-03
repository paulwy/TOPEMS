use axum::{
    body::Body,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::warn;

use topems_shared::ApiResponse;

use crate::AppState;

pub const MODULES: &[&str] = &[
    "iam",
    "flow",
    "file",
    "communication",
    "tenant",
    "billing",
    "plugin",
    "master",
    "dict",
];

#[derive(Debug, Clone)]
pub struct ModuleConfig {
    pub name: String,
    pub max_connections: u32,
    pub rate_limit_requests: u32,
    pub rate_limit_window_secs: u64,
    pub enabled: bool,
}

impl Default for ModuleConfig {
    fn default() -> Self {
        Self {
            name: "default".to_string(),
            max_connections: 5,
            rate_limit_requests: 100,
            rate_limit_window_secs: 60,
            enabled: true,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ModuleIsolationState {
    pub pools: Arc<RwLock<HashMap<String, PgPool>>>,
    pub configs: Arc<HashMap<String, ModuleConfig>>,
    pub status: Arc<RwLock<HashMap<String, ModuleHealthStatus>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleHealthStatus {
    pub name: String,
    pub status: String,
    pub db_pool_usage: f64,
    pub request_count: u64,
    pub error_count: u64,
    pub last_error: Option<String>,
}

impl ModuleHealthStatus {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            status: "healthy".to_string(),
            db_pool_usage: 0.0,
            request_count: 0,
            error_count: 0,
            last_error: None,
        }
    }
}

impl ModuleIsolationState {
    pub async fn new(
        database_url: &str,
        configs: HashMap<String, ModuleConfig>,
    ) -> Result<Self, sqlx::Error> {
        let mut pools = HashMap::new();
        let mut status = HashMap::new();

        for (name, config) in &configs {
            if config.enabled {
                let pool = sqlx::postgres::PgPoolOptions::new()
                    .max_connections(config.max_connections)
                    .acquire_timeout(std::time::Duration::from_secs(30))
                    .idle_timeout(std::time::Duration::from_secs(300))
                    .max_lifetime(std::time::Duration::from_secs(1800))
                    .connect(database_url)
                    .await?;
                tracing::info!(
                    "Module '{}' connection pool created (max={})",
                    name,
                    config.max_connections
                );
                pools.insert(name.clone(), pool);
            }
            status.insert(name.clone(), ModuleHealthStatus::new(name));
        }

        Ok(Self {
            pools: Arc::new(RwLock::new(pools)),
            configs: Arc::new(configs),
            status: Arc::new(RwLock::new(status)),
        })
    }

    pub async fn get_pool(&self, module: &str) -> Option<PgPool> {
        self.pools.read().await.get(module).cloned()
    }

    pub async fn record_request(&self, module: &str) {
        if let Some(status) = self.status.write().await.get_mut(module) {
            status.request_count += 1;
        }
    }

    pub async fn record_error(&self, module: &str, error: &str) {
        if let Some(status) = self.status.write().await.get_mut(module) {
            status.error_count += 1;
            status.last_error = Some(error.to_string());
            if status.error_count > 10 {
                status.status = "degraded".to_string();
            }
        }
    }

    pub async fn update_pool_usage(&self) {
        let pools = self.pools.read().await;
        let mut status = self.status.write().await;

        for (name, pool) in pools.iter() {
            if let Some(s) = status.get_mut(name) {
                let total = pool.size() as f64;
                let used = (pool.size() as usize - pool.num_idle()) as f64;
                s.db_pool_usage = if total > 0.0 {
                    (used / total) * 100.0
                } else {
                    0.0
                };
                if s.db_pool_usage > 90.0 {
                    s.status = "degraded".to_string();
                } else if s.error_count <= 10 {
                    s.status = "healthy".to_string();
                }
            }
        }
    }

    pub async fn get_status(&self) -> Vec<ModuleHealthStatus> {
        self.status.read().await.values().cloned().collect()
    }
}

pub fn create_default_module_configs() -> HashMap<String, ModuleConfig> {
    let mut configs = HashMap::new();

    configs.insert(
        "iam".to_string(),
        ModuleConfig {
            name: "iam".to_string(),
            max_connections: 8,
            rate_limit_requests: 200,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "flow".to_string(),
        ModuleConfig {
            name: "flow".to_string(),
            max_connections: 10,
            rate_limit_requests: 150,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "file".to_string(),
        ModuleConfig {
            name: "file".to_string(),
            max_connections: 5,
            rate_limit_requests: 50,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "communication".to_string(),
        ModuleConfig {
            name: "communication".to_string(),
            max_connections: 5,
            rate_limit_requests: 100,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "tenant".to_string(),
        ModuleConfig {
            name: "tenant".to_string(),
            max_connections: 3,
            rate_limit_requests: 50,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "billing".to_string(),
        ModuleConfig {
            name: "billing".to_string(),
            max_connections: 5,
            rate_limit_requests: 100,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "plugin".to_string(),
        ModuleConfig {
            name: "plugin".to_string(),
            max_connections: 3,
            rate_limit_requests: 50,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "master".to_string(),
        ModuleConfig {
            name: "master".to_string(),
            max_connections: 5,
            rate_limit_requests: 100,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs.insert(
        "dict".to_string(),
        ModuleConfig {
            name: "dict".to_string(),
            max_connections: 3,
            rate_limit_requests: 200,
            rate_limit_window_secs: 60,
            enabled: true,
        },
    );

    configs
}

fn extract_module_from_path(path: &str) -> Option<&str> {
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() >= 3 && parts[0] == "api" && parts[1] == "core" {
        return Some(parts[2]);
    }
    None
}

pub async fn module_isolation_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let path = req.uri().path().to_string();
    let module = extract_module_from_path(&path);

    if let Some(module_name) = module {
        if let Some(isolation) = &state.module_isolation {
            isolation.record_request(module_name).await;

            if let Some(config) = isolation.configs.get(module_name) {
                if !config.enabled {
                    warn!("Module '{}' is disabled", module_name);
                    return (
                        StatusCode::SERVICE_UNAVAILABLE,
                        Json(ApiResponse::<()>::error(
                            503,
                            &format!("模块 {} 已禁用", module_name),
                        )),
                    )
                        .into_response();
                }
            }
        }
    }

    let response = next.run(req).await;

    if response.status().is_server_error() {
        if let Some(module_name) = module {
            if let Some(isolation) = &state.module_isolation {
                isolation
                    .record_error(module_name, &format!("HTTP {}", response.status()))
                    .await;
            }
        }
    }

    response
}

pub async fn get_module_health(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<ModuleHealthStatus>>> {
    let status = if let Some(isolation) = &state.module_isolation {
        isolation.get_status().await
    } else {
        Vec::new()
    };
    Json(ApiResponse::success(status, "获取模块健康状态成功"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_module_from_path() {
        assert_eq!(extract_module_from_path("/api/core/iam/users"), Some("iam"));
        assert_eq!(
            extract_module_from_path("/api/core/flow/tasks"),
            Some("flow")
        );
        assert_eq!(
            extract_module_from_path("/api/core/file/upload"),
            Some("file")
        );
        assert_eq!(
            extract_module_from_path("/api/core/communication/ws"),
            Some("communication")
        );
        assert_eq!(extract_module_from_path("/health"), None);
        assert_eq!(extract_module_from_path("/api/v1/users"), None);
    }

    #[test]
    fn test_create_default_module_configs() {
        let configs = create_default_module_configs();
        assert_eq!(configs.len(), MODULES.len());
        assert!(configs.contains_key("iam"));
        assert!(configs.contains_key("flow"));
        assert!(configs.contains_key("file"));
    }
}

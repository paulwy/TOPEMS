// Mobile Service Plugin Interface
// 移动端服务插件接口实现

use crate::shared::AppState;
use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;
use topems_shared_core::health::ServiceHealth;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub category: String,
    pub plugin_type: String,
    pub permissions: Vec<Permission>,
    pub runtime_url: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHealth {
    pub status: String,
    pub database: bool,
}

// Plugin info endpoint
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "mobile".to_string(),
        name: "移动端服务".to_string(),
        version: "1.0.0".to_string(),
        description: "Mobile 移动端服务 - 离线同步、扫码、设备管理".to_string(),
        category: "other".to_string(),
        plugin_type: "business".to_string(),
        permissions: vec![
            Permission {
                code: "mobile:device:register".to_string(),
                name: "注册设备".to_string(),
                resource_type: "device".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "mobile:device:manage".to_string(),
                name: "管理设备".to_string(),
                resource_type: "device".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "mobile:offline:sync".to_string(),
                name: "离线同步".to_string(),
                resource_type: "offline".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "mobile:offline:read".to_string(),
                name: "查看离线数据".to_string(),
                resource_type: "offline".to_string(),
                action: "read".to_string(),
            },
            Permission {
                code: "mobile:scan:barcode".to_string(),
                name: "扫码".to_string(),
                resource_type: "scan".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "mobile:scan:qrcode".to_string(),
                name: "二维码扫描".to_string(),
                resource_type: "scan".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "mobile:scan:ocr".to_string(),
                name: "图像识别".to_string(),
                resource_type: "scan".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "mobile:notification:read".to_string(),
                name: "查看通知".to_string(),
                resource_type: "notification".to_string(),
                action: "read".to_string(),
            },
            Permission {
                code: "mobile:notification:write".to_string(),
                name: "管理通知".to_string(),
                resource_type: "notification".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "mobile:task:read".to_string(),
                name: "查看任务".to_string(),
                resource_type: "task".to_string(),
                action: "read".to_string(),
            },
            Permission {
                code: "mobile:task:write".to_string(),
                name: "管理任务".to_string(),
                resource_type: "task".to_string(),
                action: "write".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "mobile-devices", "label": "设备管理", "path": "/mobile/devices", "icon": "Smartphone", "order": 10, "group": "business"},
            {"code": "mobile-sync", "label": "离线同步", "path": "/mobile/sync", "icon": "RefreshCw", "order": 20, "group": "business"},
            {"code": "mobile-scan", "label": "扫码", "path": "/mobile/scan", "icon": "ScanLine", "order": 30, "group": "business"}
        ])),
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

// Plugin health check endpoint
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ServiceHealth> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => true,
        Err(_) => false,
    };

    Json(topems_shared_core::health::build_health_response(
        "topems-mobile",
        db_status,
    ))
}

// Create plugin routes
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 获取运行时 URL
fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8070".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "mobile".to_string(),
        name: "移动端服务".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Mobile 移动端服务 - 离线同步、扫码、设备管理".to_string(),
        category: "other".to_string(),
        plugin_type: "business".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "mobile-devices", "label": "设备管理", "path": "/mobile/devices", "icon": "Smartphone", "order": 10, "group": "business"},
            {"code": "mobile-sync", "label": "离线同步", "path": "/mobile/sync", "icon": "RefreshCw", "order": 20, "group": "business"},
            {"code": "mobile-scan", "label": "扫码", "path": "/mobile/scan", "icon": "ScanLine", "order": 30, "group": "business"}
        ])),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/mobile/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[MOBILE Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[MOBILE Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[MOBILE Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn permission_roundtrip() {
        roundtrip(&Permission {
            code: "x:y:z".into(),
            name: "xxx".into(),
            resource_type: "device".into(),
            action: "read".into(),
        });
    }

    #[test]
    fn plugin_info_roundtrip() {
        roundtrip(&PluginInfo {
            code: "mobile".into(),
            name: "Mobile".into(),
            version: "1.0.0".into(),
            description: "desc".into(),
            category: "other".into(),
            plugin_type: "business".into(),
            permissions: vec![Permission {
                code: "a".into(),
                name: "b".into(),
                resource_type: "c".into(),
                action: "d".into(),
            }],
            runtime_url: "http://localhost:8070".into(),
            dependencies: vec!["dep1".into()],
            navigation_config: Some(serde_json::json!({"x":1})),
        });
    }

    #[test]
    fn plugin_health_roundtrip() {
        roundtrip(&PluginHealth {
            status: "ok".into(),
            database: true,
        });
    }
}

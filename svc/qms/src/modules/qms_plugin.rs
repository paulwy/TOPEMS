// Quality Assurance Service Plugin Interface
// 质量管理与安全服务插件接口实现

use crate::AppState;
use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;

use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
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
    pub description: String,
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
        code: "qms".to_string(),
        name: "质量管理系统".to_string(),
        version: "1.0.0".to_string(),
        description: "质量管理系统 - 质量检验、质量问题、质量标准、SPC、FMEA、8D、APQP、质量成本"
            .to_string(),
        author: "TOPEMS".to_string(),
        category: "quality".to_string(),
        plugin_type: "business".to_string(),
        permissions: vec![
            Permission {
                code: "qms:read".to_string(),
                name: "质量管理只读".to_string(),
                description: "查看质量管理所有数据".to_string(),
            },
            Permission {
                code: "qms:write".to_string(),
                name: "质量管理写入".to_string(),
                description: "创建和更新质量管理数据".to_string(),
            },
            Permission {
                code: "qms:delete".to_string(),
                name: "质量管理删除".to_string(),
                description: "删除质量管理数据".to_string(),
            },
            Permission {
                code: "qms:approve".to_string(),
                name: "质量管理审批".to_string(),
                description: "审批质量检验、质量问题等".to_string(),
            },
            Permission {
                code: "qms:admin".to_string(),
                name: "质量管理管理".to_string(),
                description: "质量管理全部权限".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec!["erp".to_string(), "mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "qms-inspections", "label": "质量检验", "path": "/qms/inspections", "icon": "ClipboardCheck", "order": 10, "group": "business"},
            {"code": "qms-issues", "label": "质量问题", "path": "/qms/issues", "icon": "AlertTriangle", "order": 20, "group": "business"},
            {"code": "qms-standards", "label": "质量标准", "path": "/qms/standards", "icon": "BookCheck", "order": 30, "group": "business"}
        ])),
    };

    Json(ApiResponse::success(plugin_info, "QMS plugin info"))
}

// Plugin health check endpoint
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<PluginHealth>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => true,
        Err(_) => false,
    };

    let health = PluginHealth {
        status: if db_status {
            "healthy".to_string()
        } else {
            "degraded".to_string()
        },
        database: db_status,
    };

    Json(ApiResponse::success(health, "QMS plugin health check"))
}

// Create plugin routes
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 获取运行时 URL
fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8050".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "qms".to_string(),
        name: "质量管理系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "质量管理系统 - QMS质量管理、LIMS实验室管理、EHS环境健康安全".to_string(),
        author: "TOPEMS".to_string(),
        category: "quality".to_string(),
        plugin_type: "business".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec!["erp".to_string(), "mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "qms-inspections", "label": "质量检验", "path": "/qms/inspections", "icon": "ClipboardCheck", "order": 10, "group": "business"},
            {"code": "qms-issues", "label": "质量问题", "path": "/qms/issues", "icon": "AlertTriangle", "order": 20, "group": "business"},
            {"code": "qms-standards", "label": "质量标准", "path": "/qms/standards", "icon": "BookCheck", "order": 30, "group": "business"}
        ])),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/qms/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[QMS Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[QMS Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[QMS Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_permission() {
        roundtrip(&Permission {
            code: "c".to_string(),
            name: "n".to_string(),
            description: "d".to_string(),
        });
    }

    #[test]
    fn test_plugin_info() {
        roundtrip(&PluginInfo {
            code: "qms".to_string(),
            name: "质量管理系统".to_string(),
            version: "1.0.0".to_string(),
            description: "d".to_string(),
            author: "TOPEMS".to_string(),
            category: "quality".to_string(),
            plugin_type: "business".to_string(),
            permissions: vec![Permission {
                code: "qms:read".to_string(),
                name: "只读".to_string(),
                description: "d".to_string(),
            }],
            runtime_url: "http://localhost:8050".to_string(),
            dependencies: vec!["erp".to_string()],
            navigation_config: Some(serde_json::Value::Null),
        });
    }

    #[test]
    fn test_plugin_health() {
        roundtrip(&PluginHealth {
            status: "healthy".to_string(),
            database: true,
        });
    }
}

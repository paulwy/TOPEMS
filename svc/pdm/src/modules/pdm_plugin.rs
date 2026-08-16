use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub permissions: Vec<PermissionDef>,
    pub runtime_url: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
    #[serde(default)]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

#[utoipa::path(
    get,
    path = "/api/plugins/info",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8031".to_string());

    let info = PluginInfo {
        code: "pdm".to_string(),
        name: "产品数据管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "PDM 产品数据管理系统，包含产品、物料、配方、文档、版本等模块".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec!["mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "pdm-bom", "label": "产品结构", "path": "/pdm/bom", "icon": "Layers", "order": 10, "group": "business"},
            {"code": "pdm-processes", "label": "工艺管理", "path": "/pdm/processes", "icon": "Settings", "order": 20, "group": "business"},
            {"code": "pdm-documents", "label": "文档管理", "path": "/pdm/documents", "icon": "FileText", "order": 30, "group": "business"}
        ])),
        category: Some("manufacturing".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

#[utoipa::path(
    get,
    path = "/api/plugins/health",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<String>> {
    let db_healthy = sqlx::query("SELECT 1").fetch_one(&state.pool).await.is_ok();

    if db_healthy {
        Json(ApiResponse::success(
            "healthy".to_string(),
            "Plugin is healthy",
        ))
    } else {
        Json(ApiResponse::error(500, "Database connection failed"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_plugin_info_serde_roundtrip() {
        let info = PluginInfo {
            code: "pdm".to_string(),
            name: "Product Data Mgmt".to_string(),
            version: "1.0.0".to_string(),
            description: "desc".to_string(),
            permissions: vec![PermissionDef {
                code: "pdm.read".to_string(),
                name: "Read PDM".to_string(),
                resource_type: "document".to_string(),
                action: "read".to_string(),
            }],
            runtime_url: "http://localhost:8031".to_string(),
            dependencies: vec!["mes".to_string(), "core".to_string()],
            navigation_config: Some(json!([{"code": "pdm-bom"}])),
            category: Some("manufacturing".to_string()),
        };
        let serialized = serde_json::to_string(&info).unwrap();
        let deserialized: PluginInfo = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.code, "pdm");
        assert_eq!(deserialized.name, "Product Data Mgmt");
        assert_eq!(deserialized.version, "1.0.0");
        assert_eq!(deserialized.permissions.len(), 1);
        assert_eq!(deserialized.permissions[0].code, "pdm.read");
        assert_eq!(deserialized.dependencies, vec!["mes", "core"]);
        assert!(deserialized.navigation_config.is_some());
        assert_eq!(deserialized.category.as_deref(), Some("manufacturing"));
    }

    #[test]
    fn test_plugin_info_serde_defaults() {
        let json_value = json!({
            "code": "pdm",
            "name": "N",
            "version": "0.1",
            "description": "d",
            "permissions": [],
            "runtime_url": "http://x"
        });
        let info: PluginInfo = serde_json::from_value(json_value).unwrap();
        assert!(info.dependencies.is_empty());
        assert!(info.navigation_config.is_none());
        assert!(info.category.is_none());
    }

    #[test]
    fn test_permission_def_serde_roundtrip() {
        let pd = PermissionDef {
            code: "c".to_string(),
            name: "n".to_string(),
            resource_type: "r".to_string(),
            action: "a".to_string(),
        };
        let c = pd.clone();
        assert_eq!(c.code, pd.code);
        let serialized = serde_json::to_value(pd).unwrap();
        assert_eq!(serialized["code"], "c");
        assert_eq!(serialized["action"], "a");
    }
}

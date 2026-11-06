use axum::extract::{Extension, State};
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use topems_shared_core::{response::ApiResponse, TopemsError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub runtime_url: String,
    pub permissions: Vec<PermissionDef>,
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

fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8042".to_string())
}

/// 获取插件信息
pub async fn get_plugin_info() -> ApiResponse<PluginInfo> {
    let runtime_url = get_runtime_url();
    let info = PluginInfo {
        code: "tms".to_string(),
        name: "运输管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description:
            "TMS 运输管理系统，包含车辆管理、司机管理、承运商管理、运单管理、路线管理等模块"
                .to_string(),
        runtime_url,
        permissions: vec![
            PermissionDef {
                code: "tms:vehicle:read".to_string(),
                name: "查看车辆".to_string(),
                resource_type: "vehicle".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "tms:vehicle:write".to_string(),
                name: "管理车辆".to_string(),
                resource_type: "vehicle".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "tms:driver:read".to_string(),
                name: "查看司机".to_string(),
                resource_type: "driver".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "tms:driver:write".to_string(),
                name: "管理司机".to_string(),
                resource_type: "driver".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "tms:carrier:read".to_string(),
                name: "查看承运商".to_string(),
                resource_type: "carrier".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "tms:carrier:write".to_string(),
                name: "管理承运商".to_string(),
                resource_type: "carrier".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "tms:shipment:read".to_string(),
                name: "查看运单".to_string(),
                resource_type: "shipment".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "tms:shipment:write".to_string(),
                name: "管理运单".to_string(),
                resource_type: "shipment".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "tms:shipment:approve".to_string(),
                name: "审批运单".to_string(),
                resource_type: "shipment".to_string(),
                action: "approve".to_string(),
            },
            PermissionDef {
                code: "tms:route:read".to_string(),
                name: "查看路线".to_string(),
                resource_type: "route".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "tms:route:write".to_string(),
                name: "管理路线".to_string(),
                resource_type: "route".to_string(),
                action: "write".to_string(),
            },
        ],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "tms-vehicles", "label": "车辆管理", "path": "/tms/vehicles", "icon": "Truck", "order": 10, "group": "business"},
            {"code": "tms-drivers", "label": "司机管理", "path": "/tms/drivers", "icon": "User", "order": 20, "group": "business"},
            {"code": "tms-carriers", "label": "承运商管理", "path": "/tms/carriers", "icon": "Building2", "order": 30, "group": "business"},
            {"code": "tms-shipments", "label": "运单管理", "path": "/tms/shipments", "icon": "Package", "order": 40, "group": "business"},
            {"code": "tms-routes", "label": "路线管理", "path": "/tms/routes", "icon": "Map", "order": 50, "group": "business"}
        ])),
        category: Some("logistics".to_string()),
    };
    ApiResponse::success(info, "Plugin info")
}

/// 插件健康检查
pub async fn plugin_health_check(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    match sqlx::query("SELECT 1").fetch_one(&mut scope).await {
        Ok(_) => ApiResponse::success((), "Healthy"),
        Err(e) => ApiResponse::from({
            tracing::warn!("Database error: {}", e);
            TopemsError::ServiceUnavailable("Database error".to_string())
        }),
    }
}

/// 启动时自动注册到 plugin-registry（V68.1 拆分：注册目标为独立 registry 8096，
/// 不再使用 unified-core 旧路径 /dev/runtime/{code}/register）
pub async fn auto_register_to_core(_core_url: Option<&str>) {
    let core_url = std::env::var("PLUGIN_REGISTRY_URL")
        .unwrap_or_else(|_| "http://localhost:8096".to_string());
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "tms".to_string(),
        name: "运输管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "TMS 运输管理系统".to_string(),
        runtime_url,
        permissions: vec![],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "tms-vehicles", "label": "车辆管理", "path": "/tms/vehicles", "icon": "Truck", "order": 10, "group": "business"},
            {"code": "tms-drivers", "label": "司机管理", "path": "/tms/drivers", "icon": "User", "order": 20, "group": "business"},
            {"code": "tms-carriers", "label": "承运商管理", "path": "/tms/carriers", "icon": "Building2", "order": 30, "group": "business"},
            {"code": "tms-shipments", "label": "运单管理", "path": "/tms/shipments", "icon": "Package", "order": 40, "group": "business"},
            {"code": "tms-routes", "label": "路线管理", "path": "/tms/routes", "icon": "Map", "order": 50, "group": "business"}
        ])),
        category: Some("logistics".to_string()),
    };

    let client = topems_shared_core::shared_http_client();
    let url = format!("{}/dev/runtime/tms/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[TMS Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[TMS Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[TMS Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

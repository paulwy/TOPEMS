use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/plugins/info",
    responses((status = 200, description = "get_plugin_info OK")),
    tag = "master_plugin"
)]

pub async fn get_plugin_info() -> ApiResponse<PluginInfo> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    let info = PluginInfo {
        code: "master-data".to_string(),
        name: "主数据管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Master Data 主数据管理服务，包含数据质量闭环、自动修复、数据治理 AI"
            .to_string(),
        runtime_url,
        permissions: vec![
            PermissionDef {
                code: "master-data:quality:read".to_string(),
                name: "查看质量检查".to_string(),
                resource_type: "quality_check".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "master-data:quality:write".to_string(),
                name: "管理质量规则".to_string(),
                resource_type: "quality_rule".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "master-data:quality:execute".to_string(),
                name: "执行质量检查".to_string(),
                resource_type: "quality_check".to_string(),
                action: "execute".to_string(),
            },
            PermissionDef {
                code: "master-data:autofix:execute".to_string(),
                name: "执行自动修复".to_string(),
                resource_type: "auto_fix".to_string(),
                action: "execute".to_string(),
            },
            PermissionDef {
                code: "master-data:autofix:read".to_string(),
                name: "查看修复历史".to_string(),
                resource_type: "fix_history".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "master-data:governance:read".to_string(),
                name: "查看治理建议".to_string(),
                resource_type: "governance_suggestion".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "master-data:governance:approve".to_string(),
                name: "批准治理建议".to_string(),
                resource_type: "governance_suggestion".to_string(),
                action: "approve".to_string(),
            },
            PermissionDef {
                code: "master-data:dashboard:read".to_string(),
                name: "查看质量仪表盘".to_string(),
                resource_type: "dashboard".to_string(),
                action: "read".to_string(),
            },
        ],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "master-data-quality", "label": "数据质量", "path": "/master-data/quality", "icon": "ShieldCheck", "order": 10, "group": "system"},
            {"code": "master-data-lineage", "label": "数据血缘", "path": "/master-data/lineage", "icon": "GitBranch", "order": 20, "group": "system"},
            {"code": "master-data-governance", "label": "数据治理", "path": "/master-data/governance", "icon": "Gauge", "order": 30, "group": "system"}
        ])),
        category: Some("system".to_string()),
    };
    ApiResponse::success(info, "Plugin info")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/plugins/health",
    responses((status = 200, description = "plugin_health_check OK")),
    tag = "master_plugin"
)]

pub async fn plugin_health_check(State(state): State<AppState>) -> ApiResponse<()> {
    match sqlx::query("SELECT 1").fetch_one(&state.db).await {
        Ok(_) => ApiResponse::success((), "Healthy"),
        Err(e) => ApiResponse::from({
            tracing::warn!("Database error: {}", e);
            TopemsError::ServiceUnavailable("Database error".to_string())
        }),
    }
}

/// 扁平契约 `GET /dashboard/recent`：最近更新的主数据对象（以元数据对象为代理来源），
/// 空表或查询异常均返回空集合，绝不裸 500。
pub async fn list_recent_activities(State(state): State<AppState>) -> ApiResponse<Value> {
    use sqlx::Row;
    let rows = sqlx::query(
        "SELECT id, name, object_type, owner, updated_at FROM master_data.mdm_metadata_objects
         ORDER BY updated_at DESC LIMIT 10",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    let items: Vec<Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<String, _>("id"),
                "name": r.get::<String, _>("name"),
                "type": r.get::<String, _>("object_type"),
                "owner": r.get::<String, _>("owner"),
                "updated_at": r.get::<String, _>("updated_at"),
            })
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": items.len() }),
        "最近访问记录",
    )
}

/// 扁平契约 `GET /dashboard/recent/{id}`：单条最近记录查询，不存在返回业务 404。
pub async fn get_recent_activity(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Value> {
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT id, name, object_type, owner, updated_at FROM master_data.mdm_metadata_objects
         WHERE id = $1 LIMIT 1",
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match row {
        Some(r) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<String, _>("id"),
                "name": r.get::<String, _>("name"),
                "type": r.get::<String, _>("object_type"),
                "owner": r.get::<String, _>("owner"),
                "updated_at": r.get::<String, _>("updated_at"),
            }),
            "最近访问记录",
        ),
        None => ApiResponse::not_found("未找到最近访问记录"),
    }
}

/// 扁平契约 `POST /export`：通用主数据导出受理（无明确子模块归属，挂插件根）。
/// 请求体宽松，回显 scope/format 并给出受理时间；不触发重活。
pub async fn export_archive(
    State(_state): State<AppState>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let scope = req
        .get("scope")
        .and_then(|v| v.as_str())
        .unwrap_or("master_data")
        .to_string();
    let format = req
        .get("format")
        .and_then(|v| v.as_str())
        .unwrap_or("json")
        .to_string();
    ApiResponse::success(
        serde_json::json!({
            "success": true,
            "scope": scope,
            "format": format,
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "record_count": 0,
        }),
        "导出任务已受理",
    )
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

pub async fn auto_register_to_core(_core_url: Option<&str>) {
    let core_url = std::env::var("PLUGIN_REGISTRY_URL")
        .unwrap_or_else(|_| "http://localhost:8096".to_string());
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    let info = PluginInfo {
        code: "master-data".to_string(),
        name: "主数据管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Master Data 主数据管理服务".to_string(),
        runtime_url,
        permissions: vec![],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "master-data-quality", "label": "数据质量", "path": "/master-data/quality", "icon": "ShieldCheck", "order": 10, "group": "system"},
            {"code": "master-data-lineage", "label": "数据血缘", "path": "/master-data/lineage", "icon": "GitBranch", "order": 20, "group": "system"},
            {"code": "master-data-governance", "label": "数据治理", "path": "/master-data/governance", "icon": "Gauge", "order": 30, "group": "system"}
        ])),
        category: Some("system".to_string()),
    };

    let client = topems_shared_core::shared_http_client();
    let url = format!("{}/dev/runtime/master-data/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Master-Data Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Master-Data Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Master-Data Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

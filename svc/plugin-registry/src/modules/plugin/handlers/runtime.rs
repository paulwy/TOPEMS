use axum::Extension;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use topems_shared_auth::Claims;

use super::super::models::*;
use crate::{AppState, CoreResponse};

/// 验证插件注册令牌
/// 如果未设置 PLUGIN_REGISTRATION_TOKEN 环境变量，则允许所有注册（开发模式）
/// 如果已设置，则请求头 X-Plugin-Token 必须匹配
fn verify_registration_token(headers: &HeaderMap) -> bool {
    let expected_token = match std::env::var("PLUGIN_REGISTRATION_TOKEN") {
        Ok(token) if !token.is_empty() => token,
        _ => {
            // 未配置注册令牌：生产环境拒绝，开发环境允许
            let profile = std::env::var("PROFILE").unwrap_or_default();
            if profile == "prod" || profile == "production" {
                tracing::error!(
                    "[Plugin] PLUGIN_REGISTRATION_TOKEN not set - plugin registration blocked in production"
                );
                return false;
            }
            tracing::warn!(
                "[Plugin] PLUGIN_REGISTRATION_TOKEN not set - allowing all registrations in dev mode"
            );
            return true;
        }
    };

    let provided_token = headers
        .get("X-Plugin-Token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if provided_token == expected_token {
        true
    } else {
        tracing::warn!("[Plugin] Registration rejected: invalid or missing plugin token");
        false
    }
}

/// 注册插件（开发者接口）
pub async fn register_plugin(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<RegisterPluginRequest>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Registering plugin: {}", req.code);

    // 安全验证：检查插件注册令牌
    if !verify_registration_token(&headers) {
        return Json(CoreResponse::error(
            "Registration denied: invalid or missing plugin registration token",
        ));
    }

    // 1. 创建或更新插件记录（含依赖和导航配置）
    let deps_json: serde_json::Value =
        serde_json::to_value(&req.dependencies).unwrap_or(serde_json::json!([]));

    let plugin_result = sqlx::query_as(
        r#"
        INSERT INTO core.core_plugins (code, name, description, version, plugin_type, is_published, dependencies, category)
        VALUES ($1, $2, $3, $4, 'business', true, $5, $6)
        ON CONFLICT (code) DO UPDATE SET
            name = $2, description = $3, version = $4, dependencies = $5, category = $6
        RETURNING *
        "#,
    )
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.version)
    .bind(&deps_json)
    .bind(&req.category)
    .fetch_optional(&state.pool)
    .await;

    let plugin: Plugin = match plugin_result {
        Ok(Some(p)) => p,
        Ok(None) => return Json(CoreResponse::error("Failed to create plugin - no result")),
        Err(e) => {
            tracing::error!("[Plugin] Failed to insert plugin: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to create plugin: {}",
                e
            )));
        }
    };

    // 2. 注册插件权限
    for perm in &req.permissions {
        sqlx::query(
            r#"
            INSERT INTO core.core_plugin_permissions (plugin_code, permission_code, permission_name, resource_type, action)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (plugin_code, permission_code) DO UPDATE SET
                permission_name = $3, resource_type = $4, action = $5
            "#,
        )
        .bind(&req.code)
        .bind(&perm.code)
        .bind(&perm.name)
        .bind(&perm.resource_type)
        .bind(&perm.action)
        .execute(&state.pool)
        .await
        .ok();
    }

    // 3. 创建或更新运行时实例记录
    let base_path = req
        .base_path
        .unwrap_or_else(|| format!("/api/plugins/{}", req.code));
    sqlx::query(
        r#"
        INSERT INTO core.core_plugin_instances (plugin_id, runtime_url, runtime_status, base_path, last_heartbeat)
        VALUES ($1, $2, 'running', $3, NOW())
        ON CONFLICT (plugin_id) DO UPDATE SET
            runtime_url = $2, runtime_status = 'running', base_path = $3, last_heartbeat = NOW()
        "#,
    )
    .bind(plugin.id)
    .bind(&req.runtime_url)
    .bind(&base_path)
    .execute(&state.pool)
    .await
    .ok();

    // 4. 存储导航配置（如果提供了）
    if let Some(nav_config) = &req.navigation_config {
        sqlx::query(
            r#"
            INSERT INTO core.core_plugin_navigation (plugin_code, nav_config)
            VALUES ($1, $2)
            ON CONFLICT (plugin_code) DO UPDATE SET
                nav_config = $2, updated_at = NOW()
            "#,
        )
        .bind(&req.code)
        .bind(nav_config)
        .execute(&state.pool)
        .await
        .ok();
    }

    tracing::info!("[Plugin] Plugin registered successfully: {}", req.code);
    Json(CoreResponse::success(plugin, "Plugin registered"))
}

/// 更新插件运行时状态（心跳）
pub async fn update_plugin_status(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<PluginHeartbeatRequest>,
) -> Json<CoreResponse<()>> {
    tracing::debug!(
        "[Plugin] Updating status for plugin: {}, status: {}",
        plugin_code,
        req.status
    );

    let result = sqlx::query(
        r#"
        UPDATE core.core_plugin_instances
        SET runtime_status = $2, last_heartbeat = NOW()
        WHERE plugin_id = (SELECT id FROM core.core_plugins WHERE code = $1)
        "#,
    )
    .bind(&plugin_code)
    .bind(&req.status)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(CoreResponse::success((), "Plugin status updated")),
        Err(e) => {
            tracing::error!("[Plugin] Failed to update plugin status: {}", e);
            Json(CoreResponse::error("Failed to update plugin status"))
        }
    }
}

/// 获取插件运行时状态
pub async fn get_plugin_status(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<PluginInstance>> {
    tracing::debug!("[Plugin] Getting status for plugin: {}", plugin_code);

    let instance: Option<PluginInstance> = sqlx::query_as(
        r#"
        SELECT pi.* FROM core.core_plugin_instances pi
        JOIN core.core_plugins p ON pi.plugin_id = p.id
        WHERE p.code = $1
        "#,
    )
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match instance {
        Some(i) => Json(CoreResponse::success(i, "Plugin status retrieved")),
        None => Json(CoreResponse::error("Plugin not found")),
    }
}

/// 注销插件
pub async fn unregister_plugin(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<()>> {
    tracing::info!("[Plugin] Unregistering plugin: {}", plugin_code);

    // 更新运行时状态为 stopped
    sqlx::query(
        r#"
        UPDATE core.core_plugin_instances
        SET runtime_status = 'stopped', stopped_at = NOW()
        WHERE plugin_id = (SELECT id FROM core.core_plugins WHERE code = $1)
        "#,
    )
    .bind(&plugin_code)
    .execute(&state.pool)
    .await
    .ok();

    Json(CoreResponse::success((), "Plugin unregistered"))
}

/// 获取插件列表（包含运行时状态）
pub async fn list_plugins_with_status(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<PluginWithRuntimeStatus>>> {
    tracing::info!("[Plugin] Listing plugins with runtime status");

    let plugins: Vec<PluginWithRuntimeStatus> = sqlx::query_as(
        r#"
        SELECT p.id, p.code, p.name, p.description, p.version, p.plugin_type,
               p.is_published, p.category,
               pi.runtime_status, pi.runtime_url, pi.base_path, pi.last_heartbeat
        FROM core.core_plugins p
        LEFT JOIN core_plugin_instances pi ON p.id = pi.plugin_id
        WHERE p.is_published = true
        ORDER BY p.code
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(plugins, "Plugins retrieved"))
}

/// 获取所有已激活插件的导航配置（供前端动态加载菜单）
pub async fn get_navigation_config(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<CoreResponse<serde_json::Value>> {
    tracing::info!(
        "[Plugin] Fetching navigation config for tenant: {:?}",
        claims.tenant_id
    );

    // 仅返回该租户下已安装 + 已激活的插件（仅当 claims.tenant_id 能解析为 UUID）
    // 若无法解析，则回退为所有已发布插件生成默认导航（开发调试友好）
    let tenant_uuid = claims
        .tenant_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok());

    let rows: Vec<(String, String, Option<String>, Option<String>, bool, bool)> =
        if let Some(tid) = tenant_uuid {
            sqlx::query_as(
                r#"
            SELECT p.code, p.name, p.category, p.entry_point,
                   COALESCE(tp.is_active, false) AS is_active,
                   COALESCE(tp.is_active, false) AS is_installed
            FROM core.core_plugins p
            LEFT JOIN core.core_tenant_plugins tp
                   ON tp.plugin_id = p.id AND tp.tenant_id = $1 AND tp.deleted_at IS NULL
            WHERE p.is_published = true
              AND (tp.id IS NOT NULL)
              AND COALESCE(tp.is_active, false) = true
            ORDER BY p.category NULLS LAST, p.code
            "#,
            )
            .bind(tid)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        } else {
            sqlx::query_as(
                r#"
            SELECT p.code, p.name, p.category, p.entry_point,
                   COALESCE(p.is_active, false),
                   COALESCE(p.is_installed, false)
            FROM core.core_plugins p
            WHERE p.is_published = true
            ORDER BY p.category NULLS LAST, p.code
            "#,
            )
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        };

    let mut modules = Vec::new();
    for (code, name, category, entry_point, _is_active, _is_installed) in rows {
        // 为每个插件生成 1~2 个默认导航项：
        //   [0] = 插件首页（Dashboard/概览）
        //   [1] = 设置（可选）
        let path_prefix = entry_point
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| format!("/plugin/{code}"));

        let display_name = if name.trim().is_empty() {
            code.clone()
        } else {
            name.clone()
        };

        let nav_items = serde_json::json!([
            {
                "key": format!("{code}-home"),
                "label": format!("{display_name}首页"),
                "title": display_name,
                "path": path_prefix,
                "icon": "Package",
                "order": 10,
                "children": [
                    {
                        "key": format!("{code}-dashboard"),
                        "label": "概览",
                        "path": format!("{path_prefix}/dashboard"),
                        "order": 10,
                    },
                    {
                        "key": format!("{code}-customers"),
                        "label": if code == "crm" { "客户管理" } else { "业务数据" },
                        "path": if code == "crm" { format!("{path_prefix}/customers") } else { format!("{path_prefix}/data") },
                        "order": 20,
                    },
                ]
            }
        ]);

        modules.push(serde_json::json!({
            "code": code,
            "name": display_name,
            "category": category,
            "group": category.clone().unwrap_or_else(|| "专业模块".to_string()),
            "pathPrefix": path_prefix,
            "navigation": nav_items,
        }));
    }

    Json(CoreResponse::success(
        serde_json::json!({ "modules": modules }),
        "Navigation config retrieved",
    ))
}

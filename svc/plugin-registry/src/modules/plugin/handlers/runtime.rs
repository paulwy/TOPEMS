use axum::Extension;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use topems_shared_auth::Claims;

use super::super::models::*;
use crate::{AppState, CoreResponse};

/// 常量时间比较（P3 修复）：避免 `==` 短路返回带来的令牌逐字节侧信道。
/// 长度差异一并折入 diff，长度不同也输出 false。
fn constant_time_eq(a: &str, b: &str) -> bool {
    let a = a.as_bytes();
    let b = b.as_bytes();
    // 长度不一致即预置差异位，仍遍历较短长度完成字节比较，避免短路侧信道。
    let mut diff: u8 = if a.len() == b.len() { 0 } else { 1 };
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// 验证插件注册令牌（T4 门控修复，CORE-05）
///
/// 门控策略（优先级从高到低）：
/// 1. `PLUGIN_TOKEN_ENFORCE=true|1|yes` 显式强制 → 任意环境均强制校验令牌
/// 2. 未显式指定时按 `PROFILE` 判定：`prod` / `production` 强制
/// 3. 其余（dev / staging / 未设置）默认放行（开发模式）
///
/// 强制模式下：
/// - `PLUGIN_REGISTRATION_TOKEN` 未配置 → 拒绝（防无令牌绕过）
/// - 已配置 → 请求头 `X-Plugin-Token` 必须精确匹配，否则拒绝
fn verify_registration_token(headers: &HeaderMap) -> bool {
    let expected_token = std::env::var("PLUGIN_REGISTRATION_TOKEN")
        .ok()
        .filter(|t| !t.is_empty());

    let enforce = std::env::var("PLUGIN_TOKEN_ENFORCE")
        .ok()
        .map(|v| matches!(v.as_str(), "true" | "1" | "yes"))
        .unwrap_or_else(|| {
            let profile = std::env::var("PROFILE").unwrap_or_default();
            matches!(profile.as_str(), "prod" | "production")
        });

    match (enforce, expected_token) {
        // 非强制：开发模式放行
        (false, _) => {
            tracing::warn!("[Plugin] PLUGIN_TOKEN_ENFORCE 未开启 - 插件注册放行（dev 模式）");
            true
        }
        // 强制但未配置令牌：拒绝（防绕过，不再依赖 PROFILE 精确串）
        (true, None) => {
            tracing::error!(
                "[Plugin] 强制模式但 PLUGIN_REGISTRATION_TOKEN 未配置 - 插件注册被拒绝"
            );
            false
        }
        // 强制且已配置令牌：校验请求头
        (true, Some(token)) => {
            let provided_token = headers
                .get("X-Plugin-Token")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            if constant_time_eq(provided_token, &token) {
                true
            } else {
                tracing::warn!("[Plugin] Registration rejected: invalid or missing plugin token");
                false
            }
        }
    }
}

/// 注册插件（开发者接口）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["plugin-registry:plugin:write"])),
    path = "/api/plugin/runtime/{code}/register",
    params(
("code" = String, Path, description = "code")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
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
    // 插件注册是全局服务级操作（X-Plugin-Token 认证，非租户用户请求）：
    // 在事务内显式设置 nil 租户上下文，满足 core_plugins 表 RLS 的 service 豁免条件
    let deps_json: serde_json::Value =
        serde_json::to_value(&req.dependencies).unwrap_or(serde_json::json!([]));

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[Plugin] Failed to begin txn: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to create plugin: {}",
                e
            )));
        }
    };

    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(uuid::Uuid::nil().to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("[Plugin] Failed to set nil tenant context: {}", e);
        return Json(CoreResponse::error(&format!(
            "Failed to create plugin: {}",
            e
        )));
    }

    let plugin_result = sqlx::query_as(
        r#"
        INSERT INTO core.core_plugins (code, name, description, version, plugin_type, is_published, dependencies, category, tenant_id)
        VALUES ($1, $2, $3, $4, 'business', true, $5, $6, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
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
    .fetch_optional(&mut *txn)
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
        .execute(&mut *txn)
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
    .execute(&mut *txn)
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
        .execute(&mut *txn)
        .await
        .ok();
    }

    if let Err(e) = txn.commit().await {
        tracing::error!("[Plugin] Failed to commit txn: {}", e);
        return Json(CoreResponse::error(&format!(
            "Failed to create plugin: {}",
            e
        )));
    }

    tracing::info!("[Plugin] Plugin registered successfully: {}", req.code);
    Json(CoreResponse::success(plugin, "Plugin registered"))
}

/// 更新插件运行时状态（心跳）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["plugin-registry:plugin:write"])),
    path = "/api/plugin/runtime/{code}/status",
    params(
("code" = String, Path, description = "code")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["plugin-registry:plugin:read"])),
    path = "/api/plugin/runtime/{code}/status",
    params(
("code" = String, Path, description = "code")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["plugin-registry:plugin:write"])),
    path = "/api/plugin/runtime/{code}/unregister",
    params(
("code" = String, Path, description = "code")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["plugin-registry:plugin:read"])),
    path = "/api/plugin/runtime/list",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
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
        LEFT JOIN core.core_plugin_instances pi ON p.id = pi.plugin_id
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["plugin-registry:plugin:read"])),
    path = "/api/plugin/navigation-config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
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

    let use_tenant_filter = !claims.is_superuser && tenant_uuid.is_some();
    let rows: Vec<(String, String, Option<String>, Option<String>, bool, bool)> =
        if use_tenant_filter {
            let tid = tenant_uuid.unwrap();
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

#[cfg(test)]
mod token_gate_tests {
    use super::*;
    use axum::http::HeaderMap;
    use std::sync::Mutex;

    /// env 全局可变，测试间串行化（避免 set_var 并发串扰）
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn reset_env() {
        for k in [
            "PLUGIN_TOKEN_ENFORCE",
            "PLUGIN_REGISTRATION_TOKEN",
            "PROFILE",
        ] {
            std::env::remove_var(k);
        }
    }

    fn headers_with_token(token: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert("X-Plugin-Token", token.parse().unwrap());
        h
    }

    #[test]
    fn enforce_true_without_token_denies() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PLUGIN_TOKEN_ENFORCE", "true");
        assert!(!verify_registration_token(&HeaderMap::new()));
    }

    #[test]
    fn enforce_true_with_matching_token_allows() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PLUGIN_TOKEN_ENFORCE", "true");
        std::env::set_var("PLUGIN_REGISTRATION_TOKEN", "sec-123");
        assert!(verify_registration_token(&headers_with_token("sec-123")));
    }

    #[test]
    fn enforce_true_with_wrong_token_denies() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PLUGIN_TOKEN_ENFORCE", "true");
        std::env::set_var("PLUGIN_REGISTRATION_TOKEN", "sec-123");
        assert!(!verify_registration_token(&headers_with_token("wrong")));
        assert!(!verify_registration_token(&HeaderMap::new()));
    }

    #[test]
    fn dev_default_allows_without_any_env() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        assert!(verify_registration_token(&HeaderMap::new()));
    }

    #[test]
    fn staging_not_enforced_by_default() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PROFILE", "staging");
        assert!(verify_registration_token(&HeaderMap::new()));
    }

    #[test]
    fn prod_default_enforces_without_token() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PROFILE", "prod");
        assert!(!verify_registration_token(&HeaderMap::new()));
    }

    #[test]
    fn prod_default_enforces_with_matching_token() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PROFILE", "prod");
        std::env::set_var("PLUGIN_REGISTRATION_TOKEN", "p-token");
        assert!(verify_registration_token(&headers_with_token("p-token")));
    }

    #[test]
    fn production_alias_also_enforces() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PROFILE", "production");
        assert!(!verify_registration_token(&HeaderMap::new()));
    }

    #[test]
    fn explicit_enforce_overrides_dev_profile() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PROFILE", "staging");
        std::env::set_var("PLUGIN_TOKEN_ENFORCE", "1");
        assert!(!verify_registration_token(&HeaderMap::new()));
    }

    #[test]
    fn enforce_false_disables_even_in_prod() {
        let _g = ENV_LOCK.lock().unwrap();
        reset_env();
        std::env::set_var("PROFILE", "prod");
        std::env::set_var("PLUGIN_TOKEN_ENFORCE", "false");
        assert!(verify_registration_token(&HeaderMap::new()));
    }
}

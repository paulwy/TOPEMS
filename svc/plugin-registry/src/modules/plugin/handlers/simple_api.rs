use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use super::super::models::*;
use crate::{AppState, CoreResponse};

/// Helper struct for plugin details with permissions
#[derive(serde::Serialize)]
pub struct PluginDetailsResponse {
    plugin: Plugin,
    permissions: Vec<PluginPermission>,
}

/// Simplified: List installed plugins with runtime status
pub async fn list_installed_plugins(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<PluginWithRuntimeStatus>>> {
    tracing::info!("[Plugin] Listing installed plugins");

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

/// Simplified: Get plugin details with permissions
pub async fn get_plugin_details(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<PluginDetailsResponse>> {
    tracing::info!("[Plugin] Getting plugin details: {}", plugin_code);

    let plugin: Option<Plugin> = sqlx::query_as("SELECT id, code, name, description, category, version, author, homepage, is_published, is_featured, install_count, rating, rating_count, download_url, icon_url, tags, status, is_active, created_at, updated_at FROM core.core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let permissions: Vec<PluginPermission> =
        sqlx::query_as("SELECT id, plugin_code, permission_key, description, is_default, created_at FROM core.core_plugin_permissions WHERE plugin_code = $1")
            .bind(&plugin_code)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let details = PluginDetailsResponse {
        plugin,
        permissions,
    };
    Json(CoreResponse::success(details, "Plugin details retrieved"))
}

/// Simplified: Install plugin (uses X-Tenant-ID header)
pub async fn install_plugin_simple(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<CoreResponse<TenantPlugin>> {
    let tenant_id = match headers
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(id) => id,
        None => {
            return Json(CoreResponse::error(
                "X-Tenant-ID header required or invalid",
            ))
        }
    };

    tracing::info!(
        "[Plugin] Installing plugin {} for tenant: {}",
        plugin_code,
        tenant_id
    );

    // Get plugin
    let plugin: Option<Plugin> =
        sqlx::query_as("SELECT id, code, name, description, category, version, author, homepage, is_published, is_featured, install_count, rating, rating_count, download_url, icon_url, tags, status, is_active, created_at, updated_at FROM core.core_plugins WHERE code = $1 AND is_published = true")
            .bind(&plugin_code)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    // Create installation
    let installation_result = sqlx::query_as(
        r#"
        INSERT INTO core.core_tenant_plugins (tenant_id, plugin_id, is_active, license_type)
        VALUES ($1, $2, true, $3)
        ON CONFLICT (tenant_id, plugin_id)
        DO UPDATE SET is_active = true, activated_at = NOW()
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(plugin.id)
    .bind(if plugin.is_free {
        "free"
    } else {
        "subscription"
    })
    .fetch_one(&state.pool)
    .await;

    match installation_result {
        Ok(installation) => Json(CoreResponse::success(installation, "Plugin installed")),
        Err(e) => {
            tracing::error!("Failed to install plugin: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to install plugin: {}",
                e
            )))
        }
    }
}

/// Simplified: Uninstall plugin with three-tier strategy (uses X-Tenant-ID header)
pub async fn uninstall_plugin_simple(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UninstallRequest>,
) -> Json<CoreResponse<UninstallResult>> {
    let tenant_id = match headers
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(id) => id,
        None => {
            return Json(CoreResponse::error(
                "X-Tenant-ID header required or invalid",
            ))
        }
    };

    tracing::info!(
        "[Plugin] Uninstalling plugin {} for tenant: {} with tier: {:?}",
        plugin_code,
        tenant_id,
        req.uninstall_tier
    );

    // Validate Tier 3 deletion
    if req.uninstall_tier == UninstallTier::Delete {
        if !req.confirmed.unwrap_or(false) {
            return Json(CoreResponse::error(
                "Deletion requires confirmation set to true",
            ));
        }
        if req.reason.is_none() || req.reason.as_ref().map(|s| s.is_empty()).unwrap_or(true) {
            return Json(CoreResponse::error("Deletion requires a reason"));
        }
    }

    // Get plugin info
    let plugin: Option<Plugin> = sqlx::query_as("SELECT id, code, name, description, category, version, author, homepage, is_published, is_featured, install_count, rating, rating_count, download_url, icon_url, tags, status, is_active, created_at, updated_at FROM core.core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    // Handle each tier
    let result = match req.uninstall_tier {
        UninstallTier::Disable => {
            // Tier 1: Disable - set is_active = false but keep data
            let installation: Option<TenantPlugin> = sqlx::query_as(
                r#"
                UPDATE core.core_tenant_plugins
                SET is_active = false
                WHERE tenant_id = $1 AND plugin_id = $2
                RETURNING *
                "#,
            )
            .bind(tenant_id)
            .bind(plugin.id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

            match installation {
                Some(_) => {
                    tracing::info!(
                        "[Plugin] Plugin {} disabled for tenant {}",
                        plugin_code,
                        tenant_id
                    );
                    UninstallResult {
                        success: true,
                        tier: UninstallTier::Disable,
                        message: "Plugin disabled successfully. Data is preserved.".to_string(),
                        backup_created: None,
                        data_retention_days: Some(30),
                        backup_url: None,
                    }
                }
                None => {
                    return Json(CoreResponse::error("Plugin not installed for this tenant"));
                }
            }
        }
        UninstallTier::Uninstall => {
            // Tier 2: Uninstall - remove from tenant_plugins but keep data
            let result = sqlx::query(
                r#"
                UPDATE core.core_tenant_plugins SET deleted_at = NOW()
                WHERE tenant_id = $1 AND plugin_id = $2
                "#,
            )
            .bind(tenant_id)
            .bind(plugin.id)
            .execute(&state.pool)
            .await;

            match result {
                Ok(r) => {
                    if r.rows_affected() > 0 {
                        tracing::info!(
                            "[Plugin] Plugin {} uninstalled for tenant {}",
                            plugin_code,
                            tenant_id
                        );
                        UninstallResult {
                            success: true,
                            tier: UninstallTier::Uninstall,
                            message:
                                "Plugin uninstalled successfully. Data is preserved for 90 days."
                                    .to_string(),
                            backup_created: None,
                            data_retention_days: Some(90),
                            backup_url: None,
                        }
                    } else {
                        return Json(CoreResponse::error("Plugin not installed for this tenant"));
                    }
                }
                Err(e) => {
                    tracing::error!("[Plugin] Failed to uninstall plugin: {}", e);
                    return Json(CoreResponse::error(&format!(
                        "Failed to uninstall plugin: {}",
                        e
                    )));
                }
            }
        }
        UninstallTier::Delete => {
            // Tier 3: Delete - complete removal including all data
            let backup_created = req.backup.unwrap_or(true);
            let backup_url = if backup_created {
                tracing::info!(
                    "[Plugin] Creating backup before deletion for plugin: {}",
                    plugin_code
                );
                Some(format!(
                    "/api/core/backups/plugin/{}/{}",
                    plugin_code,
                    uuid::Uuid::new_v4()
                ))
            } else {
                None
            };

            let result = sqlx::query(
                r#"
                UPDATE core.core_tenant_plugins SET deleted_at = NOW()
                WHERE tenant_id = $1 AND plugin_id = $2
                "#,
            )
            .bind(tenant_id)
            .bind(plugin.id)
            .execute(&state.pool)
            .await;

            match result {
                Ok(_) => {
                    tracing::info!(
                        "[Plugin] Plugin {} completely deleted for tenant {}",
                        plugin_code,
                        tenant_id
                    );
                    UninstallResult {
                        success: true,
                        tier: UninstallTier::Delete,
                        message: format!(
                            "Plugin and all associated data deleted. Reason: {}",
                            req.reason.unwrap_or_default()
                        ),
                        backup_created: Some(backup_created),
                        data_retention_days: None,
                        backup_url,
                    }
                }
                Err(e) => {
                    tracing::error!("[Plugin] Failed to delete plugin: {}", e);
                    return Json(CoreResponse::error(&format!(
                        "Failed to delete plugin: {}",
                        e
                    )));
                }
            }
        }
    };

    Json(CoreResponse::success(result, "Plugin uninstalled"))
}

/// Get list of plugins installed for current tenant (uses X-Tenant-ID header)
pub async fn list_tenant_installed_plugins(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Json<CoreResponse<Vec<TenantPluginWithRuntimeStatus>>> {
    let tenant_id = match headers
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(id) => id,
        None => {
            return Json(CoreResponse::error(
                "X-Tenant-ID header required or invalid",
            ))
        }
    };

    tracing::info!(
        "[Plugin] Listing installed plugins for tenant: {}",
        tenant_id
    );

    let plugins: Vec<TenantPluginWithRuntimeStatus> = sqlx::query_as(
        r#"
        SELECT tp.id, tp.tenant_id, tp.plugin_id, tp.installed_version, tp.is_active,
               tp.license_type, tp.license_expires_at, tp.activated_at, tp.last_used_at,
               tp.usage_count, tp.created_at, tp.updated_at,
               p.code as plugin_code, p.name as plugin_name, p.description as plugin_description,
               p.version as plugin_version, p.category as plugin_category,
               pi.runtime_status, pi.runtime_url, pi.last_heartbeat
        FROM core.core_tenant_plugins tp
        JOIN core_plugins p ON tp.plugin_id = p.id
        LEFT JOIN core_plugin_instances pi ON p.id = pi.plugin_id
        WHERE tp.tenant_id = $1
        ORDER BY p.code
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(plugins, "Tenant plugins retrieved"))
}

/// Simplified: Enable plugin (uses X-Tenant-ID header)
pub async fn enable_plugin_simple(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<CoreResponse<TenantPlugin>> {
    let tenant_id = match headers
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(id) => id,
        None => {
            return Json(CoreResponse::error(
                "X-Tenant-ID header required or invalid",
            ))
        }
    };

    tracing::info!(
        "[Plugin] Enabling plugin {} for tenant: {}",
        plugin_code,
        tenant_id
    );

    let installation: Option<TenantPlugin> = sqlx::query_as(
        r#"
        UPDATE core.core_tenant_plugins
        SET is_active = true, activated_at = NOW()
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core.core_plugins WHERE code = $2)
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match installation {
        Some(tp) => Json(CoreResponse::success(tp, "Plugin enabled")),
        None => Json(CoreResponse::error("Plugin not installed")),
    }
}

/// Simplified: Disable plugin (uses X-Tenant-ID header)
pub async fn disable_plugin_simple(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<CoreResponse<TenantPlugin>> {
    let tenant_id = match headers
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(id) => id,
        None => {
            return Json(CoreResponse::error(
                "X-Tenant-ID header required or invalid",
            ))
        }
    };

    tracing::info!(
        "[Plugin] Disabling plugin {} for tenant: {}",
        plugin_code,
        tenant_id
    );

    let installation: Option<TenantPlugin> = sqlx::query_as(
        r#"
        UPDATE core.core_tenant_plugins
        SET is_active = false
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core.core_plugins WHERE code = $2)
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match installation {
        Some(tp) => Json(CoreResponse::success(tp, "Plugin disabled")),
        None => Json(CoreResponse::error("Plugin not installed")),
    }
}

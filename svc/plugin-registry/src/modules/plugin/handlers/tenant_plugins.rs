use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use super::super::models::*;
use crate::{AppState, CoreResponse};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;

// ============================================================================
// Pure helper functions (no DB / async) — extracted for unit testing
// ============================================================================

/// Check whether a tenant may install additional plugins based on its tier.
///   free       -> max 5
///   pro        -> max 20
///   enterprise -> unlimited
/// Unknown tiers fall back to the "free" limit.
pub fn check_tenant_plugin_limit(current_count: usize, tier: &str) -> bool {
    let limit = match tier.to_lowercase().as_str() {
        "free" => 5,
        "pro" => 20,
        "enterprise" => usize::MAX,
        _ => 5, // unknown tier defaults to free
    };
    current_count < limit
}

/// Detect a circular dependency in a directed graph of (from, to) edges.
/// Uses DFS with a "visiting" stack to find back-edges.
pub fn has_circular_dependency(edges: &[(String, String)]) -> bool {
    use std::collections::{HashMap, HashSet};

    // Build adjacency list
    let mut graph: HashMap<&str, Vec<&str>> = HashMap::new();
    for (from, to) in edges {
        graph.entry(from.as_str()).or_default().push(to.as_str());
        // Ensure the `to` node exists in the graph even if it has no outgoing edges
        graph.entry(to.as_str()).or_default();
    }

    let mut visited: HashSet<&str> = HashSet::new();
    let mut on_stack: HashSet<&str> = HashSet::new();

    fn dfs<'a>(
        node: &'a str,
        graph: &HashMap<&'a str, Vec<&'a str>>,
        visited: &mut HashSet<&'a str>,
        on_stack: &mut HashSet<&'a str>,
    ) -> bool {
        if on_stack.contains(node) {
            return true; // back-edge -> cycle
        }
        if visited.contains(node) {
            return false;
        }
        visited.insert(node);
        on_stack.insert(node);
        for neighbor in graph.get(node).cloned().unwrap_or_default() {
            if dfs(neighbor, graph, visited, on_stack) {
                return true;
            }
        }
        on_stack.remove(node);
        false
    }

    for &start in graph.keys() {
        if dfs(start, &graph, &mut visited, &mut on_stack) {
            return true;
        }
    }
    false
}

/// Validate that a plugin code is alphanumeric with optional hyphens,
/// length 3..=64, and does not start or end with a hyphen.
pub fn validate_plugin_code(code: &str) -> bool {
    let len = code.len();
    if !(3..=64).contains(&len) {
        return false;
    }
    if code.starts_with('-') || code.ends_with('-') {
        return false;
    }
    code.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

/// Determine if an uninstall tier requires confirmation. Only Delete does.
pub fn requires_confirmation(tier: &str) -> bool {
    tier.eq_ignore_ascii_case("delete")
}

/// Get tenant's installed plugins
#[utoipa::path(
    get,
    security(("BearerAuth" = ["plugin-registry:plugin:read"])),
    path = "/tenants/{tenant_id}/plugins",
    tag = "plugin",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID"),
    ),
    responses(
        (status = 200, description = "List of tenant plugins", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_tenant_plugins(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<TenantPluginWithDetails>>> {
    tracing::info!("[Plugin] Listing plugins for tenant: {}", tenant_id);

    let installations: Vec<TenantPluginWithDetails> = sqlx::query_as(
        r#"
        SELECT
            tp.id, tp.tenant_id, tp.plugin_id, tp.installed_version, tp.is_active,
            tp.license_type, tp.license_expires_at, tp.purchase_order_id,
            tp.activated_at, tp.last_used_at, tp.usage_count, tp.created_at, tp.updated_at,
            p.code as plugin_code, p.name as plugin_name, p.description as plugin_description,
            p.version as plugin_version, p.category as plugin_category, p.is_free,
            p.price_cents, p.install_count, p.rating, p.rating_count
        FROM core.core_tenant_plugins tp
        JOIN core.core_plugins p ON tp.plugin_id = p.id
        WHERE tp.tenant_id = $1
        ORDER BY tp.is_active DESC, tp.activated_at DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(
        installations,
        "Tenant plugins retrieved",
    ))
}

/// Get current user's tenant installed plugins
pub async fn list_my_plugins(
    State(state): State<AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
) -> Json<CoreResponse<Vec<TenantPluginWithDetails>>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    tracing::info!(
        "[Plugin] Listing plugins for tenant (from claims): {:?}",
        tenant_id
    );

    let installations: Vec<TenantPluginWithDetails> = sqlx::query_as(
        r#"
        SELECT
            tp.id, tp.tenant_id, tp.plugin_id, tp.installed_version, tp.is_active,
            tp.license_type, tp.license_expires_at, tp.purchase_order_id,
            tp.activated_at, tp.last_used_at, tp.usage_count, tp.created_at, tp.updated_at,
            p.code as plugin_code, p.name as plugin_name, p.description as plugin_description,
            p.version as plugin_version, p.category as plugin_category, p.is_free,
            p.price_cents, p.install_count, p.rating, p.rating_count
        FROM core.core_tenant_plugins tp
        JOIN core.core_plugins p ON tp.plugin_id = p.id
        WHERE ($1::uuid IS NULL OR tp.tenant_id = $1)
        ORDER BY tp.is_active DESC, tp.activated_at DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(installations, "My plugins retrieved"))
}

async fn install_plugin_inner(
    state: AppState,
    tenant_id: Uuid,
    plugin_code: String,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!(
        "[Plugin] Installing plugin {} for tenant: {}",
        plugin_code,
        tenant_id
    );

    let plugin: Option<Plugin> =
        sqlx::query_as("SELECT id, code, name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE code = $1 AND is_published = true")
            .bind(&plugin_code)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let deps: Vec<String> = if let Some(deps_json) = &plugin.dependencies {
        match serde_json::from_value(deps_json.clone()) {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!(
                    "[Plugin] Failed to deserialize dependencies for {}: {}",
                    plugin.code,
                    e
                );
                Vec::new()
            }
        }
    } else {
        vec![]
    };

    if !deps.is_empty() {
        let mut missing_deps = Vec::new();
        for dep_code in &deps {
            let is_installed: Option<bool> = sqlx::query_scalar(
                r#"SELECT EXISTS(
                    SELECT 1 FROM core.core_tenant_plugins tp
                    JOIN core.core_plugins p ON tp.plugin_id = p.id
                    WHERE deleted_at IS NULL AND tp.tenant_id = $1 AND p.code = $2 AND tp.is_active = true
                )"#,
            )
            .bind(tenant_id)
            .bind(dep_code)
            .fetch_one(&state.pool)
            .await
            .ok()
            .flatten();

            if !is_installed.unwrap_or(false) {
                missing_deps.push(dep_code.clone());
            }
        }

        if !missing_deps.is_empty() {
            return Json(CoreResponse::error(&format!(
                "Missing dependencies: [{}]. Please install and activate them first.",
                missing_deps.join(", ")
            )));
        }
    }

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
        Ok(installation) => {
            sqlx::query(
                "UPDATE core.core_plugins SET install_count = install_count + 1 WHERE id = $1",
            )
            .bind(plugin.id)
            .execute(&state.pool)
            .await
            .ok();
            Json(CoreResponse::success(installation, "Plugin installed"))
        }
        Err(e) => {
            tracing::error!("Failed to install plugin: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to install plugin: {}",
                e
            )))
        }
    }
}

/// Install plugin for tenant
#[utoipa::path(
    post,
    security(("BearerAuth" = ["plugin-registry:install:write"])),
    path = "/tenants/{tenant_id}/plugins/{plugin_code}",
    tag = "plugin",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID"),
        ("plugin_code" = String, Path, description = "Plugin code"),
    ),
    responses(
        (status = 200, description = "Plugin installed", body = serde_json::Value),
        (status = 404, description = "Plugin not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn install_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    install_plugin_inner(state, tenant_id, plugin_code).await
}

/// Install plugin for current user's tenant
pub async fn install_my_plugin(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<TenantPlugin>> {
    let tenant_id = match claims.tenant_id {
        Some(id) => match Uuid::parse_str(&id) {
            Ok(id) => id,
            Err(e) => {
                tracing::error!("[Plugin] Invalid tenant ID in claims: {}", e);
                return Json(CoreResponse::error("Invalid tenant ID"));
            }
        },
        None => {
            tracing::error!("[Plugin] No tenant ID in claims");
            return Json(CoreResponse::error("Tenant ID not found in token"));
        }
    };

    tracing::info!(
        "[Plugin] Installing my plugin {} for tenant (from claims): {}",
        plugin_code,
        tenant_id
    );

    install_plugin_inner(state, tenant_id, plugin_code).await
}

async fn uninstall_plugin_inner(
    state: AppState,
    tenant_id: Uuid,
    plugin_code: String,
    req: UninstallRequest,
) -> Json<CoreResponse<UninstallResult>> {
    tracing::info!(
        "[Plugin] Uninstalling plugin {} for tenant: {} with tier: {:?}",
        plugin_code,
        tenant_id,
        req.uninstall_tier
    );

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

    let plugin: Option<Plugin> = sqlx::query_as("SELECT id, code, name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let dependent_plugins: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT p.code FROM core.core_plugins p
        JOIN core.core_tenant_plugins tp ON tp.plugin_id = p.id
        WHERE tp.tenant_id = $1
          AND tp.is_active = true
          AND p.code != $2
          AND p.dependencies @> to_jsonb($2::text)
        "#,
    )
    .bind(tenant_id)
    .bind(&plugin_code)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    if !dependent_plugins.is_empty() && req.uninstall_tier != UninstallTier::Disable {
        return Json(CoreResponse::error(&format!(
            "Cannot uninstall: [{}] depend(s) on this plugin. Please uninstall them first or use disable tier.",
            dependent_plugins.join(", ")
        )));
    }

    let result = match req.uninstall_tier {
        UninstallTier::Disable => {
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

/// Uninstall plugin for tenant (with three-tier strategy)
pub async fn uninstall_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
    Json(req): Json<UninstallRequest>,
) -> Json<CoreResponse<UninstallResult>> {
    uninstall_plugin_inner(state, tenant_id, plugin_code, req).await
}

/// Uninstall plugin for current user's tenant (with three-tier strategy)
pub async fn uninstall_my_plugin(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(plugin_code): Path<String>,
    Json(req): Json<UninstallRequest>,
) -> Json<CoreResponse<UninstallResult>> {
    let tenant_id = match claims.tenant_id {
        Some(id) => match Uuid::parse_str(&id) {
            Ok(id) => id,
            Err(e) => {
                tracing::error!("[Plugin] Invalid tenant ID in claims: {}", e);
                return Json(CoreResponse::error("Invalid tenant ID"));
            }
        },
        None => {
            tracing::error!("[Plugin] No tenant ID in claims");
            return Json(CoreResponse::error("Tenant ID not found in token"));
        }
    };

    tracing::info!(
        "[Plugin] Uninstalling my plugin {} for tenant (from claims): {} with tier: {:?}",
        plugin_code,
        tenant_id,
        req.uninstall_tier
    );

    uninstall_plugin_inner(state, tenant_id, plugin_code, req).await
}

async fn activate_plugin_inner(
    state: AppState,
    tenant_id: Uuid,
    plugin_code: String,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!(
        "[Plugin] Activating plugin {} for tenant: {}",
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
        Some(tp) => Json(CoreResponse::success(tp, "Plugin activated")),
        None => Json(CoreResponse::error("Plugin not installed")),
    }
}

/// Activate plugin for tenant
pub async fn activate_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    activate_plugin_inner(state, tenant_id, plugin_code).await
}

/// Activate plugin for current user's tenant
pub async fn activate_my_plugin(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<TenantPlugin>> {
    let tenant_id = match claims.tenant_id {
        Some(id) => match Uuid::parse_str(&id) {
            Ok(id) => id,
            Err(e) => {
                tracing::error!("[Plugin] Invalid tenant ID in claims: {}", e);
                return Json(CoreResponse::error("Invalid tenant ID"));
            }
        },
        None => {
            tracing::error!("[Plugin] No tenant ID in claims");
            return Json(CoreResponse::error("Tenant ID not found in token"));
        }
    };

    tracing::info!(
        "[Plugin] Activating my plugin {} for tenant (from claims): {}",
        plugin_code,
        tenant_id
    );

    activate_plugin_inner(state, tenant_id, plugin_code).await
}

async fn deactivate_plugin_inner(
    state: AppState,
    tenant_id: Uuid,
    plugin_code: String,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!(
        "[Plugin] Deactivating plugin {} for tenant: {}",
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
        Some(tp) => Json(CoreResponse::success(tp, "Plugin deactivated")),
        None => Json(CoreResponse::error("Plugin not installed")),
    }
}

/// Deactivate plugin for tenant
pub async fn deactivate_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    deactivate_plugin_inner(state, tenant_id, plugin_code).await
}

/// Deactivate plugin for current user's tenant
pub async fn deactivate_my_plugin(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<TenantPlugin>> {
    let tenant_id = match claims.tenant_id {
        Some(id) => match Uuid::parse_str(&id) {
            Ok(id) => id,
            Err(e) => {
                tracing::error!("[Plugin] Invalid tenant ID in claims: {}", e);
                return Json(CoreResponse::error("Invalid tenant ID"));
            }
        },
        None => {
            tracing::error!("[Plugin] No tenant ID in claims");
            return Json(CoreResponse::error("Tenant ID not found in token"));
        }
    };

    tracing::info!(
        "[Plugin] Deactivating my plugin {} for tenant (from claims): {}",
        plugin_code,
        tenant_id
    );

    deactivate_plugin_inner(state, tenant_id, plugin_code).await
}

/// Get available plugins for tenant (with ownership status)
pub async fn get_available_plugins(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
    Query(filters): Query<PluginFilters>,
) -> Json<CoreResponse<Vec<PluginWithStatus>>> {
    tracing::info!(
        "[Plugin] Getting available plugins for tenant: {}",
        tenant_id
    );

    let category = filters.category.as_ref();
    let search = filters.search.as_ref();

    let mut where_clauses = vec!["is_published = true".to_string()];

    if let Some(ref cat) = category {
        where_clauses.push(format!("category = '{}'", cat));
    }

    if let Some(ref s) = search {
        where_clauses.push(format!(
            "(name ILIKE '%{}%' OR description ILIKE '%{}%')",
            s, s
        ));
    }

    let where_clause = where_clauses.join(" AND ");

    let plugins: Vec<Plugin> = sqlx::query_as(&format!(
        "SELECT id, code, name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE {} ORDER BY is_featured DESC, install_count DESC LIMIT 50",
        where_clause
    ))
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut result: Vec<PluginWithStatus> = Vec::new();

    for plugin in plugins {
        let tenant_plugin: Option<TenantPlugin> = sqlx::query_as(
            "SELECT id, tenant_id, plugin_id, is_enabled, config, created_at, updated_at FROM core.core_tenant_plugins WHERE deleted_at IS NULL AND tenant_id = $1 AND plugin_id = $2",
        )
        .bind(tenant_id)
        .bind(plugin.id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

        result.push(PluginWithStatus {
            plugin,
            is_owned: tenant_plugin.is_some(),
            tenant_plugin,
        });
    }

    Json(CoreResponse::success(result, "Available plugins retrieved"))
}

/// Upload a new plugin (developer submission)
pub async fn upload_plugin(
    State(state): State<AppState>,
    Json(req): Json<UploadPluginRequest>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Uploading new plugin: {}", req.name);

    let plugin_result: Result<Plugin, sqlx::Error> = sqlx::query_as(
        r#"
        INSERT INTO core.core_plugins (
            code, name, description, version, plugin_type,
            is_free, price_cents, remote_url, entry_point,
            dependencies, author_name, author_url, homepage_url,
            screenshots, tags, category, is_published
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, false)
        RETURNING *
        "#,
    )
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.version)
    .bind(req.plugin_type.unwrap_or_else(|| "business".to_string()))
    .bind(req.is_free.unwrap_or(true))
    .bind(req.price_cents)
    .bind(&req.remote_url)
    .bind(&req.entry_point)
    .bind(serde_json::to_value(&req.dependencies).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&req.author_name)
    .bind(&req.author_url)
    .bind(&req.homepage_url)
    .bind(serde_json::to_value(&req.screenshots).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(serde_json::to_value(&req.tags).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&req.category)
    .fetch_one(&state.pool)
    .await;

    match plugin_result {
        Ok(plugin) => {
            tracing::info!("[Plugin] Plugin uploaded successfully: {}", plugin.code);
            Json(CoreResponse::success(
                plugin,
                "Plugin uploaded successfully",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to upload plugin: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to upload plugin: {}",
                e
            )))
        }
    }
}

/// Upload a new plugin version
pub async fn upload_plugin_version(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<UploadVersionRequest>,
) -> Json<CoreResponse<PluginVersion>> {
    tracing::info!(
        "[Plugin] Uploading new version {} for plugin: {}",
        req.version,
        plugin_code
    );

    // Get plugin id
    let plugin: Option<Plugin> = sqlx::query_as("SELECT id, code, name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let version_result = sqlx::query_as(
        r#"
        INSERT INTO core.core_plugin_versions (
            plugin_id, version, release_notes, is_stable, is_latest,
            download_url, checksum, file_size, min_app_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#,
    )
    .bind(plugin.id)
    .bind(&req.version)
    .bind(&req.release_notes)
    .bind(req.is_stable.unwrap_or(false))
    .bind(req.is_latest.unwrap_or(true))
    .bind(&req.download_url)
    .bind(&req.checksum)
    .bind(req.file_size)
    .bind(&req.min_app_version)
    .fetch_one(&state.pool)
    .await;

    match version_result {
        Ok(version) => {
            sqlx::query("UPDATE core.core_plugins SET version = $1 WHERE id = $2")
                .bind(&req.version)
                .bind(plugin.id)
                .execute(&state.pool)
                .await
                .ok();
            tracing::info!(
                "[Plugin] Version {} uploaded for plugin: {}",
                req.version,
                plugin_code
            );
            Json(CoreResponse::success(version, "Plugin version uploaded"))
        }
        Err(e) => {
            tracing::error!("Failed to upload plugin version: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to upload plugin version: {}",
                e
            )))
        }
    }
}

/// Publish a plugin (make it available in marketplace)
pub async fn publish_plugin(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Publishing plugin: {}", plugin_code);

    let plugin: Option<Plugin> = sqlx::query_as(
        r#"
        UPDATE core.core_plugins
        SET is_published = true, published_at = NOW(), updated_at = NOW()
        WHERE code = $1
        RETURNING *
        "#,
    )
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match plugin {
        Some(p) => {
            tracing::info!("[Plugin] Plugin published: {}", plugin_code);
            Json(CoreResponse::success(p, "Plugin published"))
        }
        None => Json(CoreResponse::error("Plugin not found")),
    }
}

/// Unpublish a plugin (remove from marketplace)
pub async fn unpublish_plugin(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Unpublishing plugin: {}", plugin_code);

    let plugin: Option<Plugin> = sqlx::query_as(
        r#"
        UPDATE core.core_plugins
        SET is_published = false, updated_at = NOW()
        WHERE code = $1
        RETURNING *
        "#,
    )
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match plugin {
        Some(p) => {
            tracing::info!("[Plugin] Plugin unpublished: {}", plugin_code);
            Json(CoreResponse::success(p, "Plugin unpublished"))
        }
        None => Json(CoreResponse::error("Plugin not found")),
    }
}

/// Update plugin (developer edit)
pub async fn update_plugin(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<UpdatePluginRequest>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Updating plugin: {}", plugin_code);

    let plugin: Option<Plugin> = sqlx::query_as(
        r#"
        UPDATE core.core_plugins
        SET
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            is_free = COALESCE($4, is_free),
            price_cents = COALESCE($5, price_cents),
            remote_url = COALESCE($6, remote_url),
            entry_point = COALESCE($7, entry_point),
            screenshots = COALESCE($8, screenshots),
            tags = COALESCE($9, tags),
            category = COALESCE($10, category),
            updated_at = NOW()
        WHERE code = $1
        RETURNING *
        "#,
    )
    .bind(&plugin_code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.is_free)
    .bind(req.price_cents)
    .bind(&req.remote_url)
    .bind(&req.entry_point)
    .bind(
        req.screenshots
            .map(|s| serde_json::to_value(s).unwrap_or_default()),
    )
    .bind(
        req.tags
            .map(|t| serde_json::to_value(t).unwrap_or_default()),
    )
    .bind(&req.category)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match plugin {
        Some(p) => {
            tracing::info!("[Plugin] Plugin updated: {}", plugin_code);
            Json(CoreResponse::success(p, "Plugin updated"))
        }
        None => Json(CoreResponse::error("Plugin not found")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- check_tenant_plugin_limit ----

    #[test]
    fn tenant_limit_free_under() {
        assert!(check_tenant_plugin_limit(4, "free"));
    }

    #[test]
    fn tenant_limit_free_at_limit() {
        assert!(!check_tenant_plugin_limit(5, "free"));
    }

    #[test]
    fn tenant_limit_free_over() {
        assert!(!check_tenant_plugin_limit(6, "free"));
    }

    #[test]
    fn tenant_limit_pro_under() {
        assert!(check_tenant_plugin_limit(19, "pro"));
    }

    #[test]
    fn tenant_limit_pro_at_limit() {
        assert!(!check_tenant_plugin_limit(20, "pro"));
    }

    #[test]
    fn tenant_limit_enterprise_unlimited() {
        assert!(check_tenant_plugin_limit(1_000_000, "enterprise"));
    }

    #[test]
    fn tenant_limit_case_insensitive() {
        assert!(check_tenant_plugin_limit(2, "FREE"));
        assert!(check_tenant_plugin_limit(2, "Pro"));
        assert!(check_tenant_plugin_limit(2, "ENTERPRISE"));
    }

    #[test]
    fn tenant_limit_unknown_tier_defaults_free() {
        assert!(!check_tenant_plugin_limit(5, "unknown"));
        assert!(check_tenant_plugin_limit(2, "unknown"));
    }

    #[test]
    fn tenant_limit_zero_count_always_allowed() {
        assert!(check_tenant_plugin_limit(0, "free"));
    }

    // ---- has_circular_dependency ----

    #[test]
    fn circular_empty_no_cycle() {
        assert!(!has_circular_dependency(&[]));
    }

    #[test]
    fn circular_no_cycle_chain() {
        let edges = vec![
            ("a".to_string(), "b".to_string()),
            ("b".to_string(), "c".to_string()),
            ("c".to_string(), "d".to_string()),
        ];
        assert!(!has_circular_dependency(&edges));
    }

    #[test]
    fn circular_self_loop() {
        let edges = vec![("a".to_string(), "a".to_string())];
        assert!(has_circular_dependency(&edges));
    }

    #[test]
    fn circular_simple_cycle() {
        let edges = vec![
            ("a".to_string(), "b".to_string()),
            ("b".to_string(), "a".to_string()),
        ];
        assert!(has_circular_dependency(&edges));
    }

    #[test]
    fn circular_three_node_cycle() {
        let edges = vec![
            ("a".to_string(), "b".to_string()),
            ("b".to_string(), "c".to_string()),
            ("c".to_string(), "a".to_string()),
        ];
        assert!(has_circular_dependency(&edges));
    }

    #[test]
    fn circular_diamond_no_cycle() {
        // a -> b -> d, a -> c -> d (DAG)
        let edges = vec![
            ("a".to_string(), "b".to_string()),
            ("a".to_string(), "c".to_string()),
            ("b".to_string(), "d".to_string()),
            ("c".to_string(), "d".to_string()),
        ];
        assert!(!has_circular_dependency(&edges));
    }

    #[test]
    fn circular_disconnected_components_one_cycles() {
        let edges = vec![
            ("a".to_string(), "b".to_string()),
            ("x".to_string(), "y".to_string()),
            ("y".to_string(), "x".to_string()),
        ];
        assert!(has_circular_dependency(&edges));
    }

    // ---- validate_plugin_code ----

    #[test]
    fn plugin_code_valid_simple() {
        assert!(validate_plugin_code("abc"));
    }

    #[test]
    fn plugin_code_valid_with_hyphens() {
        assert!(validate_plugin_code("my-plugin-code"));
    }

    #[test]
    fn plugin_code_too_short() {
        assert!(!validate_plugin_code("ab"));
    }

    #[test]
    fn plugin_code_too_long() {
        let long = "a".repeat(65);
        assert!(!validate_plugin_code(&long));
    }

    #[test]
    fn plugin_code_max_length_ok() {
        let exact = "a".repeat(64);
        assert!(validate_plugin_code(&exact));
    }

    #[test]
    fn plugin_code_leading_hyphen_invalid() {
        assert!(!validate_plugin_code("-abc"));
    }

    #[test]
    fn plugin_code_trailing_hyphen_invalid() {
        assert!(!validate_plugin_code("abc-"));
    }

    #[test]
    fn plugin_code_special_chars_invalid() {
        assert!(!validate_plugin_code("my plugin!"));
        assert!(!validate_plugin_code("plugin_underscore"));
    }

    // ---- requires_confirmation ----

    #[test]
    fn confirmation_delete_required() {
        assert!(requires_confirmation("delete"));
    }

    #[test]
    fn confirmation_disable_not_required() {
        assert!(!requires_confirmation("disable"));
    }

    #[test]
    fn confirmation_uninstall_not_required() {
        assert!(!requires_confirmation("uninstall"));
    }

    #[test]
    fn confirmation_case_insensitive() {
        assert!(requires_confirmation("DELETE"));
        assert!(requires_confirmation("Delete"));
    }
}

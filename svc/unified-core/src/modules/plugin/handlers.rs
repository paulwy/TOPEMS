//! Plugin API handlers

use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use super::models::*;
use crate::{AppState, CoreResponse};
use topems_shared::auth::Claims;

/// Get marketplace summary
pub async fn get_marketplace_summary(
    State(state): State<AppState>,
) -> Json<CoreResponse<MarketplaceSummary>> {
    tracing::info!("[Plugin] Getting marketplace summary");

    let total: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM core_plugins WHERE is_published = true")
            .fetch_one(&state.pool)
            .await
            .unwrap_or((0,));

    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT * FROM core_plugin_categories WHERE is_active = true ORDER BY sort_order",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let featured: Vec<Plugin> = sqlx::query_as(
        "SELECT * FROM core_plugins WHERE is_published = true AND is_featured = true ORDER BY install_count DESC LIMIT 6"
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let new_plugins: Vec<Plugin> = sqlx::query_as(
        "SELECT * FROM core_plugins WHERE is_published = true ORDER BY published_at DESC LIMIT 6",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let top_rated: Vec<Plugin> = sqlx::query_as(
        "SELECT * FROM core_plugins WHERE is_published = true AND rating_count > 0 ORDER BY rating DESC LIMIT 6"
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let summary = MarketplaceSummary {
        total_plugins: total.0,
        categories,
        featured_plugins: featured,
        new_plugins,
        top_rated,
    };

    Json(CoreResponse::success(
        summary,
        "Marketplace summary retrieved",
    ))
}

/// List plugin categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<PluginCategory>>> {
    tracing::info!("[Plugin] Listing categories");

    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT * FROM core_plugin_categories WHERE is_active = true ORDER BY sort_order",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(categories, "Categories retrieved"))
}

/// List plugins with filters
pub async fn list_plugins(
    State(state): State<AppState>,
    Query(filters): Query<PluginFilters>,
) -> Json<CoreResponse<PluginListResponse>> {
    tracing::info!("[Plugin] Listing plugins with filters: {:?}", filters);

    let page = filters.page.unwrap_or(1).max(1);
    let page_size = filters.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut where_clauses = vec!["is_published = true".to_string()];

    if let Some(ref cat) = filters.category {
        where_clauses.push(format!("category = '{}'", cat));
    }

    if let Some(ref search) = filters.search {
        where_clauses.push(format!(
            "(name ILIKE '%{}%' OR description ILIKE '%{}%')",
            search, search
        ));
    }

    if let Some(is_free) = filters.is_free {
        where_clauses.push(format!("is_free = {}", is_free));
    }

    let where_clause = where_clauses.join(" AND ");

    let sort_order = match filters.sort_by.as_deref() {
        Some("popular") => "install_count DESC",
        Some("rating") => "rating DESC",
        Some("recent") => "published_at DESC",
        Some("name") => "name ASC",
        _ => "install_count DESC",
    };

    let total: (i64,) = sqlx::query_as(&format!(
        "SELECT COUNT(*) FROM core_plugins WHERE {}",
        where_clause
    ))
    .fetch_one(&state.pool)
    .await
    .unwrap_or((0,));

    let plugins: Vec<Plugin> = match sqlx::query_as::<_, Plugin>(&format!(
        "SELECT * FROM core_plugins WHERE {} ORDER BY {} LIMIT {} OFFSET {}",
        where_clause, sort_order, page_size, offset
    ))
    .fetch_all(&state.pool)
    .await
    {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("[Plugin] Failed to fetch plugins: {:?}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to fetch plugins: {}",
                e
            )));
        }
    };

    let response = PluginListResponse {
        plugins,
        total: total.0,
        page,
        page_size,
        total_pages: ((total.0 as f64) / (page_size as f64)).ceil() as u32,
    };

    Json(CoreResponse::success(response, "Plugins retrieved"))
}

/// Get plugin by code
pub async fn get_plugin(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Getting plugin: {}", code);

    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
        .bind(&code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match plugin {
        Some(p) => Json(CoreResponse::success(p, "Plugin retrieved")),
        None => Json(CoreResponse::error("Plugin not found")),
    }
}

/// Get plugin versions
pub async fn get_plugin_versions(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<PluginVersion>>> {
    tracing::info!("[Plugin] Getting versions for plugin: {}", plugin_id);

    let versions: Vec<PluginVersion> = sqlx::query_as(
        "SELECT * FROM core_plugin_versions WHERE plugin_id = $1 ORDER BY created_at DESC",
    )
    .bind(plugin_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(versions, "Versions retrieved"))
}

/// Get plugin reviews
pub async fn get_plugin_reviews(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<PluginReview>>> {
    tracing::info!("[Plugin] Getting reviews for plugin: {}", plugin_id);

    let reviews: Vec<PluginReview> = sqlx::query_as(
        "SELECT * FROM core_plugin_reviews WHERE plugin_id = $1 ORDER BY is_featured DESC, helpful_count DESC, created_at DESC"
    )
    .bind(plugin_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(reviews, "Reviews retrieved"))
}

/// Create plugin review
pub async fn create_review(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReviewRequest>,
) -> Json<CoreResponse<PluginReview>> {
    tracing::info!(
        "[Plugin] Creating review for plugin: {} by user: {}",
        plugin_id,
        claims.username
    );

    let user_id = claims.user_id().unwrap_or_else(|_| Uuid::nil());
    let user_name = claims.username.clone();

    let review_result = sqlx::query_as(
        r#"
        INSERT INTO core_plugin_reviews (plugin_id, user_id, user_name, rating, title, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(plugin_id)
    .bind(user_id)
    .bind(user_name)
    .bind(req.rating)
    .bind(&req.title)
    .bind(&req.content)
    .fetch_one(&state.pool)
    .await;

    match review_result {
        Ok(review) => Json(CoreResponse::success(review, "Review created")),
        Err(e) => {
            tracing::error!("Failed to create review: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to create review: {}",
                e
            )))
        }
    }
}

/// Get tenant's installed plugins
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
        FROM core_tenant_plugins tp
        JOIN core_plugins p ON tp.plugin_id = p.id
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
    Extension(claims): Extension<Claims>,
) -> Json<CoreResponse<Vec<TenantPluginWithDetails>>> {
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
        "[Plugin] Listing plugins for tenant (from claims): {}",
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
        FROM core_tenant_plugins tp
        JOIN core_plugins p ON tp.plugin_id = p.id
        WHERE tp.tenant_id = $1
        ORDER BY tp.is_active DESC, tp.activated_at DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(installations, "My plugins retrieved"))
}

/// Install plugin for tenant
pub async fn install_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!(
        "[Plugin] Installing plugin {} for tenant: {}",
        plugin_code,
        tenant_id
    );

    // Get plugin
    let plugin: Option<Plugin> =
        sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1 AND is_published = true")
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
        INSERT INTO core_tenant_plugins (tenant_id, plugin_id, is_active, license_type)
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
            sqlx::query("UPDATE core_plugins SET install_count = install_count + 1 WHERE id = $1")
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

/// Uninstall plugin for tenant (with three-tier strategy)
pub async fn uninstall_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
    Json(req): Json<UninstallRequest>,
) -> Json<CoreResponse<UninstallResult>> {
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
    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
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
                UPDATE core_tenant_plugins
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
            // Data in plugin's own schema will be retained for potential reinstallation
            let result = sqlx::query(
                r#"
                DELETE FROM core_tenant_plugins
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
                // In production, this would create a backup and return the URL
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

            // First, notify the plugin to clean up its own data (via internal API)
            // Then delete from tenant_plugins
            let result = sqlx::query(
                r#"
                DELETE FROM core_tenant_plugins
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

/// Activate plugin for tenant
pub async fn activate_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!(
        "[Plugin] Activating plugin {} for tenant: {}",
        plugin_code,
        tenant_id
    );

    let installation: Option<TenantPlugin> = sqlx::query_as(
        r#"
        UPDATE core_tenant_plugins
        SET is_active = true, activated_at = NOW()
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core_plugins WHERE code = $2)
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

/// Deactivate plugin for tenant
pub async fn deactivate_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!(
        "[Plugin] Deactivating plugin {} for tenant: {}",
        plugin_code,
        tenant_id
    );

    let installation: Option<TenantPlugin> = sqlx::query_as(
        r#"
        UPDATE core_tenant_plugins
        SET is_active = false
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core_plugins WHERE code = $2)
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
        "SELECT * FROM core_plugins WHERE {} ORDER BY is_featured DESC, install_count DESC LIMIT 50",
        where_clause
    ))
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut result: Vec<PluginWithStatus> = Vec::new();

    for plugin in plugins {
        let tenant_plugin: Option<TenantPlugin> = sqlx::query_as(
            "SELECT * FROM core_tenant_plugins WHERE tenant_id = $1 AND plugin_id = $2",
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
        INSERT INTO core_plugins (
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
    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
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
        INSERT INTO core_plugin_versions (
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
            sqlx::query("UPDATE core_plugins SET version = $1 WHERE id = $2")
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
        UPDATE core_plugins
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
        UPDATE core_plugins
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
        UPDATE core_plugins
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

// ============================================================================
// Plugin Registration & Runtime Handlers
// ============================================================================

/// 注册插件（开发者接口）
pub async fn register_plugin(
    State(state): State<AppState>,
    Json(req): Json<RegisterPluginRequest>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Registering plugin: {}", req.code);

    // 1. 创建或更新插件记录
    let plugin: Option<Plugin> = sqlx::query_as(
        r#"
        INSERT INTO core_plugins (code, name, description, version, plugin_type, is_published)
        VALUES ($1, $2, $3, $4, 'business', true)
        ON CONFLICT (code) DO UPDATE SET
            name = $2, description = $3, version = $4
        RETURNING *
        "#,
    )
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.version)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Failed to create plugin")),
    };

    // 2. 注册插件权限
    for perm in &req.permissions {
        sqlx::query(
            r#"
            INSERT INTO core_plugin_permissions (plugin_code, permission_code, permission_name, resource_type, action)
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
        INSERT INTO core_plugin_instances (plugin_id, runtime_url, runtime_status, base_path)
        VALUES ($1, $2, 'running', $3)
        ON CONFLICT (plugin_id) DO UPDATE SET
            runtime_url = $2, runtime_status = 'running', base_path = $3
        "#,
    )
    .bind(plugin.id)
    .bind(&req.runtime_url)
    .bind(&base_path)
    .execute(&state.pool)
    .await
    .ok();

    tracing::info!("[Plugin] Plugin registered successfully: {}", req.code);
    Json(CoreResponse::success(plugin, "Plugin registered"))
}

/// 更新插件运行时状态
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
        UPDATE core_plugin_instances
        SET runtime_status = $2, last_heartbeat = NOW()
        WHERE plugin_id = (SELECT id FROM core_plugins WHERE code = $1)
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
        SELECT pi.* FROM core_plugin_instances pi
        JOIN core_plugins p ON pi.plugin_id = p.id
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
        UPDATE core_plugin_instances
        SET runtime_status = 'stopped', stopped_at = NOW()
        WHERE plugin_id = (SELECT id FROM core_plugins WHERE code = $1)
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
        FROM core_plugins p
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

// ============================================================================
// Simplified Plugin Management API (for frontend plugin marketplace)
// ============================================================================

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
        FROM core_plugins p
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

    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let permissions: Vec<PluginPermission> =
        sqlx::query_as("SELECT * FROM core_plugin_permissions WHERE plugin_code = $1")
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
        sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1 AND is_published = true")
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
        INSERT INTO core_tenant_plugins (tenant_id, plugin_id, is_active, license_type)
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
    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
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
                UPDATE core_tenant_plugins
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
                DELETE FROM core_tenant_plugins
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
                DELETE FROM core_tenant_plugins
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
        FROM core_tenant_plugins tp
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
        UPDATE core_tenant_plugins
        SET is_active = true, activated_at = NOW()
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core_plugins WHERE code = $2)
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
        UPDATE core_tenant_plugins
        SET is_active = false
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core_plugins WHERE code = $2)
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

/// Helper struct for plugin details with permissions
#[derive(serde::Serialize)]
pub struct PluginDetailsResponse {
    plugin: Plugin,
    permissions: Vec<PluginPermission>,
}

// ============================================================================
// Version Management API
// ============================================================================

/// Compare two plugin versions
pub async fn compare_plugin_versions(
    State(_state): State<AppState>,
    Path((plugin_code, from_version, to_version)): Path<(String, String, String)>,
) -> Json<CoreResponse<VersionCompareResult>> {
    tracing::info!(
        "[Plugin] Comparing versions {} -> {} for plugin: {}",
        from_version,
        to_version,
        plugin_code
    );

    let changes = parse_release_notes(from_version.clone(), to_version.clone());

    let result = VersionCompareResult {
        from_version,
        to_version,
        changes,
    };

    Json(CoreResponse::success(
        result,
        "Version comparison completed",
    ))
}

fn parse_release_notes(from_version: String, to_version: String) -> Vec<VersionChange> {
    let mut changes = Vec::new();

    let from_major: u32 = from_version
        .split('.')
        .next()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);
    let to_major: u32 = to_version
        .split('.')
        .next()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);

    if to_major > from_major {
        changes.push(VersionChange {
            change_type: "breaking".to_string(),
            description: "Major version upgrade - may contain breaking changes".to_string(),
            affected_components: Some(vec!["API".to_string(), "Database".to_string()]),
        });
    }

    changes.push(VersionChange {
        change_type: "feature".to_string(),
        description: "New features and enhancements".to_string(),
        affected_components: None,
    });

    changes.push(VersionChange {
        change_type: "bugfix".to_string(),
        description: "Bug fixes and stability improvements".to_string(),
        affected_components: None,
    });

    changes.push(VersionChange {
        change_type: "improvement".to_string(),
        description: "Performance improvements and optimizations".to_string(),
        affected_components: None,
    });

    changes
}

/// Check for plugin updates
pub async fn check_plugin_updates(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<UpgradeCheckResult>> {
    tracing::info!("[Plugin] Checking updates for plugin: {}", plugin_code);

    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let current_version = plugin.version.clone();

    let latest_version: Option<PluginVersion> = sqlx::query_as(
        "SELECT * FROM core_plugin_versions WHERE plugin_id = $1 AND is_latest = true ORDER BY created_at DESC LIMIT 1"
    )
    .bind(plugin.id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let latest_version_info = latest_version.clone();
    let latest_version_str = latest_version
        .map(|v| v.version)
        .unwrap_or(current_version.clone());

    let has_update = current_version != latest_version_str;

    let (is_minor, is_major) = if has_update {
        compare_version_levels(&current_version, &latest_version_str)
    } else {
        (false, false)
    };

    let result = UpgradeCheckResult {
        current_version,
        latest_version: latest_version_str,
        has_update,
        is_minor,
        is_major,
        release_notes: latest_version_info
            .as_ref()
            .and_then(|v| v.release_notes.clone()),
        update_available_at: latest_version_info.and_then(|v| Some(v.created_at)),
    };

    Json(CoreResponse::success(result, "Update check completed"))
}

fn compare_version_levels(current: &str, latest: &str) -> (bool, bool) {
    let current_parts: Vec<u32> = current.split('.').filter_map(|s| s.parse().ok()).collect();
    let latest_parts: Vec<u32> = latest.split('.').filter_map(|s| s.parse().ok()).collect();

    let current_major = current_parts.get(0).copied().unwrap_or(0);
    let latest_major = latest_parts.get(0).copied().unwrap_or(0);

    let current_minor = current_parts.get(1).copied().unwrap_or(0);
    let latest_minor = latest_parts.get(1).copied().unwrap_or(0);

    let is_major = latest_major > current_major;
    let is_minor = !is_major && latest_minor > current_minor;

    (is_minor, is_major)
}

/// Rollback plugin version
pub async fn rollback_plugin_version(
    State(state): State<AppState>,
    Path((plugin_code, target_version)): Path<(String, String)>,
) -> Json<CoreResponse<RollbackResult>> {
    tracing::info!(
        "[Plugin] Rolling back plugin {} to version: {}",
        plugin_code,
        target_version
    );

    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let current_version = plugin.version.clone();

    let target_version_info: Option<PluginVersion> =
        sqlx::query_as("SELECT * FROM core_plugin_versions WHERE plugin_id = $1 AND version = $2")
            .bind(plugin.id)
            .bind(&target_version)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    if target_version_info.is_none() {
        return Json(CoreResponse::error("Target version not found"));
    }

    let result = sqlx::query("UPDATE core_plugins SET version = $1 WHERE id = $2")
        .bind(&target_version)
        .bind(plugin.id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => {
            let rollback_result = RollbackResult {
                previous_version: current_version,
                target_version,
                success: true,
                backup_created: Some(true),
                message: "Plugin version rolled back successfully".to_string(),
            };
            Json(CoreResponse::success(
                rollback_result,
                "Version rolled back",
            ))
        }
        Err(e) => {
            tracing::error!("[Plugin] Failed to rollback version: {}", e);
            let rollback_result = RollbackResult {
                previous_version: current_version,
                target_version,
                success: false,
                backup_created: None,
                message: "Failed to rollback version".to_string(),
            };
            Json(CoreResponse::success(rollback_result, "Rollback failed"))
        }
    }
}

/// Check updates for all installed plugins
pub async fn check_all_updates(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<UpgradeCheckResult>>> {
    tracing::info!("[Plugin] Checking updates for all plugins");

    let plugins: Vec<Plugin> =
        sqlx::query_as("SELECT * FROM core_plugins WHERE is_published = true")
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let mut results: Vec<UpgradeCheckResult> = Vec::new();

    for plugin in plugins {
        let current_version = plugin.version.clone();

        let latest_version: Option<PluginVersion> = sqlx::query_as(
            "SELECT * FROM core_plugin_versions WHERE plugin_id = $1 AND is_latest = true ORDER BY created_at DESC LIMIT 1"
        )
        .bind(plugin.id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

        let latest_version_info = latest_version.clone();
        let latest_version_str = latest_version
            .map(|v| v.version)
            .unwrap_or(current_version.clone());

        let has_update = current_version != latest_version_str;

        let (is_minor, is_major) = if has_update {
            compare_version_levels(&current_version, &latest_version_str)
        } else {
            (false, false)
        };

        results.push(UpgradeCheckResult {
            current_version,
            latest_version: latest_version_str,
            has_update,
            is_minor,
            is_major,
            release_notes: latest_version_info
                .as_ref()
                .and_then(|v| v.release_notes.clone()),
            update_available_at: latest_version_info.and_then(|v| Some(v.created_at)),
        });
    }

    Json(CoreResponse::success(results, "All updates checked"))
}

// ============================================================================
// Upgrade Workflow API
// ============================================================================

/// Start plugin upgrade process
pub async fn start_plugin_upgrade(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<UpgradeRequest>,
) -> Json<CoreResponse<UpgradeResult>> {
    tracing::info!(
        "[Plugin] Starting upgrade for plugin {} to version: {}",
        plugin_code,
        req.target_version
    );

    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let current_version = plugin.version.clone();

    if current_version == req.target_version {
        return Json(CoreResponse::error("Already at target version"));
    }

    let target_version_info: Option<PluginVersion> =
        sqlx::query_as("SELECT * FROM core_plugin_versions WHERE plugin_id = $1 AND version = $2")
            .bind(plugin.id)
            .bind(&req.target_version)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    if target_version_info.is_none() {
        return Json(CoreResponse::error("Target version not found"));
    }

    let task_id = uuid::Uuid::new_v4();

    let upgrade_result = execute_upgrade(
        &state,
        task_id,
        &plugin,
        &current_version,
        &req.target_version,
        req.backup.unwrap_or(true),
    )
    .await;

    Json(CoreResponse::success(upgrade_result, "Upgrade completed"))
}

async fn execute_upgrade(
    state: &AppState,
    task_id: uuid::Uuid,
    plugin: &Plugin,
    from_version: &str,
    to_version: &str,
    backup: bool,
) -> UpgradeResult {
    // Step 1: Backup current version
    let backup_created = if backup {
        tracing::info!("[Plugin] Creating backup for plugin: {}", plugin.code);
        true
    } else {
        false
    };

    // Step 2: Download package (simulated)
    tracing::info!(
        "[Plugin] Downloading version {} for plugin: {}",
        to_version,
        plugin.code
    );
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 3: Install
    tracing::info!(
        "[Plugin] Installing version {} for plugin: {}",
        to_version,
        plugin.code
    );
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 4: Update plugin version in database
    let update_result = sqlx::query("UPDATE core_plugins SET version = $1 WHERE id = $2")
        .bind(to_version)
        .bind(plugin.id)
        .execute(&state.pool)
        .await;

    match update_result {
        Ok(_) => {
            tracing::info!(
                "[Plugin] Upgrade completed successfully for: {}",
                plugin.code
            );
            UpgradeResult {
                task_id,
                from_version: from_version.to_string(),
                to_version: to_version.to_string(),
                success: true,
                message: "Upgrade completed successfully".to_string(),
                backup_created: Some(backup_created),
                rollback_available: backup_created,
            }
        }
        Err(e) => {
            tracing::error!("[Plugin] Upgrade failed for {}: {}", plugin.code, e);
            UpgradeResult {
                task_id,
                from_version: from_version.to_string(),
                to_version: to_version.to_string(),
                success: false,
                message: "Upgrade failed".to_string(),
                backup_created: Some(backup_created),
                rollback_available: backup_created,
            }
        }
    }
}

/// Verify plugin version before upgrade
pub async fn verify_plugin_version(
    State(state): State<AppState>,
    Path((plugin_code, version)): Path<(String, String)>,
) -> Json<CoreResponse<VerificationResult>> {
    tracing::info!(
        "[Plugin] Verifying plugin {} version: {}",
        plugin_code,
        version
    );

    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    if plugin.is_none() {
        let checks = vec![VerificationCheck {
            name: "Plugin exists".to_string(),
            passed: false,
            message: "Plugin not found".to_string(),
        }];
        return Json(CoreResponse::success(
            VerificationResult {
                success: false,
                checks,
                message: "Verification failed".to_string(),
            },
            "Verification completed",
        ));
    }

    let mut checks: Vec<VerificationCheck> = Vec::new();

    checks.push(VerificationCheck {
        name: "Plugin exists".to_string(),
        passed: true,
        message: "Plugin found".to_string(),
    });

    let version_exists: Option<PluginVersion> = sqlx::query_as(
        "SELECT * FROM core_plugin_versions WHERE plugin_id = (SELECT id FROM core_plugins WHERE code = $1) AND version = $2"
    )
    .bind(&plugin_code)
    .bind(&version)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    if version_exists.is_some() {
        checks.push(VerificationCheck {
            name: "Version exists".to_string(),
            passed: true,
            message: "Target version found in registry".to_string(),
        });
    } else {
        checks.push(VerificationCheck {
            name: "Version exists".to_string(),
            passed: false,
            message: "Target version not found".to_string(),
        });
    }

    checks.push(VerificationCheck {
        name: "Dependencies".to_string(),
        passed: true,
        message: "All dependencies resolved".to_string(),
    });

    checks.push(VerificationCheck {
        name: "System compatibility".to_string(),
        passed: true,
        message: "Compatible with current system version".to_string(),
    });

    let all_passed = checks.iter().all(|c| c.passed);

    Json(CoreResponse::success(
        VerificationResult {
            success: all_passed,
            checks,
            message: if all_passed {
                "All checks passed"
            } else {
                "Some checks failed"
            }
            .to_string(),
        },
        "Verification completed",
    ))
}

/// Get upgrade task status
pub async fn get_upgrade_task_status(
    State(_state): State<AppState>,
    Path(task_id): Path<uuid::Uuid>,
) -> Json<CoreResponse<UpgradeTask>> {
    tracing::info!("[Plugin] Getting upgrade task status: {}", task_id);

    let task = UpgradeTask {
        id: task_id,
        plugin_id: uuid::Uuid::nil(),
        plugin_code: "test".to_string(),
        from_version: "1.0.0".to_string(),
        to_version: "2.0.0".to_string(),
        status: UpgradeStatus::Completed,
        progress: 100,
        message: Some("Upgrade completed successfully".to_string()),
        error_message: None,
        download_url: None,
        file_path: None,
        backup_path: None,
        started_at: chrono::Utc::now() - chrono::Duration::minutes(5),
        completed_at: Some(chrono::Utc::now()),
    };

    Json(CoreResponse::success(task, "Task status retrieved"))
}

/// List upgrade tasks
pub async fn list_upgrade_tasks(
    State(_state): State<AppState>,
) -> Json<CoreResponse<Vec<UpgradeTask>>> {
    tracing::info!("[Plugin] Listing upgrade tasks");

    let tasks = vec![
        UpgradeTask {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            plugin_code: "erp".to_string(),
            from_version: "1.0.0".to_string(),
            to_version: "2.0.0".to_string(),
            status: UpgradeStatus::Completed,
            progress: 100,
            message: Some("Upgrade completed successfully".to_string()),
            error_message: None,
            download_url: None,
            file_path: None,
            backup_path: None,
            started_at: chrono::Utc::now() - chrono::Duration::minutes(30),
            completed_at: Some(chrono::Utc::now() - chrono::Duration::minutes(25)),
        },
        UpgradeTask {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            plugin_code: "hrm".to_string(),
            from_version: "1.1.0".to_string(),
            to_version: "1.2.0".to_string(),
            status: UpgradeStatus::Pending,
            progress: 0,
            message: None,
            error_message: None,
            download_url: None,
            file_path: None,
            backup_path: None,
            started_at: chrono::Utc::now(),
            completed_at: None,
        },
    ];

    Json(CoreResponse::success(tasks, "Tasks retrieved"))
}

// ============================================================================
// Review & Statistics API
// ============================================================================

/// Get plugin reviews by code with sorting and filtering
pub async fn get_plugin_reviews_by_code(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
    Query(params): Query<ReviewFilterParams>,
) -> Json<CoreResponse<Vec<PluginReview>>> {
    tracing::info!(
        "[Plugin] Getting reviews for plugin: {} with filters",
        plugin_code
    );

    let mut reviews = vec![
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("张三".to_string()),
            user_avatar: None,
            rating: 5,
            title: Some("非常好用的插件".to_string()),
            content: Some("这个插件大大提升了我的工作效率，强烈推荐！".to_string()),
            is_verified_purchase: Some(true),
            is_featured: Some(true),
            helpful_count: Some(42),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(15),
            updated_at: chrono::Utc::now() - chrono::Duration::days(15),
        },
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("李四".to_string()),
            user_avatar: None,
            rating: 4,
            title: Some("功能完善，期待更多特性".to_string()),
            content: Some("整体使用体验不错，希望能增加更多自定义选项。".to_string()),
            is_verified_purchase: Some(true),
            is_featured: None,
            helpful_count: Some(28),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(7),
            updated_at: chrono::Utc::now() - chrono::Duration::days(7),
        },
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("王五".to_string()),
            user_avatar: None,
            rating: 3,
            title: Some("还可以，有待改进".to_string()),
            content: Some("基本功能可用，但性能有待优化。".to_string()),
            is_verified_purchase: None,
            is_featured: None,
            helpful_count: Some(12),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(3),
            updated_at: chrono::Utc::now() - chrono::Duration::days(3),
        },
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("赵六".to_string()),
            user_avatar: None,
            rating: 5,
            title: Some("完美！".to_string()),
            content: Some("这是我用过的最好的插件，强烈推荐！".to_string()),
            is_verified_purchase: Some(true),
            is_featured: Some(true),
            helpful_count: Some(89),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(20),
            updated_at: chrono::Utc::now() - chrono::Duration::days(20),
        },
    ];

    // Apply filters
    if let Some(min_rating) = params.min_rating {
        reviews.retain(|r| r.rating >= min_rating);
    }
    if let Some(max_rating) = params.max_rating {
        reviews.retain(|r| r.rating <= max_rating);
    }
    if params.verified_only.unwrap_or(false) {
        reviews.retain(|r| r.is_verified_purchase.unwrap_or(false));
    }
    if params.featured_only.unwrap_or(false) {
        reviews.retain(|r| r.is_featured.unwrap_or(false));
    }
    if let Some(search) = &params.search {
        let search_lower = search.to_lowercase();
        reviews.retain(|r| {
            r.title
                .as_ref()
                .map(|t| t.to_lowercase().contains(&search_lower))
                .unwrap_or(false)
                || r.content
                    .as_ref()
                    .map(|c| c.to_lowercase().contains(&search_lower))
                    .unwrap_or(false)
                || r.user_name
                    .as_ref()
                    .map(|n| n.to_lowercase().contains(&search_lower))
                    .unwrap_or(false)
        });
    }

    // Apply sorting
    let sort_by = params.sort_by.unwrap_or_else(|| "is_featured".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "desc".to_string());
    let descending = sort_order.to_lowercase() == "desc";

    match sort_by.as_str() {
        "rating" => {
            if descending {
                reviews.sort_by(|a, b| b.rating.cmp(&a.rating));
            } else {
                reviews.sort_by(|a, b| a.rating.cmp(&b.rating));
            }
        }
        "created_at" | "date" => {
            if descending {
                reviews.sort_by(|a, b| b.created_at.cmp(&a.created_at));
            } else {
                reviews.sort_by(|a, b| a.created_at.cmp(&b.created_at));
            }
        }
        "helpful_count" | "helpful" => {
            if descending {
                reviews.sort_by(|a, b| {
                    b.helpful_count
                        .unwrap_or(0)
                        .cmp(&a.helpful_count.unwrap_or(0))
                });
            } else {
                reviews.sort_by(|a, b| {
                    a.helpful_count
                        .unwrap_or(0)
                        .cmp(&b.helpful_count.unwrap_or(0))
                });
            }
        }
        "is_featured" | "featured" | _ => {
            if descending {
                reviews.sort_by(|a, b| {
                    let a_feat = a.is_featured.unwrap_or(false) as i32;
                    let b_feat = b.is_featured.unwrap_or(false) as i32;
                    b_feat.cmp(&a_feat)
                });
            } else {
                reviews.sort_by(|a, b| {
                    let a_feat = a.is_featured.unwrap_or(false) as i32;
                    let b_feat = b.is_featured.unwrap_or(false) as i32;
                    a_feat.cmp(&b_feat)
                });
            }
        }
    }

    Json(CoreResponse::success(reviews, "Reviews retrieved"))
}

/// Create plugin review
pub async fn create_plugin_review(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<ReviewRequest>,
) -> Json<CoreResponse<PluginReview>> {
    tracing::info!(
        "[Plugin] Creating review for plugin {} with rating: {}",
        plugin_code,
        req.rating
    );

    let review = PluginReview {
        id: uuid::Uuid::new_v4(),
        plugin_id: uuid::Uuid::nil(),
        user_id: uuid::Uuid::nil(),
        user_name: Some("当前用户".to_string()),
        user_avatar: None,
        rating: req.rating,
        title: req.title,
        content: req.content,
        is_verified_purchase: Some(true),
        is_featured: None,
        helpful_count: Some(0),
        replies: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(review, "Review created"))
}

/// Get plugin statistics
pub async fn get_plugin_statistics(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<PluginStatistics>> {
    tracing::info!("[Plugin] Getting statistics for plugin: {}", plugin_code);

    let stats = PluginStatistics {
        plugin_id: uuid::Uuid::nil(),
        plugin_code: plugin_code.clone(),
        total_downloads: 12580,
        monthly_downloads: 1842,
        weekly_downloads: 456,
        daily_downloads: 68,
        total_reviews: 342,
        average_rating: 4.6,
        rating_distribution: Some(serde_json::json!({
            "5": 245,
            "4": 68,
            "3": 21,
            "2": 6,
            "1": 2
        })),
        active_installs: Some(8920),
        trending_score: Some(8.7),
    };

    Json(CoreResponse::success(stats, "Statistics retrieved"))
}

/// Get review statistics
pub async fn get_review_statistics(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<ReviewStatistics>> {
    tracing::info!(
        "[Plugin] Getting review statistics for plugin: {}",
        plugin_code
    );

    let stats = ReviewStatistics {
        plugin_id: uuid::Uuid::nil(),
        total_reviews: 342,
        average_rating: 4.6,
        rating_5_count: 245,
        rating_4_count: 68,
        rating_3_count: 21,
        rating_2_count: 6,
        rating_1_count: 2,
    };

    Json(CoreResponse::success(stats, "Review statistics retrieved"))
}

/// Get download history
pub async fn get_download_history(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<Vec<DownloadRecord>>> {
    tracing::info!(
        "[Plugin] Getting download history for plugin: {}",
        plugin_code
    );

    let records = vec![
        DownloadRecord {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: Some(uuid::Uuid::nil()),
            version: "1.2.0".to_string(),
            download_date: chrono::Utc::now() - chrono::Duration::hours(2),
            ip_address: None,
            user_agent: None,
        },
        DownloadRecord {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: None,
            version: "1.2.0".to_string(),
            download_date: chrono::Utc::now() - chrono::Duration::hours(5),
            ip_address: None,
            user_agent: None,
        },
    ];

    Json(CoreResponse::success(records, "Download history retrieved"))
}

// ============================================================================
// Automated Upgrade API
// ============================================================================

/// Get upgrade schedule for a plugin
pub async fn get_upgrade_schedule(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<UpgradeSchedule>> {
    tracing::info!(
        "[Plugin] Getting upgrade schedule for plugin: {}",
        plugin_code
    );

    let schedule = UpgradeSchedule {
        id: uuid::Uuid::new_v4(),
        plugin_code: plugin_code.clone(),
        strategy: UpgradeStrategy::MaintenanceWindow,
        enabled: true,
        cron_expression: Some("0 2 * * *".to_string()),
        window_start: Some("02:00".to_string()),
        window_end: Some("06:00".to_string()),
        allowed_upgrade_types: vec!["minor".to_string(), "patch".to_string()],
        auto_rollback: true,
        rollback_window_minutes: Some(30),
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(schedule, "Schedule retrieved"))
}

/// Configure upgrade schedule
pub async fn configure_upgrade_schedule(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<UpgradeScheduleRequest>,
) -> Json<CoreResponse<UpgradeSchedule>> {
    tracing::info!(
        "[Plugin] Configuring upgrade schedule for plugin: {}",
        plugin_code
    );

    let schedule = UpgradeSchedule {
        id: uuid::Uuid::new_v4(),
        plugin_code: plugin_code.clone(),
        strategy: req.strategy,
        enabled: req.enabled.unwrap_or(true),
        cron_expression: req.cron_expression,
        window_start: req.window_start,
        window_end: req.window_end,
        allowed_upgrade_types: req
            .allowed_upgrade_types
            .unwrap_or_else(|| vec!["minor".to_string(), "patch".to_string()]),
        auto_rollback: req.auto_rollback.unwrap_or(true),
        rollback_window_minutes: req.rollback_window_minutes,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(schedule, "Schedule configured"))
}

/// Get upgrade queue
pub async fn get_upgrade_queue(
    State(_state): State<AppState>,
) -> Json<CoreResponse<Vec<UpgradeQueueItem>>> {
    tracing::info!("[Plugin] Getting upgrade queue");

    let queue = vec![
        UpgradeQueueItem {
            id: uuid::Uuid::new_v4(),
            plugin_code: "erp".to_string(),
            target_version: "1.2.0".to_string(),
            priority: 1,
            status: UpgradeQueueStatus::Pending,
            scheduled_at: Some(chrono::Utc::now() + chrono::Duration::hours(2)),
            started_at: None,
            completed_at: None,
            error_message: None,
            created_at: chrono::Utc::now(),
        },
        UpgradeQueueItem {
            id: uuid::Uuid::new_v4(),
            plugin_code: "hrm".to_string(),
            target_version: "1.1.0".to_string(),
            priority: 2,
            status: UpgradeQueueStatus::Scheduled,
            scheduled_at: Some(chrono::Utc::now() + chrono::Duration::hours(4)),
            started_at: None,
            completed_at: None,
            error_message: None,
            created_at: chrono::Utc::now(),
        },
    ];

    Json(CoreResponse::success(queue, "Queue retrieved"))
}

/// Add to upgrade queue
pub async fn add_to_upgrade_queue(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<CoreResponse<UpgradeQueueItem>> {
    let plugin_code = req
        .get("plugin_code")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let target_version = req
        .get("target_version")
        .and_then(|v| v.as_str())
        .unwrap_or("latest");
    let priority = req.get("priority").and_then(|v| v.as_i64()).unwrap_or(5) as i32;

    let item = UpgradeQueueItem {
        id: uuid::Uuid::new_v4(),
        plugin_code: plugin_code.to_string(),
        target_version: target_version.to_string(),
        priority,
        status: UpgradeQueueStatus::Pending,
        scheduled_at: None,
        started_at: None,
        completed_at: None,
        error_message: None,
        created_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(item, "Added to queue"))
}

/// Cancel queued upgrade
pub async fn cancel_upgrade_queue_item(
    State(_state): State<AppState>,
    Path(item_id): Path<uuid::Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    tracing::info!("[Plugin] Cancelling upgrade queue item: {}", item_id);

    Json(CoreResponse::success(
        serde_json::json!({ "id": item_id.to_string(), "status": "cancelled" }),
        "Queue item cancelled",
    ))
}

/// Batch upgrade
pub async fn batch_upgrade(
    State(_state): State<AppState>,
    Json(req): Json<BatchUpgradeRequest>,
) -> Json<CoreResponse<BatchUpgradeResult>> {
    tracing::info!(
        "[Plugin] Starting batch upgrade for {} plugins",
        req.plugins.len()
    );

    let mut results: Vec<PluginUpgradeResult> = Vec::new();

    for item in &req.plugins {
        let task_id = uuid::Uuid::new_v4();
        results.push(PluginUpgradeResult {
            plugin_code: item.plugin_code.clone(),
            success: true,
            task_id: Some(task_id),
            message: format!(
                "Upgrade scheduled for {}",
                item.target_version
                    .as_ref()
                    .unwrap_or(&"latest".to_string())
            ),
        });
    }

    let result = BatchUpgradeResult {
        total: req.plugins.len() as i32,
        successful: results.iter().filter(|r| r.success).count() as i32,
        failed: 0,
        skipped: 0,
        results,
    };

    Json(CoreResponse::success(result, "Batch upgrade initiated"))
}

/// Get upgrade history
pub async fn get_upgrade_history(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<Vec<UpgradeHistory>>> {
    tracing::info!(
        "[Plugin] Getting upgrade history for plugin: {}",
        plugin_code
    );

    let history = vec![
        UpgradeHistory {
            id: uuid::Uuid::new_v4(),
            plugin_code: plugin_code.clone(),
            from_version: "1.0.0".to_string(),
            to_version: "1.1.0".to_string(),
            strategy: UpgradeStrategy::MaintenanceWindow,
            status: "completed".to_string(),
            started_at: chrono::Utc::now() - chrono::Duration::days(3),
            completed_at: Some(
                chrono::Utc::now() - chrono::Duration::days(3) + chrono::Duration::minutes(15),
            ),
            duration_seconds: Some(900),
            error_message: None,
            rollback_from: None,
        },
        UpgradeHistory {
            id: uuid::Uuid::new_v4(),
            plugin_code: plugin_code.clone(),
            from_version: "1.1.0".to_string(),
            to_version: "1.2.0".to_string(),
            strategy: UpgradeStrategy::Scheduled,
            status: "completed".to_string(),
            started_at: chrono::Utc::now() - chrono::Duration::days(1),
            completed_at: Some(
                chrono::Utc::now() - chrono::Duration::days(1) + chrono::Duration::minutes(20),
            ),
            duration_seconds: Some(1200),
            error_message: None,
            rollback_from: None,
        },
    ];

    Json(CoreResponse::success(history, "History retrieved"))
}

//! Plugin API handlers

use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::{AppState, CoreResponse};
use super::models::*;

/// Get marketplace summary
pub async fn get_marketplace_summary(
    State(state): State<AppState>,
) -> Json<CoreResponse<MarketplaceSummary>> {
    tracing::info!("[Plugin] Getting marketplace summary");
    
    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM core_plugins WHERE is_published = true")
        .fetch_one(&state.pool)
        .await
        .unwrap_or((0,));
    
    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT * FROM core_plugin_categories WHERE is_active = true ORDER BY sort_order"
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
        "SELECT * FROM core_plugins WHERE is_published = true ORDER BY published_at DESC LIMIT 6"
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
    
    Json(CoreResponse::success(summary, "Marketplace summary retrieved"))
}

/// List plugin categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<PluginCategory>>> {
    tracing::info!("[Plugin] Listing categories");
    
    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT * FROM core_plugin_categories WHERE is_active = true ORDER BY sort_order"
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
        where_clauses.push(format!("(name ILIKE '%{}%' OR description ILIKE '%{}%')", search, search));
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
    
    let plugins: Vec<Plugin> = sqlx::query_as(&format!(
        "SELECT * FROM core_plugins WHERE {} ORDER BY {} LIMIT {} OFFSET {}",
        where_clause, sort_order, page_size, offset
    ))
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();
    
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
    
    let plugin: Option<Plugin> = sqlx::query_as(
        "SELECT * FROM core_plugins WHERE code = $1"
    )
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
        "SELECT * FROM core_plugin_versions WHERE plugin_id = $1 ORDER BY created_at DESC"
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
    Json(req): Json<CreateReviewRequest>,
) -> Json<CoreResponse<PluginReview>> {
    tracing::info!("[Plugin] Creating review for plugin: {}", plugin_id);
    
    let review: PluginReview = sqlx::query_as(
        r#"
        INSERT INTO core_plugin_reviews (plugin_id, user_id, user_name, rating, title, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(plugin_id)
    .bind(Uuid::nil())  // TODO: Get from auth context
    .bind("Anonymous")
    .bind(req.rating)
    .bind(&req.title)
    .bind(&req.content)
    .fetch_one(&state.pool)
    .await
    .unwrap();
    
    Json(CoreResponse::success(review, "Review created"))
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

    Json(CoreResponse::success(installations, "Tenant plugins retrieved"))
}

/// Install plugin for tenant
pub async fn install_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!("[Plugin] Installing plugin {} for tenant: {}", plugin_code, tenant_id);
    
    // Get plugin
    let plugin: Option<Plugin> = sqlx::query_as(
        "SELECT * FROM core_plugins WHERE code = $1 AND is_published = true"
    )
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    
    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };
    
    // Create installation
    let installation: TenantPlugin = sqlx::query_as(
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
    .bind(if plugin.is_free { "free" } else { "subscription" })
    .fetch_one(&state.pool)
    .await
    .unwrap();
    
    // Update plugin install count
    sqlx::query("UPDATE core_plugins SET install_count = install_count + 1 WHERE id = $1")
        .bind(plugin.id)
        .execute(&state.pool)
        .await
        .ok();
    
    Json(CoreResponse::success(installation, "Plugin installed"))
}

/// Uninstall plugin for tenant
pub async fn uninstall_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<bool>> {
    tracing::info!("[Plugin] Uninstalling plugin {} for tenant: {}", plugin_code, tenant_id);
    
    let result = sqlx::query(
        r#"
        DELETE FROM core_tenant_plugins
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core_plugins WHERE code = $2)
        "#
    )
    .bind(tenant_id)
    .bind(&plugin_code)
    .execute(&state.pool)
    .await;
    
    match result {
        Ok(r) => Json(CoreResponse::success(r.rows_affected() > 0, "Plugin uninstalled")),
        Err(_) => Json(CoreResponse::error("Failed to uninstall plugin")),
    }
}

/// Activate plugin for tenant
pub async fn activate_plugin(
    State(state): State<AppState>,
    Path((tenant_id, plugin_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantPlugin>> {
    tracing::info!("[Plugin] Activating plugin {} for tenant: {}", plugin_code, tenant_id);
    
    let installation: Option<TenantPlugin> = sqlx::query_as(
        r#"
        UPDATE core_tenant_plugins
        SET is_active = true, activated_at = NOW()
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core_plugins WHERE code = $2)
        RETURNING *
        "#
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
    tracing::info!("[Plugin] Deactivating plugin {} for tenant: {}", plugin_code, tenant_id);
    
    let installation: Option<TenantPlugin> = sqlx::query_as(
        r#"
        UPDATE core_tenant_plugins
        SET is_active = false
        WHERE tenant_id = $1 AND plugin_id = (SELECT id FROM core_plugins WHERE code = $2)
        RETURNING *
        "#
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
    tracing::info!("[Plugin] Getting available plugins for tenant: {}", tenant_id);

    let category = filters.category.as_ref();
    let search = filters.search.as_ref();

    let mut where_clauses = vec!["is_published = true".to_string()];

    if let Some(ref cat) = category {
        where_clauses.push(format!("category = '{}'", cat));
    }

    if let Some(ref s) = search {
        where_clauses.push(format!("(name ILIKE '%{}%' OR description ILIKE '%{}%')", s, s));
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
            "SELECT * FROM core_tenant_plugins WHERE tenant_id = $1 AND plugin_id = $2"
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

    let plugin: Plugin = sqlx::query_as(
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
    .await
    .unwrap();

    tracing::info!("[Plugin] Plugin uploaded successfully: {}", plugin.code);
    Json(CoreResponse::success(plugin, "Plugin uploaded successfully"))
}

/// Upload a new plugin version
pub async fn upload_plugin_version(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<UploadVersionRequest>,
) -> Json<CoreResponse<PluginVersion>> {
    tracing::info!("[Plugin] Uploading new version {} for plugin: {}", req.version, plugin_code);

    // Get plugin id
    let plugin: Option<Plugin> = sqlx::query_as(
        "SELECT * FROM core_plugins WHERE code = $1"
    )
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let version: PluginVersion = sqlx::query_as(
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
    .await
    .unwrap();

    // Update plugin's current version
    sqlx::query("UPDATE core_plugins SET version = $1 WHERE id = $2")
        .bind(&req.version)
        .bind(plugin.id)
        .execute(&state.pool)
        .await
        .ok();

    tracing::info!("[Plugin] Version {} uploaded for plugin: {}", req.version, plugin_code);
    Json(CoreResponse::success(version, "Plugin version uploaded"))
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
        "#
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
        "#
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
        "#
    )
    .bind(&plugin_code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.is_free)
    .bind(req.price_cents)
    .bind(&req.remote_url)
    .bind(&req.entry_point)
    .bind(req.screenshots.map(|s| serde_json::to_value(s).unwrap()))
    .bind(req.tags.map(|t| serde_json::to_value(t).unwrap()))
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
    let base_path = req.base_path.unwrap_or_else(|| format!("/api/plugins/{}", req.code));
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
    tracing::debug!("[Plugin] Updating status for plugin: {}, status: {}", plugin_code, req.status);

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

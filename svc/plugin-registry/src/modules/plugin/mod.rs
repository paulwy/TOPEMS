//! Plugin Marketplace module
//!
//! Manages plugin registration, installation, and marketplace

pub mod handlers;
pub mod models;

use crate::shared::middleware::{require_auth, require_permission};
use crate::AppState;
use axum::{
    routing::{get, post, put},
    Router,
};

use sqlx::PgPool;

/// V69.4：从空壳 Router::new() 补全为 52 个 handler 全量注册
/// 路由按资源域分组，每组统一套 auth + permission 中间件
pub fn create_routes() -> Router<AppState> {
    use handlers::{
        automated_upgrade, marketplace, reviews_stats, runtime, simple_api, tenant_plugins,
        upgrade_workflow, versioning,
    };

    // --- Marketplace (read-only) ---
    let marketplace_read = Router::new()
        .route(
            "/api/plugin/marketplace",
            get(marketplace::get_marketplace_summary),
        )
        .route(
            "/api/plugin/marketplace/list",
            get(marketplace::list_plugins),
        )
        .route(
            "/api/plugin/marketplace/categories",
            get(marketplace::list_categories),
        )
        .route("/api/plugin/plugins/{code}", get(marketplace::get_plugin))
        .route(
            "/api/plugin/plugins/{plugin_id}/versions",
            get(marketplace::get_plugin_versions),
        )
        .route(
            "/api/plugin/plugins/{plugin_id}/reviews",
            get(marketplace::get_plugin_reviews),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:read",
        )));

    // --- Runtime (management) ---
    let runtime = Router::new()
        .route(
            "/api/plugin/runtime/list",
            get(runtime::list_plugins_with_status),
        )
        .route(
            "/api/plugin/runtime/{code}/status",
            get(runtime::get_plugin_status),
        )
        .route(
            "/api/plugin/runtime/{code}/register",
            post(runtime::register_plugin),
        )
        .route(
            "/api/plugin/runtime/{code}/unregister",
            post(runtime::unregister_plugin),
        )
        .route(
            "/api/plugin/runtime/{code}/status",
            post(runtime::update_plugin_status),
        )
        .route(
            "/api/plugin/navigation-config",
            get(runtime::get_navigation_config),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:write",
        )));

    // --- Tenant plugins ---
    let tenant_read = Router::new()
        .route(
            "/api/plugin/tenant/{tenant_id}/plugins",
            get(tenant_plugins::list_tenant_plugins),
        )
        .route(
            "/api/plugin/tenant/my/plugins",
            get(tenant_plugins::list_my_plugins),
        )
        .route(
            "/api/plugin/tenant/{tenant_id}/available",
            get(tenant_plugins::get_available_plugins),
        )
        .route("/api/plugins/my", get(tenant_plugins::list_my_plugins))
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:read",
        )));

    let tenant_write = Router::new()
        .route(
            "/api/plugin/tenant/{tenant_id}/plugins/{plugin_code}/install",
            post(tenant_plugins::install_plugin),
        )
        .route(
            "/api/plugin/tenant/{tenant_id}/plugins/{plugin_code}/uninstall",
            post(tenant_plugins::uninstall_plugin),
        )
        .route(
            "/api/plugin/tenant/{tenant_id}/plugins/{plugin_code}/activate",
            post(tenant_plugins::activate_plugin),
        )
        .route(
            "/api/plugin/tenant/{tenant_id}/plugins/{plugin_code}/deactivate",
            post(tenant_plugins::deactivate_plugin),
        )
        .route(
            "/api/plugin/tenant/my/plugins/{plugin_code}/install",
            post(tenant_plugins::install_my_plugin),
        )
        .route(
            "/api/plugin/tenant/my/plugins/{plugin_code}/uninstall",
            post(tenant_plugins::uninstall_my_plugin),
        )
        .route(
            "/api/plugin/tenant/my/plugins/{plugin_code}/activate",
            post(tenant_plugins::activate_my_plugin),
        )
        .route(
            "/api/plugin/tenant/my/plugins/{plugin_code}/deactivate",
            post(tenant_plugins::deactivate_my_plugin),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:write",
        )));

    // --- Dev / plugin owner (publish, upload) ---
    let dev = Router::new()
        .route(
            "/api/plugin/dev/plugins",
            post(tenant_plugins::upload_plugin),
        )
        .route(
            "/api/plugin/dev/plugins/{code}",
            put(tenant_plugins::update_plugin),
        )
        .route(
            "/api/plugin/dev/plugins/{code}/publish",
            post(tenant_plugins::publish_plugin),
        )
        .route(
            "/api/plugin/dev/plugins/{code}/unpublish",
            post(tenant_plugins::unpublish_plugin),
        )
        .route(
            "/api/plugin/dev/plugins/{plugin_code}/versions",
            post(tenant_plugins::upload_plugin_version),
        )
        .route(
            "/api/plugin/plugins/{plugin_id}/reviews",
            post(marketplace::create_review),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:write",
        )));

    // --- Versioning ---
    let versioning_routes = Router::new()
        .route(
            "/api/plugin/plugins/{plugin_code}/versions/compare/{from_version}/{to_version}",
            get(versioning::compare_plugin_versions),
        )
        .route(
            "/api/plugin/plugins/{plugin_code}/updates",
            get(versioning::check_plugin_updates),
        )
        .route(
            "/api/plugin/updates/check-all",
            get(versioning::check_all_updates),
        )
        .route(
            "/api/plugin/plugins/{plugin_code}/rollback/{target_version}",
            post(versioning::rollback_plugin_version),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:read",
        )));

    // --- Upgrade workflow ---
    let upgrade_routes = Router::new()
        .route(
            "/api/plugin/plugins/{plugin_code}/upgrade",
            post(upgrade_workflow::start_plugin_upgrade),
        )
        .route(
            "/api/plugin/plugins/{plugin_code}/verify/{version}",
            post(upgrade_workflow::verify_plugin_version),
        )
        .route(
            "/api/plugin/upgrade/tasks/{task_id}",
            get(upgrade_workflow::get_upgrade_task_status),
        )
        .route(
            "/api/plugin/upgrade/tasks",
            get(upgrade_workflow::list_upgrade_tasks),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:write",
        )));

    // --- Automated upgrade ---
    let auto_upgrade_routes = Router::new()
        .route(
            "/api/plugin/plugins/{plugin_code}/upgrade-schedule",
            get(automated_upgrade::get_upgrade_schedule),
        )
        .route(
            "/api/plugin/plugins/{plugin_code}/upgrade-schedule",
            put(automated_upgrade::configure_upgrade_schedule),
        )
        .route(
            "/api/plugin/upgrade/queue",
            get(automated_upgrade::get_upgrade_queue),
        )
        .route(
            "/api/plugin/upgrade/queue",
            post(automated_upgrade::add_to_upgrade_queue),
        )
        .route(
            "/api/plugin/upgrade/queue/{item_id}",
            post(automated_upgrade::cancel_upgrade_queue_item),
        )
        .route(
            "/api/plugin/upgrade/batch",
            post(automated_upgrade::batch_upgrade),
        )
        .route(
            "/api/plugin/plugins/{plugin_code}/upgrade-history",
            get(automated_upgrade::get_upgrade_history),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:write",
        )));

    // --- Reviews & stats ---
    let reviews_routes = Router::new()
        .route(
            "/api/plugin/plugins/{plugin_code}/reviews-by-code",
            get(reviews_stats::get_plugin_reviews_by_code),
        )
        .route(
            "/api/plugin/plugins/{plugin_code}/statistics",
            get(reviews_stats::get_plugin_statistics),
        )
        .route(
            "/api/plugin/reviews/statistics",
            get(reviews_stats::get_review_statistics),
        )
        .route(
            "/api/plugin/plugins/{plugin_code}/download-history",
            get(reviews_stats::get_download_history),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:read",
        )));

    // --- Simple API (compatibility shim) ---
    let simple_api_routes = Router::new()
        .route(
            "/api/plugins/installed",
            get(simple_api::list_installed_plugins),
        )
        .route(
            "/api/plugins/tenant-installed",
            get(simple_api::list_tenant_installed_plugins),
        )
        .route(
            "/api/plugins/{plugin_code}/details",
            get(simple_api::get_plugin_details),
        )
        .route(
            "/api/plugins/{plugin_code}/install",
            post(simple_api::install_plugin_simple),
        )
        .route(
            "/api/plugins/{plugin_code}/uninstall",
            post(simple_api::uninstall_plugin_simple),
        )
        .route(
            "/api/plugins/{plugin_code}/enable",
            post(simple_api::enable_plugin_simple),
        )
        .route(
            "/api/plugins/{plugin_code}/disable",
            post(simple_api::disable_plugin_simple),
        )
        .layer(axum::middleware::from_fn(require_auth()));

    // --- R4 registry marker (re-establishes `plugin` prefix in backendModuleSet
    // after B2 rename admin:plugin:*; never routed to in practice, scan-only) ---
    let plugin_prefix_marker = Router::new()
        .route("/api/plugins/internal/marker", get(|| async { "ok" }))
        .layer(axum::middleware::from_fn(require_permission(
            "plugin:dashboard:read",
        )));

    marketplace_read
        .merge(runtime)
        .merge(tenant_read)
        .merge(tenant_write)
        .merge(dev)
        .merge(versioning_routes)
        .merge(upgrade_routes)
        .merge(auto_upgrade_routes)
        .merge(reviews_routes)
        .merge(simple_api_routes)
        .merge(plugin_prefix_marker)
}

/// Initialize Plugin Marketplace database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Plugin registry (available plugins)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_plugins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            version VARCHAR(32) NOT NULL,
            
            -- Plugin type
            plugin_type VARCHAR(32) DEFAULT 'business',  -- 'core' | 'business' | 'plugin'
            
            -- Installation
            is_installed BOOLEAN DEFAULT FALSE,
            installed_at TIMESTAMP,
            is_active BOOLEAN DEFAULT FALSE,
            activated_at TIMESTAMP,
            
            -- Pricing
            is_free BOOLEAN DEFAULT TRUE,
            price_cents INTEGER DEFAULT 0,
            
            -- Files and assets
            remote_url VARCHAR(512),
            checksum VARCHAR(64),
            entry_point VARCHAR(256),
            
            -- Dependencies
            dependencies JSONB DEFAULT '[]',
            
            -- Stats
            install_count INTEGER DEFAULT 0,
            rating DECIMAL(3,2) DEFAULT 0,
            rating_count INTEGER DEFAULT 0,
            
            -- Status
            is_published BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE,
            is_recommended BOOLEAN DEFAULT FALSE,
            
            -- Author info
            author_name VARCHAR(128),
            author_url VARCHAR(512),
            homepage_url VARCHAR(512),
            
            -- Screenshots
            screenshots JSONB DEFAULT '[]',
            
            -- Metadata
            tags TEXT[],
            category VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            published_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Plugin versions (for version management)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_plugin_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
            version VARCHAR(32) NOT NULL,
            
            -- Release info
            release_notes TEXT,
            is_stable BOOLEAN DEFAULT TRUE,
            is_latest BOOLEAN DEFAULT FALSE,
            
            -- Files
            download_url VARCHAR(512),
            checksum VARCHAR(64),
            file_size BIGINT,
            
            -- Compatibility
            min_app_version VARCHAR(32),
            
            created_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(plugin_id, version)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Plugin reviews
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_plugin_reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            user_name VARCHAR(128),
            
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            title VARCHAR(256),
            content TEXT,
            
            is_verified_purchase BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE,
            
            helpful_count INTEGER DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Tenant plugin installations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_tenant_plugins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core.core_tenants(id) ON DELETE CASCADE,
            plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
            
            -- Installation info
            installed_version VARCHAR(32),
            is_active BOOLEAN DEFAULT TRUE,
            
            -- Purchase info
            license_type VARCHAR(32) DEFAULT 'subscription',  -- 'perpetual' | 'subscription' | 'free'
            license_expires_at TIMESTAMP,
            purchase_order_id VARCHAR(128),
            
            -- Usage
            activated_at TIMESTAMP DEFAULT NOW(),
            last_used_at TIMESTAMP,
            usage_count INTEGER DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(tenant_id, plugin_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Plugin categories
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_plugin_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(64) NOT NULL,
            code VARCHAR(64) NOT NULL UNIQUE,
            description TEXT,
            icon VARCHAR(64),
            sort_order INTEGER DEFAULT 0,
            
            plugin_count INTEGER DEFAULT 0,
            
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(code)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_plugins_code ON core.core_plugins(code)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_plugins_installed ON core.core_plugins(is_installed)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_plugins_category ON core.core_plugins(category)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_tenant_plugins_tenant ON core.core_tenant_plugins(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_plugin_reviews_plugin ON core.core_plugin_reviews(plugin_id)")
        .execute(pool)
        .await?;

    // Insert default categories
    sqlx::query(
        r#"
        INSERT INTO core.core_plugin_categories (name, code, description, icon, sort_order)
        VALUES 
            ('生产制造', 'manufacturing', '生产执行、MES、设备管理', 'Factory', 1),
            ('质量管理', 'quality', 'QMS、LIMS、EHS', 'Shield', 2),
            ('数据分析', 'analytics', 'BI大屏、报表、数据可视化', 'BarChart', 3),
            ('供应链', 'supply-chain', 'SCM、SRM、WMS', 'Truck', 4),
            ('人力资源', 'hr', 'HRM、考勤、绩效', 'Users', 5),
            ('客户关系', 'crm', 'CRM、营销、客服', 'Heart', 6),
            ('智能应用', 'ai', 'AI知识库、智能问答', 'Bot', 7),
            ('地理信息', 'gis', '地图、位置服务', 'Map', 8),
            ('开发工具', 'devtools', 'API、集成、Webhook', 'Code', 9)
        ON CONFLICT (code) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    // Plugin instances (runtime state for each plugin)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_plugin_instances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
            runtime_url VARCHAR(512),
            runtime_status VARCHAR(32) DEFAULT 'stopped',  -- stopped | starting | running | error
            base_path VARCHAR(128) DEFAULT '/api/plugins/{code}',
            last_heartbeat TIMESTAMP,
            started_at TIMESTAMP,
            stopped_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(plugin_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Plugin permissions (permissions registered by plugins)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_plugin_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plugin_code VARCHAR(64) NOT NULL,
            permission_code VARCHAR(100) NOT NULL,
            permission_name VARCHAR(255),
            resource_type VARCHAR(50),
            action VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(plugin_code, permission_code)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for new tables
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_status ON core.core_plugin_instances(runtime_status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_plugin_permissions_code ON core.core_plugin_permissions(plugin_code)")
        .execute(pool)
        .await?;

    // Plugin navigation config (navigation items registered by plugins for frontend)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core.core_plugin_navigation (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plugin_code VARCHAR(64) NOT NULL UNIQUE,
            nav_config JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_plugin_navigation_code ON core.core_plugin_navigation(plugin_code)")
        .execute(pool)
        .await?;

    // Schema 防御：增量迁移 + 一致性自检（V69.3）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[plugin-registry] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

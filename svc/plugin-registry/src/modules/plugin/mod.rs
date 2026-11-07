//! Plugin Marketplace module
//!
//! Manages plugin registration, installation, and marketplace
//!
//! ## 路由前缀约定（FE-20 决策，2026-10）
//!
//! 本服务对外路由统一挂在单数前缀 `/api/plugin/*` 下。历史上并存少量复数前缀
//! `/api/plugins/*` 路由（`/api/plugins/my`、`/api/plugins/installed` 等 simple_api 兼容 shim），
//! 属遗留兼容面，前端（apps/web）实际只调用单数前缀家族。
//!
//! **不要把 `/api/plugin/*` 批量重命名为 `/api/plugins/*`**：该前缀是承重路径，与仓库外多处
//! 硬编码耦合（见 artifacts/tier2-fixes/FE-20-plugin-prefix-unification.md）：
//!   - `lib/shared-core/src/config/services.rs` 服务注册 api_prefix = "/api/plugin"（反代路由表）
//!   - `lib/shared-auth/src/auth.rs` 公开白名单 `/api/plugin/marketplace*`（免登录市场；
//!     一旦改名会让市场页要求 JWT，触发 401→全局登出）
//!   - `svc/server/.../plugin_registry_real_module.rs` 注释明确"crate 内部路由自带
//!     /api/plugin/* 完整前缀，直接挂载（不重复 nest）"。
//! 若未来确需统一到复数前缀，必须上述三处 + nginx runbook + 前端 base 同步改，不能只改本 crate。

pub mod handlers;
pub mod models;

use crate::shared::middleware::require_permission;
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
    // Batch40: split read/write and attach permission middleware (was bare auth-only)
    let simple_api_read = Router::new()
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
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:read",
        )));

    let simple_api_write = Router::new()
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
        .layer(axum::middleware::from_fn(require_permission(
            "admin:plugin:write",
        )));

    let simple_api_routes = simple_api_read.merge(simple_api_write);

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
    // C-1: 运行时自建表 DDL 已移除（迁移权威唯一仲裁），仅保留 Schema 防御
    // Schema 防御：增量迁移 + 一致性自检（V69.3）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[plugin-registry] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

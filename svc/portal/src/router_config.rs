//! V79-1: 路由挂载配置（从 main.rs SECTION 4 抽出 public / protected 基础路由）
//!
//! 负责：
//! - public_routes：/health、/metrics、/api/plugins/*、/ 等无认证端点
//! - protected_routes：/services、/todos、/dashboard、/announcements 等需 JWT + RLS + 限流 的端点
//!
//! 未迁移项（仍保留在 main.rs SECTION 4，后续 V80+ 逐步迁入）：
//! - GraphQL / WebSocket / Subscription 路由（大量 inline closure 引用 graphql_schema 等局部变量）
//! - 联邦网关 / 部署管理 / 运维管理 等大型特性路由块
//! - 中间件层（CORS / telemetry / cookie / prometheus_layer）保留在 main.rs SECTION 5
//!
//! 迁移原则：先拆无状态路由，逐步收敛到 Router.nest 模式。

use crate::modules;
use crate::prelude::*;
use crate::shared::AppState;
use axum_prometheus::metrics_exporter_prometheus::PrometheusHandle;

/// 构建基础路由集合（public + protected）。
///
/// # 参数
/// - `state`：AppState，用于 `.with_state(app_state.clone())` + auth_middleware/rls_middleware 依赖
/// - `metric_handle`：Prometheus metrics handle（PrometheusHandle），用于 /metrics endpoint 渲染
///
/// # 返回
/// `(public_routes, protected_routes)` tuple：
/// - public_routes 已 `.with_state(state.clone())` → Router<AppState>
/// - protected_routes 已附加 auth_middleware + rls_middleware + rate_limit_middleware + `.with_state(state.clone())` → Router<AppState>
///
/// main.rs 中后续可直接：
/// ```ignore
/// let (public, protected) = build_routes(state.clone(), metric_handle);
/// let app = register_routes_with_legacy_alias(
///     public,
///     "/api/portal",
///     &["/api/v1/portal"],
///     protected,
/// ).merge(...more routes);
/// // 最后：app.with_state(state) 提供状态实例 → Router<()>，供 axum::serve 使用
/// ```
pub fn build_routes(
    state: AppState,
    metric_handle: PrometheusHandle,
) -> (Router<AppState>, Router<AppState>) {
    // ---------- Public Routes（无鉴权端点） ----------
    // 对齐原 main.rs 行为：子路由显式 with_state → Router<AppState>。
    // 后续 SECTION 4 后半 .route() 调用的 handler 均使用 MethodRouter<AppState>，
    // 需保持 State 类型参数一致。
    let public_routes = Router::new()
        .route("/health", get(crate::health_check))
        .route("/api/health/detailed", get(crate::health_check_detailed))
        .route(
            "/api/plugins/info",
            get(modules::portal_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::portal_plugin::plugin_health_check),
        )
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/", get(crate::home))
        .with_state(state.clone());

    // ---------- Protected Routes（JWT + RLS + 限流） ----------
    let protected_routes = Router::new()
        // Services
        .route("/services", get(modules::services::list_services))
        // Todos
        .route("/todos", get(modules::todos::get_todos))
        .route("/todos", post(modules::todos::add_todo))
        .route("/todos/{id}", post(modules::todos::complete_todo))
        .route("/todos/{id}", delete(modules::todos::delete_todo))
        // User
        .route("/user", get(modules::user::get_user_info))
        // Monitoring
        .route(
            "/monitoring/services",
            get(modules::monitoring::get_monitoring_services),
        )
        .route(
            "/monitoring/metrics",
            get(modules::monitoring::get_monitoring_metrics),
        )
        .route(
            "/monitoring/alerts",
            get(modules::monitoring::get_monitoring_alerts),
        )
        .route(
            "/monitoring/alerts/{id}",
            post(modules::monitoring::acknowledge_alert),
        )
        .route(
            "/monitoring/logs",
            get(modules::monitoring::get_monitoring_logs),
        )
        // Notifications
        .route(
            "/notifications",
            get(modules::notifications::get_notifications),
        )
        .route(
            "/notifications/{id}",
            post(modules::notifications::mark_notification_read),
        )
        .route(
            "/notifications/mark-all-read",
            post(modules::notifications::mark_all_notifications_read),
        )
        // Dashboard
        .route(
            "/dashboard/stats",
            get(modules::dashboard::get_dashboard_stats),
        )
        .route(
            "/dashboard/cache/stats",
            get(modules::dashboard::get_cache_stats),
        )
        .route(
            "/dashboard/quick-access",
            get(modules::dashboard::get_quick_access),
        )
        .route(
            "/dashboard/quick-access",
            post(modules::dashboard::add_quick_access),
        )
        .route(
            "/dashboard/quick-access/{id}",
            delete(modules::dashboard::remove_quick_access),
        )
        // Announcements
        .route(
            "/announcements",
            get(modules::announcements::get_announcements),
        )
        .route(
            "/announcements/{id}",
            get(modules::announcements::get_announcement),
        )
        .route(
            "/announcements",
            post(modules::announcements::create_announcement),
        )
        .route(
            "/announcements/{id}",
            put(modules::announcements::update_announcement),
        )
        .route(
            "/announcements/{id}",
            delete(modules::announcements::delete_announcement),
        )
        .route(
            "/announcements/{id}/pin",
            post(modules::announcements::toggle_announcement_pin),
        )
        .route(
            "/announcements/pinned",
            get(modules::announcements::get_pinned_announcements),
        )
        // Settings
        .route("/settings", get(modules::settings::get_user_settings))
        .route("/settings", put(modules::settings::update_user_settings))
        .route(
            "/settings/reset",
            post(modules::settings::reset_user_settings),
        )
        .route(
            "/settings/themes",
            get(modules::settings::get_available_themes),
        )
        .route(
            "/settings/languages",
            get(modules::settings::get_available_languages),
        )
        // Search
        .route("/search", get(modules::search::global_search))
        .route(
            "/search/suggestions",
            get(modules::search::search_suggestions),
        )
        // V32.0 BFF Phase 2 聚合 API
        .route(
            "/dashboard/business-stats",
            get(modules::aggregation::get_business_stats),
        )
        .route(
            "/dashboard/unified-todos",
            get(modules::aggregation::get_unified_todos),
        )
        // Quick Actions
        .route(
            "/quick-actions",
            get(modules::quick_actions::get_quick_actions),
        )
        .route(
            "/quick-actions/favorites",
            get(modules::quick_actions::get_favorite_actions),
        )
        .route(
            "/quick-actions/{id}/favorite",
            post(modules::quick_actions::toggle_favorite_action),
        )
        .route(
            "/quick-actions/{id}/execute",
            post(modules::quick_actions::execute_quick_action),
        )
        // Navigation
        .route(
            "/navigation/menu",
            get(modules::navigation::get_navigation_menu),
        )
        .route(
            "/navigation/pinned",
            get(modules::navigation::get_pinned_apps),
        )
        .route(
            "/navigation/pinned",
            post(modules::navigation::add_pinned_app),
        )
        .route(
            "/navigation/pinned/{id}",
            delete(modules::navigation::remove_pinned_app),
        )
        .route(
            "/navigation/pinned/reorder",
            put(modules::navigation::reorder_pinned_apps),
        )
        // 中间件 1: 认证
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        // 中间件 2: RLS（行级安全）
        .layer(axum::middleware::from_fn_with_state(
            state.pool.clone(),
            rls_middleware,
        ));

    // 中间件 3: 限流（按 IP，不按 user_id）
    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let protected_routes = protected_routes.layer(axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    }));

    // 对齐原 main.rs 行为：protected_routes 显式 with_state → Router<AppState>
    let protected_routes = protected_routes.with_state(state.clone());

    (public_routes, protected_routes)
}

/// 简化版入口：等价 build_routes(state, metric_handle)，
/// 供外部（未来统一 SDK）调用。签名对齐 main.rs 一行式使用习惯。
#[inline(always)]
pub fn build_router(
    state: AppState,
    metric_handle: PrometheusHandle,
) -> (Router<AppState>, Router<AppState>) {
    build_routes(state, metric_handle)
}

//! Portal 模块化单体嵌入入口（2026-09-08 一步到位嵌入）
//!
//! 将 `main.rs` 的启动组装链（事件订阅者 / AppState / 帮助中心与 schema 防御 /
//! GraphQL 聚合层 / 事件总线 / 430 条业务路由 / 遗留前缀别名 / GraphQL 端点 / CORS）
//! 提取为可复用 `build_router`：
//! - 独立部署：`main.rs` 构造 public 路由（health/metrics/plugins/home）后调用本函数
//! - 模块化单体：`topems-server` 的 `portal_real_module`（feature `module-portal`）
//!   以同一入口嵌入，传空 public 路由
//!
//! 与独立部署共享同一份组装逻辑，避免双轨漂移。

use axum::{
    response::IntoResponse,
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;
use topems_shared::auth::auth_middleware;
use topems_shared::{create_api_info_router, create_cors_layer, register_routes_with_legacy_alias};
use topems_shared_auth::middleware::require_permission;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_core::logging::request_context_middleware;
use topems_shared_db::rls::rls_middleware;
use topems_shared_event::event::EventPublisher;
use topems_shared_observability::telemetry::telemetry_middleware;

use crate::models;
use crate::modules;
use crate::shared::AppState;
use crate::ApiDoc;
use utoipa::OpenApi;

/// V38.0: WebSocket 活跃连接数计数器（嵌入式与独立部署共用；独立部署 main.rs 另有同名单份）
static WS_CONNECTION_COUNT: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

pub fn get_ws_connection_count() -> usize {
    WS_CONNECTION_COUNT.load(std::sync::atomic::Ordering::Relaxed)
}

fn increment_ws_connections() {
    WS_CONNECTION_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
}

fn decrement_ws_connections() {
    WS_CONNECTION_COUNT.fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
}

/// 构建 Portal 业务路由（业务 API + GraphQL 聚合层 + 事件总线 + 遗留别名 + CORS）
///
/// - `db`：portal schema 连接池（search_path=portal,public）
/// - `migrate_pool`：DDL owner 连接池（帮助中心 / portal schema 防御建表用）
/// - `event_publisher`：事件发布器
/// - `public_routes`：调用方提供的健康/指标/首页等入口路由（无 state 依赖）；
///   独立部署传 `main.rs` 构造的 public 路由，server 嵌入传空 `Router::new()`
pub async fn build_router(
    db: sqlx::PgPool,
    migrate_pool: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    public_routes: Router<AppState>,
) -> anyhow::Result<Router> {
    if let Err(e) =
        crate::event_handlers::start_event_subscribers(db.clone(), event_publisher.clone()).await
    {
        tracing::warn!("⚠️ PORTAL 事件订阅者启动失败: {}", e);
    }

    let app_state = AppState::new(db.clone(), event_publisher.clone()).await;

    // V68.1 A2.4.2: 帮助中心数据表初始化（DDL 走 MIGRATE_URL owner 池）
    if let Err(e) = modules::help::init_database(&migrate_pool).await {
        tracing::warn!("help center tables skipped: {}", e);
    } else {
        tracing::info!("✅ 帮助中心模块已初始化（Portal BFF）");
    }

    // Portal 全模块增量迁移 + schema 自检（115 表 / 728 列，DDL 走 owner 池）
    if let Err(e) = models::schema_defense::run_schema_migration_and_verify(&migrate_pool).await {
        tracing::warn!("⚠️ Portal schema 防御初始化失败（不阻塞启动）: {}", e);
    }

    // V33.0 Portal BFF Phase 3: GraphQL 聚合层
    let graphql_schema = modules::graphql_schema::build_schema(app_state.clone());

    // V39.0 Phase 9: 启动事件总线后端（Redis PubSub 或降级为内存广播 + 演示模拟器）
    {
        let event_bus = modules::graphql_schema::global_event_bus().clone();
        tokio::spawn(async move {
            if modules::graphql_schema::try_redis_pubsub().await {
                if !modules::graphql_schema::try_start_redis_listener(event_bus.clone()) {
                    tracing::warn!("⚠️ Redis 监听启动失败，降级为演示模拟器");
                    modules::graphql_schema::start_demo_simulator(event_bus);
                }
            } else {
                tracing::info!("📡 Redis 不可用，启动演示事件模拟器（每 30 秒模拟事件）");
                modules::graphql_schema::start_demo_simulator(event_bus);
            }
        });
    }

    let cors = create_cors_layer();

    let protected_routes = Router::new()
        .route("/services", get(modules::services::list_services))
        .route("/todos", get(modules::todos::get_todos))
        .route("/todos", post(modules::todos::add_todo))
        .route("/todos/{id}", post(modules::todos::complete_todo))
        .route("/todos/{id}", delete(modules::todos::delete_todo))
        .route("/user", get(modules::user::get_user_info))
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
        // ===== V68.1 A2.4.2: 帮助中心（FAQ + 新手指南） =====
        .route("/help/faqs", get(modules::help::faq::list_faqs))
        .route(
            "/help/faqs/categories",
            get(modules::help::faq::get_faq_categories),
        )
        .route("/help/faqs/{id}", get(modules::help::faq::get_faq))
        .route("/help/guides", get(modules::help::guide::list_guides))
        .route(
            "/help/guides/categories",
            get(modules::help::guide::get_guide_categories),
        )
        .route("/help/guides/{id}", get(modules::help::guide::get_guide))
        // Help 管理操作（写入操作需要认证；当前 Portal BFF 无细粒度 require_permission，
        // 后续可基于 Portal 权限体系补充 help:write 守卫）
        .route("/help/faqs", post(modules::help::faq::create_faq))
        .route(
            "/help/faqs/{id}",
            put(modules::help::faq::update_faq).delete(modules::help::faq::delete_faq),
        )
        .route("/help/guides", post(modules::help::guide::create_guide))
        .route(
            "/help/guides/{guide_id}/lessons",
            post(modules::help::guide::add_lesson),
        )
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            rls_middleware,
        ))
        .layer(axum::middleware::from_fn(require_permission(
            "portal:admin",
        )))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

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

    let protected_routes = protected_routes.with_state(app_state.clone());

    let app = register_routes_with_legacy_alias(
        public_routes,
        "/api/portal",
        &["/api/v1/portal"],
        protected_routes,
    )
    .merge(create_api_info_router("topems-portal"))
    // V33.0 Portal BFF Phase 3: GraphQL 聚合端点
    // V34.0 Portal BFF Phase 4: 新增 Subscription WebSocket 端点
    // V36.0 Phase 5: 新增 GET 方法支持 + Cache-Control 头（CDN 边缘缓存）
    // V37.0 Phase 7: 新增 ETag 头（基于缓存版本号）+ cache-version 端点
    // V39.0 Track E: 查询白名单 + 安全哈希验证 + 审计日志 + 差异化缓存
    .route(
        "/api/portal/graphql",
        post({
            let schema = graphql_schema.clone();
            move |headers: axum::http::HeaderMap, req: async_graphql_axum::GraphQLRequest| {
                let schema = schema.clone();
                async move {
                    let inner = req.into_inner();

                    // V40.0 Track E: 提取客户端 IP
                    let client_ip = modules::graphql_schema::extract_client_ip_from_headers(
                        |name| headers.get(name).and_then(|v| v.to_str().ok()),
                    );

                    // V40.0 Track E: 检查 IP 黑名单
                    if let Err(msg) = modules::graphql_schema::check_ip_blacklist(&client_ip) {
                        return (
                            axum::http::StatusCode::FORBIDDEN,
                            axum::Json(serde_json::json!({
                                "errors": [{ "message": msg }],
                                "data": null
                            })),
                        )
                            .into_response();
                    }

                    // V40.0 Track E: 速率限制检查
                    if let Err(msg) = modules::graphql_schema::check_rate_limit(&client_ip) {
                        return (
                            axum::http::StatusCode::TOO_MANY_REQUESTS,
                            axum::Json(serde_json::json!({
                                "errors": [{ "message": msg }],
                                "data": null
                            })),
                        )
                            .into_response();
                    }

                    // V39.0 Track E: 提取 APQ 查询哈希
                    let query_hash =
                        modules::graphql_schema::extract_query_hash(&inner.extensions);
                    let operation_name = inner.operation_name.clone();
                    let query_clone = inner.query.clone();

                    // V39.0 Track E: 查询白名单检查
                    if modules::graphql_schema::is_whitelist_enabled() {
                        match &query_hash {
                            Some(hash) => {
                                if !modules::graphql_schema::is_query_allowed(hash) {
                                    return async_graphql_axum::GraphQLResponse::from(
                                        modules::graphql_schema::create_whitelist_error_response(
                                            hash,
                                        ),
                                    )
                                    .into_response();
                                }
                            }
                            None => {
                                return async_graphql_axum::GraphQLResponse::from(
                                    modules::graphql_schema::create_no_hash_error_response(),
                                )
                                .into_response();
                            }
                        }
                    }

                    // V39.0 Track E: 安全哈希验证（查询内容与哈希匹配检查）
                    if let (Some(ref hash), ref query) = (&query_hash, &inner.query) {
                        if !query.is_empty()
                            && !modules::graphql_schema::verify_query_hash(query, hash)
                        {
                            // V40.0 Track E: 记录哈希不匹配安全事件
                            modules::graphql_schema::record_security_event(
                                modules::graphql_schema::SecurityEventType::HashMismatch,
                                Some(client_ip.clone()),
                                Some(hash.clone()),
                                format!("Query content does not match hash '{}'", hash),
                            );
                            return async_graphql_axum::GraphQLResponse::from(
                                modules::graphql_schema::create_hash_mismatch_error_response(hash),
                            )
                            .into_response();
                        }
                    }

                    // V40.0 Track E: 查询深度验证
                    if !query_clone.is_empty() {
                        if let Err(msg) = modules::graphql_schema::validate_query_depth(
                            &query_clone,
                            Some(&client_ip),
                            query_hash.as_deref(),
                        ) {
                            return (
                                axum::http::StatusCode::BAD_REQUEST,
                                axum::Json(serde_json::json!({
                                    "errors": [{ "message": msg }],
                                    "data": null
                                })),
                            )
                                .into_response();
                        }
                    }

                    // V40.0 Track E: 查询复杂度验证
                    if !query_clone.is_empty() {
                        if let Err(msg) = modules::graphql_schema::validate_query_complexity(
                            &query_clone,
                            Some(&client_ip),
                            query_hash.as_deref(),
                        ) {
                            return (
                                axum::http::StatusCode::BAD_REQUEST,
                                axum::Json(serde_json::json!({
                                    "errors": [{ "message": msg }],
                                    "data": null
                                })),
                            )
                                .into_response();
                        }
                    }

                    let start = std::time::Instant::now();
                    let result = schema.execute(inner).await;
                    let duration_ms = start.elapsed().as_millis() as u64;
                    let success = result.errors.is_empty();

                    // V39.0 Track E: 记录查询审计日志
                    let complexity =
                        modules::graphql_schema::estimate_query_complexity(&query_clone);
                    let depth = modules::graphql_schema::estimate_query_depth(&query_clone);
                    modules::graphql_schema::record_query_audit(
                        modules::graphql_schema::QueryAuditLog {
                            query_hash,
                            operation_name,
                            complexity,
                            depth,
                            duration_ms,
                            user_id: None,
                            timestamp: chrono::Utc::now(),
                            success,
                        },
                    );

                    let resp: async_graphql_axum::GraphQLResponse = result.into();
                    resp.into_response()
                }
            }
        })
        .get({
            let schema = graphql_schema.clone();
            move |headers: axum::http::HeaderMap, req: async_graphql_axum::GraphQLRequest| {
                let schema = schema.clone();
                async move {
                    let inner = req.into_inner();

                    // V40.0 Track E: 提取客户端 IP
                    let client_ip = modules::graphql_schema::extract_client_ip_from_headers(
                        |name| headers.get(name).and_then(|v| v.to_str().ok()),
                    );

                    // V40.0 Track E: 检查 IP 黑名单
                    if let Err(msg) = modules::graphql_schema::check_ip_blacklist(&client_ip) {
                        return (
                            axum::http::StatusCode::FORBIDDEN,
                            [
                                (
                                    axum::http::header::CACHE_CONTROL,
                                    axum::http::HeaderValue::from_static("no-store"),
                                ),
                            ],
                            axum::Json(serde_json::json!({
                                "errors": [{ "message": msg }],
                                "data": null
                            })),
                        )
                            .into_response();
                    }

                    // V40.0 Track E: 速率限制检查
                    if let Err(msg) = modules::graphql_schema::check_rate_limit(&client_ip) {
                        return (
                            axum::http::StatusCode::TOO_MANY_REQUESTS,
                            [
                                (
                                    axum::http::header::CACHE_CONTROL,
                                    axum::http::HeaderValue::from_static("no-store"),
                                ),
                            ],
                            axum::Json(serde_json::json!({
                                "errors": [{ "message": msg }],
                                "data": null
                            })),
                        )
                            .into_response();
                    }

                    // V39.0 Track E: 提取 APQ 查询哈希
                    let query_hash =
                        modules::graphql_schema::extract_query_hash(&inner.extensions);
                    let operation_name = inner.operation_name.clone();
                    let query_clone = inner.query.clone();

                    // V39.0 Track E: 查询白名单检查
                    if modules::graphql_schema::is_whitelist_enabled() {
                        match &query_hash {
                            Some(hash) => {
                                if !modules::graphql_schema::is_query_allowed(hash) {
                                    let error_resp =
                                        modules::graphql_schema::create_whitelist_error_response(
                                            hash,
                                        );
                                    let body =
                                        serde_json::to_string(&error_resp).unwrap_or_default();
                                    return (
                                        [
                                            (
                                                axum::http::header::CACHE_CONTROL,
                                                axum::http::HeaderValue::from_static("no-store"),
                                            ),
                                            (
                                                axum::http::header::ETAG,
                                                axum::http::HeaderValue::from_static(
                                                    "\"graphql-error\"",
                                                ),
                                            ),
                                        ],
                                        axum::Json(
                                            serde_json::from_str::<serde_json::Value>(&body)
                                                .unwrap_or_default(),
                                        ),
                                    )
                                        .into_response();
                                }
                            }
                            None => {
                                let error_resp =
                                    modules::graphql_schema::create_no_hash_error_response();
                                let body =
                                    serde_json::to_string(&error_resp).unwrap_or_default();
                                return (
                                    [
                                        (
                                            axum::http::header::CACHE_CONTROL,
                                            axum::http::HeaderValue::from_static("no-store"),
                                        ),
                                        (
                                            axum::http::header::ETAG,
                                            axum::http::HeaderValue::from_static(
                                                "\"graphql-error\"",
                                            ),
                                        ),
                                    ],
                                    axum::Json(
                                        serde_json::from_str::<serde_json::Value>(&body)
                                            .unwrap_or_default(),
                                    ),
                                )
                                    .into_response();
                            }
                        }
                    }

                    // V39.0 Track E: 安全哈希验证
                    if let (Some(ref hash), ref query) = (&query_hash, &inner.query) {
                        if !query.is_empty()
                            && !modules::graphql_schema::verify_query_hash(query, hash)
                        {
                            // V40.0 Track E: 记录哈希不匹配安全事件
                            modules::graphql_schema::record_security_event(
                                modules::graphql_schema::SecurityEventType::HashMismatch,
                                Some(client_ip.clone()),
                                Some(hash.clone()),
                                format!("Query content does not match hash '{}'", hash),
                            );
                            let error_resp =
                                modules::graphql_schema::create_hash_mismatch_error_response(hash);
                            let body = serde_json::to_string(&error_resp).unwrap_or_default();
                            return (
                                [
                                    (
                                        axum::http::header::CACHE_CONTROL,
                                        axum::http::HeaderValue::from_static("no-store"),
                                    ),
                                    (
                                        axum::http::header::ETAG,
                                        axum::http::HeaderValue::from_static("\"graphql-error\""),
                                    ),
                                ],
                                axum::Json(
                                    serde_json::from_str::<serde_json::Value>(&body)
                                        .unwrap_or_default(),
                                ),
                            )
                                .into_response();
                        }
                    }

                    // V40.0 Track E: 查询深度验证
                    if !query_clone.is_empty() {
                        if let Err(msg) = modules::graphql_schema::validate_query_depth(
                            &query_clone,
                            Some(&client_ip),
                            query_hash.as_deref(),
                        ) {
                            return (
                                axum::http::StatusCode::BAD_REQUEST,
                                [
                                    (
                                        axum::http::header::CACHE_CONTROL,
                                        axum::http::HeaderValue::from_static("no-store"),
                                    ),
                                ],
                                axum::Json(serde_json::json!({
                                    "errors": [{ "message": msg }],
                                    "data": null
                                })),
                            )
                                .into_response();
                        }
                    }

                    // V40.0 Track E: 查询复杂度验证
                    if !query_clone.is_empty() {
                        if let Err(msg) = modules::graphql_schema::validate_query_complexity(
                            &query_clone,
                            Some(&client_ip),
                            query_hash.as_deref(),
                        ) {
                            return (
                                axum::http::StatusCode::BAD_REQUEST,
                                [
                                    (
                                        axum::http::header::CACHE_CONTROL,
                                        axum::http::HeaderValue::from_static("no-store"),
                                    ),
                                ],
                                axum::Json(serde_json::json!({
                                    "errors": [{ "message": msg }],
                                    "data": null
                                })),
                            )
                                .into_response();
                        }
                    }

                    let start = std::time::Instant::now();
                    let result = schema.execute(inner).await;
                    let duration_ms = start.elapsed().as_millis() as u64;
                    let success = result.errors.is_empty();

                    // V39.0 Track E: 记录查询审计日志
                    let complexity =
                        modules::graphql_schema::estimate_query_complexity(&query_clone);
                    let depth = modules::graphql_schema::estimate_query_depth(&query_clone);
                    modules::graphql_schema::record_query_audit(
                        modules::graphql_schema::QueryAuditLog {
                            query_hash,
                            operation_name,
                            complexity,
                            depth,
                            duration_ms,
                            user_id: None,
                            timestamp: chrono::Utc::now(),
                            success,
                        },
                    );

                    let body = serde_json::to_string(&result).unwrap_or_default();
                    // V37.0: 基于缓存版本号生成 ETag，订阅事件推送时版本递增使缓存失效
                    let cache_version = modules::graphql_schema::get_cache_version();
                    let etag = axum::http::HeaderValue::from_str(
                        format!("\"graphql-v{}\"", cache_version).as_str(),
                    )
                    .unwrap_or_else(|_| axum::http::HeaderValue::from_static("\"graphql-v0\""));

                    // V39.0 Track E: 基于查询复杂度设置差异化 Cache-Control 头
                    let cache_tier =
                        modules::graphql_schema::determine_cache_tier_for_query(&query_clone);
                    let cache_control =
                        axum::http::HeaderValue::from_static(
                            modules::graphql_schema::cache_control_header(cache_tier),
                        );

                    (
                        [
                            (axum::http::header::CACHE_CONTROL, cache_control),
                            (axum::http::header::ETAG, etag),
                        ],
                        axum::Json(
                            match serde_json::from_str::<serde_json::Value>(&body) {
                                Ok(j) => j,
                                Err(e) => {
                                    tracing::warn!("Failed to deserialize GraphQL cache body: {}", e);
                                    serde_json::Value::Null
                                }
                            },
                        ),
                    )
                        .into_response()
                }
            }
        }),
    )
    // V39.0 Track E: 查询白名单管理端点
    // GET /api/portal/graphql/whitelist — 返回白名单状态和前 10 个哈希
    .route(
        "/api/portal/graphql/whitelist",
        get(|| async move {
            let enabled = modules::graphql_schema::is_whitelist_enabled();
            let size = modules::graphql_schema::get_whitelist_size();
            let preview = modules::graphql_schema::get_whitelist_preview(10);
            axum::Json(serde_json::json!({
                "enabled": enabled,
                "size": size,
                "preview": preview,
            }))
        }),
    )
    // V39.0 Track E: 添加查询哈希到白名单
    // POST /api/portal/graphql/whitelist/add — body: { "hash": "..." }
    .route(
        "/api/portal/graphql/whitelist/add",
        post(|body: axum::Json<serde_json::Value>| async move {
            let hash = body
                .get("hash")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            match hash {
                Some(h) => {
                    modules::graphql_schema::add_to_whitelist(h.clone());
                    axum::Json(serde_json::json!({
                        "success": true,
                        "hash": h,
                        "size": modules::graphql_schema::get_whitelist_size(),
                    }))
                }
                None => axum::Json(serde_json::json!({
                    "success": false,
                    "error": "Missing 'hash' field in request body",
                })),
            }
        }),
    )
    // V39.0 Track E: 查询审计日志端点
    // GET /api/portal/graphql/audit-logs?limit=50 — 返回最近的审计日志
    .route(
        "/api/portal/graphql/audit-logs",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
       >| async move {
            let limit: usize = params
                .get("limit")
                .and_then(|s| s.parse().ok())
                .unwrap_or(50)
                .min(1000);
            let logs = modules::graphql_schema::get_query_audit_logs(limit);
            let total = modules::graphql_schema::get_audit_log_count();
            axum::Json(serde_json::json!({
                "logs": logs,
                "count": logs.len(),
                "total": total,
            }))
        }),
    )
    // ==================== V40.0 Track E: GraphQL 安全管理端点 ====================
    //
    // GET /api/portal/graphql/security/stats — 安全统计
    .route(
        "/api/portal/graphql/security/stats",
        get(|| async move {
            let stats = modules::graphql_schema::get_security_stats();
            axum::Json(stats)
        }),
    )
    // GET /api/portal/graphql/security/events?limit=50 — 安全事件列表
    .route(
        "/api/portal/graphql/security/events",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
       >| async move {
            let limit: usize = params
                .get("limit")
                .and_then(|s| s.parse().ok())
                .unwrap_or(50)
                .min(500);
            let events = modules::graphql_schema::get_security_events(limit);
            let total = modules::graphql_schema::get_security_event_count();
            axum::Json(serde_json::json!({
                "events": events,
                "count": events.len(),
                "total": total,
            }))
        }),
    )
    // GET /api/portal/graphql/security/blacklist — 获取 IP 黑名单列表
    .route(
        "/api/portal/graphql/security/blacklist",
        get(|| async move {
            let list = modules::graphql_schema::get_ip_blacklist();
            let size = modules::graphql_schema::get_ip_blacklist_size();
            axum::Json(serde_json::json!({
                "blacklist": list,
                "size": size,
            }))
        }),
    )
    // POST /api/portal/graphql/security/blacklist/add — 添加 IP 到黑名单
    // body: { "ip": "192.168.1.1" }
    .route(
        "/api/portal/graphql/security/blacklist/add",
        post(|body: axum::Json<serde_json::Value>| async move {
            let ip = body
                .get("ip")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            match ip {
                Some(ip_addr) => {
                    modules::graphql_schema::add_to_ip_blacklist(ip_addr.clone());
                    axum::Json(serde_json::json!({
                        "success": true,
                        "ip": ip_addr,
                        "size": modules::graphql_schema::get_ip_blacklist_size(),
                    }))
                }
                None => axum::Json(serde_json::json!({
                    "success": false,
                    "error": "Missing 'ip' field in request body",
                })),
            }
        }),
    )
    // POST /api/portal/graphql/security/blacklist/remove — 从黑名单移除 IP
    // body: { "ip": "192.168.1.1" }
    .route(
        "/api/portal/graphql/security/blacklist/remove",
        post(|body: axum::Json<serde_json::Value>| async move {
            let ip = body
                .get("ip")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            match ip {
                Some(ip_addr) => {
                    modules::graphql_schema::remove_from_ip_blacklist(&ip_addr);
                    axum::Json(serde_json::json!({
                        "success": true,
                        "ip": ip_addr,
                        "size": modules::graphql_schema::get_ip_blacklist_size(),
                    }))
                }
                None => axum::Json(serde_json::json!({
                    "success": false,
                    "error": "Missing 'ip' field in request body",
                })),
            }
        }),
    )
    // ==================== V41.0 Track E: GraphQL 运维管理端点 ====================
    //
    // GET /api/portal/graphql/ops/discovered-queries — 发现的查询列表
    .route(
        "/api/portal/graphql/ops/discovered-queries",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
        >| async move {
            let status = params.get("status").cloned();
            let status_enum = status.as_deref().and_then(|s| match s {
                "new" => Some(modules::graphql_schema::DiscoveryStatus::New),
                "under_review" => Some(modules::graphql_schema::DiscoveryStatus::UnderReview),
                "approved" => Some(modules::graphql_schema::DiscoveryStatus::Approved),
                "rejected" => Some(modules::graphql_schema::DiscoveryStatus::Rejected),
                _ => None,
            });
            let queries = modules::graphql_schema::get_discovered_queries(status_enum);
            axum::Json(serde_json::json!({
                "queries": queries,
                "count": queries.len(),
            }))
        }),
    )
    // POST /api/portal/graphql/ops/discovered-queries/{hash}/approve — 审批通过
    .route(
        "/api/portal/graphql/ops/discovered-queries/{hash}/approve",
        post(|axum::extract::Path(hash): axum::extract::Path<String>| async move {
            let success = modules::graphql_schema::approve_discovered_query(&hash, Some("admin"));
            axum::Json(serde_json::json!({
                "success": success,
                "hash": hash,
            }))
        }),
    )
    // POST /api/portal/graphql/ops/discovered-queries/{hash}/reject — 拒绝
    .route(
        "/api/portal/graphql/ops/discovered-queries/{hash}/reject",
        post(|axum::extract::Path(hash): axum::extract::Path<String>| async move {
            let success = modules::graphql_schema::reject_discovered_query(&hash, Some("admin"));
            axum::Json(serde_json::json!({
                "success": success,
                "hash": hash,
            }))
        }),
    )
    // GET /api/portal/graphql/ops/auto-approval-policy — 获取自动审批策略
    .route(
        "/api/portal/graphql/ops/auto-approval-policy",
        get(|| async move {
            let policy = modules::graphql_schema::get_auto_approval_policy();
            axum::Json(policy)
        }),
    )
    // PUT /api/portal/graphql/ops/auto-approval-policy — 更新自动审批策略
    .route(
        "/api/portal/graphql/ops/auto-approval-policy",
        put(|body: axum::Json<serde_json::Value>| async move {
            use modules::graphql_schema::AutoApprovalPolicyInput;
            let input = AutoApprovalPolicyInput {
                enabled: body.get("enabled").and_then(|v| v.as_bool()),
                min_calls_for_auto: body.get("min_calls_for_auto").and_then(|v| v.as_i64()).map(|v| v as i32),
                max_depth_for_auto: body.get("max_depth_for_auto").and_then(|v| v.as_i64()).map(|v| v as i32),
                max_complexity_for_auto: body.get("max_complexity_for_auto").and_then(|v| v.as_f64()),
                unique_sources_min: body.get("unique_sources_min").and_then(|v| v.as_i64()).map(|v| v as i32),
                min_age_hours: body.get("min_age_hours").and_then(|v| v.as_i64()).map(|v| v as i32),
            };
            let success = modules::graphql_schema::update_auto_approval_policy(input);
            let policy = modules::graphql_schema::get_auto_approval_policy();
            axum::Json(serde_json::json!({
                "success": success,
                "policy": policy,
            }))
        }),
    )
    // POST /api/portal/graphql/ops/auto-approval/scan — 触发自动审批扫描
    .route(
        "/api/portal/graphql/ops/auto-approval/scan",
        post(|| async move {
            let approved = modules::graphql_schema::run_auto_approval_scan();
            axum::Json(serde_json::json!({
                "success": true,
                "approved_count": approved,
            }))
        }),
    )
    // GET /api/portal/graphql/ops/security-report?period=daily — 安全报表
    .route(
        "/api/portal/graphql/ops/security-report",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
        >| async move {
            let period = params.get("period").cloned().unwrap_or_else(|| "daily".to_string());
            let report = modules::graphql_schema::generate_security_report(&period);
            axum::Json(report)
        }),
    )
    // GET /api/portal/graphql/ops/performance-tuning — 性能调优建议
    .route(
        "/api/portal/graphql/ops/performance-tuning",
        get(|| async move {
            let suggestions = modules::graphql_schema::get_performance_tuning_suggestions();
            axum::Json(serde_json::json!({
                "suggestions": suggestions,
                "count": suggestions.len(),
            }))
        }),
    )
    // GET /api/portal/graphql/ops/performance-analysis — 性能分析
    .route(
        "/api/portal/graphql/ops/performance-analysis",
        get(|| async move {
            let analysis = modules::graphql_schema::get_performance_analysis();
            axum::Json(analysis)
        }),
    )
    // GET /api/portal/graphql/ops/whitelist-health — 白名单健康度
    .route(
        "/api/portal/graphql/ops/whitelist-health",
        get(|| async move {
            let health = modules::graphql_schema::get_whitelist_health();
            axum::Json(health)
        }),
    )
    // V37.0 Phase 7: CDN 缓存版本查询端点
    // 客户端/CDN 可轮询此端点检查缓存是否过期（轻量级，无需执行 GraphQL 查询）
    .route(
        "/api/portal/graphql/cache-version",
        get(|| async move {
            let version = modules::graphql_schema::get_cache_version();
            (
                [(axum::http::header::CACHE_CONTROL, "no-cache")],
                axum::Json(serde_json::json!({ "cache_version": version })),
            )
        }),
    )
    // V34.0: GraphQL Subscription WebSocket 端点
    // V38.0: 添加连接计数
    .route(
        "/api/portal/graphql/ws",
        get({
            let schema = graphql_schema.clone();
            move |protocol: async_graphql_axum::GraphQLProtocol,
                  ws: axum::extract::WebSocketUpgrade| {
                let schema = schema.clone();
                async move {
                    increment_ws_connections();
                    ws.protocols(async_graphql::http::ALL_WEBSOCKET_PROTOCOLS)
                        .on_upgrade(move |socket| {
                            let schema = schema.clone();
                            async move {
                                let result = async_graphql_axum::GraphQLWebSocket::new(socket, schema, protocol)
                                    .serve()
                                    .await;
                                decrement_ws_connections();
                                result
                            }
                        })
                }
            }
        }),
    )
    // V38.0: 订阅统计端点
    .route(
        "/api/portal/graphql/subscription-stats",
        get(|| async move {
            let ws_connections = get_ws_connection_count();
            let active_subscriptions = modules::graphql_schema::get_active_subscriptions();
            axum::Json(serde_json::json!({
                "ws_connections": ws_connections,
                "active_subscriptions": active_subscriptions,
                "timestamp": chrono::Utc::now().to_rfc3339(),
            }))
        }),
    )
    // V39.0 Phase 9: 事件频道列表端点
    .route(
        "/api/portal/graphql/events",
        get(|| async move {
            axum::Json(serde_json::json!({
                "channels": [
                    {
                        "name": "service_health_changed",
                        "description": "服务健康状态变化（每 30 秒推送）",
                        "filter": null,
                    },
                    {
                        "name": "master_data_changed",
                        "description": "主数据变更事件（客户/供应商/物料/员工等）",
                        "filter": "domain (可选)",
                    },
                    {
                        "name": "notification_received",
                        "description": "通知接收事件",
                        "filter": "user_id (必填)",
                    },
                    {
                        "name": "workflow_task_assigned",
                        "description": "工作流任务分配事件",
                        "filter": "assignee_id (必填)",
                    },
                    {
                        "name": "order_status_changed",
                        "description": "订单状态变更事件",
                        "filter": "order_type (可选)",
                    },
                ],
                "websocket_url": "/api/portal/graphql/ws",
                "timestamp": chrono::Utc::now().to_rfc3339(),
            }))
        }),
    )
    .route(
        "/api/portal/graphiql",
        get(|| async {
            axum::response::Html(r#"<!DOCTYPE html>
<html><head><title>TOPEMS Portal GraphQL</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphiql@3.0.10/graphiql.min.css">
</head>
<body style="margin:0"><div id="graphiql" style="height:100vh"></div>
<script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/graphiql@3.0.10/graphiql.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@graphiql/toolkit@0.11.2/dist/index.umd.js"></script>
<script>window.onload=()=>{const wsUrl=`ws://${location.host}/api/portal/graphql/ws`;const fetcher=GraphiQLToolkit.createGraphiQLFetcher({url:'/api/portal/graphql',subscriptionUrl:wsUrl});const r=ReactDOM.createRoot(document.getElementById('graphiql'));r.render(React.createElement(GraphiQL,{fetcher}));};</script>
</body></html>"#)
        }),
    )
    .route(
        "/api-docs/openapi.json",
        get(|| async {
            serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
                tracing::error!("Failed to serialize OpenAPI spec: {}", e);
                "{}".to_string()
            })
        }),
    )
    // ==================== V42.0 Track E: GraphQL 企业级安全端点 ====================
    //
    // GET /api/portal/graphql/security/field-permissions — 字段权限列表
    .route(
        "/api/portal/graphql/security/field-permissions",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
        >| async move {
            let entity_type = params.get("entity_type").cloned();
            let permissions =
                modules::graphql_schema::get_field_permissions(entity_type.as_deref());
            axum::Json(serde_json::json!({
                "permissions": permissions,
                "count": permissions.len(),
            }))
        }),
    )
    // POST /api/portal/graphql/security/field-permissions — 设置字段权限
    .route(
        "/api/portal/graphql/security/field-permissions",
        post(|body: axum::Json<serde_json::Value>| async move {
            use modules::graphql_schema::{set_field_permission, FieldPermission};
            let entity_type = body
                .get("entity_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let field_name = body
                .get("field_name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let allowed_roles = body
                .get("allowed_roles")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let denied_roles = body
                .get("denied_roles")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let condition = body
                .get("condition")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let perm = FieldPermission {
                entity_type,
                field_name,
                allowed_roles,
                denied_roles,
                condition,
            };
            set_field_permission(perm.clone());
            axum::Json(serde_json::json!({ "success": true, "permission": perm }))
        }),
    )
    // DELETE /api/portal/graphql/security/field-permissions — 移除字段权限
    .route(
        "/api/portal/graphql/security/field-permissions",
        delete(|body: axum::Json<serde_json::Value>| async move {
            let entity_type = body
                .get("entity_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let field_name = body
                .get("field_name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let success =
                modules::graphql_schema::remove_field_permission(&entity_type, &field_name);
            axum::Json(serde_json::json!({
                "success": success,
                "entity_type": entity_type,
                "field_name": field_name,
            }))
        }),
    )
    // GET /api/portal/graphql/security/masking-rules — 掩码规则列表
    .route(
        "/api/portal/graphql/security/masking-rules",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
        >| async move {
            let entity_type = params.get("entity_type").cloned();
            let rules = modules::graphql_schema::get_masking_rules(entity_type.as_deref());
            axum::Json(serde_json::json!({
                "rules": rules,
                "count": rules.len(),
            }))
        }),
    )
    // POST /api/portal/graphql/security/masking-rules — 设置掩码规则
    .route(
        "/api/portal/graphql/security/masking-rules",
        post(|body: axum::Json<serde_json::Value>| async move {
            use modules::graphql_schema::{set_masking_rule, MaskingRule, MaskType};
            let entity_type = body
                .get("entity_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let field_name = body
                .get("field_name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let mask_type = body
                .get("mask_type")
                .and_then(|v| v.as_str())
                .map(MaskType::from_str)
                .unwrap_or(MaskType::Full);
            let exempt_roles = body
                .get("exempt_roles")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let rule = MaskingRule {
                entity_type,
                field_name,
                mask_type,
                exempt_roles,
            };
            set_masking_rule(rule.clone());
            axum::Json(serde_json::json!({ "success": true, "rule": rule }))
        }),
    )
    // DELETE /api/portal/graphql/security/masking-rules — 移除掩码规则
    .route(
        "/api/portal/graphql/security/masking-rules",
        delete(|body: axum::Json<serde_json::Value>| async move {
            let entity_type = body
                .get("entity_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let field_name = body
                .get("field_name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let success =
                modules::graphql_schema::remove_masking_rule(&entity_type, &field_name);
            axum::Json(serde_json::json!({
                "success": success,
                "entity_type": entity_type,
                "field_name": field_name,
            }))
        }),
    )
    // GET /api/portal/graphql/security/field-access-audits — 字段访问审计
    .route(
        "/api/portal/graphql/security/field-access-audits",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
        >| async move {
            let limit = params
                .get("limit")
                .and_then(|s| s.parse::<usize>().ok())
                .unwrap_or(100);
            let entity_type = params.get("entity_type").cloned();
            let audits = modules::graphql_schema::get_field_access_audits(limit, entity_type.as_deref());
            let total = modules::graphql_schema::get_field_access_audit_count();
            axum::Json(serde_json::json!({
                "audits": audits,
                "count": audits.len(),
                "total": total,
            }))
        }),
    )
    // GET /api/portal/graphql/security/data-change-audits — 数据变更审计
    .route(
        "/api/portal/graphql/security/data-change-audits",
        get(|axum::extract::Query(params): axum::extract::Query<
            std::collections::HashMap<String, String>,
        >| async move {
            let limit = params
                .get("limit")
                .and_then(|s| s.parse::<usize>().ok())
                .unwrap_or(100);
            let entity_type = params.get("entity_type").cloned();
            let audits = modules::graphql_schema::get_data_change_audits(limit, entity_type.as_deref());
            let total = modules::graphql_schema::get_data_change_audit_count();
            axum::Json(serde_json::json!({
                "audits": audits,
                "count": audits.len(),
                "total": total,
            }))
        }),
    )
    // GET /api/portal/graphql/security/config — 安全配置
    .route(
        "/api/portal/graphql/security/config",
        get(|| async move {
            let config = modules::graphql_schema::get_security_config();
            axum::Json(config)
        }),
    )
    // PUT /api/portal/graphql/security/config — 更新安全配置
    .route(
        "/api/portal/graphql/security/config",
        put(|body: axum::Json<serde_json::Value>| async move {
            use modules::graphql_schema::{update_security_config, SecurityConfig};
            let current = modules::graphql_schema::get_security_config();
            let new_config = SecurityConfig {
                field_permissions_enabled: body
                    .get("field_permissions_enabled")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(current.field_permissions_enabled),
                data_masking_enabled: body
                    .get("data_masking_enabled")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(current.data_masking_enabled),
                field_audit_enabled: body
                    .get("field_audit_enabled")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(current.field_audit_enabled),
                data_change_audit_enabled: body
                    .get("data_change_audit_enabled")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(current.data_change_audit_enabled),
                default_deny: body
                    .get("default_deny")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(current.default_deny),
                audit_sensitive_fields_only: body
                    .get("audit_sensitive_fields_only")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(current.audit_sensitive_fields_only),
            };
            let config = update_security_config(new_config);
            axum::Json(serde_json::json!({ "success": true, "config": config }))
        }),
    )
    // ==================== V51.0 Phase 21: GraphQL Schema 演进 + 破坏性变更检测 + 版本协商 ====================
    // POST /api/portal/schema-versioning/schema/versions — 发布新 Schema 版本
    .route(
        "/api/portal/schema-versioning/schema/versions",
        post(modules::schema_versioning::handlers::publish_schema_version_handler),
    )
    // GET /api/portal/schema-versioning/schema/versions — 列出 Schema 版本
    .route(
        "/api/portal/schema-versioning/schema/versions",
        get(modules::schema_versioning::handlers::list_schema_versions_handler),
    )
    // GET /api/portal/schema-versioning/schema/versions/{version} — 获取指定版本
    .route(
        "/api/portal/schema-versioning/schema/versions/{version}",
        get(modules::schema_versioning::handlers::get_schema_version_handler),
    )
    // PUT /api/portal/schema-versioning/schema/versions/{version}/rollback — 回滚到指定版本
    .route(
        "/api/portal/schema-versioning/schema/versions/{version}/rollback",
        put(modules::schema_versioning::handlers::rollback_schema_handler),
    )
    // GET /api/portal/schema-versioning/schema/current — 获取当前 Schema
    .route(
        "/api/portal/schema-versioning/schema/current",
        get(modules::schema_versioning::handlers::get_current_schema_handler),
    )
    // POST /api/portal/schema-versioning/schema/compare — 对比 Schema 兼容性
    .route(
        "/api/portal/schema-versioning/schema/compare",
        post(modules::schema_versioning::handlers::compare_schemas_handler),
    )
    // POST /api/portal/schema-versioning/schema/detect-breaking — 检测破坏性变更
    .route(
        "/api/portal/schema-versioning/schema/detect-breaking",
        post(modules::schema_versioning::handlers::detect_breaking_changes_handler),
    )
    // POST /api/portal/schema-versioning/negotiate — 版本协商
    .route(
        "/api/portal/schema-versioning/negotiate",
        post(modules::schema_versioning::handlers::negotiate_version_handler),
    )
    // GET /api/portal/schema-versioning/versions/supported — 获取支持的版本列表
    .route(
        "/api/portal/schema-versioning/versions/supported",
        get(modules::schema_versioning::handlers::get_supported_versions_handler),
    )
    // PUT /api/portal/schema-versioning/versions/{version}/deprecate — 废弃版本
    .route(
        "/api/portal/schema-versioning/versions/{version}/deprecate",
        put(modules::schema_versioning::handlers::deprecate_version_handler),
    )
    // ==================== V51.0 超级网关: 多协议支持 + 智能路由 + 自适应降级 ====================
    // GET /api/portal/smart-gateway/status — 网关状态
    .route(
        "/api/portal/smart-gateway/status",
        get(modules::smart_gateway::get_gateway_status_handler),
    )
    // GET /api/portal/smart-gateway/routes — 路由列表
    .route(
        "/api/portal/smart-gateway/routes",
        get(modules::smart_gateway::list_routes_handler),
    )
    // POST /api/portal/smart-gateway/routes — 创建路由
    .route(
        "/api/portal/smart-gateway/routes",
        post(modules::smart_gateway::create_route_handler),
    )
    // DELETE /api/portal/smart-gateway/routes/{id} — 删除路由
    .route(
        "/api/portal/smart-gateway/routes/{id}",
        delete(modules::smart_gateway::delete_route_handler),
    )
    // GET /api/portal/smart-gateway/protocols — 协议列表
    .route(
        "/api/portal/smart-gateway/protocols",
        get(modules::smart_gateway::list_protocols_handler),
    )
    // POST /api/portal/smart-gateway/protocols/{name}/enable — 启用协议
    .route(
        "/api/portal/smart-gateway/protocols/{name}/enable",
        post(modules::smart_gateway::enable_protocol_handler),
    )
    // POST /api/portal/smart-gateway/protocols/{name}/disable — 禁用协议
    .route(
        "/api/portal/smart-gateway/protocols/{name}/disable",
        post(modules::smart_gateway::disable_protocol_handler),
    )
    // GET /api/portal/smart-gateway/degradation/status — 降级状态
    .route(
        "/api/portal/smart-gateway/degradation/status",
        get(modules::smart_gateway::get_degradation_status_handler),
    )
    // POST /api/portal/smart-gateway/degradation/level — 设置降级级别
    .route(
        "/api/portal/smart-gateway/degradation/level",
        post(modules::smart_gateway::set_degradation_level_handler),
    )
    // POST /api/portal/smart-gateway/degradation/evaluate — 评估降级
    .route(
        "/api/portal/smart-gateway/degradation/evaluate",
        post(modules::smart_gateway::evaluate_degradation_handler),
    )
    // GET /api/portal/smart-gateway/health — 健康监控
    .route(
        "/api/portal/smart-gateway/health",
        get(modules::smart_gateway::get_health_handler),
    )
    // GET /api/portal/smart-gateway/metrics — 网关指标
    .route(
        "/api/portal/smart-gateway/metrics",
        get(modules::smart_gateway::get_metrics_handler),
    )
    // ==================== V52.0 Phase 22: 自适应执行引擎 + AI 查询优化 + 流式订阅增强 ====================
    // --- 自适应执行引擎 ---
    // POST /api/portal/adaptive-execution/execute — 执行自适应查询
    .route(
        "/api/portal/adaptive-execution/execute",
        post(modules::adaptive_execution::execute_adaptive_query_handler),
    )
    // GET /api/portal/adaptive-execution/execution/profile/{hash} — 获取执行配置
    .route(
        "/api/portal/adaptive-execution/execution/profile/{hash}",
        get(modules::adaptive_execution::get_execution_profile_handler),
    )
    // GET /api/portal/adaptive-execution/execution/metrics — 获取执行指标
    .route(
        "/api/portal/adaptive-execution/execution/metrics",
        get(modules::adaptive_execution::get_execution_metrics_handler),
    )
    // POST /api/portal/adaptive-execution/execution/configure — 配置执行策略
    .route(
        "/api/portal/adaptive-execution/execution/configure",
        post(modules::adaptive_execution::configure_strategy_handler),
    )
    // --- AI 查询优化 ---
    // POST /api/portal/adaptive-execution/optimize — 优化查询
    .route(
        "/api/portal/adaptive-execution/optimize",
        post(modules::adaptive_execution::optimize_query_handler),
    )
    // POST /api/portal/adaptive-execution/analyze — 分析查询计划
    .route(
        "/api/portal/adaptive-execution/analyze",
        post(modules::adaptive_execution::analyze_query_handler),
    )
    // GET /api/portal/adaptive-execution/optimization/suggestions — 获取优化建议
    .route(
        "/api/portal/adaptive-execution/optimization/suggestions",
        get(modules::adaptive_execution::get_optimization_suggestions_handler),
    )
    // POST /api/portal/adaptive-execution/optimization/batch — 批量优化
    .route(
        "/api/portal/adaptive-execution/optimization/batch",
        post(modules::adaptive_execution::batch_optimize_handler),
    )
    // --- 流式订阅 ---
    // POST /api/portal/adaptive-execution/streams — 创建流
    .route(
        "/api/portal/adaptive-execution/streams",
        post(modules::adaptive_execution::create_stream_handler),
    )
    // GET /api/portal/adaptive-execution/streams — 流列表
    .route(
        "/api/portal/adaptive-execution/streams",
        get(modules::adaptive_execution::list_streams_handler),
    )
    // GET /api/portal/adaptive-execution/streams/{id} — 获取流详情
    .route(
        "/api/portal/adaptive-execution/streams/{id}",
        get(modules::adaptive_execution::get_stream_handler),
    )
    // DELETE /api/portal/adaptive-execution/streams/{id} — 关闭流
    .route(
        "/api/portal/adaptive-execution/streams/{id}",
        delete(modules::adaptive_execution::close_stream_handler),
    )
    // POST /api/portal/adaptive-execution/streams/{id}/subscribe — 订阅流
    .route(
        "/api/portal/adaptive-execution/streams/{id}/subscribe",
        post(modules::adaptive_execution::subscribe_stream_handler),
    )
    // DELETE /api/portal/adaptive-execution/streams/{id}/unsubscribe — 取消订阅
    .route(
        "/api/portal/adaptive-execution/streams/{id}/unsubscribe",
        delete(modules::adaptive_execution::unsubscribe_stream_handler),
    )
    // GET /api/portal/adaptive-execution/streams/metrics — 流指标
    .route(
        "/api/portal/adaptive-execution/streams/metrics",
        get(modules::adaptive_execution::stream_metrics_handler),
    )
    // ==================== V53.0 BFF Phase 23: 联邦网关 V5 + 跨服务事务补偿 ====================
    // --- 联邦网关 ---
    // POST /api/portal/federation-gateway/subgraphs — 注册子图
    .route(
        "/api/portal/federation-gateway/subgraphs",
        post(modules::federation_gateway::register_subgraph_handler),
    )
    // GET /api/portal/federation-gateway/subgraphs — 子图列表
    .route(
        "/api/portal/federation-gateway/subgraphs",
        get(modules::federation_gateway::list_subgraphs_handler),
    )
    // DELETE /api/portal/federation-gateway/subgraphs/{id} — 删除子图
    .route(
        "/api/portal/federation-gateway/subgraphs/{id}",
        delete(modules::federation_gateway::remove_subgraph_handler),
    )
    // POST /api/portal/federation-gateway/query — 执行联邦查询
    .route(
        "/api/portal/federation-gateway/query",
        post(modules::federation_gateway::execute_federated_query_handler),
    )
    // GET /api/portal/federation-gateway/plan — 获取联邦查询计划
    .route(
        "/api/portal/federation-gateway/plan",
        get(modules::federation_gateway::get_federation_plan_handler),
    )
    // GET /api/portal/federation-gateway/health — 联邦健康检查
    .route(
        "/api/portal/federation-gateway/health",
        get(modules::federation_gateway::federation_health_handler),
    )
    // --- 跨服务事务 ---
    // POST /api/portal/federation-gateway/transactions — 启动事务
    .route(
        "/api/portal/federation-gateway/transactions",
        post(modules::federation_gateway::start_transaction_handler),
    )
    // POST /api/portal/federation-gateway/transactions/{id}/commit — 提交事务
    .route(
        "/api/portal/federation-gateway/transactions/{id}/commit",
        post(modules::federation_gateway::commit_transaction_handler),
    )
    // POST /api/portal/federation-gateway/transactions/{id}/compensate — 补偿事务
    .route(
        "/api/portal/federation-gateway/transactions/{id}/compensate",
        post(modules::federation_gateway::compensate_transaction_handler),
    )
    // GET /api/portal/federation-gateway/transactions — 事务列表
    .route(
        "/api/portal/federation-gateway/transactions",
        get(modules::federation_gateway::list_transactions_handler),
    )
    // GET /api/portal/federation-gateway/transactions/{id} — 事务详情
    .route(
        "/api/portal/federation-gateway/transactions/{id}",
        get(modules::federation_gateway::get_transaction_handler),
    )
    // POST /api/portal/federation-gateway/transactions/{id}/recover — 恢复事务
    .route(
        "/api/portal/federation-gateway/transactions/{id}/recover",
        post(modules::federation_gateway::recover_transaction_handler),
    )
    // ==================== V53.0 Phase 24: GraphQL 智能网关 — AI 驱动查询路由 + 自动 Schema Stitching ====================
    // --- AI 查询路由 ---
    // POST /api/portal/intelligent-gateway/route — AI 查询路由
    .route(
        "/api/portal/intelligent-gateway/route",
        post(modules::intelligent_gateway::route_query_handler),
    )
    // GET /api/portal/intelligent-gateway/routing/table — 路由表
    .route(
        "/api/portal/intelligent-gateway/routing/table",
        get(modules::intelligent_gateway::get_routing_table_handler),
    )
    // GET /api/portal/intelligent-gateway/affinity/{service_id} — 服务亲和度
    .route(
        "/api/portal/intelligent-gateway/affinity/{service_id}",
        get(modules::intelligent_gateway::get_affinity_handler),
    )
    // PUT /api/portal/intelligent-gateway/affinity/{service_id} — 更新亲和度
    .route(
        "/api/portal/intelligent-gateway/affinity/{service_id}",
        put(modules::intelligent_gateway::update_affinity_handler),
    )
    // POST /api/portal/intelligent-gateway/routing/warmup — 路由预热
    .route(
        "/api/portal/intelligent-gateway/routing/warmup",
        post(modules::intelligent_gateway::warm_up_routing_handler),
    )
    // --- 自动 Schema Stitching ---
    // POST /api/portal/intelligent-gateway/stitch/discover — 子图发现
    .route(
        "/api/portal/intelligent-gateway/stitch/discover",
        post(modules::intelligent_gateway::discover_subgraphs_handler),
    )
    // POST /api/portal/intelligent-gateway/stitch/plan — 生成 Stitch 计划
    .route(
        "/api/portal/intelligent-gateway/stitch/plan",
        post(modules::intelligent_gateway::generate_stitch_plan_handler),
    )
    // POST /api/portal/intelligent-gateway/stitch/execute — 执行 Stitch
    .route(
        "/api/portal/intelligent-gateway/stitch/execute",
        post(modules::intelligent_gateway::execute_stitch_handler),
    )
    // GET /api/portal/intelligent-gateway/stitch/status/{plan_id} — Stitch 状态
    .route(
        "/api/portal/intelligent-gateway/stitch/status/{plan_id}",
        get(modules::intelligent_gateway::get_stitch_status_handler),
    )
    // GET /api/portal/intelligent-gateway/stitch/validate/{plan_id} — 验证 Stitch
    .route(
        "/api/portal/intelligent-gateway/stitch/validate/{plan_id}",
        get(modules::intelligent_gateway::validate_stitch_handler),
    )
    // POST /api/portal/intelligent-gateway/stitch/rollback — 回滚 Stitch
    .route(
        "/api/portal/intelligent-gateway/stitch/rollback",
        post(modules::intelligent_gateway::rollback_stitch_handler),
    )
    // GET /api/portal/intelligent-gateway/stitch/conflicts — 类型冲突列表
    .route(
        "/api/portal/intelligent-gateway/stitch/conflicts",
        get(modules::intelligent_gateway::list_conflicts_handler),
    )
    // ==================== V54.0 BFF Phase 24: GraphQL 订阅网关 + 消息队列集成 + 实时推送优化 ====================
    // --- 订阅网关 ---
    // POST /subscription-manager/subscribe — 订阅频道
    .route(
        "/api/portal/subscription-manager/subscribe",
        post(modules::subscription_manager::subscribe_handler),
    )
    // DELETE /subscription-manager/subscribe/{subscriber_id} — 取消订阅
    .route(
        "/api/portal/subscription-manager/subscribe/{subscriber_id}",
        delete(modules::subscription_manager::unsubscribe_handler),
    )
    // GET /subscription-manager/subscribers — 活跃订阅者列表
    .route(
        "/api/portal/subscription-manager/subscribers",
        get(modules::subscription_manager::get_subscribers_handler),
    )
    // GET /subscription-manager/channels — 频道统计
    .route(
        "/api/portal/subscription-manager/channels",
        get(modules::subscription_manager::get_channels_handler),
    )
    // POST /subscription-manager/publish — 发布消息到频道
    .route(
        "/api/portal/subscription-manager/publish",
        post(modules::subscription_manager::publish_handler),
    )
    // --- 消息队列 ---
    // POST /subscription-manager/queue/publish — 发布消息到队列
    .route(
        "/api/portal/subscription-manager/queue/publish",
        post(modules::subscription_manager::publish_to_queue_handler),
    )
    // GET /subscription-manager/queue/stats — 队列统计
    .route(
        "/api/portal/subscription-manager/queue/stats",
        get(modules::subscription_manager::get_queue_stats_handler),
    )
    // POST /subscription-manager/queue/create — 创建队列
    .route(
        "/api/portal/subscription-manager/queue/create",
        post(modules::subscription_manager::create_queue_handler),
    )
    // POST /subscription-manager/queue/purge — 清空队列
    .route(
        "/api/portal/subscription-manager/queue/purge",
        post(modules::subscription_manager::purge_queue_handler),
    )
    // GET /subscription-manager/dlq — 死信队列
    .route(
        "/api/portal/subscription-manager/dlq",
        get(modules::subscription_manager::get_dlq_handler),
    )
    // --- 推送优化 ---
    // GET /subscription-manager/push/stats — 推送统计
    .route(
        "/api/portal/subscription-manager/push/stats",
        get(modules::subscription_manager::get_push_stats_handler),
    )
    // PUT /subscription-manager/push/batch-window — 设置批量窗口
    .route(
        "/api/portal/subscription-manager/push/batch-window",
        put(modules::subscription_manager::set_batch_window_handler),
    )
    // GET /subscription-manager/push/queue-length — 推送队列长度
    .route(
        "/api/portal/subscription-manager/push/queue-length",
        get(modules::subscription_manager::get_push_queue_length_handler),
    )
    // ==================== V54.0 Phase 25: GraphQL 边缘计算 — 边缘渲染 + 全球加速 + 低延迟响应 ====================
    // --- 边缘渲染 ---
    // POST /edge-computing/render — 在边缘节点渲染 GraphQL 查询
    .route(
        "/api/portal/edge-computing/render",
        post(modules::edge_computing::render_at_edge_handler),
    )
    // GET /edge-computing/status — 边缘节点状态
    .route(
        "/api/portal/edge-computing/status",
        get(modules::edge_computing::get_edge_status_handler),
    )
    // POST /edge-computing/cache/invalidate — 失效边缘缓存
    .route(
        "/api/portal/edge-computing/cache/invalidate",
        post(modules::edge_computing::invalidate_cache_handler),
    )
    // GET /edge-computing/render-history — 渲染历史
    .route(
        "/api/portal/edge-computing/render-history",
        get(modules::edge_computing::get_render_history_handler),
    )
    // POST /edge-computing/functions/deploy — 部署边缘函数
    .route(
        "/api/portal/edge-computing/functions/deploy",
        post(modules::edge_computing::deploy_function_handler),
    )
    // --- 全球加速 ---
    // POST /edge-computing/accelerate — 加速请求
    .route(
        "/api/portal/edge-computing/accelerate",
        post(modules::edge_computing::accelerate_request_handler),
    )
    // GET /edge-computing/optimal-location — 获取最优节点位置
    .route(
        "/api/portal/edge-computing/optimal-location",
        get(modules::edge_computing::get_optimal_location_handler),
    )
    // POST /edge-computing/config/sync — 同步加速配置
    .route(
        "/api/portal/edge-computing/config/sync",
        post(modules::edge_computing::sync_config_handler),
    )
    // GET /edge-computing/accel-stats — 加速统计
    .route(
        "/api/portal/edge-computing/accel-stats",
        get(modules::edge_computing::get_accel_stats_handler),
    )
    // --- 低延迟响应 ---
    // POST /edge-computing/optimize — 优化响应
    .route(
        "/api/portal/edge-computing/optimize",
        post(modules::edge_computing::optimize_response_handler),
    )
    // GET /edge-computing/latency-budget — 获取延迟预算
    .route(
        "/api/portal/edge-computing/latency-budget",
        get(modules::edge_computing::get_latency_budget_handler),
    )
    // POST /edge-computing/precompute — 预计算响应
    .route(
        "/api/portal/edge-computing/precompute",
        post(modules::edge_computing::precompute_handler),
    )
    // POST /edge-computing/coalesce — 合并请求
    .route(
        "/api/portal/edge-computing/coalesce",
        post(modules::edge_computing::coalesce_requests_handler),
    )
    // GET /edge-computing/latency-stats — 延迟统计
    .route(
        "/api/portal/edge-computing/latency-stats",
        get(modules::edge_computing::get_latency_stats_handler),
    )
    // ==================== V55.0 BFF Phase 25: GraphQL 安全网关 + 零信任架构 + 数据脱敏 ====================
    // --- Security Gateway ---
    // POST /security-v1/validate-query — 验证查询深度/复杂度
    .route(
        "/api/portal/security-v1/validate-query",
        post(modules::security_v1::validate_query_handler),
    )
    // GET /security-v1/events — 安全事件列表
    .route(
        "/api/portal/security-v1/events",
        get(modules::security_v1::get_security_events_handler),
    )
    // POST /security-v1/policies — 创建安全策略
    .route(
        "/api/portal/security-v1/policies",
        post(modules::security_v1::create_policy_handler),
    )
    // GET /security-v1/policies — 安全策略列表
    .route(
        "/api/portal/security-v1/policies",
        get(modules::security_v1::list_policies_handler),
    )
    // PUT /security-v1/policies/{id} — 更新安全策略
    .route(
        "/api/portal/security-v1/policies/{id}",
        put(modules::security_v1::update_policy_handler),
    )
    // --- Zero Trust ---
    // POST /security-v1/trust/evaluate — 评估信任
    .route(
        "/api/portal/security-v1/trust/evaluate",
        post(modules::security_v1::evaluate_trust_handler),
    )
    // GET /security-v1/trust/score/{identity} — 获取信任分数
    .route(
        "/api/portal/security-v1/trust/score/{identity}",
        get(modules::security_v1::get_trust_score_handler),
    )
    // POST /security-v1/identity/policies — 创建身份策略
    .route(
        "/api/portal/security-v1/identity/policies",
        post(modules::security_v1::create_identity_policy_handler),
    )
    // GET /security-v1/identity/policies — 身份策略列表
    .route(
        "/api/portal/security-v1/identity/policies",
        get(modules::security_v1::list_identity_policies_handler),
    )
    // GET /security-v1/session/{id}/trust — 会话信任状态
    .route(
        "/api/portal/security-v1/session/{id}/trust",
        get(modules::security_v1::get_session_trust_handler),
    )
    // --- Data Masking ---
    // POST /security-v1/masking/mask — 执行数据脱敏
    .route(
        "/api/portal/security-v1/masking/mask",
        post(modules::security_v1::mask_response_handler),
    )
    // POST /security-v1/masking/rules — 创建脱敏规则
    .route(
        "/api/portal/security-v1/masking/rules",
        post(modules::security_v1::add_masking_rule_handler),
    )
    // GET /security-v1/masking/rules — 脱敏规则列表
    .route(
        "/api/portal/security-v1/masking/rules",
        get(modules::security_v1::list_masking_rules_handler),
    )
    // DELETE /security-v1/masking/rules/{id} — 删除脱敏规则
    .route(
        "/api/portal/security-v1/masking/rules/{id}",
        delete(modules::security_v1::remove_masking_rule_handler),
    )
    // POST /security-v1/masking/preview — 脱敏预览
    .route(
        "/api/portal/security-v1/masking/preview",
        post(modules::security_v1::preview_masking_handler),
    )
    // GET /security-v1/masking/field-rules — 字段脱敏规则
    .route(
        "/api/portal/security-v1/masking/field-rules",
        get(modules::security_v1::get_field_rules_handler),
    )
    // ==================== V55.0 BFF Phase 26: GraphQL 持久化演进 — 持久化查询 V2 + 版本化缓存 + 边缘持久化 ====================
    // --- 持久化查询 V2 ---
    // POST /persisted-query/register — 注册持久化查询
    .route(
        "/api/portal/persisted-query/register",
        post(modules::persisted_query::register_query_handler),
    )
    // GET /persisted-query/{hash} — 获取持久化查询
    .route(
        "/api/portal/persisted-query/{hash}",
        get(modules::persisted_query::get_query_handler),
    )
    // POST /persisted-query/{hash}/execute — 执行持久化查询
    .route(
        "/api/portal/persisted-query/{hash}/execute",
        post(modules::persisted_query::execute_query_handler),
    )
    // GET /persisted-query/list — 列出持久化查询
    .route(
        "/api/portal/persisted-query/list",
        get(modules::persisted_query::list_queries_handler),
    )
    // PUT /persisted-query/{hash} — 更新持久化查询
    .route(
        "/api/portal/persisted-query/{hash}",
        put(modules::persisted_query::update_query_handler),
    )
    // DELETE /persisted-query/{hash} — 弃用持久化查询
    .route(
        "/api/portal/persisted-query/{hash}",
        delete(modules::persisted_query::deprecate_query_handler),
    )
    // GET /persisted-query/{hash}/versions — 获取查询版本历史
    .route(
        "/api/portal/persisted-query/{hash}/versions",
        get(modules::persisted_query::get_query_versions_handler),
    )
    // --- 版本化缓存 ---
    // GET /persisted-query/cache/get/{key} — 获取缓存条目
    .route(
        "/api/portal/persisted-query/cache/get/{key}",
        get(modules::persisted_query::cache_get_handler),
    )
    // POST /persisted-query/cache/set — 设置缓存条目
    .route(
        "/api/portal/persisted-query/cache/set",
        post(modules::persisted_query::cache_set_handler),
    )
    // POST /persisted-query/cache/invalidate/{version} — 失效缓存版本
    .route(
        "/api/portal/persisted-query/cache/invalidate/{version}",
        post(modules::persisted_query::cache_invalidate_handler),
    )
    // POST /persisted-query/cache/version — 创建新版本
    .route(
        "/api/portal/persisted-query/cache/version",
        post(modules::persisted_query::cache_create_version_handler),
    )
    // GET /persisted-query/cache/versions — 列出缓存版本
    .route(
        "/api/portal/persisted-query/cache/versions",
        get(modules::persisted_query::cache_list_versions_handler),
    )
    // GET /persisted-query/cache/stats — 缓存统计
    .route(
        "/api/portal/persisted-query/cache/stats",
        get(modules::persisted_query::cache_stats_handler),
    )
    // POST /persisted-query/cache/purge — 清理过期缓存
    .route(
        "/api/portal/persisted-query/cache/purge",
        post(modules::persisted_query::cache_purge_expired_handler),
    )
    // --- 边缘持久化 ---
    // POST /persisted-query/edge/store — 存储到边缘
    .route(
        "/api/portal/persisted-query/edge/store",
        post(modules::persisted_query::edge_store_handler),
    )
    // GET /persisted-query/edge/read/{key} — 从边缘读取
    .route(
        "/api/portal/persisted-query/edge/read/{key}",
        get(modules::persisted_query::edge_read_handler),
    )
    // POST /persisted-query/edge/sync — 同步到区域
    .route(
        "/api/portal/persisted-query/edge/sync",
        post(modules::persisted_query::edge_sync_handler),
    )
    // GET /persisted-query/edge/status — 边缘状态
    .route(
        "/api/portal/persisted-query/edge/status",
        get(modules::persisted_query::edge_status_handler),
    )
    // POST /persisted-query/edge/invalidate — 失效边缘缓存
    .route(
        "/api/portal/persisted-query/edge/invalidate",
        post(modules::persisted_query::edge_invalidate_handler),
    )
    // GET /persisted-query/edge/replication-stats — 复制统计
    .route(
        "/api/portal/persisted-query/edge/replication-stats",
        get(modules::persisted_query::edge_replication_stats_handler),
    )
    // POST /persisted-query/edge/policy — 设置复制策略
    .route(
        "/api/portal/persisted-query/edge/policy",
        post(modules::persisted_query::edge_set_policy_handler),
    )
    // ==================== V56.0 BFF Phase 27: GraphQL 实时演进 — 订阅持久化 + 消息重放 + 实时聚合 ====================
    // --- 订阅持久化 ---
    // POST /realtime-processing/subscription — 创建持久化订阅
    .route(
        "/api/portal/realtime-processing/subscription",
        post(modules::realtime_processing::create_subscription_handler),
    )
    // GET /realtime-processing/subscriptions — 列出持久化订阅
    .route(
        "/api/portal/realtime-processing/subscriptions",
        get(modules::realtime_processing::list_subscriptions_handler),
    )
    // GET /realtime-processing/subscription/{id} — 获取订阅详情
    .route(
        "/api/portal/realtime-processing/subscription/{id}",
        get(modules::realtime_processing::get_subscription_handler),
    )
    // PUT /realtime-processing/subscription/{id}/pause — 暂停订阅
    .route(
        "/api/portal/realtime-processing/subscription/{id}/pause",
        put(modules::realtime_processing::pause_subscription_handler),
    )
    // PUT /realtime-processing/subscription/{id}/resume — 恢复订阅
    .route(
        "/api/portal/realtime-processing/subscription/{id}/resume",
        put(modules::realtime_processing::resume_subscription_handler),
    )
    // DELETE /realtime-processing/subscription/{id} — 取消订阅
    .route(
        "/api/portal/realtime-processing/subscription/{id}",
        delete(modules::realtime_processing::cancel_subscription_handler),
    )
    // GET /realtime-processing/subscription/{id}/pending — 获取待投递事件
    .route(
        "/api/portal/realtime-processing/subscription/{id}/pending",
        get(modules::realtime_processing::get_pending_events_handler),
    )
    // --- 消息重放 ---
    // POST /realtime-processing/replay/request — 创建重放请求
    .route(
        "/api/portal/realtime-processing/replay/request",
        post(modules::realtime_processing::request_replay_handler),
    )
    // POST /realtime-processing/replay/execute/{id} — 执行重放
    .route(
        "/api/portal/realtime-processing/replay/execute/{id}",
        post(modules::realtime_processing::execute_replay_handler),
    )
    // GET /realtime-processing/replay/{id}/status — 获取重放状态
    .route(
        "/api/portal/realtime-processing/replay/{id}/status",
        get(modules::realtime_processing::get_replay_status_handler),
    )
    // POST /realtime-processing/replay/{id}/cancel — 取消重放
    .route(
        "/api/portal/realtime-processing/replay/{id}/cancel",
        post(modules::realtime_processing::cancel_replay_handler),
    )
    // GET /realtime-processing/replay/history — 重放历史
    .route(
        "/api/portal/realtime-processing/replay/history",
        get(modules::realtime_processing::get_replay_history_handler),
    )
    // GET /realtime-processing/events/range — 事件范围查询
    .route(
        "/api/portal/realtime-processing/events/range/{id}",
        get(modules::realtime_processing::get_events_range_handler),
    )
    // --- 实时聚合 ---
    // POST /realtime-processing/aggregation — 创建聚合配置
    .route(
        "/api/portal/realtime-processing/aggregation",
        post(modules::realtime_processing::create_aggregation_handler),
    )
    // POST /realtime-processing/aggregation/{id}/start — 启动聚合
    .route(
        "/api/portal/realtime-processing/aggregation/{id}/start",
        post(modules::realtime_processing::start_aggregation_handler),
    )
    // POST /realtime-processing/aggregation/{id}/stop — 停止聚合
    .route(
        "/api/portal/realtime-processing/aggregation/{id}/stop",
        post(modules::realtime_processing::stop_aggregation_handler),
    )
    // GET /realtime-processing/aggregation/{id}/result — 获取聚合结果
    .route(
        "/api/portal/realtime-processing/aggregation/{id}/result",
        get(modules::realtime_processing::get_aggregation_result_handler),
    )
    // GET /realtime-processing/aggregations — 列出聚合配置
    .route(
        "/api/portal/realtime-processing/aggregations",
        get(modules::realtime_processing::list_aggregations_handler),
    )
    // GET /realtime-processing/aggregation/{id}/stats — 获取聚合统计
    .route(
        "/api/portal/realtime-processing/aggregation/{id}/stats",
        get(modules::realtime_processing::get_aggregation_stats_handler),
    )
    // ==================== V56.0 BFF Phase 26: GraphQL API 版本管理 + 灰度流量切换 + 向后兼容保证 ====================
    // --- API 版本管理 ---
    // POST /version-control/versions — 注册新版本
    .route(
        "/api/portal/version-control/versions",
        post(modules::version_control::register_version_handler),
    )
    // GET /version-control/versions — 列出所有版本
    .route(
        "/api/portal/version-control/versions",
        get(modules::version_control::list_versions_handler),
    )
    // GET /version-control/versions/{version} — 获取指定版本
    .route(
        "/api/portal/version-control/versions/{version}",
        get(modules::version_control::get_version_handler),
    )
    // PUT /version-control/versions/{version} — 更新版本
    .route(
        "/api/portal/version-control/versions/{version}",
        put(modules::version_control::update_version_handler),
    )
    // POST /version-control/versions/{version}/deprecate — 废弃版本
    .route(
        "/api/portal/version-control/versions/{version}/deprecate",
        post(modules::version_control::deprecate_version_handler),
    )
    // POST /version-control/versions/{version}/sunset — Sunset 版本
    .route(
        "/api/portal/version-control/versions/{version}/sunset",
        post(modules::version_control::sunset_version_handler),
    )
    // GET /version-control/compatibility — 兼容性检查
    .route(
        "/api/portal/version-control/compatibility",
        get(modules::version_control::check_compatibility_handler),
    )
    // --- 灰度流量切换 ---
    // POST /version-control/canary — 创建灰度配置
    .route(
        "/api/portal/version-control/canary",
        post(modules::version_control::create_canary_handler),
    )
    // PUT /version-control/canary/{id} — 更新灰度配置
    .route(
        "/api/portal/version-control/canary/{id}",
        put(modules::version_control::update_canary_handler),
    )
    // POST /version-control/canary/{id}/start — 启动灰度
    .route(
        "/api/portal/version-control/canary/{id}/start",
        post(modules::version_control::start_canary_handler),
    )
    // POST /version-control/canary/{id}/stop — 停止灰度
    .route(
        "/api/portal/version-control/canary/{id}/stop",
        post(modules::version_control::stop_canary_handler),
    )
    // GET /version-control/canary/{id}/status — 获取灰度状态
    .route(
        "/api/portal/version-control/canary/{id}/status",
        get(modules::version_control::get_canary_status_handler),
    )
    // GET /version-control/canary/{id}/results — 获取灰度结果
    .route(
        "/api/portal/version-control/canary/{id}/results",
        get(modules::version_control::get_canary_results_handler),
    )
    // GET /version-control/canaries — 列出灰度配置
    .route(
        "/api/portal/version-control/canaries",
        get(modules::version_control::list_canaries_handler),
    )
    // POST /version-control/canary/{id}/promote — 推广灰度
    .route(
        "/api/portal/version-control/canary/{id}/promote",
        post(modules::version_control::promote_canary_handler),
    )
    // POST /version-control/canary/{id}/rollback — 回滚灰度
    .route(
        "/api/portal/version-control/canary/{id}/rollback",
        post(modules::version_control::rollback_canary_handler),
    )
    // --- 向后兼容保证 ---
    // POST /version-control/compatibility/check — 兼容性检查
    .route(
        "/api/portal/version-control/compatibility/check",
        post(modules::version_control::check_compatibility_report_handler),
    )
    // GET /version-control/compatibility/report — 获取兼容性报告
    .route(
        "/api/portal/version-control/compatibility/report",
        get(modules::version_control::get_compatibility_report_handler),
    )
    // GET /version-control/compatibility/migration-path — 获取迁移路径
    .route(
        "/api/portal/version-control/compatibility/migration-path",
        get(modules::version_control::get_migration_path_handler),
    )
    // POST /version-control/compatibility/policy — 创建兼容性策略
    .route(
        "/api/portal/version-control/compatibility/policy",
        post(modules::version_control::create_compatibility_policy_handler),
    )
    // GET /version-control/compatibility/status — 获取兼容性状态
    .route(
        "/api/portal/version-control/compatibility/status",
        get(modules::version_control::get_compatibility_status_handler),
    )
    // ==================== V57.0 BFF Phase 28: GraphQL 查询优化 — 编译优化 + 查询计划 + 执行加速 ====================
    // --- 编译优化 ---
    // POST /query-optimizer/compile — 编译查询
    .route(
        "/api/portal/query-optimizer/compile",
        post(modules::query_optimizer::compile_query_handler),
    )
    // GET /query-optimizer/compilation/{id} — 获取编译结果
    .route(
        "/api/portal/query-optimizer/compilation/{id}",
        get(modules::query_optimizer::get_compilation_handler),
    )
    // GET /query-optimizer/rules — 列出编译规则
    .route(
        "/api/portal/query-optimizer/rules",
        get(modules::query_optimizer::list_rules_handler),
    )
    // PUT /query-optimizer/rules/{id} — 更新编译规则
    .route(
        "/api/portal/query-optimizer/rules/{id}",
        put(modules::query_optimizer::update_rule_handler),
    )
    // GET /query-optimizer/compilation/stats — 编译统计
    .route(
        "/api/portal/query-optimizer/compilation/stats",
        get(modules::query_optimizer::get_compilation_stats_handler),
    )
    // --- 查询计划 ---
    // POST /query-optimizer/plan — 创建执行计划
    .route(
        "/api/portal/query-optimizer/plan",
        post(modules::query_optimizer::create_plan_handler),
    )
    // GET /query-optimizer/plan/{id} — 获取执行计划
    .route(
        "/api/portal/query-optimizer/plan/{id}",
        get(modules::query_optimizer::get_plan_handler),
    )
    // POST /query-optimizer/plan/compare — 对比执行计划
    .route(
        "/api/portal/query-optimizer/plan/compare",
        post(modules::query_optimizer::compare_plans_handler),
    )
    // GET /query-optimizer/plan/cost — 获取计划成本
    .route(
        "/api/portal/query-optimizer/plan/cost",
        get(modules::query_optimizer::get_plan_cost_handler),
    )
    // POST /query-optimizer/plan/{id}/optimize — 优化执行计划
    .route(
        "/api/portal/query-optimizer/plan/{id}/optimize",
        post(modules::query_optimizer::optimize_plan_handler),
    )
    // GET /query-optimizer/planner/stats — 计划统计
    .route(
        "/api/portal/query-optimizer/planner/stats",
        get(modules::query_optimizer::get_planner_stats_handler),
    )
    // --- 执行加速 ---
    // POST /query-optimizer/accelerate — 加速查询执行
    .route(
        "/api/portal/query-optimizer/accelerate",
        post(modules::query_optimizer::accelerate_handler),
    )
    // GET /query-optimizer/strategy — 获取加速策略
    .route(
        "/api/portal/query-optimizer/strategy",
        get(modules::query_optimizer::get_strategy_handler),
    )
    // GET /query-optimizer/improvement — 获取加速改进详情
    .route(
        "/api/portal/query-optimizer/improvement",
        get(modules::query_optimizer::get_improvement_handler),
    )
    // GET /query-optimizer/acceleration/history — 加速历史
    .route(
        "/api/portal/query-optimizer/acceleration/history",
        get(modules::query_optimizer::get_acceleration_history_handler),
    )
    // POST /query-optimizer/strategy/configure — 配置加速策略
    .route(
        "/api/portal/query-optimizer/strategy/configure/{id}",
        post(modules::query_optimizer::configure_strategy_handler),
    )
    // GET /query-optimizer/performance/profile — 性能画像
    .route(
        "/api/portal/query-optimizer/performance/profile",
        get(modules::query_optimizer::get_performance_profile_handler),
    )
    // ==================== V57.0 BFF Phase 27: GraphQL 网关编排 + 服务发现 + 动态路由 ====================
    // --- 网关编排 ---
    // POST /orchestration/plan — 创建编排计划
    .route(
        "/api/portal/orchestration/plan",
        post(modules::orchestration::create_plan_handler),
    )
    // POST /orchestration/plan/{id}/execute — 执行编排计划
    .route(
        "/api/portal/orchestration/plan/{id}/execute",
        post(modules::orchestration::execute_plan_handler),
    )
    // GET /orchestration/plan/{id}/status — 获取计划状态
    .route(
        "/api/portal/orchestration/plan/{id}/status",
        get(modules::orchestration::get_plan_status_handler),
    )
    // POST /orchestration/plan/{id}/cancel — 取消编排计划
    .route(
        "/api/portal/orchestration/plan/{id}/cancel",
        post(modules::orchestration::cancel_plan_handler),
    )
    // GET /orchestration/history — 执行历史
    .route(
        "/api/portal/orchestration/history",
        get(modules::orchestration::get_execution_history_handler),
    )
    // POST /orchestration/plan/{id}/optimize — 优化编排计划
    .route(
        "/api/portal/orchestration/plan/{id}/optimize",
        post(modules::orchestration::optimize_plan_handler),
    )
    // --- 服务发现 ---
    // POST /orchestration/service/register — 注册服务
    .route(
        "/api/portal/orchestration/service/register",
        post(modules::orchestration::register_service_handler),
    )
    // DELETE /orchestration/service/{id} — 注销服务
    .route(
        "/api/portal/orchestration/service/{id}",
        delete(modules::orchestration::deregister_service_handler),
    )
    // GET /orchestration/services — 服务列表
    .route(
        "/api/portal/orchestration/services",
        get(modules::orchestration::discover_services_handler),
    )
    // GET /orchestration/service/{id} — 服务详情
    .route(
        "/api/portal/orchestration/service/{id}",
        get(modules::orchestration::get_service_handler),
    )
    // GET /orchestration/services/capability/{cap} — 按能力发现服务
    .route(
        "/api/portal/orchestration/services/capability/{cap}",
        get(modules::orchestration::get_services_by_capability_handler),
    )
    // POST /orchestration/health/check/{id} — 健康检查
    .route(
        "/api/portal/orchestration/health/check/{id}",
        post(modules::orchestration::check_health_handler),
    )
    // GET /orchestration/registry/stats — 注册表统计
    .route(
        "/api/portal/orchestration/registry/stats",
        get(modules::orchestration::get_registry_stats_handler),
    )
    // --- 动态路由 ---
    // POST /orchestration/route — 路由请求
    .route(
        "/api/portal/orchestration/route",
        post(modules::orchestration::route_request_handler),
    )
    // POST /orchestration/rules — 创建路由规则
    .route(
        "/api/portal/orchestration/rules",
        post(modules::orchestration::add_rule_handler),
    )
    // GET /orchestration/rules — 路由规则列表
    .route(
        "/api/portal/orchestration/rules",
        get(modules::orchestration::list_rules_handler),
    )
    // PUT /orchestration/rules/{id} — 更新路由规则
    .route(
        "/api/portal/orchestration/rules/{id}",
        put(modules::orchestration::update_rule_handler),
    )
    // DELETE /orchestration/rules/{id} — 删除路由规则
    .route(
        "/api/portal/orchestration/rules/{id}",
        delete(modules::orchestration::remove_rule_handler),
    )
    // GET /orchestration/routing/stats — 路由统计
    .route(
        "/api/portal/orchestration/routing/stats",
        get(modules::orchestration::get_routing_stats_handler),
    )
    // ==================== V58.0 GraphQL 联邦深化: 跨服务一致性 + 分布式查询 + 联邦认证 ====================
    // --- 跨服务一致性 ---
    // POST /deep-federation/consistency/check — 一致性检查
    .route(
        "/api/portal/deep-federation/consistency/check",
        post(modules::deep_federation::check_consistency_handler),
    )
    // GET /deep-federation/consistency/model — 获取一致性模型
    .route(
        "/api/portal/deep-federation/consistency/model",
        get(modules::deep_federation::get_consistency_model_handler),
    )
    // PUT /deep-federation/consistency/model — 设置一致性模型
    .route(
        "/api/portal/deep-federation/consistency/model",
        put(modules::deep_federation::set_consistency_model_handler),
    )
    // POST /deep-federation/consistency/detect — 冲突检测
    .route(
        "/api/portal/deep-federation/consistency/detect",
        post(modules::deep_federation::detect_conflicts_handler),
    )
    // POST /deep-federation/consistency/resolve/{id} — 冲突解决
    .route(
        "/api/portal/deep-federation/consistency/resolve/{id}",
        post(modules::deep_federation::resolve_conflict_handler),
    )
    // GET /deep-federation/consistency/vector/{id} — 获取版本向量
    .route(
        "/api/portal/deep-federation/consistency/vector/{id}",
        get(modules::deep_federation::get_version_vector_handler),
    )
    // GET /deep-federation/consistency/report — 一致性报告
    .route(
        "/api/portal/deep-federation/consistency/report",
        get(modules::deep_federation::get_consistency_report_handler),
    )
    // --- 分布式查询 ---
    // POST /deep-federation/distributed/query — 创建分布式查询
    .route(
        "/api/portal/deep-federation/distributed/query",
        post(modules::deep_federation::create_distributed_query_handler),
    )
    // POST /deep-federation/distributed/query/{id}/execute — 执行分布式查询
    .route(
        "/api/portal/deep-federation/distributed/query/{id}/execute",
        post(modules::deep_federation::execute_distributed_query_handler),
    )
    // GET /deep-federation/distributed/query/{id}/status — 查询状态
    .route(
        "/api/portal/deep-federation/distributed/query/{id}/status",
        get(modules::deep_federation::get_query_status_handler),
    )
    // POST /deep-federation/distributed/query/{id}/cancel — 取消查询
    .route(
        "/api/portal/deep-federation/distributed/query/{id}/cancel",
        post(modules::deep_federation::cancel_query_handler),
    )
    // GET /deep-federation/distributed/query/history — 查询历史
    .route(
        "/api/portal/deep-federation/distributed/query/history",
        get(modules::deep_federation::get_query_history_handler),
    )
    // POST /deep-federation/distributed/query/validate — 验证查询计划
    .route(
        "/api/portal/deep-federation/distributed/query/validate",
        post(modules::deep_federation::validate_query_plan_handler),
    )
    // --- 联邦认证 ---
    // POST /deep-federation/auth/authenticate — 联邦认证
    .route(
        "/api/portal/deep-federation/auth/authenticate",
        post(modules::deep_federation::authenticate_federated_handler),
    )
    // POST /deep-federation/auth/propagate/{id} — 身份传播
    .route(
        "/api/portal/deep-federation/auth/propagate/{id}",
        post(modules::deep_federation::propagate_identity_handler),
    )
    // POST /deep-federation/auth/verify — 令牌链验证
    .route(
        "/api/portal/deep-federation/auth/verify",
        post(modules::deep_federation::verify_token_chain_handler),
    )
    // GET /deep-federation/auth/identity/{id} — 获取身份
    .route(
        "/api/portal/deep-federation/auth/identity/{id}",
        get(modules::deep_federation::get_identity_handler),
    )
    // POST /deep-federation/auth/policy — 创建认证策略
    .route(
        "/api/portal/deep-federation/auth/policy",
        post(modules::deep_federation::create_auth_policy_handler),
    )
    // PUT /deep-federation/auth/policy/{id} — 更新认证策略
    .route(
        "/api/portal/deep-federation/auth/policy/{id}",
        put(modules::deep_federation::update_auth_policy_handler),
    )
    // GET /deep-federation/auth/status — 认证状态
    .route(
        "/api/portal/deep-federation/auth/status",
        get(modules::deep_federation::get_auth_status_handler),
    )
    // ==================== V58.0 BFF Phase 28: GraphQL 网关安全 V2 + 审计追踪 + 访问控制 ====================
    // --- 网关安全 V2 ---
    // POST /gateway-security/validate-token — 验证 Token
    .route(
        "/api/portal/gateway-security/validate-token",
        post(modules::gateway_security::validate_token_handler),
    )
    // POST /gateway-security/authenticate — 认证检查
    .route(
        "/api/portal/gateway-security/authenticate",
        post(modules::gateway_security::authenticate_handler),
    )
    // GET /gateway-security/incidents — 安全事件列表
    .route(
        "/api/portal/gateway-security/incidents",
        get(modules::gateway_security::get_incidents_handler),
    )
    // POST /gateway-security/policies — 创建安全策略
    .route(
        "/api/portal/gateway-security/policies",
        post(modules::gateway_security::create_security_policy_handler),
    )
    // GET /gateway-security/policies — 安全策略列表
    .route(
        "/api/portal/gateway-security/policies",
        get(modules::gateway_security::list_security_policies_handler),
    )
    // PUT /gateway-security/policies/{id} — 更新安全策略
    .route(
        "/api/portal/gateway-security/policies/{id}",
        put(modules::gateway_security::update_security_policy_handler),
    )
    // --- 审计追踪 ---
    // POST /gateway-security/audit/write — 写入审计条目
    .route(
        "/api/portal/gateway-security/audit/write",
        post(modules::gateway_security::write_audit_handler),
    )
    // GET /gateway-security/audit/query — 查询审计条目
    .route(
        "/api/portal/gateway-security/audit/query",
        get(modules::gateway_security::query_audit_handler),
    )
    // GET /gateway-security/audit/actor/{id} — 按演员查询审计
    .route(
        "/api/portal/gateway-security/audit/actor/{id}",
        get(modules::gateway_security::get_audit_by_actor_handler),
    )
    // GET /gateway-security/audit/resource/{type}/{id} — 按资源查询审计
    .route(
        "/api/portal/gateway-security/audit/resource/{type}/{id}",
        get(modules::gateway_security::get_audit_by_resource_handler),
    )
    // GET /gateway-security/audit/summary — 审计汇总
    .route(
        "/api/portal/gateway-security/audit/summary",
        get(modules::gateway_security::get_audit_summary_handler),
    )
    // POST /gateway-security/audit/export — 导出审计数据
    .route(
        "/api/portal/gateway-security/audit/export",
        post(modules::gateway_security::export_audit_handler),
    )
    // --- 访问控制 ---
    // POST /gateway-security/access/evaluate — 评估访问
    .route(
        "/api/portal/gateway-security/access/evaluate",
        post(modules::gateway_security::evaluate_access_handler),
    )
    // POST /gateway-security/access/grant — 授权
    .route(
        "/api/portal/gateway-security/access/grant",
        post(modules::gateway_security::grant_access_handler),
    )
    // DELETE /gateway-security/access/{id} — 撤销权限
    .route(
        "/api/portal/gateway-security/access/{id}",
        delete(modules::gateway_security::revoke_access_handler),
    )
    // GET /gateway-security/access/policies — 访问策略列表
    .route(
        "/api/portal/gateway-security/access/policies",
        get(modules::gateway_security::list_access_policies_handler),
    )
    // POST /gateway-security/access/policy — 创建访问策略
    .route(
        "/api/portal/gateway-security/access/policy",
        post(modules::gateway_security::create_access_policy_handler),
    )
    // GET /gateway-security/permissions/user/{id} — 用户权限
    .route(
        "/api/portal/gateway-security/permissions/user/{id}",
        get(modules::gateway_security::get_user_permissions_handler),
    )
    // POST /gateway-security/access/simulate — 模拟访问
    .route(
        "/api/portal/gateway-security/access/simulate",
        post(modules::gateway_security::simulate_access_handler),
    )
    // ==================== V59.0 BFF Phase 29: GraphQL 网关监控 + 性能追踪 + 异常检测 ====================
    // --- 网关监控 ---
    // POST /gateway-monitoring/metric — 记录指标
    .route(
        "/api/portal/gateway-monitoring/metric",
        post(modules::gateway_monitoring::record_metric_handler),
    )
    // GET /gateway-monitoring/metrics — 获取指标列表
    .route(
        "/api/portal/gateway-monitoring/metrics",
        get(modules::gateway_monitoring::get_metrics_handler),
    )
    // GET /gateway-monitoring/health — 网关健康检查
    .route(
        "/api/portal/gateway-monitoring/health",
        get(modules::gateway_monitoring::get_health_handler),
    )
    // GET /gateway-monitoring/dashboard — 仪表盘数据
    .route(
        "/api/portal/gateway-monitoring/dashboard",
        get(modules::gateway_monitoring::get_dashboard_handler),
    )
    // GET /gateway-monitoring/metric/history — 指标历史
    .route(
        "/api/portal/gateway-monitoring/metric/{metric_name}/history",
        get(modules::gateway_monitoring::get_metric_history_handler),
    )
    // POST /gateway-monitoring/threshold — 设置告警阈值
    .route(
        "/api/portal/gateway-monitoring/threshold",
        post(modules::gateway_monitoring::set_threshold_handler),
    )
    // GET /gateway-monitoring/thresholds — 获取告警阈值
    .route(
        "/api/portal/gateway-monitoring/thresholds",
        get(modules::gateway_monitoring::get_thresholds_handler),
    )
    // --- 性能追踪 ---
    // POST /gateway-monitoring/trace/start — 启动追踪
    .route(
        "/api/portal/gateway-monitoring/trace/start",
        post(modules::gateway_monitoring::start_trace_handler),
    )
    // POST /gateway-monitoring/trace/end — 结束追踪
    .route(
        "/api/portal/gateway-monitoring/trace/end",
        post(modules::gateway_monitoring::end_trace_handler),
    )
    // POST /gateway-monitoring/trace/resolver — 添加 Resolver 计时
    .route(
        "/api/portal/gateway-monitoring/trace/resolver",
        post(modules::gateway_monitoring::add_resolver_timing_handler),
    )
    // GET /gateway-monitoring/trace/{id} — 获取追踪详情
    .route(
        "/api/portal/gateway-monitoring/trace/{id}",
        get(modules::gateway_monitoring::get_trace_handler),
    )
    // GET /gateway-monitoring/traces — 追踪列表
    .route(
        "/api/portal/gateway-monitoring/traces",
        get(modules::gateway_monitoring::list_traces_handler),
    )
    // GET /gateway-monitoring/slow-queries — 慢查询列表
    .route(
        "/api/portal/gateway-monitoring/slow-queries",
        get(modules::gateway_monitoring::get_slow_queries_handler),
    )
    // GET /gateway-monitoring/performance — 性能汇总
    .route(
        "/api/portal/gateway-monitoring/performance",
        get(modules::gateway_monitoring::get_performance_handler),
    )
    // POST /gateway-monitoring/traces/export — 导出追踪数据
    .route(
        "/api/portal/gateway-monitoring/traces/export",
        post(modules::gateway_monitoring::export_traces_handler),
    )
    // --- 异常检测 ---
    // POST /gateway-monitoring/anomaly/detect — 异常检测
    .route(
        "/api/portal/gateway-monitoring/anomaly/detect",
        post(modules::gateway_monitoring::detect_anomalies_handler),
    )
    // GET /gateway-monitoring/anomalies — 异常事件列表
    .route(
        "/api/portal/gateway-monitoring/anomalies",
        get(modules::gateway_monitoring::get_anomalies_handler),
    )
    // POST /gateway-monitoring/anomaly/model — 创建检测模型
    .route(
        "/api/portal/gateway-monitoring/anomaly/model",
        post(modules::gateway_monitoring::create_model_handler),
    )
    // PUT /gateway-monitoring/anomaly/model/{id} — 更新检测模型
    .route(
        "/api/portal/gateway-monitoring/anomaly/model/{id}",
        put(modules::gateway_monitoring::update_model_handler),
    )
    // GET /gateway-monitoring/anomaly/models — 检测模型列表
    .route(
        "/api/portal/gateway-monitoring/anomaly/models",
        get(modules::gateway_monitoring::get_models_handler),
    )
    // GET /gateway-monitoring/anomaly/summary — 异常检测汇总
    .route(
        "/api/portal/gateway-monitoring/anomaly/summary",
        get(modules::gateway_monitoring::get_anomaly_summary_handler),
    )
    // POST /gateway-monitoring/anomaly/model/{id}/train — 训练模型
    .route(
        "/api/portal/gateway-monitoring/anomaly/model/{id}/train",
        post(modules::gateway_monitoring::train_model_handler),
    )
    // ==================== V59.0 GraphQL 实时深化: 流式订阅 V2 + 消息去重 + 背压控制 ====================
    // --- 流式订阅 V2 ---
    // POST /streaming-processing/stream — 创建流
    .route(
        "/api/portal/streaming-processing/stream",
        post(modules::streaming_processing::create_stream_handler),
    )
    // GET /streaming-processing/streams — 流列表
    .route(
        "/api/portal/streaming-processing/streams",
        get(modules::streaming_processing::list_streams_handler),
    )
    // GET /streaming-processing/stream/{id} — 流详情
    .route(
        "/api/portal/streaming-processing/stream/{id}",
        get(modules::streaming_processing::get_stream_handler),
    )
    // POST /streaming-processing/stream/{id}/publish — 发布事件
    .route(
        "/api/portal/streaming-processing/stream/{id}/publish",
        post(modules::streaming_processing::publish_event_handler),
    )
    // POST /streaming-processing/stream/{id}/subscribe — 订阅流
    .route(
        "/api/portal/streaming-processing/stream/{id}/subscribe",
        post(modules::streaming_processing::subscribe_stream_handler),
    )
    // DELETE /streaming-processing/stream/{id} — 删除流
    .route(
        "/api/portal/streaming-processing/stream/{id}",
        delete(modules::streaming_processing::delete_stream_handler),
    )
    // GET /streaming-processing/stream/{id}/events — 获取流事件
    .route(
        "/api/portal/streaming-processing/stream/{id}/events",
        get(modules::streaming_processing::get_stream_events_handler),
    )
    // POST /streaming-processing/stream/{id}/unsubscribe — 取消订阅
    .route(
        "/api/portal/streaming-processing/stream/{id}/unsubscribe",
        post(modules::streaming_processing::unsubscribe_stream_handler),
    )
    // --- 消息去重 ---
    // POST /streaming-processing/dedup/rule — 创建去重规则
    .route(
        "/api/portal/streaming-processing/dedup/rule",
        post(modules::streaming_processing::create_dedup_rule_handler),
    )
    // GET /streaming-processing/dedup/rules — 去重规则列表
    .route(
        "/api/portal/streaming-processing/dedup/rules",
        get(modules::streaming_processing::get_dedup_rules_handler),
    )
    // POST /streaming-processing/dedup/check — 去重检查
    .route(
        "/api/portal/streaming-processing/dedup/check",
        post(modules::streaming_processing::check_duplicate_handler),
    )
    // GET /streaming-processing/dedup/stats — 去重统计
    .route(
        "/api/portal/streaming-processing/dedup/stats",
        get(modules::streaming_processing::get_dedup_stats_handler),
    )
    // GET /streaming-processing/dedup/history — 去重历史
    .route(
        "/api/portal/streaming-processing/dedup/history",
        get(modules::streaming_processing::get_dedup_history_handler),
    )
    // POST /streaming-processing/dedup/rule/{id}/enable — 启用规则
    .route(
        "/api/portal/streaming-processing/dedup/rule/{id}/enable",
        post(modules::streaming_processing::enable_rule_handler),
    )
    // POST /streaming-processing/dedup/rule/{id}/disable — 禁用规则
    .route(
        "/api/portal/streaming-processing/dedup/rule/{id}/disable",
        post(modules::streaming_processing::disable_rule_handler),
    )
    // --- 背压控制 ---
    // POST /streaming-processing/backpressure/config/{stream_id} — 设置背压配置
    .route(
        "/api/portal/streaming-processing/backpressure/config/{id}",
        post(modules::streaming_processing::set_backpressure_config_handler),
    )
    // GET /streaming-processing/backpressure/config/{stream_id} — 获取背压配置
    .route(
        "/api/portal/streaming-processing/backpressure/config/{id}",
        get(modules::streaming_processing::get_backpressure_config_handler),
    )
    // GET /streaming-processing/backpressure/state/{stream_id} — 获取背压状态
    .route(
        "/api/portal/streaming-processing/backpressure/state/{id}",
        get(modules::streaming_processing::get_backpressure_state_handler),
    )
    // POST /streaming-processing/backpressure/apply/{stream_id} — 应用背压
    .route(
        "/api/portal/streaming-processing/backpressure/apply/{id}",
        post(modules::streaming_processing::apply_backpressure_handler),
    )
    // POST /streaming-processing/backpressure/drain/{stream_id} — 排空队列
    .route(
        "/api/portal/streaming-processing/backpressure/drain/{id}",
        post(modules::streaming_processing::drain_queue_handler),
    )
    // GET /streaming-processing/backpressure/dropped — 丢弃事件列表
    .route(
        "/api/portal/streaming-processing/backpressure/dropped",
        get(modules::streaming_processing::get_dropped_events_handler),
    )
    // GET /streaming-processing/backpressure/stats — 背压统计
    .route(
        "/api/portal/streaming-processing/backpressure/stats",
        get(modules::streaming_processing::get_backpressure_stats_handler),
    )
    // POST /streaming-processing/backpressure/reset/{stream_id} — 重置计数器
    .route(
        "/api/portal/streaming-processing/backpressure/reset/{id}",
        post(modules::streaming_processing::reset_counter_handler),
    )
    // ==================== V60.0 GraphQL AI 运维: 智能查询路由 + 自动缓存 + 自愈机制 ====================
    // --- 智能查询路由 ---
    // POST /ai-ops/routing/rule — 创建路由规则
    .route(
        "/api/portal/ai-ops/routing/rule",
        post(modules::ai_ops::create_routing_rule_handler),
    )
    // GET /ai-ops/routing/rules — 获取路由规则列表
    .route(
        "/api/portal/ai-ops/routing/rules",
        get(modules::ai_ops::get_routing_rules_handler),
    )
    // POST /ai-ops/routing/route — 执行查询路由
    .route(
        "/api/portal/ai-ops/routing/route",
        post(modules::ai_ops::route_query_handler),
    )
    // GET /ai-ops/routing/loads — 获取服务负载
    .route(
        "/api/portal/ai-ops/routing/loads",
        get(modules::ai_ops::get_service_loads_handler),
    )
    // POST /ai-ops/routing/load/{id} — 更新服务负载
    .route(
        "/api/portal/ai-ops/routing/load/{id}",
        post(modules::ai_ops::update_service_load_handler),
    )
    // GET /ai-ops/routing/history — 路由决策历史
    .route(
        "/api/portal/ai-ops/routing/history",
        get(modules::ai_ops::get_routing_history_handler),
    )
    // POST /ai-ops/routing/simulate — 模拟路由
    .route(
        "/api/portal/ai-ops/routing/simulate",
        post(modules::ai_ops::simulate_routing_handler),
    )
    // GET /ai-ops/routing/stats — 路由统计
    .route(
        "/api/portal/ai-ops/routing/stats",
        get(modules::ai_ops::get_route_stats_handler),
    )
    // --- 自动缓存 ---
    // POST /ai-ops/cache/policy — 创建缓存策略
    .route(
        "/api/portal/ai-ops/cache/policy",
        post(modules::ai_ops::create_cache_policy_handler),
    )
    // GET /ai-ops/cache/policies — 获取缓存策略列表
    .route(
        "/api/portal/ai-ops/cache/policies",
        get(modules::ai_ops::get_cache_policies_handler),
    )
    // GET /ai-ops/cache/entry/{key} — 获取缓存条目
    .route(
        "/api/portal/ai-ops/cache/entry/{key}",
        get(modules::ai_ops::get_cache_entry_handler),
    )
    // POST /ai-ops/cache/invalidate — 失效缓存
    .route(
        "/api/portal/ai-ops/cache/invalidate",
        post(modules::ai_ops::invalidate_cache_handler),
    )
    // GET /ai-ops/cache/stats — 缓存统计
    .route(
        "/api/portal/ai-ops/cache/stats",
        get(modules::ai_ops::get_cache_stats_handler),
    )
    // POST /ai-ops/cache/cleanup — 清理过期缓存
    .route(
        "/api/portal/ai-ops/cache/cleanup",
        post(modules::ai_ops::cleanup_cache_handler),
    )
    // GET /ai-ops/cache/hit-rate — 缓存命中率
    .route(
        "/api/portal/ai-ops/cache/hit-rate",
        get(modules::ai_ops::get_cache_hit_rate_handler),
    )
    // POST /ai-ops/cache/evict — 缓存淘汰
    .route(
        "/api/portal/ai-ops/cache/evict",
        post(modules::ai_ops::evict_cache_handler),
    )
    // --- 自愈机制 ---
    // POST /ai-ops/health/check — 创建健康检查
    .route(
        "/api/portal/ai-ops/health/check",
        post(modules::ai_ops::create_health_check_handler),
    )
    // GET /ai-ops/health/checks — 获取健康检查列表
    .route(
        "/api/portal/ai-ops/health/checks",
        get(modules::ai_ops::get_health_checks_handler),
    )
    // POST /ai-ops/health/run — 执行健康检查
    .route(
        "/api/portal/ai-ops/health/run",
        post(modules::ai_ops::run_health_check_handler),
    )
    // POST /ai-ops/healing/execute — 执行自愈
    .route(
        "/api/portal/ai-ops/healing/execute",
        post(modules::ai_ops::execute_healing_handler),
    )
    // GET /ai-ops/healing/history — 自愈历史
    .route(
        "/api/portal/ai-ops/healing/history",
        get(modules::ai_ops::get_healing_history_handler),
    )
    // POST /ai-ops/recovery/plan — 创建恢复计划
    .route(
        "/api/portal/ai-ops/recovery/plan",
        post(modules::ai_ops::create_recovery_plan_handler),
    )
    // GET /ai-ops/recovery/status — 恢复计划状态
    .route(
        "/api/portal/ai-ops/recovery/status/{id}",
        get(modules::ai_ops::get_recovery_status_handler),
    )
    // GET /ai-ops/health/summary — 健康汇总
    .route(
        "/api/portal/ai-ops/health/summary",
        get(modules::ai_ops::get_health_summary_handler),
    )
    // ==================== V60.0 BFF Phase 30: GraphQL 网关部署 + 配置管理 + 回滚策略 ====================
    // --- 网关部署 ---
    // POST /deployment-manager/deployment — 创建部署
    .route(
        "/api/portal/deployment-manager/deployment",
        post(modules::deployment_manager::create_deployment_handler),
    )
    // GET /deployment-manager/deployments — 部署列表
    .route(
        "/api/portal/deployment-manager/deployments",
        get(modules::deployment_manager::list_deployments_handler),
    )
    // GET /deployment-manager/deployment/{id} — 部署详情
    .route(
        "/api/portal/deployment-manager/deployment/{id}",
        get(modules::deployment_manager::get_deployment_handler),
    )
    // POST /deployment-manager/deployment/{id}/start — 启动部署
    .route(
        "/api/portal/deployment-manager/deployment/{id}/start",
        post(modules::deployment_manager::start_deployment_handler),
    )
    // POST /deployment-manager/deployment/{id}/cancel — 取消部署
    .route(
        "/api/portal/deployment-manager/deployment/{id}/cancel",
        post(modules::deployment_manager::cancel_deployment_handler),
    )
    // GET /deployment-manager/deployment/{id}/status — 部署状态
    .route(
        "/api/portal/deployment-manager/deployment/{id}/status",
        get(modules::deployment_manager::get_deployment_status_handler),
    )
    // POST /deployment-manager/deployment/{id}/promote — 灰度推广
    .route(
        "/api/portal/deployment-manager/deployment/{id}/promote",
        post(modules::deployment_manager::promote_canary_handler),
    )
    // POST /deployment-manager/deployment/{id}/rollback — 回滚部署
    .route(
        "/api/portal/deployment-manager/deployment/{id}/rollback",
        post(modules::deployment_manager::rollback_deployment_handler),
    )
    // GET /deployment-manager/deployment/history — 部署历史
    .route(
        "/api/portal/deployment-manager/deployment/history",
        get(modules::deployment_manager::get_deployment_history_handler),
    )
    // --- 配置管理 ---
    // POST /deployment-manager/config — 创建配置
    .route(
        "/api/portal/deployment-manager/config",
        post(modules::deployment_manager::create_config_handler),
    )
    // GET /deployment-manager/configs — 配置列表
    .route(
        "/api/portal/deployment-manager/configs",
        get(modules::deployment_manager::list_configs_handler),
    )
    // GET /deployment-manager/config/{id} — 配置详情
    .route(
        "/api/portal/deployment-manager/config/{id}",
        get(modules::deployment_manager::get_config_handler),
    )
    // PUT /deployment-manager/config/{id} — 更新配置
    .route(
        "/api/portal/deployment-manager/config/{id}",
        put(modules::deployment_manager::update_config_handler),
    )
    // POST /deployment-manager/config/{id}/activate — 激活配置
    .route(
        "/api/portal/deployment-manager/config/{id}/activate",
        post(modules::deployment_manager::activate_config_handler),
    )
    // GET /deployment-manager/config/{id}/diff — 配置差异
    .route(
        "/api/portal/deployment-manager/config/{id}/diff",
        get(modules::deployment_manager::get_config_diff_handler),
    )
    // GET /deployment-manager/config/{id}/history — 配置历史
    .route(
        "/api/portal/deployment-manager/config/{id}/history",
        get(modules::deployment_manager::get_config_history_handler),
    )
    // POST /deployment-manager/config/{id}/rollback — 回滚配置
    .route(
        "/api/portal/deployment-manager/config/{id}/rollback",
        post(modules::deployment_manager::rollback_config_handler),
    )
    // POST /deployment-manager/environment — 创建环境
    .route(
        "/api/portal/deployment-manager/environment",
        post(modules::deployment_manager::create_environment_handler),
    )
    // --- 回滚策略 ---
    // POST /deployment-manager/rollback/policy — 创建回滚策略
    .route(
        "/api/portal/deployment-manager/rollback/policy",
        post(modules::deployment_manager::create_rollback_policy_handler),
    )
    // GET /deployment-manager/rollback/policies — 回滚策略列表
    .route(
        "/api/portal/deployment-manager/rollback/policies",
        get(modules::deployment_manager::get_rollback_policies_handler),
    )
    // POST /deployment-manager/rollback/execute — 执行回滚
    .route(
        "/api/portal/deployment-manager/rollback/execute",
        post(modules::deployment_manager::execute_rollback_handler),
    )
    // GET /deployment-manager/rollback/history — 回滚历史
    .route(
        "/api/portal/deployment-manager/rollback/history",
        get(modules::deployment_manager::get_rollback_history_handler),
    )
    // POST /deployment-manager/rollback/{id}/test — 测试回滚
    .route(
        "/api/portal/deployment-manager/rollback/{id}/test",
        post(modules::deployment_manager::test_rollback_handler),
    )
    // POST /deployment-manager/rollback/{id}/auto — 配置自动回滚
    .route(
        "/api/portal/deployment-manager/rollback/{id}/auto",
        post(modules::deployment_manager::configure_auto_rollback_handler),
    )
    // POST /deployment-manager/rollback/{id}/disable — 禁用回滚策略
    .route(
        "/api/portal/deployment-manager/rollback/{id}/disable",
        post(modules::deployment_manager::disable_rollback_handler),
    )
    // GET /deployment-manager/rollback/status — 回滚状态
    .route(
        "/api/portal/deployment-manager/rollback/status",
        get(modules::deployment_manager::get_rollback_status_handler),
    )
    .layer(axum::middleware::from_fn(telemetry_middleware))
    .layer(axum::middleware::from_fn(request_context_middleware))
    .layer(cors)
    .layer(tower_cookies::CookieManagerLayer::new());

    let app = app.with_state(app_state.clone());
    Ok(app)
}

//! TOPEMS EHS Service
//!
//! Environment Health Safety Service

mod event_handlers;
mod models;
mod modules;

mod schema_defense;
mod shared;

use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared::ApiResponse;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

use shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler, L2CacheConfig};
use topems_shared_event::event::{CacheInvalidatedPayload, EventSubscriber, EventType};

use modules::ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "ehs, public");

    let config = ServiceConfig {
        name: "topems-ehs",
        port: 8052,
        port_env_var: Some("EHS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/ehs",
        legacy_prefixes: &["/api/v1/ehs"],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = models::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("EHS database init warning: {}", e);
    }
    // Schema 防御：增量补列 + 一致性校验（失败不阻塞启动）
    if let Err(e) = schema_defense::run(&ctx.db).await {
        tracing::warn!("EHS schema defense 失败（不阻塞启动）: {}", e);
    }
    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ EHS 事件订阅者启动失败: {}", e);
    }

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "ehs-service", &["workflow:read"]))
        .expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let redis_url = std::env::var("REDIS_URL").ok();

    let hazard_cache = {
        let l2_config = L2CacheConfig {
            instance_prefix: "ehs".to_string(),
            l1_ttl: std::time::Duration::from_secs(60),
            l2_ttl: std::time::Duration::from_secs(600),
            l1_capacity: 10_000,
            ..Default::default()
        }
        .with_metrics("ehs", "hazard");
        match AsyncL2Cache::<serde_json::Value>::try_new(l2_config, redis_url.as_deref()).await {
            Ok(cache) => {
                if cache.has_l2() {
                    tracing::info!("💾 多级缓存初始化完成（EHS hazard，L1+L2 Redis 已启用）");
                } else {
                    tracing::info!("💾 多级缓存初始化完成（EHS hazard，纯 L1 模式）");
                }
                Arc::new(cache)
            }
            Err((cache, warn)) => {
                tracing::warn!("💾 多级缓存初始化降级（EHS hazard）: {}", warn);
                Arc::new(cache)
            }
        }
    };

    let training_cache = {
        let l2_config = L2CacheConfig {
            instance_prefix: "ehs".to_string(),
            l1_ttl: std::time::Duration::from_secs(60),
            l2_ttl: std::time::Duration::from_secs(600),
            l1_capacity: 10_000,
            ..Default::default()
        }
        .with_metrics("ehs", "training");
        match AsyncL2Cache::<serde_json::Value>::try_new(l2_config, redis_url.as_deref()).await {
            Ok(cache) => {
                if cache.has_l2() {
                    tracing::info!("💾 多级缓存初始化完成（EHS training，L1+L2 Redis 已启用）");
                } else {
                    tracing::info!("💾 多级缓存初始化完成（EHS training，纯 L1 模式）");
                }
                Arc::new(cache)
            }
            Err((cache, warn)) => {
                tracing::warn!("💾 多级缓存初始化降级（EHS training）: {}", warn);
                Arc::new(cache)
            }
        }
    };

    let dict_cache = {
        let l2_config = L2CacheConfig {
            instance_prefix: "ehs".to_string(),
            l1_ttl: std::time::Duration::from_secs(60),
            l2_ttl: std::time::Duration::from_secs(600),
            l1_capacity: 10_000,
            ..Default::default()
        }
        .with_metrics("ehs", "dict");
        match AsyncL2Cache::<String>::try_new(l2_config, redis_url.as_deref()).await {
            Ok(cache) => {
                if cache.has_l2() {
                    tracing::info!("💾 多级缓存初始化完成（EHS dict，L1+L2 Redis 已启用）");
                } else {
                    tracing::info!("💾 多级缓存初始化完成（EHS dict，纯 L1 模式）");
                }
                Arc::new(cache)
            }
            Err((cache, warn)) => {
                tracing::warn!("💾 多级缓存初始化降级（EHS dict）: {}", warn);
                Arc::new(cache)
            }
        }
    };
    tracing::info!("💾 多级缓存初始化完成（EHS 隐患/培训/字典）");

    // 缓存失效事件订阅（事件驱动缓存一致性）
    {
        let mut cache_invalidation_listener = CacheInvalidationListener::new("ehs");
        let hazard_handler = AsyncL2CacheInvalidationHandler::new(
            "ehs_hazard_cache",
            hazard_cache.clone(),
            "ehs:hazard:",
        );
        cache_invalidation_listener.register_handler(hazard_handler);
        let training_handler = AsyncL2CacheInvalidationHandler::new(
            "ehs_training_cache",
            training_cache.clone(),
            "ehs:training:",
        );
        cache_invalidation_listener.register_handler(training_handler);
        let dict_handler =
            AsyncL2CacheInvalidationHandler::new("ehs_dict_cache", dict_cache.clone(), "ehs:dict:");
        cache_invalidation_listener.register_handler(dict_handler);
        let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

        match EventSubscriber::new("ehs-cache-invalidation") {
            Ok(cache_subscriber) => {
                let listener = cache_invalidation_listener.clone();
                let cache_subscriber =
                    cache_subscriber.subscribe(vec![EventType::CacheInvalidated], move |event| {
                        let listener = listener.clone();
                        Box::pin(async move {
                            if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                                let invalidation_event = CacheInvalidationEvent {
                                    source_service: payload.source_service,
                                    source_instance: payload.source_instance,
                                    cache_key_pattern: payload.cache_key_pattern,
                                    invalidation_level: InvalidationLevel::from_str(
                                        &payload.invalidation_level,
                                    ),
                                    reason: payload.reason,
                                };
                                listener.dispatch_invalidation(&invalidation_event);
                            }
                        })
                    });
                tokio::spawn(async move {
                    if let Err(e) = cache_subscriber.start_listening().await {
                        tracing::error!("[ehs] 缓存失效事件订阅者异常退出: {}", e);
                    }
                });
                tracing::info!("[ehs] 缓存失效事件订阅者启动成功");
            }
            Err(e) => {
                tracing::warn!("[ehs] 缓存失效事件订阅者创建失败: {}", e);
            }
        }
    }

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config: SimpleHealthConfig::new("topems-ehs").with_db(ctx.db.clone()),
        event_publisher: ctx.event_publisher.clone(),
        workflow_client,
        hazard_cache,
        training_cache,
        dict_cache,
    };

    // Public routes（stateful：/health + /api/plugins/*）
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/metrics", get(prometheus_metrics_handler))
        .route(
            "/api/plugins/info",
            get(modules::ehs_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::ehs_plugin::plugin_health_check),
        )
        .with_state(api_state.clone());

    // Protected routes（先 merge 业务路由，然后 tenant_middleware → build_application 再加 auth/rls/rate_limit）
    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
        .layer(axum::middleware::from_fn_with_state(
            api_state.pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("ehs:admin")))
        .with_state(api_state.clone());

    let openapi_json = serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_default();
    let mut app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    // stateful /api/health/detailed（build_application 内 public_routes 不传 state，补在最外层 merge）
    let stateful_detailed = Router::new()
        .route("/api/health/detailed", get(detailed_health))
        .with_state(api_state);
    app.router = Router::new().merge(stateful_detailed).merge(app.router);

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::ehs_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS EHS Service API\n\n\
     Environment Health Safety\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    use topems_shared_bootstrap::build_detailed_health_response;
    let modules = serde_json::json!({ "ehs": "active" });
    let resp = build_detailed_health_response(
        &state.pool,
        "ehs-service",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    Json(ApiResponse::success(resp, "Detailed health check"))
}

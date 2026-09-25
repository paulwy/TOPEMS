//! TOPEMS MES Service
//!
//! Manufacturing Execution System Service

mod models;

use std::sync::Arc;
use std::time::Duration;

use topems_mes::{modules, AppState};

use axum::routing::get;
use utoipa::OpenApi;

use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler, L2CacheConfig};
use topems_shared_event::event::{CacheInvalidatedPayload, EventSubscriber, EventType};
use topems_shared_service_client::service_client::{api::erp_api::ErpApi, TypedServiceClient};

use modules::openapi::MesApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "mes, public");

    let config = ServiceConfig {
        name: "topems-mes",
        port: 8030,
        port_env_var: Some("MES_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/mes",
        legacy_prefixes: &["/api/v1/mes"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = modules::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("MES database init warning: {}", e);
    }

    // Schema 防御：增量迁移 + 一致性自检
    if let Err(e) = topems_shared_db::schema::run_schema_defense(
        &ctx.db,
        models::schema_defense::SERVICE_SCHEMA,
        models::schema_defense::TABLE_DEFS,
        "mes",
    )
    .await
    {
        tracing::warn!("[mes schema 防御] 非阻塞警告: {}", e);
    }

    let health_config = SimpleHealthConfig::new("topems-mes").with_db(ctx.db.clone());

    // ERP 服务客户端（生产执行闭环：报工后回传生产进度，service token erp:write；失败优雅降级）
    let erp_client = TypedServiceClient::<ErpApi>::from_env_default()
        .and_then(|c| {
            // erp 全局受保护路由要求 erp:admin（与 crm 等服务间调用 erp 一致）
            c.with_service_token(&ctx.auth_state.jwt_secret, "mes-service", &["erp:admin"])
        })
        .map(Arc::new)
        .ok();

    // 多级缓存初始化（L1: moka 进程内缓存 + L2: Redis 分布式缓存）
    let l2_config = L2CacheConfig {
        instance_prefix: "mes".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("mes", "dict");
    let redis_url = std::env::var("REDIS_URL").ok();
    let dict_cache = match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（MES，L1+L2 Redis 已启用）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（MES，纯 L1 模式，Redis 未配置）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（MES）: {}", warn);
            Arc::new(cache)
        }
    };

    // 缓存预热：服务启动时异步加载常用字典数据，避免首次请求缓存未命中
    {
        let cache = dict_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[mes] 开始缓存预热...");

            // 预热工艺路线列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM mes.process_routes WHERE deleted_at IS NULL),
                    'page', 1,
                    'page_size', 10
                ) as data
                FROM (
                    SELECT pr.* FROM mes.process_routes pr
                    WHERE pr.deleted_at IS NULL
                    ORDER BY pr.created_at DESC
                    LIMIT 10 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key =
                        "mes:process_route:list:default:page:1:page_size:10:search:none:status:all";
                    cache.set(cache_key.to_string(), data).await;
                    tracing::info!("[mes] 工艺路线列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[mes] 工艺路线列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[mes] 工艺路线列表缓存预热失败: {}", e);
                }
            }

            // 预热产能列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM capacities),
                    'page', 1,
                    'page_size', 10
                ) as data
                FROM (
                    SELECT c.* FROM capacities c
                    ORDER BY c.capacity_date DESC
                    LIMIT 10 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = "mes:capacity:list:default:page:1:page_size:10:search:none:status:all:work_center_id:none";
                    cache.set(cache_key.to_string(), data).await;
                    tracing::info!("[mes] 产能列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[mes] 产能列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[mes] 产能列表缓存预热失败: {}", e);
                }
            }

            tracing::info!("[mes] 缓存预热完成");
        });
    }

    // 缓存失效事件订阅（事件驱动缓存一致性）
    {
        let mut cache_invalidation_listener = CacheInvalidationListener::new("mes");
        let process_route_cache_handler = AsyncL2CacheInvalidationHandler::new(
            "mes_process_route_cache",
            dict_cache.clone(),
            "mes:process_route:",
        );
        cache_invalidation_listener.register_handler(process_route_cache_handler);
        let capacity_cache_handler = AsyncL2CacheInvalidationHandler::new(
            "mes_capacity_cache",
            dict_cache.clone(),
            "mes:capacity:",
        );
        cache_invalidation_listener.register_handler(capacity_cache_handler);
        let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

        match EventSubscriber::new("mes-cache-invalidation") {
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
                        tracing::error!("[mes] 缓存失效事件订阅者异常退出: {}", e);
                    }
                });
                tracing::info!("[mes] 缓存失效事件订阅者启动成功");
            }
            Err(e) => {
                tracing::warn!("[mes] 缓存失效事件订阅者创建失败: {}", e);
            }
        }
    }

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config,
        event_publisher: ctx.event_publisher.clone(),
        erp_client,
        dict_cache,
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    // 插件路由 + WebSocket 路由（需要 AppState）
    let plugin_routes = axum::Router::new()
        .route("/", get(home))
        .route(
            "/api/plugins/info",
            get(modules::mes_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::mes_plugin::plugin_health_check),
        )
        .route(
            "/ws/mes/dashboard",
            axum::routing::get(modules::dashboard_ws::dashboard_websocket),
        )
        // APS API 兼容层：/api/aps/* → /api/mes/*
        .nest("/api/aps", modules::aps_compat::create_routes())
        .with_state(state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由
    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("mes:admin")))
        .with_state(state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&MesApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mes_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

async fn home() -> &'static str {
    "TOPEMS MES Service API\n\n\
     Manufacturing Execution System\n\n\
     - /health - Health check"
}

#[cfg(test)]
mod openapi_extract_tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = MesApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-mes-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-mes-openapi.json");
    }
}

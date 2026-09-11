mod models;
mod schema_defense;
mod shared;

pub mod modules;

use anyhow::Result;
use axum::{routing::get, Router};
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes,
    default_init_db, run, ServiceConfig,
};
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
    InMemoryCache as LocalInMemoryCache, InMemoryCacheInvalidationHandler,
};
use topems_shared_event::event::{CacheInvalidatedPayload, EventSubscriber, EventType};

use modules::tms_plugin::{auto_register_to_core, get_plugin_info, plugin_health_check};
use shared::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    // 设置search_path环境变量（供lib使用）
    std::env::set_var("SEARCH_PATH", "tms, public, shared");

    let config = ServiceConfig {
        name: "topems-tms",
        port: 8073,
        port_env_var: Some("TMS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/tms",
        legacy_prefixes: &["/api/v1/tms"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = default_init_db(
        ctx.migrate_pool.as_ref().unwrap_or(&ctx.db),
        "tms",
        false,
        schema_defense::run_schema_migration_and_verify,
    )
    .await
    {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let dict_cache = Arc::new(LocalInMemoryCache::new(Duration::from_secs(600)));

    // 缓存预热：服务启动时异步加载常用字典数据，避免首次请求缓存未命中
    {
        let cache = dict_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[tms] 开始缓存预热...");

            // 预热司机列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM drivers WHERE deleted_at IS NULL),
                    'page', 1,
                    'pagesize', 10
                ) as data
                FROM (
                    SELECT d.* FROM drivers d
                    WHERE d.deleted_at IS NULL
                    ORDER BY d.created_at DESC
                    LIMIT 10 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = "tms:driver:list:default:page:1:pagesize:10:search:none:status:all";
                    cache.set(cache_key.to_string(), data);
                    tracing::info!("[tms] 司机列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[tms] 司机列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[tms] 司机列表缓存预热失败: {}", e);
                }
            }

            // 预热车辆列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM vehicles WHERE deleted_at IS NULL),
                    'page', 1,
                    'pagesize', 10
                ) as data
                FROM (
                    SELECT v.* FROM vehicles v
                    WHERE v.deleted_at IS NULL
                    ORDER BY v.created_at DESC
                    LIMIT 10 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = "tms:vehicle:list:default:page:1:pagesize:10:search:none:status:all";
                    cache.set(cache_key.to_string(), data);
                    tracing::info!("[tms] 车辆列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[tms] 车辆列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[tms] 车辆列表缓存预热失败: {}", e);
                }
            }

            // 预热承运商列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM carriers WHERE deleted_at IS NULL),
                    'page', 1,
                    'pagesize', 10
                ) as data
                FROM (
                    SELECT c.* FROM carriers c
                    WHERE c.deleted_at IS NULL
                    ORDER BY c.created_at DESC
                    LIMIT 10 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = "tms:carrier:list:default:page:1:pagesize:10:search:none:status:all";
                    cache.set(cache_key.to_string(), data);
                    tracing::info!("[tms] 承运商列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[tms] 承运商列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[tms] 承运商列表缓存预热失败: {}", e);
                }
            }

            tracing::info!("[tms] 缓存预热完成");
        });
    }

    // 缓存失效事件订阅（事件驱动缓存一致性）
    {
        let mut cache_invalidation_listener = CacheInvalidationListener::new("tms");
        let driver_cache_handler = InMemoryCacheInvalidationHandler::new(
            "tms_driver_cache",
            dict_cache.clone(),
            "tms:driver:",
        );
        cache_invalidation_listener.register_handler(driver_cache_handler);
        let vehicle_cache_handler = InMemoryCacheInvalidationHandler::new(
            "tms_vehicle_cache",
            dict_cache.clone(),
            "tms:vehicle:",
        );
        cache_invalidation_listener.register_handler(vehicle_cache_handler);
        let carrier_cache_handler = InMemoryCacheInvalidationHandler::new(
            "tms_carrier_cache",
            dict_cache.clone(),
            "tms:carrier:",
        );
        cache_invalidation_listener.register_handler(carrier_cache_handler);
        let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

        match EventSubscriber::new("tms-cache-invalidation") {
            Ok(cache_subscriber) => {
                let listener = cache_invalidation_listener.clone();
                let cache_subscriber = cache_subscriber
                    .subscribe(vec![EventType::CacheInvalidated], move |event| {
                        let listener = listener.clone();
                        Box::pin(async move {
                            if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                                let invalidation_event = CacheInvalidationEvent {
                                    source_service: payload.source_service,
                                    source_instance: payload.source_instance,
                                    cache_key_pattern: payload.cache_key_pattern,
                                    invalidation_level: InvalidationLevel::from_str(&payload.invalidation_level),
                                    reason: payload.reason,
                                };
                                listener.dispatch_invalidation(&invalidation_event);
                            }
                        })
                    });

                tokio::spawn(async move {
                    if let Err(e) = cache_subscriber.start_listening().await {
                        tracing::error!("[tms] 缓存失效事件订阅者异常退出: {}", e);
                    }
                });
                tracing::info!("[tms] 缓存失效事件订阅者启动成功");
            }
            Err(e) => {
                tracing::warn!("[tms] 缓存失效事件订阅者创建失败: {}", e);
            }
        }
    }

    let app_state = AppState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        event_publisher: ctx.event_publisher.clone(),
        dict_cache,
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    // 插件路由（需要 AppState）
    let plugin_routes = Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
        .with_state(app_state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由
    let protected_routes = modules::create_routes::<AppState>()
        .layer(axum::middleware::from_fn(require_permission("tms:admin")))
        .with_state(app_state)
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::TmsApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = modules::openapi::TmsApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-tms-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-tms-openapi.json");
    }
}

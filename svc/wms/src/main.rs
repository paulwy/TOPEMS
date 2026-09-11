mod event_handlers;
mod models;
mod schema_defense;
mod shared;

pub mod modules;

use anyhow::Result;
use axum::{routing::get, Router};
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes,
    default_init_db, run, ServiceConfig,
};

use modules::wms_plugin::{auto_register_to_core, get_plugin_info, plugin_health_check};
use modules::ApiState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler, L2CacheConfig};
use topems_shared_event::event::{CacheInvalidatedPayload, EventSubscriber, EventType};

#[tokio::main]
async fn main() -> Result<()> {
    // 设置search_path环境变量（供lib使用）
    std::env::set_var("SEARCH_PATH", "wms, public, shared");

    let config = ServiceConfig {
        name: "topems-wms",
        port: 8041,
        port_env_var: Some("WMS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/wms",
        legacy_prefixes: &["/api/v1/wms"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = default_init_db(
        ctx.migrate_pool.as_ref().unwrap_or(&ctx.db),
        "wms",
        false,
        schema_defense::run_schema_migration_and_verify,
    )
    .await
    {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    // 多级缓存初始化（L1: moka 进程内缓存 + L2: Redis 分布式缓存）
    let redis_url = std::env::var("REDIS_URL").ok();

    let l2_config = L2CacheConfig {
        instance_prefix: "wms".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("wms", "warehouse");
    let warehouse_cache = match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（WMS warehouse，L1+L2 Redis 已启用）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（WMS warehouse，纯 L1 模式）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（WMS warehouse）: {}", warn);
            Arc::new(cache)
        }
    };

    let l2_config = L2CacheConfig {
        instance_prefix: "wms".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("wms", "inventory");
    let inventory_cache = match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（WMS inventory，L1+L2 Redis 已启用）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（WMS inventory，纯 L1 模式）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（WMS inventory）: {}", warn);
            Arc::new(cache)
        }
    };

    let l2_config = L2CacheConfig {
        instance_prefix: "wms".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("wms", "dict");
    let dict_cache = match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（WMS dict，L1+L2 Redis 已启用）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（WMS dict，纯 L1 模式）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（WMS dict）: {}", warn);
            Arc::new(cache)
        }
    };

    // 缓存预热：服务启动时异步加载仓库列表第一页数据，避免首次请求缓存未命中
    {
        let cache = warehouse_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[wms] 开始仓库列表缓存预热...");
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'warehouses', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM wms.warehouses WHERE deleted_at IS NULL),
                    'page', 1,
                    'page_size', 20
                ) as data
                FROM (
                    SELECT id, tenant_id, warehouse_name as name, warehouse_code as code, address, manager, contact_phone as phone, status, created_at, updated_at
                    FROM wms.warehouses
                    WHERE deleted_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 20 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = "wms:warehouse:list:warmup:page:1:size:20";
                    cache.set(cache_key.to_string(), data).await;
                    tracing::info!("[wms] 仓库列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[wms] 仓库列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[wms] 仓库列表缓存预热失败: {}", e);
                }
            }
        });
    }

    // 缓存失效事件订阅（事件驱动缓存一致性）
    {
        let mut cache_invalidation_listener = CacheInvalidationListener::new("wms");
        let warehouse_handler = AsyncL2CacheInvalidationHandler::new(
            "wms_warehouse_cache",
            warehouse_cache.clone(),
            "wms:warehouse:",
        );
        cache_invalidation_listener.register_handler(warehouse_handler);
        let inventory_handler = AsyncL2CacheInvalidationHandler::new(
            "wms_inventory_cache",
            inventory_cache.clone(),
            "wms:inventory:",
        );
        cache_invalidation_listener.register_handler(inventory_handler);
        let dict_handler = AsyncL2CacheInvalidationHandler::new(
            "wms_dict_cache",
            dict_cache.clone(),
            "wms:dict:",
        );
        cache_invalidation_listener.register_handler(dict_handler);
        let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

        match EventSubscriber::new("wms-cache-invalidation") {
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
                        tracing::error!("[wms] 缓存失效事件订阅者异常退出: {}", e);
                    }
                });
                tracing::info!("[wms] 缓存失效事件订阅者启动成功");
            }
            Err(e) => {
                tracing::warn!("[wms] 缓存失效事件订阅者创建失败: {}", e);
            }
        }
    }

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        event_publisher: ctx.event_publisher.clone(),
        warehouse_cache,
        inventory_cache,
        dict_cache,
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    // 插件路由（需要 ApiState）
    let plugin_routes = Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
        .with_state(api_state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由
    let protected_routes = modules::create_routes::<ApiState>()
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("wms:admin")))
        .with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::WmsApiDoc::openapi()).unwrap_or_else(|e| {
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

    // 启动事件订阅器
    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("WMS 事件订阅器启动警告: {}", e);
    }

    run(app).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = modules::openapi::WmsApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-wms-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-wms-openapi.json");
    }
}

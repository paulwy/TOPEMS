mod models;
mod shared;

pub mod modules;

use anyhow::Result;
use axum::{routing::get, Router};
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{
    bootstrap_service_shared, build_application, create_health_state,
    create_standard_health_routes, run, ServiceConfig,
};
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler, L2CacheConfig};
use topems_shared_db::scope::Db;
use topems_shared_event::event::{CacheInvalidatedPayload, EventSubscriber, EventType};

use modules::tms_plugin::{auto_register_to_core, get_plugin_info, plugin_health_check};
use shared::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    let config = ServiceConfig {
        name: "topems-tms",
        port: 8073,
        port_env_var: Some("TMS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/tms",
        legacy_prefixes: &[],
        ..Default::default()
    };

    let ctx = bootstrap_service_shared(&config).await?;

    // 表/索引/触发器/RLS 全部由迁移链维护，启动阶段不再执行任何 DDL。

    // 连接治理 B：共享池之上按模块固化 search_path（显式传值，不依赖 .env）
    // M-1 试点：请求上下文内禁止自开事务（scope / scope_read），必须复用请求事务
    let db = Db::new(ctx.db.clone(), "tms, public").deny_request_own_txn();

    // 多级缓存初始化（L1: moka 进程内缓存 + L2: Redis 分布式缓存）
    let l2_config = L2CacheConfig {
        instance_prefix: "tms".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("tms", "dict");
    let redis_url = std::env::var("REDIS_URL").ok();
    let dict_cache = match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（TMS，L1+L2 Redis 已启用）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（TMS，纯 L1 模式，Redis 未配置）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（TMS）: {}", warn);
            Arc::new(cache)
        }
    };

    // 启动期缓存预热已删除（2026-11-06）：原三份预热（司机/车辆/承运商）写入
    // `tms:<entity>:list:default:page:1:page_size:10:...`，但业务读路径从不用 `default`
    // 作为租户段——`driver.rs` / `vehicle.rs` 的列表键为 `tms:<entity>:list:<tenant_key>:...`
    // （超管 `all`、普通租户 uuid），`carrier.rs` 还多一个 `:locale:` 后缀；
    // 全仓库 grep 无任何读取 `list:default` 的代码。预热键永远不可能被命中，属死代码。
    // 车辆预热此前还读错了空壳 `public.vehicles`，一并随删除消失。

    // 缓存失效事件订阅（事件驱动缓存一致性）
    {
        let mut cache_invalidation_listener = CacheInvalidationListener::new("tms");
        let driver_cache_handler = AsyncL2CacheInvalidationHandler::new(
            "tms_driver_cache",
            dict_cache.clone(),
            "tms:driver:",
        );
        cache_invalidation_listener.register_handler(driver_cache_handler);
        let vehicle_cache_handler = AsyncL2CacheInvalidationHandler::new(
            "tms_vehicle_cache",
            dict_cache.clone(),
            "tms:vehicle:",
        );
        cache_invalidation_listener.register_handler(vehicle_cache_handler);
        let carrier_cache_handler = AsyncL2CacheInvalidationHandler::new(
            "tms_carrier_cache",
            dict_cache.clone(),
            "tms:carrier:",
        );
        cache_invalidation_listener.register_handler(carrier_cache_handler);
        let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

        match EventSubscriber::new("tms-cache-invalidation") {
            Ok(cache_subscriber) => {
                let listener = cache_invalidation_listener;
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
        db,
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
        .layer(axum::middleware::from_fn(require_module_write("tms")))
        .layer(axum::middleware::from_fn(require_module_access("tms")))
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
        let out_path = std::env::temp_dir().join("topems-tms-openapi.json");
        std::fs::write(&out_path, json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to {:?}", out_path);
    }
}

mod models;
mod services;
mod utils;

mod event_handlers;
pub mod modules;
mod sagas;
mod shared;

use anyhow::Result;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use modules::ApiState;
use topems_shared_event::redis::{RedisCacheService, RedisPool as RedisPoolTrait};
use topems_shared_event::redis::CacheService;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};

#[tokio::main]
async fn main() -> Result<()> {
    std::env::set_var("SEARCH_PATH", "hrm, public, shared");

    let config = ServiceConfig {
        name: "topems-hrm",
        port: 8020,
        port_env_var: Some("HRM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/hrm",
        legacy_prefixes: &["/api/v1/hrm", "/api/core/hrm/v1"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ HRM 事件订阅者启动失败: {}", e);
    }

    let cache = init_cache().await;
    tracing::info!("🗄️ 缓存服务初始化完成");

    let encryption = topems_shared_auth::security::init_encryption_from_env();
    tracing::info!("🔐 字段加密服务初始化完成");

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        cache,
        encryption: Arc::new(encryption),
        event_publisher: ctx.event_publisher.clone(),
        employee_cache: Arc::new(InMemoryCache::new(Duration::from_secs(3600))),
        department_cache: Arc::new(InMemoryCache::new(Duration::from_secs(1800))),
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state);

    // 业务路由
    let protected_routes = modules::create_routes().with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::ApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::hrm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

async fn init_cache() -> Arc<dyn CacheService + Send + Sync> {
    match std::env::var("REDIS_URL") {
        Ok(_) => {
            let redis_config = topems_shared_event::redis::RedisConfig::default();
            match RedisPoolTrait::new(&redis_config).await {
                Ok(pool) => {
                    tracing::info!("✅ 使用 Redis 缓存");
                    Arc::new(RedisCacheService::new(Arc::new(pool)))
                }
                Err(e) => {
                    tracing::warn!("⚠️ Redis 连接失败，回退到内存缓存: {}", e);
                    let cache_config = CacheConfig::default();
                    Arc::new(topems_shared_event::cache::InMemoryCache::new(cache_config))
                }
            }
        }
        Err(_) => {
            tracing::info!("⚠️ REDIS_URL 未设置，使用内存缓存");
            let cache_config = CacheConfig::default();
            Arc::new(topems_shared_event::cache::InMemoryCache::new(cache_config))
        }
    }
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

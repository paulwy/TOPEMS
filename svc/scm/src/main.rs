#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::too_many_arguments)]
#![allow(dead_code)]
mod event_handlers;

use topems_scm::modules;

use anyhow::Result;
use axum::{routing::get, Router};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use prometheus::{default_registry, Gauge};
use topems_scm::shared::cache::InMemoryCache;
use topems_shared::redis::{RedisCacheService, RedisPool as RedisPoolTrait};
use topems_shared::RedisConfig;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    Application, ServiceConfig,
};
use tower_http::{compression::CompressionLayer, timeout::TimeoutLayer};

use modules::{scm_plugin, ApiState};

#[tokio::main]
async fn main() -> Result<()> {
    // 设置search_path环境变量（供lib使用）
    env::set_var("SEARCH_PATH", "scm, public, shared");

    let config = ServiceConfig {
        name: "topems-scm",
        port: 8040,
        port_env_var: Some("SCM_PORT"),
        max_db_connections: 50,
        enable_events: true,
        api_prefix: "/api/scm",
        legacy_prefixes: &["/api/v1/scm"],
        ..Default::default()
    };

    // 注册自定义 Prometheus 指标（在 bootstrap_service 之前注册，确保 /metrics 可用）
    let custom_gauge = Gauge::new(
        "topems_scm_custom_metric",
        "This is a custom metric for TOPEMS-SCM",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ SCM 事件订阅者启动失败: {}", e);
    }

    // Redis 缓存（可选，失败不阻塞启动）
    let redis_cache = match env::var("REDIS_URL").ok() {
        Some(url) => {
            let redis_config = RedisConfig {
                url,
                max_connections: 20,
                connect_timeout: Some(5),
            };
            match RedisPoolTrait::new(&redis_config).await {
                Ok(pool) => {
                    let cache = Arc::new(RedisCacheService::new(Arc::new(pool)));
                    tracing::info!("✅ Redis 缓存服务已初始化");
                    Some(cache)
                }
                Err(e) => {
                    tracing::warn!("⚠️ Redis 初始化失败: {}", e);
                    None
                }
            }
        }
        None => {
            tracing::info!("ℹ️ 未配置 Redis URL，跳过缓存初始化");
            None
        }
    };

    let supplier_cache = Arc::new(InMemoryCache::new(Duration::from_secs(300)));
    let purchase_cache = Arc::new(InMemoryCache::new(Duration::from_secs(120)));
    let dict_cache = Arc::new(InMemoryCache::new(Duration::from_secs(600)));
    tracing::info!("💾 内存缓存初始化完成（供应商/采购/字典）");

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        cache: redis_cache,
        event_publisher: ctx.event_publisher.clone(),
        supplier_cache,
        purchase_cache,
        dict_cache,
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    // 插件路由（需要 ApiState）
    let plugin_routes = Router::new()
        .route("/api/plugins/info", get(scm_plugin::get_plugin_info))
        .route("/api/plugins/health", get(scm_plugin::plugin_health_check))
        .with_state(api_state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由
    let protected_routes = modules::create_routes().with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::ScmApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // SCM 额外的全局中间件：压缩 + 超时
    let router = app
        .router
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ));

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        scm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(Application {
        router,
        port: app.port,
        name: app.name,
    })
    .await
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // V32.0 AC-5: 本地主数据引用表，用于跨服务 master_data_id 关联
    // 消费端通过 master_data_id 查找本地业务记录，而非依赖业务编码
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS scm_master_data_refs (
            master_data_id   VARCHAR(128) PRIMARY KEY,
            tenant_id        UUID NOT NULL,
            domain           VARCHAR(32) NOT NULL,
            code             VARCHAR(128) NOT NULL,
            name             VARCHAR(256),
            status           VARCHAR(32) DEFAULT 'active',
            source_service   VARCHAR(64) NOT NULL,
            local_entity_type VARCHAR(64),
            local_entity_id  UUID,
            payload_snapshot JSONB,
            last_synced_at   TIMESTAMPTZ DEFAULT NOW(),
            created_at       TIMESTAMPTZ DEFAULT NOW(),
            updated_at       TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;
    tracing::info!("[scm] scm_master_data_refs 表已就绪（AC-5 本地主数据引用）");
    Ok(())
}

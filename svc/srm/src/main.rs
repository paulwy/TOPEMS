mod event_handlers;
mod models;
mod modules;
mod schema_defense;
mod services;
mod shared;

use shared::cache::InMemoryCache;

use anyhow::Result;
use axum::routing::get;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use prometheus::{default_registry, Gauge};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes,
    default_init_db, run, ServiceConfig,
};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

use modules::{
    create_bid_price_routes, create_category_routes, create_contract_routes,
    create_data_sync_routes, create_evaluation_routes, create_performance_routes,
    create_product_routes, create_purchase_order_routes, create_scoring_dimension_routes,
    create_statistics_routes, create_supplier_portal_routes, create_supplier_routes,
    create_tender_routes,
};

#[tokio::main]
async fn main() -> Result<()> {
    env::set_var("SEARCH_PATH", "srm, public, shared");

    let config = ServiceConfig {
        name: "topems-srm",
        port: 8042,
        port_env_var: Some("SRM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/srm",
        legacy_prefixes: &["/api/v1/srm"],
        ..Default::default()
    };

    // 注册自定义 Prometheus 指标
    let custom_gauge = Gauge::new(
        "topems_srm_custom_metric",
        "This is a custom metric for TOPEMS-SRM",
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

    tracing::info!("🚀 TOPEMS-SRM 供应商关系管理系统启动中...");

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = default_init_db(
        &ctx.db,
        "srm",
        false,
        schema_defense::run_schema_migration_and_verify,
    )
    .await
    {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ SRM 事件订阅者启动失败: {}", e);
    }

    let supplier_cache = Arc::new(InMemoryCache::new(Duration::from_secs(300)));
    tracing::info!("💾 内存缓存初始化完成（供应商）");

    let workflow_url =
        env::var("WORKFLOW_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client =
        TypedServiceClient::<WorkflowApi>::from_env_default().expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    // 构建业务路由（各模块 create_routes 自行管理内部状态）
    let protected_routes = axum::Router::new()
        .merge(
            create_supplier_routes(
                ctx.db.clone(),
                ctx.event_publisher.clone(),
                workflow_client,
                supplier_cache,
            )
            .await?,
        )
        .merge(create_category_routes(ctx.db.clone()).await?)
        .merge(create_evaluation_routes(ctx.db.clone()).await?)
        .merge(create_contract_routes(ctx.db.clone()).await?)
        .merge(create_product_routes(ctx.db.clone()).await?)
        .merge(create_purchase_order_routes(ctx.db.clone()).await?)
        .merge(create_bid_price_routes(ctx.db.clone()).await?)
        .merge(create_tender_routes(ctx.db.clone()).await?)
        .merge(create_supplier_portal_routes(ctx.db.clone()).await?)
        .merge(create_performance_routes(ctx.db.clone()).await?)
        .merge(create_data_sync_routes(ctx.db.clone(), ctx.event_publisher.clone()).await?)
        .merge(create_scoring_dimension_routes(ctx.db.clone()).await?)
        .merge(create_statistics_routes(ctx.db.clone()))
        // 预应用 tenant_middleware（build_application 会叠加 auth + rls + rate_limit）
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("srm:admin")));

    // 标准健康检查路由 + 插件路由
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state)
        .route(
            "/api/plugins/info",
            get(modules::srm_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::srm_plugin::plugin_health_check),
        );

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::SrmApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::srm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    tracing::info!("✅ TOPEMS-SRM 已就绪");
    tracing::info!("🔒 认证保护已启用");

    run(app).await
}
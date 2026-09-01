use anyhow::Result;
use axum::{routing::get, Router};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes,
    default_init_db, run, ServiceConfig,
};
use topems_shared_service_client::service_client::{
    ErpApi, TypedServiceClient, WmsApi, WorkflowApi,
};

mod models;
mod schema_defense;
mod services;
mod shared;

mod event_handlers;
pub mod modules;

use modules::ApiState;
use topems_shared_auth::middleware::require_permission;

#[tokio::main]
async fn main() -> Result<()> {
    env::set_var("SEARCH_PATH", "crm, public, shared");

    let config = ServiceConfig {
        name: "topems-crm",
        port: 8029,
        port_env_var: Some("CRM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/crm",
        legacy_prefixes: &["/api/v1/crm"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = default_init_db(
        &ctx.db,
        "crm",
        true,
        schema_defense::run_schema_migration_and_verify,
    )
    .await
    {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ CRM 事件订阅者启动失败: {}", e);
    }

    let encryption_service = topems_shared::init_encryption_from_env();
    tracing::info!("🔐 字段加密服务初始化成功");

    // 初始化 ERP / WMS 服务客户端（失败不阻塞启动，相关联动功能会优雅降级）
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let erp_client = match TypedServiceClient::<ErpApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "crm-service", &["erp:admin"]))
    {
        Ok(client) => {
            tracing::info!("🔗 ERP 服务客户端初始化成功（service token）");
            Some(Arc::new(client))
        }
        Err(e) => {
            tracing::warn!("⚠️ ERP 服务客户端初始化失败: {}", e);
            None
        }
    };
    let wms_client = match TypedServiceClient::<WmsApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "crm-service", &["wms:admin"]))
    {
        Ok(client) => {
            tracing::info!("🔗 WMS 服务客户端初始化成功（service token）");
            Some(Arc::new(client))
        }
        Err(e) => {
            tracing::warn!("⚠️ WMS 服务客户端初始化失败: {}", e);
            None
        }
    };

    let workflow_url =
        env::var("WORKFLOW_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "crm-service", &["workflow:read"]))
        .expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        encryption: Arc::new(encryption_service),
        event_publisher: ctx.event_publisher.clone(),
        erp_client,
        wms_client,
        workflow_client,
        customer_cache: Arc::new(shared::InMemoryCache::new(Duration::from_secs(3600))),
        dashboard_cache: Arc::new(shared::InMemoryCache::new(Duration::from_secs(300))),
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    // 插件路由（需要 ApiState）
    let plugin_routes = Router::new()
        .route("/plugins/info", get(modules::crm_plugin::get_plugin_info))
        .route(
            "/plugins/health",
            get(modules::crm_plugin::plugin_health_check),
        )
        .with_state(api_state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由（预应用 tenant_middleware，build_application 会叠加 auth + rls + rate_limit）
    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("crm:admin")))
        .with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::CrmApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::crm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

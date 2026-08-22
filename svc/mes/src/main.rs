//! TOPEMS MES Service
//!
//! Manufacturing Execution System Service

mod models;

use topems_mes::{modules, AppState};

use axum::routing::get;
use utoipa::OpenApi;

use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared_core::health::SimpleHealthConfig;

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

    if let Err(e) = modules::init_database(&ctx.db).await {
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

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config,
        event_publisher: ctx.event_publisher.clone(),
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
        .with_state(state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由
    let protected_routes = modules::create_routes()
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

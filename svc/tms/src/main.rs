mod models;
mod schema_defense;
mod shared;

pub mod modules;

use anyhow::Result;
use axum::{routing::get, Router};
use utoipa::OpenApi;

use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes,
    default_init_db, run, ServiceConfig,
};

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

    let app_state = AppState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        event_publisher: ctx.event_publisher.clone(),
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

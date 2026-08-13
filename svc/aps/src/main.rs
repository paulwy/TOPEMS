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

mod middleware;
mod models;
mod schema_defense;
mod shared;

pub mod modules;

use anyhow::Result;
use axum::{routing::get, Router};
use utoipa::OpenApi;

use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};

use modules::aps_plugin::{auto_register_to_core, get_plugin_info, plugin_health_check};
use modules::ApiState;

#[tokio::main]
async fn main() -> Result<()> {
    // 设置 search_path 环境变量（供 lib 使用）
    std::env::set_var("SEARCH_PATH", "aps, public, shared");

    let config = ServiceConfig {
        name: "topems-aps",
        port: 8043,
        port_env_var: Some("APS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/aps",
        legacy_prefixes: &["/api/v1/aps"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        event_publisher: ctx.event_publisher.clone(),
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
    let protected_routes = modules::create_routes::<ApiState>().with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::ApsApiDoc::openapi()).unwrap_or_else(|e| {
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

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[aps] Schema 防御检查失败: {:?}", e);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = modules::openapi::ApsApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-aps-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-aps-openapi.json");
    }
}

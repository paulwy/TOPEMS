use sqlx::PgPool;

mod conversion_rules;
mod event_bus;
mod event_handlers;
mod external_erp;
mod handlers;
mod mes_erp_sync;
mod mes_qms_integration;
mod models;
mod openapi;
mod plugin;
mod qms_lims_ehs;
mod retry_handler;
mod routes;
mod rule_engine;
mod schema_defense;
mod sync_retry;

use axum::{routing::get, Router};
use axum_prometheus::PrometheusMetricLayer;
use mes_erp_sync::MesErpSyncService;
use models::AppState;
use topems_integration::sync_scheduler;
use topems_shared_bootstrap::{
    bootstrap_service_shared, resolve_port, run, Application, ServiceConfig,
};
use topems_shared_core::logging::request_context_middleware;
use topems_shared_db::scope::Db;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-integration",
        port: 8072,
        port_env_var: Some("INTEGRATION_PORT"),
        max_db_connections: 5,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/integration",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service_shared(&config).await?;
    let db = Db::new(ctx.db.clone(), "integration, public");

    // 业务初始化：运行时 schema 一致性自检（建表 DDL 已收敛至迁移链，D7）+ 事件订阅者
    // 迁移/自检使用原生池（需要 DDL/会话级操作），业务查询统一走 Db 作用域。
    if let Err(e) = run_schema_defense(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("⚠️ Schema defense warning: {}", e);
    }
    if let Err(e) = event_handlers::start_event_subscribers(db.clone()).await {
        tracing::warn!("⚠️ Integration 事件订阅者启动失败: {}", e);
    }

    let lims_url =
        std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string());
    let qms_url =
        std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string());
    let mes_url =
        std::env::var("MES_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8030".to_string());
    let erp_url =
        std::env::var("ERP_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());
    let wms_url =
        std::env::var("WMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8041".to_string());
    let scm_url =
        std::env::var("SCM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8040".to_string());

    let app_state = AppState {
        db: db.clone(),
        lims_url,
        qms_url,
        mes_url: mes_url.clone(),
        erp_url: erp_url.clone(),
        wms_url,
        scm_url,
        auth_state: ctx.auth_state.clone(),
        mes_erp_sync_service: std::sync::Arc::new(MesErpSyncService::new(
            ctx.db.clone(),
            mes_url,
            erp_url,
        )),
    };

    // 业务路由（内部已完成 with_state + auth/rls/rate_limit/cors/telemetry/nest/legacy）
    // 请求级 RLS / tenant 中间件需要原生池；业务 handler 本身只拿到 Db。
    let business_router = routes::create_routes(app_state, ctx.db.clone());

    // 补 Prometheus layer + /metrics 路由（/health 已由 business_router 提供）
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metrics_router = Router::new().route(
        "/metrics",
        get(move || async move { metric_handle.render() }),
    );

    let final_router = Router::new()
        .merge(business_router)
        .merge(metrics_router)
        .layer(axum::middleware::from_fn(request_context_middleware))
        .layer(prometheus_layer)
        // integration 不走 build_application，手动补 /metrics 鉴权层（最外层）。
        .layer(topems_shared_bootstrap::metrics_auth_layer());

    let app = Application {
        router: final_router,
        port: resolve_port(&config),
        name: config.name,
    };

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    // 启动增量同步定时调度器
    let sync_pool = ctx.db.clone();
    tokio::spawn(async move {
        sync_scheduler::start_sync_scheduler(sync_pool).await;
    });

    run(app).await?;
    Ok(())
}

async fn run_schema_defense(pool: &PgPool) -> Result<(), sqlx::Error> {
    // V69.3 Schema 防御：增量迁移 + 一致性自检（8 表；建表 DDL 已收敛至迁移链，D7）
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[integration] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

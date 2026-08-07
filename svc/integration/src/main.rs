#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(dead_code)]

use sqlx::PgPool;

mod conversion_rules;
mod event_bus;
mod event_handlers;
mod handlers;
mod mes_erp_sync;
mod mes_qms_integration;
mod models;
mod plugin;
mod qms_lims_ehs;
mod retry_handler;
mod routes;
mod rule_engine;
mod sync_retry;

use axum::{routing::get, Router};
use axum_prometheus::PrometheusMetricLayer;
use conversion_rules::init_conversion_rules_table;
use mes_erp_sync::MesErpSyncService;
use models::AppState;
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};

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
        legacy_prefixes: &["/api/v1/integration"],
    };

    let ctx = bootstrap_service(&config).await?;

    // 业务初始化：表 + 事件订阅者
    if let Err(e) = init_database(&ctx.db).await {
        tracing::warn!("⚠️ Database initialization warning: {}", e);
    }
    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
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
        pool: ctx.db.clone(),
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
    let business_router = routes::create_routes(app_state);

    // 补 Prometheus layer + /metrics 路由
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metrics_router = Router::new().route(
        "/metrics",
        get(move || async move { metric_handle.render() }),
    );

    let final_router = Router::new()
        .merge(business_router)
        .merge(metrics_router)
        .layer(prometheus_layer);

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

    run(app).await?;
    Ok(())
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    init_conversion_rules_table(pool).await?;
    mes_qms_integration::init_mes_qms_tables(pool).await?;
    init_sync_tables(pool).await?;
    Ok(())
}

/// 初始化通用跨服务同步任务表（从 unified-core 迁移而来）
async fn init_sync_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_inter_module_sync (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            sync_type VARCHAR(64) NOT NULL,
            source_module VARCHAR(64) NOT NULL,
            target_module VARCHAR(64) NOT NULL,
            source_entity VARCHAR(128) NOT NULL,
            source_id UUID,
            source_code VARCHAR(128),
            status VARCHAR(32) DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            error_message TEXT,
            next_retry_at TIMESTAMP,
            executed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_inter_module_sync_status ON core_inter_module_sync(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_inter_module_sync_tenant ON core_inter_module_sync(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_inter_module_sync_source ON core_inter_module_sync(source_module)",
    )
    .execute(pool)
    .await?;

    Ok(())
}

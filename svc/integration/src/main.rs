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

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use topems_shared::{init_telemetry, AuthState};

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

use conversion_rules::init_conversion_rules_table;
use mes_erp_sync::MesErpSyncService;
use models::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-integration");

    tracing::info!("🚀 TOPEMS Integration Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("✅ Connected to PostgreSQL database");
            if let Err(e) = init_database(&pool).await {
                tracing::warn!("⚠️ Database initialization warning: {}", e);
            }
            if let Err(e) = event_handlers::start_event_subscribers(pool.clone()).await {
                tracing::warn!("⚠️ Integration 事件订阅者启动失败: {}", e);
            }
            pool
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to PostgreSQL: {}", e);
            panic!("Failed to connect to database");
        }
    };

    let lims_url = std::env::var("QUALITY_ASSURANCE_URL")
        .unwrap_or_else(|_| "http://localhost:8052".to_string());
    let qms_url = std::env::var("QUALITY_ASSURANCE_URL")
        .unwrap_or_else(|_| "http://localhost:8052".to_string());
    let mes_url = std::env::var("MES_URL").unwrap_or_else(|_| "http://localhost:8030".to_string());
    let erp_url = std::env::var("ERP_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());
    let wms_url = std::env::var("WMS_URL").unwrap_or_else(|_| "http://localhost:8042".to_string());
    let scm_url = std::env::var("SCM_URL").unwrap_or_else(|_| "http://localhost:8040".to_string());

    let app_state = AppState {
        pool: pool.clone(),
        lims_url,
        qms_url,
        mes_url: mes_url.clone(),
        erp_url: erp_url.clone(),
        wms_url,
        scm_url,
        auth_state: AuthState::from_env(),
        mes_erp_sync_service: std::sync::Arc::new(MesErpSyncService::new(pool, mes_url, erp_url)),
    };

    let app = routes::create_routes(app_state);

    let port = std::env::var("INTEGRATION_PORT")
        .or_else(|_| std::env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8072".to_string())
        .parse()
        .unwrap_or(8072);
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(
        "✅ TOPEMS Integration Service is running at http://{}",
        addr
    );
    tracing::info!("🔒 Authentication protection enabled");

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    init_conversion_rules_table(pool).await?;
    mes_qms_integration::init_mes_qms_tables(pool).await?;
    Ok(())
}

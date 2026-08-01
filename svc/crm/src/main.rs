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
#![allow(unused_imports)]

use anyhow::Result;
use axum::{routing::get, Router};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use topems_shared::service_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared::service_client::{create_erp_client, create_wms_client, create_workflow_client};
use topems_shared::{FieldEncryptionService, KeyManager};

mod middleware;
mod models;
mod services;
mod shared;

mod event_handlers;
pub mod modules;

use modules::ApiState;

#[tokio::main]
async fn main() -> Result<()> {
    env::set_var("SEARCH_PATH", "crm, shared, public");

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

    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ CRM 事件订阅者启动失败: {}", e);
    }

    let encryption_service = init_encryption_service();
    tracing::info!("🔐 字段加密服务初始化成功");

    // 初始化 ERP / WMS 服务客户端（失败不阻塞启动，相关联动功能会优雅降级）
    let erp_client = match create_erp_client() {
        Ok(client) => {
            tracing::info!("🔗 ERP 服务客户端初始化成功");
            Some(Arc::new(client))
        }
        Err(e) => {
            tracing::warn!("⚠️ ERP 服务客户端初始化失败: {}", e);
            None
        }
    };
    let wms_client = match create_wms_client() {
        Ok(client) => {
            tracing::info!("🔗 WMS 服务客户端初始化成功");
            Some(Arc::new(client))
        }
        Err(e) => {
            tracing::warn!("⚠️ WMS 服务客户端初始化失败: {}", e);
            None
        }
    };

    let workflow_url =
        env::var("WORKFLOW_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client = create_workflow_client().expect("工作流服务客户端初始化失败");
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
            middleware::tenant::tenant_middleware,
        ))
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

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // V32.0 AC-5: 本地主数据引用表，用于跨服务 master_data_id 关联
    // 消费端通过 master_data_id 查找本地业务记录，而非依赖业务编码
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm_master_data_refs (
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
    tracing::info!("[crm] crm_master_data_refs 表已就绪（AC-5 本地主数据引用）");
    Ok(())
}

fn init_encryption_service() -> FieldEncryptionService {
    let master_key = env::var("ENCRYPTION_MASTER_KEY").unwrap_or_else(|_| {
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string()
    });
    let key_bytes = hex::decode(&master_key).unwrap_or_else(|_| vec![0x42; 32]);
    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(&key_bytes[..32]);
    let key_manager = KeyManager::new(&key_array);
    FieldEncryptionService::new(key_manager)
}

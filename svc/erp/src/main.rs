mod event_handlers;
mod models;
mod sagas;
mod services;
mod shared;
mod utils;

pub mod modules;

use anyhow::Result;
use prometheus::{register_int_counter, register_int_gauge, IntCounter, IntGauge};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use modules::ApiState;
use topems_shared::service_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared::{
    FieldEncryptionService, KeyManager, NotificationServiceClient,
};
use topems_shared::service_client::{api::finance_api::FinanceApi, api::hrm_api::HrmApi, TypedServiceClient};

lazy_static::lazy_static! {
    pub static ref ASSET_COUNT: IntGauge = register_int_gauge!("topems_erp_asset_count", "Total number of assets in ERP system").expect("Failed to register asset_count gauge - check for duplicate metric registrations");
    pub static ref VOUCHER_COUNT: IntGauge = register_int_gauge!("topems_erp_voucher_count", "Total number of vouchers in ERP system").expect("Failed to register voucher_count gauge - check for duplicate metric registrations");
    pub static ref FINANCIAL_TRANSACTION_COUNT: IntCounter = register_int_counter!("topems_erp_financial_transactions_total", "Total number of financial transactions").expect("Failed to register financial_transactions counter - check for duplicate metric registrations");
    pub static ref ACTIVE_USERS: IntGauge = register_int_gauge!("topems_erp_active_users", "Number of active users in the last hour").expect("Failed to register active_users gauge - check for duplicate metric registrations");
    pub static ref API_REQUESTS_TOTAL: IntCounter = register_int_counter!("topems_erp_api_requests_total", "Total number of API requests").expect("Failed to register api_requests counter - check for duplicate metric registrations");
}

#[tokio::main]
async fn main() -> Result<()> {
    let config = ServiceConfig {
        name: "topems-erp",
        port: 8010,
        port_env_var: Some("ERP_PORT"),
        max_db_connections: 20,
        enable_events: true,
        api_prefix: "/api/erp",
        legacy_prefixes: &["/api/v1/erp"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    // 数据库初始化
    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    // 事件订阅者（失败不阻塞启动）
    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ ERP 事件订阅者启动失败: {}", e);
    }

    // 后台业务指标更新
    let pool_clone = ctx.db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            update_business_metrics(&pool_clone).await;
        }
    });

    // 初始化加密服务
    let encryption_service = init_encryption_service();
    tracing::info!("🔐 字段加密服务初始化成功");

    // 通知服务客户端
    let notification_service_url = env::var("NOTIFICATION_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let notification_client = Arc::new(NotificationServiceClient::with_base_url(
        notification_service_url,
    ));

    // HRM 服务客户端
    let hrm_client = TypedServiceClient::<HrmApi>::from_env_default()
        .map(Arc::new)
        .unwrap_or_else(|e| {
            tracing::warn!("HRM服务客户端初始化失败: {}, 将使用mock模式", e);
            let default_url = "http://localhost:8020".to_string();
            Arc::new(TypedServiceClient::new(HrmApi, default_url).unwrap_or_else(|e| {
                tracing::error!("默认HRM客户端创建失败: {}", e);
                panic!("HRM客户端创建失败，请检查HRM服务配置")
            }))
        });

    // Finance 服务客户端
    let finance_client = TypedServiceClient::<FinanceApi>::from_env_default()
        .map(Arc::new)
        .unwrap_or_else(|e| {
            tracing::warn!("Finance服务客户端初始化失败: {}, 将使用mock模式", e);
            let default_url = "http://localhost:8011".to_string();
            Arc::new(TypedServiceClient::new(FinanceApi, default_url).unwrap_or_else(|e| {
                tracing::error!("默认Finance客户端创建失败: {}", e);
                panic!("Finance客户端创建失败，请检查Finance服务配置")
            }))
        });

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        dict_cache: Arc::new(utils::InMemoryCache::new(Duration::from_secs(600))),
        notification_client,
        hrm_client,
        encryption: Arc::new(encryption_service),
        event_publisher: ctx.event_publisher.clone(),
        finance_client,
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state);

    // 业务路由
    let protected_routes = modules::create_routes().with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::ErpApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::erp_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

async fn update_business_metrics(pool: &sqlx::PgPool) {
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assets")
        .fetch_one(pool)
        .await
    {
        Ok(count) => ASSET_COUNT.set(count),
        Err(e) => tracing::warn!("Failed to update asset count: {}", e),
    }

    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM financial_vouchers")
        .fetch_one(pool)
        .await
    {
        Ok(count) => VOUCHER_COUNT.set(count),
        Err(e) => tracing::warn!("Failed to update voucher count: {}", e),
    }

    match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM audit_logs 
         WHERE created_at >= NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => ACTIVE_USERS.set(count),
        Err(e) => tracing::warn!("Failed to update active users: {}", e),
    }
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // V32.0 AC-5: 本地主数据引用表，用于跨服务 master_data_id 关联
    // 消费端通过 master_data_id 查找本地业务记录，而非依赖业务编码
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp_master_data_refs (
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
    tracing::info!("[erp] erp_master_data_refs 表已就绪（AC-5 本地主数据引用）");
    Ok(())
}

fn init_encryption_service() -> FieldEncryptionService {
    let master_key = env::var("ENCRYPTION_MASTER_KEY").unwrap_or_else(|_| {
        tracing::warn!(
            "ENCRYPTION_MASTER_KEY not set, using insecure default - MUST be changed in production"
        );
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string()
    });
    let key_bytes = hex::decode(&master_key).unwrap_or_else(|e| {
        tracing::warn!(
            "Failed to decode ENCRYPTION_MASTER_KEY as hex ({}), using fallback key",
            e
        );
        vec![0x42; 32]
    });
    let mut key_array = [0u8; 32];
    let source = if key_bytes.len() >= 32 {
        &key_bytes[..32]
    } else {
        tracing::warn!("ENCRYPTION_MASTER_KEY too short, padding with zeros");
        key_array[..key_bytes.len()].copy_from_slice(&key_bytes);
        return FieldEncryptionService::new(KeyManager::new(&key_array));
    };
    key_array.copy_from_slice(source);
    let key_manager = KeyManager::new(&key_array);
    FieldEncryptionService::new(key_manager)
}

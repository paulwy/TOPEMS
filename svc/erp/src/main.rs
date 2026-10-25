mod event_handlers;
mod models;
mod schema_defense;
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

use models::dict::DictType;
use modules::ApiState;
use topems_shared_auth::middleware::require_module_access;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes,
    default_init_db, run, ServiceConfig,
};
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_service_client::notification::NotificationServiceClient;
use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, api::hrm_api::HrmApi, api::mes_api::MesApi, TypedServiceClient,
};

lazy_static::lazy_static! {
    pub static ref ASSET_COUNT: IntGauge = match register_int_gauge!("topems_erp_asset_count", "Total number of assets in ERP system") {
        Ok(g) => g,
        Err(e) => panic!("Failed to register asset_count gauge - check for duplicate metric registrations: {e}"),
    };
    pub static ref VOUCHER_COUNT: IntGauge = match register_int_gauge!("topems_erp_voucher_count", "Total number of vouchers in ERP system") {
        Ok(g) => g,
        Err(e) => panic!("Failed to register voucher_count gauge - check for duplicate metric registrations: {e}"),
    };
    pub static ref FINANCIAL_TRANSACTION_COUNT: IntCounter = match register_int_counter!("topems_erp_financial_transactions_total", "Total number of financial transactions") {
        Ok(g) => g,
        Err(e) => panic!("Failed to register financial_transactions counter - check for duplicate metric registrations: {e}"),
    };
    pub static ref ACTIVE_USERS: IntGauge = match register_int_gauge!("topems_erp_active_users", "Number of active users in the last hour") {
        Ok(g) => g,
        Err(e) => panic!("Failed to register active_users gauge - check for duplicate metric registrations: {e}"),
    };
    pub static ref API_REQUESTS_TOTAL: IntCounter = match register_int_counter!("topems_erp_api_requests_total", "Total number of API requests") {
        Ok(g) => g,
        Err(e) => panic!("Failed to register api_requests counter - check for duplicate metric registrations: {e}"),
    };
}

#[allow(clippy::expect_used)] // tokio::main 宏展开内含 runtime.build().expect()，启动失败即崩溃属预期
#[tokio::main]
#[allow(clippy::indexing_slicing)] // tokio::main 宏展开渲染（runtime/lazy_static 内部索引），真实源码无索引
async fn main() -> Result<()> {
    std::env::set_var("SEARCH_PATH", "erp, public, shared");

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
    if let Err(e) = default_init_db(
        ctx.migrate_pool.as_ref().unwrap_or(&ctx.db),
        "erp",
        true,
        schema_defense::run_schema_migration_and_verify,
    )
    .await
    {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    // 创建字典缓存（在事件订阅者之前创建，以便传入）
    // 多级缓存初始化（L1: moka 进程内缓存 + L2: Redis 分布式缓存）
    let l2_config = L2CacheConfig {
        instance_prefix: "erp".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("erp", "dict_type");
    let redis_url = std::env::var("REDIS_URL").ok();
    let dict_cache = match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（ERP，L1+L2 Redis 已启用）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（ERP，纯 L1 模式，Redis 未配置）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（ERP）: {}", warn);
            Arc::new(cache)
        }
    };

    // 缓存预热：服务启动时异步加载常用字典数据，避免首次请求缓存未命中
    {
        let cache = dict_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[erp] 开始缓存预热...");

            // 预热字典类型列表（所有字典类型）
            match sqlx::query_as::<_, DictType>(
                "SELECT id, code, name, category, description, status, created_at, updated_at FROM dict_types WHERE deleted_at IS NULL ORDER BY category, code"
            )
            .fetch_all(&pool)
            .await
            {
                Ok(dict_types) => {
                    let cache_key = "erp:dict_type:dict:default:all";
                    if let Ok(value) = serde_json::to_value(&dict_types) {
                        cache.set(cache_key.to_string(), value).await;
                        tracing::info!("[erp] 字典类型列表缓存预热完成，共 {} 条", dict_types.len());
                    }
                }
                Err(e) => {
                    tracing::warn!("[erp] 字典类型列表缓存预热失败: {}", e);
                }
            }

            tracing::info!("[erp] 缓存预热完成");
        });
    }

    // 事件订阅者（失败不阻塞启动）
    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), dict_cache.clone()).await
    {
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
    let encryption_service = topems_shared::init_encryption_from_env();
    tracing::info!("🔐 字段加密服务初始化成功");

    // 通知服务客户端
    let notification_service_url = env::var("NOTIFICATION_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let notification_client = Arc::new(NotificationServiceClient::with_base_url(
        notification_service_url,
    ));

    // HRM 服务客户端（服务间认证：签发 service token 携带 hrm:admin）
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    // U10 降级治理：env/令牌签发失败时不再 panic，降级为默认地址 tokenless 客户端并告警；
    // 下游 HRM 不可达仅影响通讯录代理接口，主服务 /health 与核心功能不受影响；
    // 仅当 reqwest HTTP 栈本身无法初始化（灾难性）时才 fail-fast 返回错误。
    let hrm_client = match TypedServiceClient::<HrmApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "erp-service", &["hrm:admin"]))
    {
        Ok(c) => Arc::new(c),
        Err(e) => {
            tracing::warn!(error = %e, "HRM服务客户端带令牌初始化失败，降级为默认地址tokenless客户端；下游不可达时通讯录代理接口将报错，主服务继续启动");
            Arc::new(
                TypedServiceClient::new(HrmApi, "http://localhost:8020")
                    .map_err(|e| anyhow::anyhow!("HRM降级客户端也无法构建（HTTP栈异常）: {e}"))?,
            )
        }
    };

    // Finance 服务客户端（服务间认证：签发 service token 携带 finance:read）——同上降级策略
    let finance_client = match TypedServiceClient::<FinanceApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "erp-service", &["finance:read"]))
    {
        Ok(c) => Arc::new(c),
        Err(e) => {
            tracing::warn!(error = %e, "Finance服务客户端带令牌初始化失败，降级为默认地址tokenless客户端；下游不可达时合并报表审批接口将报错，主服务继续启动");
            Arc::new(
                TypedServiceClient::new(FinanceApi, "http://localhost:8011").map_err(|e| {
                    anyhow::anyhow!("Finance降级客户端也无法构建（HTTP栈异常）: {e}")
                })?,
            )
        }
    };

    // MES 服务客户端（生产执行闭环：erp 审核通过后下达生产工单，service token mes:admin）——同上降级策略
    let mes_client = match TypedServiceClient::<MesApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "erp-service", &["mes:admin"]))
    {
        Ok(c) => Arc::new(c),
        Err(e) => {
            tracing::warn!(error = %e, "MES服务客户端带令牌初始化失败，降级为默认地址tokenless客户端；下游不可达时工单下达接口将报错，主服务继续启动");
            Arc::new(
                TypedServiceClient::new(MesApi, "http://localhost:8030")
                    .map_err(|e| anyhow::anyhow!("MES降级客户端也无法构建（HTTP栈异常）: {e}"))?,
            )
        }
    };

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        dict_cache,
        notification_client,
        hrm_client,
        encryption: Arc::new(encryption_service),
        event_publisher: ctx.event_publisher.clone(),
        finance_client,
        mes_client,
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state);

    // 业务路由
    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_module_access("erp")))
        .with_state(api_state);

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

    // D6：事件发布重试后台任务——周期扫描 Redis ZSET 到期项重发，成功 ZREM。
    {
        let pool = ctx.db.clone();
        let publisher = ctx.event_publisher.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(std::time::Duration::from_secs(15));
            loop {
                tick.tick().await;
                modules::searchable_projection::retry_due_events(&pool, &publisher).await;
            }
        });
    }

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
        "SELECT COUNT(*) FROM public.audit_logs 
         WHERE created_at >= NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => ACTIVE_USERS.set(count),
        Err(e) => tracing::warn!("Failed to update active users: {}", e),
    }
}

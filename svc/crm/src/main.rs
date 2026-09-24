use anyhow::Result;
use axum::{routing::get, Router};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;
use uuid::Uuid;

use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes,
    default_init_db, run, ServiceConfig,
};
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler, L2CacheConfig};
use topems_shared_event::event::{CacheInvalidatedPayload, EventSubscriber, EventType};
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
        ctx.migrate_pool.as_ref().unwrap_or(&ctx.db),
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

    // ===== 多级缓存初始化（L1: moka 进程内缓存 + L2: Redis 分布式缓存）=====
    let redis_url = std::env::var("REDIS_URL").ok();

    let customer_l2_config = L2CacheConfig {
        instance_prefix: "crm".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("crm", "customer");
    let customer_cache =
        match AsyncL2Cache::<serde_json::Value>::try_new(customer_l2_config, redis_url.as_deref())
            .await
        {
            Ok(cache) => {
                if cache.has_l2() {
                    tracing::info!("💾 多级缓存初始化完成（CRM customer，L1+L2 Redis）");
                } else {
                    tracing::info!("💾 多级缓存初始化完成（CRM customer，纯 L1）");
                }
                Arc::new(cache)
            }
            Err((cache, warn)) => {
                tracing::warn!("💾 多级缓存初始化降级（CRM customer）: {}", warn);
                Arc::new(cache)
            }
        };

    let opportunity_l2_config = L2CacheConfig {
        instance_prefix: "crm".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("crm", "opportunity");
    let opportunity_cache = match AsyncL2Cache::<serde_json::Value>::try_new(
        opportunity_l2_config,
        redis_url.as_deref(),
    )
    .await
    {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（CRM opportunity，L1+L2 Redis）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（CRM opportunity，纯 L1）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（CRM opportunity）: {}", warn);
            Arc::new(cache)
        }
    };

    let dict_l2_config = L2CacheConfig {
        instance_prefix: "crm".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("crm", "dict");
    let dict_cache =
        match AsyncL2Cache::<String>::try_new(dict_l2_config, redis_url.as_deref()).await {
            Ok(cache) => {
                if cache.has_l2() {
                    tracing::info!("💾 多级缓存初始化完成（CRM dict，L1+L2 Redis）");
                } else {
                    tracing::info!("💾 多级缓存初始化完成（CRM dict，纯 L1）");
                }
                Arc::new(cache)
            }
            Err((cache, warn)) => {
                tracing::warn!("💾 多级缓存初始化降级（CRM dict）: {}", warn);
                Arc::new(cache)
            }
        };

    let dashboard_l2_config = L2CacheConfig {
        instance_prefix: "crm".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(300),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("crm", "dashboard");
    let dashboard_cache =
        match AsyncL2Cache::<serde_json::Value>::try_new(dashboard_l2_config, redis_url.as_deref())
            .await
        {
            Ok(cache) => {
                if cache.has_l2() {
                    tracing::info!("💾 多级缓存初始化完成（CRM dashboard，L1+L2 Redis）");
                } else {
                    tracing::info!("💾 多级缓存初始化完成（CRM dashboard，纯 L1）");
                }
                Arc::new(cache)
            }
            Err((cache, warn)) => {
                tracing::warn!("💾 多级缓存初始化降级（CRM dashboard）: {}", warn);
                Arc::new(cache)
            }
        };

    // 缓存预热：启动时异步加载客户列表默认页，避免首次请求缓存未命中
    {
        let cache = customer_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[crm] 开始客户列表缓存预热...");
            // 预热使用默认租户占位（与 create_customer 中使用的组织 UUID 一致），
            // 默认参数：page=1, page_size=25, search=None
            let warmup_tenant = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
                .expect("default tenant uuid");
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM crm.customers WHERE deleted_at IS NULL AND tenant_id = $1),
                    'page', 1,
                    'page_size', 25
                ) as data
                FROM (
                    SELECT c.* FROM crm.customers c
                    WHERE c.deleted_at IS NULL AND c.tenant_id = $1
                    ORDER BY c.created_at DESC
                    LIMIT 25 OFFSET 0
                ) t
                "#,
            )
            .bind(&warmup_tenant)
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = format!(
                        "crm:customer:list:{}:page:1:size:25:search:None",
                        warmup_tenant
                    );
                    cache.set(cache_key, data).await;
                    tracing::info!("[crm] 客户列表缓存预热完成");
                }
                Ok(None) => tracing::info!("[crm] 客户列表为空，跳过预热"),
                Err(e) => tracing::warn!("[crm] 客户列表缓存预热失败: {}", e),
            }
        });
    }

    // 缓存失效事件订阅（事件驱动缓存一致性）
    {
        let mut cache_invalidation_listener = CacheInvalidationListener::new("crm");
        cache_invalidation_listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "crm_customer_cache",
            customer_cache.clone(),
            "crm:customer:",
        ));
        cache_invalidation_listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "crm_opportunity_cache",
            opportunity_cache.clone(),
            "crm:opportunity:",
        ));
        cache_invalidation_listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "crm_dict_cache",
            dict_cache.clone(),
            "crm:dict:",
        ));
        cache_invalidation_listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "crm_dashboard_cache",
            dashboard_cache.clone(),
            "crm:dashboard:",
        ));
        let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

        match EventSubscriber::new("crm-cache-invalidation") {
            Ok(cache_subscriber) => {
                let listener = cache_invalidation_listener.clone();
                let cache_subscriber =
                    cache_subscriber.subscribe(vec![EventType::CacheInvalidated], move |event| {
                        let listener = listener.clone();
                        Box::pin(async move {
                            if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                                let invalidation_event = CacheInvalidationEvent {
                                    source_service: payload.source_service,
                                    source_instance: payload.source_instance,
                                    cache_key_pattern: payload.cache_key_pattern,
                                    invalidation_level: InvalidationLevel::from_str(
                                        &payload.invalidation_level,
                                    ),
                                    reason: payload.reason,
                                };
                                listener.dispatch_invalidation(&invalidation_event);
                            }
                        })
                    });

                tokio::spawn(async move {
                    if let Err(e) = cache_subscriber.start_listening().await {
                        tracing::error!("[crm] 缓存失效事件订阅者异常退出: {}", e);
                    }
                });
                tracing::info!("[crm] 缓存失效事件订阅者启动成功");
            }
            Err(e) => {
                tracing::warn!("[crm] 缓存失效事件订阅者创建失败: {}", e);
            }
        }
    }

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
        customer_cache,
        opportunity_cache,
        dict_cache,
        dashboard_cache,
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

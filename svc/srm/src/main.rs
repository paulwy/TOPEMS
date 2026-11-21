mod event_handlers;
mod models;
mod modules;
mod services;
mod shared;

use axum::routing::get;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use prometheus::{default_registry, Gauge};
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{
    bootstrap_service_with_search_path, build_application, create_health_state,
    create_standard_health_routes, run, ServiceConfig,
};
use topems_shared_core::error::TopemsError;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

use modules::{
    create_bid_price_routes, create_bidding_routes, create_category_routes, create_contract_routes,
    create_data_sync_routes, create_evaluation_routes, create_inquiry_routes,
    create_performance_routes, create_product_routes, create_purchase_order_routes,
    create_quotation_routes, create_scoring_dimension_routes, create_statistics_routes,
    create_supplier_portal_routes, create_supplier_routes, create_tender_routes,
};

#[tokio::main]
async fn main() -> Result<(), TopemsError> {
    let config = ServiceConfig {
        name: "topems-srm",
        port: 8042,
        port_env_var: Some("SRM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/srm",
        legacy_prefixes: &[],
        ..Default::default()
    };

    // 注册自定义 Prometheus 指标
    let custom_gauge = Gauge::new(
        "topems_srm_custom_metric",
        "This is a custom metric for TOPEMS-SRM",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    tracing::info!("🚀 TOPEMS-SRM 供应商关系管理系统启动中...");

    let ctx = bootstrap_service_with_search_path(&config, "srm, public, shared").await?;

    // 请求链路统一走受守卫的 Db：各模块 AppState 共享同一实例，handler 复用请求事务。
    let request_db = topems_shared_db::scope::Db::new(ctx.db.clone(), "srm, public, shared")
        .deny_request_own_txn()
        .deny_request_tenant_scope();
    // 系统通道专用原始池：审计落库、同步日志与后台 MDM 同步任务使用。
    let system_pool = ctx.db.clone();

    // 多级缓存初始化（L1: moka 进程内缓存 + L2: Redis 分布式缓存）
    let l2_config = L2CacheConfig {
        instance_prefix: "srm".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(300),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("srm", "supplier");
    let redis_url = std::env::var("REDIS_URL").ok();
    let supplier_cache = match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（SRM，L1+L2 Redis 已启用）");
            } else {
                tracing::info!("💾 多级缓存初始化完成（SRM，纯 L1 模式，Redis 未配置）");
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（SRM）: {}", warn);
            Arc::new(cache)
        }
    };

    // 缓存预热：服务启动时异步加载常用数据，避免首次请求缓存未命中
    {
        let cache = supplier_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[srm] 开始缓存预热...");

            // 预热供应商列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM srm.suppliers WHERE deleted_at IS NULL),
                    'page', 1,
                    'page_size', 20
                ) as data
                FROM (
                    SELECT s.* FROM srm.suppliers s
                    WHERE s.deleted_at IS NULL
                    ORDER BY s.created_at DESC
                    LIMIT 20 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = "srm:suppliers:default:page:1:size:20:search:None:status:None:category:None:sort:created_at:order:desc";
                    cache.set(cache_key.to_string(), data).await;
                    tracing::info!("[srm] 供应商列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[srm] 供应商列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[srm] 供应商列表缓存预热失败: {}", e);
                }
            }

            tracing::info!("[srm] 缓存预热完成");
        });
    }

    if let Err(e) = event_handlers::start_event_subscribers(
        ctx.db.clone(),
        ctx.event_publisher.clone(),
        supplier_cache.clone(),
    )
    .await
    {
        tracing::warn!("⚠️ SRM 事件订阅者启动失败: {}", e);
    }

    let workflow_url =
        env::var("WORKFLOW_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    // U10 降级治理：令牌签发/构建失败时不再 .expect panic，降级为同地址 tokenless 客户端并
    // 告警；下游 unified-core(workflow) 不可达仅影响供应商准入审批流，主服务继续启动。
    let workflow_client = match TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "srm-service", &["workflow:read"]))
    {
        Ok(client) => {
            tracing::info!(
                "🔗 工作流服务客户端初始化成功（service token）: {}",
                workflow_url
            );
            client
        }
        Err(e) => {
            tracing::warn!(error = %e, "工作流服务客户端带令牌初始化失败，降级为同地址tokenless客户端；审批流在恢复前将报错，主服务继续启动");
            TypedServiceClient::new(WorkflowApi, &workflow_url).map_err(|e| {
                TopemsError::NetworkRequest(format!(
                    "工作流降级客户端也无法构建（HTTP栈异常）: {e}"
                ))
            })?
        }
    };

    // 管理端路由：保留全量 srm:admin 伞码作为硬防线（内部采购/管理人员）。
    let admin_routes = axum::Router::new()
        .merge(
            create_supplier_routes(
                request_db.clone(),
                system_pool.clone(),
                ctx.event_publisher.clone(),
                workflow_client,
                supplier_cache,
            )
            .await?,
        )
        .merge(create_category_routes(request_db.clone()).await?)
        .merge(create_evaluation_routes(request_db.clone()).await?)
        .merge(create_contract_routes(request_db.clone()).await?)
        .merge(create_product_routes(request_db.clone()).await?)
        .merge(create_purchase_order_routes(request_db.clone()).await?)
        .merge(create_quotation_routes(request_db.clone()).await?)
        .merge(create_bid_price_routes(request_db.clone()).await?)
        .merge(create_bidding_routes(request_db.clone()).await?)
        .merge(create_tender_routes(request_db.clone()).await?)
        .merge(create_performance_routes(request_db.clone()).await?)
        .merge(
            create_data_sync_routes(
                request_db.clone(),
                system_pool.clone(),
                ctx.event_publisher.clone(),
            )
            .await?,
        )
        .merge(create_inquiry_routes(request_db.clone()).await?)
        .merge(create_scoring_dimension_routes(request_db.clone()).await?)
        .merge(create_statistics_routes(request_db.clone()))
        // 预应用 tenant_middleware（build_application 会叠加 auth + rls + rate_limit）
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        // 模块门只负责「能进 srm + 读」；写仍要求 srm:admin（避免 srm:read 提权）。
        // 供应商自助门户 portal_routes 不在本门内（其 handler 内部做细粒度校验）。
        .layer(axum::middleware::from_fn(require_module_write("srm")))
        .layer(axum::middleware::from_fn(require_module_access("srm")));

    // 供应商自助门户路由：从全量 srm:admin 粗粒度伞码放开。
    // 仅预应用 tenant_middleware；端点内部 check_permission(SupplierRead) 做细粒度校验，
    // 并按 path supplier_id + tenant_id 限定读自己的数据（管理写操作仍在 admin_routes）。
    let portal_routes = axum::Router::new()
        .merge(create_supplier_portal_routes(request_db.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

    let protected_routes = admin_routes.merge(portal_routes);

    // 标准健康检查路由 + 插件路由
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state)
        .route(
            "/api/plugins/info",
            get(modules::srm_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::srm_plugin::plugin_health_check),
        );

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::SrmApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::srm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    // D6：事件发布重试后台任务——周期扫描 Redis ZSET 到期项重发（typed 通道直重发；
    // srm 无 searchable 通道，rebuild 回调恒返回 None）。对齐 pm/hrm/qms 注册范式。
    {
        let publisher = ctx.event_publisher.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(std::time::Duration::from_secs(15));
            loop {
                tick.tick().await;
                if let Some(p) = &publisher {
                    topems_shared_event::event::commit_retry::run_relay(
                        "srm",
                        p,
                        |_entity_type: &str, _entity_id: uuid::Uuid| async {
                            Option::<serde_json::Value>::None
                        },
                    )
                    .await;
                }
            }
        });
    }

    tracing::info!("✅ TOPEMS-SRM 已就绪");
    tracing::info!("🔒 认证保护已启用");

    run(app).await.map_err(Into::into)
}

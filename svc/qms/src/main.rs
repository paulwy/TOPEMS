//! TOPEMS QMS Service
//!
//! Unified service for QMS (Quality Management), LIMS (Laboratory), and EHS (Environment Health Safety)

mod models;
mod openapi;
mod shared;

pub mod modules;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared::{ApiResponse, AuthState, LocalInMemoryCache};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
    InMemoryCacheInvalidationHandler,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_event::event::{
    CacheInvalidatedPayload, EventPublisher, EventSubscriber, EventType,
};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: sqlx::PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<std::sync::Arc<EventPublisher>>,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub dict_cache: std::sync::Arc<LocalInMemoryCache<serde_json::Value>>,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl axum::extract::FromRef<AppState> for TypedServiceClient<WorkflowApi> {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "qms, public");

    let config = ServiceConfig {
        name: "topems-qms",
        port: 8050,
        port_env_var: Some("QMS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/qms",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;

    // QMS 模块 DB 初始化
    if let Err(e) = modules::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("QMS module database init warning: {}", e);
    }

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "qms-service", &["workflow:read"]))
        .expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let dict_cache = std::sync::Arc::new(LocalInMemoryCache::new(std::time::Duration::from_secs(600)));
    tracing::info!("💾 字典缓存初始化完成（QMS，TTL 600秒）");

    // 缓存预热：服务启动时异步加载常用字典数据，避免首次请求缓存未命中
    {
        let cache = dict_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[qms] 开始缓存预热...");

            // 预热质量标准列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM quality_standards WHERE deleted_at IS NULL),
                    'page', 1,
                    'pagesize', 20
                ) as data
                FROM (
                    SELECT qs.* FROM quality_standards qs
                    WHERE qs.deleted_at IS NULL
                    ORDER BY qs.created_at DESC
                    LIMIT 20 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key = "qms:quality_standard:list:default:page:1:pagesize:20:category:None:status:None:search:None";
                    cache.set(cache_key.to_string(), data);
                    tracing::info!("[qms] 质量标准列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[qms] 质量标准列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[qms] 质量标准列表缓存预热失败: {}", e);
                }
            }

            tracing::info!("[qms] 缓存预热完成");
        });
    }

    // 缓存失效事件订阅（事件驱动缓存一致性）
    {
        let mut cache_invalidation_listener = CacheInvalidationListener::new("qms");
        let quality_standard_cache_handler = InMemoryCacheInvalidationHandler::new(
            "qms_quality_standard_cache",
            dict_cache.clone(),
            "qms:quality_standard:",
        );
        cache_invalidation_listener.register_handler(quality_standard_cache_handler);
        let cache_invalidation_listener = std::sync::Arc::new(cache_invalidation_listener);

        match EventSubscriber::new("qms-cache-invalidation") {
            Ok(cache_subscriber) => {
                let listener = cache_invalidation_listener.clone();
                let cache_subscriber = cache_subscriber
                    .subscribe(vec![EventType::CacheInvalidated], move |event| {
                        let listener = listener.clone();
                        Box::pin(async move {
                            if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                                let invalidation_event = CacheInvalidationEvent {
                                    source_service: payload.source_service,
                                    source_instance: payload.source_instance,
                                    cache_key_pattern: payload.cache_key_pattern,
                                    invalidation_level: InvalidationLevel::from_str(&payload.invalidation_level),
                                    reason: payload.reason,
                                };
                                listener.dispatch_invalidation(&invalidation_event);
                            }
                        })
                    });

                tokio::spawn(async move {
                    if let Err(e) = cache_subscriber.start_listening().await {
                        tracing::error!("[qms] 缓存失效事件订阅者异常退出: {}", e);
                    }
                });
                tracing::info!("[qms] 缓存失效事件订阅者启动成功");
            }
            Err(e) => {
                tracing::warn!("[qms] 缓存失效事件订阅者创建失败: {}", e);
            }
        }
    }

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config: SimpleHealthConfig::new("topems-qms").with_db(ctx.db.clone()),
        event_publisher: ctx.event_publisher.clone(),
        workflow_client,
        dict_cache,
    };

    // Public routes（需 AppState）
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/metrics", get(prometheus_metrics_handler))
        .with_state(api_state.clone());

    // Protected routes（QMS create_routes 返回 Router<AppState>，最后 with_state 擦除类型）
    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/api/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn(require_permission("qms:admin")))
        .with_state(api_state.clone())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

    let openapi_json =
        serde_json::to_string_pretty(&openapi::QmsApiDoc::openapi()).unwrap_or_default();
    let app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::qms_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS QMS Service API\n\n\
     Unified service for QMS, LIMS and EHS\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    use topems_shared_bootstrap::build_detailed_health_response;
    let modules = serde_json::json!({ "qms": "active", "lims": "active", "ehs": "active" });
    let resp = build_detailed_health_response(
        &state.pool,
        "qms-service",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    Json(ApiResponse::success(resp, "Detailed health check"))
}

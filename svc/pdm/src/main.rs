//! TOPEMS PDM Service
//!
//! Product Data Management Service

mod event_handlers;
mod models;
mod modules;
mod services;
mod shared;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared::ApiResponse;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, default_init_db, prometheus_metrics_handler, run,
    ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};

pub use shared::AppState;

use modules::ApiDoc;

// ==================== 主入口 ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "pdm, public");

    let config = ServiceConfig {
        name: "topems-pdm",
        port: 8031,
        port_env_var: Some("PDM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/pdm",
        legacy_prefixes: &["/api/v1/pdm"],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = models::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("PDM database init warning: {}", e);
    }
    if let Err(e) = default_init_db(
        &ctx.db,
        "pdm",
        true,
        // pdm 的 schema 初始化已由上方的 models::init_database 完成，
        // 此处仅负责 master_data_refs 表，schema_defense 步骤留空。
        |_| async { Ok::<(), sqlx::Error>(()) },
    )
    .await
    {
        tracing::warn!("PDM AC-5 ref 表初始化警告: {}", e);
    }

    // 多级缓存初始化（L1: moka 进程内缓存 + L2: Redis 分布式缓存）
    let l2_config = topems_shared_core::l2_cache::L2CacheConfig {
        instance_prefix: "pdm".to_string(),
        l1_ttl: std::time::Duration::from_secs(60),
        l2_ttl: std::time::Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("pdm", "material");
    let redis_url = std::env::var("REDIS_URL").ok();
    let dict_cache =
        match topems_shared_core::l2_cache::AsyncL2Cache::try_new(l2_config, redis_url.as_deref())
            .await
        {
            Ok(cache) => {
                if cache.has_l2() {
                    tracing::info!("💾 多级缓存初始化完成（PDM，L1+L2 Redis 已启用）");
                } else {
                    tracing::info!("💾 多级缓存初始化完成（PDM，纯 L1 模式，Redis 未配置）");
                }
                std::sync::Arc::new(cache)
            }
            Err((cache, warn)) => {
                tracing::warn!("💾 多级缓存初始化降级（PDM）: {}", warn);
                std::sync::Arc::new(cache)
            }
        };

    // 缓存预热：服务启动时异步加载常用字典数据，避免首次请求缓存未命中
    {
        let cache = dict_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[pdm] 开始缓存预热...");

            // 预热物料列表（第一页，默认参数）
            match sqlx::query_scalar::<_, serde_json::Value>(
                r#"
                SELECT json_build_object(
                    'items', COALESCE(json_agg(t), '[]'::json),
                    'total', (SELECT COUNT(*) FROM pdm_materials WHERE deleted_at IS NULL),
                    'page', 1,
                    'pagesize', 20
                ) as data
                FROM (
                    SELECT m.* FROM pdm_materials m
                    WHERE m.deleted_at IS NULL
                    ORDER BY m.created_at DESC
                    LIMIT 20 OFFSET 0
                ) t
                "#,
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    let cache_key =
                        "pdm:material:list:default:page:1:pagesize:20:search:None:status:None";
                    cache.set(cache_key.to_string(), data).await;
                    tracing::info!("[pdm] 物料列表缓存预热完成");
                }
                Ok(None) => {
                    tracing::info!("[pdm] 物料列表为空，跳过预热");
                }
                Err(e) => {
                    tracing::warn!("[pdm] 物料列表缓存预热失败: {}", e);
                }
            }

            tracing::info!("[pdm] 缓存预热完成");
        });
    }

    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), dict_cache.clone()).await
    {
        tracing::warn!("⚠️ PDM 事件订阅者启动失败: {}", e);
    }

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config: SimpleHealthConfig::new("topems-pdm").with_db(ctx.db.clone()),
        event_publisher: ctx.event_publisher.clone(),
        dict_cache,
    };

    // Public routes（stateful：/health + /api/health/detailed + /api/plugins/*）
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/metrics", get(prometheus_metrics_handler))
        .route(
            "/api/plugins/info",
            get(modules::pdm_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::pdm_plugin::plugin_health_check),
        )
        .route("/api/health/detailed", get(detailed_health))
        .with_state(api_state.clone());

    // Protected routes（先 merge 业务路由 + tenant_middleware → build_application 再加 auth/rls/rate_limit）
    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
        .layer(axum::middleware::from_fn_with_state(
            api_state.pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("pdm:admin")))
        .with_state(api_state.clone());

    let openapi_json = serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_default();
    let app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    run(app).await?;
    Ok(())
}

// ==================== 公共处理函数 ====================

static HOME_TEXT: &str =
    "TOPEMS PDM Service API\n\nProduct Data Management\n\n- /health - Health check";

async fn home() -> &'static str {
    HOME_TEXT
}

// 注：P1-R1 治理 — 未来可改用 topems_shared_bootstrap::default_home_text("TOPEMS PDM", "Product Data Management")
// 当前保留 async fn home() 以兼容 axum Handler trait 约束。

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    use topems_shared_bootstrap::build_detailed_health_response;
    let modules = serde_json::json!({ "pdm": "active" });
    let resp = build_detailed_health_response(
        &state.pool,
        "pdm-service",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    Json(ApiResponse::success(resp, "Detailed health check"))
}

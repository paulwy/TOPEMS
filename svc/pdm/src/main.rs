//! TOPEMS PDM Service
//!
//! Product Data Management Service

mod event_handlers;
mod models;
mod modules;
mod services;
mod shared;

use axum::{extract::State, routing::get, Router};
use utoipa::OpenApi;

use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{
    bootstrap_service_shared, build_application, default_init_db, prometheus_metrics_handler, run,
    ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;

pub use shared::AppState;

use modules::ApiDoc;

// ==================== 主入口 ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-pdm",
        port: 8031,
        port_env_var: Some("PDM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/pdm",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service_shared(&config).await?;

    // 连接治理 B：共享池之上按模块固化 search_path（显式传值，不依赖 .env）
    let db = Db::new(ctx.db.clone(), "pdm, public");

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
        let warmup_db = db.clone();
        tokio::spawn(async move {
            tracing::info!("[pdm] 开始缓存预热...");

            // 预热查询使用裸表名，必须走模块作用域（事务级 search_path）
            let mut scope = match warmup_db.scope_read_system().await {
                Ok(scope) => scope,
                Err(e) => {
                    tracing::warn!("[pdm] 缓存预热建立作用域失败: {}", e);
                    return;
                }
            };

            // 预热物料列表：按租户分别预热。缓存键必须带租户维度，
            // 禁止把跨租户聚合写进 default / all 这类共享桶（否则会串租户）。
            match sqlx::query_scalar::<_, uuid::Uuid>(
                "SELECT DISTINCT tenant_id FROM pdm_materials \
                 WHERE deleted_at IS NULL AND tenant_id IS NOT NULL",
            )
            .fetch_all(&mut scope)
            .await
            {
                Ok(tenants) => {
                    for tid in tenants {
                        match sqlx::query_scalar::<_, serde_json::Value>(
                            r#"
                            SELECT json_build_object(
                                'items', COALESCE(json_agg(t), '[]'::json),
                                'total', (SELECT COUNT(*) FROM pdm_materials
                                          WHERE deleted_at IS NULL AND tenant_id = $1),
                                'page', 1,
                                'page_size', 20
                            ) as data
                            FROM (
                                SELECT m.* FROM pdm_materials m
                                WHERE m.deleted_at IS NULL AND m.tenant_id = $1
                                ORDER BY m.created_at DESC
                                LIMIT 20 OFFSET 0
                            ) t
                            "#,
                        )
                        .bind(tid)
                        .fetch_one(&mut scope)
                        .await
                        {
                            Ok(data) => {
                                let cache_key =
                                    crate::modules::material::materials_list_cache_key(
                                        tid,
                                        1,
                                        20,
                                        &None,
                                        &None,
                                        topems_shared_core::locale::Locale::Zh.as_sql(),
                                    );
                                cache.set(cache_key, data).await;
                            }
                            Err(e) => {
                                tracing::warn!("[pdm] 租户 {} 物料列表预热失败: {}", tid, e)
                            }
                        }
                    }
                    tracing::info!("[pdm] 物料列表缓存预热完成");
                }
                Err(e) => {
                    tracing::warn!("[pdm] 物料列表缓存预热失败: {}", e);
                }
            }

            if let Err(e) = scope.commit().await {
                tracing::warn!("[pdm] 缓存预热事务提交失败: {}", e);
            }
            tracing::info!("[pdm] 缓存预热完成");
        });
    }

    if let Err(e) = event_handlers::start_event_subscribers(db.clone(), dict_cache.clone()).await {
        tracing::warn!("⚠️ PDM 事件订阅者启动失败: {}", e);
    }

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        db,
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
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        // 模块门只负责「能进 pdm + 读」；写仍要求 pdm:admin（避免 pdm:read 提权）。
        .layer(axum::middleware::from_fn(require_module_write("pdm")))
        .layer(axum::middleware::from_fn(require_module_access("pdm")))
        .with_state(api_state.clone());

    let openapi_json = serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_default();
    let app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    // D6：事件发布重试后台任务——周期扫描 Redis ZSET 到期项重发（typed 通道直重发；
    // pdm 无 searchable 通道，rebuild 回调恒返回 None）。对齐 pm/hrm 注册范式。
    {
        let publisher = ctx.event_publisher.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(std::time::Duration::from_secs(15));
            loop {
                tick.tick().await;
                if let Some(p) = &publisher {
                    topems_shared_event::event::commit_retry::run_relay(
                        "pdm",
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

async fn detailed_health(State(state): State<AppState>) -> ApiResponse<serde_json::Value> {
    use topems_shared_bootstrap::build_detailed_health_response_db;
    let modules = serde_json::json!({ "pdm": "active" });
    let resp = build_detailed_health_response_db(
        &state.db,
        "pdm-service",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    ApiResponse::success(resp, "Detailed health check")
}

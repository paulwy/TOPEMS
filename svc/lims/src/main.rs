//! TOPEMS LIMS Service
//!
//! Unified service for QMS (Quality Management), LIMS (Laboratory), and EHS (Environment Health Safety)

mod openapi;
mod shared;

pub mod models;
pub mod modules;

use std::sync::Arc;
use std::time::Duration;
mod event_handlers;

use axum::{
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use utoipa::OpenApi;

use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler, L2CacheConfig};
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::{CacheInvalidatedPayload, EventSubscriber, EventType};

pub use shared::*;

// ==================== 多级缓存初始化辅助 ====================

fn make_l2_config(entity: &str) -> L2CacheConfig {
    L2CacheConfig {
        instance_prefix: "lims".to_string(),
        l1_ttl: Duration::from_secs(60),
        l2_ttl: Duration::from_secs(600),
        l1_capacity: 10_000,
        ..Default::default()
    }
    .with_metrics("lims", entity)
}

async fn init_cache<T: Clone + Send + Sync + 'static>(
    config: L2CacheConfig,
    name: &str,
) -> Arc<AsyncL2Cache<T>> {
    let redis_url = std::env::var("REDIS_URL").ok();
    match AsyncL2Cache::try_new(config, redis_url.as_deref()).await {
        Ok(cache) => {
            if cache.has_l2() {
                tracing::info!("💾 多级缓存初始化完成（LIMS {}，L1+L2 Redis）", name);
            } else {
                tracing::info!("💾 多级缓存初始化完成（LIMS {}，纯 L1）", name);
            }
            Arc::new(cache)
        }
        Err((cache, warn)) => {
            tracing::warn!("💾 多级缓存初始化降级（LIMS {}）: {}", name, warn);
            Arc::new(cache)
        }
    }
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "lims, public");

    let config = ServiceConfig {
        name: "topems-lims",
        port: 8051,
        port_env_var: Some("LIMS_PORT"),
        max_db_connections: 20,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/lims",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = models::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("LIMS module database init warning: {}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ LIMS 事件订阅者启动失败: {}", e);
    }

    // 多级缓存初始化（L1: moka 进程内 + L2: Redis 跨实例共享）
    let sample_cache = init_cache::<serde_json::Value>(make_l2_config("sample"), "sample").await;
    let task_cache = init_cache::<serde_json::Value>(make_l2_config("task"), "task").await;
    let dict_cache = init_cache::<String>(make_l2_config("dict"), "dict").await;
    let test_method_cache = init_cache::<modules::test_method::TestMethod>(
        make_l2_config("test_method"),
        "test_method",
    )
    .await;
    let instrument_cache =
        init_cache::<serde_json::Value>(make_l2_config("instrument"), "instrument").await;

    // 缓存预热：异步加载样品列表和任务列表首屏数据，避免首次请求缓存未命中
    {
        let sample_c = sample_cache.clone();
        let task_c = task_cache.clone();
        let pool = ctx.db.clone();
        tokio::spawn(async move {
            tracing::info!("[lims] 开始缓存预热...");

            // 预热样品列表（最近 10 条）
            match sqlx::query_scalar::<_, serde_json::Value>(
                "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10 OFFSET 0) t"
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    sample_c.set("lims:sample:list:warmup".to_string(), data).await;
                    tracing::info!("[lims] 样品列表缓存预热完成");
                }
                Ok(None) => tracing::info!("[lims] 样品列表为空，跳过预热"),
                Err(e) => tracing::warn!("[lims] 样品列表缓存预热失败: {}", e),
            }

            // 预热任务列表（最近 10 条）
            match sqlx::query_scalar::<_, serde_json::Value>(
                "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id::TEXT, tenant_id::TEXT, task_no, sample_id::TEXT, sample_no, test_items, status, assigned_to, instrument_id::TEXT, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at::TEXT, updated_at::TEXT FROM qa_lab_tasks WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10 OFFSET 0) t"
            )
            .fetch_optional(&pool)
            .await
            {
                Ok(Some(data)) => {
                    task_c.set("lims:task:list:warmup".to_string(), data).await;
                    tracing::info!("[lims] 任务列表缓存预热完成");
                }
                Ok(None) => tracing::info!("[lims] 任务列表为空，跳过预热"),
                Err(e) => tracing::warn!("[lims] 任务列表缓存预热失败: {}", e),
            }

            tracing::info!("[lims] 缓存预热完成");
        });
    }

    // 缓存失效事件订阅（事件驱动跨实例缓存一致性，5 个缓存统一注册）
    {
        let mut listener = CacheInvalidationListener::new("lims");
        listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "lims_sample_cache",
            sample_cache.clone(),
            "lims:sample:",
        ));
        listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "lims_task_cache",
            task_cache.clone(),
            "lims:task:",
        ));
        listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "lims_dict_cache",
            dict_cache.clone(),
            "lims:dict:",
        ));
        listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "lims_test_method_cache",
            test_method_cache.clone(),
            "lims:test_method:",
        ));
        listener.register_handler(AsyncL2CacheInvalidationHandler::new(
            "lims_instrument_cache",
            instrument_cache.clone(),
            "lims:instrument:",
        ));
        let listener = Arc::new(listener);

        match EventSubscriber::new("lims-cache-invalidation") {
            Ok(subscriber) => {
                let listener = listener.clone();
                let subscriber =
                    subscriber.subscribe(vec![EventType::CacheInvalidated], move |event| {
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
                    if let Err(e) = subscriber.start_listening().await {
                        tracing::error!("[lims] 缓存失效事件订阅者异常退出: {}", e);
                    }
                });
                tracing::info!("[lims] 缓存失效事件订阅者启动成功");
            }
            Err(e) => {
                tracing::warn!("[lims] 缓存失效事件订阅者创建失败: {}", e);
            }
        }
    }

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config: SimpleHealthConfig::new("topems-lims").with_db(ctx.db.clone()),
        event_publisher: ctx.event_publisher.clone(),
        sample_cache,
        task_cache,
        dict_cache,
        test_method_cache,
        instrument_cache,
    };

    // Public routes（stateful：/health + /api/plugins/*）
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/metrics", get(prometheus_metrics_handler))
        .route(
            "/api/plugins/info",
            get(modules::lims_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::lims_plugin::plugin_health_check),
        )
        .with_state(api_state.clone());

    // Protected routes（先 merge 业务路由 + tenant_middleware → build_application 再加 auth/rls/rate_limit）
    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
        // Frontend aligned routes (LIMS module)
        // Sample
        .route(
            "/lims/samples",
            get(modules::sample::list_samples).post(modules::sample::register_sample),
        )
        .route(
            "/lims/samples/{id}",
            get(modules::sample::get_sample)
                .put(modules::sample::update_sample)
                .delete(modules::sample::delete_sample),
        )
        .route(
            "/lims/samples/{id}/lifecycle",
            get(modules::sample::get_sample_lifecycle),
        )
        .route(
            "/lims/samples/lifecycle",
            post(modules::sample::record_lifecycle_event),
        )
        .route(
            "/lims/samples/{id}/stage/{to_stage}",
            post(modules::sample::transition_sample_stage),
        )
        .route(
            "/lims/samples/{id}/traceability",
            get(modules::sample::get_sample_traceability),
        )
        .route(
            "/lims/lifecycle-stages",
            get(modules::sample::get_lifecycle_stages),
        )
        // Instrument
        .route(
            "/lims/instruments",
            get(modules::instrument::list_instruments).post(modules::instrument::create_instrument),
        )
        .route(
            "/lims/instruments/{id}",
            get(modules::instrument::get_instrument)
                .put(modules::instrument::update_instrument)
                .delete(modules::instrument::delete_instrument),
        )
        .route(
            "/lims/instruments/{id}/calibration",
            post(modules::instrument::calibrate),
        )
        // Reagent
        .route(
            "/lims/reagents",
            get(modules::reagent::list_reagents).post(modules::reagent::create_reagent),
        )
        .route(
            "/lims/reagents/{id}",
            get(modules::reagent::get_reagent)
                .put(modules::reagent::update_reagent)
                .delete(modules::reagent::delete_reagent),
        )
        // Test Method
        .route(
            "/lims/test-methods",
            get(modules::test_method::list_methods).post(modules::test_method::create_method),
        )
        .route(
            "/lims/test-methods/{id}",
            get(modules::test_method::get_method)
                .put(modules::test_method::update_method)
                .delete(modules::test_method::delete_method),
        )
        .route(
            "/lims/test-methods/{id}/versions",
            get(modules::test_method::list_method_versions),
        )
        .route(
            "/lims/test-methods/{id}/new-version",
            post(modules::test_method::create_new_version),
        )
        .route(
            "/lims/method-categories",
            get(modules::test_method::list_categories).post(modules::test_method::create_category),
        )
        .route(
            "/lims/method-categories/{id}",
            put(modules::test_method::update_category)
                .delete(modules::test_method::delete_category),
        )
        .route(
            "/lims/method-validations",
            get(modules::test_method::list_validations)
                .post(modules::test_method::create_validation),
        )
        // Inspection Task
        .route(
            "/lims/tasks",
            get(modules::inspection_task::list_tasks).post(modules::inspection_task::create_task),
        )
        .route(
            "/lims/tasks/{id}",
            get(modules::inspection_task::get_task)
                .put(modules::inspection_task::update_task)
                .delete(modules::inspection_task::delete_task),
        )
        .route(
            "/lims/tasks/{id}/result",
            post(modules::inspection_task::submit_result),
        )
        // Data Sync
        .route(
            "/lims/sync-records",
            get(modules::data_sync::list_sync_records),
        )
        .route(
            "/lims/sync-records/{id}",
            get(modules::data_sync::get_sync_record).delete(modules::data_sync::delete_sync_record),
        )
        .route(
            "/lims/sync-records/{id}/retry",
            post(modules::data_sync::retry_sync),
        )
        .route(
            "/lims/sync/record-to-qms",
            post(modules::data_sync::sync_record_to_qms),
        )
        .route(
            "/lims/sync/reagent-to-ehs",
            post(modules::data_sync::sync_reagent_to_ehs),
        )
        .route("/api/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("lims:admin")))
        .with_state(api_state.clone());

    let openapi_json =
        serde_json::to_string_pretty(&openapi::LimsApiDoc::openapi()).unwrap_or_default();
    let app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::lims_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS LIMS Service API\n\n\
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
        "lims-service",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    Json(ApiResponse::success(resp, "Detailed health check"))
}

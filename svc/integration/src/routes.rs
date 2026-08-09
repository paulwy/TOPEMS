use std::sync::Arc;

use axum::middleware::{from_fn, from_fn_with_state};
use axum::routing::{delete, get, post, put};
use axum::Router;

use topems_shared_auth::auth::auth_middleware;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_core::api_version::register_routes_with_legacy_alias;
use topems_shared_core::cors::create_cors_layer;
use topems_shared_core::health::build_health_response;
use topems_shared_core::health::ServiceHealth;
use topems_shared_db::rls::rls_middleware;
use topems_shared_observability::telemetry::telemetry_middleware;
use utoipa::OpenApi;

use crate::handlers::{conversion_rules, events, lims_qms, mes_erp, mes_qms, sync, wms_scm};
use crate::models::AppState;
use crate::plugin;

pub use crate::openapi::ApiDoc;

pub fn create_routes(state: AppState) -> Router {
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .with_state(state.clone());

    let rate_limit_config = RateLimitConfig::new(100, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let rate_limit_layer = from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    });

    let protected_routes = Router::new()
        .route("/stats", get(events::get_sync_stats))
        .route("/events", get(events::list_events))
        .route("/events", post(events::create_event))
        .route("/lims-qms", get(lims_qms::list_lims_qms_sync))
        .route("/lims-qms", post(lims_qms::create_lims_qms_sync))
        .route("/lims-qms/{id}", get(lims_qms::get_lims_qms_sync))
        .route("/lims-qms/{id}/sync", post(lims_qms::sync_lims_qms))
        .route("/mes-erp", get(mes_erp::list_mes_erp_sync))
        .route("/mes-erp", post(mes_erp::create_mes_erp_sync))
        .route("/mes-erp/{id}", get(mes_erp::get_mes_erp_sync))
        .route("/mes-erp/{id}/sync", post(mes_erp::sync_mes_erp))
        .route(
            "/mes-erp/sync/erp-to-mes",
            post(mes_erp::sync_erp_order_to_mes),
        )
        .route(
            "/mes-erp/sync/mes-to-erp",
            post(mes_erp::sync_mes_progress_to_erp),
        )
        .route("/mes-erp/{id}/retry", post(mes_erp::retry_mes_erp_sync))
        .route("/mes-erp/{id}/logs", get(mes_erp::get_mes_erp_sync_logs))
        .route("/mes-erp/records", get(mes_erp::list_mes_erp_sync_records))
        .route("/wms-scm", get(wms_scm::list_wms_scm_sync))
        .route("/wms-scm", post(wms_scm::create_wms_scm_sync))
        .route("/wms-scm/{id}", get(wms_scm::get_wms_scm_sync))
        .route("/wms-scm/{id}/sync", post(wms_scm::sync_wms_scm))
        // 通用跨服务同步任务 CRUD（从 unified-core 迁移）
        .route("/sync/tasks", post(sync::create_task))
        .route("/sync/tasks/{task_id}", get(sync::get_task))
        .route("/sync/tasks/{task_id}/status", post(sync::update_status))
        .route("/sync/pending", get(sync::get_pending))
        .route("/sync/statistics", get(sync::get_statistics))
        .route("/sync/retry-failed", post(sync::retry_failed))
        // 供应链同步触发器
        .route("/sync/trigger/scm-to-wms", post(sync::trigger_scm_wms))
        .route("/sync/trigger/wms-to-crm", post(sync::trigger_wms_crm))
        .route("/sync/trigger/srm-to-scm", post(sync::trigger_srm_scm))
        // MES↔QMS 质检数据集成 API
        .route("/mes-qms", get(mes_qms::list_mes_qms_sync_api))
        .route("/mes-qms/{id}", get(mes_qms::get_mes_qms_sync_api))
        .route("/mes-qms/stats", get(mes_qms::get_mes_qms_stats_api))
        .route(
            "/mes-qms/trigger-inspection",
            post(mes_qms::trigger_qms_inspection_api),
        )
        .route(
            "/mes-qms/sync-result",
            post(mes_qms::sync_quality_result_api),
        )
        .route("/mes-qms/sync-trace", post(mes_qms::sync_trace_chain_api))
        .route(
            "/mes-qms/defect-handling",
            post(mes_qms::defect_handling_api),
        )
        .route("/mes-qms/{id}/retry", post(mes_qms::retry_mes_qms_sync_api))
        // 转换规则 API
        .route("/rules", get(conversion_rules::list_conversion_rules_api))
        .route("/rules", post(conversion_rules::create_conversion_rule_api))
        .route(
            "/rules/{id}",
            get(conversion_rules::get_conversion_rule_api),
        )
        .route(
            "/rules/{id}",
            put(conversion_rules::update_conversion_rule_api),
        )
        .route(
            "/rules/{id}",
            delete(conversion_rules::delete_conversion_rule_api),
        )
        .route(
            "/rules/{id}/executions",
            get(conversion_rules::get_rule_executions_api),
        )
        .route(
            "/rules/{id}/execute",
            post(conversion_rules::execute_conversion_rule_api),
        )
        .route(
            "/rules/{id}/enable",
            post(conversion_rules::enable_conversion_rule_api),
        )
        .route(
            "/rules/{id}/disable",
            post(conversion_rules::disable_conversion_rule_api),
        )
        .layer(from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(from_fn_with_state(state.pool.clone(), rls_middleware))
        .layer(rate_limit_layer)
        .with_state(state);

    let cors = create_cors_layer();

    let app = register_routes_with_legacy_alias(
        Router::new().merge(public_routes),
        "/api/integration",
        &["/api/v1/integration"],
        protected_routes,
    )
    .route(
        "/api-docs/openapi.json",
        get(|| async {
            serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
                tracing::error!("Failed to serialize OpenAPI spec: {}", e);
                "{}".to_string()
            })
        }),
    )
    .layer(from_fn(telemetry_middleware))
    .layer(cors);

    app
}

async fn home() -> &'static str {
    "TOPEMS Integration Service API\n\nSystems: LIMS↔QMS, MES↔ERP, WMS↔SCM, MES↔QMS\n\nCheck /health for service status"
}

async fn health() -> ServiceHealth {
    build_health_response("topems-integration", true)
}

async fn check_service_health(url: &str) -> bool {
    let client = reqwest::Client::new();
    match client
        .get(format!("{}/health", url))
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(res) => res.status().is_success(),
        Err(_) => false,
    }
}

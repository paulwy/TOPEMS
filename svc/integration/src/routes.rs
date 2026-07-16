use axum::middleware::{from_fn, from_fn_with_state};
use axum::routing::{delete, get, post, put};
use axum::Router;

use topems_shared::{
    auth_middleware, build_health_response, create_cors_layer, rls_middleware,
    telemetry_middleware, wrap_group2_router, RouteCompatConfig, ServiceHealth,
};

use crate::handlers::{conversion_rules, events, lims_qms, mes_erp, mes_qms, wms_scm};
use crate::models::AppState;
use crate::plugin;

pub fn create_routes(state: AppState) -> Router {
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .with_state(state.clone());

    let protected_routes = Router::new()
        .route(
            "/api/core/integration/v1/stats",
            get(events::get_sync_stats),
        )
        .route("/api/core/integration/v1/events", get(events::list_events))
        .route("/api/core/integration/v1/events", post(events::create_event))
        .route(
            "/api/core/integration/v1/lims-qms",
            get(lims_qms::list_lims_qms_sync),
        )
        .route(
            "/api/core/integration/v1/lims-qms",
            post(lims_qms::create_lims_qms_sync),
        )
        .route(
            "/api/core/integration/v1/lims-qms/{id}",
            get(lims_qms::get_lims_qms_sync),
        )
        .route(
            "/api/core/integration/v1/lims-qms/{id}/sync",
            post(lims_qms::sync_lims_qms),
        )
        .route(
            "/api/core/integration/v1/mes-erp",
            get(mes_erp::list_mes_erp_sync),
        )
        .route(
            "/api/core/integration/v1/mes-erp",
            post(mes_erp::create_mes_erp_sync),
        )
        .route(
            "/api/core/integration/v1/mes-erp/{id}",
            get(mes_erp::get_mes_erp_sync),
        )
        .route(
            "/api/core/integration/v1/mes-erp/{id}/sync",
            post(mes_erp::sync_mes_erp),
        )
        .route(
            "/api/core/integration/v1/mes-erp/sync/erp-to-mes",
            post(mes_erp::sync_erp_order_to_mes),
        )
        .route(
            "/api/core/integration/v1/mes-erp/sync/mes-to-erp",
            post(mes_erp::sync_mes_progress_to_erp),
        )
        .route(
            "/api/core/integration/v1/mes-erp/{id}/retry",
            post(mes_erp::retry_mes_erp_sync),
        )
        .route(
            "/api/core/integration/v1/mes-erp/{id}/logs",
            get(mes_erp::get_mes_erp_sync_logs),
        )
        .route(
            "/api/core/integration/v1/mes-erp/records",
            get(mes_erp::list_mes_erp_sync_records),
        )
        .route(
            "/api/core/integration/v1/wms-scm",
            get(wms_scm::list_wms_scm_sync),
        )
        .route(
            "/api/core/integration/v1/wms-scm",
            post(wms_scm::create_wms_scm_sync),
        )
        .route(
            "/api/core/integration/v1/wms-scm/{id}",
            get(wms_scm::get_wms_scm_sync),
        )
        .route(
            "/api/core/integration/v1/wms-scm/{id}/sync",
            post(wms_scm::sync_wms_scm),
        )
        // MES↔QMS 质检数据集成 API
        .route(
            "/api/core/integration/v1/mes-qms",
            get(mes_qms::list_mes_qms_sync_api),
        )
        .route(
            "/api/core/integration/v1/mes-qms/{id}",
            get(mes_qms::get_mes_qms_sync_api),
        )
        .route(
            "/api/core/integration/v1/mes-qms/stats",
            get(mes_qms::get_mes_qms_stats_api),
        )
        .route(
            "/api/core/integration/v1/mes-qms/trigger-inspection",
            post(mes_qms::trigger_qms_inspection_api),
        )
        .route(
            "/api/core/integration/v1/mes-qms/sync-result",
            post(mes_qms::sync_quality_result_api),
        )
        .route(
            "/api/core/integration/v1/mes-qms/sync-trace",
            post(mes_qms::sync_trace_chain_api),
        )
        .route(
            "/api/core/integration/v1/mes-qms/defect-handling",
            post(mes_qms::defect_handling_api),
        )
        .route(
            "/api/core/integration/v1/mes-qms/{id}/retry",
            post(mes_qms::retry_mes_qms_sync_api),
        )
        // 转换规则 API
        .route(
            "/api/core/integration/v1/rules",
            get(conversion_rules::list_conversion_rules_api),
        )
        .route(
            "/api/core/integration/v1/rules",
            post(conversion_rules::create_conversion_rule_api),
        )
        .route(
            "/api/core/integration/v1/rules/{id}",
            get(conversion_rules::get_conversion_rule_api),
        )
        .route(
            "/api/core/integration/v1/rules/{id}",
            put(conversion_rules::update_conversion_rule_api),
        )
        .route(
            "/api/core/integration/v1/rules/{id}",
            delete(conversion_rules::delete_conversion_rule_api),
        )
        .route(
            "/api/core/integration/v1/rules/{id}/executions",
            get(conversion_rules::get_rule_executions_api),
        )
        .route(
            "/api/core/integration/v1/rules/{id}/execute",
            post(conversion_rules::execute_conversion_rule_api),
        )
        .route(
            "/api/core/integration/v1/rules/{id}/enable",
            post(conversion_rules::enable_conversion_rule_api),
        )
        .route(
            "/api/core/integration/v1/rules/{id}/disable",
            post(conversion_rules::disable_conversion_rule_api),
        )
        .layer(from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(from_fn_with_state(state.pool.clone(), rls_middleware))
        .with_state(state);

    let cors = create_cors_layer();

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(from_fn(telemetry_middleware))
        .layer(cors);

    let cfg = RouteCompatConfig::new("integration", "/api/core/integration", &[]);
    wrap_group2_router(app, cfg)
}

async fn home() -> &'static str {
    "TOPEMS Integration Service API\n\nSystems: LIMS↔QMS, MES↔ERP, WMS↔SCM, MES↔QMS\n\nCheck /health for service status"
}

async fn health() -> ServiceHealth {
    build_health_response("topems-integration", true)
}

#[allow(dead_code)]
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

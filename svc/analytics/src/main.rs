//! TOPEMS Analytics Service (API path: /api/bi)
//!
//! Note: The service directory is named "analytics" for historical reasons,
//! but all API routes are registered under /api/bi (not /api/analytics).
//! The Vite proxy and frontend apiClient.bi both use /api/bi.
//! Legacy alias: /api/v1/bi (via register_routes_with_legacy_alias).
//!
//! Unified service for BI (Business Intelligence) and Report

#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::redundant_closure)]
#![allow(dead_code)]

mod shared;

pub mod modules;

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};

use topems_shared::ApiResponse;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use utoipa::OpenApi;

use topems_analytics::ApiDoc;

pub use shared::*;

// ==================== 主入口（V2 shared-bootstrap 模板） ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "analytics, public");

    let config = ServiceConfig {
        name: "topems-analytics",
        port: 8060,
        port_env_var: Some("BI_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/bi",
        legacy_prefixes: &["/api/v1/bi"],
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Analytics Service starting...");

    // ── 模块级数据库初始化 ────────────────────────────────────────────
    if let Err(e) = modules::bi::init_database(&ctx.db).await {
        tracing::warn!("BI module database init warning: {}", e);
    }
    if let Err(e) = modules::report::init_database(&ctx.db).await {
        tracing::warn!("Report module database init warning: {}", e);
    }

    // ── Report Scheduler（后台定时任务） ──────────────────────────────
    let scheduler = modules::report::ReportScheduler::new(ctx.db.clone());
    if let Err(e) = scheduler.start().await {
        tracing::warn!("Failed to start report scheduler: {}", e);
    }

    // ── 向下兼容：ServiceContext → legacy AppState ────────────────────
    let health_config = SimpleHealthConfig::new("topems-analytics").with_db(ctx.db.clone());
    let app_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config,
    };

    // ── public_routes（无状态路由：不需要 State<AppState>） ──────────
    let public_routes = Router::new().route("/", get(home)).route(
        "/api/plugins/info",
        get(modules::bi::plugin::get_plugin_info),
    );

    // ── protected_routes（业务路由：需要 State<AppState>） ────────────
    // 中间件层（auth / rls / rate_limit）由 build_application 统一处理
    let protected_routes = Router::new()
        // ===== BI routes (prefix: /api/bi) =====
        // Dashboard
        .route("/dashboard", get(modules::bi::dashboard::list_dashboards))
        .route("/dashboard", post(modules::bi::dashboard::create_dashboard))
        .route(
            "/dashboard/public",
            get(modules::bi::dashboard::get_public_dashboards),
        )
        // Dashboard Templates - must come before {id} routes
        .route(
            "/dashboard/template",
            get(modules::bi::dashboard::list_dashboard_templates),
        )
        .route(
            "/dashboard/template",
            post(modules::bi::dashboard::create_dashboard_template),
        )
        .route(
            "/dashboard/template/{id}",
            get(modules::bi::dashboard::get_dashboard_template),
        )
        .route(
            "/dashboard/template/{id}",
            put(modules::bi::dashboard::update_dashboard_template),
        )
        .route(
            "/dashboard/template/{id}",
            delete(modules::bi::dashboard::delete_dashboard_template),
        )
        .route(
            "/dashboard/template/{template_id}/create",
            post(modules::bi::dashboard::create_dashboard_from_template),
        )
        // Dashboard by ID
        .route(
            "/dashboard/{id}",
            get(modules::bi::dashboard::get_dashboard),
        )
        .route(
            "/dashboard/{id}",
            put(modules::bi::dashboard::update_dashboard),
        )
        .route(
            "/dashboard/{id}",
            delete(modules::bi::dashboard::delete_dashboard),
        )
        .route(
            "/dashboard/{id}/clone",
            post(modules::bi::dashboard::clone_dashboard),
        )
        // Dashboard Share
        .route(
            "/dashboard/{id}/share",
            post(modules::bi::dashboard::create_share_link),
        )
        .route(
            "/dashboard/{id}/shares",
            get(modules::bi::dashboard::list_share_links),
        )
        .route(
            "/dashboard/share/{share_id}",
            get(modules::bi::dashboard::get_shared_dashboard),
        )
        .route(
            "/dashboard/share/{share_id}",
            delete(modules::bi::dashboard::delete_share_link),
        )
        // Dashboard Export/Import
        .route(
            "/dashboard/{id}/export",
            get(modules::bi::dashboard::export_dashboard),
        )
        .route(
            "/dashboard/import",
            post(modules::bi::dashboard::import_dashboard),
        )
        // Dashboard Real-time Data
        .route(
            "/dashboard/{id}/realtime",
            get(modules::bi::dashboard::query_dashboard_realtime_data),
        )
        // Dashboard Refresh
        .route(
            "/dashboard/{id}/refresh",
            post(modules::bi::dashboard::refresh_dashboard_data),
        )
        .route(
            "/dashboard/{id}/auto-refresh",
            post(modules::bi::dashboard::set_auto_refresh),
        )
        // Dashboard Export (PDF/Excel)
        .route(
            "/dashboard/{id}/export/pdf",
            get(modules::bi::dashboard::export_dashboard_pdf),
        )
        .route(
            "/dashboard/{id}/export/excel",
            get(modules::bi::dashboard::export_dashboard_excel),
        )
        // Dashboard by user - must come after all specific paths
        .route(
            "/dashboard/user/{owner_id}",
            get(modules::bi::dashboard::get_user_dashboards),
        )
        // Widget
        .route("/widget", get(modules::bi::widget::list_widgets))
        .route("/widget", post(modules::bi::widget::create_widget))
        .route("/widget/{id}", get(modules::bi::widget::get_widget))
        .route("/widget/{id}", put(modules::bi::widget::update_widget))
        .route("/widget/{id}", delete(modules::bi::widget::delete_widget))
        .route(
            "/widget/{id}/data",
            get(modules::bi::widget::get_widget_data),
        )
        .route(
            "/widget/{id}/data/realtime",
            get(modules::bi::widget::get_widget_data_realtime),
        )
        .route(
            "/widget/{id}/cache/invalidate",
            post(modules::bi::widget::invalidate_widget_cache),
        )
        .route(
            "/widget/cache/invalidate-all",
            post(modules::bi::widget::invalidate_all_widget_cache),
        )
        .route(
            "/widget/dashboard/{dashboard_id}",
            get(modules::bi::widget::get_widgets_by_dashboard),
        )
        // Data Source
        .route(
            "/data-sources",
            get(modules::bi::datasource::list_datasources),
        )
        .route(
            "/data-sources",
            post(modules::bi::datasource::create_datasource),
        )
        .route(
            "/data-sources/{id}",
            get(modules::bi::datasource::get_datasource),
        )
        .route(
            "/data-sources/{id}",
            put(modules::bi::datasource::update_datasource),
        )
        .route(
            "/data-sources/{id}",
            delete(modules::bi::datasource::delete_datasource),
        )
        .route(
            "/data-sources/{id}/test",
            post(modules::bi::datasource::test_datasource),
        )
        .route(
            "/data-sources/{id}/refresh",
            post(modules::bi::datasource::refresh_datasource),
        )
        // Dataset
        .merge(modules::bi::dataset::create_routes())
        // Sync Records
        .route(
            "/sync-records",
            get(modules::bi::sync_records::list_sync_records),
        )
        .route(
            "/sync-records",
            post(modules::bi::sync_records::create_sync_record),
        )
        .route(
            "/sync-records/{id}",
            get(modules::bi::sync_records::get_sync_record),
        )
        .route(
            "/sync-records/{id}",
            put(modules::bi::sync_records::update_sync_record),
        )
        .route(
            "/sync-records/{id}",
            delete(modules::bi::sync_records::delete_sync_record),
        )
        .route(
            "/sync-records/{id}/retry",
            post(modules::bi::sync_records::retry_sync),
        )
        // Visualization
        .route(
            "/visualization",
            get(modules::bi::visualization::list_visualizations),
        )
        .route(
            "/visualization",
            post(modules::bi::visualization::create_visualization),
        )
        .route(
            "/visualization/{id}",
            get(modules::bi::visualization::get_visualization),
        )
        .route(
            "/visualization/chart-types",
            get(modules::bi::visualization::get_chart_types),
        )
        .route(
            "/visualization/line",
            post(modules::bi::visualization::generate_line_chart),
        )
        .route(
            "/visualization/bar",
            post(modules::bi::visualization::generate_bar_chart),
        )
        .route(
            "/visualization/pie",
            post(modules::bi::visualization::generate_pie_chart),
        )
        .route(
            "/visualization/gauge",
            post(modules::bi::visualization::generate_gauge_chart),
        )
        // Visualization Extension (frontend aligned paths)
        .route(
            "/widgets/{widget_id}/drilldown",
            get(modules::bi::visualization::get_drilldown_config),
        )
        .route(
            "/widgets/{widget_id}/drilldown",
            put(modules::bi::visualization::update_drilldown_config),
        )
        .route(
            "/widgets/{widget_id}/drilldown/execute",
            post(modules::bi::visualization::execute_drilldown),
        )
        .route(
            "/dashboards/{dashboard_id}/links",
            get(modules::bi::visualization::get_chart_link_config),
        )
        .route(
            "/dashboards/{dashboard_id}/links",
            put(modules::bi::visualization::update_chart_link_config),
        )
        .route(
            "/widgets/{widget_id}/annotations",
            get(modules::bi::visualization::get_chart_annotations),
        )
        .route(
            "/widgets/{widget_id}/annotations",
            post(modules::bi::visualization::create_chart_annotation),
        )
        .route(
            "/annotations/{annotation_id}",
            delete(modules::bi::visualization::delete_chart_annotation),
        )
        .route(
            "/widgets/{widget_id}/export",
            post(modules::bi::visualization::export_chart),
        )
        .route(
            "/widgets/{widget_id}/fullscreen",
            get(modules::bi::visualization::get_fullscreen_chart),
        )
        // Analysis
        .route("/analysis", get(modules::bi::analysis::list_analyses))
        .route("/analysis", post(modules::bi::analysis::create_analysis))
        .route("/analysis/{id}", get(modules::bi::analysis::get_analysis))
        .route(
            "/analysis/{id}/execute",
            post(modules::bi::analysis::execute_analysis),
        )
        // Comparison Analysis
        .route(
            "/comparison-analysis",
            get(modules::bi::comparison_analysis::list_comparisons),
        )
        .route(
            "/comparison-analysis",
            post(modules::bi::comparison_analysis::create_comparison),
        )
        .route(
            "/comparison-analysis/{id}",
            get(modules::bi::comparison_analysis::get_comparison),
        )
        .route(
            "/comparison-analysis/{id}",
            put(modules::bi::comparison_analysis::update_comparison),
        )
        .route(
            "/comparison-analysis/{id}",
            delete(modules::bi::comparison_analysis::delete_comparison),
        )
        .route(
            "/comparison-analysis/{id}/run",
            post(modules::bi::comparison_analysis::run_comparison),
        )
        .route(
            "/comparison-analysis/{id}/result",
            get(modules::bi::comparison_analysis::get_comparison_result),
        )
        // Self-Service Report
        .route(
            "/report",
            get(modules::bi::self_service_report::list_reports),
        )
        .route(
            "/report",
            post(modules::bi::self_service_report::create_report),
        )
        .route(
            "/report/{id}",
            get(modules::bi::self_service_report::get_report),
        )
        .route(
            "/report/{id}",
            put(modules::bi::self_service_report::update_report),
        )
        .route(
            "/report/{id}",
            delete(modules::bi::self_service_report::delete_report),
        )
        .route(
            "/report/{id}/query",
            post(modules::bi::self_service_report::query_report_data),
        )
        .route(
            "/report/{id}/export",
            get(modules::bi::self_service_report::export_report),
        )
        // Data Drilldown
        .route(
            "/drilldown/path",
            get(modules::bi::data_drilldown::list_drilldown_paths),
        )
        .route(
            "/drilldown/path",
            post(modules::bi::data_drilldown::create_drilldown_path),
        )
        .route(
            "/drilldown/path/{id}",
            get(modules::bi::data_drilldown::get_drilldown_path),
        )
        .route(
            "/drilldown/path/{id}",
            put(modules::bi::data_drilldown::update_drilldown_path),
        )
        .route(
            "/drilldown/path/{id}",
            delete(modules::bi::data_drilldown::delete_drilldown_path),
        )
        .route(
            "/drilldown/drill-down",
            post(modules::bi::data_drilldown::drill_down),
        )
        .route(
            "/drilldown/roll-up",
            post(modules::bi::data_drilldown::roll_up),
        )
        .route(
            "/drilldown/history",
            post(modules::bi::data_drilldown::get_drilldown_history),
        )
        // Multidimensional Analysis
        .route(
            "/multidim/cube",
            post(modules::bi::multidimensional_analysis::query_cube),
        )
        .route(
            "/multidim/slice",
            post(modules::bi::multidimensional_analysis::slice_cube),
        )
        .route(
            "/multidim/dice",
            post(modules::bi::multidimensional_analysis::dice_cube),
        )
        .route(
            "/multidim/pivot",
            post(modules::bi::multidimensional_analysis::pivot_table),
        )
        .route(
            "/multidim/rank",
            post(modules::bi::multidimensional_analysis::rank_data),
        )
        .route(
            "/multidim/datasource/{datasource_id}/dimensions",
            get(modules::bi::multidimensional_analysis::get_available_dimensions),
        )
        .route(
            "/multidim/datasource/{datasource_id}/measures",
            get(modules::bi::multidimensional_analysis::get_available_measures),
        )
        // Predictive Analysis
        .route(
            "/prediction/methods",
            get(modules::bi::predictive_analysis::get_prediction_methods),
        )
        .route(
            "/prediction/moving-average",
            post(modules::bi::predictive_analysis::moving_average_forecast),
        )
        .route(
            "/prediction/exponential-smoothing",
            post(modules::bi::predictive_analysis::exponential_smoothing_forecast),
        )
        .route(
            "/prediction/trend",
            post(modules::bi::predictive_analysis::trend_analysis),
        )
        .route(
            "/prediction/compare",
            post(modules::bi::predictive_analysis::prediction_comparison),
        )
        // Row-Level Permission
        .route(
            "/permission/rule",
            get(modules::bi::row_level_permission::list_permission_rules),
        )
        .route(
            "/permission/rule",
            post(modules::bi::row_level_permission::create_permission_rule),
        )
        .route(
            "/permission/rule/{id}",
            get(modules::bi::row_level_permission::get_permission_rule),
        )
        .route(
            "/permission/rule/{id}",
            put(modules::bi::row_level_permission::update_permission_rule),
        )
        .route(
            "/permission/rule/{id}",
            delete(modules::bi::row_level_permission::delete_permission_rule),
        )
        .route(
            "/permission/validate",
            post(modules::bi::row_level_permission::validate_permission),
        )
        .route(
            "/permission/filter",
            post(modules::bi::row_level_permission::filter_data),
        )
        .route(
            "/permission/user/{user_id}",
            get(modules::bi::row_level_permission::get_user_permissions),
        )
        .route(
            "/permission/rule-types",
            get(modules::bi::row_level_permission::get_permission_rule_types),
        )
        // Permission (frontend aligned paths)
        .route(
            "/permissions/row-level",
            get(modules::bi::row_level_permission::list_permission_rules),
        )
        .route(
            "/permissions/row-level",
            post(modules::bi::row_level_permission::create_permission_rule),
        )
        .route(
            "/permissions/row-level/{id}",
            get(modules::bi::row_level_permission::get_permission_rule),
        )
        .route(
            "/permissions/row-level/{id}",
            put(modules::bi::row_level_permission::update_permission_rule),
        )
        .route(
            "/permissions/row-level/{id}",
            delete(modules::bi::row_level_permission::delete_permission_rule),
        )
        .route(
            "/permissions/row-level/{id}/test",
            post(modules::bi::row_level_permission::validate_permission),
        )
        .route(
            "/permissions/data",
            get(modules::bi::row_level_permission::list_permission_rules),
        )
        .route(
            "/permissions/data",
            post(modules::bi::row_level_permission::create_permission_rule),
        )
        .route(
            "/permissions/data/{id}",
            put(modules::bi::row_level_permission::update_permission_rule),
        )
        .route(
            "/permissions/data/{id}",
            delete(modules::bi::row_level_permission::delete_permission_rule),
        )
        .route(
            "/permissions/check",
            get(modules::bi::row_level_permission::check_permission),
        )
        // Analytics Summary（统一前缀 /api/bi，不再叠词 /bi/analytics/summary → /bi/summary）
        .route(
            "/summary",
            get(modules::bi::analytics::get_summary_analytics),
        )
        .route(
            "/development",
            get(modules::bi::analytics::get_development_analytics),
        )
        .route(
            "/quality",
            get(modules::bi::analytics::get_quality_analytics),
        )
        .route(
            "/production",
            get(modules::bi::analytics::get_production_analytics),
        )
        .route(
            "/laboratory",
            get(modules::bi::analytics::get_laboratory_analytics),
        )
        .route(
            "/overview",
            get(modules::bi::analytics::get_analytics_overview),
        )
        .route(
            "/{module_id}",
            get(modules::bi::analytics::get_module_analytics),
        )
        // 兼容遗留路径（v7.7 前使用 /analytics/*，v7.8 起统一为 /*）
        .route(
            "/analytics/summary",
            get(modules::bi::analytics::get_summary_analytics),
        )
        .route(
            "/analytics/development",
            get(modules::bi::analytics::get_development_analytics),
        )
        .route(
            "/analytics/quality",
            get(modules::bi::analytics::get_quality_analytics),
        )
        .route(
            "/analytics/production",
            get(modules::bi::analytics::get_production_analytics),
        )
        .route(
            "/analytics/laboratory",
            get(modules::bi::analytics::get_laboratory_analytics),
        )
        .route(
            "/analytics/overview",
            get(modules::bi::analytics::get_analytics_overview),
        )
        .route(
            "/analytics/{module_id}",
            get(modules::bi::analytics::get_module_analytics),
        )
        // RS Analytics
        .route("/rs/summary", get(modules::bi::analytics::get_rs_summary))
        .route(
            "/rs/project-timeline",
            get(modules::bi::analytics::get_rs_project_timeline),
        )
        .route(
            "/rs/experiment-success-rate",
            get(modules::bi::analytics::get_rs_experiment_success_rate),
        )
        .route(
            "/rs/material-usage",
            get(modules::bi::analytics::get_rs_material_usage),
        )
        .route(
            "/rs/project-ranking",
            get(modules::bi::analytics::get_rs_project_ranking),
        )
        // LIMS Analytics
        .route(
            "/lims/summary",
            get(modules::bi::analytics::get_lims_summary),
        )
        .route(
            "/lims/sample-timeline",
            get(modules::bi::analytics::get_lims_sample_timeline),
        )
        .route(
            "/lims/test-pass-rate",
            get(modules::bi::analytics::get_lims_test_pass_rate),
        )
        .route(
            "/lims/instrument-usage",
            get(modules::bi::analytics::get_lims_instrument_usage),
        )
        .route(
            "/lims/sample-status-distribution",
            get(modules::bi::analytics::get_lims_sample_status_distribution),
        )
        // QMS Analytics
        .route("/qms/summary", get(modules::bi::analytics::get_qms_summary))
        .route(
            "/qms/quality-trend",
            get(modules::bi::analytics::get_qms_quality_trend),
        )
        .route(
            "/qms/issue-distribution",
            get(modules::bi::analytics::get_qms_issue_distribution),
        )
        // EHS Analytics
        .route(
            "/ehs/summary",
            get(modules::bi::analytics::get_ehs_analytics),
        )
        .route(
            "/ehs/risk-distribution",
            get(modules::bi::analytics::get_ehs_risk_distribution),
        )
        .route(
            "/ehs/incident-trend",
            get(modules::bi::analytics::get_ehs_incident_trend),
        )
        // SRM Analytics
        .route(
            "/srm/summary",
            get(modules::bi::analytics::get_srm_analytics),
        )
        .route(
            "/srm/supplier-ranking",
            get(modules::bi::analytics::get_srm_supplier_ranking),
        )
        .route(
            "/srm/order-timeline",
            get(modules::bi::analytics::get_srm_order_timeline),
        )
        // PDM Analytics
        .route("/pdm/summary", get(modules::bi::analytics::get_pdm_summary))
        .route(
            "/pdm/production-trend",
            get(modules::bi::analytics::get_pdm_production_trend),
        )
        .route(
            "/pdm/batch-status-distribution",
            get(modules::bi::analytics::get_pdm_batch_status_distribution),
        )
        // ===== Report routes (prefix: /api/bi/report/*，不再叠词) =====
        // - modules::report::create_routes() 注册复数路径: /reports, /templates, /schedules, /subscriptions
        // - Self-Service Report（上方）注册单数路径: /report, /report/{id}, /report/{id}/query, /report/{id}/export
        .merge(modules::report::create_routes())
        // Health & Metrics
        .route("/api/health/detailed", get(detailed_health))
        .with_state(app_state.clone());

    // ── OpenAPI JSON ──────────────────────────────────────────────────
    let openapi_json = Some(
        serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    // ── 组装 shared-bootstrap Application ─────────────────────────────
    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // ── 有状态公共路由（/health, /metrics, WebSocket /ws/bi/*, /api/plugins/health）─
    // 放在 build_application 外层嵌套，避免 State 类型与顶层 Router<()> 冲突
    let stateful_public = Router::new()
        .route("/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        // WebSocket: auth handled internally via token query param (subscribe message)
        .route(
            "/ws/bi/dashboard/{dashboard_id}",
            get(modules::bi::websocket::dashboard_websocket),
        )
        .route(
            "/api/plugins/health",
            get(modules::bi::plugin::plugin_health_check),
        )
        .with_state(app_state);

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Analytics Service is running at http://0.0.0.0:{} (BI prefix: {})",
        app.port,
        config.api_prefix
    );

    run(app).await?;
    Ok(())
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS Analytics Service API\n\n\
     Unified service for BI (Business Intelligence) and Report\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "topems-analytics",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "bi": "active",
            "report": "active"
        },
        "dependencies": [
            {
                "name": "postgresql",
                "status": db_status
            }
        ],
        "version": "1.0.0"
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}

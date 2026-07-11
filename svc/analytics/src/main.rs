//! TOPEMS Analytics Service
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

use shared::AppState;
use std::net::SocketAddr;

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_telemetry, rls_middleware,
    simple_health_check, telemetry_middleware, ApiResponse, AuthState, ServiceHealth,
    SimpleHealthConfig,
};

pub use shared::*;

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-analytics");

    tracing::info!("🚀 TOPEMS Analytics Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        env::var("DATABASE_URL")
            .expect("DATABASE_URL environment variable is required")
            .to_string()
    });

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    // Initialize databases for all modules
    if let Err(e) = modules::bi::init_database(&pool).await {
        tracing::warn!("BI module database init warning: {}", e);
    }
    if let Err(e) = modules::report::init_database(&pool).await {
        tracing::warn!("Report module database init warning: {}", e);
    }

    // Start report scheduler
    let scheduler = modules::report::ReportScheduler::new(pool.clone());
    if let Err(e) = scheduler.start().await {
        tracing::warn!("Failed to start report scheduler: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-analytics").with_db(pool.clone());

    let state = AppState {
        auth_state,
        pool,
        health_config,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api", get(|| get_api_info_handler("analytics-service")))
        .route(
            "/api/info",
            get(|| get_api_info_handler("analytics-service")),
        )
        .route(
            "/api/plugins/info",
            get(modules::bi::plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::bi::plugin::plugin_health_check),
        )
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        );

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== BI routes (prefix: /api/bi) =====
        // Dashboard
        .route(
            "/api/bi/dashboard",
            get(modules::bi::dashboard::list_dashboards),
        )
        .route(
            "/api/bi/dashboard",
            post(modules::bi::dashboard::create_dashboard),
        )
        .route(
            "/api/bi/dashboard/public",
            get(modules::bi::dashboard::get_public_dashboards),
        )
        // Dashboard Templates - must come before {id} routes
        .route(
            "/api/bi/dashboard/template",
            get(modules::bi::dashboard::list_dashboard_templates),
        )
        .route(
            "/api/bi/dashboard/template",
            post(modules::bi::dashboard::create_dashboard_template),
        )
        .route(
            "/api/bi/dashboard/template/{id}",
            get(modules::bi::dashboard::get_dashboard_template),
        )
        .route(
            "/api/bi/dashboard/template/{id}",
            put(modules::bi::dashboard::update_dashboard_template),
        )
        .route(
            "/api/bi/dashboard/template/{id}",
            delete(modules::bi::dashboard::delete_dashboard_template),
        )
        .route(
            "/api/bi/dashboard/template/{template_id}/create",
            post(modules::bi::dashboard::create_dashboard_from_template),
        )
        // Dashboard by ID
        .route(
            "/api/bi/dashboard/{id}",
            get(modules::bi::dashboard::get_dashboard),
        )
        .route(
            "/api/bi/dashboard/{id}",
            put(modules::bi::dashboard::update_dashboard),
        )
        .route(
            "/api/bi/dashboard/{id}",
            delete(modules::bi::dashboard::delete_dashboard),
        )
        .route(
            "/api/bi/dashboard/{id}/clone",
            post(modules::bi::dashboard::clone_dashboard),
        )
        // Dashboard Share
        .route(
            "/api/bi/dashboard/{id}/share",
            post(modules::bi::dashboard::create_share_link),
        )
        .route(
            "/api/bi/dashboard/{id}/shares",
            get(modules::bi::dashboard::list_share_links),
        )
        .route(
            "/api/bi/dashboard/share/{share_id}",
            get(modules::bi::dashboard::get_shared_dashboard),
        )
        .route(
            "/api/bi/dashboard/share/{share_id}",
            delete(modules::bi::dashboard::delete_share_link),
        )
        // Dashboard Export/Import
        .route(
            "/api/bi/dashboard/{id}/export",
            get(modules::bi::dashboard::export_dashboard),
        )
        .route(
            "/api/bi/dashboard/import",
            post(modules::bi::dashboard::import_dashboard),
        )
        // Dashboard Real-time Data
        .route(
            "/api/bi/dashboard/{id}/realtime",
            get(modules::bi::dashboard::query_dashboard_realtime_data),
        )
        // Dashboard Refresh
        .route(
            "/api/bi/dashboard/{id}/refresh",
            post(modules::bi::dashboard::refresh_dashboard_data),
        )
        .route(
            "/api/bi/dashboard/{id}/auto-refresh",
            post(modules::bi::dashboard::set_auto_refresh),
        )
        // Dashboard Export (PDF/Excel)
        .route(
            "/api/bi/dashboard/{id}/export/pdf",
            get(modules::bi::dashboard::export_dashboard_pdf),
        )
        .route(
            "/api/bi/dashboard/{id}/export/excel",
            get(modules::bi::dashboard::export_dashboard_excel),
        )
        // Dashboard by user - must come after all specific paths
        .route(
            "/api/bi/dashboard/user/{owner_id}",
            get(modules::bi::dashboard::get_user_dashboards),
        )
        // WebSocket
        .route(
            "/ws/dashboard/{dashboard_id}",
            get(modules::bi::websocket::dashboard_websocket),
        )
        // Widget
        .route("/api/bi/widget", get(modules::bi::widget::list_widgets))
        .route("/api/bi/widget", post(modules::bi::widget::create_widget))
        .route("/api/bi/widget/{id}", get(modules::bi::widget::get_widget))
        .route(
            "/api/bi/widget/{id}",
            put(modules::bi::widget::update_widget),
        )
        .route(
            "/api/bi/widget/{id}",
            delete(modules::bi::widget::delete_widget),
        )
        .route(
            "/api/bi/widget/{id}/data",
            get(modules::bi::widget::get_widget_data),
        )
        .route(
            "/api/bi/widget/{id}/data/realtime",
            get(modules::bi::widget::get_widget_data_realtime),
        )
        .route(
            "/api/bi/widget/{id}/cache/invalidate",
            post(modules::bi::widget::invalidate_widget_cache),
        )
        .route(
            "/api/bi/widget/cache/invalidate-all",
            post(modules::bi::widget::invalidate_all_widget_cache),
        )
        .route(
            "/api/bi/widget/dashboard/{dashboard_id}",
            get(modules::bi::widget::get_widgets_by_dashboard),
        )
        // Data Source
        .route(
            "/api/bi/data-sources",
            get(modules::bi::datasource::list_datasources),
        )
        .route(
            "/api/bi/data-sources",
            post(modules::bi::datasource::create_datasource),
        )
        .route(
            "/api/bi/data-sources/{id}",
            get(modules::bi::datasource::get_datasource),
        )
        .route(
            "/api/bi/data-sources/{id}",
            put(modules::bi::datasource::update_datasource),
        )
        .route(
            "/api/bi/data-sources/{id}",
            delete(modules::bi::datasource::delete_datasource),
        )
        .route(
            "/api/bi/data-sources/{id}/test",
            post(modules::bi::datasource::test_datasource),
        )
        .route(
            "/api/bi/data-sources/{id}/refresh",
            post(modules::bi::datasource::refresh_datasource),
        )
        // Data Source (frontend aligned paths)
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
        // Dashboard (frontend aligned paths)
        .route("/dashboard", get(modules::bi::dashboard::list_dashboards))
        .route("/dashboard", post(modules::bi::dashboard::create_dashboard))
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
        .route(
            "/dashboard/public",
            get(modules::bi::dashboard::get_public_dashboards),
        )
        .route(
            "/dashboard/user/{owner_id}",
            get(modules::bi::dashboard::get_user_dashboards),
        )
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
        // Widget (frontend aligned paths)
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
            "/widget/dashboard/{dashboard_id}",
            get(modules::bi::widget::get_widgets_by_dashboard),
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
        // Sync Records (frontend aligned paths)
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
        // Comparison Analysis (frontend aligned paths)
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
        // Report (frontend aligned paths)
        .route(
            "/analytics/report",
            get(modules::report::report::list_reports),
        )
        .route(
            "/analytics/report",
            post(modules::report::report::create_report),
        )
        .route(
            "/analytics/report/{id}",
            get(modules::report::report::get_report),
        )
        .route(
            "/analytics/report/{id}",
            put(modules::report::report::update_report),
        )
        .route(
            "/analytics/report/{id}",
            delete(modules::report::report::delete_report),
        )
        .route(
            "/analytics/report/{id}/export",
            post(modules::report::report::export_report),
        )
        .route(
            "/analytics/report/{report_id}/exports",
            get(modules::report::report::list_export_jobs),
        )
        .route(
            "/analytics/report/exports/{job_id}",
            get(modules::report::report::get_export_job),
        )
        .route(
            "/analytics/report/exports/{job_id}/download",
            get(modules::report::report::download_export),
        )
        .route(
            "/analytics/report/{report_id}/schedules",
            get(modules::report::schedule::list_schedules),
        )
        .route(
            "/analytics/report/{report_id}/schedules",
            post(modules::report::schedule::create_schedule),
        )
        .route(
            "/analytics/report/schedules/{schedule_id}",
            put(modules::report::schedule::update_schedule),
        )
        .route(
            "/analytics/report/schedules/{schedule_id}",
            delete(modules::report::schedule::delete_schedule),
        )
        .route(
            "/analytics/report/schedules/{schedule_id}/run",
            post(modules::report::schedule::run_schedule),
        )
        .route(
            "/analytics/report/schedules/{schedule_id}/toggle",
            post(modules::report::schedule::toggle_schedule),
        )
        // Dataset
        .merge(modules::bi::dataset::create_routes())
        // Sync Records
        .route(
            "/api/bi/sync-records",
            get(modules::bi::sync_records::list_sync_records),
        )
        .route(
            "/api/bi/sync-records",
            post(modules::bi::sync_records::create_sync_record),
        )
        .route(
            "/api/bi/sync-records/{id}",
            get(modules::bi::sync_records::get_sync_record),
        )
        .route(
            "/api/bi/sync-records/{id}",
            put(modules::bi::sync_records::update_sync_record),
        )
        .route(
            "/api/bi/sync-records/{id}",
            delete(modules::bi::sync_records::delete_sync_record),
        )
        .route(
            "/api/bi/sync-records/{id}/retry",
            post(modules::bi::sync_records::retry_sync),
        )
        // Visualization
        .route(
            "/api/bi/visualization",
            get(modules::bi::visualization::list_visualizations),
        )
        .route(
            "/api/bi/visualization",
            post(modules::bi::visualization::create_visualization),
        )
        .route(
            "/api/bi/visualization/{id}",
            get(modules::bi::visualization::get_visualization),
        )
        .route(
            "/api/bi/visualization/chart-types",
            get(modules::bi::visualization::get_chart_types),
        )
        .route(
            "/api/bi/visualization/line",
            post(modules::bi::visualization::generate_line_chart),
        )
        .route(
            "/api/bi/visualization/bar",
            post(modules::bi::visualization::generate_bar_chart),
        )
        .route(
            "/api/bi/visualization/pie",
            post(modules::bi::visualization::generate_pie_chart),
        )
        .route(
            "/api/bi/visualization/gauge",
            post(modules::bi::visualization::generate_gauge_chart),
        )
        // Visualization Extension (frontend aligned paths)
        .route(
            "/api/bi/widgets/{widget_id}/drilldown",
            get(modules::bi::visualization::get_drilldown_config),
        )
        .route(
            "/api/bi/widgets/{widget_id}/drilldown",
            put(modules::bi::visualization::update_drilldown_config),
        )
        .route(
            "/api/bi/widgets/{widget_id}/drilldown/execute",
            post(modules::bi::visualization::execute_drilldown),
        )
        .route(
            "/api/bi/dashboards/{dashboard_id}/links",
            get(modules::bi::visualization::get_chart_link_config),
        )
        .route(
            "/api/bi/dashboards/{dashboard_id}/links",
            put(modules::bi::visualization::update_chart_link_config),
        )
        .route(
            "/api/bi/widgets/{widget_id}/annotations",
            get(modules::bi::visualization::get_chart_annotations),
        )
        .route(
            "/api/bi/widgets/{widget_id}/annotations",
            post(modules::bi::visualization::create_chart_annotation),
        )
        .route(
            "/api/bi/annotations/{annotation_id}",
            delete(modules::bi::visualization::delete_chart_annotation),
        )
        .route(
            "/api/bi/widgets/{widget_id}/export",
            post(modules::bi::visualization::export_chart),
        )
        .route(
            "/api/bi/widgets/{widget_id}/fullscreen",
            get(modules::bi::visualization::get_fullscreen_chart),
        )
        // Analysis
        .route(
            "/api/bi/analysis",
            get(modules::bi::analysis::list_analyses),
        )
        .route(
            "/api/bi/analysis",
            post(modules::bi::analysis::create_analysis),
        )
        .route(
            "/api/bi/analysis/{id}",
            get(modules::bi::analysis::get_analysis),
        )
        .route(
            "/api/bi/analysis/{id}/execute",
            post(modules::bi::analysis::execute_analysis),
        )
        // Comparison Analysis
        .route(
            "/api/bi/comparison-analysis",
            get(modules::bi::comparison_analysis::list_comparisons),
        )
        .route(
            "/api/bi/comparison-analysis",
            post(modules::bi::comparison_analysis::create_comparison),
        )
        .route(
            "/api/bi/comparison-analysis/{id}",
            get(modules::bi::comparison_analysis::get_comparison),
        )
        .route(
            "/api/bi/comparison-analysis/{id}",
            put(modules::bi::comparison_analysis::update_comparison),
        )
        .route(
            "/api/bi/comparison-analysis/{id}",
            delete(modules::bi::comparison_analysis::delete_comparison),
        )
        .route(
            "/api/bi/comparison-analysis/{id}/run",
            post(modules::bi::comparison_analysis::run_comparison),
        )
        .route(
            "/api/bi/comparison-analysis/{id}/result",
            get(modules::bi::comparison_analysis::get_comparison_result),
        )
        // Self-Service Report
        .route(
            "/api/bi/report",
            get(modules::bi::self_service_report::list_reports),
        )
        .route(
            "/api/bi/report",
            post(modules::bi::self_service_report::create_report),
        )
        .route(
            "/api/bi/report/{id}",
            get(modules::bi::self_service_report::get_report),
        )
        .route(
            "/api/bi/report/{id}",
            put(modules::bi::self_service_report::update_report),
        )
        .route(
            "/api/bi/report/{id}",
            delete(modules::bi::self_service_report::delete_report),
        )
        .route(
            "/api/bi/report/{id}/query",
            post(modules::bi::self_service_report::query_report_data),
        )
        .route(
            "/api/bi/report/{id}/export",
            get(modules::bi::self_service_report::export_report),
        )
        // Data Drilldown
        .route(
            "/api/bi/drilldown/path",
            get(modules::bi::data_drilldown::list_drilldown_paths),
        )
        .route(
            "/api/bi/drilldown/path",
            post(modules::bi::data_drilldown::create_drilldown_path),
        )
        .route(
            "/api/bi/drilldown/path/{id}",
            get(modules::bi::data_drilldown::get_drilldown_path),
        )
        .route(
            "/api/bi/drilldown/path/{id}",
            put(modules::bi::data_drilldown::update_drilldown_path),
        )
        .route(
            "/api/bi/drilldown/path/{id}",
            delete(modules::bi::data_drilldown::delete_drilldown_path),
        )
        .route(
            "/api/bi/drilldown/drill-down",
            post(modules::bi::data_drilldown::drill_down),
        )
        .route(
            "/api/bi/drilldown/roll-up",
            post(modules::bi::data_drilldown::roll_up),
        )
        .route(
            "/api/bi/drilldown/history",
            post(modules::bi::data_drilldown::get_drilldown_history),
        )
        // Multidimensional Analysis
        .route(
            "/api/bi/multidim/cube",
            post(modules::bi::multidimensional_analysis::query_cube),
        )
        .route(
            "/api/bi/multidim/slice",
            post(modules::bi::multidimensional_analysis::slice_cube),
        )
        .route(
            "/api/bi/multidim/dice",
            post(modules::bi::multidimensional_analysis::dice_cube),
        )
        .route(
            "/api/bi/multidim/pivot",
            post(modules::bi::multidimensional_analysis::pivot_table),
        )
        .route(
            "/api/bi/multidim/rank",
            post(modules::bi::multidimensional_analysis::rank_data),
        )
        .route(
            "/api/bi/multidim/datasource/{datasource_id}/dimensions",
            get(modules::bi::multidimensional_analysis::get_available_dimensions),
        )
        .route(
            "/api/bi/multidim/datasource/{datasource_id}/measures",
            get(modules::bi::multidimensional_analysis::get_available_measures),
        )
        // Predictive Analysis
        .route(
            "/api/bi/prediction/methods",
            get(modules::bi::predictive_analysis::get_prediction_methods),
        )
        .route(
            "/api/bi/prediction/moving-average",
            post(modules::bi::predictive_analysis::moving_average_forecast),
        )
        .route(
            "/api/bi/prediction/exponential-smoothing",
            post(modules::bi::predictive_analysis::exponential_smoothing_forecast),
        )
        .route(
            "/api/bi/prediction/trend",
            post(modules::bi::predictive_analysis::trend_analysis),
        )
        .route(
            "/api/bi/prediction/compare",
            post(modules::bi::predictive_analysis::prediction_comparison),
        )
        // Row-Level Permission
        .route(
            "/api/bi/permission/rule",
            get(modules::bi::row_level_permission::list_permission_rules),
        )
        .route(
            "/api/bi/permission/rule",
            post(modules::bi::row_level_permission::create_permission_rule),
        )
        .route(
            "/api/bi/permission/rule/{id}",
            get(modules::bi::row_level_permission::get_permission_rule),
        )
        .route(
            "/api/bi/permission/rule/{id}",
            put(modules::bi::row_level_permission::update_permission_rule),
        )
        .route(
            "/api/bi/permission/rule/{id}",
            delete(modules::bi::row_level_permission::delete_permission_rule),
        )
        .route(
            "/api/bi/permission/validate",
            post(modules::bi::row_level_permission::validate_permission),
        )
        .route(
            "/api/bi/permission/filter",
            post(modules::bi::row_level_permission::filter_data),
        )
        .route(
            "/api/bi/permission/user/{user_id}",
            get(modules::bi::row_level_permission::get_user_permissions),
        )
        .route(
            "/api/bi/permission/rule-types",
            get(modules::bi::row_level_permission::get_permission_rule_types),
        )
        // Permission (frontend aligned paths)
        .route(
            "/api/bi/permissions/row-level",
            get(modules::bi::row_level_permission::list_permission_rules),
        )
        .route(
            "/api/bi/permissions/row-level",
            post(modules::bi::row_level_permission::create_permission_rule),
        )
        .route(
            "/api/bi/permissions/row-level/{id}",
            get(modules::bi::row_level_permission::get_permission_rule),
        )
        .route(
            "/api/bi/permissions/row-level/{id}",
            put(modules::bi::row_level_permission::update_permission_rule),
        )
        .route(
            "/api/bi/permissions/row-level/{id}",
            delete(modules::bi::row_level_permission::delete_permission_rule),
        )
        .route(
            "/api/bi/permissions/row-level/{id}/test",
            post(modules::bi::row_level_permission::validate_permission),
        )
        .route(
            "/api/bi/permissions/data",
            get(modules::bi::row_level_permission::list_permission_rules),
        )
        .route(
            "/api/bi/permissions/data",
            post(modules::bi::row_level_permission::create_permission_rule),
        )
        .route(
            "/api/bi/permissions/data/{id}",
            put(modules::bi::row_level_permission::update_permission_rule),
        )
        .route(
            "/api/bi/permissions/data/{id}",
            delete(modules::bi::row_level_permission::delete_permission_rule),
        )
        .route(
            "/api/bi/permissions/check",
            get(modules::bi::row_level_permission::check_permission),
        )
        // Analytics Summary
        .route(
            "/api/bi/analytics/summary",
            get(modules::bi::analytics::get_summary_analytics),
        )
        .route(
            "/api/bi/analytics/development",
            get(modules::bi::analytics::get_development_analytics),
        )
        .route(
            "/api/bi/analytics/quality",
            get(modules::bi::analytics::get_quality_analytics),
        )
        .route(
            "/api/bi/analytics/production",
            get(modules::bi::analytics::get_production_analytics),
        )
        .route(
            "/api/bi/analytics/laboratory",
            get(modules::bi::analytics::get_laboratory_analytics),
        )
        .route(
            "/api/bi/analytics/overview",
            get(modules::bi::analytics::get_analytics_overview),
        )
        .route(
            "/api/bi/analytics/{module_id}",
            get(modules::bi::analytics::get_module_analytics),
        )
        // RS Analytics
        .route(
            "/api/bi/rs/summary",
            get(modules::bi::analytics::get_rs_summary),
        )
        .route(
            "/api/bi/rs/project-timeline",
            get(modules::bi::analytics::get_rs_project_timeline),
        )
        .route(
            "/api/bi/rs/experiment-success-rate",
            get(modules::bi::analytics::get_rs_experiment_success_rate),
        )
        .route(
            "/api/bi/rs/material-usage",
            get(modules::bi::analytics::get_rs_material_usage),
        )
        .route(
            "/api/bi/rs/project-ranking",
            get(modules::bi::analytics::get_rs_project_ranking),
        )
        // LIMS Analytics
        .route(
            "/api/bi/lims/summary",
            get(modules::bi::analytics::get_lims_summary),
        )
        .route(
            "/api/bi/lims/sample-timeline",
            get(modules::bi::analytics::get_lims_sample_timeline),
        )
        .route(
            "/api/bi/lims/test-pass-rate",
            get(modules::bi::analytics::get_lims_test_pass_rate),
        )
        .route(
            "/api/bi/lims/instrument-usage",
            get(modules::bi::analytics::get_lims_instrument_usage),
        )
        .route(
            "/api/bi/lims/sample-status-distribution",
            get(modules::bi::analytics::get_lims_sample_status_distribution),
        )
        // QMS Analytics
        .route(
            "/api/bi/qms/summary",
            get(modules::bi::analytics::get_qms_summary),
        )
        .route(
            "/api/bi/qms/quality-trend",
            get(modules::bi::analytics::get_qms_quality_trend),
        )
        .route(
            "/api/bi/qms/issue-distribution",
            get(modules::bi::analytics::get_qms_issue_distribution),
        )
        // EHS Analytics
        .route(
            "/api/bi/ehs/summary",
            get(modules::bi::analytics::get_ehs_analytics),
        )
        .route(
            "/api/bi/ehs/risk-distribution",
            get(modules::bi::analytics::get_ehs_risk_distribution),
        )
        .route(
            "/api/bi/ehs/incident-trend",
            get(modules::bi::analytics::get_ehs_incident_trend),
        )
        // SRM Analytics
        .route(
            "/api/bi/srm/summary",
            get(modules::bi::analytics::get_srm_analytics),
        )
        .route(
            "/api/bi/srm/supplier-ranking",
            get(modules::bi::analytics::get_srm_supplier_ranking),
        )
        .route(
            "/api/bi/srm/order-timeline",
            get(modules::bi::analytics::get_srm_order_timeline),
        )
        // PDM Analytics
        .route(
            "/api/bi/pdm/summary",
            get(modules::bi::analytics::get_pdm_summary),
        )
        .route(
            "/api/bi/pdm/production-trend",
            get(modules::bi::analytics::get_pdm_production_trend),
        )
        .route(
            "/api/bi/pdm/batch-status-distribution",
            get(modules::bi::analytics::get_pdm_batch_status_distribution),
        )
        // ===== Report routes (prefix: /api/report) =====
        .merge(modules::report::create_routes())
        // Report (frontend aligned paths)
        .route(
            "/api/bi/analytics/report",
            get(modules::report::report::list_reports),
        )
        .route(
            "/api/bi/analytics/report",
            post(modules::report::report::create_report),
        )
        .route(
            "/api/bi/analytics/report/{id}",
            get(modules::report::report::get_report),
        )
        .route(
            "/api/bi/analytics/report/{id}",
            put(modules::report::report::update_report),
        )
        .route(
            "/api/bi/analytics/report/{id}",
            delete(modules::report::report::delete_report),
        )
        .route(
            "/api/bi/analytics/report/{id}/export",
            post(modules::report::report::export_report),
        )
        .route(
            "/api/bi/analytics/report/{report_id}/exports",
            get(modules::report::report::list_export_jobs),
        )
        .route(
            "/api/bi/analytics/report/exports/{job_id}",
            get(modules::report::report::get_export_job),
        )
        .route(
            "/api/bi/analytics/report/exports/{job_id}/download",
            get(modules::report::report::download_export),
        )
        .route(
            "/api/bi/analytics/report/{report_id}/schedules",
            get(modules::report::schedule::list_schedules),
        )
        .route(
            "/api/bi/analytics/report/{report_id}/schedules",
            post(modules::report::schedule::create_schedule),
        )
        .route(
            "/api/bi/analytics/report/schedules/{schedule_id}",
            put(modules::report::schedule::update_schedule),
        )
        .route(
            "/api/bi/analytics/report/schedules/{schedule_id}",
            delete(modules::report::schedule::delete_schedule),
        )
        .route(
            "/api/bi/analytics/report/schedules/{schedule_id}/run",
            post(modules::report::schedule::run_schedule),
        )
        .route(
            "/api/bi/analytics/report/schedules/{schedule_id}/toggle",
            post(modules::report::schedule::toggle_schedule),
        )
        // Health & Metrics
        .route("/api/v1/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.pool.clone(),
            rls_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let port = std::env::var("ANALYTICS_PORT")
        .unwrap_or_else(|_| "8060".to_string())
        .parse()
        .unwrap_or(8060);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Analytics Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
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
        "service": "analytics-service",
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

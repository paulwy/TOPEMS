//! TOPEMS MES Service
//!
//! Manufacturing Execution System Service

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

mod modules;

use std::net::SocketAddr;

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_logging, simple_health_check,
    ApiResponse, AuthState, ServiceHealth, SimpleHealthConfig,
};

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    init_logging("topems-mes");

    tracing::info!("🚀 TOPEMS MES Service starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

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

    if let Err(e) = modules::mes::init_database(&pool).await {
        tracing::warn!("MES database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-mes").with_db(pool.clone());

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
        .route("/api", get(|| get_api_info_handler("mes-service")))
        .route("/api/info", get(|| get_api_info_handler("mes-service")))
        .route("/api/plugins/info", get(modules::mes::plugin::get_plugin_info))
        .route("/api/plugins/health", get(modules::mes::plugin::plugin_health_check))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== MES routes (prefix: /api/mes) =====
        // Production Order
        .route("/api/mes/orders", get(modules::mes::production_order::list_production_orders))
        .route("/api/mes/orders", post(modules::mes::production_order::create_production_order))
        .route("/api/mes/orders/from-erp", post(modules::mes::production_order::create_from_erp))
        .route("/api/mes/orders/{id}", get(modules::mes::production_order::get_production_order))
        .route("/api/mes/orders/{id}", put(modules::mes::production_order::update_production_order))
        .route("/api/mes/orders/{id}", delete(modules::mes::production_order::delete_production_order))
        .route("/api/mes/orders/{id}/release", post(modules::mes::production_order::release_production_order))
        .route("/api/mes/orders/{id}/start", post(modules::mes::production_order::start_production_order))
        .route("/api/mes/orders/{id}/complete", post(modules::mes::production_order::complete_production_order))
        .route("/api/mes/orders/{id}/cancel", post(modules::mes::production_order::cancel_production_order))
        // Production Process
        .route("/api/mes/processes", get(modules::mes::production_process::list_processes))
        .route("/api/mes/processes", post(modules::mes::production_process::create_process))
        .route("/api/mes/processes/{id}", get(modules::mes::production_process::get_process))
        .route("/api/mes/processes/{id}", put(modules::mes::production_process::update_process))
        .route("/api/mes/processes/{id}", delete(modules::mes::production_process::delete_process))
        .route("/api/mes/processes/{id}/deactivate", post(modules::mes::production_process::deactivate_process))
        // Production Record
        .route("/api/mes/records", get(modules::mes::production_record::list_records))
        .route("/api/mes/records", post(modules::mes::production_record::create_record))
        .route("/api/mes/records/{id}", get(modules::mes::production_record::get_record))
        .route("/api/mes/records/{id}", put(modules::mes::production_record::update_record))
        .route("/api/mes/records/{id}", delete(modules::mes::production_record::delete_record))
        .route("/api/mes/records/{id}/complete", post(modules::mes::production_record::complete_record))
        // Equipment
        .route("/api/mes/equipment", get(modules::mes::equipment::list_equipment))
        .route("/api/mes/equipment", post(modules::mes::equipment::create_equipment))
        .route("/api/mes/equipment/{id}", get(modules::mes::equipment::get_equipment))
        .route("/api/mes/equipment/{id}", put(modules::mes::equipment::update_equipment))
        .route("/api/mes/equipment/{id}", delete(modules::mes::equipment::delete_equipment))
        .route("/api/mes/equipment/{id}/maintenance", post(modules::mes::equipment::maintenance_equipment))
        // Work Station
        .route("/api/mes/workstations", get(modules::mes::work_station::list_work_stations))
        .route("/api/mes/workstations", post(modules::mes::work_station::create_work_station))
        .route("/api/mes/workstations/{id}", get(modules::mes::work_station::get_work_station))
        .route("/api/mes/workstations/{id}", put(modules::mes::work_station::update_work_station))
        .route("/api/mes/workstations/{id}", delete(modules::mes::work_station::delete_work_station))
        .route("/api/mes/workstations/{id}/activate", post(modules::mes::work_station::activate_work_station))
        .route("/api/mes/workstations/{id}/deactivate", post(modules::mes::work_station::deactivate_work_station))
        // Production Scheduling
        .route("/api/mes/schedules", get(modules::mes::production_scheduling::list_production_schedules))
        .route("/api/mes/schedules", post(modules::mes::production_scheduling::create_production_schedule))
        .route("/api/mes/schedules/{id}", get(modules::mes::production_scheduling::get_production_schedule))
        .route("/api/mes/schedules/{id}", put(modules::mes::production_scheduling::update_production_schedule))
        .route("/api/mes/schedules/{id}", delete(modules::mes::production_scheduling::delete_production_schedule))
        .route("/api/mes/schedules/adjust", post(modules::mes::production_scheduling::adjust_schedule))
        .route("/api/mes/schedules/gantt", get(modules::mes::production_scheduling::get_gantt_data))
        // Material BOM
        .route("/api/mes/boms", get(modules::mes::material_bom::list_material_boms))
        .route("/api/mes/boms", post(modules::mes::material_bom::create_material_bom))
        .route("/api/mes/boms/{id}", get(modules::mes::material_bom::get_material_bom))
        .route("/api/mes/boms/{id}", put(modules::mes::material_bom::update_material_bom))
        .route("/api/mes/boms/{id}", delete(modules::mes::material_bom::delete_material_bom))
        .route("/api/mes/material-issues", get(modules::mes::material_bom::list_material_issues))
        .route("/api/mes/material-issues", post(modules::mes::material_bom::create_material_issue))
        .route("/api/mes/material-returns", get(modules::mes::material_bom::list_material_returns))
        .route("/api/mes/material-returns", post(modules::mes::material_bom::create_material_return))
        // Quality Traceability
        .route("/api/mes/traceability/forward/{order_id}", get(modules::mes::quality_traceability::forward_traceability))
        .route("/api/mes/traceability/backward/{batch_no}", get(modules::mes::quality_traceability::backward_traceability))
        .route("/api/mes/traceability/chain/{id}", get(modules::mes::quality_traceability::get_trace_chain))
        .route("/api/mes/quality-records", get(modules::mes::quality_traceability::list_quality_records))
        // Equipment OEE
        .route("/api/mes/equipment-oee", get(modules::mes::equipment_oee::list_oee_records))
        .route("/api/mes/equipment-oee", post(modules::mes::equipment_oee::create_oee_record))
        .route("/api/mes/equipment-oee/{id}", get(modules::mes::equipment_oee::get_oee_record))
        .route("/api/mes/equipment-oee/{id}", put(modules::mes::equipment_oee::update_oee_record))
        .route("/api/mes/equipment-oee/{id}", delete(modules::mes::equipment_oee::delete_oee_record))
        .route("/api/mes/equipment-oee/statistics", post(modules::mes::equipment_oee::get_oee_statistics))
        .route("/api/mes/equipment-oee/efficiency-analysis", get(modules::mes::equipment_oee::get_equipment_efficiency_analysis))
        // WIP
        .route("/api/mes/wips", get(modules::mes::wip::list_wips))
        .route("/api/mes/wips", post(modules::mes::wip::create_wip))
        .route("/api/mes/wips/{id}", get(modules::mes::wip::get_wip))
        .route("/api/mes/wips/{id}", put(modules::mes::wip::update_wip))
        .route("/api/mes/wips/{id}", delete(modules::mes::wip::delete_wip))
        .route("/api/mes/wips/transfer", post(modules::mes::wip::transfer_wip))
        .route("/api/mes/wips/{wip_id}/transfers", get(modules::mes::wip::list_wip_transfers))
        .route("/api/mes/wips/statistics", get(modules::mes::wip::get_wip_statistics))

        // Health & Metrics
        .route("/api/v1/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let port = std::env::var("MES_PORT")
        .unwrap_or_else(|_| "8030".to_string())
        .parse()
        .unwrap_or(8030);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ MES Service is running at http://{}", addr);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mes::plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS MES Service API\n\n\
     Manufacturing Execution System\n\n\
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
        "service": "mes-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "mes": "active"
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

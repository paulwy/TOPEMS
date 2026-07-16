#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::too_many_arguments)]
#![allow(dead_code)]

use topems_scm::modules;

use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use std::env;
use std::time::Instant;
use utoipa::OpenApi;

use axum_prometheus::PrometheusMetricLayer;
use modules::{scm_plugin, ApiState};
use prometheus::{default_registry, Gauge};
use std::sync::Arc;
use std::time::Duration;
use topems_shared::redis::RedisCacheService;
use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    create_database_pool, init_telemetry, rls_middleware, telemetry_middleware, wrap_group2_router,
    ApiResponse, AuthState, DatabaseConfig, RedisConfig, RedisPool as RedisPoolTrait,
    RouteCompatConfig, ServiceHealth,
};
use tower_http::{compression::CompressionLayer, timeout::TimeoutLayer};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-scm");
    START_TIME.get_or_init(Instant::now);

    // 设置search_path环境变量（供lib使用）
    env::set_var("SEARCH_PATH", "scm, shared, public");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_scm_custom_metric",
        "This is a custom metric for TOPEMS-SCM",
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

    let db_config = DatabaseConfig {
        url: env::var("DATABASE_URL").map_err(|_| {
            tracing::error!("DATABASE_URL environment variable is required");
            anyhow::anyhow!("DATABASE_URL environment variable is required")
        })?,
        max_connections: 50,
        min_connections: Some(10),
        connect_timeout: Some(10),
        idle_timeout: Some(300),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };

    let pool = create_database_pool(&db_config).await?;

    tracing::info!("🔗 数据库连接成功");

    let redis_cache = match env::var("REDIS_URL").ok() {
        Some(url) => {
            let redis_config = RedisConfig {
                url,
                max_connections: 20,
                connect_timeout: Some(5),
            };
            let redis_pool = RedisPoolTrait::new(&redis_config).await;
            match redis_pool {
                Ok(pool) => {
                    let cache = Arc::new(RedisCacheService::new(Arc::new(pool)));
                    tracing::info!("✅ Redis 缓存服务已初始化");
                    Some(cache)
                }
                Err(e) => {
                    tracing::warn!("⚠️ Redis 初始化失败: {}", e);
                    None
                }
            }
        }
        None => {
            tracing::info!("ℹ️ 未配置 Redis URL，跳过缓存初始化");
            None
        }
    };

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        cache: redis_cache,
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/api/plugins/info", get(scm_plugin::get_plugin_info))
        .route("/api/plugins/health", get(scm_plugin::plugin_health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json));

    let protected_routes = modules::create_routes()
        // Frontend aligned routes (SCM module)
        // Supplier
        .route(
            "/scm/suppliers",
            get(modules::supplier::list_suppliers).post(modules::supplier::create_supplier),
        )
        .route(
            "/scm/suppliers/{id}",
            get(modules::supplier::get_supplier)
                .put(modules::supplier::update_supplier)
                .delete(modules::supplier::delete_supplier),
        )
        // Purchase Order
        .route(
            "/scm/purchase-orders",
            get(modules::purchase_order::list_orders).post(modules::purchase_order::create_order),
        )
        .route(
            "/scm/purchase-orders/{id}",
            get(modules::purchase_order::get_order)
                .put(modules::purchase_order::update_order)
                .delete(modules::purchase_order::delete_order),
        )
        .route(
            "/scm/purchase-orders/{id}/approve",
            post(modules::purchase_order::approve_order),
        )
        .route(
            "/scm/purchase-orders/{id}/reject",
            post(modules::purchase_order::reject_order),
        )
        // Purchase Requisition
        .route(
            "/scm/purchase-requisitions",
            get(modules::purchase_requisition::list_requisitions)
                .post(modules::purchase_requisition::create_requisition),
        )
        .route(
            "/scm/purchase-requisitions/{id}",
            get(modules::purchase_requisition::get_requisition)
                .put(modules::purchase_requisition::update_requisition)
                .delete(modules::purchase_requisition::delete_requisition),
        )
        // Purchase Contract
        .route(
            "/scm/purchase-contracts",
            get(modules::purchase_contract::list_contracts)
                .post(modules::purchase_contract::create_contract),
        )
        .route(
            "/scm/purchase-contracts/{id}",
            get(modules::purchase_contract::get_contract)
                .put(modules::purchase_contract::update_contract)
                .delete(modules::purchase_contract::delete_contract),
        )
        // MRP
        .route(
            "/scm/mrp/suggestions",
            get(modules::mrp::list_suggestions).post(modules::mrp::compute_mrp),
        )
        .route(
            "/scm/mrp/suggestions/{id}",
            get(modules::mrp::get_suggestion).post(modules::mrp::confirm_suggestion),
        )
        // Inventory Turnover
        .route(
            "/scm/inventory-turnover",
            get(modules::inventory_turnover::calculate_turnover),
        )
        .route(
            "/scm/inventory-turnover/days",
            get(modules::inventory_turnover::turnover_days),
        )
        .route(
            "/scm/inventory-turnover/abc-analysis",
            get(modules::inventory_turnover::abc_analysis),
        )
        .route(
            "/scm/inventory-turnover/trend",
            get(modules::inventory_turnover::turnover_trend),
        )
        // Incoming Inspection
        .route(
            "/scm/incoming-inspections",
            get(modules::incoming_inspection::list_inspections)
                .post(modules::incoming_inspection::create_inspection),
        )
        .route(
            "/scm/incoming-inspections/{id}",
            get(modules::incoming_inspection::get_inspection)
                .put(modules::incoming_inspection::update_inspection),
        )
        .route(
            "/scm/incoming-inspections/{id}/pass",
            post(modules::incoming_inspection::inspection_pass),
        )
        .route(
            "/scm/incoming-inspections/{id}/fail",
            post(modules::incoming_inspection::inspection_fail),
        )
        // Supplier Admission
        .route(
            "/scm/supplier-admissions",
            get(modules::supplier_admission::list_admissions)
                .post(modules::supplier_admission::create_admission),
        )
        .route(
            "/scm/supplier-admissions/{id}",
            get(modules::supplier_admission::get_admission)
                .put(modules::supplier_admission::update_admission)
                .delete(modules::supplier_admission::delete_admission),
        )
        // Supplier Evaluation
        .route(
            "/scm/evaluations",
            get(modules::supplier_evaluation::list_evaluations)
                .post(modules::supplier_evaluation::create_evaluation),
        )
        .route(
            "/scm/evaluations/{id}",
            get(modules::supplier_evaluation::get_evaluation)
                .put(modules::supplier_evaluation::update_evaluation)
                .delete(modules::supplier_evaluation::delete_evaluation),
        )
        // Delivery Appointment
        .route(
            "/scm/delivery-appointments",
            get(modules::supplier_delivery_appointment::list_appointments)
                .post(modules::supplier_delivery_appointment::create_appointment),
        )
        .route(
            "/scm/delivery-appointments/{id}",
            get(modules::supplier_delivery_appointment::get_appointment)
                .put(modules::supplier_delivery_appointment::update_appointment)
                .delete(modules::supplier_delivery_appointment::delete_appointment),
        )
        // Price Comparison
        .route(
            "/scm/comparisons",
            get(modules::price_comparison::list_comparisons)
                .post(modules::price_comparison::create_comparison),
        )
        .route(
            "/scm/comparisons/{id}",
            get(modules::price_comparison::get_comparison)
                .post(modules::price_comparison::approve_comparison),
        )
        // Audit Log
        .route("/scm/audit-logs", get(modules::audit::list_audit_logs))
        .route("/scm/audit-logs/{id}", get(modules::audit::get_audit_log))
        // Dashboard
        .route(
            "/scm/dashboard/overview",
            get(modules::supply_chain_dashboard::overview),
        )
        .route(
            "/scm/dashboard/purchase-inbound-outbound",
            get(modules::supply_chain_dashboard::purchase_inbound_outbound_stats),
        )
        .route(
            "/scm/dashboard/supplier-performance",
            get(modules::supply_chain_dashboard::supplier_performance),
        )
        // API v1 routes
        .route("/api/health/detailed", get(health_check_detailed))
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            api_state.db.clone(),
            rls_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-scm"))
        .with_state(api_state)
        .layer(cors)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ));

    let cfg = RouteCompatConfig::new("scm", "/api/core/scm", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = env::var("SCM_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .or_else(|_| env::var("PORT"))
        .unwrap_or_else(|_| "8040".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-SCM 供应链管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        scm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-scm", true)
}

#[derive(Debug, Clone, serde::Serialize, PartialEq)]
enum HealthStatus {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "unhealthy")]
    Unhealthy,
}

#[derive(Debug, Clone, serde::Serialize)]
struct DependencyHealth {
    name: String,
    status: HealthStatus,
    message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
struct DetailedHealth {
    service_name: String,
    status: HealthStatus,
    message: String,
    timestamp: String,
    uptime: Option<u64>,
    dependencies: Option<Vec<DependencyHealth>>,
    response_time_ms: Option<u64>,
    last_check: Option<String>,
}

async fn health_check_detailed(State(state): State<ApiState>) -> Json<ApiResponse<DetailedHealth>> {
    let mut dependencies = Vec::new();

    let db_result = sqlx::query("SELECT 1").fetch_one(&state.db).await;
    let db_health = match db_result {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "PostgreSQL 数据库连接正常".to_string(),
        },
        Err(e) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Unhealthy,
            message: format!("数据库连接失败: {}", e),
        },
    };
    dependencies.push(db_health);

    let status = if dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy)
    {
        HealthStatus::Healthy
    } else if dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy)
    {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let health = DetailedHealth {
        service_name: "topems-scm".to_string(),
        status,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(get_uptime()),
        dependencies: Some(dependencies),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    Json(ApiResponse::success(health, "健康检查完成"))
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::ScmApiDoc::openapi())
}

mod api;
mod models;
mod services;

use anyhow::Result;
use axum::{
    extract::{FromRef, State},
    routing::get,
    Json, Router,
};
use std::env;
use std::time::Instant;

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, build_health_response, create_api_info_router,
    create_database_pool, DatabaseConfig,
};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
}

use api::{
    create_supplier_routes, create_category_routes, create_evaluation_routes,
    create_contract_routes, create_product_routes,
};

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for sqlx::PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-srm");
    START_TIME.get_or_init(Instant::now);

    // 设置search_path环境变量（供lib使用）
    env::set_var("SEARCH_PATH", "srm, shared, public");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_srm_custom_metric",
        "This is a custom metric for TOPEMS-SRM",
    ).unwrap();
    default_registry().register(Box::new(custom_gauge.clone())).unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    tracing::info!("🚀 TOPEMS-SRM 供应商关系管理系统启动中...");

    let db_config = DatabaseConfig {
        url: "postgres://topems:topems_secret@localhost:5432/topems".to_string(),
        max_connections: 10,
        min_connections: Some(2),
        connect_timeout: Some(30),
        idle_timeout: Some(60),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };

    let pool = create_database_pool(&db_config).await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let health_router = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/metrics", get(move || async move { metric_handle.render() }))
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .merge(create_supplier_routes(pool.clone()).await?)
        .merge(create_category_routes(pool.clone()).await?)
        .merge(create_evaluation_routes(pool.clone()).await?)
        .merge(create_contract_routes(pool.clone()).await?)
        .merge(create_product_routes(pool.clone()).await?)
        .merge(create_statistics_routes(pool.clone()))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-srm"))
        .layer(cors)
        .layer(prometheus_layer);

    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8041".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("📦 端口: {}", port);
    tracing::info!("✅ TOPEMS-SRM 已就绪");
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-srm", true)
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

async fn health_check_detailed(State(state): State<AppState>) -> Json<ApiResponse<DetailedHealth>> {
    let mut dependencies = Vec::new();

    let db_result = sqlx::query("SELECT 1").fetch_one(&state.pool).await;
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

    let status = if dependencies.iter().all(|d| d.status == HealthStatus::Healthy) {
        HealthStatus::Healthy
    } else if dependencies.iter().any(|d| d.status == HealthStatus::Unhealthy) {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let health = DetailedHealth {
        service_name: "topems-srm".to_string(),
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

// Statistics routes
fn create_statistics_routes(db: sqlx::PgPool) -> Router {
    Router::new()
        .route("/api/v1/statistics", get(get_statistics))
        .route("/api/v1/statistics/detailed", get(get_detailed_statistics))
        .route("/api/v1/suppliers-with-stats", get(get_suppliers_with_stats))
        .with_state(db)
}

async fn get_statistics(
    State(pool): State<sqlx::PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let total_suppliers = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.suppliers WHERE status != 'deleted'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let active_suppliers = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.suppliers WHERE status = 'active'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_evaluations = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_evaluations")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>("SELECT AVG(overall_score) FROM srm.supplier_evaluations WHERE overall_score IS NOT NULL")
        .fetch_one(&pool)
        .await
        .unwrap_or(None)
        .unwrap_or(0.0);

    let total_contracts = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_contracts")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let active_contracts = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_contracts WHERE status = 'active'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_products = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_products WHERE status = 'active'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let stats = serde_json::json!({
        "total_suppliers": total_suppliers,
        "active_suppliers": active_suppliers,
        "total_evaluations": total_evaluations,
        "avg_score": avg_score,
        "total_contracts": total_contracts,
        "active_contracts": active_contracts,
        "total_products": total_products,
    });

    Json(ApiResponse::success(stats, "获取统计数据成功"))
}

async fn get_detailed_statistics(
    State(pool): State<sqlx::PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    // 基础统计
    let total_suppliers = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.suppliers WHERE status != 'deleted'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let active_suppliers = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.suppliers WHERE status = 'active'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_evaluations = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_evaluations")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>("SELECT AVG(overall_score) FROM srm.supplier_evaluations WHERE overall_score IS NOT NULL")
        .fetch_one(&pool)
        .await
        .unwrap_or(None)
        .unwrap_or(0.0);

    let total_contracts = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_contracts")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let active_contracts = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_contracts WHERE status = 'active'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_products = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_products WHERE status = 'active'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    // 按类别统计
    let supplier_by_category = sqlx::query_as::<_, (String, i64)>(
        "SELECT category, COUNT(*) FROM srm.suppliers WHERE status != 'deleted' GROUP BY category"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(cat, count)| serde_json::json!({"category": cat, "count": count}))
    .collect::<Vec<_>>();

    // 按状态统计
    let supplier_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM srm.suppliers GROUP BY status"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(status, count)| serde_json::json!({"status": status, "count": count}))
    .collect::<Vec<_>>();

    // 合同按状态统计
    let contract_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM srm.supplier_contracts GROUP BY status"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(status, count)| serde_json::json!({"status": status, "count": count}))
    .collect::<Vec<_>>();

    let detailed_stats = serde_json::json!({
        "basic": {
            "total_suppliers": total_suppliers,
            "active_suppliers": active_suppliers,
            "total_evaluations": total_evaluations,
            "avg_score": avg_score,
            "total_contracts": total_contracts,
            "active_contracts": active_contracts,
            "total_products": total_products,
        },
        "supplier_by_category": supplier_by_category,
        "supplier_by_status": supplier_by_status,
        "contract_by_status": contract_by_status,
    });

    Json(ApiResponse::success(detailed_stats, "获取详细统计数据成功"))
}

async fn get_suppliers_with_stats(
    State(pool): State<sqlx::PgPool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let suppliers = sqlx::query_as::<_, models::Supplier>(
        "SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM srm.suppliers WHERE status != 'deleted' ORDER BY created_at DESC"
    )
    .fetch_all(&pool)
    .await;

    match suppliers {
        Ok(suppliers) => {
            let mut result = Vec::new();

            for supplier in suppliers {
                let product_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM srm.supplier_products WHERE supplier_id = $1"
                )
                .bind(supplier.id)
                .fetch_one(&pool)
                .await
                .unwrap_or(0);

                let contract_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM srm.supplier_contracts WHERE supplier_id = $1"
                )
                .bind(supplier.id)
                .fetch_one(&pool)
                .await
                .unwrap_or(0);

                let eval_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM srm.supplier_evaluations WHERE supplier_id = $1"
                )
                .bind(supplier.id)
                .fetch_one(&pool)
                .await
                .unwrap_or(0);

                let avg_score = sqlx::query_scalar::<_, Option<f64>>(
                    "SELECT AVG(overall_score) FROM srm.supplier_evaluations WHERE supplier_id = $1 AND overall_score IS NOT NULL"
                )
                .bind(supplier.id)
                .fetch_one(&pool)
                .await
                .unwrap_or(None);

                let stats = serde_json::json!({
                    "supplier": supplier,
                    "product_count": product_count,
                    "contract_count": contract_count,
                    "evaluation_count": eval_count,
                    "avg_evaluation_score": avg_score,
                });

                result.push(stats);
            }

            Json(ApiResponse::success(result, "获取供应商统计数据成功"))
        }
        Err(e) => {
            tracing::error!("获取供应商统计数据失败: {}", e);
            Json(ApiResponse::<Vec<serde_json::Value>>::error(500, "获取供应商统计数据失败"))
        }
    }
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}
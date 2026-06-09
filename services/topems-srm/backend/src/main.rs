mod api;
mod models;
mod services;

use anyhow::Result;
use axum::{
    extract::{FromRef, State},
    routing::get,
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, build_health_response, create_api_info_router
};

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

    tracing::info!("🚀 TOPEMS-SRM 供应商关系管理系统启动中...");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

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
        .layer(cors);

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
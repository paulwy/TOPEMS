mod api;
mod models;
mod services;

use anyhow::Result;
use axum::{
    extract::FromRef,
    routing::get,
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

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

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

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
        .merge(api::create_supplier_routes(pool.clone()).await?)
        .merge(api::create_evaluation_routes(pool.clone()).await?)
        .merge(api::create_purchase_order_routes(pool.clone()).await?)
        .merge(api::create_contract_routes(pool.clone()).await?)
        .merge(api::create_statistics_routes(pool.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
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

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-SRM is running", "健康检查"))
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS srm"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS srm.suppliers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            supplier_no VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            legal_name VARCHAR(255),
            category VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            tax_id VARCHAR(100),
            address TEXT,
            contact_person VARCHAR(255),
            phone VARCHAR(50),
            email VARCHAR(255),
            website VARCHAR(255),
            credit_rating VARCHAR(50),
            risk_level VARCHAR(50) NOT NULL DEFAULT 'low',
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS srm.supplier_evaluations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            supplier_id UUID NOT NULL REFERENCES srm.suppliers(id) ON DELETE CASCADE,
            evaluation_no VARCHAR(100) NOT NULL UNIQUE,
            evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            evaluator VARCHAR(255),
            overall_score DOUBLE PRECISION,
            quality_score DOUBLE PRECISION,
            delivery_score DOUBLE PRECISION,
            service_score DOUBLE PRECISION,
            price_score DOUBLE PRECISION,
            comments TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS srm.purchase_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            po_no VARCHAR(100) NOT NULL UNIQUE,
            supplier_id UUID NOT NULL REFERENCES srm.suppliers(id) ON DELETE CASCADE,
            order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expected_date TIMESTAMPTZ,
            actual_date TIMESTAMPTZ,
            total_amount DOUBLE PRECISION,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            remarks TEXT,
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Supplier Contracts table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS srm.supplier_contracts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            contract_no VARCHAR(100) NOT NULL UNIQUE,
            supplier_id UUID NOT NULL REFERENCES srm.suppliers(id) ON DELETE CASCADE,
            supplier_name VARCHAR(255),
            title VARCHAR(255) NOT NULL,
            contract_type VARCHAR(50) NOT NULL DEFAULT 'purchase',
            total_amount DOUBLE PRECISION,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            sign_date TIMESTAMPTZ,
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            remarks TEXT,
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_srm_suppliers_status ON srm.suppliers(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_srm_evaluations_supplier_id ON srm.supplier_evaluations(supplier_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_srm_orders_supplier_id ON srm.purchase_orders(supplier_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_srm_orders_status ON srm.purchase_orders(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_srm_contracts_supplier_id ON srm.supplier_contracts(supplier_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_srm_contracts_status ON srm.supplier_contracts(status)"#)
        .execute(pool)
        .await?;

    tracing::info!("🗄️ SRM数据库表初始化完成");
    Ok(())
}

mod api;
mod models;

use anyhow::Result;
use axum::{
    extract::FromRef,
    routing::get,
    Json,
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};
use api::audit::log_audit_event;

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

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let refresh_secret = env::var("REFRESH_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("REFRESH_SECRET not set, using default (not recommended for production)");
            "topems-default-refresh-secret-change-me-in-production".to_string()
        });

    let token_expiry_hours: i64 = env::var("JWT_EXPIRY_HOURS")
        .unwrap_or_else(|_| "24".to_string())
        .parse()
        .unwrap_or(24);

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::new(jwt_secret, refresh_secret, token_expiry_hours),
    };

    let cors = create_cors_layer();

    let audit_router = api::audit::create_routes(pool.clone()).await?;
    
    let app = Router::new()
        .route("/health", get(health_check))
        .merge(api::warehouse::create_routes(pool.clone()).await?)
        .merge(api::inventory::create_routes(pool.clone()).await?)
        .merge(api::inbound_order::create_routes(pool.clone()).await?)
        .merge(api::outbound_order::create_routes(pool.clone()).await?)
        .merge(audit_router)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8018".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-WMS 仓库管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-WMS is running", "健康检查"))
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS warehouses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE,
            address VARCHAR(500),
            manager VARCHAR(255),
            phone VARCHAR(50),
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            warehouse_id UUID REFERENCES warehouses(id),
            code VARCHAR(100) NOT NULL,
            name VARCHAR(255),
            type VARCHAR(50),
            capacity NUMERIC(15,4),
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inventory_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sku VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            specification VARCHAR(255),
            unit VARCHAR(50),
            quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
            location_id UUID REFERENCES locations(id),
            warehouse_id UUID REFERENCES warehouses(id),
            min_quantity NUMERIC(15,4),
            max_quantity NUMERIC(15,4),
            status VARCHAR(50) NOT NULL DEFAULT 'normal',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inbound_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_number VARCHAR(100) NOT NULL UNIQUE,
            warehouse_id UUID REFERENCES warehouses(id),
            supplier_id UUID,
            order_date TIMESTAMPTZ NOT NULL,
            expected_arrival TIMESTAMPTZ,
            actual_arrival TIMESTAMPTZ,
            total_amount NUMERIC(15,2),
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS outbound_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_number VARCHAR(100) NOT NULL UNIQUE,
            warehouse_id UUID REFERENCES warehouses(id),
            customer_id UUID,
            order_date TIMESTAMPTZ NOT NULL,
            expected_delivery TIMESTAMPTZ,
            actual_delivery TIMESTAMPTZ,
            total_amount NUMERIC(15,2),
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID,
            entity_ids JSONB,
            user_id VARCHAR(255),
            user_name VARCHAR(255),
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(50) NOT NULL,
            error_message TEXT,
            ip_address VARCHAR(255),
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status)"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

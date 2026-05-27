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
        .unwrap_or_else(|_| "postgres://xingzhai@localhost/topems_hrm".to_string());

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

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", get(health_check))
        .merge(api::employee::create_routes(pool.clone()).await?)
        .merge(api::department::create_routes(pool.clone()).await?)
        .merge(api::contract::create_routes(pool.clone()).await?)
        .merge(api::attendance::create_routes(pool.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8010".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-HRM 人力资源管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-HRM is running", "健康检查"))
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS employees (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_number VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            gender VARCHAR(10),
            birth_date TIMESTAMPTZ,
            hire_date TIMESTAMPTZ,
            department_id UUID,
            position VARCHAR(100),
            job_title VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            emergency_contact_name VARCHAR(255),
            emergency_contact_phone VARCHAR(50),
            address VARCHAR(500),
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
        CREATE TABLE IF NOT EXISTS departments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            parent_id UUID REFERENCES departments(id),
            manager_id UUID REFERENCES employees(id),
            description TEXT,
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
        CREATE TABLE IF NOT EXISTS contracts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES employees(id),
            contract_type VARCHAR(50) NOT NULL,
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ,
            salary NUMERIC(15,2),
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS attendance_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES employees(id),
            date TIMESTAMPTZ NOT NULL,
            check_in TIMESTAMPTZ,
            check_out TIMESTAMPTZ,
            status VARCHAR(50),
            work_hours NUMERIC(5,2),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

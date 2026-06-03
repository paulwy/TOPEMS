mod api;
mod models;
mod repositories;
mod services;

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

impl FromRef<AppState> for sqlx::PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_ehs=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-EHS 环境健康安全系统启动中...");

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
        .merge(api::create_routes(pool.clone(), app_state.auth_state.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .layer(cors);

    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| env::var("PORT").unwrap_or_else(|_| "8013".to_string()));
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    tracing::info!("� TOPEMS-EHS 环境健康安全系统启动中...");
    tracing::info!("�📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("✅ TOPEMS-EHS 已就绪");

    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-EHS is running", "健康检查"))
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS ehs"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.safety_hazards (
            id UUID PRIMARY KEY,
            hazard_no VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            level VARCHAR(50) NOT NULL,
            description TEXT,
            location VARCHAR(255),
            risk_assessment TEXT,
            control_measures JSONB DEFAULT '[]',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.safety_checks (
            id UUID PRIMARY KEY,
            check_no VARCHAR(100) NOT NULL UNIQUE,
            check_type VARCHAR(100) NOT NULL,
            inspector VARCHAR(255) NOT NULL,
            check_date TIMESTAMPTZ,
            location VARCHAR(255),
            result VARCHAR(100) NOT NULL,
            issues JSONB DEFAULT '[]',
            attachments JSONB DEFAULT '[]',
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.emergency_plans (
            id UUID PRIMARY KEY,
            plan_no VARCHAR(100) NOT NULL UNIQUE,
            plan_type VARCHAR(100) NOT NULL,
            scope TEXT,
            trigger_conditions TEXT,
            response_procedures TEXT,
            responsible_persons JSONB DEFAULT '[]',
            contact_info TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.drill_records (
            id UUID PRIMARY KEY,
            plan_id UUID REFERENCES ehs.emergency_plans(id),
            drill_name VARCHAR(255) NOT NULL,
            drill_date TIMESTAMPTZ,
            participants JSONB DEFAULT '[]',
            duration_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
            location VARCHAR(255),
            summary TEXT,
            issues_found TEXT,
            improvements TEXT,
            attachments JSONB DEFAULT '[]',
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_hazards_status ON ehs.safety_hazards(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_checks_status ON ehs.safety_checks(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_plans_status ON ehs.emergency_plans(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_drills_plan_id ON ehs.drill_records(plan_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"GRANT ALL PRIVILEGES ON SCHEMA ehs TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ehs TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ehs TO topems"#)
        .execute(pool)
        .await?;

    tracing::info!("🗄️ EHS数据库表初始化完成");
    Ok(())
}

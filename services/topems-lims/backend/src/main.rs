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
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/topems_lims".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    // 初始化数据库表
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
        auth_state: AuthState::new(jwt_secret),
    };

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", get(health_check))
        .merge(api::sample::create_routes(pool.clone()).await?)
        .merge(api::inspection_process::create_routes(pool.clone()).await?)
        .merge(api::inspection_task::create_routes(pool.clone()).await?)
        .merge(api::inspection_record::create_routes(pool.clone()).await?)
        .merge(api::instrument::create_routes(pool.clone()).await?)
        .merge(api::audit::create_routes(pool.clone()).await?)
        .merge(api::reagent::create_routes(pool.clone()).await?)
        .merge(api::doc_integration::create_routes(pool.clone()).await?)
        .merge(api::ai_integration::create_routes(pool.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8003".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-LIMS 实验室信息管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-LIMS is running", "健康检查"))
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // 启用 uuid 扩展
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    // 创建样品表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS samples (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'received',
            project_id UUID,
            received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建检验流程表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inspection_processes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            steps JSONB NOT NULL DEFAULT '[]',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建检验任务表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inspection_tasks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
            process_id UUID NOT NULL REFERENCES inspection_processes(id) ON DELETE CASCADE,
            current_step INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            inspector VARCHAR(255) NOT NULL,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建检验记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inspection_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            task_id UUID NOT NULL REFERENCES inspection_tasks(id) ON DELETE CASCADE,
            step_id UUID NOT NULL,
            step_name VARCHAR(255) NOT NULL,
            result TEXT NOT NULL,
            conclusion TEXT NOT NULL,
            inspector VARCHAR(255) NOT NULL,
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

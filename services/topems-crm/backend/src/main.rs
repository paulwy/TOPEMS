use anyhow::Result;
use axum::{
    routing::get,
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;

use topems_shared::{
    ApiResponse, create_cors_layer, auth_middleware, init_logging,
    ServiceHealth, build_health_response, create_api_info_router, crm_table
};

mod api;
mod models;
mod services;

use api::ApiState;

async fn init_db(db: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(db)
        .await?;

    // 创建 crm schema
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS crm"#)
        .execute(db)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm.customers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE,
            industry VARCHAR(100),
            website VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(db)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm.contacts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_id UUID REFERENCES crm.customers(id),
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            position VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(db)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm.opportunities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_id UUID REFERENCES crm.customers(id),
            name VARCHAR(255) NOT NULL,
            value NUMERIC(15,2),
            stage VARCHAR(50) DEFAULT 'prospecting',
            probability INT,
            close_date TIMESTAMPTZ,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(db)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm.interactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_id UUID REFERENCES crm.customers(id),
            contact_id UUID REFERENCES crm.contacts(id),
            type VARCHAR(50) NOT NULL,
            subject TEXT,
            content TEXT,
            scheduled_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            status VARCHAR(50) DEFAULT 'scheduled',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(db)
    .await?;

    tracing::info!("✅ CRM 数据库表初始化完成");
    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-crm", true)
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-crm");

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

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: topems_shared::AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .with_state(pool.clone());

    let protected_routes = api::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-crm"))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8012".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-CRM 客户关系管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

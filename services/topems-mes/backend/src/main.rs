mod api;
mod models;

use anyhow::Result;
use axum::{
    routing::get,
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

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
        .unwrap_or_else(|_| "postgres://xingzhai@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check));

    let protected_routes = Router::new()
        .merge(api::create_routes(pool.clone(), auth_state.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8030".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-MES 制造执行系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-MES is running", "健康检查"))
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_number VARCHAR(100) NOT NULL UNIQUE,
            product_name VARCHAR(255) NOT NULL,
            product_code VARCHAR(100),
            quantity INTEGER NOT NULL,
            unit VARCHAR(50),
            scheduled_start_date TIMESTAMPTZ,
            scheduled_end_date TIMESTAMPTZ,
            actual_start_date TIMESTAMPTZ,
            actual_end_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            priority VARCHAR(50) DEFAULT 'normal',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_processes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            description TEXT,
            sequence INTEGER NOT NULL,
            standard_time INTEGER,
            work_station_id UUID,
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
        CREATE TABLE IF NOT EXISTS work_stations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE,
            location VARCHAR(255),
            capacity INTEGER,
            status VARCHAR(50) NOT NULL DEFAULT 'idle',
            supervisor VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID NOT NULL REFERENCES production_orders(id),
            process_id UUID REFERENCES production_processes(id),
            work_station_id UUID REFERENCES work_stations(id),
            operator VARCHAR(255) NOT NULL,
            quantity_completed INTEGER NOT NULL,
            quantity_rejected INTEGER DEFAULT 0,
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
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

    // 设备点检记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS mes.inspection_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            equipment_id UUID NOT NULL,
            equipment_code VARCHAR(100) NOT NULL,
            equipment_name VARCHAR(255) NOT NULL,
            inspector VARCHAR(100) NOT NULL,
            inspection_date DATE NOT NULL,
            location VARCHAR(255),
            temperature NUMERIC(5,2),
            vibration NUMERIC(10,4),
            noise_level NUMERIC(10,2),
            status VARCHAR(50) NOT NULL DEFAULT 'normal',
            items JSONB,
            abnormalities TEXT,
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 设备维护记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS mes.maintenance_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            equipment_id UUID NOT NULL,
            equipment_code VARCHAR(100) NOT NULL,
            equipment_name VARCHAR(255) NOT NULL,
            maintenance_type VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            maintainer VARCHAR(100) NOT NULL,
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ,
            cost NUMERIC(15,2),
            parts_replaced JSONB,
            result TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 添加索引
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_inspection_equipment_id ON mes.inspection_records(equipment_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_inspection_date ON mes.inspection_records(inspection_date DESC)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_maintenance_equipment_id ON mes.maintenance_records(equipment_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_maintenance_status ON mes.maintenance_records(status)"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

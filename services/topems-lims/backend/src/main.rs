mod api;
mod models;

use axum::{
    extract::FromRef,
    routing::get,
    Json,
    Router,
};
use topems_shared::{
    ApiResponse,
    AuthState,
    auth_middleware,
    create_cors_layer,
    init_logging,
    create_database_pool,
    test_database_connection,
    Config,
    Result,
};
use utoipa_swagger_ui::SwaggerUi;

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    auth_state: AuthState,
    config: Config,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    // 1. 初始化统一日志
    init_logging("topems-lims");

    // 2. 加载配置
    let config = Config::load().await?;
    tracing::info!("Configuration loaded, environment: {}", config.env());

    // 3. 创建数据库连接池
    let pool = create_database_pool(&config.get_database().await).await?;
    test_database_connection(&pool).await?;

    // 4. 初始化数据库表
    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::from_env(),
        config,
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
        .merge(SwaggerUi::new("/swagger-ui"))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(cors);

    let port = app_state.config.get_server().await.port;
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

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
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

    // 创建审计日志表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID,
            entity_ids JSONB,
            user_id VARCHAR(100),
            user_name VARCHAR(100),
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(20) NOT NULL DEFAULT 'success',
            error_message TEXT,
            ip_address VARCHAR(50),
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建审计日志索引
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status)"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

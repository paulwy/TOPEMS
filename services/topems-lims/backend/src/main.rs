mod api;
mod models;
mod services;

use axum::{
    routing::get,
    serve, Json, Router,
};
use tokio::net::TcpListener;
use socket2::{Socket, Domain, Type, Protocol};
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
    ServiceHealth,
    build_health_response,
    create_api_info_router,
};
use utoipa::OpenApi;

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

    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json));

    let protected_routes = Router::new()
        .merge(api::create_routes(pool.clone(), auth_state.clone(), config.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-lims"))
        .layer(cors);

    let port = config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-LIMS 实验室信息管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    use std::net::SocketAddr;
    use std::os::fd::AsRawFd;
    use libc::{setsockopt, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT};
    
    let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP))?;
    
    let optval: libc::c_int = 1;
    unsafe {
        setsockopt(
            socket.as_raw_fd(),
            SOL_SOCKET,
            SO_REUSEADDR,
            &optval as *const _ as *const libc::c_void,
            std::mem::size_of::<libc::c_int>() as libc::socklen_t,
        );
        setsockopt(
            socket.as_raw_fd(),
            SOL_SOCKET,
            SO_REUSEPORT,
            &optval as *const _ as *const libc::c_void,
            std::mem::size_of::<libc::c_int>() as libc::socklen_t,
        );
    }
    
    let socket_addr: SocketAddr = addr.parse().unwrap();
    socket.bind(&socket_addr.into())?;
    socket.listen(1024)?;
    let listener = TcpListener::from_std(socket.into())?;
    serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-lims", true)
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
            code VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'received',
            project_id UUID,
            batch_number VARCHAR(100),
            source VARCHAR(255),
            sample_type VARCHAR(100),
            received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            storage_location VARCHAR(255),
            created_by VARCHAR(255) NOT NULL DEFAULT 'system',
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
            code VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            steps JSONB NOT NULL DEFAULT '[]',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_by VARCHAR(255) NOT NULL DEFAULT 'system',
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
            priority VARCHAR(50) DEFAULT 'normal',
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            created_by VARCHAR(255) NOT NULL DEFAULT 'system',
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
            attachments JSONB DEFAULT '[]',
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建仪器表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS instruments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE NOT NULL,
            instrument_type VARCHAR(255) NOT NULL,
            model VARCHAR(255),
            manufacturer VARCHAR(255),
            serial_number VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            location VARCHAR(255),
            purchase_date TIMESTAMPTZ,
            calibration_date TIMESTAMPTZ,
            next_calibration_date TIMESTAMPTZ,
            maintenance_history JSONB DEFAULT '[]',
            responsible_person VARCHAR(255),
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建仪器校准记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS instrument_calibrations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
            calibration_date TIMESTAMPTZ NOT NULL,
            calibrated_by VARCHAR(255) NOT NULL,
            calibration_results JSONB NOT NULL,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建仪器维护记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS maintenance_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
            maintenance_type VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            performed_by VARCHAR(255) NOT NULL,
            performed_at TIMESTAMPTZ NOT NULL,
            next_maintenance_date TIMESTAMPTZ,
            cost DECIMAL(18, 2),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建试剂表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS reagents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE NOT NULL,
            category VARCHAR(100),
            specification VARCHAR(255),
            supplier VARCHAR(255),
            batch_number VARCHAR(100),
            quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
            unit VARCHAR(50) NOT NULL,
            location VARCHAR(255),
            storage_condition VARCHAR(255),
            expiration_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建试剂使用记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS reagent_usages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            reagent_id UUID NOT NULL REFERENCES reagents(id) ON DELETE CASCADE,
            quantity DECIMAL(18, 4) NOT NULL,
            usage_date TIMESTAMPTZ NOT NULL,
            purpose VARCHAR(255),
            used_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建实验室台账表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS lab_ledger (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            ledger_type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            quantity INTEGER DEFAULT 0,
            location VARCHAR(255),
            status VARCHAR(50) DEFAULT 'available',
            created_by VARCHAR(255) NOT NULL DEFAULT 'system',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建文档关联表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS document_relations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID NOT NULL,
            doc_service_file_id UUID NOT NULL,
            doc_service_url VARCHAR(500),
            file_name VARCHAR(255) NOT NULL,
            file_size BIGINT,
            file_type VARCHAR(100),
            description TEXT,
            created_by VARCHAR(255) NOT NULL DEFAULT 'system',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建AI分析记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ai_analyses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID NOT NULL,
            analysis_type VARCHAR(100) NOT NULL,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            ai_service_url VARCHAR(500),
            created_by VARCHAR(255) NOT NULL DEFAULT 'system',
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
            action_type VARCHAR(50) NOT NULL,
            target_type VARCHAR(50) NOT NULL,
            target_id VARCHAR(255) NOT NULL,
            target_name VARCHAR(255),
            user_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255),
            details JSONB NOT NULL,
            ip_address VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建索引
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_samples_code ON samples(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_inspection_processes_code ON inspection_processes(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_inspection_tasks_sample_id ON inspection_tasks(sample_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_inspection_tasks_status ON inspection_tasks(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_instruments_code ON instruments(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_instruments_status ON instruments(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_reagents_code ON reagents(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_reagents_status ON reagents(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_document_relations_entity ON document_relations(entity_type, entity_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ai_analyses_entity ON ai_analyses(entity_type, entity_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type)"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

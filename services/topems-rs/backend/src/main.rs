mod api;
mod cache;
mod models;
mod services;

use axum::{
    extract::FromRef,
    routing::get,
    Json,
    Router,
};
use topems_shared::{
    auth_middleware,
    create_cors_layer,
    create_database_pool,
    init_logging,
    test_database_connection,
    ApiResponse,
    AuthState,
    Config,
    Result,
};
use utoipa::OpenApi;
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};

#[derive(Clone)]
struct AppState {
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
    init_logging("topems-rs");

    // 2. 初始化 Prometheus 监控
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_rs_custom_metric",
        "This is a custom metric for TOPEMS-RS",
    ).unwrap();
    default_registry().register(Box::new(custom_gauge.clone())).unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    // 3. 加载配置
    let config = Config::load().await?;
    let db_config = config.get_database().await;
    tracing::info!("Configuration loaded, environment: {}", config.env());
    tracing::info!("=== DB Config ===");
    tracing::info!("Database URL: {}", db_config.url);
    tracing::info!("Database Name: {}", db_config.name);
    tracing::info!("Database Host: {}", db_config.host);
    tracing::info!("Database Port: {}", db_config.port);
    tracing::info!("Database User: {}", db_config.user);
    tracing::info!("Database Password: {}", db_config.password);

    // 4. 创建数据库连接池
    let pool = create_database_pool(&db_config).await?;
    test_database_connection(&pool).await?;

    // 测试查询
    let test_result = sqlx::query("SELECT current_database(), current_user").fetch_one(&pool).await;
    tracing::info!("Test query result: {:?}", test_result);
    
    let search_path = sqlx::query("SHOW search_path").fetch_one(&pool).await;
    tracing::info!("Search path: {:?}", search_path);
    
    let schemas = sqlx::query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name").fetch_all(&pool).await;
    tracing::info!("All schemas: {:?}", schemas);
    
    let tables = sqlx::query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'rs'").fetch_all(&pool).await;
    tracing::info!("RS tables: {:?}", tables);
    
    // 尝试直接查询
    let test_projects_direct = sqlx::query("SELECT * FROM rs.projects LIMIT 1").fetch_one(&pool).await;
    tracing::info!("Test direct projects query: {:?}", test_projects_direct);

    // 4. 初始化数据库表
    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let app_state = AppState {
        auth_state: AuthState::from_env(),
        config,
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    let protected_routes = Router::new()
        .merge(api::project::create_routes(pool.clone()).await?)
        .merge(api::formula::create_routes(pool.clone()).await?)
        .merge(api::experiment::create_routes(pool.clone()).await?)
        .merge(api::material::create_routes(pool.clone()).await?)
        .merge(api::doc_integration::create_routes(pool.clone()).await?)
        .merge(api::ai_integration::create_routes(pool.clone()).await?)
        .merge(api::audit::create_routes(pool.clone()).await?)
        .merge(api::project_phase::create_routes(pool.clone()).await?)
        .merge(api::project_milestone::create_routes(pool.clone()).await?)
        .merge(api::project_member::create_routes(pool.clone()).await?)
        .merge(api::project_report::create_routes(pool.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(prometheus_layer)
        .layer(cors);

    let port = app_state.config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-RS 科研研发管理系统启动中...");
    tracing::info!("📦 Port: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-RS is running", "Health check"))
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // 创建 rs schema
    sqlx::query("CREATE SCHEMA IF NOT EXISTS rs")
        .execute(pool)
        .await?;

    // 创建项目表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.projects (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            description TEXT,
            project_type VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            leader VARCHAR(255) NOT NULL,
            team_members JSONB,
            start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            end_date TIMESTAMPTZ,
            budget NUMERIC(15, 2),
            progress INTEGER NOT NULL DEFAULT 0,
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建配方表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.formulas (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            description TEXT,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            version VARCHAR(50) NOT NULL DEFAULT '1.0',
            ingredients JSONB NOT NULL,
            instructions TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建实验表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.experiments (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            formula_id UUID REFERENCES rs.formulas(id) ON DELETE SET NULL,
            title VARCHAR(255),
            description TEXT,
            experiment_type VARCHAR(100) NOT NULL,
            objective TEXT,
            method TEXT,
            result TEXT NOT NULL,
            conclusions TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'planning',
            experimenter VARCHAR(255) NOT NULL,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            experiment_date TIMESTAMPTZ,
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建材料表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.materials (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            description TEXT,
            material_type VARCHAR(100) NOT NULL,
            category VARCHAR(100),
            purity VARCHAR(100),
            supplier VARCHAR(255),
            unit VARCHAR(50) NOT NULL,
            quantity NUMERIC(15, 4) NOT NULL DEFAULT 0,
            min_quantity NUMERIC(15, 4),
            location VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目阶段表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.project_phases (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            phase_number INTEGER NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            planned_duration_days INTEGER,
            actual_duration_days INTEGER,
            status VARCHAR(50) NOT NULL DEFAULT 'not_started',
            progress INTEGER NOT NULL DEFAULT 0,
            weight INTEGER NOT NULL DEFAULT 0,
            predecessor_id UUID REFERENCES rs.project_phases(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目预算表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.project_budgets (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            budget_type VARCHAR(50) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            planned_amount NUMERIC(15, 2) NOT NULL,
            actual_amount NUMERIC(15, 2) DEFAULT 0,
            currency VARCHAR(10) DEFAULT 'CNY',
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目合同表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.project_contracts (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            contract_number VARCHAR(100) NOT NULL,
            contract_type VARCHAR(50) NOT NULL,
            party_a VARCHAR(255) NOT NULL,
            party_b VARCHAR(255) NOT NULL,
            amount NUMERIC(15, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'CNY',
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            description TEXT,
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建付款计划表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.payment_schedules (
            id UUID PRIMARY KEY,
            contract_id UUID NOT NULL REFERENCES rs.project_contracts(id) ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            payment_number VARCHAR(100) NOT NULL,
            payment_type VARCHAR(50) NOT NULL,
            description TEXT,
            due_date TIMESTAMPTZ,
            amount NUMERIC(15, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'CNY',
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            actual_date TIMESTAMPTZ,
            actual_amount NUMERIC(15, 2),
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目里程碑表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.project_milestones (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES rs.project_phases(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            target_date TIMESTAMPTZ,
            actual_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目成员表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.project_members (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
            employee_id VARCHAR(255) NOT NULL,
            role VARCHAR(100) NOT NULL,
            responsibility TEXT,
            allocation NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
            join_date TIMESTAMPTZ,
            leave_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            hourly_rate NUMERIC(10, 2),
            cost_rate NUMERIC(10, 2),
            budgeted_hours NUMERIC(10, 2),
            actual_hours NUMERIC(10, 2),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建审计日志表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rs.audit_logs (
            id UUID PRIMARY KEY,
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

    // 创建索引
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_projects_code ON rs.projects(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_projects_leader ON rs.projects(leader)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_formulas_code ON rs.formulas(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_formulas_project_id ON rs.formulas(project_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_experiments_code ON rs.experiments(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON rs.experiments(project_id)"#,
    )
    .execute(pool)
    .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_experiments_status ON rs.experiments(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_materials_code ON rs.materials(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_materials_type ON rs.materials(material_type)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_materials_status ON rs.materials(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON rs.audit_logs(action)"#)
        .execute(pool)
        .await?;
    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON rs.audit_logs(entity_type)"#,
    )
    .execute(pool)
    .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON rs.audit_logs(user_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON rs.audit_logs(created_at)"#,
    )
    .execute(pool)
    .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON rs.audit_logs(status)"#)
        .execute(pool)
        .await?;

    // 新建表的索引
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON rs.project_phases(project_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON rs.project_budgets(project_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_project_contracts_project_id ON rs.project_contracts(project_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_payment_schedules_project_id ON rs.payment_schedules(project_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON rs.payment_schedules(contract_id)"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ RS 服务数据库表初始化完成");

    Ok(())
}

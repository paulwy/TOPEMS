mod api;
mod models;
mod services;

use anyhow::Result;
use axum::{
    extract::FromRef,
    routing::get,
    Json,
    Router,
};
use serde::Serialize;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use std::time::Instant;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer,
    ServiceHealth, HealthStatus, DependencyHealth,
    SystemMetrics, check_http_health,
};

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    auth_state: AuthState,
    metrics: Arc<SystemMetrics>,
    start_time: Instant,
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
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let start_time = Instant::now();
    let metrics = Arc::new(SystemMetrics::new());

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
    };

    let cors = create_cors_layer();

    let audit_router = api::audit::create_routes(pool.clone()).await?;
    let dict_router = api::dict::create_routes(pool.clone()).await?;
    let db_structure_router = api::db_structure::create_routes(pool.clone()).await?;

    let health_router = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/api/v1/metrics", get(get_metrics))
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .merge(api::company::create_routes(pool.clone()).await?)
        .merge(api::department::create_routes(pool.clone()).await?)
        .merge(api::employee::create_routes(pool.clone()).await?)
        .merge(api::asset::create_routes(pool.clone()).await?)
        .merge(api::finance::create_routes(pool.clone()).await?)
        .merge(audit_router)
        .merge(dict_router)
        .merge(db_structure_router)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8009".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-ERP 企业资源计划系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.pool).await;
    let iam_health = check_iam_health().await;

    let overall_status = if database_health.status == HealthStatus::Healthy
        && iam_health.status == HealthStatus::Healthy
    {
        HealthStatus::Healthy
    } else if database_health.status == HealthStatus::Unhealthy
        || iam_health.status == HealthStatus::Unhealthy
    {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let status_str = match overall_status {
        HealthStatus::Healthy => "healthy".to_string(),
        HealthStatus::Degraded => "degraded".to_string(),
        HealthStatus::Unhealthy => "unhealthy".to_string(),
    };

    Json(ApiResponse::success(status_str, "健康检查"))
}

#[derive(Serialize, Clone)]
struct ErpHealthSummary {
    service_name: String,
    status: HealthStatus,
    uptime: String,
    dependencies: Vec<DependencyHealth>,
}

async fn health_check_detailed(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.pool).await,
        check_iam_health().await,
    ];

    let all_healthy = dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy);
    let any_unhealthy = dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy);

    let overall_status = if all_healthy {
        HealthStatus::Healthy
    } else if any_unhealthy {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let message = match overall_status {
        HealthStatus::Healthy => "所有服务运行正常",
        HealthStatus::Degraded => "部分服务存在问题",
        HealthStatus::Unhealthy => "存在关键服务故障",
    };

    let health = ServiceHealth::healthy_with_message("topems-erp", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn get_metrics(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<ApiResponse<ErpServiceMetrics>> {
    let metrics = ErpServiceMetrics {
        service_name: "topems-erp".to_string(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        uptime_formatted: state.metrics.get_uptime(),
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_size: state.pool.size() as u32,
        database_pool_idle: state.pool.num_idle(),
    };

    Json(ApiResponse::success(metrics, "服务指标"))
}

#[derive(Serialize, Clone)]
struct ErpServiceMetrics {
    service_name: String,
    uptime_seconds: u64,
    uptime_formatted: String,
    request_count: u64,
    error_count: u64,
    active_connections: u64,
    database_pool_size: u32,
    database_pool_idle: usize,
}

async fn check_database_health(pool: &sqlx::PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1")
        .execute(pool)
        .await
    {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "数据库连接正常".to_string(),
        },
        Err(e) => {
            tracing::error!("数据库健康检查失败: {}", e);
            DependencyHealth {
                name: "database".to_string(),
                status: HealthStatus::Unhealthy,
                message: format!("数据库连接失败: {}", e),
            }
        }
    }
}

async fn check_iam_health() -> DependencyHealth {
    let iam_url = env::var("IAM_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8002".to_string());
    let health_url = format!("{}/health", iam_url);

    match check_http_health(&health_url).await {
        Ok(status) => {
            let message = match status {
                HealthStatus::Healthy => "IAM 服务正常",
                HealthStatus::Degraded => "IAM 服务响应异常",
                HealthStatus::Unhealthy => "IAM 服务不可用",
            };
            DependencyHealth {
                name: "iam-service".to_string(),
                status,
                message: message.to_string(),
            }
        }
        Err(e) => {
            tracing::warn!("IAM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "iam-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("IAM 服务连接异常: {}", e),
            }
        }
    }
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS erp"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp.companies (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            short_name VARCHAR(100),
            registration_number VARCHAR(100),
            tax_number VARCHAR(100),
            address VARCHAR(500),
            contact_phone VARCHAR(50),
            email VARCHAR(255),
            website VARCHAR(255),
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
        CREATE TABLE IF NOT EXISTS erp.departments (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            parent_id UUID,
            company_id UUID,
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
        CREATE TABLE IF NOT EXISTS erp.employees (
            id UUID PRIMARY KEY,
            employee_number VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            gender VARCHAR(10),
            birth_date TIMESTAMPTZ,
            hire_date TIMESTAMPTZ,
            department_id UUID,
            position VARCHAR(100),
            email VARCHAR(255),
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
        ALTER TABLE erp.employees ADD COLUMN IF NOT EXISTS user_id UUID
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp.assets (
            id UUID PRIMARY KEY,
            asset_number VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            brand VARCHAR(100),
            model VARCHAR(100),
            purchase_date TIMESTAMPTZ,
            purchase_amount NUMERIC(15,2),
            location VARCHAR(255),
            responsible_id UUID,
            status VARCHAR(50) NOT NULL DEFAULT 'in_use',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            serial_number VARCHAR(100),
            manufacturer VARCHAR(200),
            rated_power NUMERIC(10,2),
            rated_voltage NUMERIC(10,2),
            rated_current NUMERIC(10,2),
            specifications JSONB,
            image_url VARCHAR(500),
            department VARCHAR(100)
        )
        "#,
    )
    .execute(pool)
    .await?;
    
    // 为现有表添加新字段（在CREATE TABLE IF NOT EXISTS之后执行）
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;
    
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(200);
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;
    
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS rated_power NUMERIC(10,2);
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;
    
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS rated_voltage NUMERIC(10,2);
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;
    
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS rated_current NUMERIC(10,2);
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;
    
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS specifications JSONB;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;
    
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;
    
    sqlx::query(r#"
        DO $$ BEGIN
            ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS department VARCHAR(100);
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END $$;
    "#)
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp.audit_logs (
            id UUID PRIMARY KEY,
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

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_action ON erp.audit_logs(action)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_entity_type ON erp.audit_logs(entity_type)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_user_id ON erp.audit_logs(user_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_created_at ON erp.audit_logs(created_at DESC)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_status ON erp.audit_logs(status)"#)
        .execute(pool)
        .await?;

    // 费用报销表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp.expenses (
            id UUID PRIMARY KEY,
            expense_number VARCHAR(100) NOT NULL UNIQUE,
            applicant_name VARCHAR(255),
            department_id UUID,
            expense_type VARCHAR(100),
            amount NUMERIC(15,2) NOT NULL,
            description TEXT,
            expense_date TIMESTAMPTZ,
            receipt_count INT,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            approver_id UUID,
            approved_at TIMESTAMPTZ,
            reimbursed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 预算管理表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp.budgets (
            id UUID PRIMARY KEY,
            department_id UUID,
            budget_type VARCHAR(100),
            fiscal_year VARCHAR(20) NOT NULL,
            total_budget NUMERIC(15,2) NOT NULL,
            used_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            remaining_amount NUMERIC(15,2) NOT NULL,
            usage_rate NUMERIC(5,2) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 应收账款表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp.receivables (
            id UUID PRIMARY KEY,
            invoice_number VARCHAR(100) NOT NULL UNIQUE,
            customer_name VARCHAR(255),
            project_name VARCHAR(255),
            amount NUMERIC(15,2) NOT NULL,
            invoice_date TIMESTAMPTZ,
            due_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            received_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 应付账款表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp.payables (
            id UUID PRIMARY KEY,
            invoice_number VARCHAR(100) NOT NULL UNIQUE,
            supplier_name VARCHAR(255),
            category VARCHAR(100),
            amount NUMERIC(15,2) NOT NULL,
            invoice_date TIMESTAMPTZ,
            due_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sys_dict_types (
            id UUID PRIMARY KEY,
            code VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(50) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sys_dict_items (
            id UUID PRIMARY KEY,
            dict_type_id UUID NOT NULL REFERENCES sys_dict_types(id) ON DELETE CASCADE,
            code VARCHAR(100) NOT NULL,
            name VARCHAR(200) NOT NULL,
            value TEXT,
            sort_order INT DEFAULT 0,
            parent_id UUID REFERENCES sys_dict_items(id),
            extra_data JSONB,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(dict_type_id, code)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sys_db_changes (
            id UUID PRIMARY KEY,
            change_type VARCHAR(50) NOT NULL,
            table_name VARCHAR(200) NOT NULL,
            column_name VARCHAR(200),
            old_definition JSONB,
            new_definition JSONB,
            sql_statement TEXT NOT NULL,
            executed_by VARCHAR(255),
            executed_at TIMESTAMPTZ DEFAULT NOW(),
            backup_data JSONB
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_dict_types_category ON sys_dict_types(category)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_dict_types_status ON sys_dict_types(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_dict_items_type ON sys_dict_items(dict_type_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_dict_items_parent ON sys_dict_items(parent_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_db_changes_table ON sys_db_changes(table_name)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_db_changes_time ON sys_db_changes(executed_at DESC)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"GRANT ALL PRIVILEGES ON SCHEMA erp TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA erp TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA erp TO topems"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ ERP数据库表初始化完成");

    Ok(())
}

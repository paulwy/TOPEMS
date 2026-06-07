mod api;
mod models;
mod utils;

use anyhow::Result;
use axum::{
    routing::get,
    Json, Router,
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
use api::ApiState;

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

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
    };

    let cors = create_cors_layer();

    let health_router = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/api/v1/metrics", get(get_metrics))
        .with_state(api_state.clone());

    let protected_routes = api::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .layer(cors);

    let port = env::var("SERVER_PORT").or_else(|_| env::var("PORT")).unwrap_or_else(|_| "8010".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-HRM 人力资源管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.db).await;
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

#[allow(dead_code)]
#[derive(Serialize, Clone)]
struct HrmHealthSummary {
    service_name: String,
    status: HealthStatus,
    uptime: String,
    dependencies: Vec<DependencyHealth>,
}

async fn health_check_detailed(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.db).await,
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

    let health = ServiceHealth::healthy_with_message("topems-hrm", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn get_metrics(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<HrmServiceMetrics>> {
    let metrics = HrmServiceMetrics {
        service_name: "topems-hrm".to_string(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        uptime_formatted: state.metrics.get_uptime(),
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_size: state.db.size() as u32,
        database_pool_idle: state.db.num_idle(),
    };

    Json(ApiResponse::success(metrics, "服务指标"))
}

#[derive(Serialize, Clone)]
struct HrmServiceMetrics {
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
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
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
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS hrm"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.departments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            parent_id UUID REFERENCES hrm.departments(id),
            manager_id UUID,
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
        CREATE TABLE IF NOT EXISTS hrm.employees (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_number VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            gender VARCHAR(10),
            birth_date TIMESTAMPTZ,
            hire_date TIMESTAMPTZ,
            department_id UUID REFERENCES hrm.departments(id),
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
        CREATE TABLE IF NOT EXISTS hrm.contracts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES hrm.employees(id),
            contract_no VARCHAR(100) UNIQUE,
            contract_type VARCHAR(50) NOT NULL,
            party_a_name VARCHAR(255),
            party_a_contact VARCHAR(255),
            party_b_name VARCHAR(255),
            party_b_contact VARCHAR(255),
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ,
            salary NUMERIC(15,2),
            probation_period_days INTEGER DEFAULT 0,
            contract_file_path VARCHAR(500),
            reminder_days INTEGER DEFAULT 30,
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
        CREATE TABLE IF NOT EXISTS hrm.contract_renewals (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            contract_id UUID REFERENCES hrm.contracts(id),
            previous_contract_id UUID REFERENCES hrm.contracts(id),
            renewal_type VARCHAR(50) NOT NULL,
            renewal_reason TEXT,
            new_start_date TIMESTAMPTZ NOT NULL,
            new_end_date TIMESTAMPTZ,
            new_salary NUMERIC(15,2),
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            approver_id UUID REFERENCES hrm.employees(id),
            approved_at TIMESTAMPTZ,
            rejection_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.attendance_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES hrm.employees(id),
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

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.positions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE,
            department_id UUID REFERENCES hrm.departments(id),
            level VARCHAR(50),
            min_salary NUMERIC(15,2),
            max_salary NUMERIC(15,2),
            description TEXT,
            requirements TEXT,
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
        CREATE TABLE IF NOT EXISTS hrm.leave_requests (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES hrm.employees(id) NOT NULL,
            leave_type VARCHAR(50) NOT NULL,
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ NOT NULL,
            days NUMERIC(5,2) NOT NULL,
            reason TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            approver_id UUID REFERENCES hrm.employees(id),
            approved_at TIMESTAMPTZ,
            rejection_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.job_openings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            department_id UUID REFERENCES hrm.departments(id),
            position_id UUID REFERENCES hrm.positions(id),
            employment_type VARCHAR(50),
            location VARCHAR(255),
            description TEXT,
            requirements TEXT,
            salary_min NUMERIC(15,2),
            salary_max NUMERIC(15,2),
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            publish_date TIMESTAMPTZ,
            close_date TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.candidates (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            position_id UUID REFERENCES hrm.positions(id),
            job_opening_id UUID REFERENCES hrm.job_openings(id),
            resume_path VARCHAR(500),
            source VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'new',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.interviews (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            candidate_id UUID REFERENCES hrm.candidates(id) NOT NULL,
            interviewer_id UUID REFERENCES hrm.employees(id),
            round INTEGER DEFAULT 1,
            scheduled_at TIMESTAMPTZ,
            actual_at TIMESTAMPTZ,
            duration_minutes INTEGER DEFAULT 30,
            status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
            result VARCHAR(50),
            notes TEXT,
            score NUMERIC(5,2),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.payroll_runs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            pay_period VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            total_amount NUMERIC(18,2) DEFAULT 0,
            employee_count INTEGER DEFAULT 0,
            paid_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.payroll_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            payroll_run_id UUID REFERENCES hrm.payroll_runs(id) NOT NULL,
            employee_id UUID NOT NULL,
            gross_amount NUMERIC(15,2) DEFAULT 0,
            net_amount NUMERIC(15,2) DEFAULT 0,
            deductions NUMERIC(15,2) DEFAULT 0,
            taxes NUMERIC(15,2) DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            bank_account VARCHAR(255),
            paid_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.payroll_details (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            payroll_item_id UUID REFERENCES hrm.payroll_items(id) NOT NULL,
            item_type VARCHAR(50) NOT NULL,
            category VARCHAR(100),
            description VARCHAR(500),
            amount NUMERIC(15,2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.salary_adjustments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES hrm.employees(id) NOT NULL,
            adjustment_type VARCHAR(50) NOT NULL,
            old_salary NUMERIC(15,2),
            new_salary NUMERIC(15,2),
            adjustment_amount NUMERIC(15,2),
            reason TEXT,
            effective_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            approver_id UUID REFERENCES hrm.employees(id),
            approved_at TIMESTAMPTZ,
            rejection_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.performance_reviews (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID NOT NULL,
            review_period VARCHAR(50) NOT NULL,
            reviewer_id UUID,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            overall_rating NUMERIC(5,2),
            self_rating NUMERIC(5,2),
            manager_rating NUMERIC(5,2),
            final_rating NUMERIC(5,2),
            comments TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.performance_goals (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            target VARCHAR(255),
            weight NUMERIC(5,2) DEFAULT 0,
            achieved NUMERIC(5,2),
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            due_date TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.training_plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE,
            description TEXT,
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ NOT NULL,
            budget NUMERIC(15,2),
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
        CREATE TABLE IF NOT EXISTS hrm.training_courses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            plan_id UUID REFERENCES hrm.training_plans(id),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE,
            category VARCHAR(100) NOT NULL,
            level VARCHAR(50) NOT NULL,
            description TEXT,
            duration_hours NUMERIC(5,2),
            instructor_id UUID,
            instructor_name VARCHAR(255),
            location VARCHAR(255),
            max_participants INTEGER,
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
        CREATE TABLE IF NOT EXISTS hrm.training_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            course_id UUID REFERENCES hrm.training_courses(id),
            employee_id UUID NOT NULL,
            enrollment_date TIMESTAMPTZ NOT NULL,
            attendance_status VARCHAR(50) NOT NULL,
            completion_status VARCHAR(50) NOT NULL,
            score NUMERIC(5,2),
            certificate_no VARCHAR(100),
            completed_at TIMESTAMPTZ,
            feedback TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm.audit_logs (
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

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_hrm_audit_logs_action ON hrm.audit_logs(action)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_hrm_audit_logs_entity_type ON hrm.audit_logs(entity_type)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_hrm_audit_logs_user_id ON hrm.audit_logs(user_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_hrm_audit_logs_created_at ON hrm.audit_logs(created_at DESC)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_hrm_audit_logs_status ON hrm.audit_logs(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"GRANT ALL PRIVILEGES ON SCHEMA hrm TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hrm TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hrm TO topems"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ 数据库表初始化完成");

    Ok(())
}

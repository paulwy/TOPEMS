mod api;
mod models;
mod repositories;
mod services;

use anyhow::Result;
use axum::{
    extract::FromRef,
    routing::get,
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, build_health_response, create_api_info_router,
};

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

    init_logging("topems-ehs");

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
        .merge(create_api_info_router("topems-ehs"))
        .layer(cors);

    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| env::var("PORT").unwrap_or_else(|_| "8032".to_string()));
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    tracing::info!("� TOPEMS-EHS 环境健康安全系统启动中...");
    tracing::info!("�📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("✅ TOPEMS-EHS 已就绪");

    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-ehs", true)
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS ehs"#)
        .execute(pool)
        .await?;

    // 原有表
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
            name VARCHAR(255) NOT NULL,
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
            drill_no VARCHAR(100) NOT NULL UNIQUE,
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

    // 新增环境管理表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.monitoring_points (
            id UUID PRIMARY KEY,
            point_no VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            point_type VARCHAR(100) NOT NULL,
            location VARCHAR(255),
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            parameters JSONB DEFAULT '[]',
            thresholds JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            last_data_time TIMESTAMPTZ,
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
        CREATE TABLE IF NOT EXISTS ehs.environmental_data (
            id UUID PRIMARY KEY,
            point_id UUID NOT NULL REFERENCES ehs.monitoring_points(id),
            data_time TIMESTAMPTZ NOT NULL,
            parameter VARCHAR(100) NOT NULL,
            value DOUBLE PRECISION NOT NULL,
            unit VARCHAR(50) NOT NULL,
            quality VARCHAR(50),
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.environmental_alerts (
            id UUID PRIMARY KEY,
            point_id UUID NOT NULL REFERENCES ehs.monitoring_points(id),
            alert_type VARCHAR(100) NOT NULL,
            alert_level VARCHAR(50) NOT NULL,
            parameter VARCHAR(100) NOT NULL,
            threshold_value DOUBLE PRECISION NOT NULL,
            actual_value DOUBLE PRECISION NOT NULL,
            alert_time TIMESTAMPTZ NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            handled_by VARCHAR(255),
            handled_time TIMESTAMPTZ,
            handle_result TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 新增健康管理表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.health_records (
            id UUID PRIMARY KEY,
            employee_id VARCHAR(100) NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            gender VARCHAR(20),
            birth_date TIMESTAMPTZ,
            blood_type VARCHAR(10),
            allergies JSONB,
            chronic_diseases JSONB,
            medical_history TEXT,
            emergency_contact VARCHAR(255),
            emergency_phone VARCHAR(50),
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
        CREATE TABLE IF NOT EXISTS ehs.health_checkups (
            id UUID PRIMARY KEY,
            employee_id VARCHAR(100) NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            checkup_date TIMESTAMPTZ NOT NULL,
            checkup_type VARCHAR(100) NOT NULL,
            institution VARCHAR(255),
            result_summary TEXT,
            abnormal_items JSONB,
            recommendations TEXT,
            attachments JSONB,
            next_checkup_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
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
        CREATE TABLE IF NOT EXISTS ehs.vaccination_records (
            id UUID PRIMARY KEY,
            employee_id VARCHAR(100) NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            vaccine_name VARCHAR(255) NOT NULL,
            vaccine_type VARCHAR(100) NOT NULL,
            vaccination_date TIMESTAMPTZ NOT NULL,
            dose_number INTEGER NOT NULL,
            institution VARCHAR(255),
            batch_number VARCHAR(100),
            expiry_date TIMESTAMPTZ,
            next_dose_date TIMESTAMPTZ,
            remarks TEXT,
            attachments JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 新增安全事故表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.safety_incidents (
            id UUID PRIMARY KEY,
            incident_no VARCHAR(100) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            incident_type VARCHAR(100) NOT NULL,
            incident_level VARCHAR(50) NOT NULL,
            location VARCHAR(255),
            incident_time TIMESTAMPTZ NOT NULL,
            description TEXT,
            casualties INTEGER,
            injuries INTEGER,
            economic_loss DOUBLE PRECISION,
            cause_analysis TEXT,
            corrective_actions JSONB,
            responsible_persons JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'reported',
            handled_by VARCHAR(255),
            handled_time TIMESTAMPTZ,
            attachments JSONB,
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
        CREATE TABLE IF NOT EXISTS ehs.safety_hazards_new (
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

    // 新增风险评估表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.risk_assessments (
            id UUID PRIMARY KEY,
            assessment_no VARCHAR(100) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            assessment_type VARCHAR(100) NOT NULL,
            risk_source VARCHAR(255) NOT NULL,
            risk_category VARCHAR(100) NOT NULL,
            likelihood INTEGER NOT NULL,
            consequence INTEGER NOT NULL,
            risk_level VARCHAR(50) NOT NULL,
            risk_score INTEGER NOT NULL,
            description TEXT,
            affected_area VARCHAR(255),
            affected_persons INTEGER,
            existing_controls JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            assessor VARCHAR(255),
            assessment_date TIMESTAMPTZ,
            review_date TIMESTAMPTZ,
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
        CREATE TABLE IF NOT EXISTS ehs.risk_controls (
            id UUID PRIMARY KEY,
            assessment_id UUID NOT NULL REFERENCES ehs.risk_assessments(id),
            control_type VARCHAR(100) NOT NULL,
            control_measure TEXT NOT NULL,
            implementation_plan TEXT,
            responsible_person VARCHAR(255),
            target_date TIMESTAMPTZ,
            completion_date TIMESTAMPTZ,
            effectiveness VARCHAR(50),
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 新增培训管理表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.training_programs (
            id UUID PRIMARY KEY,
            program_no VARCHAR(100) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            training_type VARCHAR(100) NOT NULL,
            content TEXT,
            objectives TEXT,
            target_audience VARCHAR(255),
            duration_hours DOUBLE PRECISION,
            training_method VARCHAR(100),
            instructor VARCHAR(255),
            location VARCHAR(255),
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            max_participants INTEGER,
            materials JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'planned',
            completion_rate DOUBLE PRECISION,
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
        CREATE TABLE IF NOT EXISTS ehs.training_records (
            id UUID PRIMARY KEY,
            program_id UUID NOT NULL REFERENCES ehs.training_programs(id),
            employee_id VARCHAR(100) NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            enrollment_date TIMESTAMPTZ NOT NULL,
            completion_date TIMESTAMPTZ,
            score DOUBLE PRECISION,
            certificate_no VARCHAR(100),
            certificate_expiry TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'enrolled',
            remarks TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 新增审计日志表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ehs.audit_logs (
            id UUID PRIMARY KEY,
            module VARCHAR(100) NOT NULL,
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100) NOT NULL,
            resource_id UUID,
            user_id VARCHAR(255),
            user_name VARCHAR(255),
            old_values JSONB,
            new_values JSONB,
            ip_address VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建索引
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

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_monitoring_points_status ON ehs.monitoring_points(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_environmental_data_point_id ON ehs.environmental_data(point_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_environmental_alerts_status ON ehs.environmental_alerts(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_health_records_employee_id ON ehs.health_records(employee_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_health_checkups_employee_id ON ehs.health_checkups(employee_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_vaccination_records_employee_id ON ehs.vaccination_records(employee_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_safety_incidents_status ON ehs.safety_incidents(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_risk_assessments_status ON ehs.risk_assessments(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_risk_controls_assessment_id ON ehs.risk_controls(assessment_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_training_programs_status ON ehs.training_programs(status)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_training_records_program_id ON ehs.training_records(program_id)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_ehs_audit_logs_module ON ehs.audit_logs(module)"#)
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

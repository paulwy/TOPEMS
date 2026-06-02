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

    let email_router = api::email::create_routes(pool.clone()).await;
    let template_router = api::template::create_routes(pool.clone()).await;

    let health_router = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/api/v1/metrics", get(get_metrics))
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .merge(email_router)
        .merge(template_router)
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8027".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-Mail 邮件服务启动中...");
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
struct MailServiceMetrics {
    service_name: String,
    uptime_seconds: u64,
    uptime_formatted: String,
    request_count: u64,
    error_count: u64,
    active_connections: u64,
    database_pool_size: u32,
    database_pool_idle: usize,
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

    let health = ServiceHealth::healthy_with_message("topems-mail", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn get_metrics(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<ApiResponse<MailServiceMetrics>> {
    let metrics = MailServiceMetrics {
        service_name: "topems-mail".to_string(),
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
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS mail"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS mail.templates (
            id UUID PRIMARY KEY,
            code VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            subject_template TEXT NOT NULL,
            body_template TEXT NOT NULL,
            body_html_template TEXT,
            category VARCHAR(50) NOT NULL DEFAULT 'general',
            tags JSONB,
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
        CREATE TABLE IF NOT EXISTS mail.emails (
            id UUID PRIMARY KEY,
            subject VARCHAR(500) NOT NULL,
            from_address VARCHAR(255) NOT NULL,
            to_addresses JSONB NOT NULL,
            cc_addresses JSONB,
            bcc_addresses JSONB,
            body TEXT NOT NULL,
            body_html TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            priority VARCHAR(20) NOT NULL DEFAULT 'normal',
            sent_at TIMESTAMPTZ,
            error_message TEXT,
            template_id UUID REFERENCES mail.templates(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_mail_templates_code ON mail.templates(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_mail_templates_category ON mail.templates(category)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_mail_templates_status ON mail.templates(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_mail_emails_status ON mail.emails(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_mail_emails_priority ON mail.emails(priority)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_mail_emails_created_at ON mail.emails(created_at DESC)"#)
        .execute(pool)
        .await?;

    sqlx::query(r#"GRANT ALL PRIVILEGES ON SCHEMA mail TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mail TO topems"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mail TO topems"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        INSERT INTO mail.templates (id, code, name, description, subject_template, body_template, category, status)
        VALUES 
            (gen_random_uuid(), 'workflow_approval', '流程审批通知', '流程审批结果通知邮件模板', 
             '【TOPEMS】流程审批通知 - {{process_name}}', 
             '尊敬的{{user_name}}：\n\n您的流程【{{process_name}}】已{{approval_status}}。\n\n审批人：{{approver_name}}\n审批时间：{{approval_time}}\n审批意见：{{approval_comment}}\n\n如需查看详情，请登录系统查看。\n\nTOPEMS 系统', 'workflow', 'active'),
            (gen_random_uuid(), 'system_alert', '系统告警通知', '系统告警通知邮件模板',
             '【TOPEMS】系统告警 - {{alert_type}}',
             '尊敬的管理员：\n\n系统检测到以下告警：\n\n告警类型：{{alert_type}}\n告警级别：{{alert_level}}\n告警时间：{{alert_time}}\n告警详情：{{alert_message}}\n\n请及时处理。\n\nTOPEMS 系统', 'system', 'active'),
            (gen_random_uuid(), 'contract_notification', '合同通知', '合同相关通知邮件模板',
             '【TOPEMS】合同{{contract_action}}通知',
             '尊敬的{{user_name}}：\n\n合同【{{contract_name}}】已{{contract_action}}。\n\n合同编号：{{contract_no}}\n{{contract_action}}时间：{{action_time}}\n\n请登录系统查看详情。\n\nTOPEMS 系统', 'contract', 'active'),
            (gen_random_uuid(), 'user_register', '用户注册通知', '新用户注册通知邮件模板',
             '【TOPEMS】欢迎注册',
             '尊敬的{{user_name}}：\n\n欢迎注册 TOPEMS 系统！\n\n用户名：{{username}}\n注册时间：{{register_time}}\n\n请登录系统完成后续操作。\n\nTOPEMS 系统', 'user', 'active'),
            (gen_random_uuid(), 'password_reset', '密码重置通知', '密码重置邮件模板',
             '【TOPEMS】密码重置请求',
             '尊敬的{{user_name}}：\n\n您已申请重置密码。\n\n重置链接：{{reset_link}}\n链接有效期：{{expire_time}}\n\n如果这不是您的操作，请忽略此邮件。\n\nTOPEMS 系统', 'user', 'active')
        ON CONFLICT (code) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    tracing::info!("✅ 邮件服务数据库表初始化完成");

    Ok(())
}

mod api;
mod models;
mod services;
mod utils;

use anyhow::Result;
use axum::{
    body::Body,
    extract::State,
    http::{header, Request},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{
    register_int_counter, register_int_gauge, Encoder, IntCounter, IntGauge, TextEncoder,
};
use serde::Serialize;
use std::env;
use std::sync::Arc;
use std::time::{Duration, Instant};
use utoipa::OpenApi;

use api::ApiState;
use topems_shared::{
    check_http_health, create_api_info_router, create_cors_layer, create_database_pool,
    create_hrm_client, init_telemetry, telemetry_middleware, verify_jwt_token, ApiResponse,
    AuthState, Claims, DatabaseConfig, DependencyHealth, FieldEncryptionService, HealthStatus,
    KeyManager, NotificationServiceClient, ServiceHealth, SystemMetrics,
};

lazy_static::lazy_static! {
    pub static ref ASSET_COUNT: IntGauge = register_int_gauge!("topems_erp_asset_count", "Total number of assets in ERP system").unwrap();
    pub static ref VOUCHER_COUNT: IntGauge = register_int_gauge!("topems_erp_voucher_count", "Total number of vouchers in ERP system").unwrap();
    pub static ref FINANCIAL_TRANSACTION_COUNT: IntCounter = register_int_counter!("topems_erp_financial_transactions_total", "Total number of financial transactions").unwrap();
    pub static ref ACTIVE_USERS: IntGauge = register_int_gauge!("topems_erp_active_users", "Number of active users in the last hour").unwrap();
    pub static ref API_REQUESTS_TOTAL: IntCounter = register_int_counter!("topems_erp_api_requests_total", "Total number of API requests").unwrap();
}

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "ERP", description = "企业资源计划系统 API"),
        (name = "Health", description = "健康检查接口"),
        (name = "Metrics", description = "服务指标接口"),
        (name = "Assets", description = "资产管理接口"),
        (name = "Finance", description = "财务管理接口"),
        (name = "Voucher", description = "凭证管理接口"),
        (name = "Audit", description = "审计日志接口"),
        (name = "Dict", description = "数据字典接口"),
    ),
    info(
        title = "TOPEMS-ERP API",
        version = "1.0.0",
        description = "TOPEMS 企业资源计划系统 API 文档\n\n## 功能模块\n\n- **资产管理**: 资产的增删改查、状态管理\n- **财务管理**: 科目管理、预算管理、费用管理\n- **凭证管理**: 财务凭证的创建和审核\n- **审计日志**: 操作记录和审计追踪\n- **数据字典**: 系统配置数据管理",
    ),
    servers(
        (url = "http://localhost:8009", description = "本地开发环境"),
        (url = "http://erp.topems.local", description = "测试环境"),
        (url = "http://erp.topems.prod", description = "生产环境"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-erp");

    let db_config = DatabaseConfig {
        url: env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        }),
        max_connections: 20,
        min_connections: Some(5),
        connect_timeout: Some(30),
        idle_timeout: Some(300),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };

    let pool = create_database_pool(&db_config).await?;

    tracing::info!("🔗 数据库连接成功");

    let pool_clone = pool.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            update_business_metrics(&pool_clone).await;
        }
    });

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let start_time = Instant::now();
    let metrics = Arc::new(SystemMetrics::new());

    // 初始化加密服务
    let encryption_service = init_encryption_service();
    tracing::info!("🔐 字段加密服务初始化成功");

    // 初始化通知服务客户端
    let notification_service_url = env::var("NOTIFICATION_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8003".to_string());
    let notification_client = Arc::new(NotificationServiceClient::with_base_url(
        notification_service_url,
    ));

    // 初始化 HRM 服务客户端
    let hrm_client = create_hrm_client().map(Arc::new).unwrap_or_else(|e| {
        tracing::warn!("HRM服务客户端初始化失败: {}, 将使用mock模式", e);
        use topems_shared::service_client::HrmServiceClient;
        let default_url = "http://localhost:8011".to_string();
        Arc::new(HrmServiceClient::new(default_url).expect("默认HRM客户端创建失败"))
    });

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
        dict_cache: Arc::new(utils::InMemoryCache::new(Duration::from_secs(600))),
        notification_client,
        hrm_client,
        encryption: Arc::new(encryption_service),
        // 初始化财务数据缓存 (5分钟 TTL)
        expense_cache: Arc::new(utils::InMemoryCache::new(Duration::from_secs(300))),
        budget_cache: Arc::new(utils::InMemoryCache::new(Duration::from_secs(300))),
        receivable_cache: Arc::new(utils::InMemoryCache::new(Duration::from_secs(300))),
        payable_cache: Arc::new(utils::InMemoryCache::new(Duration::from_secs(300))),
    };

    let cors = create_cors_layer();

    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let health_router = Router::new()
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/api/v1/metrics", get(get_metrics))
        .route(
            "/metrics",
            get(move || async move {
                let encoder = TextEncoder::new();
                let metrics = prometheus::gather();
                let mut buffer = Vec::new();
                encoder.encode(&metrics, &mut buffer).unwrap();
                String::from_utf8(buffer).unwrap()
            }),
        )
        .with_state(api_state.clone());

    let protected_routes = api::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            erp_auth_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-erp"))
        .route(
            "/api-docs/openapi.json",
            get(|| async { serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap() }),
        )
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors);

    let port = env::var("SERVER_PORT")
        .or_else(|_| env::var("PORT"))
        .unwrap_or_else(|_| "8010".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-ERP 企业资源计划系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        api::plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[allow(dead_code)]
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
struct ErpHealthSummary {
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

    let health = ServiceHealth::healthy_with_message("topems-erp", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn get_metrics(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<ErpServiceMetrics>> {
    let metrics = ErpServiceMetrics {
        service_name: "topems-erp".to_string(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        uptime_formatted: state.metrics.get_uptime(),
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_size: state.db.size(),
        database_pool_idle: state.db.num_idle(),
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
    match sqlx::query("SELECT 1").execute(pool).await {
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

async fn update_business_metrics(pool: &sqlx::PgPool) {
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assets")
        .fetch_one(pool)
        .await
    {
        Ok(count) => ASSET_COUNT.set(count),
        Err(e) => tracing::warn!("Failed to update asset count: {}", e),
    }

    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM financial_vouchers")
        .fetch_one(pool)
        .await
    {
        Ok(count) => VOUCHER_COUNT.set(count),
        Err(e) => tracing::warn!("Failed to update voucher count: {}", e),
    }

    match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM audit_logs 
         WHERE created_at >= NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => ACTIVE_USERS.set(count),
        Err(e) => tracing::warn!("Failed to update active users: {}", e),
    }
}

async fn check_iam_health() -> DependencyHealth {
    let iam_url =
        env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
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

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

fn init_encryption_service() -> FieldEncryptionService {
    let master_key = env::var("ENCRYPTION_MASTER_KEY").unwrap_or_else(|_| {
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string()
    });
    let key_bytes = hex::decode(&master_key).unwrap_or_else(|_| vec![0x42; 32]);
    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(&key_bytes[..32]);
    let key_manager = KeyManager::new(&key_array);
    FieldEncryptionService::new(key_manager)
}

// ==================== ERP 认证中间件 ====================
// 支持三种认证模式：
// 1. X-User-Id header 模式（通过 unified-core 代理访问）
// 2. Authorization header 模式（直连模式）
// 3. 开发模式（环境变量 DEVELOPMENT_MODE=true 时跳过认证）

async fn erp_auth_middleware(
    State(auth_state): State<AuthState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path().to_string();

    // 公开路径不需要认证
    let public_paths = [
        "/",
        "/health",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/plugins/info",
        "/api/plugins/health",
    ];
    if public_paths.contains(&path.as_str()) {
        return next.run(req).await;
    }

    let (mut parts, body) = req.into_parts();

    // 模式 1: 检查 X-User-Id header（代理模式）
    if let Some(user_id) = parts.headers.get("X-User-Id") {
        if let Ok(user_id_str) = user_id.to_str() {
            let claims = Claims {
                sub: user_id_str.to_string(),
                username: user_id_str.to_string(),
                role: "user".to_string(),
                roles: vec!["user".to_string()],
                permissions: vec![],
                is_superuser: false,
                exp: 0,
                iat: 0,
                email: None,
                department: None,
                tenant_id: parts
                    .headers
                    .get("X-Tenant-Id")
                    .and_then(|h| h.to_str().ok())
                    .map(|s| s.to_string()),
            };
            parts.extensions.insert(claims);
            let req = Request::from_parts(parts, body);
            return next.run(req).await;
        }
    }

    // 模式 3: 开发模式（跳过认证）
    if std::env::var("DEVELOPMENT_MODE").unwrap_or_default() == "true" {
        tracing::info!("开发模式：跳过认证，路径: {}", parts.uri.path());
        let claims = Claims {
            sub: "dev_user".to_string(),
            username: "dev_user".to_string(),
            role: "admin".to_string(),
            roles: vec!["admin".to_string(), "user".to_string()],
            permissions: vec!["finance:read".to_string(), "finance:write".to_string()],
            is_superuser: true,
            exp: 0,
            iat: 0,
            email: Some("dev@example.com".to_string()),
            department: None,
            tenant_id: None,
        };
        parts.extensions.insert(claims);
        let req = Request::from_parts(parts, body);
        return next.run(req).await;
    }

    // 模式 2: 检查 Authorization header（直连模式）
    let auth_header = parts
        .headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            return topems_shared::response::api_error::<()>(401, "未授权：缺少有效的认证令牌")
                .into_response();
        }
    };

    match verify_jwt_token(token, &auth_state.jwt_secret) {
        Ok(claims) => {
            parts.extensions.insert(claims);
            let req = Request::from_parts(parts, body);
            next.run(req).await
        }
        Err(e) => {
            tracing::error!("Token verification failed: {}", e);
            topems_shared::response::api_error::<()>(401, &format!("认证失败：{}", e))
                .into_response()
        }
    }
}

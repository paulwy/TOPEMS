mod models;
mod services;
mod shared;
mod utils;

pub mod modules;

use anyhow::Result;
use axum::{
    routing::{delete, get, post, put},
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

use modules::ApiState;
use topems_shared::{
    auth_middleware, check_http_health, create_api_info_router, create_cors_layer,
    create_database_pool, create_hrm_client, init_telemetry, rls_middleware, telemetry_middleware,
    wrap_group2_router, ApiResponse, AuthState, DatabaseConfig, DependencyHealth,
    FieldEncryptionService, HealthStatus, KeyManager, NotificationServiceClient, RouteCompatConfig,
    ServiceHealth, SystemMetrics,
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
            env::var("DATABASE_URL")
                .expect("DATABASE_URL environment variable is required")
                .to_string()
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
        .route("/api/health/detailed", get(health_check_detailed))
        .route("/api/metrics", get(get_metrics))
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

    let protected_routes = modules::create_routes()
        // Frontend aligned routes (ERP module)
        // Production Order
        .route(
            "/api/core/erp/production-orders",
            get(modules::production_order::list_production_orders)
                .post(modules::production_order::create_production_order),
        )
        .route(
            "/api/core/erp/production-orders/{id}",
            get(modules::production_order::get_production_order)
                .put(modules::production_order::update_production_order)
                .delete(modules::production_order::delete_production_order),
        )
        .route(
            "/api/core/erp/production-orders/{id}/progress",
            put(modules::production_order::update_production_progress),
        )
        .route(
            "/api/core/erp/production-orders/{id}/status",
            post(modules::production_order::update_production_status),
        )
        // Sales Order
        .route(
            "/api/core/erp/sales-orders",
            get(modules::sales_order::list_sales_orders)
                .post(modules::sales_order::create_sales_order),
        )
        .route(
            "/api/core/erp/sales-orders/{id}",
            get(modules::sales_order::get_sales_order)
                .put(modules::sales_order::update_sales_order)
                .delete(modules::sales_order::delete_sales_order),
        )
        // Material
        .route(
            "/api/core/erp/materials",
            get(modules::material::list_materials).post(modules::material::create_material),
        )
        .route(
            "/api/core/erp/materials/{id}",
            get(modules::material::get_material)
                .put(modules::material::update_material)
                .delete(modules::material::delete_material),
        )
        // Inventory
        .route(
            "/api/core/erp/inventory",
            get(modules::inventory::list_inventory).post(modules::inventory::create_inventory),
        )
        .route(
            "/api/core/erp/inventory/{id}",
            get(modules::inventory::get_inventory)
                .put(modules::inventory::update_inventory)
                .delete(modules::inventory::delete_inventory),
        )
        .route(
            "/api/core/erp/inventory/low-stock",
            get(modules::inventory::get_low_stock),
        )
        // Supplier
        .route(
            "/api/core/erp/suppliers",
            get(modules::supplier::list_suppliers).post(modules::supplier::create_supplier),
        )
        .route(
            "/api/core/erp/suppliers/{id}",
            get(modules::supplier::get_supplier)
                .put(modules::supplier::update_supplier)
                .delete(modules::supplier::delete_supplier),
        )
        // Customer
        .route(
            "/api/core/erp/customers",
            get(modules::customer::list_customers).post(modules::customer::create_customer),
        )
        .route(
            "/api/core/erp/customers/{id}",
            get(modules::customer::get_customer)
                .put(modules::customer::update_customer)
                .delete(modules::customer::delete_customer),
        )
        // Finance
        .route(
            "/api/core/erp/expenses",
            get(modules::finance::list_expenses).post(modules::finance::create_expense),
        )
        .route(
            "/api/core/erp/expenses/{id}",
            get(modules::finance::get_expense)
                .put(modules::finance::update_expense)
                .delete(modules::finance::delete_expense),
        )
        .route(
            "/api/core/erp/budgets",
            get(modules::finance::list_budgets).post(modules::finance::create_budget),
        )
        .route(
            "/api/core/erp/budgets/{id}",
            get(modules::finance::get_budget)
                .put(modules::finance::update_budget)
                .delete(modules::finance::delete_budget),
        )
        .route(
            "/api/core/erp/receivables",
            get(modules::finance::list_receivables).post(modules::finance::create_receivable),
        )
        .route(
            "/api/core/erp/receivables/{id}",
            get(modules::finance::get_receivable)
                .put(modules::finance::update_receivable)
                .delete(modules::finance::delete_receivable),
        )
        .route(
            "/api/core/erp/payables",
            get(modules::finance::list_payables).post(modules::finance::create_payable),
        )
        .route(
            "/api/core/erp/payables/{id}",
            get(modules::finance::get_payable)
                .put(modules::finance::update_payable)
                .delete(modules::finance::delete_payable),
        )
        // Voucher
        .route(
            "/api/core/erp/vouchers",
            get(modules::voucher::list_vouchers).post(modules::voucher::create_voucher),
        )
        .route(
            "/api/core/erp/vouchers/{id}",
            get(modules::voucher::get_voucher)
                .put(modules::voucher::update_voucher)
                .delete(modules::voucher::delete_voucher),
        )
        .route(
            "/api/core/erp/vouchers/{id}/approve",
            post(modules::voucher::approve_voucher),
        )
        .route(
            "/api/core/erp/vouchers/{id}/post",
            post(modules::voucher::post_voucher),
        )
        .route(
            "/api/core/erp/voucher-templates",
            get(modules::voucher::list_voucher_templates)
                .post(modules::voucher::create_voucher_template),
        )
        .route(
            "/api/core/erp/voucher-templates/{id}",
            get(modules::voucher::get_voucher_template)
                .put(modules::voucher::update_voucher_template)
                .delete(modules::voucher::delete_voucher_template),
        )
        .route(
            "/api/core/erp/voucher-templates/{id}/preview",
            get(modules::voucher::preview_generated_vouchers),
        )
        .route(
            "/api/core/erp/accounting-subjects",
            get(modules::voucher::list_subjects).post(modules::voucher::create_subject),
        )
        .route(
            "/api/core/erp/accounting-subjects/{id}",
            get(modules::voucher::get_subject)
                .put(modules::voucher::update_subject)
                .delete(modules::voucher::delete_subject),
        )
        // Asset
        .route(
            "/api/core/erp/assets",
            get(modules::asset::list_assets).post(modules::asset::create_asset),
        )
        .route(
            "/api/core/erp/assets/{id}",
            get(modules::asset::get_asset)
                .put(modules::asset::update_asset)
                .delete(modules::asset::delete_asset),
        )
        // Fixed Asset
        .route(
            "/api/core/erp/fixed-assets",
            get(modules::fixed_asset::list_fixed_assets)
                .post(modules::fixed_asset::create_fixed_asset),
        )
        .route(
            "/api/core/erp/fixed-assets/{id}",
            get(modules::fixed_asset::get_fixed_asset)
                .put(modules::fixed_asset::update_fixed_asset)
                .delete(modules::fixed_asset::delete_fixed_asset),
        )
        // Bank
        .route(
            "/api/core/erp/bank-accounts",
            get(modules::bank::list_bank_accounts).post(modules::bank::create_bank_account),
        )
        .route(
            "/api/core/erp/bank-accounts/{id}",
            get(modules::bank::get_bank_account)
                .put(modules::bank::update_bank_account)
                .delete(modules::bank::delete_bank_account),
        )
        // Office Supplies
        .route(
            "/api/core/erp/office-supplies",
            get(modules::office_supplies::list_supplies)
                .post(modules::office_supplies::create_supply),
        )
        .route(
            "/api/core/erp/office-supplies/{id}",
            get(modules::office_supplies::get_supply)
                .put(modules::office_supplies::update_supply)
                .delete(modules::office_supplies::delete_supply),
        )
        // Meeting Room
        .route(
            "/api/core/erp/meeting-rooms",
            get(modules::meeting_room::list_rooms).post(modules::meeting_room::create_room),
        )
        .route(
            "/api/core/erp/meeting-rooms/{id}",
            get(modules::meeting_room::get_room)
                .put(modules::meeting_room::update_room)
                .delete(modules::meeting_room::delete_room),
        )
        .route(
            "/api/core/erp/meeting-bookings",
            get(modules::meeting_room::list_bookings).post(modules::meeting_room::create_booking),
        )
        .route(
            "/api/core/erp/meeting-bookings/{id}",
            get(modules::meeting_room::get_booking)
                .put(modules::meeting_room::update_booking)
                .delete(modules::meeting_room::delete_booking),
        )
        // Vehicles
        .route(
            "/api/core/erp/vehicles",
            get(modules::vehicles::list_vehicles).post(modules::vehicles::create_vehicle),
        )
        .route(
            "/api/core/erp/vehicles/{id}",
            get(modules::vehicles::get_vehicle)
                .put(modules::vehicles::update_vehicle)
                .delete(modules::vehicles::delete_vehicle),
        )
        .route(
            "/api/core/erp/vehicle-requests",
            get(modules::vehicles::list_vehicle_requests)
                .post(modules::vehicles::create_vehicle_request),
        )
        .route(
            "/api/core/erp/vehicle-requests/{id}",
            get(modules::vehicles::get_vehicle_request)
                .put(modules::vehicles::update_vehicle_request)
                .delete(modules::vehicles::delete_vehicle_request),
        )
        // Announcement
        .route(
            "/api/core/erp/announcements",
            get(modules::announcement::list_announcements)
                .post(modules::announcement::create_announcement),
        )
        .route(
            "/api/core/erp/announcements/{id}",
            get(modules::announcement::get_announcement)
                .put(modules::announcement::update_announcement)
                .delete(modules::announcement::delete_announcement),
        )
        // Opening Balance
        .route(
            "/api/core/erp/opening-balances",
            get(modules::opening_balance::list_opening_balances)
                .post(modules::opening_balance::create_opening_balance),
        )
        .route(
            "/api/core/erp/opening-balances/{id}",
            get(modules::opening_balance::get_opening_balance)
                .put(modules::opening_balance::update_opening_balance)
                .delete(modules::opening_balance::delete_opening_balance),
        )
        // Admin middleware
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            api_state.db.clone(),
            rls_middleware,
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

    let cfg = RouteCompatConfig::new("erp", "/api/core/erp", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = env::var("ERP_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .or_else(|_| env::var("PORT"))
        .unwrap_or_else(|_| "8010".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-ERP 企业资源计划系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::erp_plugin::auto_register_to_core(core_url.as_deref()).await;
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

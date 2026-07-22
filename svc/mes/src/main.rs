//! TOPEMS MES Service
//!
//! Manufacturing Execution System Service

use topems_mes::{modules, AppState};

use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_telemetry,
    rate_limit_middleware, register_routes_with_legacy_alias, request_context_middleware,
    rls_middleware, simple_health_check, telemetry_middleware, ApiResponse, AuthState,
    RateLimitConfig, RateLimitMiddleware, ServiceHealth, SimpleHealthConfig,
};

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "MES", description = "生产执行系统 API"),
        (name = "Health", description = "健康检查接口"),
        (name = "ProductionOrder", description = "生产订单管理接口"),
        (name = "WorkOrder", description = "工单管理接口"),
        (name = "QualityManagement", description = "质量管理接口"),
        (name = "InventoryManagement", description = "库存管理接口"),
        (name = "EquipmentManagement", description = "设备管理接口"),
        (name = "APSScheduling", description = "高级排程接口"),
        (name = "ProductionCost", description = "生产成本核算接口"),
        (name = "EnergyManagement", description = "能耗管理接口"),
        (name = "AnomalyDetection", description = "生产异常预警接口"),
    ),
    info(
        title = "TOPEMS-MES API",
        version = "1.0.0",
        description = "TOPEMS 生产执行系统 API 文档\n\n## 功能模块\n\n- **生产订单**: 生产订单创建、排程、进度跟踪\n- **工单管理**: 工单下发、报工、完工\n- **质量管理**: 质检标准、检验记录、不合格品处理\n- **库存管理**: 车间库存、物料领用\n- **设备管理**: 设备台账、维护保养、状态监控\n- **高级排程**: APS 排程优化\n- **生产成本**: 工单成本核算\n- **能耗管理**: 能源消耗监控",
    ),
    servers(
        (url = "http://localhost:8020", description = "本地开发环境"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-mes");

    tracing::info!("🚀 TOPEMS MES Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    if let Err(e) = modules::init_database(&pool).await {
        tracing::warn!("MES database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-mes").with_db(pool.clone());

    let event_publisher = match topems_shared::event::EventPublisher::new("topems-mes") {
        Ok(publisher) => {
            tracing::info!("📢 事件发布服务初始化成功");
            Some(std::sync::Arc::new(publisher))
        }
        Err(e) => {
            tracing::warn!("⚠️ 事件发布服务初始化失败（不阻塞启动）: {}", e);
            None
        }
    };

    let state = AppState {
        auth_state,
        pool,
        health_config,
        event_publisher,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api", get(|| get_api_info_handler("mes-service")))
        .route("/api/info", get(|| get_api_info_handler("mes-service")))
        .route(
            "/api/plugins/info",
            get(modules::mes_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::mes_plugin::plugin_health_check),
        )
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route(
            "/ws/mes/dashboard",
            axum::routing::get(modules::dashboard_ws::dashboard_websocket),
        );

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let rate_limit_layer = axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    });

    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.pool.clone(),
            rls_middleware,
        ))
        .layer(rate_limit_layer);

    let app = register_routes_with_legacy_alias(
        Router::new().merge(public_routes),
        "/api/mes",
        &["/api/v1/mes"],
        protected_routes,
    )
    .route("/api/health/detailed", get(detailed_health))
    .route(
        "/api-docs/openapi.json",
        get(|| async {
            serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
                tracing::error!("Failed to serialize OpenAPI spec: {}", e);
                "{}".to_string()
            })
        }),
    )
    .layer(cors)
    .layer(axum::middleware::from_fn(request_context_middleware))
    .layer(axum::middleware::from_fn(telemetry_middleware))
    .layer(prometheus_layer)
    .with_state(state);

    let port = std::env::var("MES_PORT")
        .or_else(|_| std::env::var("SERVER_PORT"))
        .or_else(|_| std::env::var("PORT"))
        .unwrap_or_else(|_| "8030".to_string())
        .parse()
        .unwrap_or(8030);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ MES Service is running at http://{}", addr);

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mes_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS MES Service API\n\n\
     Manufacturing Execution System\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "mes-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "mes": "active"
        },
        "dependencies": [
            {
                "name": "postgresql",
                "status": db_status
            }
        ],
        "version": "1.0.0"
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}

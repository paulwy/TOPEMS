//! TOPEMS MES Service
//!
//! Manufacturing Execution System Service

use topems_mes::{modules, AppState};

use axum::routing::get;
use utoipa::OpenApi;

use topems_shared::service_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared::SimpleHealthConfig;

use modules::production_order::{
    CreateFromErpRequest, CreateProductionOrderRequest, ErpSalesOrderInfo,
    ListProductionOrdersResponse, ProductionOrderResponse, ProductionOrderSource,
    UpdateProductionOrderRequest,
};
use modules::work_order::{CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrderResponse};
use modules::work_report::{
    CreateWorkReportRequest, RejectWorkReportRequest, UpdateWorkReportRequest, WorkReportResponse,
};

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            // work_order
            CreateWorkOrderRequest,
            UpdateWorkOrderRequest,
            WorkOrderResponse,
            // work_report
            CreateWorkReportRequest,
            UpdateWorkReportRequest,
            RejectWorkReportRequest,
            WorkReportResponse,
            // production_order
            ProductionOrderSource,
            ErpSalesOrderInfo,
            CreateFromErpRequest,
            CreateProductionOrderRequest,
            UpdateProductionOrderRequest,
            ProductionOrderResponse,
            ListProductionOrdersResponse,
        ),
    ),
    paths(
        modules::work_order::list_work_orders,
        modules::work_order::create_work_order,
        modules::work_order::get_work_order,
        modules::work_report::list_work_reports,
        modules::work_report::create_work_report,
        modules::work_report::get_work_report,
        modules::production_order::list_production_orders,
        modules::production_order::create_production_order,
        modules::production_order::get_production_order,
    ),
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
    let config = ServiceConfig {
        name: "topems-mes",
        port: 8030,
        port_env_var: Some("MES_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/mes",
        legacy_prefixes: &["/api/v1/mes"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = modules::init_database(&ctx.db).await {
        tracing::warn!("MES database init warning: {}", e);
    }

    let health_config = SimpleHealthConfig::new("topems-mes").with_db(ctx.db.clone());

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config,
        event_publisher: ctx.event_publisher.clone(),
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    // 插件路由 + WebSocket 路由（需要 AppState）
    let plugin_routes = axum::Router::new()
        .route("/", get(home))
        .route(
            "/api/plugins/info",
            get(modules::mes_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::mes_plugin::plugin_health_check),
        )
        .route(
            "/ws/mes/dashboard",
            axum::routing::get(modules::dashboard_ws::dashboard_websocket),
        )
        .with_state(state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由
    let protected_routes = modules::create_routes().with_state(state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mes_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

async fn home() -> &'static str {
    "TOPEMS MES Service API\n\n\
     Manufacturing Execution System\n\n\
     - /health - Health check"
}

#[cfg(test)]
mod openapi_extract_tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-mes-openapi.json", json).expect("Failed to write spec");
        println!("OpenAPI spec written to /tmp/topems-mes-openapi.json");
    }
}

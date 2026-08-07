// TOPEMS Finance Service
// =============================================================================

pub mod domain;
pub mod event_handlers;
pub mod models;
pub mod modules;
pub mod services;
pub mod shared;

use axum::routing::get;
use utoipa::OpenApi;

use crate::models::*;
use crate::modules::*;
use crate::shared::AppState;
use topems_shared::service_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared::service_client::create_workflow_client;

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            Account,
            AccountType,
            Voucher,
            VoucherType,
            VoucherStatus,
            VoucherLine,
            VoucherResponse,
            CreateAccountRequest,
            CreateVoucherRequest,
            VoucherLineRequest,
            LedgerEntry,
            TrialBalance,
            Period,
            PeriodStatus,
            BalanceSheet,
            BalanceItem,
            IncomeStatement,
            IncomeItem,
            CashFlowStatement,
            CashFlowItem,
            AuxType,
            AuxiliaryAccount,
            Payment,
            PaymentItem,
            PaymentResponse,
            CreatePaymentRequest,
            PaymentItemRequest,
        ),
    ),
    paths(
        list_accounts,
        create_account,
        get_account,
        list_vouchers,
        create_voucher,
        get_voucher,
        submit_voucher,
        approve_voucher,
        post_voucher,
        get_ledger,
        get_trial_balance,
        get_balance_sheet,
        get_income_statement,
    ),
    tags(
        (name = "Finance", description = "财务管理"),
        (name = "Voucher", description = "凭证管理"),
        (name = "Accounting", description = "科目管理"),
        (name = "Report", description = "报表生成"),
        (name = "Cost", description = "成本核算"),
        (name = "Reconciliation", description = "对账中心"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-finance API",
        version = "1.0.0",
        description = "TOPEMS 财务服务 - 凭证管理、科目管理、报表生成、成本核算",
    ),
    servers(
        (url = "http://localhost:8011", description = "本地开发环境"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "finance, public");

    let config = ServiceConfig {
        name: "topems-finance",
        port: 8011,
        port_env_var: Some("FINANCE_PORT"),
        max_db_connections: 20,
        enable_events: true,
        enable_rls: false,
        api_prefix: "/api/finance",
        legacy_prefixes: &["/api/v1/finance", "/api/core/finance/v1"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = services::init_database(&ctx.db).await {
        tracing::error!("Failed to init finance database: {}", e);
        std::process::exit(1);
    }

    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ Finance 事件订阅者启动失败: {}", e);
    }

    let pg_cqrs_ctx = domain::cqrs::init_pg_cqrs_context(ctx.db.clone());
    pg_cqrs_ctx.start_async_projection().await;
    tracing::info!("✅ CQRS PostgreSQL 事件存储与异步投影器已启动");

    // V45.0 Track A: 初始化事件管道（发布器 + 路由器 + Saga 协调器）
    let event_pipeline = domain::event_pipeline::get_event_pipeline();
    tracing::info!(
        "✅ Finance 事件管道已初始化: 处理器 {} 个, Saga 定义 {} 个",
        event_pipeline.get_router().handler_count(),
        event_pipeline.get_saga_coordinator().definition_count()
    );

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client = create_workflow_client().expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        workflow_client,
        event_publisher: ctx.event_publisher.clone(),
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state).route("/", get(home));

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

    run(app).await
}

async fn home() -> &'static str {
    "TOPEMS Finance Service API\n\n\
     Contains: Accounts, Vouchers, Ledger, Reports\n\n\
     - /health - Health check\n\
     - /api/info - API information"
}

#[cfg(test)]
mod openapi_extract_tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-finance-openapi.json", json).expect("Failed to write spec");
        println!("OpenAPI spec written to /tmp/topems-finance-openapi.json");
    }
}

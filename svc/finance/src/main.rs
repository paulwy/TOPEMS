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
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared_service_client::service_client::create_workflow_client;

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
            ExecutePaymentRequest,
            ExportPaymentRequest,
            ExportPaymentResponse,
            PaymentListResponse,
            PaymentApprovalConfig,
            ApprovalNode,
            CreateApprovalConfigRequest,
            CreateApprovalNodeRequest,
            ApprovalConfigResponse,
            FinanceDashboardStats,
        ),
    ),
    paths(
        get_dashboard_handler,
        list_accounts,
        create_account,
        get_account,
        get_account_by_code,
        get_account_balances,
        list_vouchers,
        create_voucher,
        get_voucher,
        update_voucher,
        delete_voucher,
        submit_voucher,
        approve_voucher,
        post_voucher,
        unpost_voucher,
        batch_submit_vouchers,
        batch_approve_vouchers,
        batch_post_vouchers,
        export_vouchers,
        get_ledger,
        get_trial_balance,
        get_balance_sheet,
        get_income_statement,
        get_cash_flow,
        list_voucher_templates_handler,
        get_voucher_template_handler,
        create_voucher_template_handler,
        update_voucher_template_handler,
        delete_voucher_template_handler,
        set_default_template_handler,
        list_generation_rules_handler,
        get_generation_rule_handler,
        create_generation_rule_handler,
        update_generation_rule_handler,
        delete_generation_rule_handler,
        toggle_generation_rule_handler,
        crate::modules::voucher_template::copy_template,
        crate::modules::voucher_template::toggle_template,
        crate::modules::voucher_template::match_template,
        crate::modules::voucher_template::get_usage_stats,
        crate::modules::voucher_template::export_template,
        crate::modules::voucher_template::import_template,
        crate::modules::voucher_template::preview_generation,
        crate::modules::voucher_template::generate_from_source,
        crate::modules::voucher_template::batch_generate,
        crate::modules::voucher_template::auto_generate,
        crate::modules::voucher_template::regenerate,
        crate::modules::voucher_template_entries::list_entries,
        crate::modules::voucher_template_entries::get_entry,
        crate::modules::voucher_template_entries::create_entry,
        crate::modules::voucher_template_entries::update_entry,
        crate::modules::voucher_template_entries::delete_entry,
        crate::modules::voucher_template_entries::reorder_entries,
        create_payment_handler,
        get_payment_handler,
        list_payments_handler,
        update_payment_handler,
        delete_payment_handler,
        submit_payment_handler,
        approve_payment_handler,
        reject_payment_handler,
        execute_payment_handler,
        write_off_payment_item_handler,
        export_payments_handler,
        list_approval_configs_handler,
        create_approval_config_handler,
        get_approval_config_handler,
        update_approval_config_handler,
        delete_approval_config_handler,
        list_payment_records_handler,
        create_payment_record_handler,
        approve_payment_record_handler,
        reject_payment_record_handler,
        list_receivables_handler,
        batch_create_receivables_handler,
        crate::modules::operational::get_receivable,
        crate::modules::operational::update_receivable,
        crate::modules::operational::delete_receivable,
        list_payables_handler,
        batch_create_payables_handler,
        crate::modules::operational::get_payable,
        crate::modules::operational::update_payable,
        crate::modules::operational::delete_payable,
        crate::modules::financial_reports::get_report_subscriptions,
        crate::modules::financial_reports::create_report_subscription,
        crate::modules::financial_reports::update_report_subscription,
        crate::modules::financial_reports::delete_report_subscription,
        crate::modules::financial_reports::send_report_now,
        crate::modules::financial_reports::get_subscription_history,
    ),
    tags(
        (name = "Finance", description = "财务管理"),
        (name = "Voucher", description = "凭证管理"),
        (name = "Voucher Template", description = "凭证模板"),
        (name = "Voucher Generation Rule", description = "凭证生成规则"),
        (name = "Voucher Generation", description = "凭证生成"),
        (name = "Accounting", description = "科目管理"),
        (name = "Report", description = "报表生成"),
        (name = "Payment", description = "付款管理"),
        (name = "Approval Config", description = "付款审批配置"),
        (name = "Receivable", description = "应收账款"),
        (name = "Payable", description = "应付账款"),
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
pub struct ApiDoc;

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
    use tracing;

    #[test]
    fn extract_openapi_spec() {
        let spec = topems_finance::ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-finance-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-finance-openapi.json");
    }
}

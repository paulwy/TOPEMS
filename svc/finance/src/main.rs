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
use crate::modules::settlement_center::models as settlement_models;
use crate::modules::*;
use crate::shared::AppState;
use topems_shared_bootstrap::{
    bootstrap_service_with_search_path, build_application, create_health_state,
    create_standard_health_routes, run, ServiceConfig,
};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

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
            // ---- settlement_center ----
            settlement_models::UnifiedReconciliation,
            settlement_models::ReconciliationDetail,
            settlement_models::LinkedSettlementSummary,
            settlement_models::CreateReconciliationRequest,
            settlement_models::ReconcileRequest,
            settlement_models::AutoReconcileRequest,
            settlement_models::ReconciliationListQuery,
            settlement_models::UnifiedSettlement,
            settlement_models::SettlementDetail,
            settlement_models::LinkedReconciliationSummary,
            settlement_models::CreateSettlementRequest,
            settlement_models::SettlementListQuery,
            settlement_models::ReconciliationSettlementLink,
            settlement_models::CreateLinkRequest,
            settlement_models::LinkListQuery,
            settlement_models::DifferenceAdjustment,
            settlement_models::CreateDifferenceRequest,
            settlement_models::DifferenceListQuery,
            settlement_models::SettlementCenterDashboard,
            settlement_models::CenterStatistics,
            settlement_models::ReconciliationStatistics,
            settlement_models::SettlementStatistics,
            settlement_models::DifferenceStatistics,
            settlement_models::LinkStatistics,
            settlement_models::DashboardSummary,
        ),
    ),
    paths(
        create_account,
        get_account_balances,
        list_vouchers,
        export_vouchers,
        get_trial_balance,
        get_cash_flow,
        list_voucher_templates_handler,
        list_generation_rules_handler,
        crate::modules::voucher_template::match_template,
        crate::modules::voucher_template::preview_generation,
        crate::modules::voucher_template::generate_from_source,
        crate::modules::voucher_template::batch_generate,
        export_payments_handler,
        list_payment_records_handler,
        crate::modules::operational::get_receivable,
        crate::modules::operational::delete_receivable,
        batch_create_payables_handler,
        crate::modules::operational::get_payable,
        crate::modules::operational::delete_payable,
        crate::modules::financial_reports::get_report_subscriptions,
        crate::modules::financial_reports::create_report_subscription,
        // ---- settlement_center ----
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
    let config = ServiceConfig {
        name: "topems-finance",
        port: 8011,
        port_env_var: Some("FINANCE_PORT"),
        max_db_connections: 20,
        enable_events: true,
        // U5（FCRM-02/XCUT-06）：开启 RLS 中间件。finance schema 业务表已由迁移
        // 20261003000001 启用 RLS + FORCE + rls_tenant_isolation 策略；
        // 运行时 NOSUPERUSER 角色（topems_app）下，策略按 app.tenant_id 过滤，
        // 跨租户行不可见。GUC 未设置时策略全放行（向后兼容系统/事件/健康查询）。
        // 注：RLS 为纵深防御，主防线仍为业务 SQL 显式 tenant_id 过滤。
        enable_rls: true,
        api_prefix: "/api/finance",
        legacy_prefixes: &["/api/core/finance/v1"],
        ..Default::default()
    };

    let ctx = bootstrap_service_with_search_path(&config, "finance, public, shared").await?;

    // 表/索引/约束/RLS 全部由迁移链维护，启动阶段不再执行任何 DDL。

    if let Err(e) = event_handlers::start_event_subscribers(
        topems_shared_db::scope::Db::new(ctx.db.clone(), "finance, public, shared"),
        ctx.event_publisher.clone(),
    )
    .await
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
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    // U10 降级治理：令牌签发/构建失败时不再 .expect panic，降级为同地址 tokenless 客户端并
    // 告警；下游 unified-core(workflow) 不可达仅影响审批流，主服务继续启动。
    let workflow_client = match TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "finance-service", &["workflow:read"]))
    {
        Ok(client) => {
            tracing::info!(
                "🔗 工作流服务客户端初始化成功（service token）: {}",
                workflow_url
            );
            client
        }
        Err(e) => {
            tracing::warn!(error = %e, "工作流服务客户端带令牌初始化失败，降级为同地址tokenless客户端；审批流在恢复前将报错，主服务继续启动");
            TypedServiceClient::new(WorkflowApi, &workflow_url)
                .map_err(|e| anyhow::anyhow!("工作流降级客户端也无法构建（HTTP栈异常）: {e}"))?
        }
    };

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        // M-1/B4：请求链路已全部复用 tenant_middleware 的请求事务；守卫开启后
        // 请求内再自开租户作用域会直接报 Protocol 错误（事件消费等后台路径不受影响）。
        db: topems_shared_db::scope::Db::new(ctx.db.clone(), "finance, public, shared")
            .deny_request_own_txn()
            .deny_request_tenant_scope(),
        workflow_client,
        event_publisher: ctx.event_publisher.clone(),
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state).route("/", get(home));

    // 业务路由
    let protected_routes =
        modules::create_routes()
            .with_state(state)
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ));

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // D6：事件发布重试后台任务——周期扫描 Redis ZSET 到期项重发，成功 ZREM。
    // finance 全部为 typed 通道（存完整 payload 直重发），无 searchable 重建需求，闭包返回 None。
    {
        let publisher = ctx.event_publisher.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(std::time::Duration::from_secs(15));
            loop {
                tick.tick().await;
                if let Some(ref publisher) = publisher {
                    topems_shared_event::event::commit_retry::run_relay(
                        "finance",
                        publisher,
                        |_et: &str, _eid: uuid::Uuid| async move { None },
                    )
                    .await;
                }
            }
        });
    }

    run(app).await
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    get,
    path = "/api/finance/",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
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
        // utoipa 递归生成 Schema 较深，主线程默认栈会溢出；放到 32MB 栈的独立线程执行，
        // 逻辑本身不变，join 后由 panic 传播失败。
        std::thread::Builder::new()
            .stack_size(32 * 1024 * 1024)
            .spawn(|| {
                let spec = topems_finance::ApiDoc::openapi();
                let json =
                    serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
                let out_path = std::env::temp_dir().join("topems-finance-openapi.json");
                std::fs::write(&out_path, json).expect("Failed to write spec");
                tracing::info!("OpenAPI spec written to {:?}", out_path);
            })
            .expect("Failed to spawn OpenAPI extraction thread")
            .join()
            .expect("OpenAPI extraction thread panicked");
    }
}

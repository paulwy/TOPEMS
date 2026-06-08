pub mod api;
pub mod models;

use api::auth;
use axum::{
    routing::get,
    Json,
    Router,
};
use topems_shared::{
    create_cors_layer,
    create_database_pool,
    init_logging,
    test_database_connection,
    ApiResponse,
    AuthState,
    auth_middleware,
    Config,
    Result,
    ServiceHealth,
    build_health_response,
    create_api_info_router,
};
use utoipa::OpenApi;
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    // 1. 初始化统一日志
    init_logging("topems-pm");

    // 2. 初始化 Prometheus 监控
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_pm_custom_metric",
        "This is a custom metric for TOPEMS-PM",
    ).unwrap();
    default_registry().register(Box::new(custom_gauge.clone())).unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    // 3. 加载配置
    let config = Config::load().await?;
    let db_config = config.get_database().await;
    tracing::info!("Configuration loaded, environment: {}", config.env());

    // 4. 创建数据库连接池
    let pool = create_database_pool(&db_config).await?;
    test_database_connection(&pool).await?;

    // 5. 初始化数据库表 (pm schema)
    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let cors = create_cors_layer();

    let auth_state = AuthState::from_env();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route("/metrics", get(move || async move { metric_handle.render() }))
        .merge(auth::create_routes());

    let protected_routes = api::create_routes(pool.clone())
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-pm"))
        .layer(prometheus_layer)
        .layer(cors);

    let port = config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-PM 统一项目管理系统启动中...");
    tracing::info!("📦 Port: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-pm", true)
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // 创建 pm schema
    sqlx::query("CREATE SCHEMA IF NOT EXISTS pm")
        .execute(pool)
        .await?;

    // 创建项目表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.projects (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            project_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            leader VARCHAR(255),
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            budget NUMERIC(15, 2),
            progress INTEGER NOT NULL DEFAULT 0,
            project_config JSONB,
            benefit_target JSONB,
            risk_level VARCHAR(50),
            priority INTEGER DEFAULT 3,
            tags TEXT[],
            parent_id UUID REFERENCES pm.projects(id),
            workspace_id UUID,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目阶段表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_phases (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            sequence_number INTEGER NOT NULL,
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            progress INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            predecessor_ids UUID[],
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目里程碑表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_milestones (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES pm.project_phases(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            date TIMESTAMPTZ NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            acceptance_criteria TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目成员表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_members (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL,
            role VARCHAR(100) NOT NULL,
            responsibilities TEXT,
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, user_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目资源表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_resources (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            resource_type VARCHAR(50) NOT NULL,
            resource_id UUID NOT NULL,
            resource_service VARCHAR(50),
            role VARCHAR(100),
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            allocation_percent INTEGER DEFAULT 100,
            actual_hours INTEGER DEFAULT 0,
            actual_cost NUMERIC(15, 2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目费用表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_expenses (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES pm.project_phases(id),
            expense_type VARCHAR(100) NOT NULL,
            category VARCHAR(100),
            subcategory VARCHAR(100),
            description TEXT,
            amount NUMERIC(15, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'CNY',
            incurred_date DATE NOT NULL,
            reported_date DATE,
            paid_date DATE,
            budget_item_id UUID,
            resource_id UUID,
            expense_ref_id VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            approval_workflow_id UUID,
            attachment_ids UUID[],
            created_by VARCHAR(255),
            approved_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目效益分析表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_benefits (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            period_type VARCHAR(50) NOT NULL,
            period_date DATE NOT NULL,
            planned_cost NUMERIC(15, 2) DEFAULT 0,
            actual_cost NUMERIC(15, 2) DEFAULT 0,
            planned_progress INTEGER DEFAULT 0,
            actual_progress INTEGER DEFAULT 0,
            planned_value NUMERIC(15, 2) DEFAULT 0,
            earned_value NUMERIC(15, 2) DEFAULT 0,
            actual_cost_eva NUMERIC(15, 2) DEFAULT 0,
            cpi NUMERIC(5, 4),
            spi NUMERIC(5, 4),
            cv NUMERIC(15, 2),
            sv NUMERIC(15, 2),
            eac NUMERIC(15, 2),
            etc NUMERIC(15, 2),
            roi NUMERIC(10, 4),
            notes TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, period_type, period_date)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目审批表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_approvals (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            current_step INTEGER NOT NULL DEFAULT 1,
            total_steps INTEGER NOT NULL DEFAULT 3,
            approvals JSONB NOT NULL,
            comments TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目类型配置表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_type_configs (
            id UUID PRIMARY KEY,
            project_type VARCHAR(50) NOT NULL UNIQUE,
            service_name VARCHAR(50),
            default_status VARCHAR(50),
            default_phases JSONB,
            required_fields TEXT[],
            custom_fields JSONB,
            workflow_id UUID,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建服务集成配置表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.service_integrations (
            id UUID PRIMARY KEY,
            service_name VARCHAR(50) NOT NULL,
            api_base_url VARCHAR(255),
            api_key VARCHAR(255),
            sync_enabled BOOLEAN DEFAULT TRUE,
            sync_config JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建合同表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.contracts (
            id UUID PRIMARY KEY,
            project_id UUID REFERENCES pm.projects(id) ON DELETE CASCADE,
            contract_code VARCHAR(100) NOT NULL UNIQUE,
            contract_name VARCHAR(255) NOT NULL,
            contract_type VARCHAR(50) NOT NULL,
            contract_category VARCHAR(50),
            party_a_name VARCHAR(255),
            party_a_id VARCHAR(100),
            party_b_name VARCHAR(255),
            party_b_id VARCHAR(100),
            amount NUMERIC(18,2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'CNY',
            tax_rate NUMERIC(5,2) DEFAULT 0.13,
            signing_date DATE,
            effective_date DATE,
            end_date DATE,
            status VARCHAR(50) DEFAULT 'draft',
            template_id UUID,
            workflow_instance_id UUID,
            description TEXT,
            attachment_ids UUID[],
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建合同里程碑表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.contract_milestones (
            id UUID PRIMARY KEY,
            contract_id UUID NOT NULL REFERENCES pm.contracts(id) ON DELETE CASCADE,
            project_milestone_id UUID REFERENCES pm.project_milestones(id),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            target_date DATE NOT NULL,
            payment_amount NUMERIC(15,2) DEFAULT 0,
            payment_percent NUMERIC(5,2),
            status VARCHAR(50) DEFAULT 'pending',
            actual_date DATE,
            payment_status VARCHAR(50) DEFAULT 'unpaid',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建合同付款计划表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.contract_payment_schedule (
            id UUID PRIMARY KEY,
            contract_id UUID NOT NULL REFERENCES pm.contracts(id) ON DELETE CASCADE,
            payment_number INTEGER NOT NULL,
            payment_name VARCHAR(100),
            payment_percent NUMERIC(5,2),
            payment_amount NUMERIC(15,2) NOT NULL,
            due_date DATE NOT NULL,
            actual_payment_date DATE,
            actual_payment_amount NUMERIC(15,2),
            status VARCHAR(50) DEFAULT 'pending',
            invoice_number VARCHAR(100),
            expense_ref_id VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(contract_id, payment_number)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建合同模板表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.contract_templates (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            contract_type VARCHAR(50) NOT NULL,
            description TEXT,
            content JSONB NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建预算表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.budgets (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            budget_code VARCHAR(100) NOT NULL,
            budget_name VARCHAR(255) NOT NULL,
            budget_type VARCHAR(50),
            total_amount NUMERIC(18,2) NOT NULL,
            allocated_amount NUMERIC(18,2) DEFAULT 0,
            spent_amount NUMERIC(18,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            created_by VARCHAR(255),
            approved_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建预算项表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.budget_items (
            id UUID PRIMARY KEY,
            budget_id UUID NOT NULL REFERENCES pm.budgets(id) ON DELETE CASCADE,
            item_code VARCHAR(100),
            item_name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            subcategory VARCHAR(100),
            budget_amount NUMERIC(15,2) NOT NULL,
            allocated_amount NUMERIC(15,2) DEFAULT 0,
            spent_amount NUMERIC(15,2) DEFAULT 0,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建风险表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_risks (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            risk_code VARCHAR(100),
            risk_name VARCHAR(255) NOT NULL,
            risk_description TEXT,
            risk_category VARCHAR(100),
            risk_subcategory VARCHAR(100),
            likelihood VARCHAR(50) NOT NULL,
            impact VARCHAR(50) NOT NULL,
            risk_score INTEGER,
            status VARCHAR(50) DEFAULT 'identified',
            mitigation_strategy TEXT,
            contingency_plan TEXT,
            trigger_condition TEXT,
            warning_threshold INTEGER DEFAULT 80,
            owner VARCHAR(255),
            response_due_date DATE,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建风险事件表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.risk_events (
            id UUID PRIMARY KEY,
            risk_id UUID NOT NULL REFERENCES pm.project_risks(id) ON DELETE CASCADE,
            event_type VARCHAR(50) NOT NULL,
            event_description TEXT,
            occurred_at TIMESTAMPTZ DEFAULT NOW(),
            reported_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建质量检查表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.quality_checks (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            check_code VARCHAR(100),
            check_name VARCHAR(255) NOT NULL,
            check_type VARCHAR(50),
            phase_id UUID REFERENCES pm.project_phases(id) ON DELETE SET NULL,
            milestone_id UUID REFERENCES pm.project_milestones(id) ON DELETE SET NULL,
            check_criteria TEXT,
            acceptance_standard TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            check_date TIMESTAMPTZ,
            checked_by VARCHAR(255),
            result_details JSONB,
            nonconformities JSONB,
            corrective_actions JSONB,
            follow_up_date TIMESTAMPTZ,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建缺陷表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.defects (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            check_id UUID REFERENCES pm.quality_checks(id) ON DELETE SET NULL,
            defect_code VARCHAR(100),
            defect_name VARCHAR(255) NOT NULL,
            defect_description TEXT,
            severity VARCHAR(50) NOT NULL,
            priority VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'open',
            assignee VARCHAR(255),
            due_date TIMESTAMPTZ,
            resolution TEXT,
            resolved_at TIMESTAMPTZ,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建验收计划表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.acceptance_plans (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            plan_code VARCHAR(100),
            plan_name VARCHAR(255) NOT NULL,
            acceptance_type VARCHAR(50) NOT NULL,
            milestone_id UUID REFERENCES pm.project_milestones(id) ON DELETE SET NULL,
            phase_id UUID REFERENCES pm.project_phases(id) ON DELETE SET NULL,
            acceptance_criteria TEXT,
            expected_date TIMESTAMPTZ,
            status VARCHAR(50) DEFAULT 'pending',
            participants JSONB,
            documents_required JSONB,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建验收项表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.acceptance_items (
            id UUID PRIMARY KEY,
            plan_id UUID NOT NULL REFERENCES pm.acceptance_plans(id) ON DELETE CASCADE,
            item_code VARCHAR(100),
            item_name VARCHAR(255) NOT NULL,
            item_description TEXT,
            required_standard TEXT,
            actual_result TEXT,
            is_passed BOOLEAN,
            comments TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建验收记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.acceptance_records (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            plan_id UUID NOT NULL REFERENCES pm.acceptance_plans(id) ON DELETE CASCADE,
            acceptance_date TIMESTAMPTZ NOT NULL,
            status VARCHAR(50) NOT NULL,
            conclusion TEXT,
            score NUMERIC(5,2),
            accepted_by VARCHAR(255),
            attendees JSONB,
            findings JSONB,
            recommendations JSONB,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建决算表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.settlements (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            settlement_code VARCHAR(100),
            settlement_name VARCHAR(255) NOT NULL,
            settlement_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'draft',
            budget_amount NUMERIC(18,2),
            actual_amount NUMERIC(18,2),
            variance_amount NUMERIC(18,2),
            variance_percent NUMERIC(5,2),
            settlement_period_start TIMESTAMPTZ,
            settlement_period_end TIMESTAMPTZ,
            description TEXT,
            created_by VARCHAR(255),
            approved_by VARCHAR(255),
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建决算项表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.settlement_items (
            id UUID PRIMARY KEY,
            settlement_id UUID NOT NULL REFERENCES pm.settlements(id) ON DELETE CASCADE,
            item_code VARCHAR(100),
            item_name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            budget_amount NUMERIC(15,2) NOT NULL,
            actual_amount NUMERIC(15,2) NOT NULL,
            variance_amount NUMERIC(15,2) NOT NULL,
            variance_percent NUMERIC(5,2),
            description TEXT,
            expense_ref_id VARCHAR(255),
            contract_ref_id VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建决算调整表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.settlement_adjustments (
            id UUID PRIMARY KEY,
            settlement_id UUID NOT NULL REFERENCES pm.settlements(id) ON DELETE CASCADE,
            adjustment_type VARCHAR(50) NOT NULL,
            adjustment_code VARCHAR(100),
            description TEXT,
            amount NUMERIC(15,2) NOT NULL,
            reason TEXT,
            supporting_documents JSONB,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目文档表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_documents (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            document_code VARCHAR(100),
            document_name VARCHAR(255) NOT NULL,
            document_type VARCHAR(100) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size BIGINT NOT NULL,
            file_hash VARCHAR(64),
            version INTEGER DEFAULT 1,
            status VARCHAR(50) DEFAULT 'active',
            description TEXT,
            tags TEXT[],
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建文档版本表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.document_versions (
            id UUID PRIMARY KEY,
            document_id UUID NOT NULL REFERENCES pm.project_documents(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_hash VARCHAR(64),
            change_note TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建文档文件夹表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.document_folders (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            parent_id UUID REFERENCES pm.document_folders(id) ON DELETE SET NULL,
            folder_name VARCHAR(255) NOT NULL,
            description TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建项目报告表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.project_reports (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            report_code VARCHAR(100),
            report_name VARCHAR(255) NOT NULL,
            report_type VARCHAR(100) NOT NULL,
            report_period VARCHAR(50),
            status VARCHAR(50) DEFAULT 'pending',
            generated_at TIMESTAMPTZ,
            data JSONB,
            summary TEXT,
            generated_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建报告模板表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.report_templates (
            id UUID PRIMARY KEY,
            template_code VARCHAR(100) UNIQUE NOT NULL,
            template_name VARCHAR(255) NOT NULL,
            report_type VARCHAR(100) NOT NULL,
            content JSONB NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建通知表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.notifications (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            user_id VARCHAR(255),
            notification_type VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            priority VARCHAR(50) DEFAULT 'medium',
            metadata JSONB,
            due_date TIMESTAMPTZ,
            delivered_at TIMESTAMPTZ,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建通知设置表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pm.notification_settings (
            id UUID PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL,
            notification_type VARCHAR(100) NOT NULL,
            enabled BOOLEAN DEFAULT true,
            notify_before_days INTEGER,
            preferred_channel VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建索引
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_projects_code ON pm.projects(code)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_projects_type ON pm.projects(project_type)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_projects_status ON pm.projects(status)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON pm.project_phases(project_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON pm.project_milestones(project_id)"#)
        .execute(pool)
        .await?;
    sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON pm.project_members(project_id)"#)
        .execute(pool)
        .await?;

    tracing::info!("✅ PM 服务数据库表初始化完成");

    Ok(())
}

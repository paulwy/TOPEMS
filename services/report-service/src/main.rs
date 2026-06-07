use axum::{
    extract::FromRef,
    routing::{get, post},
    Json, Router,
};
use anyhow::Result;
use chrono::Utc;
use sqlx::PgPool;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

mod api;
mod models;
mod services;

use api::*;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

async fn health_check() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "service": "topems-report",
            "status": "healthy",
            "timestamp": Utc::now().to_rfc3339()
        }),
        "报表服务运行正常",
    ))
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

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    // Initialize database tables
    init_db(&pool).await?;

    let auth_state = AuthState::from_env();
    let app_state = AppState {
        pool: pool.clone(),
        auth_state: auth_state.clone(),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/report-types", get(list_report_types));

    let protected_routes = Router::new()
        .route("/api/v1/reports", get(list_reports).post(create_report))
        .route("/api/v1/reports/{id}", get(get_report).delete(delete_report))
        .route("/api/v1/reports/{id}/export", post(export_report))
        .route("/api/v1/templates", get(list_templates).post(create_template))
        .route("/api/v1/templates/{id}", get(get_template).delete(delete_template))
        .route("/api/v1/reports-center/stats", get(get_reports_center_stats))
        .route("/api/v1/reports-center/export/{report_type}", post(export_stats_report))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .with_state(app_state)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8053".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-Report 报表中心服务启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn init_db(pool: &PgPool) -> Result<()> {
    // Create schema
    sqlx::query("CREATE SCHEMA IF NOT EXISTS report")
        .execute(pool)
        .await?;

    // Create templates table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS report.templates (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            report_type VARCHAR(50) NOT NULL,
            columns JSONB NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create reports table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS report.reports (
            id UUID PRIMARY KEY,
            config JSONB NOT NULL,
            template_id UUID REFERENCES report.templates(id),
            data JSONB,
            row_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_templates_report_type ON report.templates(report_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_reports_created_at ON report.reports(created_at DESC)")
        .execute(pool)
        .await?;

    // Insert default templates
    sqlx::query(
        r#"
        INSERT INTO report.templates (id, name, report_type, columns, description)
        VALUES 
            (gen_random_uuid(), '研发项目进度报表', 'rs_project_progress', 
             '["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"]'::jsonb, 
             '研发项目进度跟踪报表'),
            (gen_random_uuid(), '实验记录报表', 'rs_experiment_record',
             '["实验编号", "实验名称", "实验类型", "执行人", "开始时间", "结束时间", "结果"]'::jsonb,
             '研发实验记录报表'),
            (gen_random_uuid(), '检验统计报表', 'lims_inspection_stats',
             '["样品编号", "样品名称", "检验类型", "检验人", "检验时间", "结果", "合格率"]'::jsonb,
             '实验室检验统计报表'),
            (gen_random_uuid(), '样品汇总报表', 'lims_sample_summary',
             '["样品编号", "样品名称", "来源", "接收时间", "状态", "检验结果"]'::jsonb,
             '实验室样品汇总报表'),
            (gen_random_uuid(), '质量分析报表', 'qms_quality_analysis',
             '["检验项目", "检验数量", "合格数", "不合格数", "合格率", "趋势"]'::jsonb,
             '质量管理分析报表'),
            (gen_random_uuid(), '缺陷统计报表', 'qms_defect_stats',
             '["缺陷类型", "缺陷数量", "发生频率", "影响程度", "处理状态"]'::jsonb,
             '质量缺陷统计报表'),
            (gen_random_uuid(), '安全检查报表', 'ehs_safety_check',
             '["检查项目", "检查区域", "检查人", "检查时间", "结果", "整改措施"]'::jsonb,
             '安全检查报表'),
            (gen_random_uuid(), '风险评估报表', 'ehs_risk_assessment',
             '["风险编号", "风险类型", "风险等级", "影响范围", "控制措施", "状态"]'::jsonb,
             '风险评估报表'),
            (gen_random_uuid(), '供应商评估报表', 'srm_supplier_eval',
             '["供应商名称", "评分", "交付率", "质量率", "合作年限", "状态"]'::jsonb,
             '供应商评估报表'),
            (gen_random_uuid(), '采购统计报表', 'srm_purchase_stats',
             '["采购单号", "供应商", "采购金额", "采购日期", "交付状态", "验收状态"]'::jsonb,
             '采购统计报表'),
            (gen_random_uuid(), '生产统计报表', 'pdm_production_stats',
             '["批次号", "产品名称", "生产数量", "合格数量", "合格率", "生产日期"]'::jsonb,
             '生产数据统计报表'),
            (gen_random_uuid(), '工艺汇总报表', 'pdm_process_summary',
             '["工艺名称", "工艺类型", "执行次数", "平均耗时", "合格率", "优化建议"]'::jsonb,
             '生产工艺汇总报表')
        ON CONFLICT DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    tracing::info!("✅ 报表服务数据库表初始化完成");

    Ok(())
}
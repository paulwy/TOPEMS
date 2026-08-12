use crate::modules::ApiState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct PeriodParam {
    #[serde(default = "default_mtd")]
    pub period: String,
}

fn default_mtd() -> String {
    "MTD".to_string()
}

#[derive(Debug, Serialize)]
pub struct AnalyticsMeta {
    pub mock_enabled: bool,
    pub use_frontend_fallback: bool,
    pub note: String,
}

#[derive(Debug, Serialize)]
pub struct AnalyticsEnvelope<T: Serialize> {
    pub success: bool,
    pub data: T,
    pub meta: AnalyticsMeta,
}

fn empty_with_mock<T: Default + Serialize>(note: &str) -> (StatusCode, Json<serde_json::Value>) {
    let envelope = AnalyticsEnvelope {
        success: true,
        data: T::default(),
        meta: AnalyticsMeta {
            mock_enabled: true,
            use_frontend_fallback: true,
            note: note.to_string(),
        },
    };
    (StatusCode::OK, Json(json!(envelope)))
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/dashboard/overview", get(dashboard_overview))
        .route("/analytics/funnel", get(analytics_funnel))
        .route("/analytics/scoring", get(analytics_scoring))
        .route("/analytics/forecast", get(analytics_forecast))
        .route("/analytics/segmentation", get(analytics_segmentation))
        .route("/analytics/billing", get(analytics_billing))
        .route("/analytics/recommendation", get(analytics_recommendation))
}

pub async fn dashboard_overview(
    Query(_p): Query<PeriodParam>,
    _state: State<ApiState>,
) -> impl IntoResponse {
    empty_with_mock::<Vec<serde_json::Value>>(
        "聚合算法待深度 C 交付，前端走 useCrmMock seed=42 fallback",
    )
}

pub async fn analytics_funnel(
    Query(_p): Query<PeriodParam>,
    _state: State<ApiState>,
) -> impl IntoResponse {
    empty_with_mock::<Vec<serde_json::Value>>(
        "Funnel 聚合路由占位：按阶段（lead→won/lost/closed）统计商机数量/金额/加权值，前端 Mock 渲染",
    )
}

pub async fn analytics_scoring(
    Query(_p): Query<PeriodParam>,
    _state: State<ApiState>,
) -> impl IntoResponse {
    empty_with_mock::<Vec<serde_json::Value>>(
        "Scoring 聚合路由占位：A/B/C/D 分布 + RFM 三桶 + 历史趋势，前端 Mock 渲染",
    )
}

pub async fn analytics_forecast(
    Query(_p): Query<PeriodParam>,
    _state: State<ApiState>,
) -> impl IntoResponse {
    empty_with_mock::<Vec<serde_json::Value>>(
        "Forecast 聚合路由占位：actual/weighted/target 三线预测 + 置信度，前端 Mock 渲染",
    )
}

pub async fn analytics_segmentation(
    Query(_p): Query<PeriodParam>,
    _state: State<ApiState>,
) -> impl IntoResponse {
    empty_with_mock::<Vec<serde_json::Value>>(
        "Segmentation 聚合路由占位：价值×活动 四象限散点（气泡大小=客户数），前端 Mock 渲染",
    )
}

pub async fn analytics_billing(
    Query(_p): Query<PeriodParam>,
    _state: State<ApiState>,
) -> impl IntoResponse {
    empty_with_mock::<Vec<serde_json::Value>>(
        "Billing 分析路由占位：Top10 客户应收 + 状态饼（paid/pending/overdue）+ 账龄四桶，前端 Mock 渲染",
    )
}

pub async fn analytics_recommendation(
    Query(_p): Query<PeriodParam>,
    _state: State<ApiState>,
) -> impl IntoResponse {
    empty_with_mock::<Vec<serde_json::Value>>(
        "Recommendation 聚合路由占位：cross-sell/upsell/followup 三类智能推荐列表，前端 Mock 渲染",
    )
}

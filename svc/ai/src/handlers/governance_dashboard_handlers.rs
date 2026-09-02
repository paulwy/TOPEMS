//! 治理仪表盘 API Handlers
//!
//! 提供 AI 治理仪表盘模块的 HTTP API 端点

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::dsh::governance_dashboard::{GovernanceDashboardGenerator, TimeRange};

/// 应用状态（共享的仪表盘生成器）
#[derive(Clone)]
pub struct GovernanceAppState {
    pub generator: Arc<RwLock<GovernanceDashboardGenerator>>,
}

impl GovernanceAppState {
    pub fn new() -> Self {
        Self {
            generator: Arc::new(RwLock::new(
                // 3.2c：注入真实 AI 调用日志数据源（全局 CostMeter，与 AI 调用写入端共享），
                // 仪表盘统计来自真实调用记录，无调用记录时降级模拟
                GovernanceDashboardGenerator::with_defaults()
                    .with_cost_meter(crate::dsh::governance::cost_metering::global_cost_meter()),
            )),
        }
    }
}

impl Default for GovernanceAppState {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== 请求/响应类型 ====================

/// 仪表盘查询参数
#[derive(Debug, Deserialize)]
pub struct DashboardQuery {
    pub time_range: Option<String>,
    pub tenant_id: Option<String>,
}

/// 治理评分响应（简化版）
#[derive(Debug, Serialize)]
pub struct GovernanceScoreResponse {
    pub success_rate: f64,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub average_response_ms: f64,
    pub p95_response_ms: f64,
    pub active_users: u64,
    pub active_agents: u64,
    pub total_tool_calls: u64,
    pub cache_hit_rate: f64,
    pub total_tokens: u64,
}

/// API 错误响应
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub error: String,
    pub message: String,
}

// ==================== API Handlers ====================

/// 获取完整仪表盘数据
pub async fn get_dashboard(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    (StatusCode::OK, Json(dashboard)).into_response()
}

/// 获取治理评分（基于关键指标）
pub async fn get_governance_score(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));
    let metrics = dashboard.key_metrics;

    let response = GovernanceScoreResponse {
        success_rate: metrics.success_rate,
        total_requests: metrics.total_requests,
        successful_requests: metrics.successful_requests,
        failed_requests: metrics.failed_requests,
        average_response_ms: metrics.average_response_ms,
        p95_response_ms: metrics.p95_response_ms,
        active_users: metrics.active_users,
        active_agents: metrics.active_agents,
        total_tool_calls: metrics.total_tool_calls,
        cache_hit_rate: metrics.cache_hit_rate,
        total_tokens: metrics.total_tokens,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// 获取风险评估
pub async fn get_risk_assessment(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    (StatusCode::OK, Json(dashboard.risk_assessment)).into_response()
}

/// 获取合规状态
pub async fn get_compliance_status(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    (StatusCode::OK, Json(dashboard.compliance_status)).into_response()
}

/// 获取成本分析
pub async fn get_cost_analysis(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    (StatusCode::OK, Json(dashboard.cost_analysis)).into_response()
}

/// 获取性能指标
pub async fn get_performance_metrics(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    (StatusCode::OK, Json(dashboard.performance_metrics)).into_response()
}

/// 获取安全事件
pub async fn get_security_events(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    (StatusCode::OK, Json(dashboard.security_events)).into_response()
}

/// 获取审计摘要
pub async fn get_audit_summary(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    (StatusCode::OK, Json(dashboard.audit_summary)).into_response()
}

/// 获取建议
pub async fn get_recommendations(
    State(state): State<GovernanceAppState>,
    Query(query): Query<DashboardQuery>,
) -> impl IntoResponse {
    let time_range = parse_time_range(query.time_range.as_deref());

    let generator = state.generator.read().await;
    let dashboard = generator.generate_dashboard(Some(time_range));

    #[derive(Serialize)]
    struct RecommendationsResponse {
        total: usize,
        recommendations: Vec<crate::dsh::governance_dashboard::Recommendation>,
    }

    let response = RecommendationsResponse {
        total: dashboard.recommendations.len(),
        recommendations: dashboard.recommendations,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// 清除缓存
pub async fn clear_cache(State(state): State<GovernanceAppState>) -> impl IntoResponse {
    let generator = state.generator.write().await;
    generator.clear_cache();

    StatusCode::NO_CONTENT.into_response()
}

// ==================== 辅助函数 ====================

/// 解析时间范围
fn parse_time_range(range: Option<&str>) -> TimeRange {
    match range.unwrap_or("7d") {
        "1h" => TimeRange::Last1Hour,
        "24h" | "1d" => TimeRange::Last24Hours,
        "7d" => TimeRange::Last7Days,
        "30d" => TimeRange::Last30Days,
        _ => TimeRange::Last7Days,
    }
}

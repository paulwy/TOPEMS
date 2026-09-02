//! DSH Agent 性能监控 API 处理器
//!
//! 提供性能指标查询、Prometheus 指标导出等 REST API 端点。

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::dsh::agent::performance::{ExecutionMetrics, ToolMetrics};
use crate::shared::AppState;

// ============================================================================
// 响应类型
// ============================================================================

/// 性能指标响应
#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceMetricsResponse {
    /// 执行指标
    pub execution: ExecutionMetrics,
    /// 工具指标
    pub tools: Vec<ToolMetrics>,
    /// 历史记录数量
    pub history_size: usize,
}

/// API 响应包装
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T: Serialize> {
    /// 状态码（0 表示成功）
    pub code: i32,
    /// 消息
    pub message: String,
    /// 数据
    pub data: Option<T>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 0,
            message: "success".to_string(),
            data: Some(data),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            code: -1,
            message: message.to_string(),
            data: None,
        }
    }
}

// ============================================================================
// API 处理器
// ============================================================================

/// 获取性能指标
///
/// GET /dsh/agent/performance/metrics
pub async fn get_performance_metrics(State(state): State<AppState>) -> impl IntoResponse {
    info!("获取 DSH Agent 性能指标");

    // 检查性能监控器是否可用
    let monitor = match &state.dsh_agent_performance_monitor {
        Some(m) => m,
        None => {
            return (
                StatusCode::OK,
                Json(ApiResponse::<PerformanceMetricsResponse>::error(
                    "性能监控未启用",
                )),
            )
                .into_response();
        }
    };

    // 获取指标
    let execution = monitor.get_metrics();
    let tools = monitor.get_tool_metrics();
    let history_size = monitor.history_size();

    let response = PerformanceMetricsResponse {
        execution,
        tools,
        history_size,
    };

    (StatusCode::OK, Json(ApiResponse::success(response))).into_response()
}

/// 导出 Prometheus 格式指标
///
/// GET /dsh/agent/performance/prometheus
pub async fn export_prometheus_metrics(State(state): State<AppState>) -> impl IntoResponse {
    info!("导出 DSH Agent Prometheus 指标");

    // 检查性能监控器是否可用
    let monitor = match &state.dsh_agent_performance_monitor {
        Some(m) => m,
        None => {
            return (
                StatusCode::OK,
                "# Performance monitor not enabled\n".to_string(),
            )
                .into_response();
        }
    };

    // 导出 Prometheus 格式指标
    let metrics = monitor.export_prometheus_metrics();

    (
        StatusCode::OK,
        [(
            axum::http::header::CONTENT_TYPE,
            "text/plain; version=0.0.4; charset=utf-8",
        )],
        metrics,
    )
        .into_response()
}

/// 重置性能指标
///
/// POST /dsh/agent/performance/reset
pub async fn reset_performance_metrics(State(state): State<AppState>) -> impl IntoResponse {
    info!("重置 DSH Agent 性能指标");

    // 检查性能监控器是否可用
    let monitor = match &state.dsh_agent_performance_monitor {
        Some(m) => m,
        None => {
            return (
                StatusCode::OK,
                Json(ApiResponse::<()>::error("性能监控未启用")),
            )
                .into_response();
        }
    };

    // 重置指标
    monitor.reset();

    (StatusCode::OK, Json(ApiResponse::success(()))).into_response()
}

/// 获取工具性能指标
///
/// GET /dsh/agent/performance/tools/{tool_name}
pub async fn get_tool_performance(
    State(state): State<AppState>,
    axum::extract::Path(tool_name): axum::extract::Path<String>,
) -> impl IntoResponse {
    info!(tool = %tool_name, "获取工具性能指标");

    // 检查性能监控器是否可用
    let monitor = match &state.dsh_agent_performance_monitor {
        Some(m) => m,
        None => {
            return (
                StatusCode::OK,
                Json(ApiResponse::<ToolMetrics>::error("性能监控未启用")),
            )
                .into_response();
        }
    };

    // 获取工具指标
    match monitor.get_tool_metric(&tool_name) {
        Some(metrics) => (StatusCode::OK, Json(ApiResponse::success(metrics))).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<ToolMetrics>::error("工具不存在或无指标")),
        )
            .into_response(),
    }
}

//! 性能监控 API 处理器
//! 
//! 提供性能统计数据的获取和管理功能

use axum::{
    extract::State,
    Json,
};
use crate::state::AppState;
use crate::middleware::performance::{
    get_performance_stats,
    reset_performance_stats,
    set_slow_request_threshold,
    PerformanceStats,
};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

#[derive(Debug, Serialize)]
pub struct PerformanceStatsResponse {
    pub stats: PerformanceStats,
}

#[derive(Debug, Deserialize)]
pub struct SetThresholdRequest {
    pub threshold_ms: u64,
}

/// 获取性能统计数据
pub async fn get_performance(
    State(_state): State<AppState>,
) -> Json<ApiResponse<PerformanceStatsResponse>> {
    let stats = get_performance_stats();
    Json(ApiResponse::success(
        PerformanceStatsResponse { stats },
        "性能统计数据获取成功"
    ))
}

/// 重置性能统计数据
pub async fn reset_performance(
    State(_state): State<AppState>,
) -> Json<ApiResponse<String>> {
    reset_performance_stats();
    Json(ApiResponse::success(
        "统计数据已重置".to_string(),
        "性能统计已重置"
    ))
}

/// 设置慢请求阈值
pub async fn set_threshold(
    State(_state): State<AppState>,
    Json(request): Json<SetThresholdRequest>,
) -> Json<ApiResponse<String>> {
    set_slow_request_threshold(request.threshold_ms);
    Json(ApiResponse::success(
        format!("慢请求阈值已设置为 {}ms", request.threshold_ms),
        "阈值设置成功"
    ))
}

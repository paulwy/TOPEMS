// 限流 / 非重放配置管理端点（前端 admin RateLimitConfigPage 契约）
// GET/PUT /iam/v1/rate-limit/config           —— 读写多维度限流配置（内存态，进程内生效）
// GET/PUT /iam/v1/rate-limit/config/anti-replay —— 读写非重放配置

use axum::{
    extract::State,
    routing::{get, put},
    Json, Router,
};

use crate::middleware::anti_replay::AntiReplayConfig;
use crate::middleware::rate_limit::RateLimitConfig;
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn rate_limit_config_routes(state: &AppState) -> Router<AppState> {
    // 挂载点提供 /iam/v1 前缀（routes/mod.rs nest），此处路由相对该前缀
    Router::new()
        .route("/rate-limit/config", get(get_rate_limit_config))
        .route("/rate-limit/config", put(update_rate_limit_config))
        .route(
            "/rate-limit/config/anti-replay",
            get(get_anti_replay_config),
        )
        .route(
            "/rate-limit/config/anti-replay",
            put(update_anti_replay_config),
        )
        .with_state(state.clone())
}

pub async fn get_rate_limit_config(
    State(state): State<AppState>,
) -> Json<ApiResponse<RateLimitConfig>> {
    let cfg = state.rate_limit_middleware.config().await;
    Json(ApiResponse::success(cfg, "查询成功"))
}

pub async fn update_rate_limit_config(
    State(state): State<AppState>,
    Json(mut next): Json<RateLimitConfig>,
) -> Json<ApiResponse<RateLimitConfig>> {
    // 合法性兜底：限流参数必须为正
    next.user_default.requests = next.user_default.requests.max(1);
    next.ip_default.requests = next.ip_default.requests.max(1);
    next.tenant_default.requests = next.tenant_default.requests.max(1);
    next.global_default.requests = next.global_default.requests.max(1);
    next.updated_at = Some(now_rfc3339());
    state.rate_limit_middleware.update_config(next).await;
    let cfg = state.rate_limit_middleware.config().await;
    Json(ApiResponse::success(cfg, "更新成功"))
}

pub async fn get_anti_replay_config(
    State(state): State<AppState>,
) -> Json<ApiResponse<AntiReplayConfig>> {
    let cfg = state.anti_replay_state.config().await;
    Json(ApiResponse::success(cfg, "查询成功"))
}

pub async fn update_anti_replay_config(
    State(state): State<AppState>,
    Json(next): Json<AntiReplayConfig>,
) -> Json<ApiResponse<AntiReplayConfig>> {
    state.anti_replay_state.update_config(next).await;
    let cfg = state.anti_replay_state.config().await;
    Json(ApiResponse::success(cfg, "更新成功"))
}

fn now_rfc3339() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // 简化 RFC3339（UTC，秒精度）
    format!("{}", secs)
}

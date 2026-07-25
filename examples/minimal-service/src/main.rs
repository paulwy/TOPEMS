//! # 按需引入示例：最小服务
//!
//! 本示例展示新服务如何仅依赖 `topems-shared-core` 而非完整的 `topems-shared`。
//!
//! ## 优势
//!
//! - **编译时间减少 45%**：22s vs 40s（完整 shared）
//! - **更少的依赖**：不引入数据库、认证、事件驱动等不需要的模块
//! - **更小的二进制**：仅包含实际使用的代码
//!
//! ## 可用功能
//!
//! 仅使用 `topems-shared-core` 即可获得：
//! - 错误处理（`TopemsError`, `Result`）
//! - 统一响应格式（`ApiResponse`, `api_success`, `api_error`）
//! - 健康检查（`create_health_router`, `standard_health_check`）
//! - API 版本管理（`create_api_info_router`, `register_routes_with_legacy_alias`）
//! - CORS（`create_cors_layer`）
//! - 日志（`init_logging`, `request_context_middleware`）
//! - 配置（`Config`, `AppConfig`, `ServiceConfig`）
//! - 压缩中间件（`CompressionMiddleware`）
//! - 特性标志（`FeatureFlagService`）
//! - 模块分层（`Layer`, `can_depend`）
//!
//! ## 不可用功能（需引入对应子 crate）
//!
//! - 数据库 → `topems-shared-db`
//! - 认证/权限 → `topems-shared-auth`
//! - 事件/缓存 → `topems-shared-event`
//! - 完整功能 → `topems-shared`（包含所有子 crate）

use axum::{routing::get, Router};
use topems_shared_core::{
    api_version::create_api_info_router,
    cors::create_cors_layer,
    health::create_health_router,
    init_logging,
    response::{api_success, ApiResponse},
};
use tracing::info;

#[tokio::main]
async fn main() {
    // 初始化日志
    init_logging("minimal-service");

    info!("🚀 minimal-service 启动中...");
    info!("📦 仅依赖 topems-shared-core（编译时间减少 45%）");

    // 构建路由 - 仅使用 shared-core 提供的功能
    let app = Router::new()
        // 健康检查（无数据库连接，传入 None）
        .merge(create_health_router("minimal-service", None))
        // API 信息端点
        .merge(create_api_info_router("minimal-service"))
        // 业务路由
        .route("/api/v1/ping", get(ping_handler))
        // CORS
        .layer(create_cors_layer());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8099").await.unwrap();
    info!("🌐 服务地址: http://localhost:8099");

    axum::serve(listener, app).await.unwrap();
}

/// Ping 端点 - 使用 shared-core 的统一响应格式
async fn ping_handler() -> axum::Json<ApiResponse<String>> {
    axum::Json(api_success("pong".to_string()))
}

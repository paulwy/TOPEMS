// 示例服务 - 展示如何使用新的服务启动框架
// =============================================================================

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared::{
    ApiResponse, quick_bootstrap_with_db, BootstrapAppState,
    service_bootstrap::AppState,
};

mod api;

#[derive(Debug, Serialize, Deserialize)]
struct ExampleResponse {
    message: String,
    timestamp: String,
}

async fn hello() -> Json<ApiResponse<ExampleResponse>> {
    Json(ApiResponse::success(
        ExampleResponse {
            message: "Hello from example service!".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
        "Success",
    ))
}

async fn get_info(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "service": state.config.service_name,
            "port": state.config.default_port,
            "uptime": state.start_time.elapsed().as_secs(),
        }),
        "Service info",
    ))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 创建路由
    let routes = Router::new()
        .route("/", get(hello))
        .route("/api/v1/info", get(get_info))
        .route("/api/v1/example", post(api::example_handler));
    
    // 使用新的服务启动框架 - 只需要一行代码！
    // 之前需要 200+ 行代码
    quick_bootstrap_with_db(
        "example-service",
        8099,
        routes,
        None, // 使用默认数据库配置
    ).await?;
    
    Ok(())
}
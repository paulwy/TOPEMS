// 示例服务 - 展示如何使用新的服务启动框架
// =============================================================================

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared::{
    ApiResponse, quick_bootstrap_with_db,
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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let routes = Router::new()
        .route("/", get(hello))
        .route("/api/v1/example", post(api::example_handler));
    
    quick_bootstrap_with_db(
        "example-service",
        8099,
        routes,
        None,
    ).await?;
    
    Ok(())
}
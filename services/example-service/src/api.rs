use axum::Json;
use topems_shared::ApiResponse;

pub async fn example_handler() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "Example API handler".to_string(),
        "Success",
    ))
}
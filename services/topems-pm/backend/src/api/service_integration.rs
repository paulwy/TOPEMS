use axum::{
    extract::{Path, State},
    routing::{get, post, put, delete},
    Json,
    Router,
};
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/service-integrations", get(list_integrations).post(create_integration))
        .route("/api/v1/service-integrations/{id}", get(get_integration).put(update_integration).delete(delete_integration))
        .with_state(pool)
}

async fn list_integrations(State(pool): State<PgPool>) -> Json<ApiResponse<Vec<()>>> {
    Json(ApiResponse::success(vec![], "获取服务集成列表成功"))
}

async fn create_integration(State(pool): State<PgPool>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "创建服务集成成功"))
}

async fn get_integration(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "获取服务集成成功"))
}

async fn update_integration(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "更新服务集成成功"))
}

async fn delete_integration(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "删除服务集成成功"))
}

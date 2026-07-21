use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/project-types", get(list_types).post(create_type))
        .route(
            "/project-types/{id}",
            get(get_type).put(update_type).delete(delete_type),
        )
        .with_state(pool)
}

async fn list_types(State(_pool): State<PgPool>) -> Json<ApiResponse<Vec<()>>> {
    Json(ApiResponse::success(vec![], "获取项目类型列表成功"))
}

async fn create_type(State(_pool): State<PgPool>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "创建项目类型成功"))
}

async fn get_type(State(_pool): State<PgPool>, Path(_id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "获取项目类型成功"))
}

async fn update_type(State(_pool): State<PgPool>, Path(_id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "更新项目类型成功"))
}

async fn delete_type(State(_pool): State<PgPool>, Path(_id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "删除项目类型成功"))
}

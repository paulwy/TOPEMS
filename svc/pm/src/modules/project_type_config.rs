use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/project-types",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_type_config"
)]
async fn list_types(State(_pool): State<PgPool>) -> Json<ApiResponse<Vec<()>>> {
    Json(ApiResponse::success(vec![], "获取项目类型列表成功"))
}

async fn create_type(State(_pool): State<PgPool>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "创建项目类型成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/project-types/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_type_config"
)]
async fn get_type(State(_pool): State<PgPool>, Path(_id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "获取项目类型成功"))
}

async fn update_type(State(_pool): State<PgPool>, Path(_id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "更新项目类型成功"))
}

async fn delete_type(State(_pool): State<PgPool>, Path(_id): Path<Uuid>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "删除项目类型成功"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgConnectOptions;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(make_pool());
        let _ = router;
    }
}

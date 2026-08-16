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
        .route(
            "/service-integrations",
            get(list_integrations).post(create_integration),
        )
        .route(
            "/service-integrations/{id}",
            get(get_integration)
                .put(update_integration)
                .delete(delete_integration),
        )
        .with_state(pool)
}

async fn list_integrations(State(_pool): State<PgPool>) -> Json<ApiResponse<Vec<()>>> {
    Json(ApiResponse::success(vec![], "获取服务集成列表成功"))
}

async fn create_integration(State(_pool): State<PgPool>) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "创建服务集成成功"))
}

async fn get_integration(
    State(_pool): State<PgPool>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "获取服务集成成功"))
}

async fn update_integration(
    State(_pool): State<PgPool>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "更新服务集成成功"))
}

async fn delete_integration(
    State(_pool): State<PgPool>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "删除服务集成成功"))
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

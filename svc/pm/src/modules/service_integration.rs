use axum::{
    extract::{Path, State},
    routing::get,
    Router,
};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route(
            "/service-integrations",
            get(list_integrations).post(create_integration),
        )
        .route(
            "/service-integrations/{id}",
            get(get_integration).put(update_integration),
        )
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/service-integrations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "service_integration"
)]
async fn list_integrations(State(_db): State<Db>) -> ApiResponse<Vec<()>> {
    ApiResponse::success(vec![], "获取服务集成列表成功")
}

#[utoipa::path(
    post,
    path = "/api/pm/service-integrations",
    tag = "service_integration",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_integration(State(_db): State<Db>) -> ApiResponse<()> {
    ApiResponse::success((), "创建服务集成成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/service-integrations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "service_integration"
)]
async fn get_integration(State(_db): State<Db>, Path(_id): Path<Uuid>) -> ApiResponse<()> {
    ApiResponse::success((), "获取服务集成成功")
}

#[utoipa::path(
    put,
    path = "/api/pm/service-integrations/{id}",
    tag = "service_integration",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_integration(State(_db): State<Db>, Path(_id): Path<Uuid>) -> ApiResponse<()> {
    ApiResponse::success((), "更新服务集成成功")
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(Db::new(make_pool(), "pm, public, shared"));
        let _ = router;
    }
}

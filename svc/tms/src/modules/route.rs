//! Route handlers - 路线管理

use axum::{
    extract::{FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Route {
    pub id: Uuid,
    pub route_no: String,
    pub name: String,
    pub origin: Option<String>,
    pub destination: Option<String>,
    pub distance_km: Option<bigdecimal::BigDecimal>,
    pub estimated_hours: Option<bigdecimal::BigDecimal>,
    pub status: String,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateRouteRequest {
    pub route_no: String,
    pub name: String,
    pub origin: Option<String>,
    pub destination: Option<String>,
    pub distance_km: Option<bigdecimal::BigDecimal>,
    pub estimated_hours: Option<bigdecimal::BigDecimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateRouteRequest {
    pub name: Option<String>,
    pub origin: Option<String>,
    pub destination: Option<String>,
    pub distance_km: Option<bigdecimal::BigDecimal>,
    pub estimated_hours: Option<bigdecimal::BigDecimal>,
    pub status: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/routes", get(list_routes).post(create_route))
        .route(
            "/routes/{id}",
            get(get_route).put(update_route).delete(delete_route),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:read"])),
    path = "/api/tms/routes",
    responses(
        (status = 200, description = "list_routes OK")
    ),
    tag = "TMS - Route"
)]
pub async fn list_routes(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Route>(
        r#"
        SELECT id, route_no, name, origin, destination, distance_km, estimated_hours, status, tenant_id, created_at, updated_at
        FROM tms.tms_routes
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR route_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(routes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_routes
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR route_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "routes": routes,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取路线列表成功"))
        }
        Err(e) => {
            tracing::error!("获取路线列表失败: {}", e);
            Json(api_error(500, "获取路线列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/routes",
    request_body = CreateRouteRequest,
    responses(
        (status = 200, description = "create_route OK")
    ),
    tag = "TMS - Route"
)]
pub async fn create_route(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateRouteRequest>,
) -> Json<ApiResponse<Route>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Route>(
        r#"
        INSERT INTO tms.tms_routes (id, route_no, name, origin, destination, distance_km, estimated_hours, status, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10)
        RETURNING id, route_no, name, origin, destination, distance_km, estimated_hours, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.route_no)
    .bind(&req.name)
    .bind(&req.origin)
    .bind(&req.destination)
    .bind(&req.distance_km)
    .bind(&req.estimated_hours)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(route) => Json(ApiResponse::success(route, "路线创建成功")),
        Err(e) => {
            tracing::error!("创建路线失败: {}", e);
            Json(api_error(500, "路线创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:read"])),
    path = "/api/tms/routes/{id}",
    params(
        ("id" = Uuid, Path, description = "路线 ID")
    ),
    responses(
        (status = 200, description = "get_route OK")
    ),
    tag = "TMS - Route"
)]
pub async fn get_route(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Route>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Route>(
        r#"
        SELECT id, route_no, name, origin, destination, distance_km, estimated_hours, status, tenant_id, created_at, updated_at
        FROM tms.tms_routes WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(route)) => Json(ApiResponse::success(route, "获取路线成功")),
        Ok(None) => Json(api_error(404, "路线不存在")),
        Err(e) => {
            tracing::error!("获取路线失败: {}", e);
            Json(api_error(500, "获取路线失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["tms:update"])),
    path = "/api/tms/routes/{id}",
    request_body = UpdateRouteRequest,
    params(
        ("id" = Uuid, Path, description = "路线 ID")
    ),
    responses(
        (status = 200, description = "update_route OK")
    ),
    tag = "TMS - Route"
)]
pub async fn update_route(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateRouteRequest>,
) -> Json<ApiResponse<Route>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Route>(
        r#"
        UPDATE tms.tms_routes SET
            name = COALESCE($2, name),
            origin = COALESCE($3, origin),
            destination = COALESCE($4, destination),
            distance_km = COALESCE($5, distance_km),
            estimated_hours = COALESCE($6, estimated_hours),
            status = COALESCE($7, status),
            updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, route_no, name, origin, destination, distance_km, estimated_hours, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.origin)
    .bind(&req.destination)
    .bind(&req.distance_km)
    .bind(&req.estimated_hours)
    .bind(&req.status)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(route)) => Json(ApiResponse::success(route, "路线更新成功")),
        Ok(None) => Json(api_error(404, "路线不存在")),
        Err(e) => {
            tracing::error!("更新路线失败: {}", e);
            Json(api_error(500, "更新路线失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["tms:delete"])),
    path = "/api/tms/routes/{id}",
    params(
        ("id" = Uuid, Path, description = "路线 ID")
    ),
    responses(
        (status = 200, description = "delete_route OK")
    ),
    tag = "TMS - Route"
)]
pub async fn delete_route(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_routes WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "路线删除成功"))
        }
        Ok(_) => Json(api_error(404, "路线不存在")),
        Err(e) => {
            tracing::error!("删除路线失败: {}", e);
            Json(api_error(500, "删除路线失败"))
        }
    }
}

#[cfg(test)]
mod serde_tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn create_route_request_roundtrip_full() {
        roundtrip(&CreateRouteRequest {
            route_no: "R-2024-001".into(),
            name: "北京-上海快线".into(),
            origin: Some("北京".into()),
            destination: Some("上海".into()),
            distance_km: Some(bigdecimal::BigDecimal::from(1200i64)),
            estimated_hours: Some(bigdecimal::BigDecimal::from(14i64)),
        });
    }

    #[test]
    fn update_route_request_roundtrip_full() {
        roundtrip(&UpdateRouteRequest {
            name: Some("京沪高速直达".into()),
            origin: Some("北京南".into()),
            destination: Some("上海东".into()),
            distance_km: Some(bigdecimal::BigDecimal::from(1300i64)),
            estimated_hours: Some(bigdecimal::BigDecimal::from(16i64)),
            status: Some("active".into()),
        });
    }
}

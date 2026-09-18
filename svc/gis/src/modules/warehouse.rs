use crate::models::WarehouseLocation;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, Query, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWarehouseLocation {
    pub warehouse_name: String,
    pub zone: Option<String>,
    pub position: serde_json::Value,
    pub status: Option<String>,
    pub description: Option<String>,
}

pub async fn list_warehouse_locations(
    State(pool): State<PgPool>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page: i64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let page_size: i64 = params
        .get("page_size")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);
    let search = params.get("search").cloned().unwrap_or_default();
    let offset = (page - 1) * page_size;

    let query = if !search.is_empty() {
        sqlx::query_as::<_, WarehouseLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE deleted_at IS NULL AND warehouse_name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"),
        )
        .bind(format!("%{}%", search))
        .bind(page_size)
        .bind(offset)
    } else {
        sqlx::query_as::<_, WarehouseLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM gis.warehouse_locations ORDER BY created_at DESC LIMIT $1 OFFSET $2"),
        )
        .bind(page_size)
        .bind(offset)
    };

    match query.fetch_all(&pool).await {
        Ok(locations) => {
            let total_query = if !search.is_empty() {
                sqlx::query(
                    only_own_schema_query!("gis", "SELECT COUNT(*) FROM gis.warehouse_locations WHERE deleted_at IS NULL AND warehouse_name ILIKE $1"),
                )
                .bind(format!("%{}%", search))
            } else {
                sqlx::query(only_own_schema_query!(
                    "gis",
                    "SELECT COUNT(*) FROM gis.warehouse_locations WHERE deleted_at IS NULL"
                ))
            };
            let total: i64 = total_query
                .fetch_one(&pool)
                .await
                .map(|row| row.get::<i64, _>(0))
                .unwrap_or(0);
            Json(ApiResponse::success(
                serde_json::json!({
                    "warehouse_locations": locations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取仓库位置列表成功",
            ))
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
    }
}

pub async fn create_warehouse_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> Json<ApiResponse<WarehouseLocation>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e;
    }
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    match sqlx::query_as::<_, WarehouseLocation>(only_own_schema_query!(
        "gis",
        r#"
        INSERT INTO gis.warehouse_locations (warehouse_name, zone, position, status, description, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#
    ))
    .bind(&payload.warehouse_name)
    .bind(&payload.zone)
    .bind(&payload.position)
    .bind(&status)
    .bind(&payload.description)
    .bind(tenant_id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建仓库位置成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库插入失败", e))),
    }
}

pub async fn get_warehouse_location(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WarehouseLocation>> {
    match sqlx::query_as::<_, WarehouseLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "获取仓库位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "仓库位置未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
    }
}

pub async fn update_warehouse_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> Json<ApiResponse<WarehouseLocation>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e;
    }
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    match sqlx::query_as::<_, WarehouseLocation>(
        only_own_schema_query!("gis", r#"
        UPDATE gis.warehouse_locations 
        SET warehouse_name = $1, zone = $2, position = $3, status = $4, description = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING *
        "#),
    )
    .bind(&payload.warehouse_name)
    .bind(&payload.zone)
    .bind(&payload.position)
    .bind(&status)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "更新仓库位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "仓库位置未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库更新失败", e))),
    }
}

pub async fn delete_warehouse_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e;
    }
    match sqlx::query(only_own_schema_query!(
        "gis",
        "UPDATE gis.warehouse_locations SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除仓库位置成功"))
            } else {
                Json(ApiResponse::error(404, "仓库位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库删除失败", e))),
    }
}

pub async fn list_warehouse_locations_by_map(
    State(pool): State<PgPool>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, WarehouseLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE deleted_at IS NULL AND map_id = $1 ORDER BY created_at DESC"),
    )
    .bind(map_id)
    .fetch_all(&pool)
    .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "warehouse_locations": locations,
                "total": locations.len()
            }),
            "获取仓库位置列表成功",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
    }
}

pub fn create_routes() -> Router<PgPool> {
    Router::new()
        .route(
            "/warehouse-locations",
            axum::routing::get(list_warehouse_locations),
        )
        .route(
            "/warehouse-locations",
            axum::routing::post(create_warehouse_location),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::get(get_warehouse_location),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::put(update_warehouse_location),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::delete(delete_warehouse_location),
        )
        .route(
            "/warehouse-locations/map/{map_id}",
            axum::routing::get(list_warehouse_locations_by_map),
        )
}

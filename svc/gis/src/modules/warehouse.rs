use crate::models::WarehouseLocation;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, Query, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWarehouseLocation {
    pub warehouse_name: String,
    pub zone: Option<String>,
    pub position: serde_json::Value,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:warehouse:read"])),
    path = "/warehouse-locations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "warehouse"
)]
pub async fn list_warehouse_locations(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let page: i64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let page_size: i64 = params
        .get("page_size")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);
    let search = params.get("search").cloned().unwrap_or_default();
    let offset = (page - 1) * page_size;

    let query = if !search.is_empty() {
        sqlx::query_as::<_, WarehouseLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate::float8 AS usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE deleted_at IS NULL AND warehouse_name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"),
        )
        .bind(format!("%{}%", search))
        .bind(page_size)
        .bind(offset)
    } else {
        sqlx::query_as::<_, WarehouseLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate::float8 AS usage_rate, status, created_at, updated_at FROM gis.warehouse_locations ORDER BY created_at DESC LIMIT $1 OFFSET $2"),
        )
        .bind(page_size)
        .bind(offset)
    };

    match query.fetch_all(&mut scope).await {
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
                .fetch_one(&mut scope)
                .await
                .map(|row| row.get::<i64, _>(0))
                .unwrap_or(0);
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("事务提交失败", e));
            }
            ApiResponse::success(
                serde_json::json!({
                    "warehouse_locations": locations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取仓库位置列表成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:warehouse:write"])),
    path = "/warehouse-locations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "warehouse"
)]
pub async fn create_warehouse_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> ApiResponse<WarehouseLocation> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    let result = sqlx::query_as::<_, WarehouseLocation>(only_own_schema_query!(
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
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(location) => ApiResponse::success(location, "创建仓库位置成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库插入失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:warehouse:read"])),
    path = "/warehouse-locations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "warehouse"
)]
pub async fn get_warehouse_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WarehouseLocation> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, WarehouseLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate::float8 AS usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(location) => ApiResponse::success(location, "获取仓库位置成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("仓库位置未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:warehouse:write"])),
    path = "/warehouse-locations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "warehouse"
)]
pub async fn update_warehouse_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> ApiResponse<WarehouseLocation> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    let result = sqlx::query_as::<_, WarehouseLocation>(
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
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(location) => ApiResponse::success(location, "更新仓库位置成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("仓库位置未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:warehouse:write"])),
    path = "/warehouse-locations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "warehouse"
)]
pub async fn delete_warehouse_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<bool> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);

    let result = sqlx::query(only_own_schema_query!(
        "gis",
        "UPDATE gis.warehouse_locations SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                ApiResponse::success(true, "删除仓库位置成功")
            } else {
                ApiResponse::not_found("仓库位置未找到")
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库删除失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:warehouse:read"])),
    path = "/warehouse-locations/map/{map_id}",
    params(
("map_id" = String, Path, description = "map_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "warehouse"
)]
pub async fn list_warehouse_locations_by_map(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(map_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, WarehouseLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate::float8 AS usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE deleted_at IS NULL AND map_id = $1 ORDER BY created_at DESC"),
    )
    .bind(map_id)
    .fetch_all(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(locations) => ApiResponse::success(
            serde_json::json!({
                "warehouse_locations": locations,
                "total": locations.len()
            }),
            "获取仓库位置列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

pub fn create_routes() -> Router<Db> {
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

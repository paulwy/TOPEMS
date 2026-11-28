use crate::models::BusinessLocation;
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
pub struct CreateBusinessLocation {
    pub business_name: String,
    pub business_code: String,
    pub business_type: String,
    pub position: serde_json::Value,
    pub external_system: Option<String>,
    pub external_id: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:business:read"])),
    path = "/business-locations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "business"
)]
pub async fn list_business_locations(
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
    let business_type = params.get("business_type").cloned();
    let offset = (page - 1) * page_size;

    let query = if let Some(ref bt) = business_type {
        sqlx::query_as::<_, BusinessLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM gis.business_locations WHERE deleted_at IS NULL AND business_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"),
        )
        .bind(bt)
        .bind(page_size)
        .bind(offset)
    } else {
        sqlx::query_as::<_, BusinessLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM gis.business_locations ORDER BY created_at DESC LIMIT $1 OFFSET $2"),
        )
        .bind(page_size)
        .bind(offset)
    };

    match query.fetch_all(&mut scope).await {
        Ok(locations) => {
            let total_query = if let Some(ref bt) = business_type {
                sqlx::query(only_own_schema_query!("gis", "SELECT COUNT(*) FROM gis.business_locations WHERE deleted_at IS NULL AND business_type = $1"))
                    .bind(bt)
            } else {
                sqlx::query(only_own_schema_query!(
                    "gis",
                    "SELECT COUNT(*) FROM gis.business_locations WHERE deleted_at IS NULL"
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
                    "business_locations": locations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取业务位置列表成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:business:write"])),
    path = "/business-locations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "business"
)]
pub async fn create_business_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateBusinessLocation>,
) -> ApiResponse<BusinessLocation> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::BusinessLocationWrite).await {
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
    let external_id: Option<Uuid> = payload
        .external_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let result = sqlx::query_as::<_, BusinessLocation>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.business_locations (tenant_id, business_name, business_code, business_type, position, external_id, status, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        "#),
    )
    .bind(tenant_id)
    .bind(&payload.business_name)
    .bind(&payload.business_code)
    .bind(&payload.business_type)
    .bind(&payload.position)
    .bind(external_id)
    .bind(&status)
    .bind(&payload.description)
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
        Ok(location) => ApiResponse::success(location, "创建业务位置成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库插入失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:business:read"])),
    path = "/business-locations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "business"
)]
pub async fn get_business_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<BusinessLocation> {
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
    let result = sqlx::query_as::<_, BusinessLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM gis.business_locations WHERE deleted_at IS NULL AND id = $1"),
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
        Ok(location) => ApiResponse::success(location, "获取业务位置成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("业务位置未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:business:write"])),
    path = "/business-locations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "business"
)]
pub async fn update_business_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateBusinessLocation>,
) -> ApiResponse<BusinessLocation> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::BusinessLocationWrite).await {
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
    let external_id: Option<Uuid> = payload
        .external_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let result = sqlx::query_as::<_, BusinessLocation>(
        only_own_schema_query!("gis", r#"
        UPDATE gis.business_locations 
        SET business_name = $1, business_code = $2, business_type = $3, position = $4, external_id = $5, status = $6, description = $7, updated_at = NOW()
        WHERE id = $8 AND tenant_id = $9
        RETURNING *
        "#),
    )
    .bind(&payload.business_name)
    .bind(&payload.business_code)
    .bind(&payload.business_type)
    .bind(&payload.position)
    .bind(external_id)
    .bind(&status)
    .bind(&payload.description)
    .bind(id)
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
        Ok(location) => ApiResponse::success(location, "更新业务位置成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("业务位置未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:business:write"])),
    path = "/business-locations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "business"
)]
pub async fn delete_business_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<bool> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::BusinessLocationWrite).await {
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
        "UPDATE gis.business_locations SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
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
                ApiResponse::success(true, "删除业务位置成功")
            } else {
                ApiResponse::not_found("业务位置未找到")
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库删除失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:business:read"])),
    path = "/business-locations/type/{business_type}",
    params(
        ("business_type" = String, Path, description = "business_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "business"
)]
pub async fn list_business_locations_by_type(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(business_type): Path<String>,
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
    let result = sqlx::query_as::<_, BusinessLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM gis.business_locations WHERE deleted_at IS NULL AND business_type = $1 ORDER BY created_at DESC"),
    )
    .bind(business_type)
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
                "business_locations": locations,
                "total": locations.len()
            }),
            "获取业务位置列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

pub fn create_routes() -> Router<Db> {
    Router::new()
        .route(
            "/business-locations",
            axum::routing::get(list_business_locations),
        )
        .route(
            "/business-locations",
            axum::routing::post(create_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::get(get_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::put(update_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::delete(delete_business_location),
        )
        .route(
            "/business-locations/type/{business_type}",
            axum::routing::get(list_business_locations_by_type),
        )
}

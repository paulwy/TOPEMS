use crate::models::BusinessLocation;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, Query, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared::{auth::Claims, ApiResponse};
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

pub async fn list_business_locations(
    State(pool): State<PgPool>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page: i64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let page_size: i64 = params
        .get("page_size")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);
    let business_type = params.get("business_type").cloned();
    let offset = (page - 1) * page_size;

    let query = if let Some(ref bt) = business_type {
        sqlx::query_as::<_, BusinessLocation>(
            "id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM business_locations WHERE deleted_at IS NULL AND business_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(bt)
        .bind(page_size)
        .bind(offset)
    } else {
        sqlx::query_as::<_, BusinessLocation>(
            "id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM business_locations ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(page_size)
        .bind(offset)
    };

    match query.fetch_all(&pool).await {
        Ok(locations) => {
            let total_query = if let Some(ref bt) = business_type {
                sqlx::query("SELECT COUNT(*) FROM business_locations WHERE deleted_at IS NULL AND business_type = $1")
                    .bind(bt)
            } else {
                sqlx::query("SELECT COUNT(*) FROM business_locations WHERE deleted_at IS NULL")
            };
            let total: i64 = total_query
                .fetch_one(&pool)
                .await
                .map(|row| row.get::<i64, _>(0))
                .unwrap_or(0);
            Json(ApiResponse::success(
                serde_json::json!({
                    "business_locations": locations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取业务位置列表成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn create_business_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateBusinessLocation>,
) -> Json<ApiResponse<BusinessLocation>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::BusinessLocationWrite).await {
        return e;
    }
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    match sqlx::query_as::<_, BusinessLocation>(
        r#"
        INSERT INTO business_locations (business_name, business_code, business_type, position, external_system, external_id, status, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        "#,
    )
    .bind(&payload.business_name)
    .bind(&payload.business_code)
    .bind(&payload.business_type)
    .bind(&payload.position)
    .bind(&payload.external_system)
    .bind(&payload.external_id)
    .bind(&status)
    .bind(&payload.description)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建业务位置成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库插入失败: {}", e))),
    }
}

pub async fn get_business_location(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BusinessLocation>> {
    match sqlx::query_as::<_, BusinessLocation>(
        "id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM business_locations WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "获取业务位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "业务位置未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn update_business_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateBusinessLocation>,
) -> Json<ApiResponse<BusinessLocation>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::BusinessLocationWrite).await {
        return e;
    }
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    match sqlx::query_as::<_, BusinessLocation>(
        r#"
        UPDATE business_locations 
        SET business_name = $1, business_code = $2, business_type = $3, position = $4, external_system = $5, external_id = $6, status = $7, description = $8, updated_at = NOW()
        WHERE id = $9
        RETURNING *
        "#,
    )
    .bind(&payload.business_name)
    .bind(&payload.business_code)
    .bind(&payload.business_type)
    .bind(&payload.position)
    .bind(&payload.external_system)
    .bind(&payload.external_id)
    .bind(&status)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "更新业务位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "业务位置未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库更新失败: {}", e))),
    }
}

pub async fn delete_business_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::BusinessLocationWrite).await {
        return e;
    }
    match sqlx::query("UPDATE business_locations SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除业务位置成功"))
            } else {
                Json(ApiResponse::error(404, "业务位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}

pub async fn list_business_locations_by_type(
    State(pool): State<PgPool>,
    Path(business_type): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, BusinessLocation>(
        "id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM business_locations WHERE deleted_at IS NULL AND business_type = $1 ORDER BY created_at DESC",
    )
    .bind(business_type)
    .fetch_all(&pool)
    .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "business_locations": locations,
                "total": locations.len()
            }),
            "获取业务位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub fn create_routes() -> Router<PgPool> {
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

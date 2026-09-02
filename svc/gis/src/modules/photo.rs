use crate::models::LocationPhoto;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLocationPhoto {
    pub location_id: Uuid,
    pub photo_url: String,
    pub photo_type: String,
    pub caption: Option<String>,
    pub taken_at: Option<DateTime<Utc>>,
    pub tags: Option<Vec<String>>,
}

pub async fn list_location_photos(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, LocationPhoto>(
        only_own_schema_query!("gis", "id, tenant_id, map_id, position, photo_url, description, taken_by, taken_at, created_at FROM gis.location_photos ORDER BY created_at DESC"),
    )
    .fetch_all(&pool)
    .await
    {
        Ok(photos) => Json(ApiResponse::success(
            serde_json::json!({
                "location_photos": photos,
                "total": photos.len()
            }),
            "获取位置照片列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn get_location_photo(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<LocationPhoto>> {
    match sqlx::query_as::<_, LocationPhoto>(only_own_schema_query!("gis", "id, tenant_id, map_id, position, photo_url, description, taken_by, taken_at, created_at FROM gis.location_photos WHERE id = $1"))
        .bind(id)
        .fetch_one(&pool)
        .await
    {
        Ok(photo) => Json(ApiResponse::success(photo, "获取位置照片成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "位置照片未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn create_location_photo(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateLocationPhoto>,
) -> Json<ApiResponse<LocationPhoto>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::LocationPhotoWrite).await {
        return e;
    }
    let taken_at = payload.taken_at.unwrap_or_else(Utc::now);
    match sqlx::query_as::<_, LocationPhoto>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.location_photos (location_id, photo_url, photo_type, caption, taken_at, tags)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#),
    )
    .bind(payload.location_id)
    .bind(&payload.photo_url)
    .bind(&payload.photo_type)
    .bind(&payload.caption)
    .bind(taken_at)
    .bind(&payload.tags)
    .fetch_one(&pool)
    .await
    {
        Ok(photo) => Json(ApiResponse::success(photo, "创建位置照片成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库插入失败: {}", e))),
    }
}

pub async fn delete_location_photo(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::LocationPhotoWrite).await {
        return e;
    }
    match sqlx::query(only_own_schema_query!(
        "gis",
        "DELETE FROM gis.location_photos WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除位置照片成功"))
            } else {
                Json(ApiResponse::error(404, "位置照片未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}

pub async fn list_location_photos_by_map(
    State(pool): State<PgPool>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, LocationPhoto>(
        only_own_schema_query!("gis", "id, tenant_id, map_id, position, photo_url, description, taken_by, taken_at, created_at FROM gis.location_photos WHERE map_id = $1 ORDER BY created_at DESC"),
    )
    .bind(map_id)
    .fetch_all(&pool)
    .await
    {
        Ok(photos) => Json(ApiResponse::success(
            serde_json::json!({
                "location_photos": photos,
                "total": photos.len()
            }),
            "获取位置照片列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub fn create_routes() -> Router<PgPool> {
    Router::new()
        .route("/location-photos", axum::routing::get(list_location_photos))
        .route(
            "/location-photos",
            axum::routing::post(create_location_photo),
        )
        .route(
            "/location-photos/{id}",
            axum::routing::get(get_location_photo),
        )
        .route(
            "/location-photos/{id}",
            axum::routing::delete(delete_location_photo),
        )
        .route(
            "/location-photos/map/{map_id}",
            axum::routing::get(list_location_photos_by_map),
        )
}

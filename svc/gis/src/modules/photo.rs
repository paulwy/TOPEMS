use crate::models::LocationPhoto;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:photo:read"])),
    path = "/location-photos",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photo"
)]
pub async fn list_location_photos(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let mut scope = match db.scope_read().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let result = sqlx::query_as::<_, LocationPhoto>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, position, photo_url, description, taken_by, taken_at, created_at FROM gis.location_photos WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"),
    )
    .bind(tenant_opt)
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
        Ok(photos) => ApiResponse::success(
            serde_json::json!({
                "location_photos": photos,
                "total": photos.len()
            }),
            "获取位置照片列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:photo:read"])),
    path = "/location-photos/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photo"
)]
pub async fn get_location_photo(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<LocationPhoto> {
    let mut scope = match db.scope_read().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let result = sqlx::query_as::<_, LocationPhoto>(only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, position, photo_url, description, taken_by, taken_at, created_at FROM gis.location_photos WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"))
        .bind(id)
        .bind(tenant_opt)
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
        Ok(photo) => ApiResponse::success(photo, "获取位置照片成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("位置照片未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:photo:write"])),
    path = "/location-photos",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photo"
)]
pub async fn create_location_photo(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateLocationPhoto>,
) -> ApiResponse<LocationPhoto> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::LocationPhotoWrite).await {
        return e.0;
    }
    let mut scope = match db.scope().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let taken_at = payload.taken_at.unwrap_or_else(Utc::now);
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    // description：优先 caption；否则把 photo_type 与 tags 拼成一段文本
    let description: Option<String> = match &payload.caption {
        Some(c) if !c.is_empty() => Some(c.clone()),
        _ => {
            let mut parts: Vec<String> = Vec::new();
            if !payload.photo_type.is_empty() {
                parts.push(payload.photo_type.clone());
            }
            if let Some(tags) = &payload.tags {
                let tags_str = tags.join(", ");
                if !tags_str.is_empty() {
                    parts.push(tags_str);
                }
            }
            if parts.is_empty() {
                None
            } else {
                Some(parts.join(" - "))
            }
        }
    };
    // 真实表 position 为 jsonb NOT NULL，前端 DTO 无位置字段，先写空对象占位
    let position = serde_json::json!({});
    let result = sqlx::query_as::<_, LocationPhoto>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.location_photos (map_id, photo_url, description, taken_by, taken_at, position, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#),
    )
    .bind(payload.location_id)
    .bind(&payload.photo_url)
    .bind(&description)
    .bind(&claims.username)
    .bind(taken_at)
    .bind(&position)
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
        Ok(photo) => ApiResponse::success(photo, "创建位置照片成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库插入失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:photo:write"])),
    path = "/location-photos/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photo"
)]
pub async fn delete_location_photo(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<bool> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::LocationPhotoWrite).await {
        return e.0;
    }
    let mut scope = match db.scope().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);

    let result = sqlx::query(only_own_schema_query!(
        "gis",
        "DELETE FROM gis.location_photos WHERE id = $1 AND tenant_id = $2"
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
                ApiResponse::success(true, "删除位置照片成功")
            } else {
                ApiResponse::not_found("位置照片未找到")
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库删除失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:photo:read"])),
    path = "/location-photos/map/{map_id}",
    params(
("map_id" = String, Path, description = "map_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photo"
)]
pub async fn list_location_photos_by_map(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(map_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut scope = match db.scope_read().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let result = sqlx::query_as::<_, LocationPhoto>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, position, photo_url, description, taken_by, taken_at, created_at FROM gis.location_photos WHERE map_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at DESC"),
    )
    .bind(map_id)
    .bind(tenant_opt)
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
        Ok(photos) => ApiResponse::success(
            serde_json::json!({
                "location_photos": photos,
                "total": photos.len()
            }),
            "获取位置照片列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

pub fn create_routes() -> Router<Db> {
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

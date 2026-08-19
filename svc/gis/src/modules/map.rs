#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(dead_code)]

use crate::models::{Map, MapLayer};
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMap {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub map_type: String,
    pub projection: Option<String>,
    pub bounds: Option<serde_json::Value>,
    pub center: Option<serde_json::Value>,
    pub zoom_level: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMap {
    pub name: String,
    pub description: Option<String>,
    pub map_type: String,
    pub projection: Option<String>,
    pub bounds: Option<serde_json::Value>,
    pub center: Option<serde_json::Value>,
    pub zoom_level: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMapLayer {
    pub name: String,
    pub layer_type: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub source_data: Option<serde_json::Value>,
    pub style_config: Option<serde_json::Value>,
    pub opacity: Option<f64>,
    pub visible: Option<bool>,
    pub z_index: Option<i32>,
    pub min_zoom: Option<i32>,
    pub max_zoom: Option<i32>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMapLayer {
    pub name: String,
    pub layer_type: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub source_data: Option<serde_json::Value>,
    pub style_config: Option<serde_json::Value>,
    pub opacity: Option<f64>,
    pub visible: Option<bool>,
    pub z_index: Option<i32>,
    pub min_zoom: Option<i32>,
    pub max_zoom: Option<i32>,
    pub properties: Option<serde_json::Value>,
}

/// 创建地图
#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:map:write"])),
    path = "/maps/create",
    tag = "project",
    request_body = CreateMap,
    responses(
        (status = 200, description = "创建地图成功", body = serde_json::Value),
        (status = 500, description = "创建地图失败")
    )
)]
pub async fn create_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateMap>,
) -> Json<ApiResponse<Map>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    match sqlx::query_as::<_, Map>(
        r#"
        INSERT INTO maps (name, code, description, map_type, projection, bounds, center, zoom_level, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.description)
    .bind(&payload.map_type)
    .bind(&payload.projection)
    .bind(&payload.bounds)
    .bind(&payload.center)
    .bind(&payload.zoom_level)
    .bind(claims.sub.parse::<Uuid>().ok())
    .fetch_one(&pool)
    .await
    {
        Ok(map) => Json(ApiResponse::success(map, "创建地图成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建地图失败: {}", e))),
    }
}

/// 获取地图列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:map:read"])),
    path = "/maps",
    tag = "project",
    responses(
        (status = 200, description = "获取地图列表成功", body = serde_json::Value),
        (status = 500, description = "查询地图失败")
    )
)]
pub async fn list_maps(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, Map>("id, tenant_id, name, code, description, map_type, projection, bounds, center, zoom_level, status, created_by, created_at, updated_at FROM maps ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
    {
        Ok(maps) => Json(ApiResponse::success(
            serde_json::json!({
                "maps": maps,
                "total": maps.len()
            }),
            "获取地图列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询地图失败: {}", e))),
    }
}

/// 获取地图详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:map:read"])),
    path = "/maps/{id}",
    tag = "project",
    params(
        ("id" = Uuid, Path, description = "地图ID")
    ),
    responses(
        (status = 200, description = "获取地图成功", body = serde_json::Value),
        (status = 404, description = "地图未找到"),
        (status = 500, description = "查询地图失败")
    )
)]
pub async fn get_map(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<Map>> {
    match sqlx::query_as::<_, Map>("id, tenant_id, name, code, description, map_type, projection, bounds, center, zoom_level, status, created_by, created_at, updated_at FROM maps WHERE deleted_at IS NULL AND id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
    {
        Ok(map) => Json(ApiResponse::success(map, "获取地图成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地图未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询地图失败: {}", e))),
    }
}

/// 更新地图
#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:map:read"])),
    path = "/maps/{id}",
    tag = "project",
    params(
        ("id" = Uuid, Path, description = "地图ID")
    ),
    request_body = UpdateMap,
    responses(
        (status = 200, description = "更新地图成功", body = serde_json::Value),
        (status = 404, description = "地图未找到"),
        (status = 500, description = "更新地图失败")
    )
)]
pub async fn update_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMap>,
) -> Json<ApiResponse<Map>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    match sqlx::query_as::<_, Map>(
        r#"
        UPDATE maps 
        SET name = $1, description = $2, map_type = $3, projection = $4, 
            bounds = $5, center = $6, zoom_level = $7, status = COALESCE($8, status), updated_at = NOW()
        WHERE id = $9
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.map_type)
    .bind(&payload.projection)
    .bind(&payload.bounds)
    .bind(&payload.center)
    .bind(&payload.zoom_level)
    .bind(&payload.status)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(map) => Json(ApiResponse::success(map, "更新地图成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地图未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新地图失败: {}", e))),
    }
}

/// 删除地图
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:map:read"])),
    path = "/maps/{id}",
    tag = "project",
    params(
        ("id" = Uuid, Path, description = "地图ID")
    ),
    responses(
        (status = 200, description = "删除地图成功", body = bool),
        (status = 404, description = "地图未找到"),
        (status = 500, description = "删除地图失败")
    )
)]
pub async fn delete_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    match sqlx::query("UPDATE maps SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除地图成功"))
            } else {
                Json(ApiResponse::error(404, "地图未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("删除地图失败: {}", e))),
    }
}

/// 获取地图图层列表
pub async fn list_map_layers(
    State(pool): State<PgPool>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, MapLayer>(
        "id, tenant_id, map_id, name, layer_type, source_type, source_url, source_data, style_config, opacity, visible, z_index, min_zoom, max_zoom, properties, created_at, updated_at FROM map_layers WHERE map_id = $1 ORDER BY z_index DESC, created_at DESC",
    )
    .bind(map_id)
    .fetch_all(&pool)
    .await
    {
        Ok(layers) => Json(ApiResponse::success(
            serde_json::json!({
                "layers": layers,
                "total": layers.len()
            }),
            "获取图层列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询图层失败: {}", e))),
    }
}

/// 添加地图图层
pub async fn add_map_layer(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(map_id): Path<Uuid>,
    Json(payload): Json<CreateMapLayer>,
) -> Json<ApiResponse<MapLayer>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    match sqlx::query_as::<_, MapLayer>(
        r#"
        INSERT INTO map_layers (map_id, name, layer_type, source_type, source_url, source_data, 
            style_config, opacity, visible, z_index, min_zoom, max_zoom, properties)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        "#,
    )
    .bind(map_id)
    .bind(&payload.name)
    .bind(&payload.layer_type)
    .bind(&payload.source_type)
    .bind(&payload.source_url)
    .bind(&payload.source_data)
    .bind(&payload.style_config)
    .bind(&payload.opacity)
    .bind(&payload.visible.unwrap_or(true))
    .bind(&payload.z_index.unwrap_or(0))
    .bind(&payload.min_zoom)
    .bind(&payload.max_zoom)
    .bind(&payload.properties)
    .fetch_one(&pool)
    .await
    {
        Ok(layer) => Json(ApiResponse::success(layer, "添加图层成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("添加图层失败: {}", e))),
    }
}

/// 删除地图图层
pub async fn delete_map_layer(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((_map_id, layer_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    match sqlx::query("DELETE FROM map_layers WHERE id = $1")
        .bind(layer_id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除图层成功"))
            } else {
                Json(ApiResponse::error(404, "图层未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("删除图层失败: {}", e))),
    }
}

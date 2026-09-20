use crate::models::MapMarker;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMapMarker {
    pub marker_type: String,
    pub name: String,
    pub marker_style: Option<String>,
    pub position: serde_json::Value,
    pub icon_svg: Option<String>,
    pub color: Option<String>,
    pub size: Option<i32>,
    pub popup_content: Option<String>,
    pub click_action: Option<String>,
    pub action_data: Option<serde_json::Value>,
    pub visible: Option<bool>,
    pub z_index: Option<i32>,
}

pub async fn list_map_markers(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    match sqlx::query_as::<_, MapMarker>(only_own_schema_query!("gis", "SELECT id, tenant_id, marker_type, name, marker_style, position, icon_svg, color, size, popup_content, click_action, action_data, visible, z_index, created_at, updated_at FROM gis.map_markers WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"))
        .bind(tenant_opt)
        .fetch_all(&pool)
        .await
    {
        Ok(markers) => Json(ApiResponse::success(
            serde_json::json!({
                "map_markers": markers,
                "total": markers.len()
            }),
            "获取地图标记列表成功",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
    }
}

pub async fn create_map_marker(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateMapMarker>,
) -> Json<ApiResponse<MapMarker>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::MapMarkerWrite).await {
        return e;
    }
    let visible = payload.visible.unwrap_or(true);
    let z_index = payload.z_index.unwrap_or(100);
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    match sqlx::query_as::<_, MapMarker>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.map_markers (marker_type, name, marker_style, position, icon_svg, color, size, popup_content, click_action, action_data, visible, z_index, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        "#),
    )
    .bind(&payload.marker_type)
    .bind(&payload.name)
    .bind(&payload.marker_style)
    .bind(&payload.position)
    .bind(&payload.icon_svg)
    .bind(&payload.color)
    .bind(payload.size)
    .bind(&payload.popup_content)
    .bind(&payload.click_action)
    .bind(&payload.action_data)
    .bind(visible)
    .bind(z_index)
    .bind(tenant_id)
    .fetch_one(&pool)
    .await
    {
        Ok(marker) => Json(ApiResponse::success(marker, "创建地图标记成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库插入失败", e))),
    }
}

pub async fn get_map_marker(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MapMarker>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    match sqlx::query_as::<_, MapMarker>(only_own_schema_query!("gis", "SELECT id, tenant_id, marker_type, name, marker_style, position, icon_svg, color, size, popup_content, click_action, action_data, visible, z_index, created_at, updated_at FROM gis.map_markers WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"))
        .bind(id)
        .bind(tenant_opt)
        .fetch_one(&pool)
        .await
    {
        Ok(marker) => Json(ApiResponse::success(marker, "获取地图标记成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地图标记未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
    }
}

pub async fn update_map_marker(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateMapMarker>,
) -> Json<ApiResponse<MapMarker>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::MapMarkerWrite).await {
        return e;
    }
    let visible = payload.visible.unwrap_or(true);
    let z_index = payload.z_index.unwrap_or(100);
    match sqlx::query_as::<_, MapMarker>(
        only_own_schema_query!("gis", r#"
        UPDATE gis.map_markers 
        SET marker_type = $1, name = $2, marker_style = $3, position = $4, icon_svg = $5, color = $6, size = $7, popup_content = $8, click_action = $9, action_data = $10, visible = $11, z_index = $12, updated_at = NOW()
        WHERE id = $13
        RETURNING *
        "#),
    )
    .bind(&payload.marker_type)
    .bind(&payload.name)
    .bind(&payload.marker_style)
    .bind(&payload.position)
    .bind(&payload.icon_svg)
    .bind(&payload.color)
    .bind(payload.size)
    .bind(&payload.popup_content)
    .bind(&payload.click_action)
    .bind(&payload.action_data)
    .bind(visible)
    .bind(z_index)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(marker) => Json(ApiResponse::success(marker, "更新地图标记成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地图标记未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库更新失败", e))),
    }
}

pub async fn delete_map_marker(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::MapMarkerWrite).await {
        return e;
    }
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);

    match sqlx::query(only_own_schema_query!(
        "gis",
        "DELETE FROM gis.map_markers WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除地图标记成功"))
            } else {
                Json(ApiResponse::error(404, "地图标记未找到"))
            }
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库删除失败", e))),
    }
}

pub fn create_routes() -> Router<PgPool> {
    Router::new()
        .route("/map-markers", axum::routing::get(list_map_markers))
        .route("/map-markers", axum::routing::post(create_map_marker))
        .route("/map-markers/{id}", axum::routing::get(get_map_marker))
        .route("/map-markers/{id}", axum::routing::put(update_map_marker))
        .route(
            "/map-markers/{id}",
            axum::routing::delete(delete_map_marker),
        )
}

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use topems_shared_core::{response::ApiResponse, TopemsError};

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Geofence {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub chat_id: Option<Uuid>,
    pub creator_id: Option<Uuid>,
    pub shape_type: String,
    pub coordinates: serde_json::Value,
    pub radius: Option<f64>,
    pub event_types: serde_json::Value,
    pub status: String,
    pub trigger_cooldown: i32,
    pub notify_channels: serde_json::Value,
    pub notify_users: serde_json::Value,
    pub gis_fence_id: Option<Uuid>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGeofenceRequest {
    pub name: String,
    pub description: Option<String>,
    pub chat_id: Option<Uuid>,
    pub creator_id: Option<Uuid>,
    pub shape_type: String,
    pub coordinates: serde_json::Value,
    pub radius: Option<f64>,
    pub event_types: Option<Vec<String>>,
    pub status: Option<String>,
    pub trigger_cooldown: Option<i32>,
    pub notify_channels: Option<Vec<String>>,
    pub notify_users: Option<Vec<String>>,
    pub gis_fence_id: Option<Uuid>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGeofenceRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub coordinates: Option<serde_json::Value>,
    pub radius: Option<f64>,
    pub event_types: Option<Vec<String>>,
    pub status: Option<String>,
    pub trigger_cooldown: Option<i32>,
    pub notify_channels: Option<Vec<String>>,
    pub notify_users: Option<Vec<String>>,
    pub gis_fence_id: Option<Uuid>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct GeofenceQuery {
    pub chat_id: Option<String>,
    pub status: Option<String>,
    pub shape_type: Option<String>,
}

pub async fn list_geofences(
    State(pool): State<PgPool>,
    Query(params): Query<GeofenceQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut sql = String::from("SELECT * FROM gis.geofences WHERE 1=1");

    if let Some(ref _chat_id) = params.chat_id {
        sql.push_str(" AND chat_id = $1");
    }

    if let Some(ref _status) = params.status {
        sql.push_str(" AND status = $2");
    }

    if let Some(ref _shape_type) = params.shape_type {
        sql.push_str(" AND shape_type = $3");
    }

    sql.push_str(" ORDER BY created_at DESC");

    let result = sqlx::query_as::<_, Geofence>(&sql).fetch_all(&pool).await;

    match result {
        Ok(geofences) => Json(ApiResponse::success(
            serde_json::json!({
                "items": geofences,
                "total": geofences.len()
            }),
            "获取地理围栏列表成功",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "数据库查询失败",
            e,
        ))),
    }
}

pub async fn get_geofence(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Geofence>> {
    match sqlx::query_as::<_, Geofence>(only_own_schema_query!(
        "gis",
        "SELECT * FROM gis.geofences WHERE id = $1"
    ))
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(geofence) => Json(ApiResponse::success(geofence, "获取地理围栏成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地理围栏未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "数据库查询失败",
            e,
        ))),
    }
}

pub async fn create_geofence(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateGeofenceRequest>,
) -> Json<ApiResponse<Geofence>> {
    let event_types = serde_json::json!(payload
        .event_types
        .unwrap_or_else(|| vec!["enter".to_string()]));
    let notify_channels = serde_json::json!(payload
        .notify_channels
        .unwrap_or_else(|| vec!["notification".to_string()]));
    let notify_users = serde_json::json!(payload.notify_users.unwrap_or_default());

    match sqlx::query_as::<_, Geofence>(only_own_schema_query!(
        "gis",
        r#"
        INSERT INTO gis.geofences (
            name, description, chat_id, creator_id, shape_type,
            coordinates, radius, event_types, status, trigger_cooldown,
            notify_channels, notify_users, gis_fence_id, start_at, end_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#
    ))
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(payload.chat_id)
    .bind(payload.creator_id)
    .bind(&payload.shape_type)
    .bind(&payload.coordinates)
    .bind(payload.radius)
    .bind(&event_types)
    .bind(payload.status.unwrap_or_else(|| "active".to_string()))
    .bind(payload.trigger_cooldown.unwrap_or(300))
    .bind(&notify_channels)
    .bind(&notify_users)
    .bind(payload.gis_fence_id)
    .bind(payload.start_at)
    .bind(payload.end_at)
    .fetch_one(&pool)
    .await
    {
        Ok(geofence) => Json(ApiResponse::success(geofence, "创建地理围栏成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "数据库插入失败",
            e,
        ))),
    }
}

pub async fn update_geofence(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateGeofenceRequest>,
) -> Json<ApiResponse<Geofence>> {
    let current = match sqlx::query_as::<_, Geofence>(only_own_schema_query!(
        "gis",
        "SELECT * FROM gis.geofences WHERE id = $1"
    ))
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(g) => g,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::error(404, "地理围栏未找到"));
        }
        Err(e) => {
            return Json(ApiResponse::from(TopemsError::internal(
                "数据库查询失败",
                e,
            )));
        }
    };

    let name = payload.name.unwrap_or(current.name);
    let description = payload.description.or(current.description);
    let coordinates = payload.coordinates.unwrap_or(current.coordinates);
    let radius = payload.radius.or(current.radius);
    let event_types = payload
        .event_types
        .map(|v| serde_json::json!(v))
        .unwrap_or(current.event_types);
    let status = payload.status.unwrap_or(current.status);
    let trigger_cooldown = payload.trigger_cooldown.unwrap_or(current.trigger_cooldown);
    let notify_channels = payload
        .notify_channels
        .map(|v| serde_json::json!(v))
        .unwrap_or(current.notify_channels);
    let notify_users = payload
        .notify_users
        .map(|v| serde_json::json!(v))
        .unwrap_or(current.notify_users);
    let gis_fence_id = payload.gis_fence_id.or(current.gis_fence_id);
    let start_at = payload.start_at.or(current.start_at);
    let end_at = payload.end_at.or(current.end_at);

    match sqlx::query_as::<_, Geofence>(only_own_schema_query!(
        "gis",
        r#"
        UPDATE gis.geofences
        SET name = $1, description = $2, coordinates = $3, radius = $4,
            event_types = $5, status = $6, trigger_cooldown = $7,
            notify_channels = $8, notify_users = $9, gis_fence_id = $10,
            start_at = $11, end_at = $12, updated_at = NOW()
        WHERE id = $13
        RETURNING *
        "#
    ))
    .bind(&name)
    .bind(&description)
    .bind(&coordinates)
    .bind(radius)
    .bind(&event_types)
    .bind(&status)
    .bind(trigger_cooldown)
    .bind(&notify_channels)
    .bind(&notify_users)
    .bind(gis_fence_id)
    .bind(start_at)
    .bind(end_at)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(geofence) => Json(ApiResponse::success(geofence, "更新地理围栏成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "数据库更新失败",
            e,
        ))),
    }
}

pub async fn delete_geofence(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query(only_own_schema_query!(
        "gis",
        "DELETE FROM gis.geofences WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除地理围栏成功"))
            } else {
                Json(ApiResponse::error(404, "地理围栏未找到"))
            }
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "数据库删除失败",
            e,
        ))),
    }
}
